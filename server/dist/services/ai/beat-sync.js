// ============================================
// 音乐踩点引擎 - 实现卡点剪辑
// ============================================
/**
 * 节拍检测器 - 从BPM计算节拍点
 */
export function detectBeatsFromBPM(duration, config) {
    const beats = [];
    const beatInterval = 60 / config.bpm; // 每拍秒数
    const barLength = beatInterval * config.timeSignature;
    let currentTime = config.firstBeatOffset;
    let beatCount = 0;
    while (currentTime < duration) {
        const beatInBar = beatCount % config.timeSignature;
        let type = 'upbeat';
        let intensity = 0.5;
        if (beatInBar === 0) {
            // 第一拍 - 强拍
            type = 'downbeat';
            intensity = 1.0;
        }
        else if (beatInBar === Math.floor(config.timeSignature / 2)) {
            // 中间拍 - 中等强度
            intensity = 0.7;
        }
        beats.push({
            time: currentTime,
            intensity,
            type,
        });
        currentTime += beatInterval;
        beatCount++;
    }
    return beats;
}
/**
 * 智能踩点 - 将片段对齐到节拍
 */
export function syncClipsToBeats(clips, beats, mode = 'on-beat') {
    const syncPoints = [];
    for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const originalEnd = clip.startTime + clip.duration;
        // 找最近的强节拍作为起点
        let nearestBeat = null;
        let minDistance = Infinity;
        for (const beat of beats) {
            // 只考虑强拍（downbeat）或高强度拍
            if (mode === 'on-bar' && beat.type !== 'downbeat')
                continue;
            const distance = Math.abs(beat.time - clip.startTime);
            if (distance < minDistance && distance < 2) { // 容差2秒
                minDistance = distance;
                nearestBeat = beat;
            }
        }
        if (nearestBeat) {
            const syncedStart = nearestBeat.time;
            const adjustment = syncedStart - clip.startTime;
            // 找结束点的节拍
            const syncedEnd = findNearestBeat(originalEnd, beats, mode === 'on-beat' ? 0.5 : 0);
            syncPoints.push({
                clipIndex: i,
                originalStart: clip.startTime,
                originalEnd,
                syncedStart,
                syncedEnd: syncedEnd > syncedStart ? syncedEnd : originalEnd + adjustment,
                nearestBeat,
                adjustment,
            });
        }
        else {
            // 没找到合适节拍，保持原样
            syncPoints.push({
                clipIndex: i,
                originalStart: clip.startTime,
                originalEnd,
                syncedStart: clip.startTime,
                syncedEnd: originalEnd,
                nearestBeat: beats[0] || { time: 0, intensity: 0.5, type: 'upbeat' },
                adjustment: 0,
            });
        }
    }
    return syncPoints;
}
/**
 * 找最近的节拍
 */
function findNearestBeat(targetTime, beats, minIntensity = 0) {
    let nearestTime = targetTime;
    let minDistance = Infinity;
    for (const beat of beats) {
        if (beat.intensity < minIntensity)
            continue;
        const distance = Math.abs(beat.time - targetTime);
        if (distance < minDistance) {
            minDistance = distance;
            nearestTime = beat.time;
        }
    }
    return nearestTime;
}
/**
 * 自动节奏检测（简化版，实际需要音频分析）
 * 这里根据音乐风格估算BPM
 */
export function estimateBPMFromGenre(genre) {
    const genreBPMMap = {
        electronic: { min: 120, max: 140, typical: 128 },
        ambient: { min: 60, max: 100, typical: 80 },
        cinematic: { min: 70, max: 110, typical: 90 },
        pop: { min: 100, max: 130, typical: 120 },
        rock: { min: 100, max: 140, typical: 120 },
        hiphop: { min: 80, max: 110, typical: 95 },
        jazz: { min: 100, max: 150, typical: 120 },
        folk: { min: 70, max: 100, typical: 85 },
        corporate: { min: 90, max: 120, typical: 105 },
        world: { min: 80, max: 130, typical: 100 },
    };
    const key = genre.toLowerCase();
    return genreBPMMap[key]?.typical || 100;
}
/**
 * 生成踩点提示（用于UI显示）
 */
export function generateBeatMarkers(duration, bpm, style = 'dots') {
    const beatInterval = 60 / bpm;
    const markers = [];
    let t = 0;
    let beat = 0;
    while (t < duration) {
        const beatInBar = beat % 4;
        const intensity = beatInBar === 0 ? 1 : beatInBar === 2 ? 0.7 : 0.4;
        markers.push({ time: t, intensity });
        t += beatInterval;
        beat++;
    }
    return markers;
}
/**
 * 计算音乐高潮点（用于重点片段定位）
 */
export function findMusicHighlights(duration, bpm, structure = 'intro-verse-chorus') {
    const beatInterval = 60 / bpm;
    const barLength = beatInterval * 4;
    const highlights = [];
    if (structure === 'intro-verse-chorus') {
        // 典型歌曲结构：Intro -> Verse -> Chorus -> Verse -> Chorus -> Bridge -> Chorus -> Outro
        const sections = [
            { name: 'intro', bars: 4, intensity: 0.3 },
            { name: 'verse1', bars: 8, intensity: 0.5 },
            { name: 'chorus1', bars: 8, intensity: 1.0 },
            { name: 'verse2', bars: 8, intensity: 0.5 },
            { name: 'chorus2', bars: 8, intensity: 1.0 },
            { name: 'bridge', bars: 4, intensity: 0.7 },
            { name: 'chorus3', bars: 8, intensity: 1.0 },
            { name: 'outro', bars: 4, intensity: 0.3 },
        ];
        let currentTime = 0;
        for (const section of sections) {
            if (currentTime >= duration)
                break;
            if (section.intensity >= 0.8) {
                // 高潮点
                highlights.push({
                    time: currentTime,
                    type: section.name,
                    intensity: section.intensity,
                });
            }
            currentTime += section.bars * barLength;
        }
    }
    else if (structure === 'drop-based') {
        // EDM风格：Buildup -> Drop
        const dropPoint = duration * 0.6; // 60%处是Drop点
        highlights.push({ time: duration * 0.1, type: 'intro', intensity: 0.4 }, { time: duration * 0.3, type: 'buildup', intensity: 0.7 }, { time: dropPoint, type: 'drop', intensity: 1.0 }, { time: duration * 0.8, type: 'breakdown', intensity: 0.5 });
    }
    return highlights;
}
export default {
    detectBeatsFromBPM,
    syncClipsToBeats,
    estimateBPMFromGenre,
    generateBeatMarkers,
    findMusicHighlights,
};
