// ============================================
// 转场效果处理器
// 支持多种转场类型的FFmpeg实现
// ============================================

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execFileAsync = promisify(execFile);

export type TransitionType = 
  | 'fade' 
  | 'dissolve' 
  | 'cross-fade'
  | 'slide-left' 
  | 'slide-right' 
  | 'slide-up' 
  | 'slide-down'
  | 'zoom-in' 
  | 'zoom-out'
  | 'wipe-left' 
  | 'wipe-right'
  | 'wipe-up'
  | 'wipe-down'
  | 'blur'
  | 'glitch'
  | 'flash'
  | 'spin'
  | 'flip-x'
  | 'flip-y';

export interface TransitionOptions {
  type: TransitionType;
  duration: number;
  offset: number;
}

export interface TransitionContext {
  input1: string;
  input2: string;
  output: string;
  duration1: number;
  duration2: number;
  resolution: { width: number; height: number };
  fps: number;
}

const XFADE_TRANSITIONS: Record<string, string> = {
  'fade': 'fade',
  'dissolve': 'dissolve',
  'cross-fade': 'fade',
  'slide-left': 'slideleft',
  'slide-right': 'slideright',
  'slide-up': 'slideup',
  'slide-down': 'slidedown',
  'wipe-left': 'wiperight',
  'wipe-right': 'wipeleft',
  'wipe-up': 'wipedown',
  'wipe-down': 'wipeup',
  'zoom-in': 'zoomin',
  'zoom-out': 'fadeblack',
  'blur': 'circleopen',
  'spin': 'spin',
  'flip-x': 'flip',
};

export async function applyTransition(
  ctx: TransitionContext,
  options: TransitionOptions
): Promise<string> {
  const xfadeType = XFADE_TRANSITIONS[options.type];
  
  if (xfadeType) {
    return applyXFadeTransition(ctx, options, xfadeType);
  }
  
  switch (options.type) {
    case 'glitch':
      return applyGlitchTransition(ctx, options);
    case 'flash':
      return applyFlashTransition(ctx, options);
    case 'flip-x':
      return applyFlipTransition(ctx, options, 'horizontal');
    case 'flip-y':
      return applyFlipTransition(ctx, options, 'vertical');
    default:
      return applyXFadeTransition(ctx, options, 'fade');
  }
}

async function applyXFadeTransition(
  ctx: TransitionContext,
  options: TransitionOptions,
  xfadeType: string
): Promise<string> {
  const args = [
    '-i', ctx.input1,
    '-i', ctx.input2,
    '-filter_complex',
    `[0:v][1:v]xfade=transition=${xfadeType}:duration=${options.duration}:offset=${options.offset}[v]`,
    '-map', '[v]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-r', ctx.fps.toString(),
    '-y',
    ctx.output,
  ];

  await execFileAsync('ffmpeg', args, { timeout: 120000 });
  return ctx.output;
}

async function applyGlitchTransition(
  ctx: TransitionContext,
  options: TransitionOptions
): Promise<string> {
  const tempDir = path.dirname(ctx.output);
  const glitchFrame1 = path.join(tempDir, 'glitch_frame1.png');
  const glitchFrame2 = path.join(tempDir, 'glitch_frame2.png');
  
  try {
    await execFileAsync('ffmpeg', [
      '-i', ctx.input1,
      '-vf', `select=eq(n\\,0)`,
      '-vframes', '1',
      '-y', glitchFrame1,
    ], { timeout: 30000 });

    await execFileAsync('ffmpeg', [
      '-i', ctx.input2,
      '-vf', `select=eq(n\\,0)`,
      '-vframes', '1',
      '-y', glitchFrame2,
    ], { timeout: 30000 });

    const filterComplex = `
      [0:v]format=yuv420p[v0];
      [1:v]format=yuv420p[v1];
      [v0][v1]xfade=transition=dissolve:duration=${options.duration}:offset=${options.offset},
      rgbashift=rh=-10:gh=10:bh=5,
      noise=alls=30:allf=t,
      pixelate=8:8
    `;

    await execFileAsync('ffmpeg', [
      '-i', ctx.input1,
      '-i', ctx.input2,
      '-filter_complex', filterComplex.replace(/\n/g, '').replace(/\s+/g, ' '),
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-r', ctx.fps.toString(),
      '-y', ctx.output,
    ], { timeout: 120000 });

    return ctx.output;
  } finally {
    await fs.unlink(glitchFrame1).catch(() => {});
    await fs.unlink(glitchFrame2).catch(() => {});
  }
}

