// ============================================
// FFmpeg 视频处理服务
// ============================================
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execFileAsync = promisify(execFile);

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'renders');

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

const XFADE_TRANSITIONS: Record<string, string> = {
  'fade': 'fade',
  'dissolve': 'dissolve',
  'cross-fade': 'fade',
  'slide-left': 'slideleft',
  'slide-right': 'slideright',
  'slide-up': 'slideup',
  'slide-down': 'slidedown',
  'slide-diagonal-tl': 'slidetopleft',
  'slide-diagonal-tr': 'slidetopright',
  'slide-diagonal-bl': 'slidebottomleft',
  'slide-diagonal-br': 'slidebottomright',
  'zoom-in': 'zoomin',
  'zoom-out': 'fadeblack',
  'zoom-rotate-in': 'spin',
  'zoom-rotate-out': 'spin',
  'zoom-bounce': 'bounce',
  'wipe-left': 'wiperight',
  'wipe-right': 'wipeleft',
  'wipe-up': 'wipedown',
  'wipe-down': 'wipeup',
  'wipe-diagonal': 'diagonal',
  'wipe-radial': 'radial',
  'wipe-clock': 'circlecrop',
  'iris-in': 'circleopen',
  'iris-out': 'circleclose',
  'iris-star': 'star',
  'circle-crop': 'circlecrop',
  'square-crop': 'rectcrop',
  'blur': 'circleopen',
  'blur-zoom': 'zoomin',
  'blur-spin': 'spin',
  'pixelate': 'pixelate',
  'pixel-blur': 'hlwind',
  'glitch': 'dissolve',
  'glitch-digital': 'dissolve',
  'glitch-vhs': 'dissolve',
  'color-shift': 'dissolve',
  'invert-flash': 'flash',
  'whip-pan': 'slideleft',
  'shake': 'shake',
  'flash': 'flash',
  'flip-x': 'flip',
  'flip-y': 'flip',
  'rotate-3d-left': 'spin',
  'rotate-3d-right': 'spin',
  'cube-left': 'cube',
  'cube-right': 'cube',
  'door-left': 'doorleft',
  'door-right': 'doorright',
  'spin': 'spin',
  'spiral': 'spiral',
  'bounce': 'bounce',
  'elastic': 'elastic',
  'split-h': 'squeezeh',
  'split-v': 'squeezev',
  'slice-h': 'sliceh',
  'slice-v': 'slicev',
  'curtain': 'wind',
  'shatter': 'dissolve',
  'ripple': 'ripple',
  'wave': 'wave',
  'luma-fade': 'fade',
};

export async function getVideoInfo(filePath: string): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  hasAudio: boolean;
}> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ], { timeout: 10000 });

    const info = JSON.parse(stdout);
    const videoStream = info.streams?.find((s: any) => s.codec_type === 'video');
    const audioStream = info.streams?.find((s: any) => s.codec_type === 'audio');

    return {
      duration: parseFloat(info.format?.duration || '0'),
      width: videoStream?.width || 0,
      height: videoStream?.height || 0,
      fps: Math.round(
        (videoStream?.r_frame_rate || '30').split('/')[0] /
        (videoStream?.r_frame_rate || '30/1').split('/')[1]
      ),
      codec: videoStream?.codec_name || 'unknown',
      hasAudio: !!audioStream,
    };
  } catch (err) {
    console.error('ffprobe error:', err);
    return { duration: 0, width: 0, height: 0, fps: 30, codec: 'unknown', hasAudio: false };
  }
}

