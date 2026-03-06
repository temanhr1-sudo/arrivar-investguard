/**
 * src/lib/constants.js
 * Data konstan: daftar saham populer & design tokens
 */

// ─── DAFTAR SAHAM POPULER IDX ────────────────────────────
// Hanya kode saham. Harga & fundamental ditarik LIVE dari Yahoo.
export const POPULAR_IDX_SYMBOLS = [
  "BBCA", "BBRI", "BMRI", "BBNI", "TLKM",
  "ASII", "ADRO", "PTBA", "ITMG", "GOTO",
  "BREN", "AMMN", "MDKA", "ANTM", "BJTM",
  "BJBR", "UNVR", "ICBP", "INDF", "PGAS",
  "KLBF", "SMGR", "MEDC", "ELSA", "AUTO",
  "SMSM", "MYOR", "SIDO", "CTRA", "BSDE",
  "PWON", "ACES", "MAPI", "TOWR", "JSMR",
  "EXCL", "ISAT", "AALI", "LSIP", "BRPT",
  "INKP", "CPIN", "INCO", "TINS", "HRUM",
];

// ─── DESIGN TOKENS ───────────────────────────────────────
export const THEME = {
  bg0:  "#080F1A",
  bg1:  "#0D1926",
  bg2:  "#111D2C",
  bg3:  "#162232",
  bdr:  "#1E2E42",
  bdr2: "#243547",
  t1:   "#E2EAF4",
  t2:   "#6A8099",
  t3:   "#384F65",
  em:   "#00C87A",
  green: "#00C87A",
  gBg:  "rgba(0, 200, 122, 0.1)",
  gBdr: "rgba(0, 200, 122, 0.25)",
  red:  "#FF4558",
  rBg:  "rgba(255, 69, 88, 0.1)",
  rBdr: "rgba(255, 69, 88, 0.25)",
  amber: "#FFAD1F",
  aBg:  "rgba(255, 173, 31, 0.1)",
  aBdr: "rgba(255, 173, 31, 0.25)",
  blue: "#4B9EFF",
  lBg:  "rgba(75, 158, 255, 0.1)",
  lBdr: "rgba(75, 158, 255, 0.25)",
};

// ─── GLOBAL CSS ──────────────────────────────────────────
export const GLOBAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    background: #080F1A;
    color: #E2EAF4;
    font-family: 'Plus Jakarta Sans', sans-serif;
    overscroll-behavior: none;
    -webkit-font-smoothing: antialiased;
  }

  input, select, textarea, button { font-family: inherit; outline: none; }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1E2E42; border-radius: 4px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(60px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  .fu  { animation: fadeUp  0.4s cubic-bezier(0.22,1,0.36,1) both; }
  .fi  { animation: fadeIn  0.3s ease both; }
  .su  { animation: slideUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
  .spin { animation: spin  0.8s linear infinite; }
  .pulse { animation: pulse 1.5s ease infinite; }
  .tap { transition: all 0.15s ease; }
  .tap:active { transform: scale(0.96); opacity: 0.8; }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
`;