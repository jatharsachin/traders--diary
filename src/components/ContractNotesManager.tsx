import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTradeStore } from '../store/useTradeStore';
import type { Broker } from '../types';
import { 
  FileSpreadsheet, Edit2, Trash2, CheckCircle, 
  Receipt, Search, Plus, X, Check
} from 'lucide-react';
import { BrokerBadge } from './BrokerBadge';
import { getFinancialYear } from '../utils/fyHelper';
import { toast } from '../utils/toast';
import { isMatchAccount as isMatchAccountUtil } from '../utils/accountScope';

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

  const activeAccountsList = useMemo(() => brokerAccounts.filter(a => a.active), [brokerAccounts]);

  // Modal and Filtering state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || latestTradeDate);
  const [selectedAccount, setSelectedAccount] = useState<string>(() => {
    if (activeAccountId !== 'Combined' && activeAccountsList.some(a => a.id === activeAccountId)) {
      return activeAccountId;
    }
    return activeAccountsList[0]?.id || 'acc-1';
  });
  const [tableAccountFilter, setTableAccountFilter] = useState<string>(activeAccountId === 'Combined' ? 'All' : activeAccountId);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RECONCILED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Form inputs
  const [brokerageInput, setBrokerageInput] = useState<string>('');
  const [taxesInput, setTaxesInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Selected Account details
  const currentAccObj = useMemo(() => {
    return brokerAccounts.find(a => a.id === selectedAccount);
  }, [brokerAccounts, selectedAccount]);

  // Detect accounts with trades on selectedDate
  const accountsTradedOnDate = useMemo(() => {
    if (!selectedDate) return [];
    const dayTradesAll = allTrades.filter(t => (t.exitDate || t.date) === selectedDate);
    const accIdSet = new Set<string>();
    dayTradesAll.forEach(t => {
      if (t.brokerAccountId) accIdSet.add(t.brokerAccountId);
      else if (t.broker) {
        const found = brokerAccounts.find(a => a.broker?.toLowerCase() === t.broker?.toLowerCase());
        if (found) accIdSet.add(found.id);
      }
    });
    return activeAccountsList.filter(a => accIdSet.has(a.id));
  }, [selectedDate, allTrades, activeAccountsList, brokerAccounts]);

  // Trades on selected date for the selected account
  const dayTrades = useMemo(() => {
    return allTrades.filter(t => {
      const tradeDate = t.exitDate || t.date;
      if (tradeDate !== selectedDate) return false;
      if (t.brokerAccountId) return t.brokerAccountId === selectedAccount;
      if (currentAccObj && t.broker) return t.broker.toLowerCase() === currentAccObj.broker.toLowerCase();
      return false;
    });
  }, [allTrades, selectedDate, selectedAccount, currentAccObj]);

  const dayGrossPnL = useMemo(() => {
    return dayTrades.reduce((acc, t) => acc + (t.grossPnL || 0), 0);
  }, [dayTrades]);

  const currentRecordedCharges = useMemo(() => {
    return dayTrades.reduce((acc, t) => acc + (t.brokerage || 0) + (t.taxes || 0), 0);
  }, [dayTrades]);

  // Check if a contract note already exists for this date & account
  const existingNoteForDate = useMemo(() => {
    return (contractNotes || []).find(cn => cn.date === selectedDate && cn.brokerAccountId === selectedAccount);
  }, [contractNotes, selectedDate, selectedAccount]);

  // Load existing note into form when date/account changes if modal is open
  useEffect(() => {
    if (existingNoteForDate && !editingNoteId) {
      setBrokerageInput(existingNoteForDate.brokerage ? existingNoteForDate.brokerage.toString() : '0');
      setTaxesInput(existingNoteForDate.taxes ? existingNoteForDate.taxes.toString() : '0');
      setNotesInput(existingNoteForDate.notes || '');
    } else if (!editingNoteId) {
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

  const handleOpenAddModal = () => {
    setSelectedDate(latestTradeDate || todayStr);
    if (activeAccountId !== 'Combined' && activeAccountsList.some(a => a.id === activeAccountId)) {
      setSelectedAccount(activeAccountId);
    } else {
      setSelectedAccount(activeAccountsList[0]?.id || 'acc-1');
    }
    setEditingNoteId(null);
    setIsModalOpen(true);
  };

  const handleOpenEditRow = (item: any) => {
    setSelectedDate(item.date);
    if (item.brokerAccountId) {
      setSelectedAccount(item.brokerAccountId);
    }
    setBrokerageInput(item.brokerage ? item.brokerage.toString() : '');
    setTaxesInput(item.taxes ? item.taxes.toString() : '');
    setNotesInput(item.notes === 'Recorded from trade executions' ? '' : (item.notes || ''));
    setEditingNoteId(item.noteId || null);
    setIsModalOpen(true);
  };

  const handleSaveContractNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      toast.warning('Please select a date');
      return;
    }

    const fy = getFinancialYear(selectedDate);
    if (lockedFYs.includes(fy)) {
      toast.error(`Cannot edit charges: Financial Year "${fy}" is locked.`);
      return;
    }

    if (!selectedAccount) {
      toast.warning('Please select a broker account.');
      return;
    }

    const targetAcc = brokerAccounts.find(a => a.id === selectedAccount);
    const brokerToUse: Broker = targetAcc ? targetAcc.broker : (dayTrades[0]?.broker || 'Other');

    addOrUpdateContractNote({
      date: selectedDate,
      brokerAccountId: selectedAccount,
      broker: brokerToUse,
      brokerage: numBrokerage,
      taxes: numTaxes,
      notes: notesInput.trim()
    });

    setEditingNoteId(null);
    setIsModalOpen(false);
    const accLabel = targetAcc ? `${targetAcc.accountName} (${targetAcc.broker})` : 'Account';
    toast.success(`Contract Note for ${accLabel} on ${selectedDate} saved!`);
    setSaveSuccessMsg(`Contract Note for ${accLabel} on ${selectedDate} saved!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleDeleteNote = (id: string, date: string, accountName?: string) => {
    const fy = getFinancialYear(date);
    if (lockedFYs.includes(fy)) {
      toast.error(`Cannot delete: Financial Year "${fy}" is locked.`);
      return;
    }
    const label = accountName ? `${accountName} on ${date}` : date;
    if (window.confirm(`Are you sure you want to remove the contract note record for ${label}?`)) {
      deleteContractNote(id);
      toast.success('Contract note removed.');
    }
  };

  // Filtered trades for current FY and active account
  const isMatchAccount = (accId?: string, brokerName?: string) => {
    return isMatchAccountUtil(activeAccountId, brokerAccounts, accId, brokerName);
  };

  const fyTrades = useMemo(() => {
    return allTrades.filter(t => {
      if (selectedFY !== 'All') {
        const fy = getFinancialYear(t.exitDate || t.date);
        if (fy !== selectedFY) return false;
      }
      if (activeAccountId !== 'Combined') {
        return isMatchAccount(t.brokerAccountId, t.broker);
      }
      return true;
    });
  }, [allTrades, selectedFY, activeAccountId, brokerAccounts]);

  // Combined daily breakdown: grouped by date AND brokerAccountId
  const dailyBreakdownList = useMemo(() => {
    const groups: Record<string, { date: string; brokerAccountId: string; trades: typeof allTrades }> = {};

    fyTrades.forEach(t => {
      const d = t.exitDate || t.date;
      const accId = t.brokerAccountId || (brokerAccounts.find(a => a.broker?.toLowerCase() === t.broker?.toLowerCase())?.id || 'default');
      if (tableAccountFilter !== 'All' && accId !== tableAccountFilter) {
        return;
      }
      const key = `${d}_${accId}`;
      if (!groups[key]) {
        groups[key] = { date: d, brokerAccountId: accId, trades: [] };
      }
      groups[key].trades.push(t);
    });

    (contractNotes || []).forEach(cn => {
      if (selectedFY !== 'All') {
        const fy = getFinancialYear(cn.date);
        if (fy !== selectedFY) return;
      }
      const accId = cn.brokerAccountId || (brokerAccounts.find(a => a.broker?.toLowerCase() === cn.broker?.toLowerCase())?.id || 'default');
      if (tableAccountFilter !== 'All' && accId !== tableAccountFilter) {
        return;
      }
      if (activeAccountId !== 'Combined' && !isMatchAccount(cn.brokerAccountId)) {
        return;
      }
      const key = `${cn.date}_${accId}`;
      if (!groups[key]) {
        groups[key] = { date: cn.date, brokerAccountId: accId, trades: [] };
      }
    });

    const keys = Object.keys(groups).sort((a, b) => {
      const dateA = groups[a].date;
      const dateB = groups[b].date;
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      return a.localeCompare(b);
    });

    return keys.map(key => {
      const group = groups[key];
      const tradesForDay = group.trades;
      const cn = (contractNotes || []).find(n => n.date === group.date && n.brokerAccountId === group.brokerAccountId);
      const accObj = brokerAccounts.find(a => a.id === group.brokerAccountId);

      const tradeCount = tradesForDay.length;
      const grossPnL = tradesForDay.reduce((sum, t) => sum + (t.grossPnL || 0), 0);
      const brokerage = cn ? cn.brokerage : tradesForDay.reduce((sum, t) => sum + (t.brokerage || 0), 0);
      const taxes = cn ? cn.taxes : tradesForDay.reduce((sum, t) => sum + (t.taxes || 0), 0);
      const totalCharges = Math.round((brokerage + taxes) * 100) / 100;
      const netPnL = Math.round((grossPnL - totalCharges) * 100) / 100;

      const broker = cn?.broker || accObj?.broker || tradesForDay[0]?.broker || 'Other';
      const isReconciled = !!cn;

      return {
        id: cn?.id || `day-${group.date}-${group.brokerAccountId}`,
        noteId: cn?.id,
        date: group.date,
        broker,
        brokerAccountId: group.brokerAccountId,
        accountName: accObj?.accountName || 'Account',
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
  }, [fyTrades, contractNotes, selectedFY, tableAccountFilter, activeAccountId, brokerAccounts]);

  // Counts for tabs
  const pendingCount = useMemo(() => dailyBreakdownList.filter(d => !d.isReconciled).length, [dailyBreakdownList]);
  const reconciledCount = useMemo(() => dailyBreakdownList.filter(d => d.isReconciled).length, [dailyBreakdownList]);

  // Filtered breakdown with status & search
  const filteredBreakdownList = useMemo(() => {
    return dailyBreakdownList.filter(item => {
      if (statusFilter === 'PENDING' && item.isReconciled) return false;
      if (statusFilter === 'RECONCILED' && !item.isReconciled) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matches = item.date.includes(term) ||
          item.broker.toLowerCase().includes(term) ||
          item.accountName.toLowerCase().includes(term) ||
          (item.notes && item.notes.toLowerCase().includes(term));
        if (!matches) return false;
      }
      return true;
    });
  }, [dailyBreakdownList, statusFilter, searchTerm]);

  // Aggregated Metrics
  const totalTradingDaysCount = dailyBreakdownList.length;
  const totalReconciledCount = dailyBreakdownList.filter(d => d.isReconciled).length;
  const totalFYBrokerage = dailyBreakdownList.reduce((acc, d) => acc + d.brokerage, 0);
  const totalFYTaxes = dailyBreakdownList.reduce((acc, d) => acc + d.taxes, 0);
  const totalFYCharges = dailyBreakdownList.reduce((acc, d) => acc + d.totalCharges, 0);

  return (
    <div className="tab-pane" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
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
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Daily Contract Notes
              </h1>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
                Reconcile exact daily brokerage and government taxes for each broker account.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge badge-neutral" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
            📅 FY: {selectedFY}
          </span>
          <button
            onClick={handleOpenAddModal}
            className="btn btn-primary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '8px 16px', 
              fontSize: '0.82rem', 
              fontWeight: 650,
              borderRadius: '8px'
            }}
          >
            <Plus size={15} />
            <span>Enter Contract Note</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: 'var(--color-win)',
          padding: '10px 14px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.82rem',
          fontWeight: 600
        }}>
          <CheckCircle size={16} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Overview Metric Stats Bar */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <div className="glass-card" style={{ padding: '14px 16px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Trading Days
          </span>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '4px', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            {totalTradingDaysCount} Days
          </div>
          <span style={{ fontSize: '0.7rem', color: totalReconciledCount > 0 ? 'var(--color-win)' : 'var(--text-muted)' }}>
            {totalReconciledCount} / {totalTradingDaysCount} Reconciled Notes
          </span>
        </div>

        <div className="glass-card" style={{ padding: '14px 16px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Total FY Brokerage
          </span>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '4px', color: '#fb923c', fontFamily: 'var(--font-mono)' }}>
            {isPnlVisible ? `₹${totalFYBrokerage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Order execution charges</span>
        </div>

        <div className="glass-card" style={{ padding: '14px 16px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Govt Taxes & STT
          </span>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '4px', color: '#f87171', fontFamily: 'var(--font-mono)' }}>
            {isPnlVisible ? `₹${totalFYTaxes.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>STT, GST, Stamp & SEBI</span>
        </div>

        <div className="glass-card" style={{ padding: '14px 16px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            Total Charges
          </span>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: '4px', color: 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
            {isPnlVisible ? `₹${totalFYCharges.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '••••••'}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Brokerage + Taxes</span>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="glass-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Table Toolbar with Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          
          {/* Segmented Status Tabs */}
          <div style={{ 
            display: 'flex', 
            background: 'rgba(255, 255, 255, 0.05)', 
            borderRadius: '8px', 
            padding: '3px',
            border: '1px solid var(--border-color)',
            gap: '2px'
          }}>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              style={{
                padding: '5px 12px',
                fontSize: '0.76rem',
                fontWeight: 650,
                borderRadius: '6px',
                border: 'none',
                background: statusFilter === 'ALL' ? 'var(--primary)' : 'transparent',
                color: statusFilter === 'ALL' ? '#fff' : 'var(--text-dim)',
                cursor: 'pointer'
              }}
            >
              All Days ({dailyBreakdownList.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              style={{
                padding: '5px 12px',
                fontSize: '0.76rem',
                fontWeight: 650,
                borderRadius: '6px',
                border: 'none',
                background: statusFilter === 'PENDING' ? '#f59e0b' : 'transparent',
                color: statusFilter === 'PENDING' ? '#000' : 'var(--text-dim)',
                cursor: 'pointer'
              }}
            >
              ⚡ Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('RECONCILED')}
              style={{
                padding: '5px 12px',
                fontSize: '0.76rem',
                fontWeight: 650,
                borderRadius: '6px',
                border: 'none',
                background: statusFilter === 'RECONCILED' ? 'var(--color-win)' : 'transparent',
                color: statusFilter === 'RECONCILED' ? '#000' : 'var(--text-dim)',
                cursor: 'pointer'
              }}
            >
              ✓ Reconciled ({reconciledCount})
            </button>
          </div>

          {/* Account Filter & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select
              value={tableAccountFilter}
              onChange={(e) => setTableAccountFilter(e.target.value)}
              className="form-select"
              style={{ height: '34px', fontSize: '0.75rem', minWidth: '150px' }}
            >
              <option value="All">All Accounts</option>
              {activeAccountsList.map(a => (
                <option key={a.id} value={a.id}>
                  {a.accountName} ({a.broker})
                </option>
              ))}
            </select>

            <div style={{ position: 'relative', width: '200px' }}>
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

        {/* Breakdown Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--border-color)', color: 'var(--text-dim)', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 12px' }}>Date</th>
                <th style={{ padding: '10px 12px' }}>Account</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Trades</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Gross P&L</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Brokerage</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Govt Taxes</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Total Charges</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Net Realized P&L</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Action</th>
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
                  return (
                    <tr 
                      key={item.id}
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                        {item.date}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <BrokerBadge broker={item.broker} />
                          <span style={{ fontSize: '0.76rem', fontWeight: 650, color: 'var(--text-main)' }}>
                            {item.accountName}
                          </span>
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
                            ✓ Reconciled
                          </span>
                        ) : (
                          <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '3px 8px' }}>
                            ⚡ Pending
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleOpenEditRow(item)}
                            className={item.isReconciled ? "btn btn-secondary" : "btn btn-primary"}
                            style={{ 
                              padding: '4px 10px', 
                              fontSize: '0.72rem', 
                              fontWeight: 650,
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title={item.isReconciled ? "Edit Contract Note" : "Enter Contract Note"}
                          >
                            <Edit2 size={12} />
                            <span>{item.isReconciled ? 'Edit' : 'Reconcile'}</span>
                          </button>
                          {item.isReconciled && (
                            <button
                              onClick={() => handleDeleteNote(item.noteId || item.id, item.date, item.accountName)}
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
                              title="Reset to default estimated charges"
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

      {/* Focused, Clean Contract Note Entry Modal */}
      {isModalOpen && createPortal(
        <div 
          className="modal-overlay" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0, 0, 0, 0.75)', 
            backdropFilter: 'blur(8px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 3500,
            padding: '16px'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="glass-card" 
            style={{ 
              width: '100%', 
              maxWidth: '520px', 
              borderRadius: '16px', 
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)', 
              border: '1px solid var(--border-color)', 
              background: 'var(--bg-card)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '16px 20px', 
              borderBottom: '1px solid var(--border-color)',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  background: 'rgba(59, 130, 246, 0.12)', 
                  color: 'var(--primary)', 
                  padding: '7px', 
                  borderRadius: '8px' 
                }}>
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    {editingNoteId ? 'Edit Contract Note Charges' : 'Enter Contract Note Charges'}
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: '1px 0 0 0' }}>
                    Verify & save exact figures from broker contract note
                  </p>
                </div>
              </div>
              <button 
                type="button"
                className="btn btn-secondary" 
                style={{ padding: '5px', borderRadius: '8px', border: 'none' }}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveContractNote}>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Date & Account Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                      📅 Trading Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setEditingNoteId(null);
                      }}
                      className="form-input"
                      style={{ height: '36px', fontSize: '0.84rem', width: '100%' }}
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
                      style={{ height: '36px', fontSize: '0.84rem', width: '100%' }}
                    >
                      {activeAccountsList.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.accountName} ({a.broker})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Account Switcher Pills if multiple accounts traded on this date */}
                {accountsTradedOnDate.length > 1 && (
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                      Switch Account for {selectedDate}:
                    </span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {accountsTradedOnDate.map(acc => {
                        const isSelected = acc.id === selectedAccount;
                        const accTrades = allTrades.filter(t => (t.exitDate || t.date) === selectedDate && (t.brokerAccountId === acc.id || (!t.brokerAccountId && t.broker?.toLowerCase() === acc.broker?.toLowerCase())));
                        const hasNote = (contractNotes || []).some(cn => cn.date === selectedDate && cn.brokerAccountId === acc.id);
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              setSelectedAccount(acc.id);
                              setEditingNoteId(null);
                            }}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '7px',
                              fontSize: '0.74rem',
                              fontWeight: 650,
                              cursor: 'pointer',
                              border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                              background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                              color: isSelected ? 'var(--primary)' : 'var(--text-main)'
                            }}
                          >
                            <span>{acc.accountName} ({acc.broker})</span>
                            <span style={{ marginLeft: '4px', opacity: 0.75 }}>({accTrades.length} trades)</span>
                            {hasNote && <span style={{ marginLeft: '4px', color: 'var(--color-win)' }}>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Context Strip: Gross P&L and Trades */}
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.78rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.68rem' }}>Day Gross Realized P&L</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: dayGrossPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontSize: '0.92rem' }}>
                      {dayGrossPnL >= 0 ? '+' : ''}₹{dayGrossPnL.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.68rem' }}>Logged Executions</span>
                    <strong style={{ color: 'var(--text-main)' }}>{dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''}</strong>
                  </div>
                </div>

                {/* Charges Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                      style={{ height: '36px', fontSize: '0.88rem', fontFamily: 'var(--font-mono)', width: '100%' }}
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                      Govt Taxes & STT (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="e.g. 35.80"
                      value={taxesInput}
                      onChange={(e) => setTaxesInput(e.target.value)}
                      className="form-input"
                      style={{ height: '36px', fontSize: '0.88rem', fontFamily: 'var(--font-mono)', width: '100%' }}
                      required
                    />
                  </div>
                </div>

                {/* Live Outcome Banner */}
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.05)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block' }}>Total Charges</span>
                    <strong style={{ fontSize: '0.88rem', color: 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                      -₹{totalEnteredCharges.toFixed(2)}
                    </strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', display: 'block' }}>Net Realized P&L</span>
                    <strong style={{ fontSize: '0.98rem', fontFamily: 'var(--font-mono)', color: previewNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                      {previewNetPnL >= 0 ? '+' : ''}₹{previewNetPnL.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>

                {/* Notes Input */}
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-main)', display: 'block', marginBottom: '5px' }}>
                    Notes / Contract Note No. (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CN-20261116-01"
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    className="form-input"
                    style={{ height: '36px', fontSize: '0.82rem', width: '100%' }}
                  />
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{ 
                padding: '14px 20px', 
                borderTop: '1px solid var(--border-color)', 
                display: 'flex', 
                justifyContent: 'flex-end', 
                gap: '10px',
                background: 'rgba(255, 255, 255, 0.02)'
              }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '7px 16px', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '7px 20px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Check size={14} />
                  <span>Save & Apply Charges</span>
                </button>
              </div>
            </form>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
