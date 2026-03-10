// ── JournalQuote: static motivasi berdasarkan konteks transaksi ─────
const QUOTES_WIN = [
  ["Profit bukan keberuntungan, tapi bukti bahwa proses dan disiplinmu bekerja.", "Peter Lynch"],
  ["Jual saat semua orang serakah. Kamu sudah membuktikannya hari ini.", "Warren Buffett"],
  ["Trader terbaik bukan yang paling sering menang, tapi yang paling konsisten dengan plannya.", "Mark Douglas"],
  ["Setiap profit adalah upah dari kesabaran dan keberanian mengambil keputusan.", "George Soros"],
  ["Biarkan keuntungan berlari, potong kerugian cepat. Kamu baru saja melakukannya.", "Ed Seykota"],
  ["Sukses di pasar saham dimulai dari memahami diri sendiri, bukan hanya memahami sahamnya.", "Jesse Livermore"],
  ["Disiplin adalah jembatan antara tujuan dan pencapaian.", "Jim Rohn"],
  ["Tidak semua orang berani hold dan exit di waktu yang tepat. Selamat.", "Nicolas Darvas"],
]
const QUOTES_LOSS = [
  ["Kerugian adalah biaya pendidikan terbaik di pasar modal. Bayar, pelajari, lanjutkan.", "George Soros"],
  ["Setiap trader hebat pernah rugi. Bedanya mereka bangkit dan tidak mengulangi kesalahan yang sama.", "Paul Tudor Jones"],
  ["Pasar tidak salah. Pasar selalu benar. Tugasmu adalah belajar membacanya.", "Jesse Livermore"],
  ["Cut loss bukan kekalahan, itu manajemen risiko. Kamu melindungi modal untuk hari esok.", "Mark Minervini"],
  ["Yang membunuh trader bukan satu kerugian besar, tapi tidak mau belajar dari kerugian kecil.", "Ed Seykota"],
  ["Jaga modalmu. Peluang berikutnya selalu datang bagi mereka yang masih punya amunisi.", "Warren Buffett"],
  ["Kesalahan adalah data. Analisis, koreksi, dan jadikan modal keputusan berikutnya.", "Ray Dalio"],
  ["Trader yang bertahan adalah mereka yang bisa menerima kekalahan tanpa menghancurkan diri sendiri.", "Van Tharp"],
]
const QUOTES_BIG_WIN = [
  ["Return besar datang dari riset dalam, konviksi kuat, dan kesabaran baja.", "Peter Lynch"],
  ["Ketika semua orang takut dan kamu berani, itulah momen terbaik lahir.", "Warren Buffett"],
  ["Momentum dan fundamental bertemu — itulah sweet spot yang kamu temukan.", "William O'Neil"],
]
const QUOTES_BIG_LOSS = [
  ["Kerugian besar mengajarkan apa yang profit tidak pernah bisa ajarkan. Dengarkan pesannya.", "Jesse Livermore"],
  ["Setelah badai terbesar, selalu ada fajar. Evaluasi, jangan kabur dari kenyataan.", "Ray Dalio"],
  ["Satu transaksi buruk tidak mendefinisikan karirmu. Tapi bagaimana kamu meresponsnya, iya.", "Mark Douglas"],
]

function JournalQuote({ row, pnl, note, theme: T }) {
  const isWin  = pnl > 0
  const pct    = row.avg_price > 0 ? Math.abs(((row.close_price - row.avg_price) / row.avg_price) * 100) : 0
  const isBig  = pct >= 15

  // Seed dari ID transaksi agar quote konsisten per row tapi bervariasi antar row
  const seed   = (row.id || "").split("").reduce((a,c)=>a+c.charCodeAt(0),0)
  let pool
  if (isWin && isBig)       pool = QUOTES_BIG_WIN
  else if (!isWin && isBig) pool = QUOTES_BIG_LOSS
  else if (isWin)           pool = QUOTES_WIN
  else                      pool = QUOTES_LOSS
  const [text, author] = pool[seed % pool.length]

  const accent    = isWin ? T.green : T.red
  const accentBg  = isWin ? T.gBg   : T.rBg
  const accentBdr = isWin ? T.gBdr  : T.rBdr

  return (
    <div style={{ background:accentBg, border:`1px solid ${accentBdr}`, borderRadius:10, padding:"11px 14px", marginTop:0 }}>
      <div style={{ fontSize:9, fontWeight:800, color:accent, marginBottom:5, letterSpacing:"0.5px" }}>
        {isWin ? "🏆 WISDOM PEMENANG" : "📖 PELAJARAN DARI PASAR"}
      </div>
      <div style={{ fontSize:12, color:T.t1, lineHeight:1.65, fontStyle:"italic" }}>
        "{text}"
      </div>
      <div style={{ fontSize:10, fontWeight:700, color:accent, marginTop:5 }}>— {author}</div>
    </div>
  )
}

import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from "react"
import {
  LayoutDashboard, Search, BookOpen, BarChart2, TrendingUp, Lightbulb,
  Plus, Download, LogOut, X, ArrowUpRight, ArrowDownRight,
  Wallet, AlertTriangle, Target, PieChart, Trophy, Landmark,
  ShieldCheck, Shield, Info, Filter, Sun, Moon, CheckCircle,
  DollarSign, Activity, TrendingDown, BarChart, Percent,
  RefreshCw, Bell, BellOff, Calendar as CalendarIcon, Crown, Lock, Zap, ChevronLeft, ChevronRight,
  Eye, Flame, Users, Globe, TrendingUp as TrendUp,
} from "lucide-react"
import { supabase }          from "./lib/supabase"
import { fetchBatchLiveQuotes, fetchSingleStockSearch } from "./lib/yahooApi"
import { calculateMoneyManagement, generateAdvisorySuggestions } from "./lib/moneyManagement"
import { POPULAR_IDX_SYMBOLS, DARK, LIGHT, getGlobalStyles } from "./lib/constants"

// ── Helper: parse harga dari input user (handle format ID & EN) ──
// Contoh: "4.387,68" → 4387.68 | "4387,68" → 4387.68 | "4387.68" → 4387.68
function parsePrice(raw) {
  if (!raw && raw !== 0) return 0
  const s = String(raw).trim()
  // Deteksi format: jika ada koma DAN titik, tentukan mana desimal
  // Format ID: 4.387,68  → titik=ribuan, koma=desimal
  // Format EN: 4,387.68  → koma=ribuan, titik=desimal
  // Hanya koma: 4387,68  → koma=desimal
  // Hanya titik: 4387.68 → titik=desimal
  let normalized
  if (s.includes(',') && s.includes('.')) {
    // Cek posisi: format mana yang lebih belakang
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // ID format: 4.387,68
      normalized = s.replace(/\./g, '').replace(',', '.')
    } else {
      // EN format: 4,387.68
      normalized = s.replace(/,/g, '')
    }
  } else if (s.includes(',')) {
    // Hanya koma — bisa ribuan (4,387) atau desimal (4387,68)
    const parts = s.split(',')
    if (parts[1]?.length === 3 && !parts[0].includes('.')) {
      // Ribuan: 4,387
      normalized = s.replace(',', '')
    } else {
      // Desimal: 4387,68
      normalized = s.replace(',', '.')
    }
  } else {
    // Hanya titik atau angka biasa
    normalized = s.replace(/,/g, '')
  }
  const result = parseFloat(normalized)
  return isNaN(result) ? 0 : Math.round(result * 100) / 100
}

// ── Helper: round ke N desimal tanpa floating point error ──
function rp(val, decimals = 2) {
  const factor = Math.pow(10, decimals)
  return Math.round((val + Number.EPSILON) * factor) / factor
}

// ── Helper: format harga dengan desimal (untuk display harga saham) ──
// Berbeda dari formatRupiah yang bulatkan ke integer
function formatHarga(val) {
  const n = Number(val) || 0
  const rounded = rp(n, 2)
  // Jika tidak ada desimal berarti (x.00), tampilkan tanpa desimal
  if (rounded === Math.round(rounded)) {
    return new Intl.NumberFormat('id-ID').format(rounded)
  }
  // Tampilkan dengan desimal, format ID (koma sebagai desimal)
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rounded)
}


