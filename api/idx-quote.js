/**
 * api/idx-quote.js — Vercel Serverless
 * Harga saham IDX real-time untuk Screener & Porto sync
 * Lebih reliable dari Yahoo Finance untuk saham IDX kecil
 *
 * Deploy: /api/idx-quote.js
 * Akses:
 *   GET /api/idx-quote?symbols=BBCA,BBRI,TLKM     → batch harga (max 50)
 *   GET /api/idx-quote?all=1&page=0&size=100       → semua saham (paginasi)
 *   GET /api/idx-quote?sector=FINANCE              → filter sektor
 *   GET /api/idx-quote?index=LQ45                  → filter indeks
 */
const IDX_BASE = 'https://www.idx.co.id'
const HDR = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
  'Referer': 'https://www.idx.co.id/id/data-pasar/data-saham/daftar-saham/',
  'Origin': 'https://www.idx.co.id',
}

function parseStock(item) {
  const prev   = Number(item.PreviousPrice || item.Previous || item.PreviousClose || 0)
  const close  = Number(item.LastPrice || item.Close || item.Price || prev)
  const chg    = Number(item.Change || (close - prev))
  const chgPct = prev > 0 ? (chg / prev) * 100 : 0
  const vol    = Number(item.Volume || 0)
  const avgVol = Number(item.AverageVolume || item.AvgVolume || 0)

  return {
    code:      (item.StockCode || item.Code || '').toUpperCase().trim(),
    name:      item.StockName || item.Name || '',
    sector:    item.Sector || item.SectorName || '',
    price:     close,
    prev,
    change:    chg,
    chgPct:    Number(chgPct.toFixed(2)),
    open:      Number(item.OpenPrice || item.Open || 0),
    high:      Number(item.HighPrice || item.High || 0),
    low:       Number(item.LowPrice  || item.Low  || 0),
    volume:    vol,
    avgVolume: avgVol,
    volRatio:  avgVol > 0 ? Number((vol / avgVol).toFixed(2)) : 0,
    value:     Number(item.Value || 0),
    freq:      Number(item.Frequency || 0),
    mcap:      Number(item.MarketCap || item.ListedShares && close ? (item.ListedShares * close) : 0),
    wk52H:     Number(item.High52Week || item.YearHigh || 0),
    wk52L:     Number(item.Low52Week  || item.YearLow  || 0),
    // Fundamental dari IDX (jika tersedia)
    pe:        Number(item.PERatio   || item.PE  || 0),
    pbv:       Number(item.PBVRatio  || item.PBV || 0),
    dy:        Number(item.DividendYield || 0),
    eps:       Number(item.EPS || 0),
  }
}

async function fetchByKeyword(keyword) {
  const url = `${IDX_BASE}/umbraco/Surface/StockData/GetStockSummary?start=0&length=20&keyword=${encodeURIComponent(keyword)}&sector=`
  const r = await fetch(url, { headers: HDR, signal: AbortSignal.timeout(10000) })
  if (!r.ok) return []
  const d = await r.json()
  return (d?.data || []).map(parseStock).filter(s => s.code && s.price > 0)
}

async function fetchPage(start, length, sector = '') {
  const url = `${IDX_BASE}/umbraco/Surface/StockData/GetStockSummary?start=${start}&length=${length}&keyword=&sector=${encodeURIComponent(sector)}`
  const r = await fetch(url, { headers: HDR, signal: AbortSignal.timeout(12000) })
  if (!r.ok) return null
  return await r.json()
}

async function fetchByIndex(indexCode) {
  const url = `${IDX_BASE}/umbraco/Surface/Helper/GetStockByIndex?indexCode=${encodeURIComponent(indexCode)}`
  const r = await fetch(url, { headers: HDR, signal: AbortSignal.timeout(10000) })
  if (!r.ok) return []
  const d = await r.json()
  return (d?.data || d || []).map(parseStock).filter(s => s.code)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { symbols, all, page, size, sector, index: indexCode } = req.query

  // ── Mode 1: batch by symbols ──────────────────────────────
  if (symbols) {
    const codes = symbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 50)
    res.setHeader('Cache-Control', 's-maxage=30,stale-while-revalidate=15')
    try {
      // Fetch tiap saham by keyword (IDX tidak support batch by code)
      const tasks = codes.map(code => fetchByKeyword(code))
      const results = await Promise.all(tasks)
      const out = {}
      for (let i = 0; i < codes.length; i++) {
        const found = results[i].find(s => s.code === codes[i]) || results[i][0]
        if (found) out[found.code] = found
      }
      return res.status(200).json({ source: 'idx.co.id', timestamp: new Date().toISOString(), data: out })
    } catch(e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // ── Mode 2: filter by index (LQ45, IDX80, IDX30) ──────────
  if (indexCode) {
    res.setHeader('Cache-Control', 's-maxage=300,stale-while-revalidate=120')
    try {
      const stocks = await fetchByIndex(indexCode)
      return res.status(200).json({ source: 'idx.co.id', timestamp: new Date().toISOString(), total: stocks.length, data: stocks })
    } catch(e) {
      return res.status(500).json({ error: e.message })
    }
  }

  // ── Mode 3: semua saham (paginasi) ────────────────────────
  if (all) {
    res.setHeader('Cache-Control', 's-maxage=60,stale-while-revalidate=30')
    const pageNum  = parseInt(page || '0')
    const pageSize = Math.min(parseInt(size || '100'), 200)
    const start    = pageNum * pageSize
    try {
      const d = await fetchPage(start, pageSize, sector || '')
      if (!d) return res.status(503).json({ error: 'IDX tidak dapat diakses' })
      const stocks = (d?.data || []).map(parseStock).filter(s => s.code && s.price > 0)
      return res.status(200).json({
        source:    'idx.co.id',
        timestamp: new Date().toISOString(),
        total:     d.recordsTotal || d.totalData || stocks.length,
        page:      pageNum,
        size:      pageSize,
        data:      stocks,
      })
    } catch(e) {
      return res.status(500).json({ error: e.message })
    }
  }

  return res.status(400).json({ error: 'Butuh parameter: symbols, all, atau index' })
}