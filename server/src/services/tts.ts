// ============================================
// TTS（文字转语音）服务
// 支持：Edge-TTS（免费）和 阿里云TTS（需API Key）
// ============================================
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import type { TTSParams, TTSResult } from '../../types/index.js';

const execFileAsync = promisify(execFile);

const OUTPUT_DIR = path.join(process.cwd(), 'output', 'tts');

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function edgeTTS(params: TTSParams): Promise<TTSResult> {
  const { text, voiceId, speed = 1 } = params;
  const filename = `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp3`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  await ensureOutputDir();

  try {
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

    await fs.stat(outputPath);

    return {
      success: true,
      audioUrl: `/api/tts/file/${filename}`,
      duration: 0,
    };
  } catch (err: any) {
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

async function aliyunTTS(params: TTSParams): Promise<TTSResult> {
  const { text, voiceId, speed = 1 } = params;

  const akId = process.env.ALIYUN_ACCESS_KEY_ID;
  const akSecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
  const appKey = process.env.ALIYUN_TTS_APP_KEY;

  if (!akId || !akSecret || !appKey) {
    return {
      success: false,
      error: '阿里云TTS未配置。请在.env中设置 ALIYUN_ACCESS_KEY_ID, ALIYUN_ACCESS_KEY_SECRET, ALIYUN_TTS_APP_KEY',
    };
  }

  try {
    const tokenRes = await fetch(
      `https://nls-meta.cn-shanghai.aliyuncs.com/?AccessKeyId=${akId}&Action=CreateToken&Format=JSON&RegionId=cn-shanghai&SignatureMethod=HMAC-SHA1&SignatureNonce=${Date.now()}&SignatureVersion=1.0&Timestamp=${encodeURIComponent(new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'))}&Version=2019-02-28&Signature=${akSecret}`,
    );

    if (!tokenRes.ok) {
      throw new Error('Failed to get Aliyun token');
    }

    return {
      success: false,
      error: '阿里云TTS需要通过官方SDK接入，建议使用Edge-TTS（免费）或在服务端安装 @alicloud/nls20190201 SDK',
    };
  } catch (err: any) {
    return {
      success: false,
      error: `阿里云TTS错误: ${err.message}`,
    };
  }
}

export async function generateTTS(params: TTSParams): Promise<TTSResult> {
  const engine = params.engine || 'edge-tts';
  
  switch (engine) {
    case 'edge-tts':
      return edgeTTS(params);
    case 'aliyun':
      return aliyunTTS(params);
    default:
      return { success: false, error: `不支持的TTS引擎: ${engine}` };
  }
}

export function getTTSFilePath(filename: string): string {
  return path.join(OUTPUT_DIR, filename);
}

export async function getAvailableVoices(): Promise<Array<{
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female';
}>> {
  return [
    { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓', language: 'zh-CN', gender: 'female' },
    { id: 'zh-CN-YunxiNeural', name: '云希', language: 'zh-CN', gender: 'male' },
    { id: 'zh-CN-YunjianNeural', name: '云健', language: 'zh-CN', gender: 'male' },
    { id: 'zh-CN-XiaoyiNeural', name: '晓伊', language: 'zh-CN', gender: 'female' },
    { id: 'zh-CN-YunyangNeural', name: '云扬', language: 'zh-CN', gender: 'male' },
    { id: 'zh-CN-XiaochenNeural', name: '晓辰', language: 'zh-CN', gender: 'female' },
    { id: 'zh-CN-XiaohanNeural', name: '晓涵', language: 'zh-CN', gender: 'female' },
    { id: 'zh-CN-XiaomengNeural', name: '晓梦', language: 'zh-CN', gender: 'female' },
    { id: 'zh-CN-XiaomoNeural', name: '晓墨', language: 'zh-CN', gender: 'female' },
    { id: 'zh-CN-XiaoruiNeural', name: '晓睿', language: 'zh-CN', gender: 'female' },
    { id: 'zh-CN-XiaoshuangNeural', name: '晓双', language: 'zh-CN', gender: 'female' },
    { id: 'zh-CN-XiaoxuanNeural', name: '晓萱', language: 'zh-CN', gender: 'female' },
    { id: 'zh-CN-XiaoyanNeural', name: '晓颜', language: 'zh-CN', gender: 'female' },
    { id: 'zh-CN-XiaoyouNeural', name: '晓悠', language: 'zh-CN', gender: 'female' },
    { id: 'zh-CN-YunfengNeural', name: '云枫', language: 'zh-CN', gender: 'male' },
    { id: 'zh-CN-YunhaoNeural', name: '云皓', language: 'zh-CN', gender: 'male' },
    { id: 'zh-CN-YunxiaNeural', name: '云夏', language: 'zh-CN', gender: 'male' },
    { id: 'zh-CN-YunyeNeural', name: '云野', language: 'zh-CN', gender: 'male' },
    { id: 'zh-CN-YunzeNeural', name: '云泽', language: 'zh-CN', gender: 'male' },
    { id: 'en-US-JennyNeural', name: 'Jenny', language: 'en-US', gender: 'female' },
    { id: 'en-US-GuyNeural', name: 'Guy', language: 'en-US', gender: 'male' },
  ];
}
