/**
 * src/App.jsx
 * ─────────────────────────────────────────────────────────
 * ARRIVAR INVESTGUARD v9 — Main Application
 *
 * Perubahan utama dari v8:
 *  ✓ Yahoo Finance API sekarang lewat /api/yahoo (Vercel Serverless)
 *  ✓ Zero CORS, Zero 403 error
 *  ✓ Bug fix: s.livePrice → s.price di Screener
 *  ✓ Stooq.com sebagai fallback otomatis
 *  ✓ Kode dipecah jadi module terpisah (lib/, components/)
 */

import {
  useState, useEffect, useCallback,
} from "react";

import {
  LayoutDashboard, Search, BookOpen, BarChart2, TrendingUp,
  Plus, RefreshCw, Download, LogIn, UserPlus, LogOut,
  X, ArrowUpRight, ArrowDownRight, Wallet, AlertTriangle,
  CheckCircle, Target, PieChart, Trophy, Landmark,
  ShieldCheck, Info, Filter, Activity,
} from "lucide-react";

import { supabase }                                       from "./lib/supabase";
import { fetchBatchLiveQuotes, fetchSingleStockSearch }  from "./lib/yahooApi";
import { calculateMoneyManagement, generateAdvisorySuggestions } from "./lib/moneyManagement";
import { POPULAR_IDX_SYMBOLS, THEME, GLOBAL_STYLES }    from "./lib/constants";
import {
  formatRupiah, formatRupiahCompact, formatPercent,
  getProfitColor, getTodayDateString, getCurrentTimeString,
  exportDataToCSV,
} from "./lib/utils";
import {
  AppToast, StatusPill, AdvisoryBox, LoadingIndicator,
  ActionButton, FormInput, SlideUpModal,
} from "./components/UI";

