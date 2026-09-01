const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '      {/* Header Bar */}';
const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
  console.error("Could not find start marker");
  process.exit(1);
}

const endMarker = '      </nav>';
const endIndex = content.indexOf(endMarker, startIndex);
if (endIndex === -1) {
  console.error("Could not find end marker");
  process.exit(1);
}

const before = content.substring(0, startIndex);
const after = content.substring(endIndex + endMarker.length);

const replacement = `      {/* Header Bar */}
      <header className="app-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingBottom: '4px' }}>
        {/* Left Side: Brand Logo, title, FY select, and Account dropdown Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flexShrink: 0 }}>
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
            <h1 style={{ fontSize: '1.18rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', margin: 0 }}>
              {userName || 'Sachin'}'s Trade Diary
              {isSupabaseConfigured() && (
                <span 
                  className="badge badge-win" 
                  title="Cloud Status: Connected | Database Sync: Active | SSL Channel: Secured"
                  style={{ 
                    fontSize: '0.55rem', 
                    padding: '1.5px 5px', 
                    textTransform: 'none', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '3px',
                    cursor: 'help',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    background: 'rgba(16, 185, 129, 0.12)',
                    boxShadow: '0 0 6px rgba(16, 185, 129, 0.15)'
                  }}
                >
                  <ShieldCheck size={9} /> Sync Linked
                </span>
              )}
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: '8px',
                  outline: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                  marginLeft: '4px',
                  height: '32px',
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
          </div>

          <span style={{ width: '1.5px', height: '20px', background: 'var(--border-color)', margin: '0 4px' }} />

          {/* Global Account Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {(() => {
              const activeAcc = brokerAccounts.find(a => a.id === activeAccountId);
              if (activeAcc) {
                return (
                  <img 
                    src={BROKER_LOGOS[activeAcc.broker] || BROKER_LOGOS['Other']} 
                    alt={activeAcc.broker} 
                    style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'contain', background: '#fff', padding: '1.5px', border: '1px solid var(--border-color)' }} 
                  />
                );
              }
              return null;
            })()}
            <select
              value={activeAccountId}
              onChange={(e) => setActiveAccountId(e.target.value)}
              className="form-select"
              style={{
                padding: '4px 10px',
                fontSize: '0.8rem',
                height: '36px',
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border-color)',
                borderRadius: '10px',
                color: 'var(--text-main)',
                cursor: 'pointer',
                minWidth: '140px',
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
        </div>

        {/* Right Side: Capital, Wealth, Theme, Bell, Profile Settings, and Logout button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
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
              height: '36px',
              boxShadow: 'var(--shadow-card)',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Capital:</span>
            <strong 
              style={{ 
                fontSize: '0.82rem', 
                fontFamily: 'var(--font-mono)',
                color: totalNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' 
              }}
            >
              ₹{isPnlVisible ? Math.round(currentCapital).toLocaleString('en-IN') : '••••'}
            </strong>
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
              height: '36px',
              boxShadow: 'var(--shadow-card)',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Wealth:</span>
            <strong 
              style={{ 
                fontSize: '0.82rem', 
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-win)' 
              }}
            >
              ₹{isPnlVisible ? Math.round(combinedWealth).toLocaleString('en-IN') : '••••'}
            </strong>
          </div>

          <span style={{ width: '1.5px', height: '20px', background: 'var(--border-color)', margin: '0 4px' }} />

          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className="btn btn-secondary"
            style={{ 
              width: '38px', 
              height: '38px', 
              padding: 0, 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border-color)',
              cursor: 'pointer'
            }}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? <Sun size={14} color="var(--primary)" /> : <Moon size={14} color="var(--primary)" />}
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
                width: '38px', 
                height: '38px', 
                padding: 0, 
                borderRadius: '10px', 
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
              <Bell size={14} color={notifications.length > lastSeenNotificationCount ? 'var(--color-loss)' : 'var(--text-main)'} />
              {notifications.length > lastSeenNotificationCount && (
                <span 
                  style={{ 
                    position: 'absolute', 
                    top: '2px', 
                    right: '2px', 
                    background: 'var(--color-loss)', 
                    color: '#fff', 
                    fontSize: '0.55rem', 
                    fontWeight: 'bold',
                    borderRadius: '50%', 
                    width: '13px', 
                    height: '13px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: '0 0 6px var(--color-loss)'
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
                  top: '46px', 
                  width: '300px', 
                  maxHeight: '350px', 
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
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{notifications.length} Active</span>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <strong style={{ color: 'var(--text-main)', fontSize: '0.75rem' }}>{n.title}</strong>
                        <span style={{ fontSize: '0.58rem', color: 'var(--text-dim)' }}>{n.timestamp}</span>
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

          {/* User account info card container */}
          <div style={{ position: 'relative' }}>
            <div 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: isProfileMenuOpen ? 'var(--primary-glow)' : 'var(--bg-card)', 
                border: isProfileMenuOpen ? '1px solid var(--border-color-active)' : '1.5px solid var(--border-color)', 
                borderRadius: '10px', 
                padding: '4px 10px',
                height: '38px',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
              title="Account Menu"
            >
              <span style={{ display: 'flex', alignItems: 'center', width: '28px', height: '28px', justifyContent: 'center' }}>
                {userAvatar && userAvatar.startsWith('data:image/') ? (
                  <img 
                    src={userAvatar} 
                    alt="Avatar" 
                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                ) : (
                  <span style={{ fontSize: '1.4rem' }}>
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
              <strong style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.82rem' }}>
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
                  top: '46px', 
                  width: '160px', 
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
                    fontSize: '0.75rem', 
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
              width: '38px', 
              height: '38px', 
              padding: 0, 
              borderRadius: '10px', 
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
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Tabs Navigation (Unified Segmented Control with Live Tickers & Log Trade) */}
      <nav style={{ margin: '12px 0 16px 0', paddingBottom: '12px', borderBottom: '1.5px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        {/* Left Side: Navigation Tabs in a single segmented row */}
        <div className="nav-tab-container" style={{ margin: 0, display: 'flex', flexWrap: 'wrap', gap: '4px', background: 'var(--bg-card)', padding: '4px', borderRadius: '10px', border: '1.5px solid var(--border-color)' }}>
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={"nav-tab " + (activeTab === "dashboard" ? "active" : "")}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: activeTab === 'dashboard' ? 'var(--primary)' : 'transparent', color: activeTab === 'dashboard' ? '#fff' : 'var(--text-muted)' }}
          >
            <LayoutDashboard size={13} color={activeTab === 'dashboard' ? '#fff' : '#38bdf8'} />
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('daybook')} 
            className={"nav-tab " + (activeTab === "daybook" ? "active" : "")}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: activeTab === 'daybook' ? 'var(--primary)' : 'transparent', color: activeTab === 'daybook' ? '#fff' : 'var(--text-muted)' }}
          >
            <BookOpen size={13} color={activeTab === 'daybook' ? '#fff' : '#60a5fa'} />
            Day Book
          </button>
          <button 
            onClick={() => setActiveTab('calendar')} 
            className={"nav-tab " + (activeTab === "calendar" ? "active" : "")}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: activeTab === 'calendar' ? 'var(--primary)' : 'transparent', color: activeTab === 'calendar' ? '#fff' : 'var(--text-muted)' }}
          >
            <Calendar size={13} color={activeTab === 'calendar' ? '#fff' : '#a855f7'} />
            Calendar
          </button>
          <button 
            onClick={() => setActiveTab('logs')} 
            className={"nav-tab " + (activeTab === "logs" ? "active" : "")}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: activeTab === 'logs' ? 'var(--primary)' : 'transparent', color: activeTab === 'logs' ? '#fff' : 'var(--text-muted)' }}
          >
            <History size={13} color={activeTab === 'logs' ? '#fff' : '#34d399'} />
            Logs
          </button>
          <span style={{ width: '1.5px', height: '18px', background: 'var(--border-color)', alignSelf: 'center', margin: '0 4px' }} />
          <button 
            onClick={() => setActiveTab('ledger')} 
            className={"nav-tab " + (activeTab === "ledger" ? "active" : "")}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: activeTab === 'ledger' ? 'var(--primary)' : 'transparent', color: activeTab === 'ledger' ? '#fff' : 'var(--text-muted)' }}
          >
            <Receipt size={13} color={activeTab === 'ledger' ? '#fff' : '#f59e0b'} />
            Ledger
          </button>
          <button 
            onClick={() => setActiveTab('account')} 
            className={"nav-tab " + (activeTab === "account" ? "active" : "")}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: activeTab === 'account' ? 'var(--primary)' : 'transparent', color: activeTab === 'account' ? '#fff' : 'var(--text-muted)' }}
          >
            <Briefcase size={13} color={activeTab === 'account' ? '#fff' : '#3b82f6'} />
            Investments
          </button>
          <span style={{ width: '1.5px', height: '18px', background: 'var(--border-color)', alignSelf: 'center', margin: '0 4px' }} />
          <button 
            onClick={() => setActiveTab('strategies')} 
            className={"nav-tab " + (activeTab === "strategies" ? "active" : "")}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: activeTab === 'strategies' ? 'var(--primary)' : 'transparent', color: activeTab === 'strategies' ? '#fff' : 'var(--text-muted)' }}
          >
            <Compass size={13} color={activeTab === 'strategies' ? '#fff' : '#ec4899'} />
            Setups
          </button>
          <button 
            onClick={() => setActiveTab('taxation')} 
            className={"nav-tab " + (activeTab === "taxation" ? "active" : "")}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: 'none', background: activeTab === 'taxation' ? 'var(--primary)' : 'transparent', color: activeTab === 'taxation' ? '#fff' : 'var(--text-muted)' }}
          >
            <Percent size={13} color={activeTab === 'taxation' ? '#fff' : '#f97316'} />
            Taxation
          </button>
        </div>

        {/* Right Side: Performance, Live Index, Clock & Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                  whiteSpace: 'nowrap'
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
                <strong 
                  style={{ 
                    fontSize: '0.82rem', 
                    fontFamily: 'var(--font-mono)',
                    color: todayPnL === null ? 'var(--text-dim)' : isProfit ? 'var(--color-win)' : 'var(--color-loss)' 
                  }}
                >
                  {todayPnL === null 
                    ? 'No Trades' 
                    : (isProfit ? '+' : '') + '₹' + (isPnlVisible ? Math.round(todayPnL).toLocaleString('en-IN') : '••••')
                  }
                </strong>
              </div>
            );
          })()}

          {/* NIFTY Index Ticker */}
          <div 
            style={{ 
              padding: '4px 10px', 
              background: niftyFlash === 'up' ? 'rgba(16, 185, 129, 0.12)' : niftyFlash === 'down' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.03)', 
              border: niftyFlash === 'up' ? '1.5px solid var(--color-win)' : niftyFlash === 'down' ? '1.5px solid var(--color-loss)' : '1.5px solid var(--border-color)', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              height: '38px',
              whiteSpace: 'nowrap',
              transition: 'all 0.3s ease'
            }}
          >
            <span 
              style={{ 
                display: 'inline-block', 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: isMarketOpen() ? 'var(--color-win)' : 'var(--color-loss)',
                boxShadow: isMarketOpen() ? '0 0 6px var(--color-win)' : 'none'
              }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>NIFTY:</span>
            <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
              {niftyPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </strong>
            <span style={{ fontSize: '0.72rem', color: niftyChange >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {niftyChange >= 0 ? '+' : ''}{niftyChange.toFixed(2)}
            </span>
          </div>

          {/* Clock */}
          <div style={{ padding: '4px 10px', background: 'rgba(255, 255, 255, 0.03)', border: '1.5px solid var(--border-color)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px', height: '38px', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
              {liveTime || 'Loading...'}
            </span>
          </div>

          {/* Log Trade CTA Button */}
          <button 
            className="btn btn-primary" 
            style={{ 
              height: '38px', 
              padding: '0 16px', 
              borderRadius: '10px', 
              fontSize: '0.82rem', 
              boxShadow: '0 4px 12px var(--primary-glow)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }} 
            onClick={handleNewTrade}
          >
            <Plus size={14} />
            <span>Log Trade</span>
          </button>
        </div>
      </nav>`;

fs.writeFileSync(filePath, before + replacement + after, 'utf8');
console.log("App.tsx has been successfully updated with correct braces!");
