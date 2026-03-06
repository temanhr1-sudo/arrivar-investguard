/**
 * api/idx-fundamental.js — Vercel Serverless
 * 
 * Menggunakan endpoint IDX resmi yang ditemukan dari IDX-Scrapper:
 *   - GetSecuritiesStock: list emiten + data dasar
 *   - GetTradingInfoSS: data trading harian (close, volume, dll)
 * 
 * Endpoint ini publik, tidak butuh auth, dan digunakan oleh
 * IDX-Scrapper (cloudscraper) untuk ambil data saham Indonesia.
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const HDR = {
  'User-Agent': UA,
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
  'Referer': 'https://www.idx.co.id/',
  'Origin': 'https://www.idx.co.id',
}

// ── Fetch data fundamental via GetSecuritiesStock ──────────
// Endpoint ini return: Code, Name, ListingBoard, Shares, dll
async function fetchIDXSecurities(codes) {
  const result = {}
  try {
    // Fetch batch — bisa sampai 150 item per request
    const res = await fetch(
      `https://idx.co.id/umbraco/Surface/StockData/GetSecuritiesStock?code=&sector=&board=&start=0&length=800`,
      { headers: HDR, signal: AbortSignal.timeout(15000) }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    for (const item of (data?.data || [])) {
      const c = (item.Code || '').toUpperCase().trim()
      if (c && codes.includes(c)) {
        result[c] = {
          name: item.Name || c,
          shares: Number(item.Shares) || 0,
          listingBoard: item.ListingBoard || '',
        }
      }
    }
  } catch(e) {
    console.error('GetSecuritiesStock:', e.message)
  }
  return result
}

// ── Fetch data harian via GetTradingInfoSS ─────────────────
// Endpoint ini return: Close, Open, High, Low, Volume, Value
// Digunakan oleh IDX-Scrapper untuk ambil OHLCV harian
async function fetchIDXTradingInfo(code) {
  try {
    const res = await fetch(
      `https://idx.co.id/umbraco/Surface/ListedCompany/GetTradingInfoSS?code=${code}&length=5`,
      { headers: HDR, signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const replies = data?.replies || []
    if (!replies.length) return null
    // Ambil data terbaru (index 0 = terbaru)
    const latest = replies[0]
    const prev   = replies[1] || replies[0]
    const close  = Number(latest.Close) || 0
    const prevClose = Number(prev.Close) || Number(latest.Previous) || close
    return {
      price:  close,
      open:   Number(latest.OpenPrice) || close,
      high:   Number(latest.High) || close,
      low:    Number(latest.Low)  || close,
      volume: Number(latest.Volume) || 0,
      value:  Number(latest.Value)  || 0,
      chgPct: prevClose > 0 ? ((close - prevClose) / prevClose) * 100 : 0,
      foreignBuy:  Number(latest.ForeignBuy)  || 0,
      foreignSell: Number(latest.ForeignSell) || 0,
      bid:   Number(latest.Bid)  || 0,
      offer: Number(latest.Offer) || 0,
    }
  } catch(e) {
    console.error(`GetTradingInfoSS ${code}:`, e.message)
    return null
  }
}

// ── Fetch fundamental dari IDX Stockpage ──────────────────
// Page HTML scraping untuk PE, PBV, DY dari profil saham IDX
async function fetchIDXStockFundamental(code) {
  const endpoints = [
    // IDX Summary endpoint (ada di beberapa versi IDX API)
    `https://idx.co.id/umbraco/Surface/StockData/GetStockSummary?code=${code}`,
    // Endpoint alternatif
    `https://idx.co.id/umbraco/Surface/ListedCompany/GetCompanyProfiles?start=0&length=1&keyword=${code}`,
  ]

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: HDR, signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      const data = await res.json()
      // Coba berbagai format response
      const item = data?.data?.[0] || data?.Data?.[0] || data
      if (!item) continue
      const pe  = Number(item.PER || item.PE || item.PriceEarningRatio || 0)
      const pbv = Number(item.PBV || item.PriceToBook || 0)
      const dy  = Number(item.DividendYield || item.Yield || 0)
      const roe = Number(item.ROE || item.ReturnOnEquity || 0)
      if (pe || pbv || dy) return { pe, pbv, dy, roe }
    } catch { continue }
  }
  return null
}

// ── Main handler ───────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  // Cache 5 menit — fundamental tidak berubah cepat
  res.setHeader('Cache-Control', 's-maxage=300,stale-while-revalidate=60')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { codes: codesParam, code: singleCode, trading } = req.query

  // Single code trading info (harga + OHLCV)
  if (trading && singleCode) {
    const d = await fetchIDXTradingInfo(singleCode.toUpperCase())
    if (!d) return res.status(404).json({ error: `${singleCode} tidak ditemukan` })
    return res.status(200).json({ code: singleCode.toUpperCase(), ...d })
  }

  const codeList = (codesParam || singleCode || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)

  if (!codeList.length) return res.status(400).json({ error: 'codes wajib' })

  // Fetch securities list untuk dapat nama + shares
  const securities = await fetchIDXSecurities(codeList)

  // Fetch fundamental per-saham (parallel, max 5)
  const fundamentalResults = {}
  const PARALLEL = 5
  for (let i = 0; i < codeList.length; i += PARALLEL) {
    const batch = codeList.slice(i, i + PARALLEL)
    const results = await Promise.all(batch.map(c => fetchIDXStockFundamental(c)))
    for (let j = 0; j < batch.length; j++) {
      if (results[j]) fundamentalResults[batch[j]] = results[j]
    }
    // Delay kecil biar tidak kena rate limit
    if (i + PARALLEL < codeList.length) await new Promise(r => setTimeout(r, 200))
  }

  // Gabungkan semua
  const result = codeList.map(c => ({
    Code: c,
    Name: securities[c]?.name || c,
    Shares: securities[c]?.shares || 0,
    ListingBoard: securities[c]?.listingBoard || '',
    PE:  fundamentalResults[c]?.pe  || 0,
    PBV: fundamentalResults[c]?.pbv || 0,
    DividendYield: fundamentalResults[c]?.dy || 0,
    ROE: fundamentalResults[c]?.roe || 0,
    _fundamentalOK: !!(fundamentalResults[c]?.pe || fundamentalResults[c]?.pbv),
  }))

  return res.status(200).json({ result, total: result.length })
}