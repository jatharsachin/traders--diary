import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { TradingCalendar } from './components/TradingCalendar';
import { TradeTable } from './components/TradeTable';
import { StrategyManager } from './components/StrategyManager';
import { Ledger } from './components/Ledger';
import { AccountManager } from './components/AccountManager';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { TradeLogger } from './components/TradeLogger';
import { AuthScreen } from './components/AuthScreen';
import { Taxation } from './components/Taxation';
import { DayBook } from './components/DayBook';
import { useTradeStore } from './store/useTradeStore';
import { BROKER_LOGOS } from './utils/brandLogos';
import { Plus, LayoutDashboard, Calendar, History, Compass, Receipt, Briefcase, ShieldCheck, Bell, LogOut, Sun, Moon, Percent, BookOpen } from 'lucide-react';
import { isSupabaseConfigured, getSupabaseClient } from './utils/supabaseClient';
import logoImg from './assets/tradediary_logo.png';
import { FINANCIAL_YEARS } from './utils/fyHelper';
import { parseKotakNeoText, matchExecutionsIntoTrades } from './utils/statementParser';

type Tab = 'dashboard' | 'daybook' | 'calendar' | 'logs' | 'strategies' | 'ledger' | 'account' | 'taxation';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);
  const [editTradeId, setEditTradeId] = useState<string | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isRecoveryActive, setIsRecoveryActive] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<string>('Combined');

  // Live clock and Nifty live index ticker
  const [liveTime, setLiveTime] = useState<string>('');
  const [niftyPrice, setNiftyPrice] = useState<number>(24056.00);
  const [niftyChange, setNiftyChange] = useState<number>(34.35);
  const [niftyFlash, setNiftyFlash] = useState<'up' | 'down' | null>(null);

  const isMarketOpen = (): boolean => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utc + (3600000 * 5.5));
    const day = istTime.getDay();
    if (day === 0 || day === 6) return false;
    const hours = istTime.getHours();
    const minutes = istTime.getMinutes();
    const currentMinutes = hours * 60 + minutes;
    const startMinutes = 9 * 60 + 15;
    const endMinutes = 15 * 60 + 30;
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  };

  const fetchLiveNiftyPrice = async () => {
    const ticker = '^NSEI';
    const urls = [
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`,
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`
    ];
    const proxies = [
      (targetUrl: string) => `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
      (targetUrl: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`
    ];

    for (const url of urls) {
      for (const getProxyUrl of proxies) {
        try {
          const proxyUrl = getProxyUrl(url);
          const response = await fetch(proxyUrl);
          if (!response.ok) continue;
          const json = await response.json();
          let data = json && json.contents ? JSON.parse(json.contents) : json;

          const quoteResult = data?.quoteResponse?.result?.[0];
          const quotePrice = quoteResult?.regularMarketPrice;
          const quoteChange = quoteResult?.regularMarketChange;
          if (quotePrice && typeof quotePrice === 'number') {
            return { price: quotePrice, change: quoteChange || 0 };
          }

          const meta = data?.chart?.result?.[0]?.meta;
          const chartPrice = meta?.regularMarketPrice;
          const chartChange = meta ? (meta.regularMarketPrice - meta.previousClose) : 0;
          if (chartPrice && typeof chartPrice === 'number') {
            return { price: chartPrice, change: chartChange };
          }
        } catch (e) {
          // Silent fallback and try next proxy/url
        }
      }
    }
    return null;
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTime(now.toLocaleString('en-IN', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: true 
      }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);

    const updateNiftyPrice = async () => {
      const live = await fetchLiveNiftyPrice();
      if (live) {
        setNiftyPrice(prev => {
          if (prev !== live.price) {
            setNiftyFlash(live.price > prev ? 'up' : 'down');
            setTimeout(() => setNiftyFlash(null), 800);
          }
          return live.price;
        });
        setNiftyChange(live.change);
      }
    };

    updateNiftyPrice();
    // Poll every 15 seconds during market hours, or every 2 minutes in off hours
    const niftyInterval = setInterval(() => {
      updateNiftyPrice();
    }, isMarketOpen() ? 15000 : 120000);

    return () => {
      clearInterval(timer);
      clearInterval(niftyInterval);
    };
  }, []);


  const { 
    trades, 
    baseCapital, 
    theme, 
    toggleTheme,
    capitalAdjustments,
    sessionUser,
    setSessionUser,
    signOutUser,
    loadUserData,
    isPnlVisible,
    userName,
    userAvatar,
    brokerAccounts,
    selectedFY,
    setSelectedFY,
    investments,
    syncAllInvestmentPrices,
    bulkImportTrades
  } = useTradeStore();

  const filteredTrades = activeAccountId === 'Combined'
    ? trades
    : trades.filter((t) => t.brokerAccountId === activeAccountId);

  const filteredAdjustments = activeAccountId === 'Combined'
    ? capitalAdjustments
    : capitalAdjustments.filter((a) => a.brokerAccountId === activeAccountId);

  const filteredBaseCapital = activeAccountId === 'Combined'
    ? baseCapital
    : (brokerAccounts.find((a) => a.id === activeAccountId)?.startingCapital || 0);

  const totalNetPnL = filteredTrades.reduce((acc, t) => acc + t.netPnL, 0);
  const totalDeposits = filteredAdjustments.filter((a) => a.type === 'DEPOSIT').reduce((acc, a) => acc + a.amount, 0);
  const totalWithdrawals = filteredAdjustments.filter((a) => a.type === 'WITHDRAWAL').reduce((acc, a) => acc + a.amount, 0);
  const currentCapital = filteredBaseCapital + totalNetPnL + totalDeposits - totalWithdrawals;


  // Dynamic Alert / Notification Center calculations
  const getDynamicNotifications = () => {
    const alertsList = [];
    
    // 1. Overtrading Warning (today trades count > 5)
    const todayStr = new Date().toISOString().split('T')[0];
    const tradesToday = trades.filter(t => t.date === todayStr);
    if (tradesToday.length > 5) {
      alertsList.push({
        id: 'overtrading',
        type: 'danger' as const,
        title: 'Overtrading Alert',
        message: `You have taken ${tradesToday.length} trades today. Trading >5 times increases emotional error risk.`,
        timestamp: 'Today'
      });
    }

    // 2. Revenge Trading Warning (consecutive loss streak >= 3)
    const sortedNewest = [...trades].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.entryTime}`);
      const dateB = new Date(`${b.date}T${b.entryTime}`);
      return dateB.getTime() - dateA.getTime();
    });
    
    let consecutiveLosses = 0;
    for (const t of sortedNewest) {
      if (t.netPnL < 0) {
        consecutiveLosses++;
      } else if (t.netPnL > 0) {
        break;
      }
    }
    
    if (consecutiveLosses >= 3) {
      alertsList.push({
        id: 'revenge-trading',
        type: 'danger' as const,
        title: 'Revenge Trading Warning',
        message: `Active streak of ${consecutiveLosses} consecutive losing trades. Take a step back to reset your mindset.`,
        timestamp: 'Active Streak'
      });
    }

    // 3. Discipline Leak Warning (mistake cost in last 7 days > 5000)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentTrades = trades.filter(t => new Date(t.date) >= sevenDaysAgo);
    const recentMistakeCost = recentTrades.reduce((acc, t) => (t.netPnL < 0 && t.mistake !== 'None' ? acc + Math.abs(t.netPnL) : acc), 0);
    
    if (recentMistakeCost > 5000) {
      alertsList.push({
        id: 'mistake-cost',
        type: 'warning' as const,
        title: 'Discipline Leak Detected',
        message: `Execution mistake penalties totaled ₹${recentMistakeCost.toLocaleString('en-IN')} this week. Audit your rules!`,
        timestamp: 'Last 7 Days'
      });
    }

    // 4. NSE Market Holiday Reminder (tomorrow is holiday)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const holidayNames: Record<string, string> = {
      '2026-01-26': 'Republic Day',
      '2026-03-06': 'Mahashivratri',
      '2026-03-16': 'Holi',
      '2026-04-03': 'Good Friday',
      '2026-04-14': 'Ambedkar Jayanti',
      '2026-05-01': 'Maharashtra Day',
      '2026-05-25': 'Eid-ul-Adha',
      '2026-10-02': 'Gandhi Jayanti',
      '2026-10-22': 'Dussehra',
      '2026-11-10': 'Diwali',
      '2026-12-25': 'Christmas',
    };
    
    if (holidayNames[tomorrowStr]) {
      alertsList.push({
        id: 'nse-holiday',
        type: 'info' as const,
        title: 'NSE Market Holiday Tomorrow',
        message: `Tomorrow is a scheduled market holiday for ${holidayNames[tomorrowStr]}. Rest and recharge!`,
        timestamp: 'NSE Calendar'
      });
    }

    return alertsList;
  };

  const notifications = getDynamicNotifications();

  // Setup Supabase Auth Session Listener
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    // Check active session
    client.auth.getSession().then(({ data }: any) => {
      const session = data?.session;
      if (session?.user) {
        setSessionUser(session.user);
        loadUserData(session.user.id);
      } else {
        setSessionUser(null);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = client.auth.onAuthStateChange((event: any, session: any) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryActive(true);
      } else if (session?.user) {
        setSessionUser(session.user);
        loadUserData(session.user.id);
      } else {
        setSessionUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSessionUser, loadUserData]);

  // Centralized Investments Price Sync on Startup
  useEffect(() => {
    if (investments.some(inv => inv.status === 'ACTIVE' || !(inv as any).status)) {
      const triggerPriceSync = async () => {
        try {
          const { updatedCount, failedSymbols } = await syncAllInvestmentPrices();
          if (updatedCount > 0) {
            console.log(`Auto-synchronized ${updatedCount} investment prices.`);
          }
          if (failedSymbols.length > 0) {
            console.warn(`LTP sync failed for symbols: ${failedSymbols.join(', ')}`);
          }
        } catch (err) {
          console.error('Failed to auto-sync investment prices on startup:', err);
        }
      };
      triggerPriceSync();
    }
  }, [syncAllInvestmentPrices]);

  // Handle HTML Class and data-theme attributes for premium themes
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Auto-inject Q4 FY25-26 Kotak Neo statement data on first load/login
  useEffect(() => {
    const flag = localStorage.getItem('kotak_neo_auto_injected_q4_2025_26');
    if (!flag && sessionUser) {
      const rawText = `05/03/2026\t09:41:50\t09:41:50\tCoal India Ltd\tINE522F01014\tNSE\tKotak Neo\tSell\tCash\t160\t448.55\t71768\t2.2\t10\t3.27\t15.47\t8.96
