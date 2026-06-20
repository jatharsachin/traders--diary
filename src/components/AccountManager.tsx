import React, { useState, useEffect } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { isSupabaseConfigured, getSupabaseConfig, clearSupabaseClientInstance } from '../utils/supabaseClient';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { 
  User, ShieldAlert, Key, Save, Download, Upload, 
  RefreshCw, Database, Trash2, Sun, Moon, IndianRupee, ShieldCheck,
  Plus, Edit2, Trash, Briefcase, Settings, Lock, BarChart2, ArrowUpRight
} from 'lucide-react';
import logoImg from '../assets/tradediary_logo.png';

export function AccountManager() {
  const { 
    trades, 
    baseCapital, 
    setBaseCapital, 
    capitalAdjustments,
    resetToMockData,
    theme,
    toggleTheme,
    pullTradesFromCloud,
    
    // Investments
    investments,
    addInvestment,
    editInvestment,
    deleteInvestment,
    exitInvestment,

    // Login settings
    loginEnabled,
    userId,
    passwordHash,
    setLoginEnabled,
    setLoginCredentials,
    isPnlVisible
  } = useTradeStore();

  // Sub-section navigation state
  const [activeSubTab, setActiveSubTab] = useState<'investments' | 'settings'>('investments');

  // Collapsible combined portfolio state
  const [isCombinedExpanded, setIsCombinedExpanded] = useState(false);

  // Capital Adjustment form states
  const [tempCapital, setTempCapital] = useState('');
  const [error, setError] = useState('');

  // Sync tempCapital with baseCapital
  useEffect(() => {
    setTempCapital(baseCapital.toString());
  }, [baseCapital]);

  // Settings form states
  const [sbUrl, setSbUrl] = useState('');
  const [sbKey, setSbKey] = useState('');

  // Load Supabase credentials
  useEffect(() => {
    const { url, key } = getSupabaseConfig();
    setSbUrl(url);
    setSbKey(key);
  }, []);

  // Security Credentials form states
  const [secUserId, setSecUserId] = useState('');
  const [secPassword, setSecPassword] = useState('');
  const [secPasswordConfirm, setSecPasswordConfirm] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');

  // Initialize security settings values
  useEffect(() => {
    setSecUserId(userId);
    setSecPassword(passwordHash);
    setSecPasswordConfirm(passwordHash);
  }, [userId, passwordHash]);

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

  // Average Buy Price Calculator State
  const [avgCalcCurrentPrice, setAvgCalcCurrentPrice] = useState('');
  const [avgCalcCurrentQty, setAvgCalcCurrentQty] = useState('');
  const [avgCalcNewPrice, setAvgCalcNewPrice] = useState('');
  const [avgCalcNewQty, setAvgCalcNewQty] = useState('');

  // Drawdown Recovery Simulator State
  const [calcRiskPerTradePct, setCalcRiskPerTradePct] = useState('1');
  const [calcTargetRr, setCalcTargetRr] = useState('2');
  const [calcWinRatePct, setCalcWinRatePct] = useState('50');

  const calcCurrentVal = parseFloat(avgCalcCurrentPrice) * parseFloat(avgCalcCurrentQty) || 0;
  const calcNewVal = parseFloat(avgCalcNewPrice) * parseFloat(avgCalcNewQty) || 0;
  const calcTotalQty = parseFloat(avgCalcCurrentQty) + parseFloat(avgCalcNewQty) || 0;
  const calcNewAvgPrice = calcTotalQty > 0 ? (calcCurrentVal + calcNewVal) / calcTotalQty : 0;
  const calcTotalInvested = calcCurrentVal + calcNewVal;

  // Calculations: Trading Portfolio
  const totalTradingNetPnL = trades.reduce((acc, t) => acc + t.netPnL, 0);
  const totalDeposits = capitalAdjustments.filter((a) => a.type === 'DEPOSIT').reduce((acc, a) => acc + a.amount, 0);
  const totalWithdrawals = capitalAdjustments.filter((a) => a.type === 'WITHDRAWAL').reduce((acc, a) => acc + a.amount, 0);
  const currentCapital = baseCapital + totalTradingNetPnL + totalDeposits - totalWithdrawals;

  // Calculations: Drawdown Recovery
  const getPeakCapitalAndDrawdown = () => {
    const sortedTrades = [...trades].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.entryTime}`);
      const dateB = new Date(`${b.date}T${b.entryTime}`);
      return dateA.getTime() - dateB.getTime();
    });

    let peakPnL = 0;
    let runningPnL = 0;
    
    for (const t of sortedTrades) {
      runningPnL += t.netPnL;
      if (runningPnL > peakPnL) {
        peakPnL = runningPnL;
      }
    }

    const peakCapital = baseCapital + peakPnL + totalDeposits - totalWithdrawals;
    const drawdownRupees = Math.max(0, peakCapital - currentCapital);
    const drawdownPct = peakCapital > 0 ? (drawdownRupees / peakCapital) * 100 : 0;
    const recoveryRequiredPct = currentCapital > 0 && drawdownRupees > 0
      ? (drawdownRupees / currentCapital) * 100
      : 0;

    return { peakCapital, drawdownRupees, drawdownPct, recoveryRequiredPct };
  };

  const { peakCapital, drawdownRupees, drawdownPct, recoveryRequiredPct } = getPeakCapitalAndDrawdown();

  const wrVal = parseFloat(calcWinRatePct) / 100 || 0;
  const riskVal = parseFloat(calcRiskPerTradePct) || 0;
  const rrVal = parseFloat(calcTargetRr) || 0;
  const expectedReturnPerTradePct = riskVal * (wrVal * rrVal - (1 - wrVal));
  const expectedTradesToRecover = expectedReturnPerTradePct > 0 ? Math.ceil(drawdownPct / expectedReturnPerTradePct) : 0;

  // Calculations: Investments Ledger (filtering by status to support exits)
  const activeInvestments = investments.filter(inv => inv.status !== 'EXITED');
  const exitedInvestments = investments.filter(inv => inv.status === 'EXITED');

  const totalInvInvested = activeInvestments.reduce((acc, inv) => acc + (inv.buyPrice * inv.qty), 0);
  const totalInvCurrent = activeInvestments.reduce((acc, inv) => acc + (inv.currentPrice * inv.qty), 0);
  const activeReturns = totalInvCurrent - totalInvInvested;
  
  const realizedInvReturns = exitedInvestments.reduce((acc, inv) => acc + (((inv.exitPrice || 0) - inv.buyPrice) * inv.qty), 0);
  const totalInvReturns = activeReturns + realizedInvReturns;
  const totalInvReturnsPct = totalInvInvested > 0 ? (activeReturns / totalInvInvested) * 100 : 0;

  // Calculations: Combined Wealth Portfolio
  const combinedWealth = currentCapital + totalInvCurrent;
  const combinedInvested = baseCapital + totalInvInvested;
  const combinedReturn = totalTradingNetPnL + totalInvReturns;
  const combinedReturnPct = combinedInvested > 0 ? (combinedReturn / combinedInvested) * 100 : 0;

  // Handlers: Capital Config
  const handleCapitalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = parseFloat(tempCapital);
    if (isNaN(parsed) || parsed < 1000) {
      setError("Starting Capital must be at least ₹1,000.");
      setTempCapital(baseCapital.toString());
      return;
    }

    if (parsed === baseCapital) return;

    const confirmChange = window.confirm(
      `Are you sure you want to change your Starting Capital from ₹${baseCapital.toLocaleString('en-IN')} to ₹${parsed.toLocaleString('en-IN')}?\nAll calculations, returns, and statements will be adjusted.`
    );
    if (confirmChange) {
      setBaseCapital(parsed);
      alert('Starting Capital successfully updated!');
    } else {
      setTempCapital(baseCapital.toString());
    }
  };

  // Handlers: Cloud database
  const handleSaveDbSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!window.confirm('Are you sure you want to save these database settings and synchronize your trades?')) {
      return;
    }

    localStorage.setItem('traders_diary_sb_url', sbUrl.trim());
    localStorage.setItem('traders_diary_sb_key', sbKey.trim());
    clearSupabaseClientInstance(); // Reset Supabase client instance

    if (sbUrl.trim() !== '' && sbKey.trim() !== '') {
      pullTradesFromCloud().then((success) => {
        if (success) {
          alert('Successfully linked to Supabase cloud and synchronized trades!');
        } else {
          alert('Connected to client, but failed to synchronize table logs. Verify your trades table schema.');
        }
      });
    } else {
      alert('Supabase credentials cleared.');
    }
  };

  const handleCloudPullSync = async () => {
    if (!isSupabaseConfigured()) {
      alert('Please configure Supabase database credentials first.');
      return;
    }
    const success = await pullTradesFromCloud();
    if (success) {
      alert('Data successfully pulled and synchronized from Supabase cloud database!');
    } else {
      alert('Sync failed. Please verify your internet connection and table permissions.');
    }
  };

  // Handlers: Backups
  const handleExportBackup = () => {
    try {
      const backupData = {
        trades,
        capital: baseCapital,
        adjustments: capitalAdjustments,
        investments
      };
      const dataStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const filename = `tradediary_pro_backup_${new Date().toISOString().split('T')[0]}.json`;
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Failed to generate backup JSON file.');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      if (!window.confirm('Are you sure you want to restore this backup? This will overwrite your current local logs/investments and reload the application.')) {
        e.target.value = '';
        return;
      }
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          
          if (parsed && parsed.trades && Array.isArray(parsed.trades)) {
            localStorage.setItem('traders_diary_trades', JSON.stringify(parsed.trades));
            if (typeof parsed.capital === 'number') {
              localStorage.setItem('traders_diary_capital', parsed.capital.toString());
            }
            if (Array.isArray(parsed.adjustments)) {
              localStorage.setItem('traders_diary_adjustments', JSON.stringify(parsed.adjustments));
            }
            if (Array.isArray(parsed.investments)) {
              localStorage.setItem('traders_diary_investments', JSON.stringify(parsed.investments));
            }
            alert("Backup restored successfully!");
            window.location.reload();
          } else if (Array.isArray(parsed)) {
            if (parsed.length === 0 || (parsed[0].hasOwnProperty('symbol') && parsed[0].hasOwnProperty('netPnL'))) {
              localStorage.setItem('traders_diary_trades', JSON.stringify(parsed));
              alert("Legacy trades backup restored successfully!");
              window.location.reload();
            } else {
              alert("Invalid backup file. The trade structure is incorrect.");
            }
          } else {
            alert("Invalid backup format.");
          }
        } catch (error) {
          alert("Failed to parse the file. Verify it is a valid backup JSON.");
        }
      };
    }
  };

  // Handlers: Security Credentials
  const handleSecuritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSecuritySuccess('');
    setError('');

    if (secPassword !== secPasswordConfirm) {
      setError('Passwords do not match.');
      return;
    }

    if (secUserId.trim().length < 3) {
      setError('User ID must be at least 3 characters.');
      return;
    }

    if (secPassword.trim().length < 3) {
      setError('Password must be at least 3 characters.');
      return;
    }

    if (!window.confirm('Are you sure you want to update your security credentials?')) {
      return;
    }

    setLoginCredentials(secUserId.trim(), secPassword);
    setSecuritySuccess('Security credentials successfully updated!');
  };

  const handleToggleLoginLock = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      if (window.confirm('Enable login password protection? You will be prompted to log in next time you refresh or reopen the software.')) {
        setLoginEnabled(true);
      }
    } else {
      if (window.confirm('Disable login password protection? Anyone opening the browser will be able to access your financial journals without a password.')) {
        setLoginEnabled(false);
      }
    }
  };

  // Handlers: Investments form
  const handleAddOrEditInvestment = (e: React.FormEvent) => {
    e.preventDefault();
    
    const qty = parseInt(invQty);
    const buyPrice = parseFloat(invBuyPrice);
    const currentPrice = parseFloat(invCurrentPrice);

    if (isNaN(qty) || qty <= 0 || isNaN(buyPrice) || buyPrice <= 0 || isNaN(currentPrice) || currentPrice <= 0) {
      alert('Please enter valid numeric values for Quantity, Buy Price, and Current Price.');
      return;
    }

    const invData = {
      type: invType,
      symbol: invSymbol.trim().toUpperCase(),
      qty,
      buyPrice,
      currentPrice,
      date: invDate || new Date().toISOString().split('T')[0],
      notes: invNotes.trim() || 'No notes provided.'
    };

    if (editInvId) {
      if (!window.confirm('Are you sure you want to update this investment record?')) return;
      editInvestment(editInvId, invData);
      alert('Investment updated successfully!');
    } else {
      if (!window.confirm('Are you sure you want to log this investment purchase?')) return;
      addInvestment(invData);
      alert('Investment recorded successfully!');
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
    setInvNotes(inv.notes);
    setIsInvFormOpen(true);
  };

  const handleDeleteInvClick = (id: string) => {
    if (window.confirm('Are you sure you want to delete this investment record? This action is permanent.')) {
      deleteInvestment(id);
    }
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
      alert(`Please enter a valid exit quantity between 1 and ${exitInv.qty}.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to log exit for ${parsedQty} units of ${exitInv.symbol} at ₹${parsedPrice}?`)) {
      return;
    }

    exitInvestment(exitInvId, parsedPrice, exitDate || new Date().toISOString().split('T')[0], exitNotes.trim() || 'Exited investment.', parsedQty);
    alert('Asset exit logged successfully!');
    resetExitForm();
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
    <div className="animate-tab-panel" style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '24px', alignItems: 'start' }}>
      
      {/* Left Column: Rebranded Profile Card */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <img 
            src={logoImg} 
            alt="TradeDiary Pro Logo" 
            style={{ 
              width: '110px', 
              height: '110px', 
              borderRadius: '24px', 
              objectFit: 'cover',
              boxShadow: 'var(--shadow-glow)', 
              marginBottom: '16px',
              border: '2px solid rgba(255, 255, 255, 0.1)'
            }} 
          />
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #e5c158 0%, #b38938 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            TradeDiary Pro
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '24px' }}>
            Cognitive Trading & Investment Journal
          </p>

          {/* Account Metrics Block */}
          <div style={{ width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Trading Balance:</span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: totalTradingNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                ₹{isPnlVisible ? Math.round(currentCapital).toLocaleString('en-IN') : '••••'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Starting Capital:</span>
              <strong style={{ fontFamily: 'var(--font-mono)' }}>
                ₹{isPnlVisible ? Math.round(baseCapital).toLocaleString('en-IN') : '••••'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Trading P&L:</span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: totalTradingNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                {totalTradingNetPnL >= 0 ? '+' : ''}₹{isPnlVisible ? Math.round(totalTradingNetPnL).toLocaleString('en-IN') : '••••'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Investment Value:</span>
              <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                ₹{isPnlVisible ? Math.round(totalInvCurrent).toLocaleString('en-IN') : '••••'}
              </strong>
            </div>
          </div>
        </div>

        {/* Collapsible Combined Portfolio Card */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <button 
            onClick={() => setIsCombinedExpanded(!isCombinedExpanded)}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              color: 'var(--text-main)',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
              padding: 0
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={16} color="var(--primary)" />
              Combined Wealth Portfolio
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {isCombinedExpanded ? 'Hide' : 'Show Details'}
            </span>
          </button>

          {isCombinedExpanded && (
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Portfolio Wealth:</span>
                <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)', fontSize: '0.95rem' }}>
                  ₹{isPnlVisible ? Math.round(combinedWealth).toLocaleString('en-IN') : '••••'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Deployed Capital:</span>
                <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                  ₹{isPnlVisible ? Math.round(combinedInvested).toLocaleString('en-IN') : '••••'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Combined Net Returns:</span>
                <strong style={{ fontFamily: 'var(--font-mono)', color: combinedReturn >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                  {combinedReturn >= 0 ? '+' : ''}₹{isPnlVisible ? Math.round(combinedReturn).toLocaleString('en-IN') : '••••'} ({combinedReturnPct.toFixed(2)}%)
                </strong>
              </div>

              {/* Progress/Ratio Bar */}
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                  <span>Trading Cash: {((currentCapital / (combinedWealth || 1)) * 100).toFixed(0)}%</span>
                  <span>Investments: {((totalInvCurrent / (combinedWealth || 1)) * 100).toFixed(0)}%</span>
                </div>
                <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'var(--border-color)' }}>
                  <div style={{ width: `${(currentCapital / (combinedWealth || 1)) * 100}%`, backgroundColor: '#bf5af2' }} />
                  <div style={{ width: `${(totalInvCurrent / (combinedWealth || 1)) * 100}%`, backgroundColor: '#0a84ff' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Dynamic Sub-Section Navigation */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
        
        {/* Navigation Selector Bar */}
        <div style={{ display: 'flex', gap: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
          <button 
            onClick={() => setActiveSubTab('investments')}
            className={`btn ${activeSubTab === 'investments' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none', borderRadius: '8px', padding: '6px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Briefcase size={14} />
            Long-Term Investments
          </button>
          <button 
            onClick={() => setActiveSubTab('settings')}
            className={`btn ${activeSubTab === 'settings' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none', borderRadius: '8px', padding: '6px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Settings size={14} />
            Settings Menu
          </button>
        </div>

        {/* Display Error State if any */}
        {error && (
          <div style={{ color: 'var(--color-loss)', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.8rem' }}>
            {error}
          </div>
        )}

        {/* SUBTAB 1: Long-Term Investments */}
        {activeSubTab === 'investments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Form Drawer (Collapsible) */}
            {isInvFormOpen && (
              <div className="glass-card animate-tab-panel" style={{ padding: '20px', border: '1px solid var(--border-color-active)' }}>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-main)' }}>
                  {editInvId ? 'Edit Asset Purchase Log' : 'Record New Investment Purchase'}
                </h4>
                <form onSubmit={handleAddOrEditInvestment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Asset Class Type</label>
                      <select 
                        value={invType} 
                        onChange={(e) => setInvType(e.target.value as any)} 
                        className="form-input"
                        style={{ height: '38px', padding: '0 10px' }}
                      >
                        <option value="EQUITY">Equity (Stocks / Shares)</option>
                        <option value="ETF">ETF (Exchange Traded Fund)</option>
                        <option value="BOND">Government Bond / Debt</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Asset Symbol / Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. NIFTYBEES" 
                        value={invSymbol}
                        onChange={(e) => setInvSymbol(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Quantity</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 10" 
                        value={invQty}
                        onChange={(e) => setInvQty(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Avg. Buy Price (₹)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="e.g. 215.50" 
                        value={invBuyPrice}
                        onChange={(e) => setInvBuyPrice(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Current Market Price (₹)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="e.g. 235.00" 
                        value={invCurrentPrice}
                        onChange={(e) => setInvCurrentPrice(e.target.value)}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Purchase Date</label>
                      <input 
                        type="date" 
                        value={invDate}
                        onChange={(e) => setInvDate(e.target.value)}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Notes / Broker</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Bought on Zerodha for long term delivery" 
                        value={invNotes}
                        onChange={(e) => setInvNotes(e.target.value)}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px', justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={resetInvForm}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <Save size={14} />
                      <span>{editInvId ? 'Update Record' : 'Record Purchase'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Investments Dashboard Panel */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Briefcase size={16} color="var(--primary)" />
                  Delivery Investments Assets Ledger
                </h3>
                {!isInvFormOpen && (
                  <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={() => setIsInvFormOpen(true)}>
                    <Plus size={12} />
                    <span>Log Asset Purchase</span>
                  </button>
                )}
              </div>

              {/* Sub-tab Selection */}
              <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '20px', paddingBottom: '2px' }}>
                <button 
                  onClick={() => setLedgerSubTab('active')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px 4px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: ledgerSubTab === 'active' ? 'var(--primary)' : 'var(--text-dim)',
                    borderBottom: ledgerSubTab === 'active' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                    outline: 'none'
                  }}
                >
                  Active Portfolio ({activeInvestments.length})
                </button>
                <button 
                  onClick={() => setLedgerSubTab('exited')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px 4px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: ledgerSubTab === 'exited' ? 'var(--primary)' : 'var(--text-dim)',
                    borderBottom: ledgerSubTab === 'exited' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                    outline: 'none'
                  }}
                >
                  Exited History ({exitedInvestments.length})
                </button>
              </div>

              {ledgerSubTab === 'active' ? (
                <>
                  {/* Stats Bar (Active Portfolio) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Total Active Invested</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '2px' }}>
                        ₹{isPnlVisible ? Math.round(totalInvInvested).toLocaleString('en-IN') : '••••'}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Current Valuation</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--primary)', marginTop: '2px' }}>
                        ₹{isPnlVisible ? Math.round(totalInvCurrent).toLocaleString('en-IN') : '••••'}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Active returns / ROI</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: activeReturns >= 0 ? 'var(--color-win)' : 'var(--color-loss)', marginTop: '2px' }}>
                        {activeReturns >= 0 ? '+' : ''}₹{isPnlVisible ? Math.round(activeReturns).toLocaleString('en-IN') : '••••'} ({totalInvReturnsPct.toFixed(2)}%)
                      </div>
                    </div>
                  </div>

                  {/* Active Assets list table */}
                  {activeInvestments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No active investments recorded yet. Log your first Stocks, ETF, or Government Bond!
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '8px 10px', color: 'var(--text-dim)' }}>Asset</th>
                            <th style={{ padding: '8px 10px', color: 'var(--text-dim)' }}>Type</th>
                            <th style={{ padding: '8px 10px', color: 'var(--text-dim)', textAlign: 'right' }}>Qty</th>
                            <th style={{ padding: '8px 10px', color: 'var(--text-dim)', textAlign: 'right' }}>Avg Buy</th>
                            <th style={{ padding: '8px 10px', color: 'var(--text-dim)', textAlign: 'right' }}>Current</th>
                            <th style={{ padding: '8px 10px', color: 'var(--text-dim)', textAlign: 'right' }}>Return</th>
                            <th style={{ padding: '8px 10px', color: 'var(--text-dim)', textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeInvestments.map((inv) => {
                            const cost = inv.buyPrice * inv.qty;
                            const value = inv.currentPrice * inv.qty;
                            const gain = value - cost;
                            const gainPct = cost > 0 ? (gain / cost) * 100 : 0;

                            const getBadgeStyle = (type: string) => {
                              if (type === 'EQUITY') {
                                return { background: 'rgba(52, 211, 153, 0.12)', color: '#34d399' };
                              }
                              if (type === 'ETF') {
                                return { background: 'var(--primary-glow)', color: 'var(--primary)' };
                              }
                              return { background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' };
                            };
                            const badgeStyle = getBadgeStyle(inv.type);

                            return (
                               <tr key={inv.id} className="table-row" style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '10px 10px', fontWeight: 650, color: 'var(--text-main)' }}>
                                  <div>{inv.symbol}</div>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 400 }}>{inv.date}</div>
                                </td>
                                <td style={{ padding: '10px 10px' }}>
                                  <span className="badge badge-neutral" style={{ fontSize: '0.6rem', padding: '2px 6px', ...badgeStyle }}>
                                    {inv.type === 'EQUITY' ? 'STOCK' : inv.type}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{inv.qty}</td>
                                <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{isPnlVisible ? inv.buyPrice.toLocaleString('en-IN') : '••••'}</td>
                                <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{isPnlVisible ? inv.currentPrice.toLocaleString('en-IN') : '••••'}</td>
                                <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: gain >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                                  <div>{gain >= 0 ? '+' : ''}₹{isPnlVisible ? Math.round(gain).toLocaleString('en-IN') : '••••'}</div>
                                  <div style={{ fontSize: '0.68rem' }}>({gainPct.toFixed(1)}%)</div>
                                </td>
                                <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                    <button 
                                      className="btn btn-secondary" 
                                      style={{ padding: '4px 6px', display: 'flex', alignItems: 'center', gap: '2px', color: 'var(--primary)' }} 
                                      onClick={() => handleExitInvClick(inv)}
                                      title="Exit / Sell Asset"
                                    >
                                      <ArrowUpRight size={11} />
                                      <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>Exit</span>
                                    </button>
                                    <button 
                                      className="btn btn-secondary" 
                                      style={{ padding: '4px 6px' }} 
                                      onClick={() => handleEditInvClick(inv)}
                                      title="Edit record"
                                    >
                                      <Edit2 size={11} />
                                    </button>
                                    <button 
                                      className="btn btn-danger" 
                                      style={{ padding: '4px 6px' }} 
                                      onClick={() => handleDeleteInvClick(inv.id)}
                                      title="Delete record"
                                    >
                                      <Trash size={11} />
                                    </button>
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
                  {/* Stats Bar (Exited Portfolio) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '12px', marginBottom: '20px' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Total Closed Investment Volume</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '2px' }}>
                        {exitedInvestments.length} Assets Sold
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Total Realized Investment Returns</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: realizedInvReturns >= 0 ? 'var(--color-win)' : 'var(--color-loss)', marginTop: '2px' }}>
                        {realizedInvReturns >= 0 ? '+' : ''}₹{isPnlVisible ? Math.round(realizedInvReturns).toLocaleString('en-IN') : '••••'}
                      </div>
                    </div>
                  </div>

                  {/* Exited Assets list table */}
                  {exitedInvestments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No exited investments recorded yet. Log your first sale by clicking Exit on active holdings!
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '8px 10px', color: 'var(--text-dim)' }}>Asset</th>
                            <th style={{ padding: '8px 10px', color: 'var(--text-dim)' }}>Type</th>
                            <th style={{ padding: '8px 10px', color: 'var(--text-dim)', textAlign: 'right' }}>Qty</th>
                            <th style={{ padding: '8px 10px', color: 'var(--text-dim)', textAlign: 'right' }}>Cost Avg</th>
                            <th style={{ padding: '8px 10px', color: 'var(--text-dim)', textAlign: 'right' }}>Exit Avg</th>
                            <th style={{ padding: '8px 10px', color: 'var(--text-dim)', textAlign: 'right' }}>Realized Return</th>
                            <th style={{ padding: '8px 10px', color: 'var(--text-dim)', textAlign: 'center' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exitedInvestments.map((inv) => {
                            const cost = inv.buyPrice * inv.qty;
                            const exitVal = (inv.exitPrice || 0) * inv.qty;
                            const gain = exitVal - cost;
                            const gainPct = cost > 0 ? (gain / cost) * 100 : 0;

                            const getBadgeStyle = (type: string) => {
                              if (type === 'EQUITY') {
                                return { background: 'rgba(52, 211, 153, 0.12)', color: '#34d399' };
                              }
                              if (type === 'ETF') {
                                return { background: 'var(--primary-glow)', color: 'var(--primary)' };
                              }
                              return { background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' };
                            };
                            const badgeStyle = getBadgeStyle(inv.type);

                            return (
                               <tr key={inv.id} className="table-row" style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '10px 10px', fontWeight: 650, color: 'var(--text-main)' }}>
                                  <div>{inv.symbol}</div>
                                  <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 400 }}>Exit Date: {inv.exitDate || inv.date}</div>
                                </td>
                                <td style={{ padding: '10px 10px' }}>
                                  <span className="badge badge-neutral" style={{ fontSize: '0.6rem', padding: '2px 6px', ...badgeStyle }}>
                                    {inv.type === 'EQUITY' ? 'STOCK' : inv.type}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{inv.qty}</td>
                                <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{inv.buyPrice.toLocaleString('en-IN')}</td>
                                <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{(inv.exitPrice || 0).toLocaleString('en-IN')}</td>
                                <td style={{ padding: '10px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: gain >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                                  <div>{gain >= 0 ? '+' : ''}₹{Math.round(gain).toLocaleString('en-IN')}</div>
                                  <div style={{ fontSize: '0.68rem' }}>({gainPct.toFixed(1)}%)</div>
                                </td>
                                <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                                  <button 
                                    className="btn btn-danger" 
                                    style={{ padding: '4px 6px' }} 
                                    onClick={() => handleDeleteInvClick(inv.id)}
                                    title="Delete record from history"
                                  >
                                    <Trash size={11} />
                                  </button>
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

            {/* New: Allocation, Average Price Optimizer & Drawdown Recovery Simulator Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '24px' }}>
              
              {/* Card 1: Asset Allocation Donut Chart */}
              <div className="glass-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BarChart2 size={16} color="var(--primary)" />
                  Portfolio Asset Allocation
                </h3>
                <div style={{ width: '100%', height: 180, position: 'relative' }}>
                  {activeInvestments.length > 0 ? (
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'ETFs', value: activeInvestments.filter(i => i.type === 'ETF').reduce((acc, i) => acc + (i.currentPrice * i.qty), 0) },
                            { name: 'Bonds', value: activeInvestments.filter(i => i.type === 'BOND').reduce((acc, i) => acc + (i.currentPrice * i.qty), 0) },
                            { name: 'Stocks', value: activeInvestments.filter(i => i.type === 'EQUITY').reduce((acc, i) => acc + (i.currentPrice * i.qty), 0) }
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="45%"
                          innerRadius={40}
                          outerRadius={55}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {[1, 2, 3].map((_entry, index) => {
                            const COLORS = ['#007aff', '#34c759', '#ff9500'];
                            return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                          })}
                        </Pie>
                        <Tooltip formatter={(value: any) => `₹${value.toLocaleString('en-IN')}`} />
                        <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '0.72rem' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem', border: '1px dashed var(--border-color)', borderRadius: '8px', height: '100%', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                      No active investments to allocate.
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Average Price & SIP Calculator */}
              <div className="glass-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <IndianRupee size={16} color="var(--color-win)" />
                  Average Buy Price & SIP Calculator
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.68rem', marginBottom: '2px' }}>Current Avg. Price</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 150" 
                      value={avgCalcCurrentPrice} 
                      onChange={(e) => setAvgCalcCurrentPrice(e.target.value)} 
                      className="form-input" 
                      style={{ height: '32px', padding: '0 8px', fontSize: '0.78rem' }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.68rem', marginBottom: '2px' }}>Current Quantity</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 50" 
                      value={avgCalcCurrentQty} 
                      onChange={(e) => setAvgCalcCurrentQty(e.target.value)} 
                      className="form-input" 
                      style={{ height: '32px', padding: '0 8px', fontSize: '0.78rem' }}
                    />
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.68rem', marginBottom: '2px' }}>New Purchase Price</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 135" 
                      value={avgCalcNewPrice} 
                      onChange={(e) => setAvgCalcNewPrice(e.target.value)} 
                      className="form-input" 
                      style={{ height: '32px', padding: '0 8px', fontSize: '0.78rem' }}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.68rem', marginBottom: '2px' }}>New Quantity</label>
                    <input 
                      type="number" 
                      placeholder="e.g. 20" 
                      value={avgCalcNewQty} 
                      onChange={(e) => setAvgCalcNewQty(e.target.value)} 
                      className="form-input" 
                      style={{ height: '32px', padding: '0 8px', fontSize: '0.78rem' }}
                    />
                  </div>
                </div>

                {/* Calculation Results Card */}
                {calcTotalQty > 0 ? (
                  <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-dim)' }}>New Combined Quantity:</span>
                      <strong style={{ color: '#fff' }}>{calcTotalQty}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-dim)' }}>New Average Buy Price:</span>
                      <strong style={{ color: 'var(--primary)' }}>₹{calcNewAvgPrice.toFixed(2)}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Total Capital Required:</span>
                      <strong style={{ color: 'var(--color-win)' }}>₹{calcTotalInvested.toLocaleString('en-IN')}</strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '12px', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    Enter current holding & new purchase details to optimize average buy price.
                  </div>
                )}
              </div>

              {/* Card 3: Drawdown Recovery Simulator */}
              <div className="glass-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={16} color="var(--color-loss)" />
                    Drawdown Recovery Simulator
                  </h3>
                  
                  {/* Current Drawdown Metrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Peak Capital</div>
                      <strong style={{ fontSize: '0.82rem', color: '#fff' }}>
                        {isPnlVisible ? `₹${Math.round(peakCapital).toLocaleString('en-IN')}` : '••••'}
                      </strong>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Current Drawdown</div>
                      <strong style={{ fontSize: '0.82rem', color: 'var(--color-loss)' }}>
                        {isPnlVisible ? `₹${Math.round(drawdownRupees).toLocaleString('en-IN')}` : '••••'}
                        {drawdownRupees > 0 ? ` (-${drawdownPct.toFixed(1)}%)` : ''}
                      </strong>
                    </div>
                    <div style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '4px' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Recovery Required</div>
                      <strong style={{ fontSize: '0.82rem', color: recoveryRequiredPct > 0 ? 'var(--color-win)' : 'var(--text-dim)' }}>
                        {recoveryRequiredPct > 0 ? `+${recoveryRequiredPct.toFixed(2)}% capital growth` : '0% (At Peak)'}
                      </strong>
                    </div>
                  </div>

                  {/* Simulator Inputs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '2px' }}>Risk/Trade</label>
                      <input 
                        type="number" 
                        step="0.1"
                        placeholder="1%" 
                        value={calcRiskPerTradePct} 
                        onChange={(e) => setCalcRiskPerTradePct(e.target.value)} 
                        className="form-input" 
                        style={{ height: '28px', padding: '0 6px', fontSize: '0.75rem' }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '2px' }}>Target R:R</label>
                      <input 
                        type="number" 
                        step="0.5"
                        placeholder="2" 
                        value={calcTargetRr} 
                        onChange={(e) => setCalcTargetRr(e.target.value)} 
                        className="form-input" 
                        style={{ height: '28px', padding: '0 6px', fontSize: '0.75rem' }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.65rem', marginBottom: '2px' }}>Win Rate %</label>
                      <input 
                        type="number" 
                        placeholder="50" 
                        value={calcWinRatePct} 
                        onChange={(e) => setCalcWinRatePct(e.target.value)} 
                        className="form-input" 
                        style={{ height: '28px', padding: '0 6px', fontSize: '0.75rem' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Simulator Results */}
                {recoveryRequiredPct > 0 ? (
                  <div style={{ background: 'var(--primary-glow)', border: '1px solid var(--border-color-active)', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                      <span style={{ color: 'var(--text-main)' }}>Exp. Return / Trade:</span>
                      <strong style={{ color: expectedReturnPerTradePct > 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                        {expectedReturnPerTradePct > 0 ? '+' : ''}{expectedReturnPerTradePct.toFixed(2)}%
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                      <span style={{ color: 'var(--text-main)' }}>Est. Trades to Recover:</span>
                      <strong style={{ color: expectedReturnPerTradePct > 0 ? 'var(--primary)' : 'var(--color-loss)' }}>
                        {expectedReturnPerTradePct > 0 ? expectedTradesToRecover : 'Never (Negative Expectancy)'}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '10px', border: '1px dashed var(--border-color)', borderRadius: '8px', textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    No recovery needed. Portfolio is currently at its historical peak value!
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      {/* Exit Asset overlay form modal */}
      {isExitFormOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(12px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            className="glass-card animate-tab-panel" 
            style={{ 
              width: '100%', 
              maxWidth: '430px', 
              padding: '24px', 
              border: '1.5px solid var(--border-color-active)',
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowUpRight size={18} color="var(--primary)" />
              Record Asset Sale Exit
            </h4>
            <form onSubmit={handleExitSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                Asset: <strong>{exitInv?.symbol}</strong> | Available Qty: <strong>{exitInv?.qty}</strong>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ marginBottom: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Exit Quantity (Max: {exitInv?.qty})</label>
                <input 
                  type="number" 
                  min="1"
                  max={exitInv?.qty}
                  placeholder={`e.g. ${exitInv?.qty}`} 
                  value={exitQty}
                  onChange={(e) => setExitQty(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ marginBottom: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Exit Avg. Sale Price (₹)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="e.g. 245.50" 
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  className="form-input"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ marginBottom: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Exit Date</label>
                <input 
                  type="date" 
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ marginBottom: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Exit Remarks / Notes</label>
                <textarea
                  placeholder="e.g. Target reached, booking profit." 
                  value={exitNotes}
                  onChange={(e) => setExitNotes(e.target.value)}
                  className="form-input"
                  style={{ minHeight: '80px', padding: '10px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={resetExitForm}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ArrowUpRight size={14} />
                  <span>Log Exit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        {/* SUBTAB 2: Settings Menu */}
        {activeSubTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 1. Security Settings (Login ID & Password) */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={16} color="var(--primary)" />
                  Journal Login Security Settings
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Password Lock:</span>
                  <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px' }}>
                    <input 
                      type="checkbox" 
                      checked={loginEnabled} 
                      onChange={handleToggleLoginLock}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span className="slider round" style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: loginEnabled ? 'var(--primary)' : 'var(--border-color)', transition: '.3s', borderRadius: '20px' }}></span>
                  </label>
                </div>
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
                Require an authorized Username and Password to unlock the journal logs on loading.
              </p>

              {securitySuccess && (
                <div style={{ color: 'var(--color-win)', backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', padding: '10px', borderRadius: '8px', fontSize: '0.78rem', marginBottom: '12px' }}>
                  {securitySuccess}
                </div>
              )}

              <form onSubmit={handleSecuritySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} /> Change User ID
                    </label>
                    <input 
                      type="text" 
                      value={secUserId} 
                      onChange={(e) => setSecUserId(e.target.value)} 
                      className="form-input" 
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Key size={12} /> Change Password
                    </label>
                    <input 
                      type="password" 
                      value={secPassword} 
                      onChange={(e) => setSecPassword(e.target.value)} 
                      className="form-input" 
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Confirm Password</label>
                    <input 
                      type="password" 
                      value={secPasswordConfirm} 
                      onChange={(e) => setSecPasswordConfirm(e.target.value)} 
                      className="form-input" 
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-primary" style={{ height: '38px', width: '100%', justifyContent: 'center' }}>
                      <Save size={14} />
                      <span>Update Credentials</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* 2. Starting Capital Configuration */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <IndianRupee size={16} color="var(--primary)" />
                Starting Capital Configuration
              </h3>
              <form onSubmit={handleCapitalSubmit} style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flexGrow: 1 }}>
                  <input
                    type="number"
                    value={tempCapital}
                    onChange={(e) => setTempCapital(e.target.value)}
                    placeholder="e.g. 100000"
                    className="form-input"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  <Save size={14} />
                  <span>Update Capital</span>
                </button>
              </form>
            </div>

            {/* 3. Cloud Sync Settings */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={16} color={isSupabaseConfigured() ? 'var(--color-win)' : 'var(--primary)'} />
                  Universal Cloud Database Sync
                </h3>
                {isSupabaseConfigured() ? (
                  <span className="badge badge-win" style={{ fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={10} /> Active
                  </span>
                ) : (
                  <span className="badge badge-neutral" style={{ fontSize: '0.62rem' }}>Offline Mode</span>
                )}
              </div>
              
              <form onSubmit={handleSaveDbSettings} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <User size={12} /> Supabase Project URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://your-project-id.supabase.co"
                    value={sbUrl}
                    onChange={(e) => setSbUrl(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Key size={12} /> Supabase Anon API Key
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={sbKey}
                    onChange={(e) => setSbKey(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>
                    <Save size={14} />
                    <span>Save credentials & Sync</span>
                  </button>
                  {isSupabaseConfigured() && (
                    <button type="button" className="btn btn-secondary" onClick={handleCloudPullSync} title="Fetch logs from cloud DB">
                      <RefreshCw size={14} />
                      <span>Sync Cloud DB</span>
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* 4. System Utilities & Backup */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <ShieldAlert size={16} color="var(--color-loss)" />
                Database Backup & System Utilities
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
                Export your database logs and long-term investments locally as a backup, restore from a previously exported file, or reset to standard sample trading data.
              </p>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={handleExportBackup} title="Export JSON file">
                  <Download size={14} />
                  <span>Export JSON Backup</span>
                </button>

                <button className="btn btn-secondary" onClick={() => document.getElementById('account-import-input')?.click()} title="Import JSON file">
                  <Upload size={14} />
                  <span>Restore Backup File</span>
                </button>
                <input 
                  id="account-import-input" 
                  type="file" 
                  accept=".json" 
                  onChange={handleImportBackup} 
                  style={{ display: 'none' }} 
                />

                <button 
                  className="btn btn-danger" 
                  style={{ marginLeft: 'auto' }}
                  onClick={() => {
                    if (window.confirm('This will wipe all your active trades and investments, and restore the database to sample trading logs. Continue?')) {
                      resetToMockData();
                    }
                  }}
                  title="Reset database to sample trade logs"
                >
                  <Trash2 size={14} />
                  <span>Reset Database</span>
                </button>
              </div>
            </div>

            {/* 5. Appearance Preferences */}
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                {theme === 'dark' ? <Moon size={16} color="var(--primary)" /> : <Sun size={16} color="#eab308" />}
                Appearance Preferences
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Current Mode: <strong>{theme === 'dark' ? 'Dark Obsidian' : 'Light Translucent Silver'}</strong>
                </span>
                <button className="btn btn-secondary" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun size={14} style={{ marginRight: '4px' }} /> : <Moon size={14} style={{ marginRight: '4px' }} />}
                  Toggle Theme
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
