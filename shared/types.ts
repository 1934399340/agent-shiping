// ============================================
// 共享类型定义 - 前后端共用
// ============================================

/**
 * 视频素材来源
 */
export type VideoSource = 'pexels' | 'pixabay' | 'mixkit';

/**
 * 音乐风格
 */
export type MusicGenre = 'ambient' | 'cinematic' | 'corporate' | 'electronic'
  | 'folk' | 'hip-hop' | 'jazz' | 'pop' | 'rock' | 'world';

/**
 * 音频素材资源
 */
export interface AudioAsset {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  audioUrl: string;
  duration: number; // 秒
  source: string;
  tags?: string[];
  bpm?: number;
  genre?: MusicGenre;
}

/**
 * 视频素材资源
 */
export interface VideoAsset {
  id: string;
  title: string;
  description?: string;
  thumbnail: string;
  videoUrl?: string; // 改为可选，因为图片素材没有videoUrl
  audioUrl?: string; // 添加音频URL
  imageUrl?: string; // 添加图片URL
  duration: number; // 秒
  width: number;
  height: number;
  source: VideoSource | 'local'; // 添加local源
  tags?: string[];
}

/**
 * 搜索参数
 */
export interface SearchParams {
  query: string;
  source?: VideoSource | 'all';
  page?: number;
  perPage?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
  minDuration?: number;
  maxDuration?: number;
  genre?: string;
}

/**
 * 搜索结果
 */
export interface SearchResult {
  items: VideoAsset[];
  total: number;
  page: number;
  perPage: number;
  hasMore: boolean;
  message?: string;
}

/**
 * TTS引擎
 */
export type TTSEngine = 'edge-tts' | 'aliyun';

/**
 * TTS音色
 */
export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  engine: TTSEngine;
  preview?: string;
}

/**
 * TTS生成参数
 */
export interface TTSParams {
  text: string;
  engine?: TTSEngine;
  voiceId: string;
  speed?: number;
}

/**
 * TTS生成结果
 */
export interface TTSResult {
  success: boolean;
  audioUrl?: string;
  duration?: number;
  error?: string;
}

/**
 * 转场类型
 */
export type TransitionType = 
  // 基础转场
  | 'fade' 
  | 'dissolve' 
  | 'cross-fade'
  // 滑动转场
  | 'slide-left' 
  | 'slide-right' 
  | 'slide-up' 
  | 'slide-down'
  | 'slide-diagonal-tl'
  | 'slide-diagonal-tr'
  | 'slide-diagonal-bl'
  | 'slide-diagonal-br'
  // 缩放转场
  | 'zoom-in' 
  | 'zoom-out'
  | 'zoom-rotate-in'
  | 'zoom-rotate-out'
  | 'zoom-bounce'
  // 擦除转场
  | 'wipe-left' 
  | 'wipe-right'
  | 'wipe-up'
  | 'wipe-down'
  | 'wipe-diagonal'
  | 'wipe-radial'
  | 'wipe-clock'
  // 推拉转场
  | 'push-left'
  | 'push-right'
  | 'push-up'
  | 'push-down'
  // 遮罩转场
  | 'iris-in'
  | 'iris-out'
  | 'iris-star'
  | 'iris-heart'
  | 'circle-crop'
  | 'square-crop'
  // 模糊转场
  | 'blur' 
  | 'blur-zoom'
  | 'blur-spin'
  | 'pixelate'
  | 'pixel-blur'
  // 特效转场
  | 'glitch'
  | 'glitch-digital'
  | 'glitch-vhs'
  | 'color-shift'
  | 'invert-flash'
  | 'whip-pan'
  | 'shake'
  | 'flash'
  // 3D转场
  | 'flip-x'
  | 'flip-y'
  | 'rotate-3d-left'
  | 'rotate-3d-right'
  | 'cube-left'
  | 'cube-right'
  | 'door-left'
  | 'door-right'
  // 创意转场
  | 'spin'
  | 'spiral'
  | 'bounce'
  | 'elastic'
  | 'split-h'
  | 'split-v'
  | 'slice-h'
  | 'slice-v'
  | 'curtain'
  | 'shatter'
  | 'ripple'
  | 'wave'
  | 'luma-fade';

/**
 * 转场效果
 */
export interface Transition {
  id: string;
  type: TransitionType;
  duration: number; // 秒
  position: number; // 时间线位置（秒）
}

/**
 * 时间线片段类型
 */
export type ClipType = 'video' | 'audio' | 'text' | 'image' | 'effect';

/**
 * 时间线片段
 */
export interface TimelineClip {
  id: string;
  trackId: string;
  type: ClipType;
  startTime: number; // 在时间线上的开始时间（秒）
  duration: number; // 片段时长（秒）

  // 视频/音频素材
  asset?: VideoAsset;

  // 裁剪范围
  trimStart: number; // 原素材裁剪起点（秒）
  trimEnd: number; // 原素材裁剪终点（秒）

  // 属性
  volume: number; // 音量 0-2
  speed: number; // 播放速度 0.25-4
  label?: string;

  // 转场
  transitionIn?: TransitionType;
  transitionOut?: TransitionType;
  transitionDuration?: number;

  // 实用工具效果
  reversed?: boolean; // 倒放
  mirrored?: 'horizontal' | 'vertical'; // 镜像

  // 滤镜
  filters?: string[];

  // 文字属性（仅文字片段）
  textContent?: string;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  textPosition?: { x: number; y: number };

  // 特效
  effects?: string[];
}

/**
 * 轨道类型
 */
export type TrackType = 'video' | 'audio' | 'text' | 'effect' | 'image';

/**
 * 轨道
 */
export interface Track {
  id: string;
  type: TrackType;
  name: string;
  clips: TimelineClip[];
  muted: boolean;
  locked: boolean;
  visible: boolean;
  height: number; // UI高度（像素）
}

/**
 * 项目配置
 */
export interface Project {
  id: string;
  name: string;
  tracks: Track[];
  duration: number; // 总时长（秒）
  resolution: { width: number; height: number };
  fps: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * 视频信息（FFprobe获取）
 */
export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  hasAudio: boolean;
}

/**
 * 渲染参数
 */
export interface RenderParams {
  clips: Array<{
    url: string;
    startTime: number;
    duration: number;
    trimStart: number;
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
  resolution: { width: number; height: number };
  fps: number;
  format?: 'mp4' | 'webm' | 'mov';
}

/**
 * 渲染结果
 */
export interface RenderResult {
  success: boolean;
  downloadUrl?: string;
  filename?: string;
  error?: string;
}
