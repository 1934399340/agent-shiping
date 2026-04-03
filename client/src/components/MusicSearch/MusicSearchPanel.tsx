// ============================================
// 音乐搜索面板
// ============================================
import { useState, useEffect, useCallback } from 'react';
import { Music, Search, Play, Pause, Plus, Filter, Clock, Disc } from 'lucide-react';
import type { AudioAsset } from '../../../../shared/types';

type MusicGenre = 'ambient' | 'cinematic' | 'corporate' | 'electronic'
  | 'folk' | 'hip-hop' | 'jazz' | 'pop' | 'rock' | 'world';

const GENRE_LABELS: Record<MusicGenre, string> = {
  ambient: '环境音乐',
  cinematic: '电影感',
  corporate: '商业',
  electronic: '电子',
  folk: '民谣',
  'hip-hop': '嘻哈',
  jazz: '爵士',
  pop: '流行',
  rock: '摇滚',
  world: '世界音乐',
};

interface MusicSearchPanelProps {
  onAddToTimeline: (music: AudioAsset) => void;
}

export default function MusicSearchPanel({ onAddToTimeline }: MusicSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState<MusicGenre | 'all'>('all');
  const [results, setResults] = useState<AudioAsset[]>([]);
  const [recommended, setRecommended] = useState<AudioAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [showGenreFilter, setShowGenreFilter] = useState(false);

  // 加载推荐音乐
  useEffect(() => {
    fetch('/api/music/recommended?count=6')
      .then((res) => res.json())
      .then((data) => setRecommended(data.items || []))
      .catch(console.error);
  }, []);

  // 搜索音乐
  const handleSearch = useCallback(async () => {
    if (!query.trim() && genre === 'all') {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (genre !== 'all') params.set('genre', genre);

      const res = await fetch(`/api/music/search?${params}`);
      const data = await res.json();
      setResults(data.items || []);
    } catch (error) {
      console.error('搜索失败:', error);
    }
    setLoading(false);
  }, [query, genre]);

  // 播放/暂停预览
  const togglePlay = (music: AudioAsset) => {
    if (playingId === music.id) {
      // 停止播放
      if (audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
      }
      setPlayingId(null);
    } else {
      // 播放新音频
      if (audioRef) {
        audioRef.pause();
      }
      const audio = new Audio(music.audioUrl);
      audio.onended = () => setPlayingId(null);
      audio.play();
      setAudioRef(audio);
      setPlayingId(music.id);
    }
  };

  // 格式化时长
  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // 音乐卡片
  const MusicCard = ({ music }: { music: AudioAsset }) => (
    <div
      className="group bg-editor-bg rounded-lg p-3 hover:bg-editor-panel transition-colors cursor-pointer"
      onClick={() => togglePlay(music)}
    >
      <div className="flex items-start gap-3">
        {/* 封面/播放按钮 */}
        <div className="relative w-12 h-12 bg-editor-panel rounded-lg flex items-center justify-center shrink-0 group-hover:bg-editor-accent/20 transition-colors">
          {playingId === music.id ? (
            <Pause size={18} className="text-editor-accent" />
          ) : (
            <Play size={18} className="text-editor-muted group-hover:text-editor-accent transition-colors" />
          )}
        </div>

        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium truncate">{music.title}</h4>
          <p className="text-xs text-editor-muted truncate mt-0.5">{music.description}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-editor-muted flex items-center gap-1">
              <Clock size={10} />
              {formatDuration(music.duration)}
            </span>
            {music.bpm && (
              <span className="text-xs text-editor-muted flex items-center gap-1">
                <Disc size={10} />
                {music.bpm} BPM
              </span>
            )}
          </div>
        </div>

        {/* 添加按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToTimeline(music);
          }}
          className="p-1.5 rounded-md bg-editor-accent/10 text-editor-accent
            hover:bg-editor-accent hover:text-white transition-colors opacity-0 group-hover:opacity-100"
          title="添加到时间线"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* 标签 */}
      {music.tags && music.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {music.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-[10px] bg-editor-panel rounded text-editor-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* 搜索栏 */}
      <div className="p-3 border-b border-editor-border">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-editor-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索音乐..."
              className="w-full pl-8 pr-3 py-2 bg-editor-bg border border-editor-border rounded-lg
                text-sm focus:outline-none focus:border-editor-accent"
            />
          </div>
          <button
            onClick={() => setShowGenreFilter(!showGenreFilter)}
            className={`p-2 rounded-lg border transition-colors ${
              showGenreFilter || genre !== 'all'
                ? 'border-editor-accent bg-editor-accent/10 text-editor-accent'
                : 'border-editor-border text-editor-muted hover:text-editor-text'
            }`}
          >
            <Filter size={14} />
          </button>
          <button
            onClick={handleSearch}
            className="px-3 py-2 bg-editor-accent text-white rounded-lg text-sm font-medium
              hover:bg-editor-accent-hover transition-colors"
          >
            搜索
          </button>
        </div>

        {/* 风格筛选 */}
        {showGenreFilter && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <button
              onClick={() => setGenre('all')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                genre === 'all'
                  ? 'bg-editor-accent text-white'
                  : 'bg-editor-bg text-editor-muted hover:text-editor-text'
              }`}
            >
              全部
            </button>
            {(Object.keys(GENRE_LABELS) as MusicGenre[]).map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  genre === g
                    ? 'bg-editor-accent text-white'
                    : 'bg-editor-bg text-editor-muted hover:text-editor-text'
                }`}
              >
                {GENRE_LABELS[g]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* 搜索结果 */}
        {results.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-editor-muted mb-2 flex items-center gap-1">
              <Music size={12} />
              搜索结果 ({results.length})
            </h3>
            <div className="space-y-2">
              {results.map((music) => (
                <MusicCard key={music.id} music={music} />
              ))}
            </div>
          </div>
        )}

        {/* 推荐音乐 */}
        {recommended.length > 0 && results.length === 0 && (
          <div>
            <h3 className="text-xs font-medium text-editor-muted mb-2 flex items-center gap-1">
              <Music size={12} />
              推荐音乐
            </h3>
            <div className="space-y-2">
              {recommended.map((music) => (
                <MusicCard key={music.id} music={music} />
              ))}
            </div>
          </div>
        )}

        {/* 加载中 */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-editor-accent border-t-transparent rounded-full" />
          </div>
        )}

        {/* 空状态 */}
        {!loading && results.length === 0 && query && (
          <div className="text-center py-8 text-editor-muted text-sm">
            没有找到匹配的音乐
          </div>
        )}
      </div>

      {/* 提示 */}
      <div className="p-2 border-t border-editor-border bg-editor-panel/50">
        <p className="text-[10px] text-editor-muted text-center">
          点击播放预览 • 点击 + 添加到时间线
        </p>
      </div>
    </div>
  );
}
