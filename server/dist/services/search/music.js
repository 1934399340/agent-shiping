// 音乐风格分类
const MUSIC_GENRES = [
    'ambient', 'cinematic', 'corporate', 'electronic',
    'folk', 'hip-hop', 'jazz', 'pop', 'rock', 'world'
];
// 本地Demo音乐库（免费素材预览）
const DEMO_MUSIC = [
    {
        id: 'music-demo-1',
        title: 'Epic Cinematic Intro',
        description: '史诗电影开场，适合大片预告',
        duration: 120,
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_8cb749ff93.mp3',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        source: 'pixabay',
        tags: ['cinematic', 'epic', 'intro'],
        bpm: 120,
        genre: 'cinematic',
    },
    {
        id: 'music-demo-2',
        title: 'Chill Lofi Beats',
        description: '轻松的低保真节拍，适合Vlog',
        duration: 180,
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0c6ff1bab.mp3',
        thumbnail: '',
        source: 'pixabay',
        tags: ['lofi', 'chill', 'beats', 'vlog'],
        bpm: 85,
        genre: 'electronic',
    },
    {
        id: 'music-demo-3',
        title: 'Upbeat Corporate',
        description: '积极向上的商业背景音乐',
        duration: 150,
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_7ed0b5f3be.mp3',
        thumbnail: '',
        source: 'pixabay',
        tags: ['corporate', 'upbeat', 'business', 'positive'],
        bpm: 110,
        genre: 'corporate',
    },
    {
        id: 'music-demo-4',
        title: 'Soft Piano Ambient',
        description: '柔和的钢琴环境音乐，适合情感片段',
        duration: 200,
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/02/23/audio_0aab78b03a.mp3',
        thumbnail: '',
        source: 'pixabay',
        tags: ['piano', 'ambient', 'soft', 'emotional'],
        bpm: 60,
        genre: 'ambient',
    },
    {
        id: 'music-demo-5',
        title: 'Energetic Electronic',
        description: '充满活力的电子音乐，适合运动/快节奏内容',
        duration: 160,
        audioUrl: 'https://cdn.pixabay.com/download/audio/2021/11/25/audio_91b32e02b9.mp3',
        thumbnail: '',
        source: 'pixabay',
        tags: ['electronic', 'energetic', 'sports', 'upbeat'],
        bpm: 128,
        genre: 'electronic',
    },
    {
        id: 'music-demo-6',
        title: 'Acoustic Folk',
        description: '原声民谣吉他，温暖自然的感觉',
        duration: 140,
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/20/audio_d0df3e47e9.mp3',
        thumbnail: '',
        source: 'pixabay',
        tags: ['acoustic', 'folk', 'guitar', 'warm'],
        bpm: 95,
        genre: 'folk',
    },
    {
        id: 'music-demo-7',
        title: 'Dramatic Orchestral',
        description: '戏剧性管弦乐，适合重要场景',
        duration: 180,
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_4edc49b18a.mp3',
        thumbnail: '',
        source: 'pixabay',
        tags: ['orchestral', 'dramatic', 'epic', 'cinematic'],
        bpm: 90,
        genre: 'cinematic',
    },
    {
        id: 'music-demo-8',
        title: 'Happy Ukulele',
        description: '快乐的尤克里里，轻松愉快',
        duration: 100,
        audioUrl: 'https://cdn.pixabay.com/download/audio/2021/09/04/audio_1638df3c9c.mp3',
        thumbnail: '',
        source: 'pixabay',
        tags: ['ukulele', 'happy', 'light', 'fun'],
        bpm: 105,
        genre: 'folk',
    },
    {
        id: 'music-demo-9',
        title: 'Deep House Groove',
        description: '深度浩室节奏，适合时尚/生活方式内容',
        duration: 200,
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_bc5a4f5bea.mp3',
        thumbnail: '',
        source: 'pixabay',
        tags: ['house', 'groove', 'fashion', 'lifestyle'],
        bpm: 122,
        genre: 'electronic',
    },
    {
        id: 'music-demo-10',
        title: 'Peaceful Meditation',
        description: '宁静的冥想音乐，适合瑜伽/放松内容',
        duration: 300,
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/02/10/audio_5a9d91dc22.mp3',
        thumbnail: '',
        source: 'pixabay',
        tags: ['meditation', 'peaceful', 'relax', 'yoga'],
        bpm: 50,
        genre: 'ambient',
    },
    {
        id: 'music-demo-11',
        title: 'Jazz Lounge',
        description: '爵士休息室风格，优雅休闲',
        duration: 170,
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/25/audio_ce3f4e0e51.mp3',
        thumbnail: '',
        source: 'pixabay',
        tags: ['jazz', 'lounge', 'elegant', 'chill'],
        bpm: 100,
        genre: 'jazz',
    },
    {
        id: 'music-demo-12',
        title: 'Rock Energy',
        description: '摇滚能量，适合极限运动/挑战',
        duration: 150,
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_8af29bfc14.mp3',
        thumbnail: '',
        source: 'pixabay',
        tags: ['rock', 'energy', 'sports', 'extreme'],
        bpm: 140,
        genre: 'rock',
    },
];
// 搜索音乐
async function searchMusic(params) {
    const query = params.query.toLowerCase();
    const genre = params.genre;
    // 过滤匹配的音乐
    let filtered = DEMO_MUSIC.filter((music) => {
        // 关键词匹配
        const matchesQuery = music.title.toLowerCase().includes(query) ||
            music.description.toLowerCase().includes(query) ||
            music.tags.some((tag) => tag.toLowerCase().includes(query));
        // 风格匹配
        const matchesGenre = !genre || music.genre === genre;
        return matchesQuery && matchesGenre;
    });
    // 如果没有结果，返回所有音乐
    if (filtered.length === 0 && query) {
        filtered = DEMO_MUSIC;
    }
    // 分页
    const page = params.page || 1;
    const perPage = params.perPage || 20;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const items = filtered.slice(start, end);
    return {
        items,
        total: filtered.length,
        page,
        perPage,
        hasMore: end < filtered.length,
    };
}
// 获取音乐风格列表
function getMusicGenres() {
    return MUSIC_GENRES;
}
// 获取推荐音乐
function getRecommendedMusic(count = 5) {
    const shuffled = [...DEMO_MUSIC].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}
export { searchMusic, getMusicGenres, getRecommendedMusic, MUSIC_GENRES };
