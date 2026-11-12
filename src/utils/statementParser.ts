import type { Trade, Segment, Product, Broker } from '../types';

interface RawExecution {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  symbol: string;
  action: 'BUY' | 'SELL';
  qty: number;
  price: number;
  brokerage: number;
  taxes: number;
  segment: Segment;
  product: Product;
}

export function parseKotakNeoText(text: string): RawExecution[] {
  const lines = text.split(/\r?\n/);
  const executions: RawExecution[] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Check if line starts with a date like DD/MM/YYYY
    const dateMatch = line.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (!dateMatch) continue;

    // Split by tabs or commas
    const parts = line.split(/\t|,/);
    if (parts.length < 11) continue;

    try {
      const day = dateMatch[1];
      const month = dateMatch[2];
      const year = dateMatch[3];
      const dateStr = `${year}-${month}-${day}`; // YYYY-MM-DD

      const rawTime = parts[1]?.trim() || '09:15:00';
      const timeStr = rawTime.substring(0, 5); // HH:MM

      // Security Name (Clean it)
      let rawSymbol = parts[3]?.trim() || 'Unknown';
      // Strip ISIN if present (usually looks like INE...)
      rawSymbol = rawSymbol.split(/\s+INE/)[0].trim();

      const rawAction = parts[7]?.trim().toUpperCase();
      const action: 'BUY' | 'SELL' = (rawAction === 'SELL' || rawAction === 'S') ? 'SELL' : 'BUY';

      const rawProduct = parts[8]?.trim().toUpperCase();
      const product: Product = rawProduct.includes('DELIVERY') || rawProduct.includes('CARRY') ? 'Delivery' : 'Intraday';

      const qty = parseFloat(parts[9]?.replace(/,/g, '') || '0');
      const price = parseFloat(parts[10]?.replace(/,/g, '') || '0');

      // Charges: GST (11), Brokerage (12), Misc (13), STT/CTT (15)
      const gst = parseFloat(parts[11]?.replace(/,/g, '') || '0') || 0;
      const brokerage = parseFloat(parts[12]?.replace(/,/g, '') || '0') || 0;
      const misc = parseFloat(parts[13]?.replace(/,/g, '') || '0') || 0;
      const stt = parseFloat(parts[15]?.replace(/,/g, '') || '0') || 0;

      const taxes = gst + misc + stt;

      // Detect Segment
      let segment: Segment = 'Equity';
      const symUpper = rawSymbol.toUpperCase();
      if (symUpper.includes('FUT') || symUpper.includes('CE') || symUpper.includes('PE') || /\d{2}[A-Z]{3}\d{2}/.test(symUpper)) {
        segment = 'F&O';
      }

      if (qty > 0 && price > 0) {
        executions.push({
          date: dateStr,
          time: timeStr,
          symbol: rawSymbol,
          action,
          qty,
          price,
          brokerage,
          taxes,
          segment,
          product
        });
      }
    } catch (err) {
      console.error('Failed to parse line:', line, err);
    }
  }

  // Sort executions chronologically (ascending)
  return executions.sort((a, b) => {
    const timeA = new Date(`${a.date}T${a.time}:00`).getTime();
    const timeB = new Date(`${b.date}T${b.time}:00`).getTime();
    return timeA - timeB;
  });
}

