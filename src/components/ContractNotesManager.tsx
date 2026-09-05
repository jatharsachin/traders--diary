import React, { useState, useMemo } from 'react';
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
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [selectedAccount, setSelectedAccount] = useState<string>(activeAccountId);
  const [brokerageInput, setBrokerageInput] = useState<string>('');
  const [taxesInput, setTaxesInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Active account list for dropdown
  const activeAccountsList = brokerAccounts.filter(a => a.active);

  // Selected Account details
  const currentAccObj = selectedAccount !== 'Combined' 
    ? brokerAccounts.find(a => a.id === selectedAccount) 
    : undefined;

  // Trades on selected date
  const dayTrades = useMemo(() => {
    return allTrades.filter(t => {
      if (t.date !== selectedDate) return false;
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

      {/* Main Entry & Day Reconciler Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        
        {/* Left Column: Date & Day's Executions Snapshot */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Calendar size={18} color="var(--primary)" />
              <span>1. Select Trading Day & Account</span>
            </h3>
            {existingNoteForDate && (
              <span className="badge badge-win" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
                ✓ Reconciled
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                Trading Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setEditingNoteId(null);
                }}
                className="form-input"
                style={{ height: '38px', fontSize: '0.85rem' }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                Broker Account
              </label>
              <select
                value={selectedAccount}
                onChange={(e) => {
                  setSelectedAccount(e.target.value);
                  setEditingNoteId(null);
                }}
                className="form-select"
                style={{ height: '38px', fontSize: '0.85rem' }}
              >
                <option value="Combined">All Accounts (Combined)</option>
                {activeAccountsList.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.broker} ({a.accountName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Day's Trades Snapshot Card */}
          <div style={{ 
            background: 'var(--bg-main)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '10px', 
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Day's Execution Summary
              </span>
              <span className="badge badge-neutral" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                {dayTrades.length} Trade{dayTrades.length !== 1 ? 's' : ''} Logged
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Gross P&L</span>
                <span style={{ 
                  fontSize: '1.1rem', 
                  fontWeight: 800, 
                  fontFamily: 'var(--font-mono)',
                  color: dayGrossPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)'
                }}>
                  {dayGrossPnL >= 0 ? '+' : ''}₹{dayGrossPnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Total Turnover</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                  ₹{dayTurnover.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            {dayTrades.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                ℹ️ No individual trades logged for this date yet. You can still enter the day's contract note charges.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 650 }}>Executed Trades:</span>
                {dayTrades.map((t, idx) => (
                  <div 
                    key={t.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '6px 10px', 
                      background: 'rgba(255,255,255,0.02)', 
                      borderRadius: '6px', 
                      fontSize: '0.75rem',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{t.symbol}</span>
                      <span style={{ fontSize: '0.65rem', color: t.action === 'BUY' ? 'var(--color-win)' : 'var(--color-loss)', fontWeight: 700 }}>
                        {t.action}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>({t.qty} qty)</span>
                    </div>
                    <span style={{ 
                      fontWeight: 700, 
                      fontFamily: 'var(--font-mono)',
                      color: t.grossPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)'
                    }}>
                      {t.grossPnL >= 0 ? '+' : ''}₹{t.grossPnL.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Contract Note Entry Form */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Receipt size={18} color="var(--primary)" />
              <span>2. Enter Contract Note Charges</span>
            </h3>
            {editingNoteId && (
              <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                ✏️ Editing Mode
              </span>
            )}
          </div>

          <form onSubmit={handleSaveContractNote} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
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
                  style={{ height: '38px', fontSize: '0.9rem', borderColor: 'rgba(251, 146, 60, 0.3)', fontWeight: 600 }}
                  required
                />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
                  Flat brokerage from broker
                </span>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
                  Govt Taxes & Charges (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="e.g. 35.80"
                  value={taxesInput}
                  onChange={(e) => setTaxesInput(e.target.value)}
                  className="form-input"
                  style={{ height: '38px', fontSize: '0.9rem', borderColor: 'rgba(239, 68, 68, 0.3)', fontWeight: 600 }}
                  required
                />
                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
                  STT, GST, Stamp, Exchange
                </span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>
                Contract Note Reference / Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Zerodha CN #2026-0905 or Kotak Neo Daily"
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="form-input"
                style={{ height: '36px', fontSize: '0.8rem' }}
              />
            </div>

            {/* Realized Net P&L Preview Banner */}
            <div style={{
              background: 'rgba(59, 130, 246, 0.04)',
              border: '1.5px dashed var(--border-color)',
              borderRadius: '10px',
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '4px'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 650, display: 'block' }}>
                  Total Contract Charges
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                  ₹{totalEnteredCharges.toFixed(2)}
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 650, display: 'block' }}>
                  Reconciled Net Day P&L
                </span>
                <span style={{ 
                  fontSize: '1.3rem', 
                  fontWeight: 800, 
                  fontFamily: 'var(--font-mono)',
                  color: previewNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)'
                }}>
                  {previewNetPnL >= 0 ? '+' : ''}₹{previewNetPnL.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
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
                  style={{ flex: '1', height: '42px', fontSize: '0.82rem' }}
                >
                  Cancel Edit
                </button>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ 
                  flex: '2', 
                  height: '42px', 
                  fontSize: '0.88rem', 
                  fontWeight: 700, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px' 
                }}
              >
                <ShieldCheck size={18} />
                <span>{editingNoteId ? 'Update & Reallocate' : 'Save & Apply to Day\'s Trades'}</span>
              </button>
            </div>

            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textAlign: 'center', display: 'block', marginTop: '2px' }}>
              🔒 100% Safe: Will distribute exact contract note charges proportionally to the day's trades without touching entry/exit prices.
            </span>
          </form>
        </div>
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
