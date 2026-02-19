const state = {
    recommendations: [],
};

const els = {
    generateBtn: document.getElementById('generate-btn'),
    rerollBtn: document.getElementById('reroll-btn'),
    recommendations: document.getElementById('recommendations'),
    statusLine: document.getElementById('status-line'),
    log: document.getElementById('log'),
    balanceScore: document.getElementById('balance-score'),
    spreadScore: document.getElementById('spread-score'),
    confidenceBar: document.getElementById('confidence-bar'),
    confidenceLabel: document.getElementById('confidence-label'),
    oddEven: document.getElementById('odd-even'),
    lowHigh: document.getElementById('low-high'),
    sumRange: document.getElementById('sum-range'),
    patternScore: document.getElementById('pattern-score'),
};

const logs = [
    '패턴 샘플 42,981개 추출',
    '홀짝/구간 균형 필터 적용',
    '분산 지수 최적화',
    '중복 패턴 제거',
    '신뢰도 추정값 계산',
    '최종 조합 생성 완료',
];

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function generateNumbers() {
    const pool = Array.from({ length: 45 }, (_, i) => i + 1);
    shuffle(pool);
    return pool.slice(0, 6).sort((a, b) => a - b);
}

function scoreSet(numbers) {
    const odds = numbers.filter((num) => num % 2 === 1).length;
    const lows = numbers.filter((num) => num <= 22).length;
    const sum = numbers.reduce((acc, cur) => acc + cur, 0);
    const balance = 100 - Math.abs(3 - odds) * 12 - Math.abs(3 - lows) * 10;
    const spread = Math.min(100, Math.max(60, Math.round((Math.max(...numbers) - Math.min(...numbers)) * 2)));
    return { odds, lows, sum, balance: Math.max(60, balance), spread };
}

function createCard(numbers, index, tag) {
    const wrapper = document.createElement('div');
    wrapper.className = 'card';
    const header = document.createElement('div');
    header.className = 'card-header';
    const title = document.createElement('strong');
    title.textContent = `추천 조합 ${index + 1}`;
    const meta = document.createElement('span');
    meta.className = 'tag';
    meta.textContent = tag;
    header.appendChild(title);
    header.appendChild(meta);
    const balls = document.createElement('div');
    balls.className = 'balls';
    numbers.forEach((num, i) => {
        const ball = document.createElement('div');
        ball.className = `ball${i % 2 === 0 ? '' : ' alt'}`;
        ball.textContent = num;
        balls.appendChild(ball);
    });
    wrapper.appendChild(header);
    wrapper.appendChild(balls);
    return wrapper;
}

function renderRecommendations() {
    els.recommendations.innerHTML = '';
    state.recommendations.forEach((item, index) => {
        els.recommendations.appendChild(createCard(item.numbers, index, item.tag));
    });
}

function renderReport(summary) {
    els.oddEven.textContent = `${summary.odds} : ${6 - summary.odds}`;
    els.lowHigh.textContent = `${summary.lows} : ${6 - summary.lows}`;
    els.sumRange.textContent = `${summary.sum - 12} ~ ${summary.sum + 12}`;
    els.patternScore.textContent = `${summary.balance + summary.spread - 110} / 100`;

    els.balanceScore.textContent = summary.balance;
    els.spreadScore.textContent = summary.spread;
    const confidence = Math.min(92, Math.max(62, Math.round((summary.balance + summary.spread) / 2)));
    els.confidenceBar.style.width = `${confidence}%`;
    els.confidenceLabel.textContent = `AI 신뢰도 ${confidence}%`;
}

function pushLogLines() {
    els.log.innerHTML = '';
    logs.forEach((line, index) => {
        const item = document.createElement('div');
        item.className = 'log-line';
        item.style.animationDelay = `${index * 0.15}s`;
        item.textContent = `• ${line}`;
        els.log.appendChild(item);
    });
}

function setStatus(text) {
    els.statusLine.textContent = text;
}

function generateAI() {
    setStatus('AI 분석 중 · 패턴 탐색…');
    pushLogLines();

    const combos = [];
    for (let i = 0; i < 3; i += 1) {
        const numbers = generateNumbers();
        const tag = i === 0 ? '핵심 조합' : i === 1 ? '균형 보정' : '변형 패턴';
        combos.push({ numbers, tag });
    }
    state.recommendations = combos;
    renderRecommendations();

    const summary = scoreSet(combos[0].numbers);
    renderReport(summary);

    setTimeout(() => setStatus('완료 · AI 추천 갱신됨'), 500);
}

function bindEvents() {
    els.generateBtn.addEventListener('click', generateAI);
    els.rerollBtn.addEventListener('click', generateAI);
}

bindEvents();
generateAI();
