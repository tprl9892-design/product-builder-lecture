document.getElementById('generate-btn').addEventListener('click', () => {
    const lottoNumbersContainer = document.getElementById('lotto-numbers');
    lottoNumbersContainer.innerHTML = '';

    const numbers = new Set();
    while (numbers.size < 7) {
        numbers.add(Math.floor(Math.random() * 45) + 1);
    }

    const sortedNumbers = Array.from(numbers).sort((a, b) => a - b);
    const bonusNumber = sortedNumbers.pop();
    const mainNumbers = sortedNumbers;

    mainNumbers.forEach((number, index) => {
        setTimeout(() => {
            createBall(number, lottoNumbersContainer);
        }, index * 300);
    });
    
    setTimeout(() => {
        const plus = document.createElement('div');
        plus.textContent = '+';
        plus.style.fontSize = '30px';
        plus.style.lineHeight = '50px';
        lottoNumbersContainer.appendChild(plus);
        createBall(bonusNumber, lottoNumbersContainer);
    }, mainNumbers.length * 300);
});

function createBall(number, container) {
    const ball = document.createElement('div');
    ball.classList.add('lotto-ball');
    ball.textContent = number;
    ball.style.backgroundColor = getBallColor(number);
    container.appendChild(ball);
}

function getBallColor(number) {
    if (number <= 10) return '#fbc400'; // Yellow
    if (number <= 20) return '#69c8f2'; // Blue
    if (number <= 30) return '#ff7272'; // Red
    if (number <= 40) return '#aaa';    // Gray
    return '#b0d840'; // Green
}