// ============================================
// 缓存管理服务
// 素材缓存、远程资源缓存、缓存清理
// ============================================

import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { createHash } from 'crypto';

export interface CacheEntry {
  url: string;
  localPath: string;
  size: number;
  cachedAt: number;
  lastAccessed: number;
  expiresAt?: number;
}

export class CacheManager {
  private cacheDir: string = '';
  private remoteCacheDir: string = '';
  private indexFile: string = '';
  private cacheIndex: Map<string, CacheEntry> = new Map();
  private maxCacheSize: number = 2 * 1024 * 1024 * 1024;
  private initialized: boolean = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    const userDataPath = app.getPath('userData');
    this.cacheDir = path.join(userDataPath, 'cache');
    this.remoteCacheDir = path.join(this.cacheDir, 'remote');
    this.indexFile = path.join(this.cacheDir, 'index.json');

    await Promise.all([
      fs.mkdir(this.cacheDir, { recursive: true }),
      fs.mkdir(this.remoteCacheDir, { recursive: true }),
    ]);

    await this.loadCacheIndex();
    this.initialized = true;
    console.log('📦 缓存管理器已初始化');
  }

  private async loadCacheIndex(): Promise<void> {
    try {
      const data = await fs.readFile(this.indexFile, 'utf-8');
      const entries: CacheEntry[] = JSON.parse(data);
      
      for (const entry of entries) {
        try {
          await fs.access(entry.localPath);
          this.cacheIndex.set(entry.url, entry);
        } catch {
          // 文件不存在，跳过
        }
      }
      
      console.log(`📦 已加载 ${this.cacheIndex.size} 个缓存条目`);
    } catch {}
  }

  private async saveCacheIndex(): Promise<void> {
    const entries = Array.from(this.cacheIndex.values());
    await fs.writeFile(this.indexFile, JSON.stringify(entries, null, 2), 'utf-8');
  }

  async getCacheSize(): Promise<number> {
    let totalSize = 0;
    
    for (const entry of this.cacheIndex.values()) {
      totalSize += entry.size;
    }
    
    return totalSize;
  }

  async clearCache(): Promise<{ success: boolean; freedBytes: number }> {
    const freedBytes = await this.getCacheSize();
    
    try {
      const files = await fs.readdir(this.remoteCacheDir);
      
      for (const file of files) {
        await fs.unlink(path.join(this.remoteCacheDir, file));
      }
      
      this.cacheIndex.clear();
      await this.saveCacheIndex();
      
      return { success: true, freedBytes };
    } catch {
      return { success: false, freedBytes: 0 };
    }
  }

  async cacheRemoteAsset(url: string): Promise<string | null> {
    const existing = this.cacheIndex.get(url);
    if (existing) {
      existing.lastAccessed = Date.now();
      await this.saveCacheIndex();
      return existing.localPath;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const size = buffer.byteLength;

      await this.ensureCacheSpace(size);

      const ext = this.getExtensionFromUrl(url) || 'bin';
      const hash = this.hashUrl(url);
      const fileName = `${hash}.${ext}`;
      const localPath = path.join(this.remoteCacheDir, fileName);

      await fs.writeFile(localPath, Buffer.from(buffer));

      const entry: CacheEntry = {
        url,
        localPath,
        size,
        cachedAt: Date.now(),
        lastAccessed: Date.now(),
      };

      this.cacheIndex.set(url, entry);
      await this.saveCacheIndex();

      return localPath;
    } catch (err) {
      console.error('缓存远程资源失败:', err);
      return null;
    }
  }

  private async ensureCacheSpace(requiredSize: number): Promise<void> {
    const currentSize = await this.getCacheSize();
    
    if (currentSize + requiredSize <= this.maxCacheSize) {
      return;
    }

    const entries = Array.from(this.cacheIndex.values())
      .sort((a, b) => a.lastAccessed - b.lastAccessed);

    let freedSpace = 0;
    const targetFree = requiredSize - (this.maxCacheSize - currentSize);

    for (const entry of entries) {
      if (freedSpace >= targetFree) break;

      try {
        await fs.unlink(entry.localPath);
        this.cacheIndex.delete(entry.url);
        freedSpace += entry.size;
      } catch {}
    }

    await this.saveCacheIndex();
  }

  private hashUrl(url: string): string {
    return createHash('md5').update(url).digest('hex').slice(0, 16);
  }

  private getExtensionFromUrl(url: string): string | null {
    try {
      const pathname = new URL(url).pathname;
      const ext = path.extname(pathname).slice(1);
      return ext || null;
    } catch {
      return null;
    }
  }

  getCachedPath(url: string): string | null {
    const entry = this.cacheIndex.get(url);
    return entry?.localPath || null;
  }

  isCached(url: string): boolean {
    return this.cacheIndex.has(url);
  }

  async getCacheStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    maxSize: number;
    usagePercent: number;
  }> {
    const totalSize = await this.getCacheSize();
    
    return {
      totalEntries: this.cacheIndex.size,
      totalSize,
      maxSize: this.maxCacheSize,
      usagePercent: (totalSize / this.maxCacheSize) * 100,
    };
  }

  setMaxCacheSize(bytes: number): void {
    this.maxCacheSize = bytes;
  }
}
