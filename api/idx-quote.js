/**
 * api/idx-quote.js — Vercel Serverless
 * 
 * Porting dari IDX-Scrapper (github.com/wildangunawan/IDX-Scrapper)
 * Teknik: cloudscraper equivalent di Node.js — bypass Cloudflare dengan
 * headers browser lengkap + cookie simulation
 * 
 * Endpoint IDX:
 *   GetSecuritiesStock → daftar semua saham + info listing
 *   GetTradingInfoSS   → harga harian per kode saham
 *   GetStockSummary    → ringkasan harga semua saham (batch)
 * 
 * Deploy: /api/idx-quote.js
 * GET /api/idx-quote?all=1&page=0&size=150
 * GET /api/idx-quote?symbols=BBCA,BBRI,TLKM
 */

const IDX = 'https://idx.co.id'

// ── Headers yang persis seperti browser Chrome — bypass Cloudflare ──
function makeHeaders(refPath = '/id/data-pasar/data-saham/daftar-saham/') {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': `${IDX}${refPath}`,
    'Origin': IDX,
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  }
}

// ── Fetch dengan retry otomatis ──────────────────────────
async function idxFetch(path, retries = 3) {
  const url = `${IDX}${path}`
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: makeHeaders(),
        signal: AbortSignal.timeout(15000),
      })
      if (res.status === 200) {
        const text = await res.text()
        return JSON.parse(text)
      }
      if (res.status === 429) {
        // Rate limited — tunggu sebentar
        await new Promise(r => setTimeout(r, 2000 * (i + 1)))
        continue
      }
      console.warn(`IDX ${path} → ${res.status}`)
      return null
    } catch (e) {
      console.warn(`IDX fetch error (try ${i+1}):`, e.message)
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1000))
    }
  }
  return null
}

// ── GetSecuritiesStock: daftar semua saham ────────────────
// Sama persis dengan get-list-emiten.py — max 150 per request
async function fetchSecuritiesList(start = 0, length = 150) {
  return idxFetch(`/umbraco/Surface/StockData/GetSecuritiesStock?code=&sector=&board=&start=${start}&length=${length}`)
}

// ── GetStockSummary: harga + perubahan semua saham ────────
// Sama dengan GetStockSummary yang dipakai di idx-breadth.js
async function fetchStockSummary(start = 0, length = 150) {
  return idxFetch(`/umbraco/Surface/StockData/GetStockSummary?start=${start}&length=${length}&keyword=&sector=`)
}

// ── GetTradingInfoSS: harga harian per saham (akurat) ────
// Sama dengan get-data-harian-emiten.py — 1 saham per request
async function fetchTradingInfo(code) {
  const d = await idxFetch(`/umbraco/Surface/ListedCompany/GetTradingInfoSS?code=${code}&length=1`)
  if (!d?.replies?.length) return null
  const r = d.replies[0]
  return {
    code,
    price:    Number(r.Close)      || 0,
    prev:     Number(r.Previous)   || 0,
    open:     Number(r.OpenPrice)  || 0,
    high:     Number(r.High)       || 0,
    low:      Number(r.Low)        || 0,
    change:   Number(r.Change)     || 0,
    volume:   Number(r.Volume)     || 0,
    value:    Number(r.Value)      || 0,
    freq:     Number(r.Frequency)  || 0,
    foreignBuy:  Number(r.ForeignBuy)  || 0,
    foreignSell: Number(r.ForeignSell) || 0,
    listedShares: Number(r.ListedShares) || 0,
    bid:      Number(r.Bid)        || 0,
    offer:    Number(r.Offer)      || 0,
    date:     r.Date || '',
  }
}

// ── Parse baris dari GetStockSummary ─────────────────────
function parseStockSummary(item) {
  const prev   = Number(item.PreviousPrice || item.Previous || 0)
  const close  = Number(item.LastPrice || item.Close || 0)
  const change = Number(item.Change || (close - prev))
  const chgPct = prev > 0 ? (change / prev) * 100 : 0
  const vol    = Number(item.Volume || 0)

  return {
    code:    (item.StockCode || item.Code || '').toUpperCase().trim(),
    name:    item.StockName  || item.Name || '',
    sector:  item.Sector     || '',
    price:   close,
    prev,
    change,
    chgPct:  Number(chgPct.toFixed(2)),
    open:    Number(item.OpenPrice || 0),
    high:    Number(item.HighPrice || item.High || 0),
    low:     Number(item.LowPrice  || item.Low  || 0),
    volume:  vol,
    value:   Number(item.Value || 0),
    freq:    Number(item.Frequency || 0),
    mcap:    Number(item.MarketCap || 0),
    wk52H:   Number(item.High52Week || 0),
    wk52L:   Number(item.Low52Week  || 0),
    pe:      Number(item.PERatio    || 0),
    pbv:     Number(item.PBVRatio   || 0),
    dy:      Number(item.DividendYield || 0),
  }
}