/* ═══════════════════════════════════════════════════════
   BOTTOM NAV (inline agar tidak ada circular import)
═══════════════════════════════════════════════════════ */
const BottomNavigation = ({ currentTab, onTabChange }) => {
  const items = [
    { id: "portfolio", label: "Portofolio", Icon: LayoutDashboard },
    { id: "screener",  label: "Screener",   Icon: Search },
    { id: "jurnal",    label: "Jurnal",      Icon: BookOpen },
    { id: "monitor",   label: "Monitor",     Icon: BarChart2 },
    { id: "forecast",  label: "Forecast",    Icon: TrendingUp },
  ];
  return (
    <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:"480px", zIndex:100, background:"rgba(8,15,26,0.97)", backdropFilter:"blur(20px)", borderTop:`1px solid ${THEME.bdr2}`, display:"flex", justifyContent:"space-around", padding:"12px 8px calc(12px + env(safe-area-inset-bottom))" }}>
      {items.map(({ id, label, Icon }) => {
        const active = currentTab === id;
        return (
          <button key={id} onClick={()=>onTabChange(id)} style={{ background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:"6px", flex:1, transition:"all 0.2s" }}>
            <Icon size={22} color={active?THEME.em:THEME.t3} strokeWidth={active?2.5:2} style={{ transition:"all 0.2s", transform:active?"scale(1.1)":"scale(1)" }}/>
            <span style={{ fontSize:"10px", fontWeight:active?800:600, color:active?THEME.em:THEME.t3 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════ */
export default function App() {
  // ── STATE: AUTH & DATA ──────────────────────────────────
  const [activeSession,   setActiveSession]   = useState(null);
  const [userProfile,     setUserProfile]     = useState(null);
  const [portfolioData,   setPortfolioData]   = useState([]);
  const [journalData,     setJournalData]     = useState([]);

  // ── STATE: UI ───────────────────────────────────────────
  const [activeMenuTab,       setActiveMenuTab]       = useState("portfolio");
  const [toastNotification,   setToastNotification]   = useState(null);
  const [isFetchingPrices,    setIsFetchingPrices]    = useState(false);

  // ── STATE: LIVE PRICE CACHE ─────────────────────────────
  const [cachedLivePrices,  setCachedLivePrices]  = useState({});
  const [timeLastSynced,    setTimeLastSynced]    = useState("");
  const [masterScreenerData, setMasterScreenerData] = useState([]);
  const [isScreenerLoaded,  setIsScreenerLoaded]  = useState(false);

  // ── STATE: SCREENER ─────────────────────────────────────
  const [screenerSearchText,    setScreenerSearchText]    = useState("");
  const [screenerActiveFilter,  setScreenerActiveFilter]  = useState("Semua");
  const [isSearchingAPI,        setIsSearchingAPI]        = useState(false);

  // ── STATE: FORECAST ─────────────────────────────────────
  const [inputForecastTarget,  setInputForecastTarget]  = useState("3000000000");
  const [inputForecastMonthly, setInputForecastMonthly] = useState("2000000");
  const [inputForecastReturn,  setInputForecastReturn]  = useState("15");
  const [inputForecastYears,   setInputForecastYears]   = useState("10");

  // ── STATE: MODALS ───────────────────────────────────────
  const [isAddModalOpen,  setIsAddModalOpen]  = useState(false);
  const [addStockData,    setAddStockData]    = useState(null);
  const [inputBuyLot,     setInputBuyLot]     = useState("");
  const [inputBuyPrice,   setInputBuyPrice]   = useState("");

  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [sellStockData,   setSellStockData]   = useState(null);
  const [inputSellLot,    setInputSellLot]    = useState("");
  const [inputSellPrice,  setInputSellPrice]  = useState("");

  const [isTopUpModalOpen,  setIsTopUpModalOpen]  = useState(false);
  const [inputTopUpNominal, setInputTopUpNominal] = useState("");

  // ── STATE: AUTH FORM ────────────────────────────────────
  const [inputAuthEmail,    setInputAuthEmail]    = useState("");
  const [inputAuthPassword, setInputAuthPassword] = useState("");
  const [isAuthModeLogin,   setIsAuthModeLogin]   = useState(true);
  const [isAuthLoading,     setIsAuthLoading]     = useState(false);

  // ── HELPER: TOAST ───────────────────────────────────────
  const triggerToast = useCallback((msg, type = "green") => {
    setToastNotification({ msg, type });
    setTimeout(() => setToastNotification(null), 3500);
  }, []);

  // ── EFFECT: SUPABASE AUTH ───────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setActiveSession(session);
      if (session) loadUserData(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setActiveSession(session);
        if (session) loadUserData(session.user.id);
        else {
          setUserProfile(null);
          setPortfolioData([]);
          setJournalData([]);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId) => {
    try {
      const [{ data: prof }, { data: port }, { data: jnl }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("portfolio").select("*").eq("user_id", userId),
        supabase.from("journal").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);
      if (prof)  setUserProfile(prof);
      if (port)  setPortfolioData(port);
      if (jnl)   setJournalData(jnl);
    } catch (err) {
      console.error("Gagal load data Supabase:", err);
    }
  };

  // ── EFFECT: LOAD SCREENER DATA ──────────────────────────
  const loadScreenerData = useCallback(async () => {
    if (isScreenerLoaded) return;
    setIsFetchingPrices(true);

    try {
      const data = await fetchBatchLiveQuotes(POPULAR_IDX_SYMBOLS);
      const arr = Object.values(data);

      if (arr.length > 0) {
        setMasterScreenerData(arr);
        const priceDict = {};
        arr.forEach(item => { priceDict[item.c] = item; });
        setCachedLivePrices(prev => ({ ...prev, ...priceDict }));
        setTimeLastSynced(getCurrentTimeString());
        setIsScreenerLoaded(true);
        triggerToast(`✓ ${arr.length} saham IDX berhasil dimuat`, "green");
      } else {
        triggerToast("Koneksi ke bursa gagal. Periksa koneksi internet.", "red");
      }
    } catch (err) {
      console.error("loadScreenerData error:", err);
      triggerToast("Error memuat data pasar.", "red");
    } finally {
      setIsFetchingPrices(false);
    }
  }, [isScreenerLoaded, triggerToast]);

  useEffect(() => {
    if (activeSession && !isScreenerLoaded) loadScreenerData();
  }, [activeSession, isScreenerLoaded, loadScreenerData]);

  // ── EFFECT: AUTO REFRESH PORTOFOLIO (30 DETIK) ─────────
  const syncPortfolioPrices = useCallback(async () => {
    if (!portfolioData.length) return;
    setIsFetchingPrices(true);

    const codes = portfolioData.map(p => p.stock_code);
    const updated = await fetchBatchLiveQuotes(codes);

    if (Object.keys(updated).length > 0) {
      setCachedLivePrices(prev => ({ ...prev, ...updated }));
      setTimeLastSynced(getCurrentTimeString());
    }
    setIsFetchingPrices(false);
  }, [portfolioData]);

  useEffect(() => {
    if (portfolioData.length > 0 && isScreenerLoaded) {
      const id = setInterval(syncPortfolioPrices, 30000);
      return () => clearInterval(id);
    }
  }, [portfolioData.length, isScreenerLoaded, syncPortfolioPrices]);

  // ── HANDLER: AUTH ───────────────────────────────────────
  const handleAuth = async () => {
    if (!inputAuthEmail || !inputAuthPassword) {
      triggerToast("Email dan password wajib diisi", "amber");
      return;
    }
    setIsAuthLoading(true);
    try {
      if (isAuthModeLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: inputAuthEmail, password: inputAuthPassword,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: inputAuthEmail, password: inputAuthPassword,
        });
        if (error) throw error;
        triggerToast("Akun dibuat! Silakan masuk.", "green");
        setIsAuthModeLogin(true);
      }
    } catch (err) {
      triggerToast(err.message, "red");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // ── HANDLER: SCREENER SEARCH ────────────────────────────
  const handleScreenerSearch = async (e) => {
    e.preventDefault();
    const query = screenerSearchText.trim();
    if (!query) return;

    setIsSearchingAPI(true);
    const result = await fetchSingleStockSearch(query);

    if (result) {
      setMasterScreenerData(prev => {
        const exists = prev.find(s => s.c === result.c);
        return exists ? prev : [result, ...prev];
      });
      setCachedLivePrices(prev => ({ ...prev, [result.c]: result }));
      triggerToast(`✓ Data live ${result.c} berhasil ditarik!`, "green");
    } else {
      triggerToast(`Kode ${query.toUpperCase()} tidak ditemukan di IDX`, "red");
    }
    setIsSearchingAPI(false);
  };

  // ── HANDLER: TOP UP ─────────────────────────────────────
  const executeTopUp = async () => {
    const amount = parseFloat(inputTopUpNominal.replace(/\D/g, ""));
    if (!amount || amount < 100000) {
      triggerToast("Minimal top up Rp 100.000", "amber");
      return;
    }
    try {
      const newCapital = (userProfile.capital || 0) + amount;
      const { error } = await supabase
        .from("profiles")
        .update({ capital: newCapital })
        .eq("id", activeSession.user.id);
      if (error) throw error;

      await supabase.from("journal").insert([{
        user_id: activeSession.user.id,
        stock_code: "CASH_IN", date: getTodayDateString(),
        lot: 0, shares: 0, avg_price: 0, close_price: 0,
        nominal: amount, type: "TOPUP",
      }]);

      await loadUserData(activeSession.user.id);
      setIsTopUpModalOpen(false);
      setInputTopUpNominal("");
      triggerToast(`Berhasil top up Rp ${formatRupiah(amount)}`, "green");
    } catch (err) {
      triggerToast("Top up gagal: " + err.message, "red");
    }
  };

  // ── HANDLER: BUY ────────────────────────────────────────
  const executeBuy = async () => {
    const lot   = parseInt(inputBuyLot);
    const price = parseFloat(inputBuyPrice);

    if (!lot || !price) {
      triggerToast("Isi jumlah lot dan harga beli", "amber");
      return;
    }

    const shares = lot * 100;
    const cost   = shares * price;
    const invested = portfolioData.reduce((s, p) => s + (p.shares * p.avg_price), 0);
    const cash = (userProfile?.capital || 0) - invested;

    if (cost > cash) {
      triggerToast(`Cash tidak cukup! Tersedia: Rp ${formatRupiahCompact(cash)}`, "red");
      return;
    }

    const code    = addStockData.c || addStockData.stock_code;
    const sector  = addStockData.s || addStockData.sector || "IDX";
    const exists  = portfolioData.find(p => p.stock_code === code);

    try {
      if (exists) {
        const newShares = exists.shares + shares;
        const newAvg    = (exists.shares * exists.avg_price + cost) / newShares;
        await supabase.from("portfolio").update({
          lot: exists.lot + lot, shares: newShares,
          avg_price: newAvg, close_price: price,
        }).eq("id", exists.id);
      } else {
        await supabase.from("portfolio").insert([{
          user_id: activeSession.user.id, stock_code: code,
          sector, lot, shares, avg_price: price, close_price: price,
        }]);
      }

      await supabase.from("journal").insert([{
        user_id: activeSession.user.id, stock_code: code,
        date: getTodayDateString(), lot, shares,
        avg_price: price, close_price: price, type: "BUY",
      }]);

      await loadUserData(activeSession.user.id);
      setIsAddModalOpen(false);
      setInputBuyLot(""); setInputBuyPrice("");
      setActiveMenuTab("portfolio");
      triggerToast(`Beli ${code} sukses! 🎯`, "green");
    } catch (err) {
      triggerToast("Transaksi gagal: " + err.message, "red");
    }
  };

  // ── HANDLER: SELL ────────────────────────────────────────
  const executeSell = async () => {
    const lot   = parseInt(inputSellLot);
    const price = parseFloat(inputSellPrice);

    if (!lot || !price) {
      triggerToast("Isi jumlah lot dan harga jual", "amber");
      return;
    }
    if (lot > sellStockData.lot) {
      triggerToast(`Maks ${sellStockData.lot} lot yang dimiliki`, "red");
      return;
    }

    const shares   = lot * 100;
    const realPnL  = (price - sellStockData.avg_price) * shares;
    const remaining = sellStockData.shares - shares;

    try {
      await supabase.from("profiles").update({
        capital: userProfile.capital + realPnL,
      }).eq("id", activeSession.user.id);

      if (remaining === 0) {
        await supabase.from("portfolio").delete().eq("id", sellStockData.id);
      } else {
        await supabase.from("portfolio").update({
          lot: sellStockData.lot - lot,
          shares: remaining, close_price: price,
        }).eq("id", sellStockData.id);
      }

      await supabase.from("journal").insert([{
        user_id: activeSession.user.id, stock_code: sellStockData.stock_code,
        date: getTodayDateString(), lot, shares,
        avg_price: sellStockData.avg_price, close_price: price,
        pnl: realPnL, type: "SELL",
      }]);

      await loadUserData(activeSession.user.id);
      setIsSellModalOpen(false);
      setInputSellLot(""); setInputSellPrice("");
      triggerToast(
        `Realized PnL: ${realPnL >= 0 ? "+" : ""}Rp ${formatRupiah(realPnL)}`,
        realPnL >= 0 ? "green" : "red"
      );
    } catch (err) {
      triggerToast("Penjualan gagal: " + err.message, "red");
    }
  };

  // ── DERIVED VALUES ──────────────────────────────────────
  const globalBaseCapital  = Number(userProfile?.capital) || 0;
  const globalInvested     = portfolioData.reduce(
    (s, p) => s + (p.shares * p.avg_price), 0
  );
  const globalCurrentValue = portfolioData.reduce((s, p) => {
    const price = cachedLivePrices[p.stock_code]?.price || p.close_price || p.avg_price;
    return s + (p.shares * price);
  }, 0);
  const globalUnrealizedPnL  = globalCurrentValue - globalInvested;
  const globalAvailableCash  = Math.max(0, globalBaseCapital - globalInvested);
  const globalCashPct        = globalBaseCapital > 0 ? (globalAvailableCash / globalBaseCapital) * 100 : 100;
  const globalTotalEquity    = globalBaseCapital + globalUnrealizedPnL;
  const cashStatusColor      = globalCashPct < 10 ? "red" : globalCashPct < 20 ? "amber" : "green";

  const totalRealizedPnL = journalData
    .filter(j => j.type === "SELL")
    .reduce((s, j) => s + (j.pnl || 0), 0);

  const winningPositions = portfolioData.filter(p => {
    const price = cachedLivePrices[p.stock_code]?.price || p.close_price;
    return price > p.avg_price;
  }).length;
  const winRate = portfolioData.length > 0
    ? (winningPositions / portfolioData.length) * 100 : 0;

  // ── SCREENER FILTER ─────────────────────────────────────
  const getFilteredScreener = () => {
    let list = [...masterScreenerData];

    if (screenerSearchText.trim()) {
      const q = screenerSearchText.toUpperCase();
      list = list.filter(s => s.c.includes(q) || s.n.toUpperCase().includes(q));
    }

    if (screenerActiveFilter === "Dividen") {
      list = list.filter(s => s.dy >= 5).sort((a, b) => b.dy - a.dy);
    } else if (screenerActiveFilter === "Murah") {
      list = list.filter(s => s.pbv > 0 && s.pbv < 1).sort((a, b) => a.pbv - b.pbv);
    } else if (screenerActiveFilter === "PE Murah") {
      list = list.filter(s => s.pe > 0 && s.pe < 12).sort((a, b) => a.pe - b.pe);
    }

    return list.slice(0, 40);
  };

  const screenerList = getFilteredScreener();

  // ── FORECAST SIMULATION ─────────────────────────────────
  const getForecastData = () => {
    let balance         = globalTotalEquity;
    const monthly       = parseFloat(inputForecastMonthly) || 0;
    const annualReturn  = (parseFloat(inputForecastReturn) || 10) / 100;
    const monthlyReturn = annualReturn / 12;
    const totalMonths   = (parseInt(inputForecastYears) || 10) * 12;
    const target        = parseFloat(inputForecastTarget) || 3_000_000_000;

    const rows = [];
    let hitYear = null;

    for (let m = 1; m <= totalMonths; m++) {
      balance = (balance + monthly) * (1 + monthlyReturn);
      if (m % 12 === 0) {
        const year = m / 12;
        if (!hitYear && balance >= target) hitYear = year;
        rows.push({ year, balance, hit: balance >= target });
      }
    }
    return { rows, hitYear };
  };

  const forecastData = getForecastData();

  /* ═══════════════════════════════════════════════════════
     RENDER: AUTH
  ═══════════════════════════════════════════════════════ */
  if (!activeSession) {
    return (
      <div style={{ minHeight:"100vh", background:`radial-gradient(circle at top left, #132742 0%, ${THEME.bg0} 60%)`, display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}>
        <style>{GLOBAL_STYLES}</style>
        <AppToast notification={toastNotification} />

        <div className="fu" style={{ width:"100%", maxWidth:"400px" }}>
          <div style={{ textAlign:"center", marginBottom:"40px" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:"10px", background:THEME.bg3, border:`1px solid ${THEME.bdr}`, borderRadius:"16px", padding:"12px 20px", marginBottom:"24px" }}>
              <ShieldCheck size={24} color={THEME.em} />
              <span style={{ fontSize:"18px", fontWeight:900, color:THEME.t1, letterSpacing:"1px" }}>
                INVEST<span style={{ color:THEME.em }}>GUARD</span>
              </span>
            </div>
            <h1 style={{ fontSize:"32px", fontWeight:900, color:THEME.t1, lineHeight:1.2, marginBottom:"12px" }}>
              Terminal Trading<br/>Anti Boncos.
            </h1>
            <p style={{ fontSize:"14px", color:THEME.t2, lineHeight:1.6 }}>
              Sistem manajemen risiko saham otomatis.<br/>
              Jaga modalmu, lipat gandakan profitmu.
            </p>
          </div>

          <div style={{ background:THEME.bg1, border:`1px solid ${THEME.bdr2}`, borderRadius:"24px", padding:"32px", boxShadow:"0 20px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ display:"flex", gap:"8px", background:THEME.bg0, padding:"6px", borderRadius:"16px", marginBottom:"24px" }}>
              {[["MASUK", true], ["DAFTAR BARU", false]].map(([label, isLogin]) => (
                <button key={label} onClick={() => setIsAuthModeLogin(isLogin)} style={{ flex:1, padding:"12px", borderRadius:"12px", background:isAuthModeLogin===isLogin?THEME.bg3:"transparent", color:isAuthModeLogin===isLogin?THEME.t1:THEME.t3, border:"none", fontWeight:800, fontSize:"13px", cursor:"pointer", transition:".2s" }}>
                  {label}
                </button>
              ))}
            </div>

            <FormInput label="Alamat Email" type="email" value={inputAuthEmail} onChange={e => setInputAuthEmail(e.target.value)} placeholder="investor@sukses.com" />
            <FormInput label="Kata Sandi" type="password" value={inputAuthPassword} onChange={e => setInputAuthPassword(e.target.value)} placeholder="Minimal 6 karakter" />

            <ActionButton isFullWidth onClick={handleAuth} isDisabled={isAuthLoading} customStyle={{ marginTop:"16px", padding:"16px" }}>
              {isAuthLoading ? <LoadingIndicator /> : (isAuthModeLogin ? "Masuk ke Terminal" : "Mulai Gratis")}
            </ActionButton>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     RENDER: ONBOARDING (Modal Setup Modal Awal)
  ═══════════════════════════════════════════════════════ */
  if (userProfile && userProfile.capital === null) {
    return (
      <div style={{ minHeight:"100vh", background:THEME.bg0, padding:"60px 24px" }}>
        <style>{GLOBAL_STYLES}</style>
        <AppToast notification={toastNotification} />

        <div className="fu" style={{ maxWidth:"480px", margin:"0 auto" }}>
          <div style={{ marginBottom:"40px" }}>
            <div style={{ fontSize:"12px", fontWeight:900, color:THEME.em, letterSpacing:"2px", marginBottom:"12px" }}>LANGKAH TERAKHIR</div>
            <h1 style={{ fontSize:"36px", fontWeight:900, color:THEME.t1, lineHeight:1.1, marginBottom:"16px" }}>
              Berapa Modal<br/>Kerja Kamu?
            </h1>
            <p style={{ fontSize:"15px", color:THEME.t2, lineHeight:1.7 }}>
              InvestGuard menggunakan angka ini sebagai dasar kalkulasi Stop Loss total dan pembatasan alokasi per saham agar kamu tidak boncos mendadak.
            </p>
          </div>

          <div style={{ background:THEME.bg1, border:`1px solid ${THEME.bdr2}`, borderRadius:"24px", padding:"24px", marginBottom:"32px" }}>
            <FormInput
              label="ALOKASI MODAL INVESTASI (Rp)"
              prefixText="Rp"
              type="text"
              value={inputTopUpNominal}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, "");
                setInputTopUpNominal(raw ? new Intl.NumberFormat("id-ID").format(raw) : "");
              }}
              placeholder="Contoh: 10.000.000"
            />
            <div style={{ background:THEME.lBg, border:`1px solid ${THEME.lBdr}`, padding:"16px", borderRadius:"16px", display:"flex", gap:"12px", alignItems:"flex-start", marginTop:"20px" }}>
              <Info size={18} color={THEME.blue} style={{ flexShrink:0, marginTop:"2px" }}/>
              <p style={{ fontSize:"13px", color:THEME.blue, lineHeight:1.6 }}>
                Modal ini menjadi <strong>Cash Reserve (Daya Beli)</strong> awal kamu. Belum dibelikan saham.
              </p>
            </div>
          </div>

          <ActionButton
            isFullWidth
            customStyle={{ padding:"18px", fontSize:"16px" }}
            onClick={async () => {
              const raw = parseFloat(inputTopUpNominal.replace(/\D/g, ""));
              if (!raw || raw < 100000) {
                triggerToast("Modal awal minimal Rp 100.000", "amber");
                return;
              }
              await supabase.from("profiles").update({ capital: raw }).eq("id", activeSession.user.id);
              await supabase.from("journal").insert([{
                user_id: activeSession.user.id, stock_code: "DEPOSIT",
                date: getTodayDateString(), lot: 0, shares: 0,
                avg_price: 0, close_price: 0, nominal: raw, type: "TOPUP",
              }]);
              loadUserData(activeSession.user.id);
            }}
          >
            Masuk ke Dashboard →
          </ActionButton>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     RENDER: MAIN APP
  ═══════════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight:"100vh", background:THEME.bg0, paddingBottom:"100px", maxWidth:"500px", margin:"0 auto", position:"relative" }}>
      <style>{GLOBAL_STYLES}</style>
      <AppToast notification={toastNotification} />

      {/* ══════════════════════════════════════════════════
          TAB 1 — PORTFOLIO
      ══════════════════════════════════════════════════ */}
      {activeMenuTab === "portfolio" && (
        <div className="fu">
          {/* HEADER */}
          <div style={{ background:`linear-gradient(160deg, #0A192F 0%, ${THEME.bg1} 100%)`, padding:"50px 20px 30px", borderBottom:`1px solid ${THEME.bdr2}`, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:"-50px", right:"-50px", width:"200px", height:"200px", background:"radial-gradient(circle, rgba(0,200,122,0.08) 0%, transparent 70%)", borderRadius:"50%" }} />

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"24px", position:"relative", zIndex:2 }}>
              <div>
                <div style={{ fontSize:"11px", fontWeight:800, color:THEME.t3, letterSpacing:"2px", marginBottom:"6px" }}>TOTAL NET EQUITY</div>
                <div style={{ fontSize:"36px", fontWeight:900, color:THEME.t1, letterSpacing:"-1px", lineHeight:1 }}>
                  Rp {formatRupiah(globalTotalEquity)}
                </div>
                <div style={{ display:"inline-flex", alignItems:"center", gap:"6px", marginTop:"12px", background:globalUnrealizedPnL >= 0 ? THEME.gBg : THEME.rBg, border:`1px solid ${globalUnrealizedPnL >= 0 ? THEME.gBdr : THEME.rBdr}`, padding:"6px 14px", borderRadius:"99px" }}>
                  {globalUnrealizedPnL >= 0 ? <ArrowUpRight size={14} color={THEME.green}/> : <ArrowDownRight size={14} color={THEME.red}/>}
                  <span style={{ fontSize:"13px", fontWeight:800, color:globalUnrealizedPnL >= 0 ? THEME.green : THEME.red }}>
                    {globalUnrealizedPnL >= 0 ? "+" : ""}Rp {formatRupiahCompact(Math.abs(globalUnrealizedPnL))} ({formatPercent(globalBaseCapital > 0 ? (globalUnrealizedPnL / globalBaseCapital) * 100 : 0)})
                  </span>
                </div>
              </div>

              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"10px" }}>
                <button onClick={() => supabase.auth.signOut()} className="tap" style={{ background:THEME.bg3, border:`1px solid ${THEME.bdr2}`, padding:"8px", borderRadius:"12px", cursor:"pointer" }}>
                  <LogOut size={16} color={THEME.t2} />
                </button>
                <div style={{ fontSize:"9px", color:THEME.t3, fontWeight:700, display:"flex", alignItems:"center", gap:"4px" }}>
                  {isFetchingPrices
                    ? <><LoadingIndicator size={10}/> SYNCING</>
                    : <><span style={{ width:"6px", height:"6px", borderRadius:"50%", background:THEME.green }} className="pulse"/> LIVE {timeLastSynced}</>
                  }
                </div>
              </div>
            </div>

            {/* Mini Stats */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"20px", position:"relative", zIndex:2 }}>
              {[
                ["MODAL TERPAKAI", formatRupiahCompact(globalInvested)],
                ["NILAI PASAR (LIVE)", formatRupiahCompact(globalCurrentValue)],
              ].map(([label, val]) => (
                <div key={label} style={{ background:THEME.bg2, border:`1px solid ${THEME.bdr}`, borderRadius:"16px", padding:"14px" }}>
                  <div style={{ fontSize:"10px", color:THEME.t3, fontWeight:800, marginBottom:"4px" }}>{label}</div>
                  <div style={{ fontSize:"15px", color:THEME.t1, fontWeight:800 }}>Rp {val}</div>
                </div>
              ))}
            </div>

            {/* Cash Reserve Bar */}
            <div style={{ background:THEME.bg2, border:`1px solid ${THEME.bdr}`, borderRadius:"18px", padding:"16px", position:"relative", zIndex:2 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
                <span style={{ fontSize:"11px", fontWeight:800, color:THEME.t2 }}>CASH RESERVE (DAYA BELI)</span>
                <span style={{ fontSize:"14px", fontWeight:900, color:cashStatusColor === "red" ? THEME.red : cashStatusColor === "amber" ? THEME.amber : THEME.green }}>
                  {globalCashPct.toFixed(1)}% <span style={{ fontSize:"11px", fontWeight:600, color:THEME.t3 }}>| Rp {formatRupiahCompact(globalAvailableCash)}</span>
                </span>
              </div>
              <div style={{ height:"6px", background:THEME.bg0, borderRadius:"99px", overflow:"hidden", position:"relative" }}>
                <div style={{ height:"100%", width:`${Math.min(100, globalCashPct)}%`, background:cashStatusColor === "red" ? THEME.red : cashStatusColor === "amber" ? THEME.amber : THEME.green, transition:"width 0.8s ease-out" }} />
                <div style={{ position:"absolute", left:"10%", top:0, bottom:0, width:"2px", background:THEME.bdr2 }} />
                <div style={{ position:"absolute", left:"20%", top:0, bottom:0, width:"2px", background:THEME.bdr2 }} />
              </div>
            </div>
          </div>

          {/* PORTFOLIO BODY */}
          <div style={{ padding:"20px 20px 0" }}>
            {cashStatusColor !== "green" && (
              <div className="fu" style={{ background:cashStatusColor === "red" ? THEME.rBg : THEME.aBg, border:`1px solid ${cashStatusColor === "red" ? THEME.rBdr : THEME.aBdr}`, borderRadius:"16px", padding:"14px", marginBottom:"20px", display:"flex", gap:"10px", alignItems:"center" }}>
                <AlertTriangle size={18} color={cashStatusColor === "red" ? THEME.red : THEME.amber} style={{ flexShrink:0 }}/>
                <p style={{ fontSize:"13px", color:cashStatusColor === "red" ? THEME.red : THEME.amber, fontWeight:600, lineHeight:1.5 }}>
                  {cashStatusColor === "red"
                    ? `Kas kritis ${globalCashPct.toFixed(1)}%! DILARANG beli saham baru. Siapkan injeksi dana.`
                    : `Kas menipis ${globalCashPct.toFixed(1)}%. Di bawah level ideal 20%. Kurangi intensitas beli.`
                  }
                </p>
              </div>
            )}

            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:"12px", marginBottom:"24px" }}>
              <ActionButton icon={<Search size={16}/>} onClick={() => setActiveMenuTab("screener")}>
                Cari & Beli Saham
              </ActionButton>
              <ActionButton variant="secondary" icon={<Wallet size={16}/>} onClick={() => setIsTopUpModalOpen(true)}>
                Top Up
              </ActionButton>
            </div>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
              <h2 style={{ fontSize:"18px", fontWeight:900, color:THEME.t1 }}>Aset Berjalan</h2>
              <span style={{ fontSize:"12px", color:THEME.t3, fontWeight:700, background:THEME.bg2, padding:"4px 10px", borderRadius:"8px" }}>
                {portfolioData.length} Posisi
              </span>
            </div>

            {portfolioData.length === 0 ? (
              <div style={{ textAlign:"center", padding:"60px 20px", background:THEME.bg1, border:`1px dashed ${THEME.bdr2}`, borderRadius:"24px" }}>
                <Landmark size={40} color={THEME.t3} style={{ margin:"0 auto 16px", opacity:0.5 }}/>
                <h3 style={{ fontSize:"16px", fontWeight:800, color:THEME.t1, marginBottom:"8px" }}>Portofolio Kosong</h3>
                <p style={{ fontSize:"13px", color:THEME.t2, lineHeight:1.6 }}>
                  Mulai bangun asetmu. Cari saham di Screener dan eksekusi pembelian pertama.
                </p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
                {portfolioData.map((pos, idx) => {
                  const livePrice = cachedLivePrices[pos.stock_code]?.price || pos.close_price || pos.avg_price;
                  const mm = calculateMoneyManagement(globalBaseCapital, pos.avg_price, livePrice, pos.shares);
                  const advisory = generateAdvisorySuggestions(mm, pos.stock_code, globalCashPct);
                  const safeAlloc = Number(mm.allocPct) || 0;
                  const overAlloc = safeAlloc > 20;

                  return (
                    <div key={pos.id} className="fu" style={{ background:THEME.bg1, border:`1px solid ${mm.pnlPct <= -8 ? THEME.rBdr : THEME.bdr2}`, borderRadius:"24px", overflow:"hidden", animationDelay:`${idx * 0.05}s` }}>
                      {mm.pnlPct <= -8 && (
                        <div style={{ background:THEME.rBg, padding:"8px 16px", display:"flex", gap:"8px", alignItems:"center", borderBottom:`1px solid ${THEME.rBdr}` }}>
                          <AlertTriangle size={14} color={THEME.red}/>
                          <span style={{ fontSize:"11px", fontWeight:800, color:THEME.red }}>STOP LOSS HIT (-8%)</span>
                        </div>
                      )}

                      <div style={{ padding:"20px 20px 0" }}>
                        {/* Header saham */}
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px" }}>
                          <div style={{ display:"flex", gap:"14px", alignItems:"center" }}>
                            <div style={{ width:"50px", height:"50px", borderRadius:"14px", background:THEME.bg2, border:`1px solid ${THEME.bdr}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"15px", fontWeight:900, color:THEME.em }}>
                              {pos.stock_code.slice(0, 2)}
                            </div>
                            <div>
                              <div style={{ fontSize:"18px", fontWeight:900, color:THEME.t1 }}>{pos.stock_code}</div>
                              <div style={{ fontSize:"12px", color:THEME.t3, marginTop:"2px", fontWeight:600 }}>{pos.sector}</div>
                            </div>
                          </div>
                          <div style={{ textAlign:"right" }}>
                            <div style={{ fontSize:"20px", fontWeight:900, color:getProfitColor(mm.pnlPct, THEME) }}>{formatPercent(mm.pnlPct)}</div>
                            <div style={{ fontSize:"13px", fontWeight:700, color:getProfitColor(mm.pnl, THEME), marginTop:"2px" }}>
                              {mm.pnl >= 0 ? "+" : ""}Rp {formatRupiahCompact(Math.abs(mm.pnl))}
                            </div>
                          </div>
                        </div>

                        {/* Grid stats */}
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"8px", marginBottom:"16px" }}>
                          <div style={{ background:THEME.bg2, padding:"12px", borderRadius:"12px" }}>
                            <div style={{ fontSize:"9px", color:THEME.t3, fontWeight:800, marginBottom:"4px" }}>LOT / LBR</div>
                            <div style={{ fontSize:"13px", fontWeight:800, color:THEME.t1 }}>
                              {pos.lot} <span style={{ fontSize:"10px", color:THEME.t2, fontWeight:600 }}>({formatRupiah(pos.shares)})</span>
                            </div>
                          </div>
                          <div style={{ background:THEME.bg2, padding:"12px", borderRadius:"12px" }}>
                            <div style={{ fontSize:"9px", color:THEME.t3, fontWeight:800, marginBottom:"4px" }}>AVG BUY</div>
                            <div style={{ fontSize:"13px", fontWeight:800, color:THEME.t1 }}>Rp {formatRupiah(pos.avg_price)}</div>
                          </div>
                          <div style={{ background:THEME.bg2, padding:"12px", borderRadius:"12px" }}>
                            <div style={{ fontSize:"9px", color:THEME.t3, fontWeight:800, marginBottom:"4px" }}>LIVE PRICE</div>
                            <div style={{ fontSize:"13px", fontWeight:800, color:THEME.em }}>Rp {formatRupiah(livePrice)}</div>
                          </div>
                        </div>

                        {/* Alloc bar */}
                        <div style={{ marginBottom:"16px" }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
                            <span style={{ fontSize:"11px", fontWeight:700, color:THEME.t2 }}>Bobot terhadap Modal</span>
                            <span style={{ fontSize:"12px", fontWeight:800, color:overAlloc ? THEME.red : THEME.t1 }}>
                              {safeAlloc.toFixed(1)}% <span style={{ color:THEME.t3 }}>/ 20%</span>
                            </span>
                          </div>
                          <div style={{ height:"6px", background:THEME.bg2, borderRadius:"99px", overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${Math.min(100, (safeAlloc / 20) * 100)}%`, background:overAlloc ? THEME.red : safeAlloc > 15 ? THEME.amber : THEME.em, transition:"width 0.5s ease" }} />
                          </div>
                        </div>

                        {/* Trading Plan */}
                        <div style={{ background:THEME.bg2, border:`1px solid ${THEME.bdr}`, padding:"16px", borderRadius:"16px", marginBottom:"16px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"10px", fontWeight:800, color:THEME.t2, letterSpacing:"1px", marginBottom:"12px" }}>
                            <Target size={14} color={THEME.t3}/> TRADING PLAN AKTIF (R:R 1:2)
                          </div>
                          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 16px" }}>
                            {[
                              ["SL (-8%)",    mm.sl,    THEME.red],
                              ["TP1 (+15%)",  mm.tp1,   THEME.green],
                              ["Avg Down",    mm.adLvl, THEME.amber],
                              ["TP2 (+25%)",  mm.tp2,   THEME.green],
                            ].map(([label, val, color]) => (
                              <div key={label} style={{ display:"flex", justifyContent:"space-between", fontSize:"12px" }}>
                                <span style={{ color:THEME.t3, fontWeight:600 }}>{label}</span>
                                <strong style={{ color }}>Rp {formatRupiah(val)}</strong>
                              </div>
                            ))}
                          </div>
                        </div>

                        <AdvisoryBox type={advisory[0].type} text={advisory[0].text} />
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1px", background:THEME.bdr2, marginTop:"10px" }}>
                        <button onClick={() => { setSellStockData(pos); setIsSellModalOpen(true); }} style={{ background:THEME.bg1, border:"none", padding:"16px", fontSize:"13px", fontWeight:800, color:THEME.red, cursor:"pointer" }} className="tap">
                          JUAL SAHAM
                        </button>
                        <button onClick={() => { setAddStockData({ c:pos.stock_code, s:pos.sector }); setInputBuyPrice(livePrice.toString()); setIsAddModalOpen(true); }} style={{ background:THEME.bg1, border:"none", padding:"16px", fontSize:"13px", fontWeight:800, color:THEME.green, cursor:"pointer" }} className="tap">
                          TAMBAH MUATAN
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 2 — SCREENER
          BUG FIX: s.price bukan s.livePrice
      ══════════════════════════════════════════════════ */}
      {activeMenuTab === "screener" && (
        <div className="fu" style={{ padding:"60px 20px 20px" }}>
          <div style={{ marginBottom:"24px" }}>
            <h2 style={{ fontSize:"28px", fontWeight:900, color:THEME.t1, letterSpacing:"-0.5px", marginBottom:"8px" }}>Screener IDX</h2>
            <p style={{ fontSize:"14px", color:THEME.t2, lineHeight:1.6 }}>
              Data langsung dari bursa via server proxy. Ketik kode untuk tarik fundamental terkini.
            </p>
            {!isScreenerLoaded && (
              <div style={{ display:"flex", alignItems:"center", gap:"8px", marginTop:"12px", color:THEME.amber, fontSize:"13px", fontWeight:600 }}>
                <LoadingIndicator /> Memuat data pasar dari Yahoo Finance...
              </div>
            )}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleScreenerSearch} style={{ display:"flex", gap:"10px", marginBottom:"20px" }}>
            <div style={{ flex:1, position:"relative" }}>
              <Search size={18} color={THEME.t3} style={{ position:"absolute", left:"16px", top:"50%", transform:"translateY(-50%)" }}/>
              <input
                type="text"
                value={screenerSearchText}
                onChange={e => setScreenerSearchText(e.target.value)}
                placeholder="Ketik kode saham (BREN, CUAN, GOTO...)"
                style={{ width:"100%", background:THEME.bg1, border:`1.5px solid ${THEME.bdr2}`, borderRadius:"16px", padding:"16px 16px 16px 44px", color:THEME.t1, fontSize:"14px", fontWeight:700, transition:".2s" }}
                onFocus={e => e.target.style.borderColor = THEME.em}
                onBlur={e => e.target.style.borderColor = THEME.bdr2}
              />
            </div>
            <ActionButton type="submit" isDisabled={isSearchingAPI} customStyle={{ padding:"0 20px" }}>
              {isSearchingAPI ? <LoadingIndicator /> : "Cari"}
            </ActionButton>
          </form>

          {/* Quick Filters */}
          <div style={{ display:"flex", gap:"8px", overflowX:"auto", paddingBottom:"12px", marginBottom:"16px" }} className="hide-scrollbar">
            {[
              { id:"Semua",   label:"Populer IDX" },
              { id:"Dividen", label:"Dividen >5%" },
              { id:"Murah",   label:"Valuasi Murah (PBV<1)" },
              { id:"PE Murah",label:"PE Rendah (<12x)" },
            ].map(f => (
              <button key={f.id} onClick={() => setScreenerActiveFilter(f.id)} style={{ background:screenerActiveFilter === f.id ? THEME.em : THEME.bg1, color:screenerActiveFilter === f.id ? THEME.bg0 : THEME.t2, border:`1px solid ${screenerActiveFilter === f.id ? THEME.em : THEME.bdr2}`, borderRadius:"99px", padding:"10px 18px", fontSize:"12px", fontWeight:800, whiteSpace:"nowrap", cursor:"pointer", transition:".2s" }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Screener List */}
          <div style={{ display:"grid", gap:"12px" }}>
            {screenerList.length === 0 && isScreenerLoaded && (
              <div style={{ textAlign:"center", padding:"40px 20px", color:THEME.t3 }}>
                <Filter size={32} style={{ margin:"0 auto 12px", opacity:0.5 }}/>
                <p>Tidak ada saham sesuai filter.</p>
              </div>
            )}

            {screenerList.map((s, i) => (
              <div key={s.c} className="fu" style={{ background:THEME.bg1, border:`1px solid ${THEME.bdr2}`, borderRadius:"20px", padding:"20px", animationDelay:`${i * 0.03}s` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"16px" }}>
                  <div style={{ display:"flex", gap:"12px", alignItems:"center" }}>
                    <div style={{ width:"44px", height:"44px", borderRadius:"12px", background:THEME.bg2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px", fontWeight:900, color:THEME.t1, border:`1px solid ${THEME.bdr}` }}>
                      {s.c.slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize:"18px", fontWeight:900, color:THEME.t1 }}>{s.c}</div>
                      <div style={{ fontSize:"12px", color:THEME.t3, marginTop:"2px", maxWidth:"160px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.n}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    {/* ✓ FIX: gunakan s.price, bukan s.livePrice */}
                    <div style={{ fontSize:"11px", fontWeight:800, color:THEME.t3, marginBottom:"4px" }}>HARGA LIVE</div>
                    <div style={{ fontSize:"18px", fontWeight:900, color:THEME.green }}>
                      Rp {formatRupiah(s.price || 0)}
                    </div>
                    <div style={{ fontSize:"12px", fontWeight:700, color:s.chgPct >= 0 ? THEME.green : THEME.red, marginTop:"2px" }}>
                      {formatPercent(s.chgPct)}
                    </div>
                  </div>
                </div>

                {/* Fundamental badges */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"8px", marginBottom:"16px" }}>
                  <div style={{ background:THEME.bg2, padding:"10px", borderRadius:"12px", textAlign:"center" }}>
                    <div style={{ fontSize:"9px", fontWeight:800, color:THEME.t3, marginBottom:"4px" }}>DIV YIELD</div>
                    <div style={{ fontSize:"13px", fontWeight:800, color:s.dy >= 5 ? THEME.green : THEME.t1 }}>
                      {s.dy > 0 ? `${s.dy}%` : "—"}
                    </div>
                  </div>
                  <div style={{ background:THEME.bg2, padding:"10px", borderRadius:"12px", textAlign:"center" }}>
                    <div style={{ fontSize:"9px", fontWeight:800, color:THEME.t3, marginBottom:"4px" }}>PBV RATIO</div>
                    <div style={{ fontSize:"13px", fontWeight:800, color:s.pbv > 0 && s.pbv <= 1.2 ? THEME.green : THEME.t1 }}>
                      {s.pbv > 0 ? `${s.pbv}x` : "—"}
                    </div>
                  </div>
                  <div style={{ background:THEME.bg2, padding:"10px", borderRadius:"12px", textAlign:"center" }}>
                    <div style={{ fontSize:"9px", fontWeight:800, color:THEME.t3, marginBottom:"4px" }}>P/E RATIO</div>
                    <div style={{ fontSize:"13px", fontWeight:800, color:THEME.t1 }}>
                      {s.pe > 0 ? `${s.pe}x` : "—"}
                    </div>
                  </div>
                </div>

                {/* ✓ FIX: s.price, bukan s.livePrice */}
                <ActionButton
                  isFullWidth
                  onClick={() => {
                    setAddStockData(s);
                    setInputBuyPrice((s.price || 0).toString());
                    setIsAddModalOpen(true);
                  }}
                >
                  Tambah ke Portofolio
                </ActionButton>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 3 — JURNAL
      ══════════════════════════════════════════════════ */}
      {activeMenuTab === "jurnal" && (
        <div className="fu" style={{ padding:"60px 20px 20px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:"24px" }}>
            <div>
              <h2 style={{ fontSize:"28px", fontWeight:900, color:THEME.t1, marginBottom:"4px" }}>Buku Jurnal</h2>
              <p style={{ fontSize:"13px", color:THEME.t2 }}>{journalData.length} Transaksi Tercatat</p>
            </div>
            <ActionButton variant="secondary" icon={<Download size={14}/>} onClick={() => exportDataToCSV(journalData)} customStyle={{ padding:"10px 16px" }}>
              Excel
            </ActionButton>
          </div>

          {journalData.length === 0 ? (
            <div style={{ background:THEME.bg1, border:`1px dashed ${THEME.bdr2}`, borderRadius:"24px", padding:"60px 20px", textAlign:"center" }}>
              <BookOpen size={40} color={THEME.t3} style={{ margin:"0 auto 16px", opacity:0.5 }}/>
              <div style={{ fontSize:"14px", fontWeight:600, color:THEME.t2 }}>Buku Jurnal Kosong</div>
              <div style={{ fontSize:"12px", color:THEME.t3, marginTop:"8px" }}>Lakukan transaksi untuk mulai mencatat.</div>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
              {journalData.map((row, i) => {
                const isSell   = row.type === "SELL";
                const isTopup  = row.type === "TOPUP";
                return (
                  <div key={row.id} className="fu" style={{ background:THEME.bg1, border:`1px solid ${THEME.bdr2}`, borderRadius:"20px", padding:"20px", animationDelay:`${i * 0.03}s` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px" }}>
                      <div style={{ display:"flex", gap:"10px", alignItems:"center" }}>
                        <StatusPill
                          backgroundColor={isSell ? THEME.rBg : isTopup ? THEME.lBg : THEME.gBg}
                          color={isSell ? THEME.red : isTopup ? THEME.blue : THEME.green}
                          borderColor={isSell ? THEME.rBdr : isTopup ? THEME.lBdr : THEME.gBdr}
                        >
                          {row.type}
                        </StatusPill>
                        <span style={{ fontSize:"16px", fontWeight:900, color:THEME.t1 }}>{row.stock_code}</span>
                      </div>
                      <span style={{ fontSize:"11px", fontWeight:600, color:THEME.t3 }}>{row.date}</span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:THEME.bg2, padding:"12px 16px", borderRadius:"12px" }}>
                      <div>
                        <div style={{ fontSize:"10px", fontWeight:800, color:THEME.t3, marginBottom:"4px" }}>RINCIAN</div>
                        <div style={{ fontSize:"13px", fontWeight:700, color:THEME.t1 }}>
                          {isTopup ? "Injeksi Dana DCA" : `${row.lot} Lot @ Rp ${formatRupiah(row.close_price)}`}
                        </div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:"10px", fontWeight:800, color:THEME.t3, marginBottom:"4px" }}>
                          {isSell ? "REALIZED PNL" : "NOMINAL"}
                        </div>
                        <div style={{ fontSize:"14px", fontWeight:900, color:isSell ? getProfitColor(row.pnl, THEME) : isTopup ? THEME.blue : THEME.t1 }}>
                          {isSell
                            ? `${row.pnl >= 0 ? "+" : ""}${formatRupiahCompact(row.pnl)}`
                            : formatRupiahCompact(row.nominal || (row.lot * 100 * row.close_price))
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 4 — MONITOR
      ══════════════════════════════════════════════════ */}
      {activeMenuTab === "monitor" && (
        <div className="fu" style={{ padding:"60px 20px 20px" }}>
          <div style={{ marginBottom:"24px" }}>
            <h2 style={{ fontSize:"28px", fontWeight:900, color:THEME.t1, marginBottom:"4px" }}>Analyst Monitor</h2>
            <p style={{ fontSize:"13px", color:THEME.t2 }}>Tinjauan makro performa & kesehatan portofolio.</p>
          </div>

          {/* Win Rate + Realized PnL */}
          <div style={{ background:`linear-gradient(135deg, ${THEME.bg1} 0%, ${THEME.bg2} 100%)`, border:`1px solid ${THEME.bdr2}`, borderRadius:"24px", padding:"24px", marginBottom:"20px" }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
              <div>
                <div style={{ fontSize:"11px", fontWeight:800, color:THEME.t3, letterSpacing:"1px", marginBottom:"8px", display:"flex", alignItems:"center", gap:"6px" }}>
                  <Trophy size={14}/> WIN RATE
                </div>
                <div style={{ fontSize:"32px", fontWeight:900, color:THEME.em }}>
                  {winRate.toFixed(0)}<span style={{ fontSize:"20px" }}>%</span>
                </div>
                <div style={{ fontSize:"12px", color:THEME.t2, fontWeight:600, marginTop:"4px" }}>
                  {winningPositions} dari {portfolioData.length} Posisi
                </div>
              </div>
              <div>
                <div style={{ fontSize:"11px", fontWeight:800, color:THEME.t3, letterSpacing:"1px", marginBottom:"8px" }}>REALIZED PNL</div>
                <div style={{ fontSize:"22px", fontWeight:900, color:getProfitColor(totalRealizedPnL, THEME), marginTop:"6px" }}>
                  {totalRealizedPnL >= 0 ? "+" : ""}Rp {formatRupiahCompact(totalRealizedPnL)}
                </div>
                <div style={{ fontSize:"12px", color:THEME.t2, fontWeight:600, marginTop:"4px" }}>Profit yang Sudah Dikunci</div>
              </div>
            </div>
          </div>

          {/* Allocation Map */}
          <div style={{ background:THEME.bg1, border:`1px solid ${THEME.bdr2}`, borderRadius:"24px", padding:"24px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"24px" }}>
              <PieChart size={18} color={THEME.t2}/>
              <h3 style={{ fontSize:"14px", fontWeight:800, color:THEME.t1, letterSpacing:"1px" }}>PETA ALOKASI (MAKS 20%)</h3>
            </div>

            {portfolioData.length === 0 ? (
              <div style={{ color:THEME.t3, fontSize:"13px", textAlign:"center", padding:"20px 0" }}>
                Belum ada data alokasi.
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:"20px" }}>
                {portfolioData.map(pos => {
                  const liveP = cachedLivePrices[pos.stock_code]?.price || pos.avg_price;
                  const alloc = ((pos.shares * liveP) / Math.max(1, globalBaseCapital)) * 100;
                  const over  = alloc > 20;

                  return (
                    <div key={pos.id}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                          <span style={{ fontSize:"14px", fontWeight:800, color:THEME.t1 }}>{pos.stock_code}</span>
                          {over && <StatusPill backgroundColor={THEME.rBg} color={THEME.red} borderColor={THEME.rBdr}>Overweight!</StatusPill>}
                        </div>
                        <span style={{ fontSize:"14px", fontWeight:900, color:over ? THEME.red : THEME.em }}>{alloc.toFixed(1)}%</span>
                      </div>
                      <div style={{ height:"8px", background:THEME.bg0, borderRadius:"99px", overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${Math.min(100, (alloc / 20) * 100)}%`, background:over ? THEME.red : THEME.em, borderRadius:"99px", transition:"width 0.5s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TAB 5 — FORECAST
      ══════════════════════════════════════════════════ */}
      {activeMenuTab === "forecast" && (
        <div className="fu" style={{ padding:"60px 20px 20px" }}>
          <div style={{ background:`linear-gradient(135deg, #181133 0%, ${THEME.bg0} 100%)`, border:`1px solid ${THEME.lBdr}`, borderRadius:"28px", padding:"28px 24px", marginBottom:"20px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:"-20px", right:"-20px", opacity:0.05 }}>
              <TrendingUp size={120} color={THEME.blue}/>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"24px", position:"relative", zIndex:2 }}>
              <div style={{ width:"36px", height:"36px", borderRadius:"12px", background:THEME.lBg, display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${THEME.lBdr}` }}>
                <TrendingUp size={18} color={THEME.blue}/>
              </div>
              <h2 style={{ fontSize:"22px", fontWeight:900, color:THEME.t1 }}>Wealth Forecast</h2>
            </div>

            <div style={{ position:"relative", zIndex:2 }}>
              <FormInput label="TARGET DANA PENSIUN (Rp)" type="number" value={inputForecastTarget} onChange={e => setInputForecastTarget(e.target.value)} />
              <FormInput label="TABUNGAN RUTIN / BULAN (Rp)" type="number" value={inputForecastMonthly} onChange={e => setInputForecastMonthly(e.target.value)} />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"16px" }}>
                <FormInput label="RETURN / TAHUN (%)" type="number" value={inputForecastReturn} onChange={e => setInputForecastReturn(e.target.value)} />
                <FormInput label="DURASI (TAHUN)" type="number" value={inputForecastYears} onChange={e => setInputForecastYears(e.target.value)} />
              </div>
            </div>
          </div>

          <div style={{ background:THEME.bg1, border:`1px solid ${THEME.bdr2}`, borderRadius:"24px", padding:"24px" }}>
            <div style={{ fontSize:"12px", fontWeight:800, color:THEME.t3, letterSpacing:"1px", marginBottom:"20px" }}>HASIL PROYEKSI</div>

            {forecastData.hitYear ? (
              <div className="fu" style={{ background:THEME.gBg, border:`1px solid ${THEME.gBdr}`, padding:"20px", borderRadius:"16px", textAlign:"center", marginBottom:"24px" }}>
                <CheckCircle size={28} color={THEME.green} style={{ margin:"0 auto 12px" }}/>
                <div style={{ fontSize:"16px", fontWeight:800, color:THEME.green }}>
                  Target Rp {formatRupiahCompact(inputForecastTarget)} Tercapai!
                </div>
                <div style={{ fontSize:"13px", color:THEME.green, marginTop:"6px", fontWeight:600 }}>
                  Pada Tahun ke-{forecastData.hitYear}
                </div>
              </div>
            ) : (
              <div className="fu" style={{ background:THEME.rBg, border:`1px solid ${THEME.rBdr}`, padding:"20px", borderRadius:"16px", textAlign:"center", marginBottom:"24px" }}>
                <Target size={28} color={THEME.red} style={{ margin:"0 auto 12px" }}/>
                <div style={{ fontSize:"16px", fontWeight:800, color:THEME.red }}>Target Tidak Terkejar</div>
                <div style={{ fontSize:"13px", color:THEME.red, marginTop:"6px", fontWeight:600 }}>
                  Dalam {inputForecastYears} tahun. Naikkan DCA bulanan atau target return.
                </div>
              </div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              {forecastData.rows.map(row => (
                <div key={row.year} style={{ background:THEME.bg2, padding:"14px 16px", borderRadius:"14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:"14px", fontWeight:700, color:THEME.t2 }}>Tahun ke-{row.year}</span>
                  <span style={{ fontSize:"16px", fontWeight:900, color:row.hit ? THEME.green : THEME.t1 }}>
                    Rp {formatRupiahCompact(row.balance)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          BOTTOM NAV
      ══════════════════════════════════════════════════ */}
      <BottomNavigation currentTab={activeMenuTab} onTabChange={setActiveMenuTab} />

      {/* ══════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════ */}

      {/* TOP UP */}
      <SlideUpModal isOpen={isTopUpModalOpen} onClose={() => setIsTopUpModalOpen(false)} title="Top Up Dana (DCA)" subtitle="Suntik dana tambahan ke Cash Reserve.">
        <div style={{ background:THEME.lBg, border:`1px solid ${THEME.lBdr}`, padding:"16px", borderRadius:"16px", marginBottom:"24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:"13px", fontWeight:700, color:THEME.blue }}>Cash saat ini:</span>
          <span style={{ fontSize:"16px", fontWeight:900, color:THEME.blue }}>Rp {formatRupiah(globalAvailableCash)}</span>
        </div>
        <FormInput
          label="NOMINAL TOP UP (Rp)"
          prefixText="Rp"
          type="text"
          value={inputTopUpNominal}
          onChange={e => {
            const raw = e.target.value.replace(/\D/g, "");
            setInputTopUpNominal(raw ? new Intl.NumberFormat("id-ID").format(raw) : "");
          }}
          placeholder="Minimal Rp 100.000"
        />
        <ActionButton isFullWidth onClick={executeTopUp} customStyle={{ marginTop:"12px" }}>
          Injeksi Modal Sekarang
        </ActionButton>
      </SlideUpModal>

      {/* BUY */}
      <SlideUpModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={`Beli ${addStockData?.c || addStockData?.stock_code || ""}`} subtitle={addStockData?.n || "Buka posisi baru atau Average Down"}>
        <div style={{ background:THEME.bg2, padding:"16px", borderRadius:"16px", marginBottom:"24px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
          <div>
            <div style={{ fontSize:"10px", fontWeight:800, color:THEME.t3, marginBottom:"4px" }}>CASH TERSEDIA</div>
            <div style={{ fontSize:"15px", fontWeight:800, color:THEME.em }}>Rp {formatRupiahCompact(globalAvailableCash)}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:"10px", fontWeight:800, color:THEME.t3, marginBottom:"4px" }}>HARGA PASAR</div>
            <div style={{ fontSize:"15px", fontWeight:800, color:THEME.t1 }}>Rp {formatRupiah(inputBuyPrice)}</div>
          </div>
        </div>

        <FormInput label="HARGA BELI (Rp)" type="number" prefixText="Rp" value={inputBuyPrice} onChange={e => setInputBuyPrice(e.target.value)} />
        <FormInput label="JUMLAH LOT" type="number" hint="1 Lot = 100 Lembar" value={inputBuyLot} onChange={e => setInputBuyLot(e.target.value)} placeholder="Contoh: 10" />

        {inputBuyLot && inputBuyPrice && (
          <div style={{ background:THEME.bg3, padding:"16px", borderRadius:"16px", marginBottom:"24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:"13px", fontWeight:700, color:THEME.t2 }}>Total Biaya:</span>
            <span style={{ fontSize:"16px", fontWeight:900, color:THEME.t1 }}>
              Rp {formatRupiah(parseInt(inputBuyLot) * 100 * parseFloat(inputBuyPrice))}
            </span>
          </div>
        )}

        <ActionButton isFullWidth onClick={executeBuy}>Eksekusi Pembelian</ActionButton>
      </SlideUpModal>

      {/* SELL */}
      <SlideUpModal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)} title={`Jual ${sellStockData?.stock_code}`} subtitle="Amankan Profit atau Cut Loss sesuai Trading Plan">
        <div style={{ background:THEME.bg2, padding:"16px", borderRadius:"16px", marginBottom:"24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:"13px", fontWeight:700, color:THEME.t2 }}>Lot Dimiliki:</span>
          <span style={{ fontSize:"16px", fontWeight:900, color:THEME.t1 }}>
            {sellStockData?.lot} Lot{" "}
            <span style={{ fontSize:"12px", color:THEME.t3, fontWeight:600 }}>(Avg: Rp {formatRupiah(sellStockData?.avg_price)})</span>
          </span>
        </div>

        <FormInput label="HARGA JUAL (Rp)" type="number" prefixText="Rp" value={inputSellPrice} onChange={e => setInputSellPrice(e.target.value)} />
        <FormInput label="JUMLAH LOT DIJUAL" type="number" hint={`Maks ${sellStockData?.lot} Lot`} value={inputSellLot} onChange={e => setInputSellLot(e.target.value)} />

        {inputSellPrice && inputSellLot && (() => {
          const pnlEst = (parseFloat(inputSellPrice) - (sellStockData?.avg_price || 0)) * (parseInt(inputSellLot) * 100);
          return (
            <div style={{ background:pnlEst >= 0 ? THEME.gBg : THEME.rBg, border:`1px solid ${pnlEst >= 0 ? THEME.gBdr : THEME.rBdr}`, padding:"16px", borderRadius:"16px", marginBottom:"24px", textAlign:"center" }}>
              <div style={{ fontSize:"11px", fontWeight:800, color:pnlEst >= 0 ? THEME.green : THEME.red, marginBottom:"4px" }}>
                ESTIMASI REALIZED PNL
              </div>
              <div style={{ fontSize:"20px", fontWeight:900, color:pnlEst >= 0 ? THEME.green : THEME.red }}>
                {pnlEst >= 0 ? "+" : ""}Rp {formatRupiah(pnlEst)}
              </div>
            </div>
          );
        })()}

        <ActionButton variant="danger" isFullWidth onClick={executeSell}>
          Konfirmasi Penjualan
        </ActionButton>
      </SlideUpModal>
    </div>
  );
}