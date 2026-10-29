import { useState, useEffect } from 'react';
import { formatTimeToAMPM, getFinancialYear } from '../utils/fyHelper';
import { groupHedgedTrades } from '../utils/tradeGrouping';
import { useTradeStore } from '../store/useTradeStore';
import { 
  CalendarRange, Calendar, Printer, Eye, EyeOff, Edit2, ArrowUpDown, BookOpenCheck
} from 'lucide-react';

interface DayBookProps {
  activeAccountId?: string;
  onOpenDailyNotes?: (date: string) => void;
}

export function DayBook({ activeAccountId = 'Combined', onOpenDailyNotes }: DayBookProps) {
  const { 
    trades: allTrades, 
    capitalAdjustments: allAdjustments, 
    brokerAccounts, 
    isPnlVisible,
    togglePnlVisibility,
    selectedFY,
    investments: allInvestments
  } = useTradeStore();

  const todayStr = new Date().toISOString().split('T')[0];
  // Default to past 30 days (1 month) range
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(oneMonthAgoStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedPreset, setSelectedPreset] = useState<string>('30days');
  const [sortAscending, setSortAscending] = useState(false);
  const [showRunningBalance, setShowRunningBalance] = useState(true);

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');



  const { minDate, maxDate } = (() => {
    if (selectedFY && selectedFY !== 'All') {
      const match = selectedFY.match(/FY (\d{4})/);
      if (match) {
        const startYear = parseInt(match[1], 10);
        const endYear = startYear + 1;
        return {
          minDate: `${startYear}-04-01`,
          maxDate: `${endYear}-03-31`
        };
      }
    }
    return { minDate: undefined, maxDate: undefined };
  })();

  // Synchronize date limits with selected FY
  useEffect(() => {
    if (minDate && maxDate) {
      if (startDate < minDate || startDate > maxDate) {
        setStartDate(minDate);
      }
      if (endDate < minDate || endDate > maxDate) {
        setEndDate(todayStr <= maxDate && todayStr >= minDate ? todayStr : maxDate);
      }
    }
  }, [selectedFY, minDate, maxDate]);

  const handleQuickRange = (range: string) => {
    setSelectedPreset(range);
    if (range === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (range === '30days') {
      setStartDate(oneMonthAgoStr);
      setEndDate(todayStr);
    } else if (range === 'month') {
      const now = new Date();
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (range === 'fy') {
      if (minDate && maxDate) {
        setStartDate(minDate);
        setEndDate(todayStr <= maxDate && todayStr >= minDate ? todayStr : maxDate);
      }
    }
  };
  
  // Inline editing states for narration/particulars
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotesText, setEditNotesText] = useState('');

  const handleSaveNotes = (id: string, type: 'TRADE' | 'DEPOSIT' | 'WITHDRAWAL') => {
    const isLocked = (dateStr: string) => {
      const fy = getFinancialYear(dateStr);
      return useTradeStore.getState().lockedFYs.includes(fy);
    };

    if (type === 'TRADE') {
      const t = allTrades.find(x => x.id === id);
      if (t && isLocked(t.date)) {
        alert("Cannot edit trade notes: The financial year is locked.");
        return;
      }
      useTradeStore.getState().editTrade(id, { notes: editNotesText });
    } else {
      const a = allAdjustments.find(x => x.id === id);
      if (a && isLocked(a.date)) {
        alert("Cannot edit adjustment notes: The financial year is locked.");
        return;
      }
      useTradeStore.getState().editCapitalAdjustment(id, editNotesText);
    }
    setEditingId(null);
  };

  const isMatchAccount = (accId?: string, brokerName?: string) => {
    if (activeAccountId === 'Combined' || !activeAccountId) return true;
    const targetIds = activeAccountId.split(',').filter(Boolean);
    if (accId && targetIds.includes(accId)) return true;
    if (brokerName) {
      const selectedAccs = brokerAccounts.filter(a => targetIds.includes(a.id));
      return selectedAccs.some(a => (a.broker || '').toLowerCase() === (brokerName || '').toLowerCase());
    }
    return false;
  };

  // Scoped trades, adjustments, and investments
  const trades = activeAccountId === 'Combined' 
    ? allTrades 
    : allTrades.filter(t => isMatchAccount(t.brokerAccountId, t.broker));
  
  const adjustments = activeAccountId === 'Combined' 
    ? allAdjustments 
    : allAdjustments.filter(a => isMatchAccount(a.brokerAccountId));

  const investments = activeAccountId === 'Combined' 
    ? allInvestments 
    : allInvestments.filter(i => isMatchAccount(i.brokerAccountId, i.broker));

  // Range filtered trades, adjustments, and investments
  const rangeTrades = trades.filter(t => {
    const d = t.exitDate || t.date;
    return d >= startDate && d <= endDate;
  });
  const rangeAdjustments = adjustments.filter(a => a.date >= startDate && a.date <= endDate);

  // Calculate opening balance at startDate
  const getOpeningBalance = () => {
    const startCap = activeAccountId === 'Combined'
      ? brokerAccounts.reduce((sum, a) => sum + a.startingCapital, 0)
      : (brokerAccounts.find(a => a.id === activeAccountId)?.startingCapital || 0);

    const priorTrades = trades.filter(t => (t.exitDate || t.date) < startDate);
    const priorPnL = priorTrades.reduce((sum, t) => sum + t.netPnL, 0);

    const priorAdjustments = adjustments.filter(a => a.date < startDate);
    const priorAdjSum = priorAdjustments.reduce((sum, a) => a.type === 'DEPOSIT' ? sum + a.amount : sum - a.amount, 0);

    const priorInvPurchases = investments.filter(i => i.date < startDate);
    const priorInvPurchasesSum = priorInvPurchases.reduce((sum, i) => sum + (i.qty * i.buyPrice), 0);

    const priorInvExits = investments.filter(i => i.status === 'EXITED' && i.exitDate && i.exitDate < startDate && i.exitPrice);
    const priorInvExitsSum = priorInvExits.reduce((sum, i) => sum + (i.qty * i.exitPrice!), 0);

    return startCap + priorPnL + priorAdjSum - priorInvPurchasesSum + priorInvExitsSum;
  };

  const openingBalance = getOpeningBalance();

  // Combine trades and adjustments into chronological items
  const tradeItems = rangeTrades.map(t => {
    const isOption = t.optionType === 'CE' || t.optionType === 'PE' || /\b(CE|PE)\b/.test(t.symbol);
    const isFuture = t.segment === 'F&O' && !isOption;
    const typeLabel = isOption 
      ? 'Options' 
      : isFuture 
        ? 'Futures' 
        : 'Equity';
    return {
      id: t.id,
      date: t.exitDate || t.date,
      time: t.exitTime || t.entryTime,
      type: 'TRADE' as const,
      label: t.action,
      typeLabel,
      symbol: t.symbol,
      qty: t.qty,
      entryPrice: t.entryPrice,
      strategy: t.strategy || 'None',
      mistake: t.mistake || 'None',
      title: `[${typeLabel} Trade] ${t.action} ${t.symbol}`,
      description: t.notes && t.notes.trim() 
        ? t.notes.trim() 
        : `Qty: ${t.qty} @ Entry: ₹${t.entryPrice} | Setup: ${t.strategy || 'None'} | Mistakes: ${t.mistake || 'None'}`,
      amount: t.netPnL,
      charges: t.brokerage + t.taxes,
      isCredit: t.netPnL >= 0,
      broker: t.broker,
      rawNotes: t.notes || '',
      isInvestment: false,
      entryTime: t.entryTime,
      exitTime: t.exitTime
    };
  });

  const adjItems = rangeAdjustments.map(a => {
    const isBank = !!a.bankAccountId;
    const flowLabel = a.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal';
    const sourceLabel = isBank ? 'Bank' : 'Broker';
    return {
      id: a.id,
      date: a.date,
      time: a.time,
      type: a.type === 'DEPOSIT' ? ('DEPOSIT' as const) : ('WITHDRAWAL' as const),
      label: a.type,
      flowLabel,
      sourceLabel,
      title: `[${sourceLabel} ${flowLabel}] Capital Flow [${a.broker || 'Other'}]`,
      description: a.notes && a.notes.trim() 
        ? a.notes.trim() 
        : `Transfer Amount: ₹${a.amount} via ${a.broker || 'System'}`,
      amount: a.type === 'DEPOSIT' ? a.amount : -a.amount,
      charges: 0,
      isCredit: a.type === 'DEPOSIT',
      broker: a.broker || 'System',
      rawNotes: a.notes || '',
      isInvestment: false,
      entryTime: undefined,
      exitTime: undefined
    };
  });

  const rangeInvPurchases = investments.filter(i => i.date >= startDate && i.date <= endDate);
  const rangeInvExits = investments.filter(i => i.status === 'EXITED' && i.exitDate && i.exitDate >= startDate && i.exitDate <= endDate && i.exitPrice);

  const invPurchaseItems = rangeInvPurchases.map(i => ({
    id: `${i.id}-buy`,
    date: i.date,
    time: '09:15',
    type: 'WITHDRAWAL' as const,
    label: 'WITHDRAWAL' as const,
    flowLabel: 'Invested',
    sourceLabel: 'Broker',
    title: `[Broker Invested] Purchase ${i.qty} units of ${i.symbol} (${i.type})`,
    description: i.notes && i.notes.trim() 
      ? i.notes.trim() 
      : `Purchase of ${i.qty} units of ${i.symbol} @ Buy Avg: ₹${i.buyPrice}`,
    amount: -i.qty * i.buyPrice,
    charges: 0,
    isCredit: false,
    broker: i.broker || 'System',
    rawNotes: i.notes || '',
    isInvestment: true,
    entryTime: undefined,
    exitTime: undefined
  }));

  const invExitItems = rangeInvExits.map(i => ({
    id: `${i.id}-sell`,
    date: i.exitDate!,
    time: '15:30',
    type: 'DEPOSIT' as const,
    label: 'DEPOSIT' as const,
    flowLabel: 'Investment Exit',
    sourceLabel: 'Broker',
    title: `[Broker Investment Exit] Sold ${i.qty} units of ${i.symbol} (${i.type})`,
    description: `Sold ${i.qty} units of ${i.symbol} @ Sell Avg: ₹${i.exitPrice}`,
    amount: i.qty * i.exitPrice!,
    charges: 0,
    isCredit: true,
    broker: i.broker || 'System',
    rawNotes: '',
    isInvestment: true,
    entryTime: undefined,
    exitTime: undefined
  }));

  // Chronological sort
  const timelineItems = [...tradeItems, ...adjItems, ...invPurchaseItems, ...invExitItems].sort((a, b) => {
    const dComp = a.date.localeCompare(b.date);
    if (dComp !== 0) return dComp;
    return a.time.localeCompare(b.time);
  });

  // Calculate pre-running balances Chronologically
  let currentBal = openingBalance;
  const timelineItemsWithBal = timelineItems.map(item => {
    currentBal += item.amount;
    return {
      ...item,
      runningBalance: currentBal
    };
  });

  // Grouped by Date structure
  const groupedTimeline = (() => {
    const groups: Record<string, {
      date: string;
      items: typeof timelineItemsWithBal;
      netPnL: number;
      debit: number;
      credit: number;
      lastRunningBalance: number;
    }> = {};

    timelineItemsWithBal.forEach(item => {
      if (!groups[item.date]) {
        groups[item.date] = {
          date: item.date,
          items: [],
          netPnL: 0,
          debit: 0,
          credit: 0,
          lastRunningBalance: 0
        };
      }
      groups[item.date].items.push(item);
      if (item.amount < 0) {
        groups[item.date].debit += item.amount;
      } else {
        groups[item.date].credit += item.amount;
      }
      groups[item.date].netPnL += item.amount;
      groups[item.date].lastRunningBalance = item.runningBalance;
    });

    const groupsArray = Object.values(groups);
    if (sortOrder === 'DESC') {
      const sorted = groupsArray.sort((a, b) => b.date.localeCompare(a.date));
      sorted.forEach(g => {
        g.items = [...g.items].reverse();
      });
      return sorted;
    } else {
      return groupsArray.sort((a, b) => a.date.localeCompare(b.date));
    }
  })();



  // KPI Calculations
  const totalTradesCount = rangeTrades.length;
  const winTradesCount = rangeTrades.filter(t => t.netPnL > 0).length;
  const winRate = totalTradesCount > 0 ? (winTradesCount / totalTradesCount) * 100 : 0;
  
  const netPnL = rangeTrades.reduce((sum, t) => sum + t.netPnL, 0);
  const totalBrokerage = rangeTrades.reduce((sum, t) => sum + t.brokerage, 0);
  const totalTaxes = rangeTrades.reduce((sum, t) => sum + t.taxes, 0);

  const totalDeposits = rangeAdjustments.filter(a => a.type === 'DEPOSIT').reduce((sum, a) => sum + a.amount, 0);
  const totalWithdrawals = rangeAdjustments.filter(a => a.type === 'WITHDRAWAL').reduce((sum, a) => sum + a.amount, 0);
  
  const netFlow = totalDeposits - totalWithdrawals;
  const endingBalance = openingBalance + netPnL + netFlow;
  const totalCredits = totalDeposits + rangeTrades.filter(t => t.netPnL > 0).reduce((sum, t) => sum + t.netPnL, 0);
  const totalDebits = totalWithdrawals + rangeTrades.filter(t => t.netPnL < 0).reduce((sum, t) => sum + Math.abs(t.netPnL), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const getRelativeDayLabel = (dateStr: string) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (dateStr === todayStr) return 'Today';

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (dateStr === yesterdayStr) return 'Yesterday';

    return null;
  };

  const formatGroupDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const handlePrintDayBook = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Group paired hedge legs into unified positions for printing
    const groupedPositions = groupHedgedTrades(rangeTrades);

    const printTradeItems = groupedPositions.map(pos => {
      if (pos.isHedgedSpread && pos.leg2) {
        const leg1 = pos.leg1;
        const leg2 = pos.leg2;
        const exitTime = leg1.exitTime || leg2.exitTime;
        const entryTime = leg1.entryTime || leg2.entryTime;
        const isCredit = pos.combinedNetPnL >= 0;

        // Clean note without duplicate hedge leg annotations
        const noteClean = pos.notes ? pos.notes.trim() : '';
        const legBreakdown = `Leg 1: ${leg1.action} ${leg1.symbol} (${leg1.netPnL >= 0 ? '+' : ''}${formatCurrency(leg1.netPnL)}) | Leg 2: ${leg2.action} ${leg2.symbol} (${leg2.netPnL >= 0 ? '+' : ''}${formatCurrency(leg2.netPnL)})`;
        const description = noteClean 
          ? `${noteClean}<div style="font-size:9.5px; color:#718096; margin-top:2px;">${legBreakdown}</div>` 
          : `<div style="font-size:9.5px; color:#718096;">${legBreakdown}</div>`;

        return {
          id: pos.id,
          date: pos.date,
          time: exitTime || entryTime || '09:15',
          type: 'TRADE' as const,
          label: 'HEDGED SPREAD',
          typeLabel: 'Hedged Spread',
          symbol: `${leg1.symbol} + ${leg2.symbol}`,
          title: `[Hedged Spread] ${leg1.action} ${leg1.symbol} + ${leg2.action} ${leg2.symbol}`,
          description,
          amount: pos.combinedNetPnL,
          charges: (leg1.brokerage + leg1.taxes) + (leg2.brokerage + leg2.taxes),
          isCredit,
          broker: pos.broker || leg1.broker,
          entryTime,
          exitTime
        };
      }

      const t = pos.leg1;
      const isOption = t.optionType === 'CE' || t.optionType === 'PE' || /\b(CE|PE)\b/.test(t.symbol);
      const isFuture = t.segment === 'F&O' && !isOption;
      const typeLabel = isOption ? 'Options' : isFuture ? 'Futures' : 'Equity';
      return {
        id: t.id,
        date: t.exitDate || t.date,
        time: t.exitTime || t.entryTime || '09:15',
        type: 'TRADE' as const,
        label: t.action,
        typeLabel,
        symbol: t.symbol,
        qty: t.qty,
        entryPrice: t.entryPrice,
        strategy: t.strategy || 'None',
        mistake: t.mistake || 'None',
        title: `[${typeLabel} Trade] ${t.action} ${t.symbol}`,
        description: t.notes && t.notes.trim() 
          ? t.notes.trim() 
          : `Qty: ${t.qty} @ Entry: ₹${t.entryPrice} | Setup: ${t.strategy || 'None'} | Mistakes: ${t.mistake || 'None'}`,
        amount: t.netPnL,
        charges: t.brokerage + t.taxes,
        isCredit: t.netPnL >= 0,
        broker: t.broker,
        rawNotes: t.notes || '',
        isInvestment: false,
        entryTime: t.entryTime,
        exitTime: t.exitTime
      };
    });

    // Chronological sort for printing
    const printTimelineItems = [...printTradeItems, ...adjItems, ...invPurchaseItems, ...invExitItems].sort((a, b) => {
      const dComp = a.date.localeCompare(b.date);
      if (dComp !== 0) return dComp;
      return (a.time || '').localeCompare(b.time || '');
    });

    // Calculate running balance chronologically
    let bal = openingBalance;
    const printTimelineWithBal = printTimelineItems.map(item => {
      bal += item.amount;
      return {
        ...item,
        runningBalance: bal
      };
    });

    const sortedTimeline = sortOrder === 'DESC' 
      ? [...printTimelineWithBal].reverse() 
      : printTimelineWithBal;

    const tableRows = sortedTimeline.map((item) => {
      const isCredit = item.isCredit;
      const amountStr = formatCurrency(Math.abs(item.amount));
      const displayTime = item.type === 'TRADE' && item.exitTime
        ? `${formatTimeToAMPM(item.entryTime || item.time)} - ${formatTimeToAMPM(item.exitTime)}`
        : formatTimeToAMPM(item.time);
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px;">${item.date} <span style="color:#718096">${displayTime}</span></td>
          <td style="padding: 6px;"><strong>${item.title}</strong><div style="font-size:10px; color:#718096">${item.description}</div></td>
          <td style="padding: 6px; text-align: right; color: ${!isCredit ? '#e53e3e' : '#718096'}">${!isCredit ? '-' + amountStr : '-'}</td>
          <td style="padding: 6px; text-align: right; color: ${isCredit ? '#38a169' : '#718096'}">${isCredit ? '+' + amountStr : '-'}</td>
          <td style="padding: 6px; text-align: right; font-weight: 700;">${formatCurrency(item.runningBalance)}</td>
        </tr>
      `;
    }).join('');

    const openingBalRow = `
      <tr style="background:#f7fafc; font-size:11px; font-weight:700;">
        <td style="padding: 6px;">${startDate}</td>
        <td style="padding: 6px;">Opening Balance Carry-Forward</td>
        <td style="text-align: right; padding: 6px;">-</td>
        <td style="text-align: right; padding: 6px;">-</td>
        <td style="text-align: right; padding: 6px;">${formatCurrency(openingBalance)}</td>
      </tr>
    `;

    const printBodyContent = sortOrder === 'DESC' 
      ? `${tableRows}${openingBalRow}`
      : `${openingBalRow}${tableRows}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>TradeDiary Pro - Day Book Statement</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #2d3748; padding: 20px; }
            .header { border-bottom: 2px solid #2b6cb0; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: 800; color: #2b6cb0; margin: 0; }
            .meta { font-size: 11px; color: #718096; margin-top: 4px; }
            .summary-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .summary-table td { padding: 6px; border: 1px solid #cbd5e0; font-size: 11px; }
            .ledger-table { width: 100%; border-collapse: collapse; }
            .ledger-table th { background: #edf2f7; padding: 8px 6px; border: 1px solid #cbd5e0; font-size: 11px; text-align: left; }
            .ledger-table td { border: 1px solid #cbd5e0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">DAY BOOK LEDGER STATEMENT</h1>
            <div class="meta">
              Scope: <strong>${activeAccountId === 'Combined' ? 'Combined Portfolio' : activeAccountId}</strong> | 
              Range: <strong>${startDate} to ${endDate}</strong> | 
              Printed on: ${new Date().toLocaleString('en-IN')}
            </div>
          </div>

          <table class="summary-table">
            <tr>
              <td><strong>Opening Balance:</strong> ${formatCurrency(openingBalance)}</td>
              <td><strong>Total Positions:</strong> ${groupedPositions.length}${groupedPositions.length !== totalTradesCount ? ` (${totalTradesCount} trade legs)` : ''} (WR: ${winRate.toFixed(1)}%)</td>
              <td><strong>Net Trading P&L:</strong> ${formatCurrency(netPnL)}</td>
            </tr>
            <tr>
              <td><strong>Deposits (Credits):</strong> +${formatCurrency(totalDeposits)}</td>
              <td><strong>Withdrawals (Debits):</strong> -${formatCurrency(totalWithdrawals)}</td>
              <td><strong>Closing Balance:</strong> ${formatCurrency(endingBalance)}</td>
            </tr>
            <tr>
              <td><strong>Total Brokerage:</strong> ${formatCurrency(totalBrokerage)}</td>
              <td><strong>Taxes & Fees:</strong> ${formatCurrency(totalTaxes)}</td>
              <td><strong>Total Charges:</strong> ${formatCurrency(totalBrokerage + totalTaxes)}</td>
            </tr>
          </table>

          <table class="ledger-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Particulars / Transaction details</th>
                <th style="text-align: right;">Debit (-)</th>
                <th style="text-align: right;">Credit (+)</th>
                <th style="text-align: right;">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              ${printBodyContent}
            </tbody>
          </table>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="glass-card animate-tab-panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* 1. Header section with Range filters and actions */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '8px' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '28px', 
            height: '28px', 
            borderRadius: '8px', 
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)', 
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(56, 189, 248, 0.3)'
          }}>
            <CalendarRange size={16} color="#38bdf8" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Day Book</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', background: 'rgba(255, 255, 255, 0.05)', padding: '1px 7px', borderRadius: '9999px', border: '1px solid var(--border-color)' }}>
                {timelineItems.length} Entries
              </span>
            </h2>
          </div>
        </div>

        {/* Right Toolbar Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Integrated Date Filter Capsule Group */}
          <div 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: 'rgba(255, 255, 255, 0.025)', 
              padding: '2px 8px', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)',
              height: '30px',
              boxSizing: 'border-box'
            }}
          >
            {/* Quick Preset Selector */}
            <select
              className="form-select"
              style={{ 
                padding: '0 4px', 
                fontSize: '0.72rem', 
                height: '24px', 
                borderRadius: '5px', 
                cursor: 'pointer', 
                background: 'var(--bg-card)', 
                color: 'var(--text-main)', 
                border: '1px solid var(--border-color)',
                outline: 'none',
                fontWeight: 600
              }}
              value={selectedPreset}
              onChange={(e) => handleQuickRange(e.target.value)}
            >
              <option value="30days">Past 30 Days</option>
              <option value="today">Today</option>
              <option value="month">This Month</option>
              {minDate && <option value="fy">Full Financial Year</option>}
              <option value="custom">Custom Range</option>
            </select>

            <span style={{ width: '1px', height: '14px', background: 'var(--border-color)', margin: '0 2px' }} />

            {/* From Date */}
            <input 
              type="date" 
              value={startDate} 
              min={minDate}
              max={maxDate}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                setStartDate(val);
                setSelectedPreset('custom');
                if (endDate && val > endDate) {
                  setEndDate(val);
                }
              }} 
              onClick={(e) => (e.target as any).showPicker?.()}
              className="form-input" 
              style={{ 
                padding: '0 4px', 
                fontSize: '0.72rem', 
                height: '24px', 
                width: '115px', 
                cursor: 'pointer',
                borderRadius: '4px',
                border: '1px solid transparent',
                background: 'transparent'
              }} 
            />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>to</span>
            {/* To Date */}
            <input 
              type="date" 
              value={endDate} 
              min={minDate}
              max={maxDate}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                setEndDate(val);
                setSelectedPreset('custom');
                if (startDate && val < startDate) {
                  setStartDate(val);
                }
              }} 
              onClick={(e) => (e.target as any).showPicker?.()}
              className="form-input" 
              style={{ 
                padding: '0 4px', 
                fontSize: '0.72rem', 
                height: '24px', 
                width: '115px', 
                cursor: 'pointer',
                borderRadius: '4px',
                border: '1px solid transparent',
                background: 'transparent'
              }} 
            />
          </div>

          {/* Visibility toggle */}
          <button
            type="button"
            onClick={togglePnlVisibility}
            className="btn btn-secondary"
            style={{ height: '30px', padding: '0 8px', borderRadius: '7px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem' }}
            title={isPnlVisible ? "Hide P&L Numbers" : "Show P&L Numbers"}
          >
            {isPnlVisible ? <EyeOff size={13} /> : <Eye size={13} color="var(--primary)" />}
            <span className="hide-mobile">{isPnlVisible ? 'Hide P&L' : 'Show P&L'}</span>
          </button>

          {/* Sort Order */}
          <button
            type="button"
            onClick={() => setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC')}
            className="btn btn-secondary"
            style={{ 
              fontSize: '0.72rem', 
              padding: '0 8px', 
              border: '1px solid var(--border-color)', 
              height: '30px', 
              borderRadius: '7px',
              display: 'flex', 
              alignItems: 'center', 
              gap: '5px' 
            }}
            title={sortOrder === 'DESC' ? "Sorted: Latest First. Click to sort Earliest First" : "Sorted: Earliest First. Click to sort Latest First"}
          >
            <ArrowUpDown size={13} color="var(--primary)" />
            <span className="hide-mobile">{sortOrder === 'DESC' ? 'Latest First' : 'Earliest First'}</span>
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={handlePrintDayBook}
            className="btn btn-secondary"
            style={{ 
              fontSize: '0.72rem', 
              padding: '0 8px', 
              border: '1px solid var(--border-color)', 
              height: '30px', 
              borderRadius: '7px',
              display: 'flex', 
              alignItems: 'center', 
              gap: '5px' 
            }}
          >
            <Printer size={13} />
            <span className="hide-mobile">Print</span>
          </button>
        </div>
      </div>

      {/* 2. Sleek KPI Summary Strip */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '8px', 
          padding: '6px 12px', 
          background: 'rgba(255, 255, 255, 0.02)', 
          borderRadius: '8px', 
          border: '1px solid var(--border-color)',
          fontSize: '0.74rem'
        }}
      >
        {/* Opening Balance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Opening:
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 650, color: 'var(--text-main)' }}>
            {isPnlVisible ? formatCurrency(openingBalance) : '••••'}
          </span>
        </div>

        <span style={{ width: '1px', height: '14px', background: 'var(--border-color)' }} />

        {/* Trading P&L */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Trading P&L:
          </span>
          <span style={{ 
            fontFamily: 'var(--font-mono)', 
            fontWeight: 700, 
            color: !isPnlVisible ? 'var(--text-main)' : netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' 
          }}>
            {isPnlVisible ? `${netPnL >= 0 ? '+' : ''}${formatCurrency(netPnL)}` : '••••'}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
            ({totalTradesCount}T · {winRate.toFixed(0)}% WR)
          </span>
        </div>

        <span style={{ width: '1px', height: '14px', background: 'var(--border-color)' }} />

        {/* Capital Flows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Flows:
          </span>
          <span style={{ 
            fontFamily: 'var(--font-mono)', 
            fontWeight: 650, 
            color: !isPnlVisible ? 'var(--text-main)' : netFlow >= 0 ? 'var(--color-win)' : 'var(--color-loss)' 
          }}>
            {isPnlVisible ? `${netFlow >= 0 ? '+' : ''}${formatCurrency(netFlow)}` : '••••'}
          </span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
            (+{formatCurrency(totalDeposits)} / -{formatCurrency(totalWithdrawals)})
          </span>
        </div>

        <span style={{ width: '1px', height: '14px', background: 'var(--border-color)' }} />

        {/* Paid Charges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Charges:
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 650, color: 'var(--color-loss)' }}>
            -{isPnlVisible ? formatCurrency(totalBrokerage + totalTaxes) : '••••'}
          </span>
        </div>

        <span style={{ width: '1px', height: '14px', background: 'var(--border-color)' }} />

        {/* Closing Balance */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary-glow)', padding: '2px 8px', borderRadius: '5px', border: '1px solid var(--border-color-active)' }}>
          <span style={{ color: 'var(--primary)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>
            Closing:
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--primary)', fontSize: '0.86rem' }}>
            {isPnlVisible ? formatCurrency(endingBalance) : '••••'}
          </span>
        </div>
      </div>

      {/* 3. Timeline Statement table with Day-Grouped Rows */}
      <div className="glass-card" style={{ padding: '0px', overflowX: 'auto', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--border-color)', textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '8px 12px', fontWeight: 650, color: 'var(--text-muted)', fontSize: '0.72rem' }}>Particulars / Narration</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 650, color: 'var(--text-muted)', fontSize: '0.72rem', width: '120px' }}>Debit (-)</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 650, color: 'var(--text-muted)', fontSize: '0.72rem', width: '120px' }}>Credit (+)</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 650, color: 'var(--text-muted)', fontSize: '0.72rem', width: '130px' }}>Running Balance</th>
            </tr>
          </thead>
          <tbody>
            {/* Opening Balance Line (Render at top if ASC) */}
            {sortOrder === 'ASC' && (
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.015)' }}>
                <td style={{ padding: '6px 12px', fontWeight: 600, color: 'var(--text-dim)', fontSize: '0.74rem' }}>
                  📌 Opening Balance Carry-Forward ({startDate})
                </td>
                <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>-</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>-</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>
                  {isPnlVisible ? formatCurrency(openingBalance) : '••••'}
                </td>
              </tr>
            )}

            {timelineItems.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  No trades or capital adjustments recorded in this date range.
                </td>
              </tr>
            ) : (
              groupedTimeline.map((group) => {
                return (
                  <tbody key={`grp-block-${group.date}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {/* Day Group Header Bar */}
                    <tr style={{ background: 'rgba(255, 255, 255, 0.025)', borderTop: '1px solid var(--border-color)' }}>
                      <td colSpan={4} style={{ padding: '5px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={13} color="var(--primary)" />
                            <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.78rem' }}>
                              {formatGroupDate(group.date)}
                            </span>
                            {getRelativeDayLabel(group.date) && (
                              <span style={{ fontSize: '0.64rem', background: 'var(--primary-glow)', color: 'var(--primary)', padding: '1px 6px', borderRadius: '4px', fontWeight: 650 }}>
                                {getRelativeDayLabel(group.date)}
                              </span>
                            )}
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                              • {group.items.length} {group.items.length === 1 ? 'transaction' : 'transactions'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem' }}>
                            <span style={{ color: 'var(--text-dim)' }}>
                              Day Net: <strong style={{ fontFamily: 'var(--font-mono)', color: !isPnlVisible ? 'var(--text-main)' : group.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                                {isPnlVisible ? `${group.netPnL >= 0 ? '+' : ''}${formatCurrency(group.netPnL)}` : '••••'}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Transaction Rows for this Day */}
                    {group.items.map((item) => {
                      const isCredit = item.isCredit;
                      return (
                        <tr 
                          key={item.id}
                          onClick={() => setSelectedRowId(selectedRowId === item.id ? null : item.id)}
                          style={{ 
                            borderBottom: '1px solid rgba(255, 255, 255, 0.035)', 
                            background: selectedRowId === item.id ? 'var(--primary-glow)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.12s ease'
                          }}
                        >
                          <td style={{ padding: '6px 12px', verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
                            {editingId === item.id ? (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={editNotesText}
                                  onChange={(e) => setEditNotesText(e.target.value)}
                                  style={{ height: '26px', fontSize: '0.72rem', flexGrow: 1 }}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveNotes(item.id, item.type);
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                />
                                <button 
                                  onClick={() => handleSaveNotes(item.id, item.type)}
                                  className="btn btn-primary"
                                  style={{ padding: '2px 8px', fontSize: '0.68rem', height: '26px' }}
                                >
                                  Save
                                </button>
                                <button 
                                  onClick={() => setEditingId(null)}
                                  className="btn btn-secondary"
                                  style={{ padding: '2px 8px', fontSize: '0.68rem', height: '26px' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' }}>
                                  {/* Row 1: Unified transaction details on a single slim line */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 550 }}>
                                      ⏱️ {formatTimeToAMPM(item.entryTime || item.time)}
                                      {item.type === 'TRADE' && item.exitTime && ` - ${formatTimeToAMPM(item.exitTime)}`}
                                    </span>
                                    <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                                    {item.type === 'TRADE' ? (
                                      <>
                                        <span style={{ 
                                          background: item.label === 'BUY' ? 'var(--color-win-bg)' : 'var(--color-loss-bg)', 
                                          color: item.label === 'BUY' ? 'var(--color-win)' : 'var(--color-loss)', 
                                          border: item.label === 'BUY' ? '1px solid var(--color-win-border)' : '1px solid var(--color-loss-border)',
                                          padding: '1px 5px', 
                                          borderRadius: '4px', 
                                          fontSize: '0.64rem', 
                                          fontWeight: 700 
                                        }}>{item.label}</span>
                                        <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>{item.symbol}</strong>
                                        <span style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-dim)', border: '1px solid var(--border-color)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.62rem' }}>
                                          {item.typeLabel}
                                        </span>
                                        
                                        <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                                        
                                        <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>
                                          Qty: <strong style={{ color: 'var(--text-main)' }}>{item.qty}</strong> @ <strong style={{ color: 'var(--text-main)' }}>₹{item.entryPrice}</strong>
                                        </span>
                                        
                                        <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                                        
                                        <span style={{ background: 'rgba(96, 165, 250, 0.08)', color: '#60a5fa', padding: '1px 5px', borderRadius: '4px', fontSize: '0.64rem', fontWeight: 550 }}>
                                          🎯 {item.strategy}
                                        </span>
                                        
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginLeft: 'auto' }}>via {item.broker}</span>
                                      </>
                                    ) : (
                                      <>
                                        <span style={{ 
                                          background: item.type === 'DEPOSIT' ? 'rgba(10, 132, 255, 0.12)' : 'rgba(255, 159, 10, 0.12)', 
                                          color: item.type === 'DEPOSIT' ? '#0a84ff' : '#ff9f0a', 
                                          padding: '1px 5px', 
                                          borderRadius: '4px', 
                                          fontSize: '0.64rem', 
                                          fontWeight: 700 
                                        }}>{item.label}</span>
                                        <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Capital {item.flowLabel === 'Deposit' ? 'Inflow' : 'Outflow'}</strong>
                                        <span style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-dim)', border: '1px solid var(--border-color)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.62rem' }}>{item.sourceLabel}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginLeft: 'auto' }}>via {item.broker}</span>
                                      </>
                                    )}

                                    {!item.isInvestment && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingId(item.id);
                                          setEditNotesText(item.rawNotes || '');
                                        }}
                                        className="btn btn-secondary"
                                        style={{ 
                                          padding: '2px', 
                                          border: 'none', 
                                          background: 'transparent', 
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          opacity: 0.5
                                        }}
                                        title="Edit Note"
                                      >
                                        <Edit2 size={11} color="var(--primary)" />
                                      </button>
                                    )}
                                  </div>

                                  {/* Row 2: Note description if exists */}
                                  {item.rawNotes && item.rawNotes.trim() !== '' && (
                                    <div 
                                      style={{ 
                                        fontSize: '0.71rem', 
                                        color: 'var(--text-dim)', 
                                        background: 'rgba(255,255,255,0.015)', 
                                        padding: '2px 7px', 
                                        borderRadius: '4px', 
                                        borderLeft: '2px solid var(--primary)', 
                                        marginTop: '1px', 
                                        lineHeight: 1.3 
                                      }}
                                    >
                                      💬 {item.rawNotes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '6px 12px', textAlign: 'right', verticalAlign: 'middle', width: '120px' }}>
                            {!isCredit ? (
                              <span style={{ 
                                color: 'var(--color-loss)', 
                                background: 'var(--color-loss-bg)', 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                fontWeight: 650, 
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.74rem',
                                display: 'inline-block',
                                whiteSpace: 'nowrap',
                                border: '1px solid var(--color-loss-border)'
                              }}>
                                -{isPnlVisible ? formatCurrency(Math.abs(item.amount)) : '••••'}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '6px 12px', textAlign: 'right', verticalAlign: 'middle', width: '120px' }}>
                            {isCredit ? (
                              <span style={{ 
                                color: 'var(--color-win)', 
                                background: 'var(--color-win-bg)', 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                fontWeight: 650, 
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.74rem',
                                display: 'inline-block',
                                whiteSpace: 'nowrap',
                                border: '1px solid var(--color-win-border)'
                              }}>
                                +{isPnlVisible ? formatCurrency(item.amount) : '••••'}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>-</span>
                            )}
                          </td>
                          <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--text-main)', verticalAlign: 'middle', width: '130px' }}>
                            {isPnlVisible ? formatCurrency(item.runningBalance) : '••••'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                );
              })
            )}

            {/* Opening Balance Line (Render at bottom if DESC) */}
            {sortOrder === 'DESC' && (
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.015)' }}>
                <td style={{ padding: '6px 12px', fontWeight: 600, color: 'var(--text-dim)', fontSize: '0.74rem' }}>
                  📌 Opening Balance Carry-Forward ({startDate})
                </td>
                <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>-</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>-</td>
                <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>
                  {isPnlVisible ? formatCurrency(openingBalance) : '••••'}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', fontWeight: 700 }}>
              <td style={{ padding: '8px 12px', color: 'var(--text-main)', fontSize: '0.74rem' }}>
                Summary ({startDate} to {endDate}) • Opening: <span style={{ fontFamily: 'var(--font-mono)' }}>{isPnlVisible ? formatCurrency(openingBalance) : '••••'}</span>
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--color-loss)', fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>
                -{isPnlVisible ? formatCurrency(totalDebits) : '••••'}
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--color-win)', fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>
                +{isPnlVisible ? formatCurrency(totalCredits) : '••••'}
              </td>
              <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--primary)', fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>
                {isPnlVisible ? formatCurrency(endingBalance) : '••••'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
