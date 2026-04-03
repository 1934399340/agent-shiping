// ============================================
// 视频搜索路由
// ============================================
import { Router } from 'express';
import searchAll from '../services/search/index.js';
const router = Router();
// GET /api/search?q=xxx&source=all&page=1&perPage=20
router.get('/search', async (req, res) => {
    try {
        const query = req.query.query;
        if (!query?.trim()) {
            return res.status(400).json({ error: '搜索关键词不能为空' });
        }
        const params = {
            query: query.trim(),
            source: req.query.source || 'all',
            page: parseInt(req.query.page) || 1,
            perPage: Math.min(parseInt(req.query.perPage) || 20, 50),
            orientation: req.query.orientation,
            minDuration: req.query.minDuration ? parseInt(req.query.minDuration) : undefined,
            maxDuration: req.query.maxDuration ? parseInt(req.query.maxDuration) : undefined,
        };
        const result = await searchAll(params);
        res.json(result);
    }
    catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: `搜索失败: ${err.message}` });
    }
});
export default router;
