// ============================================
// FFmpeg 视频处理服务
// ============================================
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
const execFileAsync = promisify(execFile);
const OUTPUT_DIR = path.join(process.cwd(), 'output', 'renders');
async function ensureOutputDir() {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
}
/**
 * 获取视频信息（使用ffprobe）
 */
export async function getVideoInfo(filePath) {
    try {
        const { stdout } = await execFileAsync('ffprobe', [
            '-v', 'quiet',
            '-print_format', 'json',
            '-show_format',
            '-show_streams',
            filePath,
        ], { timeout: 10000 });
        const info = JSON.parse(stdout);
        const videoStream = info.streams?.find((s) => s.codec_type === 'video');
        const audioStream = info.streams?.find((s) => s.codec_type === 'audio');
        return {
            duration: parseFloat(info.format?.duration || '0'),
            width: videoStream?.width || 0,
            height: videoStream?.height || 0,
            fps: Math.round((videoStream?.r_frame_rate || '30').split('/')[0] /
                (videoStream?.r_frame_rate || '30/1').split('/')[1]),
            codec: videoStream?.codec_name || 'unknown',
            hasAudio: !!audioStream,
        };
    }
    catch (err) {
        console.error('ffprobe error:', err);
        return { duration: 0, width: 0, height: 0, fps: 30, codec: 'unknown', hasAudio: false };
    }
}
/**
 * 获取在线视频信息（先下载临时文件再用ffprobe分析）
 */
