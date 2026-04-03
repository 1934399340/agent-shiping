// ============================================
// 视频搜索聚合服务
// ============================================
import type { VideoAsset, SearchResult, SearchParams } from '../../types/index.js';
import searchPexels from './pexels.js';
import searchPixabay from './pixabay.js';
import searchMixkit from './mixkit.js';
import { searchCache } from '../../utils/cache.js';

// 动态检查API Key配置（每次搜索时检查，而不是模块加载时）
function checkApiKeys() {
  return {
    hasPexelsKey: !!process.env.PEXELS_API_KEY,
    hasPixabayKey: !!process.env.PIXABAY_API_KEY,
  };
}

async function searchAll(params: SearchParams): Promise<SearchResult> {
  // 生成缓存键
  const cacheKey = `search:${params.query}:${params.source}:${params.page}:${params.perPage}`;
  
  // 尝试从缓存获取（缓存5分钟）
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // 动态检查API Key（确保dotenv已加载）
  const { hasPexelsKey, hasPixabayKey } = checkApiKeys();
  console.log('🔍 API Key状态:', { hasPexelsKey, hasPixabayKey, source: params.source });

  // 确定要搜索的源
  const sources = params.source === 'all'
    ? ['pexels', 'pixabay', 'mixkit'] as const
    : [params.source] as const;

  const searchPromises: Promise<SearchResult>[] = [];
  const searchSourceNames: string[] = [];

  // 按源类型并发搜索
  for (const source of sources) {
    if (source === 'pexels') {
      if (hasPexelsKey) {
        console.log('✅ 添加Pexels搜索');
        searchPromises.push(searchPexels(params));
        searchSourceNames.push('pexels');
      } else {
        console.warn('⚠️  Pexels API Key未配置，跳过Pexels搜索');
      }
    } else if (source === 'pixabay') {
      if (hasPixabayKey) {
        searchPromises.push(searchPixabay(params));
        searchSourceNames.push('pixabay');
      } else {
        console.warn('⚠️  Pixabay API Key未配置，跳过Pixabay搜索');
      }
    } else if (source === 'mixkit') {
      // Mixkit不需要API Key
      console.log('✅ 添加Mixkit搜索');
      searchPromises.push(searchMixkit(params));
      searchSourceNames.push('mixkit');
    }
  }

  // 如果没有任何源可搜索，返回提示
  if (searchPromises.length === 0) {
    return {
      items: [],
      total: 0,
      page: params.page || 1,
      perPage: params.perPage || 20,
      hasMore: false,
      message: '请配置至少一个视频源的API Key（推荐Mixkit，免费且无需Key）',
    };
  }

  const results = await Promise.allSettled(searchPromises);

  const allItems: VideoAsset[] = [];
  let totalHits = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      allItems.push(...result.value.items);
      totalHits += result.value.total;
    } else {
      console.warn(`搜索源 ${searchSourceNames[i]} 失败:`, result.reason);
    }
  }

  // 按相关性排序（简单的：匹配标题关键词的排在前面）
  const query = params.query.toLowerCase();
  allItems.sort((a, b) => {
    const aMatch = a.title.toLowerCase().includes(query) ? 1 : 0;
    const bMatch = b.title.toLowerCase().includes(query) ? 1 : 0;
    return bMatch - aMatch;
  });

  const result = {
    items: allItems.slice(0, params.perPage || 20),
    total: totalHits,
    page: params.page || 1,
    perPage: params.perPage || 20,
    hasMore: allItems.length > (params.perPage || 20),
  };
  
  // 缓存结果
  searchCache.set(cacheKey, result, 300);

  return result;
}

export default searchAll;
