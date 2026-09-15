import React from 'react';
import { Calendar } from 'lucide-react';

export interface RecentTradingDayItem {
  dateStr: string;
  dayName: string;
  dayNum: number;
  monthShort: string;
  count: number;
  netPnL: number;
  grossPnL: number;
  charges: number;
  isNoTrade: boolean;
}

export interface RecentDaysTotal {
  netPnL: number;
  grossPnL: number;
  charges: number;
  tradeCount: number;
  daysCount: number;
}

interface RecentTradingDaysStripProps {
  recentTradingDays: RecentTradingDayItem[];
  recentDaysTotal: RecentDaysTotal;
  isPnlVisible: boolean;
  onSelectDateFilter?: (date: string) => void;
  onNavigateToTab?: (tab: any) => void;
}

export const RecentTradingDaysStrip: React.FC<RecentTradingDaysStripProps> = ({
  recentTradingDays,
  recentDaysTotal,
  isPnlVisible,
  onSelectDateFilter,
  onNavigateToTab
}) => {
  if (!recentTradingDays || recentTradingDays.length === 0) return null;

  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        padding: '4px 8px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
        flexShrink: 0
      }}
    >
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px', 
          fontSize: '0.64rem', 
          color: 'var(--text-dim)', 
          fontWeight: 700, 
          textTransform: 'uppercase', 
          letterSpacing: '0.04em',
          paddingRight: '5px',
          borderRight: '1px solid var(--border-color)',
          cursor: onNavigateToTab ? 'pointer' : 'default'
        }}
        onClick={() => onNavigateToTab?.('calendar')}
        title="Click to view full Calendar"
      >
        <Calendar size={12} color="var(--primary)" />
        <span>Recent</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        {recentTradingDays.map((d) => {
          const isWin = d.netPnL > 0;
          const isLoss = d.netPnL < 0;
          const bgStyle = d.isNoTrade
            ? 'rgba(96, 165, 250, 0.08)'
            : isWin 
            ? 'rgba(48, 209, 88, 0.1)'
            : isLoss 
            ? 'rgba(255, 69, 58, 0.1)'
            : 'rgba(255, 255, 255, 0.04)';

          const borderColor = d.isNoTrade
            ? 'rgba(96, 165, 250, 0.3)'
            : isWin 
            ? 'rgba(48, 209, 88, 0.3)'
            : isLoss 
            ? 'rgba(255, 69, 58, 0.3)'
            : 'var(--border-color)';

          const textColor = d.isNoTrade
            ? '#60a5fa'
            : isWin 
            ? 'var(--color-win)'
            : isLoss 
            ? 'var(--color-loss)'
            : 'var(--text-muted)';

          return (
            <div
              key={d.dateStr}
              onClick={() => {
                if (onSelectDateFilter) {
                  onSelectDateFilter(d.dateStr);
                } else if (onNavigateToTab) {
                  onNavigateToTab('calendar');
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px 6px',
                borderRadius: '6px',
                background: bgStyle,
                border: `1.2px solid ${borderColor}`,
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                minWidth: '50px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              title={`${d.dayName}, ${d.dayNum} ${d.monthShort}: ${d.isNoTrade ? 'Disciplined No-Trade Day' : `${d.count} trade(s), Net P&L: ₹${d.netPnL.toLocaleString('en-IN')}, Chgs: ₹${d.charges.toLocaleString('en-IN')}`}\n(Click to view details)`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                <span>{d.dayName}</span>
                <span style={{ opacity: 0.85 }}>{d.dayNum}</span>
              </div>

              <div style={{ fontSize: '0.7rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: textColor, marginTop: '1px', whiteSpace: 'nowrap' }}>
                {d.isNoTrade ? (
                  <span style={{ fontSize: '0.62rem' }}>🛡️ No-Trd</span>
                ) : !isPnlVisible ? (
                  '••••'
                ) : (
                  `${isWin ? '+' : ''}₹${Math.abs(d.netPnL) >= 1000 ? `${(d.netPnL / 1000).toFixed(1)}k` : Math.round(d.netPnL)}`
                )}
              </div>

              {!d.isNoTrade && (
                <div style={{ fontSize: '0.52rem', color: 'var(--text-dim)' }}>
                  {d.count} trd{d.count > 1 ? 's' : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total P&L Badge of Displayed Recent Days */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '3px 8px',
          marginLeft: '2px',
          borderLeft: '1px solid var(--border-color)',
          background: recentDaysTotal.tradeCount === 0 
            ? 'transparent'
            : recentDaysTotal.netPnL >= 0 
            ? 'rgba(48, 209, 88, 0.08)' 
            : 'rgba(255, 69, 58, 0.08)',
          border: recentDaysTotal.tradeCount === 0 
            ? '1px dashed var(--border-color)' 
            : recentDaysTotal.netPnL >= 0 
            ? '1px solid rgba(48, 209, 88, 0.25)' 
            : '1px solid rgba(255, 69, 58, 0.25)',
          borderRadius: '6px',
          cursor: onNavigateToTab ? 'pointer' : 'default'
        }}
        onClick={() => onNavigateToTab?.('calendar')}
        title={`Total of Recent ${recentDaysTotal.daysCount} Days\nGross P&L: ₹${recentDaysTotal.grossPnL.toLocaleString('en-IN')}\nCharges: ₹${recentDaysTotal.charges.toLocaleString('en-IN')}\nNet P&L: ₹${recentDaysTotal.netPnL.toLocaleString('en-IN')}\nTotal Trades: ${recentDaysTotal.tradeCount}\n(Click to view full Calendar)`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.56rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Total P&L
          </span>
          <span 
            style={{ 
              fontSize: '0.76rem', 
              fontWeight: 850, 
              fontFamily: 'var(--font-mono)', 
              color: recentDaysTotal.tradeCount === 0 
                ? 'var(--text-dim)' 
                : recentDaysTotal.netPnL >= 0 
                ? 'var(--color-win)' 
                : 'var(--color-loss)' 
            }}
          >
            {!isPnlVisible 
              ? '••••••' 
              : recentDaysTotal.tradeCount === 0
              ? '₹0'
              : `${recentDaysTotal.netPnL >= 0 ? '+' : ''}₹${Math.round(recentDaysTotal.netPnL).toLocaleString('en-IN')}`
            }
          </span>
        </div>
      </div>
    </div>
  );
};
