/**
 * src/lib/moneyManagement.js
 * Inti kalkulasi risk management dan advisory system
 */

import { formatRupiah } from "./utils";

// ─── KALKULASI MONEY MANAGEMENT ──────────────────────────
export function calculateMoneyManagement(
  totalEquity,
  averageBuyPrice,
  currentLivePrice,
  totalSharesOwned
) {
  const safeEquity = Number(totalEquity) || 0;
  const safeAvgPrice = Number(averageBuyPrice) || 0;
  const safeLivePrice = Number(currentLivePrice) || 0;
  const safeShares = Number(totalSharesOwned) || 0;

  if (safeEquity === 0 || safeAvgPrice === 0 || safeShares === 0) {
    return {
      posVal: 0, curVal: 0, pnl: 0, pnlPct: 0,
      allocPct: 0, lossEq: 0,
      sl: 0, tp1: 0, tp2: 0, adLvl: 0, auLvl: 0,
      canBuyLot: 0, canBuyShares: 0, projectedNewAvg: safeAvgPrice,
    };
  }

  const posVal = safeShares * safeAvgPrice;
  const curVal = safeShares * safeLivePrice;
  const pnl = curVal - posVal;
  const pnlPct = ((safeLivePrice - safeAvgPrice) / safeAvgPrice) * 100;
  const allocPct = (posVal / safeEquity) * 100;
  const lossEq = (pnl / safeEquity) * 100;

  // Trading Plan levels (Risk:Reward 1:2)
  const sl    = safeAvgPrice * 0.92;   // Cut Loss   -8%
  const tp1   = safeAvgPrice * 1.15;   // Take Profit 1 +15%
  const tp2   = safeAvgPrice * 1.25;   // Take Profit 2 +25%
  const adLvl = safeAvgPrice * 0.95;   // Average Down  -5%
  const auLvl = safeAvgPrice * 1.05;   // Average Up    +5%

  // Max beli untuk Average Down
  const maxLossAllowed = safeEquity * 0.11;
  const currentRisk = pnl < 0 ? Math.abs(pnl) : 0;
  const remainingRiskCapacity = maxLossAllowed - currentRisk;
  const maxAllocationCapacity = safeEquity * 0.20 - posVal;

  const buyValueBasedOnRisk =
    remainingRiskCapacity > 0 ? remainingRiskCapacity / 0.08 : 0;

  const finalBuyPowerValue = Math.max(
    0,
    Math.min(buyValueBasedOnRisk, maxAllocationCapacity)
  );

  const canBuyLot = Math.floor(finalBuyPowerValue / safeLivePrice / 100);
  const canBuyShares = canBuyLot * 100;

  let projectedNewAvg = safeAvgPrice;
  if (canBuyShares > 0) {
    const totalCostNew = canBuyShares * safeLivePrice;
    projectedNewAvg =
      (posVal + totalCostNew) / (safeShares + canBuyShares);
  }

  return {
    posVal, curVal, pnl, pnlPct, allocPct, lossEq,
    sl, tp1, tp2, adLvl, auLvl,
    canBuyLot, canBuyShares, projectedNewAvg,
  };
}

// ─── ADVISORY SUGGESTIONS ────────────────────────────────
export function generateAdvisorySuggestions(
  mmData,
  stockCode,
  currentCashPercentage
) {
  const suggestions = [];

  if (mmData.allocPct > 20.5) {
    suggestions.push({
      type: "red",
      text: `Porsi ${stockCode} (${mmData.allocPct.toFixed(1)}%) melebihi batas 20%. DILARANG Average Down.`,
    });
  }

  if (mmData.lossEq < -11) {
    suggestions.push({
      type: "red",
      text: `Kerugian ${stockCode} merusak >11% total ekuitas. Evaluasi fundamental segera!`,
    });
  }

  if (mmData.pnlPct <= -8) {
    suggestions.push({
      type: "red",
      text: `Stop Loss -8% Tersentuh. Lakukan Cut Loss untuk proteksi modal.`,
    });
  } else if (mmData.pnlPct <= -5 && mmData.pnlPct > -8) {
    if (
      currentCashPercentage > 20 &&
      mmData.allocPct < 15 &&
      mmData.canBuyLot > 0
    ) {
      suggestions.push({
        type: "blue",
        text: `Smart Avg Down: Boleh cicil maks ${mmData.canBuyLot} lot. Estimasi avg baru: Rp ${formatRupiah(mmData.projectedNewAvg)}.`,
      });
    } else {
      suggestions.push({
        type: "amber",
        text: `Area Average Down, tapi kas/alokasi tidak memadai. Hold posisi.`,
      });
    }
  }

  if (mmData.pnlPct >= 25) {
    suggestions.push({
      type: "green",
      text: `🔥 Target 2 (+25%) TERCAPAI. Jual sebagian besar untuk amankan profit maksimal!`,
    });
  } else if (mmData.pnlPct >= 15) {
    suggestions.push({
      type: "green",
      text: `🎯 Target 1 (+15%) TERCAPAI. Jual 30–50% untuk kunci keuntungan.`,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      type: "neutral",
      text: `${stockCode} stabil. Hold dan ikuti Trading Plan.`,
    });
  }

  return suggestions;
}