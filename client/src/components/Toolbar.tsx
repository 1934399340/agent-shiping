import { useState, useRef } from 'react';
import {
  Film,
  Undo2,
  Redo2,
  Save,
  Download,
  Settings,
  Sparkles,
  Scissors,
  Trash2,
  FolderOpen,
  Cloud,
  HardDrive,
  Monitor,
  Palette,
  Volume2,
  Keyboard,
  Info,
  RotateCcw,
  FlipHorizontal,
  Copy,
} from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import { useProjectManager, ProjectListModal } from './ProjectManager/ProjectManager';

export default function Toolbar() {
  const {
    project,
    undo,
    redo,
    history,
    historyIndex,
    removeClip,
    splitClip,
    reverseClip,
    mirrorClip,
    duplicateClip,
    selectedClipId,
    selectedTrackId,
    currentTime,
  } = useEditorStore();
  const { saveToServer, saveToLocal, loadFromLocal, saving } = useProjectManager();
  const [showProjectList, setShowProjectList] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSplit = () => {
    if (selectedTrackId && selectedClipId) {
      splitClip(selectedTrackId, selectedClipId, currentTime);
    }
  };

  const handleDelete = () => {
    if (selectedTrackId && selectedClipId) {
      removeClip(selectedTrackId, selectedClipId);
    }
  };

  const handleReverse = () => {
    if (selectedTrackId && selectedClipId) {
      reverseClip(selectedTrackId, selectedClipId);
    }
  };

  const handleMirrorH = () => {
    if (selectedTrackId && selectedClipId) {
      mirrorClip(selectedTrackId, selectedClipId, 'horizontal');
    }
  };

  const handleMirrorV = () => {
    if (selectedTrackId && selectedClipId) {
      mirrorClip(selectedTrackId, selectedClipId, 'vertical');
    }
  };

  const handleDuplicate = () => {
    if (selectedTrackId && selectedClipId) {
      duplicateClip(selectedTrackId, selectedClipId);
    }
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  return (
    <>
      <div className="h-12 bg-editor-panel border-b border-editor-border flex items-center justify-between px-3 shrink-0">
        {/* 左侧：Logo + 项目名 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-editor-accent to-purple-500 flex items-center justify-center">
              <Film size={16} className="text-white" />
            </div>
            <span className="font-semibold text-sm">AI视频剪辑</span>
          </div>
          <div className="h-5 w-px bg-editor-border" />
          <span className="text-sm text-editor-muted">{project.name}</span>
        </div>

        {/* 中间：操作按钮 */}
        <div className="flex items-center gap-1">
          <ToolBtn icon={<Undo2 size={16} />} label="撤销" onClick={undo} disabled={historyIndex <= 0} />
          <ToolBtn icon={<Redo2 size={16} />} label="重做" onClick={redo} disabled={historyIndex >= history.length - 1} />
          <div className="h-5 w-px bg-editor-border mx-1" />
          <ToolBtn icon={<Scissors size={16} />} label="拆分" onClick={handleSplit} disabled={!selectedClipId} />
          <ToolBtn icon={<Trash2 size={16} />} label="删除" onClick={handleDelete} disabled={!selectedClipId} />
          <div className="h-5 w-px bg-editor-border mx-1" />
          <ToolBtn icon={<RotateCcw size={16} />} label="倒放" onClick={handleReverse} disabled={!selectedClipId} />
          <ToolBtn icon={<FlipHorizontal size={16} />} label="镜像" onClick={handleMirrorH} disabled={!selectedClipId} />
          <ToolBtn icon={<Copy size={16} />} label="复制" onClick={handleDuplicate} disabled={!selectedClipId} />
          <div className="h-5 w-px bg-editor-border mx-1" />
          <ToolBtn icon={<Sparkles size={16} />} label="AI剪辑" accent />
          <div className="h-5 w-px bg-editor-border mx-1" />
          <ToolBtn icon={<FolderOpen size={16} />} label="打开" onClick={() => setShowProjectList(true)} />
          <ToolBtn icon={<Save size={16} />} label="保存" onClick={saveToServer} loading={saving} />
          <ToolBtn icon={<Download size={16} />} label="导出" onClick={handleExport} accent />
        </div>

        {/* 右侧 */}
        <div className="flex items-center gap-1">
          <ToolBtn icon={<Settings size={16} />} label="设置" onClick={() => setShowSettingsModal(true)} />
        </div>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadFromLocal(file);
        }}
      />

      {/* 项目列表模态框 */}
      {showProjectList && <ProjectListModal onClose={() => setShowProjectList(false)} />}

      {/* 导出模态框 */}
      {showExportModal && (
        <ExportModal project={project} onClose={() => setShowExportModal(false)} />
      )}

      {/* 设置模态框 */}
      {showSettingsModal && (
        <SettingsModal project={project} onClose={() => setShowSettingsModal(false)} />
      )}
    </>
  );
}

