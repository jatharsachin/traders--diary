import type { Trade, Segment, Product, TradeAction } from '../types';
import { calculateIndianTaxesAndBrokerage } from './taxEngine';

export interface DhanCredentials {
  clientId: string;
  accessToken: string;
}

export interface DhanFundLimit {
  availabelBalance: number;
  sodLimit: number;
  utilizedAmount: number;
  withdrawableBalance: number;
}

export interface DhanRawTrade {
  dhanClientId: string;
  orderId: string;
  exchangeOrderId?: string;
  exchangeTradeId?: string;
  transactionType: 'BUY' | 'SELL';
  exchangeSegment: string;
  productType: string;
  tradingSymbol: string;
  customSymbol?: string;
  securityId?: string;
  tradedQuantity: number;
  tradedPrice: number;
  createTime: string;
  updateTime?: string;
  exchangeTime?: string;
  drvExpiryDate?: string;
  drvOptionType?: string;
  drvStrikePrice?: number;
}

export interface PairedDhanTrade {
  id: string;
  symbol: string;
  segment: Segment;
  product: Product;
  action: TradeAction;
  entryDate: string;
  exitDate: string;
  entryTime: string;
  exitTime: string;
  qty: number;
  entryPrice: number;
  exitPrice: number;
  grossPnL: number;
  netPnL: number;
  brokerage: number;
  taxes: number;
  status: 'COMPLETED' | 'OPEN';
  isDuplicate: boolean;
  dhanTradeIds: string[];
  rawTrades: DhanRawTrade[];
  strikePrice?: number;
  optionType?: 'CE' | 'PE' | 'None';
  expiryDate?: string;
}

const DHAN_API_BASE = 'https://api.dhan.co/v2';

/**
 * Robust fetch wrapper that tries direct Dhan API first, then falls back to CORS proxy if needed.
 * Strictly performs ONLY 'GET' requests.
 */
async function dhanGetRequest<T>(endpoint: string, creds: DhanCredentials): Promise<T> {
  const cleanToken = creds.accessToken.trim();
  const cleanClientId = creds.clientId.trim();

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'access-token': cleanToken,
    'client-id': cleanClientId,
  };

  // Try dev/local proxy first (bypasses browser CORS), then direct endpoint
  const candidateUrls = [
    `/dhan-api${endpoint}`,
    `${DHAN_API_BASE}${endpoint}`,
  ];

  let lastErrorMsg = '';

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (res.ok) {
        return await res.json();
      }

      // Parse detailed error from Dhan API response
      try {
        const errorJson = await res.json();
        if (errorJson && (errorJson.errorMessage || errorJson.message || errorJson.errorType)) {
          lastErrorMsg = errorJson.errorMessage || errorJson.message || `Dhan Error: ${errorJson.errorType} (${errorJson.errorCode || res.status})`;
          throw new Error(`Dhan: ${lastErrorMsg}`);
        }
      } catch (jsonErr: any) {
        if (jsonErr.message && jsonErr.message.startsWith('Dhan:')) {
          throw jsonErr;
        }
      }

      if (res.status === 401 || res.status === 403) {
        throw new Error('Dhan: Client ID or Access Token is invalid or expired. Please generate a fresh token from web.dhan.co.');
      }
    } catch (err: any) {
      if (err.message && err.message.startsWith('Dhan:')) {
        throw err;
      }
      lastErrorMsg = err.message || '';
    }
  }

  throw new Error(lastErrorMsg || 'Unable to connect to Dhan API. Please check your Access Token or network.');
}

/**
 * 1. Verify Dhan Credentials & Live Margin Balance (Read-Only)
 */
export async function testDhanConnection(creds: DhanCredentials): Promise<DhanFundLimit> {
  if (!creds.clientId || !creds.accessToken) {
    throw new Error('Please enter both Dhan Client ID and Access Token.');
  }
  const data = await dhanGetRequest<any>('/fundlimit', creds);
  return {
    availabelBalance: Number(data.availabelBalance || data.sodLimit || 0),
    sodLimit: Number(data.sodLimit || 0),
    utilizedAmount: Number(data.utilizedAmount || 0),
    withdrawableBalance: Number(data.withdrawableBalance || data.availabelBalance || 0),
  };
}

/**
 * 2. Fetch Raw Executed Trades from Dhan (Read-Only)
 */
export async function fetchDhanRawTrades(
  creds: DhanCredentials, 
  fromDate?: string, 
  toDate?: string
): Promise<DhanRawTrade[]> {
  if (!fromDate || !toDate || fromDate === toDate) {
    // Fetch today's trades
    try {
      const todayData = await dhanGetRequest<any>('/trades', creds);
      return Array.isArray(todayData) ? todayData : [];
    } catch (err) {
      // Try date range if /trades is empty
    }
  }

  const start = fromDate || new Date().toISOString().split('T')[0];
  const end = toDate || start;
  const endpoint = `/trades/${start}/${end}/0`;
  const rangeData = await dhanGetRequest<any>(endpoint, creds);
  return Array.isArray(rangeData) ? rangeData : [];
}