05/03/2026\t09:34:08\t09:34:08\tCoal India Ltd\tINE522F01014\tNSE\tKotak Neo\tBuy\tCash\t160\t452.397\t72383.5\t2.2\t10\t3.3\t15.52\t9.04
02/03/2026\t14:58:44\t14:58:44\tNippon Ir\tINE204KB0101\tNSE\tKotak Neo\tBuy\tCash\t439\t107.07\t47003.7\t4.48\t23.49\t8.32\t36.29\t0
02/03/2026\t14:56:51\t14:56:51\tNippon Ir\tINE204KB0101\tNSE\tKotak Neo\tSell\tCash\t91\t516.888\t47036.8\t4.5\t23.52\t1.49\t29.51\t0
02/03/2026\t14:11:38\t14:11:38\tICICI Pru\tINF109KC0101\tNSE\tKotak Neo\tBuy\tCash\t74\t285.3\t21112.2\t2.02\t10.56\t3.84\t16.42\t0
02/03/2026\t10:49:43\t10:49:43\tHindusta\tINE267A01025\tNSE\tKotak Neo\tSell\tCash\t80\t615\t49200\t2.08\t10\t2.3\t14.38\t6.15
02/03/2026\t10:14:42\t10:14:42\tMulti Cor\tINE745G01035\tNSE\tKotak Neo\tSell\tCash\t20\t2500.9\t50018\t2.08\t10\t2.33\t14.41\t6.3
02/03/2026\t09:47:36\t09:47:36\tMulti Cor\tINE745G01035\tNSE\tKotak Neo\tBuy\tCash\t20\t2522.8\t50456\t2.1\t10\t2.36\t14.46\t6.36
02/03/2026\t09:32:14\t09:32:14\tHindusta\tINE267A01025\tNSE\tKotak Neo\tBuy\tCash\t80\t619\t49520\t2.08\t10\t2.32\t14.4\t6.19
26/02/2026\t11:46:00\t11:46:00\tAurobind\tINE406A01037\tNSE\tKotak Neo\tBuy\tCash\t2\t1227.9\t2455.8\t0.24\t1.23\t0.11\t1.58\t0.3
26/02/2026\t11:45:52\t11:45:52\tAurobind\tINE406A01037\tNSE\tKotak Neo\tSell\tCash\t1\t1227.8\t1227.8\t0.12\t0.61\t0.05\t0.78\t0.15
26/02/2026\t11:45:30\t11:45:30\tAurobind\tINE406A01037\tNSE\tKotak Neo\tSell\tCash\t1\t1227.8\t1227.8\t0.12\t0.61\t0.05\t0.78\t0.15
26/02/2026\t11:37:22\t11:35:52\tLupin Ltd\tINE326A01039\tNSE\tKotak Neo\tSell\tCash\t38\t2314.7\t87958.6\t2.3\t10\t4.13\t16.43\t11.11
26/02/2026\t10:49:13\t10:49:13\tAurobind\tINE406A01037\tNSE\tKotak Neo\tBuy\tCash\t33\t1229.1\t40560.3\t2.02\t10\t1.89\t13.91\t5.07
26/02/2026\t09:52:50\t09:52:49\tAurobind\tINE406A01037\tNSE\tKotak Neo\tBuy\tCash\t33\t1249\t41217\t2.04\t10\t1.96\t14\t5.17
26/02/2026\t09:27:03\t09:27:03\tLupin Ltd\tINE326A01039\tNSE\tKotak Neo\tBuy\tCash\t38\t2300.7\t87426.6\t2.3\t10\t4.12\t16.42\t11.05
19/02/2026\t11:26:18\t11:26:18\tRBL Bank\tINE976G01028\tNSE\tKotak Neo\tBuy\tCash\t120\t339.066\t40687.9\t1.98\t10\t1.88\t13.86\t5.07
19/02/2026\t11:12:52\t09:30:11\tRBL Bank\tINE976G01028\tNSE\tKotak Neo\tSell\tCash\t120\t339.5\t40740\t2.02\t10\t1.9\t13.92\t5.09
19/02/2026\t10:14:31\t10:14:31\tRBL Bank\tINE976G01028\tNSE\tKotak Neo\tBuy\tCash\t120\t330.25\t39630\t2.02\t10\t1.85\t13.87\t4.95
19/02/2026\t09:23:27\t09:23:27\tRBL Bank\tINE976G01028\tNSE\tKotak Neo\tSell\tCash\t120\t333.6\t40032\t2.1\t10\t1.9\t14\t5.03
18/02/2026\t10:43:24\t10:43:24\tWaaree E\tINE377N01021\tNSE\tKotak Neo\tBuy\tCash\t14\t2956.6\t41392.4\t2.02\t10\t1.92\t13.94\t5.17
18/02/2026\t10:42:46\t10:42:45\tWaaree E\tINE377N01021\tNSE\tKotak Neo\tSell\tCash\t1\t2956\t2956\t0.28\t1.48\t0.13\t1.89\t0.36
18/02/2026\t09:49:12\t09:49:08\tWaaree E\tINE377N01021\tNSE\tKotak Neo\tSell\tCash\t13\t2964\t38532\t2.04\t10\t1.81\t13.85\t4.83
18/02/2026\t09:35:59\t09:35:59\tSBI Cards\tINE018E01018\tNSE\tKotak Neo\tBuy\tCash\t70\t786.45\t55051.5\t2.1\t10\t2.57\t14.67\t6.86
18/02/2026\t09:35:12\t09:35:10\tAngel On\tINE732I01013\tNSE\tKotak Neo\tBuy\tCash\t23\t2629.5\t60478.5\t2.14\t10\t2.95\t15.09\t7.37
18/02/2026\t09:30:16\t09:30:06\tAngel On\tINE732I01013\tNSE\tKotak Neo\tSell\tCash\t23\t2651\t60973\t2.16\t10\t2.99\t15.15\t7.44
18/02/2026\t09:26:45\t09:26:45\tSBI Cards\tINE018E01018\tNSE\tKotak Neo\tSell\tCash\t70\t794.05\t55583.5\t2.14\t10\t2.61\t14.75\t6.97
17/02/2026\t10:54:12\t10:54:12\tInfosys Lt\tINE009A01021\tNSE\tKotak Neo\tSell\tCash\t50\t1401\t70050\t2.2\t10\t3.21\t15.41\t8.97
17/02/2026\t09:56:06\t09:56:06\tInfosys Lt\tINE009A01021\tNSE\tKotak Neo\tBuy\tCash\t50\t1408.5\t70425\t2.2\t10\t3.24\t15.44\t9.03
16/02/2026\t15:16:29\t15:16:24\tMulti Cor\tINE745G01035\tNSE\tKotak Neo\tSell\tCash\t20\t2345\t46900\t2.02\t10\t1.96\t13.98\t6.01
16/02/2026\t13:03:25\t13:03:17\tMulti Cor\tINE745G01035\tNSE\tKotak Neo\tBuy\tCash\t20\t2325\t46500\t2.12\t10\t2\t14.12\t5.99
30/01/2026\t10:28:44\t10:28:44\tAmber En\tINE371P01015\tNSE\tKotak Neo\tSell\tCash\t10\t5791\t57910\t0\t0\t2.6\t2.6\t7.11
30/01/2026\t09:26:29\t09:26:29\tAmber En\tINE371P01015\tNSE\tKotak Neo\tSell\tCash\t10\t5641\t56410\t0\t0\t2.53\t2.53\t6.96
30/01/2026\t09:25:30\t09:25:30\tAmber En\tINE371P01015\tNSE\tKotak Neo\tSell\tCash\t10\t5613\t56130\t0\t0\t2.52\t2.52\t6.92
30/01/2026\t09:23:36\t09:23:36\tAmber En\tINE371P01015\tNSE\tKotak Neo\tBuy\tCash\t10\t5638\t56380\t1.3\t0.01\t2.54\t3.85\t7.01
29/01/2026\t12:03:15\t12:03:15\tNational\tINE139A01034\tNSE\tKotak Neo\tSell\tCash\t70\t421\t29519\t0\t0\t1.43\t1.43\t3.5
29/01/2026\t09:31:26\t09:31:26\tNational\tINE139A01034\tNSE\tKotak Neo\tBuy\tCash\t70\t421\t29470\t0.34\t0.01\t1.44\t1.79\t3.5
28/01/2026\t11:30:59\t11:30:59\tMulti Cor\tINE745G01035\tNSE\tKotak Neo\tBuy\tCash\t14\t2558\t35812\t0\t0\t1.63\t1.63\t4.49
28/01/2026\t10:03:23\t10:03:23\tMulti Cor\tINE745G01035\tNSE\tKotak Neo\tSell\tCash\t14\t2562\t35868\t0.42\t0.01\t1.64\t2.07\t4.51
27/01/2026\t13:39:24\t13:39:24\tAdani Ent\tINE423A01024\tNSE\tKotak Neo\tSell\tCash\t10\t1942.3\t19423\t0\t0\t1.11\t1.11\t2.49
27/01/2026\t09:36:04\t09:36:04\tAdani Ent\tINE423A01024\tNSE\tKotak Neo\tBuy\tCash\t10\t1943.37\t19433.7\t0.22\t0.01\t1.12\t1.35\t2.51
21/01/2026\t09:28:22\t09:28:22\tDr Reddy\tINE089A01023\tNSE\tKotak Neo\tSell\tCash\t70\t1183.5\t82845\t0\t0\t4.12\t4.12\t10.46
21/01/2026\t09:23:18\t09:23:18\tDr Reddy\tINE089A01023\tNSE\tKotak Neo\tBuy\tCash\t70\t1192.1\t83447\t0.96\t0.01\t4.16\t5.13\t10.54
20/01/2026\t13:55:55\t13:55:55\tCENTRAL\tIN0020200234\tNSE\tKotak Neo\tBuy\tCash\t9\t16766.2\t150896\t0.86\t0\t4.78\t5.64\t0
20/01/2026\t12:34:02\t12:34:02\tDalmia B\tINE00R701011\tNSE\tKotak Neo\tSell\tCash\t21\t2197.2\t46141.2\t0.24\t0\t2.14\t2.38\t5.99
20/01/2026\t09:23:20\t09:23:20\tDalmia B\tINE00R701011\tNSE\tKotak Neo\tBuy\tCash\t21\t2197.8\t46153.8\t0.28\t0\t2.16\t2.44\t6.01
20/01/2026\t09:21:50\t09:18:56\tNippon Ir\tINE204KB0101\tNSE\tKotak Neo\tBuy\tCash\t91\t548.14\t49880.7\t0.28\t0\t9.06\t9.34\t0
20/01/2026\t09:17:31\t09:17:31\tICICI Pru\tINF109KC0101\tNSE\tKotak Neo\tSell\tCash\t164\t306.58\t50279.1\t0.28\t0.01\t8.73\t9.02\t0
19/01/2026\t13:43:15\t13:43:15\tICICI Pru\tINF109KC0101\tNSE\tKotak Neo\tSell\tCash\t403\t124.3\t50092.9\t0.28\t0\t9.1\t9.38\t0
19/01/2026\t13:26:59\t13:26:59\tNippon Ir\tINE204KB0101\tNSE\tKotak Neo\tSell\tCash\t179\t280\t50120\t0.28\t0\t9.15\t9.43\t0
19/01/2026\t10:22:13\t10:22:13\tTech Mah\tINE669C01036\tNSE\tKotak Neo\tSell\tCash\t18\t1712.8\t30830.4\t0\t0\t1.42\t1.42\t3.97
19/01/2026\t09:22:09\t09:22:09\tTech Mah\tINE669C01036\tNSE\tKotak Neo\tBuy\tCash\t18\t1730\t31140\t0.36\t0.01\t1.47\t1.84\t4.03`;

      try {
        const executions = parseKotakNeoText(rawText);
        const matched = matchExecutionsIntoTrades(executions);
        bulkImportTrades(matched, false);
        localStorage.setItem('kotak_neo_auto_injected_q4_2025_26', 'true');
        console.log("Successfully auto-injected Kotak Neo statement trades!");
      } catch (err) {
        console.error("Auto injection failed:", err);
      }
    }
  }, [sessionUser, bulkImportTrades]);

  const handleEditTrade = (id: string) => {
    setEditTradeId(id);
    setIsLoggerOpen(true);
  };

  const handleNewTrade = () => {
    setEditTradeId(null);
    setIsLoggerOpen(true);
  };

  const handleCloseLogger = () => {
    setIsLoggerOpen(false);
    setEditTradeId(null);
  };

  // Auth gate blocking access if not authenticated OR if recovery is active
  if (isRecoveryActive) {
    return <AuthScreen recoveryMode={true} onRecoveryComplete={() => setIsRecoveryActive(false)} />;
  }

  if (!sessionUser) {
    return <AuthScreen />;
  }

  return (
    <div className="app-container">
      <div className="sticky-header-container">
      {/* Header Bar */}
      <header className="app-header" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'stretch' }}>
        {/* Row 1: Identity & App Settings */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            {/* macOS Traffic Lights */}
            <div className="mac-traffic-lights">
              <span className="mac-dot mac-close"></span>
              <span className="mac-dot mac-minimize"></span>
              <span className="mac-dot mac-maximize"></span>
            </div>

            <img 
              src={logoImg} 
              alt="TradeDiary Pro Logo" 
              style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '10px', 
                objectFit: 'cover',
                border: '1.5px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)' 
              }} 
            />

            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                {userName || 'Sachin'}'s Trade Diary
                {isSupabaseConfigured() && (
                  <span 
                    className="badge badge-win" 
                    title="Cloud Status: Connected | Database Sync: Active | SSL Channel: Secured"
                    style={{ 
                      fontSize: '0.58rem', 
                      padding: '2px 6px', 
                      textTransform: 'none', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '3px',
                      cursor: 'help',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      background: 'rgba(16, 185, 129, 0.12)',
                      boxShadow: '0 0 8px rgba(16, 185, 129, 0.2)'
                    }}
                  >
                    <ShieldCheck size={9} /> Sync Linked
                  </span>
                )}
                <select
                  value={selectedFY}
                  onChange={(e) => setSelectedFY(e.target.value)}
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    padding: '4px 12px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#3b82f6',
                    border: '1.5px solid rgba(59, 130, 246, 0.35)',
                    borderRadius: '8px',
                    outline: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s ease'
                  }}
                  className="fy-header-select"
                >
                  {FINANCIAL_YEARS.map((fy) => (
                    <option key={fy} value={fy} style={{ background: 'var(--bg-card)', color: 'var(--text)' }}>
                      {fy}
                    </option>
                  ))}
                </select>
              </h1>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap' }}>
                Advanced stock & options cognitive audit journal
              </p>
            </div>
          </div>

          {/* Theme, Notification, and User Profile Info */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className="btn btn-secondary"
              style={{ 
                width: '48px', 
                height: '48px', 
                padding: 0, 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border-color)'
              }}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <Sun size={16} color="var(--primary)" /> : <Moon size={16} color="var(--primary)" />}
            </button>

            {/* Bell Icon & Notification Center */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="btn btn-secondary"
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  padding: 0, 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  position: 'relative',
                  background: isNotifOpen ? 'var(--primary-glow)' : 'var(--bg-card)',
                  border: isNotifOpen ? '1px solid var(--border-color-active)' : '1.5px solid var(--border-color)'
                }}
                title="Alerts Center"
              >
                <Bell size={16} color={notifications.length > 0 ? 'var(--color-loss)' : 'var(--text-main)'} />
                {notifications.length > 0 && (
                  <span 
                    style={{ 
                      position: 'absolute', 
                      top: '2px', 
                      right: '2px', 
                      background: 'var(--color-loss)', 
                      color: '#fff', 
                      fontSize: '0.62rem', 
                      fontWeight: 'bold',
                      borderRadius: '50%', 
                      width: '15px', 
                      height: '15px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: '0 0 8px var(--color-loss)'
                    }}
                  >
                    {notifications.length}
                  </span>
                )}
              </button>

              {/* Glassmorphic Dropdown Panel */}
              {isNotifOpen && (
                <div 
                  className="glass-card animate-tab-panel"
                  style={{ 
                    position: 'absolute', 
                    right: 0, 
                    top: '56px', 
                    width: '320px', 
                    maxHeight: '400px', 
                    overflowY: 'auto',
                    zIndex: 2000, 
                    padding: '16px',
                    boxShadow: 'var(--shadow-glow)',
                    border: '1.5px solid var(--border-color-active)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>Alerts & Notifications</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{notifications.length} Active</span>
                  </div>

                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div 
                        key={n.id}
                        style={{ 
                          padding: '10px', 
                          borderRadius: '6px', 
                          fontSize: '0.75rem', 
                          borderLeft: `3px solid ${
                            n.type === 'danger' ? 'var(--color-loss)' : 
                            n.type === 'warning' ? '#fb923c' : 'var(--primary)'
                          }`,
                          background: 'rgba(255, 255, 255, 0.015)',
                          border: '1px solid var(--border-color)',
                          borderLeftWidth: '3px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <strong style={{ color: 'var(--text-main)', fontSize: '0.78rem' }}>{n.title}</strong>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>{n.timestamp}</span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', lineHeight: '1.3' }}>{n.message}</p>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                      ✓ No active alerts. Trading discipline is healthy!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User account info & logout action */}
            <div 
              onClick={() => setIsProfileSettingsOpen(true)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                background: 'var(--bg-card)', 
                border: '1.5px solid var(--border-color)', 
                borderRadius: '12px', 
                padding: '6px 12px',
                height: '48px',
                fontSize: '0.92rem',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              title="Open Account & Master Settings"
            >
              <span style={{ display: 'flex', alignItems: 'center', width: '38px', height: '38px', justifyContent: 'center' }}>
                {userAvatar && userAvatar.startsWith('data:image/') ? (
                  <img 
                    src={userAvatar} 
                    alt="Avatar" 
                    style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                ) : (
                  <span style={{ fontSize: '1.9rem' }}>
                    {userAvatar === 'bull' ? '🐂' :
                     userAvatar === 'bear' ? '🐻' :
                     userAvatar === 'trader' ? '👨‍💻' :
                     userAvatar === 'gold' ? '🏆' :
                     userAvatar === 'coin' ? '🪙' :
                     userAvatar === 'clock' ? '⏱️' :
                     userAvatar === 'rocket' ? '🚀' :
                     userAvatar === 'shield' ? '🛡️' : '👨‍💻'}
                  </span>
                )}
              </span>
              <strong style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.92rem' }}>
                {userName || 'Sachin'}
              </strong>
              <span style={{ width: '1px', height: '18px', background: 'var(--border-color)', margin: '0 4px' }}></span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('Are you sure you want to log out of your trading journal?')) {
                    signOutUser();
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-loss)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px'
                }}
                title="Log Out"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Account Context, Capital, Nifty simulated Ticker & Live Clock */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1.5px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
          {/* Account Selector & Capital Balance */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            {/* Global Account Selector Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {(() => {
                const activeAcc = brokerAccounts.find(a => a.id === activeAccountId);
                if (activeAcc) {
                  return (
                    <img 
                      src={BROKER_LOGOS[activeAcc.broker] || BROKER_LOGOS['Other']} 
                      alt={activeAcc.broker} 
                      style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'contain', background: '#fff', padding: '1.5px', border: '1px solid var(--border-color)' }} 
                    />
                  );
                }
                return null;
              })()}
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Active Account:</span>
              <select
                value={activeAccountId}
                onChange={(e) => setActiveAccountId(e.target.value)}
                className="form-select"
                style={{
                  padding: '4px 10px',
                  fontSize: '0.82rem',
                  height: '38px',
                  background: 'var(--bg-card)',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: '10px',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  minWidth: '150px',
                  outline: 'none',
                  fontWeight: 600
                }}
              >
                <option value="Combined">Combined Accounts</option>
                {brokerAccounts.filter(a => a.active).map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.accountName} ({acc.broker})
                  </option>
                ))}
              </select>
            </div>

            {/* Current Capital Balance */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                background: 'var(--bg-card)', 
                border: '1.5px solid var(--border-color)', 
                borderRadius: '10px', 
                padding: '4px 10px',
                height: '38px',
                boxShadow: 'var(--shadow-card)',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Current Capital:</span>
              <span 
                style={{ 
                  fontSize: '0.85rem', 
                  fontWeight: 700, 
                  fontFamily: 'var(--font-mono)',
                  color: totalNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' 
                }}
              >
                ₹{isPnlVisible ? Math.round(currentCapital).toLocaleString('en-IN') : '••••'}
              </span>
            </div>

            {/* Today's Live P&L Badge */}
            {(() => {
              const getTodayNetPnL = () => {
                const todayStr = new Date().toISOString().split('T')[0];
                const todayTrades = filteredTrades.filter(t => t.date === todayStr);
                if (todayTrades.length === 0) return null;
                return todayTrades.reduce((sum, t) => sum + t.netPnL, 0);
              };
              const todayPnL = getTodayNetPnL();
              const isProfit = todayPnL !== null && todayPnL >= 0;

              return (
                 <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    background: 'var(--bg-card)', 
                    border: '1.5px solid var(--border-color)', 
                    borderRadius: '10px', 
                    padding: '4px 10px',
                    height: '38px',
                    boxShadow: 'var(--shadow-card)',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                  title="Realized Net P&L from trades executed today"
                >
                  <span 
                    style={{ 
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      background: todayPnL === null ? '#888' : isProfit ? 'var(--color-win)' : 'var(--color-loss)',
                      boxShadow: todayPnL === null ? 'none' : isProfit ? '0 0 8px var(--color-win)' : '0 0 8px var(--color-loss)',
                      animation: todayPnL === null ? 'none' : 'pulse 2s infinite ease-in-out',
                      transition: 'all 0.3s ease'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Today's P&L:</span>
                  <span 
                    style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: 700, 
                      fontFamily: 'var(--font-mono)',
                      color: todayPnL === null ? 'var(--text-dim)' : isProfit ? 'var(--color-win)' : 'var(--color-loss)' 
                    }}
                  >
                    {todayPnL === null 
                      ? 'No Trades' 
                      : `${isProfit ? '+' : ''}₹${isPnlVisible ? Math.round(todayPnL).toLocaleString('en-IN') : '••••'}`
                    }
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Market Index & Live Clock Ticker */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            {/* Nifty */}
            <div 
              style={{ 
                padding: '4px 10px', 
                background: niftyFlash === 'up' ? 'rgba(16, 185, 129, 0.12)' : niftyFlash === 'down' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.03)', 
                border: niftyFlash === 'up' ? '1.5px solid var(--color-win)' : niftyFlash === 'down' ? '1.5px solid var(--color-loss)' : '1.5px solid var(--border-color)', 
                borderRadius: '10px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                height: '38px',
                transition: 'all 0.3s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <span 
                style={{ 
                  display: 'inline-block', 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  background: isMarketOpen() ? 'var(--color-win)' : 'var(--color-loss)',
                  boxShadow: isMarketOpen() ? '0 0 8px var(--color-win)' : 'none',
                  animation: isMarketOpen() ? 'pulse 1.5s infinite' : 'none'
                }}
                title={isMarketOpen() ? 'Market is LIVE' : 'Market is CLOSED (Off-Market)'}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                NIFTY {isMarketOpen() ? '(LIVE)' : '(OFF)'}:
              </span>
              <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                {niftyPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
              <span 
                style={{ 
                  fontSize: '0.72rem', 
                  color: niftyChange >= 0 ? 'var(--color-win)' : 'var(--color-loss)', 
                  fontWeight: 700, 
                  fontFamily: 'var(--font-mono)' 
                }}
              >
                {niftyChange >= 0 ? '+' : ''}{niftyChange.toFixed(2)}
              </span>
            </div>

            {/* Clock */}
            <div style={{ padding: '4px 10px', background: 'rgba(255, 255, 255, 0.03)', border: '1.5px solid var(--border-color)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', height: '38px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }}></span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                {liveTime || 'Loading...'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Navigation (macOS Segmented control grouped by category) */}
      <nav style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Group 1: Journaling & Tracking */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '4px' }}>Journal & Tracking</span>
            <div className="nav-tab-container" style={{ margin: 0 }}>
              <button 
                onClick={() => setActiveTab('dashboard')} 
                className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <LayoutDashboard size={13} color="#38bdf8" />
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('daybook')} 
                className={`nav-tab ${activeTab === 'daybook' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <BookOpen size={13} color="#60a5fa" />
                Day Book
              </button>
              <button 
                onClick={() => setActiveTab('calendar')} 
                className={`nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Calendar size={13} color="#a855f7" />
                Calendar
              </button>
              <button 
                onClick={() => setActiveTab('logs')} 
                className={`nav-tab ${activeTab === 'logs' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <History size={13} color="#34d399" />
                Logs
              </button>
            </div>
          </div>

          {/* Group 2: Portfolio & Capital */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '4px' }}>Capital & Assets</span>
            <div className="nav-tab-container" style={{ margin: 0 }}>
              <button 
                onClick={() => setActiveTab('ledger')} 
                className={`nav-tab ${activeTab === 'ledger' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Receipt size={13} color="#f59e0b" />
                Ledger
              </button>
              <button 
                onClick={() => setActiveTab('account')} 
                className={`nav-tab ${activeTab === 'account' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Briefcase size={13} color="#3b82f6" />
                Investments
              </button>
            </div>
          </div>

          {/* Group 3: Setup & Taxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '4px' }}>Analysis & Config</span>
            <div className="nav-tab-container" style={{ margin: 0 }}>
              <button 
                onClick={() => setActiveTab('strategies')} 
                className={`nav-tab ${activeTab === 'strategies' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Compass size={13} color="#ec4899" />
                Setups
              </button>
              <button 
                onClick={() => setActiveTab('taxation')} 
                className={`nav-tab ${activeTab === 'taxation' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Percent size={13} color="#f97316" />
                Taxation
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', visibility: 'hidden' }}>&nbsp;</span>
          <button 
            className="btn btn-primary" 
            style={{ 
              height: '38px', 
              padding: '0 20px', 
              borderRadius: '10px', 
              fontSize: '0.85rem', 
              boxShadow: '0 4px 12px var(--primary-glow)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }} 
            onClick={handleNewTrade}
          >
            <Plus size={15} />
            <span>Log Trade</span>
          </button>
        </div>
      </nav>
    </div>

      {/* Main Tab Render Panels */}
      <main style={{ minHeight: '60vh' }}>
        {activeTab === 'dashboard' && <Dashboard activeAccountId={activeAccountId} onNavigateToTab={setActiveTab} />}
        {activeTab === 'daybook' && <DayBook activeAccountId={activeAccountId} />}
        {activeTab === 'calendar' && <TradingCalendar activeAccountId={activeAccountId} />}
        {activeTab === 'logs' && <TradeTable onEditTrade={handleEditTrade} activeAccountId={activeAccountId} />}
        {activeTab === 'ledger' && <Ledger activeAccountId={activeAccountId} />}
        {activeTab === 'taxation' && <Taxation activeAccountId={activeAccountId} />}
        {activeTab === 'strategies' && <StrategyManager />}
        {activeTab === 'account' && <AccountManager />}
      </main>

      {/* Log Form Modal Overlay */}
      <TradeLogger 
        isOpen={isLoggerOpen} 
        onClose={handleCloseLogger} 
        editTradeId={editTradeId} 
        activeAccountId={activeAccountId}
      />

      {/* Profile & Settings Modal Overlay */}
      <ProfileSettingsModal 
        isOpen={isProfileSettingsOpen}
        onClose={() => setIsProfileSettingsOpen(false)}
      />

      {/* Modern Terminal Footer */}
      <footer 
        style={{ 
          marginTop: '48px', 
          borderTop: '1px solid var(--border-color)', 
          paddingTop: '20px', 
          textAlign: 'center', 
          fontSize: '0.75rem', 
          color: 'var(--text-dim)' 
        }}
      >
        <p>© 2026 {userName || 'Sachin'}'s Trade Diary. Designed for professional stock market audits. All logs are stored locally client-side.</p>
      </footer>
    </div>
  );
}