// ── Fetch semua saham via GetStockSummary (paginasi 150) ──
async function fetchAllStockSummary() {
  const LENGTH = 150
  let start = 0, all = []

  // Halaman pertama
  const first = await fetchStockSummary(0, LENGTH)
  if (!first) return null
  
  const page0 = (first.data || []).map(parseStockSummary).filter(s => s.code && s.price > 0)
  all = all.concat(page0)
  
  const total = first.recordsTotal || first.totalData || 0
  if (total <= LENGTH) return all

  // Halaman berikutnya — parallel tapi batasi 4 concurrent
  const pages = Math.min(Math.ceil(total / LENGTH), 8)
  for (let p = 1; p < pages; p++) {
    const d = await fetchStockSummary(p * LENGTH, LENGTH)
    if (!d?.data) break
    const rows = d.data.map(parseStockSummary).filter(s => s.code && s.price > 0)
    all = all.concat(rows)
    // Jeda kecil agar tidak rate-limited
    if (p < pages - 1) await new Promise(r => setTimeout(r, 300))
  }

  return all
}

// ═══════════════════════════════════════════════════════════
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { symbols, all, code } = req.query

  // ── Mode 1: Satu saham by code (akurat, pakai GetTradingInfoSS) ──
  if (code) {
    res.setHeader('Cache-Control', 's-maxage=30,stale-while-revalidate=15')
    const data = await fetchTradingInfo(code.toUpperCase())
    if (!data) return res.status(404).json({ error: `${code} tidak ditemukan` })
    return res.status(200).json({ source: 'idx.co.id', data })
  }

  // ── Mode 2: Batch by symbols ──────────────────────────────
  if (symbols) {
    res.setHeader('Cache-Control', 's-maxage=30,stale-while-revalidate=15')
    const codes = symbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean).slice(0, 30)
    
    // GetStockSummary support keyword search — pakai untuk setiap kode
    // Lebih cepat daripada GetTradingInfoSS untuk batch
    const tasks  = codes.map(c =>
      fetchStockSummary(0, 5).then(d => // keyword filter tidak support batch, pakai all+filter
        null
      ).catch(() => null)
    )
    
    // Alternatif lebih reliable: ambil semua lalu filter
    // Untuk batch kecil (<10) pakai GetTradingInfoSS per saham
    if (codes.length <= 10) {
      const results = {}
      const tasks = codes.map(c => fetchTradingInfo(c).then(d => { if (d) results[c] = d }))
      await Promise.all(tasks)
      return res.status(200).json({ source: 'idx.co.id', timestamp: new Date().toISOString(), data: results })
    }

    // Batch besar: ambil semua saham lalu filter
    const all = await fetchAllStockSummary()
    if (!all) return res.status(503).json({ error: 'IDX tidak dapat diakses' })
    const result = {}
    for (const s of all) {
      if (codes.includes(s.code)) result[s.code] = s
    }
    return res.status(200).json({ source: 'idx.co.id', timestamp: new Date().toISOString(), data: result })
  }

  // ── Mode 3: Semua saham (untuk Screener) ─────────────────
  if (all) {
    res.setHeader('Cache-Control', 's-maxage=60,stale-while-revalidate=30')
    const page  = parseInt(req.query.page || '0')
    const size  = Math.min(parseInt(req.query.size || '150'), 150)
    const start = page * size

    const d = await fetchStockSummary(start, size)
    if (!d) return res.status(503).json({ error: 'IDX tidak dapat diakses saat ini. Coba lagi beberapa saat.' })

    const stocks = (d.data || []).map(parseStockSummary).filter(s => s.code && s.price > 0)
    return res.status(200).json({
      source:    'idx.co.id',
      timestamp: new Date().toISOString(),
      total:     d.recordsTotal || d.totalData || stocks.length,
      page,
      size,
      data:      stocks,
    })
  }

  return res.status(400).json({ error: 'Parameter: symbols, code, atau all=1' })
}