/**
 * Helper to identify Segment from Dhan exchangeSegment
 */
function parseDhanSegment(exchangeSegment: string, symbol: string): Segment {
  const seg = (exchangeSegment || '').toUpperCase();
  if (seg.includes('MCX') || seg.includes('COMMODITY')) return 'COMMODITY';
  if (seg.includes('CUR') || seg.includes('CURRENCY') || seg.includes('CDS')) return 'CURRENCY';
  if (seg.includes('FNO') || seg.includes('FO') || seg.includes('NFO') || seg.includes('BFO')) return 'F&O';
  if (/CE|PE|FUT/i.test(symbol)) return 'F&O';
  return 'EQUITY';
}

/**
 * Helper to parse Option details from Dhan tradingSymbol
 */
function parseOptionDetails(symbol: string, rawStrike?: number, rawOptType?: string) {
  let isOption = false;
  let strikePrice = rawStrike || 0;
  let optionType: 'CE' | 'PE' | 'None' = (rawOptType === 'CALL' ? 'CE' : rawOptType === 'PUT' ? 'PE' : 'None');

  const match = symbol.match(/(\d+(?:\.\d+)?)\s*(CE|PE|CALL|PUT)/i);
  if (match) {
    isOption = true;
    strikePrice = parseFloat(match[1]);
    optionType = match[2].toUpperCase().startsWith('C') ? 'CE' : 'PE';
  } else if (/CE|PE/i.test(symbol)) {
    isOption = true;
    optionType = /CE/i.test(symbol) ? 'CE' : 'PE';
  }

  return { isOption, strikePrice, optionType };
}

/**
 * Helper to format timestamp into YYYY-MM-DD and HH:MM
 */
function parseDhanTime(timeStr: string) {
  if (!timeStr) {
    const now = new Date();
    return {
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    };
  }
  // Dhan time format: "2024-10-24 09:35:12" or ISO
  const parts = timeStr.trim().split(/[\sT]+/);
  const date = parts[0] || new Date().toISOString().split('T')[0];
  const time = (parts[1] || '09:15:00').substring(0, 5);
  return { date, time };
}

/**
 * 3. Smart Matching: Pairs Buy & Sell legs into completed Trade records
 *    and detects duplicates against existing diary trades.
 */
