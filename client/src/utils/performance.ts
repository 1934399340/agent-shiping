// ============================================
// 性能优化工具函数
// ============================================

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 请求动画帧节流
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  fn: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  
  return function (this: any, ...args: Parameters<T>) {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        fn.apply(this, args);
        rafId = null;
      });
    }
  };
}

/**
 * 缓存函数结果
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  getKey: (...args: Parameters<T>) => string = (...args) => JSON.stringify(args)
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = getKey(...args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    
    // 限制缓存大小
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  } as T;
}

/**
 * 批量处理函数
 */
export function batch<T, R>(
  fn: (items: T[]) => R[],
  delay: number = 16
): (item: T) => Promise<R> {
  let batch: T[] = [];
  let resolveFns: Array<(result: R) => void> = [];
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  const processBatch = () => {
    const currentBatch = batch;
    const currentResolveFns = resolveFns;
    batch = [];
    resolveFns = [];
    timeoutId = null;
    
    const results = fn(currentBatch);
    currentResolveFns.forEach((resolve, i) => resolve(results[i]));
  };
  
  return (item: T): Promise<R> => {
    return new Promise((resolve) => {
      batch.push(item);
      resolveFns.push(resolve);
      
      if (!timeoutId) {
        timeoutId = setTimeout(processBatch, delay);
      }
    });
  };
}

/**
 * 懒加载图片
 */
export function lazyLoadImage(
  imageElements: NodeListOf<HTMLImageElement> | HTMLImageElement[]
): void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    },
    { rootMargin: '50px' }
  );
  
  imageElements.forEach((img) => observer.observe(img));
}

/**
 * 性能监控
 */
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  private maxSamples = 100;
  
  measure(name: string, fn: () => void): void {
    const start = performance.now();
    fn();
    const end = performance.now();
    
    this.addMetric(name, end - start);
  }
  
  async measureAsync(name: string, fn: () => Promise<void>): Promise<void> {
    const start = performance.now();
    await fn();
    const end = performance.now();
    
    this.addMetric(name, end - start);
  }
  
  private addMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const samples = this.metrics.get(name)!;
    samples.push(value);
    
    if (samples.length > this.maxSamples) {
      samples.shift();
    }
  }
  
  getStats(name: string): {
    avg: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const samples = this.metrics.get(name);
    if (!samples || samples.length === 0) return null;
    
    const sorted = [...samples].sort((a, b) => a - b);
    const sum = samples.reduce((a, b) => a + b, 0);
    
    return {
      avg: sum / samples.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)],
    };
  }
  
  getAllStats(): Record<string, ReturnType<typeof this.getStats>> {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};
    this.metrics.forEach((_, name) => {
      stats[name] = this.getStats(name);
    });
    return stats;
  }
}

export const perfMonitor = new PerformanceMonitor();
