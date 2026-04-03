// ============================================
// Electron 主进程入口
// AI视频剪辑器 - 桌面端系统服务
// ============================================

import { app, BrowserWindow, ipcMain, dialog, Notification, shell, clipboard, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { spawn, ChildProcess } from 'child_process';

import { LocalAssetManager } from './services/LocalAssetManager.js';
import { RenderQueue } from './services/RenderQueue.js';
import { ProjectManager } from './services/ProjectManager.js';
import { CacheManager } from './services/CacheManager.js';
import { FFmpegService } from './services/FFmpegService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

const localAssetManager = new LocalAssetManager();
const renderQueue = new RenderQueue();
const projectManager = new ProjectManager();
const cacheManager = new CacheManager();
const ffmpegService = new FFmpegService();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    title: 'AI视频编辑器',
    show: false,
    backgroundColor: '#1a1a2e',
    frame: true,
    titleBarStyle: 'default',
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../app/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('app-ready');
  });
}

async function startBackend() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    console.log('开发模式：请手动启动后端服务 (pnpm --filter server dev)');
    return;
  }

  const serverPath = path.join(__dirname, '../server/index.js');
  
  try {
    await fs.access(serverPath);
    backendProcess = spawn('node', [serverPath], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
    });

    backendProcess.on('error', (err) => {
      console.error('后端服务启动失败:', err);
    });

    backendProcess.on('exit', (code) => {
      console.log(`后端服务退出，代码: ${code}`);
    });
  } catch (err) {
    console.warn('后端服务文件不存在，跳过启动');
  }
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

// ============================================
// IPC Handlers - 文件系统操作
// ============================================

ipcMain.handle('select-file', async (_event, options) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters: options?.filters || [
      { name: '视频文件', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'] },
      { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] },
      { name: '音频文件', extensions: ['mp3', 'wav', 'aac', 'ogg', 'm4a', 'flac'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  });
  return result.filePaths;
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  return result.filePaths;
});

ipcMain.handle('save-file', async (_event, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: defaultName,
    filters: [
      { name: '视频文件', extensions: ['mp4', 'mov', 'webm'] },
      { name: '项目文件', extensions: ['json'] },
    ],
  });
  return result.filePath;
});

// ============================================
// IPC Handlers - 本地素材管理
// ============================================

ipcMain.handle('import-assets', async (_event, filePaths: string[]) => {
  return await localAssetManager.importAssets(filePaths);
});

ipcMain.handle('get-asset-info', async (_event, filePath: string) => {
  return await localAssetManager.getAssetInfo(filePath);
});

ipcMain.handle('get-cached-assets', async () => {
  return await localAssetManager.getCachedAssets();
});

ipcMain.handle('remove-asset', async (_event, assetId: string) => {
  return await localAssetManager.removeAsset(assetId);
});

ipcMain.handle('generate-thumbnail', async (_event, filePath: string) => {
  return await localAssetManager.generateThumbnail(filePath);
});

// ============================================
// IPC Handlers - 渲染队列
// ============================================

ipcMain.handle('start-render', async (_event, config) => {
  const jobId = await renderQueue.addJob(config);
  return { jobId, status: 'queued' };
});

ipcMain.handle('get-render-status', async (_event, jobId: string) => {
  return renderQueue.getStatus(jobId);
});

ipcMain.handle('cancel-render', async (_event, jobId: string) => {
  return renderQueue.cancel(jobId);
});

ipcMain.handle('get-render-queue', async () => {
  return renderQueue.getQueue();
});

renderQueue.on('progress', (jobId: string, progress: number, stage: string) => {
  mainWindow?.webContents.send('render-progress', { jobId, progress, stage });
});

renderQueue.on('complete', (jobId: string, outputPath: string) => {
  mainWindow?.webContents.send('render-complete', { jobId, outputPath });
  showNotification('渲染完成', `视频已保存到: ${outputPath}`);
});

renderQueue.on('error', (jobId: string, error: string) => {
  mainWindow?.webContents.send('render-error', { jobId, error });
  showNotification('渲染失败', error);
});

