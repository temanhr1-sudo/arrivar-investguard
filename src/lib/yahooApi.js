/**
 * src/lib/yahooApi.js
 * Fetch live quotes dari Yahoo Finance via /api/yahoo serverless proxy.
 *
 * Fix ERR_NAME_NOT_RESOLVED:
 * - Pakai URL relatif /api/yahoo — JANGAN hardcode domain
 * - Vercel otomatis resolve ke domain yang sama (guard.vercel.app/api/yahoo)
 */

// ─── Fundamental statis IDX (fallback jika Yahoo tidak return data) ──────
// Sumber: Laporan keuangan Q3/Q4 2024, IDX, Stockbit
// Format: { dy, pbv, pe, roe, der, npm }
const IDX_FUNDAMENTALS = {
  BBCA: { dy:2.8,  pbv:4.1,  pe:22.5, roe:19.2, der:5.8,  npm:41.2 },
  BBRI: { dy:5.6,  pbv:2.4,  pe:11.8, roe:20.1, der:6.2,  npm:30.4 },
  BMRI: { dy:5.2,  pbv:2.1,  pe:10.9, roe:19.8, der:6.0,  npm:32.1 },
  BBNI: { dy:4.8,  pbv:1.3,  pe:8.2,  roe:15.4, der:6.5,  npm:27.3 },
  TLKM: { dy:6.8,  pbv:2.3,  pe:14.2, roe:16.2, der:0.9,  npm:18.4 },
  ASII: { dy:4.2,  pbv:1.5,  pe:12.8, roe:11.8, der:0.8,  npm:8.9  },
  ADRO: { dy:8.4,  pbv:1.8,  pe:6.2,  roe:29.4, der:0.3,  npm:28.6 },
  PTBA: { dy:9.2,  pbv:2.0,  pe:7.8,  roe:26.1, der:0.2,  npm:24.8 },
  ITMG: { dy:11.4, pbv:2.2,  pe:7.1,  roe:31.2, der:0.1,  npm:22.4 },
  GOTO: { dy:0,    pbv:1.2,  pe:0,    roe:-8.4, der:0.4,  npm:-12.3 },
  BREN: { dy:0,    pbv:8.2,  pe:28.4, roe:29.1, der:0.6,  npm:31.2  },
  AMMN: { dy:1.2,  pbv:3.4,  pe:14.2, roe:24.8, der:0.5,  npm:26.4  },
  MDKA: { dy:0,    pbv:2.8,  pe:18.6, roe:15.2, der:0.8,  npm:12.4  },
  ANTM: { dy:2.4,  pbv:1.4,  pe:14.8, roe:9.6,  der:0.3,  npm:6.2   },
  BJTM: { dy:7.8,  pbv:0.9,  pe:6.8,  roe:13.4, der:5.2,  npm:28.1  },
  BJBR: { dy:7.2,  pbv:0.8,  pe:5.9,  roe:12.8, der:5.8,  npm:24.6  },
  UNVR: { dy:8.6,  pbv:14.2, pe:22.4, roe:63.8, der:2.1,  npm:16.2  },
  ICBP: { dy:3.2,  pbv:2.8,  pe:14.6, roe:19.2, der:0.9,  npm:12.8  },
  INDF: { dy:4.8,  pbv:1.4,  pe:8.2,  roe:16.8, der:0.7,  npm:6.4   },
  PGAS: { dy:6.4,  pbv:1.2,  pe:8.8,  roe:13.6, der:1.1,  npm:12.6  },
  KLBF: { dy:2.8,  pbv:3.4,  pe:24.2, roe:14.4, der:0.2,  npm:11.8  },
  SMGR: { dy:3.6,  pbv:1.1,  pe:14.4, roe:7.8,  der:0.6,  npm:6.2   },
  MEDC: { dy:2.2,  pbv:1.4,  pe:10.6, roe:13.2, der:1.2,  npm:8.4   },
  ELSA: { dy:5.2,  pbv:1.3,  pe:9.4,  roe:13.8, der:0.4,  npm:8.6   },
  AUTO: { dy:4.8,  pbv:0.8,  pe:7.2,  roe:11.4, der:0.2,  npm:8.2   },
  SMSM: { dy:5.6,  pbv:2.6,  pe:12.8, roe:20.6, der:0.1,  npm:14.4  },
  MYOR: { dy:1.2,  pbv:2.4,  pe:18.6, roe:12.8, der:0.8,  npm:7.6   },
  SIDO: { dy:5.4,  pbv:3.8,  pe:18.4, roe:20.8, der:0.1,  npm:22.6  },
  CTRA: { dy:2.4,  pbv:1.0,  pe:10.2, roe:9.8,  der:0.6,  npm:18.4  },
  BSDE: { dy:1.8,  pbv:0.6,  pe:7.4,  roe:8.2,  der:0.4,  npm:22.6  },
  PWON: { dy:2.6,  pbv:1.1,  pe:8.8,  roe:12.4, der:0.5,  npm:28.4  },
  ACES: { dy:3.2,  pbv:2.4,  pe:18.6, roe:12.8, der:0.1,  npm:10.2  },
  MAPI: { dy:1.4,  pbv:2.2,  pe:16.4, roe:13.6, der:1.2,  npm:6.8   },
  TOWR: { dy:3.8,  pbv:3.6,  pe:18.2, roe:19.8, der:2.4,  npm:28.4  },
  JSMR: { dy:2.4,  pbv:1.8,  pe:16.8, roe:10.8, der:2.8,  npm:18.6  },
  EXCL: { dy:2.8,  pbv:1.6,  pe:14.4, roe:11.2, der:1.4,  npm:8.4   },
  ISAT: { dy:0,    pbv:3.2,  pe:22.4, roe:14.4, der:2.8,  npm:6.8   },
  AALI: { dy:5.6,  pbv:1.1,  pe:9.4,  roe:11.8, der:0.4,  npm:10.4  },
  LSIP: { dy:6.8,  pbv:0.9,  pe:7.8,  roe:11.4, der:0.1,  npm:14.8  },
  BRPT: { dy:1.8,  pbv:1.4,  pe:12.6, roe:11.2, der:1.1,  npm:8.2   },
  INKP: { dy:1.6,  pbv:0.7,  pe:6.2,  roe:11.8, der:0.8,  npm:12.4  },
  CPIN: { dy:2.4,  pbv:2.8,  pe:16.8, roe:16.8, der:0.3,  npm:7.6   },
  INCO: { dy:3.4,  pbv:1.2,  pe:8.4,  roe:14.2, der:0.1,  npm:18.4  },
  TINS: { dy:2.2,  pbv:0.9,  pe:7.6,  roe:11.8, der:0.6,  npm:8.2   },
  HRUM: { dy:7.4,  pbv:1.4,  pe:6.8,  roe:20.4, der:0.1,  npm:18.6  },
  BBTN: { dy:3.2,  pbv:0.7,  pe:8.4,  roe:8.6,  der:7.2,  npm:18.4  },
  LPKR: { dy:0,    pbv:0.4,  pe:6.2,  roe:6.4,  der:0.8,  npm:12.6  },
  RALS: { dy:4.8,  pbv:1.2,  pe:14.6, roe:8.4,  der:0.2,  npm:6.8   },
  HMSP: { dy:9.4,  pbv:8.2,  pe:22.4, roe:37.2, der:0.4,  npm:14.8  },
  GGRM: { dy:6.8,  pbv:1.4,  pe:12.6, roe:11.2, der:0.3,  npm:7.6   },
  INTP: { dy:3.6,  pbv:1.8,  pe:18.4, roe:9.8,  der:0.1,  npm:10.4  },
  BUMI: { dy:0,    pbv:2.0,  pe:0,    roe:-4.2, der:2.8,  npm:-6.4  },
  WIKA: { dy:0,    pbv:0.3,  pe:0,    roe:-8.6, der:2.4,  npm:-12.8 },
  WSKT: { dy:0,    pbv:0.2,  pe:0,    roe:-12.4,der:3.6,  npm:-18.4 },
  SMRA: { dy:1.4,  pbv:0.8,  pe:12.4, roe:6.8,  der:0.9,  npm:14.2  },
  DMAS: { dy:8.6,  pbv:1.6,  pe:9.8,  roe:16.4, der:0.1,  npm:42.6  },
  EMTK: { dy:0,    pbv:1.2,  pe:18.4, roe:6.4,  der:0.4,  npm:8.2   },
  MIKA: { dy:1.2,  pbv:4.2,  pe:28.6, roe:14.8, der:0.1,  npm:18.4  },
  HEAL: { dy:0.8,  pbv:3.8,  pe:24.4, roe:15.6, der:0.3,  npm:14.6  },
}

