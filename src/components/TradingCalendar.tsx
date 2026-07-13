import { useState, useEffect } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { ChevronLeft, ChevronRight, Info, Eye, EyeOff, Edit2 } from 'lucide-react';
import { BrokerBadge } from './BrokerBadge';
import { filterTradesByFY, getCurrentLiveFY, formatTimeToAMPM } from '../utils/fyHelper';

export const OFFLINE_NSE_HOLIDAYS: Record<string, string> = {
  // 2025
  '2025-02-26': 'Mahashivratri',
  '2025-03-14': 'Holi',
  '2025-03-31': 'Eid-ul-Fitr',
  '2025-04-10': 'Mahavir Jayanti',
  '2025-04-11': 'Good Friday',
  '2025-04-14': 'Ambedkar Jayanti',
  '2025-05-01': 'Maharashtra Day',
  '2025-06-06': 'Bakri Id',
  '2025-08-15': 'Independence Day',
  '2025-10-02': 'Gandhi Jayanti',
  '2025-11-05': 'Guru Nanak Jayanti',
  '2025-12-25': 'Christmas',

  // 2026
  '2026-01-26': 'Republic Day',
  '2026-03-03': 'Holi',
  '2026-03-26': 'Shri Ram Navami',
  '2026-03-31': 'Shri Mahavir Jayanti',
  '2026-04-03': 'Good Friday',
  '2026-04-14': 'Dr. Ambedkar Jayanti',
  '2026-05-01': 'Maharashtra Day',
  '2026-05-28': 'Bakri Id',
  '2026-06-26': 'Muharram',
  '2026-09-14': 'Ganesh Chaturthi',
  '2026-10-02': 'Mahatma Gandhi Jayanti',
  '2026-10-20': 'Dussehra',
  '2026-11-10': 'Diwali-Balipratipada',
  '2026-11-24': 'Guru Nanak Dev Jayanti',
  '2026-12-25': 'Christmas',

  // 2027
  '2027-01-26': 'Republic Day',
  '2027-03-08': 'Mahashivratri',
  '2027-03-22': 'Holi',
  '2027-03-26': 'Good Friday',
  '2027-04-14': 'Dr. Ambedkar Jayanti',
  '2027-05-01': 'Maharashtra Day',
  '2027-08-15': 'Independence Day',
  '2027-10-02': 'Mahatma Gandhi Jayanti',
  '2027-11-08': 'Guru Nanak Dev Jayanti',
  '2027-12-25': 'Christmas',

  // 2028
  '2028-01-26': 'Republic Day',
  '2028-03-06': 'Mahashivratri',
  '2028-03-10': 'Holi',
  '2028-04-07': 'Good Friday',
  '2028-04-14': 'Dr. Ambedkar Jayanti',
  '2028-05-01': 'Maharashtra Day',
  '2028-08-15': 'Independence Day',
  '2028-10-02': 'Mahatma Gandhi Jayanti',
  '2028-11-23': 'Guru Nanak Dev Jayanti',
  '2028-12-25': 'Christmas'
};

const formatCompactPnLMobile = (val: number) => {
  const absVal = Math.abs(val);
  if (absVal >= 100000) {
    return `${val > 0 ? '+' : '-'}${(absVal / 100000).toFixed(1)}L`;
  }
  if (absVal >= 1000) {
    return `${val > 0 ? '+' : '-'}${(absVal / 1000).toFixed(1)}k`;
  }
  return `${val > 0 ? '+' : '-'}${Math.round(absVal)}`;
};

