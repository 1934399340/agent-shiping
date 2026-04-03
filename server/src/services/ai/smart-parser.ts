// ============================================
// AI智能脚本解析 - 支持多种输入格式
// ============================================

export interface SmartParseResult {
  title: string;
  segments: Array<{
    text: string;
    keywords: string[];
    duration: number;
    mood: 'energetic' | 'calm' | 'dramatic' | 'happy' | 'sad' | 'neutral';
  }>;
  style: 'cinematic' | 'fast-paced' | 'documentary' | 'commercial' | 'social';
  musicHint?: {
    genre: string;
    bpm: number;
  };
}

/**
 * 智能解析各种格式的脚本输入
 * 支持格式：
 * 1. 纯文本（自动分句）
 * 2. 带时间戳的脚本
 * 3. 关键词列表
 * 4. 混合格式
 */
export function smartParse(input: string): SmartParseResult {
  // 预处理：标准化换行和空白
  const normalized = input
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 检测输入类型并解析
  if (isTimestampedScript(normalized)) {
    return parseTimestampedScript(normalized);
  } else if (isKeywordList(normalized)) {
    return parseKeywordList(normalized);
  } else if (isStructuredScript(normalized)) {
    return parseStructuredScript(normalized);
  } else {
    return parsePlainText(normalized);
  }
}

// 检测是否带时间戳 [00:00] 或 (00:00) 格式
function isTimestampedScript(text: string): boolean {
  return /[\[\(]\d{1,2}:\d{2}[\]\)]/.test(text);
}

// 检测是否为关键词列表（每行只有关键词）
function isKeywordList(text: string): boolean {
  const lines = text.split('\n').filter(l => l.trim());
  const shortLines = lines.filter(l => l.trim().length < 20);
  return shortLines.length / lines.length > 0.7;
}

// 检测是否为结构化脚本（带分隔符）
function isStructuredScript(text: string): boolean {
  return text.includes('|') || text.includes('：') || text.includes('::');
}

// 解析带时间戳的脚本
function parseTimestampedScript(text: string): SmartParseResult {
  const lines = text.split('\n').filter(l => l.trim());
  const segments: SmartParseResult['segments'] = [];
  let lastTime = 0;
  
  for (const line of lines) {
    // 提取时间戳 [00:00] 或 (00:00)
    const timeMatch = line.match(/[\[\(](\d{1,2}):(\d{2})[\]\)]/);
    if (!timeMatch) continue;
    
    const minutes = parseInt(timeMatch[1]);
    const seconds = parseInt(timeMatch[2]);
    const currentTime = minutes * 60 + seconds;
    
    // 提取文本内容
    const content = line.replace(/[\[\(]\d{1,2}:\d{2}[\]\)]/, '').trim();
    
    if (content) {
      const duration = currentTime - lastTime || 5;
      segments.push({
        text: content,
        keywords: extractKeywords(content),
        duration: Math.max(2, Math.min(duration, 15)),
        mood: detectMood(content),
      });
      lastTime = currentTime;
    }
  }
  
  return {
    title: '时间轴脚本',
    segments,
    style: detectStyle(text),
    musicHint: suggestMusic(segments),
  };
}

// 解析关键词列表
function parseKeywordList(text: string): SmartParseResult {
  const keywords = text
    .split(/[\n,，、\s]+/)
    .map(k => k.trim())
    .filter(k => k.length >= 2 && k.length <= 10);
  
  const segments: SmartParseResult['segments'] = keywords.map(keyword => ({
    text: keyword,
    keywords: [keyword],
    duration: 3, // 每个关键词3秒
    mood: 'neutral' as const,
  }));
  
  return {
    title: '关键词视频',
    segments,
    style: 'fast-paced',
    musicHint: {
      genre: 'electronic',
      bpm: 128,
    },
  };
}

// 解析结构化脚本（带 | 分隔符）
function parseStructuredScript(text: string): SmartParseResult {
  const lines = text.split('\n').filter(l => l.trim());
  const segments: SmartParseResult['segments'] = [];
  
  for (const line of lines) {
    const parts = line.split(/[|｜]/).map(p => p.trim());
    
    if (parts.length >= 1 && parts[0]) {
      segments.push({
        text: parts[0],
        keywords: parts[1] ? parts[1].split(/[,，\s]+/) : extractKeywords(parts[0]),
        duration: parts[2] ? parseFloat(parts[2]) : estimateDuration(parts[0]),
        mood: (parts[3] as any) || detectMood(parts[0]),
      });
    }
  }
  
  return {
    title: '结构化脚本',
    segments,
    style: detectStyle(text),
    musicHint: suggestMusic(segments),
  };
}

