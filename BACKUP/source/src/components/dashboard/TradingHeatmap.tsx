import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarRange } from 'lucide-react';
import type { Trade, Investment } from '../../types';
import { OFFLINE_NSE_HOLIDAYS } from '../TradingCalendar';
import { formatTimeToAMPM } from '../../utils/fyHelper';

interface TradingHeatmapProps {
  rawTrades: Trade[];
  selectedFY: string;
  selectedBroker: string;
  noTradeDays: string[];
  isPnlVisible: boolean;
  trades: Trade[];
  investments: Investment[];
  onSelectDateFilter?: (date: string) => void;
}

const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  return new Date(dateStr);
};

const getDatesArray = (startDate: string, endDate: string) => {
  const dates: string[] = [];
  const curr = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  while (curr <= end) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

export const TradingHeatmap: React.FC<TradingHeatmapProps> = ({
  rawTrades,
  selectedFY,
  selectedBroker,
  noTradeDays,
  isPnlVisible,
  trades,
  investments,
  onSelectDateFilter
}) => {
  const [selectedHeatmapDate, setSelectedHeatmapDate] = useState<string | null>(null);

  const getHeatmapRange = () => {
    if (selectedFY === 'ALL') {
      const today = new Date();
      const currentYear = today.getFullYear();
      const startYear = today.getMonth() >= 3 ? currentYear : currentYear - 1;
      return {
        start: `${startYear}-04-01`,
        end: `${startYear + 1}-03-31`
      };
    }
    const match = selectedFY.match(/\d{4}/);
    const startYear = match ? parseInt(match[0], 10) : new Date().getFullYear();
    return {
      start: `${startYear}-04-01`,
      end: `${startYear + 1}-03-31`
    };
  };

  const heatmapRange = getHeatmapRange();
  const dates = getDatesArray(heatmapRange.start, heatmapRange.end);

  const getMonthsGrouped = (datesList: string[]) => {
    const monthsMap: Record<string, { name: string; dates: string[]; startPad: number }> = {};
    
    datesList.forEach((dateStr) => {
      const d = parseLocalDate(dateStr);
      const day = d.getDay();
      if (day === 0 || day === 6) return; // Skip Saturdays and Sundays!
      
      const mName = d.toLocaleString('en-IN', { month: 'short' });
      const year = d.getFullYear();
      const key = `${mName} ${year}`;
      
      if (!monthsMap[key]) {
        monthsMap[key] = {
          name: mName,
          dates: [],
          startPad: 0
        };
      }
      monthsMap[key].dates.push(dateStr);
    });

    const list = Object.values(monthsMap);
    list.forEach((m) => {
      const firstDate = m.dates[0];
      if (firstDate) {
        const d = parseLocalDate(firstDate);
        const day = d.getDay();
        m.startPad = day - 1; // 0 = Mon, 1 = Tue, 2 = Wed, 3 = Thu, 4 = Fri
      }
    });

    return list;
  };

  const monthsData = getMonthsGrouped(dates);

  const heatmapTrades = rawTrades.filter((t) => {
    const d = t.exitDate || t.date;
    return d >= heatmapRange.start && d <= heatmapRange.end && (selectedBroker === 'All' ? true : (t.broker || 'Other') === selectedBroker);
  });

  const dailyStats: Record<string, { pnl: number; count: number }> = {};
  heatmapTrades.forEach((t) => {
    const d = t.exitDate || t.date;
    if (!dailyStats[d]) {
      dailyStats[d] = { pnl: 0, count: 0 };
    }
    dailyStats[d].pnl += t.netPnL;
    dailyStats[d].count += 1;
  });

  let maxWin = 1;
  let maxLoss = 1;
  Object.values(dailyStats).forEach((s) => {
    if (s.pnl > maxWin) maxWin = s.pnl;
    if (Math.abs(s.pnl) > maxLoss) maxLoss = Math.abs(s.pnl);
  });

  let greenDaysCount = 0;
  let redDaysCount = 0;
  let noTradeDaysCount = 0;
  let holidaysCount = 0;

  dates.forEach((dateStr) => {
    const stats = dailyStats[dateStr];
    const isHoliday = !!OFFLINE_NSE_HOLIDAYS[dateStr];
    if (stats && stats.count > 0) {
      if (stats.pnl > 0) greenDaysCount++;
      else if (stats.pnl < 0) redDaysCount++;
    } else if (isHoliday) {
      holidaysCount++;
    } else if (noTradeDays.includes(dateStr)) {
      noTradeDaysCount++;
    }
  });

  return (
    <>
      {/* GitHub-style Trading Performance Heatmap */}
      <div 
        className="glass-card animate-tab-panel" 
        style={{ 
          padding: '20px 24px', 
          background: 'var(--bg-card)', 
          border: '1.5px solid var(--border-color)', 
          borderRadius: '12px', 
          boxShadow: 'var(--shadow-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarRange size={22} color="var(--primary)" />
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Trading Performance Heatmap</h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0 }}>Visual representation of daily net profits, losses, and disciplined streaks</p>
            </div>
          </div>
          
          {/* Summary Indicators */}
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.75rem', fontWeight: 550 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(48, 209, 88, 0.75)', border: '1px solid rgba(48, 209, 88, 0.4)' }}></span>
              <span style={{ color: 'var(--text-muted)' }}>Green Days: {greenDaysCount}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(255, 69, 58, 0.75)', border: '1px solid rgba(255, 69, 58, 0.4)' }}></span>
              <span style={{ color: 'var(--text-muted)' }}>Red Days: {redDaysCount}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(59, 130, 246, 0.35)', border: '1px solid rgba(59, 130, 246, 0.4)' }}></span>
              <span style={{ color: 'var(--text-muted)' }}>No-Trade Days: {noTradeDaysCount}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(245, 158, 11, 0.45)', border: '1px solid rgba(245, 158, 11, 0.7)' }}></span>
              <span style={{ color: 'var(--text-muted)' }}>Holidays: {holidaysCount}</span>
            </div>
          </div>
        </div>

        {/* Calendar Heatmap Grid wrapper */}
        <div style={{ overflowX: 'auto', paddingBottom: '4px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: '1020px' }}>
            {/* Column 1: Weekday Labels */}
            <div style={{ 
              display: 'grid', 
              gridTemplateRows: 'repeat(5, 16px)', 
              gap: '5px',
              marginRight: '14px',
              marginTop: '28px',
              userSelect: 'none'
            }}>
              <div style={{ gridRowStart: 1, fontSize: '0.65rem', color: 'var(--text-dim)', alignSelf: 'center', height: '16px', display: 'flex', alignItems: 'center' }}>Mon</div>
              <div style={{ gridRowStart: 2, fontSize: '0.65rem', color: 'var(--text-dim)', alignSelf: 'center', height: '16px', display: 'flex', alignItems: 'center' }}>Tue</div>
              <div style={{ gridRowStart: 3, fontSize: '0.65rem', color: 'var(--text-dim)', alignSelf: 'center', height: '16px', display: 'flex', alignItems: 'center' }}>Wed</div>
              <div style={{ gridRowStart: 4, fontSize: '0.65rem', color: 'var(--text-dim)', alignSelf: 'center', height: '16px', display: 'flex', alignItems: 'center' }}>Thu</div>
              <div style={{ gridRowStart: 5, fontSize: '0.65rem', color: 'var(--text-dim)', alignSelf: 'center', height: '16px', display: 'flex', alignItems: 'center' }}>Fri</div>
            </div>

            {/* Months Row Container with Gaps */}
            <div style={{ display: 'flex', gap: '30px' }}>
              {monthsData.map((m, mIdx) => (
                <div key={mIdx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Month name label */}
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: 'var(--text-dim)', 
                    textAlign: 'left', 
                    fontWeight: 700,
                    userSelect: 'none'
                  }}>
                    {m.name}
                  </div>

                  {/* Monthly grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateRows: 'repeat(5, 16px)',
                    gridAutoFlow: 'column',
                    gap: '5px'
                  }}>
                    {/* Padding cells */}
                    {Array.from({ length: m.startPad }).map((_, idx) => (
                      <div 
                        key={`pad-${idx}`} 
                        style={{ 
                          width: '16px', 
                          height: '16px', 
                          borderRadius: '3px', 
                          background: 'transparent' 
                        }} 
                      />
                    ))}

                    {/* Day cells */}
                    {m.dates.map((dateStr) => {
                      const stats = dailyStats[dateStr];
                      const isNoTrade = noTradeDays.includes(dateStr);
                      const holidayName = OFFLINE_NSE_HOLIDAYS[dateStr];
                      const isHoliday = !!holidayName;
                      let bgColor = 'rgba(120, 120, 120, 0.08)';
                      let border = '1px solid var(--border-color)';
                      let title = `${dateStr}: No trades logged`;
                      
                      if (stats && stats.count > 0) {
                        if (stats.pnl > 0) {
                          const opacity = Math.max(0.2, Math.min(1.0, stats.pnl / maxWin));
                          bgColor = `rgba(48, 209, 88, ${opacity})`;
                          border = '1px solid rgba(48, 209, 88, 0.4)';
                          title = `${dateStr}: ${stats.count} trades | Net PnL: +₹${stats.pnl.toLocaleString('en-IN')}`;
                        } else if (stats.pnl < 0) {
                          const opacity = Math.max(0.2, Math.min(1.0, Math.abs(stats.pnl) / maxLoss));
                          bgColor = `rgba(255, 69, 58, ${opacity})`;
                          border = '1px solid rgba(255, 69, 58, 0.4)';
                          title = `${dateStr}: ${stats.count} trades | Net PnL: -₹${Math.abs(stats.pnl).toLocaleString('en-IN')}`;
                        } else {
                          bgColor = 'rgba(120, 120, 120, 0.3)';
                          title = `${dateStr}: ${stats.count} trades | Net PnL: ₹0`;
                        }
                      } else if (isHoliday) {
                        bgColor = 'rgba(245, 158, 11, 0.32)';
                        border = '1px solid rgba(245, 158, 11, 0.65)';
                        title = `${dateStr}: Market Holiday (${holidayName})`;
                      } else if (isNoTrade) {
                        bgColor = 'rgba(59, 130, 246, 0.25)';
                        border = '1px solid rgba(59, 130, 246, 0.4)';
                        title = `${dateStr}: No-Trade Day (Disciplined)`;
                      }
                      
                      return (
                        <div 
                          key={dateStr}
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '3px',
                            background: bgColor,
                            border: border,
                            cursor: 'pointer',
                            transition: 'transform 0.1s ease'
                          }}
                          onClick={() => setSelectedHeatmapDate(dateStr)} className="heatmap-cell"
                          title={isPnlVisible ? title : title.replace(/Net PnL: [+-]₹\d+/, 'Net P&L: Hidden')}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Date Trades Detail Modal Overlay */}
      {selectedHeatmapDate && (() => {
        const dayTrades = trades.filter(t => (t.exitDate || t.date) === selectedHeatmapDate);
        const dayInvestments = investments.filter(i => i.date === selectedHeatmapDate);
        const totalNetPnLOnDay = dayTrades.reduce((sum, t) => sum + t.netPnL, 0);
        const totalTradesCount = dayTrades.length;
        const isNoTradeDay = noTradeDays.includes(selectedHeatmapDate);
        const holidayName = OFFLINE_NSE_HOLIDAYS[selectedHeatmapDate];
        
        return createPortal(
          <div 
            className="sidebar-backdrop" 
            onClick={() => setSelectedHeatmapDate(null)}
            style={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(4px)',
              zIndex: 3000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div 
              className="glass-card animate-tab-panel"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '90%',
                maxWidth: '650px',
                background: 'var(--bg-tooltip-opaque)',
                border: '1.5px solid var(--border-color-active)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: 'var(--shadow-glow)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-color)', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Trades Logged: {parseLocalDate(selectedHeatmapDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
                    Quick overview of trades executed on this calendar day
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedHeatmapDate(null)}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </div>

              {/* Day Metrics Ribbon */}
              {totalTradesCount > 0 && (
                <div style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Realized Net P&L</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: !isPnlVisible ? 'var(--text-dim)' : totalNetPnLOnDay >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                      {isPnlVisible ? (totalNetPnLOnDay >= 0 ? '+' : '') + '₹' + totalNetPnLOnDay.toLocaleString('en-IN') : '••••'}
                    </div>
                  </div>
                  <div style={{ width: '1px', background: 'var(--border-color)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Executed Trades</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                      {totalTradesCount} Trades
                    </div>
                  </div>
                </div>
              )}

              {/* Trades List */}
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1.5px solid var(--border-color)', borderRadius: '8px' }}>
                {totalTradesCount > 0 || dayInvestments.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1.5px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Time</th>
                        <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Symbol</th>
                        <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Action</th>
                        <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Qty</th>
                        <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Net P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayTrades.map((t, idx) => (
                        <tr key={t.id} style={{ borderBottom: idx === dayTrades.length - 1 && dayInvestments.length === 0 ? 'none' : '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', fontSize: '0.7rem' }}>{formatTimeToAMPM(t.entryTime)} - {formatTimeToAMPM(t.exitTime)}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                            {t.symbol}
                            {t.optionType && t.optionType !== 'None' && (
                              <span style={{ fontSize: '0.58rem', marginLeft: '4px', padding: '1px 3.5px', borderRadius: '3px', background: t.optionType === 'CE' ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.1)', color: t.optionType === 'CE' ? 'var(--color-win)' : 'var(--color-loss)', border: t.optionType === 'CE' ? '1px solid var(--color-win-border)' : '1px solid var(--color-loss-border)' }}>{t.optionType}</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 700, background: t.action === 'BUY' ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)', color: t.action === 'BUY' ? 'var(--color-win)' : 'var(--color-loss)' }}>{t.action}</span>
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{t.qty}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: !isPnlVisible ? 'var(--text-dim)' : t.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                            {isPnlVisible ? (t.netPnL >= 0 ? '+' : '') + '₹' + t.netPnL.toLocaleString('en-IN') : '••••'}
                          </td>
                        </tr>
                      ))}
                      {dayInvestments.map((inv, idx) => (
                        <tr key={inv.id} style={{ borderBottom: idx === dayInvestments.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>09:15</td>
                          <td style={{ padding: '8px 10px', fontWeight: 700 }}>{inv.symbol} <span style={{ fontSize: '0.58rem', padding: '1px 4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', borderRadius: '3px', border: '1px solid var(--border-color)' }}>INV</span></td>
                          <td style={{ padding: '8px 10px' }}><span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 700, background: 'rgba(48,209,88,0.12)', color: 'var(--color-win)' }}>BUY</span></td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{inv.qty}</td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-dim)' }}>Holding</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {holidayName ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '1.5rem' }}>🎉</span>
                        <strong style={{ color: '#f59e0b', fontSize: '0.9rem' }}>Market Holiday: {holidayName}</strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>NSE/BSE markets were closed on this calendar day.</span>
                      </div>
                    ) : isNoTradeDay ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                        <strong>Disciplined No-Trade Day</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>You explicitly marked this day to avoid trading!</span>
                      </div>
                    ) : (
                      "No trades logged on this calendar day"
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer / Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button 
                  onClick={() => setSelectedHeatmapDate(null)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                >
                  Close
                </button>
                {totalTradesCount > 0 && onSelectDateFilter && (
                  <button 
                    onClick={() => {
                      onSelectDateFilter(selectedHeatmapDate);
                      setSelectedHeatmapDate(null);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>View in Logs Tab</span>
                    <span>→</span>
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        );
      })()}
    </>
  );
};
