// 如果没有配置API Key，使用空的（会返回错误但不会崩溃）
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
const PEXELS_BASE = 'https://api.pexels.com/videos';
// 免费演示Key（仅供测试，有请求限制）
// 建议用户申请自己的Key: https://www.pexels.com/api/
const DEMO_KEY = '';
async function searchPexels(params) {
    const page = params.page || 1;
    const perPage = params.perPage || 20;
    const queryParams = new URLSearchParams({
        query: params.query,
        per_page: perPage.toString(),
        page: page.toString(),
    });
    if (params.orientation && params.orientation !== 'square') {
        queryParams.set('orientation', params.orientation);
    }
    const headers = { 'Content-Type': 'application/json' };
    if (PEXELS_API_KEY) {
        headers['Authorization'] = PEXELS_API_KEY;
    }
    const res = await fetch(`${PEXELS_BASE}/search?${queryParams}`, { headers });
    if (!res.ok) {
        throw new Error(`Pexels API error: ${res.status}`);
    }
    const data = await res.json();
    const items = (data.videos || []).map((v) => {
        // Pexels返回多种尺寸，选择中等的
        const videoFile = v.video_files?.find((f) => f.quality === 'sd' || f.quality === 'hd') || v.video_files?.[0];
        const thumb = v.image || v.video_files?.[0]?.thumbnail;
        return {
            id: `pexels-${v.id}`,
            title: v.alt || v.user?.name || 'Pexels Video',
            description: v.alt,
            thumbnail: thumb || '',
            videoUrl: videoFile?.link || '',
            duration: v.duration || 0,
            width: videoFile?.width || v.width || 1920,
            height: videoFile?.height || v.height || 1080,
            source: 'pexels',
            tags: v.tags || [],
        };
    });
    return {
        items,
        total: data.total_results || items.length,
        page,
        perPage,
        hasMore: items.length >= perPage,
    };
}
export default searchPexels;
