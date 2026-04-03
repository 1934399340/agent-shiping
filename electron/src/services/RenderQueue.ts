// ============================================
// 渲染队列服务
// 管理后台渲染任务、进度通知、队列调度
// ============================================

import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';

export interface RenderJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  config: RenderConfig;
  outputPath: string;
  progress: number;
  stage: string;
  startTime: number;
  endTime?: number;
  error?: string;
}

export interface RenderConfig {
  clips: Array<{
    url: string;
    startTime: number;
    duration: number;
    trimStart: number;
    trimEnd?: number;
    volume?: number;
    speed?: number;
    transitionIn?: string;
    transitionOut?: string;
    transitionDuration?: number;
    filters?: string[];
    reversed?: boolean;
    mirrored?: 'horizontal' | 'vertical';
  }>;
  transitions: Array<{
    type: string;
    duration: number;
    position: number;
  }>;
  audioTracks: Array<{
    url: string;
    startTime: number;
    volume: number;
    fadeIn?: number;
    fadeOut?: number;
  }>;
  resolution: { width: number; height: number };
  fps: number;
  format: 'mp4' | 'mov' | 'webm';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  outputPath?: string;
}

export class RenderQueue extends EventEmitter {
  private queue: RenderJob[] = [];
  private currentJob: RenderJob | null = null;
  private currentProcess: ChildProcess | null = null;
  private outputDir: string = '';
  private tempDir: string = '';
  private maxConcurrent: number = 1;
  private isProcessing: boolean = false;
  private initialized: boolean = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    const userDataPath = app.getPath('userData');
    this.outputDir = path.join(userDataPath, 'renders');
    this.tempDir = path.join(userDataPath, 'temp');

    await Promise.all([
      fs.mkdir(this.outputDir, { recursive: true }),
      fs.mkdir(this.tempDir, { recursive: true }),
    ]);

