const API_BASE = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=";
const FALLBACK_ALL_URL = "https://smok95.github.io/lotto/results/all.json";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url){
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchDraw(n){
  return fetchJson(`${API_BASE}${n}`);
}

async function fetchOfficialDraws(){
  const draws = [];
  let n = 1;
  let failures = 0;
  while (true){
    const data = await fetchDraw(n);
    if (data.returnValue !== "success"){
      failures += 1;
      if (failures >= 2) break;
      n += 1;
      continue;
    }
    failures = 0;
    const nums = [data.drwtNo1, data.drwtNo2, data.drwtNo3, data.drwtNo4, data.drwtNo5, data.drwtNo6]
      .map(Number)
      .filter(Number.isFinite)
      .sort((a,b)=>a-b);
    draws.push({
      round: Number(data.drwNo),
      date: data.drwNoDate,
      nums,
      bonus: Number(data.bnusNo),
    });
    n += 1;
    if (n % 50 === 0) await sleep(250);
  }
  return {
    source: "dhlottery.co.kr/common.do?method=getLottoNumber",
    draws,
  };
}

async function fetchFallbackDraws(){
  const rows = await fetchJson(FALLBACK_ALL_URL);
  if (!Array.isArray(rows)) throw new Error("Fallback source returned invalid data");
  const draws = rows
    .map((row) => {
      const round = Number(row.draw_no);
      const nums = Array.isArray(row.numbers)
        ? row.numbers.map(Number).filter(Number.isFinite).sort((a, b) => a - b)
        : [];
      const bonus = Number(row.bonus_no);
      const date = row.date ? String(row.date).slice(0, 10) : null;
      if (!round || nums.length !== 6 || !Number.isFinite(bonus) || !date) return null;
      return { round, date, nums, bonus };
    })
    .filter(Boolean)
    .sort((a, b) => a.round - b.round);
  return {
    source: "smok95.github.io/lotto/results/all.json",
    draws,
  };
}

async function loadDraws(){
  try {
    return await fetchOfficialDraws();
  } catch (error) {
    console.warn(`Official lotto source failed: ${error.message || error}`);
    return fetchFallbackDraws();
  }
}

async function main(){
  const { source, draws } = await loadDraws();
  const payload = {
    updatedAt: new Date().toISOString(),
    source,
    draws,
  };
  const fs = await import("node:fs");
  fs.writeFileSync("data/lotto_draws.json", JSON.stringify(payload, null, 2));
  console.log(`Saved ${draws.length} draws from ${source}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