export function TradingCalendar({ 
  activeAccountId = 'Combined',
  onEditTrade
}: { 
  activeAccountId?: string;
  onEditTrade?: (id: string) => void;
}) {
  const { 
    trades: allTrades, 
    isPnlVisible, 
    togglePnlVisibility, 
    selectedFY,
    brokerAccounts,
    investments: allInvestments
  } = useTradeStore();


  const fyTrades = filterTradesByFY(allTrades, selectedFY);
  const trades = activeAccountId === 'Combined'
    ? fyTrades
    : fyTrades.filter(t => t.brokerAccountId === activeAccountId);

  const investments = activeAccountId === 'Combined'
    ? allInvestments
    : allInvestments.filter(i => {
        if (i.brokerAccountId === activeAccountId) return true;
        const activeAcc = brokerAccounts.find(a => a.id === activeAccountId);
        return activeAcc ? i.broker === activeAcc.broker : false;
      });

  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 1)); // Initialize at June 2026
  const [activePnlTab, setActivePnlTab] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedWeekNum, setSelectedWeekNum] = useState<number | null>(null);
  const [selectedMonthNum, setSelectedMonthNum] = useState<number | null>(null);
  const [onlineHolidays, setOnlineHolidays] = useState<Record<string, string>>({});
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Synchronize currentDate with selectedFY boundaries
  useEffect(() => {
    if (selectedFY && selectedFY !== 'All') {
      const liveFY = getCurrentLiveFY();
      if (selectedFY === liveFY) {
        setCurrentDate(new Date());
      } else {
        const match = selectedFY.match(/FY (\d{4})/);
        if (match) {
          const startYear = parseInt(match[1], 10);
          setCurrentDate(new Date(startYear, 3, 1)); // April 1st of that historical FY
        }
      }
    }
  }, [selectedFY]);

  // Reset selections on tab change
  useEffect(() => {
    setSelectedDate(null);
    setSelectedWeekNum(null);
    setSelectedMonthNum(null);
  }, [activePnlTab]);

  // Reset row selection when a new date is selected
  useEffect(() => {
    setSelectedRowId(null);
  }, [selectedDate]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Dynamic live Indian Public Holidays sync when online
  useEffect(() => {
    const cached = localStorage.getItem(`traders_diary_cached_holidays_${year}`);
    if (cached) {
      try {
        setOnlineHolidays((prev) => ({ ...prev, ...JSON.parse(cached) }));
      } catch (e) {
        console.error("Failed to parse cached holidays", e);
      }
    }

    if (navigator.onLine) {
      fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`)
        .then((res) => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data)) {
            const fetched: Record<string, string> = {};
            data.forEach((item: any) => {
              fetched[item.date] = item.localName || item.name;
            });
            setOnlineHolidays((prev) => ({ ...prev, ...fetched }));
            localStorage.setItem(`traders_diary_cached_holidays_${year}`, JSON.stringify(fetched));
            console.log("Successfully auto-synced Indian holidays online for year", year);
          }
        })
        .catch((err) => console.log("Holidays sync offline/failed:", err.message));
    }
  }, [year]);

  // Helper arrays
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Get first day of the month (0 = Sunday, ..., 6 = Saturday)
  // Adjust to Mon-Sun (0 = Monday, ..., 6 = Sunday)
  const getFirstDayOfMonth = () => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Adjust Sunday from 0 to 6
  };

  // Get number of days in the current month
  const getDaysInMonth = () => {
    return new Date(year, month + 1, 0).getDate();
  };

  const daysInMonth = getDaysInMonth();
  const firstDayIndex = getFirstDayOfMonth();

  // Calculate daily data
  const getDayTradesSummary = (dayNum: number) => {
    const formattedDay = dayNum.toString().padStart(2, '0');
    const formattedMonth = (month + 1).toString().padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

    const dailyTrades = trades.filter((t) => t.date === dateStr);
    const dailyInvPurchases = investments.filter((i) => i.date === dateStr);
    const dailyInvExits = investments.filter((i) => i.status === 'EXITED' && i.exitDate === dateStr);

    if (dailyTrades.length === 0 && dailyInvPurchases.length === 0 && dailyInvExits.length === 0) return null;

    const netPnL = dailyTrades.reduce((acc, t) => acc + t.netPnL, 0);
    const grossPnL = dailyTrades.reduce((acc, t) => acc + t.grossPnL, 0);
    
    // Group P&L and trade count by broker
    const brokerSummaries: Record<string, { netPnL: number; count: number }> = {};
    dailyTrades.forEach((t) => {
      const b = t.broker || 'Other';
      if (!brokerSummaries[b]) {
        brokerSummaries[b] = { netPnL: 0, count: 0 };
      }
      brokerSummaries[b].netPnL += t.netPnL;
      brokerSummaries[b].count += 1;
    });

    dailyInvPurchases.forEach((i) => {
      const b = i.broker || 'Other';
      if (!brokerSummaries[b]) {
        brokerSummaries[b] = { netPnL: 0, count: 0 };
      }
      brokerSummaries[b].count += 1;
    });
    dailyInvExits.forEach((i) => {
      const b = i.broker || 'Other';
      if (!brokerSummaries[b]) {
        brokerSummaries[b] = { netPnL: 0, count: 0 };
      }
      brokerSummaries[b].count += 1;
    });
    
    // Find dominant emotion
    const emotionsCount: Record<string, number> = {};
    dailyTrades.forEach((t) => {
      emotionsCount[t.emotion] = (emotionsCount[t.emotion] || 0) + 1;
    });
    const dominantEmotion = Object.entries(emotionsCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    // Find main mistake
    const mistakesCount: Record<string, number> = {};
    dailyTrades.forEach((t) => {
      if (t.mistake !== 'None') {
        mistakesCount[t.mistake] = (mistakesCount[t.mistake] || 0) + 1;
      }
    });
    const mainMistake = Object.entries(mistakesCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    const invested = dailyInvPurchases.reduce((sum, i) => sum + (i.qty * i.buyPrice), 0);
    const exited = dailyInvExits.reduce((sum, i) => sum + (i.qty * i.exitPrice!), 0);

    const deployedCapital = dailyTrades.reduce((sum, t) => sum + (t.entryPrice * t.qty), 0);

    return {
      netPnL: Math.round(netPnL * 100) / 100,
      grossPnL: Math.round(grossPnL * 100) / 100,
      count: dailyTrades.length,
      dominantEmotion,
      mainMistake,
      brokerSummaries,
      invested,
      exited,
      totalInvestmentsCount: dailyInvPurchases.length + dailyInvExits.length,
      deployedCapital
    };
  };

  const formatCurrency = (val: number) => {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });
    return formatter.format(val);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Generate calendar grid array
  const calendarCells = [];
  
  // Fill empty days for starting week offset
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
  }

  // Fill actual month days
  for (let d = 1; d <= daysInMonth; d++) {
    const summary = getDayTradesSummary(d);
    
    const formattedDay = d.toString().padStart(2, '0');
    const formattedMonth = (month + 1).toString().padStart(2, '0');
    const cellDateStr = `${year}-${formattedMonth}-${formattedDay}`;
    const isSelected = selectedDate === cellDateStr;
    
    // Check if weekend
    const cellDate = new Date(year, month, d);
    const dayOfWeek = cellDate.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Check if holiday
    const holidayName = onlineHolidays[cellDateStr] || OFFLINE_NSE_HOLIDAYS[cellDateStr];
    
    let cellClass = 'calendar-day';
    
    if (isWeekend) {
      cellClass += ' day-weekend';
    }
    
    if (holidayName) {
      cellClass += ' day-holiday';
    }
    
    if (summary) {
      cellClass += ' has-trades';
      if (summary.count > 0) {
        if (summary.netPnL > 0) {
          cellClass += ' day-win';
        } else if (summary.netPnL < 0) {
          cellClass += ' day-loss';
        } else {
          cellClass += ' day-breakeven';
        }
      } else {
        cellClass += ' day-breakeven';
      }
    }

    if (isSelected) {
      cellClass += ' selected';
    }

    calendarCells.push(
      <div 
        key={`day-${d}`} 
        className={cellClass} 
        onClick={() => setSelectedDate(cellDateStr)}
        title={holidayName ? `Holiday: ${holidayName}` : undefined}
      >
        <span className="day-number">{d}</span>
        
        {holidayName && (
          <div className="day-holiday-label" title={holidayName}>
            🎉 {holidayName}
          </div>
        )}

        {summary && summary.count > 0 && (() => {
          const dayRoi = summary.deployedCapital > 0 ? (summary.netPnL / summary.deployedCapital) * 100 : 0;
          return (
            <div className="day-pnl">
              <>
                <span className="pnl-desktop">
                  {isPnlVisible ? (summary.netPnL > 0 ? '+' : '') : ''}
                  {isPnlVisible ? Math.round(summary.netPnL).toLocaleString('en-IN') : '••••'}
                  <span style={{ fontSize: '0.62rem', opacity: 0.85, marginLeft: '2.5px' }}>
                    ({summary.netPnL >= 0 ? '+' : ''}{dayRoi.toFixed(1)}%)
                  </span>
                </span>
                <span className="pnl-mobile">
                  {isPnlVisible ? formatCompactPnLMobile(summary.netPnL) : (
                    <>
                      ••••
                      <span style={{ fontSize: '0.58rem', opacity: 0.85, marginLeft: '2px' }}>
                        ({summary.netPnL >= 0 ? '+' : ''}{dayRoi.toFixed(1)}%)
                      </span>
                    </>
                  )}
                </span>
              </>
            </div>
          );
        })()}

        {summary && summary.invested > 0 && (
          <div style={{ fontSize: '0.62rem', color: 'var(--primary)', marginTop: '2px', fontWeight: 600 }}>
            💼 -{(() => {
              const val = summary.invested;
              if (val >= 100000) {
                return `${(val / 100000).toFixed(2).replace(/\.00$/, '')}L`;
              }
              return Math.round(val).toLocaleString('en-IN');
            })()}
          </div>
        )}
        {summary && summary.exited > 0 && (
          <div style={{ fontSize: '0.62rem', color: 'var(--color-win)', marginTop: '2px', fontWeight: 600 }}>
            💼 +{(() => {
              const val = summary.exited;
              if (val >= 100000) {
                return `${(val / 100000).toFixed(2).replace(/\.00$/, '')}L`;
              }
              return Math.round(val).toLocaleString('en-IN');
            })()}
          </div>
        )}

        {/* Custom tooltip rendered inside the card via absolute positioning */}
        {(summary || holidayName) && (
          <div className="calendar-tooltip glass-card">
            <h4 style={{ fontSize: '0.8rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '6px' }}>
              Summary of {d} {months[month]} {year}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
              {holidayName && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-neutral)', fontWeight: 650 }}>
                  <span>Holiday:</span>
                  <span style={{ textAlign: 'right', maxWidth: '140px' }}>{holidayName}</span>
                </div>
              )}
              {summary ? (
                <>
                  {summary.count > 0 && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: holidayName ? '4px' : '0' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Net P&L:</span>
                        <strong style={{ color: summary.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                          {isPnlVisible ? formatCurrency(summary.netPnL) : '••••••'}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Trades Executed:</span>
                        <span>{summary.count}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Emotion:</span>
                        <span>{summary.dominantEmotion}</span>
                      </div>
                      {summary.mainMistake !== 'None' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f87171' }}>
                          <span>Main Mistake:</span>
                          <span>{summary.mainMistake}</span>
                        </div>
                      )}
                    </>
                  )}
                  {summary.invested > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: holidayName || summary.count > 0 ? '4px' : '0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Invested (Buy):</span>
                      <strong style={{ color: 'var(--primary)' }}>
                        -{formatCurrency(summary.invested)}
                      </strong>
                    </div>
                  )}
                  {summary.exited > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: holidayName || summary.count > 0 || summary.invested > 0 ? '4px' : '0' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Invested Exited (Sell):</span>
                      <strong style={{ color: 'var(--color-win)' }}>
                        +{formatCurrency(summary.exited)}
                      </strong>
                    </div>
                  )}
                  {summary.totalInvestmentsCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Investment Logs:</span>
                      <span>{summary.totalInvestmentsCount}</span>
                    </div>
                  )}
                  {summary.brokerSummaries && Object.keys(summary.brokerSummaries).length > 1 && (
                     <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed var(--border-color)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                       <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>Broker-wise P&L / Activity:</span>
                       {Object.entries(summary.brokerSummaries).map(([brokerName, bSum]: any) => (
                         <div key={brokerName} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                           <span style={{ color: 'var(--text-muted)' }}>{brokerName}:</span>
                           <span style={{ color: bSum.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontWeight: 550 }}>
                             {isPnlVisible ? `${bSum.netPnL >= 0 ? '+' : ''}${formatCurrency(bSum.netPnL)}` : '••••'} ({bSum.count} entries)
                           </span>
                         </div>
                       ))}
                     </div>
                  )}
                </>
              ) : (
                !holidayName && <div style={{ color: 'var(--text-muted)' }}>No activity</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Calculate P&L values for week, month, and year
  const getActiveMonthPnL = () => {
    const formattedMonth = (month + 1).toString().padStart(2, '0');
    const monthPrefix = `${year}-${formattedMonth}-`;
    const monthlyTrades = trades.filter((t) => t.date.startsWith(monthPrefix));
    return monthlyTrades.reduce((acc, t) => acc + t.netPnL, 0);
  };

  const getActiveYearPnL = () => {
    const yearPrefix = `${year}-`;
    const yearlyTrades = trades.filter((t) => t.date.startsWith(yearPrefix));
    return yearlyTrades.reduce((acc, t) => acc + t.netPnL, 0);
  };

  const getCurrentWeekPnL = () => {
    const today = new Date();
    const day = today.getDay(); // 0 = Sunday, 1 = Monday, ...
    const diffToMon = today.getDate() - day + (day === 0 ? -6 : 1);
    
    const monday = new Date(today);
    monday.setDate(diffToMon);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const monStr = formatD(monday);
    const sunStr = formatD(sunday);

    const weeklyTrades = trades.filter((t) => t.date >= monStr && t.date <= sunStr);

    return weeklyTrades.reduce((acc, t) => acc + t.netPnL, 0);
  };

  const activeMonthPnL = getActiveMonthPnL();
  const activeYearPnL = getActiveYearPnL();
  const currentWeekPnL = getCurrentWeekPnL();

  // Get active financial year start and end dates based on currentDate (month and year)
  const getFYRange = () => {
    let fyStartYear = year;
    if (month < 3) { // Jan, Feb, Mar belong to previous calendar year's FY
      fyStartYear = year - 1;
    }
    const startStr = `${fyStartYear}-04-01`;
    const endStr = `${fyStartYear + 1}-03-31`;
    return { startStr, endStr, fyStartYear };
  };
  const { startStr: fyStartStr, endStr: fyEndStr, fyStartYear } = getFYRange();

  const getFYPnL = () => {
    const fyTrades = trades.filter((t) => t.date >= fyStartStr && t.date <= fyEndStr);
    return fyTrades.reduce((acc, t) => acc + t.netPnL, 0);
  };
  const activeFYPnL = getFYPnL();

  const getActiveMonthDeployed = () => {
    const formattedMonth = (month + 1).toString().padStart(2, '0');
    const monthPrefix = `${year}-${formattedMonth}-`;
    const monthlyTrades = trades.filter((t) => t.date.startsWith(monthPrefix));
    return monthlyTrades.reduce((acc, t) => acc + (t.entryPrice * t.qty), 0);
  };

  const getFYDeployed = () => {
    const fyTrades = trades.filter((t) => t.date >= fyStartStr && t.date <= fyEndStr);
    return fyTrades.reduce((acc, t) => acc + (t.entryPrice * t.qty), 0);
  };

  const activeMonthDeployed = getActiveMonthDeployed();
  const activeFYDeployed = getFYDeployed();

  const headerPnL = activePnlTab === 'monthly' ? activeMonthPnL : activeFYPnL;
  const headerDeployed = activePnlTab === 'monthly' ? activeMonthDeployed : activeFYDeployed;
  const headerRoi = headerDeployed > 0 ? (headerPnL / headerDeployed) * 100 : 0;
  const headerTitle = activePnlTab === 'monthly' 
    ? `${months[month]} ${year}` 
    : `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;
  const headerBadgeTitle = activePnlTab === 'monthly'
    ? `P&L for ${months[month]} ${year}`
    : `P&L for FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;

  const prevDisabled = selectedFY !== 'All' && (
    activePnlTab !== 'monthly' || 
    (() => {
      const match = selectedFY.match(/FY (\d{4})/);
      if (!match) return false;
      const startYear = parseInt(match[1], 10);
      return year === startYear && month === 3; // April of start year
    })()
  );

  const nextDisabled = selectedFY !== 'All' && (
    activePnlTab !== 'monthly' || 
    (() => {
      const match = selectedFY.match(/FY (\d{4})/);
      if (!match) return false;
      const startYear = parseInt(match[1], 10);
      return year === (startYear + 1) && month === 2; // March of next year
    })()
  );

  const handlePrev = () => {
    if (prevDisabled) return;
    if (activePnlTab === 'monthly') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      setCurrentDate(new Date(year - 1, month, 1));
    }
  };

  const handleNext = () => {
    if (nextDisabled) return;
    if (activePnlTab === 'monthly') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      setCurrentDate(new Date(year + 1, month, 1));
    }
  };

  const handleClearSelection = () => {
    setSelectedDate(null);
    setSelectedWeekNum(null);
    setSelectedMonthNum(null);
  };

  // Calculate calendar-aligned weeks of the financial year (Monday to Sunday)
  const getFYWeeks = () => {
    const weeksList = [];
    let currentPtr = new Date(fyStartYear, 3, 1); // April 1st
    const endPtr = new Date(fyStartYear + 1, 2, 31); // March 31st of next year
    
    let weekNum = 1;
    
    while (currentPtr <= endPtr) {
      const wStart = new Date(currentPtr);
      const wEnd = new Date(currentPtr);
      
      // Find the next Sunday from wStart
      // getDay(): 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
      const dayOfWeek = currentPtr.getDay();
      // If today is Sunday (0), days to Sunday is 0. Otherwise, it is 7 - dayOfWeek.
      const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      
      wEnd.setDate(currentPtr.getDate() + daysToSunday);
      
      // Cap at March 31st if the week extends beyond the FY boundary
      if (wEnd > endPtr) {
        wEnd.setTime(endPtr.getTime());
      }
      wEnd.setHours(23, 59, 59, 999);
      
      // Calculate P&L for this week
      const wStartStr = wStart.toISOString().split('T')[0];
      const wEndStr = wEnd.toISOString().split('T')[0];
      
      const weeklyTrades = trades.filter((t) => {
        return t.date >= wStartStr && t.date <= wEndStr;
      });
      
      const netPnL = weeklyTrades.reduce((acc, t) => acc + t.netPnL, 0);
      const wBrokerage = weeklyTrades.reduce((acc, t) => acc + t.brokerage, 0);
      const wTaxes = weeklyTrades.reduce((acc, t) => acc + t.taxes, 0);
      
      // Format Range as in the screenshot: "April 01 - 05", "April 06 - 12", "April 27 - May 03"
      const startMonth = wStart.toLocaleDateString('en-IN', { month: 'long' });
      const endMonth = wEnd.toLocaleDateString('en-IN', { month: 'long' });
      const startDay = wStart.toLocaleDateString('en-IN', { day: '2-digit' });
      const endDay = wEnd.toLocaleDateString('en-IN', { day: '2-digit' });
      
      let formattedRange = '';
      if (startMonth === endMonth) {
        formattedRange = `${startMonth} ${startDay} - ${endDay}`;
      } else {
        const shortEndMonth = wEnd.toLocaleDateString('en-IN', { month: 'short' });
        formattedRange = `${startMonth} ${startDay} - ${shortEndMonth} ${endDay}`;
      }
      
      weeksList.push({
        weekNum: weekNum,
        startDate: wStartStr,
        endDate: wEndStr,
        formattedRange,
        trades: weeklyTrades,
        netPnL: Math.round(netPnL * 100) / 100,
        brokerage: Math.round(wBrokerage * 100) / 100,
        taxes: Math.round(wTaxes * 100) / 100,
        deployedCapital: weeklyTrades.reduce((acc, t) => acc + (t.entryPrice * t.qty), 0)
      });
      
      // Advance current pointer to the next Monday (wEnd Sunday + 1 day)
      currentPtr = new Date(wEnd);
      currentPtr.setDate(currentPtr.getDate() + 1);
      currentPtr.setHours(0, 0, 0, 0);
      weekNum++;
    }
    
    return weeksList;
  };
  const fyWeeks = getFYWeeks();

  // Calculate 12 months of the financial year
  const getFYMonths = () => {
    const monthsList = [];
    for (let m = 0; m < 12; m++) {
      const mMonthIndex = (3 + m) % 12;
      const mYear = mMonthIndex < 3 ? fyStartYear + 1 : fyStartYear;
      
      const monthlyTrades = trades.filter((t) => {
        const mStartStr = `${mYear}-${String(mMonthIndex + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(mYear, mMonthIndex + 1, 0).getDate();
        const mEndStr = `${mYear}-${String(mMonthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        return t.date >= mStartStr && t.date <= mEndStr;
      });
      
      const netPnL = monthlyTrades.reduce((acc, t) => acc + t.netPnL, 0);
      const mBrokerage = monthlyTrades.reduce((acc, t) => acc + t.brokerage, 0);
      const mTaxes = monthlyTrades.reduce((acc, t) => acc + t.taxes, 0);
      
      monthsList.push({
        monthNum: m + 1,
        monthIndex: mMonthIndex,
        year: mYear,
        name: months[mMonthIndex],
        trades: monthlyTrades,
        netPnL: Math.round(netPnL * 100) / 100,
        brokerage: Math.round(mBrokerage * 100) / 100,
        taxes: Math.round(mTaxes * 100) / 100,
        deployedCapital: monthlyTrades.reduce((acc, t) => acc + (t.entryPrice * t.qty), 0)
      });
    }
    return monthsList;
  };
  const fyMonthsList = getFYMonths();

  // Weekly Streaks calculation
  const getWeeklyStreaks = () => {
    let maxStreak = 0;
    let current = 0;
    let runningCurrent = 0;
    
    const activeWeeks = fyWeeks.filter(w => w.trades.length > 0);
    
    activeWeeks.forEach((w) => {
      if (w.netPnL > 0) {
        current++;
        if (current > maxStreak) {
          maxStreak = current;
        }
      } else if (w.netPnL < 0) {
        current = 0;
      }
    });
    
    if (activeWeeks.length > 0) {
      let idx = activeWeeks.length - 1;
      while (idx >= 0 && activeWeeks[idx].netPnL > 0) {
        runningCurrent++;
        idx--;
      }
    }
    return { maxStreak, currentStreak: runningCurrent };
  };

  // Monthly Streaks calculation
  const getMonthlyStreaks = () => {
    let maxStreak = 0;
    let current = 0;
    let runningCurrent = 0;
    
    const activeMonths = fyMonthsList.filter(m => m.trades.length > 0);
    
    activeMonths.forEach((m) => {
      if (m.netPnL > 0) {
        current++;
        if (current > maxStreak) {
          maxStreak = current;
        }
      } else if (m.netPnL < 0) {
        current = 0;
      }
    });
    
    if (activeMonths.length > 0) {
      let idx = activeMonths.length - 1;
      while (idx >= 0 && activeMonths[idx].netPnL > 0) {
        runningCurrent++;
        idx--;
      }
    }
    return { maxStreak, currentStreak: runningCurrent };
  };

  // Calculate navigated month stats for the square indicators (for monthly tab)
  const getMonthStats = () => {
    let totalDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dayOfWeek = dateObj.getDay();
      const formattedDay = d.toString().padStart(2, '0');
      const formattedMonth = (month + 1).toString().padStart(2, '0');
      const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
      
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      const isHoliday = !!(onlineHolidays[dateStr] || OFFLINE_NSE_HOLIDAYS[dateStr]);
      
      if (!isWeekend && !isHoliday) {
        totalDays++;
      }
    }
    
    let tradedOnDays = 0;
    let profitDays = 0;
    const dailyPnLs: { day: number; netPnL: number }[] = [];
    
    for (let d = 1; d <= daysInMonth; d++) {
      const summary = getDayTradesSummary(d);
      if (summary) {
        tradedOnDays++;
        if (summary.netPnL > 0) {
          profitDays++;
        }
        dailyPnLs.push({ day: d, netPnL: summary.netPnL });
      }
    }
    
    let maxWinStreak = 0;
    let currentWinStreak = 0;
    let runningCurrentStreak = 0;
    
    dailyPnLs.forEach((p) => {
      if (p.netPnL > 0) {
        currentWinStreak++;
        if (currentWinStreak > maxWinStreak) {
          maxWinStreak = currentWinStreak;
        }
      } else if (p.netPnL < 0) {
        currentWinStreak = 0;
      }
    });
    
    if (dailyPnLs.length > 0) {
      let idx = dailyPnLs.length - 1;
      while (idx >= 0 && dailyPnLs[idx].netPnL > 0) {
        runningCurrentStreak++;
        idx--;
      }
    }
    
    return {
      totalDays,
      tradedOnDays,
      profitDays,
      maxWinStreak,
      currentStreak: runningCurrentStreak
    };
  };

  const monthStats = getMonthStats();

  // Dynamic statistics selector based on range selection
  const getStatsForActiveTab = () => {
    if (activePnlTab === 'weekly') {
      const activeWeeks = fyWeeks.filter(w => w.trades.length > 0);
      const weeklyStreaks = getWeeklyStreaks();
      return {
        total: fyWeeks.length,
        traded: activeWeeks.length,
        profit: fyWeeks.filter(w => w.netPnL > 0).length,
        maxStreak: weeklyStreaks.maxStreak,
        currentStreak: weeklyStreaks.currentStreak,
        labels: {
          total: 'Trading Weeks',
          traded: 'Traded On',
          profit: 'In-Profit Weeks',
          maxStreak: 'Winning Streak',
          currentStreak: 'Current Streak'
        }
      };
    } else if (activePnlTab === 'yearly') {
      const activeMonths = fyMonthsList.filter(m => m.trades.length > 0);
      const monthlyStreaks = getMonthlyStreaks();
      return {
        total: 12,
        traded: activeMonths.length,
        profit: fyMonthsList.filter(m => m.netPnL > 0).length,
        maxStreak: monthlyStreaks.maxStreak,
        currentStreak: monthlyStreaks.currentStreak,
        labels: {
          total: 'Trading Months',
          traded: 'Traded On',
          profit: 'In-Profit Months',
          maxStreak: 'Winning Streak',
          currentStreak: 'Current Streak'
        }
      };
    } else {
      return {
        total: monthStats.totalDays,
        traded: monthStats.tradedOnDays,
        profit: monthStats.profitDays,
        maxStreak: monthStats.maxWinStreak,
        currentStreak: monthStats.currentStreak,
        labels: {
          total: 'Trading Days',
          traded: 'Traded On',
          profit: 'In-Profit Days',
          maxStreak: 'Winning Streak',
          currentStreak: 'Current Streak'
        }
      };
    }
  };
  const activeStats = getStatsForActiveTab();

  // Selections & trade logs setup for selected week, month, or day
  const getSelectedTrades = () => {
    let dayTradesList: any[] = [];
    if (activePnlTab === 'weekly' && selectedWeekNum !== null) {
      const w = fyWeeks.find(week => week.weekNum === selectedWeekNum);
      dayTradesList = w ? w.trades : [];
    } else if (activePnlTab === 'yearly' && selectedMonthNum !== null) {
      const m = fyMonthsList.find(mon => mon.monthNum === selectedMonthNum);
      dayTradesList = m ? m.trades : [];
    } else {
      dayTradesList = selectedDate ? trades.filter((t) => t.date === selectedDate) : [];
    }

    if (selectedDate) {
      const dailyInvPurchases = investments.filter(i => i.date === selectedDate);
      const dailyInvExits = investments.filter(i => i.status === 'EXITED' && i.exitDate === selectedDate);
      
      const purchaseItems = dailyInvPurchases.map(i => ({
        id: `${i.id}-buy`,
        entryTime: '09:15',
        symbol: i.symbol,
        broker: i.broker || 'System',
        action: 'BUY',
        qty: i.qty,
        entryPrice: i.buyPrice,
        exitPrice: 0,
        grossPnL: 0,
        brokerage: 0,
        taxes: 0,
        netPnL: 0,
        emotion: 'None',
        mistake: 'None',
        notes: i.notes || '',
        isInvestment: true,
        typeLabel: i.type
      }));

      const exitItems = dailyInvExits.map(i => ({
        id: `${i.id}-sell`,
        entryTime: '15:30',
        symbol: i.symbol,
        broker: i.broker || 'System',
        action: 'SELL',
        qty: i.qty,
        entryPrice: i.buyPrice,
        exitPrice: i.exitPrice!,
        grossPnL: i.qty * (i.exitPrice! - i.buyPrice),
        brokerage: 0,
        taxes: 0,
        netPnL: i.qty * (i.exitPrice! - i.buyPrice),
        emotion: 'None',
        mistake: 'None',
        notes: `Exit from investment (Purchase Buy Avg: ₹${i.buyPrice})`,
        isInvestment: true,
        typeLabel: i.type
      }));

      return [...dayTradesList, ...purchaseItems, ...exitItems];
    }

    return dayTradesList;
  };
  const dayTrades = getSelectedTrades();

  const getDetailsTitle = () => {
    if (activePnlTab === 'weekly' && selectedWeekNum !== null) {
      const w = fyWeeks.find(week => week.weekNum === selectedWeekNum);
      return w ? `Logs for Week ${w.weekNum} (${w.formattedRange})` : '';
    }
    if (activePnlTab === 'yearly' && selectedMonthNum !== null) {
      const m = fyMonthsList.find(mon => mon.monthNum === selectedMonthNum);
      return m ? `Logs for ${m.name} ${m.year}` : '';
    }
    return selectedDate ? `Logs for ${formatDate(selectedDate)}` : '';
  };
  const detailsTitle = getDetailsTitle();

  const getDetailsSubTitle = () => {
    const len = dayTrades.length;
    if (len === 0) return 'No trading activity recorded';
    return `Detailed logs for ${len} trade${len > 1 ? 's' : ''} executed in this period`;
  };
  const detailsSubTitle = getDetailsSubTitle();

  const hasSelection = (activePnlTab === 'weekly' && selectedWeekNum !== null) ||
                       (activePnlTab === 'yearly' && selectedMonthNum !== null) ||
                       (activePnlTab === 'monthly' && selectedDate !== null);

  // Weekly Grid Cells layout
  const weeklyCells = fyWeeks.map((w) => {
    const isSelected = selectedWeekNum === w.weekNum;
    const hasTrades = w.trades.length > 0;
    const weekRoi = w.deployedCapital > 0 ? (w.netPnL / w.deployedCapital) * 100 : 0;
    
    let cellClass = 'calendar-day weekly-day';
    if (hasTrades) {
      cellClass += ' has-trades';
      if (w.netPnL > 0) {
        cellClass += ' day-win';
      } else if (w.netPnL < 0) {
        cellClass += ' day-loss';
      } else {
        cellClass += ' day-breakeven';
      }
    }
    if (isSelected) {
      cellClass += ' selected';
    }

    return (
      <div 
        key={`week-${w.weekNum}`} 
        className={cellClass} 
        onClick={() => setSelectedWeekNum(w.weekNum === selectedWeekNum ? null : w.weekNum)}
        style={{ minHeight: '85px' }}
      >
        <span className="day-number" style={{ fontSize: '0.8rem' }}>W{w.weekNum}</span>
        
        <div 
          style={{ 
            fontSize: '0.65rem', 
            color: 'var(--text-muted)', 
            alignSelf: 'flex-start',
            marginTop: '18px',
            fontWeight: 550
          }}
        >
          {w.formattedRange}
        </div>

        <div className="day-pnl">
          {hasTrades ? (
            <>
              <>
                <span className="pnl-desktop">
                  {isPnlVisible ? (w.netPnL > 0 ? '+' : '') : ''}
                  {isPnlVisible ? Math.round(w.netPnL).toLocaleString('en-IN') : '••••'}
                  <span style={{ fontSize: '0.65rem', opacity: 0.85, marginLeft: '2px' }}>
                    ({w.netPnL >= 0 ? '+' : ''}{weekRoi.toFixed(1)}%)
                  </span>
                </span>
                <span className="pnl-mobile">
                  {isPnlVisible ? formatCompactPnLMobile(w.netPnL) : (
                    <>
                      ••••
                      <span style={{ fontSize: '0.58rem', opacity: 0.85, marginLeft: '2px' }}>
                        ({w.netPnL >= 0 ? '+' : ''}{weekRoi.toFixed(1)}%)
                      </span>
                    </>
                  )}
                </span>
              </>
            </>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>-</span>
          )}
        </div>

        {/* Tooltip for week */}
        <div className="calendar-tooltip glass-card">
          <h4 style={{ fontSize: '0.8rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '6px' }}>
            Summary of Week {w.weekNum}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Range:</span>
              <span style={{ fontWeight: 600 }}>{w.formattedRange}</span>
            </div>
            {hasTrades ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Net P&L:</span>
                  <strong style={{ color: w.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {isPnlVisible ? formatCurrency(w.netPnL) : '••••••'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Brokerage:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{isPnlVisible ? formatCurrency(w.brokerage) : '••••'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Taxes & Fees:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{isPnlVisible ? formatCurrency(w.taxes) : '••••'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Trades Executed:</span>
                  <span>{w.trades.length}</span>
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>No trading activity</div>
            )}
          </div>
        </div>
      </div>
    );
  });

  // Yearly Month Grid Cells layout
  const yearlyCells = fyMonthsList.map((m) => {
    const isSelected = selectedMonthNum === m.monthNum;
    const hasTrades = m.trades.length > 0;
    const monthRoi = m.deployedCapital > 0 ? (m.netPnL / m.deployedCapital) * 100 : 0;
    
    let cellClass = 'calendar-day yearly-day';
    if (hasTrades) {
      cellClass += ' has-trades';
      if (m.netPnL > 0) {
        cellClass += ' day-win';
      } else if (m.netPnL < 0) {
        cellClass += ' day-loss';
      } else {
        cellClass += ' day-breakeven';
      }
    }
    if (isSelected) {
      cellClass += ' selected';
    }

    return (
      <div 
        key={`month-${m.monthNum}`} 
        className={cellClass} 
        onClick={() => setSelectedMonthNum(m.monthNum === selectedMonthNum ? null : m.monthNum)}
        style={{ minHeight: '95px' }}
      >
        <span className="day-number" style={{ fontSize: '0.85rem' }}>{m.name}</span>
        
        <div 
          style={{ 
            fontSize: '0.68rem', 
            color: 'var(--text-muted)', 
            alignSelf: 'flex-start',
            marginTop: '20px',
            fontWeight: 550
          }}
        >
          {m.year}
        </div>

        <div className="day-pnl">
          {hasTrades ? (
            <>
              <>
                <span className="pnl-desktop">
                  {isPnlVisible ? (m.netPnL > 0 ? '+' : '') : ''}
                  {isPnlVisible ? Math.round(m.netPnL).toLocaleString('en-IN') : '••••'}
                  <span style={{ fontSize: '0.65rem', opacity: 0.85, marginLeft: '2px' }}>
                    ({m.netPnL >= 0 ? '+' : ''}{monthRoi.toFixed(1)}%)
                  </span>
                </span>
                <span className="pnl-mobile">
                  {isPnlVisible ? formatCompactPnLMobile(m.netPnL) : (
                    <>
                      ••••
                      <span style={{ fontSize: '0.58rem', opacity: 0.85, marginLeft: '2px' }}>
                        ({m.netPnL >= 0 ? '+' : ''}{monthRoi.toFixed(1)}%)
                      </span>
                    </>
                  )}
                </span>
              </>
            </>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>-</span>
          )}
        </div>

        {/* Tooltip for month */}
        <div className="calendar-tooltip glass-card">
          <h4 style={{ fontSize: '0.8rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '6px' }}>
            Summary of {m.name} {m.year}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
            {hasTrades ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Net P&L:</span>
                  <strong style={{ color: m.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {isPnlVisible ? formatCurrency(m.netPnL) : '••••••'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Brokerage:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{isPnlVisible ? formatCurrency(m.brokerage) : '••••'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Taxes & Fees:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{isPnlVisible ? formatCurrency(m.taxes) : '••••'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Trades Executed:</span>
                  <span>{m.trades.length}</span>
                </div>
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', marginTop: '4px' }}>No trading activity</div>
            )}
          </div>
        </div>
      </div>
    );
  });

  return (
    <div className="glass-card animate-tab-panel" style={{ padding: '24px' }}>
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem' }}>Trading Calendar</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {activePnlTab === 'monthly' && "Daily realized net profit and loss mapping"}
            {activePnlTab === 'weekly' && "Weekly financial year profit and loss mapping"}
            {activePnlTab === 'yearly' && "Monthly financial year profit and loss mapping"}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', opacity: prevDisabled ? 0.35 : 1, cursor: prevDisabled ? 'not-allowed' : 'pointer' }} 
            onClick={handlePrev}
            disabled={prevDisabled}
          >
            <ChevronLeft size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', minWidth: '110px', textAlign: 'center' }}>
              {headerTitle}
            </span>
            <span 
              className="badge"
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: headerPnL >= 0 ? 'var(--color-win-bg)' : 'var(--color-loss-bg)',
                color: headerPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)',
                border: `1px solid ${headerPnL >= 0 ? 'var(--color-win-border)' : 'var(--color-loss-border)'}`,
                padding: '2px 8px',
                borderRadius: '6px'
              }}
              title={headerBadgeTitle}
            >
              <>
                {isPnlVisible ? (
                  <>
                    {headerPnL >= 0 ? '+' : ''}{formatCurrency(headerPnL)}
                  </>
                ) : (
                  '••••'
                )}{' '}
                ({headerPnL >= 0 ? '+' : ''}{headerRoi.toFixed(1)}%)
              </>
            </span>
          </div>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', opacity: nextDisabled ? 0.35 : 1, cursor: nextDisabled ? 'not-allowed' : 'pointer' }} 
            onClick={handleNext}
            disabled={nextDisabled}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Segmented Range P&L Control */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px', 
          flexWrap: 'wrap', 
          gap: '16px',
          background: 'rgba(255, 255, 255, 0.015)',
          border: '1px solid var(--border-color)',
          padding: '12px 20px',
          borderRadius: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Segmented Control */}
          <div 
            style={{ 
              display: 'flex', 
              background: 'rgba(255,255,255,0.06)', 
              borderRadius: '8px', 
              padding: '3px', 
              border: '1px solid var(--border-color)' 
            }}
          >
            {(['weekly', 'monthly', 'yearly'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActivePnlTab(tab)}
                style={{
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  transition: 'all 0.2s var(--transition-ios-ease)',
                  background: activePnlTab === tab ? 'var(--primary)' : 'transparent',
                  color: activePnlTab === tab ? '#fff' : 'var(--text-dim)',
                  outline: 'none',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* PnL Value display with Eye toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={togglePnlVisibility}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                outline: 'none'
              }}
              title={isPnlVisible ? "Hide P&L" : "Show P&L"}
            >
              {isPnlVisible ? <EyeOff size={16} /> : <Eye size={16} color="var(--primary)" />}
            </button>
            
            <strong 
              style={{ 
                fontSize: '1rem', 
                fontFamily: 'var(--font-mono)',
                color: !isPnlVisible 
                  ? 'var(--text-dim)' 
                  : (activePnlTab === 'weekly' ? currentWeekPnL : activePnlTab === 'monthly' ? activeMonthPnL : activeYearPnL) >= 0 
                    ? 'var(--color-win)' 
                    : 'var(--color-loss)'
              }}
            >
              {isPnlVisible ? (
                <>
                  {(activePnlTab === 'weekly' ? currentWeekPnL : activePnlTab === 'monthly' ? activeMonthPnL : activeYearPnL) >= 0 ? '+' : ''}
                  {formatCurrency(activePnlTab === 'weekly' ? currentWeekPnL : activePnlTab === 'monthly' ? activeMonthPnL : activeYearPnL)}
                </>
              ) : (
                '••••••'
              )}
            </strong>
          </div>
        </div>
        
        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          Click eye icon to toggle P&L visibility
        </span>
      </div>

      {/* Streak / Days Stats Row */}
      <div 
        style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '20px', 
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px'
        }}
      >
        {[
          { value: activeStats.total, label: activeStats.labels.total, color: '#af52de' }, // Purple
          { value: activeStats.traded, label: activeStats.labels.traded, color: '#ff9500' }, // Orange
          { value: activeStats.profit, label: activeStats.labels.profit, color: '#34c759' }, // Green
          { value: activeStats.maxStreak, label: activeStats.labels.maxStreak, color: '#5ac8fa' }, // Light Blue
          { value: activeStats.currentStreak, label: activeStats.labels.currentStreak, color: '#007aff' }  // Medium Blue
        ].map((stat, idx) => (
          <div 
            key={idx} 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '4px',
              minWidth: '65px',
              flexGrow: 1
            }}
          >
            <div 
              style={{ 
                width: '34px', 
                height: '34px', 
                borderRadius: '8px', 
                border: `2px solid ${stat.color}`, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '0.9rem',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                color: stat.color,
                background: 'rgba(255, 255, 255, 0.02)',
                boxShadow: `0 3px 8px rgba(0, 0, 0, 0.1)`,
                transition: 'transform 0.2s var(--transition-ios-spring)'
              }}
              className="stat-box-spring"
            >
              {stat.value}
            </div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 550, textAlign: 'center' }}>
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Weekday headers */}
      {activePnlTab === 'monthly' && (
        <div className="calendar-weekdays">
          {weekdays.map((wd) => (
            <div key={wd} className="weekday-header">
              {wd}
            </div>
          ))}
        </div>
      )}

      {/* Calendar grids */}
      {activePnlTab === 'monthly' && (
        <div className="calendar-grid">
          {calendarCells}
        </div>
      )}

      {activePnlTab === 'weekly' && (
        <div className="weekly-grid">
          {weeklyCells}
        </div>
      )}

      {activePnlTab === 'yearly' && (
        <div className="yearly-grid">
          {yearlyCells}
        </div>
      )}

      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          fontSize: '0.75rem', 
          color: 'var(--text-dim)', 
          marginTop: '16px',
          justifyContent: 'flex-end'
        }}
      >
        <Info size={12} />
        <span>
          {activePnlTab === 'monthly' && "Click any date to see exact trade logs below. Hover for quick summary metrics."}
          {activePnlTab === 'weekly' && "Click any week to see exact trade logs below. Hover for quick summary metrics."}
          {activePnlTab === 'yearly' && "Click any month to see exact trade logs below. Hover for quick summary metrics."}
        </span>
      </div>

      {/* Date/Week/Month Details Pane */}
      {hasSelection && (
        <div 
          style={{ 
            marginTop: '32px', 
            borderTop: '1px solid var(--border-color)', 
            paddingTop: '24px',
            animation: 'fadeIn var(--transition-normal)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                {detailsTitle}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {detailsSubTitle}
              </p>
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '4px 10px', fontSize: '0.75rem', height: '30px' }}
              onClick={handleClearSelection}
            >
              Clear Selection
            </button>
          </div>

          {dayTrades.length > 0 ? (
            <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Entry/Exit</th>
                    <th>Symbol</th>
                    <th>Broker</th>
                    <th>Action</th>
                    <th style={{ textAlign: 'right' }}>Qty</th>
                    <th style={{ textAlign: 'right' }}>Entry</th>
                    <th style={{ textAlign: 'right' }}>Exit</th>
                    <th style={{ textAlign: 'right' }}>Gross P&L</th>
                    <th style={{ textAlign: 'right' }}>Brokerage</th>
                    <th style={{ textAlign: 'right' }}>Taxes & Fees</th>
                    <th style={{ textAlign: 'right' }}>Net P&L</th>
                    <th>Setup/Mistake</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dayTrades.map((t) => (
                    <tr 
                      key={t.id}
                      className={selectedRowId === t.id ? 'selected-row' : ''}
                      onClick={() => setSelectedRowId(selectedRowId === t.id ? null : t.id)}
                    >
                      <td style={{ fontWeight: 550, fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{formatTimeToAMPM(t.entryTime)} - {formatTimeToAMPM(t.exitTime)}</td>
                      <td style={{ fontWeight: 600 }}>{t.symbol}</td>
                      <td>
                        <BrokerBadge broker={t.broker} />
                      </td>
                      <td>
                        <span className={`badge ${t.action === 'BUY' ? 'badge-win' : 'badge-loss'}`} style={{ padding: '2px 6px', fontSize: '0.65rem' }}>
                          {t.action}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{t.qty}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{t.entryPrice}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>₹{t.exitPrice}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: t.grossPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                        {t.grossPnL >= 0 ? '+' : ''}{formatCurrency(t.grossPnL)}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        ₹{Math.round(t.brokerage)}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        ₹{Math.round(t.taxes)}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: t.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                        {t.netPnL >= 0 ? '+' : ''}{formatCurrency(t.netPnL)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          <span className="badge badge-neutral" style={{ padding: '2px 5px', fontSize: '0.62rem' }}>{t.emotion}</span>
                          {t.mistake !== 'None' && (
                            <span className="badge badge-loss" style={{ padding: '2px 5px', fontSize: '0.62rem' }}>{t.mistake}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '250px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} title={t.notes}>
                        {t.notes || '-'}
                      </td>
                      <td>
                        {onEditTrade && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditTrade(t.id);
                            }}
                            className="btn btn-secondary"
                            style={{ 
                              padding: '4px 8px', 
                              fontSize: '0.72rem', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                            title="Edit Trade"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div 
              style={{ 
                padding: '40px 20px', 
                textAlign: 'center', 
                color: 'var(--text-muted)', 
                fontSize: '0.85rem',
                border: '1px dashed var(--border-color)',
                borderRadius: '8px',
                backgroundColor: 'rgba(120, 120, 120, 0.02)'
              }}
            >
              {activePnlTab === 'monthly' && "No trades logged on this date. Click on days highlighted with Green/Red background to view trade details."}
              {activePnlTab === 'weekly' && "No trades logged in this week. Click on weeks highlighted with Green/Red background to view trade details."}
              {activePnlTab === 'yearly' && "No trades logged in this month. Click on months highlighted with Green/Red background to view trade details."}
            </div>
          )}
        </div>
      )}

      <style>{`
        .calendar-weekdays {
          display: grid;
          grid-template-columns: 1.3fr 1.3fr 1.3fr 1.3fr 1.3fr 0.55fr 0.55fr;
          text-align: center;
          margin-bottom: 8px;
        }
        .weekday-header {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 6px;
        }
        .calendar-grid {
          display: grid;
          grid-template-columns: 1.3fr 1.3fr 1.3fr 1.3fr 1.3fr 0.55fr 0.55fr;
          gap: 8px;
        }
        .weekly-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }
        @media (max-width: 900px) {
          .weekly-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        @media (max-width: 600px) {
          .weekly-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .yearly-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        @media (max-width: 768px) {
          .yearly-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (max-width: 480px) {
          .yearly-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .calendar-day {
          min-height: 85px;
          border-radius: 12px;
          border: 1px solid var(--border-color);
          background: var(--bg-card);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          padding: 10px;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: flex-end;
          position: relative;
          transition: 
            transform var(--transition-ios-spring), 
            box-shadow var(--transition-ios-spring), 
            background-color var(--transition-glass), 
            border-color var(--transition-glass),
            opacity var(--transition-glass);
          cursor: pointer;
          user-select: none;
        }
        .calendar-day.empty {
          border-color: transparent;
          background: transparent;
          pointer-events: none;
        }
        .calendar-day.day-weekend {
          opacity: 0.52;
          background: rgba(120, 120, 120, 0.015);
          border-style: dashed;
        }
        .calendar-day.day-weekend.has-trades {
          opacity: 1;
        }
        .calendar-day.day-weekend:hover {
          opacity: 0.95;
          background: var(--bg-card-hover);
        }
        .calendar-day.day-holiday {
          background-color: var(--color-neutral-bg);
          border-color: rgba(191, 90, 242, 0.18);
          border-style: solid;
        }
        .calendar-day.day-holiday .day-number {
          color: var(--color-loss) !important;
          font-weight: 800;
        }
        .day-holiday-label {
          font-size: 0.62rem;
          color: var(--color-neutral);
          font-weight: 700;
          max-width: 90%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-align: left;
          margin-top: 18px;
          align-self: flex-start;
        }
        .calendar-day:hover {
          background: var(--bg-card-hover);
          transform: translateY(-4px) scale(1.04);
          box-shadow: var(--shadow-glow);
          z-index: 5;
        }
        .calendar-day:active {
          transform: scale(0.94) translateY(0);
          transition: transform 0.1s ease;
        }
        .calendar-day.day-win {
          background-color: var(--color-win-bg);
          border-color: var(--color-win-border);
        }
        .calendar-day.day-loss {
          background-color: var(--color-loss-bg);
          border-color: var(--color-loss-border);
        }
        .calendar-day.day-breakeven {
          background-color: rgba(120, 120, 120, 0.04);
          border-color: var(--border-color);
        }
        .calendar-day.selected {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 3px var(--primary-glow), var(--shadow-glow) !important;
          transform: translateY(-4px) scale(1.04);
          z-index: 6;
        }
        .day-number {
          position: absolute;
          top: 8px;
          left: 12px;
          font-size: 0.92rem;
          color: var(--text-muted);
          font-weight: 600;
        }
        .calendar-day.has-trades .day-number {
          color: var(--text-main);
          font-weight: 800;
        }
        .calendar-day.day-win .day-pnl {
          color: var(--color-win);
        }
        .calendar-day.day-loss .day-pnl {
          color: var(--color-loss);
        }
        .day-pnl {
          font-family: var(--font-mono);
          font-size: 1.15rem;
          font-weight: 800;
          text-align: right;
          color: var(--text-muted);
          width: 100%;
          margin-top: auto;
          padding-bottom: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        
        /* Calendar Tooltip Styles */
        .calendar-tooltip {
          opacity: 0;
          pointer-events: none;
          position: absolute;
          bottom: 112%;
          left: 50%;
          transform: translateX(-50%) translateY(12px) scale(0.85);
          width: 220px;
          z-index: 1000;
          background: var(--bg-tooltip-opaque);
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-glow);
          padding: 12px;
          border-radius: 12px;
          color: var(--text-main);
          backdrop-filter: blur(25px) saturate(180%);
          -webkit-backdrop-filter: blur(25px) saturate(180%);
          transition: 
            opacity var(--transition-ios-spring), 
            transform var(--transition-ios-spring), 
            filter var(--transition-ios-spring);
          filter: blur(4px);
        }
        
        .calendar-day:hover .calendar-tooltip {
          opacity: 1;
          transform: translateX(-50%) translateY(0) scale(1);
          filter: blur(0px);
        }

        /* Desktop vs Mobile P&L tags */
        .pnl-desktop {
          display: inline;
        }
        .pnl-mobile {
          display: none;
        }

        @media (max-width: 768px) {
          .calendar-weekdays {
            grid-template-columns: repeat(7, 1fr) !important;
            gap: 4px !important;
          }
          .calendar-grid {
            grid-template-columns: repeat(7, 1fr) !important;
            gap: 4px !important;
          }
          .calendar-day {
            min-height: 55px !important;
            padding: 4px !important;
            border-radius: 8px !important;
          }
          .day-number {
            top: 4px !important;
            left: 6px !important;
            font-size: 0.68rem !important;
          }
          .day-pnl {
            font-size: 0.65rem !important;
            font-weight: 700 !important;
            padding-bottom: 0px !important;
          }
          .weekday-header {
            font-size: 0.6rem !important;
            padding: 2px !important;
          }
          .pnl-desktop {
            display: none !important;
          }
          .pnl-mobile {
            display: inline !important;
          }
          .day-holiday-label {
            font-size: 0.5rem !important;
            margin-top: 14px !important;
          }
        }
      `}</style>
    </div>
  );
}
