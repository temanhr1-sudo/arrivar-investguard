/**
 * api/idx-corp.js — Vercel Serverless
 * Corporate Action dari IDX menggunakan teknik IDX-Scrapper
 */

const IDX = 'https://idx.co.id'

function makeHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': `${IDX}/id/data-pasar/aksi-korporasi/`,
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Cache-Control', 's-maxage=3600,stale-while-revalidate=1800')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const months   = parseInt(req.query.months || '6')
  const past30   = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const futureNm = new Date(Date.now() + months * 30 * 86400000).toISOString().slice(0, 10)
  const url      = `${IDX}/umbraco/Surface/CorporateAction/GetCorporateActionList?start=0&length=500&type=&startDate=${past30}&endDate=${futureNm}`

  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: makeHeaders(), signal: AbortSignal.timeout(15000) })
      if (r.status === 429) { await new Promise(r => setTimeout(r, 2000 * (i+1))); continue }
      if (!r.ok) return res.status(r.status).json({ error: `IDX returned ${r.status}` })

      const raw   = await r.json()
      const items = raw?.data || raw?.Data || []
      const data  = items.map(item => ({
        code:       (item.EfectCode || item.StockCode || '').toUpperCase().trim(),
        name:       item.CompanyName || item.Name || '',
        type:       item.CorporateActionType || item.Type || 'Lainnya',
        desc:       item.Ratio || item.Description || item.Value || '',
        recordDate: (item.RecordDate || item.CumDate   || '').slice(0, 10),
        payDate:    (item.PaymentDate || item.ExDate   || '').slice(0, 10),
        exDate:     (item.ExDate     || item.RecordDate || '').slice(0, 10),
      })).filter(r => r.code && r.recordDate)

      return res.status(200).json({ timestamp: new Date().toISOString(), source: 'idx.co.id', total: data.length, data })
    } catch(e) {
      if (i === 2) return res.status(500).json({ error: e.message })
      await new Promise(r => setTimeout(r, 1000))
    }
  }
}