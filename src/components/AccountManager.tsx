import React, { useState } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { 
  Plus, Edit2, Trash, Briefcase, BarChart2, ArrowUpRight,
  RefreshCw, Save, Eye, EyeOff
} from 'lucide-react';
import logoImg from '../assets/tradediary_logo.png';
import { BROKER_LOGOS } from '../utils/brandLogos';

export function AccountManager() {
  const { 
    trades, 
    baseCapital, 
    capitalAdjustments,
    investments,
    addInvestment,
    editInvestment,
    deleteInvestment,
    exitInvestment,
    isPnlVisible,
    togglePnlVisibility,
    brokerAccounts,
    syncAllInvestmentPrices
  } = useTradeStore();

  // Investment Form States
  const [isInvFormOpen, setIsInvFormOpen] = useState(false);
  const [editInvId, setEditInvId] = useState<string | null>(null);
  const [invType, setInvType] = useState<'ETF' | 'BOND' | 'EQUITY'>('ETF');
  const [invSymbol, setInvSymbol] = useState('');
  const [invQty, setInvQty] = useState('');
  const [invBuyPrice, setInvBuyPrice] = useState('');
  const [invCurrentPrice, setInvCurrentPrice] = useState('');
  const [invDate, setInvDate] = useState('');
  const [invNotes, setInvNotes] = useState('');

  // Exit Asset form states
  const [isExitFormOpen, setIsExitFormOpen] = useState(false);
  const [exitInvId, setExitInvId] = useState<string | null>(null);
  const [exitInv, setExitInv] = useState<any | null>(null);
  const [exitQty, setExitQty] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [exitDate, setExitDate] = useState('');
  const [exitNotes, setExitNotes] = useState('');

  // Sub-navigation tab for ledger view
  const [ledgerSubTab, setLedgerSubTab] = useState<'active' | 'exited'>('active');



  // Calculations: Trading Portfolio
  const totalTradingNetPnL = trades.reduce((acc, t) => acc + t.netPnL, 0);
  const totalDeposits = capitalAdjustments.filter((a) => a.type === 'DEPOSIT').reduce((acc, a) => acc + a.amount, 0);
  const totalWithdrawals = capitalAdjustments.filter((a) => a.type === 'WITHDRAWAL').reduce((acc, a) => acc + a.amount, 0);
  const currentCapital = baseCapital + totalTradingNetPnL + totalDeposits - totalWithdrawals;

  // Calculations: Investments Ledger
  const activeInvestments = investments.filter(inv => inv.status !== 'EXITED');
  const exitedInvestments = investments.filter(inv => inv.status === 'EXITED');

  const totalInvInvested = activeInvestments.reduce((acc, inv) => acc + (inv.buyPrice * inv.qty), 0);
  const totalInvCurrent = activeInvestments.reduce((acc, inv) => acc + (inv.currentPrice * inv.qty), 0);
  const activeReturns = totalInvCurrent - totalInvInvested;
  
  const realizedInvReturns = exitedInvestments.reduce((acc, inv) => acc + (((inv.exitPrice || 0) - inv.buyPrice) * inv.qty), 0);
  const totalInvReturnsPct = totalInvInvested > 0 ? (activeReturns / totalInvInvested) * 100 : 0;

  // Calculations: Combined Wealth Portfolio
  const combinedWealth = currentCapital + totalInvCurrent;





  // Live Price Sync logic
  const [syncPricesLoading, setSyncPricesLoading] = useState(false);



  const handleSyncAllPrices = async () => {
    const activeInvs = investments.filter((i) => i.status === 'ACTIVE');
    if (activeInvs.length === 0) return;
    
    setSyncPricesLoading(true);
    const { updatedCount, failedSymbols } = await syncAllInvestmentPrices();
    
    if (updatedCount > 0) {
      if (failedSymbols.length > 0) {
        alert(`Synchronized latest prices for ${updatedCount} assets. Failed symbols: ${failedSymbols.join(', ')}`);
      } else {
        alert(`Successfully synchronized latest day-end market prices for ${updatedCount} assets!`);
      }
    } else {
      alert("Could not update prices. Please check internet connection or symbols format.");
    }
    
    setSyncPricesLoading(false);
  };

  // Handlers: Investments form
  const handleAddOrEditInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(invQty);
    const buyPrice = parseFloat(invBuyPrice);
    const currentPrice = parseFloat(invCurrentPrice) || buyPrice;
    
    if (!invSymbol.trim()) {
      alert('Please enter an asset symbol.');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      alert('Quantity must be greater than zero.');
      return;
    }
    if (isNaN(buyPrice) || buyPrice <= 0) {
      alert('Buy Price must be greater than zero.');
      return;
    }

    const payload = {
      type: invType,
      symbol: invSymbol.trim().toUpperCase(),
      qty,
      buyPrice,
      currentPrice,
      date: invDate || new Date().toISOString().split('T')[0],
      notes: invNotes.trim(),
      status: 'ACTIVE' as const
    };

    if (editInvId) {
      editInvestment(editInvId, payload);
      alert('Investment updated successfully!');
    } else {
      addInvestment(payload);
      alert('Investment logged successfully!');
    }
    resetInvForm();
  };

  const handleEditInvClick = (inv: any) => {
    setEditInvId(inv.id);
    setInvType(inv.type);
    setInvSymbol(inv.symbol);
    setInvQty(inv.qty.toString());
    setInvBuyPrice(inv.buyPrice.toString());
    setInvCurrentPrice(inv.currentPrice.toString());
    setInvDate(inv.date);
    setInvNotes(inv.notes || '');
    setIsInvFormOpen(true);
  };

  const handleDeleteInvClick = (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this investment log?')) {
      deleteInvestment(id);
      alert('Record deleted.');
    }
  };

  const handleExitInvClick = (inv: any) => {
    setExitInvId(inv.id);
    setExitInv(inv);
    setExitQty(inv.qty.toString());
    setExitPrice(inv.currentPrice.toString());
    setExitDate(new Date().toISOString().split('T')[0]);
    setExitNotes('');
    setIsExitFormOpen(true);
  };

  const handleExitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exitInvId || !exitInv) return;

    const parsedPrice = parseFloat(exitPrice);
    const parsedQty = parseInt(exitQty);
    
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert('Please enter a valid exit price.');
      return;
    }
    if (isNaN(parsedQty) || parsedQty <= 0 || parsedQty > exitInv.qty) {
      alert(`Please enter a valid quantity between 1 and ${exitInv.qty}.`);
      return;
    }

    if (!window.confirm(`Log sale exit for ${parsedQty} units of ${exitInv.symbol} at ₹${parsedPrice}?`)) {
      return;
    }

    exitInvestment(exitInvId, parsedPrice, exitDate || new Date().toISOString().split('T')[0], exitNotes.trim() || 'Exited investment.', parsedQty);
    alert('Asset exit logged successfully!');
    resetExitForm();
  };

  const resetInvForm = () => {
    setEditInvId(null);
    setInvSymbol('');
    setInvQty('');
    setInvBuyPrice('');
    setInvCurrentPrice('');
    setInvDate('');
    setInvNotes('');
    setIsInvFormOpen(false);
  };

  const resetExitForm = () => {
    setExitInvId(null);
    setExitInv(null);
    setExitQty('');
    setExitPrice('');
    setExitDate('');
    setExitNotes('');
    setIsExitFormOpen(false);
  };

  return (
    <div className="animate-tab-panel grid-2col-12-2" style={{ alignItems: 'start', gap: '24px' }}>
      
      {/* Left Column: Wealth Metrics, Allocation Pie Chart & Calculators */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Wealth overview */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <img src={logoImg} alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Portfolio Overview</h2>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Long-Term & Trading Assets Balance</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Trading Capital:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>₹{isPnlVisible ? Math.round(currentCapital).toLocaleString('en-IN') : '••••'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Investment Value:</span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>₹{isPnlVisible ? Math.round(totalInvCurrent).toLocaleString('en-IN') : '••••'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', borderTop: '1px dashed var(--border-color)', paddingTop: '8px', marginTop: '2px' }}>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Combined Portfolio Wealth:</span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-win)', fontSize: '0.9rem' }}>
                ₹{isPnlVisible ? Math.round(combinedWealth).toLocaleString('en-IN') : '••••'}
              </strong>
            </div>
          </div>
        </div>

        {/* Allocation Pie Chart */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BarChart2 size={15} color="var(--primary)" />
            Asset Allocation Ratio
          </h3>
          <div style={{ height: '140px' }}>
            {activeInvestments.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'ETFs', value: activeInvestments.filter(i => i.type === 'ETF').reduce((acc, i) => acc + (i.currentPrice * i.qty), 0) },
                      { name: 'Bonds', value: activeInvestments.filter(i => i.type === 'BOND').reduce((acc, i) => acc + (i.currentPrice * i.qty), 0) },
                      { name: 'Stocks', value: activeInvestments.filter(i => i.type === 'EQUITY').reduce((acc, i) => acc + (i.currentPrice * i.qty), 0) }
                    ].filter(item => item.value > 0)}
                    cx="50%"
                    cy="45%"
                    innerRadius={30}
                    outerRadius={45}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {[1, 2, 3].map((_entry, index) => {
                      const COLORS = ['#007aff', '#34c759', '#ff9500'];
                      return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip formatter={(value: any) => `₹${value.toLocaleString('en-IN')}`} />
                  <Legend iconSize={6} iconType="circle" wrapperStyle={{ fontSize: '0.68rem' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '0.72rem', color: 'var(--text-dim)', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                No active investments recorded.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Right Column: Long-Term Investments Assets Ledger */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
        
        {/* Form Drawer (Add/Edit Investment) */}
        {isInvFormOpen && (
          <div className="glass-card animate-tab-panel" style={{ padding: '20px', border: '1px solid var(--border-color-active)' }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-main)', marginTop: 0 }}>
              {editInvId ? 'Edit Asset Purchase Log' : 'Record New Investment Purchase'}
            </h4>
            <form onSubmit={handleAddOrEditInvestment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="grid-2col-equal-small">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Asset Class Type</label>
                  <select value={invType} onChange={(e) => setInvType(e.target.value as any)} className="form-input" style={{ height: '32px', padding: '0 8px' }}>
                    <option value="EQUITY">Equity (Stocks / Shares)</option>
                    <option value="ETF">ETF (Exchange Traded Fund)</option>
                    <option value="BOND">Government Bond / Debt</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Asset Symbol / Name</label>
                  <input type="text" placeholder="e.g. NIFTYBEES" value={invSymbol} onChange={(e) => setInvSymbol(e.target.value)} className="form-input" style={{ height: '32px' }} required />
                </div>
              </div>

              <div className="grid-3col-equal-small">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Quantity</label>
                  <input type="number" placeholder="e.g. 10" value={invQty} onChange={(e) => setInvQty(e.target.value)} className="form-input" style={{ height: '32px' }} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Avg. Buy Price (₹)</label>
                  <input type="number" step="0.01" placeholder="e.g. 215.50" value={invBuyPrice} onChange={(e) => { setInvBuyPrice(e.target.value); if(!editInvId) setInvCurrentPrice(e.target.value); }} className="form-input" style={{ height: '32px' }} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Current Price (₹)</label>
                  <input type="number" step="0.01" placeholder="e.g. 235.00" value={invCurrentPrice} onChange={(e) => setInvCurrentPrice(e.target.value)} className="form-input" style={{ height: '32px' }} />
                </div>
              </div>

              <div className="grid-2col-1-2-small">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Purchase Date</label>
                  <input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} className="form-input" style={{ height: '32px' }} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Notes / Remarks</label>
                  <input type="text" placeholder="e.g. Sip investment via Groww" value={invNotes} onChange={(e) => setInvNotes(e.target.value)} className="form-input" style={{ height: '32px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={resetInvForm} style={{ height: '32px' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ height: '32px' }}>
                  <Save size={13} />
                  <span>{editInvId ? 'Update Record' : 'Record Purchase'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Asset Ledger Main Card */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.02rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Briefcase size={16} color="var(--primary)" />
              Delivery Investments Assets Ledger
            </h3>
            {!isInvFormOpen && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={togglePnlVisibility}
                  title={isPnlVisible ? "Hide P&L balances" : "Show P&L balances"}
                >
                  {isPnlVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                {investments.filter(i => i.status === 'ACTIVE').length > 0 && (
                  <button type="button" className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={handleSyncAllPrices} disabled={syncPricesLoading}>
                    <RefreshCw size={11} className={syncPricesLoading ? 'animate-spin' : ''} />
                    <span>{syncPricesLoading ? 'Syncing...' : 'Sync Live Prices'}</span>
                  </button>
                )}
                <button className="btn btn-primary" style={{ padding: '6px 10px', fontSize: '0.75rem' }} onClick={() => { setInvDate(new Date().toISOString().split('T')[0]); setIsInvFormOpen(true); }}>
                  <Plus size={11} />
                  <span>Log Purchase</span>
                </button>
              </div>
            )}
          </div>

          {/* Subtabs active vs closed */}
          <div style={{ display: 'flex', gap: '14px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <button onClick={() => setLedgerSubTab('active')} style={{ background: 'none', border: 'none', padding: '6px 2px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', color: ledgerSubTab === 'active' ? 'var(--primary)' : 'var(--text-dim)', borderBottom: ledgerSubTab === 'active' ? '2px solid var(--primary)' : '2px solid transparent', outline: 'none' }}>
              Active Holdings ({activeInvestments.length})
            </button>
            <button onClick={() => setLedgerSubTab('exited')} style={{ background: 'none', border: 'none', padding: '6px 2px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', color: ledgerSubTab === 'exited' ? 'var(--primary)' : 'var(--text-dim)', borderBottom: ledgerSubTab === 'exited' ? '2px solid var(--primary)' : '2px solid transparent', outline: 'none' }}>
              Closed Portfolio ({exitedInvestments.length})
            </button>
          </div>

          {ledgerSubTab === 'active' ? (
            <>
              {/* Active metrics */}
              <div className="grid-3col-1-1-12" style={{ marginBottom: '16px', gap: '10px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Active Cost</div>
                  <strong style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>₹{isPnlVisible ? Math.round(totalInvInvested).toLocaleString('en-IN') : '••••'}</strong>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Valuation</div>
                  <strong style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>₹{isPnlVisible ? Math.round(totalInvCurrent).toLocaleString('en-IN') : '••••'}</strong>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Returns / ROI</div>
                  <strong style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: activeReturns >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {activeReturns >= 0 ? '+' : ''}₹{isPnlVisible ? Math.round(activeReturns).toLocaleString('en-IN') : '••••'} ({totalInvReturnsPct.toFixed(1)}%)
                  </strong>
                </div>
              </div>

              {activeInvestments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)', fontSize: '0.78rem' }}>No active asset holdings. Log a purchase above!</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-dim)', textAlign: 'left' }}>
                        <th style={{ padding: '6px' }}>Asset</th>
                        <th style={{ padding: '6px' }}>Type</th>
                        <th style={{ padding: '6px' }}>Broker</th>
                        <th style={{ padding: '6px', textAlign: 'right' }}>Qty</th>
                        <th style={{ padding: '6px', textAlign: 'right' }}>Buy Avg</th>
                        <th style={{ padding: '6px', textAlign: 'right' }}>LTP</th>
                        <th style={{ padding: '6px', textAlign: 'right' }}>Unrealized P&L</th>
                        <th style={{ padding: '6px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeInvestments.map((inv) => {
                        const cost = inv.buyPrice * inv.qty;
                        const currentVal = inv.currentPrice * inv.qty;
                        const gain = currentVal - cost;
                        const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
                        const acc = brokerAccounts.find(a => a.id === inv.brokerAccountId);
                        const brokerName = inv.broker || 'Other';
                        return (
                          <tr key={inv.id} className="table-row" style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px 6px', fontWeight: 600, color: 'var(--text-main)' }}>
                              <div>{inv.symbol}</div>
                              <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontWeight: 400 }}>{inv.date}</span>
                            </td>
                            <td style={{ padding: '8px 6px' }}>
                              <span className="badge badge-neutral" style={{ fontSize: '0.58rem', padding: '2px 4px' }}>{inv.type}</span>
                            </td>
                            <td style={{ padding: '8px 6px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <img 
                                  src={BROKER_LOGOS[brokerName] || BROKER_LOGOS['Other']} 
                                  alt={brokerName} 
                                  style={{ width: '15px', height: '15px', borderRadius: '50%', objectFit: 'contain', background: '#fff', padding: '1px', border: '1px solid var(--border-color)' }} 
                                />
                                <span>{acc ? `${acc.accountName} (${brokerName})` : brokerName}</span>
                              </span>
                            </td>
                            <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{inv.qty}</td>
                            <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{isPnlVisible ? inv.buyPrice.toLocaleString('en-IN') : '••••'}</td>
                            <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{isPnlVisible ? inv.currentPrice.toLocaleString('en-IN') : '••••'}</td>
                            <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: gain >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                              <div>{gain >= 0 ? '+' : ''}₹{isPnlVisible ? Math.round(gain).toLocaleString('en-IN') : '••••'}</div>
                              <span style={{ fontSize: '0.62rem' }}>({gainPct.toFixed(1)}%)</span>
                            </td>
                            <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                <button className="btn btn-secondary" style={{ padding: '3px 5px', color: 'var(--primary)', height: '24px' }} onClick={() => handleExitInvClick(inv)} title="Exit holdings">
                                  <ArrowUpRight size={10} />
                                  <span style={{ fontSize: '0.62rem', marginLeft: '2px' }}>Exit</span>
                                </button>
                                <button className="btn btn-secondary" style={{ padding: '3px 5px', height: '24px' }} onClick={() => handleEditInvClick(inv)}><Edit2 size={10} /></button>
                                <button className="btn btn-danger" style={{ padding: '3px 5px', height: '24px' }} onClick={() => handleDeleteInvClick(inv.id)}><Trash size={10} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Closed metrics */}
              <div className="grid-2col-1-12" style={{ marginBottom: '16px', gap: '10px' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Closed Volume</div>
                  <strong style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>{exitedInvestments.length} Assets Exited</strong>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Realized Returns</div>
                  <strong style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: realizedInvReturns >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {realizedInvReturns >= 0 ? '+' : ''}₹{isPnlVisible ? Math.round(realizedInvReturns).toLocaleString('en-IN') : '••••'}
                  </strong>
                </div>
              </div>

              {exitedInvestments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)', fontSize: '0.78rem' }}>No exited investments. Log an asset sale to record exited history!</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-dim)', textAlign: 'left' }}>
                        <th style={{ padding: '6px' }}>Asset</th>
                        <th style={{ padding: '6px' }}>Type</th>
                        <th style={{ padding: '6px' }}>Broker</th>
                        <th style={{ padding: '6px', textAlign: 'right' }}>Qty</th>
                        <th style={{ padding: '6px', textAlign: 'right' }}>Cost Avg</th>
                        <th style={{ padding: '6px', textAlign: 'right' }}>Exit Avg</th>
                        <th style={{ padding: '6px', textAlign: 'right' }}>Realized Return</th>
                        <th style={{ padding: '6px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exitedInvestments.map((inv) => {
                        const cost = inv.buyPrice * inv.qty;
                        const exitVal = (inv.exitPrice || 0) * inv.qty;
                        const gain = exitVal - cost;
                        const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
                        const acc = brokerAccounts.find(a => a.id === inv.brokerAccountId);
                        const brokerName = inv.broker || 'Other';
                        return (
                          <tr key={inv.id} className="table-row" style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px 6px', fontWeight: 600, color: 'var(--text-main)' }}>
                              <div>{inv.symbol}</div>
                              <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontWeight: 400 }}>Exit: {inv.exitDate || inv.date}</span>
                            </td>
                            <td style={{ padding: '8px 6px' }}>
                              <span className="badge badge-neutral" style={{ fontSize: '0.58rem', padding: '2px 4px' }}>{inv.type}</span>
                            </td>
                            <td style={{ padding: '8px 6px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <img 
                                  src={BROKER_LOGOS[brokerName] || BROKER_LOGOS['Other']} 
                                  alt={brokerName} 
                                  style={{ width: '15px', height: '15px', borderRadius: '50%', objectFit: 'contain', background: '#fff', padding: '1px', border: '1px solid var(--border-color)' }} 
                                />
                                <span>{acc ? `${acc.accountName} (${brokerName})` : brokerName}</span>
                              </span>
                            </td>
                            <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{inv.qty}</td>
                            <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{inv.buyPrice.toLocaleString('en-IN')}</td>
                            <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{(inv.exitPrice || 0).toLocaleString('en-IN')}</td>
                            <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: gain >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                              <div>{gain >= 0 ? '+' : ''}₹{Math.round(gain).toLocaleString('en-IN')}</div>
                              <span style={{ fontSize: '0.62rem' }}>({gainPct.toFixed(1)}%)</span>
                            </td>
                            <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                              <button className="btn btn-danger" style={{ padding: '3px 5px', height: '24px' }} onClick={() => handleDeleteInvClick(inv.id)}><Trash size={10} /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* Record Asset Sale Exit Overlay Form Modal */}
      {isExitFormOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(12px)', zIndex: 3100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card animate-tab-panel" style={{ width: '100%', maxWidth: '400px', padding: '20px', border: '1.5px solid var(--border-color-active)', boxShadow: 'var(--shadow-glow)' }}>
            <h4 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-main)', marginTop: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowUpRight size={16} color="var(--primary)" />
              Record Asset Sale Exit
            </h4>
            <form onSubmit={handleExitSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                Asset: <strong>{exitInv?.symbol}</strong> | Holding Qty: <strong>{exitInv?.qty}</strong>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Exit Qty (Max: {exitInv?.qty})</label>
                <input type="number" min="1" max={exitInv?.qty} value={exitQty} onChange={(e) => setExitQty(e.target.value)} className="form-input" style={{ height: '30px' }} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Sale Exit Price (₹)</label>
                <input type="number" step="0.01" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} className="form-input" style={{ height: '30px' }} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Exit Date</label>
                <input type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)} className="form-input" style={{ height: '30px' }} required />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.72rem' }}>Exit Notes</label>
                <input type="text" placeholder="Target reached, booked profit." value={exitNotes} onChange={(e) => setExitNotes(e.target.value)} className="form-input" style={{ height: '30px' }} />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={resetExitForm} style={{ height: '30px' }}>Cancel</button>
                <button type="submit" className="btn btn-danger" style={{ height: '30px' }}>Confirm Sale</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
