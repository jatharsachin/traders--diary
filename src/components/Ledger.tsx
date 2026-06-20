import { useState } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { ArrowDownRight, ArrowUpRight, Receipt, Info, FileSpreadsheet, Plus, Trash2, X, Save } from 'lucide-react';

export function Ledger() {
  const { trades, baseCapital, capitalAdjustments, addCapitalAdjustment, deleteCapitalAdjustment, isPnlVisible } = useTradeStore();
  const [viewType, setViewType] = useState<'daily' | 'detailed'>('daily');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [isAdjOpen, setIsAdjOpen] = useState(false);

  // Form states for deposit/withdrawal
  const [adjType, setAdjType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjNotes, setAdjNotes] = useState<string>('');
  const [adjDate, setAdjDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [adjTime, setAdjTime] = useState<string>(new Date().toTimeString().slice(0, 5));
  const [error, setError] = useState<string>('');

  // Sort trades oldest to newest for chronological balance tracking
  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.entryTime}`);
    const dateB = new Date(`${b.date}T${b.entryTime}`);
    return dateA.getTime() - dateB.getTime();
  });

  // Calculate detailed trade-by-trade ledger items
  const getDetailedLedger = () => {
    // Combine trades and manual adjustments
    const combined = [
      ...sortedTrades.map((t) => ({
        id: t.id,
        date: t.date,
        time: t.entryTime,
        particulars: `${t.action} ${t.qty} qty of ${t.symbol} (${t.segment})`,
        type: t.netPnL >= 0 ? ('CREDIT' as const) : ('DEBIT' as const),
        grossPnL: t.grossPnL,
        charges: t.brokerage + t.taxes,
        netPnL: t.netPnL,
        isAdjustment: false,
      })),
      ...capitalAdjustments.map((a) => ({
        id: a.id,
        date: a.date,
        time: a.time,
        particulars: a.type === 'DEPOSIT' 
          ? `Capital Deposit (Pay-in): ${a.notes || 'Bank Transfer'}`
          : `Capital Withdrawal (Pay-out): ${a.notes || 'Bank Transfer'}`,
        type: a.type === 'DEPOSIT' ? ('CREDIT' as const) : ('DEBIT' as const),
        grossPnL: a.type === 'DEPOSIT' ? a.amount : -a.amount,
        charges: 0,
        netPnL: a.type === 'DEPOSIT' ? a.amount : -a.amount,
        isAdjustment: true,
      })),
    ].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });

    let runningBalance = baseCapital;
    return combined.map((item) => {
      runningBalance += item.netPnL;
      return {
        ...item,
        balance: runningBalance,
      };
    });
  };

  // Calculate daily summary ledger items
  const getDailyLedger = () => {
    // Get all unique dates
    const allDates = Array.from(
      new Set([
        ...trades.map((t) => t.date),
        ...capitalAdjustments.map((a) => a.date),
      ])
    ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    let runningBalance = baseCapital;
    return allDates.map((date) => {
      const dayTrades = trades.filter((t) => t.date === date);
      const dayAdjustments = capitalAdjustments.filter((a) => a.date === date);

      const tradeGross = dayTrades.reduce((acc, t) => acc + t.grossPnL, 0);
      const tradeCharges = dayTrades.reduce((acc, t) => acc + t.brokerage + t.taxes, 0);
      const tradeNet = dayTrades.reduce((acc, t) => acc + t.netPnL, 0);

      const deposits = dayAdjustments.filter((a) => a.type === 'DEPOSIT').reduce((acc, a) => acc + a.amount, 0);
      const withdrawals = dayAdjustments.filter((a) => a.type === 'WITHDRAWAL').reduce((acc, a) => acc + a.amount, 0);

      const netPnL = tradeNet + deposits - withdrawals;
      runningBalance += netPnL;

      // Compile particulars
      const parts: string[] = [];
      if (dayTrades.length > 0) {
        const symbols = Array.from(new Set(dayTrades.map((t) => t.symbol.split(' ')[0])));
        parts.push(`Trading: ${dayTrades.length} trade${dayTrades.length > 1 ? 's' : ''} (${symbols.join(', ')})`);
      }
      if (deposits > 0) {
        const notes = dayAdjustments.filter((a) => a.type === 'DEPOSIT').map(a => a.notes).filter(Boolean).join(', ');
        parts.push(`Deposit: +₹${deposits.toLocaleString('en-IN')}${notes ? ` (${notes})` : ''}`);
      }
      if (withdrawals > 0) {
        const notes = dayAdjustments.filter((a) => a.type === 'WITHDRAWAL').map(a => a.notes).filter(Boolean).join(', ');
        parts.push(`Withdrawal: -₹${withdrawals.toLocaleString('en-IN')}${notes ? ` (${notes})` : ''}`);
      }

      return {
        id: `day-${date}`,
        date,
        particulars: parts.join(' | '),
        type: netPnL >= 0 ? ('CREDIT' as const) : ('DEBIT' as const),
        grossPnL: tradeGross + deposits - withdrawals,
        charges: tradeCharges,
        netPnL: netPnL,
        balance: runningBalance,
      };
    });
  };

  const detailedItems = getDetailedLedger();
  const dailyItems = getDailyLedger();
  const activeItems = viewType === 'daily' ? dailyItems : detailedItems;

  // Sort by date & time descending so that the latest entry is always at the top (newest first)
  const sortedItems = [...activeItems].sort((a, b) => {
    const dateTimeA = new Date(`${a.date}T${'time' in a ? (a as any).time : '00:00'}`).getTime();
    const dateTimeB = new Date(`${b.date}T${'time' in b ? (b as any).time : '00:00'}`).getTime();
    return dateTimeB - dateTimeA;
  });

  // Calculate summary metrics
  const totalNetPnL = trades.reduce((acc, t) => acc + t.netPnL, 0);
  const totalDeposits = capitalAdjustments.filter((a) => a.type === 'DEPOSIT').reduce((acc, a) => acc + a.amount, 0);
  const totalWithdrawals = capitalAdjustments.filter((a) => a.type === 'WITHDRAWAL').reduce((acc, a) => acc + a.amount, 0);
  const currentBalance = baseCapital + totalNetPnL + totalDeposits - totalWithdrawals;

  // Sum credits (profitable P&Ls + Deposits)
  const tradeCredits = trades.reduce((acc, t) => (t.netPnL > 0 ? acc + t.netPnL : acc), 0);
  const totalCredits = tradeCredits + totalDeposits;

  // Sum debits (loss P&Ls + total brokerage/taxes + Withdrawals)
  const tradeLosses = trades.reduce((acc, t) => (t.netPnL < 0 ? acc + Math.abs(t.netPnL) : acc), 0);
  const totalCharges = trades.reduce((acc, t) => acc + t.brokerage + t.taxes, 0);
  const totalDebits = tradeLosses + totalCharges + totalWithdrawals;

  const formatCurrency = (val: number) => {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });
    return formatter.format(val);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // CSV Export utility
  const handleExportCSV = () => {
    try {
      const headers = ['Date', 'Particulars', 'Transaction Type', 'Gross Amount (INR)', 'Charges (INR)', 'Net Amount (INR)', 'Running Balance (INR)'];
      const rows = activeItems.map((item) => [
        item.date,
        `"${item.particulars}"`,
        item.type,
        item.grossPnL.toFixed(2),
        item.charges.toFixed(2),
        item.netPnL.toFixed(2),
        item.balance.toFixed(2),
      ]);

      const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `traders_diary_ledger_${viewType}_statement_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('Failed to export ledger statement to CSV.');
    }
  };

  // Capital Adjustment form submit handler
  const handleAdjSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (adjAmount <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }

    if (!window.confirm(`Are you sure you want to log this capital ${adjType === 'DEPOSIT' ? 'deposit (Pay-in)' : 'withdrawal (Pay-out)'}?`)) {
      return;
    }

    addCapitalAdjustment({
      date: adjDate,
      time: adjTime,
      type: adjType,
      amount: adjAmount,
      notes: adjNotes.trim(),
    });

    // Reset fields
    setAdjAmount(0);
    setAdjNotes('');
    setIsAdjOpen(false);
  };

  return (
    <div className="animate-tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Ledger KPI Summary Row */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '20px' 
        }}
      >
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' }}>
          <div style={{ background: 'rgba(120, 120, 120, 0.08)', padding: '10px', borderRadius: '50%' }}>
            <Receipt size={22} color="var(--text-muted)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 550 }}>Starting Balance</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
              {isPnlVisible ? formatCurrency(baseCapital) : '••••'}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' }}>
          <div style={{ background: 'var(--color-win-bg)', padding: '10px', borderRadius: '50%' }}>
            <ArrowUpRight size={22} color="var(--color-win)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 550 }}>Total Credits (Wins + Pay-in)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-win)', marginTop: '2px' }}>
              {isPnlVisible ? `+${formatCurrency(totalCredits)}` : '••••'}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' }}>
          <div style={{ background: 'var(--color-loss-bg)', padding: '10px', borderRadius: '50%' }}>
            <ArrowDownRight size={22} color="var(--color-loss)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 550 }}>Total Debits (Losses + Pay-out)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-loss)', marginTop: '2px' }}>
              {isPnlVisible ? `-${formatCurrency(totalDebits)}` : '••••'}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px' }}>
          <div style={{ background: currentBalance >= baseCapital ? 'var(--color-win-bg)' : 'var(--color-loss-bg)', padding: '10px', borderRadius: '50%' }}>
            <Receipt size={22} color={currentBalance >= baseCapital ? 'var(--color-win)' : 'var(--color-loss)'} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 550 }}>Current Account Equity</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: currentBalance >= baseCapital ? 'var(--color-win)' : 'var(--color-loss)', marginTop: '2px' }}>
              {isPnlVisible ? formatCurrency(currentBalance) : '••••'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Statement Card */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Account Ledger Statement
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Chronological ledger records detailing account deposits, withdrawals, and trading transaction logs
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Log Deposit/Withdrawal button */}
            <button 
              className="btn btn-primary"
              style={{ height: '32px', padding: '6px 12px', fontSize: '0.78rem' }}
              onClick={() => setIsAdjOpen(true)}
            >
              <Plus size={13} />
              <span>Log Pay-in/Out</span>
            </button>

            {/* 3D Segmented View Switcher */}
            <div className="nav-tab-container">
              <button 
                onClick={() => setViewType('daily')}
                className={`nav-tab ${viewType === 'daily' ? 'active' : ''}`}
                style={{ padding: '4px 12px', fontSize: '0.78rem' }}
              >
                Daily Summary
              </button>
              <button 
                onClick={() => setViewType('detailed')}
                className={`nav-tab ${viewType === 'detailed' ? 'active' : ''}`}
                style={{ padding: '4px 12px', fontSize: '0.78rem' }}
              >
                Detailed Ledger
              </button>
            </div>

            {/* Export CSV Button */}
            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', height: '32px' }}
              onClick={handleExportCSV}
              title="Download Excel CSV statement"
            >
              <FileSpreadsheet size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Ledger table statement */}
        {activeItems.length > 0 ? (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction Particulars</th>
                  <th style={{ textAlign: 'center' }}>Type</th>
                  <th style={{ textAlign: 'right' }}>Gross Amount</th>
                  <th style={{ textAlign: 'right' }}>Charges</th>
                  <th style={{ textAlign: 'right' }}>Net Transaction</th>
                  <th style={{ textAlign: 'right' }}>Running Balance</th>
                  {viewType === 'detailed' && <th style={{ textAlign: 'center', width: '60px' }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {/* Ledger items */}
                {sortedItems.map((item) => (
                  <tr 
                    key={item.id}
                    className={selectedRowId === item.id ? 'selected-row' : ''}
                    onClick={() => setSelectedRowId(selectedRowId === item.id ? null : item.id)}
                  >
                    <td>
                      <div style={{ fontWeight: 550 }}>{formatDate(item.date)}</div>
                      {'time' in item && <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>{(item as any).time}</div>}
                    </td>
                    <td style={{ fontSize: '0.85rem', maxWidth: '300px', wordBreak: 'break-word' }}>
                      {item.particulars}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${item.type === 'CREDIT' ? 'badge-win' : 'badge-loss'}`}>
                        {item.type}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: item.grossPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                      {isPnlVisible ? `${item.grossPnL >= 0 ? '+' : '-'}${formatCurrency(Math.abs(item.grossPnL))}` : '••••'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {item.charges > 0 ? (isPnlVisible ? `-${formatCurrency(item.charges)}` : '-••••') : '₹0'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: item.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                      {isPnlVisible ? `${item.netPnL >= 0 ? '+' : ''}${formatCurrency(item.netPnL)}` : '••••'}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      {isPnlVisible ? formatCurrency(item.balance) : '••••'}
                    </td>
                    {viewType === 'detailed' && (
                      <td style={{ textAlign: 'center' }}>
                        {'isAdjustment' in item && (item as any).isAdjustment ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Delete this manual capital transaction entry?')) {
                                deleteCapitalAdjustment(item.id);
                              }
                            }}
                            className="btn-secondary"
                            style={{ 
                              padding: '4px 6px', 
                              borderRadius: '4px',
                              color: 'var(--color-loss)',
                              borderColor: 'var(--color-loss-border)',
                              background: 'var(--color-loss-bg)',
                              cursor: 'pointer'
                            }}
                            title="Delete Transaction"
                          >
                            <Trash2 size={12} />
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>Trade</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}

                {/* Starting entry row - Rendered at the bottom (oldest entry) */}
                <tr>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>-</td>
                  <td style={{ fontWeight: 550 }}>Account Opening Capital Balance</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-neutral" style={{ fontSize: '0.62rem' }}>OPENING</span>
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>-</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>-</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>-</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {isPnlVisible ? formatCurrency(baseCapital) : '••••'}
                  </td>
                  {viewType === 'detailed' && <td></td>}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div 
            style={{ 
              padding: '60px 20px', 
              textAlign: 'center', 
              color: 'var(--text-muted)', 
              fontSize: '0.85rem',
              border: '1px dashed var(--border-color)',
              borderRadius: '8px'
            }}
          >
            No ledger transactions recorded. Please log options or equity trades to view statement details.
          </div>
        )}

        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '0.72rem', 
            color: 'var(--text-dim)', 
            marginTop: '16px' 
          }}
        >
          <Info size={12} />
          <span>The Ledger statement operates chronologically. Pay-in represents deposits to capital. Pay-out represents bank withdrawals. Trading losses and taxes are debits; profits are credits.</span>
        </div>
      </div>

      {/* Manual Capital Adjustment Modal */}
      {isAdjOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-card animate-fade-in" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>Log Capital Pay-in / Pay-out</h2>
              <button 
                className="btn-secondary" 
                style={{ padding: '6px', borderRadius: '50%' }} 
                onClick={() => setIsAdjOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAdjSubmit}>
              <div className="modal-body">
                {error && (
                  <div style={{ color: 'var(--color-loss)', backgroundColor: 'var(--color-loss-bg)', border: '1px solid var(--color-loss-border)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '14px' }}>
                    {error}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Transaction Type</label>
                  <select 
                    value={adjType} 
                    onChange={(e) => setAdjType(e.target.value as any)}
                    className="form-select"
                  >
                    <option value="DEPOSIT">Capital Deposit (Pay-in)</option>
                    <option value="WITHDRAWAL">Capital Withdrawal (Pay-out)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Transaction Amount (₹)</label>
                  <input
                    type="number"
                    value={adjAmount || ''}
                    onChange={(e) => setAdjAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="e.g. 50000"
                    className="form-input"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input
                      type="date"
                      value={adjDate}
                      onChange={(e) => setAdjDate(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time</label>
                    <input
                      type="time"
                      value={adjTime}
                      onChange={(e) => setAdjTime(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Transaction Notes / Particulars</label>
                  <input
                    type="text"
                    value={adjNotes}
                    onChange={(e) => setAdjNotes(e.target.value)}
                    placeholder="e.g. Added backup funds, Withdrew June profit"
                    className="form-input"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsAdjOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Save size={16} />
                  <span>Save Transaction</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
