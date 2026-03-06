import { useState, useEffect, useCallback, createContext, useContext } from "react"
import {
  LayoutDashboard, Search, BookOpen, BarChart2, TrendingUp,
  Plus, Download, LogOut, X, ArrowUpRight, ArrowDownRight,
  Wallet, AlertTriangle, Target, PieChart, Trophy, Landmark,
  ShieldCheck, Info, Filter, Sun, Moon, CheckCircle,
  DollarSign, Activity, TrendingDown, BarChart, Percent,
  RefreshCw,
} from "lucide-react"
import { supabase }          from "./lib/supabase"
import { fetchBatchLiveQuotes, fetchSingleStockSearch } from "./lib/yahooApi"
import { calculateMoneyManagement, generateAdvisorySuggestions } from "./lib/moneyManagement"
import { POPULAR_IDX_SYMBOLS, DARK, LIGHT, getGlobalStyles } from "./lib/constants"
import { formatRupiah, formatRupiahCompact, formatPercent, getProfitColor, getTodayDateString, getCurrentTimeString, exportDataToCSV } from "./lib/utils"

// ─── Theme Context ───────────────────────────────────────
const ThemeCtx = createContext({ T: DARK, isDark: true, toggle: ()=>{} })
const useTheme = () => useContext(ThemeCtx)

// ─── Atoms ───────────────────────────────────────────────
const Toast = ({ n }) => {
  const { T } = useTheme()
  if (!n) return null
  const s = { red:{bg:T.rBg,bdr:T.rBdr,col:T.red}, amber:{bg:T.aBg,bdr:T.aBdr,col:T.amber}, green:{bg:T.gBg,bdr:T.gBdr,col:T.green}, blue:{bg:T.lBg,bdr:T.lBdr,col:T.blue} }[n.type] || {bg:T.gBg,bdr:T.gBdr,col:T.green}
  return <div className="fi" style={{ position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:s.bg,border:`1px solid ${s.bdr}`,color:s.col,padding:"12px 24px",borderRadius:"99px",fontWeight:800,fontSize:14,boxShadow:"0 10px 40px rgba(0,0,0,0.4)",whiteSpace:"nowrap",maxWidth:"90vw",textAlign:"center" }}>{n.msg}</div>
}

const Spinner = ({ size=16 }) => {
  const { T } = useTheme()
  return <div className="spin" style={{ width:size,height:size,border:`2px solid ${T.bdr2}`,borderTopColor:T.em,borderRadius:"50%",flexShrink:0,display:"inline-block" }}/>
}

