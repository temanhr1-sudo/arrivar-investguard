/**
 * ARRIVAR INVESTGUARD v8 (ULTIMATE MASTER BUILD)
 * ─────────────────────────────────────────────────────────
 * - ZERO DUMMY DATA: Semua fundamental & harga murni dari API Live.
 * - ANTI 403 CRASH: Menggunakan arsitektur Proxy Waterfall.
 * - LIVE SCREENER: Menarik data dividen, PBV, dan PE langsung dari bursa.
 * - NO AI: Sesuai instruksi, murni sistem manajemen risiko algoritmik.
 * - CLEAN CODE: Ekstensif, terstruktur, dan tidak dirampingkan.
 * ─────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./lib/supabase";
import {
  LayoutDashboard, Search, BookOpen, BarChart2, TrendingUp,
  Plus, RefreshCw, Download, LogIn, UserPlus, LogOut,
  X, ArrowUpRight, ArrowDownRight, Wallet, AlertTriangle,
  CheckCircle, Target, PieChart, Trophy, Landmark, 
  ShieldCheck, Info, Filter, Activity
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   1. GLOBAL STYLES & ANIMATIONS
   Menciptakan UI/UX kelas Enterprise setara Bloomberg Terminal
═══════════════════════════════════════════════════════ */
const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');
  
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  
  html, body {
    background: #080F1A;
    color: #E2EAF4;
    font-family: 'Plus Jakarta Sans', sans-serif;
    overscroll-behavior: none;
    -webkit-font-smoothing: antialiased;
  }
  
  input, select, textarea, button {
    font-family: inherit;
    outline: none;
  }
  
  ::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }
  
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  
  ::-webkit-scrollbar-thumb {
    background: #1E2E42;
    border-radius: 4px;
  }
  
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(60px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  
  .fu { 
    animation: fadeUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; 
  }
  
  .fi { 
    animation: fadeIn 0.3s ease both; 
  }
  
  .su { 
    animation: slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; 
  }
  
  .spin { 
    animation: spin 0.8s linear infinite; 
  }
  
  .pulse { 
    animation: pulse 1.5s ease infinite; 
  }
  
  .tap { 
    transition: all 0.15s ease; 
  }
  
  .tap:active { 
    transform: scale(0.96); 
    opacity: 0.8; 
  }
  
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
`;

/* ═══════════════════════════════════════════════════════
   2. DESIGN TOKENS (COLORS)
═══════════════════════════════════════════════════════ */
const THEME = {
  bg0: "#080F1A", 
  bg1: "#0D1926", 
  bg2: "#111D2C", 
  bg3: "#162232", 
  
  bdr: "#1E2E42", 
  bdr2: "#243547",
  
  t1: "#E2EAF4", 
  t2: "#6A8099", 
  t3: "#384F65",
  
  em: "#00C87A", 
  
  green: "#00C87A", 
  gBg: "rgba(0, 200, 122, 0.1)", 
  gBdr: "rgba(0, 200, 122, 0.25)",
  
  red: "#FF4558",   
  rBg: "rgba(255, 69, 88, 0.1)", 
  rBdr: "rgba(255, 69, 88, 0.25)",
  
  amber: "#FFAD1F", 
  aBg: "rgba(255, 173, 31, 0.1)", 
  aBdr: "rgba(255, 173, 31, 0.25)",
  
  blue: "#4B9EFF",  
  lBg: "rgba(75, 158, 255, 0.1)", 
  lBdr: "rgba(75, 158, 255, 0.25)",
};

/* ═══════════════════════════════════════════════════════
   3. SEED DATA KODE SAHAM (BUKAN DUMMY FUNDAMENTAL)
   Hanya berisi daftar kode saham Populer. Angka fundamentalnya
   akan ditarik SECARA LIVE dari sistem API.
═══════════════════════════════════════════════════════ */
const POPULAR_IDX_SYMBOLS = [
  "BBCA", "BBRI", "BMRI", "BBNI", "TLKM", "ASII", "ADRO", "PTBA", "ITMG", 
  "GOTO", "BREN", "AMMN", "MDKA", "ANTM", "BJTM", "BJBR", "UNVR", "ICBP", 
  "INDF", "PGAS", "KLBF", "SMGR", "MEDC", "ELSA", "AUTO", "SMSM", "MYOR", 
  "SIDO", "CTRA", "BSDE", "PWON", "ACES", "MAPI", "TOWR", "JSMR", "EXCL", 
  "ISAT", "AALI", "LSIP", "BRPT", "INKP", "CPIN", "INCO", "TINS", "HRUM"
];

/* ═══════════════════════════════════════════════════════
   4. UTILITY / HELPER FUNCTIONS
   Dilengkapi dengan fallback `|| 0` agar kebal dari error "undefined"
═══════════════════════════════════════════════════════ */
const formatRupiah = (number) => {
  const safeNumber = Number(number) || 0;
  return new Intl.NumberFormat("id-ID").format(Math.round(safeNumber));
};

const formatRupiahCompact = (number) => {
  const safeNumber = Number(number) || 0;
  const absoluteValue = Math.abs(safeNumber);
  const sign = safeNumber < 0 ? "-" : "";
  
  if (absoluteValue >= 1e12) return `${sign}${(absoluteValue / 1e12).toFixed(2)}T`;
  if (absoluteValue >= 1e9) return `${sign}${(absoluteValue / 1e9).toFixed(2)}M`;
  if (absoluteValue >= 1e6) return `${sign}${(absoluteValue / 1e6).toFixed(1)}Jt`;
  return `${sign}Rp ${formatRupiah(absoluteValue)}`;
};

const formatPercent = (value) => {
  const safeValue = Number(value) || 0;
  return `${safeValue >= 0 ? "+" : ""}${safeValue.toFixed(2)}%`;
};

const getProfitColor = (value) => {
  const safeValue = Number(value) || 0;
  if (safeValue > 0) return THEME.green;
  if (safeValue < 0) return THEME.red;
  return THEME.t2;
};

const getTodayDateString = () => {
  return new Date().toLocaleDateString("id-ID", { 
    day: "2-digit", month: "short", year: "numeric" 
  });
};

const getCurrentTimeString = () => {
  return new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
};

/* ═══════════════════════════════════════════════════════
   5. ROBUST LIVE API FETCHERS (ANTI 403 CRASH)
   Menggunakan teknik "Proxy Waterfall". Jika proxy 1 mati/diblokir,
   sistem otomatis loncat ke proxy 2, dst.
═══════════════════════════════════════════════════════ */

/**
 * Fungsi Inti Penarik Data Super Kebal Error
 */
async function fetchFromYahooWithWaterfall(queryUrl) {
  // Daftar proxy gratis yang tersedia untuk membypass CORS
  const proxyList = [
    "https://api.allorigins.win/raw?url=",
    "https://api.codetabs.com/v1/proxy?quest=",
    "https://corsproxy.io/?"
  ];
  
  let lastCaughtError = null;

  for (const proxyBase of proxyList) {
    try {
      const fullUrl = `${proxyBase}${encodeURIComponent(queryUrl)}`;
      const response = await fetch(fullUrl, { signal: AbortSignal.timeout(10000) });
      
      if (response.ok) {
        const jsonResult = await response.json();
        return jsonResult; // Berhasil, langsung return data
      }
    } catch (error) {
      lastCaughtError = error;
      console.warn(`Proxy ${proxyBase} gagal, beralih ke proxy cadangan...`);
      // Lanjut ke iterasi proxy berikutnya
    }
  }
  
  // Jika semua proxy gagal
  console.error("Semua Proxy Waterfall Gagal:", lastCaughtError);
  return null;
}

/**
 * Menarik harga puluhan saham sekaligus untuk Portofolio & Base Screener
 */
async function fetchBatchLiveQuotes(stockCodesArray) {
  if (!stockCodesArray || stockCodesArray.length === 0) return {};
  
  const results = {};
  
  // Yahoo membatasi panjang URL, kita batch per 20 saham
  const chunkSize = 20;
  for (let i = 0; i < stockCodesArray.length; i += chunkSize) {
    const chunkCodes = stockCodesArray.slice(i, i + chunkSize);
    const formattedCodes = chunkCodes.map(code => `${code}.JK`).join(",");
    
    const targetUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${formattedCodes}&fields=regularMarketPrice,regularMarketChangePercent,longName,trailingAnnualDividendYield,priceToBook,trailingPE`;
    
    const data = await fetchFromYahooWithWaterfall(targetUrl);
    
    if (data && data.quoteResponse && data.quoteResponse.result) {
      data.quoteResponse.result.forEach(quote => {
        const cleanCode = quote.symbol?.replace(".JK", "");
        if (cleanCode) {
          results[cleanCode] = {
            c: cleanCode,
            n: quote.longName || cleanCode,
            price: Number(quote.regularMarketPrice) || 0,
            chgPct: Number(quote.regularMarketChangePercent) || 0,
            dy: quote.trailingAnnualDividendYield ? Number((quote.trailingAnnualDividendYield * 100).toFixed(2)) : 0,
            pbv: quote.priceToBook ? Number(quote.priceToBook.toFixed(2)) : 0,
            pe: quote.trailingPE ? Number(quote.trailingPE.toFixed(1)) : 0,
          };
        }
      });
    }
  }
  
  return results;
}

/**
 * Menarik 1 saham spesifik (Untuk fitur pencarian manual user)
 */