export async function getOnlineVideoInfo(url) {
    const tempFile = path.join(OUTPUT_DIR, 'temp', `probe_${Date.now()}.mp4`);
    try {
        // 确保临时目录存在
        await fs.mkdir(path.dirname(tempFile), { recursive: true });
        // 下载视频头部（只下载前几MB用于分析）
        const response = await fetch(url, {
            headers: { 'Range': 'bytes=0-5000000' } // 只下载前5MB
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        await fs.writeFile(tempFile, Buffer.from(buffer));
        // 使用ffprobe分析
        const info = await getVideoInfo(tempFile);
        // 如果无法从部分文件获取时长，尝试从Content-Range header推断
        if (info.duration === 0 && response.headers.get('content-range')) {
            // 这种情况下只能返回默认值
            console.warn('无法获取视频时长，使用默认值');
            return { ...info, duration: 10 }; // 默认10秒
        }
        return info;
    }
    catch (err) {
        console.error('获取在线视频信息失败:', err);
        // 返回默认值
        return { duration: 10, width: 1920, height: 1080, fps: 30, codec: 'unknown', hasAudio: true };
    }
    finally {
        // 清理临时文件
        try {
            await fs.unlink(tempFile);
        }
        catch { }
    }
}
/**
 * 通过HTTP HEAD请求估算视频时长（快速但不精确）
 */
export async function estimateVideoDuration(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        const contentType = response.headers.get('content-type');
        // 如果是视频类型，根据文件大小估算时长
        if (contentType?.includes('video') && contentLength) {
            const sizeMB = parseInt(contentLength) / (1024 * 1024);
            // 假设平均码率为 2Mbps，估算时长（秒）
            return Math.round(sizeMB * 4);
        }
        return 10; // 默认10秒
    }
    catch {
        return 10;
    }
}
/**
 * 应用转场效果（使用xfade滤镜）
 */
export async function applyTransition(options) {
    await ensureOutputDir();
    // xfade转场类型映射
    const xfadeMap = {
        fade: 'fade',
        dissolve: 'dissolve',
        'slide-left': 'slideleft',
        'slide-right': 'slideright',
        'slide-up': 'slideup',
        'slide-down': 'slidedown',
        'zoom-in': 'zoomin',
        'zoom-out': 'fadeblack',
        'wipe-left': 'wiperight',
        'wipe-right': 'wipeleft',
        blur: 'circlecrop',
        glitch: 'dissolve',
        'color-shift': 'dissolve',
    };
    const xfadeType = xfadeMap[options.transition] || 'fade';
    const args = [
        '-i', options.input1,
        '-i', options.input2,
        '-filter_complex', `[0:v][1:v]xfade=transition=${xfadeType}:duration=${options.duration}:offset=${options.offset}[v]`,
        '-map', '[v]',
        '-y',
        options.output,
    ];
    await execFileAsync('ffmpeg', args, { timeout: 60000 });
    return options.output;
}
/**
 * 渲染最终视频（支持转场效果和音频混音）
 */
export async function renderVideo(options) {
    await ensureOutputDir();
    if (options.clips.length === 0) {
        throw new Error('没有可渲染的视频片段');
    }
    const { onProgress } = options;
    const tempDir = path.join(OUTPUT_DIR, `temp_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    const tempFiles = [];
    const totalClips = options.clips.length;
    try {
        onProgress?.(0, '准备渲染...');
        // 步骤1：预处理所有片段（裁剪、缩放、标准化）
        onProgress?.(5, '预处理视频片段...');
        const processedClips = [];
        for (let i = 0; i < options.clips.length; i++) {
            const clip = options.clips[i];
            const tempFile = path.join(tempDir, `clip_${i.toString().padStart(3, '0')}.mp4`);
            tempFiles.push(tempFile);
            const progress = 5 + (i / totalClips) * 30;
            onProgress?.(progress, `处理片段 ${i + 1}/${totalClips}...`);
            // 构建滤镜链
            const filters = [];
            // 缩放到目标分辨率
            filters.push(`scale=${options.resolution.width}:${options.resolution.height}:force_original_aspect_ratio=decrease`);
            filters.push(`pad=${options.resolution.width}:${options.resolution.height}:(ow-iw)/2:(oh-ih)/2`);
            // 速度调整
            if (clip.speed && clip.speed !== 1) {
                filters.push(`setpts=${1 / clip.speed}*PTS`);
            }
            // 音量调整
            const volume = clip.volume ?? 1;
            const audioFilters = volume !== 1 ? [`volume=${volume}`] : [];
            // 转场效果（淡入淡出）
            if (clip.transitionIn) {
                const transDuration = clip.transitionDuration || 0.5;
                if (clip.transitionIn === 'fade') {
                    filters.push(`fade=t=in:st=0:d=${transDuration}`);
                    audioFilters.push(`afade=t=in:st=0:d=${transDuration}`);
                }
            }
            if (clip.transitionOut) {
                const transDuration = clip.transitionDuration || 0.5;
                const fadeStart = clip.duration - transDuration;
                if (clip.transitionOut === 'fade') {
                    filters.push(`fade=t=out:st=${fadeStart}:d=${transDuration}`);
                    audioFilters.push(`afade=t=out:st=${fadeStart}:d=${transDuration}`);
                }
            }
            const args = [
                '-i', clip.url,
                '-ss', clip.trimStart.toString(),
                '-t', clip.duration.toString(),
                '-vf', filters.join(','),
                '-r', options.fps.toString(),
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '23',
                '-c:a', 'aac',
                '-b:a', '128k',
            ];
            if (audioFilters.length > 0) {
                args.push('-af', audioFilters.join(','));
            }
            args.push('-y', tempFile);
            await execFileAsync('ffmpeg', args, { timeout: 120000 });
            processedClips.push(tempFile);
        }
        // 步骤2：合并所有片段
        onProgress?.(40, '合并视频片段...');
        if (processedClips.length === 1) {
            // 只有一个片段，直接复制
            await fs.copyFile(processedClips[0], options.output);
        }
        else {
            // 多个片段，使用concat协议
            const concatListPath = path.join(tempDir, 'concat.txt');
            let lines = '';
            for (const clip of processedClips) {
                lines += `file '${clip}'\n`;
            }
            await fs.writeFile(concatListPath, lines, 'utf-8');
            tempFiles.push(concatListPath);
            await execFileAsync('ffmpeg', [
                '-f', 'concat',
                '-safe', '0',
                '-i', concatListPath,
                '-c', 'copy',
                '-y',
                options.output,
            ], { timeout: 300000 });
        }
        // 步骤3：添加音频轨道（如果有）
        if (options.audioTracks && options.audioTracks.length > 0) {
            onProgress?.(70, '混合音频轨道...');
            const outputWithAudio = path.join(tempDir, 'output_with_audio.mp4');
            tempFiles.push(outputWithAudio);
            // 构建音频混合滤镜
            const audioInputs = [];
            const audioMixFilters = [];
            // 第一个输入是视频文件（包含视频和原音频）
            audioInputs.push('-i', options.output);
            audioMixFilters.push('[0:a]');
            // 添加额外的音频轨道
            for (let i = 0; i < options.audioTracks.length; i++) {
                const track = options.audioTracks[i];
                audioInputs.push('-i', track.url);
                audioMixFilters.push(`[${i + 1}:a]adelay=${Math.round(track.startTime * 1000)}|${Math.round(track.startTime * 1000)},volume=${track.volume}[a${i}]`);
            }
            // 混音
            const mixInputs = ['[0:a]', ...options.audioTracks.map((_, i) => `[a${i}]`)];
            audioMixFilters.push(`${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first[aout]`);
            await execFileAsync('ffmpeg', [
                ...audioInputs,
                '-filter_complex', audioMixFilters.join(';'),
                '-map', '0:v',
                '-map', '[aout]',
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-y',
                outputWithAudio,
            ], { timeout: 180000 });
            // 用带音频的版本替换输出
            await fs.copyFile(outputWithAudio, options.output);
        }
        onProgress?.(100, '渲染完成！');
        return options.output;
    }
    finally {
        // 清理临时文件
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch { }
    }
}
/**
 * 检查FFmpeg是否可用
 */
export async function isFFmpegAvailable() {
    try {
        await execFileAsync('ffmpeg', ['-version'], { timeout: 5000 });
        return true;
    }
    catch {
        return false;
    }
}
