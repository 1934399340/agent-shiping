import { useState } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import TransitionSelector, { PRESETS } from '../Transitions/TransitionSelector';
import FilterSelector from '../Filters/FilterSelector';
import VoiceOverPanel from '../VoiceOver/VoiceOverPanel';
import TextEditorPanel from '../TextEditor/TextEditorPanel';
import AIEditorPanel from '../AIEditor/AIEditorPanel';

export default function PropertiesPanel() {
  const { project, selectedClipId, selectedTrackId, updateClip } = useEditorStore();
  const [activeSection, setActiveSection] = useState<'ai' | 'text' | 'transitions' | 'filters' | 'voiceover' | 'project'>('ai');
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);

  const handleToggleFilter = (filterId: string) => {
    setAppliedFilters(prev =>
      prev.includes(filterId)
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId]
    );
  };

  // 找到选中的片段
  const selectedClip = selectedTrackId
    ? project.tracks
        .find((t) => t.id === selectedTrackId)
        ?.clips.find((c) => c.id === selectedClipId)
    : undefined;

  return (
    <div className="flex flex-col h-full">
      {/* 属性面板标题 */}
      <div className="px-3 py-2.5 border-b border-editor-border">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-editor-muted">
          属性面板
        </h3>
      </div>

      {/* 内容 - 标签页 */}
      <div className="flex-1 overflow-y-auto">
        {selectedClip ? (
          <ClipProperties
            clip={selectedClip}
            onUpdate={(updates) => {
              if (selectedTrackId && selectedClipId) {
                updateClip(selectedTrackId, selectedClipId, updates);
              }
            }}
          />
        ) : (
          <div className="flex flex-col">
            {/* Tab导航 */}
            <div className="flex border-b border-editor-border">
              {[
                { id: 'ai', label: 'AI剪辑', icon: '🤖' },
                { id: 'text', label: '文字', icon: '✏️' },
                { id: 'transitions', label: '转场', icon: '✨' },
                { id: 'filters', label: '滤镜', icon: '🎨' },
                { id: 'voiceover', label: '配音', icon: '🎙️' },
                { id: 'project', label: '项目', icon: '⚙️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id as typeof activeSection)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                    activeSection === tab.id
                      ? 'text-editor-accent border-b-2 border-editor-accent bg-editor-accent/5'
                      : 'text-editor-muted hover:text-editor-text'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* 内容区 */}
            <div className="flex-1 min-h-0">
              {activeSection === 'ai' && <AIEditorPanel />}
              {activeSection === 'text' && <TextEditorPanel />}
              {activeSection === 'transitions' && <TransitionSelector />}
              {activeSection === 'filters' && (
                <FilterSelector
                  selectedFilters={appliedFilters}
                  onToggleFilter={handleToggleFilter}
                />
              )}
              {activeSection === 'voiceover' && <VoiceOverPanel />}
              {activeSection === 'project' && (
                <div className="p-3 space-y-3">
                  <InfoRow label="分辨率" value={`${project.resolution.width}×${project.resolution.height}`} />
                  <InfoRow label="帧率" value={`${project.fps} FPS`} />
                  <InfoRow label="时长" value={`${Math.floor(project.duration / 60)}:${(project.duration % 60).toString().padStart(2, '0')}`} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** 选中片段的属性编辑 */
function ClipProperties({
  clip,
  onUpdate,
}: {
  clip: any;
  onUpdate: (updates: any) => void;
}) {
  const typeLabels: Record<string, string> = {
    video: '🎬 视频片段',
    audio: '🔊 音频片段',
    text: '✨ 文字',
    effect: '🎭 特效',
  };

  // 获取转场下拉选项（按分类分组）
  const transitionOptions = PRESETS.reduce((acc, preset) => {
    if (!acc[preset.category]) {
      acc[preset.category] = [];
    }
    acc[preset.category].push(preset);
    return acc;
  }, {} as Record<string, typeof PRESETS>);

  const categoryLabels: Record<string, string> = {
    basic: '基础',
    slide: '滑动',
    zoom: '缩放',
    wipe: '擦除',
    push: '推拉',
    mask: '遮罩',
    blur: '模糊',
    effect: '特效',
    '3d': '3D',
    creative: '创意',
  };

  return (
    <div className="p-3 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{typeLabels[clip.type] || '片段'}</span>
      </div>

      {/* 基本信息 */}
      <InfoRow label="ID" value={clip.id} mono />
      {clip.label && <InfoRow label="标签" value={clip.label} />}
      <InfoRow label="起始" value={`${clip.startTime.toFixed(2)}s`} />
      <InfoRow label="时长" value={`${clip.duration.toFixed(2)}s`} />
      <InfoRow label="裁剪起点" value={`${clip.trimStart.toFixed(2)}s`} />
      <InfoRow label="裁剪终点" value={`${clip.trimEnd.toFixed(2)}s`} />

      {/* 音量控制 */}
      {(clip.type === 'video' || clip.type === 'audio') && (
        <div className="space-y-1.5">
          <label className="text-xs text-editor-muted">音量: {Math.round((clip.volume ?? 1) * 100)}%</label>
          <input
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={clip.volume ?? 1}
            onChange={(e) => onUpdate({ volume: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-editor-border rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-editor-accent
              [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>
      )}

      {/* 速度控制 */}
      {(clip.type === 'video' || clip.type === 'audio') && (
        <div className="space-y-1.5">
          <label className="text-xs text-editor-muted">速度: {((clip.speed ?? 1) * 100).toFixed(0)}%</label>
          <input
            type="range"
            min={0.25}
            max={4}
            step={0.25}
            value={clip.speed ?? 1}
            onChange={(e) => onUpdate({ speed: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-editor-border rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-editor-accent
              [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>
      )}

      {/* 转场效果（仅视频片段） */}
      {clip.type === 'video' && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-editor-muted">入场转场</label>
          <select
            value={clip.transitionIn || ''}
            onChange={(e) => onUpdate({ transitionIn: e.target.value || undefined })}
            className="w-full bg-editor-bg border border-editor-border rounded-lg px-2 py-1.5 text-xs
              focus:outline-none focus:border-editor-accent/50"
          >
            <option value="">无</option>
            {Object.entries(transitionOptions).map(([category, presets]) => (
              <optgroup key={category} label={categoryLabels[category] || category}>
                {presets.map((t) => (
                  <option key={t.type} value={t.type}>{t.icon} {t.nameCn}</option>
                ))}
              </optgroup>
            ))}
          </select>

          {clip.transitionIn && (
            <div className="space-y-1.5">
              <label className="text-xs text-editor-muted">转场时长: {clip.transitionDuration || 0.5}s</label>
              <input
                type="range"
                min={0.2}
                max={2}
                step={0.1}
                value={clip.transitionDuration || 0.5}
                onChange={(e) => onUpdate({ transitionDuration: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-editor-border rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-editor-accent
                  [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>
          )}

          <label className="text-xs font-semibold text-editor-muted mt-3 block">出场转场</label>
          <select
            value={clip.transitionOut || ''}
            onChange={(e) => onUpdate({ transitionOut: e.target.value || undefined })}
            className="w-full bg-editor-bg border border-editor-border rounded-lg px-2 py-1.5 text-xs
              focus:outline-none focus:border-editor-accent/50"
          >
            <option value="">无</option>
            {Object.entries(transitionOptions).map(([category, presets]) => (
              <optgroup key={category} label={categoryLabels[category] || category}>
                {presets.map((t) => (
                  <option key={t.type} value={t.type}>{t.icon} {t.nameCn}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}

      {/* TTS文字 */}
      {clip.ttsText && (
        <div className="space-y-1.5">
          <label className="text-xs text-editor-muted">配音文本</label>
          <textarea
            value={clip.ttsText}
            onChange={(e) => onUpdate({ ttsText: e.target.value })}
            className="w-full bg-editor-bg border border-editor-border rounded-lg px-3 py-2 text-xs
              resize-none focus:outline-none focus:border-editor-accent/50 transition-colors"
            rows={3}
          />
          <InfoRow label="引擎" value={clip.ttsEngine || 'edge-tts'} />
          <InfoRow label="音色" value={clip.ttsVoice || '-'} />
        </div>
      )}

      {/* 文字属性 */}
      {clip.type === 'text' && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-editor-muted">文字内容</label>
            <textarea
              value={clip.textContent || ''}
              onChange={(e) => onUpdate({ textContent: e.target.value, label: e.target.value.slice(0, 20) })}
              className="w-full bg-editor-bg border border-editor-border rounded-lg px-3 py-2 text-xs
                resize-none focus:outline-none focus:border-editor-accent/50 transition-colors"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-editor-muted">字号: {clip.fontSize || 48}px</label>
            <input
              type="range"
              min={12}
              max={120}
              step={2}
              value={clip.fontSize || 48}
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-editor-border rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-editor-accent
                [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-editor-muted">字体</label>
            <select
              value={clip.fontFamily || 'Microsoft YaHei'}
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
              className="w-full bg-editor-bg border border-editor-border rounded-lg px-2 py-1.5 text-xs
                focus:outline-none focus:border-editor-accent/50"
            >
              <option value="system-ui">系统默认</option>
              <option value="Microsoft YaHei">微软雅黑</option>
              <option value="SimHei">黑体</option>
              <option value="SimSun">宋体</option>
              <option value="KaiTi">楷体</option>
              <option value="Arial">Arial</option>
              <option value="Georgia">Georgia</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-editor-muted">颜色</label>
            <div className="flex gap-1.5 items-center">
              <input
                type="color"
                value={clip.textColor || '#ffffff'}
                onChange={(e) => onUpdate({ textColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer bg-transparent"
              />
              <span className="text-xs font-mono text-editor-muted">{clip.textColor || '#ffffff'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button className="w-full flex items-center gap-2 px-3 py-2.5 border-b border-editor-border
        text-left hover:bg-editor-panel/50 transition-colors">
        <span>{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-editor-muted">{title}</span>
      </button>
      {children}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-editor-muted">{label}</span>
      <span className={`text-xs ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