async function applyFlashTransition(
  ctx: TransitionContext,
  options: TransitionOptions
): Promise<string> {
  const flashDuration = options.duration / 3;
  
  const filterComplex = `
    [0:v]fade=t=out:st=${options.offset}:d=${flashDuration}:c=white[v0];
    [v0][1:v]xfade=transition=fade:duration=${options.duration - flashDuration}:offset=${options.offset + flashDuration}[v]
  `;

  await execFileAsync('ffmpeg', [
    '-i', ctx.input1,
    '-i', ctx.input2,
    '-filter_complex', filterComplex.replace(/\n/g, '').replace(/\s+/g, ' '),
    '-map', '[v]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-r', ctx.fps.toString(),
    '-y', ctx.output,
  ], { timeout: 120000 });

  return ctx.output;
}

async function applyFlipTransition(
  ctx: TransitionContext,
  options: TransitionOptions,
  direction: 'horizontal' | 'vertical'
): Promise<string> {
  const flipFilter = direction === 'horizontal' ? 'hflip' : 'vflip';
  
  const filterComplex = `
    [0:v]format=yuv420p[v0];
    [1:v]${flipFilter},format=yuv420p[v1];
    [v0][v1]xfade=transition=flip:duration=${options.duration}:offset=${options.offset}[v]
  `;

  await execFileAsync('ffmpeg', [
    '-i', ctx.input1,
    '-i', ctx.input2,
    '-filter_complex', filterComplex.replace(/\n/g, '').replace(/\s+/g, ' '),
    '-map', '[v]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-r', ctx.fps.toString(),
    '-y', ctx.output,
  ], { timeout: 120000 });

  return ctx.output;
}

export async function applyTransitionsBetweenClips(
  clips: string[],
  transitions: TransitionOptions[],
  outputDir: string,
  resolution: { width: number; height: number },
  fps: number
): Promise<string> {
  if (clips.length === 0) {
    throw new Error('没有可处理的视频片段');
  }

  if (clips.length === 1) {
    return clips[0];
  }

  let currentInput = clips[0];
  let accumulatedDuration = 0;

  for (let i = 1; i < clips.length; i++) {
    const transition = transitions[i - 1];
    const outputPath = path.join(outputDir, `transition_${i}.mp4`);

    if (transition && transition.duration > 0) {
      const ctx: TransitionContext = {
        input1: currentInput,
        input2: clips[i],
        output: outputPath,
        duration1: accumulatedDuration || await getVideoDuration(currentInput),
        duration2: await getVideoDuration(clips[i]),
        resolution,
        fps,
      };

      await applyTransition(ctx, {
        ...transition,
        offset: accumulatedDuration - transition.duration,
      });

      currentInput = outputPath;
      accumulatedDuration += await getVideoDuration(clips[i]) - transition.duration;
    } else {
      const concatPath = path.join(outputDir, `concat_${i}.txt`);
      await fs.writeFile(concatPath, `file '${currentInput}'\nfile '${clips[i]}'\n`, 'utf-8');

      await execFileAsync('ffmpeg', [
        '-f', 'concat',
        '-safe', '0',
        '-i', concatPath,
        '-c', 'copy',
        '-y', outputPath,
      ], { timeout: 60000 });

      await fs.unlink(concatPath).catch(() => {});
      currentInput = outputPath;
    }
  }

  return currentInput;
}

async function getVideoDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ], { timeout: 5000 });

    return parseFloat(stdout.trim()) || 0;
  } catch {
    return 0;
  }
}

export function getTransitionList(): Array<{
  id: TransitionType;
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
    
    { id: 'wipe-left', name: '左擦除', category: '擦除', description: '从左向右擦除' },
    { id: 'wipe-right', name: '右擦除', category: '擦除', description: '从右向左擦除' },
    { id: 'wipe-up', name: '上擦除', category: '擦除', description: '从上向下擦除' },
    { id: 'wipe-down', name: '下擦除', category: '擦除', description: '从下向上擦除' },
    
    { id: 'blur', name: '模糊', category: '特效', description: '模糊过渡' },
    { id: 'glitch', name: '故障', category: '特效', description: '数字故障效果' },
    { id: 'flash', name: '闪光', category: '特效', description: '闪光过渡' },
    { id: 'spin', name: '旋转', category: '特效', description: '旋转过渡' },
    
    { id: 'flip-x', name: '水平翻转', category: '3D', description: '水平翻转过渡' },
    { id: 'flip-y', name: '垂直翻转', category: '3D', description: '垂直翻转过渡' },
  ];
}
