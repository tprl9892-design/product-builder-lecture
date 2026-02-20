const API_BASE = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=";
const START_DATE = new Date("2002-12-07T20:35:00+09:00");
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 60 * 60 * 1000;

async function fetchDraw(drawNo) {
  const res = await fetch(`${API_BASE}${drawNo}`, { cache: "no-store" });
  if (!res.ok) throw new Error("네트워크 오류");
  const data = await res.json();
  if (data.returnValue !== "success") {
    throw new Error("해당 회차를 찾을 수 없습니다.");
  }
  return data;
}

async function fetchDrawSafe(drawNo) {
  try {
    const res = await fetch(`${API_BASE}${drawNo}`, { cache: "no-store" });
    const data = await res.json();
    return data.returnValue === "success" ? data : null;
  } catch {
    return null;
  }
}

async function findLatestDrawNo(cache) {
  const cacheKey = new Request("https://cache.local/latest-draw-no");
  const cached = await cache.match(cacheKey);
  if (cached) return Number(await cached.text());

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

  await cache.put(
    cacheKey,
    new Response(String(left), {
      headers: { "Cache-Control": `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}` },
    }),
  );
  return left;
}

export async function onRequestGet({ request, waitUntil }) {
  try {
    const url = new URL(request.url);
    const drawNo = url.searchParams.get("drawNo");
    if (!drawNo) {
      return new Response(JSON.stringify({ error: "drawNo가 필요합니다." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let target = drawNo;
    if (drawNo === "latest") {
      target = await findLatestDrawNo(caches.default);
    } else if (!/^\d+$/.test(String(drawNo))) {
      return new Response(JSON.stringify({ error: "회차 번호가 올바르지 않습니다." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await fetchDraw(target);
    const response = new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
    waitUntil(caches.default.put(request, response.clone()));
    return response;
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "조회 실패" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
