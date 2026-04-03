// ============================================
// FFmpeg 服务
// 视频信息获取、音频提取、波形生成
// ============================================

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';

const execFileAsync = promisify(execFile);

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  hasAudio: boolean;
  audioCodec?: string;
  bitrate?: number;
}

export interface WaveformData {
  duration: number;
  samples: number[];
  peaks: number[];
}

export class FFmpegService {
  private tempDir: string = '';
  private initialized: boolean = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    const userDataPath = app.getPath('userData');
    this.tempDir = path.join(userDataPath, 'temp', 'ffmpeg');
    await fs.mkdir(this.tempDir, { recursive: true });
    this.initialized = true;
    console.log('🎥 FFmpeg服务已初始化');
  }

  async checkAvailable(): Promise<{
    available: boolean;
    version?: string;
    ffprobeVersion?: string;
  }> {
    try {
      const { stdout: ffmpegVersion } = await execFileAsync('ffmpeg', ['-version'], { timeout: 5000 });
      const versionMatch = ffmpegVersion.match(/ffmpeg version (\S+)/);
      
      try {
        const { stdout: ffprobeVersion } = await execFileAsync('ffprobe', ['-version'], { timeout: 5000 });
        return {
          available: true,
          version: versionMatch?.[1] || 'unknown',
          ffprobeVersion: ffprobeVersion.split('\n')[0],
        };
      } catch {
        return {
          available: true,
          version: versionMatch?.[1] || 'unknown',
        };
      }
    } catch {
      return { available: false };
    }
  }

  async getVideoInfo(filePath: string): Promise<VideoInfo> {
    try {
      const { stdout } = await execFileAsync('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        filePath,
      ], { timeout: 15000 });

      const info = JSON.parse(stdout);
      const videoStream = info.streams?.find((s: any) => s.codec_type === 'video');
      const audioStream = info.streams?.find((s: any) => s.codec_type === 'audio');

      return {
        duration: parseFloat(info.format?.duration || '0'),
        width: videoStream?.width || 0,
        height: videoStream?.height || 0,
        fps: this.parseFps(videoStream?.r_frame_rate || '30/1'),
        codec: videoStream?.codec_name || 'unknown',
        hasAudio: !!audioStream,
        audioCodec: audioStream?.codec_name,
        bitrate: parseInt(info.format?.bit_rate) || undefined,
      };
    } catch (err) {
      console.error('获取视频信息失败:', err);
      throw new Error('无法获取视频信息，请确保FFmpeg已正确安装');
    }
  }

  private parseFps(fpsStr: string): number {
    const parts = fpsStr.split('/');
    if (parts.length === 2) {
      const num = parseInt(parts[0]);
      const den = parseInt(parts[1]) || 1;
      return Math.round(num / den);
    }
    return parseInt(fpsStr) || 30;
  }

  async extractAudio(
    videoPath: string, 
    outputPath?: string,
    format: string = 'mp3'
  ): Promise<string> {
    const output = outputPath || path.join(
      this.tempDir, 
      `audio_${Date.now()}.${format}`
    );

    await execFileAsync('ffmpeg', [
      '-i', videoPath,
      '-vn',
      '-acodec', format === 'mp3' ? 'libmp3lame' : 'copy',
      '-q:a', '2',
      '-y',
      output,
    ], { timeout: 60000 });

    return output;
  }

  async generateWaveformData(audioPath: string): Promise<WaveformData> {
    const tempRaw = path.join(this.tempDir, `waveform_${Date.now()}.raw`);
    
    try {
      await execFileAsync('ffmpeg', [
        '-i', audioPath,
        '-ac', '1',
        '-filter:a', 'aresample=1000',
        '-f', 's16le',
        '-y',
        tempRaw,
      ], { timeout: 60000 });

      const buffer = await fs.readFile(tempRaw);
      const samples: number[] = [];
      const peaks: number[] = [];

      const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const totalSamples = Math.floor(view.byteLength / 2);
      const samplesPerPixel = Math.max(1, Math.floor(totalSamples / 500));

      for (let i = 0; i < totalSamples; i += samplesPerPixel) {
        let max = 0;
        let sum = 0;
        
        for (let j = 0; j < samplesPerPixel && i + j < totalSamples; j++) {
          const sample = Math.abs(view.getInt16((i + j) * 2, true));
          max = Math.max(max, sample);
          sum += sample;
        }
        
        const normalized = max / 32768;
        samples.push(normalized);
        peaks.push(normalized);
      }

      const { stdout } = await execFileAsync('ffprobe', [
        '-v', 'quiet',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        audioPath,
      ], { timeout: 5000 });

      const duration = parseFloat(stdout.trim()) || 0;

      return { duration, samples, peaks };
    } finally {
      await fs.unlink(tempRaw).catch(() => {});
    }
  }

  async generateThumbnail(
    videoPath: string,
    timeSeconds: number = 1,
    width: number = 160
  ): Promise<string> {
    const outputPath = path.join(this.tempDir, `thumb_${Date.now()}.jpg`);

    await execFileAsync('ffmpeg', [
      '-ss', timeSeconds.toString(),
      '-i', videoPath,
      '-vframes', '1',
      '-vf', `scale=${width}:-1`,
      '-y',
      outputPath,
    ], { timeout: 30000 });

    return outputPath;
  }

  async convertFormat(
    inputPath: string,
    outputPath: string,
    options: {
      videoCodec?: string;
      audioCodec?: string;
      quality?: 'low' | 'medium' | 'high';
      resolution?: { width: number; height: number };
      fps?: number;
    } = {}
  ): Promise<string> {
    const args = ['-i', inputPath];

    if (options.resolution) {
      args.push('-vf', `scale=${options.resolution.width}:${options.resolution.height}`);
    }

    if (options.fps) {
      args.push('-r', options.fps.toString());
    }

    const crfMap = { low: 28, medium: 23, high: 18 };
    const presetMap = { low: 'ultrafast', medium: 'medium', high: 'slow' };

    args.push(
      '-c:v', options.videoCodec || 'libx264',
      '-preset', presetMap[options.quality || 'medium'],
      '-crf', (crfMap[options.quality || 'medium']).toString(),
      '-c:a', options.audioCodec || 'aac',
      '-b:a', '128k',
      '-y',
      outputPath
    );

    await execFileAsync('ffmpeg', args, { timeout: 300000 });

    return outputPath;
  }

  async trimVideo(
    inputPath: string,
    outputPath: string,
    startTime: number,
    duration: number
  ): Promise<string> {
    await execFileAsync('ffmpeg', [
      '-ss', startTime.toString(),
      '-i', inputPath,
      '-t', duration.toString(),
      '-c', 'copy',
      '-y',
      outputPath,
    ], { timeout: 60000 });

    return outputPath;
  }

  async concatenateVideos(
    videoPaths: string[],
    outputPath: string
  ): Promise<string> {
    const listFile = path.join(this.tempDir, `concat_${Date.now()}.txt`);
    
    let content = '';
    for (const videoPath of videoPaths) {
      content += `file '${videoPath}'\n`;
    }
    await fs.writeFile(listFile, content, 'utf-8');

    try {
      await execFileAsync('ffmpeg', [
        '-f', 'concat',
        '-safe', '0',
        '-i', listFile,
        '-c', 'copy',
        '-y',
        outputPath,
      ], { timeout: 300000 });

      return outputPath;
    } finally {
      await fs.unlink(listFile).catch(() => {});
    }
  }

  async addWatermark(
    videoPath: string,
    watermarkPath: string,
    outputPath: string,
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' = 'bottom-right',
    opacity: number = 0.8
  ): Promise<string> {
    const positionMap = {
      'top-left': '10:10',
      'top-right': 'main_w-overlay_w-10:10',
      'bottom-left': '10:main_h-overlay_h-10',
      'bottom-right': 'main_w-overlay_w-10:main_h-overlay_h-10',
      'center': '(main_w-overlay_w)/2:(main_h-overlay_h)/2',
    };

    await execFileAsync('ffmpeg', [
      '-i', videoPath,
      '-i', watermarkPath,
      '-filter_complex', 
      `[1:v]format=rgba,colorchannelmixer=aa=${opacity}[wm];[0:v][wm]overlay=${positionMap[position]}`,
      '-c:a', 'copy',
      '-y',
      outputPath,
    ], { timeout: 300000 });

    return outputPath;
  }
}
