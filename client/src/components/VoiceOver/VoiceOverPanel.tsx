import { useState } from 'react';
import { Mic, Loader2, Play, Send } from 'lucide-react';
import type { TTSEngine, TTSVoiceOption } from '@/types';

const VOICES: TTSVoiceOption[] = [
  // Edge-TTS 中文音色
  { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓', engine: 'edge-tts', language: 'zh-CN', gender: 'female' },
  { id: 'zh-CN-YunxiNeural', name: '云希', engine: 'edge-tts', language: 'zh-CN', gender: 'male' },
  { id: 'zh-CN-YunjianNeural', name: '云健', engine: 'edge-tts', language: 'zh-CN', gender: 'male' },
  { id: 'zh-CN-XiaoyiNeural', name: '晓伊', engine: 'edge-tts', language: 'zh-CN', gender: 'female' },
  { id: 'zh-CN-YunyangNeural', name: '云扬', engine: 'edge-tts', language: 'zh-CN', gender: 'male' },
  { id: 'zh-CN-XiaochenNeural', name: '晓辰', engine: 'edge-tts', language: 'zh-CN', gender: 'female' },
  // Edge-TTS 英文音色
  { id: 'en-US-JennyNeural', name: 'Jenny', engine: 'edge-tts', language: 'en-US', gender: 'female' },
  { id: 'en-US-GuyNeural', name: 'Guy', engine: 'edge-tts', language: 'en-US', gender: 'male' },
  // 阿里云（需要配置API Key）
  { id: 'aliyun-zhiyan_emo', name: '知燕（情感）', engine: 'aliyun', language: 'zh-CN', gender: 'female' },
  { id: 'aliyun-zhiyu_emo', name: '知宇（情感）', engine: 'aliyun', language: 'zh-CN', gender: 'male' },
];

const API_BASE = '/api';

export default function VoiceOverPanel() {
  const [text, setText] = useState('');
  const [engine, setEngine] = useState<TTSEngine>('edge-tts');
  const [voiceId, setVoiceId] = useState('zh-CN-XiaoxiaoNeural');
  const [speed, setSpeed] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const filteredVoices = VOICES.filter((v) => v.engine === engine);
  const selectedVoice = VOICES.find((v) => v.id === voiceId);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/tts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          engine,
          voiceId,
          speed,
        }),
      });
      const data = await res.json();
      if (data.audioUrl) {
        setAudioUrl(data.audioUrl);
        setPreviewUrl(`${API_BASE}/tts/file/${encodeURIComponent(data.filename)}`);
      }
    } catch (err) {
      console.error('TTS生成失败:', err);
    }
    setGenerating(false);
  };

  const handleAddToTimeline = () => {
    if (!audioUrl) return;
    // 动态导入store避免循环依赖
    import('@/stores/editorStore').then(({ useEditorStore }) => {
      const store = useEditorStore.getState();
      const audioTrack = store.project.tracks.find((t) => t.type === 'audio');
      if (!audioTrack) return;

      const lastClipEnd = audioTrack.clips.reduce(
        (max, c) => Math.max(max, c.startTime + c.duration),
        0,
      );

      store.addClip(audioTrack.id, {
        id: crypto.randomUUID().slice(0, 8),
        trackId: audioTrack.id,
        type: 'audio',
        startTime: lastClipEnd,
        duration: 0, // 等音频加载后更新
        trimStart: 0,
        trimEnd: 0,
        volume: 1,
        label: `配音 - ${selectedVoice?.name}`,
        audioUrl,
        ttsEngine: engine,
        ttsVoice: voiceId,
        ttsText: text,
      });
    });
  };

  return (
    <div className="p-3 space-y-3">
      {/* 引擎选择 */}
      <div className="flex gap-1">
        <button
          onClick={() => { setEngine('edge-tts'); setVoiceId('zh-CN-XiaoxiaoNeural'); }}
          className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            engine === 'edge-tts'
              ? 'bg-editor-accent/20 text-editor-accent border border-editor-accent/30'
              : 'bg-editor-bg text-editor-muted border border-editor-border hover:border-editor-accent/20'
          }`}
        >
          🎤 Edge-TTS
          <span className="block text-[9px] opacity-60">免费</span>
        </button>
        <button
          onClick={() => { setEngine('aliyun'); setVoiceId('aliyun-zhiyan_emo'); }}
          className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            engine === 'aliyun'
              ? 'bg-editor-accent/20 text-editor-accent border border-editor-accent/30'
              : 'bg-editor-bg text-editor-muted border border-editor-border hover:border-editor-accent/20'
          }`}
        >
          ☁️ 阿里云TTS
          <span className="block text-[9px] opacity-60">需要API Key</span>
        </button>
      </div>

      {/* 音色选择 */}
      <div className="space-y-1.5">
        <label className="text-xs text-editor-muted">选择音色</label>
        <div className="grid grid-cols-2 gap-1">
          {filteredVoices.map((voice) => (
            <button
              key={voice.id}
              onClick={() => setVoiceId(voice.id)}
              className={`px-2 py-1.5 rounded text-left text-xs transition-colors ${
                voiceId === voice.id
                  ? 'bg-editor-accent/15 text-editor-accent border border-editor-accent/30'
                  : 'bg-editor-bg text-editor-text border border-editor-border hover:border-editor-accent/20'
              }`}
            >
              <span>{voice.gender === 'female' ? '♀' : '♂'}</span>{' '}
              {voice.name}
              <span className="block text-[9px] text-editor-muted">{voice.language}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 文本输入 */}
      <div className="space-y-1.5">
        <label className="text-xs text-editor-muted">配音文本</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="输入要配音的文字..."
          className="w-full bg-editor-bg border border-editor-border rounded-lg px-3 py-2 text-xs
            resize-none focus:outline-none focus:border-editor-accent/50 transition-colors"
          rows={4}
        />
      </div>

      {/* 语速 */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-xs text-editor-muted">语速</label>
          <span className="text-[10px] font-mono text-editor-accent">{speed.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-editor-border rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-editor-accent
            [&::-webkit-slider-thumb]:rounded-full"
        />
        <div className="flex justify-between text-[9px] text-editor-muted">
          <span>0.5x</span>
          <span>1x</span>
          <span>2x</span>
        </div>
      </div>

      {/* 生成按钮 */}
      <button
        onClick={handleGenerate}
        disabled={generating || !text.trim()}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-editor-accent rounded-lg
          text-sm font-medium text-white hover:bg-editor-accent-hover transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {generating ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Mic size={14} />
        )}
        {generating ? '生成中...' : '生成配音'}
      </button>

      {/* 预览 + 添加 */}
      {previewUrl && (
        <div className="space-y-2">
          <audio controls src={previewUrl} className="w-full h-8" />
          <button
            onClick={handleAddToTimeline}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-editor-success/15
              text-editor-success rounded-lg text-xs font-medium hover:bg-editor-success/25 transition-colors"
          >
            <Send size={12} /> 添加到时间线
          </button>
        </div>
      )}
    </div>
  );
}
