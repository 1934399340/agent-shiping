import { useState } from 'react';
import { Search, Download, Plus, Loader2, Video, ImageIcon } from 'lucide-react';
import type { VideoAsset, VideoSource } from '@/types';
import { useEditorStore } from '@/stores/editorStore';

const API_BASE = '/api';

const SOURCES: { value: VideoSource | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pexels', label: 'Pexels' },
  { value: 'pixabay', label: 'Pixabay' },
  { value: 'mixkit', label: 'Mixkit' },
];

export default function SearchPanel() {
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<VideoSource | 'all'>('all');
  const [results, setResults] = useState<VideoAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const addClip = useEditorStore((s) => s.addClip);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({
        query: query.trim(),
        source,
        perPage: '20',
      });
      const res = await fetch(`${API_BASE}/search?${params}`);
      const data = await res.json();
      setResults(data.items || []);
    } catch (err) {
      console.error('搜索失败:', err);
      setResults([]);
    }
    setLoading(false);
  };

  const handleAddToTimeline = async (asset: VideoAsset) => {
    const videoTrack = useEditorStore.getState().project.tracks.find((t) => t.type === 'video');
    if (!videoTrack) return;

    // 找到轨道末尾
    const lastClipEnd = videoTrack.clips.reduce(
      (max, c) => Math.max(max, c.startTime + c.duration),
      0,
    );

    // 获取真实视频时长
    let realDuration = asset.duration;
    
    // 如果API返回的时长为0或不合理，尝试获取真实时长
    if (asset.duration <= 0 || asset.duration > 300) {
      try {
        const res = await fetch(`${API_BASE}/video/info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: asset.videoUrl }),
        });
        const info = await res.json();
        if (info.duration > 0) {
          realDuration = info.duration;
        }
      } catch (err) {
        console.warn('获取视频时长失败，使用默认值');
        realDuration = 15;
      }
    }

    const clipDuration = Math.min(realDuration, 15); // 默认最长15秒

    addClip(videoTrack.id, {
      id: crypto.randomUUID().slice(0, 8),
      trackId: videoTrack.id,
      asset,
      type: 'video',
      startTime: lastClipEnd,
      duration: clipDuration,
      trimStart: 0,
      trimEnd: clipDuration,
      volume: 1,
      label: asset.title,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* 搜索栏 */}
      <div className="p-3 border-b border-editor-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-editor-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索视频素材..."
              className="w-full bg-editor-bg border border-editor-border rounded-lg pl-8 pr-3 py-2 text-sm
                placeholder:text-editor-muted/60 focus:outline-none focus:border-editor-accent/50
                transition-colors"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-3 py-2 bg-editor-accent rounded-lg text-sm font-medium text-white
              hover:bg-editor-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : '搜索'}
          </button>
        </div>

        {/* 来源筛选 */}
        <div className="flex gap-1">
          {SOURCES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSource(s.value)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                source === s.value
                  ? 'bg-editor-accent/20 text-editor-accent'
                  : 'text-editor-muted hover:text-editor-text'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 搜索结果 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {!searched && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-editor-muted">
            <Video size={40} className="mb-3 opacity-30" />
            <p className="text-sm">输入关键词搜索视频素材</p>
            <p className="text-xs mt-1 opacity-60">支持中英文搜索</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={24} className="animate-spin text-editor-accent" />
            <span className="ml-2 text-sm text-editor-muted">搜索中...</span>
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-editor-muted">
            <ImageIcon size={32} className="mb-2 opacity-30" />
            <p className="text-sm">没有找到相关素材</p>
            <p className="text-xs mt-1 opacity-60">试试其他关键词</p>
          </div>
        )}

        {results.map((asset) => (
          <div key={asset.id} className="search-card bg-editor-bg rounded-lg overflow-hidden border border-editor-border">
            {/* 缩略图 */}
            <div className="relative aspect-video bg-editor-panel">
              <img
                src={asset.thumbnail}
                alt={asset.title}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '';
                  (e.target as HTMLImageElement).classList.add('skeleton');
                }}
              />
              {/* 时长标签 */}
              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                {formatDuration(asset.duration)}
              </div>
              {/* 来源标签 */}
              <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded capitalize">
                {asset.source}
              </div>
              {/* 分辨率 */}
              <div className="absolute top-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                {asset.width}×{asset.height}
              </div>
            </div>

            {/* 信息 */}
            <div className="p-2">
              <p className="text-xs text-editor-text truncate mb-2">{asset.title}</p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleAddToTimeline(asset)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-editor-accent/15
                    text-editor-accent rounded text-xs hover:bg-editor-accent/25 transition-colors"
                >
                  <Plus size={12} /> 添加
                </button>
                <a
                  href={asset.videoUrl}
                  target="_blank"
                  rel="noopener"
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-editor-panel
                    text-editor-muted rounded text-xs hover:text-editor-text transition-colors"
                >
                  <Download size={12} /> 预览
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
