import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { useEditorStore } from '@/stores/editorStore';

export default function PreviewPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    currentTime, setCurrentTime,
    isPlaying, setIsPlaying,
    project,
  } = useEditorStore();
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  // 获取当前时间点的视频片段
  const currentVideoClip = project.tracks
    .filter((t) => t.type === 'video' && !t.muted)
    .flatMap((t) => t.clips)
    .find((c) => currentTime >= c.startTime && currentTime < c.startTime + c.duration);

  // 当选中片段改变时，更新视频源
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (currentVideoClip?.asset?.videoUrl) {
      if (video.src !== currentVideoClip.asset.videoUrl) {
        video.src = currentVideoClip.asset.videoUrl;
        video.load();
      }
      const offset = currentTime - currentVideoClip.startTime + currentVideoClip.trimStart;
      video.currentTime = offset;
      if (isPlaying && video.paused) {
        video.play().catch(() => {});
      }
    } else if (!currentVideoClip && !video.paused) {
      video.pause();
    }
  }, [currentVideoClip?.id, currentTime]);

  // 同步播放状态
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      if (currentVideoClip?.asset?.videoUrl) {
        video.play().catch(() => {});
      }
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // 同步音量
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  // 播放进度更新
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      const newTime = useEditorStore.getState().currentTime + delta;
      if (newTime >= project.duration) {
        setIsPlaying(false);
        setCurrentTime(0);
        return;
      }
      setCurrentTime(newTime);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, project.duration]);

  const togglePlay = useCallback(() => setIsPlaying(!isPlaying), [isPlaying, setIsPlaying]);

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCurrentTime(parseFloat(e.target.value));
    },
    [setCurrentTime],
  );

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current || !isPlaying) return;
    // 不从video timeupdate同步，我们自己管理时间线时间
  }, [isPlaying]);

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const f = Math.floor((t % 1) * 30);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-editor-bg min-h-0">
      {/* 视频区域 */}
      <div className="relative flex-1 w-full flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl shadow-black/50">
          {currentVideoClip?.asset ? (
            currentVideoClip.asset.imageUrl ? (
              // 显示图片
              <img
                src={currentVideoClip.asset.imageUrl}
                alt={currentVideoClip.label || '图片'}
                className="w-full h-full object-contain"
              />
            ) : currentVideoClip.asset.videoUrl ? (
              // 显示视频
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                playsInline
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-editor-muted">
                <p>素材加载失败</p>
              </div>
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-editor-muted">
              <div className="w-16 h-16 rounded-full bg-editor-panel flex items-center justify-center mb-3">
                <Play size={28} className="ml-1" />
              </div>
              <p className="text-sm">添加视频素材开始编辑</p>
              <p className="text-xs mt-1 opacity-60">从左侧搜索并添加素材到时间线</p>
            </div>
          )}

          {/* 当前片段信息 */}
          {currentVideoClip && (
            <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded">
              {currentVideoClip.label || '片段'}
            </div>
          )}

          {/* 文字层叠加 */}
          {project.tracks
            .filter((t) => t.type === 'text' && !t.muted)
            .flatMap((t) => t.clips)
            .filter((clip) => currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration)
            .map((textClip) => (
              <div
                key={textClip.id}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  fontFamily: textClip.fontFamily || 'sans-serif',
                  fontSize: `${textClip.fontSize || 48}px`,
                  color: textClip.textColor || '#ffffff',
                  fontWeight: textClip.fontWeight || 'normal',
                  fontStyle: textClip.fontStyle || 'normal',
                  textAlign: (textClip.textAlign || 'center') as any,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                  padding: '20px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {textClip.textContent || textClip.label || ''}
              </div>
            ))}
        </div>
      </div>

      {/* 播放控制栏 */}
      <div className="w-full max-w-4xl px-4 pb-3 space-y-2">
        {/* 进度条 */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-editor-muted w-20 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={project.duration}
            step={0.033}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-editor-border rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-editor-accent
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
          />
          <span className="text-[11px] font-mono text-editor-muted w-20">
            {formatTime(project.duration)}
          </span>
        </div>

        {/* 按钮行 */}
        <div className="flex items-center justify-center gap-2">
          <ControlBtn icon={<SkipBack size={16} />} onClick={() => setCurrentTime(0)} />
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-editor-accent hover:bg-editor-accent-hover
              text-white flex items-center justify-center transition-colors shadow-lg shadow-editor-accent/20"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
          </button>
          <ControlBtn icon={<SkipForward size={16} />} onClick={() => setCurrentTime(project.duration)} />

          <div className="mx-3 h-5 w-px bg-editor-border" />

          <button onClick={() => setMuted(!muted)} className="text-editor-muted hover:text-editor-text transition-colors">
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
            className="w-20 h-1 bg-editor-border rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5
              [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:rounded-full"
          />

          <div className="mx-3 h-5 w-px bg-editor-border" />

          <ControlBtn icon={<Maximize2 size={16} />} />
        </div>
      </div>
    </div>
  );
}

function ControlBtn({ icon, onClick }: { icon: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-editor-muted
        hover:text-editor-text hover:bg-editor-panel transition-colors"
    >
      {icon}
    </button>
  );
}
