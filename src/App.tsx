import { useState, useEffect, lazy, Suspense } from 'react';








import { AuthScreen } from './components/AuthScreen';



import { useTradeStore } from './store/useTradeStore';
import { getTradeMistakes } from './types';
import { BROKER_LOGOS } from './utils/brandLogos';
import { AccountFilterDropdown } from './components/AccountFilterDropdown';
import { Plus, LayoutDashboard, Calendar, History, Compass, Receipt, Briefcase, ShieldCheck, Bell, LogOut, Sun, Moon, Percent, BookOpen, Menu, HelpCircle, FileSpreadsheet } from 'lucide-react';
import { isSupabaseConfigured, getSupabaseClient } from './utils/supabaseClient';
import logoImg from './assets/tradediary_logo.png';
import { FINANCIAL_YEARS } from './utils/fyHelper';

type Tab = 'dashboard' | 'daybook' | 'calendar' | 'logs' | 'strategies' | 'ledger' | 'account' | 'taxation' | 'contractNotes' | 'help';


const safeLazy = (importFn: () => Promise<any>) =>
  lazy(() =>
    importFn().catch(() => {
      return new Promise((resolve) => setTimeout(resolve, 500))
        .then(importFn)
        .catch((err) => {
          console.error('Lazy chunk import failed:', err);
          return {
            default: () => (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Failed to load module offline or due to connection refresh.</p>
                <button className="btn btn-primary" onClick={() => window.location.reload()}>
                  Reload Page
                </button>
              </div>
            ),
          };
        });
    })
  );

