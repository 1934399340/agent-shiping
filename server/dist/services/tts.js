// ============================================
// TTS（文字转语音）服务
// 支持：Edge-TTS（免费）和 阿里云TTS（需API Key）
// ============================================
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
const execFileAsync = promisify(execFile);
// 输出目录
const OUTPUT_DIR = path.join(process.cwd(), 'output', 'tts');
// 确保输出目录存在
async function ensureOutputDir() {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
}
/**
 * Edge-TTS 实现
 * 使用Python edge-tts包或直接调用edge-tts CLI
 */
async function edgeTTS(request) {
    const { text, voiceId, speed = 1 } = request;
    const filename = `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp3`;
    const outputPath = path.join(OUTPUT_DIR, filename);
    await ensureOutputDir();
    try {
        // 尝试使用edge-tts CLI（需要 pip install edge-tts）
        const rateStr = speed === 1 ? '+0%' : speed > 1 ? `+${Math.round((speed - 1) * 100)}%` : `${Math.round((speed - 1) * 100)}%`;
        const { stderr } = await execFileAsync('edge-tts', [
            '--voice', voiceId,
            '--rate', rateStr,
            '--text', text,
            '--write-media', outputPath,
            '--no-warn',
        ], {
            timeout: 30000,
            windowsHide: true,
        });
        if (stderr && !stderr.includes('warn')) {
            console.warn('edge-tts warning:', stderr);
        }
        // 验证文件存在
        const stat = await fs.stat(outputPath);
        return {
            success: true,
            audioUrl: `/api/tts/file/${filename}`,
            filename,
            duration: 0, // 后续可通过ffprobe获取
        };
    }
    catch (err) {
        // 如果edge-tts CLI不可用，提供安装提示
        if (err.code === 'ENOENT') {
            return {
                success: false,
                error: 'edge-tts 未安装。请运行: pip install edge-tts',
            };
        }
        console.error('Edge-TTS error:', err);
        return {
            success: false,
            error: `TTS生成失败: ${err.message}`,
        };
    }
}
/**
 * 阿里云TTS 实现
 * 需要配置 ALIYUN_ACCESS_KEY_ID 和 ALIYUN_ACCESS_KEY_SECRET
 */
async function aliyunTTS(request) {
    const { text, voiceId, speed = 1 } = request;
    const akId = process.env.ALIYUN_ACCESS_KEY_ID;
    const akSecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
    const appKey = process.env.ALIYUN_TTS_APP_KEY;
    if (!akId || !akSecret || !appKey) {
        return {
            success: false,
            error: '阿里云TTS未配置。请在.env中设置 ALIYUN_ACCESS_KEY_ID, ALIYUN_ACCESS_KEY_SECRET, ALIYUN_TTS_APP_KEY',
        };
    }
    // 阿里云REST API调用（简化版）
    // 生产环境建议使用官方SDK
    try {
        const tokenRes = await fetch(`https://nls-meta.cn-shanghai.aliyuncs.com/?AccessKeyId=${akId}&Action=CreateToken&Format=JSON&RegionId=cn-shanghai&SignatureMethod=HMAC-SHA1&SignatureNonce=${Date.now()}&SignatureVersion=1.0&Timestamp=${encodeURIComponent(new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'))}&Version=2019-02-28&Signature=${akSecret}`);
        if (!tokenRes.ok) {
            throw new Error('Failed to get Aliyun token');
        }
        // 注意：实际阿里云TTS需要WebSocket连接和签名计算
        // 这里提供接口框架，实际接入需要使用 @alicloud/nls20190201 SDK
        return {
            success: false,
            error: '阿里云TTS需要通过官方SDK接入，建议使用Edge-TTS（免费）或在服务端安装 @alicloud/nls20190201 SDK',
        };
    }
    catch (err) {
        return {
            success: false,
            error: `阿里云TTS错误: ${err.message}`,
        };
    }
}
/**
 * 统一TTS入口
 */
export async function generateTTS(request) {
    switch (request.engine) {
        case 'edge-tts':
            return edgeTTS(request);
        case 'aliyun':
            return aliyunTTS(request);
        default:
            return { success: false, error: `不支持的TTS引擎: ${request.engine}` };
    }
}
/**
 * 获取TTS音频文件路径
 */
export function getTTSFilePath(filename) {
    return path.join(OUTPUT_DIR, filename);
}