const ThemeBtn = () => {
  const { T, isDark, toggle } = useTheme()
  return (
    <button onClick={toggle} className="tap" style={{ background:T.bg2,border:`1px solid ${T.bdr2}`,borderRadius:12,padding:"9px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:6 }}>
      {isDark ? <><Sun size={15} color={T.amber}/><span style={{ fontSize:12,fontWeight:700,color:T.t2 }}>Light</span></> : <><Moon size={15} color={T.blue}/><span style={{ fontSize:12,fontWeight:700,color:T.t2 }}>Dark</span></>}
    </button>
  )
}

const Btn = ({ children, variant="primary", icon, full, onClick, disabled, style={}, type="button" }) => {
  const { T } = useTheme()
  const v = {
    primary:   { background:T.em,  color:T.bg0, border:"none" },
    secondary: { background:T.bg2, color:T.t1,  border:`1px solid ${T.bdr2}` },
    danger:    { background:T.rBg, color:T.red,  border:`1px solid ${T.rBdr}` },
    ghost:     { background:"transparent", color:T.t2, border:`1px solid ${T.bdr2}` },
  }[variant]
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="tap"
      style={{ ...v, borderRadius:14, padding:"14px 20px", fontSize:14, fontWeight:800, cursor:disabled?"not-allowed":"pointer", display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8, width:full?"100%":"auto", opacity:disabled?0.6:1, ...style }}>
      {icon}{children}
    </button>
  )
}

const Input = ({ label, hint, value, onChange, placeholder, type="text", prefix }) => {
  const { T } = useTheme()
  const [focus, setFocus] = useState(false)
  return (
    <div style={{ marginBottom:16 }}>
      {label && (
        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
          <span style={{ fontSize:11,fontWeight:800,color:T.t2,letterSpacing:"0.5px" }}>{label.toUpperCase()}</span>
          {hint && <span style={{ fontSize:11,color:T.t3 }}>{hint}</span>}
        </div>
      )}
      <div style={{ display:"flex",background:T.bg3,border:`1.5px solid ${focus?T.em:T.bdr2}`,borderRadius:14,overflow:"hidden",transition:"border 0.2s" }}>
        {prefix && <div style={{ padding:"0 14px",fontSize:14,color:T.t3,background:T.bg2,display:"flex",alignItems:"center",borderRight:`1px solid ${T.bdr2}`,fontWeight:700 }}>{prefix}</div>}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
          style={{ flex:1,background:"transparent",border:"none",padding:"14px 16px",color:T.t1,fontSize:15,fontWeight:600,width:"100%" }}/>
      </div>
    </div>
  )
}

const Modal = ({ open, onClose, title, subtitle, children }) => {
  const { T } = useTheme()
  if (!open) return null
  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,display:"flex",flexDirection:"column",justifyContent:"flex-end" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      <div className="fi" onClick={onClose} style={{ position:"absolute",inset:0,background:"rgba(4,9,16,0.85)",backdropFilter:"blur(12px)" }}/>
      <div className="su" style={{ position:"relative",background:T.bg1,borderTop:`1px solid ${T.bdr2}`,borderRadius:"28px 28px 0 0",width:"100%",maxWidth:480,margin:"0 auto",maxHeight:"90vh",overflowY:"auto",paddingBottom:"env(safe-area-inset-bottom)" }}>
        <div style={{ position:"sticky",top:0,background:T.bg1,zIndex:10,padding:"16px 24px 20px",borderBottom:`1px solid ${T.bdr}` }}>
          <div style={{ width:40,height:5,background:T.bdr2,borderRadius:99,margin:"0 auto 16px" }}/>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
            <div>
              <h2 style={{ fontSize:20,fontWeight:800,color:T.t1 }}>{title}</h2>
              {subtitle && <p style={{ fontSize:12,color:T.t3,marginTop:4 }}>{subtitle}</p>}
            </div>
            <button onClick={onClose} className="tap" style={{ background:T.bg3,border:"none",width:36,height:36,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
              <X size={16} color={T.t2}/>
            </button>
          </div>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  )
}

const Advisory = ({ type, text }) => {
  const { T } = useTheme()
  const m = {
    red:     { bg:T.rBg, col:T.red,   bdr:T.rBdr,  icon:"▼" },
    amber:   { bg:T.aBg, col:T.amber, bdr:T.aBdr,  icon:"●" },
    green:   { bg:T.gBg, col:T.green, bdr:T.gBdr,  icon:"▲" },
    blue:    { bg:T.lBg, col:T.blue,  bdr:T.lBdr,  icon:"⚡" },
    neutral: { bg:T.bg3, col:T.t2,    bdr:T.bdr,   icon:"—" },
  }[type] || { bg:T.bg3,col:T.t2,bdr:T.bdr,icon:"—" }
  return (
    <div style={{ background:m.bg,border:`1px solid ${m.bdr}`,borderRadius:12,padding:"12px 16px",marginBottom:8,display:"flex",gap:10,alignItems:"flex-start" }}>
      <span style={{ color:m.col,fontWeight:900,fontSize:14,marginTop:2,flexShrink:0 }}>{m.icon}</span>
      <span style={{ fontSize:13,color:m.col,lineHeight:1.5,fontWeight:500 }}>{text}</span>
    </div>
  )
}

const BottomNav = ({ tab, setTab }) => {
  const { T } = useTheme()
  const items = [
    { id:"portfolio", label:"Portofolio", Icon:LayoutDashboard },
    { id:"screener",  label:"Screener",   Icon:Search },
    { id:"jurnal",    label:"Jurnal",      Icon:BookOpen },
    { id:"monitor",   label:"Monitor",    Icon:BarChart2 },
    { id:"forecast",  label:"Forecast",   Icon:TrendingUp },
  ]
  return (
    <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,zIndex:100,background:T.navBg,backdropFilter:"blur(20px)",borderTop:`1px solid ${T.bdr2}`,display:"flex",padding:"10px 8px calc(10px + env(safe-area-inset-bottom))" }}>
      {items.map(({ id, label, Icon }) => {
        const active = tab===id
        return (
          <button key={id} onClick={()=>setTab(id)} style={{ background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:5,flex:1 }}>
            <Icon size={22} color={active?T.em:T.t3} strokeWidth={active?2.5:2} style={{ transition:"all 0.2s",transform:active?"scale(1.15)":"scale(1)" }}/>
            <span style={{ fontSize:10,fontWeight:active?800:600,color:active?T.em:T.t3,transition:"all 0.2s" }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────
const StatCard = ({ label, value, sub, col, bg, bdr, icon: Icon }) => {
  const { T } = useTheme()
  return (
    <div style={{ background:bg||T.bg2,border:`1px solid ${bdr||T.bdr}`,borderRadius:20,padding:"18px 16px" }}>
      {Icon && <div style={{ marginBottom:10 }}><Icon size={16} color={col}/></div>}
      <div style={{ fontSize:10,fontWeight:800,color:col||T.t3,letterSpacing:"0.5px",marginBottom:8 }}>{label}</div>
      <div style={{ fontSize:20,fontWeight:900,color:col||T.t1,lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11,color:T.t2,marginTop:6,fontWeight:600 }}>{sub}</div>}
    </div>
  )
}

// ─── FundamentalBadge ─────────────────────────────────────
const FBadge = ({ label, value, good }) => {
  const { T } = useTheme()
  const hasVal = value && value !== "—"
  const color = hasVal && good ? T.green : hasVal ? T.t1 : T.t3
  const bg    = hasVal && good ? T.gBg  : T.bg2
  const bdr   = hasVal && good ? T.gBdr : T.bdr
  return (
    <div style={{ background:bg,border:`1px solid ${bdr}`,padding:"10px",borderRadius:12,textAlign:"center" }}>
      <div style={{ fontSize:9,fontWeight:800,color:T.t3,marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:14,fontWeight:900,color }}>{value||"—"}</div>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────
export default function App() {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("ig_theme") !== "light" } catch { return true }
  })
  const T = isDark ? DARK : LIGHT
  const toggleTheme = () => {
    setIsDark(d => {
      try { localStorage.setItem("ig_theme", d ? "light" : "dark") } catch {}
      return !d
    })
  }

  const [session,       setSession]       = useState(null)
  const [profile,       setProfile]       = useState(null)
  const [portfolio,     setPortfolio]     = useState([])
  const [journal,       setJournal]       = useState([])
  const [tab,           setTab]           = useState("portfolio")
  const [toast,         setToast]         = useState(null)
  const [syncing,       setSyncing]       = useState(false)
  const [liveCache,     setLiveCache]     = useState({})
  const [lastSync,      setLastSync]      = useState("")
  const [screenerData,  setScreenerData]  = useState([])
  const [screenerLoaded,setScreenerLoaded]= useState(false)
  const [screenerQ,     setScreenerQ]     = useState("")
  const [screenerFilter,setScreenerFilter]= useState("Semua")
  const [searching,     setSearching]     = useState(false)

  const [fcTarget,  setFcTarget]  = useState("3000000000")
  const [fcMonthly, setFcMonthly] = useState("2000000")
  const [fcReturn,  setFcReturn]  = useState("15")
  const [fcYears,   setFcYears]   = useState("10")

  const [addModal,  setAddModal]  = useState(false)
  const [addStock,  setAddStock]  = useState(null)
  const [buyLot,    setBuyLot]    = useState("")
  const [buyPrice,  setBuyPrice]  = useState("")
  const [sellModal, setSellModal] = useState(false)
  const [sellStock, setSellStock] = useState(null)
  const [sellLot,   setSellLot]   = useState("")
  const [sellPrice, setSellPrice] = useState("")
  const [topupModal,setTopupModal]= useState(false)
  const [topupVal,  setTopupVal]  = useState("")
  const [email,     setEmail]     = useState("")
  const [password,  setPassword]  = useState("")
  const [isLogin,   setIsLogin]   = useState(true)
  const [authLoad,  setAuthLoad]  = useState(false)

  const notify = useCallback((msg, type="green") => {
    setToast({ msg, type }); setTimeout(()=>setToast(null), 3500)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data:{ session }}) => {
      setSession(session); if (session) loadData(session.user.id)
    })
    const { data:{ subscription }} = supabase.auth.onAuthStateChange((_e,s) => {
      setSession(s)
      if (s) loadData(s.user.id)
      else { setProfile(null); setPortfolio([]); setJournal([]) }
    })
    return () => subscription.unsubscribe()
  }, [])

  const loadData = async (uid) => {
    const [{ data:p },{ data:port },{ data:j }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id",uid).single(),
      supabase.from("portfolio").select("*").eq("user_id",uid),
      supabase.from("journal").select("*").eq("user_id",uid).order("created_at",{ ascending:false }),
    ])
    if (p)    setProfile(p)
    if (port) setPortfolio(port)
    if (j)    setJournal(j)
  }

  const loadScreener = useCallback(async () => {
    setSyncing(true)
    const data = await fetchBatchLiveQuotes(POPULAR_IDX_SYMBOLS)
    const arr = Object.values(data)
    if (arr.length > 0) {
      setScreenerData(arr)
      const dict = {}; arr.forEach(i=>{ dict[i.c]=i }); setLiveCache(p=>({...p,...dict}))
      setLastSync(getCurrentTimeString()); setScreenerLoaded(true)
      notify(`✓ ${arr.length} saham IDX dimuat`, "green")
    } else { notify("Gagal memuat data pasar","red") }
    setSyncing(false)
  }, [notify])

  useEffect(() => { if (session && !screenerLoaded) loadScreener() }, [session, screenerLoaded, loadScreener])

  const syncPrices = useCallback(async () => {
    if (!portfolio.length) return
    setSyncing(true)
    const codes = portfolio.map(p=>p.stock_code)
    const upd = await fetchBatchLiveQuotes(codes)
    if (Object.keys(upd).length > 0) { setLiveCache(p=>({...p,...upd})); setLastSync(getCurrentTimeString()) }
    setSyncing(false)
  }, [portfolio])

  useEffect(() => {
    if (portfolio.length > 0 && screenerLoaded) {
      const id = setInterval(syncPrices, 30000); return ()=>clearInterval(id)
    }
  }, [portfolio.length, screenerLoaded, syncPrices])

  const handleAuth = async () => {
    if (!email||!password) { notify("Email & password wajib","amber"); return }
    setAuthLoad(true)
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        notify("Akun dibuat! Silakan masuk.","green"); setIsLogin(true)
      }
    } catch(e) { notify(e.message,"red") }
    setAuthLoad(false)
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    const q = screenerQ.trim(); if (!q) return
    setSearching(true)
    const r = await fetchSingleStockSearch(q)
    if (r) {
      setScreenerData(p => p.find(s=>s.c===r.c) ? p.map(s=>s.c===r.c?r:s) : [r,...p])
      setLiveCache(p=>({...p,[r.c]:r}))
      notify(`✓ Data live ${r.c} berhasil ditarik!`,"green")
    } else { notify(`Kode ${q.toUpperCase()} tidak ditemukan`,"red") }
    setSearching(false)
  }

  const handleTopUp = async () => {
    const amount = parseFloat(topupVal.replace(/\D/g,""))
    if (!amount||amount<100000) { notify("Minimal Rp 100.000","amber"); return }
    try {
      const newCap = (profile.capital||0) + amount
      const { error } = await supabase.from("profiles").update({ capital:newCap }).eq("id",session.user.id)
      if (error) throw error
      await supabase.from("journal").insert([{
        user_id:session.user.id, stock_code:"DEPOSIT", date:getTodayDateString(), lot:0, shares:0,
        avg_price:0, close_price:0, pos_val:amount, cur_val:0, pnl:0, pnl_pct:0, alloc_pct:0,
        suggestions:JSON.stringify([{t:"blue",msg:"TOPUP "+amount}])
      }])
      setProfile(p=>({...p,capital:newCap}))
      setTopupVal("")
      setTopupModal(false)
      notify("✓ Top up berhasil!","green")
    } catch(e) { console.error("handleTopUp error:",e); notify("Gagal: "+e.message,"red") }
  }

  // ── Derived ──────────────────────────────────────────────
  const capital    = Number(profile?.capital)||0
  const invested   = portfolio.reduce((s,p)=>s+(p.shares*p.avg_price),0)
  const curVal     = portfolio.reduce((s,p)=>s+(p.shares*(liveCache[p.stock_code]?.price||p.close_price||p.avg_price)),0)
  const unrealPnL  = curVal - invested
  const cash       = Math.max(0, capital - invested)
  const cashPct    = capital>0 ? (cash/capital)*100 : 100
  const totalEquity= capital + unrealPnL
  const _jType=(j,t)=>{try{return JSON.parse(j.suggestions||"[]").some(x=>x.msg?.startsWith(t))}catch{return false}}
  const realizedPnL= journal.filter(j=>_jType(j,"SELL")).reduce((s,j)=>s+Number(j.pnl||0),0)
  const totalBuy   = journal.filter(j=>_jType(j,"BUY")).length
  const totalSell  = journal.filter(j=>_jType(j,"SELL")).length
  const winTrades  = journal.filter(j=>_jType(j,"SELL")&&Number(j.pnl||0)>0).length
  const tradeWinRate = totalSell>0 ? (winTrades/totalSell)*100 : 0
  const winPos     = portfolio.filter(p=>(liveCache[p.stock_code]?.price||p.close_price)>p.avg_price).length
  const posWinRate = portfolio.length>0 ? (winPos/portfolio.length)*100 : 0
  const cashStatus = cashPct<10 ? "red" : cashPct<20 ? "amber" : "green"

  // Screener: autoload saat filter dipilih
  useEffect(()=>{ if(tab==="screener"&&screenerFilter!=="Semua"&&!screenerLoaded&&!syncing) loadScreener() },[tab,screenerFilter,screenerLoaded,syncing,loadScreener])

  // Screener filter
  const screenerList = (() => {
    let list=[...screenerData]
    if (screenerQ.trim()) {
      const q=screenerQ.toUpperCase()
      list=list.filter(s=>s.c.includes(q)||s.n.toUpperCase().includes(q))
    }
    if (screenerFilter==="Dividen") list=list.filter(s=>Number(s.dy)>0&&Number(s.dy)>=5).sort((a,b)=>b.dy-a.dy)
    else if (screenerFilter==="PBV") list=list.filter(s=>Number(s.pbv)>0&&Number(s.pbv)<1.5).sort((a,b)=>Number(a.pbv)-Number(b.pbv))
    else if (screenerFilter==="PE")  list=list.filter(s=>Number(s.pe)>0&&Number(s.pe)<15).sort((a,b)=>Number(a.pe)-Number(b.pe))
    else if (screenerFilter==="ROE") list=list.filter(s=>Number(s.roe)>0&&Number(s.roe)>15).sort((a,b)=>b.roe-a.roe)
    return list.slice(0,40)
  })()

  // Forecast
  const forecastData = (() => {
    let bal=totalEquity
    const monthly=(parseFloat(fcMonthly)||0), ar=(parseFloat(fcReturn)||10)/100
    const mr=ar/12, total=(parseInt(fcYears)||10)*12, target=parseFloat(fcTarget)||3e9
    const rows=[]; let hitYear=null
    for (let m=1;m<=total;m++) {
      bal=(bal+monthly)*(1+mr)
      if (m%12===0) { const y=m/12; if(!hitYear&&bal>=target) hitYear=y; rows.push({y,bal,hit:bal>=target}) }
    }
    return { rows, hitYear }
  })()

  // ── AUTH ──────────────────────────────────────────────────
  if (!session) return (
    <ThemeCtx.Provider value={{ T, isDark, toggle:toggleTheme }}>
      <style>{getGlobalStyles(T,isDark)}</style>
      <Toast n={toast}/>
      <div style={{ minHeight:"100vh",background:`radial-gradient(circle at top left,${isDark?"#132742":T.bg3} 0%,${T.bg0} 60%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
        <div className="fu" style={{ width:"100%",maxWidth:400 }}>
          <div style={{ textAlign:"center",marginBottom:40 }}>
            <div style={{ display:"inline-flex",alignItems:"center",gap:10,background:T.bg2,border:`1px solid ${T.bdr}`,borderRadius:16,padding:"12px 20px",marginBottom:24 }}>
              <ShieldCheck size={24} color={T.em}/>
              <span style={{ fontSize:18,fontWeight:900,color:T.t1,letterSpacing:1 }}>INVEST<span style={{ color:T.em }}>GUARD</span></span>
            </div>
            <ThemeBtn/>
            <h1 style={{ fontSize:32,fontWeight:900,color:T.t1,lineHeight:1.2,margin:"20px 0 12px" }}>Terminal Trading<br/>Anti Boncos.</h1>
            <p style={{ fontSize:14,color:T.t2,lineHeight:1.6 }}>Manajemen risiko saham IDX otomatis.<br/>Jaga modal, lipat gandakan profit.</p>
          </div>
          <div style={{ background:T.bg1,border:`1px solid ${T.bdr2}`,borderRadius:24,padding:32,boxShadow:`0 20px 40px rgba(0,0,0,${isDark?0.5:0.1})` }}>
            <div style={{ display:"flex",gap:8,background:T.bg0,padding:6,borderRadius:16,marginBottom:24 }}>
              {[["MASUK",true],["DAFTAR",false]].map(([lbl,l])=>(
                <button key={lbl} onClick={()=>setIsLogin(l)} style={{ flex:1,padding:12,borderRadius:12,background:isLogin===l?T.bg3:"transparent",color:isLogin===l?T.t1:T.t3,border:"none",fontWeight:800,fontSize:13,cursor:"pointer",transition:".2s" }}>{lbl}</button>
              ))}
            </div>
            <Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="investor@sukses.com"/>
            <Input label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 6 karakter"/>
            <Btn full onClick={handleAuth} disabled={authLoad} style={{ marginTop:16,padding:16 }}>
              {authLoad?<Spinner/>:(isLogin?"Masuk ke Terminal":"Mulai Gratis")}
            </Btn>
          </div>
        </div>
      </div>
    </ThemeCtx.Provider>
  )

  // ── ONBOARDING ────────────────────────────────────────────
  if (profile && profile.capital===null) return (
    <ThemeCtx.Provider value={{ T, isDark, toggle:toggleTheme }}>
      <style>{getGlobalStyles(T,isDark)}</style>
      <Toast n={toast}/>
      <div style={{ minHeight:"100vh",background:T.bg0,padding:"60px 24px" }}>
        <div className="fu" style={{ maxWidth:480,margin:"0 auto" }}>
          <div style={{ marginBottom:40 }}>
            <div style={{ fontSize:12,fontWeight:900,color:T.em,letterSpacing:2,marginBottom:12 }}>LANGKAH TERAKHIR</div>
            <h1 style={{ fontSize:36,fontWeight:900,color:T.t1,lineHeight:1.1,marginBottom:16 }}>Berapa Modal<br/>Kerja Kamu?</h1>
            <p style={{ fontSize:15,color:T.t2,lineHeight:1.7 }}>InvestGuard menggunakan angka ini sebagai dasar kalkulasi Stop Loss & batas alokasi per saham.</p>
          </div>
          <Input label="MODAL INVESTASI (Rp)" prefix="Rp" type="text" value={topupVal}
            onChange={e=>{ const r=e.target.value.replace(/\D/g,""); setTopupVal(r?new Intl.NumberFormat("id-ID").format(r):"") }}
            placeholder="10.000.000"/>
          <div style={{ background:T.lBg,border:`1px solid ${T.lBdr}`,padding:16,borderRadius:16,marginBottom:32 }}>
            <Info size={16} color={T.blue} style={{ display:"inline",marginRight:8 }}/>
            <span style={{ fontSize:13,color:T.blue,lineHeight:1.6 }}>Modal ini menjadi <strong>Cash Reserve</strong> awal. Belum dibelikan saham.</span>
          </div>
          <Btn full style={{ padding:18,fontSize:16 }} onClick={async()=>{
            const raw=parseFloat(topupVal.replace(/\D/g,""))
            if (!raw||raw<100000) { notify("Minimal Rp 100.000","amber"); return }
            await supabase.from("profiles").update({ capital:raw }).eq("id",session.user.id)
            await supabase.from("journal").insert([{ user_id:session.user.id,stock_code:"DEPOSIT",date:getTodayDateString(),lot:0,shares:0,avg_price:0,close_price:0,nominal:raw,type:"TOPUP" }])
            loadData(session.user.id)
          }}>Masuk ke Dashboard →</Btn>
        </div>
      </div>
    </ThemeCtx.Provider>
  )

  // ── MAIN ──────────────────────────────────────────────────
  return (
    <ThemeCtx.Provider value={{ T, isDark, toggle:toggleTheme }}>
      <style>{getGlobalStyles(T,isDark)}</style>
      <Toast n={toast}/>
      <div style={{ minHeight:"100vh",background:T.bg0,paddingBottom:100,maxWidth:500,margin:"0 auto" }}>

        {/* ══ PORTFOLIO ══ */}
        {tab==="portfolio" && (
          <div className="fu">
            {/* Header */}
            <div style={{ background:isDark?`linear-gradient(160deg,#0A192F 0%,${T.bg1} 100%)`:`linear-gradient(160deg,${T.bg3} 0%,${T.bg1} 100%)`,padding:"56px 20px 28px",borderBottom:`1px solid ${T.bdr2}` }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24 }}>
                <div>
                  <div style={{ fontSize:11,fontWeight:800,color:T.t3,letterSpacing:2,marginBottom:6 }}>TOTAL NET EQUITY</div>
                  <div style={{ fontSize:36,fontWeight:900,color:T.t1,letterSpacing:"-1px",lineHeight:1 }}>Rp {formatRupiah(totalEquity)}</div>
                  <div style={{ display:"inline-flex",alignItems:"center",gap:6,marginTop:12,background:unrealPnL>=0?T.gBg:T.rBg,border:`1px solid ${unrealPnL>=0?T.gBdr:T.rBdr}`,padding:"6px 14px",borderRadius:99 }}>
                    {unrealPnL>=0?<ArrowUpRight size={14} color={T.green}/>:<ArrowDownRight size={14} color={T.red}/>}
                    <span style={{ fontSize:13,fontWeight:800,color:unrealPnL>=0?T.green:T.red }}>
                      {unrealPnL>=0?"+":""}Rp {formatRupiahCompact(Math.abs(unrealPnL))} ({formatPercent(capital>0?(unrealPnL/capital)*100:0)})
                    </span>
                  </div>
                </div>
                <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8 }}>
                  <ThemeBtn/>
                  <button onClick={()=>supabase.auth.signOut()} className="tap" style={{ background:T.bg3,border:`1px solid ${T.bdr2}`,padding:"8px 12px",borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6 }}>
                    <LogOut size={14} color={T.t2}/><span style={{ fontSize:12,color:T.t2,fontWeight:700 }}>Keluar</span>
                  </button>
                  <div style={{ fontSize:10,color:T.t3,fontWeight:700,display:"flex",alignItems:"center",gap:4 }}>
                    {syncing?<><Spinner size={10}/> SYNC...</>:<><span style={{ width:6,height:6,borderRadius:"50%",background:T.green,display:"inline-block" }} className="pulse"/> LIVE {lastSync}</>}
                  </div>
                </div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16 }}>
                {[["MODAL TERPAKAI",`Rp ${formatRupiahCompact(invested)}`],["NILAI PASAR",`Rp ${formatRupiahCompact(curVal)}`]].map(([l,v])=>(
                  <div key={l} style={{ background:T.bg2,border:`1px solid ${T.bdr}`,borderRadius:16,padding:14 }}>
                    <div style={{ fontSize:10,color:T.t3,fontWeight:800,marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:16,color:T.t1,fontWeight:800 }}>{v}</div>
                  </div>
                ))}
              </div>
              {/* Cash bar */}
              <div style={{ background:T.bg2,border:`1px solid ${T.bdr}`,borderRadius:18,padding:16 }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
                  <span style={{ fontSize:11,fontWeight:800,color:T.t2 }}>CASH RESERVE (DAYA BELI)</span>
                  <span style={{ fontSize:14,fontWeight:900,color:{red:T.red,amber:T.amber,green:T.green}[cashStatus] }}>
                    {cashPct.toFixed(1)}% <span style={{ fontSize:11,fontWeight:600,color:T.t3 }}>| Rp {formatRupiahCompact(cash)}</span>
                  </span>
                </div>
                <div style={{ height:6,background:T.bg0,borderRadius:99,overflow:"hidden" }}>
                  <div style={{ height:"100%",width:`${Math.min(100,cashPct)}%`,background:{red:T.red,amber:T.amber,green:T.green}[cashStatus],transition:"width 0.8s ease" }}/>
                </div>
              </div>
            </div>

            <div style={{ padding:"20px 20px 0" }}>
              {cashStatus!=="green" && (
                <div className="fu" style={{ background:cashStatus==="red"?T.rBg:T.aBg,border:`1px solid ${cashStatus==="red"?T.rBdr:T.aBdr}`,borderRadius:16,padding:14,marginBottom:20,display:"flex",gap:10,alignItems:"center" }}>
                  <AlertTriangle size={16} color={cashStatus==="red"?T.red:T.amber} style={{ flexShrink:0 }}/>
                  <p style={{ fontSize:13,color:cashStatus==="red"?T.red:T.amber,fontWeight:600,lineHeight:1.5 }}>
                    {cashStatus==="red"?`Kas kritis ${cashPct.toFixed(1)}%! DILARANG beli saham baru.`:`Kas menipis ${cashPct.toFixed(1)}%. Kurangi intensitas beli.`}
                  </p>
                </div>
              )}
              <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:12,marginBottom:24 }}>
                <Btn icon={<Search size={15}/>} onClick={()=>setTab("screener")}>Cari & Beli Saham</Btn>
                <Btn variant="secondary" icon={<Wallet size={15}/>} onClick={()=>setTopupModal(true)}>Top Up</Btn>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
                <h2 style={{ fontSize:18,fontWeight:900,color:T.t1 }}>Aset Berjalan</h2>
                <span style={{ fontSize:12,color:T.t3,fontWeight:700,background:T.bg2,padding:"4px 10px",borderRadius:8 }}>{portfolio.length} Posisi</span>
              </div>
              {portfolio.length===0 ? (
                <div style={{ textAlign:"center",padding:"60px 20px",background:T.bg1,border:`1px dashed ${T.bdr2}`,borderRadius:24 }}>
                  <Landmark size={40} color={T.t3} style={{ margin:"0 auto 16px",opacity:0.5 }}/>
                  <h3 style={{ fontSize:16,fontWeight:800,color:T.t1,marginBottom:8 }}>Portofolio Kosong</h3>
                  <p style={{ fontSize:13,color:T.t2 }}>Mulai dari Screener untuk cari saham IDX.</p>
                </div>
              ) : portfolio.map((pos,pidx) => {
                const live     = liveCache[pos.stock_code]?.price || pos.close_price || pos.avg_price
                const posVal   = pos.shares * pos.avg_price
                const curVal   = pos.shares * live
                const pnlRp    = curVal - posVal
                const pnlPct   = pos.avg_price > 0 ? ((live - pos.avg_price) / pos.avg_price) * 100 : 0
                const allocPct = capital > 0 ? (posVal / capital) * 100 : 0
                const over20   = allocPct > 20

                // Level harga
                const slPrice  = pos.avg_price * 0.92
                const tp1Price = pos.avg_price * 1.15
                const tp2Price = pos.avg_price * 1.25
                const adLevel  = pos.avg_price * 0.95

                // Money management: berapa max tambah posisi
                const maxLossTotal  = capital * 0.11       // batas loss 11% equity
                const curLoss       = pnlRp < 0 ? Math.abs(pnlRp) : 0
                const sisa11        = Math.max(0, maxLossTotal - curLoss)
                const sisaAlokasi   = Math.max(0, capital * 0.20 - posVal)
                const maxBeliBySL   = sisa11 / 0.08        // jika beli X & harga turun ke SL, total loss ≤ 11%
                const maxBeli       = Math.min(maxBeliBySL, sisaAlokasi, cash)
                const canLot        = Math.max(0, Math.floor(maxBeli / live / 100))
                const canShares     = canLot * 100
                const canRp         = canShares * live
                const newAvg        = canShares > 0 ? (posVal + canRp) / (pos.shares + canShares) : pos.avg_price
                const newAlloc      = capital > 0 ? ((posVal + canRp) / capital) * 100 : 0

                // Status card
                const isStopLoss  = pnlPct <= -8
                const isAvgZone   = pnlPct <= -5 && pnlPct > -8
                const isAvgUpZone = pnlPct >= 5
                const isTP1       = pnlPct >= 15
                const isTP2       = pnlPct >= 25
                const cardBorder  = isStopLoss ? T.rBdr : over20 ? T.aBdr : T.bdr2

                return (
                  <div key={pos.id} className="fu" style={{ background:T.bg1,border:`1px solid ${cardBorder}`,borderRadius:20,overflow:"hidden",marginBottom:12,animationDelay:`${pidx*0.04}s` }}>

                    {/* ── Warning banner ── */}
                    {isStopLoss && <div style={{ background:T.rBg,padding:"8px 16px",display:"flex",gap:8,alignItems:"center",borderBottom:`1px solid ${T.rBdr}` }}><span style={{ fontSize:11,fontWeight:800,color:T.red }}>⛔ CUT LOSS — sudah -8%. Jual sekarang!</span></div>}
                    {over20 && !isStopLoss && <div style={{ background:T.aBg,padding:"8px 16px",display:"flex",gap:8,alignItems:"center",borderBottom:`1px solid ${T.aBdr}` }}><span style={{ fontSize:11,fontWeight:800,color:T.amber }}>⚠ Overweight {allocPct.toFixed(1)}% — melebihi batas 20% equity</span></div>}

                    <div style={{ padding:"16px 16px 0" }}>

                      {/* ── Header: nama + PnL ── */}
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
                        <div>
                          <div style={{ fontSize:17,fontWeight:900,color:T.t1,letterSpacing:"-0.3px" }}>{pos.stock_code}</div>
                          <div style={{ fontSize:11,color:T.t3,marginTop:2 }}>{pos.lot} lot · {pos.sector}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:20,fontWeight:900,color:pnlPct>=0?T.green:T.red,letterSpacing:"-0.5px" }}>{formatPercent(pnlPct)}</div>
                          <div style={{ fontSize:11,fontWeight:700,color:pnlPct>=0?T.green:T.red }}>{pnlRp>=0?"+":""}Rp {formatRupiahCompact(Math.abs(pnlRp))}</div>
                        </div>
                      </div>

                      {/* ── Harga row ── */}
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12 }}>
                        {[["Avg Beli","Rp "+formatRupiah(pos.avg_price),T.t2],["Live","Rp "+formatRupiah(live),T.em],["Modal","Rp "+formatRupiahCompact(posVal),T.t3]].map(([l,v,c])=>(
                          <div key={l} style={{ background:T.bg2,borderRadius:10,padding:"8px 10px" }}>
                            <div style={{ fontSize:9,color:T.t3,fontWeight:700,marginBottom:2 }}>{l.toUpperCase()}</div>
                            <div style={{ fontSize:11,fontWeight:800,color:c }}>{v}</div>
                          </div>
                        ))}
                      </div>

                      {/* ── Alokasi bar ── */}
                      <div style={{ marginBottom:14 }}>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                          <span style={{ fontSize:10,fontWeight:700,color:T.t3 }}>ALOKASI EQUITY</span>
                          <span style={{ fontSize:11,fontWeight:900,color:over20?T.red:allocPct>15?T.amber:T.green }}>{allocPct.toFixed(1)}<span style={{ fontWeight:500,color:T.t3 }}>% / 20%</span></span>
                        </div>
                        <div style={{ height:5,background:T.bg0,borderRadius:99,overflow:"hidden" }}>
                          <div style={{ height:"100%",width:`${Math.min(100,(allocPct/20)*100)}%`,background:over20?T.red:allocPct>15?T.amber:T.em,borderRadius:99,transition:"width 0.6s ease" }}/>
                        </div>
                      </div>

                      {/* ── Level trading plan ── */}
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12 }}>
                        {[
                          ["CUT LOSS",    "Rp "+formatRupiah(slPrice),  T.red,   live<=slPrice],
                          ["AVG DOWN",    "Rp "+formatRupiah(adLevel),  T.amber, live<=adLevel],
                          ["TP1 +15%",   "Rp "+formatRupiah(tp1Price), T.green, live>=tp1Price],
                          ["TP2 +25%",   "Rp "+formatRupiah(tp2Price), T.green, live>=tp2Price],
                        ].map(([lbl,val,col,hit])=>(
                          <div key={lbl} style={{ background:hit?`${col}18`:T.bg2,border:`1px solid ${hit?col+"40":T.bdr}`,borderRadius:10,padding:"7px 10px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                            <span style={{ fontSize:9,fontWeight:800,color:hit?col:T.t3,letterSpacing:"0.3px" }}>{lbl}</span>
                            <span style={{ fontSize:11,fontWeight:900,color:hit?col:T.t2 }}>{val}</span>
                          </div>
                        ))}
                      </div>

                      {/* ── MM Advisory ── */}
                      {isStopLoss ? (
                        <div style={{ background:T.rBg,border:`1px solid ${T.rBdr}`,borderRadius:12,padding:"10px 14px",marginBottom:14 }}>
                          <div style={{ fontSize:12,fontWeight:800,color:T.red,marginBottom:3 }}>Wajib Cut Loss</div>
                          <div style={{ fontSize:11,color:T.red,lineHeight:1.5 }}>Loss sudah {pnlPct.toFixed(1)}% · Kerugian Rp {formatRupiah(Math.abs(pnlRp))} · Jual segera untuk lindungi modal.</div>
                        </div>
                      ) : isTP2 ? (
                        <div style={{ background:T.gBg,border:`1px solid ${T.gBdr}`,borderRadius:12,padding:"10px 14px",marginBottom:14 }}>
                          <div style={{ fontSize:12,fontWeight:800,color:T.green,marginBottom:3 }}>TP2 +25% Tercapai 🚀</div>
                          <div style={{ fontSize:11,color:T.green }}>Jual 50–75% posisi untuk kunci profit maksimal.</div>
                        </div>
                      ) : isTP1 ? (
                        <div style={{ background:T.gBg,border:`1px solid ${T.gBdr}`,borderRadius:12,padding:"10px 14px",marginBottom:14 }}>
                          <div style={{ fontSize:12,fontWeight:800,color:T.green,marginBottom:3 }}>TP1 +15% Tercapai 🎯</div>
                          <div style={{ fontSize:11,color:T.green }}>Jual 30–50% untuk amankan profit. Sisakan kejar TP2.</div>
                        </div>
                      ) : isAvgZone && canLot > 0 && !over20 ? (
                        <div style={{ marginBottom:14 }}>
                          <div style={{ background:T.lBg,border:`1px solid ${T.lBdr}`,borderRadius:12,padding:"10px 14px",marginBottom:8 }}>
                            <div style={{ fontSize:12,fontWeight:800,color:T.blue,marginBottom:6 }}>Boleh Average Down</div>
                            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 12px",fontSize:10 }}>
                              {[["Maks beli",canLot+" lot"],["Biaya","Rp "+formatRupiahCompact(canRp)],["Avg baru","Rp "+formatRupiah(newAvg)],["Alokasi baru",newAlloc.toFixed(1)+"%"]].map(([l,v])=>(
                                <div key={l}><span style={{ color:T.t3 }}>{l} </span><strong style={{ color:T.blue }}>{v}</strong></div>
                              ))}
                            </div>
                          </div>
                          <button onClick={()=>{ setAddStock({c:pos.stock_code,s:pos.sector}); setBuyLot(String(canLot)); setBuyPrice(String(live)); setAddModal(true) }}
                            style={{ width:"100%",background:T.lBg,border:`1px solid ${T.lBdr}`,borderRadius:10,padding:"9px",fontSize:11,fontWeight:800,color:T.blue,cursor:"pointer" }} className="tap">
                            Avg Down {canLot} lot @ Rp {formatRupiah(live)}
                          </button>
                        </div>
                      ) : isAvgZone && (canLot===0 || over20) ? (
                        <div style={{ background:T.aBg,border:`1px solid ${T.aBdr}`,borderRadius:12,padding:"10px 14px",marginBottom:14 }}>
                          <div style={{ fontSize:11,fontWeight:700,color:T.amber }}>{over20?"Tidak bisa avg down — alokasi sudah "+allocPct.toFixed(1)+"% (maks 20%)":"Tidak bisa avg down — batas loss 11% hampir tercapai. Hold."}</div>
                        </div>
                      ) : isAvgUpZone && canLot > 0 && !over20 ? (
                        <div style={{ marginBottom:14 }}>
                          <div style={{ background:T.gBg,border:`1px solid ${T.gBdr}`,borderRadius:12,padding:"10px 14px",marginBottom:8 }}>
                            <div style={{ fontSize:12,fontWeight:800,color:T.green,marginBottom:6 }}>Boleh Average Up (+5%)</div>
                            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 12px",fontSize:10 }}>
                              {[["Maks beli",canLot+" lot"],["Avg baru","Rp "+formatRupiah(newAvg)],["Alokasi baru",newAlloc.toFixed(1)+"%"],["Biaya","Rp "+formatRupiahCompact(canRp)]].map(([l,v])=>(
                                <div key={l}><span style={{ color:T.t3 }}>{l} </span><strong style={{ color:T.green }}>{v}</strong></div>
                              ))}
                            </div>
                          </div>
                          <button onClick={()=>{ setAddStock({c:pos.stock_code,s:pos.sector}); setBuyLot(String(canLot)); setBuyPrice(String(live)); setAddModal(true) }}
                            style={{ width:"100%",background:T.gBg,border:`1px solid ${T.gBdr}`,borderRadius:10,padding:"9px",fontSize:11,fontWeight:800,color:T.green,cursor:"pointer" }} className="tap">
                            Avg Up {canLot} lot @ Rp {formatRupiah(live)}
                          </button>
                        </div>
                      ) : (
                        <div style={{ background:T.bg2,borderRadius:10,padding:"8px 12px",marginBottom:14 }}>
                          <div style={{ fontSize:11,color:T.t2 }}>Hold — tunggu level TP atau Avg Down/Up.</div>
                        </div>
                      )}

                    </div>

                    {/* ── Action buttons ── */}
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",borderTop:`1px solid ${T.bdr}` }}>
                      <button onClick={()=>{ setSellStock(pos); setSellModal(true) }}
                        style={{ background:"transparent",border:"none",borderRight:`1px solid ${T.bdr}`,padding:"12px",fontSize:12,fontWeight:800,color:T.red,cursor:"pointer" }} className="tap">
                        Jual
                      </button>
                      <button onClick={()=>{ setAddStock({c:pos.stock_code,s:pos.sector}); setBuyPrice(String(live)); setAddModal(true) }}
                        style={{ background:"transparent",border:"none",padding:"12px",fontSize:12,fontWeight:800,color:T.green,cursor:"pointer" }} className="tap">
                        Tambah
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══ SCREENER ══ */}
        {tab==="screener" && (
          <div className="fu" style={{ padding:"56px 20px 20px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24 }}>
              <div>
                <h2 style={{ fontSize:28,fontWeight:900,color:T.t1,marginBottom:8 }}>Screener IDX</h2>
                <p style={{ fontSize:13,color:T.t2,lineHeight:1.6 }}>Data live via server proxy. Fundamental: DY, PBV, PE, ROE.</p>
                {!screenerLoaded && <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:12,color:T.amber,fontSize:13,fontWeight:600 }}><Spinner/> Memuat data pasar...</div>}
              </div>
              <div style={{ display:"flex",gap:8,marginTop:8 }}>
                <button onClick={()=>{ setScreenerLoaded(false); loadScreener() }} className="tap" title="Refresh data" style={{ background:T.bg2,border:`1px solid ${T.bdr2}`,borderRadius:12,padding:"9px 12px",cursor:"pointer" }}>
                  <RefreshCw size={15} color={T.t2}/>
                </button>
                <ThemeBtn/>
              </div>
            </div>

            <form onSubmit={handleSearch} style={{ display:"flex",gap:10,marginBottom:20 }}>
              <div style={{ flex:1,position:"relative" }}>
                <Search size={16} color={T.t3} style={{ position:"absolute",left:16,top:"50%",transform:"translateY(-50%)" }}/>
                <input type="text" value={screenerQ} onChange={e=>setScreenerQ(e.target.value)} placeholder="Cari kode saham (BREN, SIDO...)"
                  style={{ width:"100%",background:T.bg1,border:`1.5px solid ${T.bdr2}`,borderRadius:16,padding:"15px 16px 15px 44px",color:T.t1,fontSize:14,fontWeight:700 }}
                  onFocus={e=>e.target.style.borderColor=T.em} onBlur={e=>e.target.style.borderColor=T.bdr2}/>
              </div>
              <Btn type="submit" disabled={searching} style={{ padding:"0 20px" }}>{searching?<Spinner/>:"Cari"}</Btn>
            </form>

            <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:12,marginBottom:20 }} className="hide-scrollbar">
              {[{id:"Semua",label:"Populer IDX"},{id:"Dividen",label:"Dividen >5%"},{id:"PBV",label:"PBV < 1x"},{id:"PE",label:"PE < 12x"},{id:"ROE",label:"ROE > 15%"}].map(f=>(
                <button key={f.id} onClick={()=>setScreenerFilter(f.id)} style={{ background:screenerFilter===f.id?T.em:T.bg1,color:screenerFilter===f.id?T.bg0:T.t2,border:`1px solid ${screenerFilter===f.id?T.em:T.bdr2}`,borderRadius:99,padding:"10px 18px",fontSize:12,fontWeight:800,whiteSpace:"nowrap",cursor:"pointer",transition:".2s" }}>
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ display:"grid",gap:12 }}>
              {screenerList.length===0&&screenerLoaded && (
                <div style={{ textAlign:"center",padding:"40px 20px",color:T.t3 }}>
                  <Filter size={32} style={{ margin:"0 auto 12px",opacity:0.5 }}/><p>Tidak ada saham sesuai filter ini.</p>
                </div>
              )}
              {screenerList.map((s,i)=>(
                <div key={s.c} className="fu" style={{ background:T.bg1,border:`1px solid ${T.bdr2}`,borderRadius:20,padding:20,animationDelay:`${i*0.03}s` }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16 }}>
                    <div style={{ display:"flex",gap:12,alignItems:"center" }}>
                      <div style={{ width:44,height:44,borderRadius:12,background:T.bg2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:T.t1,border:`1px solid ${T.bdr}` }}>{s.c.slice(0,2)}</div>
                      <div>
                        <div style={{ fontSize:18,fontWeight:900,color:T.t1 }}>{s.c}</div>
                        <div style={{ fontSize:12,color:T.t3,maxWidth:160,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{s.n}</div>
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:11,fontWeight:800,color:T.t3,marginBottom:4 }}>HARGA LIVE</div>
                      <div style={{ fontSize:18,fontWeight:900,color:T.green }}>Rp {formatRupiah(s.price)}</div>
                      <div style={{ fontSize:12,fontWeight:700,color:s.chgPct>=0?T.green:T.red }}>{formatPercent(s.chgPct)}</div>
                    </div>
                  </div>

                  {/* Fundamental 4 kolom */}
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16 }}>
                    <FBadge label="DIV YIELD" value={s.dy>0?`${s.dy}%`:null} good={s.dy>=5}/>
                    <FBadge label="PBV" value={s.pbv>0?`${s.pbv}x`:null} good={s.pbv>0&&s.pbv<1.2}/>
                    <FBadge label="P/E" value={s.pe>0?`${s.pe}x`:null} good={s.pe>0&&s.pe<12}/>
                    <FBadge label="ROE" value={s.roe>0?`${s.roe}%`:null} good={s.roe>=15}/>
                  </div>

                  {/* Extra fundamental row jika ada */}
                  {(s.npm||s.der) ? (
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16 }}>
                      <FBadge label="NET MARGIN" value={s.npm>0?`${s.npm}%`:null} good={s.npm>10}/>
                      <FBadge label="DER" value={s.der>0?`${s.der}x`:null} good={s.der>0&&s.der<1.5}/>
                    </div>
                  ) : null}

                  {/* Pesan jika semua fundamental kosong */}
                  {(!s.dy&&!s.pbv&&!s.pe&&!s.roe) && (
                    <div style={{ background:T.aBg,border:`1px solid ${T.aBdr}`,borderRadius:10,padding:"8px 12px",marginBottom:12,fontSize:11,color:T.amber,fontWeight:600 }}>
                      ⚡ Fundamental belum tersedia. Coba refresh atau klik Cari untuk tarik ulang.
                    </div>
                  )}
                  <Btn full onClick={()=>{ setAddStock(s); setBuyPrice(String(s.price||0)); setAddModal(true) }}>
                    Tambah ke Portofolio
                  </Btn>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ JURNAL ══ */}
        {tab==="jurnal" && (
          <div className="fu" style={{ padding:"56px 20px 20px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24 }}>
              <div>
                <h2 style={{ fontSize:28,fontWeight:900,color:T.t1,marginBottom:4 }}>Buku Jurnal</h2>
                <p style={{ fontSize:13,color:T.t2 }}>{journal.length} Transaksi Tercatat</p>
              </div>
              <Btn variant="secondary" icon={<Download size={14}/>} onClick={()=>exportDataToCSV(journal)} style={{ padding:"10px 16px",fontSize:13 }}>CSV</Btn>
            </div>

            {/* Summary */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:24 }}>
              <StatCard label="TOTAL BELI" value={totalBuy} col={T.blue} bg={T.lBg} bdr={T.lBdr}/>
              <StatCard label="TOTAL JUAL" value={totalSell} col={T.amber} bg={T.aBg} bdr={T.aBdr}/>
              <StatCard
                label="REALIZED P&L"
                value={`${realizedPnL>=0?"+":""}${formatRupiahCompact(realizedPnL)}`}
                col={realizedPnL>=0?T.green:T.red}
                bg={realizedPnL>=0?T.gBg:T.rBg}
                bdr={realizedPnL>=0?T.gBdr:T.rBdr}/>
            </div>

            {journal.length===0 ? (
              <div style={{ background:T.bg1,border:`1px dashed ${T.bdr2}`,borderRadius:24,padding:"60px 20px",textAlign:"center" }}>
                <BookOpen size={40} color={T.t3} style={{ margin:"0 auto 16px",opacity:0.5 }}/>
                <div style={{ fontSize:14,fontWeight:600,color:T.t2 }}>Buku Jurnal Kosong</div>
              </div>
            ) : journal.map((row,i) => {
              const _sg=()=>{try{return JSON.parse(row.suggestions||"[]")}catch{return[]}}
              const _msg=_sg().map(x=>x.msg||"").join("|")
              const rowType=row.stock_code==="__TOPUP__"?"TOPUP":_msg.startsWith("SELL")?"SELL":"BUY"
              const isSell=rowType==="SELL", isTopup=rowType==="TOPUP"
              const typeConf = {
                BUY:   { label:"BELI",   col:T.green, bg:T.gBg, bdr:T.gBdr, Icon:ArrowUpRight },
                SELL:  { label:"JUAL",   col:T.red,   bg:T.rBg, bdr:T.rBdr, Icon:ArrowDownRight },
                TOPUP: { label:"TOP UP", col:T.blue,  bg:T.lBg, bdr:T.lBdr, Icon:Plus },
              }[rowType] || { label:rowType, col:T.t2, bg:T.bg2, bdr:T.bdr, Icon:Activity }
              const { label, col, bg, bdr, Icon: RIcon } = typeConf
              return (
                <div key={row.id} className="fu" style={{ background:T.bg1,border:`1px solid ${T.bdr2}`,borderRadius:20,padding:18,marginBottom:10,animationDelay:`${i*0.02}s` }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
                    <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                      {/* Aksi badge yang jelas */}
                      <div style={{ background:bg,border:`1px solid ${bdr}`,borderRadius:10,padding:"7px 14px",display:"flex",alignItems:"center",gap:6,minWidth:90,justifyContent:"center" }}>
                        <RIcon size={14} color={col}/>
                        <span style={{ fontSize:12,fontWeight:900,color:col,letterSpacing:"0.5px" }}>{label}</span>
                      </div>
                      <span style={{ fontSize:17,fontWeight:900,color:T.t1 }}>{row.stock_code}</span>
                    </div>
                    <span style={{ fontSize:11,fontWeight:600,color:T.t3 }}>{row.date}</span>
                  </div>
                  <div style={{ background:T.bg2,padding:"12px 16px",borderRadius:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                    <div>
                      <div style={{ fontSize:10,fontWeight:800,color:T.t3,marginBottom:4 }}>{isTopup?"NOMINAL":"LOT × HARGA"}</div>
                      <div style={{ fontSize:13,fontWeight:700,color:T.t1 }}>
                        {isTopup ? `Rp ${formatRupiah(row.pos_val||0)}` : `${row.lot} Lot @ Rp ${formatRupiah(row.close_price)}`}
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:10,fontWeight:800,color:T.t3,marginBottom:4 }}>{isSell?"REALIZED P&L":"TOTAL NILAI"}</div>
                      <div style={{ fontSize:15,fontWeight:900,color:isSell?getProfitColor(row.pnl,T):isTopup?T.blue:T.t1 }}>
                        {isSell ? `${(row.pnl||0)>=0?"+":""}Rp ${formatRupiah(row.pnl||0)}` : `Rp ${formatRupiahCompact(row.pos_val||(row.lot*100*row.close_price))}`}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ══ MONITOR ══ */}
        {tab==="monitor" && (
          <div className="fu" style={{ padding:"56px 20px 20px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:24 }}>
              <div>
                <h2 style={{ fontSize:28,fontWeight:900,color:T.t1,marginBottom:4 }}>Analyst Monitor</h2>
                <p style={{ fontSize:13,color:T.t2 }}>Performa & kesehatan portofolio real-time.</p>
              </div>
              <ThemeBtn/>
            </div>

            {/* KPI utama */}
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
              <StatCard label="WIN RATE POSISI" value={`${posWinRate.toFixed(0)}%`} sub={`${winPos} dari ${portfolio.length} posisi profit`} col={T.green} bg={T.gBg} bdr={T.gBdr} icon={Trophy}/>
              <StatCard label="WIN RATE TRADE" value={`${tradeWinRate.toFixed(0)}%`} sub={`${winTrades} dari ${totalSell} transaksi jual`} col={T.blue} bg={T.lBg} bdr={T.lBdr} icon={Target}/>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
              <StatCard
                label="UNREALIZED P&L"
                value={`${unrealPnL>=0?"+":""}Rp ${formatRupiahCompact(unrealPnL)}`}
                sub={`${formatPercent(capital>0?(unrealPnL/capital)*100:0)} dari modal`}
                col={unrealPnL>=0?T.green:T.red} bg={unrealPnL>=0?T.gBg:T.rBg} bdr={unrealPnL>=0?T.gBdr:T.rBdr}
                icon={unrealPnL>=0?TrendingUp:TrendingDown}/>
              <StatCard
                label="REALIZED P&L"
                value={`${realizedPnL>=0?"+":""}Rp ${formatRupiahCompact(realizedPnL)}`}
                sub={`Dari ${totalSell} penjualan`}
                col={realizedPnL>=0?T.green:T.red} bg={realizedPnL>=0?T.gBg:T.rBg} bdr={realizedPnL>=0?T.gBdr:T.rBdr}
                icon={DollarSign}/>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20 }}>
              {[
                ["TOTAL BELI",totalBuy,T.blue,T.lBg,T.lBdr],
                ["TOTAL JUAL",totalSell,T.amber,T.aBg,T.aBdr],
                ["CASH RATIO",`${cashPct.toFixed(1)}%`,{red:T.red,amber:T.amber,green:T.green}[cashStatus],{red:T.rBg,amber:T.aBg,green:T.gBg}[cashStatus],{red:T.rBdr,amber:T.aBdr,green:T.gBdr}[cashStatus]],
              ].map(([l,v,col,bg,bdr])=>(
                <div key={l} style={{ background:bg,border:`1px solid ${bdr}`,borderRadius:16,padding:"14px",textAlign:"center" }}>
                  <div style={{ fontSize:9,fontWeight:800,color:col,marginBottom:6,letterSpacing:"0.5px" }}>{l}</div>
                  <div style={{ fontSize:16,fontWeight:900,color:col }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Komposisi Ekuitas */}
            <div style={{ background:T.bg1,border:`1px solid ${T.bdr2}`,borderRadius:20,padding:20,marginBottom:16 }}>
              <div style={{ fontSize:11,fontWeight:800,color:T.t3,letterSpacing:1,marginBottom:16 }}>KOMPOSISI EKUITAS</div>
              {[
                ["Modal (Total Injeksi)",capital,T.blue],
                ["Unrealized P&L",unrealPnL,unrealPnL>=0?T.green:T.red],
                ["Total Equity",totalEquity,T.em],
                ["Cash Tersedia",cash,T.amber],
                ["Nilai Pasar",curVal,T.blue],
              ].map(([lbl,val,col])=>(
                <div key={lbl} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.bdr}` }}>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <div style={{ width:10,height:10,borderRadius:3,background:col }}/>
                    <span style={{ fontSize:13,color:T.t2,fontWeight:600 }}>{lbl}</span>
                  </div>
                  <span style={{ fontSize:14,fontWeight:900,color:col }}>
                    {val>=0?"":"-"}Rp {formatRupiah(Math.abs(val))}
                  </span>
                </div>
              ))}
            </div>

            {/* Peta Alokasi */}
            <div style={{ background:T.bg1,border:`1px solid ${T.bdr2}`,borderRadius:20,padding:20 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:20 }}>
                <PieChart size={17} color={T.t2}/>
                <h3 style={{ fontSize:13,fontWeight:800,color:T.t1,letterSpacing:1 }}>PETA ALOKASI (MAKS 20% PER SAHAM)</h3>
              </div>
              {portfolio.length===0 ? (
                <div style={{ color:T.t3,fontSize:13,textAlign:"center",padding:"20px 0" }}>Belum ada posisi.</div>
              ) : portfolio.map(pos => {
                const liveP=liveCache[pos.stock_code]?.price||pos.avg_price
                const alloc=capital>0?((pos.shares*liveP)/capital)*100:0
                const over=alloc>20
                const posVal=pos.shares*liveP, posCost=pos.shares*pos.avg_price
                const posPnl=posVal-posCost
                const posPnlPct=((liveP-pos.avg_price)/pos.avg_price)*100
                return (
                  <div key={pos.id} style={{ marginBottom:20 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                        <span style={{ fontSize:15,fontWeight:800,color:T.t1 }}>{pos.stock_code}</span>
                        {over && <span style={{ background:T.rBg,color:T.red,border:`1px solid ${T.rBdr}`,fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:99 }}>⚠ Overweight</span>}
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:15,fontWeight:900,color:over?T.red:T.em }}>{alloc.toFixed(1)}%</div>
                        <div style={{ fontSize:11,fontWeight:700,color:getProfitColor(posPnl,T) }}>
                          {posPnl>=0?"+":""}Rp {formatRupiahCompact(posPnl)} ({formatPercent(posPnlPct)})
                        </div>
                      </div>
                    </div>
                    <div style={{ height:8,background:T.bg0,borderRadius:99,overflow:"hidden",marginBottom:6 }}>
                      <div style={{ height:"100%",width:`${Math.min(100,(alloc/20)*100)}%`,background:over?T.red:alloc>15?T.amber:T.em,borderRadius:99,transition:"width 0.5s" }}/>
                    </div>
                    <div style={{ display:"flex",justifyContent:"space-between",fontSize:11,color:T.t3,fontWeight:600 }}>
                      <span>{pos.lot} Lot · Avg Rp {formatRupiah(pos.avg_price)} · Live Rp {formatRupiah(liveP)}</span>
                      <span>Rp {formatRupiahCompact(posVal)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ══ FORECAST ══ */}

        {/* ══ FORECAST ══ */}
        {tab==="forecast" && (
          <div className="fu" style={{ padding:"56px 20px 20px" }}>
            <div style={{ background:isDark?`linear-gradient(135deg,#181133 0%,${T.bg0} 100%)`:`linear-gradient(135deg,${T.bg3} 0%,${T.bg1} 100%)`,border:`1px solid ${T.lBdr}`,borderRadius:24,padding:"24px",marginBottom:20 }}>
              <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:20 }}>
                <TrendingUp size={20} color={T.blue}/>
                <div>
                  <h2 style={{ fontSize:20,fontWeight:900,color:T.t1 }}>Wealth Forecast</h2>
                  <p style={{ fontSize:11,color:T.t3,marginTop:1 }}>Simulasi pertumbuhan modal jangka panjang</p>
                </div>
              </div>
              <Input label="TARGET DANA PENSIUN (Rp)" type="number" value={fcTarget} onChange={e=>setFcTarget(e.target.value)} placeholder="3000000000"/>
              <Input label="TABUNGAN RUTIN / BULAN (Rp)" type="number" value={fcMonthly} onChange={e=>setFcMonthly(e.target.value)} placeholder="2000000"/>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
                <Input label="RETURN / TAHUN (%)" type="number" value={fcReturn} onChange={e=>setFcReturn(e.target.value)} placeholder="15"/>
                <Input label="DURASI (TAHUN)" type="number" value={fcYears} onChange={e=>setFcYears(e.target.value)} placeholder="10"/>
              </div>
              <div style={{ background:T.bg2,borderRadius:12,padding:"12px 14px" }}>
                <div style={{ fontSize:9,color:T.t3,fontWeight:700,marginBottom:4 }}>MODAL AWAL (EQUITY SAAT INI)</div>
                <div style={{ fontSize:18,fontWeight:900,color:T.em }}>Rp {formatRupiah(totalEquity)}</div>
              </div>
            </div>
            <div style={{ background:T.bg1,border:`1px solid ${T.bdr2}`,borderRadius:20,padding:20 }}>
              {forecastData.hitYear ? (
                <div style={{ background:T.gBg,border:`1px solid ${T.gBdr}`,padding:16,borderRadius:14,textAlign:"center",marginBottom:16 }}>
                  <CheckCircle size={24} color={T.green} style={{ margin:"0 auto 8px" }}/>
                  <div style={{ fontSize:15,fontWeight:800,color:T.green }}>Target Rp {formatRupiahCompact(Number(fcTarget))} Tercapai</div>
                  <div style={{ fontSize:12,color:T.green,marginTop:4 }}>Tahun ke-{forecastData.hitYear}</div>
                </div>
              ) : (
                <div style={{ background:T.rBg,border:`1px solid ${T.rBdr}`,padding:16,borderRadius:14,textAlign:"center",marginBottom:16 }}>
                  <Target size={24} color={T.red} style={{ margin:"0 auto 8px" }}/>
                  <div style={{ fontSize:15,fontWeight:800,color:T.red }}>Target Tidak Tercapai dalam {fcYears} Tahun</div>
                  <div style={{ fontSize:12,color:T.red,marginTop:4 }}>Naikkan DCA bulanan atau target return.</div>
                </div>
              )}
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {forecastData.rows.map(row=>(
                  <div key={row.y} style={{ background:T.bg2,padding:"12px 14px",borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${row.hit?T.gBdr:T.bdr}` }}>
                    <span style={{ fontSize:13,fontWeight:700,color:T.t2 }}>Tahun ke-{row.y}</span>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:15,fontWeight:900,color:row.hit?T.green:T.t1 }}>Rp {formatRupiahCompact(row.bal)}</div>
                      {row.hit && <div style={{ fontSize:9,color:T.green,fontWeight:700 }}>TARGET ✓</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <BottomNav tab={tab} setTab={setTab}/>

        {/* ══ MODALS ══ */}
        <Modal open={topupModal} onClose={()=>setTopupModal(false)} title="Top Up Dana" subtitle="Suntik modal tambahan ke Cash Reserve">
          <div style={{ background:T.lBg,border:`1px solid ${T.lBdr}`,padding:16,borderRadius:16,marginBottom:24,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontSize:13,fontWeight:700,color:T.blue }}>Cash saat ini:</span>
            <span style={{ fontSize:16,fontWeight:900,color:T.blue }}>Rp {formatRupiah(cash)}</span>
          </div>
          <Input label="NOMINAL (Rp)" prefix="Rp" type="text" value={topupVal}
            onChange={e=>{ const r=e.target.value.replace(/\D/g,""); setTopupVal(r?new Intl.NumberFormat("id-ID").format(r):"") }}
            placeholder="Minimal Rp 100.000"/>
          <Btn full onClick={handleTopUp} style={{ marginTop:12 }}>Injeksi Modal Sekarang</Btn>
        </Modal>

        <Modal open={addModal} onClose={()=>setAddModal(false)} title={`Beli ${addStock?.c||addStock?.stock_code||""}`} subtitle="Buka posisi baru atau Average Down">
          <div style={{ background:T.bg2,padding:16,borderRadius:16,marginBottom:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <div><div style={{ fontSize:10,fontWeight:800,color:T.t3,marginBottom:4 }}>CASH TERSEDIA</div><div style={{ fontSize:15,fontWeight:800,color:T.em }}>Rp {formatRupiahCompact(cash)}</div></div>
            <div style={{ textAlign:"right" }}><div style={{ fontSize:10,fontWeight:800,color:T.t3,marginBottom:4 }}>HARGA PASAR</div><div style={{ fontSize:15,fontWeight:800,color:T.t1 }}>Rp {formatRupiah(buyPrice)}</div></div>
          </div>
          <Input label="HARGA BELI (Rp)" type="number" prefix="Rp" value={buyPrice} onChange={e=>setBuyPrice(e.target.value)}/>
          <Input label="JUMLAH LOT" type="number" hint="1 Lot = 100 Lembar" value={buyLot} onChange={e=>setBuyLot(e.target.value)} placeholder="Contoh: 10"/>
          {buyLot&&buyPrice && (
            <div style={{ background:T.bg3,padding:16,borderRadius:16,marginBottom:20,display:"flex",justifyContent:"space-between" }}>
              <span style={{ fontSize:13,fontWeight:700,color:T.t2 }}>Total Biaya:</span>
              <span style={{ fontSize:16,fontWeight:900,color:T.t1 }}>Rp {formatRupiah(parseInt(buyLot)*100*parseFloat(buyPrice))}</span>
            </div>
          )}
          <Btn full onClick={handleBuy}>Eksekusi Pembelian</Btn>
        </Modal>

        <Modal open={sellModal} onClose={()=>setSellModal(false)} title={`Jual ${sellStock?.stock_code}`} subtitle="Amankan Profit atau Cut Loss sesuai Trading Plan">
          <div style={{ background:T.bg2,padding:16,borderRadius:16,marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontSize:13,fontWeight:700,color:T.t2 }}>Lot Dimiliki:</span>
            <span style={{ fontSize:16,fontWeight:900,color:T.t1 }}>{sellStock?.lot} Lot <span style={{ fontSize:12,color:T.t3 }}>(Avg Rp {formatRupiah(sellStock?.avg_price)})</span></span>
          </div>
          <Input label="HARGA JUAL (Rp)" type="number" prefix="Rp" value={sellPrice} onChange={e=>setSellPrice(e.target.value)}/>
          <Input label="LOT DIJUAL" type="number" hint={`Maks ${sellStock?.lot} Lot`} value={sellLot} onChange={e=>setSellLot(e.target.value)}/>
          {sellPrice&&sellLot&&(()=>{
            const pnl=(parseFloat(sellPrice)-(sellStock?.avg_price||0))*(parseInt(sellLot)*100)
            return (
              <div style={{ background:pnl>=0?T.gBg:T.rBg,border:`1px solid ${pnl>=0?T.gBdr:T.rBdr}`,padding:16,borderRadius:16,marginBottom:20,textAlign:"center" }}>
                <div style={{ fontSize:11,fontWeight:800,color:pnl>=0?T.green:T.red,marginBottom:4 }}>ESTIMASI REALIZED P&L</div>
                <div style={{ fontSize:22,fontWeight:900,color:pnl>=0?T.green:T.red }}>{pnl>=0?"+":""}Rp {formatRupiah(pnl)}</div>
              </div>
            )
          })()}
          <Btn variant="danger" full onClick={handleSell}>Konfirmasi Penjualan</Btn>
        </Modal>
      </div>
    </ThemeCtx.Provider>
  )
}