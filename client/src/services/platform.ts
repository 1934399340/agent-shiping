// ============================================
// 平台服务层
// 统一处理 Web 和 Electron 环境
// ============================================

import { isElectron, getElectronAPI } from '@/types/electron';
import type { LocalAsset, RenderJob, VideoInfo, WaveformData } from '@/types/electron';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ============================================
// 文件服务
// ============================================

export const fileService = {
  async selectFiles(options?: { filters?: Array<{ name: string; extensions: string[] }> }): Promise<string[]> {
    if (isElectron()) {
      return getElectronAPI()!.file.selectFile(options);
    }
    throw new Error('文件选择仅在桌面端可用');
  },

  async selectFolder(): Promise<string[]> {
    if (isElectron()) {
      return getElectronAPI()!.file.selectFolder();
    }
    throw new Error('文件夹选择仅在桌面端可用');
  },

  async saveFile(defaultName?: string): Promise<string | undefined> {
    if (isElectron()) {
      return getElectronAPI()!.file.saveFile(defaultName);
    }
    throw new Error('文件保存仅在桌面端可用');
  },
};

// ============================================
// 素材服务
// ============================================

export const assetService = {
  async importLocal(filePaths: string[]): Promise<LocalAsset[]> {
    if (isElectron()) {
      return getElectronAPI()!.assets.import(filePaths);
    }
    throw new Error('本地素材导入仅在桌面端可用');
  },

  async getLocalAssets(): Promise<LocalAsset[]> {
    if (isElectron()) {
      return getElectronAPI()!.assets.getCached();
    }
    return [];
  },

  async getAssetInfo(filePath: string): Promise<LocalAsset | null> {
    if (isElectron()) {
      return getElectronAPI()!.assets.getInfo(filePath);
    }
    return null;
  },

  async removeAsset(assetId: string): Promise<boolean> {
    if (isElectron()) {
      return getElectronAPI()!.assets.remove(assetId);
    }
    return false;
  },

  async searchOnline(params: {
    query: string;
    source?: 'pexels' | 'pixabay' | 'mixkit' | 'all';
    page?: number;
    perPage?: number;
    orientation?: 'landscape' | 'portrait' | 'square';
  }): Promise<any> {
    const searchParams = new URLSearchParams({
      query: params.query,
      source: params.source || 'all',
      page: String(params.page || 1),
      perPage: String(params.perPage || 20),
    });
    
    if (params.orientation) {
      searchParams.set('orientation', params.orientation);
    }

    const response = await fetch(`${API_BASE}/api/search?${searchParams}`);
    if (!response.ok) {
      throw new Error('搜索失败');
    }
    return response.json();
  },

  async searchMusic(params: {
    query?: string;
    genre?: string;
    page?: number;
    perPage?: number;
  }): Promise<any> {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set('query', params.query);
    if (params.genre) searchParams.set('genre', params.genre);
    searchParams.set('page', String(params.page || 1));
    searchParams.set('perPage', String(params.perPage || 20));

    const response = await fetch(`${API_BASE}/api/music/search?${searchParams}`);
    if (!response.ok) {
      throw new Error('音乐搜索失败');
    }
    return response.json();
  },
};

// ============================================
// 渲染服务
// ============================================

export const renderService = {
  async startRender(config: any): Promise<{ jobId: string; status: string }> {
    if (isElectron()) {
      return getElectronAPI()!.render.start(config);
    }
    
    const response = await fetch(`${API_BASE}/api/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      throw new Error('渲染启动失败');
    }
    
    const result = await response.json();
    return { jobId: result.filename, status: 'processing' };
  },

  async getRenderStatus(jobId: string): Promise<RenderJob | { status: string }> {
    if (isElectron()) {
      return getElectronAPI()!.render.getStatus(jobId);
    }
    return { status: 'unknown' };
  },

  async cancelRender(jobId: string): Promise<boolean> {
    if (isElectron()) {
      return getElectronAPI()!.render.cancel(jobId);
    }
    return false;
  },

  async getRenderQueue(): Promise<RenderJob[]> {
    if (isElectron()) {
      return getElectronAPI()!.render.getQueue();
    }
    return [];
  },

  onProgress(callback: (data: { jobId: string; progress: number; stage: string }) => void): () => void {
    if (isElectron()) {
      return getElectronAPI()!.render.onProgress(callback);
    }
    return () => {};
  },

  onComplete(callback: (data: { jobId: string; outputPath: string }) => void): () => void {
    if (isElectron()) {
      return getElectronAPI()!.render.onComplete(callback);
    }
    return () => {};
  },

  onError(callback: (data: { jobId: string; error: string }) => void): () => void {
    if (isElectron()) {
      return getElectronAPI()!.render.onError(callback);
    }
    return () => {};
  },
};

// ============================================
// 项目服务
// ============================================

export const projectService = {
  async save(project: any): Promise<{ success: boolean; path?: string }> {
    if (isElectron()) {
      return getElectronAPI()!.project.save(project);
    }
    
    const response = await fetch(`${API_BASE}/api/project/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project }),
    });
    
    if (!response.ok) {
      throw new Error('保存失败');
    }
    
    return response.json();
  },

  async load(projectId: string): Promise<any | null> {
    if (isElectron()) {
      return getElectronAPI()!.project.load(projectId);
    }
    
    const response = await fetch(`${API_BASE}/api/project/load/${projectId}`);
    if (!response.ok) {
      return null;
    }
    
    const result = await response.json();
    return result.project;
  },

  async list(): Promise<any[]> {
    if (isElectron()) {
      return getElectronAPI()!.project.list();
    }
    
    const response = await fetch(`${API_BASE}/api/project/list`);
    if (!response.ok) {
      return [];
    }
    
    const result = await response.json();
    return result.projects;
  },

  async delete(projectId: string): Promise<boolean> {
    if (isElectron()) {
      return getElectronAPI()!.project.delete(projectId);
    }
    
    const response = await fetch(`${API_BASE}/api/project/delete/${projectId}`, {
      method: 'DELETE',
    });
    
    return response.ok;
  },

  async export(project: any, filePath: string): Promise<boolean> {
    if (isElectron()) {
      return getElectronAPI()!.project.export(project, filePath);
    }
    return false;
  },

  async import(filePath: string): Promise<any | null> {
    if (isElectron()) {
      return getElectronAPI()!.project.import(filePath);
    }
    return null;
  },

  onAutoSaved(callback: (data: { projectId: string }) => void): () => void {
    if (isElectron()) {
      return getElectronAPI()!.project.onAutoSaved(callback);
    }
    return () => {};
  },
};

