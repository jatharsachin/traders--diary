import React from 'react';
import { Briefcase } from 'lucide-react';
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
  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <Briefcase size={22} color="var(--primary)" />
        Broker-Wise Performance Summary ({selectedFY})
      </h3>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
        Breakdown of trading activity, success rates, and charge leakage across your active brokers for the active financial year.
      </p>

      {brokerStats.length === 0 ? (
        <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
          No trading or investment data logged in the selected financial year yet to compile broker stats.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          {brokerStats.map((stat) => (
            <div 
              key={stat.name}
              className="broker-card sub-card"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img 
                    src={BROKER_LOGOS[stat.brokerName] || BROKER_LOGOS['Other']} 
                    alt={stat.brokerName} 
                    style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'contain', background: '#fff', padding: '1px', border: '1px solid var(--border-color)' }} 
                  />
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{stat.name}</strong>
                </div>
                <span 
                  className="badge" 
                  style={{ 
                    fontSize: '0.62rem', 
                    padding: '2px 6px',
                    background: stat.netPnL >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: stat.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)',
                    textTransform: 'none'
                  }}
                >
                  {stat.totalTrades} Trades
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Net P&L:</span>
                <strong style={{ color: stat.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                  {stat.netPnL >= 0 ? '+' : ''}₹{isPnlVisible ? Math.round(stat.netPnL).toLocaleString('en-IN') : '••••'}
                </strong>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Win Rate:</span>
                  <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{stat.winRate.toFixed(1)}%</strong>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, stat.winRate))}%`, height: '100%', background: stat.winRate >= 50 ? 'var(--color-win)' : 'var(--color-loss)', borderRadius: '9999px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Charges:</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  ₹{isPnlVisible ? Math.round(stat.charges).toLocaleString('en-IN') : '••••'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', borderTop: '1px dashed var(--border-color)', paddingTop: '6px', marginTop: '2px' }}>
                <span style={{ color: 'var(--text-dim)' }}>Investment Return:</span>
                <strong style={{ color: stat.investmentPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                  {stat.investmentPnL >= 0 ? '+' : ''}₹{isPnlVisible ? Math.round(stat.investmentPnL).toLocaleString('en-IN') : '••••'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Holding Value:</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 650 }}>
                  ₹{isPnlVisible ? Math.round(stat.activeInvestmentValue).toLocaleString('en-IN') : '••••'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
