import { useState } from 'react';
import { Search, FolderOpen, Music } from 'lucide-react';
import SearchPanel from './SearchPanel/SearchPanel';
import MediaLibrary from './MediaLibrary/MediaLibrary';
import MusicSearchPanel from './MusicSearch/MusicSearchPanel';
import PreviewPanel from './Preview/PreviewPanel';
import Timeline from './Timeline/Timeline';
import PropertiesPanel from './Properties/PropertiesPanel';
import Toolbar from './Toolbar';
import { useEditorStore } from '@/stores/editorStore';
import type { AudioAsset } from '../../../shared/types';

type LeftPanelTab = 'search' | 'media' | 'music';

export default function App() {
  const project = useEditorStore((s) => s.project);
  const { addClip } = useEditorStore();
  const [leftTab, setLeftTab] = useState<LeftPanelTab>('media');

  // 添加音乐到时间线
  const handleAddMusicToTimeline = (music: AudioAsset) => {
    const audioTrack = project.tracks.find((t) => t.type === 'audio');
    if (audioTrack) {
      addClip(audioTrack.id, {
        id: `audio-${Date.now()}`,
        trackId: audioTrack.id,
        type: 'audio',
        startTime: 0,
        duration: music.duration,
        asset: music as any,
        trimStart: 0,
        trimEnd: music.duration,
        volume: 1,
        speed: 1,
      });
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-editor-bg text-editor-text overflow-hidden">
      {/* 顶部工具栏 */}
      <Toolbar />

      {/* 主内容区：三栏布局 */}
      <div className="flex-1 flex min-h-0">
        {/* 左侧：素材面板（Tab切换） */}
        <div className="w-72 min-w-[288px] bg-editor-surface border-r border-editor-border flex flex-col">
          {/* Tab导航 */}
          <div className="flex border-b border-editor-border">
            <button
              onClick={() => setLeftTab('media')}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                leftTab === 'media'
                  ? 'text-editor-accent border-b-2 border-editor-accent bg-editor-accent/5'
                  : 'text-editor-muted hover:text-editor-text'
              }`}
            >
              <FolderOpen size={14} />
              媒体库
            </button>
            <button
              onClick={() => setLeftTab('search')}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                leftTab === 'search'
                  ? 'text-editor-accent border-b-2 border-editor-accent bg-editor-accent/5'
                  : 'text-editor-muted hover:text-editor-text'
              }`}
            >
              <Search size={14} />
              素材
            </button>
            <button
              onClick={() => setLeftTab('music')}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                leftTab === 'music'
                  ? 'text-editor-accent border-b-2 border-editor-accent bg-editor-accent/5'
                  : 'text-editor-muted hover:text-editor-text'
              }`}
            >
              <Music size={14} />
              音乐
            </button>
          </div>

          {/* Tab内容 */}
          <div className="flex-1 min-h-0">
            {leftTab === 'media' && <MediaLibrary />}
            {leftTab === 'search' && <SearchPanel />}
            {leftTab === 'music' && <MusicSearchPanel onAddToTimeline={handleAddMusicToTimeline} />}
          </div>
        </div>

        {/* 中间：视频预览区 */}
        <div className="flex-1 flex flex-col min-w-0">
          <PreviewPanel />
          <div className="px-3 pb-2">
            <div className="text-xs text-editor-muted font-mono">
              项目: {project.name} | {project.resolution.width}×{project.resolution.height} | {project.fps}fps
            </div>
          </div>
        </div>

        {/* 右侧：属性面板 */}
        <div className="w-64 min-w-[256px] bg-editor-surface border-l border-editor-border flex flex-col">
          <PropertiesPanel />
        </div>
      </div>

      {/* 底部：时间线编辑器 */}
      <div className="h-64 min-h-[200px] bg-editor-surface border-t border-editor-border flex flex-col">
        <Timeline />
      </div>
    </div>
  );
}
