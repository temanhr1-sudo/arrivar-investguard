// src/components/MonitorTab.jsx
import { idr } from '../lib/moneyManagement'

export default function MonitorTab({ profile, portfolio }) {
  // Kalkulasi Metrik Global
  const totalInvested = portfolio.reduce((acc, p) => acc + (p.shares * p.avg_price), 0)
  const totalCurrentVal = portfolio.reduce((acc, p) => acc + (p.shares * p.close_price), 0)
  const totalPnl = totalCurrentVal - totalInvested
  const cashReserve = profile.capital - totalInvested
  const cashPct = profile.capital > 0 ? (cashReserve / profile.capital) * 100 : 0

  // Cari saham dengan performa terbaik dan terburuk
  const sortedPortfolio = [...portfolio].sort((a, b) => {
    const pnlPctA = ((a.close_price - a.avg_price) / a.avg_price) * 100
    const pnlPctB = ((b.close_price - b.avg_price) / b.avg_price) * 100
    return pnlPctB - pnlPctA // Urutkan dari tertinggi ke terendah
  })

  const bestStock = sortedPortfolio.length > 0 ? sortedPortfolio[0] : null
  const worstStock = sortedPortfolio.length > 0 ? sortedPortfolio[sortedPortfolio.length - 1] : null

  // Fungsi pembantu untuk hitung % PnL satu saham
  const getPnlPct = (p) => ((p.close_price - p.avg_price) / p.avg_price) * 100

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-brand-navy">Monitor Portofolio</h2>
        <p className="text-xs text-gray-500">Ringkasan performa dan alokasi asetmu.</p>
      </div>

      {/* KARTU RINGKASAN */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-sm">
          <div className="text-[10px] font-extrabold text-gray-400 tracking-widest mb-1">TOTAL FLOATING</div>
          <div className={`text-lg font-extrabold ${totalPnl >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
            {totalPnl >= 0 ? '+' : ''}Rp {idr(totalPnl)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-brand-border shadow-sm">
          <div className="text-[10px] font-extrabold text-gray-400 tracking-widest mb-1">CASH TERSEDIA</div>
          <div className={`text-lg font-extrabold ${cashPct < 20 ? 'text-amber-500' : 'text-brand-navy'}`}>
            {cashPct.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* ALOKASI ASET (BAR CHART SEDERHANA) */}
      <div className="bg-white p-5 rounded-2xl border border-brand-border shadow-sm mb-6">
        <h3 className="text-xs font-extrabold text-brand-navy mb-4 tracking-widest">ALOKASI ASET (BOBOT)</h3>
        <div className="space-y-4">
          
          {/* Visualisasi Cash */}
          <div>
            <div className="flex justify-between text-[10px] font-bold mb-1">
              <span className="text-gray-500">🛡️ Cash / Rupiah</span>
              <span className="text-brand-navy">{cashPct.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className="h-2.5 rounded-full bg-emerald-400" style={{ width: `${Math.min(100, cashPct)}%` }}></div>
            </div>
          </div>

          {/* Visualisasi per Saham */}
          {portfolio.map(p => {
            const allocPct = (p.shares * p.avg_price) / profile.capital * 100
            return (
              <div key={p.id}>
                <div className="flex justify-between text-[10px] font-bold mb-1">
                  <span className="text-gray-500">📈 {p.stock_code}</span>
                  <span className="text-brand-navy">{allocPct.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full ${allocPct > 20 ? 'bg-red-500' : 'bg-brand-navy'}`} style={{ width: `${Math.min(100, allocPct)}%` }}></div>
                </div>
              </div>
            )
          })}

          {portfolio.length === 0 && (
            <div className="text-center text-[10px] font-bold text-gray-400">Belum ada aset saham.</div>
          )}
        </div>
      </div>

      {/* TOP & WORST PERFORMER */}
      <h3 className="text-xs font-extrabold text-brand-navy mb-3 mt-6 tracking-widest">PERFORMA SAHAM</h3>
      <div className="space-y-3">
        {bestStock && (
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex justify-between items-center shadow-sm">
            <div>
              <div className="text-[10px] font-extrabold text-emerald-600 mb-1 tracking-widest">🔥 TERBAIK</div>
              <div className="font-extrabold text-brand-navy text-lg">{bestStock.stock_code}</div>
            </div>
            <div className="text-right">
              <div className="font-extrabold text-emerald-600 text-lg">+{getPnlPct(bestStock).toFixed(2)}%</div>
              <div className="text-[10px] text-gray-500 font-bold">Rp {idr(bestStock.close_price)}</div>
            </div>
          </div>
        )}
        
        {/* Tampilkan yang terburuk HANYA JIKA portofolio > 1 dan memang ada yang minus */}
        {worstStock && portfolio.length > 1 && getPnlPct(worstStock) < 0 && (
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex justify-between items-center shadow-sm mt-3">
            <div>
              <div className="text-[10px] font-extrabold text-red-600 mb-1 tracking-widest">🧊 TERBURUK</div>
              <div className="font-extrabold text-brand-navy text-lg">{worstStock.stock_code}</div>
            </div>
            <div className="text-right">
              <div className="font-extrabold text-red-600 text-lg">{getPnlPct(worstStock).toFixed(2)}%</div>
              <div className="text-[10px] text-gray-500 font-bold">Rp {idr(worstStock.close_price)}</div>
            </div>
          </div>
        )}
        
        {portfolio.length === 0 && (
          <div className="text-center text-xs text-gray-400 font-bold py-4">Belum ada data performa saham.</div>
        )}
      </div>
    </div>
  )
}