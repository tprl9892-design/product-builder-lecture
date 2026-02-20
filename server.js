const express = require('express');
const path = require('path');

(async () => {
    const { default: fetch } = await import('node-fetch');

    const API_BASE = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';
    const START_DATE = new Date('2002-12-07T20:35:00+09:00');
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const CACHE_TTL_MS = 60 * 60 * 1000;

    const cache = new Map();

    function cacheGet(key) {
        const entry = cache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
            cache.delete(key);
            return null;
        }
        return entry.value;
    }

    function cacheSet(key, value) {
        cache.set(key, { value, timestamp: Date.now() });
    }

    async function fetchDraw(drawNo) {
        const response = await fetch(`${API_BASE}${drawNo}`, { cache: 'no-store' });
        if (!response.ok) throw new Error('네트워크 오류');
        const data = await response.json();
        if (data.returnValue !== 'success') {
            throw new Error('해당 회차를 찾을 수 없습니다.');
        }
        return data;
    }

    async function fetchDrawSafe(drawNo) {
        try {
            const response = await fetch(`${API_BASE}${drawNo}`, { cache: 'no-store' });
            const data = await response.json();
            return data.returnValue === 'success' ? data : null;
        } catch (error) {
            return null;
        }
    }

    async function findLatestDrawNo() {
        const cached = cacheGet('latest-draw-no');
        if (cached) return cached;

        const estimate = Math.floor((Date.now() - START_DATE.getTime()) / WEEK_MS) + 1;
        let low = Math.max(1, estimate - 8);
        let high = estimate + 8;

        for (let i = 0; i < 12; i += 1) {
            const result = await fetchDrawSafe(low);
            if (result) break;
            low = Math.max(1, low - 1);
        }

        for (let i = 0; i < 12; i += 1) {
            const result = await fetchDrawSafe(high);
            if (!result) break;
            high += 2;
        }

        let left = low;
        let right = high;
        for (let i = 0; i < 24; i += 1) {
            if (left + 1 >= right) break;
            const mid = Math.floor((left + right) / 2);
            const result = await fetchDrawSafe(mid);
            if (result) left = mid;
            else right = mid;
        }

        cacheSet('latest-draw-no', left);
        return left;
    }

    const app = express();

    app.get('/api/lotto', async (req, res) => {
        const { drawNo } = req.query;
        if (!drawNo) {
            res.status(400).json({ error: 'drawNo가 필요합니다.' });
            return;
        }

        try {
            let target = drawNo;
            if (drawNo === 'latest') {
                target = await findLatestDrawNo();
            } else if (!/^\d+$/.test(String(drawNo))) {
                res.status(400).json({ error: '회차 번호가 올바르지 않습니다.' });
                return;
            }

            const data = await fetchDraw(target);
            res.set('Cache-Control', 'public, max-age=300');
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message || '조회 실패' });
        }
    });

    app.use(express.static(path.join(__dirname, '')));

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server listening on http://localhost:${port}`);
    });
})();
