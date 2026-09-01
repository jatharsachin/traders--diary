const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Helper to normalize content for index matching
const normalize = (str) => str.replace(/\r\n/g, '\n');

// Find the start of the return statement layout block
const startAnchor = '<div className="app-container">';
const startIndex = content.indexOf(startAnchor);
if (startIndex === -1) {
  console.error("Could not find start anchor '<div className=\"app-container\">' in App.tsx");
  process.exit(1);
}

// Find the end of the navigation layout block: immediately preceding {/* Main Tab Render Panels */}
const endAnchor = '      {/* Main Tab Render Panels */}';
const endIndex = content.indexOf(endAnchor);
if (endIndex === -1) {
  console.error("Could not find end anchor '{/* Main Tab Render Panels */}' in App.tsx");
  process.exit(1);
}

// Let's extract the header and navigation code we want to keep (from the original useTwoRowHeader true branch)
// The original two-row header starts with:
// <header className="app-header" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'stretch' }}>
// and ends with: </header>
// Let's find this exact range in the current content between startIndex and endIndex.
const headerStartMarker = '<header className="app-header" style={{ display: \'flex\', flexDirection: \'column\', gap: \'12px\', alignItems: \'stretch\' }}>';
const headerStartIndex = content.indexOf(headerStartMarker, startIndex);
if (headerStartIndex === -1 || headerStartIndex > endIndex) {
  console.error("Could not find traditional header block start in App.tsx");
  process.exit(1);
}
const headerEndMarker = '</header>';
const headerEndIndex = content.indexOf(headerEndMarker, headerStartIndex);
if (headerEndIndex === -1 || headerEndIndex > endIndex) {
  console.error("Could not find traditional header block end in App.tsx");
  process.exit(1);
}
const traditionalHeaderCode = content.substring(headerStartIndex, headerEndIndex + headerEndMarker.length);

// The original two-row nav starts with:
// <nav style={{ margin: '16px 0 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
// and ends with: </nav>
const navStartMarker = '<nav style={{ margin: \'16px 0 16px 0\', display: \'flex\', justifyContent: \'space-between\', alignItems: \'flex-end\', flexWrap: \'wrap\', gap: \'16px\' }}>';
const navStartIndex = content.indexOf(navStartMarker, headerEndIndex);
if (navStartIndex === -1 || navStartIndex > endIndex) {
  console.error("Could not find traditional nav block start in App.tsx");
  process.exit(1);
}
const navEndMarker = '</nav>';
const navEndIndex = content.indexOf(navEndMarker, navStartIndex);
if (navEndIndex === -1 || navEndIndex > endIndex) {
  console.error("Could not find traditional nav block end in App.tsx");
  process.exit(1);
}
const traditionalNavCode = content.substring(navStartIndex, navEndIndex + navEndMarker.length);

