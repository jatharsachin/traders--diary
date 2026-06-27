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
 * Dynamic calculations are backed by active Broker Charges Configurations.
 */
export function calculateIndianTaxesAndBrokerage(
  segment: Segment,
  product: Product,
  action: TradeAction,
  qty: number,
  entryPrice: number,
  exitPrice: number,
  chargesConfig?: BrokerChargesConfig
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
    if (product === 'Delivery') {
      // Delivery
      if (chargesConfig) {
        const buyBroker = Math.min(chargesConfig.deliveryMaxFee || Infinity, buyValue * (chargesConfig.deliveryRatePct / 100));
        const sellBroker = Math.min(chargesConfig.deliveryMaxFee || Infinity, sellValue * (chargesConfig.deliveryRatePct / 100));
        brokerage = buyBroker + sellBroker;
      } else {
        brokerage = 0; // Default Zerodha Delivery is ₹0
      }
      exchangeTx = totalTurnover * 0.0000325; // 0.00325%
      stt = totalTurnover * 0.001; // 0.1% on buy and sell
      stampDuty = buyValue * 0.00015; // 0.015% on buy side only
    } else {
      // Intraday (MIS)
      if (chargesConfig) {
        const buyBroker = Math.min(chargesConfig.intradayMaxFee || Infinity, buyValue * (chargesConfig.intradayRatePct / 100));
        const sellBroker = Math.min(chargesConfig.intradayMaxFee || Infinity, sellValue * (chargesConfig.intradayRatePct / 100));
        brokerage = buyBroker + sellBroker;
      } else {
        const buyBroker = Math.min(20, buyValue * 0.0003); // 0.03% or ₹20 max
        const sellBroker = Math.min(20, sellValue * 0.0003);
        brokerage = buyBroker + sellBroker;
      }
      exchangeTx = totalTurnover * 0.0000325; // 0.00325%
      stt = sellValue * 0.00025; // 0.025% on sell side only
      stampDuty = buyValue * 0.00003; // 0.003% on buy side only
    }
  } else if (segment === 'F&O') {
    const isOption = buyPrice < 2000; // Options premium heuristic

    if (isOption) {
      // Options
      if (chargesConfig) {
        brokerage = chargesConfig.optionsFlatFee * 2; // Flat fee per trade (entry + exit orders)
      } else {
        brokerage = 40; // Default ₹20 per order = ₹40 round trip
      }
      exchangeTx = totalTurnover * 0.00053; // 0.053% on premium value
      stt = sellValue * 0.000625; // 0.0625% on sell side premium
      stampDuty = buyValue * 0.00003; // 0.003% on buy side
    } else {
      // Futures
      if (chargesConfig) {
        const buyBroker = Math.min(chargesConfig.futuresMaxFee || Infinity, buyValue * (chargesConfig.futuresRatePct / 100));
        const sellBroker = Math.min(chargesConfig.futuresMaxFee || Infinity, sellValue * (chargesConfig.futuresRatePct / 100));
        brokerage = buyBroker + sellBroker;
      } else {
        const buyBroker = Math.min(20, buyValue * 0.0003);
        const sellBroker = Math.min(20, sellValue * 0.0003);
        brokerage = buyBroker + sellBroker;
      }
      exchangeTx = totalTurnover * 0.000019; // 0.0019%
      stt = sellValue * 0.000125; // 0.0125% on sell side
      stampDuty = buyValue * 0.00002; // 0.002% on buy side
    }
  } else if (segment === 'Commodity') {
    // MCX charges
    if (chargesConfig) {
      const buyBroker = Math.min(chargesConfig.futuresMaxFee || Infinity, buyValue * (chargesConfig.futuresRatePct / 100));
      const sellBroker = Math.min(chargesConfig.futuresMaxFee || Infinity, sellValue * (chargesConfig.futuresRatePct / 100));
      brokerage = buyBroker + sellBroker;
    } else {
      const buyBroker = Math.min(20, buyValue * 0.0003);
      const sellBroker = Math.min(20, sellValue * 0.0003);
      brokerage = buyBroker + sellBroker;
    }
    exchangeTx = totalTurnover * 0.000026; // 0.0026%
    stt = sellValue * 0.0001; // CTT 0.01% on sell side
    stampDuty = buyValue * 0.00002; // 0.002% buy side
  } else if (segment === 'Currency') {
    // CDS charges (No STT)
    if (chargesConfig) {
      const buyBroker = Math.min(chargesConfig.futuresMaxFee || Infinity, buyValue * (chargesConfig.futuresRatePct / 100));
      const sellBroker = Math.min(chargesConfig.futuresMaxFee || Infinity, sellValue * (chargesConfig.futuresRatePct / 100));
      brokerage = buyBroker + sellBroker;
    } else {
      const buyBroker = Math.min(20, buyValue * 0.0003);
      const sellBroker = Math.min(20, sellValue * 0.0003);
      brokerage = buyBroker + sellBroker;
    }
    exchangeTx = totalTurnover * 0.000009; // 0.0009%
    stt = 0; 
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
