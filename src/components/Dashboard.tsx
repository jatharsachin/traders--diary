import { useState, useEffect } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { 
  IndianRupee, Percent, Clock, ShieldCheck, Flame, CalendarRange, Scale, 
  ToggleLeft, ToggleRight, Briefcase, TrendingUp, AlertTriangle, Sparkles,
  Eye, EyeOff, Save, Award, TrendingDown
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend, PieChart, Pie } from 'recharts';
import { filterTradesByFY } from '../utils/fyHelper';
import { BROKER_LOGOS } from '../utils/brandLogos';
import { OFFLINE_NSE_HOLIDAYS } from './TradingCalendar';

export function Dashboard({ 
  activeAccountId = 'Combined', 
  onNavigateToTab 
}: { 
  activeAccountId?: string; 
  onNavigateToTab?: (tab: any) => void;
}) {
  const { 
    trades: allTrades, 
    investments: allInvestments, 
    isPnlVisible, 
    togglePnlVisibility, 
    weeklyRetrospectives, 
    saveWeeklyRetrospective,
    selectedFY,
    activeBrokers,
    userName,
    userAvatar,
    brokerAccounts,
    capitalAdjustments: allAdjustments,
    noTradeDays,
    toggleNoTradeDay
  } = useTradeStore();

  const activeAccountIds = brokerAccounts.filter(a => a.active).map(a => a.id);
  const activeTrades = allTrades.filter(t => t.brokerAccountId && activeAccountIds.includes(t.brokerAccountId));
  const capitalAdjustments = allAdjustments.filter(a => !a.brokerAccountId || activeAccountIds.includes(a.brokerAccountId));
  const investments = allInvestments.filter(i => !i.brokerAccountId || activeAccountIds.includes(i.brokerAccountId));
  
  const [selectedBroker, setSelectedBroker] = useState<string>('All');
  const [showCombined, setShowCombined] = useState(false);
  const [selectedChartMonth, setSelectedChartMonth] = useState<string>('');

  // 12. Weekend/Holiday-Aware Coach Reminder for Missing Log Entries
  const getMissingLogDates = (): string[] => {
    const dates: string[] = [];
    let checkDate = new Date();
    // Start checking from yesterday
    checkDate.setDate(checkDate.getDate() - 1);
    
    // Check up to 5 market days
    while (dates.length < 5) {
      const dayOfWeek = checkDate.getDay(); // 0 = Sun, 6 = Sat
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isNseHoliday = !!OFFLINE_NSE_HOLIDAYS[dateStr];
      
      if (!isWeekend && !isNseHoliday) {
        const hasTrade = activeTrades.some(t => t.date === dateStr);
        const hasAdjustment = capitalAdjustments.some(a => a.date === dateStr);
        const isNoTradeDay = noTradeDays.includes(dateStr);
        
        if (!hasTrade && !hasAdjustment && !isNoTradeDay) {
          dates.push(dateStr);
        }
      }
      
      checkDate.setDate(checkDate.getDate() - 1);
      // Safety limit: don't loop back indefinitely (max 30 days history check)
      const diffTime = Math.abs(new Date().getTime() - checkDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 30) {
        break;
      }
    }
    return dates;
  };

  const missingLogDates = getMissingLogDates();



  const getStartingCapitalForActiveFY = () => {
    let startCap = 0;
    if (activeAccountId !== 'Combined') {
      const acc = brokerAccounts.find(a => a.id === activeAccountId);
      startCap = acc ? (Number(acc.startingCapital) || 0) : 0;
    } else {
      startCap = brokerAccounts.filter(a => a.active).reduce((sum, a) => sum + (Number(a.startingCapital) || 0), 0);
    }

    if (selectedFY === 'All') return startCap;

    const match = selectedFY.match(/FY (\d{4})/);
    if (!match) return startCap;
    const startYear = parseInt(match[1], 10);
    const startStr = `${startYear}-04-01`;

    const priorTradesPnL = activeTrades
      .filter((t) => t.date < startStr && (activeAccountId === 'Combined' ? true : t.brokerAccountId === activeAccountId))
      .reduce((acc, t) => acc + t.netPnL, 0);

    const priorAdjustments = capitalAdjustments
      .filter((a) => a.date < startStr && (activeAccountId === 'Combined' ? true : a.brokerAccountId === activeAccountId))
      .reduce((acc, a) => {
        if (a.type === 'DEPOSIT') return acc + a.amount;
        return acc - a.amount;
      }, 0);

    return startCap + priorTradesPnL + priorAdjustments;
  };

  const activeBaseCapital = getStartingCapitalForActiveFY();
  
  // Calculate effectiveBaseCapital with proper individual/combined fallbacks
  const fallbackCapital = activeAccountId === 'Combined'
    ? brokerAccounts.filter(a => a.active).reduce((sum, a) => sum + (Number(a.startingCapital) || 0), 0)
    : (Number(brokerAccounts.find(a => a.id === activeAccountId)?.startingCapital) || 0);

  const effectiveBaseCapital = (Number(activeBaseCapital) || Number(fallbackCapital) || 1);

  const rawTradesByFY = filterTradesByFY(activeTrades, selectedFY).filter((t) => {
    const isImported = t.strategy === 'Auto Imported' || 
                       t.broker === 'Kotak Neo' || 
                       (t.notes && t.notes.toLowerCase().includes('imported'));
    return !isImported;
  });
  const rawTrades = activeAccountId === 'Combined'
    ? rawTradesByFY
    : rawTradesByFY.filter((t) => t.brokerAccountId === activeAccountId);

  const trades = selectedBroker === 'All' 
    ? rawTrades 
    : rawTrades.filter((t) => (t.broker || 'Other') === selectedBroker);

  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.netPnL > 0);
  const losingTrades = trades.filter((t) => t.netPnL < 0);
  
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
  
  const totalGrossPnL = trades.reduce((acc, t) => acc + t.grossPnL, 0);
  const totalCharges = trades.reduce((acc, t) => acc + t.brokerage + t.taxes, 0);
  const totalBrokerage = trades.reduce((acc, t) => acc + t.brokerage, 0);
  const totalTaxes = trades.reduce((acc, t) => acc + t.taxes, 0);
  const totalNetPnL = trades.reduce((acc, t) => acc + t.netPnL, 0);

  // Investment stats (filtering by status to support exits)
  const activeInvestments = investments.filter(inv => inv.status !== 'EXITED');
  const exitedInvestments = investments.filter(inv => inv.status === 'EXITED');

  const totalInvInvested = activeInvestments.reduce((acc, inv) => acc + (inv.buyPrice * inv.qty), 0);
  const totalInvCurrent = activeInvestments.reduce((acc, inv) => acc + (inv.currentPrice * inv.qty), 0);
  const activeReturns = totalInvCurrent - totalInvInvested;
  
  const realizedInvReturns = exitedInvestments.reduce((acc, inv) => acc + (((inv.exitPrice || 0) - inv.buyPrice) * inv.qty), 0);
  const totalInvReturns = activeReturns + realizedInvReturns;

  // Get deposits and withdrawals during the selected FY period
  const currentPeriodAdjustments = capitalAdjustments.filter((a) => {
    const matchesAccount = activeAccountId === 'Combined' ? true : a.brokerAccountId === activeAccountId;
    if (!matchesAccount) return false;
    if (selectedFY === 'All') return true;
    const match = selectedFY.match(/FY (\d{4})/);
    if (!match) return true;
    const startYear = parseInt(match[1], 10);
    const startStr = `${startYear}-04-01`;
    const endStr = `${startYear + 1}-03-31`;
    return a.date >= startStr && a.date <= endStr;
  });

  const periodDeposits = currentPeriodAdjustments.filter(a => a.type === 'DEPOSIT').reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const periodWithdrawals = currentPeriodAdjustments.filter(a => a.type === 'WITHDRAWAL').reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  const netPeriodAdjustments = periodDeposits - periodWithdrawals;

  // Deployed capital is effectiveBaseCapital (starting capital at start of FY) + net deposits during FY
  const activeDeployedCapital = Math.max(1, effectiveBaseCapital + netPeriodAdjustments);

  // Combined calculations using activeBaseCapital
  const displayNetPnL = showCombined ? (totalNetPnL + totalInvReturns) : totalNetPnL;

  const tradingReturnPct = (totalNetPnL / activeDeployedCapital) * 100;
  const combinedReturnPct = (activeDeployedCapital + totalInvInvested) > 0 ? ((totalNetPnL + totalInvReturns) / (activeDeployedCapital + totalInvInvested)) * 100 : 0;

  const grossProfit = trades.reduce((acc, t) => (t.netPnL > 0 ? acc + t.netPnL : acc), 0);
  const grossLoss = Math.abs(trades.reduce((acc, t) => (t.netPnL < 0 ? acc + t.netPnL : acc), 0));
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? Infinity : 1.0);
  
  const avgWin = winningTrades.length > 0 ? (grossProfit / winningTrades.length) : 0;
  const avgLoss = losingTrades.length > 0 ? (grossLoss / losingTrades.length) : 0;
  const winRateRatio = winningTrades.length / (totalTrades || 1);
  const lossRateRatio = losingTrades.length / (totalTrades || 1);
  const expectancy = (winRateRatio * avgWin) - (lossRateRatio * avgLoss);

  const parseTimeToMinutes = (timeStr: string): number => {
    if (!timeStr) return 0;
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) {
      const parts = timeStr.split(':');
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      return h * 60 + m;
    }
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3]?.toUpperCase();

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  const sortTradesChronologically = (tradesList: typeof trades) => {
    return [...tradesList].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return parseTimeToMinutes(a.entryTime) - parseTimeToMinutes(b.entryTime);
    });
  };

  const getMaxDrawdown = () => {
    let peak = 0;
    let maxDD = 0;
    let cumulativePnL = 0;
    const chronoTrades = sortTradesChronologically(trades);
    chronoTrades.forEach((t) => {
      cumulativePnL += t.netPnL;
      if (cumulativePnL > peak) {
        peak = cumulativePnL;
      }
      const dd = peak - cumulativePnL;
      if (dd > maxDD) {
        maxDD = dd;
      }
    });
    return maxDD;
  };
  const maxDrawdown = getMaxDrawdown();

  const getStreakAnalysis = () => {
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let currentWinStreak = 0;
    let currentLossStreak = 0;
    const chronoTrades = sortTradesChronologically(trades);
    chronoTrades.forEach((t) => {
      if (t.netPnL > 0) {
        currentWinStreak++;
        currentLossStreak = 0;
        if (currentWinStreak > maxWinStreak) {
          maxWinStreak = currentWinStreak;
        }
      } else if (t.netPnL < 0) {
        currentLossStreak++;
        currentWinStreak = 0;
        if (currentLossStreak > maxLossStreak) {
          maxLossStreak = currentLossStreak;
        }
      }
    });
    return { maxWinStreak, maxLossStreak };
  };
  const { maxWinStreak, maxLossStreak } = getStreakAnalysis();
  
  // Sort trades oldest to newest
  const sortedTrades = sortTradesChronologically(trades);

  // Calculate CAGR & Returns by period
  const getAnchorDate = () => {
    return new Date();
  };
  const anchorDate = getAnchorDate();

  // Monthly stats for dropdown select
  const availableMonths = Array.from(new Set(sortedTrades.map(t => t.date.substring(0, 7)))).sort().reverse();
  const activeChartMonth = selectedChartMonth || (availableMonths[0] || new Date().toISOString().substring(0, 7));
  const selectedMonthTrades = sortedTrades.filter(t => t.date.startsWith(activeChartMonth));
  const selectedMonthPnL = selectedMonthTrades.reduce((sum, t) => sum + t.netPnL, 0);

  // Average Trades Volume Calculations
  const uniqueDays = new Set(trades.map(t => t.date)).size || 1;
  const avgTradesPerDay = trades.length / uniqueDays;

  // Group by week YYYY-Www
  const getWeekIdentifier = (dateStr: string) => {
    const d = new Date(dateStr);
    const oneJan = new Date(d.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
    return `${d.getFullYear()}-W${week}`;
  };
  const uniqueWeeks = new Set(trades.map(t => getWeekIdentifier(t.date))).size || 1;
  const avgTradesPerWeek = trades.length / uniqueWeeks;

  const uniqueMonths = new Set(trades.map(t => t.date.substring(0, 7))).size || 1;
  const avgTradesPerMonth = trades.length / uniqueMonths;

  const getModifiedDietzReturn = (days: number) => {
    const cutoffDate = new Date(anchorDate);
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const periodTrades = sortedTrades.filter((t) => t.date >= cutoffStr);
    const pnl = periodTrades.reduce((acc, t) => acc + t.netPnL, 0);

    let startCap = 0;
    if (activeAccountId !== 'Combined') {
      const acc = brokerAccounts.find(a => a.id === activeAccountId);
      startCap = acc ? (Number(acc.startingCapital) || 0) : 0;
    } else {
      startCap = brokerAccounts.filter(a => a.active).reduce((sum, a) => sum + (Number(a.startingCapital) || 0), 0);
    }

    const priorTradesPnL = activeTrades
      .filter((t) => t.date < cutoffStr && (activeAccountId === 'Combined' ? true : t.brokerAccountId === activeAccountId))
      .reduce((acc, t) => acc + t.netPnL, 0);

    const priorAdjustments = capitalAdjustments
      .filter((a) => a.date < cutoffStr && (activeAccountId === 'Combined' ? true : a.brokerAccountId === activeAccountId))
      .reduce((acc, a) => {
        if (a.type === 'DEPOSIT') return acc + a.amount;
        return acc - a.amount;
      }, 0);

    const beginningCapital = startCap + priorTradesPnL + priorAdjustments;

    const periodAdjustments = capitalAdjustments.filter((a) => {
      const matchesAccount = activeAccountId === 'Combined' ? true : a.brokerAccountId === activeAccountId;
      return matchesAccount && a.date >= cutoffStr && a.date <= anchorDate.toISOString().split('T')[0];
    });

    const totalDays = Math.max(1, days);
    let weightedCashFlows = 0;

    periodAdjustments.forEach((a) => {
      const adjDate = new Date(a.date);
      const daysFromStart = Math.max(0, Math.floor((adjDate.getTime() - cutoffDate.getTime()) / (1000 * 60 * 60 * 24)));
      const weight = Math.max(0, Math.min(1, (totalDays - daysFromStart) / totalDays));
      const amount = Number(a.amount) || 0;
      if (a.type === 'DEPOSIT') {
        weightedCashFlows += amount * weight;
      } else {
        weightedCashFlows -= amount * weight;
      }
    });

    const averageDeployedCapital = Math.max(1, beginningCapital + weightedCashFlows);
    const pct = (pnl / averageDeployedCapital) * 100;

    return { pnl, pct, averageDeployedCapital };
  };

  const m1 = getModifiedDietzReturn(30);
  const m3 = getModifiedDietzReturn(90);

  const getAllTimeModifiedDietzReturn = () => {
    const firstTradeDate = sortedTrades[0] ? new Date(sortedTrades[0].date) : new Date();
    const firstAdjustmentDate = capitalAdjustments[0] ? new Date(capitalAdjustments[0].date) : new Date();
    const startDate = new Date(Math.min(firstTradeDate.getTime(), firstAdjustmentDate.getTime()));
    
    const totalDays = Math.max(1, Math.ceil((anchorDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

    let startCap = 0;
    if (activeAccountId !== 'Combined') {
      const acc = brokerAccounts.find(a => a.id === activeAccountId);
      startCap = acc ? (Number(acc.startingCapital) || 0) : 0;
    } else {
      startCap = brokerAccounts.filter(a => a.active).reduce((sum, a) => sum + (Number(a.startingCapital) || 0), 0);
    }

    const periodAdjustments = capitalAdjustments.filter((a) => {
      return activeAccountId === 'Combined' ? true : a.brokerAccountId === activeAccountId;
    });

    let weightedCashFlows = 0;
    periodAdjustments.forEach((a) => {
      const adjDate = new Date(a.date);
      const daysFromStart = Math.max(0, Math.floor((adjDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const weight = Math.max(0, Math.min(1, (totalDays - daysFromStart) / totalDays));
      const amount = Number(a.amount) || 0;
      if (a.type === 'DEPOSIT') {
        weightedCashFlows += amount * weight;
      } else {
        weightedCashFlows -= amount * weight;
      }
    });

    const averageDeployedCapital = Math.max(1, startCap + weightedCashFlows);
    const pct = (displayNetPnL / averageDeployedCapital) * 100;

    return { pct, averageDeployedCapital };
  };

  const allTimeReturn = getAllTimeModifiedDietzReturn();
  const allTimePct = allTimeReturn.pct;
  const allTimeDeployedCapital = allTimeReturn.averageDeployedCapital;

  const firstTradeDate = new Date(sortedTrades[0]?.date || new Date());
  const timeDiffMs = anchorDate.getTime() - firstTradeDate.getTime();
  const yearsDiff = timeDiffMs / (1000 * 60 * 60 * 24 * 365.25);
  const cagr = yearsDiff > 0.02
    ? (Math.pow(Math.max(0.1, (allTimeDeployedCapital + displayNetPnL) / allTimeDeployedCapital), 1 / yearsDiff) - 1) * 100
    : allTimePct;

  // Options Holding Details
  const optionTrades = trades.filter((t) => {
    if (t.segment !== 'F&O') return false;
    const hasOptionType = t.optionType && t.optionType !== 'None';
    const symUpper = (t.symbol || '').toUpperCase();
    const isCE = symUpper.includes(' CE') || symUpper.endsWith('CE') || symUpper.includes('CALL');
    const isPE = symUpper.includes(' PE') || symUpper.endsWith('PE') || symUpper.includes('PUT');
    return hasOptionType || isCE || isPE;
  });
  const avgOptionDuration = optionTrades.length > 0
    ? optionTrades.reduce((acc, t) => acc + (t.durationMinutes || 0), 0) / optionTrades.length
    : 0;

  // GitHub-style Trading Heatmap calculations
  const getDatesArray = (startStr: string, endStr: string) => {
    const datesList: string[] = [];
    let current = new Date(startStr);
    const end = new Date(endStr);
    while (current <= end) {
      datesList.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return datesList;
  };

  const getHeatmapRange = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (selectedFY === 'All') {
      const yearAgo = new Date();
      yearAgo.setDate(yearAgo.getDate() - 365);
      return {
        start: yearAgo.toISOString().split('T')[0],
        end: todayStr
      };
    }
    const match = selectedFY.match(/FY (\d{4})/);
    if (!match) {
      const yearAgo = new Date();
      yearAgo.setDate(yearAgo.getDate() - 365);
      return {
        start: yearAgo.toISOString().split('T')[0],
        end: todayStr
      };
    }
    const startYear = parseInt(match[1], 10);
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
      const d = new Date(dateStr);
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
        const d = new Date(firstDate);
        const day = d.getDay();
        m.startPad = day - 1; // 0 = Mon, 1 = Tue, 2 = Wed, 3 = Thu, 4 = Fri
      }
    });

    return list;
  };

  const monthsData = getMonthsGrouped(dates);

  const heatmapTrades = rawTrades.filter(
    (t) => t.date >= heatmapRange.start && t.date <= heatmapRange.end && (selectedBroker === 'All' ? true : (t.broker || 'Other') === selectedBroker)
  );

  const dailyStats: Record<string, { pnl: number; count: number }> = {};
  heatmapTrades.forEach((t) => {
    if (!dailyStats[t.date]) {
      dailyStats[t.date] = { pnl: 0, count: 0 };
    }
    dailyStats[t.date].pnl += t.netPnL;
    dailyStats[t.date].count += 1;
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

  dates.forEach((dateStr) => {
    const stats = dailyStats[dateStr];
    if (stats && stats.count > 0) {
      if (stats.pnl > 0) greenDaysCount++;
      else if (stats.pnl < 0) redDaysCount++;
    } else if (noTradeDays.includes(dateStr)) {
      noTradeDaysCount++;
    }
  });

  const brokerageLeakage = grossProfit > 0 ? (totalCharges / grossProfit) * 100 : 0;

  // Broker-wise Performance statistics calculations
  const getBrokerwiseStats = () => {
    const brokerMap: Record<string, { 
      netPnL: number; 
      totalTrades: number; 
      wins: number; 
      losses: number; 
      charges: number; 
      investmentPnL: number;
      activeInvestmentValue: number;
    }> = {};
    
    rawTrades.forEach((t) => {
      const b = t.broker || 'Other';
      const acc = brokerAccounts.find(a => a.id === t.brokerAccountId);
      const accName = acc ? acc.accountName : 'Default User';
      const key = `${b} (${accName})`;
      if (!brokerMap[key]) {
        brokerMap[key] = { netPnL: 0, totalTrades: 0, wins: 0, losses: 0, charges: 0, investmentPnL: 0, activeInvestmentValue: 0 };
      }
      brokerMap[key].netPnL += t.netPnL;
      brokerMap[key].totalTrades += 1;
      brokerMap[key].charges += (t.brokerage + t.taxes);
      if (t.netPnL > 0) {
        brokerMap[key].wins += 1;
      } else if (t.netPnL < 0) {
        brokerMap[key].losses += 1;
      }
    });

    investments.forEach((inv) => {
      const b = inv.broker || 'Other';
      const acc = brokerAccounts.find(a => a.id === inv.brokerAccountId);
      const accName = acc ? acc.accountName : 'Default User';
      const key = `${b} (${accName})`;
      if (!brokerMap[key]) {
        brokerMap[key] = { netPnL: 0, totalTrades: 0, wins: 0, losses: 0, charges: 0, investmentPnL: 0, activeInvestmentValue: 0 };
      }
      if (inv.status === 'EXITED') {
        const realized = ((inv.exitPrice || 0) - inv.buyPrice) * inv.qty;
        brokerMap[key].investmentPnL += realized;
      } else {
        const unrealized = (inv.currentPrice - inv.buyPrice) * inv.qty;
        brokerMap[key].investmentPnL += unrealized;
        brokerMap[key].activeInvestmentValue += (inv.currentPrice * inv.qty);
      }
    });

    return Object.entries(brokerMap).map(([name, data]) => {
      const wr = data.totalTrades > 0 ? (data.wins / data.totalTrades) * 100 : 0;
      const brokerName = name.split(' (')[0];
      return {
        name,
        brokerName,
        ...data,
        winRate: wr
      };
    }).sort((a, b) => (b.netPnL + b.investmentPnL) - (a.netPnL + a.investmentPnL));
  };

  const brokerStats = getBrokerwiseStats();

  // Max Drawdown & Consistency stats
  const calculateMaxDrawdown = () => {
    let peak = 0;
    let currentCumulative = 0;
    let maxDrawdown = 0;

    for (const t of sortedTrades) {
      currentCumulative += t.netPnL;
      if (currentCumulative > peak) peak = currentCumulative;
      const drawdown = peak - currentCumulative;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    return maxDrawdown;
  };

  const maxDDRupees = calculateMaxDrawdown();
  const maxDDPct = (maxDDRupees / activeDeployedCapital) * 100;

  // Win Days calculation
  const dailyPnL: Record<string, number> = {};
  sortedTrades.forEach((t) => {
    dailyPnL[t.date] = (dailyPnL[t.date] || 0) + t.netPnL;
  });

  // Extreme Days calculation
  const getExtremeDays = () => {
    let bestDate = 'No Trades';
    let bestPnL = 0;
    let worstDate = 'No Trades';
    let worstPnL = 0;

    Object.entries(dailyPnL).forEach(([date, pnl]) => {
      if (pnl > bestPnL) {
        bestPnL = pnl;
        bestDate = date;
      }
      if (pnl < worstPnL) {
        worstPnL = pnl;
        worstDate = date;
      }
    });

    const formatDateShort = (dateStr: string) => {
      if (dateStr === 'No Trades') return 'N/A';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    return {
      bestDay: { date: formatDateShort(bestDate), pnl: bestPnL },
      worstDay: { date: formatDateShort(worstDate), pnl: worstPnL }
    };
  };
  const { bestDay, worstDay } = getExtremeDays();

  const daysList = Object.values(dailyPnL);
  const winDaysCount = daysList.filter((d) => d > 0).length;
  const winDaysPct = daysList.length > 0 ? (winDaysCount / daysList.length) * 100 : 0;

  // Streaks
  let maxConsecWins = 0;
  let maxConsecLosses = 0;
  let currentWins = 0;
  let currentLosses = 0;

  sortedTrades.forEach((t) => {
    if (t.netPnL > 0) {
      currentWins++;
      currentLosses = 0;
      if (currentWins > maxConsecWins) maxConsecWins = currentWins;
    } else if (t.netPnL < 0) {
      currentLosses++;
      currentWins = 0;
      if (currentLosses > maxConsecLosses) maxConsecLosses = currentLosses;
    }
  });

  // Sharpe Ratio
  const calculateSharpeRatio = () => {
    const dailyReturns = daysList.map((d) => d / activeDeployedCapital);
    if (dailyReturns.length === 0) return 0;

    const dailyRf = 0.06 / 252;
    const excessReturns = dailyReturns.map((r) => r - dailyRf);
    const meanExcess = excessReturns.reduce((acc, r) => acc + r, 0) / excessReturns.length;

    const meanReturn = dailyReturns.reduce((acc, r) => acc + r, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((acc, r) => acc + Math.pow(r - meanReturn, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? (meanExcess / stdDev) * Math.sqrt(252) : 0;
  };

  const sharpe = calculateSharpeRatio();

  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const absVal = Math.abs(val);
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });
    return (isNegative ? '-' : '') + formatter.format(absVal);
  };
  const getEquityCurveData = () => {
    const allFyTrades = [...sortedTrades];
    
    // Calculate actual current capital exactly like App.tsx
    const filteredBaseCapital = activeAccountId === 'Combined'
      ? brokerAccounts.reduce((sum, a) => sum + a.startingCapital, 0)
      : (brokerAccounts.find((a) => a.id === activeAccountId)?.startingCapital || 0);

    const filteredAdjustments = activeAccountId === 'Combined'
      ? capitalAdjustments
      : capitalAdjustments.filter((a) => a.brokerAccountId === activeAccountId);

    const totalDeposits = filteredAdjustments.filter((a) => a.type === 'DEPOSIT').reduce((acc, a) => acc + a.amount, 0);
    const totalWithdrawals = filteredAdjustments.filter((a) => a.type === 'WITHDRAWAL').reduce((acc, a) => acc + a.amount, 0);
    
    const totalNetPnLFy = allFyTrades.reduce((acc, t) => acc + t.netPnL, 0);
    const actualCurrentCapital = filteredBaseCapital + totalNetPnLFy + totalDeposits - totalWithdrawals;
    const startingCapital = actualCurrentCapital - totalNetPnLFy;

    let cumulative = startingCapital;

    const curvePoints = allFyTrades.map((t, index) => {
      cumulative += t.netPnL;
      return {
        tradeIndex: index + 1,
        date: t.date,
        symbol: t.symbol,
        netPnL: t.netPnL,
        tradingPnL: Math.round(cumulative * 100) / 100
      };
    });

    if (curvePoints.length === 0) {
      return [{
        tradeIndex: 0,
        date: new Date().toISOString().split('T')[0],
        symbol: 'Initial Capital',
        netPnL: 0,
        tradingPnL: Math.round(startingCapital * 100) / 100
      }];
    }

    if (timeRange === 'All') {
      return [
        {
          tradeIndex: 0,
          date: allFyTrades[0]?.date || new Date().toISOString().split('T')[0],
          symbol: 'Initial Capital',
          netPnL: 0,
          tradingPnL: Math.round(startingCapital * 100) / 100
        },
        ...curvePoints
      ];
    }

    const daysMap = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };
    const days = daysMap[timeRange as keyof typeof daysMap];
    const cutoff = new Date(anchorDate);
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const filteredPoints = curvePoints.filter(pt => pt.date >= cutoffStr);
    const priorPoints = curvePoints.filter(pt => pt.date < cutoffStr);
    const startingCapitalForRange = priorPoints.length > 0 
      ? priorPoints[priorPoints.length - 1].tradingPnL 
      : startingCapital;

    return [
      {
        tradeIndex: 0,
        date: cutoffStr,
        symbol: 'Range Start',
        netPnL: 0,
        tradingPnL: Math.round(startingCapitalForRange * 100) / 100
      },
      ...filteredPoints
    ];
  };

  // 2. Mistake Audit Data Preparation
  const getMistakeData = () => {
    const mistakeMap: Record<string, { count: number; loss: number }> = {};

    trades.forEach((t) => {
      if (t.mistake && t.mistake !== 'None') {
        if (!mistakeMap[t.mistake]) {
          mistakeMap[t.mistake] = { count: 0, loss: 0 };
        }
        mistakeMap[t.mistake].count += 1;
        if (t.netPnL < 0) {
          mistakeMap[t.mistake].loss += Math.abs(t.netPnL);
        }
      }
    });

    return Object.entries(mistakeMap).map(([name, data]) => ({
      name,
      count: data.count,
      loss: Math.round(data.loss),
    })).sort((a, b) => b.loss - a.loss);
  };

  const getEmotionStatsData = () => {
    const emotionMap: Record<string, { count: number; wins: number; netPnL: number }> = {
      Calm: { count: 0, wins: 0, netPnL: 0 },
      Greedy: { count: 0, wins: 0, netPnL: 0 },
      Fearful: { count: 0, wins: 0, netPnL: 0 },
      Impatient: { count: 0, wins: 0, netPnL: 0 },
      Revengeful: { count: 0, wins: 0, netPnL: 0 }
    };

    trades.forEach((t) => {
      const e = t.emotion || 'Calm';
      if (emotionMap[e]) {
        emotionMap[e].count += 1;
        if (t.netPnL > 0) {
          emotionMap[e].wins += 1;
        }
        emotionMap[e].netPnL += t.netPnL;
      }
    });

    return Object.entries(emotionMap).map(([name, data]) => ({
      name,
      count: data.count,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      netPnL: Math.round(data.netPnL)
    }));
  };

  const getAssetAllocationData = () => {
    const allocationMap: Record<string, number> = {
      ETF: 0,
      BOND: 0,
      EQUITY: 0
    };
    
    activeInvestments.forEach((inv) => {
      allocationMap[inv.type] = (allocationMap[inv.type] || 0) + (inv.currentPrice * inv.qty);
    });

    return Object.entries(allocationMap).map(([name, value]) => ({
      name: name === 'EQUITY' ? 'Stocks' : name,
      value: Math.round(value)
    })).filter(item => item.value > 0);
  };

  const getSegmentAllocationData = () => {
    const segmentMap: Record<string, number> = {
      Equity: 0,
      'F&O': 0,
      Commodity: 0,
      Currency: 0
    };
    trades.forEach((t) => {
      segmentMap[t.segment] = (segmentMap[t.segment] || 0) + Math.abs(t.netPnL);
    });
    return Object.entries(segmentMap).map(([name, value]) => ({
      name,
      value: Math.round(value)
    })).filter(item => item.value > 0);
  };

  const getWeeklySummaryList = () => {
    const anchor = getAnchorDate();
    let currentYear = anchor.getFullYear();
    if (anchor.getMonth() < 3) {
      currentYear -= 1;
    }
    const fyStart = new Date(currentYear, 3, 1); // April 1st
    
    const weeksMap: Record<string, { weekId: string; weekNum: number; startDate: Date; endDate: Date; trades: any[] }> = {};
    
    // Generate all 52 weeks
    let ptr = new Date(fyStart);
    for (let w = 1; w <= 52; w++) {
      const start = new Date(ptr);
      const end = new Date(ptr);
      end.setDate(ptr.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      
      const weekId = `${currentYear}-W${w.toString().padStart(2, '0')}`;
      weeksMap[weekId] = {
        weekId,
        weekNum: w,
        startDate: start,
        endDate: end,
        trades: []
      };
      ptr.setDate(ptr.getDate() + 7);
    }
    
    // Populate trades
    trades.forEach((t) => {
      const tDate = new Date(t.date);
      for (const w of Object.values(weeksMap)) {
        if (tDate >= w.startDate && tDate <= w.endDate) {
          w.trades.push(t);
          break;
        }
      }
    });
    
    return Object.values(weeksMap).map((w) => {
      const netPnL = w.trades.reduce((acc, t) => acc + t.netPnL, 0);
      const wins = w.trades.filter((t) => t.netPnL > 0).length;
      const winRate = w.trades.length > 0 ? (wins / w.trades.length) * 100 : 0;
      
      // Mistake cost
      const mistakeCost = w.trades.reduce((acc, t) => (t.netPnL < 0 && t.mistake !== 'None' ? acc + Math.abs(t.netPnL) : acc), 0);
      
      // Dominant emotion
      const emap: Record<string, number> = {};
      w.trades.forEach(t => emap[t.emotion] = (emap[t.emotion] || 0) + 1);
      const dominantEmotion = Object.entries(emap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

      const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const formattedRange = `${w.startDate.getDate()} ${monthsShort[w.startDate.getMonth()]} - ${w.endDate.getDate()} ${monthsShort[w.endDate.getMonth()]}`;

      return {
        ...w,
        netPnL,
        winRate,
        mistakeCost,
        dominantEmotion,
        formattedRange
      };
    }).filter(w => w.trades.length > 0 || w.weekNum <= getCurrentFYWeekNum(fyStart));
  };

  const getCurrentFYWeekNum = (fyStart: Date) => {
    const today = new Date();
    if (today < fyStart) return 1;
    const diffTime = Math.abs(today.getTime() - fyStart.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const week = Math.ceil(diffDays / 7);
    return Math.min(52, week);
  };

  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'All'>('All');

  const getFilterButtonStats = () => {
    const stats1M = getModifiedDietzReturn(30);
    const stats3M = getModifiedDietzReturn(90);
    const stats6M = getModifiedDietzReturn(180);
    const stats1Y = getModifiedDietzReturn(365);

    return {
      '1M': { pnl: stats1M.pnl, pct: stats1M.pct },
      '3M': { pnl: stats3M.pnl, pct: stats3M.pct },
      '6M': { pnl: stats6M.pnl, pct: stats6M.pct },
      '1Y': { pnl: stats1Y.pnl, pct: stats1Y.pct },
      'All': { pnl: displayNetPnL, pct: allTimePct }
    };
  };

  const buttonStats = getFilterButtonStats();
  const equityData = getEquityCurveData();
  const mistakeData = getMistakeData();
  const emotionStatsData = getEmotionStatsData();
  const assetAllocationData = getAssetAllocationData();
  const segmentAllocationData = getSegmentAllocationData();

  // Weekly retrospective panel state
  const [selectedRetroWeekId, setSelectedRetroWeekId] = useState<string>('');
  const [retroNotes, setRetroNotes] = useState<string>('');
  
  const weeklySummaries = getWeeklySummaryList();
  const activeRetroWeek = weeklySummaries.find(w => w.weekId === selectedRetroWeekId);

  // Sync retro notes state with store when selected week changes or when store updates
  useEffect(() => {
    if (selectedRetroWeekId) {
      setRetroNotes((weeklyRetrospectives && weeklyRetrospectives[selectedRetroWeekId]) || '');
    }
  }, [selectedRetroWeekId, weeklyRetrospectives]);

  // Set default retro week
  useEffect(() => {
    if (weeklySummaries.length > 0 && !selectedRetroWeekId) {
      const today = new Date();
      const currentWeek = weeklySummaries.find(w => today >= w.startDate && today <= w.endDate) || weeklySummaries[weeklySummaries.length - 1];
      if (currentWeek) {
        setSelectedRetroWeekId(currentWeek.weekId);
      }
    }
  }, [trades, weeklySummaries, selectedRetroWeekId]);

  const handleSaveRetro = () => {
    if (!selectedRetroWeekId) return;
    saveWeeklyRetrospective(selectedRetroWeekId, retroNotes);
    alert('Weekly Retrospective saved successfully!');
  };

  const getCoachTip = (mistakeCost: number, dominantEmotion: string) => {
    if (mistakeCost === 0) {
      return "Excellent execution discipline this week! Keep executing your setups without hesitation. You followed your rules perfectly.";
    }
    if (dominantEmotion === 'Greedy' || dominantEmotion === 'Impatient') {
      return `Impatient/Greedy execution cost you ₹${mistakeCost.toLocaleString('en-IN')} in mistake penalties. Focus on wait-triggers. Do not chase moving candles.`;
    }
    if (dominantEmotion === 'Fearful') {
      return "Fear-based exits are locking in sub-optimal risk-to-reward ratios. Practice setting your SL/Target on terminal and letting the trade run to its mathematical limit.";
    }
    return `Execution leaks cost you ₹${mistakeCost.toLocaleString('en-IN')} in mistake penalties. Next week, review your setups checklist before taking any entry.`;
  };

  // Discipline Rating Calculation
  const totalTradesWithMistakes = trades.filter((t) => t.mistake && t.mistake !== 'None').length;
  const disciplineScore = totalTrades > 0 
    ? ((totalTrades - totalTradesWithMistakes) / totalTrades) * 100 
    : 100;

  const getDisciplineGrade = (score: number) => {
    if (score >= 95) return { grade: 'A+', color: 'var(--color-win)', desc: 'Flawless Execution!' };
    if (score >= 90) return { grade: 'A', color: '#34d399', desc: 'Highly Disciplined.' };
    if (score >= 80) return { grade: 'B', color: '#60a5fa', desc: 'Good focus. Avoid minor slips.' };
    if (score >= 70) return { grade: 'C', color: '#fb923c', desc: 'Average. Emotional entries detected.' };
    return { grade: 'D', color: 'var(--color-loss)', desc: 'Discipline leak! Review trading plan.' };
  };
  const disciplineInfo = getDisciplineGrade(disciplineScore);
  const CustomEquityTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.tradeIndex === 0) return null;
      
      const formatDateTooltip = (dateStr: string) => {
        if (!dateStr || dateStr === 'Start') return 'Start';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
      };

      return (
        <div className="glass-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '8px 12px', boxShadow: 'var(--shadow-glow)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatDateTooltip(data.date)}</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 650, color: 'var(--text-main)' }}>
            Value: {isPnlVisible ? formatCurrency(data.tradingPnL) : '••••'}
          </span>
        </div>
      );
    }
    return null;
  };

  const CustomMistakeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="glass-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '10px', boxShadow: 'var(--shadow-glow)' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-loss)' }}>{data.name}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-main)' }}>
            <span>Total Occurrences: {data.count}</span>
            <span style={{ color: 'var(--color-loss)' }}>Total Losses: {isPnlVisible ? formatCurrency(data.loss) : '••••'}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const isCustomAvatar = userAvatar && (userAvatar.startsWith('data:image/') || userAvatar.startsWith('http'));

  return (
    <div className="animate-tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* 12. Weekend/Holiday-Aware Coach Reminder for Missing Log Entries */}
      {missingLogDates.length > 0 && (
        <div 
          className="glass-card" 
          style={{ 
            padding: '16px 20px', 
            background: 'rgba(239, 68, 68, 0.08)', 
            border: '1.5px solid rgba(239, 68, 68, 0.25)', 
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-loss)' }}>
            <AlertTriangle size={18} />
            <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0 }}>Coach Reminder: Missing Log Entries</h3>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
            We noticed you have no trade or capital adjustments logged for the following recent market day(s). Keeping your journal entry streak active is key to success! Please select an action for each date:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            {missingLogDates.map(date => {
              const formattedDate = new Date(date).toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
              return (
                <div 
                  key={date} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '8px 12px', 
                    background: 'rgba(255,255,255,0.02)', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-color)',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {formattedDate}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => onNavigateToTab?.('logs')}
                      className="btn btn-primary" 
                      style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      Log Trade
                    </button>
                    <button 
                      onClick={() => toggleNoTradeDay(date)}
                      className="btn btn-secondary" 
                      style={{ padding: '4px 10px', fontSize: '0.75rem', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}
                    >
                      Mark No-Trade Day
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Redesigned Welcome Banner */}
      <div 
        className="glass-card animate-tab-panel" 
        style={{ 
          padding: '20px 24px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border-color)',
          borderRadius: '12px',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: 'var(--shadow-card)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* User Profile Photo */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {isCustomAvatar ? (
              <img
                src={userAvatar}
                alt="Profile"
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--primary)',
                  boxShadow: 'var(--shadow-glow)'
                }}
              />
            ) : (
              <div 
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-glow)',
                  border: '2px solid var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  boxShadow: 'var(--shadow-glow)'
                }}
              >
                {userAvatar === 'bull' ? '🐂' :
                 userAvatar === 'bear' ? '🐻' :
                 userAvatar === 'trader' ? '👨‍💻' :
                 userAvatar === 'gold' ? '🏆' :
                 userAvatar === 'coin' ? '🪙' :
                 userAvatar === 'clock' ? '⏱️' :
                 userAvatar === 'rocket' ? '🚀' :
                 userAvatar === 'shield' ? '🛡️' : '👨‍💻'}
              </div>
            )}
            {isCustomAvatar && (
              <span 
                style={{ 
                  position: 'absolute', 
                  bottom: '-2px', 
                  right: '-2px', 
                  fontSize: '0.9rem',
                  background: 'var(--bg-card)',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                👤
              </span>
            )}
          </div>

          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', margin: 0 }}>
              Welcome back, {userName || 'Sachin'}!
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '4px', marginBottom: 0 }}>
              Ready for your cognitive trading audit? Track setups, emotions, and broker statements all in one place.
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Highlighted Big Financial Year Badge */}
          <div 
            style={{
              background: 'linear-gradient(135deg, var(--primary-glow) 0%, rgba(59, 130, 246, 0.04) 100%)',
              border: '1.5px solid var(--primary)',
              padding: '6px 16px',
              borderRadius: '10px',
              textAlign: 'center',
              minWidth: '120px',
              boxShadow: '0 4px 10px rgba(59, 130, 246, 0.08)'
            }}
          >
            <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 650 }}>
              Active Statement
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 850, color: 'var(--primary)', letterSpacing: '-0.02em', marginTop: '2px' }}>
              {selectedFY}
            </div>
          </div>
          {/* Carry-Forward button removed and shifted to Trader Settings */}
        </div>
      </div>

      {/* Portfolio Selector Control Bar */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '12px 20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Briefcase size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            {showCombined ? 'Combined Wealth View (Trading + Delivery Investments)' : 'Active Trading Account View'}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Broker Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 550 }}>Broker:</span>
            <select
              value={selectedBroker}
              onChange={(e) => setSelectedBroker(e.target.value)}
              className="form-select"
              style={{
                padding: '4px 10px',
                fontSize: '0.78rem',
                height: '32px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-main)',
                cursor: 'pointer',
                minWidth: '120px'
              }}
            >
              <option value="All">All Brokers</option>
              {activeBrokers.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Active FY Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 550 }}>Active FY:</span>
            <span className="badge badge-primary-subtle" style={{ fontSize: '0.78rem', fontWeight: 650, padding: '3px 8px' }}>
              {selectedFY}
            </span>
          </div>

          {/* Eyeball Toggle Button */}
          <button 
            onClick={togglePnlVisibility}
            className="btn btn-secondary"
            style={{ 
              padding: '6px 12px', 
              fontSize: '0.78rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-main)'
            }}
            title={isPnlVisible ? "Hide P&L Numbers" : "Show P&L Numbers"}
          >
            {isPnlVisible ? <EyeOff size={16} /> : <Eye size={16} color="var(--primary)" />}
            <span>{isPnlVisible ? 'Hide P&L' : 'Show P&L'}</span>
          </button>

          <button 
            onClick={() => setShowCombined(!showCombined)}
            className="btn btn-secondary"
            style={{ 
              padding: '6px 12px', 
              fontSize: '0.78rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              border: showCombined ? '1px solid var(--border-color-active)' : '1px solid var(--border-color)',
              background: showCombined ? 'var(--primary-glow)' : 'transparent',
              color: showCombined ? 'var(--primary)' : 'var(--text-main)'
            }}
          >
            {showCombined ? <ToggleRight size={18} color="var(--primary)" /> : <ToggleLeft size={18} />}
            <span>Combined View</span>
          </button>
        </div>
      </div>



      {/* Grid 1: Key Performance Indicators (Row 1 - 5 Columns) */}
      <div className="metrics-grid">
        {/* KPI 1: Realized Net P&L */}
        <div className={`glass-card metric-card metric-card-large ${displayNetPnL >= 0 ? 'glow-green' : 'glow-red'}`} style={{ minHeight: '84px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%', gap: '8px' }}>
            {/* Left Part: Net P&L Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <div className="metric-title" style={{ margin: 0, fontSize: '0.74rem' }}>
                <IndianRupee size={13} style={{ color: displayNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }} />
                <span>{showCombined ? 'Combined Wealth P&L' : 'Net Realized P&L'}</span>
                {showCombined && (
                  <span className="badge badge-win" style={{ fontSize: '0.52rem', padding: '1px 4px', textTransform: 'none', marginLeft: '4px' }}>
                    Combined
                  </span>
                )}
              </div>
              <div 
                className="metric-value" 
                style={{ color: displayNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontSize: '1.75rem', margin: 0, display: 'flex', alignItems: 'baseline', gap: '4px' }}
              >
                {isPnlVisible ? formatCurrency(displayNetPnL) : '••••'}
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: displayNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                  ({displayNetPnL >= 0 ? '+' : ''}{showCombined ? combinedReturnPct.toFixed(1) : tradingReturnPct.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Right Part: Detailed Breakdown Items */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
              {!showCombined ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.01em' }}>GROSS P&L</span>
                    <strong style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                      {isPnlVisible ? formatCurrency(totalGrossPnL) : '••••'}
                    </strong>
                  </div>
                  <div style={{ width: '1px', height: '16px', background: 'var(--border-color)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.01em' }}>BROKERAGE</span>
                    <strong style={{ fontSize: '0.76rem', color: 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                      {isPnlVisible ? formatCurrency(totalBrokerage) : '••••'}
                    </strong>
                  </div>
                  <div style={{ width: '1px', height: '16px', background: 'var(--border-color)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.01em' }}>TAXES & FEES</span>
                    <strong style={{ fontSize: '0.76rem', color: 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                      {isPnlVisible ? formatCurrency(totalTaxes) : '••••'}
                    </strong>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.01em' }}>TRADING NET</span>
                    <strong style={{ fontSize: '0.76rem', color: totalNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                      {isPnlVisible ? formatCurrency(totalNetPnL) : '••••'}
                    </strong>
                  </div>
                  <div style={{ width: '1px', height: '16px', background: 'var(--border-color)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.01em' }}>INV. RETURNS</span>
                    <strong style={{ fontSize: '0.76rem', color: totalInvReturns >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                      {isPnlVisible ? formatCurrency(totalInvReturns) : '••••'}
                    </strong>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* KPI 2: Success Rate */}
        <div className="glass-card metric-card">
          <div className="metric-title">
            <Percent size={16} color="var(--primary)" />
            <span>Success Rate</span>
          </div>
          <div>
            <div className="metric-value text-white">
              {winRate.toFixed(1)}%
            </div>
            <div className="metric-subtext">
              {winningTrades.length} Green / {losingTrades.length} Red (Total: {totalTrades})
            </div>
          </div>
        </div>

        {/* KPI 3: Options Scalping Stats */}
        <div className="glass-card metric-card">
          <div className="metric-title">
            <Clock size={16} color="#fb7185" />
            <span>Avg hold time / Leakage</span>
          </div>
          <div>
            <div className="metric-value text-white" style={{ fontSize: '1.45rem' }}>
              <span>{avgOptionDuration.toFixed(1)}m</span>
              <span style={{ color: 'var(--text-dim)', margin: '0 8px' }}>/</span>
              <span style={{ color: brokerageLeakage > 20 ? 'var(--color-loss)' : 'var(--color-win)' }}>{brokerageLeakage.toFixed(0)}%</span>
            </div>
            <div className="metric-subtext">
              Avg. scalp hold / Profit leaked to charges
            </div>
          </div>
        </div>

        {/* KPI 4: Sharpe & Risk Ratio */}
        <div className="glass-card metric-card">
          <div className="metric-title">
            <Scale size={16} color="#fb923c" />
            <span>Sharpe & Drawdown</span>
          </div>
          <div>
            <div className="metric-value text-white" style={{ fontSize: '1.45rem' }}>
              <span>{sharpe.toFixed(2)}</span>
              <span style={{ color: 'var(--text-dim)', margin: '0 8px' }}>/</span>
              <span style={{ color: 'var(--color-loss)' }}>-{maxDDPct.toFixed(1)}%</span>
            </div>
            <div className="metric-subtext">
              Sharpe ratio / Max portfolio drawdown %
            </div>
          </div>
        </div>
      </div>

      {/* Grid 2: Key Performance Indicators (Row 2 - 6 Columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '16px' }}>
        {/* Metric 1: Profit Factor */}
        <div className="glass-card metric-card">
          <div className="metric-title">
            <Scale size={16} color="var(--primary)" />
            <span>Profit Factor</span>
          </div>
          <div>
            <div className="metric-value text-white">
              {profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}
            </div>
            <div className="metric-subtext">
              Gross Win / Gross Loss ratio. &gt; 1.5 is healthy
            </div>
          </div>
        </div>

        {/* Metric 2: Expectancy */}
        <div className="glass-card metric-card">
          <div className="metric-title">
            <Award size={16} color="#34d399" />
            <span>Expectancy</span>
          </div>
          <div>
            <div className="metric-value" style={{ color: expectancy >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
              {isPnlVisible ? formatCurrency(expectancy) : '••••'}
            </div>
            <div className="metric-subtext">
              Expected net return per trade executed
            </div>
          </div>
        </div>

        {/* Metric 3: Max Drawdown */}
        <div className="glass-card metric-card">
          <div className="metric-title">
            <TrendingDown size={16} color="var(--color-loss)" />
            <span>Peak Drawdown</span>
          </div>
          <div>
            <div className="metric-value" style={{ color: 'var(--color-loss)' }}>
              {isPnlVisible ? formatCurrency(maxDrawdown) : '••••'}
            </div>
            <div className="metric-subtext">
              Max peak-to-trough drop in capital
            </div>
          </div>
        </div>

        {/* Metric 4: Max Win/Loss Streak */}
        <div className="glass-card metric-card">
          <div className="metric-title">
            <Flame size={16} color="#fb923c" />
            <span>Streak Analysis</span>
          </div>
          <div>
            <div className="metric-value text-white" style={{ fontSize: '1.45rem' }}>
              <span style={{ color: 'var(--color-win)' }}>{maxWinStreak}W</span>
              <span style={{ color: 'var(--text-dim)', margin: '0 8px' }}>/</span>
              <span style={{ color: 'var(--color-loss)' }}>{maxLossStreak}L</span>
            </div>
            <div className="metric-subtext">
              Consecutive wins vs consecutive losses
            </div>
          </div>
        </div>

        {/* Metric 5: Best & Worst Days Card */}
        <div className="glass-card metric-card">
          <div className="metric-title" style={{ color: 'var(--text-muted)' }}>
            <span>🏆 Best / Worst Days</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '2px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '4px' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>🟩 BEST DAY</span>
              <strong style={{ fontSize: '0.72rem', color: 'var(--color-win)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                {bestDay.pnl > 0 ? `${bestDay.date} (${isPnlVisible ? formatCurrency(bestDay.pnl) : '••••'})` : 'N/A'}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '4px' }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>🟥 WORST DAY</span>
              <strong style={{ fontSize: '0.72rem', color: 'var(--color-loss)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                {worstDay.pnl < 0 ? `${worstDay.date} (${isPnlVisible ? formatCurrency(worstDay.pnl) : '••••'})` : 'N/A'}
              </strong>
            </div>
          </div>
        </div>

        {/* KPI 5: Trade Volume Averages */}
        <div className="glass-card metric-card">
          <div className="metric-title">
            <TrendingUp size={16} color="var(--primary)" />
            <span>Avg Trades (D/W/M)</span>
          </div>
          <div>
            <div className="metric-value text-white" style={{ fontSize: '1.38rem', fontFamily: 'var(--font-mono)' }}>
              {avgTradesPerDay.toFixed(1)} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>/</span> {avgTradesPerWeek.toFixed(1)} <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>/</span> {avgTradesPerMonth.toFixed(1)}
            </div>
            <div className="metric-subtext">
              Daily / Weekly / Monthly averages
            </div>
          </div>
        </div>
      </div>

      {/* Equity Curve Chart */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '14px' }}>
        {/* Header controls layout matching the premium design */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(['1M', '3M', '6M', '1Y', 'All'] as const).map((range) => {
              const stat = buttonStats[range];
              const isSelected = timeRange === range;
              const isLoss = stat.pnl < 0;
              const label = range === 'All' ? 'All Time' : range.toLowerCase();
              const sign = stat.pnl >= 0 ? '+' : '';
              
              // Color configuration
              const activeColor = isLoss ? '#ff453a' : '#76c73c';
              const activeBg = isLoss ? 'rgba(255, 69, 58, 0.08)' : 'rgba(118, 199, 60, 0.08)';
              
              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 650,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: isSelected ? `1.5px solid ${activeColor}` : '1.5px solid rgba(255, 255, 255, 0.06)',
                    background: isSelected ? activeBg : 'rgba(255, 255, 255, 0.02)',
                    color: isSelected ? activeColor : 'var(--text-dim)',
                  }}
                >
                  {label} <span style={{ marginLeft: '4px', fontSize: '0.72rem', color: isLoss ? '#ff453a' : '#76c73c' }}>{sign}{stat.pct.toFixed(2)}%</span>
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
              <span style={{ height: '3px', width: '20px', background: '#76c73c', borderRadius: '2px', display: 'inline-block' }}></span>
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
                  <stop offset="5%" stopColor="#76c73c" stopOpacity={0.18}/>
                  <stop offset="95%" stopColor="#76c73c" stopOpacity={0.01}/>
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
                stroke="#76c73c" 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#colorGreenTrading)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid 2: Return Periods & Consistency Streaks */}
      <div className="grid-2col-12-1" style={{ marginBottom: '14px' }}>
        
        {/* Card 1: Performance Returns Duration */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarRange size={16} color="var(--primary)" />
            Returns Breakdown
          </h3>
          <div className="grid-2col-equal-small" style={{ gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.015)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>1 Month Return</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px', color: m1.pnl >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                {isPnlVisible ? formatCurrency(m1.pnl) : '••••'} ({m1.pct.toFixed(1)}%)
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.015)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>3 Months Return</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px', color: m3.pnl >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                {isPnlVisible ? formatCurrency(m3.pnl) : '••••'} ({m3.pct.toFixed(1)}%)
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.015)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>All Time P&L</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px', color: totalNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                {isPnlVisible ? formatCurrency(totalNetPnL) : '••••'} ({allTimePct.toFixed(1)}%)
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.015)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Annualized CAGR</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px', color: cagr >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                {cagr.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Consistency & Streaks */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} color="var(--color-win)" />
              Consistency Audit
            </h3>
            
            <div className="grid-2col-equal-small" style={{ gap: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Trading Days Win %</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-win)', marginTop: '4px' }}>
                  {winDaysPct.toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Total Trades</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                  {totalTrades}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Flame size={12} color="var(--color-win)" /> Max Win Streak: <strong>{maxConsecWins}</strong>
              </span>
              <span>Max Loss Streak: <strong>{maxConsecLosses}</strong></span>
            </div>
            
            {/* Visual Streaks Split Progress Bar */}
            <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <div 
                style={{ 
                  flex: maxConsecWins || 1, 
                  background: 'linear-gradient(90deg, #10b981 0%, #34d399 100%)', 
                  transition: 'all 0.3s ease' 
                }} 
              />
              <div 
                style={{ 
                  flex: maxConsecLosses || 1, 
                  background: 'linear-gradient(90deg, #f87171 0%, #ef4444 100%)', 
                  transition: 'all 0.3s ease' 
                }} 
              />
            </div>
          </div>
        </div>

      </div>

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
            <CalendarRange size={20} color="var(--primary)" />
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
          </div>
        </div>

        {/* Calendar Heatmap Grid wrapper */}
        <div style={{ overflowX: 'auto', paddingBottom: '4px', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: '780px' }}>
            {/* Column 1: Weekday Labels */}
            <div style={{ 
              display: 'grid', 
              gridTemplateRows: 'repeat(5, 12px)', 
              gap: '4px',
              marginRight: '12px',
              marginTop: '22px', // offsets down to align with rows (header offset)
              userSelect: 'none'
            }}>
              <div style={{ gridRowStart: 1, fontSize: '0.62rem', color: 'var(--text-dim)', alignSelf: 'center', height: '12px', display: 'flex', alignItems: 'center' }}>Mon</div>
              <div style={{ gridRowStart: 2, fontSize: '0.62rem', color: 'var(--text-dim)', alignSelf: 'center', height: '12px', display: 'flex', alignItems: 'center' }}>Tue</div>
              <div style={{ gridRowStart: 3, fontSize: '0.62rem', color: 'var(--text-dim)', alignSelf: 'center', height: '12px', display: 'flex', alignItems: 'center' }}>Wed</div>
              <div style={{ gridRowStart: 4, fontSize: '0.62rem', color: 'var(--text-dim)', alignSelf: 'center', height: '12px', display: 'flex', alignItems: 'center' }}>Thu</div>
              <div style={{ gridRowStart: 5, fontSize: '0.62rem', color: 'var(--text-dim)', alignSelf: 'center', height: '12px', display: 'flex', alignItems: 'center' }}>Fri</div>
            </div>

            {/* Months Row Container with Gaps */}
            <div style={{ display: 'flex', gap: '20px' }}>
              {monthsData.map((m, mIdx) => (
                <div key={mIdx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Month name label */}
                  <div style={{ 
                    fontSize: '0.68rem', 
                    color: 'var(--text-dim)', 
                    textAlign: 'left', 
                    fontWeight: 600,
                    userSelect: 'none'
                  }}>
                    {m.name}
                  </div>

                  {/* Monthly grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateRows: 'repeat(5, 12px)',
                    gridAutoFlow: 'column',
                    gap: '4px'
                  }}>
                    {/* Padding cells */}
                    {Array.from({ length: m.startPad }).map((_, idx) => (
                      <div 
                        key={`pad-${idx}`} 
                        style={{ 
                          width: '12px', 
                          height: '12px', 
                          borderRadius: '2px', 
                          background: 'transparent' 
                        }} 
                      />
                    ))}

                    {/* Day cells */}
                    {m.dates.map((dateStr) => {
                      const stats = dailyStats[dateStr];
                      const isNoTrade = noTradeDays.includes(dateStr);
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
                      } else if (isNoTrade) {
                        bgColor = 'rgba(59, 130, 246, 0.25)';
                        border = '1px solid rgba(59, 130, 246, 0.4)';
                        title = `${dateStr}: No-Trade Day (Disciplined)`;
                      }
                      
                      return (
                        <div 
                          key={dateStr}
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '2px',
                            background: bgColor,
                            border: border,
                            cursor: 'pointer',
                            transition: 'transform 0.1s ease'
                          }}
                          className="heatmap-cell"
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



      {/* Card: Broker-wise performance stats */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <Briefcase size={20} color="var(--primary)" />
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

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Win Rate:</span>
                  <strong style={{ color: 'var(--text-main)' }}>{stat.winRate.toFixed(1)}%</strong>
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

      {/* Weekly Trade Review & Retrospective Panel */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarRange size={20} color="var(--primary)" />
              Weekly Performance Retrospective & Coach
            </h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
              Select a week to review performance stats, get AI discipline coach tips, and save retro remarks
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Select Week:</span>
            <select
              value={selectedRetroWeekId}
              onChange={(e) => setSelectedRetroWeekId(e.target.value)}
              className="form-select"
              style={{ width: '220px', height: '32px', padding: '0 8px', fontSize: '0.78rem' }}
            >
              {weeklySummaries.map((w) => (
                <option key={w.weekId} value={w.weekId}>
                  Week {w.weekNum} ({w.formattedRange})
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeRetroWeek ? (
          <div className="grid-2col-13-2">
            {/* Left Column: Weekly Stats Summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Weekly Net P&L</div>
                <div 
                  style={{ 
                    fontSize: '1.25rem', 
                    fontWeight: 800, 
                    fontFamily: 'var(--font-mono)',
                    color: activeRetroWeek.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)',
                    marginTop: '4px'
                  }}
                >
                  {activeRetroWeek.trades.length > 0 ? (
                    <>
                      {activeRetroWeek.netPnL >= 0 ? '+' : ''}
                      {isPnlVisible ? formatCurrency(activeRetroWeek.netPnL) : '••••'}
                    </>
                  ) : (
                    'No trades'
                  )}
                </div>
              </div>

              <div className="grid-2col-equal-small" style={{ gap: '10px' }}>
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Win Rate</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '2px', color: 'var(--text-main)' }}>
                    {activeRetroWeek.trades.length > 0 ? `${activeRetroWeek.winRate.toFixed(0)}%` : '-'}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                    {activeRetroWeek.trades.length} trades
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Emotion</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '2px', color: 'var(--text-main)' }}>
                    {activeRetroWeek.trades.length > 0 ? activeRetroWeek.dominantEmotion : '-'}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                    Dominant mood
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Mistake Penalties</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-loss)', marginTop: '2px' }}>
                  {activeRetroWeek.mistakeCost > 0 ? (
                    isPnlVisible ? `-${formatCurrency(activeRetroWeek.mistakeCost)}` : '-••••'
                  ) : (
                    '₹0 (Perfect Discipline)'
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Retrospective Notes & Coach */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Discipline Coach Alert */}
              <div 
                style={{ 
                  background: 'var(--primary-glow)', 
                  border: '1px solid var(--border-color-active)', 
                  padding: '12px 16px', 
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'start',
                  gap: '8px'
                }}
              >
                <Sparkles size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '3px', color: 'var(--primary)' }}>Discipline Coach Tip:</strong>
                  {getCoachTip(activeRetroWeek.mistakeCost, activeRetroWeek.dominantEmotion)}
                </div>
              </div>

              {/* Remarks textarea */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>My Retrospective Notes & Lessons</label>
                <textarea
                  placeholder="Write notes about what went well, mistakes to avoid next week, mental states, and performance goals..."
                  value={retroNotes}
                  onChange={(e) => setRetroNotes(e.target.value)}
                  className="form-input"
                  style={{ minHeight: '90px', padding: '10px', fontSize: '0.82rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleSaveRetro} style={{ height: '32px', fontSize: '0.78rem' }}>
                  <Save size={13} />
                  <span>Save Retrospective</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
            No trade activity recorded yet in this week range.
          </div>
        )}
      </div>


      {/* Grid 3: Advanced Analytics Charts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Behavioral Audit Grid (Mistake Cost & Discipline Scorecard) */}
        <div className="grid-2col-equal">
          
          {/* Chart: Mistake Cost Analysis */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <AlertTriangle size={20} color="var(--color-loss)" />
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Mistake Financial Leakage Analysis</h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  Total realized losses categorized by identified execution mistakes
                </p>
              </div>
            </div>

            {mistakeData.length > 0 ? (
              <div className="chart-container-medium">
                <ResponsiveContainer>
                  <BarChart data={mistakeData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={11} tickLine={false} />
                    <YAxis stroke="var(--text-dim)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => isPnlVisible ? `₹${value}` : '••••'} />
                    <Tooltip content={<CustomMistakeTooltip />} />
                    <Bar dataKey="loss" radius={[6, 6, 0, 0]}>
                      {mistakeData.map((_entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill="var(--color-loss)" 
                          fillOpacity={0.6 + (0.4 * (mistakeData.length - index) / (mistakeData.length || 1))} 
                          stroke="var(--color-loss)"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px dashed var(--border-color)', height: '230px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                No mistakes tracked. Maintain this discipline!
              </div>
            )}
          </div>

          {/* Discipline Scorecard */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Sparkles size={20} color="var(--primary)" />
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Cognitive Discipline Audit</h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    Behavioral evaluation rating based on execution mistakes
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '10px' }}>
                <div 
                  style={{ 
                    width: '76px', 
                    height: '76px', 
                    borderRadius: '50%', 
                    border: `3px solid ${disciplineInfo.color}`, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    boxShadow: 'var(--shadow-glow)',
                    flexShrink: 0
                  }}
                >
                  <span style={{ fontSize: '1.8rem', fontWeight: 900, color: disciplineInfo.color, lineHeight: 1 }}>
                    {disciplineInfo.grade}
                  </span>
                </div>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 750, color: 'var(--text-main)' }}>
                    {disciplineScore.toFixed(0)}% Rule Compliance
                  </div>
                  <p style={{ fontSize: '0.75rem', color: disciplineInfo.color, fontWeight: 600, marginTop: '2px', margin: 0 }}>
                    {disciplineInfo.desc}
                  </p>
                </div>
              </div>

              {/* Dynamic Compliance Progress Bar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>Checklist Compliance Level</span>
                  <span>{disciplineScore.toFixed(0)}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: 'var(--border-color)', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${disciplineScore}%`, 
                      height: '100%', 
                      borderRadius: '4px', 
                      background: disciplineInfo.color,
                      boxShadow: `0 0 8px ${disciplineInfo.color}`,
                      transition: 'width 0.4s ease'
                    }} 
                  />
                </div>
              </div>

              {/* Dynamic behavioral coaching insight */}
              <div 
                style={{ 
                  marginTop: '16px', 
                  padding: '10px 12px', 
                  borderRadius: '8px', 
                  background: 'rgba(255,255,255,0.02)', 
                  borderLeft: `3.5px solid ${disciplineInfo.color}`,
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)'
                }}
              >
                <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '2px' }}>Audit Feedback:</strong>
                {disciplineScore >= 90 ? (
                  "Outstanding execution! You are strictly sticking to your plan. Keep maintaining this checklist discipline before every trade entry."
                ) : disciplineScore >= 75 ? (
                  "Good performance, but minor rule deviations logged. Double check your setup triggers to restrict impulsive executions."
                ) : (
                  "Caution: High mistake rate. Pause trading and review your emotional triggers before you take any more positions."
                )}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.75rem', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Total Trades Audited:</span>
                <strong style={{ color: 'var(--text-main)' }}>{totalTrades}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Trades with Mistakes:</span>
                <strong style={{ color: totalTradesWithMistakes > 0 ? 'var(--color-loss)' : 'var(--color-win)' }}>{totalTradesWithMistakes}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Discipline Grade Standard:</span>
                <strong style={{ color: 'var(--primary)' }}>TradeDiary Discipline Standard</strong>
              </div>
            </div>
          </div>

        </div>

        {/* Dynamic Behavioral & Allocation Insights */}
        <div className="grid-2col-12-1">
          {/* Emotions P&L Impact */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color="var(--primary)" />
              Psychological Mood P&L Impact
            </h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
              Realized net P&L accumulated under different execution mindsets.
            </p>
            <div className="chart-container-medium">
              <ResponsiveContainer>
                <BarChart 
                  data={emotionStatsData} 
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis type="number" stroke="var(--text-dim)" fontSize={10} tickLine={false} tickFormatter={(v) => isPnlVisible ? `₹${Math.round(v)}` : '••••'} />
                  <YAxis dataKey="name" type="category" stroke="var(--text-dim)" fontSize={11} tickLine={false} />
                  <Tooltip 
                    formatter={(value: any) => [isPnlVisible ? `₹${value.toLocaleString('en-IN')}` : '••••', 'Net P&L']}
                    contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                  />
                  <Bar dataKey="netPnL" radius={[0, 4, 4, 0]}>
                    {emotionStatsData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)'} 
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '6px 4px' }}>Execution Mindset</th>
                    <th style={{ padding: '6px 4px', textAlign: 'center' }}>Trades</th>
                    <th style={{ padding: '6px 4px', textAlign: 'center' }}>Win Rate</th>
                    <th style={{ padding: '6px 4px', textAlign: 'right' }}>Net P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {emotionStatsData.map((e) => (
                    <tr key={e.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '8px 4px', fontWeight: 600, color: 'var(--text-main)' }}>
                        {e.name === 'Calm' ? '🧘 Calm & Disciplined' :
                         e.name === 'Greedy' ? '🤑 Greedy' :
                         e.name === 'Fearful' ? '😰 Fearful' :
                         e.name === 'Impatient' ? '⏱️ Impatient' :
                         '😡 Revenge Trading'}
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--text-muted)' }}>{e.count}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: 600, color: e.winRate >= 50 ? 'var(--color-win)' : 'var(--text-muted)' }}>
                        {e.winRate.toFixed(1)}%
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 700, color: e.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                        {isPnlVisible ? formatCurrency(e.netPnL) : '••••'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Asset Allocation or Segment Allocation */}
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={20} color="var(--primary)" />
              {showCombined ? 'Asset Allocation' : 'Trading Volume Allocation'}
            </h3>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '16px' }}>
              {showCombined 
                ? 'Portfolio distribution of ETFs, Government Bonds, and Stocks.' 
                : 'P&L contribution weight across execution segments (Equity, F&O, etc.).'
              }
            </p>
            <div className="chart-container-medium" style={{ position: 'relative' }}>
              {(showCombined ? assetAllocationData : segmentAllocationData).length > 0 ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={showCombined ? assetAllocationData : segmentAllocationData}
                      cx="50%"
                      cy="45%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(showCombined ? assetAllocationData : segmentAllocationData).map((_entry, index) => {
                        const COLORS = ['#007aff', '#34c759', '#ff9500', '#af52de'];
                        return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                      })}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => isPnlVisible ? `₹${value.toLocaleString('en-IN')}` : '••••'}
                      contentStyle={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px', color: 'var(--text-main)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '0.72rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem', border: '1px dashed var(--border-color)', borderRadius: '8px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  No allocation data available. Log trades or buy assets to view chart.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