// Now construct the new outer layout and content top bars
const newLayoutCode = `<div className={useTwoRowHeader ? "app-layout top-nav-layout app-container" : "app-layout sidebar-layout"}>
      {/* Sidebar (Left side menu) */}
      {!useTwoRowHeader && (
        <aside className="app-sidebar">
          {/* macOS Traffic Lights */}
          <div className="mac-traffic-lights" style={{ margin: '0 0 10px 0', flexShrink: 0 }}>
            <span className="mac-dot mac-close"></span>
            <span className="mac-dot mac-minimize"></span>
            <span className="mac-dot mac-maximize"></span>
          </div>

          <div className="sidebar-brand" style={{ flexShrink: 0 }}>
            <img 
              src={logoImg} 
              alt="Logo" 
              style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1.5px solid rgba(255, 255, 255, 0.08)' }} 
            />
            <div>
              <h1 style={{ fontSize: '0.98rem', fontWeight: 800, letterSpacing: '-0.01em', margin: 0, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                TradeDiary Pro
              </h1>
              {isSupabaseConfigured() && (
                <span 
                  className="badge badge-win" 
                  style={{ fontSize: '0.52rem', padding: '1.5px 4px', textTransform: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px', cursor: 'help' }}
                  title="Cloud Status: Connected | Database Sync: Active"
                >
                  <ShieldCheck size={8} /> Sync Linked
                </span>
              )}
            </div>
          </div>

          {/* Action Log Trade CTA */}
          <button 
            className="btn btn-primary" 
            style={{ 
              width: '100%', 
              height: '38px', 
              borderRadius: '8px', 
              fontSize: '0.8rem', 
              boxShadow: '0 4px 12px var(--primary-glow)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginTop: '4px',
              flexShrink: 0
            }} 
            onClick={handleNewTrade}
          >
            <Plus size={14} />
            <span>Log Trade</span>
          </button>

          {/* Sidebar Menu Groups */}
          <div className="sidebar-menu">
            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '8px', marginBottom: '4px' }}>
              Journal & Tracking
            </span>
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={"sidebar-tab-btn " + (activeTab === 'dashboard' ? 'active' : '')}
            >
              <LayoutDashboard size={14} color={activeTab === 'dashboard' ? '#fff' : '#38bdf8'} />
              <span>Dashboard</span>
            </button>
            <button 
              onClick={() => setActiveTab('daybook')} 
              className={"sidebar-tab-btn " + (activeTab === 'daybook' ? 'active' : '')}
            >
              <BookOpen size={14} color={activeTab === 'daybook' ? '#fff' : '#60a5fa'} />
              <span>Day Book</span>
            </button>
            <button 
              onClick={() => setActiveTab('calendar')} 
              className={"sidebar-tab-btn " + (activeTab === 'calendar' ? 'active' : '')}
            >
              <Calendar size={14} color={activeTab === 'calendar' ? '#fff' : '#a855f7'} />
              <span>Calendar</span>
            </button>
            <button 
              onClick={() => setActiveTab('logs')} 
              className={"sidebar-tab-btn " + (activeTab === 'logs' ? 'active' : '')}
            >
              <History size={14} color={activeTab === 'logs' ? '#fff' : '#34d399'} />
              <span>Logs</span>
            </button>

            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '8px', marginTop: '12px', marginBottom: '4px' }}>
              Portfolio & Audit
            </span>
            <button 
              onClick={() => setActiveTab('ledger')} 
              className={"sidebar-tab-btn " + (activeTab === 'ledger' ? 'active' : '')}
            >
              <Receipt size={14} color={activeTab === 'ledger' ? '#fff' : '#f59e0b'} />
              <span>Ledger</span>
            </button>
            <button 
              onClick={() => setActiveTab('account')} 
              className={"sidebar-tab-btn " + (activeTab === 'account' ? 'active' : '')}
            >
              <Briefcase size={14} color={activeTab === 'account' ? '#fff' : '#3b82f6'} />
              <span>Investments</span>
            </button>

            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '8px', marginTop: '12px', marginBottom: '4px' }}>
              Analysis & Config
            </span>
            <button 
              onClick={() => setActiveTab('strategies')} 
              className={"sidebar-tab-btn " + (activeTab === 'strategies' ? 'active' : '')}
            >
              <Compass size={14} color={activeTab === 'strategies' ? '#fff' : '#ec4899'} />
              <span>Setups</span>
            </button>
            <button 
              onClick={() => setActiveTab('taxation')} 
              className={"sidebar-tab-btn " + (activeTab === 'taxation' ? 'active' : '')}
            >
              <Percent size={14} color={activeTab === 'taxation' ? '#fff' : '#f97316'} />
              <span>Taxation</span>
            </button>
          </div>

          {/* Sidebar Footer */}
          <div className="sidebar-footer">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="btn btn-secondary"
              style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={13} color="var(--primary)" /> : <Moon size={13} color="var(--primary)" />}
            </button>

            {/* Notification Icon */}
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
                style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }}
                title="Alerts Center"
              >
                <Bell size={13} color={notifications.length > lastSeenNotificationCount ? 'var(--color-loss)' : 'var(--text-main)'} />
                {notifications.length > lastSeenNotificationCount && (
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
                    left: '40px', 
                    bottom: '0', 
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

            {/* Profile trigger */}
            <div style={{ position: 'relative', flexGrow: 1 }}>
              <div 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: isProfileMenuOpen ? 'var(--primary-glow)' : 'transparent', 
                  borderRadius: '8px', 
                  padding: '4px 6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {userAvatar && userAvatar.startsWith('data:image/') ? (
                  <img 
                    src={userAvatar} 
                    alt="Avatar" 
                    style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }} 
                  />
                ) : (
                  <span style={{ fontSize: '1.2rem' }}>👨‍💻</span>
                )}
                <span style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60px' }}>
                  {userName || 'Sachin'}
                </span>
              </div>

              {/* Glassmorphic Profile Menu Dropdown */}
              {isProfileMenuOpen && (
                <div 
                  className="glass-card animate-tab-panel"
                  style={{ 
                    position: 'absolute', 
                    left: '0', 
                    bottom: '40px', 
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
                cursor: 'pointer'
              }}
              title="Log Out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </aside>
      )}

      <div className={useTwoRowHeader ? "" : "main-content-wrapper"}>
        {/* If top navigation layout, render the traditional top header container */}
        {useTwoRowHeader ? (
          <div className="sticky-header-container">
            ${traditionalHeaderCode}
            ${traditionalNavCode}
          </div>
        ) : (
          /* If sidebar layout, render the compact Top Status Bar */
          <header className="main-content-header">
            {/* Account & Financial Year Selectors */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Account Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {(() => {
                  const activeAcc = brokerAccounts.find(a => a.id === activeAccountId);
                  if (activeAcc) {
                    return (
                      <img 
                        src={BROKER_LOGOS[activeAcc.broker] || BROKER_LOGOS['Other']} 
                        alt={activeAcc.broker} 
                        style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'contain', background: '#fff', padding: '1px', border: '1px solid var(--border-color)' }} 
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
                    padding: '2px 8px',
                    fontSize: '0.78rem',
                    height: '32px',
                    background: 'var(--bg-card)',
                    border: '1.2px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    minWidth: '130px',
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

              {/* Financial Year Select */}
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  border: '1.2px solid var(--border-color)',
                  borderRadius: '8px',
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
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1.2px solid var(--border-color)', borderRadius: '8px', padding: '4px 8px', height: '32px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Capital:</span>
                <strong style={{ color: totalNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                  ₹{isPnlVisible ? Math.round(currentCapital).toLocaleString('en-IN') : '••••'}
                </strong>
              </div>

              {/* Wealth */}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1.2px solid var(--border-color)', borderRadius: '8px', padding: '4px 8px', height: '32px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Wealth:</span>
                <strong style={{ color: 'var(--color-win)', fontFamily: 'var(--font-mono)' }}>
                  ₹{isPnlVisible ? Math.round(combinedWealth).toLocaleString('en-IN') : '••••'}
                </strong>
              </div>

              {/* Today's P&L */}
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
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1.2px solid var(--border-color)', borderRadius: '8px', padding: '4px 8px', height: '32px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span 
                      style={{ 
                        width: '5px', 
                        height: '5px', 
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
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1.2px solid var(--border-color)', borderRadius: '8px', padding: '4px 8px', height: '32px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isMarketOpen() ? 'var(--color-win)' : 'var(--color-loss)' }} />
                <span>NIFTY:</span>
                <strong style={{ color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                  {niftyPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
                <span style={{ color: niftyChange >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {niftyChange >= 0 ? '+' : ''}{niftyChange.toFixed(2)}
                </span>
              </div>

              {/* Clock */}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', background: 'rgba(255, 255, 255, 0.02)', border: '1.2px solid var(--border-color)', borderRadius: '8px', padding: '4px 8px', height: '32px', display: 'flex', alignItems: 'center', fontFamily: 'var(--font-mono)' }}>
                {liveTime || 'Loading...'}
              </div>
            </div>
          </header>
        )}
`;

