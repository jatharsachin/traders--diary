import React, { useState, useMemo, memo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { parseLocalYYYYMMDD } from '../../utils/fyHelper';

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

const formatDateTooltip = (dateStr: string) => {
  if (!dateStr || dateStr === 'Start') return 'Initial Capital';
  const d = parseLocalYYYYMMDD(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  chartMode: 'area' | 'bar';
  isPnlVisible: boolean;
  formatCurrency: (val: number) => string;
}

const CustomEquityTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  chartMode,
  isPnlVisible,
  formatCurrency
}) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const val = chartMode === 'bar' ? (data.dailyDelta || 0) : (data.tradingPnL || 0);
  const isPositive = val >= 0;

  return (
    <div
      className="glass-card"
      style={{
        background: 'var(--bg-tooltip-opaque)',
        border: '1.5px solid var(--border-color-active)',
        borderRadius: '12px',
        padding: '10px 14px',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.55)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        minWidth: '165px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
          {formatDateTooltip(data.date)}
        </span>
        <span
          className={`badge ${isPositive ? 'badge-win' : 'badge-loss'}`}
          style={{ fontSize: '0.62rem', padding: '1px 6px' }}
        >
          {chartMode === 'bar'
            ? (isPositive ? 'PROFIT' : 'LOSS')
            : (isPositive ? 'GROWTH' : 'DRAWDOWN')}
        </span>
      </div>
      <div
        style={{
          fontSize: '1rem',
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          color: isPositive ? 'var(--color-win)' : 'var(--color-loss)'
        }}
      >
        {isPnlVisible ? `${isPositive ? '+' : ''}${formatCurrency(val)}` : '••••••'}
      </div>
      {chartMode === 'bar' && (
        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          Equity: {isPnlVisible ? formatCurrency(data.tradingPnL || 0) : '••••'}
        </div>
      )}
    </div>
  );
};

