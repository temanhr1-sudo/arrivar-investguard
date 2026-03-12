/**
 * api/idx-breadth.js — Vercel Serverless
 * Market breadth (advance/decline) + IHSG dari IDX
 * Teknik: porting IDX-Scrapper — pakai GetStockSummary + GetTradingInfoSS
 */

const IDX = 'https://idx.co.id'

function makeHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': `${IDX}/id/data-pasar/ringkasan-perdagangan/ringkasan-saham/`,
    'Origin': IDX,
    'Connection': 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Cache-Control': 'no-cache',
  }
}

async function idxFetch(path, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${IDX}${path}`, {
        headers: makeHeaders(),
        signal: AbortSignal.timeout(15000),
      })
      if (res.status === 200) return await res.json()
      if (res.status === 429) await new Promise(r => setTimeout(r, 2000 * (i + 1)))
      else return null
    } catch(e) {
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1000))
    }
  }
  return null
}

function parseRow(item) {
  const prev   = Number(item.PreviousPrice || item.Previous || 0)
  const close  = Number(item.LastPrice || item.Close || 0)
  const change = Number(item.Change || (close - prev))
  const chgPct = prev > 0 ? (change / prev) * 100 : 0
  return {
    code:   (item.StockCode || item.Code || '').toUpperCase().trim(),
    price:  close, prev, change,
    chgPct: Number(chgPct.toFixed(2)),
    volume: Number(item.Volume || 0),
    value:  Number(item.Value  || 0),
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Cache-Control', 's-maxage=60,stale-while-revalidate=30')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const LENGTH = 150
    let all = []

    // Halaman pertama — ambil total juga
    const first = await idxFetch(`/umbraco/Surface/StockData/GetStockSummary?start=0&length=${LENGTH}&keyword=&sector=`)
    if (!first) return res.status(503).json({ error: 'IDX tidak dapat diakses' })

    const page0 = (first.data || []).map(parseRow).filter(s => s.code && s.price > 0)
    all = all.concat(page0)

    const total = first.recordsTotal || first.totalData || all.length
    const pages = Math.min(Math.ceil(total / LENGTH), 8) // max 8 × 150 = 1200 saham

    // Halaman berikutnya sequential dengan jeda kecil
    for (let p = 1; p < pages; p++) {
      const d = await idxFetch(`/umbraco/Surface/StockData/GetStockSummary?start=${p * LENGTH}&length=${LENGTH}&keyword=&sector=`)
      if (!d?.data) break
      all = all.concat(d.data.map(parseRow).filter(s => s.code && s.price > 0))
      await new Promise(r => setTimeout(r, 200))
    }

    // IHSG via GetTradingInfoSS
    let ihsg = null
    try {
      const ihsgRaw = await idxFetch(`/umbraco/Surface/ListedCompany/GetTradingInfoSS?code=COMPOSITE&length=1`)
      if (ihsgRaw?.replies?.length) {
        const r = ihsgRaw.replies[0]
        ihsg = {
          value:  Number(r.Close)  || 0,
          prev:   Number(r.Previous) || 0,
          chg:    Number(r.Change) || 0,
          chgPct: Number(r.Previous) > 0 ? ((r.Close - r.Previous) / r.Previous) * 100 : 0,
          volume: Number(r.Volume) || 0,
          value_: Number(r.Value)  || 0,
        }
      }
    } catch {}

    // Hitung breadth
    const advance   = all.filter(s => s.chgPct >  0)
    const decline   = all.filter(s => s.chgPct <  0)
    const unchanged = all.filter(s => s.chgPct === 0)
    const advUp1    = all.filter(s => s.chgPct >=  1)
    const decDown1  = all.filter(s => s.chgPct <= -1)
    const avgChg    = all.length > 0 ? all.reduce((s, x) => s + x.chgPct, 0) / all.length : 0
    const condition = avgChg > 0.5 ? 'BULLISH' : avgChg < -0.5 ? 'BEARISH' : 'SIDEWAYS'

    // Top movers
    const sorted     = [...all].sort((a, b) => b.chgPct - a.chgPct)
    const topGainers = sorted.slice(0, 10)
    const topLosers  = sorted.slice(-10).reverse()
    const topVolume  = [...all].sort((a, b) => b.volume - a.volume).slice(0, 10)

    return res.status(200).json({
      timestamp: new Date().toISOString(),
      source:    'idx.co.id',
      total:     all.length,
      ihsg,
      breadth: {
        advance:    advance.length,
        decline:    decline.length,
        unchanged:  unchanged.length,
        advUp1:     advUp1.length,
        decDown1:   decDown1.length,
        avgChg:     Number(avgChg.toFixed(2)),
        declinePct: Number((decline.length / (all.length || 1) * 100).toFixed(1)),
        condition,
      },
      topGainers,
      topLosers,
      topVolume,
    })
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}