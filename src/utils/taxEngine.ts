import type { Segment, Product, TradeAction } from '../types';

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
 * Rates align closely with standard discount brokers (e.g., Zerodha).
 */
export function calculateIndianTaxesAndBrokerage(
  segment: Segment,
  product: Product,
  action: TradeAction,
  qty: number,
  entryPrice: number,
  exitPrice: number
): TaxResult {
  // Determine buy and sell prices/values based on trade action (BUY = Long, SELL = Short)
  const isLong = action === 'BUY';
  const buyPrice = isLong ? entryPrice : exitPrice;
  const sellPrice = isLong ? exitPrice : entryPrice;

  const buyValue = qty * buyPrice;
  const sellValue = qty * sellPrice;
  const totalTurnover = buyValue + sellValue;

  let brokerage = 0;
  let stt = 0;
  let exchangeTx = 0;
  let sebiFee = 0;
  let stampDuty = 0;
  let gst = 0;

  // 1. Brokerage & Exchange Tx Charges
  if (segment === 'Equity') {
    if (product === 'CNC') {
      // Delivery
      brokerage = 0;
      exchangeTx = totalTurnover * 0.0000325; // 0.00325%
      stt = totalTurnover * 0.001; // 0.1% on buy and sell
      stampDuty = buyValue * 0.00015; // 0.015% on buy side only
    } else {
      // Intraday (MIS)
      const buyBrokerage = Math.min(20, buyValue * 0.0003); // 0.03% or Rs 20
      const sellBrokerage = Math.min(20, sellValue * 0.0003);
      brokerage = buyBrokerage + sellBrokerage;
      exchangeTx = totalTurnover * 0.00325 * 0.01; // 0.00325%
      stt = sellValue * 0.00025; // 0.025% on sell side only
      stampDuty = buyValue * 0.00003; // 0.003% on buy side only
    }
  } else if (segment === 'F&O') {
    // Determine if option or future (option contracts usually have strike prices or CE/PE in symbol)
    // For simplicity, we can assume that if product is MIS/NRML in F&O, we treat based on instrument details.
    // Let's check entryPrice. If price is very low (e.g., premium of option) or standard option calculation:
    // Let's assume F&O Options has flat ₹20/order, and Futures has min(20, 0.03%). 
    // We can infer option vs future based on whether it is options or futures. Let's make options the default for F&O,
    // and futures if the price is high or if we provide a simple heuristic, or let's distinguish:
    // Options: Brokerage = ₹20 per order (₹40 round trip)
    // Futures: Brokerage = min(20, 0.03%) per order
    // Let's assume options if price is lower than 1000, or let's write a generic logic:
    // Actually, in Indian markets, Options brokerage is flat ₹20 per executed order, STT is 0.0625% on sell side.
    // Futures brokerage is 0.03% or ₹20, STT is 0.0125% on sell side.
    // Let's assume F&O trades are Options by default unless specified or if we implement both.
    // Let's assume: if buyPrice < 1500, it's Options; else Futures. (Standard option premiums are usually < 1000, whereas Futures are > 5000+ index/stock prices).
    // Better yet, we can check if it's Futures or Options based on the price or segment. Let's write a clean heuristic:
    const isOption = buyPrice < 2000; // Options premium is usually under 2000, Futures price is underlying price (typically high)

    if (isOption) {
      // Options
      brokerage = 40; // ₹20 entry + ₹20 exit
      exchangeTx = totalTurnover * 0.00053; // 0.053% on premium value
      stt = sellValue * 0.000625; // 0.0625% on sell side premium
      stampDuty = buyValue * 0.00003; // 0.003% on buy side
    } else {
      // Futures
      const buyBrokerage = Math.min(20, buyValue * 0.0003);
      const sellBrokerage = Math.min(20, sellValue * 0.0003);
      brokerage = buyBrokerage + sellBrokerage;
      exchangeTx = totalTurnover * 0.000019; // 0.0019%
      stt = sellValue * 0.000125; // 0.0125% on sell side
      stampDuty = buyValue * 0.00002; // 0.002% on buy side
    }
  } else if (segment === 'Commodity') {
    // MCX charges
    const buyBrokerage = Math.min(20, buyValue * 0.0003);
    const sellBrokerage = Math.min(20, sellValue * 0.0003);
    brokerage = buyBrokerage + sellBrokerage;
    exchangeTx = totalTurnover * 0.000026; // 0.0026%
    stt = sellValue * 0.0001; // CTT 0.01% on sell side Futures
    stampDuty = buyValue * 0.00002; // 0.002% buy side
  } else if (segment === 'Currency') {
    // CDS charges (No STT)
    const buyBrokerage = Math.min(20, buyValue * 0.0003);
    const sellBrokerage = Math.min(20, sellValue * 0.0003);
    brokerage = buyBrokerage + sellBrokerage;
    exchangeTx = totalTurnover * 0.000009; // 0.0009%
    stt = 0; // No STT on Currency
    stampDuty = buyValue * 0.000001; // 0.0001% buy side
  }

  // 3. SEBI Turnover Fee (Rs 10 / Crore = 0.000001 of turnover)
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
