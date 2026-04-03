import { create } from 'zustand';
import type { Project, Track, TrackType, TimelineClip } from '@/types';

// ============================================
// 工具函数
// ============================================
const genId = () => crypto.randomUUID().slice(0, 8);

function createDefaultTrack(type: TrackType): Track {
  const names: Record<TrackType, string> = {
    video: '视频轨道 1',
    audio: '音频轨道 1',
    text: '文字轨道 1',
    effect: '特效轨道 1',
    image: '图片轨道 1',
  };
  return {
    id: genId(),
    type,
    name: names[type],
    clips: [],
    muted: false,
    locked: false,
    visible: true,
    height: type === 'video' || type === 'image' ? 60 : 40,
  };
}

function createDefaultProject(): Project {
  return {
    id: genId(),
    name: '未命名项目',
    tracks: [
      createDefaultTrack('effect'),
      createDefaultTrack('text'),
      createDefaultTrack('audio'),
      createDefaultTrack('image'),
      createDefaultTrack('video'),
    ],
    duration: 60,
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ============================================
// 编辑器历史（撤销/重做）
// ============================================
interface HistoryEntry {
  tracks: Track[];
  description: string;
}

// ============================================
// 主 Store
// ============================================
interface EditorStore {
  // 项目
  project: Project;

  // 播放状态
  currentTime: number;
  isPlaying: boolean;
  zoom: number; // 时间线缩放 0.5-5

  // 选中状态
  selectedClipId: string | null;
  selectedTrackId: string | null;

  // 历史
  history: HistoryEntry[];
  historyIndex: number;

  // Actions
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;
  selectClip: (clipId: string | null, trackId?: string | null) => void;

  // 轨道操作
  addTrack: (type: TrackType) => void;
  removeTrack: (trackId: string) => void;
  toggleMute: (trackId: string) => void;
  toggleLock: (trackId: string) => void;

  // 片段操作
  addClip: (trackId: string, clip: TimelineClip) => void;
  removeClip: (trackId: string, clipId: string) => void;
  moveClip: (fromTrackId: string, toTrackId: string, clipId: string, newStartTime: number) => void;
  updateClip: (trackId: string, clipId: string, updates: Partial<TimelineClip>) => void;
  splitClip: (trackId: string, clipId: string, splitTime: number) => void;

  // 实用工具
  reverseClip: (trackId: string, clipId: string) => void;
  mirrorClip: (trackId: string, clipId: string, direction: 'horizontal' | 'vertical') => void;
  duplicateClip: (trackId: string, clipId: string) => void;
  trimClip: (trackId: string, clipId: string, newStart: number, newEnd: number) => void;
  copyClip: (trackId: string, clipId: string) => TimelineClip | null;
  pasteClip: (targetTrackId: string, startTime: number) => void;

  // 历史
  pushHistory: (description: string) => void;
  undo: () => void;
  redo: () => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  project: createDefaultProject(),
  currentTime: 0,
  isPlaying: false,
  zoom: 1,
  selectedClipId: null,
  selectedTrackId: null,
  history: [],
  historyIndex: -1,

  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setZoom: (zoom) => set({ zoom: Math.max(0.5, Math.min(5, zoom)) }),

  selectClip: (clipId, trackId) =>
    set({ selectedClipId: clipId, selectedTrackId: trackId ?? null }),

  addTrack: (type) =>
    set((state) => {
      const tracks = [...state.project.tracks, createDefaultTrack(type)];
      return { project: { ...state.project, tracks } };
    }),

  removeTrack: (trackId) =>
    set((state) => {
      const tracks = state.project.tracks.filter((t) => t.id !== trackId);
      return { project: { ...state.project, tracks } };
    }),

  toggleMute: (trackId) =>
    set((state) => {
      const tracks = state.project.tracks.map((t) =>
        t.id === trackId ? { ...t, muted: !t.muted } : t,
      );
      return { project: { ...state.project, tracks } };
    }),

  toggleLock: (trackId) =>
    set((state) => {
      const tracks = state.project.tracks.map((t) =>
        t.id === trackId ? { ...t, locked: !t.locked } : t,
      );
      return { project: { ...state.project, tracks } };
    }),

  addClip: (trackId, clip) => {
    const state = get();
    state.pushHistory('添加片段');
    const tracks = state.project.tracks.map((t) =>
      t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t,
    );
    set({ project: { ...state.project, tracks, updatedAt: Date.now() } });
  },

  removeClip: (trackId, clipId) => {
    const state = get();
    state.pushHistory('删除片段');
    const tracks = state.project.tracks.map((t) =>
      t.id === trackId
        ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) }
        : t,
    );
    set({
      project: { ...state.project, tracks, updatedAt: Date.now() },
      selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
    });
  },

  moveClip: (fromTrackId, toTrackId, clipId, newStartTime) => {
    const state = get();
    state.pushHistory('移动片段');
    let clipToMove: TimelineClip | null = null;
    let fromClips: TimelineClip[] = [];

    for (const track of state.project.tracks) {
      if (track.id === fromTrackId) {
        clipToMove = track.clips.find((c) => c.id === clipId) ?? null;
        fromClips = track.clips.filter((c) => c.id !== clipId);
      }
    }

    if (!clipToMove) return;

    const movedClip = { ...clipToMove, startTime: newStartTime };
    const tracks = state.project.tracks.map((t) => {
      if (t.id === fromTrackId) return { ...t, clips: fromClips };
      if (t.id === toTrackId) return { ...t, clips: [...t.clips, movedClip] };
      return t;
    });

    set({ project: { ...state.project, tracks, updatedAt: Date.now() } });
  },

  updateClip: (trackId, clipId, updates) => {
    const state = get();
    state.pushHistory('更新片段');
    const tracks = state.project.tracks.map((t) =>
      t.id === trackId
        ? {
            ...t,
            clips: t.clips.map((c) =>
              c.id === clipId ? { ...c, ...updates } : c,
            ),
          }
        : t,
    );
    set({ project: { ...state.project, tracks, updatedAt: Date.now() } });
  },

  splitClip: (trackId, clipId, splitTime) => {
    const state = get();
    state.pushHistory('拆分片段');
    const tracks = state.project.tracks.map((t) => {
      if (t.id !== trackId) return t;
      const clip = t.clips.find((c) => c.id === clipId);
      if (!clip) return t;

      const relativeTime = splitTime - clip.startTime;
      if (relativeTime <= 0 || relativeTime >= clip.duration) return t;

      const clip1: TimelineClip = {
        ...clip,
        duration: relativeTime,
        trimEnd: clip.trimStart + relativeTime,
      };
      const clip2: TimelineClip = {
        ...clip,
        id: crypto.randomUUID().slice(0, 8),
        startTime: splitTime,
        duration: clip.duration - relativeTime,
        trimStart: clip.trimStart + relativeTime,
      };

      return {
        ...t,
        clips: t.clips.map((c) => (c.id === clipId ? clip1 : c)).concat(clip2),
      };
    });
    set({ project: { ...state.project, tracks, updatedAt: Date.now() } });
  },

  // 实用工具实现
  reverseClip: (trackId, clipId) => {
    const state = get();
    state.pushHistory('倒放片段');
    const tracks = state.project.tracks.map((t) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        clips: t.clips.map((c) => {
          if (c.id !== clipId) return c;
          // 标记为倒放（实际倒放需要在渲染时处理）
          return { ...c, reversed: true };
        }),
      };
    });
    set({ project: { ...state.project, tracks, updatedAt: Date.now() } });
  },

  mirrorClip: (trackId, clipId, direction) => {
    const state = get();
    state.pushHistory(`镜像片段(${direction === 'horizontal' ? '水平' : '垂直'})`);
    const tracks = state.project.tracks.map((t) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        clips: t.clips.map((c) => {
          if (c.id !== clipId) return c;
          return { ...c, mirrored: direction };
        }),
      };
    });
    set({ project: { ...state.project, tracks, updatedAt: Date.now() } });
  },

  duplicateClip: (trackId, clipId) => {
    const state = get();
    state.pushHistory('复制片段');
    let newClip: TimelineClip | null = null;
    let maxEndTime = 0;

    for (const track of state.project.tracks) {
      if (track.id === trackId) {
        const clip = track.clips.find((c) => c.id === clipId);
        if (clip) {
          newClip = { ...clip, id: genId() };
          maxEndTime = Math.max(...track.clips.map(c => c.startTime + c.duration), 0);
        }
      }
    }

    if (!newClip) return;

    // 将复制的片段放到时间线末尾
    newClip.startTime = maxEndTime;

    const tracks = state.project.tracks.map((t) => {
      if (t.id === trackId) {
        return { ...t, clips: [...t.clips, newClip!] };
      }
      return t;
    });
    set({ project: { ...state.project, tracks, updatedAt: Date.now() } });
  },

  trimClip: (trackId, clipId, newStart, newEnd) => {
    const state = get();
    state.pushHistory('修剪片段');
    const tracks = state.project.tracks.map((t) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        clips: t.clips.map((c) => {
          if (c.id !== clipId) return c;
          const duration = newEnd - newStart;
          return {
            ...c,
            trimStart: newStart,
            trimEnd: newEnd,
            duration: duration / (c.speed || 1),
          };
        }),
      };
    });
    set({ project: { ...state.project, tracks, updatedAt: Date.now() } });
  },

  // 剪贴板
  _clipboard: null as TimelineClip | null,

  copyClip: (trackId, clipId) => {
    const state = get();
    for (const track of state.project.tracks) {
      if (track.id === trackId) {
        const clip = track.clips.find((c) => c.id === clipId);
        if (clip) {
          return { ...clip };
        }
      }
    }
    return null;
  },

  pasteClip: (targetTrackId, startTime) => {
    const state = get();
    // 需要从外部传入剪贴板内容
    // 这里简化处理，实际应该用状态管理
  },

  pushHistory: (description) =>
    set((state) => {
      const entry: HistoryEntry = {
        tracks: JSON.parse(JSON.stringify(state.project.tracks)),
        description,
      };
      const history = state.history.slice(0, state.historyIndex + 1);
      history.push(entry);
      return { history, historyIndex: history.length - 1 };
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const entry = state.history[newIndex];
      return {
        historyIndex: newIndex,
        project: { ...state.project, tracks: JSON.parse(JSON.stringify(entry.tracks)) },
      };
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      const entry = state.history[newIndex];
      return {
        historyIndex: newIndex,
        project: { ...state.project, tracks: JSON.parse(JSON.stringify(entry.tracks)) },
      };
    }),
}));
