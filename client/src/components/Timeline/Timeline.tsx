import { useCallback, useRef, useState, useEffect } from 'react';
import {
  Plus, Minus, Trash2, Volume2, VolumeX, Lock, Unlock,
  Eye, EyeOff, ZoomIn, ZoomOut, Scissors, Music, Type, Sparkles,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEditorStore } from '@/stores/editorStore';
import type { Track, TrackType } from '@/types';

const PIXELS_PER_SECOND = 80; // 基准：每秒80px

/** 时间线轨道颜色映射 */
const TRACK_COLORS: Record<TrackType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  video: { bg: 'bg-purple-500/25', border: 'border-purple-500/50', text: 'text-purple-300', icon: <Music size={12} /> },
  audio: { bg: 'bg-cyan-500/25', border: 'border-cyan-500/50', text: 'text-cyan-300', icon: <Volume2 size={12} /> },
  text: { bg: 'bg-amber-500/25', border: 'border-amber-500/50', text: 'text-amber-300', icon: <Type size={12} /> },
  effect: { bg: 'bg-pink-500/25', border: 'border-pink-500/50', text: 'text-pink-300', icon: <Sparkles size={12} /> },
  image: { bg: 'bg-green-500/25', border: 'border-green-500/50', text: 'text-green-300', icon: <Sparkles size={12} /> },
};

const TRACK_LABELS: Record<TrackType, string> = {
  video: '视频',
  audio: '音频',
  text: '文字',
  effect: '特效',
  image: '图片',
};

function SortableTrackLabel({ track }: { track: Track }) {
  const { toggleMute, toggleLock, addTrack } = useEditorStore();
  const colors = TRACK_COLORS[track.type];
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="h-[52px] flex items-center px-2 gap-1.5 border-b border-editor-border/50"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical size={12} className="text-editor-muted" />
      </div>
      <div className={`w-5 h-5 rounded flex items-center justify-center ${colors.bg}`}>
        <span className={colors.text}>{colors.icon}</span>
      </div>
      <span className="text-[11px] font-medium truncate flex-1">
        {track.name}
      </span>
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => toggleMute(track.id)}
          className={`p-1 rounded transition-colors ${track.muted ? 'text-editor-danger' : 'text-editor-muted hover:text-editor-text'}`}
          title={track.muted ? '取消静音' : '静音'}
        >
          {track.muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
        </button>
        <button
          onClick={() => toggleLock(track.id)}
          className={`p-1 rounded transition-colors ${track.locked ? 'text-editor-accent' : 'text-editor-muted hover:text-editor-text'}`}
          title={track.locked ? '解锁' : '锁定'}
        >
          {track.locked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>
      </div>
    </div>
  );
}