// ── Dividend Yield statis (sumber: laporan dividen FY2024-2025) ──
const STATIC_DY = {
  BBRI:6.2, BMRI:5.4, BBNI:5.1, TLKM:7.2, PTBA:9.8, ITMG:11.6, ADRO:8.9,
  HRUM:7.8, BJTM:8.1, BJBR:7.4, PGAS:6.8, UNVR:9.2, AALI:5.9, LSIP:7.1,
  BYAN:6.4, ELSA:5.4, AUTO:5.0, SMSM:5.8, BSDE:2.1, PWON:2.8, CTRA:2.6,
  INDF:5.2, BBCA:2.9, ASII:4.5, KLBF:3.1, SIDO:5.6, TOWR:4.1, SMGR:3.8,
  AMMN:1.4, ANTM:2.6, INCO:3.8, TINS:2.4, MEDC:2.4, EXCL:3.0, ISAT:0,
  INKP:1.8, BRPT:1.9, MYOR:1.3, ACES:3.4, MAPI:1.5, JSMR:2.6, CPIN:2.6,
  AADI:5.2, BBTN:3.1, BBMD:4.2, BNGA:3.8, NISP:2.8, MEGA:4.1, BTPS:0,
  WSKT:0, WIKA:0, PTPP:1.2, ADHI:1.1, WTON:1.8, NRCA:3.2, TOTL:4.8,
  SSMS:3.6, PALM:2.8, TBLA:2.1, SGRO:3.4, DSNG:2.6, ICBP:3.4, ULTJ:1.8,
  ROTI:1.6, DLTA:4.2, MDKA:0, PGEO:1.8, ESSA:2.4, BREN:0, GOTO:0,
}
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
    { id:"portfolio", label:"Porto",     Icon:LayoutDashboard },
    { id:"screener",  label:"Screener",  Icon:Search },
    { id:"jurnal",    label:"Jurnal",    Icon:BookOpen },
    { id:"monitor",   label:"Monitor",   Icon:BarChart2 },
    { id:"forecast",  label:"Forecast",  Icon:TrendingUp },
    { id:"calendar",  label:"Kalender",  Icon:CalendarIcon },
    { id:"bandar",    label:"Bandar",    Icon:Eye },
    { id:"strategi",  label:"Strategi",  Icon:Lightbulb },
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
  const [buyNote,   setBuyNote]   = useState("")
  const [sellModal, setSellModal] = useState(false)
  const [sellStock, setSellStock] = useState(null)
  const [sellLot,   setSellLot]   = useState("")
  const [sellPrice, setSellPrice] = useState("")
  const [sellNote,  setSellNote]  = useState("")
  const [editModal, setEditModal] = useState(false)
  const [editPos,   setEditPos]   = useState(null)
  const [editAvg,   setEditAvg]   = useState("")
  const [editLot,   setEditLot]   = useState("")
  // ── Bandar Tab state ──────────────────────────────────
  const [bandarNetForeign, setBandarNetForeign] = useState(null)
  const [bandarLoading,    setBandarLoading]    = useState(false)
  const [bandarLastFetch,  setBandarLastFetch]  = useState(null)
  const [brokerSummary,    setBrokerSummary]    = useState([])
  const [brokerLoading,    setBrokerLoading]    = useState(false)
  const [topupModal,setTopupModal]= useState(false)
  const [topupVal,  setTopupVal]  = useState("")
  const [email,     setEmail]     = useState("")
  const [password,  setPassword]  = useState("")
  const [isLogin,   setIsLogin]   = useState(true)
  const [authLoad,  setAuthLoad]  = useState(false)

  // ── Push Notifications ─────────────────────────────────
  const [pushEnabled,    setPushEnabled]    = useState(false)
  const [pushLoading,    setPushLoading]    = useState(false)
  const [notifLog,       setNotifLog]       = useState([])   // per user, reset on signout
  const [notifBadge,     setNotifBadge]     = useState(0)
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const notifUserRef = React.useRef(null)  // track which user owns notifLog

  // ── Corporate Actions ────────────────────────────────────
  const [corpActions,    setCorpActions]    = useState([])
  const [corpLoaded,     setCorpLoaded]     = useState(false)
  const [corpLoading,    setCorpLoading]    = useState(false)
  const [corpFilter,     setCorpFilter]     = useState("all")
  const [corpTypeFilter, setCorpTypeFilter] = useState("Semua")
  const [calDate,        setCalDate]        = useState(() => new Date())
  const [calSelected,    setCalSelected]    = useState(null)   // selected day

  // ── IDX All Emiten ──────────────────────────────────────
  const [allEmiten,      setAllEmiten]      = useState([])  // {code, name} all ~900 IDX stocks
  const [emitenLoaded,   setEmitenLoaded]   = useState(false)

  // ── Subscription / Trial ────────────────────────────────
  const [subStatus,      setSubStatus]      = useState(null)  // null|"trial"|"active"|"expired"
  const [trialDaysLeft,  setTrialDaysLeft]  = useState(null)
  const [showSubModal,   setShowSubModal]   = useState(false)
  const [subPlan,        setSubPlan]        = useState("monthly")  // "monthly"|"yearly"

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
    if (p)    { setProfile(p); checkSubscription(p) }
    if (port) setPortfolio(port)
    if (j)    setJournal(j)
  }

  // ── Screener: load 958 stocks from static JSON ───────────
  // File: /public/idx_stocks.json — diupdate harian via script
  // Run: node scripts/update-idx-data.js  (atau upload Excel baru)
  const loadScreener = useCallback(async () => {
    setSyncing(true)
    try {
      // Load static JSON — 958 saham, fundamental + harga IDX
      const ts = new Date().toISOString().slice(0,10)
      const res = await fetch(`/idx_stocks.json?v=${ts}`)
      if (res.ok) {
        const json = await res.json()
        const raw = (json.data || []).filter(s => s.c)
        const arr = raw.map(s => {
          const dy_val = Number(s.dy) > 0 ? Number(s.dy) : (STATIC_DY[s.c] || 0)
          return {
            ...s,
            price:  Number(s.price)  || 0,
            chgPct: Number(s.chgPct ?? s.chgpct) || 0,
            chg:    Number(s.chg)    || 0,
            pe:     Number(s.pe)     || 0,
            pbv:    Number(s.pbv)    || 0,
            roe:    Number(s.roe)    || 0,
            dy:     dy_val,
            roa:    Number(s.roa)    || 0,
            der:    Number(s.der)    || 0,
            npm:    Number(s.npm)    || 0,
            vol:    Number(s.vol)    || 0,
          }
        })
        if (arr.length > 100) {
          setScreenerData(arr)
          const dict = {}
          arr.forEach(s => { dict[s.c] = s })
          setLiveCache(p => ({ ...p, ...dict }))
          setLastSync(getCurrentTimeString())
          setScreenerLoaded(true)
          notify(`✓ ${arr.length} saham IDX dimuat · harga sync tiap 30 detik`, "green")
          setSyncing(false)
          return
        }
      }
    } catch(e) { console.warn("idx_stocks.json:", e.message) }

    // Fallback: Yahoo API untuk saham-saham populer
    try {
      const data = await fetchBatchLiveQuotes(POPULAR_IDX_SYMBOLS)
      const arr = Object.values(data)
      if (arr.length > 0) {
        setScreenerData(arr)
        const dict = {}; arr.forEach(i => { dict[i.c] = i })
        setLiveCache(p => ({ ...p, ...dict }))
        setLastSync(getCurrentTimeString()); setScreenerLoaded(true)
        notify(`✓ ${arr.length} saham (fallback mode)`, "amber")
      } else { notify("Gagal memuat data pasar", "red") }
    } catch(e) { notify("Error: " + e.message, "red") }
    setSyncing(false)
  }, [notify])

  useEffect(() => { if (session && !screenerLoaded) loadScreener() }, [session, screenerLoaded, loadScreener])

  // corp-action auto-load added below after loadCorpActions defined

  // Shared merge helper — preserve fundamentals, update price only
  const mergeLive = useCallback((prev, fresh) => {
    const existing = prev || {}
    return {
      ...existing,
      ...fresh,
      pe:   (fresh.pe   > 0 ? fresh.pe   : existing.pe)   || 0,
      pbv:  (fresh.pbv  > 0 ? fresh.pbv  : existing.pbv)  || 0,
      roe:  (fresh.roe  > 0 ? fresh.roe  : existing.roe)  || 0,
      dy:   (fresh.dy   > 0 ? fresh.dy   : existing.dy)   || 0,
      der:  (fresh.der  > 0 ? fresh.der  : existing.der)  || 0,
      npm:  (fresh.npm  > 0 ? fresh.npm  : existing.npm)  || 0,
      wk52: existing.wk52 || fresh.wk52 || 0,
      wk13: existing.wk13 || fresh.wk13 || 0,
      wk4:  existing.wk4  || fresh.wk4  || 0,
    }
  }, [])

  const syncPrices = useCallback(async () => {
    setSyncing(true)
    // Kumpulkan semua kode: portfolio + screener yang sedang tampil (max 30)
    const portfolioCodes = portfolio.map(p => p.stock_code)
    const screenerRef    = window.__screenerVisibleCodes__ || []
    const allCodes       = [...new Set([...portfolioCodes, ...screenerRef])].filter(Boolean)
    if (!allCodes.length) { setSyncing(false); return }

    const upd = await fetchBatchLiveQuotes(allCodes)
    if (Object.keys(upd).length > 0) {
      setLiveCache(prev => {
        const next = { ...prev }
        for (const [code, fresh] of Object.entries(upd)) {
          next[code] = mergeLive(prev[code], fresh)
        }
        return next
      })
      setLastSync(getCurrentTimeString())
    }
    setSyncing(false)
  }, [portfolio, mergeLive])

  useEffect(() => {
    if (screenerLoaded) {
      syncPrices() // immediate first sync
      const id = setInterval(syncPrices, 30000)
      return () => clearInterval(id)
    }
  }, [screenerLoaded]) // eslint-disable-line


  // ══════════════════════════════════════════════════════════════
  // TAB BANDAR — Fetch & Logic
  // ══════════════════════════════════════════════════════════════

  // ── Hitung Unusual Volume Score dari liveCache ──────────────
  const getVolumeSpikeList = useCallback(() => {
    const result = []
    for (const [code, data] of Object.entries(liveCache)) {
      const volToday = data.volume || data.vol || 0
      const volAvg   = data.averageVolume || data.avg_vol || 0
      if (volToday > 0 && volAvg > 0) {
        const ratio = volToday / volAvg
        if (ratio >= 2) {
          result.push({
            code,
            price:    data.price || 0,
            chgPct:   data.chgPct || data.changePercent || 0,
            volToday,
            volAvg,
            ratio:    Math.round(ratio * 10) / 10,
            inPorto:  portfolio.some(p => p.stock_code === code),
          })
        }
      }
    }
    return result.sort((a, b) => b.ratio - a.ratio).slice(0, 20)
  }, [liveCache, portfolio])

  // ── Fetch Net Foreign dari IDX via allorigins ───────────────
  const fetchNetForeign = useCallback(async () => {
    setBandarLoading(true)
    try {
      const IDX_URL = "https://idx.co.id/id/data-pasar/ringkasan-perdagangan/ringkasan-saham/"
      const proxy   = `https://api.allorigins.win/get?url=${encodeURIComponent(IDX_URL)}`
      const r       = await fetch(proxy, { signal: AbortSignal.timeout(10000) })
      const wrapper = await r.json()
      // IDX returns HTML page — extract net foreign from embedded JSON
      const html    = wrapper.contents || ""
      // Try to parse structured market summary
      const IDX_API = "https://idx.co.id/primary/StockData/GetIndexSummary"
      const proxy2  = `https://api.allorigins.win/get?url=${encodeURIComponent(IDX_API)}`
      const r2      = await fetch(proxy2, { signal: AbortSignal.timeout(10000) })
      const w2      = await r2.json()
      const d       = JSON.parse(w2.contents || "{}")
      // Try different possible field structures
      const foreignNetBuy  = d?.ForeignNetBuy  || d?.foreignNetBuy  || d?.NetForeignBuy  || null
      const foreignNetSell = d?.ForeignNetSell || d?.foreignNetSell || d?.NetForeignSell || null
      const netVal         = d?.ForeignNet     || d?.foreignNet     || null
      if (foreignNetBuy !== null || netVal !== null) {
        setBandarNetForeign({ netBuy: foreignNetBuy, netSell: foreignNetSell, netVal, date: new Date().toLocaleDateString("id-ID") })
        setBandarLastFetch(new Date().toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" }))
        setBandarLoading(false)
        return
      }
    } catch(e) { console.warn("Net foreign fetch:", e.message) }

    // Fallback: estimate from liveCache foreign data if available
    // Just show "tidak tersedia" gracefully
    setBandarNetForeign({ netBuy: null, netSell: null, netVal: null, date: new Date().toLocaleDateString("id-ID"), fallback: true })
    setBandarLastFetch(new Date().toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit" }))
    setBandarLoading(false)
  }, [])

  // ── Fetch Broker Summary per-saham dari IDX ─────────────────
  const fetchBrokerSummary = useCallback(async (stockCode) => {
    if (!stockCode) return
    setBrokerLoading(true)
    try {
      const url    = `https://idx.co.id/primary/TradingSummary/GetBrokerSummary?code=${stockCode}&period=Daily`
      const proxy  = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
      const r      = await fetch(proxy, { signal: AbortSignal.timeout(10000) })
      const w      = await r.json()
      const d      = JSON.parse(w.contents || "{}")
      const rows   = d?.data || d?.Data || d?.result || []

      // Key brokers to highlight
      const KEY_BROKERS = {
        AK: { name:"UBS Sekuritas",    tier:1, bull:true  },
        ZP: { name:"Maybank Sekuritas", tier:1, bull:true  },
        BK: { name:"J.P. Morgan",       tier:1, bull:true  },
        YP: { name:"Mirae Asset",       tier:2, bull:false },
        YU: { name:"CGS International", tier:2, bull:false },
        DP: { name:"DBS Vickers",       tier:2, bull:true  },
        GW: { name:"HSBC Sekuritas",    tier:2, bull:false },
        CP: { name:"KB Valbury",        tier:2, bull:false },
        CC: { name:"Mandiri Sekuritas", tier:2, bull:true  },
        NI: { name:"BNI Sekuritas",     tier:2, bull:true  },
        PD: { name:"Indo Premier",      tier:3, bull:false },
        XL: { name:"Stockbit",          tier:3, bull:false },
      }

      if (rows.length > 0) {
        const mapped = rows
          .filter(r => KEY_BROKERS[r.broker_code || r.BrokerCode])
          .map(r => {
            const code = r.broker_code || r.BrokerCode
            const nb   = Number(r.net_buy || r.NetBuy || 0)
            const ns   = Number(r.net_sell || r.NetSell || 0)
            const net  = nb - ns
            return { code, ...KEY_BROKERS[code], netBuy: nb, netSell: ns, net }
          })
          .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
        setBrokerSummary(mapped)
      } else {
        // IDX blocked or no data — return empty with note
        setBrokerSummary([{ code:"—", name:"Data tidak tersedia (IDX blokir akses langsung dari browser)", tier:0, net:0 }])
      }
    } catch(e) {
      console.warn("Broker summary:", e.message)
      setBrokerSummary([{ code:"—", name:"Gagal memuat. Cek RTI Business atau Stockbit Pro untuk broker summary.", tier:0, net:0 }])
    }
    setBrokerLoading(false)
  }, [])

  // ── Auto fetch net foreign saat tab bandar dibuka ───────────
  useEffect(() => {
    if (tab === "bandar" && !bandarNetForeign && !bandarLoading) {
      fetchNetForeign()
    }
  }, [tab]) // eslint-disable-line

  // ── Catalyst Alert: porto × calendar events ─────────────────
  const getCatalystAlerts = useCallback(() => {
    if (!portfolio.length) return []
    const today = new Date()
    const portoCodes = portfolio.map(p => p.stock_code)
    // corpActions from calendar tab (already loaded)
    return (window.__corpActions__ || [])
      .filter(ev => {
        if (!portoCodes.includes(ev.code)) return false
        const evDate = new Date(ev.date)
        const diffDays = Math.ceil((evDate - today) / (1000 * 60 * 60 * 24))
        return diffDays >= 0 && diffDays <= 21
      })
      .map(ev => {
        const evDate = new Date(ev.date)
        const daysLeft = Math.ceil((evDate - today) / (1000 * 60 * 60 * 24))
        return { ...ev, daysLeft }
      })
      .sort((a, b) => a.daysLeft - b.daysLeft)
  }, [portfolio])

  // ── Push: reset notifLog on user switch ──────────────────
  useEffect(() => {
    if (session?.user?.id !== notifUserRef.current) {
      notifUserRef.current = session?.user?.id || null
      setNotifLog([])
      setNotifBadge(0)
      setShowNotifPanel(false)
    }
  }, [session])

  // ── Push: send notification ──────────────────────────────
  const sendPush = useCallback((title, body, tag) => {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try { new Notification(title, { body, tag, icon:"/favicon.ico", requireInteraction:false }) } catch(e){}
    }
    setNotifLog(prev => {
      const n = { id:Date.now(), title, body, time:new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}), tag }
      return [n, ...prev.filter(x=>x.tag!==tag)].slice(0,30)
    })
    setNotifBadge(b => b+1)
  }, [])

  const requestPush = useCallback(async () => {
    if (typeof Notification === "undefined") { notify("Browser tidak support notifikasi","amber"); return }
    setPushLoading(true)
    const perm = await Notification.requestPermission().catch(()=>"denied")
    setPushEnabled(perm === "granted")
    if (perm === "granted") notify("✓ Push notification aktif!","green")
    else notify("Izin ditolak — aktifkan di pengaturan browser","amber")
    setPushLoading(false)
  }, [notify])

  // ── Push: check all positions ─────────────────────────────
  const checkAlerts = useCallback(() => {
    if (!portfolio.length || !profile) return
    const cap = Number(profile.capital)||0
    const inv = portfolio.reduce((s,p)=>s+(p.shares*p.avg_price),0)
    const csh = Math.max(0, cap - inv)
    for (const pos of portfolio) {
      const live = liveCache[pos.stock_code]?.price
      if (!live) continue
      const pnlPct   = ((live - pos.avg_price) / pos.avg_price) * 100
      const pnlRp    = (live - pos.avg_price) * pos.shares
      const posVal   = pos.shares * pos.avg_price
      const allocPct = cap>0 ? (posVal/cap)*100 : 0
      const c = pos.stock_code
      const curLoss = pnlRp<0?Math.abs(pnlRp):0
      const sisa11  = Math.max(0, cap*0.11 - curLoss)
      const sisaA   = Math.max(0, cap*0.20 - posVal)
      const maxBeli = Math.min(sisa11/0.08, sisaA, csh)
      const canLot  = Math.max(0, Math.floor(maxBeli/live/100))
      const newAvg  = canLot>0?(posVal+canLot*100*live)/(pos.shares+canLot*100):pos.avg_price
      if (pnlPct <= -8)
        sendPush(`⛔ STOP LOSS: ${c}`,`Harga Rp${live.toLocaleString("id-ID")} sudah ${pnlPct.toFixed(1)}% dari avg Rp${pos.avg_price.toLocaleString("id-ID")}.

👉 JUAL SEKARANG. Kerugian Rp${Math.abs(pnlRp).toLocaleString("id-ID")} — jangan tunggu lebih dalam. Buka app → tab Porto → tap "Jual".`,`sl_${c}`)
      else if (pnlPct <= -5) {
        if (canLot>0 && allocPct<20)
          sendPush(`📉 Avg Down: ${c}`,`Harga ${pnlPct.toFixed(1)}% — zona avg down.

👉 BOLEH BELI ${canLot} lot @ Rp${live.toLocaleString("id-ID")}
Avg baru: Rp${newAvg.toFixed(0)} | Alokasi aman ≤20% | Max loss ≤11%.
Buka app → tap "Avg Down ${canLot} lot".`,`ad_${c}`)
        else
          sendPush(`⚠️ Waspada: ${c}`,`Harga ${pnlPct.toFixed(1)}%. ${allocPct>=20?"Alokasi "+allocPct.toFixed(1)+"% penuh — tidak boleh avg down.":"Batas loss 11% hampir habis."}

👉 TAHAN posisi. Pantau SL di Rp${(pos.avg_price*0.92).toLocaleString("id-ID")}.`,`warn_${c}`)
      }
      else if (pnlPct >= 25)
        sendPush(`🚀 TP2 +25%: ${c}`,`Profit ${pnlPct.toFixed(1)}% · Rp${pnlRp.toLocaleString("id-ID")}

👉 JUAL 50–75% (${Math.floor(pos.lot*0.6)} lot) untuk kunci profit maksimal. Buka app → tap "Jual".`,`tp2_${c}`)
      else if (pnlPct >= 15)
        sendPush(`🎯 TP1 +15%: ${c}`,`Profit ${pnlPct.toFixed(1)}% · Rp${pnlRp.toLocaleString("id-ID")}

👉 JUAL 30–50% (${Math.floor(pos.lot*0.35)} lot) untuk amankan profit. Sisakan ${Math.ceil(pos.lot*0.6)} lot untuk kejar TP2 +25%.`,`tp1_${c}`)
      else if (pnlPct>=5 && canLot>0 && allocPct<20)
        sendPush(`📈 Avg Up: ${c}`,`Harga +${pnlPct.toFixed(1)}% — momentum positif.

👉 BOLEH tambah ${canLot} lot @ Rp${live.toLocaleString("id-ID")}
Avg baru: Rp${newAvg.toFixed(0)} | Alokasi ≤20%. Buka app → tap "Tambah".`,`au_${c}`)
    }
  }, [portfolio, liveCache, profile, sendPush])

  useEffect(() => {
    if (pushEnabled && Object.keys(liveCache).length>0 && portfolio.length>0) checkAlerts()
  }, [liveCache, pushEnabled, checkAlerts])

  // ── Corp Actions: fallback data (2026) + IDX fetch ────────
  const CORP_FALLBACK = [
    { code:"BBCA", name:"Bank Central Asia",     type:"Dividen Tunai", desc:"Rp 340/saham",                   recordDate:"2026-04-14", payDate:"2026-04-28" },
    { code:"BBRI", name:"Bank Rakyat Indonesia", type:"Dividen Tunai", desc:"Rp 220/saham",                   recordDate:"2026-04-10", payDate:"2026-04-24" },
    { code:"BMRI", name:"Bank Mandiri",           type:"Dividen Tunai", desc:"Rp 310/saham",                   recordDate:"2026-05-07", payDate:"2026-05-21" },
    { code:"TLKM", name:"Telkom Indonesia",       type:"Dividen Tunai", desc:"Rp 185/saham",                   recordDate:"2026-05-02", payDate:"2026-05-16" },
    { code:"ADRO", name:"Adaro Energy",           type:"Dividen Tunai", desc:"Rp 480/saham",                   recordDate:"2026-04-28", payDate:"2026-05-12" },
    { code:"PTBA", name:"Bukit Asam",             type:"Dividen Tunai", desc:"Rp 620/saham",                   recordDate:"2026-04-18", payDate:"2026-05-02" },
    { code:"ITMG", name:"Indo Tambangraya",       type:"Dividen Tunai", desc:"Rp 1.250/saham",                 recordDate:"2026-04-22", payDate:"2026-05-06" },
    { code:"BBNI", name:"Bank Negara Indonesia",  type:"Dividen Tunai", desc:"Rp 192/saham",                   recordDate:"2026-05-05", payDate:"2026-05-19" },
    { code:"ASII", name:"Astra International",    type:"Dividen Tunai", desc:"Rp 228/saham",                   recordDate:"2026-05-12", payDate:"2026-05-26" },
    { code:"UNVR", name:"Unilever Indonesia",     type:"Dividen Tunai", desc:"Rp 210/saham",                   recordDate:"2026-04-30", payDate:"2026-05-14" },
    { code:"BREN", name:"Barito Renewables",      type:"Stock Split",   desc:"1:5 — 1 saham lama jadi 5",     recordDate:"2026-04-15", payDate:"2026-04-15" },
    { code:"AMMN", name:"Amman Mineral",          type:"Dividen Tunai", desc:"Rp 48/saham",                    recordDate:"2026-05-20", payDate:"2026-06-03" },
    { code:"KLBF", name:"Kalbe Farma",            type:"Stock Dividen", desc:"5:1 — tiap 5 saham dapat 1 baru",recordDate:"2026-05-25", payDate:"2026-06-09" },
    { code:"PGAS", name:"Perusahaan Gas Negara",  type:"Dividen Tunai", desc:"Rp 158/saham",                   recordDate:"2026-05-15", payDate:"2026-05-29" },
    { code:"INDF", name:"Indofood",               type:"Dividen Tunai", desc:"Rp 275/saham",                   recordDate:"2026-05-21", payDate:"2026-06-04" },
    { code:"ICBP", name:"Indofood CBP",           type:"Dividen Tunai", desc:"Rp 185/saham",                   recordDate:"2026-05-19", payDate:"2026-06-02" },
    { code:"SIDO", name:"Sido Muncul",            type:"Dividen Tunai", desc:"Rp 28/saham",                    recordDate:"2026-04-07", payDate:"2026-04-21" },
    { code:"TOWR", name:"Sarana Menara",          type:"Dividen Tunai", desc:"Rp 32/saham",                    recordDate:"2026-06-02", payDate:"2026-06-16" },
    { code:"CPIN", name:"Charoen Pokphand",       type:"Dividen Tunai", desc:"Rp 55/saham",                    recordDate:"2026-05-28", payDate:"2026-06-11" },
    { code:"GOTO", name:"GoTo Gojek Tokopedia",   type:"RUPS",          desc:"Persetujuan Laporan Tahunan",    recordDate:"2026-04-08", payDate:"2026-04-08" },
    { code:"TLKM", name:"Telkom Indonesia",       type:"RUPS",          desc:"Pengangkatan Direksi 2026–2029", recordDate:"2026-05-22", payDate:"2026-05-22" },
    { code:"BBCA", name:"Bank Central Asia",      type:"Rights Issue",  desc:"Rasio 5:1 · Harga Rp 8.500",    recordDate:"2026-06-10", payDate:"2026-06-25" },
    { code:"WIKA", name:"Wijaya Karya",           type:"Rights Issue",  desc:"Rasio 3:1 · Harga Rp 210",      recordDate:"2026-06-05", payDate:"2026-06-19" },
    { code:"BYAN", name:"Bayan Resources",        type:"Dividen Tunai", desc:"USD 0.30/saham",                 recordDate:"2026-06-20", payDate:"2026-07-04" },
    { code:"SMGR", name:"Semen Indonesia",        type:"Dividen Tunai", desc:"Rp 116/saham",                   recordDate:"2026-05-31", payDate:"2026-06-14" },
    { code:"AADI", name:"Adaro Andalan Indonesia",type:"Dividen Tunai", desc:"Rp 520/saham",                   recordDate:"2026-04-25", payDate:"2026-05-09" },
    { code:"ANTM", name:"Aneka Tambang",          type:"Dividen Tunai", desc:"Rp 45/saham",                    recordDate:"2026-05-14", payDate:"2026-05-28" },
    { code:"BBTN", name:"Bank Tabungan Negara",   type:"RUPS",          desc:"Restrukturisasi & RKAP 2026",    recordDate:"2026-04-16", payDate:"2026-04-16" },
  ]

  const loadCorpActions = useCallback(async () => {
    setCorpLoading(true)
    const past30   = new Date(Date.now()-30*86400000).toISOString().slice(0,10)
    const future6m = new Date(Date.now()+180*86400000).toISOString().slice(0,10)
    // IDX blocks direct fetch via CORS on production — route through allorigins proxy
    const idxUrl   = `https://idx.co.id/umbraco/Surface/CorporateAction/GetCorporateActionList?start=0&length=300&type=&startDate=${past30}&endDate=${future6m}`
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(idxUrl)}`
    try {
      const res = await fetch(proxyUrl, { signal:AbortSignal.timeout(12000) })
      if (res.ok) {
        const wrapper = await res.json()
        const data    = JSON.parse(wrapper.contents || "{}")
        const rows = (data?.data||[]).map(item=>({
          code:       (item.EfectCode||item.StockCode||"").toUpperCase().trim(),
          name:       item.CompanyName||item.Name||"",
          type:       item.CorporateActionType||item.Type||"Lainnya",
          desc:       item.Ratio||item.Description||item.Value||"",
          recordDate: (item.RecordDate||item.CumDate||"").slice(0,10),
          payDate:    (item.PaymentDate||item.ExDate||"").slice(0,10),
        })).filter(r => r.code && r.recordDate)
        setCorpActions(rows.length > 5 ? rows : CORP_FALLBACK)
        window.__corpActions__ = rows.length > 5 ? rows : CORP_FALLBACK
      } else { setCorpActions(CORP_FALLBACK); window.__corpActions__ = CORP_FALLBACK }
    } catch(e) { console.warn("Corp action:", e.message); setCorpActions(CORP_FALLBACK); window.__corpActions__ = CORP_FALLBACK }
    setCorpLoaded(true)
    setCorpLoading(false)
  }, [])

  // ── Auto-load corp actions on mount + tab switch ───────────
  useEffect(() => {
    if (session && !corpLoaded && !corpLoading) loadCorpActions()
  }, [session, loadCorpActions]) // loads as soon as session is ready

  // ── Subscription: check trial status ─────────────────────
  const checkSubscription = useCallback((profile_) => {
    if (!profile_) return
    const createdAt = profile_.created_at || profile_.inserted_at
    if (!createdAt) { setSubStatus("trial"); setTrialDaysLeft(30); return }
    const created = new Date(createdAt)
    const now = new Date()
    const daysSince = (now - created) / 86400000
    if (profile_.sub_plan === "active" || profile_.subscription_active) {
      setSubStatus("active")
    } else if (daysSince <= 30) {
      setSubStatus("trial")
      setTrialDaysLeft(Math.max(0, Math.ceil(30 - daysSince)))
    } else {
      setSubStatus("expired")
    }
  }, [])

  const handleAuth = async () => {
    if (!email||!password) { notify("Email & password wajib","amber"); return }
    setAuthLoad(true)
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          const msg = error.message?.toLowerCase() || ""
          if (msg.includes("invalid") || msg.includes("credentials") || msg.includes("not confirmed")) {
            throw new Error("Login gagal. Pastikan email sudah diverifikasi (cek inbox/spam) dan password benar.")
          }
          throw error
        }
      } else {
        if (password.length < 6) { notify("Password minimal 6 karakter","amber"); setAuthLoad(false); return }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/",
          }
        })
        if (error) throw error
        notify("✉️ Link verifikasi dikirim ke email kamu. Cek inbox/spam lalu klik link untuk aktivasi.","green")
        setIsLogin(true)
      }
    } catch(e) { notify(e.message,"red") }
    setAuthLoad(false)
  }

  const signInWithGoogle = async () => {
    setAuthLoad(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/",
        queryParams: { access_type: "offline", prompt: "consent" }
      }
    })
    if (error) { notify(error.message, "red"); setAuthLoad(false) }
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
    const newCap = (profile.capital||0) + amount
    const { error } = await supabase.from("profiles").update({ capital:newCap }).eq("id",session.user.id)
    if (error) { notify("Gagal: "+error.message,"red"); return }
    await supabase.from("journal").insert([{ user_id:session.user.id,stock_code:"__TOPUP__",date:getTodayDateString(),lot:0,shares:0,avg_price:0,close_price:0,pos_val:amount,cur_val:amount,pnl:0,pnl_pct:0,alloc_pct:0,suggestions:JSON.stringify([{t:"blue",msg:"TopUp "+amount}]) }]).then(({error:e})=>e&&console.error(e))
    await loadData(session.user.id); setTopupModal(false); setTopupVal("")
    notify(`Top up Rp ${formatRupiah(amount)} berhasil`,"green")
  }

  const handleBuy = async () => {
    const lot=parseInt(buyLot), price=parsePrice(buyPrice)
    if (!lot||!price) { notify("Isi lot dan harga","amber"); return }
    const shares  = lot * 100
    const cost    = rp(shares * price)           // exact: 1800 * 4387.68 = 7,897,824.00
    const invested= portfolio.reduce((s,p)=>s+rp(p.shares*p.avg_price),0)
    const cash    = Math.max(0,(profile?.capital||0)-invested)
    if (cost>cash) { notify(`Cash tidak cukup! Tersedia: Rp ${formatRupiahCompact(cash)}`,"red"); return }
    const code=addStock?.c||addStock?.stock_code
    const exists=portfolio.find(p=>p.stock_code===code)
    try {
      if (exists) {
        const ns = exists.shares + shares
        const na = rp((rp(exists.shares * exists.avg_price) + cost) / ns)  // avg baru exact
        await supabase.from("portfolio").update({ lot:exists.lot+lot,shares:ns,avg_price:na,close_price:price }).eq("id",exists.id)
      } else {
        await supabase.from("portfolio").insert([{ user_id:session.user.id,stock_code:code,sector:addStock?.s||"IDX",lot,shares,avg_price:price,close_price:price }])
      }
      const jAlloc=capital>0?rp((cost/capital)*100):0
      const { error: journalErr } = await supabase.from("journal").insert([{ user_id:session.user.id,stock_code:code,date:getTodayDateString(),lot,shares,avg_price:price,close_price:price,pos_val:cost,cur_val:cost,pnl:0,pnl_pct:0,alloc_pct:jAlloc,suggestions:JSON.stringify([{t:"blue",msg:"BUY "+lot+"lot@"+price},{t:"note",msg:buyNote.trim()||"—"}]) }])
      if (journalErr) { notify("Jurnal error: "+journalErr.message,"red"); console.error("Journal BUY error:",journalErr); return }
      await loadData(session.user.id); setAddModal(false); setBuyLot(""); setBuyPrice(""); setBuyNote("")
      setTab("portfolio"); notify(`✅ Beli ${code} ${lot} lot sukses!`,"green")
    } catch(e) { console.error("handleBuy error:",e); notify("Gagal: "+e.message,"red") }
  }

  const handleSell = async () => {
    const lot=parseInt(sellLot), price=parsePrice(sellPrice)
    if (!lot||!price) { notify("Isi lot dan harga","amber"); return }
    if (lot>sellStock.lot) { notify(`Maks ${sellStock.lot} lot`,"red"); return }
    const shares=lot*100
    const realizedPnlThisTrade = (price - sellStock.avg_price) * shares
    const nominal = shares * price
    const remaining = sellStock.shares - shares
    // Capital model: capital = total injeksi. Cash = capital - invested.
    // Saat jual, invested berkurang (portfolio berkurang), cash otomatis naik.
    // Kalau rugi, kita perlu kurangi capital sebesar kerugian agar total equity benar.
    // Cara paling clean: capital += pnl (positif = tambah, negatif = kurangi)
    const newCapital = (profile.capital||0) + realizedPnlThisTrade
    try {
      await supabase.from("profiles").update({ capital: newCapital }).eq("id",session.user.id)
      if (remaining===0) await supabase.from("portfolio").delete().eq("id",sellStock.id)
      else await supabase.from("portfolio").update({ lot:sellStock.lot-lot,shares:remaining,close_price:price }).eq("id",sellStock.id)
      const sAlloc=capital>0?Math.round((shares*sellStock.avg_price/capital)*10000)/100:0
      const { error: sellJournalErr } = await supabase.from("journal").insert([{
        user_id:session.user.id,stock_code:sellStock.stock_code,date:getTodayDateString(),lot,shares,
        avg_price:sellStock.avg_price,close_price:price,
        pos_val:shares*sellStock.avg_price,cur_val:shares*price,
        pnl:Math.round(realizedPnlThisTrade),
        pnl_pct:sellStock.avg_price>0?Math.round(((price-sellStock.avg_price)/sellStock.avg_price)*10000)/100:0,
        alloc_pct:sAlloc,
        suggestions:JSON.stringify([{t:realizedPnlThisTrade>=0?"green":"red",msg:"SELL "+lot+"lot@"+price+"|pnl:"+Math.round(realizedPnlThisTrade)},{t:"note",msg:sellNote.trim()||"—"}])
      }])
      if (sellJournalErr) { notify("Jurnal error: "+sellJournalErr.message,"red"); console.error("Journal SELL error:",sellJournalErr); return }
      await loadData(session.user.id); setSellModal(false); setSellLot(""); setSellPrice(""); setSellNote("")
      notify(`P&L: ${realizedPnlThisTrade>=0?"+":""}Rp ${formatRupiah(realizedPnlThisTrade)}`, realizedPnlThisTrade>=0?"green":"red")
    } catch(e) { console.error("handleSell error:",e); notify("Gagal: "+e.message,"red") }
  }

  // ── Derived ──────────────────────────────────────────────
  const capital    = Number(profile?.capital)||0
  const invested   = portfolio.reduce((s,p)=>s+(p.shares*p.avg_price),0)
  const curVal     = portfolio.reduce((s,p)=>s+(p.shares*(liveCache[p.stock_code]?.price||p.close_price||p.avg_price)),0)
  const unrealPnL  = curVal - invested
  const cash       = Math.max(0, capital - invested)
  const cashPct    = capital>0 ? (cash/capital)*100 : 100
  const totalEquity= capital + unrealPnL
  const handleEdit = async () => {
    const newAvgP = parsePrice(editAvg)
    const newLot  = parseInt(editLot)
    if (!newAvgP || !newLot) { notify("Isi avg price dan lot","amber"); return }
    try {
      await supabase.from("portfolio").update({
        avg_price: newAvgP,
        lot:       newLot,
        shares:    newLot * 100,
      }).eq("id", editPos.id)
      await loadData(session.user.id)
      setEditModal(false); setEditPos(null)
      notify(`✅ Posisi ${editPos.stock_code} diperbarui`, "green")
    } catch(e) { notify("Gagal: "+e.message, "red") }
  }

  const _jType=(j,t)=>{try{return JSON.parse(j.suggestions||"[]").some(x=>x.msg?.toUpperCase().startsWith(t))}catch{return false}}
  const realizedPnL= journal.filter(j=>_jType(j,"SELL")).reduce((s,j)=>s+Number(j.pnl||0),0)
  const totalBuy   = journal.filter(j=>_jType(j,"BUY")).length
  const totalSell  = journal.filter(j=>_jType(j,"SELL")).length
  const winTrades  = journal.filter(j=>_jType(j,"SELL")&&Number(j.pnl||0)>0).length
  const tradeWinRate = totalSell>0 ? (winTrades/totalSell)*100 : 0
  const winPos     = portfolio.filter(p=>(liveCache[p.stock_code]?.price||p.close_price)>p.avg_price).length
  const posWinRate = portfolio.length>0 ? (winPos/portfolio.length)*100 : 0
  const cashStatus = cashPct<10 ? "red" : cashPct<20 ? "amber" : "green"

  // Screener filter
  const screenerList = (() => {
    // Merge screenerData dengan liveCache untuk harga terkini
    let list = screenerData.map(s => {
      const live = liveCache[s.c]
      if (!live) return s
      return {
        ...s,
        price:  live.price  || s.price,
        chgPct: live.chgPct ?? live.chgpct ?? s.chgPct ?? s.chgpct ?? 0,
        chg:    live.chg    || s.chg || 0,
        vol:    live.volume || live.vol || s.vol || 0,
      }
    })

    if (screenerQ.trim()) {
      const q = screenerQ.toUpperCase()
      list = list.filter(s => s.c.includes(q) || (s.n || "").toUpperCase().includes(q))
    }
    const f = screenerFilter
    if      (f==="LQ45")      list=list.filter(s=>s.idx_member||s.idx_list?.includes("LQ45")).sort((a,b)=>b.vol-a.vol)
    else if (f==="Dividen")   list=list.filter(s=>Number(s.dy)>=5).sort((a,b)=>Number(b.dy)-Number(a.dy))
    else if (f==="PBV")       list=list.filter(s=>Number(s.pbv)>0&&Number(s.pbv)<1.5).sort((a,b)=>Number(a.pbv)-Number(b.pbv))
    else if (f==="PE")        list=list.filter(s=>Number(s.pe)>0&&Number(s.pe)<15).sort((a,b)=>Number(a.pe)-Number(b.pe))
    else if (f==="ROE")       list=list.filter(s=>Number(s.roe)>15).sort((a,b)=>Number(b.roe)-Number(a.roe))
    else if (f==="GrowthMom") list=list.filter(s=>Number(s.wk4)>0&&Number(s.wk13)>0).sort((a,b)=>Number(b.wk4)-Number(a.wk4))
    else if (f==="ValuePick") list=list.filter(s=>Number(s.pe)>0&&Number(s.pe)<12&&Number(s.pbv)>0&&Number(s.pbv)<1.5&&Number(s.roe)>10).sort((a,b)=>Number(b.roe)-Number(a.roe))
    else list=list.filter(s=>s.price>0).sort((a,b)=>b.vol-a.vol)
    const sliced = list.slice(0, 80)
    // Expose visible codes so syncPrices can fetch them
    window.__screenerVisibleCodes__ = sliced.map(s => s.c)
    return sliced
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

            {/* Google Sign In */}
            <button onClick={signInWithGoogle} disabled={authLoad} style={{
              width:"100%", display:"flex", alignItems:"center", justifyContent:"center",
              gap:12, padding:"13px 20px", borderRadius:14, cursor:"pointer",
              background:isDark?"#fff":"#fff", border:"1.5px solid #e2e8f0",
              fontWeight:700, fontSize:14, color:"#1a1a1a", marginBottom:20,
              boxShadow:"0 1px 4px rgba(0,0,0,0.08)", transition:".2s",
              opacity: authLoad ? 0.6 : 1,
            }} className="tap">
              {/* Google SVG icon */}
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v8.51h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.14z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              </svg>
              {authLoad ? "Menghubungkan..." : "Lanjutkan dengan Google"}
            </button>

            {/* Divider */}
            <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20 }}>
              <div style={{ flex:1,height:1,background:T.bdr }}/>
              <span style={{ fontSize:11,fontWeight:700,color:T.t3 }}>ATAU</span>
              <div style={{ flex:1,height:1,background:T.bdr }}/>
            </div>

            {/* Tab MASUK / DAFTAR */}
            <div style={{ display:"flex",gap:8,background:T.bg0,padding:6,borderRadius:16,marginBottom:20 }}>
              {[["MASUK",true],["DAFTAR",false]].map(([lbl,l])=>(
                <button key={lbl} onClick={()=>setIsLogin(l)} style={{ flex:1,padding:11,borderRadius:12,background:isLogin===l?T.bg3:"transparent",color:isLogin===l?T.t1:T.t3,border:"none",fontWeight:800,fontSize:13,cursor:"pointer",transition:".2s" }}>{lbl}</button>
              ))}
            </div>

            <Input label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="investor@sukses.com"/>
            <Input label="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimal 6 karakter"/>
            <Btn full onClick={handleAuth} disabled={authLoad} style={{ marginTop:16,padding:15 }}>
              {authLoad?<Spinner/>:(isLogin?"Masuk ke Terminal":"Mulai Gratis")}
            </Btn>

            {/* Forgot password hint */}
            {isLogin && (
              <p style={{ textAlign:"center",marginTop:14,fontSize:11,color:T.t3 }}>
                Lupa password?{" "}
                <span onClick={async()=>{
                  if(!email){notify("Masukkan email dulu","amber");return}
                  const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+"/"})
                  if(error)notify(error.message,"red")
                  else notify("Link reset password dikirim ke email kamu","green")
                }} style={{ color:T.em,fontWeight:700,cursor:"pointer" }}>Reset di sini</span>
              </p>
            )}
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
            await supabase.from("journal").insert([{ user_id:session.user.id,stock_code:"__TOPUP__",date:getTodayDateString(),lot:0,shares:0,avg_price:0,close_price:0,pos_val:raw,cur_val:raw,pnl:0,pnl_pct:0,alloc_pct:0,suggestions:JSON.stringify([{t:"blue",msg:"TopUp "+raw}]) }])
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
                  <div style={{ display:"flex",gap:7 }}>
                    <ThemeBtn/>
                    <button onClick={()=>{ if(!pushEnabled) requestPush(); else { setShowNotifPanel(p=>!p); setNotifBadge(0) } }}
                      disabled={pushLoading} className="tap" title={pushEnabled?"Notifikasi":"Aktifkan notifikasi"}
                      style={{ position:"relative",background:pushEnabled?T.lBg:T.bg2,border:`1px solid ${pushEnabled?T.lBdr:T.bdr2}`,borderRadius:12,padding:"9px 12px",cursor:"pointer",display:"flex",alignItems:"center",gap:5 }}>
                      {pushEnabled?<Bell size={15} color={T.blue}/>:<BellOff size={15} color={T.t3}/>}
                      {notifBadge>0&&<span style={{ position:"absolute",top:3,right:3,width:8,height:8,background:T.red,borderRadius:"50%" }}/>}
                    </button>
                    {subStatus==="trial" && trialDaysLeft<=7 && (
                      <button onClick={()=>setShowSubModal(true)} className="tap"
                        style={{ background:T.aBg,border:`1px solid ${T.aBdr}`,borderRadius:12,padding:"9px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:5 }}>
                        <Crown size={13} color={T.amber}/>
                        <span style={{ fontSize:10,fontWeight:800,color:T.amber }}>{trialDaysLeft}h</span>
                      </button>
                    )}
                  </div>
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
                    {cashPct.toFixed(1)}% <span style={{ fontSize:11,fontWeight:600,color:T.t3 }}>| {formatRupiahCompact(cash)}</span>
                  </span>
                </div>
                <div style={{ height:6,background:T.bg0,borderRadius:99,overflow:"hidden" }}>
                  <div style={{ height:"100%",width:`${Math.min(100,cashPct)}%`,background:{red:T.red,amber:T.amber,green:T.green}[cashStatus],transition:"width 0.8s ease" }}/>
                </div>
              </div>
            </div>

            {/* ── Notif Panel ── */}
            {showNotifPanel && (
              <div className="fi" style={{ background:T.bg1,border:`1px solid ${T.lBdr}`,borderRadius:18,margin:"10px 16px 0",overflow:"hidden" }}>
                <div style={{ padding:"12px 16px 8px",borderBottom:`1px solid ${T.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                    <Bell size={13} color={T.blue}/>
                    <span style={{ fontSize:13,fontWeight:800,color:T.t1 }}>Alert ({notifLog.length})</span>
                  </div>
                  <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                    {notifLog.length>0&&<button onClick={()=>{setNotifLog([]);setNotifBadge(0)}} style={{ fontSize:10,fontWeight:700,color:T.t3,background:"none",border:"none",cursor:"pointer" }}>Hapus</button>}
                    <button onClick={()=>setShowNotifPanel(false)} style={{ background:T.bg2,border:"none",borderRadius:7,width:24,height:24,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }} className="tap"><X size={11} color={T.t2}/></button>
                  </div>
                </div>
                <div style={{ maxHeight:280,overflowY:"auto" }}>
                  {notifLog.length===0 ? (
                    <div style={{ padding:"20px",textAlign:"center",color:T.t3,fontSize:12 }}>Belum ada alert. Cek otomatis setiap 30 detik saat live.</div>
                  ) : notifLog.map(n=>{
                    const isSL=n.tag?.startsWith("sl"), isTP=n.tag?.startsWith("tp"), isAU=n.tag?.startsWith("au")
                    const col=isSL?T.red:isTP?T.green:isAU?T.green:n.tag?.startsWith("warn")?T.amber:T.blue
                    const bg=isSL?T.rBg:isTP||isAU?T.gBg:n.tag?.startsWith("warn")?T.aBg:T.lBg
                    return (
                      <div key={n.id} style={{ padding:"11px 16px",borderBottom:`1px solid ${T.bdr}`,background:bg }}>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                          <span style={{ fontSize:12,fontWeight:800,color:col }}>{n.title}</span>
                          <span style={{ fontSize:10,color:T.t3,marginLeft:8 }}>{n.time}</span>
                        </div>
                        <p style={{ fontSize:10,color:col,lineHeight:1.5,whiteSpace:"pre-line",opacity:0.85 }}>{n.body}</p>
                      </div>
                    )
                  })}
                </div>
                {!pushEnabled && <div style={{ padding:"12px 16px",background:T.bg2,borderTop:`1px solid ${T.bdr}` }}>
                  <button onClick={requestPush} disabled={pushLoading} style={{ width:"100%",background:T.blue,color:"#fff",border:"none",borderRadius:10,padding:"10px",fontSize:12,fontWeight:800,cursor:"pointer" }} className="tap">🔔 Aktifkan Push Notification</button>
                  <p style={{ fontSize:10,color:T.t3,textAlign:"center",marginTop:6 }}>Alert SL/TP/Avg langsung ke HP kamu</p>
                </div>}
              </div>
            )}

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
                const pnlPct   = pos.avg_price>0 ? ((live-pos.avg_price)/pos.avg_price)*100 : 0
                const pnlRp    = (live-pos.avg_price)*pos.shares
                const allocPct = capital>0 ? (posVal/capital)*100 : 0
                const over20   = allocPct>20
                const slPrice  = pos.avg_price*0.92, adLevel=pos.avg_price*0.95, tp1Price=pos.avg_price*1.15, tp2Price=pos.avg_price*1.25
                const curLoss  = pnlRp<0?Math.abs(pnlRp):0
                const sisa11   = Math.max(0, capital*0.11 - curLoss)
                const maxBeli  = Math.min(sisa11/0.08, Math.max(0,capital*0.20-posVal), cash)
                const canLot   = Math.max(0, Math.floor(maxBeli/live/100))
                const canRp    = canLot*100*live
                const newAvg   = canLot>0?(posVal+canRp)/(pos.shares+canLot*100):pos.avg_price
                const newAlloc = capital>0?((posVal+canRp)/capital)*100:0
                const isSL=pnlPct<=-8, isAD=pnlPct<=-5&&pnlPct>-8, isAU=pnlPct>=5&&pnlPct<15, isTP1=pnlPct>=15, isTP2=pnlPct>=25

                // ── MA200 Trend Signal ─────────────────────────────────
                // Kalkulasi proxy MA200 dari data yang tersedia di liveCache
                // Rumus: MA200 ≈ live / (1 + wk52_return/100)
                // Ini karena harga setahun lalu = live / (1 + %perubahan_52w)
                // Ambil data MA dari screenerData (stabil, tidak ter-overwrite syncPrices)
                const stockData  = liveCache[pos.stock_code] || {}
                const scrData    = screenerData.find(s=>s.c===pos.stock_code) || {}
                const wk52ret    = Number(scrData.wk52 || stockData.wk52 || 0)
                const wk13ret    = Number(scrData.wk13 || stockData.wk13 || 0)
                const wk4ret     = Number(scrData.wk4  || stockData.wk4  || 0)
                // MA200 proxy = rata-rata harga selama ~1 tahun (approx dari wk52)
                const ma200proxy = wk52ret !== 0 ? live / (1 + wk52ret/100) * 0.92 + live * 0.08 : 0
                // MA50 proxy dari wk13 (13 minggu ≈ 65 hari trading, dekat MA50)
                const ma50proxy  = wk13ret !== 0 ? live / (1 + wk13ret/100) * 0.8 + live * 0.2 : 0
                // Trend signal
                const hasMaData  = wk52ret !== 0 || wk13ret !== 0
                const aboveMA200 = hasMaData && ma200proxy > 0 && live > ma200proxy
                const belowMA200 = hasMaData && ma200proxy > 0 && live < ma200proxy
                const aboveMA50  = hasMaData && ma50proxy  > 0 && live > ma50proxy
                const belowMA50  = hasMaData && ma50proxy  > 0 && live < ma50proxy
                // Trend classification
                const trendUp    = aboveMA200 && aboveMA50   // bull: di atas MA200 & MA50
                const trendDown  = belowMA200 && belowMA50   // bear: di bawah MA200 & MA50
                const trendCaution = belowMA200 && aboveMA50 // death-cross zone: di bawah MA200 tapi di atas MA50
                const trendRecov = aboveMA200 && belowMA50   // recovery: golden cross zone
                return (
                  <div key={pos.id} className="fu" style={{ background:T.bg1,border:`1px solid ${isSL?T.rBdr:over20?T.aBdr:T.bdr2}`,borderRadius:18,overflow:"hidden",marginBottom:12,animationDelay:`${pidx*0.04}s` }}>
                    {isSL&&<div style={{ background:T.rBg,padding:"7px 14px",borderBottom:`1px solid ${T.rBdr}` }}><span style={{ fontSize:11,fontWeight:800,color:T.red }}>⛔ CUT LOSS — sudah {pnlPct.toFixed(1)}%. Jual sekarang!</span></div>}
                    {over20&&!isSL&&<div style={{ background:T.aBg,padding:"7px 14px",borderBottom:`1px solid ${T.aBdr}` }}><span style={{ fontSize:11,fontWeight:800,color:T.amber }}>⚠ Overweight {allocPct.toFixed(1)}% — melebihi 20%</span></div>}
                    {isTP2&&<div style={{ background:T.gBg,padding:"7px 14px",borderBottom:`1px solid ${T.gBdr}` }}><span style={{ fontSize:11,fontWeight:800,color:T.green }}>🚀 TP2 +25% tercapai! Pertimbangkan jual 50–75%.</span></div>}
                    {isTP1&&!isTP2&&<div style={{ background:T.gBg,padding:"7px 14px",borderBottom:`1px solid ${T.gBdr}` }}><span style={{ fontSize:11,fontWeight:800,color:T.green }}>🎯 TP1 +15% tercapai! Bisa jual 30–50%.</span></div>}
                    {/* MA200 Trend Warning */}
                    {hasMaData && (()=>{
                      const [dot,label,sub,bc,tc] = trendDown
                        ? ["#ff4444","Downtrend","Di bawah MA200 & MA50","#ff444420","#ff4444"]
                        : trendCaution
                        ? [T.amber,"Waspada MA200","Tren lemah, pantau ketat",T.aBg,T.amber]
                        : trendRecov
                        ? ["#44cc77","Konsolidasi","Di atas MA200, MA50 belum konfirm","#44cc7715","#44cc77"]
                        : trendUp
                        ? ["#33cc55","Uptrend","Di atas MA200 & MA50","#33cc5512","#33cc55"]
                        : [null,null,null,null,null]
                      if (!dot) return null
                      return (
                        <div style={{ background:bc,padding:"5px 14px",borderBottom:`1px solid ${tc}25`,display:"flex",alignItems:"center",gap:7 }}>
                          <span style={{ width:6,height:6,borderRadius:"50%",background:dot,flexShrink:0,display:"inline-block" }}/>
                          <span style={{ fontSize:10,fontWeight:800,color:tc }}>{label}</span>
                          <span style={{ fontSize:10,color:tc,opacity:0.75 }}>· {sub}</span>
                        </div>
                      )
                    })()}
                    <div style={{ padding:"14px 14px 0" }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
                        <div><div style={{ fontSize:16,fontWeight:900,color:T.t1 }}>{pos.stock_code}</div><div style={{ fontSize:10,color:T.t3,marginTop:1 }}>{pos.lot} lot · {pos.sector}</div></div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:20,fontWeight:900,color:pnlPct>=0?T.green:T.red }}>{formatPercent(pnlPct)}</div>
                          <div style={{ fontSize:10,fontWeight:700,color:pnlPct>=0?T.green:T.red }}>{pnlRp>=0?"+":""}Rp {formatRupiahCompact(Math.abs(pnlRp))}</div>
                        </div>
                      </div>
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:12 }}>
                        {[["AVG",`Rp ${formatHarga(pos.avg_price)}`,T.t2],["LIVE",`Rp ${formatHarga(live)}`,T.em],["MODAL",`Rp ${formatRupiahCompact(posVal)}`,T.t3]].map(([l,v,c])=>(
                          <div key={l} style={{ background:T.bg2,borderRadius:10,padding:"8px 10px" }}><div style={{ fontSize:9,color:T.t3,fontWeight:700,marginBottom:2 }}>{l}</div><div style={{ fontSize:11,fontWeight:800,color:c }}>{v}</div></div>
                        ))}
                      </div>
                      <div style={{ marginBottom:12 }}>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}><span style={{ fontSize:9,fontWeight:700,color:T.t3 }}>ALOKASI EQUITY</span><span style={{ fontSize:11,fontWeight:900,color:over20?T.red:allocPct>15?T.amber:T.green }}>{allocPct.toFixed(1)}<span style={{ fontWeight:500,color:T.t3 }}>% / 20%</span></span></div>
                        <div style={{ height:4,background:T.bg0,borderRadius:99,overflow:"hidden" }}><div style={{ height:"100%",width:`${Math.min(100,(allocPct/20)*100)}%`,background:over20?T.red:allocPct>15?T.amber:T.em,borderRadius:99,transition:"width 0.6s" }}/></div>
                      </div>
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12 }}>
                        {[["CUT LOSS -8%","Rp "+formatHarga(slPrice),T.red,isSL||live<=slPrice],["AVG DOWN -5%","Rp "+formatHarga(adLevel),T.amber,live<=adLevel],["TP1 +15%","Rp "+formatHarga(tp1Price),T.green,live>=tp1Price],["TP2 +25%","Rp "+formatHarga(tp2Price),T.green,live>=tp2Price]].map(([lbl,val,col,hit])=>(
                          <div key={lbl} style={{ background:hit?`${col}18`:T.bg2,border:`1px solid ${hit?col+"50":T.bdr}`,borderRadius:9,padding:"6px 9px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                            <span style={{ fontSize:8,fontWeight:800,color:hit?col:T.t3 }}>{lbl}</span><span style={{ fontSize:10,fontWeight:900,color:hit?col:T.t2 }}>{val}</span>
                          </div>
                        ))}
                      </div>
                      {isSL?(
                        <div style={{ background:T.rBg,border:`1px solid ${T.rBdr}`,borderRadius:10,padding:"10px 12px",marginBottom:12 }}><div style={{ fontSize:11,fontWeight:800,color:T.red,marginBottom:2 }}>Wajib jual sekarang</div><div style={{ fontSize:10,color:T.red,lineHeight:1.5 }}>Loss {pnlPct.toFixed(1)}% · Rp {formatHarga(Math.abs(pnlRp))} · Jangan tunggu lebih dalam.</div></div>
                      ):isAD&&canLot>0&&!over20?(
                        <div style={{ marginBottom:12 }}>
                          <div style={{ background:T.lBg,border:`1px solid ${T.lBdr}`,borderRadius:10,padding:"10px 12px",marginBottom:7 }}>
                            <div style={{ fontSize:11,fontWeight:800,color:T.blue,marginBottom:5 }}>Bisa Average Down</div>
                            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 10px",fontSize:10 }}>
                              {[["Maks beli",canLot+" lot (Rp "+formatRupiahCompact(canRp)+")"],["Avg baru","Rp "+formatHarga(newAvg)],["Alokasi baru",newAlloc.toFixed(1)+"%"],["SL baru","Rp "+formatHarga(newAvg*0.92)]].map(([l,v])=>(
                                <div key={l}><span style={{ color:T.t3 }}>{l}: </span><strong style={{ color:T.blue }}>{v}</strong></div>
                              ))}
                            </div>
                          </div>
                          <button onClick={()=>{ setAddStock({c:pos.stock_code,s:pos.sector}); setBuyLot(String(canLot)); setBuyPrice(String(rp(live))); setAddModal(true) }} style={{ width:"100%",background:T.lBg,border:`1px solid ${T.lBdr}`,borderRadius:9,padding:"8px",fontSize:11,fontWeight:800,color:T.blue,cursor:"pointer" }} className="tap">Avg Down {canLot} lot @ Rp {formatRupiah(live)}</button>
                        </div>
                      ):isAD&&(canLot===0||over20)?(
                        <div style={{ background:T.aBg,border:`1px solid ${T.aBdr}`,borderRadius:10,padding:"9px 12px",marginBottom:12 }}><div style={{ fontSize:10,fontWeight:700,color:T.amber }}>{over20?"Tidak bisa avg down — alokasi "+allocPct.toFixed(1)+"% sudah >20%":"Tidak bisa avg down — batas loss 11% hampir tercapai"}</div></div>
                      ):isAU&&canLot>0&&!over20?(
                        <div style={{ marginBottom:12 }}>
                          <div style={{ background:T.gBg,border:`1px solid ${T.gBdr}`,borderRadius:10,padding:"10px 12px",marginBottom:7 }}>
                            <div style={{ fontSize:11,fontWeight:800,color:T.green,marginBottom:5 }}>Bisa Average Up (+5%)</div>
                            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"3px 10px",fontSize:10 }}>
                              {[["Maks beli",canLot+" lot"],["Avg baru","Rp "+formatHarga(newAvg)],["Alokasi baru",newAlloc.toFixed(1)+"%"],["Biaya","Rp "+formatRupiahCompact(canRp)]].map(([l,v])=>(<div key={l}><span style={{ color:T.t3 }}>{l}: </span><strong style={{ color:T.green }}>{v}</strong></div>))}
                            </div>
                          </div>
                          <button onClick={()=>{ setAddStock({c:pos.stock_code,s:pos.sector}); setBuyLot(String(canLot)); setBuyPrice(String(rp(live))); setAddModal(true) }} style={{ width:"100%",background:T.gBg,border:`1px solid ${T.gBdr}`,borderRadius:9,padding:"8px",fontSize:11,fontWeight:800,color:T.green,cursor:"pointer" }} className="tap">Avg Up {canLot} lot @ Rp {formatRupiah(live)}</button>
                        </div>
                      ):(
                        <div style={{ background:T.bg2,borderRadius:9,padding:"8px 12px",marginBottom:12 }}><div style={{ fontSize:10,color:T.t2 }}>Hold — tunggu level TP atau Avg.</div></div>
                      )}
                    </div>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",borderTop:`1px solid ${T.bdr}` }}>
                      <button onClick={()=>{ setSellStock(pos); setSellPrice(String(rp(live))); setSellModal(true) }} style={{ background:"transparent",border:"none",borderRight:`1px solid ${T.bdr}`,padding:"11px",fontSize:12,fontWeight:800,color:T.red,cursor:"pointer" }} className="tap">Jual</button>
                      <button onClick={()=>{ setEditPos(pos); setEditAvg(String(pos.avg_price)); setEditLot(String(pos.lot)); setEditModal(true) }} style={{ background:"transparent",border:"none",borderRight:`1px solid ${T.bdr}`,padding:"11px",fontSize:12,fontWeight:800,color:T.t2,cursor:"pointer" }} className="tap">Edit</button>
                      <button onClick={()=>{ setAddStock({c:pos.stock_code,s:pos.sector}); setBuyPrice(String(rp(live))); setAddModal(true) }} style={{ background:"transparent",border:"none",padding:"11px",fontSize:12,fontWeight:800,color:T.green,cursor:"pointer" }} className="tap">Tambah</button>
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
              {[
                {id:"Semua",label:"Semua IDX"},
                {id:"LQ45",label:"LQ45"},
                {id:"Dividen",label:"Dividen >5%"},
                {id:"PBV",label:"PBV < 1.5x"},
                {id:"PE",label:"PE < 15x"},
                {id:"ROE",label:"ROE > 15%"},
                {id:"GrowthMom",label:"Momentum +"},
                {id:"ValuePick",label:"Value Pick"},
              ].map(f=>(
                <button key={f.id} onClick={()=>setScreenerFilter(f.id)} style={{ background:screenerFilter===f.id?T.em:T.bg1,color:screenerFilter===f.id?T.bg0:T.t2,border:`1px solid ${screenerFilter===f.id?T.em:T.bdr2}`,borderRadius:99,padding:"9px 16px",fontSize:11,fontWeight:800,whiteSpace:"nowrap",cursor:"pointer",transition:".2s",flexShrink:0 }}>
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
                      <div style={{ fontSize:18,fontWeight:900,color:(s.chgPct??s.chgpct)>=0?T.green:T.red }}>Rp {formatRupiah(s.price||0)}</div>
                      <div style={{ fontSize:12,fontWeight:700,color:(s.chgPct??s.chgpct)>=0?T.green:T.red }}>{(s.chgPct??s.chgpct)>=0?"+":""}{Number((s.chgPct??s.chgpct)||0).toFixed(2)}%</div>
                    </div>
                  </div>

                  {/* Fundamental 4 kolom */}
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16 }}>
                    <FBadge label="DIV YIELD" value={s.dy>0?`${s.dy}%`:null} good={s.dy>=5}/>
                    <FBadge label="PBV" value={s.pbv>0?`${s.pbv}x`:null} good={s.pbv>0&&s.pbv<1.2}/>
                    <FBadge label="P/E" value={s.pe>0?`${s.pe}x`:null} good={s.pe>0&&s.pe<12}/>
                    <FBadge label="ROE" value={s.roe>0?`${s.roe}%`:null} good={s.roe>=15}/>
                  </div>

                  {/* Extra fundamentals row */}
                  {(s.npm>0||s.der>0) && (
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12 }}>
                      <FBadge label="NET MARGIN" value={s.npm>0?`${s.npm}%`:null} good={s.npm>10}/>
                      <FBadge label="DER" value={s.der>0?`${s.der}x`:null} good={s.der>0&&s.der<1.5}/>
                    </div>
                  )}

                  {/* Performance chips */}
                  {(s.wk4||s.wk13||s.wk52) ? (
                    <div style={{ display:"flex",gap:6,marginBottom:12,flexWrap:"wrap" }}>
                      {[["4W",s.wk4],["13W",s.wk13],["52W",s.wk52]].map(([lbl,v])=> v!=null && v!==0 ? (
                        <span key={lbl} style={{ fontSize:9,fontWeight:800,padding:"3px 8px",borderRadius:6,
                          background:Number(v)>=0?T.gBg:T.rBg,
                          color:Number(v)>=0?T.green:T.red,
                          border:`1px solid ${Number(v)>=0?T.gBdr:T.rBdr}` }}>
                          {lbl} {Number(v)>=0?"+":""}{Number(v).toFixed(1)}%
                        </span>
                      ) : null)}
                      {s.sector && <span style={{ fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:6,background:T.bg2,color:T.t3,border:`1px solid ${T.bdr}` }}>{s.sector}</span>}
                    </div>
                  ) : null}

                  {/* Pesan jika semua fundamental kosong */}
                  {(!s.dy&&!s.pbv&&!s.pe&&!s.roe) && (
                    <div style={{ background:T.bg2,border:`1px solid ${T.bdr}`,borderRadius:10,padding:"7px 12px",marginBottom:10,fontSize:10,color:T.t3 }}>
                      Data fundamental tidak tersedia untuk saham ini
                    </div>
                  )}
                  <Btn full onClick={()=>{ setAddStock(s); setBuyPrice(String(rp(s.price||0))); setAddModal(true) }}>
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
              const _msg=_sg().map(x=>x.msg||"").join("|").toUpperCase()
              const rowType=row.stock_code==="__TOPUP__"?"TOPUP":_msg.startsWith("SELL")?"SELL":"BUY"
              const isSell=rowType==="SELL", isTopup=rowType==="TOPUP"
              const typeConf = {
                BUY:   { label:"BELI",   col:T.green, bg:T.gBg, bdr:T.gBdr, Icon:ArrowUpRight },
                SELL:  { label:"JUAL",   col:T.red,   bg:T.rBg, bdr:T.rBdr, Icon:ArrowDownRight },
                TOPUP: { label:"TOP UP", col:T.blue,  bg:T.lBg, bdr:T.lBdr, Icon:Plus },
              }[rowType] || { label:rowType, col:T.t2, bg:T.bg2, bdr:T.bdr, Icon:Activity }
              const { label, col, bg, bdr, Icon: RIcon } = typeConf
              return (()=>{
                  const note = _sg().find(x=>x.t==="note")?.msg
                  const hasNote = note && note !== "—"
                  return (
                  <div key={row.id} className="fu" style={{ background:T.bg1,border:`1px solid ${T.bdr2}`,borderRadius:20,padding:18,marginBottom:10,animationDelay:`${i*0.02}s` }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
                      <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                        <div style={{ background:bg,border:`1px solid ${bdr}`,borderRadius:10,padding:"7px 14px",display:"flex",alignItems:"center",gap:6,minWidth:90,justifyContent:"center" }}>
                          <RIcon size={14} color={col}/>
                          <span style={{ fontSize:12,fontWeight:900,color:col,letterSpacing:"0.5px" }}>{label}</span>
                        </div>
                        <span style={{ fontSize:17,fontWeight:900,color:T.t1 }}>{row.stock_code}</span>
                      </div>
                      <span style={{ fontSize:11,fontWeight:600,color:T.t3 }}>{row.date}</span>
                    </div>

                    {/* Metrics */}
                    <div style={{ background:T.bg2,padding:"12px 16px",borderRadius:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom: hasNote||isSell?10:0 }}>
                      <div>
                        <div style={{ fontSize:10,fontWeight:800,color:T.t3,marginBottom:4 }}>{isTopup?"NOMINAL":"LOT × HARGA"}</div>
                        <div style={{ fontSize:13,fontWeight:700,color:T.t1 }}>
                          {isTopup ? `Rp ${formatRupiah(row.pos_val||0)}` : `${row.lot} Lot @ Rp ${formatHarga(row.close_price)}`}
                        </div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:10,fontWeight:800,color:T.t3,marginBottom:4 }}>{isSell?"REALIZED P&L":"TOTAL NILAI"}</div>
                        <div style={{ fontSize:15,fontWeight:900,color:isSell?getProfitColor(row.pnl,T):isTopup?T.blue:T.t1 }}>
                          {isSell ? `${(row.pnl||0)>=0?"+":""}Rp ${formatHarga(row.pnl||0)}` : `Rp ${formatRupiahCompact(row.pos_val||(row.lot*100*row.close_price))}`}
                        </div>
                      </div>
                    </div>

                    {/* User note */}
                    {hasNote && (
                      <div style={{ background:T.bg0,border:`1px solid ${T.bdr}`,borderRadius:10,padding:"10px 12px",marginBottom:isSell?10:0 }}>
                        <div style={{ fontSize:9,fontWeight:800,color:T.t3,marginBottom:4,letterSpacing:"0.5px" }}>💭 ALASAN {isSell?"JUAL":"BELI"}</div>
                        <div style={{ fontSize:12,color:T.t2,lineHeight:1.6,fontStyle:"italic" }}>"{note}"</div>
                      </div>
                    )}

                    {/* AI Quote — hanya untuk transaksi SELL */}
                    {isSell && <JournalQuote row={row} pnl={row.pnl||0} note={note} theme={T} isDark={isDark}/>}
                  </div>
                  )
                })()
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
            <div style={{ background:isDark?`linear-gradient(135deg,#181133 0%,${T.bg0} 100%)`:`linear-gradient(135deg,${T.bg3} 0%,${T.bg1} 100%)`,border:`1px solid ${T.lBdr}`,borderRadius:24,padding:24,marginBottom:20 }}>
              <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:20 }}><TrendingUp size={20} color={T.blue}/><div><h2 style={{ fontSize:20,fontWeight:900,color:T.t1 }}>Wealth Forecast</h2><p style={{ fontSize:11,color:T.t3,marginTop:1 }}>Simulasi pertumbuhan modal jangka panjang</p></div></div>
              <Input label="TARGET DANA PENSIUN (Rp)" type="number" value={fcTarget} onChange={e=>setFcTarget(e.target.value)} placeholder="3000000000"/>
              <Input label="TABUNGAN RUTIN / BULAN (Rp)" type="number" value={fcMonthly} onChange={e=>setFcMonthly(e.target.value)} placeholder="2000000"/>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
                <Input label="RETURN / TAHUN (%)" type="number" value={fcReturn} onChange={e=>setFcReturn(e.target.value)} placeholder="15"/>
                <Input label="DURASI (TAHUN)" type="number" value={fcYears} onChange={e=>setFcYears(e.target.value)} placeholder="10"/>
              </div>
              <div style={{ background:T.bg2,borderRadius:12,padding:"12px 14px",marginTop:4 }}>
                <div style={{ fontSize:9,color:T.t3,fontWeight:700,marginBottom:4 }}>MODAL AWAL (EQUITY SAAT INI)</div>
                <div style={{ fontSize:18,fontWeight:900,color:T.em }}>Rp {formatRupiah(totalEquity)}</div>
              </div>
            </div>
            <div style={{ background:T.bg1,border:`1px solid ${T.bdr2}`,borderRadius:20,padding:20 }}>
              {(() => {
                let bal=totalEquity; const monthly=(parseFloat(fcMonthly)||0),ar=(parseFloat(fcReturn)||10)/100,mr=ar/12,total=(parseInt(fcYears)||10)*12,target=parseFloat(fcTarget)||3e9
                const rows=[]; let hitYear=null
                for (let m=1;m<=total;m++) { bal=(bal+monthly)*(1+mr); if (m%12===0) { const y=m/12; if(!hitYear&&bal>=target) hitYear=y; rows.push({y,bal,hit:bal>=target}) } }
                return (<>
                  {hitYear?<div style={{ background:T.gBg,border:`1px solid ${T.gBdr}`,padding:16,borderRadius:14,textAlign:"center",marginBottom:16 }}><CheckCircle size={24} color={T.green} style={{ margin:"0 auto 8px" }}/><div style={{ fontSize:15,fontWeight:800,color:T.green }}>Target Rp {formatRupiahCompact(Number(fcTarget))} Tercapai 🎉</div><div style={{ fontSize:12,color:T.green,marginTop:4 }}>Tahun ke-{hitYear}</div></div>:<div style={{ background:T.rBg,border:`1px solid ${T.rBdr}`,padding:16,borderRadius:14,textAlign:"center",marginBottom:16 }}><Target size={24} color={T.red} style={{ margin:"0 auto 8px" }}/><div style={{ fontSize:14,fontWeight:800,color:T.red }}>Target Tidak Tercapai dalam {fcYears} Tahun</div><div style={{ fontSize:11,color:T.red,marginTop:4 }}>Naikkan DCA atau target return.</div></div>}
                  <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                    {rows.map(row=><div key={row.y} style={{ background:T.bg2,padding:"12px 14px",borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center",border:`1px solid ${row.hit?T.gBdr:T.bdr}` }}><span style={{ fontSize:13,fontWeight:700,color:T.t2 }}>Tahun ke-{row.y}</span><div style={{ textAlign:"right" }}><div style={{ fontSize:15,fontWeight:900,color:row.hit?T.green:T.t1 }}>Rp {formatRupiahCompact(row.bal)}</div>{row.hit&&<div style={{ fontSize:9,color:T.green,fontWeight:700 }}>TARGET ✓</div>}</div></div>)}
                  </div>
                </>)
              })()}
            </div>
          </div>
        )}

        {/* ══ KALENDER CORPORATE ACTION ══ */}
        {tab==="calendar" && (() => {
          const today = new Date().toISOString().slice(0,10)
          const myPCodes = portfolio.map(p=>p.stock_code)
          const year = calDate.getFullYear(), month = calDate.getMonth()
          const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"]
          const DAYS_ID = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"]

          // Filter corp actions — semua event untuk dots kalender
          let filteredCA = [...corpActions]
          if (corpFilter==="myPorto") filteredCA = filteredCA.filter(c=>myPCodes.includes(c.code))
          if (corpTypeFilter!=="Semua") filteredCA = filteredCA.filter(c=>c.type?.includes(corpTypeFilter))

          // Pisahkan upcoming vs past untuk list
          const upcomingCA = filteredCA.filter(c => c.recordDate >= today)
          const pastCA     = filteredCA.filter(c => c.recordDate < today)

          // Group by recordDate for calendar dots — semua event
          const caByDate = {}
          filteredCA.forEach(ca => {
            const d = ca.recordDate
            if (!caByDate[d]) caByDate[d] = []
            caByDate[d].push(ca)
          })

          // Calendar grid
          const firstDay = new Date(year, month, 1).getDay()
          const daysInMonth = new Date(year, month+1, 0).getDate()
          const cells = []
          for (let i=0; i<firstDay; i++) cells.push(null)
          for (let d=1; d<=daysInMonth; d++) cells.push(d)

          const fmtDate = (y,m,d) => `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`
          const typeStyle = {
            "Dividen Tunai": { col:T.green, bg:T.gBg, bdr:T.gBdr, icon:"💰" },
            "Stock Dividen": { col:T.green, bg:T.gBg, bdr:T.gBdr, icon:"📈" },
            "Stock Split":   { col:T.blue,  bg:T.lBg, bdr:T.lBdr, icon:"✂️" },
            "RUPS":          { col:T.amber, bg:T.aBg, bdr:T.aBdr, icon:"🏛" },
            "Rights Issue":  { col:T.blue,  bg:T.lBg, bdr:T.lBdr, icon:"📋" },
            "Waran":         { col:T.amber, bg:T.aBg, bdr:T.aBdr, icon:"🎫" },
          }

          return (
            <div className="fu" style={{ padding:"56px 0 20px" }}>
              {/* Header */}
              <div style={{ padding:"0 20px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                <div><h2 style={{ fontSize:24,fontWeight:900,color:T.t1,marginBottom:4 }}>Corporate Action</h2><p style={{ fontSize:12,color:T.t2 }}>Dividen · RUPS · Stock Split · Rights Issue</p></div>
                <div style={{ display:"flex",gap:7 }}>
                  {corpLoaded&&<button onClick={()=>{setCorpLoaded(false);loadCorpActions()}} className="tap" style={{ background:T.bg2,border:`1px solid ${T.bdr2}`,borderRadius:11,padding:"8px 11px",cursor:"pointer" }}><RefreshCw size={13} color={T.t2}/></button>}
                  <ThemeBtn/>
                </div>
              </div>

              {/* Filter Porto vs Semua */}
              <div style={{ display:"flex",gap:8,padding:"0 20px",marginBottom:12 }}>
                {[["all","Semua IDX"],["myPorto",`Portofolio (${portfolio.length})`]].map(([v,l])=>(
                  <button key={v} onClick={()=>setCorpFilter(v)} style={{ flex:1,padding:"9px",borderRadius:13,border:`1px solid ${corpFilter===v?T.em:T.bdr2}`,background:corpFilter===v?T.em:"transparent",color:corpFilter===v?T.bg0:T.t2,fontSize:12,fontWeight:800,cursor:"pointer",transition:".2s" }}>{l}</button>
                ))}
              </div>

              {/* Filter Tipe */}
              <div style={{ display:"flex",gap:7,overflowX:"auto",padding:"0 20px 12px" }} className="hide-scrollbar">
                {["Semua","Dividen Tunai","Stock Dividen","Stock Split","RUPS","Rights Issue","Waran"].map(t=>(
                  <button key={t} onClick={()=>setCorpTypeFilter(t)} style={{ background:corpTypeFilter===t?T.blue:T.bg1,color:corpTypeFilter===t?"#fff":T.t2,border:`1px solid ${corpTypeFilter===t?T.blue:T.bdr2}`,borderRadius:99,padding:"7px 13px",fontSize:11,fontWeight:800,whiteSpace:"nowrap",cursor:"pointer",flexShrink:0 }}>{t}</button>
                ))}
              </div>

              {/* ── CALENDAR VIEW ── */}
              <div style={{ background:T.bg1,margin:"0 16px 16px",border:`1px solid ${T.bdr2}`,borderRadius:20,overflow:"hidden" }}>
                {/* Month nav */}
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${T.bdr}` }}>
                  <button onClick={()=>setCalDate(new Date(year,month-1,1))} className="tap" style={{ background:T.bg2,border:`1px solid ${T.bdr2}`,borderRadius:10,width:34,height:34,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}><ChevronLeft size={16} color={T.t2}/></button>
                  <span style={{ fontSize:16,fontWeight:900,color:T.t1 }}>{MONTHS_ID[month]} {year}</span>
                  <button onClick={()=>setCalDate(new Date(year,month+1,1))} className="tap" style={{ background:T.bg2,border:`1px solid ${T.bdr2}`,borderRadius:10,width:34,height:34,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}><ChevronRight size={16} color={T.t2}/></button>
                </div>
                {/* Day headers */}
                <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"10px 12px 6px" }}>
                  {DAYS_ID.map(d=><div key={d} style={{ textAlign:"center",fontSize:10,fontWeight:800,color:T.t3,padding:"4px 0" }}>{d}</div>)}
                </div>
                {/* Day cells */}
                <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,padding:"0 12px 12px" }}>
                  {cells.map((d,i) => {
                    if (!d) return <div key={i}/>
                    const dateStr = fmtDate(year,month,d)
                    const events  = caByDate[dateStr] || []
                    const isToday = dateStr === today
                    const isSel   = calSelected === dateStr
                    const hasDiv  = events.some(e=>e.type?.includes("Dividen"))
                    const hasSplit= events.some(e=>e.type?.includes("Split")||e.type?.includes("Rights")||e.type?.includes("Waran"))
                    const hasRUPS = events.some(e=>e.type?.includes("RUPS"))
                    return (
                      <button key={i} onClick={()=>setCalSelected(isSel?null:dateStr)}
                        style={{ background:isSel?T.em:isToday?T.bg2:"transparent",border:`1px solid ${isSel?T.em:events.length>0?T.bdr2:"transparent"}`,borderRadius:10,padding:"6px 2px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,minHeight:42 }}
                        className="tap">
                        <span style={{ fontSize:12,fontWeight:isSel||isToday?900:600,color:isSel?T.bg0:isToday?T.em:events.length>0?T.t1:T.t3 }}>{d}</span>
                        {events.length>0 && (
                          <div style={{ display:"flex",gap:2,flexWrap:"wrap",justifyContent:"center" }}>
                            {hasDiv  && <span style={{ width:5,height:5,borderRadius:"50%",background:T.green,display:"block" }}/>}
                            {hasSplit&& <span style={{ width:5,height:5,borderRadius:"50%",background:T.blue,display:"block" }}/>}
                            {hasRUPS && <span style={{ width:5,height:5,borderRadius:"50%",background:T.amber,display:"block" }}/>}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                {/* Legend */}
                <div style={{ display:"flex",gap:12,padding:"0 16px 14px",justifyContent:"center" }}>
                  {[[T.green,"Dividen"],[T.blue,"Split/Rights"],[T.amber,"RUPS"]].map(([c,l])=>(
                    <div key={l} style={{ display:"flex",alignItems:"center",gap:4 }}><span style={{ width:7,height:7,borderRadius:"50%",background:c,display:"block" }}/><span style={{ fontSize:10,color:T.t3,fontWeight:600 }}>{l}</span></div>
                  ))}
                </div>
              </div>

              {/* Selected day detail */}
              {calSelected && caByDate[calSelected] && (
                <div style={{ padding:"0 16px 12px" }}>
                  <div style={{ fontSize:12,fontWeight:800,color:T.t3,letterSpacing:1,marginBottom:10 }}>
                    AGENDA {new Date(calSelected).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}).toUpperCase()}
                  </div>
                  {caByDate[calSelected].map((item,i)=>{
                    const ts=typeStyle[item.type]||{col:T.t2,bg:T.bg2,bdr:T.bdr,icon:"📄"}
                    const owned=myPCodes.includes(item.code)
                    return (
                      <div key={i} className="fu" style={{ background:T.bg1,border:`1px solid ${owned?T.em+"60":T.bdr2}`,borderRadius:16,padding:16,marginBottom:10,animationDelay:`${i*0.05}s` }}>
                        {owned&&<div style={{ fontSize:10,fontWeight:800,color:T.green,marginBottom:8 }}>★ SAHAM KAMU</div>}
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                          <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                            <div style={{ width:38,height:38,borderRadius:10,background:T.bg2,border:`1px solid ${T.bdr}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:T.t1 }}>{item.code.slice(0,2)}</div>
                            <div><div style={{ fontSize:14,fontWeight:900,color:T.t1 }}>{item.code}</div><div style={{ fontSize:10,color:T.t3,maxWidth:150,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{item.name}</div></div>
                          </div>
                          <div style={{ background:ts.bg,border:`1px solid ${ts.bdr}`,borderRadius:9,padding:"4px 9px",display:"flex",alignItems:"center",gap:4 }}>
                            <span style={{ fontSize:11 }}>{ts.icon}</span><span style={{ fontSize:9,fontWeight:800,color:ts.col }}>{item.type}</span>
                          </div>
                        </div>
                        {item.desc&&<div style={{ background:ts.bg,border:`1px solid ${ts.bdr}`,borderRadius:9,padding:"9px 11px",marginBottom:8 }}><div style={{ fontSize:12,fontWeight:800,color:ts.col }}>{item.desc}</div></div>}
                        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:7 }}>
                          <div style={{ background:T.bg2,borderRadius:9,padding:"7px 10px" }}><div style={{ fontSize:9,fontWeight:700,color:T.t3,marginBottom:2 }}>RECORD DATE</div><div style={{ fontSize:11,fontWeight:800,color:T.t1 }}>{item.recordDate||"—"}</div></div>
                          <div style={{ background:T.bg2,borderRadius:9,padding:"7px 10px" }}><div style={{ fontSize:9,fontWeight:700,color:T.t3,marginBottom:2 }}>PAYMENT DATE</div><div style={{ fontSize:11,fontWeight:800,color:T.t1 }}>{item.payDate||"—"}</div></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Load trigger */}
              {!corpLoaded&&!corpLoading&&(
                <div style={{ textAlign:"center",padding:"30px 20px" }}>
                  <CalendarIcon size={36} color={T.t3} style={{ margin:"0 auto 16px",opacity:0.4 }}/>
                  <p style={{ fontSize:13,color:T.t2,marginBottom:16 }}>Klik untuk muat data corporate action IDX</p>
                  <Btn onClick={loadCorpActions}>Muat Data Corporate Action</Btn>
                </div>
              )}
              {corpLoading&&<div style={{ textAlign:"center",padding:"30px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:10 }}><Spinner size={24}/><span style={{ color:T.t2,fontSize:12 }}>Mengambil data dari IDX...</span></div>}

              {/* List below calendar — Upcoming */}
              {corpLoaded && upcomingCA.length>0 && (
                <div style={{ padding:"0 16px 4px" }}>
                  <div style={{ fontSize:11,fontWeight:800,color:T.t3,letterSpacing:1,marginBottom:10 }}>AKAN DATANG ({upcomingCA.length})</div>
                  {[...upcomingCA].sort((a,b)=>a.recordDate.localeCompare(b.recordDate)).map((item,i)=>{
                    const ts=typeStyle[item.type]||{col:T.t2,bg:T.bg2,bdr:T.bdr,icon:"📄"}
                    const owned=myPCodes.includes(item.code)
                    const isNear=item.recordDate<=new Date(Date.now()+7*86400000).toISOString().slice(0,10)
                    return (
                      <div key={i} className="fu" style={{ background:T.bg1,border:`1px solid ${owned?T.em+"60":T.bdr2}`,borderRadius:14,padding:"12px 14px",marginBottom:8,animationDelay:`${i*0.03}s` }}>
                        {isNear&&<span style={{ fontSize:9,fontWeight:800,color:T.amber,background:T.aBg,border:`1px solid ${T.aBdr}`,borderRadius:6,padding:"2px 8px",marginBottom:6,display:"inline-block" }}>⏰ Dalam 7 hari</span>}
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:item.desc?6:0 }}>
                          <div style={{ display:"flex",gap:9,alignItems:"center" }}>
                            <span style={{ width:32,height:32,background:T.bg2,border:`1px solid ${T.bdr}`,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900,color:T.t1,flexShrink:0 }}>{item.code.slice(0,2)}</span>
                            <div><div style={{ fontSize:13,fontWeight:900,color:T.t1 }}>{item.code}{owned&&<span style={{ color:T.green,fontSize:10 }}> ★</span>}</div><div style={{ fontSize:10,color:T.t3 }}>{item.recordDate}</div></div>
                          </div>
                          <div style={{ background:ts.bg,border:`1px solid ${ts.bdr}`,borderRadius:8,padding:"3px 8px",display:"flex",alignItems:"center",gap:3 }}>
                            <span>{ts.icon}</span><span style={{ fontSize:9,fontWeight:800,color:ts.col }}>{item.type}</span>
                          </div>
                        </div>
                        {item.desc&&<div style={{ fontSize:11,color:ts.col,fontWeight:700,paddingLeft:41 }}>{item.desc}</div>}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Past events */}
              {corpLoaded && pastCA.length>0 && (
                <div style={{ padding:"4px 16px 4px" }}>
                  <div style={{ fontSize:11,fontWeight:800,color:T.t3,letterSpacing:1,marginBottom:10,marginTop:4 }}>SUDAH LEWAT ({pastCA.length})</div>
                  {[...pastCA].sort((a,b)=>b.recordDate.localeCompare(a.recordDate)).map((item,i)=>{
                    const ts=typeStyle[item.type]||{col:T.t2,bg:T.bg2,bdr:T.bdr,icon:"📄"}
                    const owned=myPCodes.includes(item.code)
                    return (
                      <div key={i} style={{ background:T.bg1,border:`1px solid ${T.bdr}`,borderRadius:14,padding:"10px 14px",marginBottom:7,opacity:0.65 }}>
                        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:item.desc?5:0 }}>
                          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                            <span style={{ width:28,height:28,background:T.bg2,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:900,color:T.t3,flexShrink:0 }}>{item.code.slice(0,2)}</span>
                            <div><div style={{ fontSize:12,fontWeight:800,color:T.t2 }}>{item.code}{owned&&<span style={{ color:T.green,fontSize:9 }}> ★</span>}</div><div style={{ fontSize:10,color:T.t3 }}>{item.recordDate} ✓</div></div>
                          </div>
                          <span style={{ fontSize:9,fontWeight:700,color:T.t3,background:T.bg2,borderRadius:6,padding:"2px 7px" }}>{item.type}</span>
                        </div>
                        {item.desc&&<div style={{ fontSize:10,color:T.t3,paddingLeft:36 }}>{item.desc}</div>}
                      </div>
                    )
                  })}
                </div>
              )}

              {corpLoaded && filteredCA.length===0 && (
                <div style={{ textAlign:"center",padding:"30px 20px",color:T.t3,fontSize:13 }}>Tidak ada data sesuai filter</div>
              )}
            </div>
          )
        })()}


        {/* ══ SUBSCRIPTION MODAL ══ */}
        <Modal open={showSubModal} onClose={()=>setShowSubModal(false)} title="InvestGuard Premium" subtitle="Akses penuh semua fitur trading">
          {subStatus==="expired" && (
            <div style={{ background:T.rBg,border:`1px solid ${T.rBdr}`,borderRadius:14,padding:16,marginBottom:20,textAlign:"center" }}>
              <Lock size={24} color={T.red} style={{ margin:"0 auto 8px" }}/>
              <div style={{ fontSize:14,fontWeight:800,color:T.red }}>Trial 30 Hari Sudah Berakhir</div>
              <div style={{ fontSize:12,color:T.red,marginTop:4 }}>Pilih paket untuk lanjutkan akses</div>
            </div>
          )}
          {subStatus==="trial" && (
            <div style={{ background:T.aBg,border:`1px solid ${T.aBdr}`,borderRadius:14,padding:14,marginBottom:20,display:"flex",gap:10,alignItems:"center" }}>
              <Crown size={18} color={T.amber}/>
              <div><div style={{ fontSize:13,fontWeight:800,color:T.amber }}>Trial Aktif — {trialDaysLeft} hari tersisa</div><div style={{ fontSize:11,color:T.amber }}>Berlangganan sekarang & hemat lebih banyak</div></div>
            </div>
          )}
          {/* Plan toggle */}
          <div style={{ display:"flex",gap:8,background:T.bg0,padding:5,borderRadius:14,marginBottom:20 }}>
            {[["monthly","Bulanan"],["yearly","Tahunan"]].map(([v,l])=>(
              <button key={v} onClick={()=>setSubPlan(v)} style={{ flex:1,padding:"10px",borderRadius:10,background:subPlan===v?T.em:"transparent",color:subPlan===v?T.bg0:T.t3,border:"none",fontWeight:800,fontSize:13,cursor:"pointer",transition:".2s" }}>{l}{v==="yearly"&&<span style={{ fontSize:9,marginLeft:4 }}>HEMAT 30%</span>}</button>
            ))}
          </div>
          {/* Pricing */}
          <div style={{ background:isDark?`linear-gradient(135deg,#0A1929,${T.bg2})`:`linear-gradient(135deg,${T.bg3},${T.bg2})`,border:`1px solid ${T.lBdr}`,borderRadius:18,padding:20,marginBottom:20,textAlign:"center" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:6 }}><Crown size={20} color={T.blue}/><span style={{ fontSize:16,fontWeight:900,color:T.blue }}>InvestGuard {subPlan==="yearly"?"Tahunan":"Bulanan"}</span></div>
            <div style={{ fontSize:36,fontWeight:900,color:T.t1 }}>{subPlan==="yearly"?"Rp 139.000":"Rp 199.000"}<span style={{ fontSize:14,color:T.t3,fontWeight:600 }}>/{subPlan==="yearly"?"bln":"bln"}</span></div>
            {subPlan==="yearly"&&<div style={{ fontSize:11,color:T.t3,marginTop:4 }}>Ditagih Rp 1.668.000/tahun · Hemat Rp 720.000</div>}
          </div>
          {/* Features */}
          <div style={{ marginBottom:20 }}>
            {["✓ Screener semua 900+ saham IDX","✓ Push notification SL/TP/Avg real-time","✓ Kalender corporate action lengkap","✓ Money management otomatis","✓ Wealth forecast & tracking","✓ Export jurnal ke CSV","✓ Unlimited posisi portofolio"].map(f=>(
              <div key={f} style={{ padding:"8px 0",borderBottom:`1px solid ${T.bdr}`,fontSize:13,color:T.t2,fontWeight:600 }}>{f}</div>
            ))}
          </div>
          {/* Payment methods */}
          <div style={{ fontSize:11,fontWeight:800,color:T.t3,marginBottom:12,letterSpacing:1 }}>METODE PEMBAYARAN</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20 }}>
            {[["QRIS","Scan & bayar instan","📱"],["Virtual Account","BCA / BRI / Mandiri / BNI","🏦"]].map(([n,d,ico])=>(
              <div key={n} style={{ background:T.bg2,border:`1px solid ${T.bdr2}`,borderRadius:14,padding:"14px 12px",textAlign:"center",cursor:"pointer" }}>
                <div style={{ fontSize:24,marginBottom:6 }}>{ico}</div>
                <div style={{ fontSize:12,fontWeight:800,color:T.t1 }}>{n}</div>
                <div style={{ fontSize:10,color:T.t3 }}>{d}</div>
              </div>
            ))}
          </div>
          <Btn full onClick={()=>{ notify("Fitur pembayaran segera hadir! Hubungi admin untuk akses early bird.","blue"); setShowSubModal(false) }} style={{ padding:16,fontSize:15 }}>
            <Crown size={16}/> Berlangganan Sekarang
          </Btn>
          <p style={{ fontSize:11,color:T.t3,textAlign:"center",marginTop:12 }}>Garansi uang kembali 7 hari · Batalkan kapan saja</p>
        </Modal>

        <BottomNav tab={tab} setTab={setTab}/>

        {/* ══ TAB BANDAR ══ */}
        {tab==="bandar" && (() => {
          const volSpikes    = getVolumeSpikeList()
          const catalysts    = getCatalystAlerts()
          const T2           = T  // alias

          // ── Scoring helper ──────────────────────────────────
          const getBandarScore = (item) => {
            let score = 0
            if (item.ratio >= 5)  score += 40
            else if (item.ratio >= 3) score += 25
            else if (item.ratio >= 2) score += 15
            const chg = item.chgPct || 0
            if (chg > 0 && chg < 3) score += 20  // naik tapi belum terlalu spike (akumulasi)
            if (item.inPorto) score += 10
            if (catalysts.some(c => c.code === item.code)) score += 30
            return Math.min(score, 100)
          }

          const Card = ({ children, style={} }) => (
            <div style={{ background:T.bg1, border:`1px solid ${T.bdr2}`, borderRadius:18, padding:18, marginBottom:14, ...style }}>
              {children}
            </div>
          )
          const SectionLabel = ({ children, color=T.em }) => (
            <div style={{ fontSize:10, fontWeight:800, color, letterSpacing:"1.5px", marginBottom:10, fontFamily:"monospace" }}>
              {children}
            </div>
          )
          const Badge = ({ children, color, bg }) => (
            <span style={{ fontSize:9, fontWeight:800, padding:"3px 8px", borderRadius:999, background:bg, color, letterSpacing:"0.5px", fontFamily:"monospace" }}>
              {children}
            </span>
          )

          return (
            <div style={{ maxWidth:480, margin:"0 auto", padding:"16px 16px 120px" }}>

              {/* ── Header ── */}
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                <div style={{ width:44, height:44, borderRadius:14, background:T.emBg, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Eye size={22} color={T.em}/>
                </div>
                <div>
                  <div style={{ fontSize:22, fontWeight:900, color:T.t1 }}>Radar Bandar</div>
                  <div style={{ fontSize:12, color:T.t3 }}>Volume Spike · Net Foreign · Catalyst Alert</div>
                </div>
                <button onClick={fetchNetForeign} disabled={bandarLoading}
                  style={{ marginLeft:"auto", background:T.bg2, border:`1px solid ${T.bdr2}`, borderRadius:10, padding:"8px 12px", cursor:"pointer", color:T.t2, fontSize:12, display:"flex", alignItems:"center", gap:6 }}>
                  <RefreshCw size={13} color={T.t2} style={{ animation: bandarLoading ? "spin 1s linear infinite" : "none" }}/>
                  {bandarLastFetch ? bandarLastFetch : "Sync"}
                </button>
              </div>

              {/* ── Net Foreign Meter ── */}
              <Card>
                <SectionLabel>🌍 NET FOREIGN HARI INI</SectionLabel>
                {bandarLoading ? (
                  <div style={{ textAlign:"center", padding:"20px 0", color:T.t3, fontSize:13 }}>Memuat data IDX...</div>
                ) : bandarNetForeign?.fallback || bandarNetForeign?.netVal === null ? (
                  <div>
                    <div style={{ fontSize:13, color:T.amber, marginBottom:8 }}>⚠ Data IDX tidak bisa diakses langsung dari browser</div>
                    <div style={{ fontSize:12, color:T.t3, lineHeight:1.6 }}>
                      Cek net foreign di: <strong style={{ color:T.em }}>RTI Business</strong> → Market Data → Foreign Flow<br/>
                      atau <strong style={{ color:T.em }}>Stockbit</strong> → Market → Asing Beli/Jual
                    </div>
                    {/* Estimate from liveCache */}
                    {(() => {
                      const total = Object.values(liveCache).length
                      const down  = Object.values(liveCache).filter(s => (s.chgPct || 0) < -1).length
                      const pctDown = total > 0 ? Math.round((down/total)*100) : 0
                      const sentiment = pctDown > 60 ? "JUAL ASING" : pctDown < 30 ? "BELI ASING" : "NETRAL"
                      const sentColor = pctDown > 60 ? T.red : pctDown < 30 ? T.green : T.amber
                      return (
                        <div style={{ background:T.bg2, borderRadius:12, padding:12, marginTop:12 }}>
                          <div style={{ fontSize:10, fontWeight:800, color:T.t3, marginBottom:6, fontFamily:"monospace" }}>ESTIMASI DARI {total} SAHAM LIVE</div>
                          <div style={{ fontSize:22, fontWeight:900, color:sentColor }}>{sentiment}</div>
                          <div style={{ fontSize:12, color:T.t3 }}>{pctDown}% saham turun &gt;1% hari ini</div>
                        </div>
                      )
                    })()}
                  </div>
                ) : bandarNetForeign ? (
                  <div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                      {[
                        { label:"NET BELI ASING", val:bandarNetForeign.netBuy, color:T.green },
                        { label:"NET JUAL ASING", val:bandarNetForeign.netSell, color:T.red },
                        { label:"NET TOTAL",       val:bandarNetForeign.netVal, color: (bandarNetForeign.netVal||0)>=0?T.green:T.red },
                      ].map(({ label, val, color }) => (
                        <div key={label} style={{ background:T.bg2, borderRadius:12, padding:"10px 12px" }}>
                          <div style={{ fontSize:9, fontWeight:800, color:T.t3, marginBottom:4, fontFamily:"monospace" }}>{label}</div>
                          <div style={{ fontSize:13, fontWeight:800, color }}>
                            {val != null ? (val >= 0 ? "+" : "") + (val/1e9).toFixed(1) + "T" : "—"}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:10, color:T.t3, marginTop:8 }}>Data: {bandarNetForeign.date} · Sumber IDX</div>
                  </div>
                ) : (
                  <div style={{ textAlign:"center", padding:"16px 0", color:T.t3, fontSize:13 }}>
                    Tap Sync untuk memuat data net foreign IDX
                  </div>
                )}
              </Card>

              {/* ── Catalyst Alert (Porto × Event) ── */}
              {catalysts.length > 0 && (
                <Card style={{ borderLeft:`3px solid ${T.amber}` }}>
                  <SectionLabel color={T.amber}>⚡ CATALYST ALERT — PORTO KAMU</SectionLabel>
                  {catalysts.map((ev, i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom: i < catalysts.length-1 ? `1px solid ${T.bdr}` : "none" }}>
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                          <span style={{ fontSize:15, fontWeight:800, color:T.em, fontFamily:"monospace" }}>{ev.code}</span>
                          <Badge color={T.amber} bg={T.aBg}>{ev.event || ev.type || "EVENT"}</Badge>
                        </div>
                        <div style={{ fontSize:12, color:T.t3 }}>{ev.date}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:16, fontWeight:900, color: ev.daysLeft <= 7 ? T.red : T.amber }}>H-{ev.daysLeft}</div>
                        <div style={{ fontSize:10, color:T.t3 }}>hari lagi</div>
                      </div>
                    </div>
                  ))}
                </Card>
              )}

              {/* ── Unusual Volume Scanner ── */}
              <Card>
                <SectionLabel>🔥 UNUSUAL VOLUME SCANNER (≥2× rata-rata)</SectionLabel>
                {volSpikes.length === 0 ? (
                  <div style={{ textAlign:"center", padding:"20px 0", color:T.t3, fontSize:13 }}>
                    Belum ada saham dengan volume spike terdeteksi.<br/>
                    <span style={{ fontSize:12 }}>Data diambil dari {Object.keys(liveCache).length} saham live.</span>
                  </div>
                ) : volSpikes.map((item, i) => {
                  const score    = getBandarScore(item)
                  const chgColor = item.chgPct >= 0 ? T.green : T.red
                  const isHot    = item.ratio >= 5
                  const isMed    = item.ratio >= 3
                  return (
                    <div key={item.code} style={{
                      background: isHot ? T.rBg : isMed ? T.aBg : T.bg2,
                      border:`1px solid ${isHot ? T.rBdr : isMed ? T.aBdr : T.bdr2}`,
                      borderLeft:`3px solid ${isHot ? T.red : isMed ? T.amber : T.green}`,
                      borderRadius:14, padding:"12px 14px", marginBottom:10,
                    }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                        <div>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                            <span style={{ fontSize:16, fontWeight:900, color:T.t1, fontFamily:"monospace" }}>{item.code}</span>
                            {item.inPorto && <Badge color={T.em} bg={T.emBg}>PORTO</Badge>}
                            {catalysts.some(c => c.code === item.code) && <Badge color={T.amber} bg={T.aBg}>CATALYST</Badge>}
                            {isHot && <Badge color={T.red} bg={T.rBg}>🔥 HOT</Badge>}
                          </div>
                          <div style={{ display:"flex", gap:16, fontSize:12, color:T.t3 }}>
                            <span>Rp {item.price?.toLocaleString("id-ID")}</span>
                            <span style={{ color:chgColor, fontWeight:700 }}>{item.chgPct >= 0 ? "+" : ""}{item.chgPct?.toFixed(2)}%</span>
                          </div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:20, fontWeight:900, color:isHot?T.red:isMed?T.amber:T.green }}>{item.ratio}×</div>
                          <div style={{ fontSize:10, color:T.t3 }}>volume rata-rata</div>
                        </div>
                      </div>
                      {/* Volume bar */}
                      <div style={{ marginTop:10 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:T.t3, marginBottom:4 }}>
                          <span>Vol hari ini: {(item.volToday/1000).toFixed(0)}K</span>
                          <span>Avg 10 hari: {(item.volAvg/1000).toFixed(0)}K</span>
                        </div>
                        <div style={{ background:T.bg3, borderRadius:99, height:5, overflow:"hidden" }}>
                          <div style={{ width:`${Math.min((item.ratio/10)*100, 100)}%`, height:"100%", borderRadius:99, background: isHot?T.red:isMed?T.amber:T.green, transition:"width .6s" }}/>
                        </div>
                      </div>
                      {/* Skor Bandar */}
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:10 }}>
                        <div style={{ fontSize:11, color:T.t3 }}>Skor Bandar</div>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ background:T.bg3, borderRadius:99, height:4, width:80, overflow:"hidden" }}>
                            <div style={{ width:`${score}%`, height:"100%", background: score>=70?T.red:score>=40?T.amber:T.green, borderRadius:99 }}/>
                          </div>
                          <span style={{ fontSize:12, fontWeight:800, color: score>=70?T.red:score>=40?T.amber:T.green }}>{score}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </Card>

              {/* ── Broker Summary per Saham ── */}
              <Card>
                <SectionLabel>🏦 BROKER SUMMARY PER SAHAM</SectionLabel>
                <div style={{ fontSize:12, color:T.t3, marginBottom:12, lineHeight:1.6 }}>
                  Lihat siapa yang beli/jual suatu saham hari ini. Pilih saham dari porto atau ketik kode:
                </div>
                <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
                  {portfolio.slice(0,5).map(p => (
                    <button key={p.stock_code} onClick={() => fetchBrokerSummary(p.stock_code)}
                      style={{ padding:"6px 12px", borderRadius:10, border:`1px solid ${T.bdr2}`, background:T.bg2, color:T.em, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"monospace" }}>
                      {p.stock_code}
                    </button>
                  ))}
                  {['BBRI','BBCA','TLKM','ANTM','GOTO'].filter(c => !portfolio.map(p=>p.stock_code).includes(c)).slice(0,3).map(c => (
                    <button key={c} onClick={() => fetchBrokerSummary(c)}
                      style={{ padding:"6px 12px", borderRadius:10, border:`1px solid ${T.bdr2}`, background:T.bg2, color:T.t2, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"monospace" }}>
                      {c}
                    </button>
                  ))}
                </div>
                {brokerLoading ? (
                  <div style={{ textAlign:"center", padding:16, color:T.t3, fontSize:13 }}>Memuat broker summary...</div>
                ) : brokerSummary.length > 0 ? (
                  <div>
                    {/* Key brokers: tier 1 asing */}
                    <div style={{ fontSize:10, fontWeight:800, color:T.green, marginBottom:8, fontFamily:"monospace" }}>BROKER ASING INSTITUSI</div>
                    {brokerSummary.filter(b => b.tier === 1).map(b => (
                      <div key={b.code} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 12px", background:T.bg2, borderRadius:12, marginBottom:6, borderLeft:`3px solid ${b.net >= 0 ? T.green : T.red}` }}>
                        <div>
                          <span style={{ fontFamily:"monospace", fontWeight:800, fontSize:14, color:T.t1 }}>{b.code}</span>
                          <span style={{ fontSize:11, color:T.t3, marginLeft:8 }}>{b.name}</span>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:14, fontWeight:900, color:b.net >= 0 ? T.green : T.red }}>
                            {b.net >= 0 ? "+" : ""}{(b.net/1e9).toFixed(2)}T
                          </div>
                          <div style={{ fontSize:10, color:T.t3 }}>{b.net >= 0 ? "NET BUY" : "NET SELL"}</div>
                        </div>
                      </div>
                    ))}
                    {brokerSummary.filter(b => b.tier === 2).length > 0 && <>
                      <div style={{ fontSize:10, fontWeight:800, color:T.amber, margin:"10px 0 8px", fontFamily:"monospace" }}>BROKER LAIN</div>
                      {brokerSummary.filter(b => b.tier === 2 || b.tier === 3).map(b => (
                        <div key={b.code} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:T.bg2, borderRadius:10, marginBottom:5, borderLeft:`3px solid ${b.net >= 0 ? T.green : T.red}`, opacity: b.tier===3 ? 0.7 : 1 }}>
                          <div>
                            <span style={{ fontFamily:"monospace", fontWeight:700, fontSize:13, color:T.t1 }}>{b.code}</span>
                            <span style={{ fontSize:11, color:T.t3, marginLeft:8 }}>{b.name}</span>
                            {b.tier === 3 && <span style={{ fontSize:9, color:T.red, marginLeft:6, fontFamily:"monospace" }}>RETAIL</span>}
                          </div>
                          <div style={{ fontSize:13, fontWeight:800, color:b.net >= 0 ? T.green : T.red }}>
                            {b.net >= 0 ? "+" : ""}{(b.net/1e9).toFixed(2)}T
                          </div>
                        </div>
                      ))}
                    </>}
                    {/* If only fallback/error message */}
                    {brokerSummary.length === 1 && brokerSummary[0].tier === 0 && (
                      <div style={{ background:T.aBg, border:`1px solid ${T.aBdr}`, borderRadius:12, padding:12 }}>
                        <div style={{ fontSize:12, color:T.amber, lineHeight:1.6 }}>⚠ {brokerSummary[0].name}</div>
                        <div style={{ fontSize:11, color:T.t3, marginTop:8 }}>
                          Alternatif: Buka <strong style={{ color:T.em }}>RTI Business</strong> → Broker Summary → Ketik kode saham
                        </div>
                      </div>
                    )}
                    {/* Interpretasi sinyal */}
                    {brokerSummary.filter(b => b.tier === 1 && b.net > 0).length >= 2 && (
                      <div style={{ background:T.gBg, border:`1px solid ${T.gBdr}`, borderRadius:12, padding:12, marginTop:10 }}>
                        <div style={{ fontSize:12, fontWeight:800, color:T.green, marginBottom:4 }}>✅ SINYAL AKUMULASI INSTITUSI</div>
                        <div style={{ fontSize:12, color:T.t2 }}>
                          {brokerSummary.filter(b=>b.tier===1&&b.net>0).map(b=>b.code).join(" + ")} net buy bersama → kemungkinan ada akumulasi institusi asing.
                        </div>
                      </div>
                    )}
                    {brokerSummary.filter(b => b.tier === 3 && b.net > 0).length >= 1 &&
                     brokerSummary.filter(b => b.tier === 1 && b.net < 0).length >= 1 && (
                      <div style={{ background:T.rBg, border:`1px solid ${T.rBdr}`, borderRadius:12, padding:12, marginTop:10 }}>
                        <div style={{ fontSize:12, fontWeight:800, color:T.red, marginBottom:4 }}>⚠ SINYAL DISTRIBUSI</div>
                        <div style={{ fontSize:12, color:T.t2 }}>
                          Asing net sell + retail ({brokerSummary.filter(b=>b.tier===3&&b.net>0).map(b=>b.code).join(", ")}) net buy → bandar kemungkinan distribusi ke retail.
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign:"center", padding:"16px 0", color:T.t3, fontSize:13 }}>
                    Pilih kode saham di atas untuk melihat broker summary
                  </div>
                )}
              </Card>

              {/* ── Panduan Singkat ── */}
              <Card style={{ borderTop:`3px solid ${T.em}` }}>
                <SectionLabel>📖 CARA BACA SINYAL BANDAR</SectionLabel>
                {[
                  { icon:"🟢", title:"Volume ≥5× + AK/ZP net buy", desc:"Sinyal akumulasi terkuat. Institusi global masuk." },
                  { icon:"🟡", title:"Volume ≥2× tanpa berita", desc:"Monitor 2–3 hari. Bisa jadi awal akumulasi." },
                  { icon:"🔴", title:"Asing net sell + retail ramai beli", desc:"Kemungkinan distribusi. Hindari entry baru." },
                  { icon:"⚡", title:"Catalyst H-14 di saham porto", desc:"Pertimbangkan averaging up sebelum event." },
                ].map(({ icon, title, desc }) => (
                  <div key={title} style={{ display:"flex", gap:12, padding:"10px 0", borderBottom:`1px solid ${T.bdr}` }}>
                    <span style={{ fontSize:20, flexShrink:0 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize:13, fontWeight:800, color:T.t1, marginBottom:3 }}>{title}</div>
                      <div style={{ fontSize:12, color:T.t3 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </Card>

            </div>
          )
        })()}

        {/* ══ STRATEGI & SIMULASI ══ */}
        {tab==="strategi" && (() => {
          const capital = profile?.capital || 0
          const isSmallCap = capital < 1_000_000
          const targetReturn = isSmallCap ? 50 : 30  // % per tahun
          const winRate      = isSmallCap ? 58 : 64  // % win rate
          const riskReward   = isSmallCap ? "1:2.5" : "1:2"
          const maxAlloc     = isSmallCap ? 20 : 15   // % per posisi
          const maxLoss      = isSmallCap ? 8  : 6    // % cut loss
          const maxPos       = isSmallCap ? 5  : 8    // max posisi bersamaan

          // ── Market Condition Assessment ──
          const liveStocks   = Object.values(liveCache)
          const avgChg       = liveStocks.length > 0
            ? liveStocks.reduce((s,x)=>s+(x.chgPct||0),0)/liveStocks.length : 0
          const redCount     = liveStocks.filter(x=>(x.chgPct||0)<-1).length
          const totalCount   = liveStocks.length || 1
          const bearishPct   = Math.round((redCount/totalCount)*100)
          const marketScore  = avgChg > 0.5 ? "BULLISH" : avgChg < -0.5 ? "BEARISH" : "SIDEWAYS"
          const dangerLevel  = bearishPct > 70 ? 90 : bearishPct > 50 ? 60 : bearishPct > 30 ? 30 : 10
          const suggestExit  = dangerLevel >= 70

          // ── 20-Year Simulation ──
          const simulate20yr = (initCap, annualRet, years=20) => {
            const rows = []
            let bal = initCap
            for (let y=1; y<=years; y++) {
              const prev = bal
              // Volatility: bervariasi ±10% dari target return tiap tahun
              const variance  = (Math.sin(y * 3.7 + initCap % 7) * 0.10)
              const actualRet = annualRet/100 + variance
              const profit    = bal * actualRet
              bal             = bal + profit
              rows.push({ y, bal, profit, ret: (actualRet*100).toFixed(1), prev })
            }
            return rows
          }
          const simRows = simulate20yr(Math.max(capital, 1_000_000), targetReturn)
          const finalBal = simRows[simRows.length-1]?.bal || 0
          const totalProfit = finalBal - Math.max(capital, 1_000_000)
          const multiplier = (finalBal / Math.max(capital, 1_000_000)).toFixed(1)

          // Strategies based on capital
          const strategies = isSmallCap ? [
            {
              name:"Momentum Breakout",
              desc:"Beli saham yang breakout dari resistance dengan volume ≥2× rata-rata. Target saham LQ45 atau IDX80 yang liquid.",
              winrate:62, rr:"1:2.5", alloc:20, sl:8, tp1:20, tp2:35,
              timeframe:"Swing 5–15 hari", sector:"Perbankan, Consumer, Telco",
              entry:"Harga close di atas MA20 + volume spike", exit:"SL -8% atau TP1/TP2",
            },
            {
              name:"Value Accumulation",
              desc:"Beli saham fundamental kuat (PE<12, PBV<1.5, ROE>15%) saat harga turun 15–25% dari high tanpa perubahan fundamental.",
              winrate:71, rr:"1:3", alloc:15, sl:7, tp1:25, tp2:50,
              timeframe:"Posisi 1–6 bulan", sector:"BUMN, Perbankan Blue Chip",
              entry:"Di zona demand + RSI <40", exit:"SL atau target valuasi wajar",
            },
            {
              name:"Dividen + Growth",
              desc:"Fokus saham dividen yield >5% sambil tunggu capital gain. Cocok untuk bangun portofolio bertahap.",
              winrate:68, rr:"1:2", alloc:20, sl:10, tp1:15, tp2:30,
              timeframe:"Hold 6–12 bulan", sector:"BUMN, Infrastruktur, Perkebunan",
              entry:"Sebelum cum-date dividen atau saat koreksi", exit:"Setelah ex-date atau TP",
            },
          ] : [
            {
              name:"Institutional Following",
              desc:"Track transaksi asing (net buy) di saham blue chip. Masuk saat asing mulai akumulasi 3 hari berturut-turut.",
              winrate:66, rr:"1:2", alloc:15, sl:6, tp1:15, tp2:25,
              timeframe:"Swing 2–4 minggu", sector:"Perbankan, Telco, Komoditas",
              entry:"Net buy asing positif + price di atas MA50", exit:"Saat asing mulai net sell",
            },
            {
              name:"Sector Rotation",
              desc:"Rotasi ke sektor yang sedang in-favor berdasarkan siklus ekonomi. Alokasi per sektor max 30% total portofolio.",
              winrate:64, rr:"1:2.2", alloc:12, sl:6, tp1:18, tp2:28,
              timeframe:"Posisi 1–3 bulan", sector:"Bergantian: Komoditas→Keuangan→Consumer",
              entry:"Sektor mulai outperform IHSG 2 minggu", exit:"Saat sektor underperform",
            },
            {
              name:"Dividend Portfolio",
              desc:"Bangun portofolio dividen 8–10 saham terdiversifikasi dengan yield 5–8%. Reinvest dividen untuk compounding.",
              winrate:74, rr:"1:1.8", alloc:10, sl:8, tp1:20, tp2:40,
              timeframe:"Hold 1–3 tahun", sector:"Multi-sektor, min 4 sektor berbeda",
              entry:"Averaging saat koreksi pasar >10%", exit:"Perubahan fundamental negatif",
            },
            {
              name:"GARP (Growth at Reasonable Price)",
              desc:"Saham dengan EPS growth >20% YoY tapi PE masih wajar (<20x). Sweet spot antara value dan growth.",
              winrate:61, rr:"1:2.5", alloc:12, sl:7, tp1:25, tp2:45,
              timeframe:"Posisi 3–6 bulan", sector:"Teknologi, Konsumer, Healthcare",
              entry:"Setelah earning beat atau guidance naik", exit:"PE mulai mahal atau growth melambat",
            },
          ]

          // Money Management Rules
          const mmRules = [
            { label:"Maks 1 Posisi", value: maxAlloc+"% equity", desc:"Jangan taruh semua telur dalam 1 keranjang" },
            { label:"Maks Posisi Aktif", value: maxPos+" saham", desc:"Fokus, terlalu banyak susah dipantau" },
            { label:"Cut Loss Otomatis", value: "-"+maxLoss+"%", desc:"Tidak ada negosiasi, disiplin absolut" },
            { label:"Risk per Trade", value: (maxAlloc*maxLoss/100).toFixed(1)+"% kapital", desc:"Total risiko per transaksi dari total modal" },
            { label:"Max Drawdown", value: isSmallCap?"25%":"18%", desc:"Jika portfolio turun segini, STOP trading sebulan" },
            { label:"Cash Reserve", value: isSmallCap?"20%":"25%", desc:"Selalu ada amunisi untuk peluang terbaik" },
          ]

          const mktColor = marketScore==="BULLISH" ? T.green : marketScore==="BEARISH" ? T.red : T.amber
          const mktBg    = marketScore==="BULLISH" ? T.gBg    : marketScore==="BEARISH" ? T.rBg    : T.aBg
          const mktBdr   = marketScore==="BULLISH" ? T.gBdr   : marketScore==="BEARISH" ? T.rBdr   : T.aBdr

          return (
          <div className="fu" style={{ padding:"56px 20px 100px" }}>

            {/* ── HEADER ── */}
            <div style={{ marginBottom:24 }}>
              <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:6 }}>
                <Lightbulb size={22} color={T.em}/>
                <h2 style={{ fontSize:26,fontWeight:900,color:T.t1 }}>Strategi & Simulasi</h2>
              </div>
              <p style={{ fontSize:13,color:T.t2 }}>
                {isSmallCap ? "Modal <1M: Agresif terkontrol, target 50%/tahun." : "Modal ≥1M: Konservatif stabil, target 30%/tahun."}
              </p>
            </div>

            {/* ── MARKET CONDITION ALERT ── */}
            <div style={{ background:mktBg, border:`1px solid ${mktBdr}`, borderRadius:20, padding:20, marginBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:10,fontWeight:800,color:mktColor,marginBottom:4,letterSpacing:"0.5px" }}>KONDISI PASAR SAAT INI</div>
                  <div style={{ fontSize:22,fontWeight:900,color:mktColor }}>{marketScore}</div>
                  <div style={{ fontSize:12,color:T.t2,marginTop:2 }}>
                    {liveStocks.length > 0
                      ? `${redCount} dari ${totalCount} saham di pantauan turun >1%`
                      : "Data pasar belum dimuat — buka Screener dulu"}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:10,fontWeight:800,color:T.t3,marginBottom:4 }}>RISIKO LOSS</div>
                  <div style={{ fontSize:28,fontWeight:900,color:dangerLevel>=70?T.red:dangerLevel>=40?T.amber:T.green }}>
                    {dangerLevel}%
                  </div>
                </div>
              </div>
              {/* Risk bar */}
              <div style={{ height:6,background:T.bg0,borderRadius:99,marginBottom:12,overflow:"hidden" }}>
                <div style={{ height:"100%", width:dangerLevel+"%",
                  background:`linear-gradient(90deg,${T.green},${dangerLevel>60?T.red:dangerLevel>30?T.amber:T.green})`,
                  borderRadius:99, transition:"width 0.8s" }}/>
              </div>
              {/* Suggestion */}
              {suggestExit ? (
                <div style={{ background:T.rBg,border:`1px solid ${T.rBdr}`,borderRadius:14,padding:"14px 16px" }}>
                  <div style={{ fontSize:13,fontWeight:900,color:T.red,marginBottom:6 }}>⛔ REKOMENDASI: PINDAH KE PASAR UANG</div>
                  <div style={{ fontSize:12,color:T.red,lineHeight:1.65,marginBottom:10 }}>
                    Probabilitas loss mencapai <strong>{dangerLevel}%</strong>. Pasar sedang dalam tekanan berat.
                    Disarankan <strong>cash out 70–100%</strong> posisi dan alihkan ke instrumen lebih aman:
                  </div>
                  {[
                    { name:"Reksa Dana Pasar Uang", yield:"5–6%/tahun", risk:"Sangat Rendah", ex:"RDPU BCA, Manulife Dana Kas" },
                    { name:"Obligasi Negara (SBN/ORI)", yield:"6–7%/tahun", risk:"Rendah", ex:"ORI024, SR021 via bank/pialang" },
                    { name:"Deposito Bank", yield:"4–5.5%/tahun", risk:"Nol (LPS)", ex:"Deposito BRI, BCA, Mandiri" },
                    { name:"Reksa Dana Pendapatan Tetap", yield:"6–8%/tahun", risk:"Rendah", ex:"Schroder Dana Mantap, Manulife" },
                  ].map(alt => (
                    <div key={alt.name} style={{ background:T.bg1,borderRadius:10,padding:"10px 12px",marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                      <div>
                        <div style={{ fontSize:12,fontWeight:800,color:T.t1 }}>{alt.name}</div>
                        <div style={{ fontSize:10,color:T.t3,marginTop:2 }}>{alt.ex}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:12,fontWeight:900,color:T.green }}>{alt.yield}</div>
                        <div style={{ fontSize:9,color:T.t3 }}>Risk: {alt.risk}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize:12,color:mktColor,fontWeight:700 }}>
                  {marketScore==="BULLISH" ? "✅ Kondisi kondusif. Strategi aktif bisa dijalankan penuh." :
                   marketScore==="SIDEWAYS" ? "⚠ Pasar konsolidasi. Selektif, tunggu breakout konfirmasi." :
                   "🔴 Hati-hati. Kurangi exposure, prioritaskan capital preservation."}
                </div>
              )}
            </div>

            {/* ── 20-YEAR SIMULATION ── */}
            <div style={{ background:T.bg1,border:`1px solid ${T.bdr2}`,borderRadius:20,padding:20,marginBottom:20 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:4 }}>
                <TrendingUp size={18} color={T.blue}/>
                <div style={{ fontSize:15,fontWeight:900,color:T.t1 }}>Simulasi 20 Tahun</div>
              </div>
              <div style={{ fontSize:12,color:T.t2,marginBottom:16 }}>
                Modal {formatRupiahCompact(Math.max(capital,1_000_000))} × return {targetReturn}%/tahun (dengan variasi pasar wajar)
              </div>

              {/* Summary */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16 }}>
                {[
                  ["Nilai Akhir", formatRupiahCompact(finalBal), T.green],
                  ["Total Profit", formatRupiahCompact(totalProfit), T.blue],
                  ["Multiplier", multiplier+"×", T.em],
                ].map(([l,v,c])=>(
                  <div key={l} style={{ background:T.bg2,borderRadius:12,padding:"10px 12px",textAlign:"center" }}>
                    <div style={{ fontSize:9,color:T.t3,fontWeight:700,marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:13,fontWeight:900,color:c }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Win rate & stats */}
              <div style={{ background:T.bg2,borderRadius:12,padding:"12px 14px",marginBottom:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                <div>
                  <div style={{ fontSize:9,color:T.t3,fontWeight:800,marginBottom:4 }}>WIN RATE TARGET</div>
                  <div style={{ fontSize:20,fontWeight:900,color:T.green }}>{winRate}%</div>
                  <div style={{ fontSize:10,color:T.t3,marginTop:2 }}>dari setiap trade entry</div>
                </div>
                <div>
                  <div style={{ fontSize:9,color:T.t3,fontWeight:800,marginBottom:4 }}>RISK : REWARD</div>
                  <div style={{ fontSize:20,fontWeight:900,color:T.blue }}>{riskReward}</div>
                  <div style={{ fontSize:10,color:T.t3,marginTop:2 }}>setiap kali ambil posisi</div>
                </div>
              </div>

              {/* Yearly chart - compact bar */}
              <div style={{ fontSize:9,fontWeight:800,color:T.t3,marginBottom:8,letterSpacing:"0.5px" }}>PROYEKSI PER TAHUN</div>
              <div style={{ overflowX:"auto" }}>
                <div style={{ display:"flex",gap:3,alignItems:"flex-end",height:80,minWidth:480,padding:"0 4px" }}>
                  {simRows.map(r => {
                    const maxBal = simRows[simRows.length-1].bal
                    const h = Math.max(8, (r.bal/maxBal)*76)
                    const isPos = parseFloat(r.ret) > 0
                    return (
                      <div key={r.y} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
                        <div title={`Tahun ${r.y}: Rp${formatRupiahCompact(r.bal)} (${r.ret}%)`}
                          style={{ width:"100%",height:h,background:isPos?T.green:T.red,borderRadius:"3px 3px 0 0",opacity:0.85,minHeight:6,transition:"height 0.3s" }}/>
                        {r.y%5===0 && <div style={{ fontSize:7,color:T.t3,whiteSpace:"nowrap" }}>Y{r.y}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Yearly table - collapsible, show top 5 years */}
              <div style={{ marginTop:14 }}>
                {[5,10,15,20].map(y => {
                  const r = simRows[y-1]
                  if (!r) return null
                  return (
                    <div key={y} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:T.bg2,borderRadius:10,marginBottom:6 }}>
                      <div>
                        <div style={{ fontSize:12,fontWeight:800,color:T.t1 }}>Tahun ke-{y}</div>
                        <div style={{ fontSize:10,color:T.t3 }}>Return aktual: {r.ret}%</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:14,fontWeight:900,color:T.green }}>Rp {formatRupiahCompact(r.bal)}</div>
                        <div style={{ fontSize:10,color:T.t3 }}>+{formatRupiahCompact(r.bal - simRows[0].prev)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── MONEY MANAGEMENT ── */}
            <div style={{ background:T.bg1,border:`1px solid ${T.bdr2}`,borderRadius:20,padding:20,marginBottom:20 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16 }}>
                <Shield size={18} color={T.amber}/>
                <div style={{ fontSize:15,fontWeight:900,color:T.t1 }}>Money Management Rules</div>
              </div>
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {mmRules.map(r=>(
                  <div key={r.label} style={{ background:T.bg2,borderRadius:12,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:12,fontWeight:800,color:T.t1 }}>{r.label}</div>
                      <div style={{ fontSize:10,color:T.t3,marginTop:2 }}>{r.desc}</div>
                    </div>
                    <div style={{ fontSize:14,fontWeight:900,color:T.em,whiteSpace:"nowrap",marginLeft:12 }}>{r.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── TRADE PLAN STRATEGIES ── */}
            <div style={{ marginBottom:20 }}>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16 }}>
                <Target size={18} color={T.green}/>
                <div style={{ fontSize:15,fontWeight:900,color:T.t1 }}>Trade Plan & Strategi</div>
              </div>
              {strategies.map((s,si)=>(
                <div key={si} style={{ background:T.bg1,border:`1px solid ${T.bdr2}`,borderRadius:18,padding:18,marginBottom:12,overflow:"hidden" }}>
                  {/* Header */}
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15,fontWeight:900,color:T.t1,marginBottom:4 }}>{s.name}</div>
                      <div style={{ fontSize:11,color:T.t2,lineHeight:1.6 }}>{s.desc}</div>
                    </div>
                    <div style={{ background:T.gBg,border:`1px solid ${T.gBdr}`,borderRadius:10,padding:"6px 10px",marginLeft:10,textAlign:"center",flexShrink:0 }}>
                      <div style={{ fontSize:8,fontWeight:800,color:T.green }}>WIN RATE</div>
                      <div style={{ fontSize:16,fontWeight:900,color:T.green }}>{s.winrate}%</div>
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:12 }}>
                    {[
                      ["R:R",     s.rr,        T.blue],
                      ["Alokasi", s.alloc+"%", T.amber],
                      ["SL",      "-"+s.sl+"%", T.red],
                      ["TP1",     "+"+s.tp1+"%",T.green],
                    ].map(([l,v,c])=>(
                      <div key={l} style={{ background:T.bg2,borderRadius:9,padding:"8px 6px",textAlign:"center" }}>
                        <div style={{ fontSize:8,fontWeight:800,color:T.t3,marginBottom:2 }}>{l}</div>
                        <div style={{ fontSize:12,fontWeight:900,color:c }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Trade plan detail */}
                  <div style={{ background:T.bg0,borderRadius:10,padding:"10px 12px",marginBottom:8 }}>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                      {[
                        ["⏱ Timeframe", s.timeframe],
                        ["📊 Sektor", s.sector],
                        ["🟢 Entry", s.entry],
                        ["🔴 Exit", s.exit],
                      ].map(([l,v])=>(
                        <div key={l}>
                          <div style={{ fontSize:9,fontWeight:800,color:T.t3,marginBottom:2 }}>{l}</div>
                          <div style={{ fontSize:10,color:T.t2,lineHeight:1.5 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TP2 bar */}
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <div style={{ fontSize:10,color:T.t3 }}>TP2 target: <strong style={{ color:T.green }}>+{s.tp2}%</strong></div>
                    <div style={{ fontSize:10,color:T.t3 }}>Max loss per trade: <strong style={{ color:T.red }}>{(s.alloc*s.sl/100).toFixed(1)}% kapital</strong></div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── MARKET ALTERNATIVE (selalu tampil di bawah) ── */}
            {!suggestExit && (
              <div style={{ background:T.bg1,border:`1px solid ${T.bdr2}`,borderRadius:20,padding:20,marginBottom:20 }}>
                <div style={{ fontSize:13,fontWeight:800,color:T.t2,marginBottom:12 }}>🏦 Alternatif Saat Pasar Sideways/Bear</div>
                {[
                  { name:"Reksa Dana Pasar Uang", yield:"5–6%/thn", risk:"Sangat Rendah" },
                  { name:"ORI / SBN Ritel", yield:"6–7%/thn", risk:"Rendah" },
                  { name:"Deposito", yield:"4–5.5%/thn", risk:"Nol (LPS)" },
                  { name:"P2P Lending (terpilih)", yield:"10–14%/thn", risk:"Sedang" },
                ].map(a=>(
                  <div key={a.name} style={{ display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${T.bdr}` }}>
                    <span style={{ fontSize:12,color:T.t1,fontWeight:700 }}>{a.name}</span>
                    <div style={{ textAlign:"right" }}>
                      <span style={{ fontSize:12,fontWeight:900,color:T.blue }}>{a.yield}</span>
                      <span style={{ fontSize:10,color:T.t3,marginLeft:8 }}>Risk: {a.risk}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
          )
        })()}


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
            {/* CASH: formatRupiahCompact sudah ada prefix Rp sendiri */}
            <div><div style={{ fontSize:10,fontWeight:800,color:T.t3,marginBottom:4 }}>CASH TERSEDIA</div><div style={{ fontSize:15,fontWeight:800,color:T.em }}>{formatRupiahCompact(cash)}</div></div>
            {/* HARGA PASAR: pakai formatHarga agar desimal tampil, tanpa tambah Rp manual */}
            <div style={{ textAlign:"right" }}><div style={{ fontSize:10,fontWeight:800,color:T.t3,marginBottom:4 }}>HARGA PASAR</div><div style={{ fontSize:15,fontWeight:800,color:T.t1 }}>Rp {formatHarga(parsePrice(buyPrice))}</div></div>
          </div>
          <Input label="HARGA BELI (Rp)" type="number" prefix="Rp" value={buyPrice} onChange={e=>setBuyPrice(e.target.value)} placeholder="Contoh: 4387.68"/>
          <Input label="JUMLAH LOT" type="number" hint="1 Lot = 100 Lembar" value={buyLot} onChange={e=>setBuyLot(e.target.value)} placeholder="Contoh: 10"/>
          {buyLot&&buyPrice && (()=>{
            const lot_ = parseInt(buyLot) || 0
            const price_ = parsePrice(buyPrice)
            const total_ = rp(lot_ * 100 * price_)
            return (
              <div style={{ background:T.bg3,border:`1px solid ${T.bdr2}`,padding:"14px 16px",borderRadius:14,marginBottom:20 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
                  <span style={{ fontSize:12,fontWeight:700,color:T.t3 }}>Total Biaya</span>
                  <span style={{ fontSize:17,fontWeight:900,color:T.t1 }}>Rp {new Intl.NumberFormat("id-ID",{minimumFractionDigits:2,maximumFractionDigits:2}).format(total_)}</span>
                </div>
                <div style={{ display:"flex",justifyContent:"space-between" }}>
                  <span style={{ fontSize:11,color:T.t3 }}>{lot_} lot × 100 lembar × Rp {formatHarga(price_)}</span>
                  <span style={{ fontSize:11,color:total_>cash?T.red:T.green,fontWeight:700 }}>{total_>cash?"⚠ Melebihi cash":"✓ Cukup"}</span>
                </div>
              </div>
            )
          })()}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11,fontWeight:800,color:T.t3,marginBottom:8,letterSpacing:"0.5px" }}>ALASAN BELI (opsional)</div>
            <textarea
              value={buyNote} onChange={e=>setBuyNote(e.target.value)}
              placeholder="Contoh: Breakout dari MA50, volume tinggi, fundamental kuat..."
              rows={3}
              style={{ width:"100%",background:T.bg2,border:`1px solid ${T.bdr2}`,borderRadius:12,padding:"10px 12px",
                color:T.t1,fontSize:13,resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.5,
                boxSizing:"border-box" }}
            />
          </div>
          <Btn full onClick={handleBuy}>Eksekusi Pembelian</Btn>
        </Modal>

        {/* ══ EDIT POSISI MODAL ══ */}
        <Modal open={editModal} onClose={()=>setEditModal(false)} title={`Edit Posisi ${editPos?.stock_code}`} subtitle="Koreksi data avg price atau jumlah lot">
          <div style={{ background:T.rBg,border:`1px solid ${T.rBdr}`,borderRadius:14,padding:"12px 16px",marginBottom:20 }}>
            <div style={{ fontSize:11,fontWeight:800,color:T.red,marginBottom:4 }}>⚠ PERHATIAN</div>
            <div style={{ fontSize:12,color:T.red,lineHeight:1.5 }}>Fitur ini untuk koreksi data (misalnya average kurang tepat). Ini TIDAK mencatat transaksi baru di jurnal.</div>
          </div>
          <div style={{ background:T.bg2,borderRadius:14,padding:"12px 16px",marginBottom:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <div><div style={{ fontSize:10,fontWeight:800,color:T.t3,marginBottom:4 }}>AVG SAAT INI</div><div style={{ fontSize:15,fontWeight:800,color:T.t1 }}>Rp {formatHarga(editPos?.avg_price)}</div></div>
            <div style={{ textAlign:"right" }}><div style={{ fontSize:10,fontWeight:800,color:T.t3,marginBottom:4 }}>LOT SAAT INI</div><div style={{ fontSize:15,fontWeight:800,color:T.t1 }}>{editPos?.lot} Lot</div></div>
          </div>
          <Input label="AVG PRICE BARU (Rp)" type="number" prefix="Rp" value={editAvg} onChange={e=>setEditAvg(e.target.value)}/>
          <Input label="JUMLAH LOT BARU" type="number" value={editLot} onChange={e=>setEditLot(e.target.value)}/>
          {editAvg && editLot && (
            <div style={{ background:T.bg3,border:`1px solid ${T.bdr2}`,borderRadius:14,padding:"12px 16px",marginBottom:16 }}>
              <div style={{ display:"flex",justifyContent:"space-between" }}>
                <span style={{ fontSize:12,color:T.t3 }}>Modal baru</span>
                <span style={{ fontSize:14,fontWeight:800,color:T.t1 }}>Rp {new Intl.NumberFormat("id-ID",{minimumFractionDigits:2,maximumFractionDigits:2}).format(rp(parseInt(editLot)*100*parsePrice(editAvg)))}</span>
              </div>
            </div>
          )}
          <Btn full onClick={handleEdit}>Simpan Perubahan</Btn>
        </Modal>

        <Modal open={sellModal} onClose={()=>setSellModal(false)} title={`Jual ${sellStock?.stock_code}`} subtitle="Amankan Profit atau Cut Loss sesuai Trading Plan">
          <div style={{ background:T.bg2,padding:16,borderRadius:16,marginBottom:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <div>
              <div style={{ fontSize:10,fontWeight:800,color:T.t3,marginBottom:4 }}>LOT DIMILIKI</div>
              <div style={{ fontSize:15,fontWeight:800,color:T.t1 }}>{sellStock?.lot} Lot</div>
              <div style={{ fontSize:11,color:T.t3 }}>Avg Rp {formatHarga(sellStock?.avg_price)}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:10,fontWeight:800,color:T.t3,marginBottom:4 }}>HARGA LIVE</div>
              <div style={{ fontSize:15,fontWeight:800,color:T.em }}>Rp {formatHarga(parsePrice(sellPrice))}</div>
            </div>
          </div>
          <Input label="HARGA JUAL (Rp)" type="number" prefix="Rp" value={sellPrice} onChange={e=>setSellPrice(e.target.value)} placeholder="Harga live sudah terisi otomatis"/>
          <Input label="LOT DIJUAL" type="number" hint={`Maks ${sellStock?.lot} Lot`} value={sellLot} onChange={e=>setSellLot(e.target.value)}/>
          {sellPrice&&sellLot&&(()=>{
            const sp_   = parsePrice(sellPrice)
            const sl_   = parseInt(sellLot) || 0
            const total_ = rp(sl_ * 100 * sp_)
            const pnl   = rp((sp_ - (sellStock?.avg_price||0)) * sl_ * 100)
            return (<>
              <div style={{ background:T.bg3,border:`1px solid ${T.bdr2}`,padding:"14px 16px",borderRadius:14,marginBottom:12 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
                  <span style={{ fontSize:12,fontWeight:700,color:T.t3 }}>Total Hasil Jual</span>
                  <span style={{ fontSize:17,fontWeight:900,color:T.t1 }}>Rp {new Intl.NumberFormat("id-ID",{minimumFractionDigits:2,maximumFractionDigits:2}).format(total_)}</span>
                </div>
                <span style={{ fontSize:11,color:T.t3 }}>{sl_} lot × 100 lembar × Rp {formatHarga(sp_)}</span>
              </div>
              <div style={{ background:pnl>=0?T.gBg:T.rBg,border:`1px solid ${pnl>=0?T.gBdr:T.rBdr}`,padding:"12px 16px",borderRadius:14,marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <span style={{ fontSize:11,fontWeight:800,color:pnl>=0?T.green:T.red }}>ESTIMASI P&L</span>
                <span style={{ fontSize:18,fontWeight:900,color:pnl>=0?T.green:T.red }}>{pnl>=0?"+":""}Rp {new Intl.NumberFormat("id-ID",{minimumFractionDigits:2,maximumFractionDigits:2}).format(Math.abs(pnl))}</span>
              </div>
            </>)
          })()}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11,fontWeight:800,color:T.t3,marginBottom:8,letterSpacing:"0.5px" }}>ALASAN JUAL (opsional)</div>
            <textarea
              value={sellNote} onChange={e=>setSellNote(e.target.value)}
              placeholder="Contoh: Target TP1 tercapai, atau cut loss sesuai plan..."
              rows={3}
              style={{ width:"100%",background:T.bg2,border:`1px solid ${T.bdr2}`,borderRadius:12,padding:"10px 12px",
                color:T.t1,fontSize:13,resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.5,
                boxSizing:"border-box" }}
            />
          </div>
          <Btn variant="danger" full onClick={handleSell}>Konfirmasi Penjualan</Btn>
        </Modal>
      </div>
    </ThemeCtx.Provider>
  )
}