// ─── Merge fundamental statis ke dalam data Yahoo ─────────
// Yahoo diutamakan jika ada (>0), fallback ke data statis
function mergeWithFundamentals(parsed) {
  if (!parsed) return null
  const stat = IDX_FUNDAMENTALS[parsed.c] || {}
  return {
    ...parsed,
    dy:  parsed.dy  > 0 ? parsed.dy  : (stat.dy  || 0),
    pbv: parsed.pbv > 0 ? parsed.pbv : (stat.pbv || 0),
    pe:  parsed.pe  > 0 ? parsed.pe  : (stat.pe  || 0),
    roe: parsed.roe > 0 ? parsed.roe : (stat.roe || 0),
    der: parsed.der > 0 ? parsed.der : (stat.der || 0),
    npm: parsed.npm > 0 ? parsed.npm : (stat.npm || 0),
  }
}

// ─── Parser Yahoo quote ────────────────────────────────────
export function parseYahooQuote(q) {
  if (!q?.symbol) return null
  const code  = q.symbol.replace('.JK','').toUpperCase()
  const price = Number(q.regularMarketPrice) || 0
  if (price === 0) return null
  return {
    c: code,
    n: q.longName || q.shortName || code,
    price,
    chgPct:  Number((q.regularMarketChangePercent||0).toFixed(2)),
    volume:  Number(q.regularMarketVolume) || 0,
    high:    Number(q.regularMarketDayHigh) || 0,
    low:     Number(q.regularMarketDayLow)  || 0,
    wk52H:   Number(q.fiftyTwoWeekHigh) || 0,
    wk52L:   Number(q.fiftyTwoWeekLow)  || 0,
    mcap:    Number(q.marketCap) || 0,
    dy:      q.trailingAnnualDividendYield ? Number((q.trailingAnnualDividendYield*100).toFixed(2)) : 0,
    pbv:     q.priceToBook      ? Number(q.priceToBook.toFixed(2))          : 0,
    pe:      q.trailingPE       ? Number(q.trailingPE.toFixed(1))           : 0,
    fpe:     q.forwardPE        ? Number(q.forwardPE.toFixed(1))            : 0,
    roe:     q.returnOnEquity   ? Number((q.returnOnEquity*100).toFixed(1)) : 0,
    der:     q.debtToEquity     ? Number(q.debtToEquity.toFixed(2))         : 0,
    npm:     q.profitMargins    ? Number((q.profitMargins*100).toFixed(1))  : 0,
    revGrow: q.revenueGrowth    ? Number((q.revenueGrowth*100).toFixed(1))  : 0,
  }
}