// ============================================
// IPC Handlers - 项目管理
// ============================================

ipcMain.handle('save-project', async (_event, project) => {
  return await projectManager.save(project);
});

ipcMain.handle('load-project', async (_event, projectId: string) => {
  return await projectManager.load(projectId);
});

ipcMain.handle('list-projects', async () => {
  return await projectManager.list();
});

ipcMain.handle('delete-project', async (_event, projectId: string) => {
  return await projectManager.delete(projectId);
});

ipcMain.handle('export-project', async (_event, project, filePath: string) => {
  return await projectManager.exportToFile(project, filePath);
});

ipcMain.handle('import-project', async (_event, filePath: string) => {
  return await projectManager.importFromFile(filePath);
});

projectManager.on('auto-saved', (projectId: string) => {
  mainWindow?.webContents.send('project-auto-saved', { projectId });
});

// ============================================
// IPC Handlers - 缓存管理
// ============================================

ipcMain.handle('get-cache-size', async () => {
  return await cacheManager.getCacheSize();
});

ipcMain.handle('clear-cache', async () => {
  return await cacheManager.clearCache();
});

ipcMain.handle('cache-remote-asset', async (_event, url: string) => {
  return await cacheManager.cacheRemoteAsset(url);
});

// ============================================
// IPC Handlers - FFmpeg
// ============================================

ipcMain.handle('check-ffmpeg', async () => {
  return await ffmpegService.checkAvailable();
});

ipcMain.handle('get-video-info', async (_event, filePath: string) => {
  return await ffmpegService.getVideoInfo(filePath);
});

ipcMain.handle('extract-audio', async (_event, videoPath: string, outputPath: string) => {
  return await ffmpegService.extractAudio(videoPath, outputPath);
});

ipcMain.handle('generate-waveform', async (_event, audioPath: string) => {
  return await ffmpegService.generateWaveformData(audioPath);
});

// ============================================
// IPC Handlers - 系统功能
// ============================================

ipcMain.handle('show-notification', async (_event, title: string, body: string) => {
  return showNotification(title, body);
});

ipcMain.handle('open-external', async (_event, url: string) => {
  await shell.openExternal(url);
  return true;
});

ipcMain.handle('show-item-in-folder', async (_event, filePath: string) => {
  shell.showItemInFolder(filePath);
  return true;
});

ipcMain.handle('get-clipboard-text', async () => {
  return clipboard.readText();
});

ipcMain.handle('set-clipboard-text', async (_event, text: string) => {
  clipboard.writeText(text);
  return true;
});

ipcMain.handle('get-clipboard-image', async () => {
  const image = clipboard.readImage();
  if (image.isEmpty()) return null;
  return image.toDataURL();
});

ipcMain.handle('set-clipboard-image', async (_event, dataUrl: string) => {
  const image = nativeImage.createFromDataURL(dataUrl);
  clipboard.writeImage(image);
  return true;
});

ipcMain.handle('get-app-path', async () => {
  return {
    home: app.getPath('home'),
    documents: app.getPath('documents'),
    downloads: app.getPath('downloads'),
    desktop: app.getPath('desktop'),
    appData: app.getPath('appData'),
    userData: app.getPath('userData'),
    temp: app.getPath('temp'),
  };
});

ipcMain.handle('get-system-info', async () => {
  return {
    platform: process.platform,
    arch: process.arch,
    version: process.version,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
  };
});

// ============================================
// 辅助函数
// ============================================

function showNotification(title: string, body: string): boolean {
  if (Notification.isSupported()) {
    const notification = new Notification({ title, body });
    notification.show();
    return true;
  }
  return false;
}

// ============================================
// 应用生命周期
// ============================================

app.whenReady().then(async () => {
  await startBackend();
  
  await Promise.all([
    localAssetManager.init(),
    renderQueue.init(),
    projectManager.init(),
    cacheManager.init(),
  ]);
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopBackend();
  renderQueue.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  await projectManager.saveCurrentProject();
});
