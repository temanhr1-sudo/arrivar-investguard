/**
 * src/lib/utils.js
 * Helper functions yang digunakan di seluruh aplikasi
 */

// ─── FORMAT ANGKA ────────────────────────────────────────
export const formatRupiah = (number) => {
  const safeNumber = Number(number) || 0;
  return new Intl.NumberFormat("id-ID").format(Math.round(safeNumber));
};

export const formatRupiahCompact = (number) => {
  const safeNumber = Number(number) || 0;
  const abs = Math.abs(safeNumber);
  const sign = safeNumber < 0 ? "-" : "";

  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}M`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}Jt`;
  return `${sign}Rp ${formatRupiah(abs)}`;
};

export const formatPercent = (value) => {
  const safe = Number(value) || 0;
  return `${safe >= 0 ? "+" : ""}${safe.toFixed(2)}%`;
};

// ─── WARNA BERDASARKAN NILAI ─────────────────────────────
export const getProfitColor = (value, theme) => {
  const safe = Number(value) || 0;
  if (safe > 0) return theme.green;
  if (safe < 0) return theme.red;
  return theme.t2;
};

// ─── TANGGAL & WAKTU ─────────────────────────────────────
export const getTodayDateString = () => {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const getCurrentTimeString = () => {
  return new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

// ─── CSV EXPORT ──────────────────────────────────────────
export function exportDataToCSV(journalDataArray) {
  if (!journalDataArray || journalDataArray.length === 0) return;

  const headers = [
    "Tanggal",
    "Aksi",
    "Kode",
    "Lot",
    "Harga",
    "Nominal (Rp)",
    "Realized PnL (Rp)",
  ];

  const rows = journalDataArray.map((item) => [
    item.date || "",
    item.type || "",
    item.stock_code || "",
    item.lot || 0,
    item.close_price || 0,
    Math.round(item.nominal || (item.lot * 100 * item.close_price) || 0),
    Math.round(item.pnl || 0),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  const blob = new Blob(["\ufeff" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Jurnal_InvestGuard_${getTodayDateString().replace(/\s/g, "_")}.csv`;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}