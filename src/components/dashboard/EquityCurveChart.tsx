import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export type TimeRangeType = '1M' | '3M' | '6M' | '1Y' | 'All';

interface EquityCurveChartProps {
  buttonStats: Record<TimeRangeType, { pnl: number; pct: number }>;
  timeRange: TimeRangeType;
  setTimeRange: (range: TimeRangeType) => void;
  activeChartMonth: string;
  setSelectedChartMonth: (month: string) => void;
  availableMonths: string[];
  selectedMonthPnL: number;
  equityData: { date: string; tradingPnL: number }[];
  isPnlVisible: boolean;
  formatCurrency: (val: number) => string;
}

export const EquityCurveChart: React.FC<EquityCurveChartProps> = ({
  buttonStats,
  timeRange,
  setTimeRange,
  activeChartMonth,
  setSelectedChartMonth,
  availableMonths,
  selectedMonthPnL,
  equityData,
  isPnlVisible,
  formatCurrency
}) => {
  const formatDateTooltip = (dateStr: string) => {
    if (!dateStr || dateStr === 'Start') return 'Initial Capital';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const CustomEquityTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const val = data.tradingPnL || 0;
      const isPositive = val >= 0;

      return (
        <div 
          className="glass-card" 
          style={{ 
            background: 'var(--bg-tooltip-opaque)', 
            border: '1.5px solid var(--border-color-active)', 
            borderRadius: '12px',
            padding: '10px 14px', 
            boxShadow: 'var(--shadow-glow)', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '4px',
            minWidth: '150px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{formatDateTooltip(data.date)}</span>
            <span 
              className={`badge ${isPositive ? 'badge-win' : 'badge-loss'}`}
              style={{ fontSize: '0.62rem', padding: '1px 6px' }}
            >
              {isPositive ? 'GROWTH' : 'DRAWDOWN'}
            </span>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: isPositive ? 'var(--color-win)' : 'var(--color-loss)' }}>
            {isPnlVisible ? `${isPositive ? '+' : ''}${formatCurrency(val)}` : '••••••'}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card" style={{ padding: '24px', marginBottom: '14px' }}>
      {/* Header controls layout matching the premium design */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['1M', '3M', '6M', '1Y', 'All'] as const).map((range) => {
            const stat = buttonStats[range] || { pnl: 0, pct: 0 };
            const isSelected = timeRange === range;
            const isLoss = stat.pnl < 0;
            const label = range === 'All' ? 'All Time' : range.toLowerCase();
            const sign = stat.pnl >= 0 ? '+' : '';
            
            // Color configuration
            const activeColor = isLoss ? 'var(--color-loss)' : 'var(--color-win)';
            const activeBg = isLoss ? 'var(--color-loss-bg)' : 'var(--color-win-bg)';
            
            return (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: isSelected ? `1.5px solid ${activeColor}` : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected ? activeBg : 'rgba(255, 255, 255, 0.08)',
                  color: isSelected ? activeColor : 'var(--text-main)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                }}
              >
                {label} <span style={{ marginLeft: '4px', fontSize: '0.72rem', color: isLoss ? 'var(--color-loss)' : 'var(--color-win)' }}>{sign}{stat.pct.toFixed(2)}%</span>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Live Monthly P&L Badge with Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '3px 8px', borderRadius: '8px', border: '1px solid var(--border-color)', height: '28px' }}>
            <select
              value={activeChartMonth}
              onChange={(e) => setSelectedChartMonth(e.target.value)}
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                background: 'transparent',
                color: 'var(--text-muted)',
                border: 'none',
                outline: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: 0
              }}
            >
              {availableMonths.map((m) => {
                const parts = m.split('-');
                const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
                const monthName = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
                return (
                  <option key={m} value={m} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                    {monthName} P&L
                  </option>
                );
              })}
            </select>
            <div style={{ width: '1px', height: '12px', background: 'var(--border-color)' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: selectedMonthPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
              {isPnlVisible ? `${selectedMonthPnL >= 0 ? '+' : ''}${formatCurrency(selectedMonthPnL)}` : '••••'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ height: '3px', width: '20px', background: 'var(--color-win)', borderRadius: '2px', display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Capital Equity Curve (Manual Logs)
            </span>
          </div>
        </div>
      </div>

      <div className="chart-container-large" style={{ height: '280px' }}>
        <ResponsiveContainer>
          <AreaChart data={equityData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorGreenTrading" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-win)" stopOpacity={0.18}/>
                <stop offset="95%" stopColor="var(--color-win)" stopOpacity={0.01}/>
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.02)" />
            <XAxis 
              dataKey="date" 
              stroke="var(--text-dim)" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false} 
              minTickGap={50}
              tickFormatter={(val) => {
                if (!val || val === 'Start') return '';
                const d = new Date(val);
                if (isNaN(d.getTime())) return '';
                return d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
              }}
            />
            <YAxis 
              orientation="right"
              stroke="var(--text-dim)" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false} 
              domain={['dataMin - 10000', 'auto']}
              tickFormatter={(value) => {
                const absVal = Math.abs(value);
                if (absVal >= 100000) {
                  return `${(value / 100000).toFixed(1).replace(/\.0$/, '')}L`;
                }
                return value === 0 ? '0' : Math.round(value).toLocaleString('en-IN');
              }} 
            />
            <Tooltip 
              cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }}
              content={<CustomEquityTooltip />} 
            />
            <Area 
              type="monotone" 
              dataKey="tradingPnL" 
              name="Value" 
              stroke="var(--color-win)" 
              strokeWidth={2} 
              fillOpacity={1} 
              fill="url(#colorGreenTrading)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