export const EquityCurveChart: React.FC<EquityCurveChartProps> = memo(({
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
  const [chartMode, setChartMode] = useState<'area' | 'bar'>('area');

  const { enrichedData, peakEquity, startEquity, maxDrawdownPct } = useMemo(() => {
    if (!equityData || equityData.length === 0) {
      return { enrichedData: [], peakEquity: 0, startEquity: 0, maxDrawdownPct: 0 };
    }
    let peak = equityData[0].tradingPnL;
    let maxDD = 0;
    const start = equityData[0].tradingPnL;

    const list = equityData.map((pt, idx) => {
      const prevVal = idx > 0 ? equityData[idx - 1].tradingPnL : pt.tradingPnL;
      const dailyDelta = idx > 0 ? pt.tradingPnL - prevVal : 0;
      if (pt.tradingPnL > peak) peak = pt.tradingPnL;
      if (peak > 0) {
        const dd = ((peak - pt.tradingPnL) / peak) * 100;
        if (dd > maxDD) maxDD = dd;
      }
      return { ...pt, dailyDelta };
    });

    return {
      enrichedData: list,
      peakEquity: peak,
      startEquity: start,
      maxDrawdownPct: maxDD
    };
  }, [equityData]);

  const barData = useMemo(
    () => enrichedData.filter((d, idx) => idx > 0 && d.date !== 'Start'),
    [enrichedData]
  );

  const isOverallWin = equityData.length > 0 ? (equityData[equityData.length - 1].tradingPnL >= startEquity) : true;
  const curveColor = isOverallWin ? '#22c55e' : '#ef4444';

  const formatCompactTick = (value: number) => {
    const absVal = Math.abs(value);
    if (absVal >= 100000) {
      return `${(value / 100000).toFixed(1).replace(/\.0$/, '')}L`;
    }
    if (absVal >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value === 0 ? '0' : Math.round(value).toLocaleString('en-IN');
  };

  const formatXAxisTick = (val: string) => {
    if (!val || val === 'Start') return '';
    const d = parseLocalYYYYMMDD(val);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="glass-card" style={{ padding: '20px 24px', marginBottom: '14px' }}>
      {/* Header controls layout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {(['1M', '3M', '6M', '1Y', 'All'] as const).map((range) => {
            const stat = buttonStats[range] || { pnl: 0, pct: 0 };
            const isSelected = timeRange === range;
            const isLoss = stat.pnl < 0;
            const label = range === 'All' ? 'All Time' : range.toLowerCase();
            const sign = stat.pnl >= 0 ? '+' : '';
            const activeColor = isLoss ? 'var(--color-loss)' : 'var(--color-win)';
            const activeBg = isLoss ? 'var(--color-loss-bg)' : 'var(--color-win-bg)';

            return (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.74rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  border: isSelected ? `1.5px solid ${activeColor}` : '1px solid rgba(255, 255, 255, 0.08)',
                  background: isSelected ? activeBg : 'rgba(255, 255, 255, 0.025)',
                  color: isSelected ? activeColor : 'var(--text-dim)',
                }}
              >
                {label}{' '}
                <span className="font-mono" style={{ marginLeft: '3px', fontSize: '0.71rem', color: isLoss ? 'var(--color-loss)' : 'var(--color-win)' }}>
                  {isPnlVisible ? `${sign}${stat.pct.toFixed(2)}%` : '••%'}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Peak & Max DD Mini Strip */}
          {equityData.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.72rem', padding: '4px 12px', borderRadius: '9999px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Peak:{' '}
                <strong className="font-mono" style={{ color: 'var(--text-main)' }}>
                  {isPnlVisible ? formatCurrency(peakEquity) : '••••'}
                </strong>
              </span>
              <span style={{ width: '1px', height: '10px', background: 'var(--border-color)' }} />
              <span style={{ color: 'var(--text-muted)' }}>
                Max DD:{' '}
                <strong className="font-mono" style={{ color: maxDrawdownPct > 0 ? 'var(--color-loss)' : 'var(--color-win)' }}>
                  {isPnlVisible ? `-${maxDrawdownPct.toFixed(1)}%` : '••%'}
                </strong>
              </span>
            </div>
          )}

          {/* Monthly P&L Badge with Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.025)', padding: '3px 12px', borderRadius: '9999px', border: '1px solid var(--border-color)', height: '30px' }}>
            <select
              value={activeChartMonth}
              onChange={(e) => setSelectedChartMonth(e.target.value)}
              style={{
                fontSize: '0.71rem',
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
              {availableMonths.length === 0 ? (
                <option value="">No Month</option>
              ) : (
                availableMonths.map((m) => {
                  const parts = m.split('-');
                  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
                  const monthName = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
                  return (
                    <option key={m} value={m} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>
                      {monthName} P&L
                    </option>
                  );
                })
              )}
            </select>
            <div style={{ width: '1px', height: '12px', background: 'var(--border-color)' }} />
            <span className="font-mono" style={{ fontSize: '0.76rem', fontWeight: 700, color: selectedMonthPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
              {isPnlVisible ? `${selectedMonthPnL >= 0 ? '+' : ''}${formatCurrency(selectedMonthPnL)}` : '••••'}
            </span>
          </div>

          {/* Area / Daily Bars Segmented Toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '9999px', padding: '2px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setChartMode('area')}
              style={{
                border: 'none',
                borderRadius: '9999px',
                padding: '4px 12px',
                fontSize: '0.71rem',
                fontWeight: 650,
                cursor: 'pointer',
                background: chartMode === 'area' ? 'var(--primary)' : 'transparent',
                color: chartMode === 'area' ? '#fff' : 'var(--text-dim)',
                transition: 'all 0.15s ease'
              }}
            >
              Area
            </button>
            <button
              type="button"
              onClick={() => setChartMode('bar')}
              style={{
                border: 'none',
                borderRadius: '9999px',
                padding: '4px 12px',
                fontSize: '0.71rem',
                fontWeight: 650,
                cursor: 'pointer',
                background: chartMode === 'bar' ? 'var(--primary)' : 'transparent',
                color: chartMode === 'bar' ? '#fff' : 'var(--text-dim)',
                transition: 'all 0.15s ease'
              }}
            >
              Daily Bars
            </button>
          </div>
        </div>
      </div>

      <div className="chart-container-large" style={{ height: '275px' }}>
        <ResponsiveContainer>
          {chartMode === 'area' ? (
            <AreaChart data={enrichedData} margin={{ top: 14, right: 8, left: 6, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMatteEquity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={curveColor} stopOpacity={0.22} />
                  <stop offset="65%" stopColor={curveColor} stopOpacity={0.05} />
                  <stop offset="100%" stopColor={curveColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                stroke="var(--text-dim)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={45}
                tickFormatter={formatXAxisTick}
              />
              <YAxis
                orientation="right"
                stroke="var(--text-dim)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={48}
                domain={['dataMin - 8000', 'auto']}
                tickFormatter={formatCompactTick}
              />
              <Tooltip
                cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
                content={<CustomEquityTooltip chartMode="area" isPnlVisible={isPnlVisible} formatCurrency={formatCurrency} />}
              />
              {equityData.length > 1 && (
                <>
                  <ReferenceLine
                    y={peakEquity}
                    stroke="#3b82f6"
                    strokeDasharray="4 4"
                    strokeOpacity={0.45}
                  />
                  <ReferenceLine
                    y={startEquity}
                    stroke="rgba(255,255,255,0.22)"
                    strokeDasharray="3 3"
                  />
                </>
              )}
              <Area
                type="monotone"
                dataKey="tradingPnL"
                name="Equity"
                stroke={curveColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorMatteEquity)"
                activeDot={{ r: 4.5, strokeWidth: 2, stroke: '#fff', fill: curveColor }}
              />
            </AreaChart>
          ) : (
            <BarChart data={barData} margin={{ top: 14, right: 8, left: 6, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                stroke="var(--text-dim)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={45}
                tickFormatter={formatXAxisTick}
              />
              <YAxis
                orientation="right"
                stroke="var(--text-dim)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={formatCompactTick}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                content={<CustomEquityTooltip chartMode="bar" isPnlVisible={isPnlVisible} formatCurrency={formatCurrency} />}
              />
              <Bar dataKey="dailyDelta" radius={[4, 4, 4, 4]} maxBarSize={24}>
                {barData.map((entry, idx) => (
                  <Cell
                    key={`bar-${idx}`}
                    fill={entry.dailyDelta >= 0 ? '#22c55e' : '#ef4444'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
});