// 解析纯文本
function parsePlainText(text: string): SmartParseResult {
  // 按句子分割
  const sentences = text
    .split(/[。！？.!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length >= 2);
  
  // 按段落分组（每3-5句一组）
  const segments: SmartParseResult['segments'] = [];
  const groupSize = 4;
  
  for (let i = 0; i < sentences.length; i += groupSize) {
    const group = sentences.slice(i, i + groupSize);
    const combinedText = group.join('');
    
    segments.push({
      text: combinedText,
      keywords: extractKeywords(combinedText),
      duration: estimateDuration(combinedText),
      mood: detectMood(combinedText),
    });
  }
  
  // 如果只有一句话，尝试按短语分割
  if (segments.length === 0 && text.length > 0) {
    const phrases = text.split(/[,，;；]/).filter(p => p.trim());
    for (const phrase of phrases) {
      segments.push({
        text: phrase.trim(),
        keywords: extractKeywords(phrase),
        duration: estimateDuration(phrase),
        mood: detectMood(phrase),
      });
    }
  }
  
  return {
    title: '自由文本',
    segments,
    style: detectStyle(text),
    musicHint: suggestMusic(segments),
  };
}

// 提取关键词（智能版）
function extractKeywords(text: string): string[] {
  // 停用词表
  const stopWords = new Set([
    '的', '了', '是', '在', '和', '与', '或', '这', '那', '有', '一个',
    '我们', '你们', '他们', '自己', '什么', '怎么', '如何', '为什么',
    '可以', '能', '会', '要', '想', '让', '把', '被', '给', '向', '从',
    '到', '对', '为', '以', '于', '但', '却', '而', '且', '如果', '虽然',
    '因为', '所以', '然后', '接着', '最后', '首先', '其次', '再次',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
  ]);
  
  // 提取中文词组（2-4字）和英文单词
  const chineseWords = text.match(/[\u4e00-\u9fa5]{2,4}/g) || [];
  const englishWords = text.match(/[a-zA-Z]{3,}/gi) || [];
  
  const allWords = [...chineseWords, ...englishWords.map(w => w.toLowerCase())];
  
  // 过滤停用词并去重
  const keywords = [...new Set(allWords.filter(w => !stopWords.has(w.toLowerCase())))];
  
  // 优先选择出现频率高或有意义的词
  return keywords.slice(0, 5);
}

// 估算时长
function estimateDuration(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  
  // 中文约3字/秒，英文约2.5词/秒
  const baseDuration = chineseChars / 3 + englishWords / 2.5;
  
  // 至少2秒，最多15秒
  return Math.max(2, Math.min(15, Math.ceil(baseDuration + 0.5)));
}

// 检测情绪
function detectMood(text: string): SmartParseResult['segments'][0]['mood'] {
  const moodKeywords: Record<string, { words: string[]; mood: SmartParseResult['segments'][0]['mood'] }> = {
    energetic: {
      words: ['激情', '活力', '动感', '快', '激烈', '热情', 'energetic', 'fast', 'dynamic', 'powerful', '激情澎湃', '震撼'],
      mood: 'energetic',
    },
    calm: {
      words: ['平静', '宁静', '悠闲', '慢', '轻松', '舒适', 'calm', 'peaceful', 'relax', 'slow', '舒缓', '治愈'],
      mood: 'calm',
    },
    dramatic: {
      words: ['戏剧', '紧张', '悬疑', '高潮', '紧张', '冲突', 'dramatic', 'tense', 'suspense', 'intense', '震撼', '史诗'],
      mood: 'dramatic',
    },
    happy: {
      words: ['开心', '快乐', '欢乐', '幸福', '愉快', '喜悦', 'happy', 'joy', 'fun', 'cheerful', '欢快', '温馨'],
      mood: 'happy',
    },
    sad: {
      words: ['悲伤', '难过', '忧郁', '失落', '思念', '伤感', 'sad', 'melancholy', 'sorrow', 'lonely', '忧伤'],
      mood: 'sad',
    },
  };
  
  const lowerText = text.toLowerCase();
  
  for (const { words, mood } of Object.values(moodKeywords)) {
    if (words.some(w => lowerText.includes(w.toLowerCase()))) {
      return mood;
    }
  }
  
  return 'neutral';
}

// 检测风格
function detectStyle(text: string): SmartParseResult['style'] {
  const styleKeywords: Record<SmartParseResult['style'], string[]> = {
    cinematic: ['电影', '大片', '电影感', '史诗', 'cinematic', 'movie', 'film', '大片感', '高级'],
    'fast-paced': ['快节奏', '踩点', '卡点', '踩点视频', '抖音', 'tiktok', '短', 'fast', 'quick', '动感'],
    documentary: ['纪录片', '记录', '真实', 'documentary', '写实', '叙述'],
    commercial: ['广告', '商业', '宣传', '推广', 'commercial', 'ads', '营销', '品牌'],
    social: ['短视频', '抖音', 'tiktok', '社交媒体', 'social', '爆款', '热门'],
  };
  
  const lowerText = text.toLowerCase();
  
  for (const [style, keywords] of Object.entries(styleKeywords)) {
    if (keywords.some(k => lowerText.includes(k.toLowerCase()))) {
      return style as SmartParseResult['style'];
    }
  }
  
  // 默认根据文本长度判断
  const wordCount = text.length;
  if (wordCount < 100) return 'fast-paced';
  if (wordCount < 300) return 'social';
  return 'documentary';
}

// 推荐音乐
function suggestMusic(segments: SmartParseResult['segments']): { genre: string; bpm: number } {
  // 统计情绪分布
  const moodCounts: Record<string, number> = {};
  for (const seg of segments) {
    moodCounts[seg.mood] = (moodCounts[seg.mood] || 0) + 1;
  }
  
  // 找主导情绪
  let dominantMood = 'neutral';
  let maxCount = 0;
  for (const [mood, count] of Object.entries(moodCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantMood = mood;
    }
  }
  
  // 根据情绪推荐音乐
  const moodMusicMap: Record<string, { genre: string; bpm: number }> = {
    energetic: { genre: 'electronic', bpm: 128 },
    calm: { genre: 'ambient', bpm: 80 },
    dramatic: { genre: 'cinematic', bpm: 90 },
    happy: { genre: 'pop', bpm: 120 },
    sad: { genre: 'folk', bpm: 70 },
    neutral: { genre: 'ambient', bpm: 100 },
  };
  
  return moodMusicMap[dominantMood] || moodMusicMap.neutral;
}

export default smartParse;
