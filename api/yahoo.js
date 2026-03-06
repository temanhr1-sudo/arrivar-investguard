/**
 * api/yahoo.js — Vercel Serverless
 * Strategy:
 *   1. Harga live → Yahoo Finance v7 batch (ada fundamental), fallback v8
 *   2. Fundamental (DY, PBV, PE, ROE) → IDX Official API sebagai enrichment
 *   3. Merge keduanya — Yahoo priority, IDX sebagai fallback
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const YHDR = {
  'User-Agent': UA, 'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/',
  'Origin': 'https://finance.yahoo.com',
}
const FIELDS = [
  'regularMarketPrice','regularMarketChangePercent','regularMarketVolume',
  'regularMarketDayHigh','regularMarketDayLow','longName','shortName',
  'trailingAnnualDividendYield','priceToBook','trailingPE','forwardPE',
  'marketCap','fiftyTwoWeekHigh','fiftyTwoWeekLow',
  'returnOnEquity','debtToEquity','currentRatio',
  'operatingMargins','profitMargins','revenueGrowth','earningsGrowth',
].join(',')

async function fetchV7(symbolsStr) {
  for (const host of ['query2','query1']) {
    try {
      const res = await fetch(
        `https://${host}.finance.yahoo.com/v7/finance/quote?symbols=${symbolsStr}&fields=${FIELDS}`,
        { headers: YHDR, signal: AbortSignal.timeout(10000) }
      )
      if (!res.ok) continue
      const data = await res.json()
      if (data?.quoteResponse?.result?.length > 0) return data
    } catch { continue }
  }
  return null
}

async function fetchV8(symbol) {
  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`,
      { headers: YHDR, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const d = await res.json()
    const m = d?.chart?.result?.[0]?.meta
    if (!m?.regularMarketPrice) return null
    const price = Number(m.regularMarketPrice)
    const prev  = Number(m.previousClose || m.chartPreviousClose || price)
    return {
      symbol, regularMarketPrice: price,
      regularMarketChangePercent: prev > 0 ? ((price-prev)/prev)*100 : 0,
      regularMarketVolume: Number(m.regularMarketVolume)||0,
      regularMarketDayHigh: Number(m.regularMarketDayHigh)||0,
      regularMarketDayLow: Number(m.regularMarketDayLow)||0,
      fiftyTwoWeekHigh: Number(m.fiftyTwoWeekHigh)||0,
      fiftyTwoWeekLow: Number(m.fiftyTwoWeekLow)||0,
      longName: m.shortName||symbol.replace('.JK',''),
      shortName: m.shortName||'',
      marketCap: Number(m.marketCap)||0,
      trailingAnnualDividendYield: null, priceToBook: null,
      trailingPE: null, forwardPE: null,
      returnOnEquity: null, debtToEquity: null,
      profitMargins: null, revenueGrowth: null,
    }
  } catch { return null }
}

// ── IDX Official API untuk fundamental ────────────────────
async function fetchIDXFundamentals(codes) {
  const result = {}
  const endpoints = [
    // IDX Trading Summary — ada PER, PBV, EPS
    `https://www.idx.co.id/primary/TradingSummary/GetStockSummary?start=0&length=800`,
    // IDX Stock Data
    `https://www.idx.co.id/primary/StockData/GetIndexStatisticData?indexID=COMPOSITE&startDate=&endDate=&start=0&length=800`,
  ]

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, 'Referer': 'https://www.idx.co.id/', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(12000)
      })
      if (!res.ok) continue
      const data = await res.json()
      const rows = data?.data || data?.Data || []
      for (const item of rows) {
        const c = (item.StockCode || item.Code || item.Kode || '').toUpperCase().trim()
        if (!c || !codes.includes(c)) continue
        result[c] = {
          pe:  Number(item.PER || item.PE || item.PriceEarningRatio || 0) || null,
          pbv: Number(item.PBV || item.PriceToBook || 0) || null,
          dy:  Number(item.DividendYield || item.Yield || 0) || null,
          roe: Number(item.ROE || 0) || null,
          eps: Number(item.EPS || 0) || null,
        }
      }
      if (Object.keys(result).length > 0) break
    } catch { continue }
  }

  // Fallback: IDX per-stock endpoint
  if (Object.keys(result).length === 0) {
    const sample = codes.slice(0, 3)
    for (const code of sample) {
      try {
        const res = await fetch(
          `https://www.idx.co.id/primary/ListedCompany/GetCompanyProfiles?start=0&length=1&keyword=${code}`,
          { headers: { 'User-Agent': UA, 'Referer': 'https://www.idx.co.id/' }, signal: AbortSignal.timeout(6000) }
        )
        if (!res.ok) continue
        const data = await res.json()
        const item = data?.data?.[0]
        if (item) {
          result[code] = {
            pe: Number(item.PER||0)||null, pbv: Number(item.PBV||0)||null,
            dy: Number(item.DividendYield||0)||null, roe: null, eps: Number(item.EPS||0)||null,
          }
        }
      } catch { continue }
    }
  }
  return result
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Cache-Control', 's-maxage=60,stale-while-revalidate=30')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { symbols, chart } = req.query

  if (chart) {
    const d = await fetchV8(chart)
    if (!d) return res.status(404).json({ error: `${chart} tidak ditemukan` })
    return res.status(200).json({ quoteResponse: { result: [d] } })
  }
  if (!symbols) return res.status(400).json({ error: 'symbols wajib' })

  const symList = symbols.split(',').map(s => s.trim()).filter(Boolean)
  const codes   = symList.map(s => s.replace('.JK','').toUpperCase())

  // Step 1: Yahoo v7 batch
  let baseMap = {}
  const v7 = await fetchV7(symbols)
  if (v7?.quoteResponse?.result?.length > 0) {
    for (const q of v7.quoteResponse.result) {
      const code = (q.symbol||'').replace('.JK','').toUpperCase()
      if (code) baseMap[code] = q
    }
  } else {
    // Fallback v8
    const v8s = await Promise.all(symList.map(s => fetchV8(s)))
    for (const q of v8s.filter(Boolean)) {
      const code = (q.symbol||'').replace('.JK','').toUpperCase()
      if (code) baseMap[code] = q
    }
  }

  // Step 2: Cek apakah fundamental kosong → enrichment dari IDX
  const needsEnrich = codes.filter(c => {
    const q = baseMap[c]
    return !q || (!(q.trailingPE>0) && !(q.priceToBook>0) && !(q.trailingAnnualDividendYield>0))
  })
  
  let idxData = {}
  if (needsEnrich.length > 0) {
    idxData = await fetchIDXFundamentals(codes)
  }

  // Step 3: Merge
  const merged = []
  for (const code of codes) {
    const q = baseMap[code]
    if (!q) continue
    const idx = idxData[code] || {}
    merged.push({
      ...q,
      symbol: `${code}.JK`,
      trailingPE:                  (q.trailingPE>0)                      ? q.trailingPE                  : (idx.pe  || null),
      priceToBook:                 (q.priceToBook>0)                     ? q.priceToBook                 : (idx.pbv || null),
      trailingAnnualDividendYield: (q.trailingAnnualDividendYield>0)     ? q.trailingAnnualDividendYield : (idx.dy ? idx.dy/100 : null),
      returnOnEquity:              (q.returnOnEquity>0)                   ? q.returnOnEquity              : (idx.roe ? idx.roe/100 : null),
    })
  }

  return res.status(200).json({ quoteResponse: { result: merged, error: null } })
}