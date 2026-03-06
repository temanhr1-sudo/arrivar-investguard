/**
 * /api/yahoo.js — Vercel Serverless Function
 * ─────────────────────────────────────────────────────────
 * Proxy resmi untuk Yahoo Finance. Karena berjalan di server-side
 * (Node.js di Vercel), tidak ada CORS blocking sama sekali.
 *
 * Endpoint yang tersedia:
 *   GET /api/yahoo?symbols=BBCA.JK,BBRI.JK       → batch quotes (v7)
 *   GET /api/yahoo?chart=BBCA.JK                  → single chart (v8)
 *   GET /api/yahoo?crumb=1                        → fetch crumb token
 */

// User-Agent realistic agar tidak diblokir Yahoo
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Cookie dari env (opsional, untuk resilience tambahan)
const YF_COOKIE = process.env.YAHOO_COOKIE || "";

/**
 * Ambil crumb token dari Yahoo Finance.
 * Crumb diperlukan oleh beberapa endpoint Yahoo yang lebih baru.
 */
async function fetchYahooCrumb() {
  try {
    const res = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: {
        "User-Agent": UA,
        "Cookie": YF_COOKIE || "B=abc",
        "Accept": "text/plain",
      },
    });
    if (res.ok) {
      const crumb = await res.text();
      return crumb.trim();
    }
  } catch (e) {
    console.error("Crumb fetch failed:", e.message);
  }
  return null;
}

/**
 * Handler utama Vercel
 */
export default async function handler(req, res) {
  // Handle preflight CORS
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  // CORS header untuk semua response
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=25, stale-while-revalidate=10");

  const { symbols, chart, crumb: getCrumb } = req.query;

  // ── MODE 1: Fetch crumb token ──
  if (getCrumb) {
    const crumbValue = await fetchYahooCrumb();
    return res.status(200).json({ crumb: crumbValue });
  }

  // ── MODE 2: Single stock chart (v8) ──
  if (chart) {
    try {
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${chart}?interval=1d&range=5d`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": UA,
          "Accept": "application/json",
          ...(YF_COOKIE && { "Cookie": YF_COOKIE }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Yahoo returned ${response.status}`,
          symbol: chart,
        });
      }

      const data = await response.json();
      return res.status(200).json(data);
    } catch (err) {
      console.error(`Chart fetch error for ${chart}:`, err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── MODE 3: Batch quote (v7) — mode utama ──
  if (!symbols) {
    return res.status(400).json({
      error: "Query parameter 'symbols' atau 'chart' wajib diisi.",
      example: "/api/yahoo?symbols=BBCA.JK,BBRI.JK",
    });
  }

  try {
    const fields = [
      "regularMarketPrice",
      "regularMarketChangePercent",
      "regularMarketVolume",
      "regularMarketDayHigh",
      "regularMarketDayLow",
      "longName",
      "shortName",
      "trailingAnnualDividendYield",
      "priceToBook",
      "trailingPE",
      "marketCap",
      "fiftyTwoWeekHigh",
      "fiftyTwoWeekLow",
    ].join(",");

    // Coba query2 dulu, fallback ke query1
    const endpoints = [
      `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=${fields}`,
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=${fields}`,
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          headers: {
            "User-Agent": UA,
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
            ...(YF_COOKIE && { "Cookie": YF_COOKIE }),
          },
          // Timeout 10 detik
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          const data = await response.json();

          // Validasi struktur response
          if (data?.quoteResponse?.result) {
            return res.status(200).json(data);
          }
        }

        lastError = `HTTP ${response.status} from ${new URL(endpoint).hostname}`;
      } catch (fetchErr) {
        lastError = fetchErr.message;
        console.warn(`Endpoint ${endpoint} gagal:`, fetchErr.message);
      }
    }

    // Jika kedua endpoint Yahoo gagal
    console.error("Semua Yahoo endpoints gagal:", lastError);
    return res.status(502).json({
      error: "Yahoo Finance tidak tersedia saat ini.",
      detail: lastError,
      quoteResponse: { result: [] }, // Return struktur kosong agar frontend tidak crash
    });
  } catch (err) {
    console.error("Handler error:", err.message);
    return res.status(500).json({
      error: "Internal server error",
      detail: err.message,
      quoteResponse: { result: [] },
    });
  }
}