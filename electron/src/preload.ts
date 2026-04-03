// ============================================
// Preload Script
// 渲染进程与主进程之间的安全通信桥梁
// ============================================

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

const api = {
  // ============================================
  // 文件系统
  // ============================================
  file: {
    selectFile: (options?: { filters?: Array<{ name: string; extensions: string[] }> }) =>
      ipcRenderer.invoke('select-file', options),
    
    selectFolder: () =>
      ipcRenderer.invoke('select-folder'),
    
    saveFile: (defaultName?: string) =>
      ipcRenderer.invoke('save-file', defaultName),
  },

  // ============================================
  // 本地素材管理
  // ============================================
  assets: {
    import: (filePaths: string[]) =>
      ipcRenderer.invoke('import-assets', filePaths),
    
    getInfo: (filePath: string) =>
      ipcRenderer.invoke('get-asset-info', filePath),
    
    getCached: () =>
      ipcRenderer.invoke('get-cached-assets'),
    
    remove: (assetId: string) =>
      ipcRenderer.invoke('remove-asset', assetId),
    
    generateThumbnail: (filePath: string) =>
      ipcRenderer.invoke('generate-thumbnail', filePath),
  },

  // ============================================
  // 渲染队列
  // ============================================
  render: {
    start: (config: any) =>
      ipcRenderer.invoke('start-render', config),
    
    getStatus: (jobId: string) =>
      ipcRenderer.invoke('get-render-status', jobId),
    
    cancel: (jobId: string) =>
      ipcRenderer.invoke('cancel-render', jobId),
    
    getQueue: () =>
      ipcRenderer.invoke('get-render-queue'),
    
    onProgress: (callback: (data: { jobId: string; progress: number; stage: string }) => void) => {
      const handler = (_event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('render-progress', handler);
      return () => ipcRenderer.removeListener('render-progress', handler);
    },
    
    onComplete: (callback: (data: { jobId: string; outputPath: string }) => void) => {
      const handler = (_event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('render-complete', handler);
      return () => ipcRenderer.removeListener('render-complete', handler);
    },
    
    onError: (callback: (data: { jobId: string; error: string }) => void) => {
      const handler = (_event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('render-error', handler);
      return () => ipcRenderer.removeListener('render-error', handler);
    },
  },

  // ============================================
  // 项目管理
  // ============================================
  project: {
    save: (project: any) =>
      ipcRenderer.invoke('save-project', project),
    
    load: (projectId: string) =>
      ipcRenderer.invoke('load-project', projectId),
    
    list: () =>
      ipcRenderer.invoke('list-projects'),
    
    delete: (projectId: string) =>
      ipcRenderer.invoke('delete-project', projectId),
    
    export: (project: any, filePath: string) =>
      ipcRenderer.invoke('export-project', project, filePath),
    
    import: (filePath: string) =>
      ipcRenderer.invoke('import-project', filePath),
    
    onAutoSaved: (callback: (data: { projectId: string }) => void) => {
      const handler = (_event: IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('project-auto-saved', handler);
      return () => ipcRenderer.removeListener('project-auto-saved', handler);
    },
  },

  // ============================================
  // 缓存管理
  // ============================================
  cache: {
    getSize: () =>
      ipcRenderer.invoke('get-cache-size'),
    
    clear: () =>
      ipcRenderer.invoke('clear-cache'),
    
    cacheRemote: (url: string) =>
      ipcRenderer.invoke('cache-remote-asset', url),
  },

  // ============================================
  // FFmpeg
  // ============================================
  ffmpeg: {
    check: () =>
      ipcRenderer.invoke('check-ffmpeg'),
    
    getVideoInfo: (filePath: string) =>
      ipcRenderer.invoke('get-video-info', filePath),
    
    extractAudio: (videoPath: string, outputPath?: string) =>
      ipcRenderer.invoke('extract-audio', videoPath, outputPath),
    
    generateWaveform: (audioPath: string) =>
      ipcRenderer.invoke('generate-waveform', audioPath),
  },

  // ============================================
  // 系统功能
  // ============================================
  system: {
    showNotification: (title: string, body: string) =>
      ipcRenderer.invoke('show-notification', title, body),
    
    openExternal: (url: string) =>
      ipcRenderer.invoke('open-external', url),
    
    showInFolder: (filePath: string) =>
      ipcRenderer.invoke('show-item-in-folder', filePath),
    
    getClipboardText: () =>
      ipcRenderer.invoke('get-clipboard-text'),
    
    setClipboardText: (text: string) =>
      ipcRenderer.invoke('set-clipboard-text', text),
    
    getClipboardImage: () =>
      ipcRenderer.invoke('get-clipboard-image'),
    
    setClipboardImage: (dataUrl: string) =>
      ipcRenderer.invoke('set-clipboard-image', dataUrl),
    
    getAppPath: () =>
      ipcRenderer.invoke('get-app-path'),
    
    getSystemInfo: () =>
      ipcRenderer.invoke('get-system-info'),
  },

  // ============================================
  // 事件监听
  // ============================================
  on: {
    appReady: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('app-ready', handler);
      return () => ipcRenderer.removeListener('app-ready', handler);
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