    await this.loadQueue();
    this.initialized = true;
    console.log('🎬 渲染队列已初始化');
  }

  private async loadQueue(): Promise<void> {
    try {
      const queuePath = path.join(this.outputDir, 'queue.json');
      const data = await fs.readFile(queuePath, 'utf-8');
      const jobs: RenderJob[] = JSON.parse(data);
      
      this.queue = jobs.filter(j => 
        j.status === 'queued' || j.status === 'processing'
      );
      
      if (this.queue.length > 0) {
        this.queue.forEach(j => j.status = 'queued');
        this.processQueue();
      }
    } catch {}
  }

  private async saveQueue(): Promise<void> {
    const queuePath = path.join(this.outputDir, 'queue.json');
    await fs.writeFile(queuePath, JSON.stringify(this.queue, null, 2), 'utf-8');
  }

  async addJob(config: RenderConfig): Promise<string> {
    const id = `render_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    const defaultOutput = path.join(
      this.outputDir, 
      `output_${Date.now()}.${config.format || 'mp4'}`
    );
    
    const job: RenderJob = {
      id,
      status: 'queued',
      config,
      outputPath: config.outputPath || defaultOutput,
      progress: 0,
      stage: '等待中',
      startTime: Date.now(),
    };

    this.queue.push(job);
    await this.saveQueue();
    
    this.processQueue();
    
    return id;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    const job = this.queue.find(j => j.status === 'queued');
    if (!job) return;

    this.isProcessing = true;
    this.currentJob = job;
    job.status = 'processing';
    job.startTime = Date.now();

    try {
      await this.executeJob(job);
      job.status = 'completed';
      job.endTime = Date.now();
      this.emit('complete', job.id, job.outputPath);
    } catch (err: any) {
      job.status = 'failed';
      job.error = err.message;
      this.emit('error', job.id, err.message);
    } finally {
      this.currentJob = null;
      this.currentProcess = null;
      this.isProcessing = false;
      await this.saveQueue();
      this.processQueue();
    }
  }

  private async executeJob(job: RenderJob): Promise<void> {
    const { config, outputPath } = job;
    const tempDir = path.join(this.tempDir, job.id);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      const totalClips = config.clips.length;
      const processedClips: string[] = [];

      for (let i = 0; i < totalClips; i++) {
        const clip = config.clips[i];
        const progress = 5 + (i / totalClips) * 50;
        
        this.updateProgress(job, progress, `处理片段 ${i + 1}/${totalClips}`);
        
        const processedPath = await this.processClip(clip, tempDir, i, config);
        processedClips.push(processedPath);
      }

      this.updateProgress(job, 60, '合并视频片段');
      const mergedPath = await this.mergeClips(processedClips, tempDir, config);

      if (config.audioTracks && config.audioTracks.length > 0) {
        this.updateProgress(job, 80, '混合音频轨道');
        await this.mixAudio(mergedPath, config.audioTracks, outputPath, tempDir);
      } else {
        await fs.rename(mergedPath, outputPath);
      }

      this.updateProgress(job, 100, '渲染完成');
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private async processClip(
    clip: RenderConfig['clips'][0], 
    tempDir: string, 
    index: number,
    config: RenderConfig
  ): Promise<string> {
    const outputPath = path.join(tempDir, `clip_${index.toString().padStart(3, '0')}.mp4`);
    
    const args: string[] = [
      '-i', clip.url,
      '-ss', clip.trimStart.toString(),
      '-t', clip.duration.toString(),
    ];

    const vFilters: string[] = [];
    const aFilters: string[] = [];

    vFilters.push(`scale=${config.resolution.width}:${config.resolution.height}:force_original_aspect_ratio=decrease`);
    vFilters.push(`pad=${config.resolution.width}:${config.resolution.height}:(ow-iw)/2:(oh-ih)/2`);

    if (clip.speed && clip.speed !== 1) {
      vFilters.push(`setpts=${1/clip.speed}*PTS`);
      aFilters.push(`atempo=${clip.speed}`);
    }

    if (clip.reversed) {
      vFilters.push('reverse');
      aFilters.push('areverse');
    }

    if (clip.mirrored === 'horizontal') {
      vFilters.push('hflip');
    } else if (clip.mirrored === 'vertical') {
      vFilters.push('vflip');
    }

    if (clip.transitionIn) {
      const dur = clip.transitionDuration || 0.5;
      if (clip.transitionIn === 'fade') {
        vFilters.push(`fade=t=in:st=0:d=${dur}`);
        aFilters.push(`afade=t=in:st=0:d=${dur}`);
      }
    }

    if (clip.transitionOut) {
      const dur = clip.transitionDuration || 0.5;
      const start = clip.duration - dur;
      if (clip.transitionOut === 'fade') {
        vFilters.push(`fade=t=out:st=${start}:d=${dur}`);
        aFilters.push(`afade=t=out:st=${start}:d=${dur}`);
      }
    }

    if (clip.filters && clip.filters.length > 0) {
      for (const filter of clip.filters) {
        const ffFilter = this.mapFilter(filter);
        if (ffFilter) vFilters.push(ffFilter);
      }
    }

    if (vFilters.length > 0) {
      args.push('-vf', vFilters.join(','));
    }
    
    const volume = clip.volume ?? 1;
    if (volume !== 1) {
      aFilters.push(`volume=${volume}`);
    }
    
    if (aFilters.length > 0) {
      args.push('-af', aFilters.join(','));
    }

    args.push(
      '-r', config.fps.toString(),
      '-c:v', 'libx264',
      '-preset', this.getPreset(config.quality),
      '-crf', this.getCrf(config.quality),
      '-c:a', 'aac',
      '-b:a', '128k',
      '-y',
      outputPath
    );

    await this.runFFmpeg(args);
    return outputPath;
  }

  private mapFilter(filter: string): string | null {
    const filterMap: Record<string, string> = {
      'grayscale': 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3',
      'sepia': 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
      'blur': 'boxblur=2:1',
      'sharpen': 'unsharp=5:5:1.0:5:5:0.0',
      'contrast': 'eq=contrast=1.2',
      'brightness': 'eq=brightness=0.1',
      'saturate': 'eq=saturation=1.3',
      'vignette': 'vignette=a=0.5',
      'film-grain': 'noise=alls=20:allf=t',
      'vintage': 'curves=vintage',
      'warm': 'colorbalance=rs=0.1:gs=-0.05:bs=-0.1',
      'cool': 'colorbalance=rs=-0.1:gs=0:bs=0.1',
    };

    return filterMap[filter] || null;
  }

  private getPreset(quality: string): string {
    const presets: Record<string, string> = {
      'low': 'ultrafast',
      'medium': 'fast',
      'high': 'medium',
      'ultra': 'slow',
    };
    return presets[quality] || 'medium';
  }

  private getCrf(quality: string): string {
    const crfs: Record<string, string> = {
      'low': '28',
      'medium': '23',
      'high': '20',
      'ultra': '18',
    };
    return crfs[quality] || '23';
  }

  private async mergeClips(
    clipPaths: string[], 
    tempDir: string, 
    config: RenderConfig
  ): Promise<string> {
    const outputPath = path.join(tempDir, 'merged.mp4');

    if (clipPaths.length === 1) {
      await fs.copyFile(clipPaths[0], outputPath);
      return outputPath;
    }

    const concatPath = path.join(tempDir, 'concat.txt');
    let concatContent = '';
    for (const clip of clipPaths) {
      concatContent += `file '${clip}'\n`;
    }
    await fs.writeFile(concatPath, concatContent, 'utf-8');

    await this.runFFmpeg([
      '-f', 'concat',
      '-safe', '0',
      '-i', concatPath,
      '-c', 'copy',
      '-y',
      outputPath,
    ]);

    return outputPath;
  }

  private async mixAudio(
    videoPath: string,
    audioTracks: RenderConfig['audioTracks'],
    outputPath: string,
    tempDir: string
  ): Promise<void> {
    const inputs: string[] = ['-i', videoPath];
    const filterParts: string[] = ['[0:a]'];

    for (let i = 0; i < audioTracks.length; i++) {
      const track = audioTracks[i];
      inputs.push('-i', track.url);
      
      const delay = Math.round(track.startTime * 1000);
      let filter = `[${i + 1}:a]`;
      
      if (delay > 0) {
        filter += `adelay=${delay}|${delay}`;
      }
      
      if (track.volume !== 1) {
        filter += filter.endsWith(']') ? '' : ',';
        filter += `volume=${track.volume}`;
      }
      
      if (track.fadeIn) {
        filter += filter.endsWith(']') ? '' : ',';
        filter += `afade=t=in:st=0:d=${track.fadeIn}`;
      }
      
      if (track.fadeOut) {
        filter += filter.endsWith(']') ? '' : ',';
        filter += `afade=t=out:st=${track.startTime}:d=${track.fadeOut}`;
      }
      
      filter += `[a${i}]`;
      filterParts.push(filter);
    }

    const mixInputs = ['[0:a]', ...audioTracks.map((_, i) => `[a${i}]`)];
    filterParts.push(`${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=2[aout]`);

    await this.runFFmpeg([
      ...inputs,
      '-filter_complex', filterParts.join(';'),
      '-map', '0:v',
      '-map', '[aout]',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-y',
      outputPath,
    ]);
  }

  private runFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn('ffmpeg', args, { stdio: 'pipe' });
      this.currentProcess = process;

      let stderr = '';
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        this.currentProcess = null;
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
        }
      });

      process.on('error', (err) => {
        this.currentProcess = null;
        reject(err);
      });
    });
  }

  private updateProgress(job: RenderJob, progress: number, stage: string): void {
    job.progress = progress;
    job.stage = stage;
    this.emit('progress', job.id, progress, stage);
  }

  getStatus(jobId: string): RenderJob | null {
    const job = this.queue.find(j => j.id === jobId);
    return job || null;
  }

  getQueue(): RenderJob[] {
    return [...this.queue];
  }

  async cancel(jobId: string): Promise<boolean> {
    const job = this.queue.find(j => j.id === jobId);
    if (!job) return false;

    if (job.status === 'processing' && this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
    }

    job.status = 'cancelled';
    await this.saveQueue();
    return true;
  }

  stop(): void {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
    }
  }
}
