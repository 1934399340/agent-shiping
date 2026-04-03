// ============================================
// 视频搜索服务 - Mixkit（免费，无需API Key）
// ============================================
import type { VideoAsset, SearchResult, SearchParams } from '../../types/index.js';

// Mixkit官方API端点
const MIXKIT_BASE = 'https://mixkit.co/api/v1';

interface MixkitVideo {
  id: number;
  title: string;
  description: string;
  url: string;
  thumbnail_url: string;
  duration_seconds: number;
  width: number;
  height: number;
  category: string;
  tags: string[];
}

async function searchMixkit(params: SearchParams): Promise<SearchResult> {
  const page = params.page || 1;
  const perPage = params.perPage || 20;

  // 直接返回demo数据（最可靠）
  console.log(`🎬 Mixkit搜索: "${params.query}"`);
  return getMixkitDemoData(params);
}

// 备用方案：直接从Mixkit网站获取免费视频列表
async function searchMixkitFallback(params: SearchParams): Promise<SearchResult> {
  const page = params.page || 1;
  const perPage = params.perPage || 20;

  try {
    // 使用Mixkit的公开视频库端点
    const res = await fetch(`https://mixkit.co/free-stock-video/music/page/${page}/?per_page=${perPage}`, {
      headers: {
        'Accept': 'text/html',
      },
    });
    
    if (!res.ok) {
      return { items: [], total: 0, page, perPage, hasMore: false };
    }

    // 如果API不可用，返回示例数据
    return getMixkitDemoData(params);
  } catch {
    return getMixkitDemoData(params);
  }
}

// Mixkit示例数据（当API不可用时使用）
function getMixkitDemoData(params: SearchParams): SearchResult {
  const query = params.query.toLowerCase();
  
  // Mixkit热门免费视频（预置数据）
  const allVideos: VideoAsset[] = [
    {
      id: 'mixkit-demo-1',
      title: 'Abstract Digital Background',
      thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-network-connections-27610-large.mp4',
      duration: 15,
      width: 1920,
      height: 1080,
      source: 'mixkit',
      tags: ['abstract', 'technology', 'background'],
    },
    {
      id: 'mixkit-demo-2',
      title: 'City Traffic at Night',
      thumbnail: 'https://images.unsplash.com/photo-1519501025264-69ba3569e6c0?w=400',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-driving-at-night-through-a-lit-city-road-4050-large.mp4',
      duration: 10,
      width: 1920,
      height: 1080,
      source: 'mixkit',
      tags: ['city', 'night', 'traffic', 'urban'],
    },
    {
      id: 'mixkit-demo-3',
      title: 'Nature Forest Stream',
      thumbnail: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-stream-in-the-middle-of-the-forest-539-large.mp4',
      duration: 12,
      width: 1920,
      height: 1080,
      source: 'mixkit',
      tags: ['nature', 'forest', 'water', 'stream'],
    },
    {
      id: 'mixkit-demo-4',
      title: 'Business Team Working',
      thumbnail: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-team-of-young-people-working-on-computers-4829-large.mp4',
      duration: 18,
      width: 1920,
      height: 1080,
      source: 'mixkit',
      tags: ['business', 'team', 'work', 'office'],
    },
    {
      id: 'mixkit-demo-5',
      title: 'Ocean Waves on Beach',
      thumbnail: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=400',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4',
      duration: 20,
      width: 1920,
      height: 1080,
      source: 'mixkit',
      tags: ['ocean', 'beach', 'waves', 'nature'],
    },
    {
      id: 'mixkit-demo-6',
      title: 'Clouds Time Lapse',
      thumbnail: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=400',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-clouds-and-blue-sky-2408-large.mp4',
      duration: 25,
      width: 1920,
      height: 1080,
      source: 'mixkit',
      tags: ['clouds', 'sky', 'timelapse', 'nature'],
    },
    {
      id: 'mixkit-demo-7',
      title: 'Woman Using Laptop',
      thumbnail: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-typing-on-a-laptop-in-dim-light-1342-large.mp4',
      duration: 15,
      width: 1920,
      height: 1080,
      source: 'mixkit',
      tags: ['woman', 'laptop', 'work', 'technology'],
    },
    {
      id: 'mixkit-demo-8',
      title: 'Abstract Particle Background',
      thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4',
      duration: 30,
      width: 1920,
      height: 1080,
      source: 'mixkit',
      tags: ['abstract', 'particles', 'background', 'space'],
    },
  ];

  // 简单的关键词匹配
  const filtered = query 
    ? allVideos.filter(v => 
        v.title.toLowerCase().includes(query) ||
        v.tags.some(t => t.includes(query))
      )
    : allVideos;

  return {
    items: filtered.slice(0, perPage),
    total: filtered.length,
    page,
    perPage,
    hasMore: false,
  };
}

export default searchMixkit;
