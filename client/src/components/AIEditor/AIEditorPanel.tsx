// ============================================
// AI自动剪辑面板
// ============================================
import { useState } from 'react';
import { Sparkles, Wand2, FileText, Music, Clock, Zap, Loader2, Check, AlertCircle, Play, Pause } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';
import type { TimelineClip, VideoAsset } from '@/types';

const API_BASE = '/api';

// 示例脚本模板
const SCRIPT_TEMPLATES = [
  {
    name: '快节奏踩点',
    icon: '⚡',
    script: `【快节奏】城市生活
早晨的阳光洒在城市的街道上 | 日出, 城市, 阳光 | 3 | energetic
忙碌的人群开始新的一天 | 人群, 通勤, 地铁 | 3 | energetic
高楼大厦在晨光中闪耀 | 建筑, 天际线, 反光 | 2 | dramatic
车流穿梭在城市的血脉中 | 交通, 汽车, 繁忙 | 3 | energetic
夜晚的霓虹灯点亮街道 | 霓虹灯, 夜晚, 灯光 | 3 | happy`,
  },
  {
    name: '电影感叙事',
    icon: '🎬',
    script: `【电影感】自然之旅
在深山的怀抱中，一条清澈的溪流静静流淌 | 森林, 溪流, 自然 | 8 | calm
阳光透过树叶的缝隙，洒下斑驳的光影 | 阳光, 树叶, 光影 | 6 | calm
远处的山峦在云雾中若隐若现 | 山脉, 云雾, 远景 | 8 | dramatic
生命的力量在这里静静绽放 | 花朵, 生长, 生命 | 5 | happy`,
  },
  {
    name: '商业宣传片',
    icon: '💼',
    script: `【广告】品牌故事
创新，是我们的DNA | 科技, 创新, 实验室 | 4 | energetic
品质，是我们的承诺 | 产品, 工厂, 细节 | 4 | calm
服务，是我们的初心 | 团队, 服务, 微笑 | 4 | happy
选择我们，选择未来 | 成功, 握手, 未来 | 5 | dramatic`,
  },
];

