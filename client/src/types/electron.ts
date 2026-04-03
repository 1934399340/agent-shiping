// ============================================
// Electron API 类型定义
// 通过 contextBridge 暴露给渲染进程的 API
// ============================================

export interface LocalAsset {
  id: string;
  filePath: string;
  fileName: string;
  fileType: 'video' | 'audio' | 'image';
  fileSize: number;
  duration: number;
  width: number;
  height: number;
  thumbnailPath: string;
  importedAt: number;
  metadata: Record<string, any>;
}

export interface RenderJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  config: any;
  outputPath: string;
  progress: number;
  stage: string;
  startTime: number;
  endTime?: number;
  error?: string;
}

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

export interface AppPaths {
  home: string;
  documents: string;
  downloads: string;
  desktop: string;
  appData: string;
  userData: string;
  temp: string;
}

export interface SystemInfo {
  platform: 'win32' | 'darwin' | 'linux';
  arch: string;
  version: string;
  electronVersion: string;
  chromeVersion: string;
}

export interface ElectronAPI {
  file: {
    selectFile: (options?: { filters?: Array<{ name: string; extensions: string[] }> }) => Promise<string[]>;
    selectFolder: () => Promise<string[]>;
    saveFile: (defaultName?: string) => Promise<string | undefined>;
  };
  
  assets: {
    import: (filePaths: string[]) => Promise<LocalAsset[]>;
    getInfo: (filePath: string) => Promise<LocalAsset | null>;
    getCached: () => Promise<LocalAsset[]>;
    remove: (assetId: string) => Promise<boolean>;
    generateThumbnail: (filePath: string) => Promise<string>;
  };
  
  render: {
    start: (config: any) => Promise<{ jobId: string; status: string }>;
    getStatus: (jobId: string) => Promise<RenderJob | null>;
    cancel: (jobId: string) => Promise<boolean>;
    getQueue: () => Promise<RenderJob[]>;
    onProgress: (callback: (data: { jobId: string; progress: number; stage: string }) => void) => () => void;
    onComplete: (callback: (data: { jobId: string; outputPath: string }) => void) => () => void;
    onError: (callback: (data: { jobId: string; error: string }) => void) => () => void;
  };
  
  project: {
    save: (project: any) => Promise<{ success: boolean; path: string }>;
    load: (projectId: string) => Promise<any | null>;
    list: () => Promise<Array<{
      id: string;
      name: string;
      updatedAt: number;
      createdAt: number;
      duration: number;
    }>>;
    delete: (projectId: string) => Promise<boolean>;
    export: (project: any, filePath: string) => Promise<boolean>;
    import: (filePath: string) => Promise<any | null>;
    onAutoSaved: (callback: (data: { projectId: string }) => void) => () => void;
  };
  
  cache: {
    getSize: () => Promise<number>;
    clear: () => Promise<{ success: boolean; freedBytes: number }>;
    cacheRemote: (url: string) => Promise<string | null>;
  };
  
  ffmpeg: {
    check: () => Promise<{
      available: boolean;
      version?: string;
      ffprobeVersion?: string;
    }>;
    getVideoInfo: (filePath: string) => Promise<VideoInfo>;
    extractAudio: (videoPath: string, outputPath?: string) => Promise<string>;
    generateWaveform: (audioPath: string) => Promise<WaveformData>;
  };
  
  system: {
    showNotification: (title: string, body: string) => Promise<boolean>;
    openExternal: (url: string) => Promise<boolean>;
    showInFolder: (filePath: string) => Promise<boolean>;
    getClipboardText: () => Promise<string>;
    setClipboardText: (text: string) => Promise<boolean>;
    getClipboardImage: () => Promise<string | null>;
    setClipboardImage: (dataUrl: string) => Promise<boolean>;
    getAppPath: () => Promise<AppPaths>;
    getSystemInfo: () => Promise<SystemInfo>;
  };
  
  on: {
    appReady: (callback: () => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

export function getElectronAPI(): ElectronAPI | null {
  return window.electronAPI || null;
}
