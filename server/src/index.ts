// ============================================
// AI视频剪辑器 - 后端服务入口
// ============================================
// 必须在最开始加载环境变量
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// 调试：检查API Key是否加载
console.log('🔑 Pexels API Key:', process.env.PEXELS_API_KEY ? `已配置 (${process.env.PEXELS_API_KEY.slice(0, 8)}...)` : '未配置');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 静态文件服务（输出目录）
const OUTPUT_DIR = path.join(process.cwd(), 'output');
app.use('/api/tts/file', express.static(path.join(OUTPUT_DIR, 'tts')));

// ============================================
// API 路由
// ============================================

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 视频搜索
app.get('/api/search', async (req, res) => {
  try {
    const { query, source = 'all', page = 1, perPage = 20, orientation, minDuration, maxDuration } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: '缺少搜索关键词' });
    }

    const { default: searchAll } = await import('./services/search/index.js');
    
    const result = await searchAll({
      query,
      source: source as any,
      page: parseInt(page as string) || 1,
      perPage: parseInt(perPage as string) || 20,
      orientation: orientation as string,
      minDuration: minDuration ? parseFloat(minDuration as string) : undefined,
      maxDuration: maxDuration ? parseFloat(maxDuration as string) : undefined,
    });

    res.json(result);
  } catch (error: any) {
    console.error('搜索失败:', error);
    res.status(500).json({ error: error.message || '搜索失败' });
  }
});

// 音乐搜索
app.get('/api/music/search', async (req, res) => {
  try {
    const { query, genre, page = 1, perPage = 20 } = req.query;

    const { searchMusic } = await import('./services/search/music.js');
    
    const result = await searchMusic({
      query: (query as string) || '',
      genre: genre as string,
      page: parseInt(page as string) || 1,
      perPage: parseInt(perPage as string) || 20,
    });

    res.json(result);
  } catch (error: any) {
    console.error('音乐搜索失败:', error);
    res.status(500).json({ error: error.message || '音乐搜索失败' });
  }
});

