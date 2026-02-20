document.addEventListener('DOMContentLoaded', () => {
    const lottoNumbersDiv = document.getElementById('lotto-numbers');
    const generateBtn = document.getElementById('generate-btn');
    const latestDrawInfoDiv = document.getElementById('latest-draw-info');

    function generateLottoNumbers() {
        const numbers = new Set();
        while (numbers.size < 6) {
            numbers.add(Math.floor(Math.random() * 45) + 1);
        }
        return Array.from(numbers).sort((a, b) => a - b);
    }

    function displayNumbers(numbers) {
        lottoNumbersDiv.innerHTML = '';
        numbers.forEach(number => {
            const span = document.createElement('span');
            span.textContent = number;
            lottoNumbersDiv.appendChild(span);
        });
    }

    generateBtn.addEventListener('click', () => {
        const numbers = generateLottoNumbers();
        displayNumbers(numbers);
    });

    async function fetchLatestDraw() {
        try {
            const response = await fetch('/api/lotto?drawNo=latest');
            const data = await response.json();

            if (response.ok) {
                const { drwNo, drwNoDate, drwtNo1, drwtNo2, drwtNo3, drwtNo4, drwtNo5, drwtNo6, bnusNo } = data;
                const numbers = [drwtNo1, drwtNo2, drwtNo3, drwtNo4, drwtNo5, drwtNo6];
                latestDrawInfoDiv.innerHTML = `
                    <p><strong>추첨일:</strong> ${drwNoDate} (${drwNo}회)</p>
                    <p><strong>당첨 번호:</strong> ${numbers.join(', ')} + 보너스 ${bnusNo}</p>
                `;
            } else {
                latestDrawInfoDiv.innerHTML = `<p>최신 당첨 번호를 가져오는 데 실패했습니다: ${data.error}</p>`;
            }
        } catch (error) {
            latestDrawInfoDiv.innerHTML = `<p>최신 당첨 번호를 가져오는 데 실패했습니다.</p>`;
            console.error('Error fetching latest draw:', error);
        }
    }

    // Initial generation
    displayNumbers(generateLottoNumbers());
    fetchLatestDraw();
});