export function pairDhanTrades(
  rawTrades: DhanRawTrade[],
  existingTrades: Trade[],
  brokerAccountId?: string
): PairedDhanTrade[] {
  if (!rawTrades || rawTrades.length === 0) return [];

  // Group raw trades by symbol
  const symbolMap: Record<string, DhanRawTrade[]> = {};
  rawTrades.forEach((rt) => {
    const sym = rt.tradingSymbol || rt.customSymbol || 'UNKNOWN';
    if (!symbolMap[sym]) symbolMap[sym] = [];
    symbolMap[sym].push(rt);
  });

  const pairedList: PairedDhanTrade[] = [];

  Object.entries(symbolMap).forEach(([symbol, legs]) => {
    // Sort legs chronologically
    legs.sort((a, b) => {
      const timeA = new Date(a.exchangeTime || a.createTime || 0).getTime();
      const timeB = new Date(b.exchangeTime || b.createTime || 0).getTime();
      return timeA - timeB;
    });

    const buyLegs = legs.filter((l) => l.transactionType === 'BUY');
    const sellLegs = legs.filter((l) => l.transactionType === 'SELL');

    const totalBuyQty = buyLegs.reduce((sum, l) => sum + Number(l.tradedQuantity || 0), 0);
    const totalSellQty = sellLegs.reduce((sum, l) => sum + Number(l.tradedQuantity || 0), 0);

    const pairedQty = Math.min(totalBuyQty, totalSellQty);

    if (pairedQty > 0) {
      // Calculate Weighted Average Buy & Sell Prices
      const buyCost = buyLegs.reduce((sum, l) => sum + (Number(l.tradedQuantity) * Number(l.tradedPrice)), 0);
      const sellValue = sellLegs.reduce((sum, l) => sum + (Number(l.tradedQuantity) * Number(l.tradedPrice)), 0);

      const avgBuyPrice = totalBuyQty > 0 ? buyCost / totalBuyQty : 0;
      const avgSellPrice = totalSellQty > 0 ? sellValue / totalSellQty : 0;

      // Determine Action (Long vs Short) based on first leg
      const firstLeg = legs[0];
      const isLong = firstLeg.transactionType === 'BUY';

      const entryPrice = isLong ? avgBuyPrice : avgSellPrice;
      const exitPrice = isLong ? avgSellPrice : avgBuyPrice;
      const action: TradeAction = isLong ? 'BUY' : 'SELL';

      const firstTime = parseDhanTime(firstLeg.exchangeTime || firstLeg.createTime);
      const lastLeg = legs[legs.length - 1];
      const lastTime = parseDhanTime(lastLeg.exchangeTime || lastLeg.createTime);

      const segment = parseDhanSegment(firstLeg.exchangeSegment, symbol);
      const product: Product = (firstLeg.productType || '').toUpperCase().includes('CNC') ? 'CNC' : 'MIS';

      const { isOption, strikePrice, optionType } = parseOptionDetails(
        symbol, 
        firstLeg.drvStrikePrice, 
        firstLeg.drvOptionType
      );

      // Statutory Taxes & Dhan Brokerage (₹20 per executed order)
      const taxResult = calculateIndianTaxesAndBrokerage(
        segment,
        product,
        action,
        pairedQty,
        entryPrice,
        exitPrice,
        {
          brokeragePerTrade: 20, // Dhan standard ₹20 per trade for F&O / Intraday
          brokerageType: 'FLAT',
          sttRate: 0.1,
          exchangeTxRate: 0.05,
          gstRate: 18,
          sebiChargesRate: 0.0001,
          stampDutyRate: 0.003
        },
        isOption,
        undefined,
        undefined,
        symbol
      );

      const grossPnL = isLong
        ? (exitPrice - entryPrice) * pairedQty
        : (entryPrice - exitPrice) * pairedQty;

      const netPnL = grossPnL - taxResult.totalCharges;

      const dhanTradeIds = legs.map((l) => l.exchangeTradeId || l.orderId).filter(Boolean);

      // Duplicate Check against existing diary trades
      const isDuplicate = existingTrades.some((et) => {
        // Check if trade notes or tag has dhan trade id
        if (et.notes && dhanTradeIds.some((id) => et.notes.includes(id))) {
          return true;
        }
        // Match exact symbol, exitDate/date, pairedQty, and close entry/exit price within ₹0.5
        const sameSymbol = et.symbol.toUpperCase() === symbol.toUpperCase();
        const sameDate = (et.exitDate || et.date) === lastTime.date;
        const sameQty = Number(et.qty) === pairedQty;
        const samePrice = Math.abs(et.entryPrice - entryPrice) < 0.5 && Math.abs(et.exitPrice - exitPrice) < 0.5;

        return sameSymbol && sameDate && sameQty && samePrice;
      });

      pairedList.push({
        id: `dhan_${dhanTradeIds.join('_') || Date.now()}`,
        symbol,
        segment,
        product,
        action,
        entryDate: firstTime.date,
        exitDate: lastTime.date,
        entryTime: firstTime.time,
        exitTime: lastTime.time,
        qty: pairedQty,
        entryPrice: Math.round(entryPrice * 100) / 100,
        exitPrice: Math.round(exitPrice * 100) / 100,
        grossPnL: Math.round(grossPnL * 100) / 100,
        netPnL: Math.round(netPnL * 100) / 100,
        brokerage: Math.round(taxResult.brokerage * 100) / 100,
        taxes: Math.round((taxResult.totalCharges - taxResult.brokerage) * 100) / 100,
        status: 'COMPLETED',
        isDuplicate,
        dhanTradeIds,
        rawTrades: legs,
        strikePrice: strikePrice > 0 ? strikePrice : undefined,
        optionType: optionType !== 'None' ? optionType : undefined,
        expiryDate: firstLeg.drvExpiryDate,
      });
    }
  });

  return pairedList;
}

/**
 * Converts a PairedDhanTrade into a full Trader's Diary `Trade` object
 */
export function convertDhanToDiaryTrade(
  dhanTrade: PairedDhanTrade,
  brokerAccountId: string
): Omit<Trade, 'id'> {
  return {
    symbol: dhanTrade.symbol,
    segment: dhanTrade.segment,
    product: dhanTrade.product,
    action: dhanTrade.action,
    date: dhanTrade.entryDate,
    exitDate: dhanTrade.exitDate,
    entryTime: dhanTrade.entryTime,
    exitTime: dhanTrade.exitTime,
    qty: dhanTrade.qty,
    entryPrice: dhanTrade.entryPrice,
    exitPrice: dhanTrade.exitPrice,
    stopLoss: 0,
    target: 0,
    grossPnL: dhanTrade.grossPnL,
    netPnL: dhanTrade.netPnL,
    brokerage: dhanTrade.brokerage,
    taxes: dhanTrade.taxes,
    emotion: 'Disciplined',
    setup: 'Dhan Auto-Sync',
    notes: `Imported via Dhan Direct Connect. Trade IDs: ${dhanTrade.dhanTradeIds.join(', ')}`,
    status: 'COMPLETED',
    broker: 'Dhan',
    brokerAccountId: brokerAccountId || 'Combined',
    strikePrice: dhanTrade.strikePrice,
    optionType: dhanTrade.optionType,
    expiryDate: dhanTrade.expiryDate,
  };
}
