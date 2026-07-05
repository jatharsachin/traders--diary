import { useState } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { 
  CalendarRange, Printer, Eye, EyeOff, Edit2
} from 'lucide-react';

interface DayBookProps {
  activeAccountId?: string;
}

export function DayBook({ activeAccountId = 'Combined' }: DayBookProps) {
  const { 
    trades: allTrades, 
    capitalAdjustments: allAdjustments, 
    brokerAccounts, 
    isPnlVisible,
    togglePnlVisibility,
    selectedFY
  } = useTradeStore();

  const todayStr = new Date().toISOString().split('T')[0];
  // Default to past 30 days (1 month) range
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState<string>(oneMonthAgoStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);



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
  
  // Inline editing states for narration/particulars
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotesText, setEditNotesText] = useState('');

  const handleSaveNotes = (id: string, type: 'TRADE' | 'DEPOSIT' | 'WITHDRAWAL') => {
    const isLocked = (dateStr: string) => {
      const match = dateStr.substring(0, 4);
      // We can also call the store's check or get lockedFYs
      const fy = `FY ${match}-${(parseInt(match) + 1).toString().slice(-2)}`;
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

  // Scoped trades & adjustments
  const trades = activeAccountId === 'Combined' 
    ? allTrades 
    : allTrades.filter(t => t.brokerAccountId === activeAccountId);
  
  const adjustments = activeAccountId === 'Combined' 
    ? allAdjustments 
    : allAdjustments.filter(a => a.brokerAccountId === activeAccountId);

  // Range filtered trades & adjustments
  const rangeTrades = trades.filter(t => t.date >= startDate && t.date <= endDate);
  const rangeAdjustments = adjustments.filter(a => a.date >= startDate && a.date <= endDate);

  // Calculate opening balance at startDate
  const getOpeningBalance = () => {
    const startCap = activeAccountId === 'Combined'
      ? brokerAccounts.reduce((sum, a) => sum + a.startingCapital, 0)
      : (brokerAccounts.find(a => a.id === activeAccountId)?.startingCapital || 0);

    const priorTrades = trades.filter(t => t.date < startDate);
    const priorPnL = priorTrades.reduce((sum, t) => sum + t.netPnL, 0);

    const priorAdjustments = adjustments.filter(a => a.date < startDate);
    const priorAdjSum = priorAdjustments.reduce((sum, a) => a.type === 'DEPOSIT' ? sum + a.amount : sum - a.amount, 0);

    return startCap + priorPnL + priorAdjSum;
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
      date: t.date,
      time: t.entryTime,
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
      rawNotes: t.notes || ''
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
      rawNotes: a.notes || ''
    };
  });

  // Chronological sort
  const timelineItems = [...tradeItems, ...adjItems].sort((a, b) => {
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

    return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
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

  const handlePrintDayBook = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let runningBal = openingBalance;
    const tableRows = timelineItems.map((item) => {
      runningBal += item.amount;
      const isCredit = item.isCredit;
      const amountStr = formatCurrency(Math.abs(item.amount));
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px;">${item.date} <span style="color:#718096">${item.time}</span></td>
          <td style="padding: 6px;"><strong>${item.title}</strong><div style="font-size:10px; color:#718096">${item.description}</div></td>
          <td style="padding: 6px; text-align: right; color: ${!isCredit ? '#e53e3e' : '#718096'}">${!isCredit ? '-' + amountStr : '-'}</td>
          <td style="padding: 6px; text-align: right; color: ${isCredit ? '#38a169' : '#718096'}">${isCredit ? '+' + amountStr : '-'}</td>
          <td style="padding: 6px; text-align: right; font-weight: 700;">${formatCurrency(runningBal)}</td>
        </tr>
      `;
    }).join('');

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
              <td><strong>Total Trades:</strong> ${totalTradesCount} (WR: ${winRate.toFixed(1)}%)</td>
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
              <tr style="background:#f7fafc; font-size:11px; font-weight:700;">
                <td style="padding: 6px;">${startDate}</td>
                <td style="padding: 6px;">Opening Balance Carry-Forward</td>
                <td style="text-align: right; padding: 6px;">-</td>
                <td style="text-align: right; padding: 6px;">-</td>
                <td style="text-align: right; padding: 6px;">${formatCurrency(openingBalance)}</td>
              </tr>
              ${tableRows}
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
    <div className="glass-card animate-tab-panel" style={{ padding: '24px' }}>
      {/* Header section with Range filters and print */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px', 
          flexWrap: 'wrap', 
          gap: '12px' 
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <CalendarRange size={20} color="var(--primary)" />
            Day Book (Timeline Ledger)
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', marginBottom: 0 }}>
            Unified chronological ledger combining trades, deposits, and payouts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Range Inputs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input 
              type="date" 
              value={startDate} 
              min={minDate}
              max={maxDate}
              onChange={(e) => setStartDate(e.target.value)} 
              className="form-input" 
              style={{ padding: '4px 8px', fontSize: '0.78rem', height: '32px', width: '130px' }} 
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>to</span>
            <input 
              type="date" 
              value={endDate} 
              min={minDate}
              max={maxDate}
              onChange={(e) => setEndDate(e.target.value)} 
              className="form-input" 
              style={{ padding: '4px 8px', fontSize: '0.78rem', height: '32px', width: '130px' }} 
            />
          </div>



          {/* Visibility toggle & print */}
          <button
            type="button"
            onClick={togglePnlVisibility}
            className="btn btn-secondary"
            style={{ width: '32px', height: '32px', padding: 0, border: '1.5px solid var(--border-color)', background: 'none' }}
            title={isPnlVisible ? "Hide P&L" : "Show P&L"}
          >
            {isPnlVisible ? <EyeOff size={14} /> : <Eye size={14} color="var(--primary)" />}
          </button>

          <button
            type="button"
            onClick={handlePrintDayBook}
            className="btn btn-secondary"
            style={{ fontSize: '0.72rem', padding: '6px 12px', border: '1.5px solid var(--border-color)', background: 'var(--bg-card)', height: '32px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={13} />
            <span>Print Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Cards section */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px', 
          marginBottom: '20px' 
        }}
      >
        <div className="glass-card" style={{ padding: '14px', background: 'rgba(255,255,255,0.015)' }}>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Opening Balance
          </span>
          <h4 style={{ margin: '4px 0 0 0', fontSize: '1.05rem', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
            {isPnlVisible ? formatCurrency(openingBalance) : '••••'}
          </h4>
        </div>

        <div className="glass-card" style={{ padding: '14px', background: 'rgba(255,255,255,0.015)' }}>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Trading P&L
          </span>
          <h4 
            style={{ 
              margin: '4px 0 0 0', 
              fontSize: '1.05rem', 
              fontFamily: 'var(--font-mono)', 
              color: !isPnlVisible ? 'var(--text-main)' : netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' 
            }}
          >
            {isPnlVisible ? `${netPnL >= 0 ? '+' : ''}${formatCurrency(netPnL)}` : '••••'}
          </h4>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
            {totalTradesCount} trades (WR: {winRate.toFixed(0)}%)
          </span>
        </div>

        <div className="glass-card" style={{ padding: '14px', background: 'rgba(255,255,255,0.015)' }}>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Capital Flows
          </span>
          <h4 
            style={{ 
              margin: '4px 0 0 0', 
              fontSize: '1.05rem', 
              fontFamily: 'var(--font-mono)', 
              color: !isPnlVisible ? 'var(--text-main)' : netFlow >= 0 ? 'var(--color-win)' : 'var(--color-loss)' 
            }}
          >
            {isPnlVisible ? `${netFlow >= 0 ? '+' : ''}${formatCurrency(netFlow)}` : '••••'}
          </h4>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
            +{formatCurrency(totalDeposits)} / -{formatCurrency(totalWithdrawals)}
          </span>
        </div>

        <div className="glass-card" style={{ padding: '14px', background: 'rgba(255,255,255,0.015)' }}>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Paid Charges
          </span>
          <h4 
            style={{ 
              margin: '4px 0 0 0', 
              fontSize: '1.05rem', 
              fontFamily: 'var(--font-mono)', 
              color: 'var(--color-loss)'
            }}
          >
            -{isPnlVisible ? formatCurrency(totalBrokerage + totalTaxes) : '••••'}
          </h4>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
            Brokerage: {isPnlVisible ? formatCurrency(totalBrokerage) : '••••'} | Taxes: {isPnlVisible ? formatCurrency(totalTaxes) : '••••'}
          </span>
        </div>

        <div className="glass-card" style={{ padding: '14px', background: 'var(--primary-glow)', border: '1px solid var(--border-color-active)' }}>
          <span style={{ fontSize: '0.62rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 650 }}>
            Closing Balance
          </span>
          <h4 style={{ margin: '4px 0 0 0', fontSize: '1.05rem', fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 800 }}>
            {isPnlVisible ? formatCurrency(endingBalance) : '••••'}
          </h4>
        </div>
      </div>

      {/* Timeline Statement table */}
      <div className="glass-card" style={{ padding: '16px 20px', overflowX: 'auto', background: 'rgba(0,0,0,0.1)' }}>
        <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '10px 8px' }}>Date & Time</th>
              <th style={{ padding: '10px 8px' }}>Particulars / Narration</th>
              <th style={{ padding: '10px 8px', textAlign: 'right' }}>Debit (-)</th>
              <th style={{ padding: '10px 8px', textAlign: 'right' }}>Credit (+)</th>
              <th style={{ padding: '10px 8px', textAlign: 'right' }}>Running Balance</th>
            </tr>
          </thead>
          <tbody>
            {/* Opening Balance Line */}
            <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.015)' }}>
              <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{startDate}</td>
              <td style={{ padding: '8px', fontWeight: 600, color: 'var(--text-dim)' }}>Opening Balance Carry-Forward</td>
              <td style={{ padding: '8px', textAlign: 'right' }}>-</td>
              <td style={{ padding: '8px', textAlign: 'right' }}>-</td>
              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {isPnlVisible ? formatCurrency(openingBalance) : '••••'}
              </td>
            </tr>
          </tbody>

          {(() => {
              if (timelineItems.length === 0) {
                return (
                  <tbody>
                    <tr>
                      <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
                        No trades or capital adjustments recorded in this date range.
                      </td>
                    </tr>
                  </tbody>
                );
              }

              return (
                <tbody>
                  {groupedTimeline.map((group) => {
                    return group.items.map((item, idx) => {
                      const isCredit = item.isCredit;
                      return (
                        <tr 
                          key={item.id}
                          onClick={() => setSelectedRowId(selectedRowId === item.id ? null : item.id)}
                          style={{ 
                            borderBottom: '1px solid var(--border-color)', 
                            background: selectedRowId === item.id ? 'var(--primary-glow)' : 'var(--bg-card)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {idx === 0 && (
                            <td 
                              rowSpan={group.items.length} 
                              style={{ 
                                padding: '12px 10px', 
                                verticalAlign: 'middle', 
                                width: '110px', 
                                minWidth: '110px', 
                                whiteSpace: 'nowrap',
                                borderRight: '1px solid var(--border-color)',
                                background: 'var(--bg-card-hover)'
                              }}
                            >
                              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.8rem' }}>{group.date}</div>
                            </td>
                          )}
                          <td style={{ padding: '12px 10px', verticalAlign: 'middle' }} onClick={(e) => e.stopPropagation()}>
                            {editingId === item.id ? (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  value={editNotesText}
                                  onChange={(e) => setEditNotesText(e.target.value)}
                                  style={{ height: '28px', fontSize: '0.72rem', flexGrow: 1 }}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveNotes(item.id, item.type);
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                />
                                <button 
                                  onClick={() => handleSaveNotes(item.id, item.type)}
                                  className="btn btn-primary"
                                  style={{ padding: '2px 8px', fontSize: '0.68rem', height: '28px' }}
                                >
                                  Save
                                </button>
                                <button 
                                  onClick={() => setEditingId(null)}
                                  className="btn btn-secondary"
                                  style={{ padding: '2px 8px', fontSize: '0.68rem', height: '28px' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', gap: '8px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                                  {/* Row 1: Unified details on a single line */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 550 }}>⏱️ {item.time}</span>
                                    <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                                    {item.type === 'TRADE' ? (
                                      <>
                                        <span style={{ 
                                          background: item.label === 'BUY' ? 'var(--color-win-bg)' : 'var(--color-loss-bg)', 
                                          color: item.label === 'BUY' ? 'var(--color-win)' : 'var(--color-loss)', 
                                          border: item.label === 'BUY' ? '1px solid var(--color-win-border)' : '1px solid var(--color-loss-border)',
                                          padding: '2px 6px', 
                                          borderRadius: '4px', 
                                          fontSize: '0.65rem', 
                                          fontWeight: 700 
                                        }}>{item.label}</span>
                                        <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{item.symbol}</strong>
                                        <span style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-dim)', border: '1px solid var(--border-color)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.62rem' }}>{item.typeLabel}</span>
                                        
                                        <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                                        
                                        <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>
                                          Qty: <strong style={{ color: 'var(--text-main)' }}>{item.qty}</strong> @ <strong style={{ color: 'var(--text-main)' }}>₹{item.entryPrice}</strong>
                                        </span>
                                        
                                        <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                                        
                                        <span style={{ background: 'rgba(96, 165, 250, 0.08)', color: '#60a5fa', padding: '1px 5px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 550 }}>
                                          🎯 {item.strategy}
                                        </span>
                                        {item.mistake && item.mistake !== 'None' && (
                                          <span style={{ background: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b', padding: '1px 5px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 550 }}>
                                            ⚠️ {item.mistake}
                                          </span>
                                        )}
                                        
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginLeft: 'auto' }}>via {item.broker}</span>
                                      </>
                                    ) : (
                                      <>
                                        <span style={{ 
                                          background: item.type === 'DEPOSIT' ? 'rgba(10, 132, 255, 0.12)' : 'rgba(255, 159, 10, 0.12)', 
                                          color: item.type === 'DEPOSIT' ? '#0a84ff' : '#ff9f0a', 
                                          padding: '2px 6px', 
                                          borderRadius: '4px', 
                                          fontSize: '0.65rem', 
                                          fontWeight: 700 
                                        }}>{item.label}</span>
                                        <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>Capital {item.flowLabel === 'Deposit' ? 'Inflow' : 'Outflow'}</strong>
                                        <span style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-dim)', border: '1px solid var(--border-color)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.62rem' }}>{item.sourceLabel}</span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginLeft: 'auto' }}>via {item.broker}</span>
                                      </>
                                    )}
                                  </div>

                                  {/* Row 3: Notes description block */}
                                  {item.rawNotes && item.rawNotes.trim() !== '' && (
                                    <div 
                                      style={{ 
                                        fontSize: '0.72rem', 
                                        color: 'var(--text-dim)', 
                                        background: 'rgba(255,255,255,0.015)', 
                                        padding: '4px 8px', 
                                        borderRadius: '6px', 
                                        borderLeft: '2.5px solid var(--primary)', 
                                        marginTop: '2px', 
                                        lineHeight: 1.3 
                                      }}
                                    >
                                      {item.rawNotes}
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(item.id);
                                    setEditNotesText(item.rawNotes || '');
                                  }}
                                  className="btn btn-secondary"
                                  style={{ 
                                    padding: '4px', 
                                    border: 'none', 
                                    background: 'transparent', 
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    alignSelf: 'flex-start',
                                    opacity: 0.5
                                  }}
                                  title="Edit Notes (Manual Feed)"
                                >
                                  <Edit2 size={12} color="var(--primary)" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td 
                            style={{ 
                              padding: '12px 10px', 
                              textAlign: 'right', 
                              verticalAlign: 'middle'
                            }}
                          >
                            {!isCredit ? (
                              <span style={{ 
                                color: 'var(--color-loss)', 
                                background: 'var(--color-loss-bg)', 
                                padding: '3px 8px', 
                                borderRadius: '6px', 
                                fontWeight: 650, 
                                fontFamily: 'var(--font-mono)',
                                display: 'inline-block',
                                whiteSpace: 'nowrap',
                                border: '1px solid var(--color-loss-border)'
                              }}>
                                -{isPnlVisible ? formatCurrency(Math.abs(item.amount)) : '••••'}
                              </span>
                            ) : null}
                          </td>
                          <td 
                            style={{ 
                              padding: '12px 10px', 
                              textAlign: 'right', 
                              verticalAlign: 'middle'
                            }}
                          >
                            {isCredit ? (
                              <span style={{ 
                                color: 'var(--color-win)', 
                                background: 'var(--color-win-bg)', 
                                padding: '3px 8px', 
                                borderRadius: '6px', 
                                fontWeight: 650, 
                                fontFamily: 'var(--font-mono)',
                                display: 'inline-block',
                                whiteSpace: 'nowrap',
                                border: '1px solid var(--color-win-border)'
                              }}>
                                +{isPnlVisible ? formatCurrency(item.amount) : '••••'}
                              </span>
                            ) : null}
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', verticalAlign: 'middle' }}>
                            {isPnlVisible ? formatCurrency(item.runningBalance) : '••••'}
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              );
            })()}
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', fontWeight: 700 }}>
              <td style={{ padding: '10px 8px', color: 'var(--text-main)' }}>Summary ({startDate} to {endDate})</td>
              <td style={{ padding: '10px 8px', color: 'var(--text-muted)' }}>
                <div>Opening: <span style={{ fontFamily: 'var(--font-mono)' }}>{isPnlVisible ? formatCurrency(openingBalance) : '••••'}</span></div>
                <div>Closing: <span style={{ fontFamily: 'var(--font-mono)' }}>{isPnlVisible ? formatCurrency(endingBalance) : '••••'}</span></div>
              </td>
              <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                -{isPnlVisible ? formatCurrency(totalDebits) : '••••'}
              </td>
              <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--color-win)', fontFamily: 'var(--font-mono)' }}>
                +{isPnlVisible ? formatCurrency(totalCredits) : '••••'}
              </td>
              <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                {isPnlVisible ? formatCurrency(endingBalance) : '••••'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
