/**
 * api/idx-breadth.js — Vercel Serverless
 * 
 * Scrape data breadth market (advance/decline/unchanged) dari IDX
 * langsung dari server — bukan client browser — sehingga lolos CORS.
 * 
 * Endpoint IDX yang dipakai:
 *   /umbraco/Surface/StockData/GetStockSummary  → harga semua saham hari ini
 *   /umbraco/Surface/TradingSummary/GetSummary  → ringkasan IHSG hari ini
 * 
 * Deploy: simpan di /api/idx-breadth.js di root project
 * Akses:  GET /api/idx-breadth
 */

const IDX_BASE = 'https://www.idx.co.id'
const HDR = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
  'Referer': 'https://www.idx.co.id/id/data-pasar/ringkasan-perdagangan/ringkasan-saham/',
  'Origin': 'https://www.idx.co.id',
}

// ── Fetch semua saham dari IDX (paginate 100 per request) ──
async function fetchAllStocks() {
  const PAGE = 100
  let start = 0, all = []
  
  // Ambil halaman pertama dulu untuk tahu total
  const first = await fetchPage(start, PAGE)
  if (!first) return null
  
  all = all.concat(first.data || [])
  const total = first.totalData || first.recordsTotal || all.length

  // Ambil halaman berikutnya secara parallel (max 10 halaman = 1000 saham)
  const pages = Math.min(Math.ceil(total / PAGE), 10)
  const tasks = []
  for (let p = 1; p < pages; p++) {
    tasks.push(fetchPage(p * PAGE, PAGE))
  }
  const results = await Promise.all(tasks)
  for (const r of results) {
    if (r?.data) all = all.concat(r.data)
  }
  
  return { stocks: all, total }
}

async function fetchPage(start, length) {
  const url = `${IDX_BASE}/umbraco/Surface/StockData/GetStockSummary?start=${start}&length=${length}&keyword=&sector=`
  try {
    const res = await fetch(url, { headers: HDR, signal: AbortSignal.timeout(12000) })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

// ── Fetch ringkasan IHSG hari ini ──
async function fetchIHSG() {
  const url = `${IDX_BASE}/umbraco/Surface/TradingSummary/GetTradingInfoSummary`
  try {
    const res = await fetch(url, { headers: HDR, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

// ── Parse satu baris saham dari IDX ──
function parseStock(item) {
  const prev  = Number(item.Previous || item.PreviousClose || 0)
  const close = Number(item.LastPrice || item.Close || item.Price || 0)
  const chg   = prev > 0 ? ((close - prev) / prev) * 100 : 0
  return {
    code:     (item.StockCode || item.Code || '').toUpperCase().trim(),
    name:     item.StockName || item.Name || '',
    price:    close,
    prev,
    change:   Number(item.Change || (close - prev)) || 0,
    chgPct:   Number(chg.toFixed(2)),
    volume:   Number(item.Volume || 0),
    value:    Number(item.Value || 0),
    freq:     Number(item.Frequency || 0),
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Cache-Control', 's-maxage=60,stale-while-revalidate=30') // cache 1 menit
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    // Fetch paralel: semua saham + IHSG summary
    const [stockData, ihsgData] = await Promise.all([
      fetchAllStocks(),
      fetchIHSG(),
    ])

    if (!stockData) {
      return res.status(503).json({ error: 'IDX tidak dapat diakses saat ini', source: 'idx' })
    }

    const stocks = stockData.stocks
      .map(parseStock)
      .filter(s => s.code && s.price > 0)

    // ── Hitung breadth market ──
    const advance   = stocks.filter(s => s.chgPct >  0)
    const decline   = stocks.filter(s => s.chgPct <  0)
    const unchanged = stocks.filter(s => s.chgPct === 0)
    const advUp1    = stocks.filter(s => s.chgPct >=  1)  // naik ≥1%
    const decDown1  = stocks.filter(s => s.chgPct <= -1)  // turun ≥1%
    const totalVol  = stocks.reduce((s, x) => s + x.volume, 0)
    const totalVal  = stocks.reduce((s, x) => s + x.value,  0)
    const avgChg    = stocks.length > 0
      ? stocks.reduce((s, x) => s + x.chgPct, 0) / stocks.length : 0

    // ── Market condition ──
    const declinePct = stocks.length > 0 ? (decline.length / stocks.length) * 100 : 0
    const condition  = avgChg > 0.5  ? 'BULLISH'
                     : avgChg < -0.5 ? 'BEARISH'
                     :                 'SIDEWAYS'

    // ── Top movers ──
    const sorted     = [...stocks].sort((a, b) => b.chgPct - a.chgPct)
    const topGainers = sorted.slice(0, 10)
    const topLosers  = sorted.slice(-10).reverse()
    const topVolume  = [...stocks].sort((a, b) => b.volume - a.volume).slice(0, 10)

    // ── IHSG data ──
    let ihsg = null
    if (ihsgData) {
      ihsg = {
        value:   Number(ihsgData.CompositeIndex || ihsgData.Index || 0),
        chg:     Number(ihsgData.Change || 0),
        chgPct:  Number(ihsgData.ChangePercent || 0),
        volume:  Number(ihsgData.Volume || 0),
        value_:  Number(ihsgData.Value || 0),
        freq:    Number(ihsgData.Frequency || 0),
      }
    }

    return res.status(200).json({
      timestamp:   new Date().toISOString(),
      source:      'idx.co.id',
      total:       stocks.length,
      ihsg,
      breadth: {
        advance:   advance.length,
        decline:   decline.length,
        unchanged: unchanged.length,
        advUp1:    advUp1.length,    // naik ≥1%
        decDown1:  decDown1.length,  // turun ≥1%
        avgChg:    Number(avgChg.toFixed(2)),
        declinePct: Number(declinePct.toFixed(1)),
        condition,
      },
      volume: {
        total:    totalVol,
        totalVal: totalVal,
      },
      topGainers,
      topLosers,
      topVolume,
    })

  } catch (e) {
    console.error('idx-breadth error:', e)
    return res.status(500).json({ error: e.message })
  }
}