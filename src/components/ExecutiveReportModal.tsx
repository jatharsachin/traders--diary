import { useState, useMemo } from 'react';
import { X, Download, Printer, Eye, EyeOff, ShieldCheck, Sparkles, Award } from 'lucide-react';
import { useTradeStore } from '../store/useTradeStore';
import { filterTradesByFY } from '../utils/fyHelper';
import { downloadExecutiveReportCardPNG, type ExecutiveReportData } from '../utils/executiveCardExporter';
import { getTradeMistakes } from '../types';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
};

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExecutiveReportModal({ isOpen, onClose }: ExecutiveReportModalProps) {
  const { 
    trades: allTrades, 
    userName, 
    userAvatar, 
    selectedFY, 
    subscriptionExpenses, 
    isPnlVisible,
    togglePnlVisibility 
  } = useTradeStore();

  const [periodFilter, setPeriodFilter] = useState<'month' | 'fy' | 'week' | 'all'>('fy');
  const [includeSubscriptions, setIncludeSubscriptions] = useState<boolean>(true);

  // Filter trades based on selected period
  const reportTrades = useMemo(() => {
    let filtered = filterTradesByFY(allTrades, selectedFY);
    const now = new Date();
    
    if (periodFilter === 'month') {
      const currentMonthStr = now.toISOString().substring(0, 7);
      filtered = filtered.filter(t => t.date.startsWith(currentMonthStr));
    } else if (periodFilter === 'week') {
      const oneJan = new Date(now.getFullYear(), 0, 1);
      const numberOfDays = Math.floor((now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
      const currentWeek = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);
      
      filtered = filtered.filter(t => {
        const d = new Date(t.date);
        const dDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
        const w = Math.ceil((d.getDay() + 1 + dDays) / 7);
        return w === currentWeek && d.getFullYear() === now.getFullYear();
      });
    } else if (periodFilter === 'all') {
      filtered = allTrades;
    }
    
    return filtered;
  }, [allTrades, selectedFY, periodFilter]);

  // Subscriptions filtering
  const periodSubscriptions = useMemo(() => {
    if (!includeSubscriptions) return 0;
    let filtered = subscriptionExpenses;
    if (periodFilter === 'fy' && selectedFY !== 'All') {
      const match = selectedFY.match(/FY (\d{4})/);
      if (match) {
        const startYear = parseInt(match[1], 10);
        const startStr = `${startYear}-04-01`;
        const endStr = `${startYear + 1}-03-31`;
        filtered = filtered.filter(s => s.date >= startStr && s.date <= endStr);
      }
    } else if (periodFilter === 'month') {
      const currentMonthStr = new Date().toISOString().substring(0, 7);
      filtered = filtered.filter(s => s.date.startsWith(currentMonthStr));
    }
    return filtered.reduce((sum, s) => sum + (s.amount || 0), 0);
  }, [subscriptionExpenses, selectedFY, periodFilter, includeSubscriptions]);

  // Aggregation Calculations
  const totalTrades = reportTrades.length;
  const winningTrades = reportTrades.filter(t => t.netPnL > 0);
  const losingTrades = reportTrades.filter(t => t.netPnL < 0);
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;

  const grossPnL = reportTrades.reduce((acc, t) => acc + t.grossPnL, 0);
  const totalBrokerage = reportTrades.reduce((acc, t) => acc + t.brokerage, 0);
  const totalTaxes = reportTrades.reduce((acc, t) => acc + t.taxes, 0);
  const netPnL = reportTrades.reduce((acc, t) => acc + t.netPnL, 0);
  const netBottomLine = netPnL - periodSubscriptions;

  const grossProfit = reportTrades.reduce((acc, t) => (t.netPnL > 0 ? acc + t.netPnL : acc), 0);
  const grossLoss = Math.abs(reportTrades.reduce((acc, t) => (t.netPnL < 0 ? acc + t.netPnL : acc), 0));
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? Infinity : 1.0);

  // Best trade & top mistake
  const bestTrade = useMemo(() => {
    if (winningTrades.length === 0) return null;
    return [...winningTrades].sort((a, b) => b.netPnL - a.netPnL)[0];
  }, [winningTrades]);

  const topMistake = useMemo(() => {
    const counts: Record<string, number> = {};
    reportTrades.forEach(t => {
      const mistakes = getTradeMistakes(t);
      mistakes.forEach(m => {
        if (m && m !== 'None') {
          counts[m] = (counts[m] || 0) + 1;
        }
      });
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? `${sorted[0][0]} (${sorted[0][1]}x)` : 'Clean Execution';
  }, [reportTrades]);

  const getPeriodLabel = () => {
    if (periodFilter === 'fy') return selectedFY;
    if (periodFilter === 'month') return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    if (periodFilter === 'week') return 'Current Week';
    return 'All-Time Performance';
  };

  const reportData: ExecutiveReportData = {
    userName: userName || 'Sachin',
    userAvatar,
    periodLabel: getPeriodLabel(),
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate,
    grossPnL,
    totalBrokerage,
    totalTaxes,
    totalSubscriptions: periodSubscriptions,
    netPnL,
    netBottomLine,
    profitFactor,
    bestTradeSymbol: bestTrade?.symbol,
    bestTradePnL: bestTrade?.netPnL,
    topMistakeTag: topMistake,
    isPnlVisible
  };

  const handleDownloadPNG = () => {
    downloadExecutiveReportCardPNG(reportData);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div 
        className="modal-content glass-card animate-scale-up" 
        style={{ 
          width: '900px', 
          maxWidth: '95vw', 
          padding: 0, 
          maxHeight: '92vh', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden' 
        }}
      >
        {/* Header Bar */}
        <div 
          className="modal-header" 
          style={{ 
            padding: '16px 24px', 
            borderBottom: '1px solid var(--border-color)', 
            display: 'flex', 
            justify: 'space-between', 
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' }}>
              <Award size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Executive Performance Report Generator</h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Download high-resolution image cards or print official PDF executive statements.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="btn btn-secondary" 
            style={{ border: 'none', padding: '6px', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Controls Toolbar */}
        <div 
          style={{ 
            padding: '12px 24px', 
            background: 'rgba(0,0,0,0.2)', 
            borderBottom: '1px solid var(--border-color)', 
            display: 'flex', 
            justify: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: '12px' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Period:</span>
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', padding: '3px', borderRadius: '8px' }}>
              <button
                onClick={() => setPeriodFilter('fy')}
                className={`btn ${periodFilter === 'fy' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 10px', fontSize: '0.72rem', border: 'none' }}
              >
                Active FY ({selectedFY})
              </button>
              <button
                onClick={() => setPeriodFilter('month')}
                className={`btn ${periodFilter === 'month' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 10px', fontSize: '0.72rem', border: 'none' }}
              >
                Current Month
              </button>
              <button
                onClick={() => setPeriodFilter('week')}
                className={`btn ${periodFilter === 'week' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 10px', fontSize: '0.72rem', border: 'none' }}
              >
                Current Week
              </button>
              <button
                onClick={() => setPeriodFilter('all')}
                className={`btn ${periodFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 10px', fontSize: '0.72rem', border: 'none' }}
              >
                All-Time
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
              <input 
                type="checkbox" 
                checked={includeSubscriptions} 
                onChange={(e) => setIncludeSubscriptions(e.target.checked)} 
              />
              <span>Include Subscriptions</span>
            </label>

            <button 
              onClick={togglePnlVisibility} 
              className="btn btn-secondary" 
              style={{ padding: '4px 10px', fontSize: '0.74rem', gap: '6px' }}
            >
              {isPnlVisible ? <EyeOff size={14} /> : <Eye size={14} color="var(--primary)" />}
              <span>{isPnlVisible ? 'Hide P&L' : 'Show P&L'}</span>
            </button>
          </div>
        </div>

        {/* Modal Body: Live Card Preview */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card Preview Container */}
          <div 
            className="glass-card" 
            style={{ 
              padding: '24px', 
              borderRadius: '16px', 
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #020617 100%)', 
              border: '1.5px solid rgba(255, 255, 255, 0.12)', 
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
              position: 'relative'
            }}
          >
            {/* Top Bar Preview */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.25)', border: '1px solid rgba(99, 102, 241, 0.5)' }}>
                  <Sparkles size={22} color="#818cf8" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.02em' }}>
                    TRADER'S DIARY EXECUTIVE SUMMARY
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                    TRADER: {userName.toUpperCase()} • GENERATED ON {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div 
                style={{ 
                  padding: '5px 14px', 
                  borderRadius: '8px', 
                  background: 'rgba(99, 102, 241, 0.2)', 
                  border: '1px solid #6366f1', 
                  color: '#818cf8', 
                  fontSize: '0.75rem', 
                  fontWeight: 700 
                }}
              >
                {getPeriodLabel().toUpperCase()}
              </div>
            </div>

            {/* Main Grid Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', marginBottom: '20px' }}>
              
              {/* Left Net PnL Box */}
              <div 
                style={{ 
                  padding: '20px', 
                  borderRadius: '14px', 
                  background: netPnL >= 0 ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)', 
                  border: `1.5px solid ${netPnL >= 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 650, letterSpacing: '0.04em' }}>
                    NET REALIZED TRADING P&L
                  </span>
                  <div style={{ fontSize: '2.1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: netPnL >= 0 ? '#34d399' : '#f87171', marginTop: '4px' }}>
                    {isPnlVisible ? `${netPnL >= 0 ? '+' : ''}${formatCurrency(netPnL)}` : '••••••••'}
                  </div>
                </div>

                {periodSubscriptions > 0 && (
                  <div 
                    style={{ 
                      marginTop: '12px', 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      background: 'rgba(245, 158, 11, 0.12)', 
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      fontSize: '0.74rem',
                      color: '#fbbf24',
                      fontWeight: 650
                    }}
                  >
                    Net Bottom-Line: {isPnlVisible ? `${netBottomLine >= 0 ? '+' : ''}${formatCurrency(netBottomLine)}` : '••••'} (After {isPnlVisible ? formatCurrency(periodSubscriptions) : '••••'} Subs)
                  </div>
                )}

                {/* Progress Bar */}
                <div style={{ marginTop: '16px' }}>
                  <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.3)', overflow: 'hidden' }}>
                    <div style={{ width: `${winRate}%`, height: '100%', background: '#34d399', borderRadius: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginTop: '6px', fontWeight: 600 }}>
                    <span style={{ color: '#34d399' }}>{winningTrades.length} Wins ({winRate.toFixed(1)}%)</span>
                    <span style={{ color: '#f87171' }}>{losingTrades.length} Losses</span>
                  </div>
                </div>
              </div>

              {/* Right Stats Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div 
                  style={{ 
                    padding: '14px', 
                    borderRadius: '12px', 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 600, display: 'block' }}>WIN RATE</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#60a5fa', fontFamily: 'var(--font-mono)' }}>{winRate.toFixed(1)}%</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 600, display: 'block' }}>PROFIT FACTOR</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: profitFactor >= 1.5 ? '#34d399' : '#f87171', fontFamily: 'var(--font-mono)' }}>
                      {profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div 
                  style={{ 
                    padding: '14px', 
                    borderRadius: '12px', 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 600, display: 'block' }}>TOTAL TRADES</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>{totalTrades}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 600, display: 'block' }}>TOTAL CHARGES & LEAKAGE</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fb923c', fontFamily: 'var(--font-mono)' }}>
                      {isPnlVisible ? formatCurrency(totalBrokerage + totalTaxes + periodSubscriptions) : '••••'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 3 Highlights Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '0.65rem', color: '#818cf8', fontWeight: 700, display: 'block', marginBottom: '4px' }}>💸 CHARGES BREAKDOWN</span>
                <div style={{ fontSize: '0.72rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '2px', fontFamily: 'var(--font-mono)' }}>
                  <div>Brokerage: {isPnlVisible ? formatCurrency(totalBrokerage) : '••••'}</div>
                  <div>Taxes: {isPnlVisible ? formatCurrency(totalTaxes) : '••••'}</div>
                  <div style={{ color: '#fbbf24' }}>Subs: {isPnlVisible ? formatCurrency(periodSubscriptions) : '••••'}</div>
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '0.65rem', color: '#34d399', fontWeight: 700, display: 'block', marginBottom: '4px' }}>⭐ HIGHLIGHTS</span>
                <div style={{ fontSize: '0.72rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div>Winner: <strong style={{ color: '#34d399' }}>{bestTrade ? `${bestTrade.symbol} (${formatCurrency(bestTrade.netPnL)})` : 'N/A'}</strong></div>
                  <div>Top Tag: <strong style={{ color: '#fbbf24' }}>{topMistake}</strong></div>
                </div>
              </div>

              <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', border: '1.5px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={26} color="#34d399" />
                <div>
                  <span style={{ fontSize: '0.74rem', color: '#34d399', fontWeight: 800, display: 'block' }}>VERIFIED TRADER REPORT</span>
                  <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Double-entry ledger audited</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer Actions */}
        <div 
          className="modal-footer" 
          style={{ 
            padding: '16px 24px', 
            borderTop: '1px solid var(--border-color)', 
            display: 'flex', 
            justify: 'space-between', 
            alignItems: 'center',
            background: 'rgba(255,255,255,0.02)' 
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            💡 PNG images are rendered at 2x High-DPI Retina resolution for sharing.
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handlePrintPDF}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.8rem', gap: '6px' }}
            >
              <Printer size={15} />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={handleDownloadPNG}
              className="btn btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.8rem', gap: '8px', fontWeight: 700 }}
            >
              <Download size={16} />
              <span>Download PNG Card</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