export function matchExecutionsIntoTrades(
  executions: RawExecution[],
  brokerName: Broker = 'Kotak Neo'
): Omit<Trade, 'id' | 'grossPnL' | 'brokerage' | 'taxes' | 'netPnL' | 'roi' | 'actualRR' | 'isExpiryDay' | 'durationMinutes'>[] {
  const trades: Omit<Trade, 'id' | 'grossPnL' | 'brokerage' | 'taxes' | 'netPnL' | 'roi' | 'actualRR' | 'isExpiryDay' | 'durationMinutes'>[] = [];
  
  // Pending buy executions queue grouped by symbol
  const pendingBuys: Record<string, RawExecution[]> = {};
  // Pending sell executions queue grouped by symbol (for short trades)
  const pendingSells: Record<string, RawExecution[]> = {};

  for (const exec of executions) {
    const symbol = exec.symbol;

    if (exec.action === 'BUY') {
      // Check if we have pending sells to cover (Short Trade cover)
      const sellQueue = pendingSells[symbol] || [];
      let remainingQty = exec.qty;

      while (sellQueue.length > 0 && remainingQty > 0) {
        const firstSell = sellQueue[0];
        const matchQty = Math.min(firstSell.qty, remainingQty);

        // Calculate proportional charges
        const propSellBrokerage = (firstSell.brokerage / firstSell.qty) * matchQty;
        const propSellTaxes = (firstSell.taxes / firstSell.qty) * matchQty;
        const propBuyBrokerage = (exec.brokerage / exec.qty) * matchQty;
        const propBuyTaxes = (exec.taxes / exec.qty) * matchQty;

        trades.push({
          date: firstSell.date,
          entryTime: firstSell.time,
          exitDate: exec.date,
          exitTime: exec.time,
          segment: exec.segment,
          product: exec.date === firstSell.date ? 'Intraday' : 'Delivery',
          action: 'SELL', // Short trade
          symbol,
          qty: matchQty,
          entryPrice: firstSell.price,
          exitPrice: exec.price,
          slippagePoints: 0,
          stopLoss: 0,
          target: 0,
          strategy: 'Auto Imported',
          rulesFollowed: [],
          emotion: 'Calm',
          mistake: 'None',
          notes: 'Auto matched short trade execution',
          useManualCharges: true,
          manualBrokerage: propSellBrokerage + propBuyBrokerage,
          manualTaxes: propSellTaxes + propBuyTaxes,
          broker: brokerName
        });

        firstSell.brokerage = Math.max(0, firstSell.brokerage - propSellBrokerage);
        firstSell.taxes = Math.max(0, firstSell.taxes - propSellTaxes);
        firstSell.qty -= matchQty;
        remainingQty -= matchQty;

        if (firstSell.qty <= 0) {
          sellQueue.shift();
        }
      }

      if (remainingQty > 0) {
        // Still have buy quantity, queue it with remaining charges
        const propRemBrokerage = exec.qty > 0 ? (exec.brokerage / exec.qty) * remainingQty : 0;
        const propRemTaxes = exec.qty > 0 ? (exec.taxes / exec.qty) * remainingQty : 0;
        if (!pendingBuys[symbol]) pendingBuys[symbol] = [];
        pendingBuys[symbol].push({ ...exec, qty: remainingQty, brokerage: propRemBrokerage, taxes: propRemTaxes });
      }
      pendingSells[symbol] = sellQueue;

    } else {
      // Action is SELL
      // Check if we have pending buys to cover (Long Trade exit)
      const buyQueue = pendingBuys[symbol] || [];
      let remainingQty = exec.qty;

      while (buyQueue.length > 0 && remainingQty > 0) {
        const firstBuy = buyQueue[0];
        const matchQty = Math.min(firstBuy.qty, remainingQty);

        // Calculate proportional charges
        const propBuyBrokerage = firstBuy.qty > 0 ? (firstBuy.brokerage / firstBuy.qty) * matchQty : 0;
        const propBuyTaxes = firstBuy.qty > 0 ? (firstBuy.taxes / firstBuy.qty) * matchQty : 0;
        const propSellBrokerage = exec.qty > 0 ? (exec.brokerage / exec.qty) * matchQty : 0;
        const propSellTaxes = exec.qty > 0 ? (exec.taxes / exec.qty) * matchQty : 0;

        trades.push({
          date: firstBuy.date,
          entryTime: firstBuy.time,
          exitDate: exec.date,
          exitTime: exec.time,
          segment: exec.segment,
          product: exec.date === firstBuy.date ? 'Intraday' : 'Delivery',
          action: 'BUY', // Long trade
          symbol,
          qty: matchQty,
          entryPrice: firstBuy.price,
          exitPrice: exec.price,
          slippagePoints: 0,
          stopLoss: 0,
          target: 0,
          strategy: 'Auto Imported',
          rulesFollowed: [],
          emotion: 'Calm',
          mistake: 'None',
          notes: 'Auto matched long trade execution',
          useManualCharges: true,
          manualBrokerage: propBuyBrokerage + propSellBrokerage,
          manualTaxes: propBuyTaxes + propSellTaxes,
          broker: brokerName
        });

        firstBuy.brokerage = Math.max(0, firstBuy.brokerage - propBuyBrokerage);
        firstBuy.taxes = Math.max(0, firstBuy.taxes - propBuyTaxes);
        firstBuy.qty -= matchQty;
        remainingQty -= matchQty;

        if (firstBuy.qty <= 0) {
          buyQueue.shift();
        }
      }

      if (remainingQty > 0) {
        // Still have sell quantity, queue it with remaining charges
        const propRemBrokerage = exec.qty > 0 ? (exec.brokerage / exec.qty) * remainingQty : 0;
        const propRemTaxes = exec.qty > 0 ? (exec.taxes / exec.qty) * remainingQty : 0;
        if (!pendingSells[symbol]) pendingSells[symbol] = [];
        pendingSells[symbol].push({ ...exec, qty: remainingQty, brokerage: propRemBrokerage, taxes: propRemTaxes });
      }
      pendingBuys[symbol] = buyQueue;
    }
  }

  // Handle remaining open positions as unmatched trades
  for (const symbol in pendingBuys) {
    for (const buy of pendingBuys[symbol]) {
      if (buy.qty <= 0) continue;
      trades.push({
        date: buy.date,
        entryTime: buy.time,
        exitDate: buy.date,
        exitTime: buy.time,
        segment: buy.segment,
        product: buy.product,
        action: 'BUY',
        symbol,
        qty: buy.qty,
        entryPrice: buy.price,
        exitPrice: buy.price, // Unmatched price is current
        slippagePoints: 0,
        stopLoss: 0,
        target: 0,
        strategy: 'Auto Imported',
        rulesFollowed: [],
        emotion: 'Calm',
        mistake: 'None',
        notes: 'Unmatched buy execution (Holding / Open Position)',
        useManualCharges: true,
        manualBrokerage: buy.brokerage,
        manualTaxes: buy.taxes,
        broker: brokerName
      });
    }
  }

  for (const symbol in pendingSells) {
    for (const sell of pendingSells[symbol]) {
      if (sell.qty <= 0) continue;
      trades.push({
        date: sell.date,
        entryTime: sell.time,
        exitDate: sell.date,
        exitTime: sell.time,
        segment: sell.segment,
        product: sell.product,
        action: 'SELL',
        symbol,
        qty: sell.qty,
        entryPrice: sell.price,
        exitPrice: sell.price, // Unmatched price is current
        slippagePoints: 0,
        stopLoss: 0,
        target: 0,
        strategy: 'Auto Imported',
        rulesFollowed: [],
        emotion: 'Calm',
        mistake: 'None',
        notes: 'Unmatched sell execution (Holding / Open Position)',
        useManualCharges: true,
        manualBrokerage: sell.brokerage,
        manualTaxes: sell.taxes,
        broker: brokerName
      });
    }
  }

  return trades;
}

