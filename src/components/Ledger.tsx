import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTradeStore } from '../store/useTradeStore';
import { 
  Receipt, Plus, Trash2, X, Save, CreditCard, Layers, Edit2, Download
} from 'lucide-react';
import { filterTradesByFY } from '../utils/fyHelper';
import { getBankLogoSvg } from '../utils/brandLogos';
import type { CapitalAdjustment, BankTransaction } from '../types';

interface LedgerProps {
  activeAccountId?: string;
}

export function Ledger({ activeAccountId = 'Combined' }: LedgerProps) {
  const { 
    trades: allTrades, 
    capitalAdjustments: allCapitalAdjustments, 
    addCapitalAdjustment, 
    deleteCapitalAdjustment, 
    isPnlVisible,
    selectedFY,
    activeBrokers,
    
    // NEW STATES & ACTIONS
    brokerAccounts,
    bankAccounts,
    subscriptionExpenses,
    bankTransactions,
    addSubscriptionExpense,
    editSubscriptionExpense,
    deleteSubscriptionExpense,
    addDirectBankTransaction,
    deleteDirectBankTransaction,
    editDirectBankTransaction
  } = useTradeStore();

  const [activeLedgerTab, setActiveLedgerTab] = useState<'broker' | 'bank' | 'subscriptions'>('broker');
  const [selectedBrokerFilter, setSelectedBrokerFilter] = useState<string>('All');
  const [viewType, setViewType] = useState<'daily' | 'detailed'>('daily');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Modals visibility
  const [isAdjOpen, setIsAdjOpen] = useState(false);
  const [isBankTxOpen, setIsBankTxOpen] = useState(false);
  const [isSubOpen, setIsSubOpen] = useState(false);
  const [editSubId, setEditSubId] = useState<string | null>(null);

  // --- BROKER LEDGER FORM STATES ---
  const [adjType, setAdjType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjNotes, setAdjNotes] = useState<string>('');
  const [adjBrokerAccId, setAdjBrokerAccId] = useState<string>('');
  const [adjBankAccId, setAdjBankAccId] = useState<string>('');
  const [adjDate, setAdjDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [adjTime, setAdjTime] = useState<string>(new Date().toTimeString().slice(0, 5));
  const [brokerError, setBrokerError] = useState<string>('');

  // --- BANK TRANSACTION FORM STATES ---
  const [bankTxType, setBankTxType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [bankTxAmount, setBankTxAmount] = useState<number>(0);
  const [bankTxNotes, setBankTxNotes] = useState<string>('');
  const [bankTxAccId, setBankTxAccId] = useState<string>('');
  const [bankTxCategory, setBankTxCategory] = useState<string>('Direct Deposit');
  const [bankTxDate, setBankTxDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bankTxTime, setBankTxTime] = useState<string>(new Date().toTimeString().slice(0, 5));
  const [bankTxBrokerAccId, setBankTxBrokerAccId] = useState<string>('');

  // --- BANK TRANSACTION EDIT STATES ---
  const [isEditBankTxOpen, setIsEditBankTxOpen] = useState(false);
  const [editBankTxId, setEditBankTxId] = useState<string | null>(null);
  const [editBankTxType, setEditBankTxType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT');
  const [editBankTxAmount, setEditBankTxAmount] = useState<number>(0);
  const [editBankTxNotes, setEditBankTxNotes] = useState<string>('');
  const [editBankTxAccId, setEditBankTxAccId] = useState<string>('');
  const [editBankTxCategory, setEditBankTxCategory] = useState<string>('Direct Deposit');
  const [editBankTxDate, setEditBankTxDate] = useState<string>('');
  const [editBankTxTime, setEditBankTxTime] = useState<string>('');
  const [editBankTxBrokerAccId, setEditBankTxBrokerAccId] = useState<string>('');

  // --- SUBSCRIPTION FORM STATES ---
  const [subName, setSubName] = useState('');
  const [subAmount, setSubAmount] = useState<number>(0);
  const [subDate, setSubDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [subFreq, setSubFreq] = useState<'One-Time' | 'Monthly' | 'Yearly'>('Monthly');
  const [subSource, setSubSource] = useState<'Broker' | 'Bank'>('Bank');
  const [subBrokerAccId, setSubBrokerAccId] = useState('');
  const [subBankAccId, setSubBankAccId] = useState('');
  const [subNotes, setSubNotes] = useState('');
  const [selectedBankTxId, setSelectedBankTxId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const content = [
      headers.join(','),
      ...rows.map(r => r.map(val => {
        const clean = (val || '').replace(/"/g, '""');
        return clean.includes(',') || clean.includes('\n') ? `"${clean}"` : clean;
      }).join(','))
    ].join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.click();
  };

  const exportBrokerLedgerCSV = () => {
    const headers = ['Date', 'Particulars', 'Debit/Charges', 'Credit/Inflow', 'Running Balance'];
    let runningBal = startingBalanceOfMonth;
    const rows = filteredLedgerItems.map(item => {
      runningBal += item.netPnL;
      return [
        item.date + ' ' + item.time,
        item.particulars,
        item.netPnL < 0 ? Math.abs(item.netPnL).toString() : '-',
        item.netPnL >= 0 ? item.netPnL.toString() : '-',
        runningBal.toString()
      ];
    });
    rows.unshift(['-', 'Opening Balance Carry Forward', '-', '-', startingBalanceOfMonth.toString()]);
    downloadCSV(`Broker_Ledger_${selectedMonthStr}.csv`, headers, rows);
  };

  const exportBankLedgerCSV = () => {
    const headers = ['Date', 'Bank Account', 'Transaction Details', 'Type', 'Amount', 'Category', 'Notes'];
    const rows = activeFYBankTransactions
      .filter(tx => selectedBankFilter === 'All' ? true : tx.bankAccountId === selectedBankFilter)
      .map(tx => {
        const bank = bankAccounts.find(b => b.id === tx.bankAccountId);
        return [
          tx.date + ' ' + tx.time,
          bank ? `${bank.bankName} (${bank.accountHolderName})` : 'Unknown',
          tx.category,
          tx.type,
          tx.amount.toString(),
          tx.category,
          tx.notes || ''
        ];
      });
    downloadCSV(`Bank_Statement_${selectedFY.replace(/\s+/g, '_')}.csv`, headers, rows);
  };

  const exportSubscriptionsCSV = () => {
    const headers = ['Expense Name', 'Amount', 'Date', 'Billing Cycle', 'Deducted From', 'Account details', 'Notes'];
    const rows = activeSubscriptionExpenses.map(sub => {
      const sourceDetails = sub.paymentSource === 'Bank'
        ? bankAccounts.find(b => b.id === sub.bankAccountId)?.bankName || 'Bank'
        : brokerAccounts.find(a => a.id === sub.brokerAccountId)?.accountName || 'Broker';
      return [
        sub.name,
        sub.amount.toString(),
        sub.date,
        sub.frequency,
        sub.paymentSource,
        sourceDetails,
        sub.notes || ''
      ];
    });
    downloadCSV(`Subscriptions_Log_${selectedFY.replace(/\s+/g, '_')}.csv`, headers, rows);
  };

  // Filter Broker Ledger Trades & Adjustments
  let trades = filterTradesByFY(allTrades, selectedFY);
  let capitalAdjustments = filterTradesByFY(allCapitalAdjustments as any, selectedFY) as any as CapitalAdjustment[];

  // Apply active account scopes
  if (activeAccountId !== 'Combined') {
    trades = trades.filter((t) => t.brokerAccountId === activeAccountId);
    capitalAdjustments = capitalAdjustments.filter((a) => a.brokerAccountId === activeAccountId);
  } else if (selectedBrokerFilter !== 'All') {
    trades = trades.filter((t) => t.broker === selectedBrokerFilter);
    capitalAdjustments = capitalAdjustments.filter((a) => a.broker === selectedBrokerFilter);
  }

  // Group detailed ledger month-by-month pagination
  const sortedTrades = [...trades].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.entryTime}`);
    const dateB = new Date(`${b.date}T${b.entryTime}`);
    return dateA.getTime() - dateB.getTime();
  });

  const getDetailedLedger = () => {
    const combined = [
      ...sortedTrades.map((t) => ({
        id: t.id,
        date: t.date,
        time: t.entryTime,
        particulars: `${t.action} ${t.qty} qty of ${t.symbol} (${t.segment})`,
        type: t.netPnL >= 0 ? ('CREDIT' as const) : ('DEBIT' as const),
        grossPnL: t.grossPnL,
        brokerage: t.brokerage,
        taxes: t.taxes,
        charges: t.brokerage + t.taxes,
        netPnL: t.netPnL,
        isAdjustment: false,
      })),
      ...capitalAdjustments.map((a) => ({
        id: a.id,
        date: a.date,
        time: a.time,
        particulars: a.type === 'DEPOSIT' 
          ? `Capital Deposit (Pay-in) [${a.broker || 'Other'}]: ${a.notes || 'Bank Transfer'}`
          : `Capital Withdrawal (Pay-out) [${a.broker || 'Other'}]: ${a.notes || 'Bank Transfer'}`,
        type: a.type === 'DEPOSIT' ? ('CREDIT' as const) : ('DEBIT' as const),
        grossPnL: a.type === 'DEPOSIT' ? a.amount : -a.amount,
        brokerage: 0,
        taxes: 0,
        charges: 0,
        netPnL: a.type === 'DEPOSIT' ? a.amount : -a.amount,
        isAdjustment: true,
      })),
    ];

    return combined.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const detailedLedger = getDetailedLedger();

  const getFYDateLimits = () => {
    if (!selectedFY || selectedFY === 'All') return { startLimit: null, endLimit: null };
    const match = selectedFY.match(/FY (\d{4})/);
    if (!match) return { startLimit: null, endLimit: null };
    const startYear = parseInt(match[1], 10);
    const startLimit = `${startYear}-04-01`;
    const endLimit = `${startYear + 1}-03-31`;
    return { startLimit, endLimit };
  };
  const { startLimit, endLimit } = getFYDateLimits();

  const getBankOpeningBalance = (bankId: string) => {
    const bank = bankAccounts.find(b => b.id === bankId);
    const baseStart = bank ? bank.startingBalance : bankAccounts.reduce((sum, b) => sum + b.startingBalance, 0);
    
    if (!startLimit) return baseStart;

    const priorTx = bankTransactions.filter(tx => {
      const matchesBank = bankId === 'All' ? true : tx.bankAccountId === bankId;
      return matchesBank && tx.date < startLimit;
    });

    const priorInflows = priorTx.filter(tx => tx.type === 'DEPOSIT').reduce((sum, tx) => sum + tx.amount, 0);
    const priorOutflows = priorTx.filter(tx => tx.type === 'WITHDRAWAL').reduce((sum, tx) => sum + tx.amount, 0);

    return baseStart + priorInflows - priorOutflows;
  };

  const activeFYBankTransactions = bankTransactions.filter(tx => {
    if (!startLimit || !endLimit) return true;
    return tx.date >= startLimit && tx.date <= endLimit;
  });

  const activeSubscriptionExpenses = subscriptionExpenses.filter(sub => {
    if (!startLimit || !endLimit) return true;
    return sub.date >= startLimit && sub.date <= endLimit;
  });

  // Find unique months in records for pagination
  const monthsWithData = Array.from(new Set(detailedLedger.map(item => item.date.substring(0, 7)))).sort();
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const activeMonthList = monthsWithData.length > 0 ? monthsWithData : [currentMonthStr];
  const [selectedMonthStr, setSelectedMonthStr] = useState<string>(currentMonthStr);

  // Sync selectedMonthStr when activeMonthList changes
  useEffect(() => {
    if (!activeMonthList.includes(selectedMonthStr)) {
      setSelectedMonthStr(activeMonthList[activeMonthList.length - 1] || currentMonthStr);
    }
  }, [activeMonthList, selectedMonthStr]);

  const filteredLedgerItems = detailedLedger.filter(item => item.date.substring(0, 7) === selectedMonthStr);

  // Calculate Starting balance carry forward for selected month
  const getFYOpeningBalance = () => {
    let startingCap = 0;
    if (activeAccountId !== 'Combined') {
      startingCap = brokerAccounts.find(a => a.id === activeAccountId)?.startingCapital || 0;
    } else if (selectedBrokerFilter !== 'All') {
      startingCap = brokerAccounts.filter(a => a.broker === selectedBrokerFilter).reduce((sum, a) => sum + a.startingCapital, 0);
    } else {
      startingCap = brokerAccounts.reduce((sum, a) => sum + a.startingCapital, 0);
    }

    if (selectedFY === 'All') return startingCap;

    const match = selectedFY.match(/FY (\d{4})/);
    if (!match) return startingCap;
    const startYear = parseInt(match[1], 10);
    const startStr = `${startYear}-04-01`;

    const priorTrades = allTrades.filter(t => t.date < startStr && (
      activeAccountId !== 'Combined' 
        ? t.brokerAccountId === activeAccountId 
        : (selectedBrokerFilter !== 'All' ? t.broker === selectedBrokerFilter : true)
    ));
    const priorPnL = priorTrades.reduce((sum, t) => sum + t.netPnL, 0);

    const priorAdjs = allCapitalAdjustments.filter(a => a.date < startStr && (
      activeAccountId !== 'Combined' 
        ? a.brokerAccountId === activeAccountId 
        : (selectedBrokerFilter !== 'All' ? a.broker === selectedBrokerFilter : true)
    ));
    const priorAdjSum = priorAdjs.reduce((sum, a) => a.type === 'DEPOSIT' ? sum + a.amount : sum - a.amount, 0);

    return startingCap + priorPnL + priorAdjSum;
  };

  const getCarryForwardCapitalForMonth = () => {
    const fyOpeningBalance = getFYOpeningBalance();
    const priorRecords = detailedLedger.filter(item => item.date.substring(0, 7) < selectedMonthStr);
    const priorPnL = priorRecords.reduce((sum, item) => sum + item.netPnL, 0);
    return fyOpeningBalance + priorPnL;
  };

  const startingBalanceOfMonth = getCarryForwardCapitalForMonth();

  // Bank ledger selector & calculations
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('All');
  
  const getBankSummary = (bankId: string) => {
    const openingBal = getBankOpeningBalance(bankId);
    
    const txList = activeFYBankTransactions.filter(tx => bankId === 'All' ? true : tx.bankAccountId === bankId);
    const totalInflows = txList.filter(tx => tx.type === 'DEPOSIT').reduce((sum, tx) => sum + tx.amount, 0);
    const totalOutflows = txList.filter(tx => tx.type === 'WITHDRAWAL').reduce((sum, tx) => sum + tx.amount, 0);
    
    return {
      startingBalance: openingBal,
      totalInflows,
      totalOutflows,
      currentBalance: openingBal + totalInflows - totalOutflows
    };
  };

  const bankSummary = getBankSummary(selectedBankFilter);
  const activeBankTxList = activeFYBankTransactions
    .filter(tx => selectedBankFilter === 'All' ? true : tx.bankAccountId === selectedBankFilter)
    .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());

  // Form submit handlers
  const handleAddAdjustmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBrokerError('');
    if (adjAmount <= 0) {
      setBrokerError('Please enter a valid amount.');
      return;
    }
    const accId = adjBrokerAccId || (brokerAccounts[0]?.id || '');
    const matchedAcc = brokerAccounts.find(a => a.id === accId);
    if (!matchedAcc) {
      setBrokerError('Please select a valid broker account.');
      return;
    }

    addCapitalAdjustment({
      date: adjDate,
      time: adjTime,
      type: adjType,
      amount: adjAmount,
      notes: adjNotes.trim(),
      broker: matchedAcc.broker,
      brokerAccountId: accId,
      bankAccountId: adjBankAccId || undefined
    });

    setIsAdjOpen(false);
    setAdjAmount(0);
    setAdjNotes('');
    alert('Capital adjustment saved successfully!');
  };

  const handleAddBankTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bankTxAmount <= 0 || !bankTxAccId) {
      alert('Please select bank and enter a valid amount.');
      return;
    }
    if ((bankTxCategory === 'Broker Pay-in' || bankTxCategory === 'Broker Pay-out') && !bankTxBrokerAccId) {
      alert('Please select a Broker account for this double-entry transfer.');
      return;
    }
    addDirectBankTransaction({
      date: bankTxDate,
      time: bankTxTime,
      bankAccountId: bankTxAccId,
      type: bankTxType,
      amount: bankTxAmount,
      category: bankTxCategory as any,
      notes: bankTxNotes.trim(),
      brokerAccountId: (bankTxCategory === 'Broker Pay-in' || bankTxCategory === 'Broker Pay-out') ? bankTxBrokerAccId : undefined
    });
    setIsBankTxOpen(false);
    setBankTxAmount(0);
    setBankTxNotes('');
    setBankTxBrokerAccId('');
    alert('Bank transaction logged successfully!');
  };

  const handleEditBankTxClick = (tx: BankTransaction) => {
    setEditBankTxId(tx.id);
    setEditBankTxType(tx.type);
    setEditBankTxAmount(tx.amount);
    setEditBankTxNotes(tx.notes);
    setEditBankTxAccId(tx.bankAccountId);
    setEditBankTxCategory(tx.category);
    setEditBankTxDate(tx.date);
    setEditBankTxTime(tx.time);
    setEditBankTxBrokerAccId(tx.brokerAccountId || '');
    setIsEditBankTxOpen(true);
  };

  const handleEditBankTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBankTxId || editBankTxAmount <= 0 || !editBankTxAccId) {
      alert('Please fill in all fields correctly.');
      return;
    }
    if ((editBankTxCategory === 'Broker Pay-in' || editBankTxCategory === 'Broker Pay-out') && !editBankTxBrokerAccId) {
      alert('Please select a Broker account for this double-entry transfer.');
      return;
    }
    editDirectBankTransaction(editBankTxId, {
      date: editBankTxDate,
      time: editBankTxTime,
      bankAccountId: editBankTxAccId,
      type: editBankTxType,
      amount: editBankTxAmount,
      category: editBankTxCategory as any,
      notes: editBankTxNotes.trim(),
      brokerAccountId: (editBankTxCategory === 'Broker Pay-in' || editBankTxCategory === 'Broker Pay-out') ? editBankTxBrokerAccId : undefined
    });
    setIsEditBankTxOpen(false);
    setEditBankTxId(null);
    alert('Bank transaction updated successfully!');
  };

  const handleAddSubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() || subAmount <= 0) {
      alert('Please enter subscription details.');
      return;
    }
    if (subSource === 'Bank' && !subBankAccId) {
      alert('Please select a payment bank account.');
      return;
    }
    if (subSource === 'Broker' && activeAccountId === 'Combined' && !subBrokerAccId) {
      alert('Please select a payment broker account.');
      return;
    }

    const payload = {
      name: subName.trim(),
      amount: subAmount,
      date: subDate,
      paymentSource: subSource,
      frequency: subFreq,
      brokerAccountId: subSource === 'Broker' ? (activeAccountId !== 'Combined' ? activeAccountId : subBrokerAccId) : undefined,
      bankAccountId: subSource === 'Bank' ? subBankAccId : undefined,
      notes: subNotes.trim()
    };

    if (editSubId) {
      editSubscriptionExpense(editSubId, payload);
      setEditSubId(null);
      alert('Subscription updated successfully!');
    } else {
      addSubscriptionExpense(payload);
      alert('Subscription expense logged successfully!');
    }

    setIsSubOpen(false);
    setSubName('');
    setSubAmount(0);
    setSubNotes('');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="animate-tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Tab Segment Controls */}
      <div className="glass-card" style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setActiveLedgerTab('broker')} 
            className={`btn ${activeLedgerTab === 'broker' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '6px', border: 'none' }}
          >
            <Layers size={13} color="var(--primary)" />
            <span>Broker Ledger</span>
          </button>
          
          <button 
            onClick={() => setActiveLedgerTab('bank')} 
            className={`btn ${activeLedgerTab === 'bank' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '6px', border: 'none' }}
          >
            <CreditCard size={13} color="var(--color-win)" />
            <span>Bank Ledger</span>
          </button>

          <button 
            onClick={() => setActiveLedgerTab('subscriptions')} 
            className={`btn ${activeLedgerTab === 'subscriptions' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '6px', border: 'none' }}
          >
            <Receipt size={13} color="#f59e0b" />
            <span>Subscriptions & Expenses</span>
          </button>
        </div>

        {/* Current Month P&L Widget */}
        {(() => {
          const today = new Date();
          const currentMonthName = today.toLocaleDateString('en-IN', { month: 'short' });
          const monthPrefix = today.toISOString().substring(0, 7);
          const filteredTrades = activeAccountId === 'Combined' 
            ? allTrades
            : allTrades.filter(t => t.brokerAccountId === activeAccountId);
          const monthPnL = filteredTrades
            .filter(t => t.date.startsWith(monthPrefix))
            .reduce((sum, t) => sum + t.netPnL, 0);

          return (
            <div 
              className="glass-card" 
              style={{ 
                padding: '6px 14px', 
                border: '1.5px solid var(--border-color)', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                height: '38px',
                background: 'rgba(255,255,255,0.02)'
              }}
            >
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 650 }}>
                {currentMonthName} P&L:
              </span>
              <strong 
                style={{ 
                  fontSize: '0.85rem', 
                  fontFamily: 'var(--font-mono)',
                  color: !isPnlVisible ? 'var(--text-dim)' : monthPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' 
                }}
              >
                {isPnlVisible 
                  ? `${monthPnL >= 0 ? '+' : ''}${monthPnL.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}` 
                  : '••••'
                }
              </strong>
            </div>
          );
        })()}

        {activeLedgerTab === 'broker' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {activeAccountId === 'Combined' && (
              <select
                value={selectedBrokerFilter}
                onChange={(e) => setSelectedBrokerFilter(e.target.value)}
                className="form-select"
                style={{ padding: '4px 10px', fontSize: '0.75rem', height: '32px' }}
              >
                <option value="All">All Brokers</option>
                {activeBrokers.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            )}

            <select
              value={selectedMonthStr}
              onChange={(e) => setSelectedMonthStr(e.target.value)}
              className="form-select"
              style={{ padding: '4px 10px', fontSize: '0.75rem', height: '32px' }}
            >
              {activeMonthList.map(m => {
                const parts = m.split('-');
                const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
                const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                return <option key={m} value={m}>{label}</option>;
              })}
            </select>
            
            <button className="btn btn-primary" style={{ height: '32px', fontSize: '0.75rem' }} onClick={() => {
              setAdjBrokerAccId(activeAccountId !== 'Combined' ? activeAccountId : (brokerAccounts[0]?.id || ''));
              setAdjBankAccId(bankAccounts[0]?.id || '');
              setIsAdjOpen(true);
            }}>
              <Plus size={13} />
              <span>Log Pay-in/Out</span>
            </button>

            <button className="btn btn-secondary" style={{ height: '32px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={exportBrokerLedgerCSV}>
              <Download size={12} />
              <span>Export CSV</span>
            </button>

            <div className="nav-tab-container">
              <button onClick={() => setViewType('daily')} className={`nav-tab ${viewType === 'daily' ? 'active' : ''}`} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Daily</button>
              <button onClick={() => setViewType('detailed')} className={`nav-tab ${viewType === 'detailed' ? 'active' : ''}`} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>Detailed</button>
            </div>
          </div>
        )}

        {activeLedgerTab === 'bank' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={selectedBankFilter}
              onChange={(e) => setSelectedBankFilter(e.target.value)}
              className="form-select"
              style={{ padding: '4px 10px', fontSize: '0.75rem', height: '32px', minWidth: '130px' }}
            >
              <option value="All">All Bank Accounts</option>
              {bankAccounts.filter(b => b.active).map(b => (
                <option key={b.id} value={b.id}>{b.bankName} ({b.accountHolderName})</option>
              ))}
            </select>
            <button className="btn btn-primary" style={{ height: '32px', fontSize: '0.75rem' }} onClick={() => {
              setBankTxAccId(bankAccounts[0]?.id || '');
              setIsBankTxOpen(true);
            }}>
              <Plus size={13} />
              <span>Log Bank Transaction</span>
            </button>
            <button className="btn btn-secondary" style={{ height: '32px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={exportBankLedgerCSV}>
              <Download size={12} />
              <span>Export CSV</span>
            </button>
          </div>
        )}

        {activeLedgerTab === 'subscriptions' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn btn-primary" style={{ height: '32px', fontSize: '0.75rem' }} onClick={() => {
              setSubBankAccId(bankAccounts[0]?.id || '');
              setSubBrokerAccId(activeAccountId !== 'Combined' ? activeAccountId : (brokerAccounts[0]?.id || ''));
              setIsSubOpen(true);
            }}>
              <Plus size={13} />
              <span>Log Subscription</span>
            </button>
            <button className="btn btn-secondary" style={{ height: '32px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={exportSubscriptionsCSV}>
              <Download size={12} />
              <span>Export CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* --- TAB CONTENT 1: BROKER LEDGER --- */}
      {activeLedgerTab === 'broker' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header Month Carry Forward */}
          <div className="glass-card" style={{ padding: '12px 16px', background: 'var(--primary-glow)', border: '1px solid var(--border-color-active)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Carry Forward Balance</span>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-mono)' }}>
                {isPnlVisible ? formatCurrency(startingBalanceOfMonth) : '••••'}
              </h3>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ledger Month</span>
              <strong style={{ display: 'block', fontSize: '0.85rem', color: 'var(--primary)' }}>
                {(() => {
                  const parts = selectedMonthStr.split('-');
                  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
                  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                })()}
              </strong>
            </div>
          </div>

          {/* Table list */}
          <div className="glass-card" style={{ padding: '20px', overflowX: 'auto' }}>
            {viewType === 'detailed' ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', background: 'rgba(255,255,255,0.01)', padding: '8px 12px', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {selectedRowId ? (() => {
                      const selectedItem = detailedLedger.find(item => item.id === selectedRowId);
                      if (selectedItem?.isAdjustment) {
                        return 'Selected: Capital Flow Adjustment entry';
                      }
                      return 'Selected: Trade Log record (Read-Only in Ledger)';
                    })() : '💡 Click on any entry row in the ledger below to select it.'}
                  </span>
                  {selectedRowId && (() => {
                    const selectedItem = detailedLedger.find(item => item.id === selectedRowId);
                    if (selectedItem?.isAdjustment) {
                      return (
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => {
                            if (confirm('Delete this adjustment entry? This will reverse double-entry bank balances!')) {
                              deleteCapitalAdjustment(selectedRowId);
                              setSelectedRowId(null);
                            }
                          }}
                          style={{ padding: '4px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', height: '26px' }}
                        >
                          <Trash2 size={11} />
                          <span>Delete Capital Flow</span>
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>

                <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '8px' }}>Date & Time</th>
                      <th style={{ padding: '8px' }}>Particulars / Narration</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Debit (₹)</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Credit (₹)</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Month Carry Forward line */}
                    <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{selectedMonthStr}-01</td>
                      <td style={{ padding: '8px', fontWeight: 650, color: 'var(--text-dim)' }}>Opening Balance Carry-Forward</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>-</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>-</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {isPnlVisible ? formatCurrency(startingBalanceOfMonth) : '••••'}
                      </td>
                    </tr>
                    {(() => {
                      let runningBal = startingBalanceOfMonth;
                      return filteredLedgerItems.map((item) => {
                        runningBal += item.netPnL;
                        const isAdjustment = item.isAdjustment;
                        return (
                          <tr 
                            key={item.id} 
                            onClick={() => setSelectedRowId(selectedRowId === item.id ? null : item.id)}
                            style={{ 
                              borderBottom: '1px solid var(--border-color)', 
                              background: selectedRowId === item.id ? 'var(--primary-glow)' : 'transparent',
                              cursor: 'pointer'
                            }}
                          >
                            <td style={{ padding: '8px' }}>{item.date} <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{item.time}</span></td>
                            <td style={{ padding: '8px', color: isAdjustment ? 'var(--primary)' : 'var(--text-main)' }}>
                              {item.particulars}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', color: 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                              {item.netPnL < 0 ? (isPnlVisible ? formatCurrency(Math.abs(item.netPnL)) : '••••') : '-'}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', color: 'var(--color-win)', fontFamily: 'var(--font-mono)' }}>
                              {item.netPnL >= 0 ? (isPnlVisible ? formatCurrency(item.netPnL) : '••••') : '-'}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: runningBal >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                              {isPnlVisible ? formatCurrency(runningBal) : '••••'}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </>
            ) : (
              /* Daily Summaries */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily Realized activity & capital flow summary grid:</span>
                <table className="custom-table" style={{ width: '100%', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '8px' }}>Date</th>
                      <th style={{ padding: '8px' }}>Activity / Particulars</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Charges</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Net Impact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const daysMap: Record<string, { count: number; charges: number; net: number; deposits: number; withdrawals: number }> = {};
                      
                      const monthlyTrades = trades.filter(t => t.date.substring(0, 7) === selectedMonthStr);
                      const monthlyAdjustments = capitalAdjustments.filter(a => a.date.substring(0, 7) === selectedMonthStr);

                      monthlyTrades.forEach(t => {
                        if (!daysMap[t.date]) daysMap[t.date] = { count: 0, charges: 0, net: 0, deposits: 0, withdrawals: 0 };
                        daysMap[t.date].count += 1;
                        daysMap[t.date].charges += (t.brokerage + t.taxes);
                        daysMap[t.date].net += t.netPnL;
                      });

                      monthlyAdjustments.forEach(a => {
                        if (!daysMap[a.date]) daysMap[a.date] = { count: 0, charges: 0, net: 0, deposits: 0, withdrawals: 0 };
                        if (a.type === 'DEPOSIT') {
                          daysMap[a.date].deposits += a.amount;
                        } else {
                          daysMap[a.date].withdrawals += a.amount;
                        }
                      });
                      
                      const entries = Object.entries(daysMap).sort((a, b) => b[0].localeCompare(a[0]));

                      if (entries.length === 0) {
                        return (
                          <tr>
                            <td colSpan={4} style={{ padding: '24px', textTransform: 'none', color: 'var(--text-dim)', textAlign: 'center' }}>
                              No activity (trades or capital flows) recorded in this month.
                            </td>
                          </tr>
                        );
                      }

                      return entries.map(([day, stats]) => {
                        const netImpact = stats.net + stats.deposits - stats.withdrawals;
                        const particulars = [];
                        if (stats.count > 0) particulars.push(`${stats.count} Trades`);
                        if (stats.deposits > 0) particulars.push(`Deposit +${formatCurrency(stats.deposits)}`);
                        if (stats.withdrawals > 0) particulars.push(`Withdrawal -${formatCurrency(stats.withdrawals)}`);

                        return (
                          <tr key={day} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px', fontWeight: 600 }}>{day}</td>
                            <td style={{ padding: '8px' }}>
                              {particulars.join(' | ')}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-muted)' }}>
                              {stats.count > 0 ? (isPnlVisible ? formatCurrency(stats.charges) : '••••') : '-'}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: netImpact >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                              {netImpact >= 0 ? '+' : ''}{isPnlVisible ? formatCurrency(netImpact) : '••••'}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB CONTENT 2: BANK LEDGER --- */}
      {activeLedgerTab === 'bank' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Bank balances cards grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '16px', background: 'rgba(52, 211, 153, 0.03)', border: '1px solid rgba(52, 211, 153, 0.15)' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Combined Bank Balance</span>
              <h2 style={{ margin: '4px 0', fontSize: '1.4rem', fontFamily: 'var(--font-mono)', color: 'var(--color-win)' }}>
                {isPnlVisible ? formatCurrency(bankAccounts.filter(b => b.active).reduce((sum, b) => sum + getBankSummary(b.id).currentBalance, 0)) : '••••'}
              </h2>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                Sum of {bankAccounts.filter(b=>b.active).length} active bank ledgers
              </span>
            </div>

            <div className="glass-card" style={{ padding: '16px' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filtered Starting Balance</span>
              <h4 style={{ margin: '4px 0', fontSize: '1.2rem', fontFamily: 'var(--font-mono)' }}>
                {isPnlVisible ? formatCurrency(bankSummary.startingBalance) : '••••'}
              </h4>
            </div>

            <div className="glass-card" style={{ padding: '16px' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filtered Current Balance</span>
              <h4 style={{ margin: '4px 0', fontSize: '1.2rem', fontFamily: 'var(--font-mono)' }}>
                {isPnlVisible ? formatCurrency(bankSummary.currentBalance) : '••••'}
              </h4>
            </div>
          </div>

          {/* Transactions list */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Bank Transaction History</h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {!selectedBankTxId && '💡 Click a row to select.'}
                </span>
                
                {selectedBankTxId && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        const tx = bankTransactions.find(t => t.id === selectedBankTxId);
                        if (tx) handleEditBankTxClick(tx);
                      }}
                      style={{ padding: '4px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', height: '28px' }}
                    >
                      <Edit2 size={11} />
                      <span>Edit Transaction</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => {
                        const tx = bankTransactions.find(t => t.id === selectedBankTxId);
                        if (!tx) return;
                        const isDoubleEntry = tx.category.startsWith('Broker') || tx.category === 'Subscription/Expense';
                        const msg = isDoubleEntry 
                          ? 'Deleting this transaction will also delete any linked broker pay-in/out or subscription expense ledger records. Proceed?'
                          : 'Are you sure you want to delete this bank transaction?';
                        if (confirm(msg)) {
                          deleteDirectBankTransaction(tx.id);
                          setSelectedBankTxId(null);
                        }
                      }}
                      style={{ padding: '4px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', height: '28px' }}
                    >
                      <Trash2 size={11} />
                      <span>Delete Transaction</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                  <th style={{ padding: '8px' }}>Date</th>
                  <th style={{ padding: '8px' }}>Bank Account</th>
                  <th style={{ padding: '8px' }}>Category</th>
                  <th style={{ padding: '8px' }}>Inflow / Outflow</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Amount (₹)</th>
                  <th style={{ padding: '8px' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {activeBankTxList.map((tx) => {
                  const bank = bankAccounts.find(b => b.id === tx.bankAccountId);
                  const isInflow = tx.type === 'DEPOSIT';
                  const isSelected = selectedBankTxId === tx.id;
                  return (
                    <tr 
                      key={tx.id} 
                      onClick={() => setSelectedBankTxId(isSelected ? null : tx.id)}
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        background: isSelected ? 'var(--primary-glow)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <td style={{ padding: '8px' }}>{tx.date} <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{tx.time}</span></td>
                       <td style={{ padding: '8px', fontWeight: 600 }}>
                         {bank ? (
                           <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                             <img 
                               src={getBankLogoSvg(bank.bankName)} 
                               alt={bank.bankName} 
                               style={{ width: '15px', height: '15px', borderRadius: '50%', objectFit: 'contain', background: '#fff', padding: '1px', border: '1px solid var(--border-color)' }} 
                             />
                             <span>{bank.bankName}</span>
                           </span>
                         ) : 'Unknown Bank'}
                       </td>
                      <td style={{ padding: '8px', color: 'var(--primary)' }}>{tx.category}</td>
                      <td style={{ padding: '8px' }}>
                        <span 
                          className="badge" 
                          style={{ 
                            fontSize: '0.65rem',
                            backgroundColor: isInflow ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', 
                            color: isInflow ? 'var(--color-win)' : 'var(--color-loss)' 
                          }}
                        >
                          {isInflow ? 'Inflow (+)' : 'Outflow (-)'}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {isPnlVisible ? formatCurrency(tx.amount) : '••••'}
                      </td>
                      <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{tx.notes}</td>
                    </tr>
                  );
                })}
                {activeBankTxList.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '24px', textTransform: 'none', color: 'var(--text-dim)', textAlign: 'center' }}>
                      No transactions recorded for this bank account.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* --- TAB CONTENT 3: SUBSCRIPTIONS & EXPENSES --- */}
      {activeLedgerTab === 'subscriptions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>Subscriptions & Expenses Log</h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', marginBottom: 0 }}>
                  Track algo software licenses, newsletter services, charting platform fees, etc.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {!selectedSubId && '💡 Click a row to select.'}
                </span>

                {selectedSubId && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        const sub = subscriptionExpenses.find(s => s.id === selectedSubId);
                        if (sub) {
                          setEditSubId(sub.id);
                          setSubName(sub.name);
                          setSubAmount(sub.amount);
                          setSubDate(sub.date);
                          setSubFreq(sub.frequency);
                          setSubSource(sub.paymentSource);
                          setSubBrokerAccId(sub.brokerAccountId || '');
                          setSubBankAccId(sub.bankAccountId || '');
                          setSubNotes(sub.notes || '');
                          setIsSubOpen(true);
                        }
                      }}
                      style={{ padding: '4px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', height: '28px' }}
                    >
                      <Edit2 size={11} />
                      <span>Edit Subscription</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => {
                        if (confirm('Delete this subscription? Linked double-entry ledger impacts will be reverted.')) {
                          deleteSubscriptionExpense(selectedSubId);
                          setSelectedSubId(null);
                        }
                      }}
                      style={{ padding: '4px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', height: '28px' }}
                    >
                      <Trash2 size={11} />
                      <span>Delete Subscription</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                  <th style={{ padding: '8px' }}>Date</th>
                  <th style={{ padding: '8px' }}>Subscription Name</th>
                  <th style={{ padding: '8px' }}>Frequency</th>
                  <th style={{ padding: '8px' }}>Paid Source</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Amount (₹)</th>
                  <th style={{ padding: '8px' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {activeSubscriptionExpenses.map((sub) => {
                  let sourceLabel = '';
                  if (sub.paymentSource === 'Bank') {
                    const bank = bankAccounts.find(b => b.id === sub.bankAccountId);
                    sourceLabel = `Bank: ${bank ? bank.bankName : 'N/A'}`;
                  } else {
                    const acc = brokerAccounts.find(a => a.id === sub.brokerAccountId);
                    sourceLabel = `Broker: ${acc ? `${acc.broker} (${acc.accountName})` : 'N/A'}`;
                  }
                  const isSelected = selectedSubId === sub.id;
                  return (
                    <tr 
                      key={sub.id} 
                      onClick={() => setSelectedSubId(isSelected ? null : sub.id)}
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        background: isSelected ? 'var(--primary-glow)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <td style={{ padding: '8px' }}>{sub.date}</td>
                      <td style={{ padding: '8px', fontWeight: 650 }}>{sub.name}</td>
                      <td style={{ padding: '8px' }}>
                        <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{sub.frequency}</span>
                      </td>
                      <td style={{ padding: '8px', color: 'var(--primary)' }}>{sourceLabel}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {isPnlVisible ? formatCurrency(sub.amount) : '••••'}
                      </td>
                      <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{sub.notes}</td>
                    </tr>
                  );
                })}
                {activeSubscriptionExpenses.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '24px', textTransform: 'none', color: 'var(--text-dim)', textAlign: 'center' }}>
                      No subscriptions logged. Keep track of licenses here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* --- MODAL 1: ADD CAPITAL ADJUSTMENT --- */}
      {isAdjOpen && createPortal(
        <div className="modal-overlay" style={{ zIndex: 3100 }}>
          <div className="modal-content glass-card" style={{ width: '420px', padding: 0, overflow: 'visible' }}>
            <div className="modal-header">
              <h3>Log Broker Pay-in/Out</h3>
              <button onClick={() => setIsAdjOpen(false)} className="btn btn-secondary" style={{ border: 'none', padding: '4px' }}><X size={15}/></button>
            </div>
            <form onSubmit={handleAddAdjustmentSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
                {brokerError && <div style={{ color: 'var(--color-loss)', fontSize: '0.75rem' }}>{brokerError}</div>}
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                    <input type="radio" checked={adjType === 'DEPOSIT'} onChange={() => setAdjType('DEPOSIT')} style={{ accentColor: 'var(--primary)' }} />
                    <span>Deposit (Pay-in)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                    <input type="radio" checked={adjType === 'WITHDRAWAL'} onChange={() => setAdjType('WITHDRAWAL')} style={{ accentColor: 'var(--color-loss)' }} />
                    <span>Withdrawal (Pay-out)</span>
                  </label>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Amount (₹)</label>
                  <input type="number" value={adjAmount || ''} onChange={(e) => setAdjAmount(parseFloat(e.target.value) || 0)} className="form-input" required />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Broker Account / User</label>
                  {activeAccountId !== 'Combined' ? (
                    <input
                      type="text"
                      className="form-input"
                      value={`${brokerAccounts.find(a => a.id === activeAccountId)?.accountName} (${brokerAccounts.find(a => a.id === activeAccountId)?.broker})`}
                      disabled
                      style={{ opacity: 0.8 }}
                    />
                  ) : (
                    <select value={adjBrokerAccId} onChange={(e) => setAdjBrokerAccId(e.target.value)} className="form-select" required>
                      <option value="">Select Account</option>
                      {brokerAccounts.filter(a => a.active).map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.accountName} ({acc.broker})</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Withdraw from/Deposit into Bank Account</label>
                  <select value={adjBankAccId} onChange={(e) => setAdjBankAccId(e.target.value)} className="form-select">
                    <option value="">No Bank Impact (Cash/Direct)</option>
                    {bankAccounts.filter(b => b.active).map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} ({b.accountHolderName})</option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                    Double-entry: If selected, it logs opposing flow in Bank statement automatically.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.72rem' }}>Date</label>
                    <input type="date" value={adjDate} onChange={(e) => setAdjDate(e.target.value)} className="form-input" required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.72rem' }}>Time</label>
                    <input type="time" value={adjTime} onChange={(e) => setAdjTime(e.target.value)} className="form-input" required />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Notes</label>
                  <input type="text" value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)} placeholder="e.g. Added capital for options trading" className="form-input" />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)' }}>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.75rem' }}>
                  <Save size={12} />
                  <span>Log Capital Adjustment</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* --- MODAL 2: ADD BANK TRANSACTION --- */}
      {isBankTxOpen && createPortal(
        <div className="modal-overlay" style={{ zIndex: 3100 }}>
          <div className="modal-content glass-card" style={{ width: '400px', padding: 0, overflow: 'visible' }}>
            <div className="modal-header">
              <h3>Log Bank Transaction</h3>
              <button onClick={() => setIsBankTxOpen(false)} className="btn btn-secondary" style={{ border: 'none', padding: '4px' }}><X size={15}/></button>
            </div>
            <form onSubmit={handleAddBankTxSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Select Bank Account</label>
                  <select value={bankTxAccId} onChange={(e) => setBankTxAccId(e.target.value)} className="form-select" required>
                    <option value="">Select Bank</option>
                    {bankAccounts.filter(b => b.active).map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} ({b.accountHolderName})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                    <input type="radio" checked={bankTxType === 'DEPOSIT'} onChange={() => { setBankTxType('DEPOSIT'); setBankTxCategory('Direct Deposit'); }} style={{ accentColor: 'var(--primary)' }} />
                    <span>Inflow / Deposit (+)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                    <input type="radio" checked={bankTxType === 'WITHDRAWAL'} onChange={() => { setBankTxType('WITHDRAWAL'); setBankTxCategory('Direct Withdrawal'); }} style={{ accentColor: 'var(--color-loss)' }} />
                    <span>Outflow / Withdrawal (-)</span>
                  </label>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Transaction Category</label>
                  <select 
                    value={bankTxCategory} 
                    onChange={(e) => {
                      const cat = e.target.value;
                      setBankTxCategory(cat);
                      if (cat === 'Broker Pay-in' || cat === 'Broker Pay-out') {
                        if (brokerAccounts.filter(b => b.active).length > 0) {
                          setBankTxBrokerAccId(brokerAccounts.filter(b => b.active)[0].id);
                        }
                      } else {
                        setBankTxBrokerAccId('');
                      }
                    }} 
                    className="form-select"
                  >
                    {bankTxType === 'DEPOSIT' ? (
                      <>
                        <option value="Direct Deposit">Direct Deposit (Capital)</option>
                        <option value="Salary">Salary Inflow</option>
                        <option value="Interest">Interest Credit</option>
                        <option value="Broker Pay-out">Broker Pay-out (Transfer to Bank)</option>
                      </>
                    ) : (
                      <>
                        <option value="Direct Withdrawal">Direct Withdrawal (Personal)</option>
                        <option value="Expense">Bank Charge</option>
                        <option value="Broker Pay-in">Broker Pay-in (Transfer to Broker)</option>
                      </>
                    )}
                  </select>
                </div>

                {(bankTxCategory === 'Broker Pay-in' || bankTxCategory === 'Broker Pay-out') && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Select Target Broker Account</label>
                    <select 
                      value={bankTxBrokerAccId} 
                      onChange={(e) => setBankTxBrokerAccId(e.target.value)} 
                      className="form-select" 
                      required
                    >
                      <option value="">Select Account</option>
                      {brokerAccounts.filter(a => a.active).map(a => (
                        <option key={a.id} value={a.id}>{a.accountName} ({a.broker})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Amount (₹)</label>
                  <input type="number" value={bankTxAmount || ''} onChange={(e) => setBankTxAmount(parseFloat(e.target.value) || 0)} className="form-input" required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.72rem' }}>Date</label>
                    <input type="date" value={bankTxDate} onChange={(e) => setBankTxDate(e.target.value)} className="form-input" required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.72rem' }}>Time</label>
                    <input type="time" value={bankTxTime} onChange={(e) => setBankTxTime(e.target.value)} className="form-input" required />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Notes / Description</label>
                  <input type="text" value={bankTxNotes} onChange={(e) => setBankTxNotes(e.target.value)} placeholder="e.g. Salary credited" className="form-input" />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)' }}>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.75rem' }}>
                  <Save size={12} />
                  <span>Log Bank Transaction</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* --- MODAL: EDIT BANK TRANSACTION --- */}
      {isEditBankTxOpen && createPortal(
        <div className="modal-overlay" style={{ zIndex: 3100 }}>
          <div className="modal-content glass-card" style={{ width: '400px', padding: 0, overflow: 'visible' }}>
            <div className="modal-header">
              <h3>Edit Bank Transaction</h3>
              <button onClick={() => { setIsEditBankTxOpen(false); setEditBankTxId(null); }} className="btn btn-secondary" style={{ border: 'none', padding: '4px' }}><X size={15}/></button>
            </div>
            <form onSubmit={handleEditBankTxSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Select Bank Account</label>
                  <select value={editBankTxAccId} onChange={(e) => setEditBankTxAccId(e.target.value)} className="form-select" required>
                    <option value="">Select Bank</option>
                    {bankAccounts.filter(b => b.active).map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} ({b.accountHolderName})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                    <input type="radio" checked={editBankTxType === 'DEPOSIT'} onChange={() => { setEditBankTxType('DEPOSIT'); setEditBankTxCategory('Direct Deposit'); }} style={{ accentColor: 'var(--primary)' }} />
                    <span>Inflow / Deposit (+)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                    <input type="radio" checked={editBankTxType === 'WITHDRAWAL'} onChange={() => { setEditBankTxType('WITHDRAWAL'); setEditBankTxCategory('Direct Withdrawal'); }} style={{ accentColor: 'var(--color-loss)' }} />
                    <span>Outflow / Withdrawal (-)</span>
                  </label>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Transaction Category</label>
                  <select 
                    value={editBankTxCategory} 
                    onChange={(e) => {
                      const cat = e.target.value;
                      setEditBankTxCategory(cat);
                      if (cat === 'Broker Pay-in' || cat === 'Broker Pay-out') {
                        if (brokerAccounts.filter(b => b.active).length > 0) {
                          setEditBankTxBrokerAccId(brokerAccounts.filter(b => b.active)[0].id);
                        }
                      } else {
                        setEditBankTxBrokerAccId('');
                      }
                    }} 
                    className="form-select"
                  >
                    {editBankTxType === 'DEPOSIT' ? (
                      <>
                        <option value="Direct Deposit">Direct Deposit (Capital)</option>
                        <option value="Salary">Salary Inflow</option>
                        <option value="Interest">Interest Credit</option>
                        <option value="Broker Pay-out">Broker Pay-out (Transfer to Bank)</option>
                      </>
                    ) : (
                      <>
                        <option value="Direct Withdrawal">Direct Withdrawal (Personal)</option>
                        <option value="Expense">Bank Charge</option>
                        <option value="Broker Pay-in">Broker Pay-in (Transfer to Broker)</option>
                      </>
                    )}
                  </select>
                </div>

                {(editBankTxCategory === 'Broker Pay-in' || editBankTxCategory === 'Broker Pay-out') && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Select Target Broker Account</label>
                    <select 
                      value={editBankTxBrokerAccId} 
                      onChange={(e) => setEditBankTxBrokerAccId(e.target.value)} 
                      className="form-select" 
                      required
                    >
                      <option value="">Select Account</option>
                      {brokerAccounts.filter(a => a.active).map(a => (
                        <option key={a.id} value={a.id}>{a.accountName} ({a.broker})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Amount (₹)</label>
                  <input type="number" value={editBankTxAmount || ''} onChange={(e) => setEditBankTxAmount(parseFloat(e.target.value) || 0)} className="form-input" required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.72rem' }}>Date</label>
                    <input type="date" value={editBankTxDate} onChange={(e) => setEditBankTxDate(e.target.value)} className="form-input" required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.72rem' }}>Time</label>
                    <input type="time" value={editBankTxTime} onChange={(e) => setEditBankTxTime(e.target.value)} className="form-input" required />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Notes / Description</label>
                  <input type="text" value={editBankTxNotes} onChange={(e) => setEditBankTxNotes(e.target.value)} placeholder="e.g. Salary credited" className="form-input" />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)' }}>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.75rem' }}>
                  <Save size={12} />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* --- MODAL 3: LOG SUBSCRIPTION EXPENSE --- */}
      {isSubOpen && createPortal(
        <div className="modal-overlay" style={{ zIndex: 3100 }}>
          <div className="modal-content glass-card" style={{ width: '400px', padding: 0, overflow: 'visible' }}>
            <div className="modal-header">
              <h3>{editSubId ? 'Edit Subscription Expense' : 'Log Subscription Expense'}</h3>
              <button 
                onClick={() => { 
                  setIsSubOpen(false); 
                  setEditSubId(null); 
                  setSubName(''); 
                  setSubAmount(0); 
                  setSubNotes(''); 
                }} 
                className="btn btn-secondary" 
                style={{ border: 'none', padding: '4px' }}
              >
                <X size={15}/>
              </button>
            </div>
            <form onSubmit={handleAddSubSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Subscription Name</label>
                  <input type="text" value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="e.g. TradingView Pro / Tradetron" className="form-input" required />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Amount (₹)</label>
                  <input type="number" value={subAmount || ''} onChange={(e) => setSubAmount(parseFloat(e.target.value) || 0)} className="form-input" required />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.72rem' }}>Payment Date</label>
                    <input type="date" value={subDate} onChange={(e) => setSubDate(e.target.value)} className="form-input" required />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.72rem' }}>Frequency</label>
                    <select value={subFreq} onChange={(e) => setSubFreq(e.target.value as any)} className="form-select">
                      <option value="Monthly">Monthly</option>
                      <option value="Yearly">Yearly</option>
                      <option value="One-Time">One-Time</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Payment Source</label>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                      <input type="radio" checked={subSource === 'Bank'} onChange={() => setSubSource('Bank')} style={{ accentColor: 'var(--primary)' }} />
                      <span>Bank Account</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>
                      <input type="radio" checked={subSource === 'Broker'} onChange={() => setSubSource('Broker')} style={{ accentColor: 'var(--color-loss)' }} />
                      <span>Broker Ledger</span>
                    </label>
                  </div>
                </div>

                {subSource === 'Bank' ? (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Deduct from Bank Account</label>
                    <select value={subBankAccId} onChange={(e) => setSubBankAccId(e.target.value)} className="form-select" required>
                      <option value="">Select Bank</option>
                      {bankAccounts.filter(b => b.active).map(b => (
                        <option key={b.id} value={b.id}>{b.bankName} ({b.accountHolderName})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Deduct from Broker Ledger</label>
                    {activeAccountId !== 'Combined' ? (
                      <input
                        type="text"
                        className="form-input"
                        value={`${brokerAccounts.find(a => a.id === activeAccountId)?.accountName} (${brokerAccounts.find(a => a.id === activeAccountId)?.broker})`}
                        disabled
                        style={{ opacity: 0.8 }}
                      />
                    ) : (
                      <select value={subBrokerAccId} onChange={(e) => setSubBrokerAccId(e.target.value)} className="form-select" required>
                        <option value="">Select Account</option>
                        {brokerAccounts.filter(a => a.active).map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.accountName} ({acc.broker})</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Notes</label>
                  <input type="text" value={subNotes} onChange={(e) => setSubNotes(e.target.value)} placeholder="e.g. Charting subscription fee" className="form-input" />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)' }}>
                <button type="submit" className="btn btn-primary" style={{ fontSize: '0.75rem' }}>
                  <Save size={12} />
                  <span>{editSubId ? 'Save Changes' : 'Log Subscription Expense'}</span>
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