export async function getOnlineVideoInfo(url: string): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  hasAudio: boolean;
}> {
  const tempFile = path.join(OUTPUT_DIR, 'temp', `probe_${Date.now()}.mp4`);
  
  try {
    await fs.mkdir(path.dirname(tempFile), { recursive: true });
    
    const response = await fetch(url, {
      headers: { 'Range': 'bytes=0-5000000' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    await fs.writeFile(tempFile, Buffer.from(buffer));
    
    const info = await getVideoInfo(tempFile);
    
    if (info.duration === 0 && response.headers.get('content-range')) {
      console.warn('无法获取视频时长，使用默认值');
      return { ...info, duration: 10 };
    }
    
    return info;
  } catch (err) {
    console.error('获取在线视频信息失败:', err);
    return { duration: 10, width: 1920, height: 1080, fps: 30, codec: 'unknown', hasAudio: true };
  } finally {
    try {
      await fs.unlink(tempFile);
    } catch {}
  }
}

export async function estimateVideoDuration(url: string): Promise<number> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('video') && contentLength) {
      const sizeMB = parseInt(contentLength) / (1024 * 1024);
      return Math.round(sizeMB * 4);
    }
    
    return 10;
  } catch {
    return 10;
  }
}

export async function applyTransition(options: {
  input1: string;
  input2: string;
  output: string;
  transition: string;
  duration: number;
  offset: number;
}): Promise<string> {
  await ensureOutputDir();

  const xfadeType = XFADE_TRANSITIONS[options.transition] || 'fade';

  const args = [
    '-i', options.input1,
    '-i', options.input2,
    '-filter_complex', `[0:v][1:v]xfade=transition=${xfadeType}:duration=${options.duration}:offset=${options.offset}[v]`,
    '-map', '[v]',
    '-y',
    options.output,
  ];

  await execFileAsync('ffmpeg', args, { timeout: 60000 });
  return options.output;
}

const FILTER_MAP: Record<string, string> = {
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
  'dramatic': 'eq=contrast=1.3:brightness=-0.05',
  'dreamy': 'gblur=sigma=0.5,eq=contrast=0.9:brightness=0.05',
  'vibrant': 'eq=saturation=1.5:contrast=1.1',
  'muted': 'eq=saturation=0.7',
};

