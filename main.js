const API_BASE = 'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';
const START_DATE = new Date('2002-12-07T20:35:00+09:00');
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const state = {
    latestDrawNo: null,
    latestDraw: null,
    stats: null,
};

const els = {
    latestCard: document.getElementById('latest-card'),
    latestDate: document.getElementById('latest-date'),
    latestDraw: document.getElementById('latest-draw'),
    latestNumbers: document.getElementById('latest-numbers'),
    latestPrize: document.getElementById('latest-prize'),
    latestWinners: document.getElementById('latest-winners'),
    latestSales: document.getElementById('latest-sales'),
    refreshLatest: document.getElementById('refresh-latest'),
    drawInput: document.getElementById('draw-input'),
    drawSearch: document.getElementById('draw-search'),
    drawDate: document.getElementById('draw-date'),
    drawNumber: document.getElementById('draw-number'),
    drawNumbers: document.getElementById('draw-numbers'),
    drawMeta: document.getElementById('draw-meta'),
    rangeSelect: document.getElementById('range-select'),
    refreshStats: document.getElementById('refresh-stats'),
    frequencyGrid: document.getElementById('frequency-grid'),
    hotList: document.getElementById('hot-list'),
    coldList: document.getElementById('cold-list'),
    summaryMetrics: document.getElementById('summary-metrics'),
    recommendations: document.getElementById('recommendations'),
    generateReco: document.getElementById('generate-reco'),
    generateReco2: document.getElementById('generate-reco-2'),
};

const numberFormatter = new Intl.NumberFormat('ko-KR');

function formatCurrency(value) {
    if (typeof value !== 'number') return '-';
    return `${numberFormatter.format(value)}원`;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return dateString.replace(/-/g, '.');
}

function setLoading(element, isLoading) {
    if (!element) return;
    element.classList.toggle('loading', isLoading);
}

function createBall(number) {
    const ball = document.createElement('div');
    ball.className = 'lotto-ball';
    ball.textContent = number;
    ball.style.backgroundColor = getBallColor(number);
    return ball;
}

function getBallColor(number) {
    if (number <= 10) return '#ffd166';
    if (number <= 20) return '#4db8ff';
    if (number <= 30) return '#ff6f59';
    if (number <= 40) return '#b0bec5';
    return '#5ad1a6';
}

function renderNumbers(container, numbers, bonus) {
    container.innerHTML = '';
    numbers.forEach((number) => {
        container.appendChild(createBall(number));
    });
    if (bonus !== undefined) {
        const plus = document.createElement('div');
        plus.className = 'plus';
        plus.textContent = '+';
        container.appendChild(plus);
        container.appendChild(createBall(bonus));
    }
}

function drawToNumbers(draw) {
    return [draw.drwtNo1, draw.drwtNo2, draw.drwtNo3, draw.drwtNo4, draw.drwtNo5, draw.drwtNo6]
        .map((num) => Number(num))
        .sort((a, b) => a - b);
}

function renderLatest(draw) {
    if (!draw) return;
    els.latestDate.textContent = `${formatDate(draw.drwNoDate)} 추첨`;
    els.latestDraw.textContent = `${draw.drwNo}회`;
    renderNumbers(els.latestNumbers, drawToNumbers(draw), draw.bnusNo);
    els.latestPrize.textContent = formatCurrency(Number(draw.firstWinamnt));
    els.latestWinners.textContent = `${draw.firstPrzwnerCo || '-'}명`;
    els.latestSales.textContent = formatCurrency(Number(draw.totSellamnt));
}

function renderDrawDetail(draw) {
    if (!draw) return;
    els.drawDate.textContent = `${formatDate(draw.drwNoDate)} 추첨`;
    els.drawNumber.textContent = `${draw.drwNo}회`;
    renderNumbers(els.drawNumbers, drawToNumbers(draw), draw.bnusNo);

    els.drawMeta.innerHTML = '';
    const metaItems = [
        { label: '1등 당첨금', value: formatCurrency(Number(draw.firstWinamnt)) },
        { label: '1등 인원', value: `${draw.firstPrzwnerCo || '-'}명` },
        { label: '총 판매액', value: formatCurrency(Number(draw.totSellamnt)) },
    ];

    metaItems.forEach((item) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'metric';
        const label = document.createElement('span');
        label.className = 'meta-label';
        label.textContent = item.label;
        const value = document.createElement('strong');
        value.textContent = item.value;
        wrapper.appendChild(label);
        wrapper.appendChild(value);
        els.drawMeta.appendChild(wrapper);
    });
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
        const data = await fetch(`${API_BASE}${drawNo}`, { cache: 'no-store' });
        const json = await data.json();
        return json.returnValue === 'success' ? json : null;
    } catch (error) {
        return null;
    }
}