export default function AIEditorPanel() {
  const { project, addClip, updateClip } = useEditorStore();
  const [script, setScript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  
  // 处理AI剪辑
  const handleAutoEdit = async () => {
    if (!script.trim()) {
      setError('请输入脚本内容');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setProgress('📝 正在解析脚本...');
    
    try {
      const res = await fetch(`${API_BASE}/ai/auto-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'AI剪辑失败');
      }
      
      setProgress('🎬 正在生成时间线...');
      setResult(data);
      
      // 自动添加到时间线
      if (data.clips && data.clips.length > 0) {
        const videoTrack = project.tracks.find(t => t.type === 'video');
        const textTrack = project.tracks.find(t => t.type === 'text');
        const audioTrack = project.tracks.find(t => t.type === 'audio');
        
        if (videoTrack) {
          // 添加视频片段
          for (const clip of data.clips) {
            const newClip: TimelineClip = {
              id: clip.id,
              trackId: videoTrack.id,
              type: 'video',
              asset: clip.asset,
              startTime: clip.startTime,
              duration: clip.duration,
              trimStart: clip.trimStart,
              trimEnd: clip.trimEnd,
              volume: 1,
              speed: clip.speed || 1,
              transitionIn: clip.transitionIn,
              transitionOut: clip.transitionOut,
              label: clip.asset.title,
            };
            addClip(videoTrack.id, newClip);
          }
        }
        
        // 添加文字叠加
        if (textTrack && data.textOverlays) {
          for (const text of data.textOverlays) {
            const textClip: TimelineClip = {
              id: text.id,
              trackId: textTrack.id,
              type: 'text',
              startTime: text.startTime,
              duration: text.duration,
              textContent: text.text,
              fontSize: text.style === 'title' ? 72 : text.style === 'subtitle' ? 48 : 36,
              textColor: '#ffffff',
              fontFamily: 'Microsoft YaHei',
              trimStart: 0,
              trimEnd: text.duration,
              volume: 1,
              speed: 1,
              label: text.text.slice(0, 20),
            };
            addClip(textTrack.id, textClip);
          }
        }
        
        setProgress('✅ 已添加到时间线');
      }
      
    } catch (err: any) {
      console.error('AI剪辑错误:', err);
      setError(err.message || 'AI剪辑失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // 使用模板
  const useTemplate = (template: typeof SCRIPT_TEMPLATES[0]) => {
    setScript(template.script);
    setError(null);
    setResult(null);
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* 标题 */}
      <div className="px-3 py-2.5 border-b border-editor-border flex items-center gap-2">
        <Sparkles size={14} className="text-purple-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-editor-muted">
          AI自动剪辑
        </h3>
      </div>
      
      {/* 内容 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* 脚本模板 */}
        <div className="space-y-2">
          <label className="text-xs text-editor-muted">快速模板</label>
          <div className="grid grid-cols-3 gap-1.5">
            {SCRIPT_TEMPLATES.map((t) => (
              <button
                key={t.name}
                onClick={() => useTemplate(t)}
                className="flex flex-col items-center gap-1 px-2 py-2 bg-editor-panel
                  rounded-lg text-xs hover:bg-editor-bg transition-colors
                  border border-transparent hover:border-editor-border"
              >
                <span className="text-lg">{t.icon}</span>
                <span className="text-editor-muted text-[10px]">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
        
        {/* 脚本输入 */}
        <div className="space-y-1.5">
          <label className="text-xs text-editor-muted flex items-center gap-1.5">
            <FileText size={12} />
            脚本内容
          </label>
          <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder={`输入脚本内容，支持多种格式：

1. 纯文本（自动分段）:
这是一段描述文字...

2. 结构化脚本（用|分隔）:
解说词 | 关键词 | 时长 | 情绪

3. 带时间戳：
[00:00] 开始描述
[00:05] 下一段描述

特殊标记：
【快节奏】- 踩点视频
【电影感】- 大片风格
【广告】- 商业宣传`}
            className="w-full bg-editor-bg border border-editor-border rounded-lg px-3 py-2 text-xs
              resize-none focus:outline-none focus:border-purple-500/50 transition-colors
              placeholder:text-editor-muted/50 min-h-[200px]"
            rows={10}
          />
          <p className="text-[10px] text-editor-muted/70">
            提示：每行一个段落，用 | 分隔解说词、关键词、时长、情绪
          </p>
        </div>
        
        {/* 生成按钮 */}
        <button
          onClick={handleAutoEdit}
          disabled={isProcessing || !script.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r 
            from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium
            hover:from-purple-500 hover:to-pink-500 transition-all
            disabled:opacity-50 disabled:cursor-not-allowed
            shadow-lg shadow-purple-500/20"
        >
          {isProcessing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              AI正在创作中...
            </>
          ) : (
            <>
              <Wand2 size={16} />
              开始AI自动剪辑
            </>
          )}
        </button>
        
        {/* 进度提示 */}
        {progress && (
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 rounded-lg">
            <Zap size={14} className="text-purple-400" />
            <span className="text-xs text-purple-300">{progress}</span>
          </div>
        )}
        
        {/* 错误提示 */}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 rounded-lg">
            <AlertCircle size={14} className="text-red-400" />
            <span className="text-xs text-red-300">{error}</span>
          </div>
        )}
        
        {/* 结果展示 */}
        {result && (
          <div className="space-y-3 p-3 bg-editor-panel rounded-lg border border-editor-border">
            <div className="flex items-center gap-2 text-green-400">
              <Check size={14} />
              <span className="text-xs font-medium">AI剪辑完成</span>
            </div>
            
            {/* 统计信息 */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-editor-muted">
                <Clock size={12} />
                <span>总时长: {result.totalDuration?.toFixed(1) || 0}s</span>
              </div>
              <div className="flex items-center gap-1.5 text-editor-muted">
                <Play size={12} />
                <span>片段数: {result.clips?.length || 0}</span>
              </div>
            </div>
            
            {/* 片段预览 */}
            {result.clips && result.clips.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] text-editor-muted">生成的片段</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {result.clips.map((clip: any, i: number) => (
                    <div
                      key={clip.id}
                      className="flex items-center gap-2 px-2 py-1.5 bg-editor-bg rounded text-xs"
                    >
                      <span className="text-editor-muted w-4">{i + 1}</span>
                      <span className="flex-1 truncate text-editor-text">
                        {clip.asset?.title || '未命名'}
                      </span>
                      <span className="text-editor-muted font-mono">
                        {clip.duration?.toFixed(1)}s
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 音乐信息 */}
            {result.music && (
              <div className="flex items-center gap-2 text-xs text-editor-muted">
                <Music size={12} />
                <span>背景音乐: {result.music.title}</span>
              </div>
            )}
            
            {/* 踩点信息 */}
            {result.beatMarkers && (
              <div className="flex items-center gap-2 text-xs text-editor-muted">
                <Zap size={12} className="text-yellow-400" />
                <span>已启用踩点模式 ({result.beatMarkers.length}个节拍点)</span>
              </div>
            )}
          </div>
        )}
        
        {/* 使用说明 */}
        <div className="space-y-2 pt-2 border-t border-editor-border">
          <h4 className="text-xs font-semibold text-editor-muted">使用说明</h4>
          <div className="space-y-1.5 text-[10px] text-editor-muted/80">
            <p>1. 选择模板或直接输入脚本</p>
            <p>2. AI会自动解析关键词并搜索素材</p>
            <p>3. 自动匹配转场、音乐和踩点</p>
            <p>4. 结果自动添加到时间线</p>
          </div>
        </div>
      </div>
    </div>
  );
}
