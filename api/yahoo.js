/**
 * api/yahoo.js — Vercel Serverless v9.2
 * Strategy: v7 batch dulu (ada fundamental PE/PBV/DY), fallback ke v8 chart
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const HDR = {
  'User-Agent': UA,
  'Accept': 'application/json',
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
        { headers: HDR, signal: AbortSignal.timeout(10000) }
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
      { headers: HDR, signal: AbortSignal.timeout(8000) }
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
      longName: m.shortName||symbol.replace('.JK',''), shortName: m.shortName||'',
      marketCap: Number(m.marketCap)||0,
      trailingAnnualDividendYield: null, priceToBook: null,
      trailingPE: null, forwardPE: null,
      returnOnEquity: null, debtToEquity: null,
    }
  } catch { return null }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*')
  res.setHeader('Access-Control-Allow-Methods','GET,OPTIONS')
  res.setHeader('Cache-Control','s-maxage=30,stale-while-revalidate=15')
  if (req.method==='OPTIONS') return res.status(200).end()

  const { symbols, chart } = req.query

  if (chart) {
    const d = await fetchV8(chart)
    if (!d) return res.status(404).json({ error: `${chart} tidak ditemukan` })
    return res.status(200).json({ quoteResponse:{ result:[d] } })
  }
  if (!symbols) return res.status(400).json({ error:"symbols wajib" })

  // Coba v7 batch (ada fundamental)
  const v7 = await fetchV7(symbols)
  if (v7) return res.status(200).json(v7)

  // Fallback v8 chart parallel
  const list = symbols.split(',').map(s=>s.trim()).filter(Boolean)
  const results = await Promise.all(list.map(s => fetchV8(s)))
  return res.status(200).json({ quoteResponse:{ result: results.filter(Boolean), error:null } })
}