async function findLatestDrawNo() {
    const cached = localStorage.getItem('lotto_latest_draw');
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            if (parsed && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
                return parsed.drawNo;
            }
        } catch (error) {
            localStorage.removeItem('lotto_latest_draw');
        }
    }

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
        if (result) {
            left = mid;
        } else {
            right = mid;
        }
    }

    localStorage.setItem('lotto_latest_draw', JSON.stringify({ drawNo: left, timestamp: Date.now() }));
    return left;
}

async function loadLatest() {
    setLoading(els.latestCard, true);
    try {
        const latestNo = await findLatestDrawNo();
        const draw = await fetchDraw(latestNo);
        state.latestDrawNo = latestNo;
        state.latestDraw = draw;
        renderLatest(draw);
        await loadStats();
        renderRecommendations();
    } catch (error) {
        els.latestDate.textContent = '데이터를 불러오지 못했습니다.';
        els.latestDraw.textContent = '-회';
        els.latestNumbers.innerHTML = '';
    } finally {
        setLoading(els.latestCard, false);
    }
}

async function loadDrawDetail() {
    const inputValue = Number(els.drawInput.value);
    if (!inputValue || inputValue < 1) {
        els.drawDate.textContent = '회차 번호를 입력해 주세요.';
        return;
    }
    setLoading(els.drawNumbers, true);
    try {
        const draw = await fetchDraw(inputValue);
        renderDrawDetail(draw);
    } catch (error) {
        els.drawDate.textContent = error.message || '조회에 실패했습니다.';
        els.drawNumbers.innerHTML = '';
        els.drawMeta.innerHTML = '';
        els.drawNumber.textContent = '-회';
    } finally {
        setLoading(els.drawNumbers, false);
    }
}

async function fetchRange(latestNo, range) {
    const draws = [];
    const batchSize = 12;
    for (let start = latestNo; start >= Math.max(1, latestNo - range + 1); start -= batchSize) {
        const batch = [];
        for (let offset = 0; offset < batchSize; offset += 1) {
            const drawNo = start - offset;
            if (drawNo < 1 || drawNo < latestNo - range + 1) break;
            batch.push(fetchDrawSafe(drawNo));
        }
        const results = await Promise.all(batch);
        results.forEach((item) => {
            if (item) draws.push(item);
        });
    }
    return draws;
}

function computeStats(draws) {
    const frequency = Array.from({ length: 46 }, () => 0);
    let oddCount = 0;
    let evenCount = 0;
    let highCount = 0;
    let lowCount = 0;
    let sumTotal = 0;

    draws.forEach((draw) => {
        const numbers = drawToNumbers(draw);
        numbers.forEach((num) => {
            frequency[num] += 1;
            if (num % 2 === 0) evenCount += 1;
            else oddCount += 1;
            if (num <= 22) lowCount += 1;
            else highCount += 1;
        });
        sumTotal += numbers.reduce((acc, cur) => acc + cur, 0);
    });

    const totalNumbers = draws.length * 6;
    const avgSum = draws.length ? Math.round(sumTotal / draws.length) : 0;

    return {
        frequency,
        totalNumbers,
        oddRate: totalNumbers ? Math.round((oddCount / totalNumbers) * 100) : 0,
        evenRate: totalNumbers ? Math.round((evenCount / totalNumbers) * 100) : 0,
        highRate: totalNumbers ? Math.round((highCount / totalNumbers) * 100) : 0,
        lowRate: totalNumbers ? Math.round((lowCount / totalNumbers) * 100) : 0,
        avgSum,
    };
}

function renderFrequency(stats) {
    els.frequencyGrid.innerHTML = '';
    const max = Math.max(...stats.frequency.slice(1));
    for (let i = 1; i <= 45; i += 1) {
        const wrapper = document.createElement('div');
        wrapper.className = 'freq-item';
        const bar = document.createElement('div');
        bar.className = 'freq-bar';
        const height = max ? Math.round((stats.frequency[i] / max) * 100) : 0;
        bar.style.height = `${Math.max(height, 6)}%`;
        const label = document.createElement('span');
        label.className = 'freq-label';
        label.textContent = i;
        wrapper.appendChild(bar);
        wrapper.appendChild(label);
        els.frequencyGrid.appendChild(wrapper);
    }
}

