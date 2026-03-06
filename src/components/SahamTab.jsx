// src/components/SahamTab.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { STOCKS, SC } from '../lib/constants'
import { idr } from '../lib/moneyManagement'

export default function SahamTab({ profile, session, setActiveTab }) {
  const [selectedStock, setSelectedStock] = useState(null)
  const [lot, setLot] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)

  // Ambil daftar saham sesuai fokus user
  const stockList = STOCKS[profile.focus] || STOCKS.dividen

const handleBuy = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const lotNum = parseInt(lot)
    const priceNum = parseFloat(price)
    const shares = lotNum * 100
    const cost = shares * priceNum

    // Validasi basic
    if (cost > profile.capital) {
      alert('Dana tidak mencukupi!')
      setLoading(false)
      return
    }

    try {
      // 1. Cek apakah user sudah punya saham ini di portofolio
      const { data: existingStock, error: fetchError } = await supabase
        .from('portfolio')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('stock_code', selectedStock.code)
        .maybeSingle() // Gunakan maybeSingle agar tidak error jika data belum ada

      if (fetchError) throw fetchError

      if (existingStock) {
        // 2A. JIKA SUDAH PUNYA: Lakukan Average Down / Average Up
        const newShares = existingStock.shares + shares
        const newLot = existingStock.lot + lotNum
        // Rumus Average Price Baru = ((Saham Lama * Harga Lama) + (Saham Baru * Harga Baru)) / Total Saham Baru
        const newAvgPrice = ((existingStock.shares * existingStock.avg_price) + cost) / newShares

        const { error: updateError } = await supabase
          .from('portfolio')
          .update({
            lot: newLot,
            shares: newShares,
            avg_price: newAvgPrice,
            close_price: priceNum, // Update harga penutupan dengan harga transaksi terakhir
            last_updated: new Date().toISOString().split('T')[0]
          })
          .eq('id', existingStock.id)

        if (updateError) throw updateError
        alert(`Berhasil Average Down/Up ${selectedStock.code}!`)

      } else {
        // 2B. JIKA BELUM PUNYA: Buat entri baru
        const { error: insertError } = await supabase
          .from('portfolio')
          .insert([
            {
              user_id: session.user.id,
              stock_code: selectedStock.code,
              sector: selectedStock.sector,
              lot: lotNum,
              shares: shares,
              avg_price: priceNum,
              close_price: priceNum,
              last_updated: new Date().toISOString().split('T')[0]
            }
          ])

        if (insertError) throw insertError
        alert(`Berhasil membeli ${selectedStock.code}!`)
      }

      // Bersihkan form dan kembali ke portofolio
      setSelectedStock(null)
      setLot('')
      setPrice('')
      setActiveTab('portfolio')
      
    } catch (error) {
      alert('Gagal menyimpan transaksi: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-brand-navy">Pilih Saham</h2>
        <p className="text-xs text-gray-500">
          Rekomendasi berdasarkan fokus <span className="font-bold text-brand-green capitalize">{profile.focus}</span> kamu.
        </p>
      </div>

      <div className="space-y-4">
        {stockList.map((s) => {
          const scColor = SC[s.sector] || "#6B6560"
          
          return (
            <div key={s.code} className="bg-white p-5 rounded-2xl border border-brand-border shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3 items-center">
                  {/* Ikon Saham */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs"
                       style={{ backgroundColor: `${scColor}15`, color: scColor }}>
                    {s.code.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-extrabold text-brand-navy">{s.code}</div>
                    <div className="text-[10px] text-gray-500">{s.name}</div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedStock(s)
                    setPrice(s.price.toString()) // Set harga default
                  }}
                  className="bg-brand-navy text-white text-[11px] font-bold px-4 py-1.5 rounded-lg hover:bg-opacity-90"
                >
                  + Beli
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-gray-50 p-2 rounded-lg text-center">
                  <div className="text-[9px] text-gray-400 font-bold mb-1">HARGA</div>
                  <div className="text-xs font-bold text-brand-navy">Rp{idr(s.price)}</div>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg text-center">
                  <div className="text-[9px] text-gray-400 font-bold mb-1">DIV YIELD</div>
                  <div className={`text-xs font-bold ${s.dy > 5 ? 'text-brand-green' : 'text-brand-navy'}`}>{s.dy}%</div>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg text-center">
                  <div className="text-[9px] text-gray-400 font-bold mb-1">CAGR EST</div>
                  <div className="text-xs font-bold text-amber-600">{s.cagr}%</div>
                </div>
              </div>
              
              <span className="inline-block text-[9px] font-bold px-2 py-1 rounded-md" 
                    style={{ backgroundColor: `${scColor}10`, color: scColor }}>
                {s.sector}
              </span>
            </div>
          )
        })}
      </div>

      {/* MODAL BELI SAHAM */}
      {selectedStock && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-navy/40 backdrop-blur-sm p-4 pb-24">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-extrabold text-lg text-brand-navy">Beli {selectedStock.code}</h3>
              <button onClick={() => setSelectedStock(null)} className="text-gray-400 hover:text-red-500 font-bold">✕</button>
            </div>

            <form onSubmit={handleBuy} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Harga Beli (Rp)</label>
                <input type="number" required value={price} onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-brand-navy font-bold focus:border-brand-green outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Jumlah Lot <span className="font-normal">(1 Lot = 100 lbr)</span></label>
                <input type="number" required min="1" value={lot} onChange={(e) => setLot(e.target.value)} placeholder="Contoh: 10"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-brand-navy font-bold focus:border-brand-green outline-none" />
              </div>

              {lot && price && (
                <div className="bg-brand-green/10 border border-brand-green/20 rounded-xl p-4 mt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-green font-semibold">Total Biaya:</span>
                    <span className="text-brand-green font-extrabold">Rp {idr(parseInt(lot) * 100 * parseFloat(price))}</span>
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full bg-brand-green text-white font-bold py-3.5 rounded-xl hover:bg-opacity-90 mt-4">
                {loading ? 'Memproses...' : 'Konfirmasi Beli'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}