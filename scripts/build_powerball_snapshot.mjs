const API_BASE = "https://data.ny.gov/resource/d6yy-54nr.json";
const FORMAT_START = "2015-10-07";

function parseDate(value){
  if (!value) return null;
  return String(value).slice(0, 10);
}

function parseWinningNumbers(str){
  if (!str) return null;
  const parts = String(str).trim().split(/\s+/).map((v) => Number(v));
  if (parts.length !== 6 || parts.some((n) => !Number.isFinite(n))) return null;
  return parts;
}

async function fetchAll(){
  const limit = 50000;
  let offset = 0;
  const rows = [];
  while (true){
    const url = `${API_BASE}?$limit=${limit}&$offset=${offset}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    rows.push(...data);
    if (data.length < limit) break;
    offset += limit;
  }
  return rows;
}

async function main(){
  const rows = await fetchAll();
  const draws = rows
    .map((row) => {
      const date = parseDate(row.draw_date);
      const nums = parseWinningNumbers(row.winning_numbers);
      if (!date || !nums) return null;
      if (date < FORMAT_START) return null;
      const white = nums.slice(0, 5).sort((a,b)=>a-b);
      const power = nums[5];
      return { date, white, power };
    })
    .filter(Boolean)
    .sort((a,b)=>a.date.localeCompare(b.date));

  const payload = {
    updatedAt: new Date().toISOString(),
    format: "powerball-5+1",
    formatStart: FORMAT_START,
    source: "data.ny.gov/d/d6yy-54nr",
    draws,
  };

  const fs = await import("node:fs");
  fs.writeFileSync("data/powerball_draws.json", JSON.stringify(payload, null, 2));
  console.log(`Saved ${draws.length} draws`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
