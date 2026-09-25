import React, { useState, useMemo, useEffect } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import type { Broker } from '../types';
import { 
  FileSpreadsheet, Calendar, Plus, Edit2, Trash2, CheckCircle, 
  AlertCircle, ArrowRight, ShieldCheck, IndianRupee, RefreshCw,
  Receipt, Filter, Search
} from 'lucide-react';
import { BrokerBadge } from './BrokerBadge';
import { formatTimeToAMPM, getFinancialYear } from '../utils/fyHelper';

interface ContractNotesManagerProps {
  activeAccountId?: string;
  initialDate?: string;
}

export function ContractNotesManager({ activeAccountId = 'Combined', initialDate }: ContractNotesManagerProps) {
  const { 
    trades: allTrades, 
    brokerAccounts, 
    contractNotes, 
    addOrUpdateContractNote, 
    deleteContractNote,
    selectedFY,
    isPnlVisible,
    lockedFYs
  } = useTradeStore();

  const todayStr = new Date().toISOString().split('T')[0];

  const latestTradeDate = useMemo(() => {
    if (!allTrades || allTrades.length === 0) return todayStr;
    const sortedDates = [...allTrades]
      .map(t => t.exitDate || t.date)
      .filter(Boolean)
      .sort((a, b) => b.localeCompare(a));
    return sortedDates[0] || todayStr;
  }, [allTrades, todayStr]);

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || latestTradeDate);
  const [selectedAccount, setSelectedAccount] = useState<string>(activeAccountId);
  const [brokerageInput, setBrokerageInput] = useState<string>('');
  const [taxesInput, setTaxesInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Auto-sync to latest trading date if not explicitly specified
  useEffect(() => {
    if (!initialDate && latestTradeDate && selectedDate === todayStr && latestTradeDate !== todayStr) {
      setSelectedDate(latestTradeDate);
    }
  }, [latestTradeDate, initialDate, todayStr, selectedDate]);

  // Active account list for dropdown
  const activeAccountsList = brokerAccounts.filter(a => a.active);

  // Selected Account details
  const currentAccObj = selectedAccount !== 'Combined' 
    ? brokerAccounts.find(a => a.id === selectedAccount) 
    : undefined;

  // Trades on selected date
  const dayTrades = useMemo(() => {
    return allTrades.filter(t => {
      const tradeDate = t.exitDate || t.date;
      if (tradeDate !== selectedDate) return false;
      if (selectedAccount !== 'Combined') {
        if (t.brokerAccountId) return t.brokerAccountId === selectedAccount;
        if (currentAccObj && t.broker) return t.broker.toLowerCase() === currentAccObj.broker.toLowerCase();
      }
      return true;
    });
  }, [allTrades, selectedDate, selectedAccount, currentAccObj]);

  const dayGrossPnL = useMemo(() => {
    return dayTrades.reduce((acc, t) => acc + (t.grossPnL || 0), 0);
  }, [dayTrades]);

  const dayTurnover = useMemo(() => {
    return dayTrades.reduce((acc, t) => acc + ((t.entryPrice || 0) * (t.qty || 0)) + ((t.exitPrice || 0) * (t.qty || 0)), 0);
  }, [dayTrades]);

  const currentRecordedCharges = useMemo(() => {
    return dayTrades.reduce((acc, t) => acc + (t.brokerage || 0) + (t.taxes || 0), 0);
  }, [dayTrades]);

  // Check if a contract note already exists for this date & account
  const existingNoteForDate = useMemo(() => {
    return (contractNotes || []).find(cn => {
      if (cn.date !== selectedDate) return false;
      if (selectedAccount !== 'Combined') {
        return cn.brokerAccountId === selectedAccount;
      }
      return true;
    });
  }, [contractNotes, selectedDate, selectedAccount]);

  // Load existing note into form when date/account changes if not actively editing
  React.useEffect(() => {
    if (existingNoteForDate && !editingNoteId) {
      setBrokerageInput(existingNoteForDate.brokerage ? existingNoteForDate.brokerage.toString() : '0');
      setTaxesInput(existingNoteForDate.taxes ? existingNoteForDate.taxes.toString() : '0');
      setNotesInput(existingNoteForDate.notes || '');
    } else if (!editingNoteId) {
      // Check if day's trades already have recorded charges to pre-fill
      if (dayTrades.length > 0 && currentRecordedCharges > 0) {
        const sumBrok = dayTrades.reduce((acc, t) => acc + (t.brokerage || 0), 0);
        const sumTax = dayTrades.reduce((acc, t) => acc + (t.taxes || 0), 0);
        setBrokerageInput(sumBrok > 0 ? sumBrok.toString() : '');
        setTaxesInput(sumTax > 0 ? sumTax.toString() : '');
      } else {
        setBrokerageInput('');
        setTaxesInput('');
      }
      setNotesInput('');
    }
  }, [selectedDate, selectedAccount, existingNoteForDate, editingNoteId, dayTrades.length, currentRecordedCharges]);

  // Live preview computations
  const numBrokerage = parseFloat(brokerageInput) || 0;
  const numTaxes = parseFloat(taxesInput) || 0;
  const totalEnteredCharges = Math.round((numBrokerage + numTaxes) * 100) / 100;
  const previewNetPnL = Math.round((dayGrossPnL - totalEnteredCharges) * 100) / 100;

  const handleSaveContractNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      alert('Please select a date');
      return;
    }

    const fy = getFinancialYear(selectedDate);
    if (lockedFYs.includes(fy)) {
      alert(`Cannot edit charges: Financial Year "${fy}" is locked.`);
      return;
    }

    const brokerToUse: Broker = currentAccObj ? currentAccObj.broker : (dayTrades[0]?.broker || 'Other');
    const accountIdToUse = selectedAccount !== 'Combined' ? selectedAccount : (dayTrades[0]?.brokerAccountId || undefined);

    addOrUpdateContractNote({
      date: selectedDate,
      brokerAccountId: accountIdToUse,
      broker: brokerToUse,
      brokerage: numBrokerage,
      taxes: numTaxes,
      notes: notesInput.trim()
    });

    setEditingNoteId(null);
    setSaveSuccessMsg(`Contract Note for ${selectedDate} saved & applied to ${dayTrades.length} trades!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleEditNote = (note: any) => {
    setSelectedDate(note.date);
    if (note.brokerAccountId) {
      setSelectedAccount(note.brokerAccountId);
    }
    setBrokerageInput(note.brokerage.toString());
    setTaxesInput(note.taxes.toString());
    setNotesInput(note.notes || '');
    setEditingNoteId(note.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteNote = (id: string, date: string) => {
    const fy = getFinancialYear(date);
    if (lockedFYs.includes(fy)) {
      alert(`Cannot delete: Financial Year "${fy}" is locked.`);
      return;
    }
    if (window.confirm(`Are you sure you want to remove the contract note record for ${date}?`)) {
      deleteContractNote(id);
    }
  };

  // Filtered trades for current FY and active account
  const fyTrades = useMemo(() => {
    return allTrades.filter(t => {
      if (selectedFY !== 'All') {
        const fy = getFinancialYear(t.exitDate || t.date);
        if (fy !== selectedFY) return false;
      }
      if (activeAccountId !== 'Combined') {
        if (t.brokerAccountId) return t.brokerAccountId === activeAccountId;
        const acc = brokerAccounts.find(a => a.id === activeAccountId);
        if (acc && t.broker) return t.broker.toLowerCase() === acc.broker.toLowerCase();
      }
      return true;
    });
  }, [allTrades, selectedFY, activeAccountId, brokerAccounts]);

  // Combined daily breakdown merging all trading days and recorded contract notes
  const dailyBreakdownList = useMemo(() => {
    const daysMap: Record<string, typeof allTrades> = {};
    fyTrades.forEach(t => {
      const d = t.exitDate || t.date;
      if (!daysMap[d]) daysMap[d] = [];
      daysMap[d].push(t);
    });

    (contractNotes || []).forEach(cn => {
      if (selectedFY !== 'All') {
        const fy = getFinancialYear(cn.date);
        if (fy !== selectedFY) return;
      }
      if (activeAccountId !== 'Combined' && cn.brokerAccountId && cn.brokerAccountId !== activeAccountId) {
        return;
      }
      if (!daysMap[cn.date]) {
        daysMap[cn.date] = [];
      }
    });

    const dates = Object.keys(daysMap).sort((a, b) => b.localeCompare(a));

    return dates.map(date => {
      const tradesForDay = daysMap[date] || [];
      const cn = (contractNotes || []).find(n => {
        if (n.date !== date) return false;
        if (activeAccountId !== 'Combined' && n.brokerAccountId) return n.brokerAccountId === activeAccountId;
        return true;
      });

      const tradeCount = tradesForDay.length;
      const grossPnL = tradesForDay.reduce((sum, t) => sum + (t.grossPnL || 0), 0);
      const brokerage = cn ? cn.brokerage : tradesForDay.reduce((sum, t) => sum + (t.brokerage || 0), 0);
      const taxes = cn ? cn.taxes : tradesForDay.reduce((sum, t) => sum + (t.taxes || 0), 0);
      const totalCharges = Math.round((brokerage + taxes) * 100) / 100;
      const netPnL = Math.round((grossPnL - totalCharges) * 100) / 100;

      const broker = cn?.broker || tradesForDay[0]?.broker || 'Other';
      const brokerAccountId = cn?.brokerAccountId || tradesForDay[0]?.brokerAccountId;
      const isReconciled = !!cn;

      return {
        id: cn?.id || `day-${date}`,
        date,
        broker,
        brokerAccountId,
        tradeCount,
        grossPnL,
        brokerage,
        taxes,
        totalCharges,
        netPnL,
        isReconciled,
        notes: cn?.notes || (isReconciled ? '' : 'Recorded from trade executions')
      };
    });
  }, [fyTrades, contractNotes, selectedFY, activeAccountId]);

  // Filtered breakdown with search
  const filteredBreakdownList = useMemo(() => {
    if (!searchTerm.trim()) return dailyBreakdownList;
    const term = searchTerm.toLowerCase();
    return dailyBreakdownList.filter(item => 
      item.date.includes(term) ||
      item.broker.toLowerCase().includes(term) ||
      (item.notes && item.notes.toLowerCase().includes(term))
    );
  }, [dailyBreakdownList, searchTerm]);

  // Financial Year Aggregated Metrics
  const totalTradingDaysCount = dailyBreakdownList.length;
  const totalReconciledCount = dailyBreakdownList.filter(d => d.isReconciled).length;
  const totalFYBrokerage = dailyBreakdownList.reduce((acc, d) => acc + d.brokerage, 0);
  const totalFYTaxes = dailyBreakdownList.reduce((acc, d) => acc + d.taxes, 0);
  const totalFYCharges = dailyBreakdownList.reduce((acc, d) => acc + d.totalCharges, 0);

  return (
    <div className="tab-pane" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              background: 'rgba(59, 130, 246, 0.12)', 
              color: 'var(--primary)', 
              padding: '8px', 
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Daily Brokerage & Contract Notes
              </h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
                Reconcile exact brokerage & government taxes directly from your broker's contract note without per-trade guesswork.
              </p>
            </div>
          </div>
        </div>

        {/* Financial Year Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-neutral" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
            📅 View: {selectedFY}
          </span>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--color-win)',
          padding: '12px 16px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
        }}>
          <CheckCircle size={18} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Overview Metric Stats Bar */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Trading Days
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '6px', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            {totalTradingDaysCount} Days
          </div>
          <span style={{ fontSize: '0.7rem', color: totalReconciledCount > 0 ? 'var(--color-win)' : 'var(--text-muted)' }}>
            {totalReconciledCount} / {totalTradingDaysCount} Reconciled Notes
          </span>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Total FY Brokerage (₹)
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '6px', color: '#fb923c', fontFamily: 'var(--font-mono)' }}>
            {isPnlVisible ? `₹${totalFYBrokerage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total brokerage deducted in {selectedFY}</span>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Govt Taxes & STT (₹)
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '6px', color: '#f87171', fontFamily: 'var(--font-mono)' }}>
            {isPnlVisible ? `₹${totalFYTaxes.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>STT, GST, Stamp & SEBI charges</span>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Total Charges Deducted
          </span>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '6px', color: 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
            {isPnlVisible ? `₹${totalFYCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>100% precision audit in {selectedFY}</span>
        </div>
      </div>

      {/* Unified, Streamlined Reconcile Card */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '20px 24px', 
          borderRadius: '14px',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-card)'
        }}
      >
        {/* Card Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '12px',
          borderBottom: '1px solid var(--border-color)', 
          paddingBottom: '14px',
          marginBottom: '18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              background: 'rgba(59, 130, 246, 0.1)', 
              color: 'var(--primary)', 
              padding: '6px', 
              borderRadius: '8px' 
            }}>
              <Receipt size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.02rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                {editingNoteId ? 'Edit Contract Note Charges' : 'Enter / Reconcile Day\'s Brokerage & Charges'}
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
                Enter total brokerage & taxes from your broker's contract note for the day.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {existingNoteForDate ? (
              <span className="badge badge-win" style={{ fontSize: '0.72rem', padding: '4px 10px' }}>
                ✓ Reconciled Note
              </span>
            ) : dayTrades.length > 0 ? (
              <span className="badge badge-warning" style={{ fontSize: '0.72rem', padding: '4px 10px' }}>
                ⚡ Auto Charges ({dayTrades.length} trades)
              </span>
            ) : (
              <span className="badge badge-neutral" style={{ fontSize: '0.72rem', padding: '4px 10px' }}>
                No Trades Logged
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveContractNote}>
          {/* Row 1: Date, Account, and Day Gross P&L Pill */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '14px', 
            marginBottom: '16px',
            alignItems: 'end'
          }}>
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                📅 Select Trading Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setEditingNoteId(null);
                }}
                className="form-input"
                style={{ height: '38px', fontSize: '0.88rem', width: '100%' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                🏦 Broker Account
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => {
                  setSelectedAccount(e.target.value);
                  setEditingNoteId(null);
                }}
                className="form-select"
                style={{ height: '38px', fontSize: '0.88rem', width: '100%' }}
              >
                <option value="Combined">All Accounts (Combined)</option>
                {activeAccountsList.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.broker} ({a.accountName})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Context Metric: Gross Realized P&L on this date */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.03)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '6px 14px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                  Day Gross Realized P&L
                </span>
                <span style={{ 
                  fontSize: '0.92rem', 
                  fontWeight: 800, 
                  fontFamily: 'var(--font-mono)', 
                  color: dayGrossPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' 
                }}>
                  {dayGrossPnL >= 0 ? '+' : ''}₹{dayGrossPnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Row 2: Direct Charges Inputs */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '14px', 
            marginBottom: '16px' 
          }}>
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                Total Brokerage (₹)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 40.00"
                value={brokerageInput}
                onChange={(e) => setBrokerageInput(e.target.value)}
                className="form-input"
                style={{ 
                  height: '38px', 
                  fontSize: '0.92rem', 
                  fontFamily: 'var(--font-mono)', 
                  fontWeight: 650, 
                  borderColor: 'rgba(251, 146, 60, 0.4)',
                  width: '100%' 
                }}
                required
              />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '3px', display: 'block' }}>
                Broker order execution charges
              </span>
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                Govt Taxes & Other Fees (₹)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 35.80"
                value={taxesInput}
                onChange={(e) => setTaxesInput(e.target.value)}
                className="form-input"
                style={{ 
                  height: '38px', 
                  fontSize: '0.92rem', 
                  fontFamily: 'var(--font-mono)', 
                  fontWeight: 650, 
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  width: '100%' 
                }}
                required
              />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '3px', display: 'block' }}>
                STT, GST, Exchange, Stamp duty & SEBI
              </span>
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-dim)', display: 'block', marginBottom: '5px' }}>
                Contract Note Ref / Memo (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Zerodha CN #2026-0904"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="form-input"
                style={{ height: '38px', fontSize: '0.85rem', width: '100%' }}
              />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '3px', display: 'block' }}>
                Optional memo or contract note ID
              </span>
            </div>
          </div>

          {/* Row 3: Live Summary Banner & Action Buttons */}
          <div style={{ 
            background: 'rgba(59, 130, 246, 0.04)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '10px', 
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            marginTop: '4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 650, display: 'block' }}>
                  Total Charges
                </span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f87171', fontFamily: 'var(--font-mono)' }}>
                  -₹{totalEnteredCharges.toFixed(2)}
                </span>
              </div>

              <div style={{ width: '1px', height: '26px', background: 'var(--border-color)' }} />

              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 650, display: 'block' }}>
                  Reconciled Net Day P&L
                </span>
                <span style={{ 
                  fontSize: '1.18rem', 
                  fontWeight: 850, 
                  fontFamily: 'var(--font-mono)',
                  color: previewNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)'
                }}>
                  {previewNetPnL >= 0 ? '+' : ''}₹{previewNetPnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {editingNoteId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingNoteId(null);
                    setBrokerageInput('');
                    setTaxesInput('');
                    setNotesInput('');
                  }}
                  className="btn btn-secondary"
                  style={{ height: '38px', padding: '0 16px', fontSize: '0.82rem' }}
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ 
                  height: '38px', 
                  padding: '0 20px', 
                  fontSize: '0.86rem', 
                  fontWeight: 700, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
                }}
              >
                <CheckCircle size={16} />
                <span>{editingNoteId ? 'Update & Reallocate' : 'Save & Reconcile Day'}</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            <span>🔒 100% Safe: Applies exact contract note charges without touching trade prices or quantities.</span>
            <span>💡 Tip: Click <strong>"Reconcile"</strong> on any day in the table below to quickly edit its charges.</span>
          </div>
        </form>
      </div>

      {/* Reconciled Contract Notes History Table */}
      {/* Reconciled Contract Notes & Daily Charges History Table */}
      <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
              Daily Charges & Contract Notes Breakdown ({filteredBreakdownList.length} Days)
            </h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
              All trading days and contract note charges recorded for {selectedFY}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                placeholder="Search date or broker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ height: '34px', fontSize: '0.75rem', paddingLeft: '30px' }}
              />
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--border-color)', color: 'var(--text-dim)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 12px' }}>Date</th>
                <th style={{ padding: '10px 12px' }}>Broker & Account</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Trades</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Gross P&L</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Brokerage</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Govt Taxes</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Charges</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Net Realized P&L</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBreakdownList.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                    No trading activity or contract notes found for {selectedFY}.
                  </td>
                </tr>
              ) : (
                filteredBreakdownList.map((item) => {
                  const accObj = brokerAccounts.find(a => a.id === item.brokerAccountId);
                  const isCurrentSelected = item.date === selectedDate;
                  return (
                    <tr 
                      key={item.id}
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        background: isCurrentSelected ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                        {item.date}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <BrokerBadge broker={item.broker} />
                          {accObj && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                              ({accObj.accountName})
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 650, fontFamily: 'var(--font-mono)' }}>
                        {item.tradeCount}
                      </td>
                      <td style={{ 
                        padding: '10px 12px', 
                        textAlign: 'right', 
                        fontFamily: 'var(--font-mono)', 
                        color: item.grossPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)',
                        fontWeight: 650 
                      }}>
                        {isPnlVisible ? `${item.grossPnL >= 0 ? '+' : ''}₹${item.grossPnL.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '••••'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#fb923c', fontWeight: 650 }}>
                        {isPnlVisible ? `₹${item.brokerage.toFixed(2)}` : '••••'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#f87171', fontWeight: 650 }}>
                        {isPnlVisible ? `₹${item.taxes.toFixed(2)}` : '••••'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--color-loss)', fontWeight: 800 }}>
                        {isPnlVisible ? `₹${item.totalCharges.toFixed(2)}` : '••••'}
                      </td>
                      <td style={{ 
                        padding: '10px 12px', 
                        textAlign: 'right', 
                        fontFamily: 'var(--font-mono)', 
                        color: item.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)',
                        fontWeight: 800 
                      }}>
                        {isPnlVisible ? `${item.netPnL >= 0 ? '+' : ''}₹${item.netPnL.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '••••'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {item.isReconciled ? (
                          <span className="badge badge-win" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
                            ✓ Reconciled Note
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
                            ⚡ From Trades
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleEditNote(item)}
                            style={{ 
                              background: 'rgba(59, 130, 246, 0.08)', 
                              border: '1px solid rgba(59, 130, 246, 0.2)', 
                              color: 'var(--primary)', 
                              borderRadius: '6px', 
                              padding: '4px 8px', 
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 600
                            }}
                            title="Edit or Reconcile with Contract Note"
                          >
                            <Edit2 size={12} />
                            <span>{item.isReconciled ? 'Edit' : 'Reconcile'}</span>
                          </button>
                          {item.isReconciled && (
                            <button
                              onClick={() => handleDeleteNote(item.id, item.date)}
                              style={{ 
                                background: 'rgba(239, 68, 68, 0.08)', 
                                border: '1px solid rgba(239, 68, 68, 0.2)', 
                                color: 'var(--color-loss)', 
                                borderRadius: '6px', 
                                padding: '4px 8px', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.72rem'
                              }}
                              title="Reset to trade log defaults"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
