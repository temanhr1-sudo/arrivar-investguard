/**
 * /api/yahoo.js — Vercel Serverless Function
 * 
 * Menggunakan Yahoo Finance v8 /chart endpoint per-symbol
 * karena lebih stabil & tidak butuh crumb/cookie di 2025.
 *
 * Usage:
 *   GET /api/yahoo?symbols=BBCA.JK,BBRI.JK   → batch (parallel chart calls)
 *   GET /api/yahoo?chart=BBCA.JK              → single chart
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const HEADERS = {
  'User-Agent': UA,
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/',
  'Origin': 'https://finance.yahoo.com',
}

// Fetch satu saham via chart endpoint (lebih stabil dari v7 quote)
async function fetchChart(symbol) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const meta = data?.chart?.result?.[0]?.meta
    if (!meta?.regularMarketPrice) return null

    const price = Number(meta.regularMarketPrice) || 0
    const prev  = Number(meta.previousClose || meta.chartPreviousClose || price)
    const chgPct = prev > 0 ? ((price - prev) / prev) * 100 : 0

    return {
      symbol,
      regularMarketPrice: price,
      regularMarketChangePercent: chgPct,
      regularMarketVolume: Number(meta.regularMarketVolume) || 0,
      regularMarketDayHigh: Number(meta.regularMarketDayHigh) || 0,
      regularMarketDayLow: Number(meta.regularMarketDayLow) || 0,
      fiftyTwoWeekHigh: Number(meta.fiftyTwoWeekHigh) || 0,
      fiftyTwoWeekLow: Number(meta.fiftyTwoWeekLow) || 0,
      longName: meta.longName || meta.shortName || symbol.replace('.JK',''),
      shortName: meta.shortName || symbol.replace('.JK',''),
      trailingAnnualDividendYield: null,
      priceToBook: null,
      trailingPE: null,
      marketCap: Number(meta.marketCap) || 0,
    }
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const { symbols, chart } = req.query

  // ── Single chart mode ──
  if (chart) {
    const data = await fetchChart(chart)
    if (!data) return res.status(404).json({ error: `${chart} tidak ditemukan` })
    return res.status(200).json({
      quoteResponse: { result: [data] }
    })
  }

  // ── Batch mode ──
  if (!symbols) {
    return res.status(400).json({ error: "Query 'symbols' wajib diisi" })
  }

  const symbolList = symbols.split(',').map(s => s.trim()).filter(Boolean)

  // Fetch semua parallel (lebih cepat dari sequential)
  const results = await Promise.all(
    symbolList.map(sym => fetchChart(sym))
  )

  const validResults = results.filter(Boolean)

  return res.status(200).json({
    quoteResponse: {
      result: validResults,
      error: null,
    }
  })
}