// ============================================
// 视频搜索服务 - Pixabay
// ============================================
import type { VideoAsset, SearchResult, SearchParams } from '../../types/index.js';

// Pixabay API Key
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY || '';
const PIXABAY_BASE = 'https://pixabay.com/api/videos';

// 如果没有配置API Key，提示用户
if (!PIXABAY_API_KEY) {
  console.warn('⚠️  Pixabay API Key未配置，Pixabay搜索将不可用');
  console.warn('   请访问 https://pixabay.com/api/docs/ 申请免费API Key');
}

async function searchPixabay(params: SearchParams): Promise<SearchResult> {
  const page = params.page || 1;
  const perPage = params.perPage || 20;

  const queryParams = new URLSearchParams({
    q: params.query,
    per_page: perPage.toString(),
    page: page.toString(),
    safesearch: 'true',
    key: PIXABAY_API_KEY,
  });

  if (params.orientation) {
    const orientationMap: Record<string, string> = {
      landscape: 'horizontal',
      portrait: 'vertical',
    };
    queryParams.set('orientation', orientationMap[params.orientation] || 'all');
  }

  const res = await fetch(`${PIXABAY_BASE}?${queryParams}`);

  if (!res.ok) {
    throw new Error(`Pixabay API error: ${res.status}`);
  }

  const data = await res.json();

  const items: VideoAsset[] = (data.hits || []).map((v: any) => {
    const videos = v.videos || {};
    const video = videos.medium || videos.large || videos.small || videos.tiny;

    return {
      id: `pixabay-${v.id}`,
      title: v.tags?.split(',').join(' ') || 'Pixabay Video',
      thumbnail: v.userImageURL || v.videos?.tiny?.url || '',
      videoUrl: video?.url?.replace('http://', 'https://') || '',
      duration: v.duration || 0,
      width: video?.width || v.duration ? 640 : 0,
      height: video?.height || v.duration ? 360 : 0,
      source: 'pixabay' as const,
      tags: v.tags?.split(',').map((t: string) => t.trim()),
    };
  });

  return {
    items,
    total: data.totalHits || items.length,
    page,
    perPage,
    hasMore: items.length >= perPage,
  };
}

export default searchPixabay;