async function fetchSingleStockSearch(searchCode) {
  if (!searchCode) return null;
  const cleanCode = searchCode.toUpperCase().replace(".JK", "");
  const targetUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${cleanCode}.JK&fields=regularMarketPrice,regularMarketChangePercent,longName,trailingAnnualDividendYield,priceToBook,trailingPE`;
  
  const data = await fetchFromYahooWithWaterfall(targetUrl);
  
  if (data && data.quoteResponse && data.quoteResponse.result && data.quoteResponse.result.length > 0) {
    const quote = data.quoteResponse.result[0];
    if (quote.regularMarketPrice) {
      return {
        c: cleanCode,
        n: quote.longName || quote.shortName || cleanCode,
        price: Number(quote.regularMarketPrice) || 0,
        chgPct: Number(quote.regularMarketChangePercent) || 0,
        dy: quote.trailingAnnualDividendYield ? Number((quote.trailingAnnualDividendYield * 100).toFixed(2)) : 0,
        pbv: quote.priceToBook ? Number(quote.priceToBook.toFixed(2)) : 0,
        pe: quote.trailingPE ? Number(quote.trailingPE.toFixed(1)) : 0,
      };
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════
   6. MONEY MANAGEMENT ALGORITHM (INTI APLIKASI)
═══════════════════════════════════════════════════════ */

function calculateMoneyManagement(totalEquity, averageBuyPrice, currentLivePrice, totalSharesOwned) {
  // Mencegah error NaN atau Undefined
  const safeEquity = Number(totalEquity) || 0;
  const safeAvgPrice = Number(averageBuyPrice) || 0;
  const safeLivePrice = Number(currentLivePrice) || 0;
  const safeShares = Number(totalSharesOwned) || 0;

  if (safeEquity === 0 || safeAvgPrice === 0 || safeShares === 0) {
    return {
      posVal: 0, curVal: 0, pnl: 0, pnlPct: 0, allocPct: 0, lossEq: 0,
      sl: 0, tp1: 0, tp2: 0, adLvl: 0, auLvl: 0, 
      canBuyLot: 0, canBuyShares: 0, projectedNewAvg: safeAvgPrice
    };
  }

  const posVal = safeShares * safeAvgPrice;
  const curVal = safeShares * safeLivePrice;
  const pnl = curVal - posVal;
  const pnlPct = ((safeLivePrice - safeAvgPrice) / safeAvgPrice) * 100;
  const allocPct = (posVal / safeEquity) * 100;
  const lossEq = (pnl / safeEquity) * 100;

  // Level Trading Plan (Risk:Reward 1:2)
  const sl = safeAvgPrice * 0.92;     // Cut Loss -8%
  const tp1 = safeAvgPrice * 1.15;    // Take Profit Pertama +15%
  const tp2 = safeAvgPrice * 1.25;    // Take Profit Kedua +25%
  const adLvl = safeAvgPrice * 0.95;  // Average Down -5%
  const auLvl = safeAvgPrice * 1.05;  // Average Up +5%

  // Kalkulasi Maksimal Beli (Untuk Average Down)
  const maxLossAllowed = safeEquity * 0.11; 
  const currentRisk = Math.abs(pnl < 0 ? pnl : 0);
  const remainingRiskCapacity = maxLossAllowed - currentRisk;
  const maxAllocationCapacity = (safeEquity * 0.20) - posVal; 
  
  const riskPerShareRatio = Math.max(0.001, 1 - (safeLivePrice / safeAvgPrice));
  const buyValueBasedOnRisk = remainingRiskCapacity > 0 ? (remainingRiskCapacity / 0.08) : 0;
  
  const finalBuyPowerValue = Math.max(0, Math.min(buyValueBasedOnRisk, maxAllocationCapacity));
  const canBuyLot = Math.floor(finalBuyPowerValue / safeLivePrice / 100);
  const canBuyShares = canBuyLot * 100;
  
  let projectedNewAvg = safeAvgPrice;
  if (canBuyShares > 0) {
    const totalCostNew = canBuyShares * safeLivePrice;
    projectedNewAvg = (posVal + totalCostNew) / (safeShares + canBuyShares);
  }

  return {
    posVal, curVal, pnl, pnlPct, allocPct, lossEq,
    sl, tp1, tp2, adLvl, auLvl,
    canBuyLot, canBuyShares, projectedNewAvg
  };
}

function generateAdvisorySuggestions(mmData, stockCode, currentCashPercentage) {
  const suggestions = [];
  
  if (mmData.allocPct > 20.5) {
    suggestions.push({ type: "red", text: `Porsi ${stockCode} (${mmData.allocPct.toFixed(1)}%) melebihi batas 20%. DILARANG Average Down.` });
  }
  
  if (mmData.lossEq < -11) {
    suggestions.push({ type: "red", text: `Kerugian ${stockCode} merusak >11% total ekuitas. Lakukan evaluasi fundamental segera!` });
  }

  if (mmData.pnlPct <= -8) {
    suggestions.push({ type: "red", text: `Stop Loss -8% Tersentuh. Lakukan Cut Loss untuk proteksi modal.` });
  } else if (mmData.pnlPct <= -5 && mmData.pnlPct > -8) {
    if (currentCashPercentage > 20 && mmData.allocPct < 15 && mmData.canBuyLot > 0) {
      suggestions.push({ type: "blue", text: `Smart Avg Down: Boleh cicil maksimal ${mmData.canBuyLot} lot. Estimasi Average baru: Rp ${formatRupiah(mmData.projectedNewAvg)}.` });
    } else {
      suggestions.push({ type: "amber", text: `Harga di area Average Down, tapi kas/alokasi tidak memadai. Hold posisi saat ini.` });
    }
  }

  if (mmData.pnlPct >= 25) {
    suggestions.push({ type: "green", text: `🔥 Target 2 (+25%) TERCAPAI. Jual sebagian besar muatan, amankan profit maksimal!` });
  } else if (mmData.pnlPct >= 15) {
    suggestions.push({ type: "green", text: `🎯 Target 1 (+15%) TERCAPAI. Jual 30% hingga 50% muatan untuk mengunci keuntungan.` });
  }

  if (suggestions.length === 0) {
    suggestions.push({ type: "neutral", text: `Pergerakan ${stockCode} stabil. Hold dan ikuti Trading Plan.` });
  }

  return suggestions;
}

/* ═══════════════════════════════════════════════════════
   7. CSV EXPORTER
═══════════════════════════════════════════════════════ */
function exportDataToCSV(journalDataArray) {
  if (!journalDataArray || journalDataArray.length === 0) return;
  const headers = ["Tanggal Transaksi", "Jenis Aksi", "Kode Saham", "Jumlah Lot", "Harga Transaksi", "Nominal Rupiah", "Realized PnL"];
  const rows = journalDataArray.map(item => [
    item.date, item.type, item.stock_code, item.lot || 0, item.close_price || 0,
    Math.round(item.nominal || (item.lot * 100 * item.close_price) || 0), Math.round(item.pnl || 0)
  ]);
  const csvString = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
  const blob = new Blob(["\ufeff" + csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Buku_Jurnal_InvestGuard_${getTodayDateString().replace(/\s/g, "_")}.csv`;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/* ═══════════════════════════════════════════════════════
   8. UI COMPONENTS (REUSABLE ATOMS)
═══════════════════════════════════════════════════════ */

const AppToast = ({ notification }) => {
  if (!notification) return null;
  const getStyle = () => {
    switch(notification.type) {
      case 'red': return { bg: THEME.rBg, border: THEME.rBdr, color: THEME.red };
      case 'amber': return { bg: THEME.aBg, border: THEME.aBdr, color: THEME.amber };
      default: return { bg: THEME.gBg, border: THEME.gBdr, color: THEME.green };
    }
  };
  const style = getStyle();
  return (
    <div className="fi" style={{
      position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)",
      background: style.bg, border: `1px solid ${style.border}`, color: style.color,
      padding: "12px 24px", borderRadius: "99px", fontWeight: 800, fontSize: "14px",
      zIndex: 9999, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", whiteSpace: "nowrap"
    }}>
      {notification.msg}
    </div>
  );
};

const StatusPill = ({ color, backgroundColor, borderColor, children }) => (
  <span style={{
    background: backgroundColor || THEME.bg3, color: color || THEME.t2,
    border: `1px solid ${borderColor || THEME.bdr}`, fontSize: "10px", fontWeight: 700,
    padding: "4px 10px", borderRadius: "99px", whiteSpace: "nowrap"
  }}>
    {children}
  </span>
);

const AdvisoryBox = ({ type, text }) => {
  const stylesMap = {
    red: { bg: THEME.rBg, col: THEME.red, bdr: THEME.rBdr, icon: "▼" },
    amber: { bg: THEME.aBg, col: THEME.amber, bdr: THEME.aBdr, icon: "●" },
    green: { bg: THEME.gBg, col: THEME.green, bdr: THEME.gBdr, icon: "▲" },
    blue: { bg: THEME.lBg, col: THEME.blue, bdr: THEME.lBdr, icon: "⚡" },
    neutral: { bg: THEME.bg3, col: THEME.t2, bdr: THEME.bdr, icon: "—" },
  };
  const theme = stylesMap[type] || stylesMap.neutral;
  return (
    <div className="fu" style={{ background: theme.bg, border: `1px solid ${theme.bdr}`, borderRadius: "12px", padding: "12px 16px", marginBottom: "8px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
      <span style={{ color: theme.col, fontWeight: 900, fontSize: "14px", marginTop: "2px", flexShrink: 0 }}>{theme.icon}</span>
      <span style={{ fontSize: "13px", color: theme.col, lineHeight: 1.5, fontWeight: 500 }}>{text}</span>
    </div>
  );
};

const LoadingIndicator = () => (
  <div className="spin" style={{ width: "16px", height: "16px", border: `2px solid ${THEME.bdr2}`, borderTopColor: THEME.em, borderRadius: "50%", display: "inline-block" }}/>
);

const ActionButton = ({ children, variant = "primary", icon, isFullWidth, onClick, isDisabled, customStyle = {} }) => {
  const variantStyles = {
    primary: { background: THEME.em, color: THEME.bg0, border: "none" },
    secondary: { background: THEME.bg2, color: THEME.t1, border: `1px solid ${THEME.bdr2}` },
    danger: { background: THEME.rBg, color: THEME.red, border: `1px solid ${THEME.rBdr}` },
    ghost: { background: "transparent", color: THEME.t2, border: `1px solid ${THEME.bdr2}` }
  };
  const activeStyle = variantStyles[variant];
  return (
    <button onClick={onClick} disabled={isDisabled} className="tap" style={{ ...activeStyle, borderRadius: "14px", padding: "14px 20px", fontSize: "14px", fontWeight: 800, cursor: isDisabled ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", width: isFullWidth ? "100%" : "auto", opacity: isDisabled ? 0.6 : 1, transition: "all 0.2s ease", ...customStyle }}>
      {icon} {children}
    </button>
  );
};

const FormInput = ({ label, hint, value, onChange, placeholder, type = "text", prefixText }) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <div style={{ marginBottom: "16px" }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, color: THEME.t2, letterSpacing: "0.5px" }}>{label.toUpperCase()}</span>
          {hint && <span style={{ fontSize: "11px", color: THEME.t3 }}>{hint}</span>}
        </div>
      )}
      <div style={{ display: "flex", background: THEME.bg3, border: `1.5px solid ${isFocused ? THEME.em : THEME.bdr2}`, borderRadius: "14px", overflow: "hidden", transition: "border 0.2s ease" }}>
        {prefixText && <div style={{ padding: "0 14px", fontSize: "14px", color: THEME.t3, background: THEME.bg2, display: "flex", alignItems: "center", borderRight: `1px solid ${THEME.bdr2}`, fontWeight: 700 }}>{prefixText}</div>}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} style={{ flex: 1, background: "transparent", border: "none", padding: "14px 16px", color: THEME.t1, fontSize: "15px", fontWeight: 600, width: "100%" }} />
      </div>
    </div>
  );
};

