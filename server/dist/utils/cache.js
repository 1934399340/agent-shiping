// ============================================
// 服务端缓存工具
// ============================================
/**
 * 简单的内存缓存
 */
export class SimpleCache {
    cache = new Map();
    maxSize;
    constructor(maxSize = 100) {
        this.maxSize = maxSize;
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        // 检查是否过期
        if (Date.now() - entry.timestamp > entry.ttl * 1000) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    set(key, data, ttl = 300) {
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
    delete(key) {
        return this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    size() {
        return this.cache.size;
    }
}
/**
 * 视频搜索结果缓存
 */
export const searchCache = new SimpleCache(50);
/**
 * 视频信息缓存（缓存10分钟）
 */
export const videoInfoCache = new SimpleCache(200);
/**
 * 带缓存的fetch包装
 */
export async function cachedFetch(url, options = {}, cache, ttl = 300) {
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
