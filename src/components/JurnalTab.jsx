// src/components/JurnalTab.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { idr } from '../lib/moneyManagement'

export default function JurnalTab({ session }) {
  const [journal, setJournal] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) fetchJournal()
  }, [session])

  const fetchJournal = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('journal')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
    
    if (data) setJournal(data)
    setLoading(false)
  }

  const exportCSV = () => {
    const header = ["Tanggal", "Kode Saham", "Lot", "Lembar", "Harga Rata-Rata", "Harga Penutupan", "Nominal Posisi", "Nilai Pasar", "PnL", "PnL %", "Alokasi %"]
    const rows = journal.map(j => [
      j.date, j.stock_code, j.lot, j.shares, j.avg_price, j.close_price, j.pos_val, j.cur_val, j.pnl, j.pnl_pct.toFixed(2) + "%", j.alloc_pct.toFixed(2) + "%"
    ])
    
    const csvContent = [header, ...rows].map(e => e.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Jurnal_InvestGuard_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return <div className="animate-pulse text-center py-10 text-brand-navy font-bold">Memuat Jurnal...</div>
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-brand-navy">Jurnal Investasi</h2>
          <p className="text-xs text-gray-500">{journal.length} entri tercatat</p>
        </div>
        {journal.length > 0 && (
          <button 
            onClick={exportCSV} 
            className="bg-brand-green/10 border border-brand-green/20 text-brand-green text-[11px] font-bold px-4 py-2 rounded-xl hover:bg-brand-green/20 transition-all"
          >
            📥 Export CSV
          </button>
        )}
      </div>

      {journal.length === 0 ? (
        <div className="bg-white border border-brand-border rounded-2xl p-8 text-center border-dashed shadow-sm">
          <div className="text-3xl mb-3">📓</div>
          <p className="text-sm font-bold text-brand-navy">Jurnal Masih Kosong</p>
          <p className="text-xs text-gray-500 mt-1">Lakukan sinkronisasi harga untuk mencatat riwayat pertamamu.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {journal.map((j) => (
            <div key={j.id} className="bg-white p-5 rounded-2xl border border-brand-border shadow-sm">
              <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-3">
                <div>
                  <div className="font-extrabold text-brand-navy text-lg">{j.stock_code}</div>
                  <div className="text-[10px] text-gray-400 font-bold">{j.date}</div>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-lg text-xs font-extrabold ${j.pnl_pct >= 0 ? 'bg-emerald-50 text-brand-green' : 'bg-red-50 text-red-500'}`}>
                    {j.pnl_pct >= 0 ? '+' : ''}{j.pnl_pct.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 p-3 rounded-xl">
                  <div className="text-[10px] text-gray-500 font-bold mb-1">Lot / Lembar</div>
                  <div className="text-xs font-extrabold text-brand-navy">{j.lot} Lot <span className="text-gray-400 font-medium">({j.shares} lbr)</span></div>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <div className="text-[10px] text-gray-500 font-bold mb-1">PnL (Rupiah)</div>
                  <div className={`text-xs font-extrabold ${j.pnl >= 0 ? 'text-brand-green' : 'text-red-500'}`}>
                    {j.pnl >= 0 ? '+' : ''}Rp {idr(j.pnl)}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <div className="text-[10px] text-gray-500 font-bold mb-1">Avg Price</div>
                  <div className="text-xs font-extrabold text-brand-navy">Rp {idr(j.avg_price)}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <div className="text-[10px] text-gray-500 font-bold mb-1">Close Price</div>
                  <div className="text-xs font-extrabold text-brand-navy">Rp {idr(j.close_price)}</div>
                </div>
              </div>

              {/* Tampilkan Saran Bandarmologi pada saat harga itu terjadi */}
              <div className="text-[10px] font-extrabold text-gray-400 tracking-widest mb-2 mt-4">SARAN SAAT ITU:</div>
              {j.suggestions && j.suggestions.map((s, i) => (
                <div key={i} className={`mt-2 text-[10px] font-bold p-2.5 rounded-lg border ${
                  s.t === 'red' ? 'bg-red-50 text-red-600 border-red-100' :
                  s.t === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                  s.t === 'green' ? 'bg-green-50 text-brand-green border-green-100' :
                  'bg-gray-50 text-gray-500 border-gray-100'
                }`}>
                  💡 {s.msg}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}