export async function renderVideo(options: {
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
  }>;
  output: string;
  resolution: { width: number; height: number };
  fps: number;
  onProgress?: (progress: number, stage: string) => void;
}): Promise<string> {
  await ensureOutputDir();

  if (options.clips.length === 0) {
    throw new Error('没有可渲染的视频片段');
  }

  const { onProgress } = options;
  const tempDir = path.join(OUTPUT_DIR, `temp_${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });
  
  const tempFiles: string[] = [];
  const totalClips = options.clips.length;

  try {
    onProgress?.(0, '准备渲染...');
    
    onProgress?.(5, '预处理视频片段...');
    const processedClips: string[] = [];
    
    for (let i = 0; i < options.clips.length; i++) {
      const clip = options.clips[i];
      const tempFile = path.join(tempDir, `clip_${i.toString().padStart(3, '0')}.mp4`);
      tempFiles.push(tempFile);
      
      const progress = 5 + (i / totalClips) * 30;
      onProgress?.(progress, `处理片段 ${i + 1}/${totalClips}...`);
      
      const filters: string[] = [];
      const audioFilters: string[] = [];
      
      filters.push(`scale=${options.resolution.width}:${options.resolution.height}:force_original_aspect_ratio=decrease`);
      filters.push(`pad=${options.resolution.width}:${options.resolution.height}:(ow-iw)/2:(oh-ih)/2`);
      
      if (clip.speed && clip.speed !== 1) {
        filters.push(`setpts=${1/clip.speed}*PTS`);
        audioFilters.push(`atempo=${clip.speed}`);
      }
      
      if (clip.reversed) {
        filters.push('reverse');
        audioFilters.push('areverse');
      }
      
      if (clip.mirrored === 'horizontal') {
        filters.push('hflip');
      } else if (clip.mirrored === 'vertical') {
        filters.push('vflip');
      }
      
      if (clip.filters && clip.filters.length > 0) {
        for (const filter of clip.filters) {
          const ffFilter = FILTER_MAP[filter];
          if (ffFilter) filters.push(ffFilter);
        }
      }
      
      if (clip.transitionIn) {
        const transDuration = clip.transitionDuration || 0.5;
        const xfadeType = XFADE_TRANSITIONS[clip.transitionIn] || 'fade';
        if (xfadeType === 'fade') {
          filters.push(`fade=t=in:st=0:d=${transDuration}`);
          audioFilters.push(`afade=t=in:st=0:d=${transDuration}`);
        }
      }
      
      if (clip.transitionOut) {
        const transDuration = clip.transitionDuration || 0.5;
        const fadeStart = clip.duration - transDuration;
        const xfadeType = XFADE_TRANSITIONS[clip.transitionOut] || 'fade';
        if (xfadeType === 'fade') {
          filters.push(`fade=t=out:st=${fadeStart}:d=${transDuration}`);
          audioFilters.push(`afade=t=out:st=${fadeStart}:d=${transDuration}`);
        }
      }
      
      const volume = clip.volume ?? 1;
      if (volume !== 1) {
        audioFilters.push(`volume=${volume}`);
      }
      
      const args = [
        '-i', clip.url,
        '-ss', clip.trimStart.toString(),
        '-t', clip.duration.toString(),
        '-vf', filters.join(','),
        '-r', options.fps.toString(),
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
      ];
      
      if (audioFilters.length > 0) {
        args.push('-af', audioFilters.join(','));
      }
      
      args.push('-y', tempFile);
      
      await execFileAsync('ffmpeg', args, { timeout: 120000 });
      processedClips.push(tempFile);
    }
    
    onProgress?.(40, '合并视频片段...');
    
    if (processedClips.length === 1) {
      await fs.copyFile(processedClips[0], options.output);
    } else {
      const concatListPath = path.join(tempDir, 'concat.txt');
      let lines = '';
      for (const clip of processedClips) {
        lines += `file '${clip}'\n`;
      }
      await fs.writeFile(concatListPath, lines, 'utf-8');
      tempFiles.push(concatListPath);
      
      await execFileAsync('ffmpeg', [
        '-f', 'concat',
        '-safe', '0',
        '-i', concatListPath,
        '-c', 'copy',
        '-y',
        options.output,
      ], { timeout: 300000 });
    }
    
    if (options.audioTracks && options.audioTracks.length > 0) {
      onProgress?.(70, '混合音频轨道...');
      
      const outputWithAudio = path.join(tempDir, 'output_with_audio.mp4');
      tempFiles.push(outputWithAudio);
      
      const audioInputs: string[] = [];
      const audioMixFilters: string[] = [];
      
      audioInputs.push('-i', options.output);
      audioMixFilters.push('[0:a]');
      
      for (let i = 0; i < options.audioTracks.length; i++) {
        const track = options.audioTracks[i];
        audioInputs.push('-i', track.url);
        audioMixFilters.push(`[${i+1}:a]adelay=${Math.round(track.startTime * 1000)}|${Math.round(track.startTime * 1000)},volume=${track.volume}[a${i}]`);
      }
      
      const mixInputs = ['[0:a]', ...options.audioTracks.map((_, i) => `[a${i}]`)];
      audioMixFilters.push(`${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first[aout]`);
      
      await execFileAsync('ffmpeg', [
        ...audioInputs,
        '-filter_complex', audioMixFilters.join(';'),
        '-map', '0:v',
        '-map', '[aout]',
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-y',
        outputWithAudio,
      ], { timeout: 180000 });
      
      await fs.copyFile(outputWithAudio, options.output);
    }
    
    onProgress?.(100, '渲染完成！');
    return options.output;
    
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

export async function isFFmpegAvailable(): Promise<boolean> {
  try {
    await execFileAsync('ffmpeg', ['-version'], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

export function getAvailableTransitions(): Array<{
  id: string;
  name: string;
  category: string;
  description: string;
}> {
  return [
    { id: 'fade', name: '淡入淡出', category: '基础', description: '经典淡入淡出转场' },
    { id: 'dissolve', name: '溶解', category: '基础', description: '画面溶解过渡' },
    { id: 'cross-fade', name: '交叉淡化', category: '基础', description: '平滑交叉淡化' },
    
    { id: 'slide-left', name: '左滑', category: '滑动', description: '从右向左滑动' },
    { id: 'slide-right', name: '右滑', category: '滑动', description: '从左向右滑动' },
    { id: 'slide-up', name: '上滑', category: '滑动', description: '从下向上滑动' },
    { id: 'slide-down', name: '下滑', category: '滑动', description: '从上向下滑动' },
    
    { id: 'zoom-in', name: '放大', category: '缩放', description: '放大过渡' },
    { id: 'zoom-out', name: '缩小', category: '缩放', description: '缩小过渡' },
    { id: 'zoom-bounce', name: '弹跳缩放', category: '缩放', description: '弹跳缩放效果' },
    
    { id: 'wipe-left', name: '左擦除', category: '擦除', description: '从左向右擦除' },
    { id: 'wipe-right', name: '右擦除', category: '擦除', description: '从右向左擦除' },
    { id: 'wipe-up', name: '上擦除', category: '擦除', description: '从上向下擦除' },
    { id: 'wipe-down', name: '下擦除', category: '擦除', description: '从下向上擦除' },
    
    { id: 'iris-in', name: '圆形打开', category: '遮罩', description: '圆形遮罩打开' },
    { id: 'iris-out', name: '圆形关闭', category: '遮罩', description: '圆形遮罩关闭' },
    
    { id: 'blur', name: '模糊', category: '特效', description: '模糊过渡' },
    { id: 'glitch', name: '故障', category: '特效', description: '数字故障效果' },
    { id: 'flash', name: '闪光', category: '特效', description: '闪光过渡' },
    { id: 'shake', name: '抖动', category: '特效', description: '抖动过渡' },
    
    { id: 'spin', name: '旋转', category: '3D', description: '旋转过渡' },
    { id: 'flip-x', name: '水平翻转', category: '3D', description: '水平翻转过渡' },
    { id: 'flip-y', name: '垂直翻转', category: '3D', description: '垂直翻转过渡' },
    { id: 'cube-left', name: '立方体左转', category: '3D', description: '立方体左旋转' },
    { id: 'cube-right', name: '立方体右转', category: '3D', description: '立方体右旋转' },
    
    { id: 'bounce', name: '弹跳', category: '创意', description: '弹跳过渡' },
    { id: 'elastic', name: '弹性', category: '创意', description: '弹性过渡' },
    { id: 'ripple', name: '涟漪', category: '创意', description: '涟漪效果' },
    { id: 'wave', name: '波浪', category: '创意', description: '波浪过渡' },
    { id: 'spiral', name: '螺旋', category: '创意', description: '螺旋过渡' },
  ];
}

export function getAvailableFilters(): Array<{
  id: string;
  name: string;
  category: string;
  description: string;
}> {
  return [
    { id: 'grayscale', name: '黑白', category: '颜色', description: '转换为黑白' },
    { id: 'sepia', name: '复古', category: '颜色', description: '复古棕褐色调' },
    { id: 'warm', name: '暖色', category: '颜色', description: '暖色调' },
    { id: 'cool', name: '冷色', category: '颜色', description: '冷色调' },
    { id: 'vibrant', name: '鲜艳', category: '颜色', description: '增强饱和度' },
    { id: 'muted', name: '柔和', category: '颜色', description: '降低饱和度' },
    
    { id: 'blur', name: '模糊', category: '效果', description: '轻微模糊' },
    { id: 'sharpen', name: '锐化', category: '效果', description: '锐化边缘' },
    { id: 'vignette', name: '暗角', category: '效果', description: '添加暗角效果' },
    { id: 'film-grain', name: '胶片颗粒', category: '效果', description: '添加胶片颗粒' },
    
    { id: 'contrast', name: '高对比', category: '调整', description: '增强对比度' },
    { id: 'brightness', name: '提亮', category: '调整', description: '提高亮度' },
    { id: 'dramatic', name: '戏剧', category: '调整', description: '戏剧性效果' },
    { id: 'dreamy', name: '梦幻', category: '调整', description: '梦幻效果' },
    { id: 'vintage', name: '怀旧', category: '调整', description: '怀旧风格' },
  ];
}
