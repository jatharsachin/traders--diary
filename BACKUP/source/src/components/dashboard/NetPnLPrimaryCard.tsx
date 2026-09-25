import React from 'react';
import { IndianRupee } from 'lucide-react';

interface NetPnLPrimaryCardProps {
  displayNetPnL: number;
  showCombined: boolean;
  combinedReturnPct: number;
  tradingReturnPct: number;
  totalSubExpenses: number;
  netBottomLinePnL: number;
  totalGrossPnL: number;
  totalBrokerage: number;
  totalTaxes: number;
  totalNetPnL: number;
  totalInvReturns: number;
  isPnlVisible: boolean;
  formatCurrency: (val: number) => string;
}

export const NetPnLPrimaryCard: React.FC<NetPnLPrimaryCardProps> = ({
  displayNetPnL,
  showCombined,
  combinedReturnPct,
  tradingReturnPct,
  totalSubExpenses,
  netBottomLinePnL,
  totalGrossPnL,
  totalBrokerage,
  totalTaxes,
  totalNetPnL,
  totalInvReturns,
  isPnlVisible,
  formatCurrency
}) => {
  return (
    <div 
      className={`glass-card metric-card ${displayNetPnL >= 0 ? 'glow-green' : 'glow-red'}`} 
      style={{ 
        minHeight: '58px', 
        justifyContent: 'center', 
        padding: '5px 12px',
        background: 'rgba(255, 255, 255, 0.025)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        flexShrink: 0
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', gap: '10px' }}>
        {/* Left Part: Net P&L Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <div className="metric-title" style={{ margin: 0, fontSize: '0.66rem' }}>
            <IndianRupee size={12} style={{ color: displayNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }} />
            <span>{showCombined ? 'Combined Wealth P&L' : 'Net Realized P&L'}</span>
            {showCombined && (
              <span className="badge badge-win" style={{ fontSize: '0.48rem', padding: '1px 3px', textTransform: 'none', marginLeft: '3px' }}>
                Combined
              </span>
            )}
          </div>
          <div 
            className="metric-value" 
            style={{ color: displayNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontSize: '1.35rem', margin: 0, display: 'flex', alignItems: 'baseline', gap: '4px', lineHeight: 1.15 }}
          >
            {isPnlVisible ? formatCurrency(displayNetPnL) : '••••'}
            <span style={{ fontSize: '0.74rem', fontWeight: 600, color: displayNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
              ({displayNetPnL >= 0 ? '+' : ''}{showCombined ? combinedReturnPct.toFixed(1) : tradingReturnPct.toFixed(1)}%)
            </span>
          </div>

          {totalSubExpenses > 0 && !showCombined && (
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Bottom-Line:</span>
              <strong style={{ color: netBottomLinePnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                {isPnlVisible ? formatCurrency(netBottomLinePnL) : '••••'}
              </strong>
              <span style={{ fontSize: '0.54rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', padding: '0px 4px', borderRadius: '3px', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 600 }}>
                (after subs)
              </span>
            </div>
          )}
        </div>

        {/* Right Part: Detailed Breakdown Items */}
        <div style={{ display: 'flex', gap: '7px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
          {!showCombined ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.01em' }}>GROSS P&L</span>
                <strong style={{ fontSize: '0.68rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                  {isPnlVisible ? formatCurrency(totalGrossPnL) : '••••'}
                </strong>
              </div>
              <div style={{ width: '1px', height: '14px', background: 'var(--border-color)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.01em' }}>BROKERAGE</span>
                <strong style={{ fontSize: '0.68rem', color: 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                  {isPnlVisible ? formatCurrency(totalBrokerage) : '••••'}
                </strong>
              </div>
              <div style={{ width: '1px', height: '14px', background: 'var(--border-color)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.01em' }}>TAXES & FEES</span>
                <strong style={{ fontSize: '0.68rem', color: 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                  {isPnlVisible ? formatCurrency(totalTaxes) : '••••'}
                </strong>
              </div>
              {totalSubExpenses > 0 && (
                <>
                  <div style={{ width: '1px', height: '14px', background: 'var(--border-color)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ fontSize: '0.52rem', color: '#f59e0b', fontWeight: 650, letterSpacing: '0.01em' }}>SUBS</span>
                    <strong style={{ fontSize: '0.68rem', color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                      {isPnlVisible ? formatCurrency(totalSubExpenses) : '••••'}
                    </strong>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.01em' }}>TRADING NET</span>
                <strong style={{ fontSize: '0.68rem', color: totalNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                  {isPnlVisible ? formatCurrency(totalNetPnL) : '••••'}
                </strong>
              </div>
              <div style={{ width: '1px', height: '14px', background: 'var(--border-color)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <span style={{ fontSize: '0.52rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.01em' }}>INV. RETURNS</span>
                <strong style={{ fontSize: '0.68rem', color: totalInvReturns >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                  {isPnlVisible ? formatCurrency(totalInvReturns) : '••••'}
                </strong>
              </div>
              {totalSubExpenses > 0 && (
                <>
                  <div style={{ width: '1px', height: '14px', background: 'var(--border-color)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ fontSize: '0.52rem', color: '#f59e0b', fontWeight: 650, letterSpacing: '0.01em' }}>SUBS</span>
                    <strong style={{ fontSize: '0.68rem', color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                      {isPnlVisible ? formatCurrency(totalSubExpenses) : '••••'}
                    </strong>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