// ─── Batch fetch harga live + merge fundamental ───────────
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
        const p = mergeWithFundamentals(parseYahooQuote(q))
        if (p) result[p.c] = p
      }
    } catch(e) {
      console.error(`Chunk ${i}:`, e.message)
      // Fallback: isi fundamental statis agar screener filter tetap jalan
      for (const code of chunk) {
        const c = code.toUpperCase()
        const stat = IDX_FUNDAMENTALS[c]
        if (stat && !result[c]) {
          result[c] = { c, n:c, price:0, chgPct:0, volume:0, high:0, low:0, wk52H:0, wk52L:0, mcap:0, fpe:0, revGrow:0, ...stat }
        }
      }
    }
    if (i+CHUNK < codes.length) await new Promise(r=>setTimeout(r,300))
  }
  // Saham yang harganya ada tapi fundamental kosong → merge statis
  for (const code of codes) {
    const c = code.toUpperCase()
    if (result[c]) result[c] = mergeWithFundamentals(result[c])
  }
  return result
}

// ─── Single stock search ───────────────────────────────────
export async function fetchSingleStockSearch(code) {
  if (!code) return null
  const sym = `${code.toUpperCase().replace(/\.JK$/i,'')}.JK`
  try {
    const res = await fetch(`/api/yahoo?symbols=${encodeURIComponent(sym)}`,
      { signal: AbortSignal.timeout(12000) })
    if (res.ok) {
      const data = await res.json()
      const list = data?.quoteResponse?.result || []
      if (list.length) {
        const p = mergeWithFundamentals(parseYahooQuote(list[0]))
        if (p) return p
      }
    }
  } catch(e) { console.warn('Search:', e.message) }
  // Fallback: fundamental statis saja
  const c = code.toUpperCase().replace(/\.JK$/i,'')
  const stat = IDX_FUNDAMENTALS[c]
  if (stat) return { c, n:c, price:0, chgPct:0, volume:0, high:0, low:0, wk52H:0, wk52L:0, mcap:0, fpe:0, revGrow:0, ...stat }
  return null
}

// ─── Export untuk referensi eksternal ─────────────────────
export { IDX_FUNDAMENTALS }