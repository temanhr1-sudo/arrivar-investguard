export function parseYahooQuote(q) {
  if (!q?.symbol) return null
  const code  = q.symbol.replace('.JK','').toUpperCase()
  const price = Number(q.regularMarketPrice) || 0
  if (price === 0) return null
  return {
    c: code,
    n: q.longName || q.shortName || code,
    price,
    chgPct:   Number((q.regularMarketChangePercent||0).toFixed(2)),
    volume:   Number(q.regularMarketVolume) || 0,
    high:     Number(q.regularMarketDayHigh) || 0,
    low:      Number(q.regularMarketDayLow) || 0,
    wk52H:    Number(q.fiftyTwoWeekHigh) || 0,
    wk52L:    Number(q.fiftyTwoWeekLow) || 0,
    mcap:     Number(q.marketCap) || 0,
    dy:       q.trailingAnnualDividendYield ? Number((q.trailingAnnualDividendYield*100).toFixed(2)) : 0,
    pbv:      q.priceToBook ? Number(q.priceToBook.toFixed(2)) : 0,
    pe:       q.trailingPE  ? Number(q.trailingPE.toFixed(1))  : 0,
    fpe:      q.forwardPE   ? Number(q.forwardPE.toFixed(1))   : 0,
    roe:      q.returnOnEquity  ? Number((q.returnOnEquity*100).toFixed(1)) : 0,
    der:      q.debtToEquity    ? Number(q.debtToEquity.toFixed(2))         : 0,
    npm:      q.profitMargins   ? Number((q.profitMargins*100).toFixed(1))  : 0,
    revGrow:  q.revenueGrowth   ? Number((q.revenueGrowth*100).toFixed(1))  : 0,
  }
}

export async function fetchBatchLiveQuotes(codes) {
  if (!codes?.length) return {}
  const CHUNK = 15, result = {}
  for (let i = 0; i < codes.length; i += CHUNK) {
    const chunk  = codes.slice(i, i+CHUNK)
    const params = chunk.map(c=>`${c.toUpperCase()}.JK`).join(',')
    try {
      const res = await fetch(`/api/yahoo?symbols=${encodeURIComponent(params)}`,
        { signal: AbortSignal.timeout(20000) })
      if (!res.ok) { console.warn(`Chunk ${i}: HTTP ${res.status}`); continue }
      const data = await res.json()
      for (const q of (data?.quoteResponse?.result||[])) {
        const p = parseYahooQuote(q); if (p) result[p.c] = p
      }
    } catch(e) { console.error(`Chunk ${i}:`, e.message) }
    if (i+CHUNK < codes.length) await new Promise(r=>setTimeout(r,300))
  }
  return result
}

export async function fetchSingleStockSearch(code) {
  if (!code) return null
  const sym = `${code.toUpperCase().replace(/\.JK$/i,'')}.JK`
  try {
    const res = await fetch(`/api/yahoo?symbols=${encodeURIComponent(sym)}`,
      { signal: AbortSignal.timeout(12000) })
    if (res.ok) {
      const data = await res.json()
      const list = data?.quoteResponse?.result || []
      if (list.length) { const p = parseYahooQuote(list[0]); if (p) return p }
    }
  } catch(e) { console.warn('Search:', e.message) }
  return null
}