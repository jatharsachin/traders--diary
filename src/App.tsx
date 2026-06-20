import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { TradingCalendar } from './components/TradingCalendar';
import { TradeTable } from './components/TradeTable';
import { StrategyManager } from './components/StrategyManager';
import { Ledger } from './components/Ledger';
import { AccountManager } from './components/AccountManager';
import { TradeLogger } from './components/TradeLogger';
import { AuthScreen } from './components/AuthScreen';
import { useTradeStore } from './store/useTradeStore';
import { Plus, LayoutDashboard, Calendar, History, Compass, Receipt, User, ShieldCheck, Bell, LogOut, Sun, Moon } from 'lucide-react';
import { isSupabaseConfigured, getSupabaseClient } from './utils/supabaseClient';
import logoImg from './assets/tradediary_logo.png';

type Tab = 'dashboard' | 'calendar' | 'logs' | 'strategies' | 'ledger' | 'account';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isLoggerOpen, setIsLoggerOpen] = useState(false);
  const [editTradeId, setEditTradeId] = useState<string | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

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
    isPnlVisible
  } = useTradeStore();

  const totalNetPnL = trades.reduce((acc, t) => acc + t.netPnL, 0);
  const totalDeposits = capitalAdjustments.filter((a) => a.type === 'DEPOSIT').reduce((acc, a) => acc + a.amount, 0);
  const totalWithdrawals = capitalAdjustments.filter((a) => a.type === 'WITHDRAWAL').reduce((acc, a) => acc + a.amount, 0);
  const currentCapital = baseCapital + totalNetPnL + totalDeposits - totalWithdrawals;

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
    const { data: { subscription } } = client.auth.onAuthStateChange((_event: any, session: any) => {
      if (session?.user) {
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

  // Handle HTML Class toggling for themes
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
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

  // Auth gate blocking access if not authenticated
  if (!sessionUser) {
    return <AuthScreen />;
  }

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
      
      {/* Header Bar */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
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
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              TradeDiary Pro
              {isSupabaseConfigured() && (
                <span className="badge badge-win" style={{ fontSize: '0.58rem', padding: '2px 6px', textTransform: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <ShieldCheck size={9} /> Sync Linked
                </span>
              )}
            </h1>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Advanced stock & options cognitive audit journal
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Current Capital Balance (Dynamically adapts to P&L) */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: 'var(--bg-card)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '6px 12px',
              height: '35px',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 550 }}>Current Capital:</span>
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

          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className="btn btn-secondary"
            style={{ 
              width: '35px', 
              height: '35px', 
              padding: 0, 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)'
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
                width: '35px', 
                height: '35px', 
                padding: 0, 
                borderRadius: '8px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                position: 'relative',
                background: isNotifOpen ? 'var(--primary-glow)' : 'var(--bg-card)',
                border: isNotifOpen ? '1px solid var(--border-color-active)' : '1px solid var(--border-color)'
              }}
              title="Alerts Center"
            >
              <Bell size={16} color={notifications.length > 0 ? 'var(--color-loss)' : 'var(--text-main)'} />
              {notifications.length > 0 && (
                <span 
                  style={{ 
                    position: 'absolute', 
                    top: '-4px', 
                    right: '-4px', 
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
                  top: '42px', 
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
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              padding: '6px 12px',
              height: '35px',
              fontSize: '0.75rem',
              color: 'var(--text-muted)'
            }}
          >
            <span>User:</span>
            <strong style={{ color: 'var(--text-main)' }}>{sessionUser?.email}</strong>
            <button 
              onClick={() => {
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
                padding: '2px',
                marginLeft: '4px'
              }}
              title="Log Out"
            >
              <LogOut size={14} />
            </button>
          </div>

          <button className="btn btn-primary" style={{ height: '35px', padding: '6px 12px' }} onClick={handleNewTrade}>
            <Plus size={14} />
            <span>Log Trade</span>
          </button>
        </div>
      </header>

      {/* Tabs Navigation (macOS Segmented control) */}
      <nav style={{ marginBottom: '24px' }}>
        <div className="nav-tab-container">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <LayoutDashboard size={14} />
            Dashboard
          </button>

          <button 
            onClick={() => setActiveTab('calendar')} 
            className={`nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Calendar size={14} />
            Calendar
          </button>

          <button 
            onClick={() => setActiveTab('logs')} 
            className={`nav-tab ${activeTab === 'logs' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <History size={14} />
            Logs ({trades.length})
          </button>

          <button 
            onClick={() => setActiveTab('ledger')} 
            className={`nav-tab ${activeTab === 'ledger' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Receipt size={14} />
            Ledger
          </button>

          <button 
            onClick={() => setActiveTab('strategies')} 
            className={`nav-tab ${activeTab === 'strategies' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Compass size={14} />
            Setups
          </button>

          <button 
            onClick={() => setActiveTab('account')} 
            className={`nav-tab ${activeTab === 'account' ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <User size={14} />
            Account
          </button>
        </div>
      </nav>

      {/* Main Tab Render Panels */}
      <main style={{ minHeight: '60vh' }}>
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'calendar' && <TradingCalendar />}
        {activeTab === 'logs' && <TradeTable onEditTrade={handleEditTrade} />}
        {activeTab === 'ledger' && <Ledger />}
        {activeTab === 'strategies' && <StrategyManager />}
        {activeTab === 'account' && <AccountManager />}
      </main>

      {/* Log Form Modal Overlay */}
      <TradeLogger 
        isOpen={isLoggerOpen} 
        onClose={handleCloseLogger} 
        editTradeId={editTradeId} 
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
        <p>© 2026 TradeDiary Pro. Designed for professional stock market audits. All logs are stored locally client-side.</p>
      </footer>
    </div>
  );
}