// 获取音乐风格列表
app.get('/api/music/genres', async (req, res) => {
  try {
    const { getMusicGenres } = await import('./services/search/music.js');
    const genres = getMusicGenres();
    res.json({ genres });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取推荐音乐
app.get('/api/music/recommended', async (req, res) => {
  try {
    const { count = 5 } = req.query;
    const { getRecommendedMusic } = await import('./services/search/music.js');
    const music = getRecommendedMusic(parseInt(count as string) || 5);
    res.json({ items: music });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// TTS 配音
app.post('/api/tts/generate', async (req, res) => {
  try {
    const { text, engine = 'edge-tts', voiceId, speed = 1 } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '缺少配音文本' });
    }

    if (!voiceId) {
      return res.status(400).json({ error: '请选择音色' });
    }

    const { generateTTS } = await import('./services/tts.js');
    
    const result = await generateTTS({
      text,
      engine,
      voiceId,
      speed: parseFloat(speed) || 1,
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('TTS生成失败:', error);
    res.status(500).json({ error: error.message || 'TTS生成失败' });
  }
});

// 获取TTS文件
app.get('/api/tts/file/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const { getTTSFilePath } = await import('./services/tts.js');
    const filePath = getTTSFilePath(filename);
    
    try {
      await fs.access(filePath);
      res.sendFile(filePath);
    } catch {
      res.status(404).json({ error: '文件不存在' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 视频渲染
app.post('/api/render', async (req, res) => {
  try {
    const { clips, transitions, audioTracks, resolution, fps, format = 'mp4' } = req.body;

    if (!clips || clips.length === 0) {
      return res.status(400).json({ error: '没有可渲染的视频片段' });
    }

    const { renderVideo } = await import('./services/ffmpeg.js');
    
    const outputFilename = `render_${Date.now()}.${format}`;
    const outputPath = path.join(OUTPUT_DIR, 'renders', outputFilename);

    const result = await renderVideo({
      clips,
      transitions: transitions || [],
      audioTracks: audioTracks || [],
      output: outputPath,
      resolution: resolution || { width: 1920, height: 1080 },
      fps: fps || 30,
    });

    res.json({
      success: true,
      downloadUrl: `/api/download/${outputFilename}`,
      filename: outputFilename,
    });
  } catch (error: any) {
    console.error('渲染失败:', error);
    res.status(500).json({ error: error.message || '渲染失败' });
  }
});

// 下载渲染结果
app.get('/api/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(OUTPUT_DIR, 'renders', filename);
    
    try {
      await fs.access(filePath);
      res.download(filePath);
    } catch {
      res.status(404).json({ error: '文件不存在' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 检查FFmpeg状态
app.get('/api/system/ffmpeg', async (req, res) => {
  try {
    const { isFFmpegAvailable } = await import('./services/ffmpeg.js');
    const available = await isFFmpegAvailable();
    res.json({ available });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 获取视频信息（通过URL）
app.post('/api/video/info', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: '缺少视频URL' });
    }
    
    const { getOnlineVideoInfo, estimateVideoDuration } = await import('./services/ffmpeg.js');
    
    // 先尝试快速估算
    const estimatedDuration = await estimateVideoDuration(url);
    
    // 如果估算时长合理，直接返回
    if (estimatedDuration > 5) {
      return res.json({
        duration: estimatedDuration,
        width: 1920,
        height: 1080,
        fps: 30,
        codec: 'unknown',
        hasAudio: true,
        estimated: true,
      });
    }
    
    // 否则尝试精确获取
    const info = await getOnlineVideoInfo(url);
    res.json({ ...info, estimated: false });
  } catch (error: any) {
    console.error('获取视频信息失败:', error);
    res.status(500).json({ error: error.message || '获取视频信息失败' });
  }
});

// 项目保存/加载
const PROJECTS_DIR = path.join(OUTPUT_DIR, 'projects');

app.post('/api/project/save', async (req, res) => {
  try {
    const { project } = req.body;
    
    if (!project || !project.id) {
      return res.status(400).json({ error: '无效的项目数据' });
    }
    
    await fs.mkdir(PROJECTS_DIR, { recursive: true });
    
    const filename = `${project.name || 'project'}_${Date.now()}.json`;
    const filePath = path.join(PROJECTS_DIR, filename);
    
    await fs.writeFile(filePath, JSON.stringify(project, null, 2), 'utf-8');
    
    res.json({ 
      success: true, 
      filename,
      message: '项目保存成功' 
    });
  } catch (error: any) {
    console.error('保存项目失败:', error);
    res.status(500).json({ error: error.message || '保存项目失败' });
  }
});

app.get('/api/project/list', async (req, res) => {
  try {
    await fs.mkdir(PROJECTS_DIR, { recursive: true });
    
    const files = await fs.readdir(PROJECTS_DIR);
    const projects = [];
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const filePath = path.join(PROJECTS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const project = JSON.parse(content);
        
        projects.push({
          id: project.id,
          name: project.name,
          filename: file,
          updatedAt: project.updatedAt,
          createdAt: project.createdAt,
        });
      } catch {}
    }
    
    // 按更新时间排序
    projects.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    
    res.json({ projects });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/project/load/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(PROJECTS_DIR, filename);
    
    const content = await fs.readFile(filePath, 'utf-8');
    const project = JSON.parse(content);
    
    res.json({ project });
  } catch (error: any) {
    res.status(404).json({ error: '项目不存在' });
  }
});

app.delete('/api/project/delete/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(PROJECTS_DIR, filename);
    
    await fs.unlink(filePath);
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// AI自动剪辑 API
// ============================================

// 解析脚本
app.post('/api/ai/parse-script', async (req, res) => {
  try {
    const { script } = req.body;
    
    if (!script || typeof script !== 'string') {
      return res.status(400).json({ error: '请输入脚本内容' });
    }
    
    const { smartParse } = await import('./services/ai/smart-parser.js');
    const result = smartParse(script);
    
    res.json(result);
  } catch (error: any) {
    console.error('脚本解析失败:', error);
    res.status(500).json({ error: error.message || '脚本解析失败' });
  }
});

// AI自动剪辑（核心）
app.post('/api/ai/auto-edit', async (req, res) => {
  try {
    const { script, options } = req.body;
    
    if (!script || typeof script !== 'string') {
      return res.status(400).json({ error: '请输入脚本内容' });
    }
    
    console.log('🎬 收到AI剪辑请求:', script.slice(0, 100));
    
    const { autoEdit } = await import('./services/ai/auto-clip.js');
    const result = await autoEdit(script);
    
    res.json(result);
  } catch (error: any) {
    console.error('AI剪辑失败:', error);
    res.status(500).json({ error: error.message || 'AI剪辑失败' });
  }
});

// 踩点分析
app.post('/api/ai/beat-sync', async (req, res) => {
  try {
    const { clips, bpm, mode = 'on-beat' } = req.body;
    
    if (!clips || !Array.isArray(clips)) {
      return res.status(400).json({ error: '请提供片段数据' });
    }
    
    const { detectBeatsFromBPM, syncClipsToBeats } = await import('./services/ai/beat-sync.js');
    
    // 计算总时长
    const totalDuration = clips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
    
    // 生成节拍点
    const beats = detectBeatsFromBPM(totalDuration, {
      bpm: bpm || 100,
      timeSignature: 4,
      firstBeatOffset: 0,
      syncMode: mode,
    });
    
    // 对齐片段
    const syncPoints = syncClipsToBeats(clips, beats, mode);
    
    res.json({ beats, syncPoints });
  } catch (error: any) {
    console.error('踩点分析失败:', error);
    res.status(500).json({ error: error.message || '踩点分析失败' });
  }
});

// 智能推荐
app.post('/api/ai/recommend', async (req, res) => {
  try {
    const { keywords, style = 'documentary', count = 10 } = req.body;
    
    if (!keywords || !Array.isArray(keywords)) {
      return res.status(400).json({ error: '请提供关键词列表' });
    }
    
    // 批量搜索
    const searchPromises = keywords.slice(0, 5).map(async (keyword: string) => {
      const result = await searchAll({ query: keyword, perPage: 3 });
      return { keyword, assets: result.items };
    });
    
    const results = await Promise.all(searchPromises);
    
    // 合并并打分
    const allAssets = results.flatMap(r => r.assets);
    const uniqueAssets = Array.from(new Map(allAssets.map(a => [a.id, a])).values());
    
    res.json({ 
      recommendations: uniqueAssets.slice(0, count),
      byKeyword: results,
    });
  } catch (error: any) {
    console.error('推荐失败:', error);
    res.status(500).json({ error: error.message || '推荐失败' });
  }
});

// ============================================
// 启动服务器
// ============================================
async function startServer() {
  // 确保输出目录存在
  await fs.mkdir(path.join(OUTPUT_DIR, 'tts'), { recursive: true });
  await fs.mkdir(path.join(OUTPUT_DIR, 'renders'), { recursive: true });
  await fs.mkdir(path.join(OUTPUT_DIR, 'downloads'), { recursive: true });

  app.listen(PORT, () => {
    console.log(`🎬 AI视频剪辑器后端服务已启动`);
    console.log(`📍 地址: http://localhost:${PORT}`);
    console.log(`⚡ API端点:`);
    console.log(`   - GET  /api/health    - 健康检查`);
    console.log(`   - GET  /api/search    - 视频素材搜索`);
    console.log(`   - POST /api/tts/generate - TTS配音生成`);
    console.log(`   - POST /api/render    - 视频渲染导出`);
  });
}

startServer().catch(console.error);
