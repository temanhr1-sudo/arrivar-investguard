/**
 * src/lib/yahooApi.js
 * ─────────────────────────────────────────────────────────
 * Semua request ke Yahoo Finance lewat /api/yahoo
 * → Di Vercel: diteruskan ke api/yahoo.js (serverless)
 * → Di Vite dev: diteruskan ke Yahoo langsung via vite.config.js proxy
 *
 * Stooq DIHAPUS dari sini (CORS di browser).
 * Fallback sekarang: harga 0 atau data dari avg_price portfolio.
 */

// ─── PARSE YAHOO QUOTE OBJECT ───────────────────────────
export function parseYahooQuote(quote) {
  if (!quote || !quote.symbol) return null

  const cleanCode = quote.symbol.replace('.JK', '').toUpperCase()
  const price = Number(quote.regularMarketPrice) || 0

  if (price === 0) return null

  return {
    c: cleanCode,
    n: quote.longName || quote.shortName || cleanCode,
    price,
    chgPct: Number(quote.regularMarketChangePercent?.toFixed(2)) || 0,
    volume: Number(quote.regularMarketVolume) || 0,
    high: Number(quote.regularMarketDayHigh) || 0,
    low: Number(quote.regularMarketDayLow) || 0,
    wk52High: Number(quote.fiftyTwoWeekHigh) || 0,
    wk52Low: Number(quote.fiftyTwoWeekLow) || 0,
    marketCap: Number(quote.marketCap) || 0,
    dy: quote.trailingAnnualDividendYield
      ? Number((quote.trailingAnnualDividendYield * 100).toFixed(2))
      : 0,
    pbv: quote.priceToBook ? Number(quote.priceToBook.toFixed(2)) : 0,
    pe: quote.trailingPE ? Number(quote.trailingPE.toFixed(1)) : 0,
  }
}

// ─── BATCH QUOTES ────────────────────────────────────────
export async function fetchBatchLiveQuotes(stockCodesArray) {
  if (!stockCodesArray || stockCodesArray.length === 0) return {}

  const results = {}
  const CHUNK_SIZE = 15

  for (let i = 0; i < stockCodesArray.length; i += CHUNK_SIZE) {
    const chunk = stockCodesArray.slice(i, i + CHUNK_SIZE)
    const symbolsParam = chunk.map((c) => `${c.toUpperCase()}.JK`).join(',')

    try {
      const res = await fetch(
        `/api/yahoo?symbols=${encodeURIComponent(symbolsParam)}`,
        { signal: AbortSignal.timeout(15000) }
      )

      if (!res.ok) {
        console.warn(`Batch chunk ${i}-${i + CHUNK_SIZE}: HTTP ${res.status}`)
        continue
      }

      const data = await res.json()
      const quoteList = data?.quoteResponse?.result || []

      for (const quote of quoteList) {
        const parsed = parseYahooQuote(quote)
        if (parsed) results[parsed.c] = parsed
      }

      const receivedCodes = new Set(quoteList.map((q) => q.symbol?.replace('.JK', '')))
      const missing = chunk.filter((c) => !receivedCodes.has(c))
      if (missing.length > 0) console.warn('Tidak ada data untuk:', missing)

    } catch (err) {
      console.error(`Batch chunk ${i}-${i + CHUNK_SIZE} gagal:`, err.message)
    }

    // Throttle antar chunk
    if (i + CHUNK_SIZE < stockCodesArray.length) {
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  return results
}

// ─── SINGLE STOCK SEARCH ────────────────────────────────
export async function fetchSingleStockSearch(searchCode) {
  if (!searchCode) return null

  const code = searchCode.toUpperCase().replace(/\.JK$/i, '')
  const symbolWithSuffix = `${code}.JK`

  // Method 1: Batch endpoint (1 symbol)
  try {
    const res = await fetch(
      `/api/yahoo?symbols=${encodeURIComponent(symbolWithSuffix)}`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (res.ok) {
      const data = await res.json()
      const quoteList = data?.quoteResponse?.result || []
      if (quoteList.length > 0) {
        const parsed = parseYahooQuote(quoteList[0])
        if (parsed) {
          console.info(`✓ ${code} dari Yahoo v7`)
          return parsed
        }
      }
    }
  } catch (e) {
    console.warn(`Yahoo v7 gagal untuk ${code}:`, e.message)
  }

  // Method 2: Chart endpoint (v8)
  try {
    const res = await fetch(
      `/api/yahoo?chart=${encodeURIComponent(symbolWithSuffix)}`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (res.ok) {
      const data = await res.json()
      const meta = data?.chart?.result?.[0]?.meta
      if (meta?.regularMarketPrice) {
        console.info(`✓ ${code} dari Yahoo v8 chart`)
        const prev = meta.previousClose || meta.chartPreviousClose || meta.regularMarketPrice
        return {
          c: code,
          n: meta.shortName || meta.longName || code,
          price: Number(meta.regularMarketPrice) || 0,
          chgPct: Number((((meta.regularMarketPrice - prev) / prev) * 100).toFixed(2)) || 0,
          dy: 0, pbv: 0, pe: 0,
          volume: Number(meta.regularMarketVolume) || 0,
          wk52High: Number(meta.fiftyTwoWeekHigh) || 0,
          wk52Low: Number(meta.fiftyTwoWeekLow) || 0,
        }
      }
    }
  } catch (e) {
    console.warn(`Yahoo v8 gagal untuk ${code}:`, e.message)
  }

  console.error(`✗ ${code} tidak ditemukan di Yahoo Finance.`)
  return null
}