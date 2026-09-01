import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTradeStore } from '../store/useTradeStore';
import { 
  testDhanConnection, 
  fetchDhanRawTrades, 
  pairDhanTrades, 
  convertDhanToDiaryTrade,
  type DhanCredentials, 
  type DhanFundLimit, 
  type PairedDhanTrade 
} from '../utils/dhanClient';
import { BROKER_LOGOS } from '../utils/brandLogos';
import { 
  X, CheckCircle, AlertCircle, RefreshCw, Download, 
  ShieldCheck, ExternalLink, HelpCircle, ChevronDown, ChevronUp, Eye, EyeOff
} from 'lucide-react';

interface DhanConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAccountId?: string;
}

export function DhanConnectModal({ isOpen, onClose, activeAccountId }: DhanConnectModalProps) {
  const { trades, addTrade, brokerAccounts, isPnlVisible } = useTradeStore();

  // Credentials State
  const [clientId, setClientId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Connection & Fund Status
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [fundLimit, setFundLimit] = useState<DhanFundLimit | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Sync Parameters
  const [dateRangeMode, setDateRangeMode] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customFromDate, setCustomFromDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customToDate, setCustomToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [targetBrokerAccount, setTargetBrokerAccount] = useState<string>('Combined');

  // Fetch & Preview State
  const [isFetching, setIsFetching] = useState(false);
  const [fetchedTrades, setFetchedTrades] = useState<PairedDhanTrade[]>([]);
  const [selectedTradeIds, setSelectedTradeIds] = useState<Set<string>>(new Set());
  const [importSuccessMsg, setImportSuccessMsg] = useState('');

  // Load saved credentials from localStorage
  useEffect(() => {
    try {
      const savedCreds = localStorage.getItem('traders_diary_dhan_creds');
      if (savedCreds) {
        const parsed: DhanCredentials = JSON.parse(savedCreds);
        if (parsed.clientId) setClientId(parsed.clientId);
        if (parsed.accessToken) setAccessToken(parsed.accessToken);
      }
    } catch (e) {
      // Ignore
    }
  }, [isOpen]);

  // Set default target broker account to Dhan account if available
  useEffect(() => {
    const dhanAcc = brokerAccounts.find(b => b.broker.toLowerCase().includes('dhan') || b.name.toLowerCase().includes('dhan'));
    if (dhanAcc) {
      setTargetBrokerAccount(dhanAcc.id);
    } else if (activeAccountId && activeAccountId !== 'Combined') {
      setTargetBrokerAccount(activeAccountId);
    }
  }, [brokerAccounts, activeAccountId, isOpen]);

  if (!isOpen) return null;

  // Test & Save Connection
  const handleTestConnection = async () => {
    if (!clientId.trim() || !accessToken.trim()) {
      setConnectionStatus('error');
      setStatusMessage('Please enter both Dhan Client ID and Access Token.');
      return;
    }

    setIsTesting(true);
    setStatusMessage('');
    try {
      const funds = await testDhanConnection({ clientId: clientId.trim(), accessToken: accessToken.trim() });
      setFundLimit(funds);
      setConnectionStatus('success');
      setStatusMessage(`Connected successfully! Available Margin: ₹${funds.availabelBalance.toLocaleString('en-IN')}`);
      // Save credentials locally
      localStorage.setItem('traders_diary_dhan_creds', JSON.stringify({
        clientId: clientId.trim(),
        accessToken: accessToken.trim()
      }));
    } catch (err: any) {
      setConnectionStatus('error');
      setStatusMessage(err.message || 'Failed to authenticate with Dhan. Please check Access Token.');
    } finally {
      setIsTesting(false);
    }
  };

  // Fetch Trades from Dhan
  const handleFetchTrades = async () => {
    if (!clientId.trim() || !accessToken.trim()) {
      setConnectionStatus('error');
      setStatusMessage('Please enter your Dhan credentials first.');
      return;
    }

    setIsFetching(true);
    setImportSuccessMsg('');
    setStatusMessage('');

    let fromDate = new Date().toISOString().split('T')[0];
    let toDate = fromDate;

    if (dateRangeMode === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      fromDate = y.toISOString().split('T')[0];
      toDate = fromDate;
    } else if (dateRangeMode === 'custom') {
      fromDate = customFromDate;
      toDate = customToDate;
    }

    try {
      const rawTrades = await fetchDhanRawTrades(
        { clientId: clientId.trim(), accessToken: accessToken.trim() },
        fromDate,
        toDate
      );

      if (rawTrades.length === 0) {
        setStatusMessage(`No executed trades found in Dhan for ${fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`}.`);
        setFetchedTrades([]);
        return;
      }

      const paired = pairDhanTrades(rawTrades, trades, targetBrokerAccount);
      setFetchedTrades(paired);

      // By default, select all non-duplicate trades for import
      const newIds = new Set(paired.filter(t => !t.isDuplicate).map(t => t.id));
      setSelectedTradeIds(newIds);

      setStatusMessage(`Found ${rawTrades.length} order executions (${paired.length} completed trade pairs).`);
    } catch (err: any) {
      setStatusMessage(err.message || 'Failed to fetch trades from Dhan.');
    } finally {
      setIsFetching(false);
    }
  };

  // Toggle selection
  const handleToggleSelect = (tradeId: string) => {
    const next = new Set(selectedTradeIds);
    if (next.has(tradeId)) {
      next.delete(tradeId);
    } else {
      next.add(tradeId);
    }
    setSelectedTradeIds(next);
  };

  // Select all non-duplicates
  const handleSelectAllNew = () => {
    const newIds = new Set(fetchedTrades.filter(t => !t.isDuplicate).map(t => t.id));
    setSelectedTradeIds(newIds);
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedTradeIds(new Set());
  };

  // Import Selected Trades
  const handleImportSelected = () => {
    const tradesToImport = fetchedTrades.filter(t => selectedTradeIds.has(t.id) && !t.isDuplicate);
    if (tradesToImport.length === 0) return;

    tradesToImport.forEach(dt => {
      const diaryTrade = convertDhanToDiaryTrade(dt, targetBrokerAccount);
      addTrade(diaryTrade);
    });

    setImportSuccessMsg(`🎉 Successfully imported ${tradesToImport.length} trades into Trader's Diary!`);
    
    // Update local state to mark them as imported
    setFetchedTrades(prev => prev.map(t => {
      if (selectedTradeIds.has(t.id)) {
        return { ...t, isDuplicate: true };
      }
      return t;
    }));
    setSelectedTradeIds(new Set());
  };

  const newTradesCount = fetchedTrades.filter(t => !t.isDuplicate).length;
  const duplicateTradesCount = fetchedTrades.filter(t => t.isDuplicate).length;
  const totalRealizedPnL = fetchedTrades.reduce((acc, t) => acc + t.netPnL, 0);

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6)',
          overflow: 'hidden',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Modal Header */}
        <div 
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src={BROKER_LOGOS['Dhan']} 
              alt="Dhan" 
              style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#fff', padding: '2px' }} 
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Dhan Direct Auto-Sync
                </h2>
                <span 
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: 'var(--color-win)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <ShieldCheck size={11} /> Pure Read-Only Safe
                </span>
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
                Zero-order guarantee. Fetches executed tradebook without modifying existing entries.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="btn"
            style={{ padding: '6px', borderRadius: '50%', background: 'transparent', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Section 1: API Configuration Card */}
          <div 
            style={{ 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '12px', 
              padding: '16px' 
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔑 DhanHQ API Credentials
              </span>
              <button 
                type="button"
                onClick={() => setIsHelpOpen(!isHelpOpen)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'var(--primary)', 
                  fontSize: '0.75rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                <HelpCircle size={13} /> How to get free API Token? {isHelpOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            </div>

            {/* Step-by-Step Help Guide (Collapsible) */}
            {isHelpOpen && (
              <div 
                style={{ 
                  background: 'rgba(99, 102, 241, 0.06)', 
                  border: '1px solid rgba(99, 102, 241, 0.2)', 
                  borderRadius: '10px', 
                  padding: '12px 14px', 
                  fontSize: '0.76rem', 
                  color: 'var(--text-muted)',
                  marginBottom: '14px',
                  lineHeight: '1.5'
                }}
              >
                <strong style={{ color: 'var(--primary)', display: 'block', marginBottom: '4px' }}>
                  📌 4 Simple Steps to generate your Free Dhan Access Token:
                </strong>
                <ol style={{ margin: 0, paddingLeft: '18px' }}>
                  <li>Login to <a href="https://web.dhan.co" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>web.dhan.co</a> on desktop/browser.</li>
                  <li>Click your Profile icon (Top Right) ➔ <strong>DhanHQ Developer APIs</strong>.</li>
                  <li>Click <strong>"Generate Access Token"</strong> (Free for all Dhan users, valid for 30 days).</li>
                  <li>Copy your <strong>Client ID</strong> and <strong>Access Token</strong> and paste them below.</li>
                </ol>
              </div>
            )}

            {/* Inputs Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '10px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 600 }}>
                  Client ID
                </label>
                <input 
                  type="text"
                  placeholder="e.g. 1000000000"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-input, rgba(0,0,0,0.2))',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 600 }}>
                  Access Token (JWT)
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showToken ? 'text' : 'password'}
                    placeholder="Paste Dhan Access Token here..."
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 36px 8px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-input, rgba(0,0,0,0.2))',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '0.82rem',
                      fontFamily: 'var(--font-mono)'
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                  >
                    {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <button 
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="btn"
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    fontSize: '0.78rem',
                    fontWeight: 650,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isTesting ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} color="var(--primary)" />}
                  {isTesting ? 'Verifying...' : 'Test & Save'}
                </button>
              </div>
            </div>

            {/* Status Feedback Message */}
            {statusMessage && (
              <div 
                style={{ 
                  marginTop: '10px', 
                  fontSize: '0.74rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  color: connectionStatus === 'success' ? 'var(--color-win)' : connectionStatus === 'error' ? 'var(--color-loss)' : 'var(--text-muted)'
                }}
              >
                {connectionStatus === 'success' ? <CheckCircle size={13} /> : connectionStatus === 'error' ? <AlertCircle size={13} /> : null}
                {statusMessage}
              </div>
            )}
          </div>

          {/* Section 2: Sync Controls */}
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '12px',
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.015)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px'
            }}
          >
            {/* Range Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 650, color: 'var(--text-dim)' }}>Sync Range:</span>
              <button 
                type="button"
                onClick={() => setDateRangeMode('today')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  border: dateRangeMode === 'today' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  background: dateRangeMode === 'today' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: dateRangeMode === 'today' ? 'var(--primary)' : 'var(--text-muted)'
                }}
              >
                Today
              </button>
              <button 
                type="button"
                onClick={() => setDateRangeMode('yesterday')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  border: dateRangeMode === 'yesterday' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  background: dateRangeMode === 'yesterday' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: dateRangeMode === 'yesterday' ? 'var(--primary)' : 'var(--text-muted)'
                }}
              >
                Yesterday
              </button>
              <button 
                type="button"
                onClick={() => setDateRangeMode('custom')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  border: dateRangeMode === 'custom' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  background: dateRangeMode === 'custom' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: dateRangeMode === 'custom' ? 'var(--primary)' : 'var(--text-muted)'
                }}
              >
                Custom Date
              </button>

              {dateRangeMode === 'custom' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '6px' }}>
                  <input 
                    type="date"
                    value={customFromDate}
                    onChange={(e) => setCustomFromDate(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '0.74rem'
                    }}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>to</span>
                  <input 
                    type="date"
                    value={customToDate}
                    onChange={(e) => setCustomToDate(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      fontSize: '0.74rem'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Fetch Button */}
            <button 
              type="button"
              onClick={handleFetchTrades}
              disabled={isFetching}
              className="btn btn-primary"
              style={{
                padding: '7px 18px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)'
              }}
            >
              {isFetching ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              {isFetching ? 'Fetching Dhan Tradebook...' : 'Fetch Trades from Dhan'}
            </button>
          </div>

          {/* Success Banner */}
          {importSuccessMsg && (
            <div 
              style={{ 
                background: 'rgba(16, 185, 129, 0.12)', 
                border: '1px solid rgba(16, 185, 129, 0.3)', 
                color: 'var(--color-win)', 
                padding: '12px 16px', 
                borderRadius: '10px', 
                fontSize: '0.82rem',
                fontWeight: 650,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle size={16} />
              {importSuccessMsg}
            </div>
          )}

          {/* Section 3: Fetched Trades Preview & Reconciliation */}
          {fetchedTrades.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Summary Metric Header */}
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap', 
                  gap: '8px',
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.78rem'
                }}
              >
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <span>Trades Found: <strong>{fetchedTrades.length}</strong></span>
                  <span style={{ color: 'var(--color-win)' }}>✨ New: <strong>{newTradesCount}</strong></span>
                  <span style={{ color: 'var(--text-dim)' }}>✅ Already in Diary: <strong>{duplicateTradesCount}</strong></span>
                  <span>Net P&L: <strong style={{ color: totalRealizedPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                    {isPnlVisible ? `₹${Math.round(totalRealizedPnL).toLocaleString('en-IN')}` : '••••'}
                  </strong></span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    type="button" 
                    onClick={handleSelectAllNew}
                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 650 }}
                  >
                    Select All New
                  </button>
                  <span style={{ color: 'var(--text-dim)' }}>•</span>
                  <button 
                    type="button" 
                    onClick={handleDeselectAll}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.72rem' }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'var(--bg-card)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-dim)' }}>
                      <th style={{ padding: '8px 12px', width: '36px' }}></th>
                      <th style={{ padding: '8px 12px' }}>Symbol</th>
                      <th style={{ padding: '8px 12px' }}>Time</th>
                      <th style={{ padding: '8px 12px' }}>Action</th>
                      <th style={{ padding: '8px 12px' }}>Qty</th>
                      <th style={{ padding: '8px 12px' }}>Entry / Exit</th>
                      <th style={{ padding: '8px 12px' }}>Net P&L</th>
                      <th style={{ padding: '8px 12px' }}>Charges</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fetchedTrades.map((t) => {
                      const isSelected = selectedTradeIds.has(t.id);
                      return (
                        <tr 
                          key={t.id}
                          style={{
                            borderBottom: '1px solid var(--border-color)',
                            background: t.isDuplicate ? 'rgba(255, 255, 255, 0.005)' : isSelected ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                            opacity: t.isDuplicate ? 0.6 : 1
                          }}
                        >
                          <td style={{ padding: '8px 12px' }}>
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              disabled={t.isDuplicate}
                              onChange={() => handleToggleSelect(t.id)}
                              style={{ cursor: t.isDuplicate ? 'not-allowed' : 'pointer' }}
                            />
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 650, color: 'var(--text-main)' }}>
                            {t.symbol}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-dim)' }}>
                            {t.entryDate} {t.entryTime}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span 
                              style={{ 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                background: t.action === 'BUY' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                color: t.action === 'BUY' ? 'var(--color-win)' : 'var(--color-loss)'
                              }}
                            >
                              {t.action}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>
                            {t.qty}
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>
                            ₹{t.entryPrice.toFixed(2)} ➔ ₹{t.exitPrice.toFixed(2)}
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: t.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                            {t.netPnL >= 0 ? '+' : ''}₹{isPnlVisible ? Math.round(t.netPnL).toLocaleString('en-IN') : '••••'}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                            ₹{(t.brokerage + t.taxes).toFixed(1)}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {t.isDuplicate ? (
                              <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px' }}>
                                ✅ In Diary
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.66rem', color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.12)', padding: '2px 6px', borderRadius: '4px', fontWeight: 650 }}>
                                ✨ Ready to Import
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div 
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.015)'
          }}
        >
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            🔒 Credentials are encrypted and saved only on your local browser.
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button"
              onClick={onClose}
              className="btn"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                fontSize: '0.78rem'
              }}
            >
              Close
            </button>

            {newTradesCount > 0 && (
              <button 
                type="button"
                onClick={handleImportSelected}
                disabled={selectedTradeIds.size === 0}
                className="btn btn-primary"
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--color-win)',
                  borderColor: 'var(--color-win)',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Download size={14} />
                Import {selectedTradeIds.size} Selected Trades
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