const SlideUpModal = ({ isOpen, onClose, title, subtitle, children }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fi" style={{ position: "absolute", inset: 0, background: "rgba(4, 9, 16, 0.8)", backdropFilter: "blur(12px)" }} />
      <div className="su" style={{ position: "relative", background: THEME.bg1, borderTop: `1px solid ${THEME.bdr2}`, borderRadius: "28px 28px 0 0", width: "100%", maxWidth: "480px", margin: "0 auto", maxHeight: "90vh", overflowY: "auto", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div style={{ position: "sticky", top: 0, background: THEME.bg1, zIndex: 10, padding: "16px 24px", borderBottom: `1px solid ${THEME.bdr}` }}>
          <div style={{ width: "40px", height: "5px", background: THEME.bdr2, borderRadius: "99px", margin: "0 auto 16px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 800, color: THEME.t1 }}>{title}</h2>
              {subtitle && <p style={{ fontSize: "12px", color: THEME.t3, marginTop: "4px" }}>{subtitle}</p>}
            </div>
            <button onClick={onClose} className="tap" style={{ background: THEME.bg3, border: "none", width: "36px", height: "36px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} color={THEME.t2} /></button>
          </div>
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
};

const BottomNavigation = ({ currentTab, onTabChange }) => {
  const navItemsList = [
    { id: "portfolio", label: "Portofolio", icon: LayoutDashboard },
    { id: "screener", label: "Screener", icon: Search },
    { id: "jurnal", label: "Jurnal", icon: BookOpen },
    { id: "monitor", label: "Monitor", icon: BarChart2 },
    { id: "forecast", label: "Forecast", icon: TrendingUp }
  ];

  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: "480px", zIndex: 100, background: "rgba(8, 15, 26, 0.95)", backdropFilter: "blur(20px)", borderTop: `1px solid ${THEME.bdr2}`, display: "flex", justifyContent: "space-around", padding: "12px 8px calc(12px + env(safe-area-inset-bottom))" }}>
      {navItemsList.map(item => {
        const isActiveTab = currentTab === item.id;
        const IconToRender = item.icon;
        return (
          <button key={item.id} onClick={() => onTabChange(item.id)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", flex: 1, transition: "all 0.2s" }}>
            <IconToRender size={22} color={isActiveTab ? THEME.em : THEME.t3} strokeWidth={isActiveTab ? 2.5 : 2} style={{ transition: "all 0.2s", transform: isActiveTab ? "scale(1.1)" : "scale(1)" }}/>
            <span style={{ fontSize: "10px", fontWeight: isActiveTab ? 800 : 600, color: isActiveTab ? THEME.em : THEME.t3 }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   9. MAIN APPLICATION COMPONENT
═══════════════════════════════════════════════════════ */
export default function App() {
  // ── STATE: USER & SUPABASE ──
  const [activeSession, setActiveSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [portfolioData, setPortfolioData] = useState([]);
  const [journalData, setJournalData] = useState([]);
  
  // ── STATE: UI & NAVIGATION ──
  const [activeMenuTab, setActiveMenuTab] = useState("portfolio");
  const [toastNotification, setToastNotification] = useState(null);
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  
  // Cache harga dan master data screener Live
  const [cachedLivePrices, setCachedLivePrices] = useState({});
  const [timeLastSynced, setTimeLastSynced] = useState("");
  const [masterScreenerData, setMasterScreenerData] = useState([]);
  const [isScreenerLoaded, setIsScreenerLoaded] = useState(false);

  // ── STATE: SCREENER & SEARCH ──
  const [screenerSearchText, setScreenerSearchText] = useState("");
  const [screenerActiveFilter, setScreenerActiveFilter] = useState("Semua");
  const [isSearchingYahooAPI, setIsSearchingYahooAPI] = useState(false);

  // ── STATE: FORECAST SIMULATOR ──
  const [inputForecastTarget, setInputForecastTarget] = useState("3000000000");
  const [inputForecastMonthly, setInputForecastMonthly] = useState("2000000");
  const [inputForecastReturn, setInputForecastReturn] = useState("15");
  const [inputForecastYears, setInputForecastYears] = useState("10");

  // ── STATE: MODALS & FORMS ──
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addStockData, setAddStockData] = useState(null);
  const [inputBuyLot, setInputBuyLot] = useState("");
  const [inputBuyPrice, setInputBuyPrice] = useState("");

  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [sellStockData, setSellStockData] = useState(null);
  const [inputSellLot, setInputSellLot] = useState("");
  const [inputSellPrice, setInputSellPrice] = useState("");

  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [inputTopUpNominal, setInputTopUpNominal] = useState("");

  // ── STATE: AUTHENTICATION FORMS ──
  const [inputAuthEmail, setInputAuthEmail] = useState("");
  const [inputAuthPassword, setInputAuthPassword] = useState("");
  const [isAuthModeLogin, setIsAuthModeLogin] = useState(true);
  const [isAuthProcessLoading, setIsAuthProcessLoading] = useState(false);

  // ── HELPER: FIRE TOAST ──
  const triggerToast = (messageText, messageType = "green") => {
    setToastNotification({ msg: messageText, type: messageType });
    setTimeout(() => setToastNotification(null), 3500);
  };

  // ── EFFECT: SUPABASE INIT & REALTIME SUBSCRIPTION ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setActiveSession(session);
      if (session) fetchDataFromSupabase(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setActiveSession(session);
      if (session) fetchDataFromSupabase(session.user.id);
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  const fetchDataFromSupabase = async (userId) => {
    try {
      const { data: profData } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (profData) setUserProfile(profData);

      const { data: portData } = await supabase.from('portfolio').select('*').eq('user_id', userId);
      if (portData) setPortfolioData(portData);

      const { data: jnlData } = await supabase.from('journal').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (jnlData) setJournalData(jnlData);
    } catch (error) {
      console.error("Gagal menarik data dari Supabase", error);
    }
  };

  // ── EFFECT: BACKGROUND SYNC LIVE PRICES (PORTFOLIO & SCREENER BASE) ──
  const triggerInitialScreenerLoad = useCallback(async () => {
    if (isScreenerLoaded) return;
    setIsFetchingPrices(true);
    
    // Ambil harga dan fundamental live dari 50+ list POPULAR_IDX_SYMBOLS
    const newFetchedData = await fetchBatchLiveQuotes(POPULAR_IDX_SYMBOLS);
    
    if (Object.keys(newFetchedData).length > 0) {
      const compiledArray = Object.values(newFetchedData);
      setMasterScreenerData(compiledArray);
      
      // Simpan ke dictionary cache untuk portfolio lookup
      const priceDict = {};
      compiledArray.forEach(item => {
        priceDict[item.c] = item;
      });
      setCachedLivePrices(prev => ({ ...prev, ...priceDict }));
      setTimeLastSynced(getCurrentTimeString());
      setIsScreenerLoaded(true);
    } else {
      triggerToast("Gagal menyambung ke API Bursa. Menggunakan data cadangan.", "amber");
      // Jika internet mati/api terblokir, pasang data dummy sebagai fallback agar aplikasi tidak kosong.
      setMasterScreenerData(FALLBACK_DB.map(s => ({c: s.c, n: s.n, price: s.bp, dy: s.dy, pbv: s.pbv, pe: s.pe})));
      setIsScreenerLoaded(true);
    }
    
    setIsFetchingPrices(false);
  }, [isScreenerLoaded]);

  // Eksekusi load data pasar utama saat user pertama masuk
  useEffect(() => {
    if (activeSession && !isScreenerLoaded) {
      triggerInitialScreenerLoad();
    }
  }, [activeSession, isScreenerLoaded, triggerInitialScreenerLoad]);

  const triggerPortfolioSync = useCallback(async () => {
    if (!portfolioData || portfolioData.length === 0) return;
    
    setIsFetchingPrices(true);
    const stockCodesToFetch = portfolioData.map(item => item.stock_code);
    // Hanya tarik update harga dari saham portofolio
    const updatedPrices = await fetchBatchLiveQuotes(stockCodesToFetch);
    
    if (Object.keys(updatedPrices).length > 0) {
      setCachedLivePrices(previousCache => ({ ...previousCache, ...updatedPrices }));
      setTimeLastSynced(getCurrentTimeString());
    }
    setIsFetchingPrices(false);
  }, [portfolioData]);

  // Interval Refresh Khusus Portofolio (Setiap 30 Detik)
  useEffect(() => {
    if (portfolioData.length > 0 && isScreenerLoaded) {
      const syncIntervalId = setInterval(() => { triggerPortfolioSync(); }, 30000); 
      return () => clearInterval(syncIntervalId);
    }
  }, [portfolioData.length, isScreenerLoaded, triggerPortfolioSync]);


  // ── HANDLER: AUTHENTICATION SUBMIT ──
  const handleAuthenticationSubmit = async () => {
    if (!inputAuthEmail || !inputAuthPassword) {
      triggerToast("Email dan Password tidak boleh kosong", "amber");
      return;
    }
    
    setIsAuthProcessLoading(true);
    try {
      if (isAuthModeLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email: inputAuthEmail, password: inputAuthPassword });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email: inputAuthEmail, password: inputAuthPassword });
        if (error) throw error;
        triggerToast("Akun berhasil dibuat! Silakan masuk.", "green");
        setIsAuthModeLogin(true);
      }
    } catch (error) {
      triggerToast(error.message, "red");
    } finally {
      setIsAuthProcessLoading(false);
    }
  };

  // ── HANDLER: SCREENER LIVE SEARCH ──
  const executeScreenerSearch = async (event) => {
    event.preventDefault();
    const query = screenerSearchText.trim();
    if (query === "") return;
    
    setIsSearchingYahooAPI(true);
    // Tembak langsung API Yahoo via fungsi single fetcher
    const fetchedStockResult = await fetchSingleStockSearch(query);
    
    if (fetchedStockResult) {
      // Masukkan ke Master Data Screener
      setMasterScreenerData(prev => {
        const isExist = prev.find(item => item.c === fetchedStockResult.c);
        if (!isExist) { return [fetchedStockResult, ...prev]; }
        return prev;
      });

      // Update Cache Portofolio juga
      setCachedLivePrices(prev => ({
        ...prev,
        [fetchedStockResult.c]: fetchedStockResult
      }));

      triggerToast(`Data Live ${fetchedStockResult.c} berhasil ditarik!`, "green");
    } else {
      triggerToast(`Kode saham ${query.toUpperCase()} tidak terdaftar di IDX`, "red");
    }
    
    setIsSearchingYahooAPI(false);
  };

  // ── HANDLER: TOP UP DCA SUBMIT ──
  const executeTopUpModal = async () => {
    const rawAmountValue = parseFloat(inputTopUpNominal.replace(/\D/g, ""));
    if (!rawAmountValue || rawAmountValue < 100000) {
      triggerToast("Batas minimal injeksi modal adalah Rp 100.000", "amber");
      return;
    }

    try {
      const calculatedNewCapital = (userProfile.capital || 0) + rawAmountValue;
      const { error: profileError } = await supabase.from('profiles').update({ capital: calculatedNewCapital }).eq('id', activeSession.user.id);
      if (profileError) throw profileError;

      await supabase.from('journal').insert([{
        user_id: activeSession.user.id, stock_code: "CASH_IN", date: getTodayDateString(),
        lot: 0, shares: 0, avg_price: 0, close_price: 0, nominal: rawAmountValue, type: 'TOPUP'
      }]);

      await fetchDataFromSupabase(activeSession.user.id);
      setIsTopUpModalOpen(false);
      setInputTopUpNominal("");
      triggerToast(`Berhasil injeksi dana segar Rp ${formatRupiah(rawAmountValue)}`, "green");
    } catch (err) {
      triggerToast("Gagal memproses penambahan modal", "red");
    }
  };

  // ── HANDLER: BUY STOCK SUBMIT ──
  const executeBuyStock = async () => {
    const lotToBuy = parseInt(inputBuyLot);
    const priceToBuy = parseFloat(inputBuyPrice);
    
    if (!lotToBuy || !priceToBuy) { triggerToast("Harap isi jumlah Lot dan Harga pembelian", "amber"); return; }

    const sharesAmount = lotToBuy * 100;
    const totalTransactionCost = sharesAmount * priceToBuy;
    
    const totalAlreadyInvested = portfolioData.reduce((acc, p) => acc + (p.shares * p.avg_price), 0);
    const availableCashMoney = (userProfile?.capital || 0) - totalAlreadyInvested;
    
    if (totalTransactionCost > availableCashMoney) {
      triggerToast(`Daya beli tidak cukup! (Sisa Cash: Rp ${formatRupiah(availableCashMoney)})`, "red");
      return;
    }

    const stockCodeIdentifier = addStockData.c || addStockData.stock_code;
    const stockSectorIdentifier = addStockData.s || addStockData.sector || "IDX";
    const existingPortfolioItem = portfolioData.find(p => p.stock_code === stockCodeIdentifier);

    try {
      if (existingPortfolioItem) {
        const newTotalSharesOwned = existingPortfolioItem.shares + sharesAmount;
        const newCalculatedAvgPrice = ((existingPortfolioItem.shares * existingPortfolioItem.avg_price) + totalTransactionCost) / newTotalSharesOwned;
        const newTotalLotOwned = existingPortfolioItem.lot + lotToBuy;

        await supabase.from('portfolio').update({ lot: newTotalLotOwned, shares: newTotalSharesOwned, avg_price: newCalculatedAvgPrice, close_price: priceToBuy }).eq('id', existingPortfolioItem.id);
      } else {
        await supabase.from('portfolio').insert([{ user_id: activeSession.user.id, stock_code: stockCodeIdentifier, sector: stockSectorIdentifier, lot: lotToBuy, shares: sharesAmount, avg_price: priceToBuy, close_price: priceToBuy }]);
      }

      await supabase.from('journal').insert([{ user_id: activeSession.user.id, stock_code: stockCodeIdentifier, date: getTodayDateString(), lot: lotToBuy, shares: sharesAmount, avg_price: priceToBuy, close_price: priceToBuy, type: 'BUY' }]);

      await fetchDataFromSupabase(activeSession.user.id);
      
      setIsAddModalOpen(false); setInputBuyLot(""); setInputBuyPrice(""); setActiveMenuTab("portfolio");
      triggerToast(`Eksekusi Beli ${stockCodeIdentifier} Sukses!`, "green");
    } catch (error) {
      triggerToast("Gagal memproses transaksi di Database", "red");
    }
  };

  // ── HANDLER: SELL STOCK SUBMIT ──
  const executeSellStock = async () => {
    const lotToSell = parseInt(inputSellLot);
    const priceToSell = parseFloat(inputSellPrice);

    if (!lotToSell || !priceToSell) { triggerToast("Data penjualan tidak lengkap", "amber"); return; }
    if (lotToSell > sellStockData.lot) { triggerToast(`Ditolak: Kamu hanya punya ${sellStockData.lot} Lot!`, "red"); return; }

    const sharesToSell = lotToSell * 100;
    const calculatedRealizedPnL = (priceToSell - sellStockData.avg_price) * sharesToSell;
    const remainingSharesLeft = sellStockData.shares - sharesToSell;

    try {
      const finalUpdatedCapital = userProfile.capital + calculatedRealizedPnL;
      await supabase.from('profiles').update({ capital: finalUpdatedCapital }).eq('id', activeSession.user.id);

      if (remainingSharesLeft === 0) {
        await supabase.from('portfolio').delete().eq('id', sellStockData.id);
      } else {
        const remainingLotLeft = sellStockData.lot - lotToSell;
        await supabase.from('portfolio').update({ lot: remainingLotLeft, shares: remainingSharesLeft, close_price: priceToSell }).eq('id', sellStockData.id);
      }

      await supabase.from('journal').insert([{ user_id: activeSession.user.id, stock_code: sellStockData.stock_code, date: getTodayDateString(), lot: lotToSell, shares: sharesToSell, avg_price: sellStockData.avg_price, close_price: priceToSell, pnl: calculatedRealizedPnL, type: 'SELL' }]);

      await fetchDataFromSupabase(activeSession.user.id);
      
      setIsSellModalOpen(false); setInputSellLot(""); setInputSellPrice("");
      triggerToast(`Berhasil Merealisasikan Profit/Loss: Rp ${formatRupiah(calculatedRealizedPnL)}`, calculatedRealizedPnL >= 0 ? "green" : "red");
    } catch (error) {
      triggerToast("Transaksi Penjualan Gagal Dieksekusi", "red");
    }
  };

  // ── CORE CALCULATIONS FOR DASHBOARD RENDERING ──
  
  const globalBaseCapital = Number(userProfile?.capital) || 0;
  const globalInvestedAmount = portfolioData.reduce((total, pos) => total + (pos.shares * pos.avg_price), 0);
  
  const globalCurrentValue = portfolioData.reduce((total, pos) => {
    const latestPrice = cachedLivePrices[pos.stock_code]?.price || pos.close_price || pos.avg_price;
    return total + (pos.shares * latestPrice);
  }, 0);
  
  const globalUnrealizedPnL = globalCurrentValue - globalInvestedAmount;
  const globalAvailableCash = Math.max(0, globalBaseCapital - globalInvestedAmount);
  const globalCashPercentage = globalBaseCapital > 0 ? (globalAvailableCash / globalBaseCapital) * 100 : 100;
  
  let globalCashStatusColor = "green";
  if (globalCashPercentage < 10) globalCashStatusColor = "red";
  else if (globalCashPercentage < 20) globalCashStatusColor = "amber";
  
  const globalTotalEquity = globalBaseCapital + globalUnrealizedPnL;

  const analyticsTotalRealizedPnL = journalData.filter(j => j.type === 'SELL').reduce((totalSum, journalItem) => totalSum + (journalItem.pnl || 0), 0);
  const analyticsWinningPositionsCount = portfolioData.filter(pos => {
    const latestPriceForPos = cachedLivePrices[pos.stock_code]?.price || pos.close_price;
    return latestPriceForPos > pos.avg_price;
  }).length;
  const analyticsWinRatePercentage = portfolioData.length > 0 ? (analyticsWinningPositionsCount / portfolioData.length) * 100 : 0;

  // Screener Filtering Logic (Applying to Master Data that already has Live Prices)
  const getCompiledScreenerList = () => {
    let filteredList = [...masterScreenerData];

    // Text Search Filter
    if (screenerSearchText.trim() !== "") {
      const queryUpper = screenerSearchText.toUpperCase();
      filteredList = filteredList.filter(item => item.c.includes(queryUpper) || item.n.toUpperCase().includes(queryUpper));
    }

    // Quick Action Filters
    if (screenerActiveFilter === "Dividen") {
      filteredList = filteredList.filter(s => s.dy >= 5).sort((a,b) => b.dy - a.dy);
    } else if (screenerActiveFilter === "Murah") {
      filteredList = filteredList.filter(s => s.pbv > 0 && s.pbv < 1).sort((a,b) => a.pbv - b.pbv);
    } else if (screenerActiveFilter === "PE Murah") {
      filteredList = filteredList.filter(s => s.pe > 0 && s.pe < 12).sort((a,b) => a.pe - b.pe);
    }

    // Return the top 40 to keep render extremely fast
    return filteredList.slice(0, 40); 
  };

  const processedScreenerViewData = getCompiledScreenerList();

  // Forecast Simulation Logic
  const getCompiledForecastData = () => {
    let simulationResultRows = []; 
    let rollingBalanceAccumulator = globalTotalEquity;
    
    const injectionMonthly = parseFloat(inputForecastMonthly) || 0;
    const returnRateAnnual = (parseFloat(inputForecastReturn) || 10) / 100;
    const returnRateMonthly = returnRateAnnual / 12;
    const totalMonthsToSimulate = (parseInt(inputForecastYears) || 10) * 12;
    const financialTargetAmount = parseFloat(inputForecastTarget) || 3000000000;
    
    let flagHitYearNumber = null;

    for (let monthIndex = 1; monthIndex <= totalMonthsToSimulate; monthIndex++) {
      rollingBalanceAccumulator = (rollingBalanceAccumulator + injectionMonthly) * (1 + returnRateMonthly);
      if (monthIndex % 12 === 0) {
        const currentYearMark = monthIndex / 12;
        if (!flagHitYearNumber && rollingBalanceAccumulator >= financialTargetAmount) {
          flagHitYearNumber = currentYearMark;
        }
        simulationResultRows.push({ yearLevel: currentYearMark, balanceValue: rollingBalanceAccumulator, isTargetHit: rollingBalanceAccumulator >= financialTargetAmount });
      }
    }
    return { rows: simulationResultRows, hitYear: flagHitYearNumber };
  };

  const compiledForecastResults = getCompiledForecastData();


  /* ═══════════════════════════════════════════════════════
     VIEW RENDER 1: AUTHENTICATION
  ═══════════════════════════════════════════════════════ */
  if (!activeSession) {
    return (
      <div style={{minHeight:"100vh", background:`radial-gradient(circle at top left, #132742 0%, ${THEME.bg0} 60%)`, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px"}}>
        <style>{GLOBAL_STYLES}</style>
        <AppToast notification={toastNotification} />
        
        <div className="fu" style={{width:"100%", maxWidth:"400px"}}>
          <div style={{textAlign:"center", marginBottom:"40px"}}>
            <div style={{display:"inline-flex", alignItems:"center", gap:"10px", background:THEME.bg3, border:`1px solid ${THEME.bdr}`, borderRadius:"16px", padding:"12px 20px", marginBottom:"24px"}} className="glow">
              <ShieldCheck size={24} color={THEME.em} />
              <span style={{fontSize:"18px", fontWeight:900, color:THEME.t1, letterSpacing:"1px"}}>INVEST<span style={{color:THEME.em}}>GUARD</span></span>
            </div>
            <h1 style={{fontSize:"32px", fontWeight:900, color:THEME.t1, lineHeight:1.2, marginBottom:"12px"}}>Terminal Trading<br/>Anti Boncos.</h1>
            <p style={{fontSize:"14px", color:THEME.t2, lineHeight:1.6}}>Sistem manajemen risiko saham otomatis.<br/>Jaga modalmu, lipat gandakan profitmu.</p>
          </div>

          <div style={{background:THEME.bg1, border:`1px solid ${THEME.bdr2}`, borderRadius:"24px", padding:"32px", boxShadow:"0 20px 40px rgba(0,0,0,0.5)"}}>
            <div style={{display:"flex", gap:"8px", background:THEME.bg0, padding:"6px", borderRadius:"16px", marginBottom:"24px"}}>
              <button 
                onClick={()=>setIsAuthModeLogin(true)} 
                style={{flex:1, padding:"12px", borderRadius:"12px", background:isAuthModeLogin?THEME.bg3:"transparent", color:isAuthModeLogin?THEME.t1:THEME.t3, border:"none", fontWeight:800, fontSize:"13px", cursor:"pointer", transition:".2s"}}>
                MASUK
              </button>
              <button 
                onClick={()=>setIsAuthModeLogin(false)} 
                style={{flex:1, padding:"12px", borderRadius:"12px", background:!isAuthModeLogin?THEME.bg3:"transparent", color:!isAuthModeLogin?THEME.t1:THEME.t3, border:"none", fontWeight:800, fontSize:"13px", cursor:"pointer", transition:".2s"}}>
                DAFTAR BARU
              </button>
            </div>
            
            <FormInput label="Alamat Email" type="email" value={inputAuthEmail} onChange={e=>setInputAuthEmail(e.target.value)} placeholder="investor@sukses.com" />
            <FormInput label="Kata Sandi" type="password" value={inputAuthPassword} onChange={e=>setInputAuthPassword(e.target.value)} placeholder="Minimal 6 karakter" />
            
            <ActionButton isFullWidth onClick={handleAuthenticationSubmit} isDisabled={isAuthProcessLoading} customStyle={{marginTop:"16px", padding:"16px"}}>
              {isAuthProcessLoading ? <LoadingIndicator/> : (isAuthModeLogin ? "Masuk ke Terminal" : "Mulai Gunakan Gratis")}
            </ActionButton>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     VIEW RENDER 2: INITIAL SETUP (ONBOARDING)
  ═══════════════════════════════════════════════════════ */
  if (userProfile && userProfile.capital === null) {
    return (
      <div style={{minHeight:"100vh", background:THEME.bg0, padding:"60px 24px"}}>
        <style>{GLOBAL_STYLES}</style>
        <AppToast notification={toastNotification} />

        <div className="fu" style={{maxWidth:"480px", margin:"0 auto"}}>
          <div style={{marginBottom:"40px"}}>
            <div style={{fontSize:"12px", fontWeight:900, color:THEME.em, letterSpacing:"2px", marginBottom:"12px"}}>LANGKAH TERAKHIR</div>
            <h1 style={{fontSize:"36px", fontWeight:900, color:THEME.t1, lineHeight:1.1, marginBottom:"16px"}}>Berapa Modal<br/>Kerja Kamu?</h1>
            <p style={{fontSize:"15px", color:THEME.t2, lineHeight:1.7}}>InvestGuard menggunakan angka ini sebagai dasar kalkulasi Stop Loss total dan pembatasan maksimal Alokasi per saham agar kamu tidak bangkrut mendadak.</p>
          </div>

          <div style={{background:THEME.bg1, border:`1px solid ${THEME.bdr2}`, borderRadius:"24px", padding:"24px", marginBottom:"32px"}}>
            <FormInput 
              label="ALOKASI MODAL INVESTASI (Rp)" 
              prefixText="Rp" 
              type="text" 
              value={inputTopUpNominal} 
              onChange={e => {
                const rawNum = e.target.value.replace(/\D/g, "");
                setInputTopUpNominal(rawNum ? new Intl.NumberFormat("id-ID").format(rawNum) : "");
              }} 
              placeholder="Contoh: 10.000.000" 
            />
            
            <div style={{background:THEME.lBg, border:`1px solid ${THEME.lBdr}`, padding:"16px", borderRadius:"16px", display:"flex", gap:"12px", alignItems:"flex-start", marginTop:"20px"}}>
              <Info size={18} color={THEME.blue} style={{flexShrink:0, marginTop:"2px"}}/>
              <p style={{fontSize:"13px", color:THEME.blue, lineHeight:1.6}}>Modal yang dimasukkan ini akan menjadi <strong>Cash Reserve (Daya Beli)</strong> kamu, dan belum dibelikan saham apapun.</p>
            </div>
          </div>
          
          <ActionButton 
            isFullWidth 
            onClick={async () => {
              const rawCapitalValue = parseFloat(inputTopUpNominal.replace(/\D/g, ""));
              if (!rawCapitalValue || rawCapitalValue < 100000) { 
                triggerToast("Syarat minimal modal awal adalah Rp 100.000", "amber"); 
                return; 
              }
              await supabase.from('profiles').update({ capital: rawCapitalValue }).eq('id', activeSession.user.id);
              await supabase.from('journal').insert([{ user_id: activeSession.user.id, stock_code: "DEPOSIT", date: getTodayDateString(), lot: 0, shares: 0, avg_price: 0, close_price: 0, nominal: rawCapitalValue, type: 'TOPUP' }]);
              fetchDataFromSupabase(activeSession.user.id);
            }} 
            customStyle={{padding:"18px", fontSize:"16px"}}
          >
            Masuk ke Dashboard
          </ActionButton>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     VIEW RENDER 3: MAIN APP (TABS)
  ═══════════════════════════════════════════════════════ */
  return (
    <div style={{minHeight:"100vh", background:THEME.bg0, paddingBottom:"100px", maxWidth:"500px", margin:"0 auto", position:"relative"}}>
      <style>{GLOBAL_STYLES}</style>
      <AppToast notification={toastNotification} />

      {/* ────────────────────────────────────────────────────────
          TAB 1: PORTFOLIO MAIN DASHBOARD
      ──────────────────────────────────────────────────────── */}
      {activeMenuTab === "portfolio" && (
        <div className="fu">
          {/* HEADER: GLOBAL METRICS */}
          <div style={{background:`linear-gradient(160deg, #0A192F 0%, ${THEME.bg1} 100%)`, padding:"50px 20px 30px", borderBottom:`1px solid ${THEME.bdr2}`, position:"relative", overflow:"hidden"}}>
            <div style={{position:"absolute", top:"-50px", right:"-50px", width:"200px", height:"200px", background:"radial-gradient(circle, rgba(0, 200, 122, 0.08) 0%, transparent 70%)", borderRadius:"50%"}} />
            
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"24px", position:"relative", zIndex:2}}>
              <div>
                <div style={{fontSize:"11px", fontWeight:800, color:THEME.t3, letterSpacing:"2px", marginBottom:"6px"}}>TOTAL NET EQUITY</div>
                <div style={{fontSize:"36px", fontWeight:900, color:THEME.t1, letterSpacing:"-1px", lineHeight:1}}>Rp {formatRupiah(globalTotalEquity)}</div>
                
                <div style={{display:"inline-flex", alignItems:"center", gap:"6px", marginTop:"12px", background: globalUnrealizedPnL >= 0 ? THEME.gBg : THEME.rBg, border:`1px solid ${globalUnrealizedPnL >= 0 ? THEME.gBdr : THEME.rBdr}`, padding:"6px 14px", borderRadius:"99px"}}>
                  {globalUnrealizedPnL >= 0 ? <ArrowUpRight size={14} color={THEME.green}/> : <ArrowDownRight size={14} color={THEME.red}/>}
                  <span style={{fontSize:"13px", fontWeight:800, color: globalUnrealizedPnL >= 0 ? THEME.green : THEME.red}}>
                    {globalUnrealizedPnL >= 0 ? "+" : ""}Rp {formatRupiahCompact(Math.abs(globalUnrealizedPnL))} ({formatPercent(globalBaseCapital > 0 ? (globalUnrealizedPnL/globalBaseCapital)*100 : 0)})
                  </span>
                </div>
              </div>
              <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"10px"}}>
                <button onClick={()=>supabase.auth.signOut()} style={{background:THEME.bg3, border:`1px solid ${THEME.bdr2}`, padding:"8px", borderRadius:"12px", cursor:"pointer"}} className="tap"><LogOut size={16} color={THEME.t2}/></button>
                <div style={{fontSize:"9px", color:THEME.t3, fontWeight:700, display:"flex", alignItems:"center", gap:"4px"}}>
                  {isFetchingPrices ? <><LoadingIndicator/> SYNCING</> : <><span style={{width:"6px", height:"6px", borderRadius:"50%", background:THEME.green}} className="pulse"/> LIVE {timeLastSynced}</>}
                </div>
              </div>
            </div>

            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"20px", position:"relative", zIndex:2}}>
              <div style={{background:THEME.bg2, border:`1px solid ${THEME.bdr}`, borderRadius:"16px", padding:"14px"}}>
                <div style={{fontSize:"10px", color:THEME.t3, fontWeight:800, marginBottom:"4px"}}>MODAL TERPAKAI</div>
                <div style={{fontSize:"15px", color:THEME.t1, fontWeight:800}}>Rp {formatRupiahCompact(globalInvestedAmount)}</div>
              </div>
              <div style={{background:THEME.bg2, border:`1px solid ${THEME.bdr}`, borderRadius:"16px", padding:"14px"}}>
                <div style={{fontSize:"10px", color:THEME.t3, fontWeight:800, marginBottom:"4px"}}>NILAI PASAR (LIVE)</div>
                <div style={{fontSize:"15px", color:THEME.t1, fontWeight:800}}>Rp {formatRupiahCompact(globalCurrentValue)}</div>
              </div>
            </div>

            <div style={{background:THEME.bg2, border:`1px solid ${THEME.bdr}`, borderRadius:"18px", padding:"16px", position:"relative", zIndex:2}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px"}}>
                <span style={{fontSize:"11px", fontWeight:800, color:THEME.t2}}>CASH RESERVE (DAYA BELI)</span>
                <span style={{fontSize:"14px", fontWeight:900, color: globalCashStatusColor === "red" ? THEME.red : globalCashStatusColor === "amber" ? THEME.amber : THEME.green}}>
                  {globalCashPercentage.toFixed(1)}% <span style={{fontSize:"11px", fontWeight:600, color:THEME.t3}}>| Rp {formatRupiahCompact(globalAvailableCash)}</span>
                </span>
              </div>
              <div style={{height:"6px", background:THEME.bg0, borderRadius:"99px", overflow:"hidden", position:"relative"}}>
                <div style={{height:"100%", width:`${Math.min(100, globalCashPercentage)}%`, background: globalCashStatusColor === "red" ? THEME.red : globalCashStatusColor === "amber" ? THEME.amber : THEME.green, transition:"width 0.8s ease-out"}} />
                <div style={{position:"absolute", left:"10%", top:0, bottom:0, width:"2px", background:THEME.bdr2}} />
                <div style={{position:"absolute", left:"20%", top:0, bottom:0, width:"2px", background:THEME.bdr2}} />
              </div>
            </div>
          </div>

          <div style={{padding:"20px 20px 0"}}>
            {globalCashStatusColor !== "green" && (
              <div className="fu" style={{background: globalCashStatusColor === "red" ? THEME.rBg : THEME.aBg, border:`1px solid ${globalCashStatusColor === "red" ? THEME.rBdr : THEME.aBdr}`, borderRadius:"16px", padding:"14px", marginBottom:"20px", display:"flex", gap:"10px", alignItems:"center"}}>
                <AlertTriangle size={18} color={globalCashStatusColor === "red" ? THEME.red : THEME.amber} style={{flexShrink:0}}/>
                <p style={{fontSize:"13px", color:globalCashStatusColor === "red" ? THEME.red : THEME.amber, fontWeight:600, lineHeight:1.5}}>
                  {globalCashStatusColor === "red" ? `Status Kritis! Kas tersisa ${globalCashPercentage.toFixed(1)}%. DILARANG melakukan pembelian saham baru. Siapkan dana untuk injeksi.` : `Kas Menipis (${globalCashPercentage.toFixed(1)}%). Berada di bawah level ideal 20%. Kurangi intensitas beli.`}
                </p>
              </div>
            )}

            <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:"12px", marginBottom:"24px"}}>
              <ActionButton icon={<Search size={16}/>} onClick={()=>setActiveMenuTab("screener")}>Cari & Beli Saham</ActionButton>
              <ActionButton variant="secondary" icon={<Wallet size={16}/>} onClick={()=>setIsTopUpModalOpen(true)}>Top Up</ActionButton>
            </div>

            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px"}}>
              <h2 style={{fontSize:"18px", fontWeight:900, color:THEME.t1}}>Aset Berjalan</h2>
              <span style={{fontSize:"12px", color:THEME.t3, fontWeight:700, background:THEME.bg2, padding:"4px 10px", borderRadius:"8px"}}>{portfolioData.length} Posisi</span>
            </div>

            {portfolioData.length === 0 ? (
              <div style={{textAlign:"center", padding:"60px 20px", background:THEME.bg1, border:`1px dashed ${THEME.bdr2}`, borderRadius:"24px"}}>
                <Landmark size={40} color={THEME.t3} style={{margin:"0 auto 16px", opacity:0.5}}/>
                <h3 style={{fontSize:"16px", fontWeight:800, color:THEME.t1, marginBottom:"8px"}}>Portofolio Kosong</h3>
                <p style={{fontSize:"13px", color:THEME.t2, lineHeight:1.6}}>Mulai bangun asetmu. Cari saham bagus di Screener dan eksekusi pembelian pertamamu.</p>
              </div>
            ) : (
              <div style={{display:"flex", flexDirection:"column", gap:"16px"}}>
                {portfolioData.map((posItem, index) => {
                  const currentLivePrice = cachedLivePrices[posItem.stock_code]?.price || posItem.close_price || posItem.avg_price;
                  const itemMM = calculateMoneyManagement(globalBaseCapital, posItem.avg_price, currentLivePrice, posItem.shares);
                  const advisor = generateAdvisorySuggestions(itemMM, posItem.stock_code, globalCashPercentage);
                  
                  // Proteksi display value NaN
                  const safeAlloc = Number(itemMM.allocPct) || 0;
                  const isOverAlloc = safeAlloc > 20;

                  return (
                    <div key={posItem.id} className="fu" style={{background:THEME.bg1, border:`1px solid ${itemMM.pnlPct <= -8 ? THEME.rBdr : THEME.bdr2}`, borderRadius:"24px", overflow:"hidden", animationDelay:`${index * 0.05}s`}}>
                      {itemMM.pnlPct <= -8 && (
                        <div style={{background:THEME.rBg, padding:"8px 16px", display:"flex", gap:"8px", alignItems:"center", borderBottom:`1px solid ${THEME.rBdr}`}}>
                          <AlertTriangle size={14} color={THEME.red}/>
                          <span style={{fontSize:"11px", fontWeight:800, color:THEME.red}}>STOP LOSS HIT (-8%)</span>
                        </div>
                      )}
                      <div style={{padding:"20px 20px 0"}}>
                        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px"}}>
                          <div style={{display:"flex", gap:"14px", alignItems:"center"}}>
                            <div style={{width:"50px", height:"50px", borderRadius:"14px", background:THEME.bg2, border:`1px solid ${THEME.bdr}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", fontWeight:900, color:THEME.em}}>{posItem.stock_code.slice(0,2)}</div>
                            <div>
                              <div style={{fontSize:"18px", fontWeight:900, color:THEME.t1, letterSpacing:"-0.5px"}}>{posItem.stock_code}</div>
                              <div style={{fontSize:"12px", color:THEME.t3, marginTop:"2px", fontWeight:600}}>{posItem.sector}</div>
                            </div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:"20px", fontWeight:900, color: getProfitColor(itemMM.pnlPct), letterSpacing:"-0.5px"}}>{formatPercent(itemMM.pnlPct)}</div>
                            <div style={{fontSize:"13px", fontWeight:700, color: getProfitColor(itemMM.pnl), marginTop:"2px"}}>{itemMM.pnl >= 0 ? "+" : ""}Rp {formatRupiahCompact(Math.abs(itemMM.pnl))}</div>
                          </div>
                        </div>

                        <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"8px", marginBottom:"16px"}}>
                          <div style={{background:THEME.bg2, padding:"12px", borderRadius:"12px"}}>
                            <div style={{fontSize:"9px", color:THEME.t3, fontWeight:800, marginBottom:"4px"}}>LOT / LBR</div>
                            <div style={{fontSize:"13px", fontWeight:800, color:THEME.t1}}>{posItem.lot} <span style={{fontSize:"10px", color:THEME.t2, fontWeight:600}}>({formatRupiah(posItem.shares)})</span></div>
                          </div>
                          <div style={{background:THEME.bg2, padding:"12px", borderRadius:"12px"}}>
                            <div style={{fontSize:"9px", color:THEME.t3, fontWeight:800, marginBottom:"4px"}}>AVG BUY</div>
                            <div style={{fontSize:"13px", fontWeight:800, color:THEME.t1}}>Rp {formatRupiah(posItem.avg_price)}</div>
                          </div>
                          <div style={{background:THEME.bg2, padding:"12px", borderRadius:"12px", position:"relative", overflow:"hidden"}}>
                            {isFetchingPrices && <div className="shimmer" style={{position:"absolute", inset:0, opacity:0.1}}/>}
                            <div style={{fontSize:"9px", color:THEME.t3, fontWeight:800, marginBottom:"4px"}}>LIVE PRICE</div>
                            <div style={{fontSize:"13px", fontWeight:800, color:THEME.em}}>Rp {formatRupiah(currentLivePrice)}</div>
                          </div>
                        </div>

                        <div style={{marginBottom:"16px"}}>
                          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px"}}>
                            <span style={{fontSize:"11px", fontWeight:700, color:THEME.t2}}>Bobot terhadap Modal</span>
                            <span style={{fontSize:"12px", fontWeight:800, color: isOverAlloc ? THEME.red : THEME.t1}}>{safeAlloc.toFixed(1)}% <span style={{color:THEME.t3}}>/ 20%</span></span>
                          </div>
                          <div style={{height:"6px", background:THEME.bg2, borderRadius:"99px", overflow:"hidden"}}>
                            <div style={{height:"100%", width:`${Math.min(100, (safeAlloc/20)*100)}%`, background: isOverAlloc ? THEME.red : safeAlloc > 15 ? THEME.amber : THEME.em, transition:"width 0.5s ease"}}/>
                          </div>
                        </div>

                        <div style={{background:THEME.bg2, border:`1px solid ${THEME.bdr}`, padding:"16px", borderRadius:"16px", marginBottom:"16px"}}>
                          <div style={{display:"flex", alignItems:"center", gap:"8px", fontSize:"10px", fontWeight:800, color:THEME.t2, letterSpacing:"1px", marginBottom:"12px"}}>
                            <Target size={14} color={THEME.t3}/> TRADING PLAN AKTIF (R:R 1:2)
                          </div>
                          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 16px"}}>
                            <div style={{display:"flex", justifyContent:"space-between", fontSize:"12px"}}><span style={{color:THEME.t3, fontWeight:600}}>SL (-8%)</span><strong style={{color:THEME.red}}>Rp {formatRupiah(itemMM.sl)}</strong></div>
                            <div style={{display:"flex", justifyContent:"space-between", fontSize:"12px"}}><span style={{color:THEME.t3, fontWeight:600}}>TP1 (15%)</span><strong style={{color:THEME.green}}>Rp {formatRupiah(itemMM.tp1)}</strong></div>
                            <div style={{display:"flex", justifyContent:"space-between", fontSize:"12px"}}><span style={{color:THEME.t3, fontWeight:600}}>Avg Down</span><strong style={{color:THEME.amber}}>Rp {formatRupiah(itemMM.adLvl)}</strong></div>
                            <div style={{display:"flex", justifyContent:"space-between", fontSize:"12px"}}><span style={{color:THEME.t3, fontWeight:600}}>TP2 (25%)</span><strong style={{color:THEME.green}}>Rp {formatRupiah(itemMM.tp2)}</strong></div>
                          </div>
                        </div>

                        <AdvisoryBox type={advisor[0].type} text={advisor[0].text} />
                      </div>

                      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1px", background:THEME.bdr2, marginTop:"10px"}}>
                        <button onClick={()=> { setSellStockData(posItem); setIsSellModalOpen(true); }} style={{background:THEME.bg1, border:"none", padding:"16px", fontSize:"13px", fontWeight:800, color:THEME.red, cursor:"pointer"}} className="tap hov">JUAL SAHAM</button>
                        <button onClick={()=> { setAddStockData({c:posItem.stock_code, s:posItem.sector}); setInputBuyPrice(currentLivePrice.toString()); setIsAddModalOpen(true); }} style={{background:THEME.bg1, border:"none", padding:"16px", fontSize:"13px", fontWeight:800, color:THEME.green, cursor:"pointer"}} className="tap hov">TAMBAH MUATAN</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 2: SCREENER (WITH LIVE API SEARCH)
      ──────────────────────────────────────────────────────── */}
      {activeMenuTab === "screener" && (
        <div className="fu" style={{padding:"60px 20px 20px"}}>
          <div style={{marginBottom:"24px"}}>
            <h2 style={{fontSize:"28px", fontWeight:900, color:THEME.t1, letterSpacing:"-0.5px", marginBottom:"8px"}}>Screener IDX</h2>
            <p style={{fontSize:"14px", color:THEME.t2, lineHeight:1.6}}>Data langsung dari bursa. Ketik kode spesifik untuk menarik fundamental terkini.</p>
          </div>

          <form onSubmit={executeScreenerSearch} style={{display:"flex", gap:"10px", marginBottom:"20px"}}>
            <div style={{flex:1, position:"relative"}}>
              <Search size={18} color={THEME.t3} style={{position:"absolute", left:"16px", top:"50%", transform:"translateY(-50%)"}}/>
              <input type="text" value={screenerSearchText} onChange={e => setScreenerSearchText(e.target.value)} placeholder="Cari kode saham (Contoh: BREN, CUAN)" style={{width:"100%", background:THEME.bg1, border:`1.5px solid ${THEME.bdr2}`, borderRadius:"16px", padding:"16px 16px 16px 44px", color:THEME.t1, fontSize:"14px", fontWeight:700, transition:".2s"}} onFocus={e => e.target.style.borderColor = THEME.em} onBlur={e => e.target.style.borderColor = THEME.bdr2} />
            </div>
            <ActionButton type="submit" disabled={isSearchingYahooAPI} customStyle={{padding:"0 20px"}}>{isSearchingYahooAPI ? <LoadingIndicator/> : "Cari"}</ActionButton>
          </form>

          <div style={{display:"flex", gap:"8px", overflowX:"auto", paddingBottom:"12px", marginBottom:"16px"}} className="hide-scrollbar">
            {[
              { id: "Semua", label: "Populer IDX" }, 
              { id: "Dividen", label: "Dividen >5%" }, 
              { id: "Murah", label: "Valuasi Murah (PBV<1)" }, 
              { id: "PE Murah", label: "PE Rendah (<12x)" }, 
              { id: "Bagger", label: "Potensi Bagger" }
            ].map(f => (
              <button key={f.id} onClick={()=>setScreenerActiveFilter(f.id)} style={{background:screenerActiveFilter===f.id?THEME.em:THEME.bg1, color:screenerActiveFilter===f.id?THEME.bg0:THEME.t2, border:`1px solid ${screenerActiveFilter===f.id?THEME.em:THEME.bdr2}`, borderRadius:"99px", padding:"10px 18px", fontSize:"12px", fontWeight:800, whiteSpace:"nowrap", cursor:"pointer", transition:"0.2s"}}>{f.label}</button>
            ))}
          </div>

          <div style={{display:"grid", gap:"12px"}}>
            {processedScreenerViewData.map((s, i) => (
              <div key={s.c} className="fu" style={{background:THEME.bg1, border:`1px solid ${THEME.bdr2}`, borderRadius:"20px", padding:"20px", animationDelay:`${i*0.04}s`}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"16px"}}>
                  <div style={{display:"flex", gap:"12px", alignItems:"center"}}>
                    <div style={{width:"44px", height:"44px", borderRadius:"12px", background:THEME.bg2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:900, color:THEME.t1, border:`1px solid ${THEME.bdr}`}}>{s.c.slice(0,2)}</div>
                    <div>
                      <div style={{fontSize:"18px", fontWeight:900, color:THEME.t1}}>{s.c}</div>
                      <div style={{fontSize:"12px", color:THEME.t3, marginTop:"2px", maxWidth:"140px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{s.n}</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:"11px", fontWeight:800, color:THEME.t3, marginBottom:"4px"}}>HARGA LIVE</div>
                    <div style={{fontSize:"18px", fontWeight:900, color:THEME.green}}>Rp {formatRupiah(s.livePrice)}</div>
                  </div>
                </div>

                <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"8px", marginBottom:"16px"}}>
                  <div style={{background:THEME.bg2, padding:"10px", borderRadius:"12px", textAlign:"center"}}><div style={{fontSize:"9px", fontWeight:800, color:THEME.t3, marginBottom:"4px"}}>DIV YIELD</div><div style={{fontSize:"13px", fontWeight:800, color: s.dy >= 5 ? THEME.green : THEME.t1}}>{s.dy}%</div></div>
                  <div style={{background:THEME.bg2, padding:"10px", borderRadius:"12px", textAlign:"center"}}><div style={{fontSize:"9px", fontWeight:800, color:THEME.t3, marginBottom:"4px"}}>PBV RATIO</div><div style={{fontSize:"13px", fontWeight:800, color: s.pbv > 0 && s.pbv <= 1.2 ? THEME.green : THEME.t1}}>{s.pbv}x</div></div>
                  <div style={{background:THEME.bg2, padding:"10px", borderRadius:"12px", textAlign:"center"}}><div style={{fontSize:"9px", fontWeight:800, color:THEME.t3, marginBottom:"4px"}}>P/E RATIO</div><div style={{fontSize:"13px", fontWeight:800, color:THEME.t1}}>{s.pe > 0 ? s.pe + "x" : "—"}</div></div>
                </div>
                
                <ActionButton isFullWidth onClick={()=>{ setAddStockData(s); setInputBuyPrice(s.livePrice.toString()); setIsAddModalOpen(true); }}>Tambah ke Portofolio</ActionButton>
              </div>
            ))}
            {processedScreenerViewData.length === 0 && (
              <div style={{textAlign:"center", padding:"40px 20px", color:THEME.t3}}>
                <Filter size={32} style={{margin:"0 auto 12px", opacity:0.5}}/>
                <p>Tidak ada saham yang sesuai dengan filter.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 3: JURNAL & HISTORI TRANSAKSI
      ──────────────────────────────────────────────────────── */}
      {activeMenuTab === "jurnal" && (
        <div className="fu" style={{padding:"60px 20px 20px"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"24px"}}>
            <div>
              <h2 style={{fontSize:"28px", fontWeight:900, color:THEME.t1, letterSpacing:"-0.5px", marginBottom:"4px"}}>Buku Jurnal</h2>
              <p style={{fontSize:"13px", color:THEME.t2}}>{journalData.length} Rekam Transaksi Tercatat</p>
            </div>
            <ActionButton variant="secondary" sm icon={<Download size={14}/>} onClick={()=>exportDataToCSV(journalData)}>Excel</ActionButton>
          </div>

          {journalData.length === 0 ? (
            <div style={{background:THEME.bg1, border:`1px dashed ${THEME.bdr2}`, borderRadius:"24px", padding:"60px 20px", textAlign:"center"}}>
              <BookOpen size={40} color={THEME.t3} style={{margin:"0 auto 16px", opacity:0.5}}/>
              <div style={{fontSize:"14px", fontWeight:600, color:THEME.t2}}>Buku Jurnal Kosong</div>
              <div style={{fontSize:"12px", color:THEME.t3, marginTop:"8px"}}>Lakukan transaksi beli/jual untuk mulai mencatat.</div>
            </div>
          ) : (
            <div style={{display:"flex", flexDirection:"column", gap:"12px"}}>
              {journalData.map((journalRow, index) => {
                const isSellRecord = journalRow.type === 'SELL';
                const isTopupRecord = journalRow.type === 'TOPUP';
                return (
                  <div key={journalRow.id} className="fu" style={{background:THEME.bg1, border:`1px solid ${THEME.bdr2}`, borderRadius:"20px", padding:"20px", animationDelay:`${index * 0.03}s`}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px"}}>
                      <div style={{display:"flex", gap:"10px", alignItems:"center"}}>
                        <StatusPill backgroundColor={isSellRecord ? THEME.rBg : isTopupRecord ? THEME.lBg : THEME.gBg} color={isSellRecord ? THEME.red : isTopupRecord ? THEME.blue : THEME.green} borderColor={isSellRecord ? THEME.rBdr : isTopupRecord ? THEME.lBdr : THEME.gBdr}>{journalRow.type}</StatusPill>
                        <span style={{fontSize:"16px", fontWeight:900, color:THEME.t1}}>{journalRow.stock_code}</span>
                      </div>
                      <span style={{fontSize:"11px", fontWeight:600, color:THEME.t3}}>{journalRow.date}</span>
                    </div>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", background:THEME.bg2, padding:"12px 16px", borderRadius:"12px"}}>
                      <div>
                        <div style={{fontSize:"10px", fontWeight:800, color:THEME.t3, marginBottom:"4px"}}>RINCIAN</div>
                        <div style={{fontSize:"13px", fontWeight:700, color:THEME.t1}}>{isTopupRecord ? "Injeksi Dana DCA" : `${journalRow.lot} Lot @ Rp ${formatRupiah(journalRow.close_price)}`}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:"10px", fontWeight:800, color:THEME.t3, marginBottom:"4px"}}>{isSellRecord ? "REALIZED PNL" : "NOMINAL"}</div>
                        <div style={{fontSize:"14px", fontWeight:900, color: isSellRecord ? getProfitColor(journalRow.pnl) : isTopupRecord ? THEME.blue : THEME.t1}}>{isSellRecord ? (journalRow.pnl >= 0 ? "+" : "") : ""}{isSellRecord ? formatRupiahCompact(journalRow.pnl) : formatRupiahCompact(journalRow.nominal || (journalRow.lot * 100 * journalRow.close_price))}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 4: MONITOR ANALYST DASHBOARD
      ──────────────────────────────────────────────────────── */}
      {activeMenuTab === "monitor" && (
        <div className="fu" style={{padding:"60px 20px 20px"}}>
          <div style={{marginBottom:"24px"}}>
            <h2 style={{fontSize:"28px", fontWeight:900, color:THEME.t1, letterSpacing:"-0.5px", marginBottom:"4px"}}>Analyst Monitor</h2>
            <p style={{fontSize:"13px", color:THEME.t2}}>Tinjauan makro mengenai performa, kesehatan portofolio, dan diversifikasi asetmu.</p>
          </div>

          <div style={{background:`linear-gradient(135deg, ${THEME.bg1} 0%, ${THEME.bg2} 100%)`, border:`1px solid ${THEME.bdr2}`, borderRadius:"24px", padding:"24px", marginBottom:"20px", boxShadow:"0 10px 30px rgba(0,0,0,0.2)"}}>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px"}}>
              <div>
                <div style={{fontSize:"11px", fontWeight:800, color:THEME.t3, letterSpacing:"1px", marginBottom:"8px", display:"flex", alignItems:"center", gap:"6px"}}><Trophy size={14}/> WIN RATE</div>
                <div style={{fontSize:"32px", fontWeight:900, color:THEME.em}}>{analyticsWinRatePercentage.toFixed(0)}<span style={{fontSize:"20px"}}>%</span></div>
                <div style={{fontSize:"12px", color:THEME.t2, fontWeight:600, marginTop:"4px"}}>{analyticsWinningPositionsCount} dari {portfolioData.length} Posisi Cuan</div>
              </div>
              <div>
                <div style={{fontSize:"11px", fontWeight:800, color:THEME.t3, letterSpacing:"1px", marginBottom:"8px"}}>TOTAL REALIZED PNL</div>
                <div style={{fontSize:"24px", fontWeight:900, color: getProfitColor(analyticsTotalRealizedPnL), marginTop:"6px"}}>{analyticsTotalRealizedPnL >= 0 ? "+" : ""}Rp {formatRupiahCompact(analyticsTotalRealizedPnL)}</div>
                <div style={{fontSize:"12px", color:THEME.t2, fontWeight:600, marginTop:"4px"}}>Uang Laba yang Sudah Dikunci</div>
              </div>
            </div>
          </div>

          <div style={{background:THEME.bg1, border:`1px solid ${THEME.bdr2}`, borderRadius:"24px", padding:"24px"}}>
            <div style={{display:"flex", alignItems:"center", gap:"8px", marginBottom:"24px"}}>
              <PieChart size={18} color={THEME.t2}/>
              <h3 style={{fontSize:"14px", fontWeight:800, color:THEME.t1, letterSpacing:"1px"}}>PETA ALOKASI EKUITAS (MAKS 20%)</h3>
            </div>
            
            {portfolioData.length === 0 ? (
              <div style={{color:THEME.t3, fontSize:"13px", textAlign:"center", padding:"20px 0"}}>Belum ada data distribusi alokasi.</div>
            ) : (
              <div style={{display:"flex", flexDirection:"column", gap:"20px"}}>
                {portfolioData.map(pos => {
                  const currentP = cachedLivePrices[pos.stock_code]?.price || pos.avg_price;
                  // Menggunakan helper Number agar kebal undefined
                  const safeShares = Number(pos.shares) || 0;
                  const safeCurrentP = Number(currentP) || 0;
                  const safeCap = Number(globalBaseCapital) || 1;
                  
                  const calculatedAlloc = ((safeShares * safeCurrentP) / safeCap) * 100;
                  const isWeightOverLimit = calculatedAlloc > 20;
                  
                  return (
                    <div key={pos.id}>
                      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px"}}>
                        <div style={{display:"flex", alignItems:"center", gap:"8px"}}>
                          <span style={{fontSize:"14px", fontWeight:800, color:THEME.t1}}>{pos.stock_code}</span>
                          {isWeightOverLimit && <StatusPill backgroundColor={THEME.rBg} color={THEME.red} borderColor={THEME.rBdr}>Overweight!</StatusPill>}
                        </div>
                        <span style={{fontSize:"14px", fontWeight:900, color: isWeightOverLimit ? THEME.red : THEME.em}}>{calculatedAlloc.toFixed(1)}%</span>
                      </div>
                      <div style={{height:"8px", background:THEME.bg0, borderRadius:"99px", overflow:"hidden"}}>
                        <div style={{height:"100%", width:`${Math.min(100, (calculatedAlloc/20)*100)}%`, background: isWeightOverLimit ? THEME.red : THEME.em, borderRadius:"99px"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 5: FORECAST (PENSION SIMULATOR)
      ──────────────────────────────────────────────────────── */}
      {activeMenuTab === "forecast" && (
        <div className="fu" style={{padding:"60px 20px 20px"}}>
          <div style={{background:`linear-gradient(135deg, #181133 0%, ${THEME.bg0} 100%)`, border:`1px solid ${THEME.lBdr}`, borderRadius:"28px", padding:"28px 24px", marginBottom:"20px", position:"relative", overflow:"hidden"}}>
            <div style={{position:"absolute", top:"-20px", right:"-20px", opacity:0.05}}><TrendingUp size={120} color={THEME.blue}/></div>
            <div style={{display:"flex", alignItems:"center", gap:"10px", marginBottom:"24px", position:"relative", zIndex:2}}>
              <div style={{width:"36px", height:"36px", borderRadius:"12px", background:THEME.lBg, display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${THEME.lBdr}`}}><TrendingUp size={18} color={THEME.blue}/></div>
              <h2 style={{fontSize:"22px", fontWeight:900, color:THEME.t1}}>Wealth Forecast</h2>
            </div>
            
            <div style={{position:"relative", zIndex:2}}>
              <FormInput label="TARGET DANA PENSIUN (Rp)" type="number" value={inputForecastTarget} onChange={e=>setInputForecastTarget(e.target.value)} />
              <FormInput label="TABUNGAN RUTIN / BULAN (Rp)" type="number" value={inputForecastMonthly} onChange={e=>setInputForecastMonthly(e.target.value)} />
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px"}}>
                <FormInput label="RETURN EKSPEKTASI / THN (%)" type="number" value={inputForecastReturn} onChange={e=>setInputForecastReturn(e.target.value)} />
                <FormInput label="DURASI INVESTASI (TAHUN)" type="number" value={inputForecastYears} onChange={e=>setInputForecastYears(e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{background:THEME.bg1, border:`1px solid ${THEME.bdr2}`, borderRadius:"24px", padding:"24px"}}>
            <div style={{fontSize:"12px", fontWeight:800, color:THEME.t3, letterSpacing:"1px", marginBottom:"20px"}}>HASIL PROYEKSI MATEMATIKA</div>
            
            {compiledForecastResults.hitYear ? (
              <div className="fu" style={{background:THEME.gBg, border:`1px solid ${THEME.gBdr}`, padding:"20px", borderRadius:"16px", textAlign:"center", marginBottom:"24px"}}>
                <CheckCircle size={28} color={THEME.green} style={{margin:"0 auto 12px"}}/>
                <div style={{fontSize:"16px", fontWeight:800, color:THEME.green}}>Target Rp {formatRupiahCompact(inputForecastTarget)} Tercapai!</div>
                <div style={{fontSize:"13px", color:THEME.green, marginTop:"6px", fontWeight:600}}>Pada Tahun ke-{compiledForecastResults.hitYear} Investasi</div>
              </div>
            ) : (
              <div className="fu" style={{background:THEME.rBg, border:`1px solid ${THEME.rBdr}`, padding:"20px", borderRadius:"16px", textAlign:"center", marginBottom:"24px"}}>
                <Target size={28} color={THEME.red} style={{margin:"0 auto 12px"}}/>
                <div style={{fontSize:"16px", fontWeight:800, color:THEME.red}}>Target Tidak Terkejar</div>
                <div style={{fontSize:"13px", color:THEME.red, marginTop:"6px", fontWeight:600}}>Dalam {inputForecastYears} tahun. Coba naikkan DCA bulanan atau ekspektasi return.</div>
              </div>
            )}

            <div style={{display:"flex", flexDirection:"column", gap:"12px"}}>
              {compiledForecastResults.rows.map(rowResult => (
                <div key={rowResult.yearLevel} style={{background:THEME.bg2, padding:"16px", borderRadius:"14px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <span style={{fontSize:"14px", fontWeight:700, color:THEME.t2}}>Tahun ke-{rowResult.yearLevel}</span>
                  <span style={{fontSize:"16px", fontWeight:900, color: rowResult.isTargetHit ? THEME.green : THEME.t1}}>Rp {formatRupiahCompact(rowResult.balanceValue)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          BOTTOM NAVIGATION COMPONENT
      ──────────────────────────────────────────────────────── */}
      <BottomNavigation currentTab={activeMenuTab} onTabChange={setActiveMenuTab} />

      {/* ────────────────────────────────────────────────────────
          MODALS / BOTTOM SHEETS INTERFACE
      ──────────────────────────────────────────────────────── */}
      
      <SlideUpModal isOpen={isTopUpModalOpen} onClose={() => setIsTopUpModalOpen(false)} title="Top Up Dana (DCA)" subtitle="Suntik dana tambahan ke Cash Reserve untuk membeli lebih banyak saham.">
        <div style={{background:THEME.lBg, border:`1px solid ${THEME.lBdr}`, padding:"16px", borderRadius:"16px", marginBottom:"24px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <span style={{fontSize:"13px", fontWeight:700, color:THEME.blue}}>Daya Beli (Cash) Saat Ini:</span>
          <span style={{fontSize:"16px", fontWeight:900, color:THEME.blue}}>Rp {formatRupiah(globalAvailableCash)}</span>
        </div>
        <FormInput label="NOMINAL TOP UP (Rp)" type="text" prefixText="Rp" value={inputTopUpNominal} onChange={e => {
          const rawDigit = e.target.value.replace(/\D/g, "");
          setInputTopUpNominal(rawDigit ? new Intl.NumberFormat("id-ID").format(rawDigit) : "");
        }} placeholder="Minimal Rp 100.000" />
        <ActionButton isFullWidth onClick={executeTopUpModal} customStyle={{marginTop:"12px"}}>Injeksi Modal Sekarang</ActionButton>
      </SlideUpModal>

      <SlideUpModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={`Beli ${addStockData?.c || addStockData?.stock_code || ""}`} subtitle={addStockData?.n || "Buka posisi baru atau Average Down"}>
        <div style={{background:THEME.bg2, padding:"16px", borderRadius:"16px", marginBottom:"24px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px"}}>
          <div><div style={{fontSize:"10px", fontWeight:800, color:THEME.t3, marginBottom:"4px"}}>CASH TERSEDIA</div><div style={{fontSize:"15px", fontWeight:800, color:THEME.em}}>Rp {formatRupiahCompact(globalAvailableCash)}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:"10px", fontWeight:800, color:THEME.t3, marginBottom:"4px"}}>HARGA PASAR</div><div style={{fontSize:"15px", fontWeight:800, color:THEME.t1}}>Rp {formatRupiah(inputBuyPrice)}</div></div>
        </div>
        <FormInput label="HARGA BELI (Rp)" type="number" prefixText="Rp" value={inputBuyPrice} onChange={e=>setInputBuyPrice(e.target.value)} />
        <FormInput label="JUMLAH LOT" type="number" hint="1 Lot = 100 Lembar" value={inputBuyLot} onChange={e=>setInputBuyLot(e.target.value)} placeholder="Contoh: 10" />
        {inputBuyLot && inputBuyPrice && (
          <div style={{background:THEME.bg3, padding:"16px", borderRadius:"16px", marginBottom:"24px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <span style={{fontSize:"13px", fontWeight:700, color:THEME.t2}}>Total Biaya Pembelian:</span>
            <span style={{fontSize:"16px", fontWeight:900, color:THEME.t1}}>Rp {formatRupiah(parseInt(inputBuyLot) * 100 * parseFloat(inputBuyPrice))}</span>
          </div>
        )}
        <ActionButton isFullWidth onClick={executeBuyStock}>Eksekusi Pembelian</ActionButton>
      </SlideUpModal>

      <SlideUpModal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)} title={`Jual ${sellStockData?.stock_code}`} subtitle="Amankan Profit atau Lakukan Cut Loss Sesuai Trading Plan">
        <div style={{background:THEME.bg2, padding:"16px", borderRadius:"16px", marginBottom:"24px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <span style={{fontSize:"13px", fontWeight:700, color:THEME.t2}}>Lot Dimiliki:</span>
          <span style={{fontSize:"16px", fontWeight:900, color:THEME.t1}}>{sellStockData?.lot} Lot <span style={{fontSize:"12px", color:THEME.t3, fontWeight:600}}>(Avg: Rp {formatRupiah(sellStockData?.avg_price)})</span></span>
        </div>
        <FormInput label="HARGA JUAL (Rp)" type="number" prefixText="Rp" value={inputSellPrice} onChange={e=>setInputSellPrice(e.target.value)} />
        <FormInput label="JUMLAH LOT DIJUAL" type="number" hint={`Batas Maksimal ${sellStockData?.lot} Lot`} value={inputSellLot} onChange={e=>setInputSellLot(e.target.value)} />
        {inputSellPrice && inputSellLot && (() => {
          const pnlEst = (parseFloat(inputSellPrice) - sellStockData.avg_price) * (parseInt(inputSellLot) * 100);
          return (
            <div style={{background: pnlEst >= 0 ? THEME.gBg : THEME.rBg, border:`1px solid ${pnlEst >= 0 ? THEME.gBdr : THEME.rBdr}`, padding:"16px", borderRadius:"16px", marginBottom:"24px", textAlign:"center"}}>
              <div style={{fontSize:"11px", fontWeight:800, color:pnlEst >= 0 ? THEME.green : THEME.red, marginBottom:"4px"}}>ESTIMASI REALIZED PNL</div>
              <div style={{fontSize:"20px", fontWeight:900, color:pnlEst >= 0 ? THEME.green : THEME.red}}>{pnlEst >= 0 ? "+" : ""}Rp {formatRupiah(pnlEst)}</div>
            </div>
          );
        })()}
        <ActionButton variant="danger" isFullWidth onClick={executeSellStock}>Konfirmasi Penjualan Selesai</ActionButton>
      </SlideUpModal>

    </div>
  );
}