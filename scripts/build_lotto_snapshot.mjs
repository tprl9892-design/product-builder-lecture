const API_BASE = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchDraw(n){
  const res = await fetch(`${API_BASE}${n}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data;
}

async function main(){
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

  const payload = {
    updatedAt: new Date().toISOString(),
    draws,
  };
  const fs = await import("node:fs");
  fs.writeFileSync("data/lotto_draws.json", JSON.stringify(payload, null, 2));
  console.log(`Saved ${draws.length} draws`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