export default function Timeline() {
  const {
    project, currentTime, setCurrentTime, isPlaying,
    zoom, setZoom,
    selectedClipId, selectedTrackId, selectClip,
    removeClip, splitClip, reorderTracks,
  } = useEditorStore();
  
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragClipInfo, setDragClipInfo] = useState<{ trackId: string; clipId: string; offsetX: number } | null>(null);

  const pps = PIXELS_PER_SECOND * zoom; // 实际每秒像素
  const totalWidth = Math.max(project.duration * pps, 1200);
  const trackIds = project.tracks.map((track) => track.id);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: any) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = trackIds.indexOf(active.id);
        const newIndex = trackIds.indexOf(over.id);
        const newOrder = arrayMove(trackIds, oldIndex, newIndex);
        reorderTracks(newOrder);
      }
      setActiveTrackId(null);
    },
    [trackIds, reorderTracks]
  );

  const handleDragStart = useCallback((event: any) => {
    setActiveTrackId(event.active.id);
  }, []);

  // 点击时间线设置当前时间
  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging || dragClipInfo) return;
      const rect = (e.target as HTMLElement).closest('.timeline-ruler');
      if (!rect) return;
      const x = e.clientX - rect.getBoundingClientRect().left;
      const time = Math.max(0, x / pps);
      setCurrentTime(Math.min(time, project.duration));
    },
    [pps, project.duration, setCurrentTime, isDragging, dragClipInfo],
  );

  // 拖拽片段
  const handleClipMouseDown = useCallback(
    (e: React.MouseEvent, trackId: string, clipId: string) => {
      e.stopPropagation();
      const clip = project.tracks.find((t) => t.id === trackId)?.clips.find((c) => c.id === clipId);
      if (!clip) return;

      setIsDragging(true);
      selectClip(clipId, trackId);
      setDragClipInfo({
        trackId,
        clipId,
        offsetX: (e.clientX - e.currentTarget.getBoundingClientRect().left) / pps - clip.startTime,
      });
    },
    [project.tracks, selectClip, pps],
  );

  useEffect(() => {
    if (!isDragging || !dragClipInfo) return;

    const handleMouseMove = (e: MouseEvent) => {
      const trackEl = document.querySelector(`[data-track-id="${dragClipInfo.trackId}"]`);
      if (!trackEl) return;
      const rect = trackEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const newTime = Math.max(0, x / pps - dragClipInfo.offsetX);

      const store = useEditorStore.getState();
      const track = store.project.tracks.find((t) => t.id === dragClipInfo.trackId);
      const clip = track?.clips.find((c) => c.id === dragClipInfo.clipId);
      if (clip && track) {
        store.updateClip(dragClipInfo.trackId, dragClipInfo.clipId, {
          startTime: Math.max(0, newTime),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragClipInfo(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragClipInfo, pps]);

  const {
    copyClipToClipboard,
    pasteClipFromClipboard,
    cutClipToClipboard,
  } = useEditorStore();

  // 快捷键
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' && selectedClipId && selectedTrackId) {
        removeClip(selectedTrackId, selectedClipId);
      }
      if (e.key === 'b' || e.key === 'B') {
        if (selectedClipId && selectedTrackId) {
          splitClip(selectedTrackId, selectedClipId, currentTime);
        }
      }
      if (e.key === ' ') {
        e.preventDefault();
        useEditorStore.getState().setIsPlaying(!useEditorStore.getState().isPlaying);
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedClipId && selectedTrackId) {
        e.preventDefault();
        await copyClipToClipboard(selectedTrackId, selectedClipId);
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'x' && selectedClipId && selectedTrackId) {
        e.preventDefault();
        await cutClipToClipboard(selectedTrackId, selectedClipId);
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && selectedTrackId) {
        e.preventDefault();
        await pasteClipFromClipboard(selectedTrackId, currentTime);
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedClipId && selectedTrackId) {
        e.preventDefault();
        useEditorStore.getState().duplicateClip(selectedTrackId, selectedClipId);
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          useEditorStore.getState().redo();
        } else {
          useEditorStore.getState().undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, selectedTrackId, removeClip, splitClip, currentTime, copyClipToClipboard, pasteClipFromClipboard, cutClipToClipboard]);

  // 缩放时间线
  const handleZoomChange = (delta: number) => {
    setZoom(zoom + delta);
  };

  // 格式化时间刻度
  const formatTick = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // 生成时间刻度
  const ticks: number[] = [];
  const tickInterval = zoom >= 2 ? 1 : zoom >= 1 ? 2 : 5;
  for (let t = 0; t <= project.duration; t += tickInterval) {
    ticks.push(t);
  }

  return (
    <div className="flex flex-col h-full select-none">
      {/* 时间线头部 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-editor-border shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-editor-muted font-medium uppercase tracking-wider">时间线</span>
          <div className="h-3 w-px bg-editor-border" />
          <button
            onClick={() => {
              const trackType = prompt('选择轨道类型 (video/audio/text/effect/image):') || 'video';
              if (['video', 'audio', 'text', 'effect', 'image'].includes(trackType)) {
                useEditorStore.getState().addTrack(trackType as any);
              }
            }}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-editor-muted
              hover:text-editor-text hover:bg-editor-panel transition-colors"
          >
            <Plus size={11} /> 添加轨道
          </button>
          <div className="h-3 w-px bg-editor-border" />
          <button
            onClick={() => useEditorStore.getState().splitClip(
              selectedTrackId || '', selectedClipId || '', currentTime
            )}
            disabled={!selectedClipId}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-editor-muted
              hover:text-editor-text hover:bg-editor-panel transition-colors disabled:opacity-30"
          >
            <Scissors size={11} /> 拆分(B)
          </button>
          <button
            onClick={() => selectedClipId && selectedTrackId && removeClip(selectedTrackId, selectedClipId)}
            disabled={!selectedClipId}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-editor-danger
              hover:bg-editor-danger/10 transition-colors disabled:opacity-30"
          >
            <Trash2 size={11} /> 删除(Del)
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => handleZoomChange(-0.2)} className="p-1 text-editor-muted hover:text-editor-text">
            <ZoomOut size={14} />
          </button>
          <span className="text-[11px] font-mono text-editor-muted w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => handleZoomChange(0.2)} className="p-1 text-editor-muted hover:text-editor-text">
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      {/* 时间线主体（可滚动） */}
      <div className="flex-1 overflow-x-auto overflow-y-auto" ref={timelineRef}>
        <div className="flex min-h-full">
          {/* 轨道标签列 */}
          <div className="sticky left-0 z-20 w-40 min-w-[160px] bg-editor-surface border-r border-editor-border shrink-0">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              onDragStart={handleDragStart}
            >
              <SortableContext
                items={trackIds}
                strategy={verticalListSortingStrategy}
              >
                {project.tracks.map((track) => (
                  <SortableTrackLabel key={track.id} track={track} />
                ))}
              </SortableContext>
              <DragOverlay>
                {activeTrackId ? (
                  <div className="opacity-80">
                    {(() => {
                      const track = project.tracks.find((t) => t.id === activeTrackId);
                      if (!track) return null;
                      const colors = TRACK_COLORS[track.type];
                      return (
                        <div className="h-[52px] flex items-center px-2 gap-1.5 border-b border-editor-border/50 bg-editor-surface shadow-lg rounded">
                          <GripVertical size={12} className="text-editor-muted" />
                          <div className={`w-5 h-5 rounded flex items-center justify-center ${colors.bg}`}>
                            <span className={colors.text}>{colors.icon}</span>
                          </div>
                          <span className="text-[11px] font-medium truncate flex-1">
                            {track.name}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>

          {/* 时间线内容 */}
          <div className="flex-1 relative">
            {/* 时间刻度尺 */}
            <div
              className="timeline-ruler h-6 bg-editor-bg border-b border-editor-border sticky top-0 z-10 cursor-pointer"
              style={{ width: totalWidth }}
              onClick={handleTimelineClick}
            >
              {ticks.map((t) => (
                <div
                  key={t}
                  className="absolute top-0 h-full flex flex-col items-center"
                  style={{ left: t * pps }}
                >
                  <span className="text-[9px] font-mono text-editor-muted mt-0.5">
                    {formatTick(t)}
                  </span>
                  <div className="w-px h-2 bg-editor-border mt-auto" />
                </div>
              ))}
            </div>

            {/* 播放头 */}
            <div
              className="absolute top-0 bottom-0 w-px bg-red-500 z-30 pointer-events-none"
              style={{ left: currentTime * pps, transform: 'translateX(-0.5px)' }}
            >
              {/* 播放头三角 */}
              <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500"
                style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
              />
            </div>

            {/* 轨道内容 */}
            {project.tracks.map((track) => (
              <div
                key={track.id}
                data-track-id={track.id}
                className="relative h-[52px] border-b border-editor-border/50"
                style={{ width: totalWidth }}
                onDragOver={(e) => e.preventDefault()}
              >
                {/* 轨道背景 */}
                <div className="absolute inset-0 opacity-5">
                  {Array.from({ length: Math.ceil(totalWidth / 40) }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-white/30"
                      style={{ left: i * 40 }}
                    />
                  ))}
                </div>

                {/* 片段 */}
                {track.clips.map((clip) => {
                  const colors = TRACK_COLORS[clip.type] || TRACK_COLORS.video;
                  const isSelected = clip.id === selectedClipId;
                  return (
                    <div
                      key={clip.id}
                      className={`timeline-clip absolute top-1 bottom-1 rounded-md cursor-move
                        ${colors.bg} border ${isSelected ? `${colors.border} ring-1 ring-editor-accent` : colors.border}
                        ${track.locked ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={{
                        left: clip.startTime * pps,
                        width: clip.duration * pps,
                      }}
                      onMouseDown={(e) => !track.locked && handleClipMouseDown(e, track.id, clip.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectClip(clip.id, track.id);
                      }}
                    >
                      {/* 片段内容 */}
                      <div className="h-full flex items-center px-2 overflow-hidden">
                        <span className={`text-[10px] font-medium truncate ${colors.text}`}>
                          {clip.label || clip.ttsText?.slice(0, 20) || clip.transitionType || clip.type}
                        </span>
                      </div>

                      {/* 拖拽手柄 */}
                      {isSelected && !track.locked && (
                        <>
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-editor-accent/40 rounded-l-md hover:bg-editor-accent/70" />
                          <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize bg-editor-accent/40 rounded-r-md hover:bg-editor-accent/70" />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
