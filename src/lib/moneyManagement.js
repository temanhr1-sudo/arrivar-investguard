// src/lib/moneyManagement.js

// Fungsi pembantu untuk format Rupiah
export const idr = (n) => new Intl.NumberFormat("id-ID").format(Math.round(n));

export function calcMM(equity, avgPrice, curPrice, shares) {
  const posVal = shares * avgPrice;
  const curVal = shares * curPrice;
  const pnl = curVal - posVal;
  const pnlPct = ((curPrice - avgPrice) / avgPrice) * 100;
  const allocPct = equity > 0 ? (posVal / equity) * 100 : 0;
  const lossFromEq = equity > 0 ? (pnl / equity) * 100 : 0;

  // Batasan Maksimal
  const maxLossRm = (equity * 0.11) + pnl; 
  const maxAllocRm = (equity * 0.20) - posVal;

  // Hitung seberapa banyak boleh beli lagi (Average Down/Up)
  const canBuyVal = Math.max(0, Math.min(
    maxLossRm > 0 ? maxLossRm / Math.max(0.001, 1 - curPrice / avgPrice) : 0,
    maxAllocRm
  ));

  const canBuyLot = Math.floor(canBuyVal / curPrice / 100);
  const canBuyShares = canBuyLot * 100;
  
  // Proyeksi Average Price Baru
  const newAvg = canBuyShares > 0 
    ? ((shares * avgPrice) + (canBuyShares * curPrice)) / (shares + canBuyShares) 
    : avgPrice;

  return { posVal, curVal, pnl, pnlPct, allocPct, lossFromEq, canBuyVal, canBuyLot, canBuyShares, newAvg, maxAllocRm };
}

// Fungsi Pembangkit Saran Otomatis
export function autoSugg(mm, code, cashPct) {
  const s = [];
  if (mm.allocPct > 20) {
    s.push({ t: "red", msg: `Alokasi ${code} ${mm.allocPct.toFixed(1)}% — melebihi batas 20%. Dilarang top up.` });
  }
  if (mm.lossFromEq < -11) {
    s.push({ t: "red", msg: `Loss ${code} melampaui 11% equity. Stop tambah posisi, persiapkan cut loss.` });
  } else if (mm.pnlPct < -5 && mm.canBuyLot > 0 && cashPct > 20) {
    s.push({ t: "amber", msg: `${code} turun. Avg down maks ${mm.canBuyLot} lot → avg baru Rp ${idr(mm.newAvg)}.` });
  } else if (mm.pnlPct < -5 && cashPct <= 20) {
    s.push({ t: "amber", msg: `Saham turun tapi cash tinggal ${cashPct.toFixed(0)}%. Jaga likuiditas!` });
  }
  
  // Skenario Take Profit (Capital Gain)
  if (mm.pnlPct >= 35) s.push({ t: "green", msg: `${code} +${mm.pnlPct.toFixed(1)}% — TP3! Jual 30% posisi.` });
  else if (mm.pnlPct >= 20) s.push({ t: "green", msg: `${code} +${mm.pnlPct.toFixed(1)}% — TP2. Pertimbangkan taking profit.` });
  
  if (!s.length) s.push({ t: "neutral", msg: `${code} masih stabil. Hold & Pantau.` });
  
  return s;
}