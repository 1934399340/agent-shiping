/**
 * 媒体库面板 - 本地素材管理
 * 支持：视频、音频、图片导入
 */
import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FolderOpen,
  Video,
  Music,
  Image,
  Trash2,
  Plus,
  RefreshCw,
  Folder,
  File,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';

type MediaType = 'video' | 'audio' | 'image' | 'all';

interface LocalMedia {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  file: File;
  url: string; // Object URL
  thumbnail?: string;
  duration?: number;
  width?: number;
  height?: number;
  size: number;
  addedAt: number;
}

const ACCEPT_TYPES: Record<MediaType, string> = {
  video: 'video/mp4,video/webm,video/quicktime,video/x-msvideo',
  audio: 'audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/aac',
  image: 'image/jpeg,image/png,image/gif,image/webp',
  all: 'video/*,audio/*,image/*',
};

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export default function MediaLibrary() {
  const [media, setMedia] = useState<LocalMedia[]>([]);
  const [filter, setFilter] = useState<MediaType>('all');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addClip = useEditorStore((s) => s.addClip);

  // 处理文件上传
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    setError(null);

    const newMedia: LocalMedia[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      try {
        // 检查文件大小
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: 文件过大（最大500MB）`);
          continue;
        }

        // 确定媒体类型
        let mediaType: 'video' | 'audio' | 'image';
        if (file.type.startsWith('video/')) {
          mediaType = 'video';
        } else if (file.type.startsWith('audio/')) {
          mediaType = 'audio';
        } else if (file.type.startsWith('image/')) {
          mediaType = 'image';
        } else {
          errors.push(`${file.name}: 不支持的文件类型`);
          continue;
        }

        // 创建Object URL
        const url = URL.createObjectURL(file);

        // 获取媒体信息
        let duration = 0;
        let width = 0;
        let height = 0;
        let thumbnail: string | undefined;

        if (mediaType === 'video' || mediaType === 'audio') {
          const info = await getMediaInfo(url, mediaType);
          duration = info.duration;
          width = info.width;
          height = info.height;
          thumbnail = info.thumbnail;
        } else if (mediaType === 'image') {
          // 图片生成缩略图
          thumbnail = await generateImageThumbnail(url);
        }

        newMedia.push({
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          type: mediaType,
          file,
          url,
          thumbnail,
          duration,
          width,
          height,
          size: file.size,
          addedAt: Date.now(),
        });
      } catch (err: any) {
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    setMedia((prev) => [...newMedia, ...prev]);
    setUploading(false);

    if (errors.length > 0) {
      setError(errors.join('\n'));
    }
  }, []);

  // 获取媒体信息
  const getMediaInfo = (
    url: string,
    type: 'video' | 'audio'
  ): Promise<{ duration: number; width: number; height: number; thumbnail?: string }> => {
    return new Promise((resolve) => {
      if (type === 'video') {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          // 生成缩略图
          video.currentTime = Math.min(1, video.duration * 0.1);
        };
        video.onseeked = () => {
          // 截取视频帧作为缩略图
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 180;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

          resolve({
            duration: video.duration,
            width: video.videoWidth,
            height: video.videoHeight,
            thumbnail,
          });
        };
        video.onerror = () => resolve({ duration: 0, width: 0, height: 0 });
        video.src = url;
      } else {
        // 音频
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
          resolve({
            duration: audio.duration,
            width: 0,
            height: 0,
          });
        };
        audio.onerror = () => resolve({ duration: 0, width: 0, height: 0 });
        audio.src = url;
      }
    });
  };

  // 生成图片缩略图
  const generateImageThumbnail = (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');

        // 保持比例裁剪
        const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;

        ctx?.drawImage(img, x, y, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve('');
      img.src = url;
    });
  };

  // 添加到时间线
  const handleAddToTimeline = (item: LocalMedia) => {
    // 图片使用video轨道（因为图片可以当作静态视频处理）
    const trackType = item.type === 'image' ? 'video' : item.type;
    const track = useEditorStore.getState().project.tracks.find((t) => t.type === trackType);
    if (!track) {
      console.error(`找不到${trackType}轨道`);
      return;
    }

    // 找到轨道末尾
    const lastClipEnd = track.clips.reduce(
      (max, c) => Math.max(max, c.startTime + c.duration),
      0
    );

    const duration = item.duration || 5; // 图片默认5秒

    addClip(track.id, {
      id: crypto.randomUUID().slice(0, 8),
      trackId: track.id,
      asset: {
        id: item.id,
        title: item.name,
        videoUrl: item.type === 'video' ? item.url : undefined,
        audioUrl: item.type === 'audio' ? item.url : undefined,
        imageUrl: item.type === 'image' ? item.url : undefined,
        thumbnail: item.thumbnail,
        duration: item.duration || 0,
        width: item.width || 1920,
        height: item.height || 1080,
        source: 'local' as any,
      },
      type: item.type === 'image' ? 'video' : item.type, // 图片当作视频处理
      startTime: lastClipEnd,
      duration,
      trimStart: 0,
      trimEnd: duration,
      volume: 1,
      label: item.name,
    });
  };

  // 删除素材
  const handleDelete = (id: string) => {
    const item = media.find((m) => m.id === id);
    if (item) {
      URL.revokeObjectURL(item.url);
    }
    setMedia((prev) => prev.filter((m) => m.id !== id));
  };

  // 清空所有素材
  const handleClearAll = () => {
    media.forEach((m) => URL.revokeObjectURL(m.url));
    setMedia([]);
  };

  // 过滤素材
  const filteredMedia = filter === 'all' ? media : media.filter((m) => m.type === filter);

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  // 格式化时长
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="p-3 border-b border-editor-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <FolderOpen size={16} /> 媒体库
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 bg-editor-accent text-white rounded hover:bg-editor-accent-hover transition-colors"
              title="导入素材"
            >
              <Upload size={14} />
            </button>
            <button
              onClick={handleClearAll}
              className="p-1.5 text-editor-muted hover:text-editor-text rounded transition-colors"
              title="清空素材库"
              disabled={media.length === 0}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* 类型筛选 */}
        <div className="flex gap-1">
          {(['all', 'video', 'audio', 'image'] as MediaType[]).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                filter === t
                  ? 'bg-editor-accent/20 text-editor-accent'
                  : 'text-editor-muted hover:text-editor-text'
              }`}
            >
              {t === 'all' ? '全部' : t === 'video' ? '视频' : t === 'audio' ? '音频' : '图片'}
            </button>
          ))}
        </div>
      </div>

      {/* 拖放区域 */}
      <div
        className={`flex-1 overflow-y-auto p-2 ${
          dragOver ? 'bg-editor-accent/10' : ''
        } transition-colors`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
          }
        }}
      >
        {/* 空状态 */}
        {media.length === 0 && !uploading && (
          <div
            className="flex flex-col items-center justify-center h-full text-editor-muted cursor-pointer
              border-2 border-dashed border-editor-border rounded-lg p-6 hover:border-editor-accent/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={32} className="mb-3 opacity-30" />
            <p className="text-sm mb-1">拖放文件到这里</p>
            <p className="text-xs opacity-60">或点击上传</p>
            <p className="text-xs mt-3 opacity-40">支持: MP4, WebM, MP3, WAV, JPG, PNG</p>
          </div>
        )}

        {/* 上传中状态 */}
        {uploading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={24} className="animate-spin text-editor-accent" />
            <span className="ml-2 text-sm text-editor-muted">处理中...</span>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="mb-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400 flex items-start gap-2">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <pre className="flex-1 whitespace-pre-wrap">{error}</pre>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              ×
            </button>
          </div>
        )}

        {/* 素材列表 */}
        <div className="space-y-2">
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              className="media-card bg-editor-bg rounded-lg overflow-hidden border border-editor-border
                hover:border-editor-accent/50 transition-colors group"
            >
              {/* 缩略图 */}
              <div className="relative aspect-video bg-editor-panel">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : item.type === 'audio' ? (
                  <div className="flex items-center justify-center h-full">
                    <Music size={32} className="text-editor-accent opacity-50" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <File size={32} className="text-editor-muted opacity-30" />
                  </div>
                )}

                {/* 类型图标 */}
                <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                  {item.type === 'video' && <Video size={10} className="inline mr-1" />}
                  {item.type === 'audio' && <Music size={10} className="inline mr-1" />}
                  {item.type === 'image' && <Image size={10} className="inline mr-1" />}
                  {item.type === 'video' ? '视频' : item.type === 'audio' ? '音频' : '图片'}
                </div>

                {/* 时长 */}
                {item.duration && item.duration > 0 && (
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                    {formatDuration(item.duration)}
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => handleAddToTimeline(item)}
                    className="p-2 bg-editor-accent rounded-full text-white hover:bg-editor-accent-hover transition-colors"
                    title="添加到时间线"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* 信息 */}
              <div className="p-2">
                <p className="text-xs text-editor-text truncate mb-1" title={item.name}>
                  {item.name}
                </p>
                <div className="flex items-center justify-between text-[10px] text-editor-muted">
                  <span>{formatSize(item.size)}</span>
                  {item.width && item.height && (
                    <span>{item.width}×{item.height}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部统计 */}
      {media.length > 0 && (
        <div className="p-2 border-t border-editor-border text-xs text-editor-muted">
          {media.length} 个素材
          {' • '}
          {formatSize(media.reduce((sum, m) => sum + m.size, 0))}
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_TYPES[filter]}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            handleFiles(e.target.files);
          }
          e.target.value = '';
        }}
      />
    </div>
  );
}