/** Helper to parse CSV lines with quoted commas */
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

/** Standard date normalizer: converts DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD to YYYY-MM-DD */
function normalizeDateStr(dateRaw: string): string {
  const trimmed = dateRaw.trim();
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }
  const ymd = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymd) {
    const year = ymd[1];
    const month = ymd[2].padStart(2, '0');
    const day = ymd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return trimmed.slice(0, 10);
}

/**
 * Parses Zerodha Tradebook CSV (from Console / Kite)
 * Typical Headers: symbol, isin, trade_date, exchange, segment, series, trade_type, quantity, price, order_id, trade_id, order_execution_time
 */
export function parseZerodhaTradebook(csvText: string): RawExecution[] {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Find header index
  let headerIdx = -1;
  let headers: string[] = [];
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cols = parseCsvLine(lines[i]).map(c => c.toLowerCase().replace(/[\s_]/g, ''));
    if (cols.includes('symbol') && (cols.includes('tradedate') || cols.includes('date'))) {
      headerIdx = i;
      headers = cols;
      break;
    }
  }

  if (headerIdx === -1) {
    // Try fallback first line
    headers = parseCsvLine(lines[0]).map(c => c.toLowerCase().replace(/[\s_]/g, ''));
    headerIdx = 0;
  }

  const symIdx = headers.findIndex(h => h === 'symbol' || h === 'tradingsymbol');
  const dateIdx = headers.findIndex(h => h === 'tradedate' || h === 'date');
  const typeIdx = headers.findIndex(h => h === 'tradetype' || h === 'type' || h === 'buysell');
  const qtyIdx = headers.findIndex(h => h === 'quantity' || h === 'qty');
  const priceIdx = headers.findIndex(h => h === 'price' || h === 'tradeprice' || h === 'rate');
  const timeIdx = headers.findIndex(h => h === 'orderexecutiontime' || h === 'time' || h === 'executiontime');
  const segIdx = headers.findIndex(h => h === 'segment');

  const executions: RawExecution[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (row.length <= Math.max(symIdx, dateIdx, qtyIdx, priceIdx)) continue;

    const rawSymbol = row[symIdx]?.trim() || '';
    const rawDate = row[dateIdx]?.trim() || '';
    if (!rawSymbol || !rawDate) continue;

    const dateStr = normalizeDateStr(rawDate);
    if (!dateStr || dateStr.length < 10) continue;

    const rawAction = (row[typeIdx] || '').trim().toUpperCase();
    const action: 'BUY' | 'SELL' = (rawAction === 'SELL' || rawAction === 'S') ? 'SELL' : 'BUY';

    const qty = parseFloat(row[qtyIdx]?.replace(/,/g, '') || '0');
    const price = parseFloat(row[priceIdx]?.replace(/,/g, '') || '0');
    if (qty <= 0 || price <= 0) continue;

    let timeStr = '09:15';
    if (timeIdx !== -1 && row[timeIdx]) {
      const matchTime = row[timeIdx].match(/(\d{2}):(\d{2})/);
      if (matchTime) timeStr = `${matchTime[1]}:${matchTime[2]}`;
    }

    const symUpper = rawSymbol.toUpperCase();
    let segment: Segment = 'Equity';
    if (segIdx !== -1 && row[segIdx]?.toUpperCase().includes('FO')) {
      segment = 'F&O';
    } else if (symUpper.includes('FUT') || symUpper.includes('CE') || symUpper.includes('PE') || /\d{2}[A-Z]{3}/.test(symUpper)) {
      segment = 'F&O';
    }

    executions.push({
      date: dateStr,
      time: timeStr,
      symbol: rawSymbol,
      action,
      qty,
      price,
      brokerage: 0,
      taxes: 0,
      segment,
      product: 'Intraday'
    });
  }

  return executions.sort((a, b) => new Date(`${a.date}T${a.time}:00`).getTime() - new Date(`${b.date}T${b.time}:00`).getTime());
}

