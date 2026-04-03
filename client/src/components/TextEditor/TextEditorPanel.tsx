// ============================================
// 文字编辑面板
// ============================================
import { useState, useEffect } from 'react';
import { Type, Plus, Trash2, AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import type { TimelineClip } from '@/types';

// 预设字体
const FONT_FAMILIES = [
  { value: 'system-ui', label: '系统默认' },
  { value: 'Microsoft YaHei', label: '微软雅黑' },
  { value: 'SimHei', label: '黑体' },
  { value: 'SimSun', label: '宋体' },
  { value: 'KaiTi', label: '楷体' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
];

// 预设颜色
const TEXT_COLORS = [
  { value: '#ffffff', label: '白色' },
  { value: '#000000', label: '黑色' },
  { value: '#ff4444', label: '红色' },
  { value: '#44ff44', label: '绿色' },
  { value: '#4444ff', label: '蓝色' },
  { value: '#ffff44', label: '黄色' },
  { value: '#ff44ff', label: '紫色' },
  { value: '#44ffff', label: '青色' },
  { value: '#ffa500', label: '橙色' },
];

export default function TextEditorPanel() {
  const { project, selectedClipId, selectedTrackId, addClip, updateClip, removeClip } = useEditorStore();
  const [textContent, setTextContent] = useState('');
  const [fontSize, setFontSize] = useState(48);
  const [fontFamily, setFontFamily] = useState('Microsoft YaHei');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  // 获取文字轨道
  const textTrack = project.tracks.find(t => t.type === 'text');

  // 当选中文字片段时，加载其属性
  useEffect(() => {
    if (selectedClipId && selectedTrackId) {
      const track = project.tracks.find(t => t.id === selectedTrackId);
      const clip = track?.clips.find(c => c.id === selectedClipId);
      if (clip && clip.type === 'text') {
        setTextContent(clip.textContent || '');
        setFontSize(clip.fontSize || 48);
        setFontFamily(clip.fontFamily || 'Microsoft YaHei');
        setTextColor(clip.textColor || '#ffffff');
      }
    }
  }, [selectedClipId, selectedTrackId, project.tracks]);

  // 添加新文字
  const handleAddText = () => {
    if (!textTrack || !textContent.trim()) return;

    // 找到轨道末尾
    const lastClipEnd = textTrack.clips.reduce(
      (max, c) => Math.max(max, c.startTime + c.duration),
      0
    );

    const newClip: TimelineClip = {
      id: crypto.randomUUID().slice(0, 8),
      trackId: textTrack.id,
      type: 'text',
      startTime: lastClipEnd,
      duration: 5, // 默认5秒
      trimStart: 0,
      trimEnd: 5,
      volume: 1,
      speed: 1,
      textContent: textContent.trim(),
      fontSize,
      fontFamily,
      textColor,
      label: textContent.trim().slice(0, 20),
    };

    addClip(textTrack.id, newClip);
    setTextContent(''); // 清空输入
  };

  // 更新选中文字
  const handleUpdateText = () => {
    if (!selectedClipId || !selectedTrackId) return;
    
    updateClip(selectedTrackId, selectedClipId, {
      textContent,
      fontSize,
      fontFamily,
      textColor,
      label: textContent.slice(0, 20),
    });
  };

  // 删除选中文字
  const handleDeleteText = () => {
    if (!selectedClipId || !selectedTrackId) return;
    removeClip(selectedTrackId, selectedClipId);
  };

  // 选中的文字片段
  const selectedTextClip = selectedClipId && selectedTrackId
    ? project.tracks.find(t => t.id === selectedTrackId)?.clips.find(c => c.id === selectedClipId && c.type === 'text')
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* 标题 */}
      <div className="px-3 py-2.5 border-b border-editor-border flex items-center gap-2">
        <Type size={14} className="text-editor-accent" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-editor-muted">
          文字编辑
        </h3>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 文字输入 */}
        <div className="space-y-1.5">
          <label className="text-xs text-editor-muted">文字内容</label>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="输入要显示的文字..."
            className="w-full bg-editor-bg border border-editor-border rounded-lg px-3 py-2 text-sm
              resize-none focus:outline-none focus:border-editor-accent/50 transition-colors
              placeholder:text-editor-muted/50"
            rows={3}
          />
        </div>

        {/* 字体选择 */}
        <div className="space-y-1.5">
          <label className="text-xs text-editor-muted">字体</label>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="w-full bg-editor-bg border border-editor-border rounded-lg px-2 py-1.5 text-xs
              focus:outline-none focus:border-editor-accent/50"
          >
            {FONT_FAMILIES.map(font => (
              <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                {font.label}
              </option>
            ))}
          </select>
        </div>

        {/* 字号 */}
        <div className="space-y-1.5">
          <label className="text-xs text-editor-muted">字号: {fontSize}px</label>
          <input
            type="range"
            min={12}
            max={120}
            step={2}
            value={fontSize}
            onChange={(e) => setFontSize(parseInt(e.target.value))}
            className="w-full h-1.5 bg-editor-border rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-editor-accent
              [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>

        {/* 颜色选择 */}
        <div className="space-y-1.5">
          <label className="text-xs text-editor-muted">颜色</label>
          <div className="flex flex-wrap gap-1.5">
            {TEXT_COLORS.map(color => (
              <button
                key={color.value}
                onClick={() => setTextColor(color.value)}
                className={`w-6 h-6 rounded-md border-2 transition-all ${
                  textColor === color.value
                    ? 'border-editor-accent scale-110'
                    : 'border-transparent hover:border-editor-border'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.label}
              />
            ))}
            <input
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-6 h-6 rounded-md cursor-pointer bg-transparent"
              title="自定义颜色"
            />
          </div>
        </div>

        {/* 对齐方式 */}
        <div className="space-y-1.5">
          <label className="text-xs text-editor-muted">对齐</label>
          <div className="flex gap-1">
            <button
              onClick={() => setTextAlign('left')}
              className={`flex-1 flex items-center justify-center py-1.5 rounded-lg transition-colors ${
                textAlign === 'left' ? 'bg-editor-accent/20 text-editor-accent' : 'bg-editor-panel text-editor-muted hover:text-editor-text'
              }`}
            >
              <AlignLeft size={14} />
            </button>
            <button
              onClick={() => setTextAlign('center')}
              className={`flex-1 flex items-center justify-center py-1.5 rounded-lg transition-colors ${
                textAlign === 'center' ? 'bg-editor-accent/20 text-editor-accent' : 'bg-editor-panel text-editor-muted hover:text-editor-text'
              }`}
            >
              <AlignCenter size={14} />
            </button>
            <button
              onClick={() => setTextAlign('right')}
              className={`flex-1 flex items-center justify-center py-1.5 rounded-lg transition-colors ${
                textAlign === 'right' ? 'bg-editor-accent/20 text-editor-accent' : 'bg-editor-panel text-editor-muted hover:text-editor-text'
              }`}
            >
              <AlignRight size={14} />
            </button>
          </div>
        </div>

        {/* 样式按钮 */}
        <div className="flex gap-1">
          <button
            onClick={() => setIsBold(!isBold)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-colors ${
              isBold ? 'bg-editor-accent/20 text-editor-accent' : 'bg-editor-panel text-editor-muted hover:text-editor-text'
            }`}
          >
            <Bold size={14} />
            <span className="text-xs">粗体</span>
          </button>
          <button
            onClick={() => setIsItalic(!isItalic)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-colors ${
              isItalic ? 'bg-editor-accent/20 text-editor-accent' : 'bg-editor-panel text-editor-muted hover:text-editor-text'
            }`}
          >
            <Italic size={14} />
            <span className="text-xs">斜体</span>
          </button>
        </div>

        {/* 预览 */}
        {textContent && (
          <div className="space-y-1.5">
            <label className="text-xs text-editor-muted">预览</label>
            <div 
              className="w-full h-20 bg-black/50 rounded-lg flex items-center justify-center p-2 overflow-hidden"
              style={{ justifyContent: textAlign === 'left' ? 'flex-start' : textAlign === 'right' ? 'flex-end' : 'center' }}
            >
              <span
                style={{
                  fontFamily,
                  fontSize: `${Math.min(fontSize, 32)}px`,
                  color: textColor,
                  fontWeight: isBold ? 'bold' : 'normal',
                  fontStyle: isItalic ? 'italic' : 'normal',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                }}
                className="line-clamp-2"
              >
                {textContent}
              </span>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          {selectedTextClip ? (
            <>
              <button
                onClick={handleUpdateText}
                disabled={!textContent.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-editor-accent
                  text-white rounded-lg text-xs font-medium hover:bg-editor-accent-hover
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                更新文字
              </button>
              <button
                onClick={handleDeleteText}
                className="flex items-center justify-center px-3 py-2 bg-red-500/20
                  text-red-400 rounded-lg text-xs hover:bg-red-500/30 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </>
          ) : (
            <button
              onClick={handleAddText}
              disabled={!textContent.trim()}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-editor-accent
                text-white rounded-lg text-xs font-medium hover:bg-editor-accent-hover
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={14} />
              添加到时间线
            </button>
          )}
        </div>

        {/* 文字片段列表 */}
        {textTrack && textTrack.clips.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-editor-border">
            <label className="text-xs text-editor-muted">已有文字片段</label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {textTrack.clips.map(clip => (
                <div
                  key={clip.id}
                  onClick={() => useEditorStore.getState().selectClip(clip.id, textTrack.id)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    selectedClipId === clip.id
                      ? 'bg-editor-accent/20 text-editor-accent'
                      : 'bg-editor-panel hover:bg-editor-bg text-editor-text'
                  }`}
                >
                  <Type size={12} />
                  <span className="text-xs truncate flex-1">
                    {clip.textContent || '空白文字'}
                  </span>
                  <span className="text-[10px] text-editor-muted">
                    {clip.duration}s
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
