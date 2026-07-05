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

type Tab = 'dashboard' | 'daybook' | 'calendar' | 'logs' | 'strategies' | 'ledger' | 'account' | 'taxation';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);
  const [editTradeId, setEditTradeId] = useState<string | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [lastSeenNotificationCount, setLastSeenNotificationCount] = useState<number>(0);
  const [isRecoveryActive, setIsRecoveryActive] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
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
    syncAllInvestmentPrices
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

  const totalInvCurrent = investments
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
                onClick={() => {
                  const nextState = !isNotifOpen;
                  setIsNotifOpen(nextState);
                  if (nextState) {
                    setLastSeenNotificationCount(notifications.length);
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
                  position: 'relative',
                  background: isNotifOpen ? 'var(--primary-glow)' : 'var(--bg-card)',
                  border: isNotifOpen ? '1px solid var(--border-color-active)' : '1.5px solid var(--border-color)'
                }}
                title="Alerts Center"
              >
                <Bell size={16} color={notifications.length > lastSeenNotificationCount ? 'var(--color-loss)' : 'var(--text-main)'} />
                {notifications.length > lastSeenNotificationCount && (
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
                    {notifications.length - lastSeenNotificationCount}
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
                    gap: '4px'
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
                      background: 'rgba(255,255,255,0.015)'
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
                flexShrink: 0
              }}
              title="Log Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Row 2: Account Context, Capital, Nifty simulated Ticker & Live Clock */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none', gap: '8px', borderTop: '1.5px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
          {/* Global Account Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
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

      {/* Tabs Navigation (macOS Segmented control grouped by category) */}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
              Capital & Assets
            </span>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ec4899', display: 'inline-block' }}></span>
              Analysis & Config
            </span>
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