const Dashboard = safeLazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const TradingCalendar = safeLazy(() => import('./components/TradingCalendar').then(m => ({ default: m.TradingCalendar })));
const TradeTable = safeLazy(() => import('./components/TradeTable').then(m => ({ default: m.TradeTable })));
const StrategyManager = safeLazy(() => import('./components/StrategyManager').then(m => ({ default: m.StrategyManager })));
const Ledger = safeLazy(() => import('./components/Ledger').then(m => ({ default: m.Ledger })));
const AccountManager = safeLazy(() => import('./components/AccountManager').then(m => ({ default: m.AccountManager })));
const ProfileSettingsModal = safeLazy(() => import('./components/ProfileSettingsModal').then(m => ({ default: m.ProfileSettingsModal })));
const TradeLogger = safeLazy(() => import('./components/TradeLogger').then(m => ({ default: m.TradeLogger })));
const Taxation = safeLazy(() => import('./components/Taxation').then(m => ({ default: m.Taxation })));
const DayBook = safeLazy(() => import('./components/DayBook').then(m => ({ default: m.DayBook })));
const ContractNotesManager = safeLazy(() => import('./components/ContractNotesManager').then(m => ({ default: m.ContractNotesManager })));
const Help = safeLazy(() => import('./components/Help').then(m => ({ default: m.Help })));

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);
  const [editTradeId, setEditTradeId] = useState<string | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [seenNotificationIds, setSeenNotificationIds] = useState<string[]>(() => {
    try {
      const userKey = localStorage.getItem('traders_diary_last_auth_user') || 'guest';
      const saved = localStorage.getItem(`traders_diary_seen_notifs_${userKey}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() => {
    try {
      const userKey = localStorage.getItem('traders_diary_last_auth_user') || 'guest';
      const saved = localStorage.getItem(`traders_diary_dismissed_notifs_${userKey}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isRecoveryActive, setIsRecoveryActive] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(() => {
    try {
      const userKey = localStorage.getItem('traders_diary_last_auth_user') || 'guest';
      const savedScoped = localStorage.getItem(`traders_diary_selected_accounts_${userKey}`);
      if (savedScoped) {
        const parsed = JSON.parse(savedScoped);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const savedGlobal = localStorage.getItem('traders_diary_selected_accounts');
      if (savedGlobal) {
        const parsed = JSON.parse(savedGlobal);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const savedActiveId = localStorage.getItem(`traders_diary_active_account_${userKey}`) || 
                            localStorage.getItem('traders_diary_active_account');
      if (savedActiveId && savedActiveId !== 'Combined') {
        return savedActiveId.split(',');
      }
    } catch {}
    return [];
  });
  const [activeAccountId, setActiveAccountId] = useState<string>(() => {
    try {
      const userKey = localStorage.getItem('traders_diary_last_auth_user') || 'guest';
      const saved = localStorage.getItem(`traders_diary_active_account_${userKey}`) || 
                    localStorage.getItem('traders_diary_active_account');
      if (saved) return saved;
    } catch {}
    return 'Combined';
  });
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [useTwoRowHeader, setUseTwoRowHeader] = useState<boolean>(() => {
    return localStorage.getItem('traders_diary_two_row_header') === 'true';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('traders_diary_sidebar_collapsed') === 'true';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

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
    trades: allTrades, 
    baseCapital, 
    theme, 
    toggleTheme,
    capitalAdjustments: allAdjustments,
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
    investments: allInvestments,
    syncAllInvestmentPrices
  } = useTradeStore();

  const activeAccountIds = brokerAccounts.filter(a => a.active).map(a => a.id);

  // Sync selectedAccountIds on initial load or when brokerAccounts/auth user change
  useEffect(() => {
    if (activeAccountIds.length === 0) return;

    try {
      const userKey = sessionUser?.id || localStorage.getItem('traders_diary_last_auth_user') || 'guest';
      const savedRaw = localStorage.getItem(`traders_diary_selected_accounts_${userKey}`) || 
                       localStorage.getItem('traders_diary_selected_accounts');

      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(id => activeAccountIds.includes(id));
          if (valid.length > 0) {
            setSelectedAccountIds(valid);
            const isAll = activeAccountIds.every(id => valid.includes(id));
            const newActive = isAll ? 'Combined' : (valid.length === 1 ? valid[0] : valid.join(','));
            setActiveAccountId(newActive);
            return;
          }
        }
      }

      const savedActive = localStorage.getItem(`traders_diary_active_account_${userKey}`) || 
                          localStorage.getItem('traders_diary_active_account');
      if (savedActive && savedActive !== 'Combined') {
        const parts = savedActive.split(',').filter(id => activeAccountIds.includes(id));
        if (parts.length > 0) {
          setSelectedAccountIds(parts);
          setActiveAccountId(savedActive);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to sync accounts from storage', e);
    }

    // Default to all active accounts if nothing valid was saved
    if (selectedAccountIds.length === 0) {
      setSelectedAccountIds(activeAccountIds);
      setActiveAccountId('Combined');
    }
  }, [brokerAccounts, sessionUser]);

  const handleSelectedAccountsChange = (newSelectedIds: string[]) => {
    setSelectedAccountIds(newSelectedIds);
    const userKey = sessionUser?.id || localStorage.getItem('traders_diary_last_auth_user') || 'guest';
    localStorage.setItem('traders_diary_selected_accounts', JSON.stringify(newSelectedIds));
    localStorage.setItem(`traders_diary_selected_accounts_${userKey}`, JSON.stringify(newSelectedIds));

    const isAll = activeAccountIds.length > 0 && activeAccountIds.every(id => newSelectedIds.includes(id));
    const newActive = isAll ? 'Combined' : (newSelectedIds.length === 1 ? newSelectedIds[0] : newSelectedIds.join(','));
    setActiveAccountId(newActive);
    localStorage.setItem('traders_diary_active_account', newActive);
    localStorage.setItem(`traders_diary_active_account_${userKey}`, newActive);
  };

  const trades = allTrades.filter(t => !t.brokerAccountId || activeAccountIds.includes(t.brokerAccountId));
  const capitalAdjustments = allAdjustments.filter(a => !a.brokerAccountId || activeAccountIds.includes(a.brokerAccountId));
  const investments = allInvestments.filter(i => !i.brokerAccountId || activeAccountIds.includes(i.brokerAccountId));

  const isCombinedView = activeAccountId === 'Combined' || selectedAccountIds.length === 0 || selectedAccountIds.length === activeAccountIds.length;
  const effectiveSelectedIds = isCombinedView ? activeAccountIds : (selectedAccountIds.length > 0 ? selectedAccountIds : activeAccountId.split(',').filter(Boolean));

  const filteredTrades = isCombinedView
    ? trades
    : trades.filter((t) => effectiveSelectedIds.includes(t.brokerAccountId || ''));

  const filteredAdjustments = isCombinedView
    ? capitalAdjustments
    : capitalAdjustments.filter((a) => effectiveSelectedIds.includes(a.brokerAccountId || ''));

  const filteredBaseCapital = isCombinedView
    ? baseCapital
    : brokerAccounts.filter(a => effectiveSelectedIds.includes(a.id)).reduce((sum, a) => sum + (a.startingCapital || 0), 0);

  const totalNetPnL = filteredTrades.reduce((acc, t) => acc + t.netPnL, 0);
  const totalDeposits = filteredAdjustments.filter((a) => a.type === 'DEPOSIT').reduce((acc, a) => acc + a.amount, 0);
  const totalWithdrawals = filteredAdjustments.filter((a) => a.type === 'WITHDRAWAL').reduce((acc, a) => acc + a.amount, 0);
  const filteredInvestments = isCombinedView
    ? investments
    : investments.filter(i => {
        if (i.brokerAccountId && effectiveSelectedIds.includes(i.brokerAccountId)) return true;
        const matchedAccs = brokerAccounts.filter(a => effectiveSelectedIds.includes(a.id));
        return matchedAccs.some(a => i.broker === a.broker);
      });

  const totalInvPurchasedCost = filteredInvestments.reduce((sum, i) => sum + (i.qty * i.buyPrice), 0);
  const totalInvExitedCredit = filteredInvestments
    .filter(i => i.status === 'EXITED' && i.exitPrice)
    .reduce((sum, i) => sum + (i.qty * i.exitPrice!), 0);

  const currentCapital = filteredBaseCapital + totalNetPnL + totalDeposits - totalWithdrawals - totalInvPurchasedCost + totalInvExitedCredit;

  const totalInvCurrent = filteredInvestments
    .filter(i => i.status === 'ACTIVE' || !(i as any).status)
    .reduce((sum, i) => sum + (i.qty * (i.currentPrice || i.buyPrice)), 0);
  const combinedWealth = currentCapital + totalInvCurrent;


  // Dynamic Alert / Notification Center calculations
  const getDynamicNotifications = () => {
    const alertsList = [];
    
    // 1. Overtrading Warning (today trades count > 5)
    const todayStr = new Date().toISOString().split('T')[0];
    const tradesToday = trades.filter(t => t.date === todayStr);
    if (tradesToday.length > 5) {
      alertsList.push({
        id: `overtrading-${todayStr}`,
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
        id: `revenge-trading-${consecutiveLosses}-${sortedNewest[0]?.id || ''}`,
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
    const recentMistakeCost = recentTrades.reduce((acc, t) => (t.netPnL < 0 && getTradeMistakes(t).length > 0 ? acc + Math.abs(t.netPnL) : acc), 0);
    
    if (recentMistakeCost > 5000) {
      alertsList.push({
        id: `mistake-cost-${todayStr}`,
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
        id: `nse-holiday-${tomorrowStr}`,
        type: 'info' as const,
        title: 'NSE Market Holiday Tomorrow',
        message: `Tomorrow is a scheduled market holiday for ${holidayNames[tomorrowStr]}. Rest and recharge!`,
        timestamp: 'NSE Calendar'
      });
    }

    // 5. Weekend Review & Mistake Audit Alert
    const todayDay = new Date().getDay();
    if (todayDay === 0 || todayDay === 6) { // Saturday or Sunday
      alertsList.push({
        id: `weekend-review-${todayStr}`,
        type: 'info' as const,
        title: 'Weekend Audit: Notes & Mistakes',
        message: 'The market is closed for the weekend. Audit your trade notes and tagged mistakes to prepare for next week!',
        timestamp: 'Weekend Review'
      });
    }

    return alertsList;
  };

  const rawNotifications = getDynamicNotifications();
  const notifications = rawNotifications.filter(n => !dismissedNotificationIds.includes(n.id));
  const unreadNotifications = notifications.filter(n => !seenNotificationIds.includes(n.id));
  const unreadNotificationCount = unreadNotifications.length;

  useEffect(() => {
    const userKey = sessionUser?.id || localStorage.getItem('traders_diary_last_auth_user') || 'guest';
    try {
      const savedSeen = localStorage.getItem(`traders_diary_seen_notifs_${userKey}`);
      if (savedSeen) setSeenNotificationIds(JSON.parse(savedSeen));
      const savedDismissed = localStorage.getItem(`traders_diary_dismissed_notifs_${userKey}`);
      if (savedDismissed) setDismissedNotificationIds(JSON.parse(savedDismissed));
    } catch (e) {
      console.error(e);
    }
  }, [sessionUser?.id]);

  const handleToggleNotifications = () => {
    const nextState = !isNotifOpen;
    setIsNotifOpen(nextState);
    if (nextState) {
      const allActiveIds = notifications.map(n => n.id);
      const updatedSeen = Array.from(new Set([...seenNotificationIds, ...allActiveIds]));
      setSeenNotificationIds(updatedSeen);
      const userKey = sessionUser?.id || localStorage.getItem('traders_diary_last_auth_user') || 'guest';
      try {
        localStorage.setItem(`traders_diary_seen_notifs_${userKey}`, JSON.stringify(updatedSeen));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDismissNotification = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = Array.from(new Set([...dismissedNotificationIds, id]));
    setDismissedNotificationIds(updated);
    const userKey = sessionUser?.id || localStorage.getItem('traders_diary_last_auth_user') || 'guest';
    try {
      localStorage.setItem(`traders_diary_dismissed_notifs_${userKey}`, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismissAllNotifications = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const allIds = notifications.map(n => n.id);
    const updated = Array.from(new Set([...dismissedNotificationIds, ...allIds]));
    setDismissedNotificationIds(updated);
    const userKey = sessionUser?.id || localStorage.getItem('traders_diary_last_auth_user') || 'guest';
    try {
      localStorage.setItem(`traders_diary_dismissed_notifs_${userKey}`, JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

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
    <div className={useTwoRowHeader ? "app-layout top-nav-layout app-container" : "app-layout sidebar-layout"}>
      {!useTwoRowHeader && isMobileSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      {/* Sidebar (Left side menu) */}
      {!useTwoRowHeader && (
        <aside className={`app-sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
          {/* Top brand & toggle row */}
          <div className="sidebar-brand" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1.5px solid var(--border-color)', paddingBottom: '12px', flexShrink: 0 }}>
            {isSidebarCollapsed ? (
              <button 
                onClick={() => {
                  setIsSidebarCollapsed(false);
                  localStorage.setItem('traders_diary_sidebar_collapsed', 'false');
                }}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: 'var(--primary)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '4px',
                  width: '100%' 
                }}
                title="Expand Sidebar"
              >
                <Menu size={22} />
              </button>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    padding: '1.5px',
                    background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.4), rgba(255, 255, 255, 0.12))',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5), 0 0 10px rgba(234, 179, 8, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <img 
                      src={logoImg} 
                      alt="Logo" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        borderRadius: '6.5px', 
                        objectFit: 'cover',
                        filter: 'brightness(1.18) contrast(1.12)' 
                      }} 
                    />
                  </div>
                  <h1 style={{ fontSize: '0.96rem', fontWeight: 800, margin: 0, whiteSpace: 'nowrap', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>TradeDiary Pro</h1>
                </div>
                <button 
                  onClick={() => {
                    setIsSidebarCollapsed(true);
                    localStorage.setItem('traders_diary_sidebar_collapsed', 'true');
                  }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '4px', display: 'flex', alignItems: 'center' }}
                  title="Collapse Sidebar"
                >
                  <Menu size={22} />
                </button>
              </div>
            )}
          </div>

          {/* Action Log Trade CTA */}
          <button 
            className={`sidebar-tab-btn ${isLoggerOpen ? 'active' : ''}`}
            style={{ 
              width: isSidebarCollapsed ? '36px' : '100%', 
              height: '38px', 
              borderRadius: isSidebarCollapsed ? '50%' : '9999px', 
              fontSize: '0.84rem', 
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
              gap: isSidebarCollapsed ? '0' : '10px',
              marginTop: '4px',
              flexShrink: 0,
              padding: isSidebarCollapsed ? '0' : '0 16px',
              border: isLoggerOpen ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid var(--border-color)',
              background: isLoggerOpen 
                ? 'linear-gradient(135deg, rgba(10, 132, 255, 0.95) 0%, rgba(0, 113, 227, 0.95) 100%)' 
                : 'rgba(255, 255, 255, 0.03)',
              color: isLoggerOpen ? '#ffffff' : 'var(--text-main)',
              boxShadow: isLoggerOpen ? '0 6px 20px var(--primary-glow)' : 'none',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }} 
            onClick={handleNewTrade}
            title="Log Trade"
          >
            <Plus size={18} color={isLoggerOpen ? '#ffffff' : 'var(--primary)'} />
            {!isSidebarCollapsed && <span>Log Trade</span>}
          </button>

          {/* Sidebar Menu Groups */}
          <div className="sidebar-menu">
            <span className="hide-collapsed" style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '8px', marginBottom: '4px' }}>
              Journal & Tracking
            </span>
            <button 
              onClick={() => { setActiveTab('dashboard'); setIsMobileSidebarOpen(false); }} 
              className={"sidebar-tab-btn " + (activeTab === 'dashboard' ? 'active' : '')}
              title="Dashboard"
            >
              <LayoutDashboard size={17} color={activeTab === 'dashboard' ? '#fff' : '#38bdf8'} />
              <span className="hide-collapsed">Dashboard</span>
            </button>
            <button 
              onClick={() => { setActiveTab('calendar'); setIsMobileSidebarOpen(false); }} 
              className={"sidebar-tab-btn " + (activeTab === 'calendar' ? 'active' : '')}
              title="Calendar"
            >
              <Calendar size={17} color={activeTab === 'calendar' ? '#fff' : '#a855f7'} />
              <span className="hide-collapsed">Calendar</span>
            </button>
            <button 
              onClick={() => { setActiveTab('daybook'); setIsMobileSidebarOpen(false); }} 
              className={"sidebar-tab-btn " + (activeTab === 'daybook' ? 'active' : '')}
              title="Day Book"
            >
              <BookOpen size={17} color={activeTab === 'daybook' ? '#fff' : '#60a5fa'} />
              <span className="hide-collapsed">Day Book</span>
            </button>
            <button 
              onClick={() => { setActiveTab('logs'); setIsMobileSidebarOpen(false); }} 
              className={"sidebar-tab-btn " + (activeTab === 'logs' ? 'active' : '')}
              title="Logs"
            >
              <History size={17} color={activeTab === 'logs' ? '#fff' : '#34d399'} />
              <span className="hide-collapsed">Logs</span>
            </button>

            <span className="hide-collapsed" style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '8px', marginTop: '12px', marginBottom: '4px' }}>
              Portfolio & Audit
            </span>
            <button 
              onClick={() => { setActiveTab('ledger'); setIsMobileSidebarOpen(false); }} 
              className={"sidebar-tab-btn " + (activeTab === 'ledger' ? 'active' : '')}
              title="Ledger"
            >
              <Receipt size={17} color={activeTab === 'ledger' ? '#fff' : '#f59e0b'} />
              <span className="hide-collapsed">Ledger</span>
            </button>
            <button 
              onClick={() => { setActiveTab('account'); setIsMobileSidebarOpen(false); }} 
              className={"sidebar-tab-btn " + (activeTab === 'account' ? 'active' : '')}
              title="Investments"
            >
              <Briefcase size={17} color={activeTab === 'account' ? '#fff' : '#3b82f6'} />
              <span className="hide-collapsed">Investments</span>
            </button>
            <button 
              onClick={() => { setActiveTab('contractNotes'); setIsMobileSidebarOpen(false); }} 
              className={"sidebar-tab-btn " + (activeTab === 'contractNotes' ? 'active' : '')}
              title="Contract Notes"
            >
              <FileSpreadsheet size={17} color={activeTab === 'contractNotes' ? '#fff' : '#10b981'} />
              <span className="hide-collapsed">Contract Notes</span>
            </button>

            <span className="hide-collapsed" style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '8px', marginTop: '12px', marginBottom: '4px' }}>
              Analysis & Config
            </span>
            <button 
              onClick={() => { setActiveTab('strategies'); setIsMobileSidebarOpen(false); }} 
              className={"sidebar-tab-btn " + (activeTab === 'strategies' ? 'active' : '')}
              title="Setups"
            >
              <Compass size={17} color={activeTab === 'strategies' ? '#fff' : '#ec4899'} />
              <span className="hide-collapsed">Setups</span>
            </button>
            <button 
              onClick={() => { setActiveTab('taxation'); setIsMobileSidebarOpen(false); }} 
              className={"sidebar-tab-btn " + (activeTab === 'taxation' ? 'active' : '')}
              title="Taxation"
            >
              <Percent size={17} color={activeTab === 'taxation' ? '#fff' : '#f97316'} />
              <span className="hide-collapsed">Taxation</span>
            </button>

            {/* Support & Info Tab */}
            <div style={{ padding: '0 12px', marginTop: '12px' }} className="hide-collapsed">
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>SUPPORT & INFO</span>
            </div>
            <button 
              onClick={() => { setActiveTab('help'); setIsMobileSidebarOpen(false); }}
              className={"sidebar-tab-btn " + (activeTab === 'help' ? 'active' : '')}
              title="Help & Guides"
            >
              <HelpCircle size={17} color={activeTab === 'help' ? '#fff' : '#06b6d4'} />
              <span className="hide-collapsed">Help & Guides</span>
            </button>
          </div>

          {/* Sidebar Footer */}
          <div className="sidebar-footer" style={{ flexShrink: 0 }}>
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="btn btn-secondary"
              style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={13} color="var(--primary)" /> : <Moon size={13} color="var(--primary)" />}
            </button>

            {/* Profile trigger */}
            <div style={{ position: 'relative', flexGrow: isSidebarCollapsed ? 0 : 1, display: 'flex', justifyContent: isSidebarCollapsed ? 'center' : 'flex-end' }}>
              <div 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: isProfileMenuOpen ? 'var(--primary-glow)' : 'transparent', 
                  borderRadius: '8px', 
                  padding: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  justifyContent: isSidebarCollapsed ? 'center' : 'flex-start'
                }}
                title="Profile Settings"
              >
                {userAvatar && userAvatar.startsWith('data:image/') ? (
                  <img 
                    src={userAvatar} 
                    alt="Avatar" 
                    style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                ) : (
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary) 0%, rgba(6, 182, 212, 0.4) 100%)',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    {(userName || 'Sachin').charAt(0).toUpperCase()}
                  </div>
                )}
                {!isSidebarCollapsed && (
                  <span style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70px' }}>
                    {userName || 'Sachin'}
                  </span>
                )}
              </div>

              {/* Glassmorphic Profile Menu Dropdown */}
              {isProfileMenuOpen && (
                <div 
                  className="glass-card animate-tab-panel"
                  style={{ 
                    position: 'absolute', 
                    left: isSidebarCollapsed ? '40px' : 'auto', 
                    right: isSidebarCollapsed ? 'auto' : '0px',
                    bottom: isSidebarCollapsed ? '0px' : '40px', 
                    width: '150px', 
                    zIndex: 2000, 
                    padding: '4px',
                    boxShadow: 'var(--shadow-glow)',
                    border: '1.5px solid var(--border-color-active)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    background: 'var(--bg-tooltip-opaque)'
                  }}
                >
                  <button
                    onClick={() => {
                      setIsProfileSettingsOpen(true);
                      setIsProfileMenuOpen(false);
                    }}
                    className="btn btn-secondary"
                    style={{ 
                      justifyContent: 'flex-start', 
                      border: 'none', 
                      fontSize: '0.72rem', 
                      padding: '6px 8px', 
                      width: '100%', 
                      gap: '6px',
                      background: 'rgba(255,255,255,0.015)',
                      cursor: 'pointer'
                    }}
                  >
                    <span>⚙️</span>
                    <strong style={{ color: 'var(--text-main)' }}>Settings</strong>
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>
      )}

      <div className={useTwoRowHeader ? "" : "main-content-wrapper"}>
        {/* If top navigation layout, render the traditional top header container */}
        {useTwoRowHeader ? (
          <div className="sticky-header-container">
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

              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '11px',
                padding: '1.5px',
                background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.4), rgba(255, 255, 255, 0.12))',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 12px rgba(234, 179, 8, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <img 
                  src={logoImg} 
                  alt="TradeDiary Pro Logo" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    borderRadius: '9px', 
                    objectFit: 'cover',
                    filter: 'brightness(1.18) contrast(1.12)' 
                  }} 
                />
              </div>

              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                  {userName || 'Sachin'}'s Trade Diary
                  <select
                    value={selectedFY}
                    onChange={(e) => setSelectedFY(e.target.value)}
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      padding: '2px 10px',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      border: '1.5px solid var(--border-color)',
                      borderRadius: '8px',
                      outline: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s ease',
                      marginLeft: '8px',
                      height: '34px',
                      verticalAlign: 'middle'
                    }}
                    className="fy-header-select"
                  >
                    {FINANCIAL_YEARS.map((fy) => (
                      <option key={fy} value={fy} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>
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
                  border: '1.5px solid var(--border-color)',
                  cursor: 'pointer'
                }}
                title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              >
                {theme === 'dark' ? <Sun size={16} color="var(--primary)" /> : <Moon size={16} color="var(--primary)" />}
              </button>

              {/* Bell Icon & Notification Center */}
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={handleToggleNotifications}
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
                    border: isNotifOpen ? '1px solid var(--border-color-active)' : '1.5px solid var(--border-color)',
                    cursor: 'pointer'
                  }}
                  title="Alerts Center"
                >
                  <Bell size={18} color={unreadNotificationCount > 0 ? 'var(--color-loss)' : 'var(--text-main)'} />
                  {unreadNotificationCount > 0 && (
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
                      {unreadNotificationCount}
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
                      gap: '12px',
                      background: 'var(--bg-tooltip-opaque)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>Alerts & Notifications</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{notifications.length} Active</span>
                        {notifications.length > 0 && (
                          <button
                            onClick={handleDismissAllNotifications}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--primary)',
                              fontSize: '0.68rem',
                              fontWeight: 650,
                              cursor: 'pointer',
                              padding: '2px 4px',
                              borderRadius: '4px'
                            }}
                            title="Dismiss all active alerts"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>

                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div 
                          key={n.id}
                          style={{ 
                            padding: '10px', 
                            borderRadius: '6px', 
                            fontSize: '0.75rem', 
                            borderLeft: "3px solid " + (n.type === "danger" ? "var(--color-loss)" : n.type === "warning" ? "#fb923c" : "var(--primary)"),
                            background: 'rgba(255, 255, 255, 0.015)',
                            border: '1px solid var(--border-color)',
                            borderLeftWidth: '3px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.78rem' }}>{n.title}</strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>{n.timestamp}</span>
                              <button
                                onClick={(e) => handleDismissNotification(n.id, e)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  padding: '1px 3px',
                                  lineHeight: 1,
                                  fontSize: '0.75rem',
                                  borderRadius: '3px'
                                }}
                                title="Dismiss alert"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <p style={{ color: 'var(--text-muted)', lineHeight: '1.3', margin: 0 }}>{n.message}</p>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                        ✓ No active alerts.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User account info card container */}
              <div style={{ position: 'relative' }}>
                <div 
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    background: isProfileMenuOpen ? 'var(--primary-glow)' : 'var(--bg-card)', 
                    border: isProfileMenuOpen ? '1px solid var(--border-color-active)' : '1.5px solid var(--border-color)', 
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
                  title="Account Menu"
                >
                  <span style={{ display: 'flex', alignItems: 'center', width: '38px', height: '38px', justifyContent: 'center' }}>
                    {userAvatar && userAvatar.startsWith('data:image/') ? (
                      <img 
                        src={userAvatar} 
                        alt="Avatar" 
                        style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary) 0%, rgba(6, 182, 212, 0.4) 100%)',
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1.05rem',
                        border: '1.2px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        {(userName || 'Sachin').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </span>
                  <strong style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.92rem' }}>
                    {userName || 'Sachin'}
                  </strong>
                </div>

                {/* Glassmorphic Profile Menu Dropdown */}
                {isProfileMenuOpen && (
                  <div 
                    className="glass-card animate-tab-panel"
                    style={{ 
                      position: 'absolute', 
                      right: 0, 
                      top: '56px', 
                      width: '180px', 
                      zIndex: 2000, 
                      padding: '6px',
                      boxShadow: 'var(--shadow-glow)',
                      border: '1.5px solid var(--border-color-active)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      background: 'var(--bg-tooltip-opaque)'
                    }}
                  >
                    <button
                      onClick={() => {
                        setIsProfileSettingsOpen(true);
                        setIsProfileMenuOpen(false);
                      }}
                      className="btn btn-secondary"
                      style={{ 
                        justifyContent: 'flex-start', 
                        border: 'none', 
                        fontSize: '0.78rem', 
                        padding: '6px 10px', 
                        width: '100%', 
                        gap: '8px',
                        background: 'rgba(255,255,255,0.015)',
                        cursor: 'pointer'
                      }}
                    >
                      <span>⚙️</span>
                      <strong style={{ color: 'var(--text-main)' }}>Trader Settings</strong>
                    </button>
                  </div>
                )}
              </div>

              {/* Standalone Logout Action Button (kept on top) */}
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to log out of your trading journal?')) {
                    signOutUser();
                  }
                }}
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
                  border: '1.5px solid var(--border-color)',
                  color: 'var(--color-loss)',
                  flexShrink: 0,
                  cursor: 'pointer'
                }}
                title="Log Out"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* Row 2: Account Context, Capital, Nifty simulated Ticker & Live Clock */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none', gap: '8px', borderTop: '1.5px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
            {/* Global Account Selector Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>Active Account:</span>
              <AccountFilterDropdown 
                brokerAccounts={brokerAccounts}
                selectedAccountIds={selectedAccountIds}
                onChange={handleSelectedAccountsChange}
              />
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

            {/* Combined Portfolio Wealth (Total Wealth) */}
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
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Wealth:</span>
              <span 
                style={{ 
                  fontSize: '0.85rem', 
                  fontWeight: 700, 
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-win)' 
                }}
              >
                ₹{isPnlVisible ? Math.round(combinedWealth).toLocaleString('en-IN') : '••••'}
              </span>
            </div>

            {/* Today's Live P&L Badge */}
            {(() => {
              const getTodayNetPnL = () => {
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const todayTrades = filteredTrades.filter(t => (t.exitDate || t.date) === todayStr);
                if (todayTrades.length === 0) return null;
                return todayTrades.reduce((sum, t) => sum + (t.netPnL || 0), 0);
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
                      : (isProfit ? '+' : '') + '₹' + (isPnlVisible ? Math.round(todayPnL).toLocaleString('en-IN') : '••••')
                    }
                  </span>
                </div>
              );
            })()}

            {/* Nifty */}
            <div 
              style={{ 
                marginLeft: 'auto',
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
        </header>
            <nav style={{ margin: '16px 0 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px', flexWrap: 'wrap' }}>
          {/* Group 1: Journaling & Tracking */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }}></span>
              Journal & Tracking
            </span>
            <div className="nav-tab-container" style={{ margin: 0 }}>
              <button 
                onClick={() => setActiveTab('dashboard')} 
                className={"nav-tab " + (activeTab === 'dashboard' ? 'active' : '')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <LayoutDashboard size={15} color="#38bdf8" />
                Dashboard
              </button>
              <button 
                onClick={() => setActiveTab('calendar')} 
                className={"nav-tab " + (activeTab === 'calendar' ? 'active' : '')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Calendar size={15} color="#a855f7" />
                Calendar
              </button>
              <button 
                onClick={() => setActiveTab('daybook')} 
                className={"nav-tab " + (activeTab === 'daybook' ? 'active' : '')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <BookOpen size={15} color="#60a5fa" />
                Day Book
              </button>
              <button 
                onClick={() => setActiveTab('logs')} 
                className={"nav-tab " + (activeTab === 'logs' ? 'active' : '')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <History size={15} color="#34d399" />
                Logs
              </button>
            </div>
          </div>

          {/* Group 2: Portfolio & Reports */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
              Portfolio & Audit
            </span>
            <div className="nav-tab-container" style={{ margin: 0 }}>
              <button 
                onClick={() => setActiveTab('ledger')} 
                className={"nav-tab " + (activeTab === 'ledger' ? 'active' : '')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Receipt size={15} color="#f59e0b" />
                Ledger
              </button>
              <button 
                onClick={() => setActiveTab('account')} 
                className={"nav-tab " + (activeTab === 'account' ? 'active' : '')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Briefcase size={15} color="#3b82f6" />
                Investments
              </button>
            </div>
          </div>

          {/* Group 3: Setup & Taxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ec4899', display: 'inline-block' }}></span>
              Analysis & Config
            </span>
            <div className="nav-tab-container" style={{ margin: 0 }}>
              <button 
                onClick={() => setActiveTab('strategies')} 
                className={"nav-tab " + (activeTab === 'strategies' ? 'active' : '')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Compass size={15} color="#ec4899" />
                Setups
              </button>
              <button 
                onClick={() => setActiveTab('taxation')} 
                className={"nav-tab " + (activeTab === 'taxation' ? 'active' : '')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Percent size={15} color="#f97316" />
                Taxation
              </button>

              <button 
                onClick={() => setActiveTab('help')}
                className={"nav-tab " + (activeTab === 'help' ? 'active' : '')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <HelpCircle size={15} color={activeTab === 'help' ? '#fff' : '#06b6d4'} />
                Help
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', visibility: 'hidden' }}>&nbsp;</span>
          <button 
            className={`btn ${isLoggerOpen ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ 
              height: '38px', 
              padding: '0 20px', 
              borderRadius: '9999px', 
              fontSize: '0.85rem', 
              boxShadow: isLoggerOpen ? '0 4px 12px var(--primary-glow)' : 'none',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }} 
            onClick={handleNewTrade}
          >
            <Plus size={17} />
            <span>Log Trade</span>
          </button>
        </div>
      </nav>
          </div>
        ) : (
          /* If sidebar layout, render the compact Top Status Bar */
          <header className="main-content-header">
            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="show-mobile-only"
              style={{
                background: 'var(--bg-card)',
                border: '1.2px solid var(--border-color)',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--primary)',
                marginRight: '8px'
              }}
              title="Open Menu"
            >
              <Menu size={16} />
            </button>

            {/* Account & Financial Year Selectors */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Account Dropdown */}
              {/* Account Dropdown with Checkbox Ticks */}
              <AccountFilterDropdown 
                brokerAccounts={brokerAccounts}
                selectedAccountIds={selectedAccountIds}
                onChange={handleSelectedAccountsChange}
              />

              {/* Financial Year Select */}
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '2px 14px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '9999px',
                  height: '32px',
                  cursor: 'pointer'
                }}
              >
                {FINANCIAL_YEARS.map((fy) => (
                  <option key={fy} value={fy}>
                    {fy}
                  </option>
                ))}
              </select>
            </div>

            {/* Metrics: Capital, Wealth, Today's P&L, Nifty, Clock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Capital */}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '4px 10px', height: '32px', display: 'flex', alignItems: 'center', gap: '5px', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
                <span>Capital:</span>
                <strong style={{ color: totalNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                  ₹{isPnlVisible ? Math.round(currentCapital).toLocaleString('en-IN') : '••••'}
                </strong>
              </div>

              {/* Wealth */}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '4px 10px', height: '32px', display: 'flex', alignItems: 'center', gap: '5px', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
                <span>Wealth:</span>
                <strong style={{ color: 'var(--color-win)', fontFamily: 'var(--font-mono)' }}>
                  ₹{isPnlVisible ? Math.round(combinedWealth).toLocaleString('en-IN') : '••••'}
                </strong>
              </div>

              {/* Today's P&L */}
              {(() => {
                const getTodayNetPnL = () => {
                  const now = new Date();
                  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                  const todayTrades = filteredTrades.filter(t => (t.exitDate || t.date) === todayStr);
                  if (todayTrades.length === 0) return null;
                  return todayTrades.reduce((sum, t) => sum + (t.netPnL || 0), 0);
                };
                const todayPnL = getTodayNetPnL();
                const isProfit = todayPnL !== null && todayPnL >= 0;

                return (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '4px 10px', height: '32px', display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
                    <span 
                      style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: todayPnL === null ? '#888' : isProfit ? 'var(--color-win)' : 'var(--color-loss)',
                        boxShadow: todayPnL === null ? 'none' : isProfit ? '0 0 6px var(--color-win)' : '0 0 6px var(--color-loss)'
                      }}
                    />
                    <span>Today's P&L:</span>
                    <strong style={{ color: todayPnL === null ? 'var(--text-dim)' : isProfit ? 'var(--color-win)' : 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                      {todayPnL === null 
                        ? 'No Trades' 
                        : (isProfit ? '+' : '') + '₹' + (isPnlVisible ? Math.round(todayPnL).toLocaleString('en-IN') : '••••')
                      }
                    </strong>
                  </div>
                );
              })()}

              {/* Nifty */}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '4px 10px', height: '32px', display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isMarketOpen() ? 'var(--color-win)' : 'var(--color-loss)', boxShadow: isMarketOpen() ? '0 0 6px var(--color-win)' : '0 0 6px var(--color-loss)' }} />
                <span>NIFTY:</span>
                <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                  {niftyPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
                <span style={{ color: niftyChange >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {niftyChange >= 0 ? '+' : ''}{niftyChange.toFixed(2)}
                </span>
              </div>

              {/* Clock */}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '4px 10px', height: '32px', display: 'flex', alignItems: 'center', fontFamily: 'var(--font-mono)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
                {liveTime || 'Loading...'}
              </div>

              {/* Vertical Divider */}
              <div style={{ width: '1px', height: '18px', background: 'var(--border-color)', margin: '0 4px' }} />

              {/* Notification Icon */}
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={handleToggleNotifications}
                  className="btn btn-secondary"
                  style={{ 
                    width: '32px', 
                    height: '32px', 
                    padding: 0, 
                    borderRadius: '8px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    position: 'relative', 
                    cursor: 'pointer',
                    background: isNotifOpen ? 'var(--primary-glow)' : 'var(--bg-card)',
                    border: isNotifOpen ? '1px solid var(--border-color-active)' : '1.2px solid var(--border-color)'
                  }}
                  title="Alerts Center"
                >
                  <Bell size={15} color={unreadNotificationCount > 0 ? 'var(--color-loss)' : 'var(--text-main)'} />
                  {unreadNotificationCount > 0 && (
                    <span 
                      style={{ 
                        position: 'absolute', 
                        top: '1px', 
                        right: '1px', 
                        background: 'var(--color-loss)', 
                        color: '#fff', 
                        fontSize: '0.5rem', 
                        fontWeight: 'bold',
                        borderRadius: '50%', 
                        width: '12px', 
                        height: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center'
                      }}
                    >
                      {unreadNotificationCount}
                    </span>
                  )}
                </button>

                {/* Glassmorphic Dropdown Panel */}
                {isNotifOpen && (
                  <div 
                    className="glass-card animate-tab-panel"
                    style={{ 
                      position: 'absolute', 
                      right: '0px', 
                      top: '38px', 
                      width: '280px', 
                      maxHeight: '300px', 
                      overflowY: 'auto',
                      zIndex: 2000, 
                      padding: '12px',
                      boxShadow: 'var(--shadow-glow)',
                      border: '1.5px solid var(--border-color-active)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      background: 'var(--bg-tooltip-opaque)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>Alerts & Notifications</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{notifications.length} Active</span>
                        {notifications.length > 0 && (
                          <button
                            onClick={handleDismissAllNotifications}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--primary)',
                              fontSize: '0.65rem',
                              fontWeight: 650,
                              cursor: 'pointer',
                              padding: '1px 3px',
                              borderRadius: '3px'
                            }}
                            title="Dismiss all active alerts"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>

                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <div 
                          key={n.id}
                          style={{ 
                            padding: '8px', 
                            borderRadius: '6px', 
                            fontSize: '0.72rem', 
                            borderLeft: "3px solid " + (n.type === "danger" ? "var(--color-loss)" : n.type === "warning" ? "#fb923c" : "var(--primary)"),
                            background: 'rgba(255, 255, 255, 0.015)',
                            border: '1px solid var(--border-color)',
                            borderLeftWidth: '3px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.75rem' }}>{n.title}</strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '0.58rem', color: 'var(--text-dim)' }}>{n.timestamp}</span>
                              <button
                                onClick={(e) => handleDismissNotification(n.id, e)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-muted)',
                                  cursor: 'pointer',
                                  padding: '1px 3px',
                                  lineHeight: 1,
                                  fontSize: '0.72rem',
                                  borderRadius: '3px'
                                }}
                                title="Dismiss alert"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                          <p style={{ color: 'var(--text-muted)', lineHeight: '1.3', margin: 0 }}>{n.message}</p>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.72rem' }}>
                        ✓ No active alerts.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Logout button */}
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to log out?')) {
                    signOutUser();
                  }
                }}
                className="btn btn-secondary"
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  padding: 0, 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'var(--color-loss)',
                  cursor: 'pointer',
                  background: 'var(--bg-card)',
                  border: '1.2px solid var(--border-color)'
                }}
                title="Log Out"
              >
                <LogOut size={15} />
              </button>
            </div>
          </header>
        )}
      {/* Main Tab Render Panels */}
      <main style={{ minHeight: '60vh', position: 'relative' }}>
        <Suspense fallback={
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '350px', color: 'var(--text-dim)', gap: '12px' }}>
            <div style={{ border: '3px solid rgba(255,255,255,0.05)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '32px', height: '32px', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '0.78rem', letterSpacing: '0.05em' }}>LOADING PANEL...</span>
          </div>
        }>
          <div key={activeTab} className="ios-page-enter">
            {activeTab === 'dashboard' && (
              <Dashboard 
                activeAccountId={activeAccountId} 
                onNavigateToTab={setActiveTab} 
                onSelectDateFilter={(date) => {
                  setSelectedDateFilter(date);
                  setActiveTab('logs');
                }}
                onEditTrade={handleEditTrade}
              />
            )}
            {activeTab === 'daybook' && <DayBook activeAccountId={activeAccountId} />}
            {activeTab === 'calendar' && (
              <TradingCalendar 
                activeAccountId={activeAccountId} 
                onEditTrade={handleEditTrade} 
              />
            )}
            {activeTab === 'logs' && (
              <TradeTable 
                onEditTrade={handleEditTrade} 
                activeAccountId={activeAccountId} 
                initialDateFilter={selectedDateFilter}
                onClearDateFilter={() => setSelectedDateFilter(null)}
              />
            )}
            {activeTab === 'ledger' && <Ledger activeAccountId={activeAccountId} />}
            {activeTab === 'taxation' && <Taxation activeAccountId={activeAccountId} />}
            {activeTab === 'contractNotes' && <ContractNotesManager activeAccountId={activeAccountId} />}
            {activeTab === 'strategies' && <StrategyManager />}
            {activeTab === 'account' && <AccountManager activeAccountId={activeAccountId} />}
            {activeTab === 'help' && <Help />}
          </div>
        </Suspense>
      </main>

      <Suspense fallback={null}>
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
          useTwoRowHeader={useTwoRowHeader}
          setUseTwoRowHeader={setUseTwoRowHeader}
        />
      </Suspense>

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
      </div>
  );
}
