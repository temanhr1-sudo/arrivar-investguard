export const POPULAR_IDX_SYMBOLS = [
  "BBCA","BBRI","BMRI","BBNI","TLKM","ASII","ADRO","PTBA","ITMG","GOTO",
  "BREN","AMMN","MDKA","ANTM","BJTM","BJBR","UNVR","ICBP","INDF","PGAS",
  "KLBF","SMGR","MEDC","ELSA","AUTO","SMSM","MYOR","SIDO","CTRA","BSDE",
  "PWON","ACES","MAPI","TOWR","JSMR","EXCL","ISAT","AALI","LSIP","BRPT",
  "INKP","CPIN","INCO","TINS","HRUM",
]

export const DARK = {
  bg0:"#080F1A", bg1:"#0D1926", bg2:"#111D2C", bg3:"#162232",
  bdr:"#1E2E42", bdr2:"#243547",
  t1:"#E2EAF4", t2:"#6A8099", t3:"#384F65",
  green:"#00C87A", gBg:"rgba(0,200,122,0.10)", gBdr:"rgba(0,200,122,0.25)",
  red:"#FF4558",   rBg:"rgba(255,69,88,0.10)",  rBdr:"rgba(255,69,88,0.25)",
  amber:"#FFAD1F", aBg:"rgba(255,173,31,0.10)", aBdr:"rgba(255,173,31,0.25)",
  blue:"#4B9EFF",  lBg:"rgba(75,158,255,0.10)", lBdr:"rgba(75,158,255,0.25)",
  em:"#00C87A", card:"rgba(255,255,255,0.03)", navBg:"rgba(8,15,26,0.97)",
}

export const LIGHT = {
  bg0:"#F0F4F8", bg1:"#FFFFFF", bg2:"#F5F7FA", bg3:"#EBF0F5",
  bdr:"#D1DCE8", bdr2:"#C4D3E0",
  t1:"#0D1926", t2:"#4A6480", t3:"#8AA4BA",
  green:"#00A862", gBg:"rgba(0,168,98,0.08)",   gBdr:"rgba(0,168,98,0.25)",
  red:"#E0233A",   rBg:"rgba(224,35,58,0.08)",  rBdr:"rgba(224,35,58,0.25)",
  amber:"#C47C00", aBg:"rgba(196,124,0,0.08)",  aBdr:"rgba(196,124,0,0.25)",
  blue:"#1A6FD4",  lBg:"rgba(26,111,212,0.08)", lBdr:"rgba(26,111,212,0.25)",
  em:"#00A862", card:"rgba(0,0,0,0.02)", navBg:"rgba(255,255,255,0.97)",
}

export const getGlobalStyles = (T, isDark) => `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{
    background:${T.bg0};color:${T.t1};
    font-family:'Plus Jakarta Sans',sans-serif;
    overscroll-behavior:none;-webkit-font-smoothing:antialiased;
    transition:background 0.3s,color 0.3s;
  }
  input,select,textarea,button{font-family:inherit;outline:none}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:${T.bdr2};border-radius:4px}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes slideUp{from{opacity:0;transform:translateY(60px)}to{opacity:1;transform:translateY(0)}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
  .fu{animation:fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both}
  .fi{animation:fadeIn 0.3s ease both}
  .su{animation:slideUp 0.4s cubic-bezier(0.22,1,0.36,1) both}
  .spin{animation:spin 0.8s linear infinite}
  .pulse{animation:pulse 1.5s ease infinite}
  .tap{transition:all 0.15s ease}
  .tap:active{transform:scale(0.96);opacity:0.8}
  .hide-scrollbar{scrollbar-width:none}
  .hide-scrollbar::-webkit-scrollbar{display:none}
`