function renderHotCold(stats) {
    const entries = stats.frequency.slice(1).map((count, index) => ({ number: index + 1, count }));
    const sorted = [...entries].sort((a, b) => b.count - a.count);
    const hot = sorted.slice(0, 6);
    const cold = sorted.slice(-6).reverse();

    els.hotList.innerHTML = '';
    els.coldList.innerHTML = '';

    hot.forEach((item) => {
        const pill = document.createElement('span');
        pill.className = 'pill';
        pill.textContent = `${item.number} (${item.count})`;
        els.hotList.appendChild(pill);
    });

    cold.forEach((item) => {
        const pill = document.createElement('span');
        pill.className = 'pill cold';
        pill.textContent = `${item.number} (${item.count})`;
        els.coldList.appendChild(pill);
    });
}

function renderSummary(stats, range) {
    els.summaryMetrics.innerHTML = '';
    const metrics = [
        { label: `최근 ${range}회 홀/짝`, value: `${stats.oddRate}% / ${stats.evenRate}%` },
        { label: `저/고 번호 비율`, value: `${stats.lowRate}% / ${stats.highRate}%` },
        { label: `평균 번호 합`, value: stats.avgSum },
        { label: `총 분석 표본`, value: `${range}회 (${range * 6}개 번호)` },
    ];

    metrics.forEach((item) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'metric';
        const label = document.createElement('span');
        label.className = 'meta-label';
        label.textContent = item.label;
        const value = document.createElement('strong');
        value.textContent = item.value;
        wrapper.appendChild(label);
        wrapper.appendChild(value);
        els.summaryMetrics.appendChild(wrapper);
    });
}

async function loadStats() {
    if (!state.latestDrawNo) return;
    const range = Number(els.rangeSelect.value);
    setLoading(els.frequencyGrid, true);
    try {
        const draws = await fetchRange(state.latestDrawNo, range);
        const stats = computeStats(draws);
        state.stats = { ...stats, range };
        renderFrequency(stats);
        renderHotCold(stats);
        renderSummary(stats, range);
        renderRecommendations();
    } catch (error) {
        els.frequencyGrid.innerHTML = '분석을 불러오지 못했습니다.';
    } finally {
        setLoading(els.frequencyGrid, false);
    }
}

function weightedPick(pool, weights) {
    const total = weights.reduce((acc, cur) => acc + cur, 0);
    let target = Math.random() * total;
    for (let i = 0; i < pool.length; i += 1) {
        target -= weights[i];
        if (target <= 0) return pool[i];
    }
    return pool[pool.length - 1];
}

function generateRecommendation(stats) {
    const frequency = stats.frequency.slice(1);
    const entries = frequency.map((count, index) => ({ number: index + 1, count }));
    const sorted = [...entries].sort((a, b) => b.count - a.count);
    const hot = sorted.slice(0, 10).map((item) => item.number);
    const cold = sorted.slice(-10).map((item) => item.number);

    const weights = frequency.map((count) => Math.max(1, count));
    const pool = entries.map((item) => item.number);

    for (let attempt = 0; attempt < 120; attempt += 1) {
        const selection = new Set();
        selection.add(hot[Math.floor(Math.random() * hot.length)]);
        selection.add(cold[Math.floor(Math.random() * cold.length)]);

        while (selection.size < 6) {
            const pick = weightedPick(pool, weights);
            selection.add(pick);
        }

        const numbers = Array.from(selection).sort((a, b) => a - b);
        const odds = numbers.filter((num) => num % 2 === 1).length;
        const evens = 6 - odds;
        if (Math.abs(odds - evens) <= 2) return numbers;
    }

    return Array.from({ length: 6 }, () => Math.floor(Math.random() * 45) + 1).sort((a, b) => a - b);
}

function renderRecommendations() {
    if (!state.stats) return;
    els.recommendations.innerHTML = '';
    for (let i = 0; i < 5; i += 1) {
        const numbers = generateRecommendation(state.stats);
        const card = document.createElement('div');
        card.className = 'reco-card';
        const label = document.createElement('p');
        label.textContent = `추천 조합 ${i + 1}`;
        const numbersWrap = document.createElement('div');
        numbersWrap.className = 'numbers';
        numbers.forEach((num) => numbersWrap.appendChild(createBall(num)));
        card.appendChild(label);
        card.appendChild(numbersWrap);
        els.recommendations.appendChild(card);
    }
}

function bindEvents() {
    els.refreshLatest.addEventListener('click', () => loadLatest());
    els.drawSearch.addEventListener('click', () => loadDrawDetail());
    els.drawInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') loadDrawDetail();
    });
    els.refreshStats.addEventListener('click', () => loadStats());
    els.rangeSelect.addEventListener('change', () => loadStats());
    els.generateReco.addEventListener('click', () => renderRecommendations());
    els.generateReco2.addEventListener('click', () => renderRecommendations());
}

function init() {
    bindEvents();
    loadLatest();
}

init();
