import React, { useState } from 'react';
import { Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import { BROKER_LOGOS } from '../../utils/brandLogos';

export interface BrokerStatItem {
  name: string;
  brokerName: string;
  totalTrades: number;
  netPnL: number;
  winRate: number;
  charges: number;
  investmentPnL: number;
  activeInvestmentValue: number;
}

interface BrokerPerformanceSectionProps {
  brokerStats: BrokerStatItem[];
  selectedFY: string;
  isPnlVisible: boolean;
}

export const BrokerPerformanceSection: React.FC<BrokerPerformanceSectionProps> = ({
  brokerStats,
  selectedFY,
  isPnlVisible
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '16px', transition: 'all 0.25s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isCollapsed ? 0 : '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '7px',
            background: 'rgba(10, 132, 255, 0.12)',
            border: '1px solid rgba(10, 132, 255, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <Briefcase size={15} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '0.94rem', fontWeight: 700, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.01em' }}>
                Broker-Wise Performance Breakdown ({selectedFY})
              </h3>
              <span className="badge" style={{ fontSize: '0.64rem', padding: '1px 7px', background: 'rgba(10, 132, 255, 0.12)', color: '#60a5fa', border: '1px solid rgba(10, 132, 255, 0.3)', fontWeight: 650 }}>
                {brokerStats.length} {brokerStats.length === 1 ? 'Account' : 'Accounts'}
              </span>
            </div>
            {!isCollapsed && (
              <p style={{ fontSize: '0.68rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
                Live trading results, success rates, and charge leakage per broker account for the active financial year.
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.7rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '6px',
            transition: 'all 0.18s ease'
          }}
          title={isCollapsed ? 'Expand Broker Summary' : 'Collapse Broker Summary'}
        >
          {isCollapsed ? (
            <>
              <span>Show</span>
              <ChevronDown size={13} />
            </>
          ) : (
            <>
              <span>Collapse</span>
              <ChevronUp size={13} />
            </>
          )}
        </button>
      </div>

      {!isCollapsed && (
        brokerStats.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
            No trading or investment data logged in the selected financial year yet to compile broker stats.
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: brokerStats.length <= 2 ? 'repeat(auto-fit, minmax(280px, 380px))' : 'repeat(auto-fit, minmax(280px, 1fr))', 
            gap: '14px',
            justifyContent: 'flex-start'
          }}>
            {brokerStats.map((stat) => (
              <div 
                key={stat.name}
                className="broker-card sub-card glass-card"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                {/* Subtle watermark broker logo */}
                <img 
                  src={BROKER_LOGOS[stat.brokerName] || BROKER_LOGOS['Other']} 
                  alt="" 
                  style={{ 
                    position: 'absolute', 
                    right: -6, 
                    bottom: -8, 
                    width: '52px', 
                    height: '52px', 
                    opacity: 0.05, 
                    pointerEvents: 'none', 
                    filter: 'grayscale(1)' 
                  }} 
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img 
                      src={BROKER_LOGOS[stat.brokerName] || BROKER_LOGOS['Other']} 
                      alt={stat.brokerName} 
                      style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'contain', background: '#fff', padding: '1px', border: '1px solid var(--border-color)' }} 
                    />
                    <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>{stat.name}</strong>
                  </div>
                  <span 
                    className="badge" 
                    style={{ 
                      fontSize: '0.62rem', 
                      padding: '2px 7px',
                      background: stat.netPnL >= 0 ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                      color: stat.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)',
                      border: `1px solid ${stat.netPnL >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      fontWeight: 650
                    }}
                  >
                    {stat.totalTrades} Trades
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.74rem' }}>Net P&L:</span>
                  <strong style={{ fontSize: '0.96rem', fontFamily: 'var(--font-mono)', color: stat.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {stat.netPnL >= 0 ? '+' : ''}₹{isPnlVisible ? Math.round(stat.netPnL).toLocaleString('en-IN') : '••••'}
                  </strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                    <span style={{ color: 'var(--text-dim)' }}>Win Rate:</span>
                    <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{stat.winRate.toFixed(1)}%</strong>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${Math.min(100, Math.max(0, stat.winRate))}%`, 
                        height: '100%', 
                        background: stat.winRate >= 50 ? 'var(--color-win)' : 'var(--color-loss)', 
                        borderRadius: '9999px',
                        boxShadow: `0 0 6px ${stat.winRate >= 50 ? 'rgba(48,209,88,0.4)' : 'rgba(255,69,58,0.4)'}`
                      }} 
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Charges:</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    ₹{isPnlVisible ? Math.round(stat.charges).toLocaleString('en-IN') : '••••'}
                  </span>
                </div>

                {(stat.investmentPnL !== 0 || stat.activeInvestmentValue !== 0) && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', borderTop: '1px dashed var(--border-color)', paddingTop: '6px', marginTop: '2px' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Investment Return:</span>
                      <strong style={{ color: stat.investmentPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                        {stat.investmentPnL >= 0 ? '+' : ''}₹{isPnlVisible ? Math.round(stat.investmentPnL).toLocaleString('en-IN') : '••••'}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                      <span style={{ color: 'var(--text-dim)' }}>Holding Value:</span>
                      <span style={{ color: 'var(--text-main)', fontWeight: 650, fontFamily: 'var(--font-mono)' }}>
                        ₹{isPnlVisible ? Math.round(stat.activeInvestmentValue).toLocaleString('en-IN') : '••••'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
