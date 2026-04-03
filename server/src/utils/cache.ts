// ============================================
// 服务端缓存工具
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * 简单的内存缓存
 */
export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }
  
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set(key: string, data: T, ttl: number = 300): void {
    // 如果缓存满了，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
}

/**
 * 视频搜索结果缓存
 */
export const searchCache = new SimpleCache<any>(50);

/**
 * 视频信息缓存（缓存10分钟）
 */
export const videoInfoCache = new SimpleCache<{
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  hasAudio: boolean;
}>(200);

/**
 * 带缓存的fetch包装
 */
export async function cachedFetch<T>(
  url: string,
  options: RequestInit = {},
  cache: SimpleCache<T>,
  ttl: number = 300
): Promise<T> {
  const cacheKey = `${url}:${JSON.stringify(options)}`;
  
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  cache.set(cacheKey, data, ttl);
  
  return data;
}