/**
 * Parses Dhan Tradebook CSV
 * Typical Headers: Trade Date, Exchange, Segment, Trading Symbol, Buy/Sell, Quantity, Price, Order ID, Trade ID
 */
export function parseDhanTradebook(csvText: string): RawExecution[] {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];

  let headerIdx = -1;
  let headers: string[] = [];
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cols = parseCsvLine(lines[i]).map(c => c.toLowerCase().replace(/[\s_/]/g, ''));
    if (cols.includes('tradingsymbol') || (cols.includes('symbol') && cols.includes('quantity'))) {
      headerIdx = i;
      headers = cols;
      break;
    }
  }

  if (headerIdx === -1) {
    headers = parseCsvLine(lines[0]).map(c => c.toLowerCase().replace(/[\s_/]/g, ''));
    headerIdx = 0;
  }

  const symIdx = headers.findIndex(h => h === 'tradingsymbol' || h === 'symbol' || h === 'scripname');
  const dateIdx = headers.findIndex(h => h === 'tradedate' || h === 'date');
  const typeIdx = headers.findIndex(h => h === 'buysell' || h === 'type' || h === 'action');
  const qtyIdx = headers.findIndex(h => h === 'quantity' || h === 'qty' || h === 'tradedqty');
  const priceIdx = headers.findIndex(h => h === 'price' || h === 'tradeprice' || h === 'avgprice');
  const segIdx = headers.findIndex(h => h === 'segment');
  const timeIdx = headers.findIndex(h => h === 'tradetime' || h === 'time' || h === 'executiontime');

  const executions: RawExecution[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    if (row.length <= Math.max(symIdx, dateIdx, qtyIdx, priceIdx)) continue;

    const rawSymbol = row[symIdx]?.trim() || '';
    const rawDate = row[dateIdx]?.trim() || '';
    if (!rawSymbol || !rawDate) continue;

    const dateStr = normalizeDateStr(rawDate);
    if (!dateStr || dateStr.length < 10) continue;

    const rawAction = (row[typeIdx] || '').trim().toUpperCase();
    const action: 'BUY' | 'SELL' = (rawAction === 'SELL' || rawAction === 'S') ? 'SELL' : 'BUY';

    const qty = parseFloat(row[qtyIdx]?.replace(/,/g, '') || '0');
    const price = parseFloat(row[priceIdx]?.replace(/,/g, '') || '0');
    if (qty <= 0 || price <= 0) continue;

    let timeStr = '09:15';
    if (timeIdx !== -1 && row[timeIdx]) {
      const matchTime = row[timeIdx].match(/(\d{2}):(\d{2})/);
      if (matchTime) timeStr = `${matchTime[1]}:${matchTime[2]}`;
    }

    const symUpper = rawSymbol.toUpperCase();
    let segment: Segment = 'Equity';
    if (segIdx !== -1 && (row[segIdx]?.toUpperCase().includes('F&O') || row[segIdx]?.toUpperCase().includes('OPTION') || row[segIdx]?.toUpperCase().includes('FUT'))) {
      segment = 'F&O';
    } else if (symUpper.includes('FUT') || symUpper.includes('CE') || symUpper.includes('PE') || /\d{2}[A-Z]{3}/.test(symUpper)) {
      segment = 'F&O';
    }

    executions.push({
      date: dateStr,
      time: timeStr,
      symbol: rawSymbol,
      action,
      qty,
      price,
      brokerage: 0,
      taxes: 0,
      segment,
      product: 'Intraday'
    });
  }

  return executions.sort((a, b) => new Date(`${a.date}T${a.time}:00`).getTime() - new Date(`${b.date}T${b.time}:00`).getTime());
}