// Replace from startAnchor to endAnchor with the new structure
const before = content.substring(0, startIndex);
const after = content.substring(endIndex);

let newContent = before + newLayoutCode + after;

// Now we need to close the two extra divs we opened (main-content-wrapper and app-layout)
// Let's find where the outer app-container div ends.
// In the original App.tsx, the outer div closed right before:
//       <ProfileSettingsModal
//         isOpen={isProfileSettingsOpen}
//         onClose={() => setIsProfileSettingsOpen(false)}
//         useTwoRowHeader={useTwoRowHeader}
//         setUseTwoRowHeader={setUseTwoRowHeader}
//       />
//     </div>
//   );
// }
// Let's replace the last closing div with two closing divs.
const modalCode = `<ProfileSettingsModal 
        isOpen={isProfileSettingsOpen}
        onClose={() => setIsProfileSettingsOpen(false)}
        useTwoRowHeader={useTwoRowHeader}
        setUseTwoRowHeader={setUseTwoRowHeader}
      />`;

const modalIndex = newContent.indexOf(modalCode);
if (modalIndex === -1) {
  console.error("Could not find ProfileSettingsModal block in newContent");
  process.exit(1);
}

const afterModalIndex = modalIndex + modalCode.length;
// Find the next </div> tag
const closingDivMarker = '</div>';
const closingDivIndex = newContent.indexOf(closingDivMarker, afterModalIndex);
if (closingDivIndex === -1) {
  console.error("Could not find closing </div> after ProfileSettingsModal");
  process.exit(1);
}

// Replace the single </div> with two </div> tags:
// </div> {/* main-content-wrapper */}
// </div> {/* app-layout */}
const finalBefore = newContent.substring(0, closingDivIndex);
const finalAfter = newContent.substring(closingDivIndex + closingDivMarker.length);
const finalContent = finalBefore + '</div>\n      </div>' + finalAfter;

fs.writeFileSync(filePath, finalContent, 'utf8');
console.log("App.tsx has been successfully updated with sidebar layout support!");
