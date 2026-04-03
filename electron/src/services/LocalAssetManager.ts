// ============================================
// 本地素材管理服务
// 处理本地文件导入、缩略图生成、缓存管理
// ============================================

import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { createHash } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

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

export class LocalAssetManager {
  private assetsDir: string = '';
  private thumbnailsDir: string = '';
  private cacheDir: string = '';
  private assets: Map<string, LocalAsset> = new Map();
  private initialized: boolean = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    const userDataPath = app.getPath('userData');
    this.assetsDir = path.join(userDataPath, 'assets');
    this.thumbnailsDir = path.join(userDataPath, 'thumbnails');
    this.cacheDir = path.join(userDataPath, 'cache');

    await Promise.all([
      fs.mkdir(this.assetsDir, { recursive: true }),
      fs.mkdir(this.thumbnailsDir, { recursive: true }),
      fs.mkdir(this.cacheDir, { recursive: true }),
    ]);

    await this.loadAssetsIndex();
    this.initialized = true;
    console.log('📁 本地素材管理器已初始化');
  }

  private async loadAssetsIndex(): Promise<void> {
    try {
      const indexPath = path.join(this.assetsDir, 'index.json');
      const data = await fs.readFile(indexPath, 'utf-8');
      const assets: LocalAsset[] = JSON.parse(data);
      
      for (const asset of assets) {
        this.assets.set(asset.id, asset);
      }
      
      console.log(`📂 已加载 ${assets.length} 个本地素材`);
    } catch {
      console.log('📂 素材索引为空，将创建新索引');
    }
  }

  private async saveAssetsIndex(): Promise<void> {
    const indexPath = path.join(this.assetsDir, 'index.json');
    const assets = Array.from(this.assets.values());
    await fs.writeFile(indexPath, JSON.stringify(assets, null, 2), 'utf-8');
  }

  async importAssets(filePaths: string[]): Promise<LocalAsset[]> {
    const results: LocalAsset[] = [];

    for (const filePath of filePaths) {
      try {
        const asset = await this.importAsset(filePath);
        results.push(asset);
      } catch (err) {
        console.error(`导入素材失败: ${filePath}`, err);
      }
    }

    await this.saveAssetsIndex();
    return results;
  }

  private async importAsset(filePath: string): Promise<LocalAsset> {
    const stats = await fs.stat(filePath);
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    const fileType = this.detectFileType(ext);
    if (!fileType) {
      throw new Error(`不支持的文件类型: ${ext}`);
    }

    const id = this.generateId(filePath);
    
    if (this.assets.has(id)) {
      return this.assets.get(id)!;
    }

    let metadata: any = {};
    let duration = 0;
    let width = 0;
    let height = 0;

    if (fileType === 'video' || fileType === 'audio') {
      try {
        const info = await this.getMediaInfo(filePath);
        duration = info.duration;
        width = info.width;
        height = info.height;
        metadata = info;
      } catch (err) {
        console.warn('获取媒体信息失败:', err);
      }
    } else if (fileType === 'image') {
      try {
        const dims = await this.getImageDimensions(filePath);
        width = dims.width;
        height = dims.height;
      } catch (err) {
        console.warn('获取图片尺寸失败:', err);
      }
    }

    const thumbnailPath = await this.generateThumbnail(filePath, id, fileType);

    const asset: LocalAsset = {
      id,
      filePath,
      fileName,
      fileType,
      fileSize: stats.size,
      duration,
      width,
      height,
      thumbnailPath,
      importedAt: Date.now(),
      metadata,
    };

    this.assets.set(id, asset);
    return asset;
  }

  private detectFileType(ext: string): 'video' | 'audio' | 'image' | null {
    const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.wmv', '.flv'];
    const audioExts = ['.mp3', '.wav', '.aac', '.ogg', '.m4a', '.flac', '.wma'];
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];

    if (videoExts.includes(ext)) return 'video';
    if (audioExts.includes(ext)) return 'audio';
    if (imageExts.includes(ext)) return 'image';
    return null;
  }

  private generateId(filePath: string): string {
    return createHash('md5').update(filePath).digest('hex').slice(0, 12);
  }

  private async getMediaInfo(filePath: string): Promise<{
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
        fps: this.parseFps(videoStream?.r_frame_rate || '30/1'),
        codec: videoStream?.codec_name || 'unknown',
        hasAudio: !!audioStream,
      };
    } catch (err) {
      return { duration: 0, width: 0, height: 0, fps: 30, codec: 'unknown', hasAudio: false };
    }
  }

  private parseFps(fpsStr: string): number {
    const parts = fpsStr.split('/');
    if (parts.length === 2) {
      return Math.round(parseInt(parts[0]) / parseInt(parts[1]));
    }
    return parseInt(fpsStr) || 30;
  }

  private async getImageDimensions(filePath: string): Promise<{ width: number; height: number }> {
    try {
      const { stdout } = await execFileAsync('identify', [
        '-format', '%w %h',
        filePath,
      ], { timeout: 5000 });

      const [width, height] = stdout.trim().split(' ').map(Number);
      return { width, height };
    } catch {
      return { width: 0, height: 0 };
    }
  }

  async generateThumbnail(filePath: string, id?: string, fileType?: 'video' | 'audio' | 'image'): Promise<string> {
    const assetId = id || this.generateId(filePath);
    const type = fileType || this.detectFileType(path.extname(filePath));
    const thumbnailPath = path.join(this.thumbnailsDir, `${assetId}.jpg`);

    try {
      await fs.access(thumbnailPath);
      return thumbnailPath;
    } catch {}

    if (type === 'video') {
      await execFileAsync('ffmpeg', [
        '-i', filePath,
        '-ss', '00:00:01',
        '-vframes', '1',
        '-vf', 'scale=160:-1',
        '-y',
        thumbnailPath,
      ], { timeout: 30000 });
    } else if (type === 'image') {
      await execFileAsync('convert', [
        filePath,
        '-resize', '160x',
        '-quality', '85',
        thumbnailPath,
      ], { timeout: 10000 });
    } else if (type === 'audio') {
      const placeholderPath = path.join(this.thumbnailsDir, 'audio-placeholder.png');
      try {
        await fs.access(placeholderPath);
        return placeholderPath;
      } catch {
        return '';
      }
    }

    return thumbnailPath;
  }

  async getAssetInfo(filePath: string): Promise<LocalAsset | null> {
    const id = this.generateId(filePath);
    return this.assets.get(id) || null;
  }

  async getCachedAssets(): Promise<LocalAsset[]> {
    return Array.from(this.assets.values());
  }

  async removeAsset(assetId: string): Promise<boolean> {
    const asset = this.assets.get(assetId);
    if (!asset) return false;

    try {
      if (asset.thumbnailPath) {
        await fs.unlink(asset.thumbnailPath).catch(() => {});
      }
    } catch {}

    this.assets.delete(assetId);
    await this.saveAssetsIndex();
    return true;
  }

  getAssetPath(assetId: string): string | null {
    const asset = this.assets.get(assetId);
    return asset?.filePath || null;
  }
}
