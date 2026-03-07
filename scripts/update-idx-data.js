/**
 * InvestGuard — IDX Data Auto-Updater
 * =====================================
 * Update harian data screener dari file Excel IDX
 * 
 * CARA PAKAI:
 *   1. Download file Excel dari IDX:
 *      - IDX Stock Screener: https://www.idx.co.id/id/data-pasar/laporan-statistik/stock-screener/
 *      - Stock Summary: https://www.idx.co.id/id/data-pasar/ringkasan-perdagangan/ringkasan-saham/
 *   2. Simpan ke folder /data/ dengan nama:
 *      - data/IDX-Stock-Screener.xlsx
 *      - data/Stock_Summary.xlsx
 *   3. Jalankan: node scripts/update-idx-data.js
 *   4. Output: public/idx_stocks.json (otomatis ter-serve oleh Vite/Vercel)
 * 
 * AUTOMASI (opsional):
 *   - Tambah ke cron job: 0 18 * * 1-5 node /path/to/scripts/update-idx-data.js
 *   - Atau integrasikan ke CI/CD pipeline
 */

const XLSX   = require('xlsx')
const fs     = require('fs')
const path   = require('path')

const SCREENER_FILE = path.join(__dirname, '../data/IDX-Stock-Screener.xlsx')
const SUMMARY_FILE  = path.join(__dirname, '../data/Stock_Summary.xlsx')
const OUTPUT_FILE   = path.join(__dirname, '../public/idx_stocks.json')

function toNum(v) {
  if (v === null || v === undefined || v === '') return 0
  const n = parseFloat(v)
  return isNaN(n) ? 0 : Math.round(n * 100) / 100
}

async function main() {
  console.log('📊 InvestGuard IDX Data Updater')
  console.log('================================')

  // Check files exist
  if (!fs.existsSync(SCREENER_FILE)) {
    console.error(`❌ File tidak ditemukan: ${SCREENER_FILE}`)
    console.log('   Download dari: https://www.idx.co.id/id/data-pasar/laporan-statistik/stock-screener/')
    process.exit(1)
  }
  if (!fs.existsSync(SUMMARY_FILE)) {
    console.error(`❌ File tidak ditemukan: ${SUMMARY_FILE}`)
    console.log('   Download dari: https://www.idx.co.id/id/data-pasar/ringkasan-perdagangan/ringkasan-saham/')
    process.exit(1)
  }

  // Read Stock Summary for live prices
  console.log('📈 Membaca Stock Summary...')
  const wbSum  = XLSX.readFile(SUMMARY_FILE)
  const wsSum  = wbSum.Sheets[wbSum.SheetNames[0]]
  const sumRows = XLSX.utils.sheet_to_json(wsSum, { header: 1 })
  // Headers: No, Stock Code, Company Name, Remarks, Previous, Open Price,
  //          Last Trading Date, First Trade, High, Low, Close, Change,
  //          Volume, Value, Frequency, Index Individual, Offer, Offer Volume,
  //          Bid, Bid Volume, ...
  const priceMap = {}
  for (let r = 1; r < sumRows.length; r++) {
    const row  = sumRows[r]
    const code = (row[1] || '').toString().trim().toUpperCase()
    if (!code) continue
    priceMap[code] = {
      name:  (row[2] || '').replace('Tbk.','').replace('PT ','').trim(),
      prev:  toNum(row[4]),
      open:  toNum(row[5]),
      high:  toNum(row[8]),
      low:   toNum(row[9]),
      close: toNum(row[10]),
      chg:   toNum(row[11]),
      vol:   parseInt(row[12]) || 0,
      val:   parseInt(row[13]) || 0,
      freq:  parseInt(row[14]) || 0,
      offer: toNum(row[16]),
      bid:   toNum(row[18]),
    }
  }
  console.log(`   ✓ ${Object.keys(priceMap).length} saham dari Summary`)

  // Read Stock Screener for fundamentals
  console.log('📊 Membaca Stock Screener...')
  const wbScr  = XLSX.readFile(SCREENER_FILE)
  const wsScr  = wbScr.Sheets[wbScr.SheetNames[0]]
  const scrRows = XLSX.utils.sheet_to_json(wsScr, { header: 1 })
  // Headers: No, Company Name, Stock Code, Subindustry Code, Sector, Subsector,
  //          Industry, Sub-industry, Index, PER, PBV, ROE %, ROA %, DER,
  //          Mkt Cap, Total Rev, 4-wk, 13-wk, 26-wk, 52-wk, NPM %, MTD, YTD

  const stocks = []
  const today  = new Date().toISOString().slice(0, 10)

  for (let r = 1; r < scrRows.length; r++) {
    const row  = scrRows[r]
    const code = (row[2] || '').toString().trim().toUpperCase()
    if (!code) continue

    const p      = priceMap[code] || {}
    const close  = p.close || p.prev || 0
    const chg    = p.chg   || 0
    const chgpct = close > 0 ? Math.round((chg / close) * 10000) / 100 : 0

    stocks.push({
      c:        code,
      n:        (row[1] || p.name || '').toString().replace('Tbk.','').replace('PT ','').trim(),
      sector:   (row[4] || 'IDX').toString(),
      subsec:   (row[5] || '').toString(),
      industry: (row[6] || '').toString(),
      idx_member: (row[8] || '').toString().includes('LQ45'),
      idx_list: (row[8] || '').toString().slice(0, 100),
      pe:       toNum(row[9]),
      pbv:      toNum(row[10]),
      roe:      toNum(row[11]),
      roa:      toNum(row[12]),
      der:      toNum(row[13]),
      dy:       0,
      npm:      toNum(row[20]),
      mktcap:   parseInt(row[14]) || 0,
      price:    close,
      chg:      chg,
      chgpct:   chgpct,
      vol:      p.vol || 0,
      wk4:      toNum(row[16]),
      wk13:     toNum(row[17]),
      wk52:     toNum(row[19]),
      bid:      p.bid  || 0,
      offer:    p.offer || 0,
      updated:  today,
    })
  }

  console.log(`   ✓ ${stocks.length} saham dari Screener`)

  // Write output
  const output = { updated: today, count: stocks.length, data: stocks }
  const dir = path.dirname(OUTPUT_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 0), 'utf-8')

  const sizekb = Math.round(fs.statSync(OUTPUT_FILE).size / 1024)
  console.log(`\n✅ Selesai!`)
  console.log(`   File: ${OUTPUT_FILE}`)
  console.log(`   Ukuran: ${sizekb} KB`)
  console.log(`   Total saham: ${stocks.length}`)
  console.log(`   Update: ${today}`)
  console.log(`\n💡 Cara deploy:`)
  console.log(`   - Jalankan script ini setiap hari setelah jam 16:00 WIB`)
  console.log(`   - Commit & push: git add public/idx_stocks.json && git commit -m "Update IDX data ${today}" && git push`)
  console.log(`   - Vercel auto-deploy dalam ~1 menit`)
}

main().catch(err => { console.error('Error:', err); process.exit(1) })