// ============================================
// TTS 服务
// ============================================

export const ttsService = {
  async generate(params: {
    text: string;
    voiceId: string;
    engine?: 'edge-tts' | 'aliyun';
    speed?: number;
  }): Promise<{ success: boolean; audioUrl?: string; duration?: number; error?: string }> {
    const response = await fetch(`${API_BASE}/api/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      throw new Error('TTS生成失败');
    }
    
    return response.json();
  },

  async getVoices(): Promise<Array<{
    id: string;
    name: string;
    language: string;
    gender: 'male' | 'female';
  }>> {
    const response = await fetch(`${API_BASE}/api/tts/voices`);
    if (!response.ok) {
      return [];
    }
    
    const result = await response.json();
    return result.voices;
  },
};

// ============================================
// AI 服务
// ============================================

export const aiService = {
  async autoEdit(script: string): Promise<any> {
    const response = await fetch(`${API_BASE}/api/ai/auto-edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script }),
    });
    
    if (!response.ok) {
      throw new Error('AI剪辑失败');
    }
    
    return response.json();
  },

  async parseScript(script: string): Promise<any> {
    const response = await fetch(`${API_BASE}/api/ai/parse-script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ script }),
    });
    
    if (!response.ok) {
      throw new Error('脚本解析失败');
    }
    
    return response.json();
  },

  async beatSync(params: { clips: any[]; bpm?: number; mode?: string }): Promise<any> {
    const response = await fetch(`${API_BASE}/api/ai/beat-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      throw new Error('踩点分析失败');
    }
    
    return response.json();
  },

  async recommend(params: { keywords: string[]; style?: string; count?: number }): Promise<any> {
    const response = await fetch(`${API_BASE}/api/ai/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      throw new Error('推荐失败');
    }
    
    return response.json();
  },
};

// ============================================
// FFmpeg 服务
// ============================================

export const ffmpegService = {
  async checkAvailable(): Promise<{ available: boolean; version?: string }> {
    if (isElectron()) {
      const result = await getElectronAPI()!.ffmpeg.check();
      return { available: result.available, version: result.version };
    }
    
    const response = await fetch(`${API_BASE}/api/system/ffmpeg`);
    if (!response.ok) {
      return { available: false };
    }
    
    return response.json();
  },

  async getVideoInfo(filePath: string): Promise<VideoInfo> {
    if (isElectron()) {
      return getElectronAPI()!.ffmpeg.getVideoInfo(filePath);
    }
    
    const response = await fetch(`${API_BASE}/api/video/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: filePath }),
    });
    
    if (!response.ok) {
      throw new Error('获取视频信息失败');
    }
    
    return response.json();
  },

  async generateWaveform(audioPath: string): Promise<WaveformData> {
    if (isElectron()) {
      return getElectronAPI()!.ffmpeg.generateWaveform(audioPath);
    }
    throw new Error('波形生成仅在桌面端可用');
  },
};

// ============================================
// 系统服务
// ============================================

export const systemService = {
  async showNotification(title: string, body: string): Promise<boolean> {
    if (isElectron()) {
      return getElectronAPI()!.system.showNotification(title, body);
    }
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
      return true;
    }
    
    return false;
  },

  async openExternal(url: string): Promise<boolean> {
    if (isElectron()) {
      return getElectronAPI()!.system.openExternal(url);
    }
    
    window.open(url, '_blank');
    return true;
  },

  async showInFolder(filePath: string): Promise<boolean> {
    if (isElectron()) {
      return getElectronAPI()!.system.showInFolder(filePath);
    }
    return false;
  },

  async getClipboardText(): Promise<string> {
    if (isElectron()) {
      return getElectronAPI()!.system.getClipboardText();
    }
    
    try {
      return await navigator.clipboard.readText();
    } catch {
      return '';
    }
  },

  async setClipboardText(text: string): Promise<boolean> {
    if (isElectron()) {
      return getElectronAPI()!.system.setClipboardText(text);
    }
    
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  },

  async getAppPaths(): Promise<any> {
    if (isElectron()) {
      return getElectronAPI()!.system.getAppPath();
    }
    return null;
  },

  async getSystemInfo(): Promise<any> {
    if (isElectron()) {
      return getElectronAPI()!.system.getSystemInfo();
    }
    
    return {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
    };
  },

  async getCacheSize(): Promise<number> {
    if (isElectron()) {
      return getElectronAPI()!.cache.getSize();
    }
    return 0;
  },

  async clearCache(): Promise<{ success: boolean; freedBytes: number }> {
    if (isElectron()) {
      return getElectronAPI()!.cache.clear();
    }
    return { success: true, freedBytes: 0 };
  },
};

// ============================================
// 事件监听
// ============================================

export const eventService = {
  onAppReady(callback: () => void): () => void {
    if (isElectron()) {
      return getElectronAPI()!.on.appReady(callback);
    }
    
    setTimeout(callback, 0);
    return () => {};
  },
};
