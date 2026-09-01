import type { Segment, Product, TradeAction, BrokerChargesConfig } from '../types';

interface TaxResult {
  brokerage: number;
  stt: number;
  exchangeTx: number;
  sebiFee: number;
  stampDuty: number;
  gst: number;
  totalCharges: number;
}

/**
 * Calculates Indian Stock Market brokerage, taxes, and other charges.
 * Accurately aligns with Dhan, Zerodha, Groww, Angel One and SEBI/Exchange revised rates (effective Oct 2024).
 */
export function calculateIndianTaxesAndBrokerage(
  segment: Segment,
  product: Product,
  action: TradeAction,
  qty: number,
  entryPrice: number,
  exitPrice: number,
  chargesConfig?: BrokerChargesConfig,
  isOption?: boolean,
  partialExits?: { qty: number; price: number }[],
  strategy?: string,
  symbol?: string
): TaxResult {
  if (!qty || qty <= 0 || isNaN(qty) || isNaN(entryPrice) || isNaN(exitPrice)) {
    return {
      brokerage: 0,
      stt: 0,
      exchangeTx: 0,
      sebiFee: 0,
      stampDuty: 0,
      gst: 0,
      totalCharges: 0,
    };
  }

  // Determine buy and sell prices/values based on trade action (BUY = Long, SELL = Short)
  const isLong = action === 'BUY';
  const buyPrice = isLong ? entryPrice : exitPrice;
  const sellPrice = isLong ? exitPrice : entryPrice;

  const buyValue = qty * (buyPrice || 0);
  const sellValue = qty * (sellPrice || 0);
  const totalTurnover = buyValue + sellValue;

  let brokerage = 0;
  let stt = 0;
  let exchangeTx = 0;
  let sebiFee = 0;
  let stampDuty = 0;
  let gst = 0;

  const exitLegsCount = partialExits && partialExits.length > 0 ? partialExits.length : 1;

  // Helper for percentage brokerage exit legs calculation
  const calcExitBrokerage = (ratePct: number, maxFee: number) => {
    if (partialExits && partialExits.length > 0) {
      return partialExits.reduce((sum, leg) => {
        const legValue = leg.qty * leg.price;
        return sum + Math.min(maxFee, legValue * (ratePct / 100));
      }, 0);
    }
    return Math.min(maxFee, sellValue * (ratePct / 100));
  };

  const symUpper = (symbol || '').toUpperCase();
  const isBSE = symUpper.includes('SENSEX') || symUpper.includes('BANKEX') || symUpper.includes('BSE');

  // Smart Options detection for F&O
  const isOptionCalculated = isOption !== undefined 
    ? isOption 
    : (
        symUpper.includes('CE') || 
        symUpper.includes('PE') || 
        symUpper.includes('CALL') || 
        symUpper.includes('PUT') ||
        (!symUpper.includes('FUT') && entryPrice < 3000)
      );

  // 1. Brokerage & Exchange Tx Charges
  if (segment === 'Equity') {
    if (product === 'Delivery') {
      // Equity Delivery
      if (chargesConfig) {
        const buyBroker = Math.min(chargesConfig.deliveryMaxFee || Infinity, buyValue * (chargesConfig.deliveryRatePct / 100));
        const sellBroker = calcExitBrokerage(chargesConfig.deliveryRatePct, chargesConfig.deliveryMaxFee || Infinity);
        brokerage = buyBroker + sellBroker;
      } else {
        brokerage = 0; // Default Dhan / Zerodha Delivery is ₹0
      }
      exchangeTx = totalTurnover * (isBSE ? 0.0000375 : 0.0000297); // NSE: 0.00297%, BSE: 0.00375%
      stt = totalTurnover * 0.001; // 0.1% on both Buy & Sell side for Delivery
      stampDuty = buyValue * 0.00015; // 0.015% on buy side only
    } else {
      // Equity Intraday (MIS)
      if (chargesConfig) {
        const buyBroker = Math.min(chargesConfig.intradayMaxFee || Infinity, buyValue * (chargesConfig.intradayRatePct / 100));
        const sellBroker = calcExitBrokerage(chargesConfig.intradayRatePct, chargesConfig.intradayMaxFee || Infinity);
        brokerage = buyBroker + sellBroker;
      } else {
        const buyBroker = Math.min(20, buyValue * 0.0003); // 0.03% or ₹20 max
        const sellBroker = calcExitBrokerage(0.03, 20);
        brokerage = buyBroker + sellBroker;
      }
      exchangeTx = totalTurnover * (isBSE ? 0.0000375 : 0.0000297); // NSE: 0.00297%, BSE: 0.00375%
      stt = sellValue * 0.00025; // 0.025% on sell side for Intraday
      stampDuty = buyValue * 0.00003; // 0.003% on buy side only
    }
  } else if (segment === 'F&O') {
    if (isOptionCalculated) {
      // Equity & Index Options
      if (chargesConfig) {
        const flatFee = chargesConfig.optionsFlatFee ?? 20;
        const entryBroker = flatFee;
        const exitBroker = flatFee * exitLegsCount;
        brokerage = entryBroker + exitBroker; // Flat ₹20 per executed order
      } else {
        brokerage = 20 * (1 + exitLegsCount); // Default ₹20 per order
      }
      // Exchange Tx: NSE revised 0.03503% + IPFT 0.0005% = 0.03553% on premium. BSE SENSEX/BANKEX = 0.0325%
      exchangeTx = totalTurnover * (isBSE ? 0.000325 : 0.0003553);
      stt = sellValue * 0.001; // 0.1% on sell side premium (Revised Oct 2024 Budget)
      stampDuty = buyValue * 0.00003; // 0.003% on buy side
    } else {
      // Equity & Index Futures
      if (chargesConfig) {
        const buyBroker = Math.min(chargesConfig.futuresMaxFee || Infinity, buyValue * (chargesConfig.futuresRatePct / 100));
        const sellBroker = calcExitBrokerage(chargesConfig.futuresRatePct, chargesConfig.futuresMaxFee || Infinity);
        brokerage = buyBroker + sellBroker;
      } else {
        const buyBroker = Math.min(20, buyValue * 0.0003);
        const sellBroker = calcExitBrokerage(0.03, 20);
        brokerage = buyBroker + sellBroker;
      }
      // Exchange Tx: NSE revised 0.00173% + IPFT 0.0001% = 0.00183%
      exchangeTx = totalTurnover * 0.0000183; 
      // STT: 0.02% on sell side (Revised Oct 2024 Budget)
      stt = sellValue * 0.0002; 
      stampDuty = buyValue * 0.00002; // 0.002% on buy side
    }
  } else if (segment === 'Commodity') {
    // MCX Commodity Charges
    if (isOptionCalculated) {
      // Commodity Options
      if (chargesConfig) {
        const flatFee = chargesConfig.optionsFlatFee ?? 20;
        brokerage = flatFee * (1 + exitLegsCount);
      } else {
        brokerage = 20 * (1 + exitLegsCount);
      }
      exchangeTx = totalTurnover * 0.0005; // 0.05% on premium
      stt = sellValue * 0.0005; // CTT 0.05% on sell side
      stampDuty = buyValue * 0.00003; // 0.003% buy side
    } else {
      // Commodity Futures
      if (chargesConfig) {
        const buyBroker = Math.min(chargesConfig.futuresMaxFee || Infinity, buyValue * (chargesConfig.futuresRatePct / 100));
        const sellBroker = calcExitBrokerage(chargesConfig.futuresRatePct, chargesConfig.futuresMaxFee || Infinity);
        brokerage = buyBroker + sellBroker;
      } else {
        const buyBroker = Math.min(20, buyValue * 0.0002);
        const sellBroker = calcExitBrokerage(0.02, 20);
        brokerage = buyBroker + sellBroker;
      }
      exchangeTx = totalTurnover * 0.000021; // 0.0021%
      stt = sellValue * 0.0001; // CTT 0.01% on sell side
      stampDuty = buyValue * 0.00002; // 0.002% buy side
    }
  } else if (segment === 'Currency') {
    // CDS charges (No STT)
    if (isOptionCalculated) {
      if (chargesConfig) {
        const flatFee = chargesConfig.optionsFlatFee ?? 20;
        brokerage = flatFee * (1 + exitLegsCount);
      } else {
        brokerage = 20 * (1 + exitLegsCount);
      }
      exchangeTx = totalTurnover * 0.00035; // 0.035% on premium
      stt = 0; 
      stampDuty = buyValue * 0.00003; // 0.003% buy side
    } else {
      if (chargesConfig) {
        const buyBroker = Math.min(chargesConfig.futuresMaxFee || Infinity, buyValue * (chargesConfig.futuresRatePct / 100));
        const sellBroker = calcExitBrokerage(chargesConfig.futuresRatePct, chargesConfig.futuresMaxFee || Infinity);
        brokerage = buyBroker + sellBroker;
      } else {
        const buyBroker = Math.min(20, buyValue * 0.0003);
        const sellBroker = calcExitBrokerage(0.03, 20);
        brokerage = buyBroker + sellBroker;
      }
      exchangeTx = totalTurnover * 0.0000035; // 0.00035%
      stt = 0; 
      stampDuty = buyValue * 0.000001; // 0.0001% buy side
    }
  }

  const isVaccumGrid = strategy?.toLowerCase().trim() === 'vaccum grid';
  if (isVaccumGrid) {
    brokerage = 20 * (1 + exitLegsCount);
  }

  // 3. SEBI Turnover Fee (Rs 10 / Crore = 0.000001 of total turnover)
  sebiFee = totalTurnover * 0.000001;

  // 4. GST (18% on Brokerage + Exchange Tx + SEBI Fee)
  gst = (brokerage + exchangeTx + sebiFee) * 0.18;

  // Round values to 2 decimal places
  brokerage = Math.round(brokerage * 100) / 100;
  stt = Math.round(stt * 100) / 100;
  exchangeTx = Math.round(exchangeTx * 100) / 100;
  sebiFee = Math.round(sebiFee * 100) / 100;
  stampDuty = Math.round(stampDuty * 100) / 100;
  gst = Math.round(gst * 100) / 100;

  const totalCharges = Math.round((brokerage + stt + exchangeTx + sebiFee + stampDuty + gst) * 100) / 100;

  return {
    brokerage,
    stt,
    exchangeTx,
    sebiFee,
    stampDuty,
    gst,
    totalCharges,
  };
}