function ToolBtn({
  icon,
  label,
  onClick,
  accent,
  disabled,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  accent?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
        transition-all duration-150
        ${disabled || loading ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
        ${accent
          ? 'bg-editor-accent/20 text-editor-accent hover:bg-editor-accent/30'
          : 'text-editor-muted hover:text-editor-text hover:bg-editor-panel'
        }
      `}
    >
      {loading ? <Cloud size={16} className="animate-pulse" /> : icon}
      {label}
    </button>
  );
}

// ============================================
// 设置面板
// ============================================
function SettingsModal({ project, onClose }: { project: any; onClose: () => void }) {
  const { setResolution, setFps, setProjectName } = useEditorStore();
  const [activeTab, setActiveTab] = useState<'project' | 'render' | 'shortcuts' | 'api' | 'about'>('project');
  const [tempName, setTempName] = useState(project.name);
  const [tempWidth, setTempWidth] = useState(project.resolution.width);
  const [tempHeight, setTempHeight] = useState(project.resolution.height);
  const [tempFps, setTempFps] = useState(project.fps);
  
  // API 设置状态
  const [pexelsApiKey, setPexelsApiKey] = useState(() => localStorage.getItem('pexelsApiKey') || '');
  const [pixabayApiKey, setPixabayApiKey] = useState(() => localStorage.getItem('pixabayApiKey') || '');
  const [apiBaseUrl, setApiBaseUrl] = useState(() => localStorage.getItem('apiBaseUrl') || 'http://localhost:3001');
  const [timeout, setTimeout] = useState(() => parseInt(localStorage.getItem('apiTimeout') || '30'));
  const [enableCache, setEnableCache] = useState(() => localStorage.getItem('enableCache') !== 'false');
  const [autoSave, setAutoSave] = useState(() => localStorage.getItem('autoSave') !== 'false');

  const resolutionPresets = [
    { name: '4K (2160p)', width: 3840, height: 2160 },
    { name: '2K (1440p)', width: 2560, height: 1440 },
    { name: '1080p', width: 1920, height: 1080 },
    { name: '720p', width: 1280, height: 720 },
    { name: '480p', width: 854, height: 480 },
    { name: '竖屏 1080x1920', width: 1080, height: 1920 },
    { name: '竖屏 720x1280', width: 720, height: 1280 },
    { name: '方形 1080x1080', width: 1080, height: 1080 },
    { name: '方形 720x720', width: 720, height: 720 },
  ];

  const handleApplyResolution = () => {
    setResolution(tempWidth, tempHeight);
    setFps(tempFps);
    setProjectName(tempName);
    onClose();
  };

  const handleSaveApiSettings = () => {
    localStorage.setItem('pexelsApiKey', pexelsApiKey);
    localStorage.setItem('pixabayApiKey', pixabayApiKey);
    localStorage.setItem('apiBaseUrl', apiBaseUrl);
    localStorage.setItem('apiTimeout', timeout.toString());
    localStorage.setItem('enableCache', enableCache.toString());
    localStorage.setItem('autoSave', autoSave.toString());
    alert('API 设置已保存！');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-editor-panel rounded-xl shadow-2xl w-[560px] max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-editor-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings size={18} className="text-editor-accent" />
            设置
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-editor-bg rounded-lg transition-colors">
            <Settings size={18} className="text-editor-muted rotate-45" />
          </button>
        </div>

        {/* Tab导航 */}
        <div className="flex border-b border-editor-border">
          {[
            { id: 'project', label: '项目设置', icon: <FolderOpen size={14} /> },
            { id: 'render', label: '渲染设置', icon: <Monitor size={14} /> },
            { id: 'shortcuts', label: '快捷键', icon: <Keyboard size={14} /> },
            { id: 'api', label: 'API设置', icon: <Cloud size={14} /> },
            { id: 'about', label: '关于', icon: <Info size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-editor-accent border-b-2 border-editor-accent bg-editor-accent/5'
                  : 'text-editor-muted hover:text-editor-text'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* 项目设置 */}
          {activeTab === 'project' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-editor-muted mb-1.5">项目名称</label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg
                    text-sm focus:outline-none focus:border-editor-accent"
                />
              </div>

              <div>
                <label className="block text-xs text-editor-muted mb-2">分辨率预设</label>
                <div className="grid grid-cols-3 gap-2">
                  {resolutionPresets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        setTempWidth(preset.width);
                        setTempHeight(preset.height);
                      }}
                      className={`p-2 rounded-lg border text-xs transition-all ${
                        tempWidth === preset.width && tempHeight === preset.height
                          ? 'border-editor-accent bg-editor-accent/10 text-editor-accent'
                          : 'border-editor-border hover:border-editor-muted text-editor-muted'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-editor-muted mb-1.5">宽度</label>
                  <input
                    type="number"
                    value={tempWidth}
                    onChange={(e) => setTempWidth(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg
                      text-sm font-mono focus:outline-none focus:border-editor-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-editor-muted mb-1.5">高度</label>
                  <input
                    type="number"
                    value={tempHeight}
                    onChange={(e) => setTempHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg
                      text-sm font-mono focus:outline-none focus:border-editor-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-editor-muted mb-1.5">帧率</label>
                <div className="flex gap-2">
                  {[24, 25, 30, 60].map((fps) => (
                    <button
                      key={fps}
                      onClick={() => setTempFps(fps)}
                      className={`flex-1 py-2 rounded-lg text-sm font-mono transition-all ${
                        tempFps === fps
                          ? 'bg-editor-accent text-white'
                          : 'bg-editor-bg border border-editor-border text-editor-muted hover:border-editor-muted'
                      }`}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 渲染设置 */}
          {activeTab === 'render' && (
            <div className="space-y-4">
              <div className="p-4 bg-editor-bg rounded-lg">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Palette size={14} className="text-editor-accent" />
                  视频质量
                </h3>
                <div className="space-y-2">
                  {['高质量 (推荐)', '中等质量', '快速导出'].map((quality, i) => (
                    <label key={quality} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="quality"
                        defaultChecked={i === 0}
                        className="text-editor-accent focus:ring-editor-accent"
                      />
                      <span className="text-sm">{quality}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-editor-bg rounded-lg">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Volume2 size={14} className="text-editor-accent" />
                  音频设置
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-editor-muted mb-1">音频码率</label>
                    <select className="w-full px-3 py-2 bg-editor-panel border border-editor-border rounded-lg text-sm">
                      <option>128 kbps</option>
                      <option>192 kbps</option>
                      <option>256 kbps</option>
                      <option>320 kbps (最高)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-editor-muted mb-1">采样率</label>
                    <select className="w-full px-3 py-2 bg-editor-panel border border-editor-border rounded-lg text-sm">
                      <option>44100 Hz</option>
                      <option>48000 Hz</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-editor-bg rounded-lg">
                <h3 className="text-sm font-medium mb-3">输出格式</h3>
                <div className="grid grid-cols-2 gap-2">
                  {['MP4 (H.264)', 'MP4 (H.265)', 'WebM', 'MOV'].map((format) => (
                    <button
                      key={format}
                      className="p-2 rounded-lg border border-editor-border text-xs
                        hover:border-editor-accent hover:text-editor-accent transition-all"
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 快捷键 */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-2">
              {[
                { keys: ['Space'], action: '播放/暂停' },
                { keys: ['Ctrl', 'S'], action: '保存项目' },
                { keys: ['Ctrl', 'Z'], action: '撤销' },
                { keys: ['Ctrl', 'Shift', 'Z'], action: '重做' },
                { keys: ['Delete'], action: '删除选中片段' },
                { keys: ['S'], action: '在播放头处拆分' },
                { keys: ['←'], action: '后退1帧' },
                { keys: ['→'], action: '前进1帧' },
                { keys: ['Home'], action: '跳到开头' },
                { keys: ['End'], action: '跳到结尾' },
                { keys: ['Ctrl', 'E'], action: '导出视频' },
                { keys: ['+'], action: '放大时间线' },
                { keys: ['-'], action: '缩小时间线' },
              ].map((shortcut) => (
                <div
                  key={shortcut.action}
                  className="flex items-center justify-between p-2 bg-editor-bg rounded-lg"
                >
                  <span className="text-sm text-editor-muted">{shortcut.action}</span>
                  <div className="flex gap-1">
                    {shortcut.keys.map((key, i) => (
                      <span key={i}>
                        <kbd className="px-2 py-1 bg-editor-panel border border-editor-border rounded text-xs font-mono">
                          {key}
                        </kbd>
                        {i < shortcut.keys.length - 1 && (
                          <span className="text-editor-border mx-0.5">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* API设置 */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="p-4 bg-editor-bg rounded-lg">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Cloud size={14} className="text-editor-accent" />
                  API 配置
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-editor-muted mb-1.5">Pexels API Key</label>
                    <input
                      type="text"
                      value={pexelsApiKey}
                      onChange={(e) => setPexelsApiKey(e.target.value)}
                      placeholder="输入 Pexels API Key"
                      className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg
                        text-sm focus:outline-none focus:border-editor-accent"
                    />
                    <p className="text-xs text-editor-muted mt-1">
                      用于搜索免费视频素材（申请地址：https://www.pexels.com/api/）
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-editor-muted mb-1.5">Pixabay API Key</label>
                    <input
                      type="text"
                      value={pixabayApiKey}
                      onChange={(e) => setPixabayApiKey(e.target.value)}
                      placeholder="输入 Pixabay API Key"
                      className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg
                        text-sm focus:outline-none focus:border-editor-accent"
                    />
                    <p className="text-xs text-editor-muted mt-1">
                      用于搜索免费视频和图片素材（申请地址：https://pixabay.com/api/docs/）
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-editor-muted mb-1.5">API 基础 URL</label>
                    <input
                      type="text"
                      value={apiBaseUrl}
                      onChange={(e) => setApiBaseUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg
                        text-sm font-mono focus:outline-none focus:border-editor-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-editor-muted mb-1.5">超时设置</label>
                    <input
                      type="number"
                      value={timeout}
                      onChange={(e) => setTimeout(parseInt(e.target.value) || 30)}
                      min={5}
                      max={60}
                      className="w-full px-3 py-2 bg-editor-bg border border-editor-border rounded-lg
                        text-sm font-mono focus:outline-none focus:border-editor-accent"
                    />
                    <p className="text-xs text-editor-muted mt-1">
                      API 请求超时时间（秒）
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-editor-bg rounded-lg">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <HardDrive size={14} className="text-editor-accent" />
                  本地存储
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableCache}
                      onChange={(e) => setEnableCache(e.target.checked)}
                      className="text-editor-accent focus:ring-editor-accent"
                    />
                    <span className="text-sm">启用本地缓存</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSave}
                      onChange={(e) => setAutoSave(e.target.checked)}
                      className="text-editor-accent focus:ring-editor-accent"
                    />
                    <span className="text-sm">自动保存项目</span>
                  </label>
                </div>
              </div>
              <div className="p-4 bg-editor-bg rounded-lg">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Sparkles size={14} className="text-editor-accent" />
                  AI 配音
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-editor-muted">
                    <strong>Edge-TTS（默认）</strong> - 微软免费 TTS 服务，无需 API Key
                  </p>
                  <p className="text-sm text-editor-muted">
                    支持 40+ 中文音色，安装方式：<code className="text-editor-accent">pip install edge-tts</code>
                  </p>
                  <div className="h-2 w-full bg-editor-border rounded-full mt-2" />
                  <p className="text-sm text-editor-muted mt-2">
                    <strong>阿里云 TTS（可选）</strong> - 需在服务器端配置环境变量
                  </p>
                </div>
              </div>
              <button
                onClick={handleSaveApiSettings}
                className="w-full py-2 bg-editor-accent text-white rounded-lg font-medium
                  hover:bg-editor-accent-hover transition-colors"
              >
                保存 API 设置
              </button>
            </div>
          )}

          {/* 关于 */}
          {activeTab === 'about' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-editor-accent to-purple-500 flex items-center justify-center mx-auto mb-4">
                <Film size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI视频剪辑器</h3>
              <p className="text-sm text-editor-muted mb-4">Version 1.0.0</p>

              <div className="text-left max-w-sm mx-auto space-y-2 text-sm text-editor-muted">
                <p className="flex items-center gap-2">
                  <Sparkles size={14} className="text-editor-accent" />
                  支持多轨道视频编辑
                </p>
                <p className="flex items-center gap-2">
                  <Sparkles size={14} className="text-editor-accent" />
                  12+种转场效果
                </p>
                <p className="flex items-center gap-2">
                  <Sparkles size={14} className="text-editor-accent" />
                  AI配音（Edge-TTS）
                </p>
                <p className="flex items-center gap-2">
                  <Sparkles size={14} className="text-editor-accent" />
                  免费视频素材搜索
                </p>
                <p className="flex items-center gap-2">
                  <Sparkles size={14} className="text-editor-accent" />
                  本地素材导入
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-editor-border">
                <p className="text-xs text-editor-muted">
                  Powered by FFmpeg • React • Tailwind CSS
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        {(activeTab === 'project' || activeTab === 'render') && (
          <div className="flex gap-2 p-4 border-t border-editor-border">
            <button
              onClick={onClose}
              className="flex-1 py-2 bg-editor-bg text-editor-muted rounded-lg font-medium
                hover:text-editor-text transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleApplyResolution}
              className="flex-1 py-2 bg-editor-accent text-white rounded-lg font-medium
                hover:bg-editor-accent-hover transition-colors"
            >
              应用设置
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ExportModal({ project, onClose }: { project: any; onClose: () => void }) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState<{ downloadUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setProgress(0);
    setStage('准备渲染...');
    setError(null);

    // 收集所有视频片段
    const videoTrack = project.tracks.find((t: any) => t.type === 'video');
    const audioTrack = project.tracks.find((t: any) => t.type === 'audio');
    const clips = videoTrack?.clips || [];
    const audioClips = audioTrack?.clips || [];

    if (clips.length === 0) {
      setError('时间线上没有视频片段');
      setExporting(false);
      return;
    }

    // 模拟进度（因为服务端没有WebSocket）
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 2, 90));
    }, 500);

    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clips: clips.map((c: any) => ({
            url: c.asset?.videoUrl,
            startTime: c.startTime,
            duration: c.duration,
            trimStart: c.trimStart,
            trimEnd: c.trimEnd,
            volume: c.volume,
            speed: c.speed,
            transitionIn: c.transitionIn,
            transitionOut: c.transitionOut,
            transitionDuration: c.transitionDuration,
          })),
          transitions: [],
          audioTracks: audioClips.map((c: any) => ({
            url: c.asset?.audioUrl || c.asset?.videoUrl,
            startTime: c.startTime,
            volume: c.volume,
          })),
          resolution: project.resolution,
          fps: project.fps,
        }),
      });

      const data = await res.json();
      
      clearInterval(progressInterval);
      
      if (data.success) {
        setProgress(100);
        setStage('渲染完成！');
        setResult(data);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      setError('导出失败: ' + err.message);
    }
    
    setExporting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-editor-panel rounded-xl shadow-2xl w-[400px]">
        <div className="flex items-center justify-between p-4 border-b border-editor-border">
          <h2 className="text-lg font-semibold">导出视频</h2>
          <button onClick={onClose} className="p-1 hover:bg-editor-bg rounded">
            <Settings size={18} className="text-editor-muted rotate-45" />
          </button>
        </div>
        
        <div className="p-4">
          {!exporting && !result && !error && (
            <>
              <div className="mb-4 p-3 bg-editor-bg rounded-lg">
                <p className="text-sm text-editor-muted">分辨率</p>
                <p className="font-mono">{project.resolution.width} × {project.resolution.height}</p>
              </div>
              
              <div className="mb-4 p-3 bg-editor-bg rounded-lg">
                <p className="text-sm text-editor-muted">帧率</p>
                <p className="font-mono">{project.fps} FPS</p>
              </div>
              
              <div className="mb-4 p-3 bg-editor-bg rounded-lg">
                <p className="text-sm text-editor-muted">片段数量</p>
                <p className="font-mono">
                  {project.tracks.find((t: any) => t.type === 'video')?.clips.length || 0}
                </p>
              </div>
              
              <button
                onClick={handleExport}
                className="w-full py-2.5 bg-editor-accent text-white rounded-lg font-medium
                  hover:bg-editor-accent-hover transition-colors"
              >
                开始导出
              </button>
            </>
          )}
          
          {exporting && (
            <div className="py-8 text-center">
              <div className="animate-spin w-10 h-10 border-2 border-editor-accent border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-sm text-editor-muted mb-2">{stage}</p>
              <div className="w-full max-w-xs mx-auto bg-editor-bg rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-editor-accent transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-editor-muted mt-2">{progress}%</p>
            </div>
          )}
          
          {error && !exporting && (
            <div className="py-6">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Trash2 size={24} className="text-red-400" />
                </div>
                <p className="font-medium text-red-400">导出失败</p>
                <p className="text-sm text-editor-muted mt-1">{error}</p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  className="flex-1 py-2 bg-editor-accent text-white rounded-lg font-medium
                    hover:bg-editor-accent-hover transition-colors"
                >
                  重试
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2 bg-editor-bg text-editor-muted rounded-lg font-medium
                    hover:text-editor-text transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          )}
          
          {result && (
            <div className="py-4">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Download size={24} className="text-green-400" />
                </div>
                <p className="font-medium">导出成功！</p>
              </div>
              
              <a
                href={result.downloadUrl}
                download
                className="block w-full py-2.5 bg-editor-accent text-white rounded-lg font-medium
                  text-center hover:bg-editor-accent-hover transition-colors"
              >
                下载视频
              </a>
              
              <button
                onClick={onClose}
                className="w-full py-2 mt-2 text-editor-muted hover:text-editor-text text-sm"
              >
                关闭
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
