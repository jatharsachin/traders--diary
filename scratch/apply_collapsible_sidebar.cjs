const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add 'Menu' to lucide-react import
const oldImport = "import { Plus, LayoutDashboard, Calendar, History, Compass, Receipt, Briefcase, ShieldCheck, Bell, LogOut, Sun, Moon, Percent, BookOpen } from 'lucide-react';";
const newImport = "import { Plus, LayoutDashboard, Calendar, History, Compass, Receipt, Briefcase, ShieldCheck, Bell, LogOut, Sun, Moon, Percent, BookOpen, Menu } from 'lucide-react';";
content = content.replace(oldImport, newImport);

// 2. Add states for collapsible sidebar and mobile sidebar
const stateAnchor = "  const [useTwoRowHeader, setUseTwoRowHeader] = useState<boolean>(() => {\n    return localStorage.getItem('traders_diary_two_row_header') === 'true';\n  });";
const stateDecl = `  const [useTwoRowHeader, setUseTwoRowHeader] = useState<boolean>(() => {
    return localStorage.getItem('traders_diary_two_row_header') === 'true';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('traders_diary_sidebar_collapsed') === 'true';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);`;

content = content.replace(stateAnchor, stateDecl);

// 3. Update the layout return statement (backdrop and collapsible class binding)
const oldReturnStart = `    <div className={useTwoRowHeader ? "app-layout top-nav-layout app-container" : "app-layout sidebar-layout"}>
      {/* Sidebar (Left side menu) */}
      {!useTwoRowHeader && (
        <aside className="app-sidebar">`;

const newReturnStart = `    <div className={useTwoRowHeader ? "app-layout top-nav-layout app-container" : "app-layout sidebar-layout"}>
      {!useTwoRowHeader && isMobileSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      {/* Sidebar (Left side menu) */}
      {!useTwoRowHeader && (
        <aside className={\`app-sidebar \${isSidebarCollapsed ? 'collapsed' : ''} \${isMobileSidebarOpen ? 'mobile-open' : ''}\`}>`;

content = content.replace(oldReturnStart, newReturnStart);

// 4. Update the brand & header section inside <aside>
// We replace everything from {/* macOS Traffic Lights */} up to isSupabaseConfigured sync linked select block
const oldBrandBlock = `          {/* macOS Traffic Lights */}
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
          </div>`;

const newBrandBlock = `          {/* Top brand & toggle row */}
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
                <Menu size={18} />
              </button>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img 
                    src={logoImg} 
                    alt="Logo" 
                    style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1.5px solid rgba(255, 255, 255, 0.08)' }} 
                  />
                  <div>
                    <h1 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, whiteSpace: 'nowrap' }}>TradeDiary Pro</h1>
                    {isSupabaseConfigured() && (
                      <span 
                        className="badge badge-win" 
                        style={{ fontSize: '0.5rem', padding: '1px 4px', textTransform: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                      >
                        <ShieldCheck size={8} /> Sync Linked
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsSidebarCollapsed(true);
                    localStorage.setItem('traders_diary_sidebar_collapsed', 'true');
                  }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '4px', display: 'flex', alignItems: 'center' }}
                  title="Collapse Sidebar"
                >
                  <Menu size={16} />
                </button>
              </div>
            )}
          </div>`;

content = content.replace(oldBrandBlock, newBrandBlock);

// 5. Update Log Trade CTA button structure to handle collapsed state (rounding/no text)
const oldCtaButton = `          {/* Action Log Trade CTA */}
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
          </button>`;

const newCtaButton = `          {/* Action Log Trade CTA */}
          <button 
            className="btn btn-primary" 
            style={{ 
              width: isSidebarCollapsed ? '36px' : '100%', 
              height: '38px', 
              borderRadius: isSidebarCollapsed ? '50%' : '8px', 
              fontSize: '0.8rem', 
              boxShadow: '0 4px 12px var(--primary-glow)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isSidebarCollapsed ? '0' : '6px',
              marginTop: '4px',
              flexShrink: 0,
              padding: isSidebarCollapsed ? '0' : '0 12px'
            }} 
            onClick={handleNewTrade}
            title="Log Trade"
          >
            <Plus size={14} />
            {!isSidebarCollapsed && <span>Log Trade</span>}
          </button>`;

content = content.replace(oldCtaButton, newCtaButton);

// 6. Update Navigation items (headings, click handlers, text label wrapping)
const oldNavSection = `          {/* Sidebar Menu Groups */}
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
          </div>`;

const newNavSection = `          {/* Sidebar Menu Groups */}
          <div className="sidebar-menu">
            <span className="hide-collapsed" style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '8px', marginBottom: '4px' }}>
              Journal & Tracking
            </span>
            <button 
              onClick={() => { setActiveTab('dashboard'); setIsMobileSidebarOpen(false); }} 
              className={"sidebar-tab-btn " + (activeTab === 'dashboard' ? 'active' : '')}
              title="Dashboard"
            >
              <LayoutDashboard size={14} color={activeTab === 'dashboard' ? '#fff' : '#38bdf8'} />
              <span className="hide-collapsed">Dashboard</span>
            </button>
            <button 
              onClick={() => { setActiveTab('daybook'); setIsMobileSidebarOpen(false); }} 
              className={"sidebar-tab-btn " + (activeTab === 'daybook' ? 'active' : '')}
              title="Day Book"
            >
              <BookOpen size={14} color={activeTab === 'daybook' ? '#fff' : '#60a5fa'} />
              <span className="hide-collapsed">Day Book</span>
            </button>
            <button 
              onClick={() => { setActiveTab('calendar'); setIsMobileSidebarOpen(false); }} 
              className={"sidebar-tab-btn " + (activeTab === 'calendar' ? 'active' : '')}
              title="Calendar"
            >
              <Calendar size={14} color={activeTab === 'calendar' ? '#fff' : '#a855f7'} />
              <span className="hide-collapsed">Calendar</span>
            </button>
            <button 
              onClick={() => { setActiveTab('logs'); setIsMobileSidebarOpen(false); }} 
              className={"sidebar-tab-btn " + (activeTab === 'logs' ? 'active' : '')}
              title="Logs"
            >
              <History size={14} color={activeTab === 'logs' ? '#fff' : '#34d399'} />
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
              <Receipt size={14} color={activeTab === 'ledger' ? '#fff' : '#f59e0b'} />
              <span className="hide-collapsed">Ledger</span>
            </button>
            <button 
              onClick={() => { setActiveTab('account'); setIsMobileSidebarOpen(false); }} 
              className={"sidebar-tab-btn " + (activeTab === 'account' ? 'active' : '')}
              title="Investments"
            >
              <Briefcase size={14} color={activeTab === 'account' ? '#fff' : '#3b82f6'} />
              <span className="hide-collapsed">Investments</span>
            </button>

            <span className="hide-collapsed" style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingLeft: '8px', marginTop: '12px', marginBottom: '4px' }}>
              Analysis & Config
            </span>
            <button 
              onClick={() => { setActiveTab('strategies'); setIsMobileSidebarOpen(false); }} 
              className={"sidebar-tab-btn " + (activeTab === 'strategies' ? 'active' : '')}
              title="Setups"
            >
              <Compass size={14} color={activeTab === 'strategies' ? '#fff' : '#ec4899'} />
              <span className="hide-collapsed">Setups</span>
            </button>
            <button 
              onClick={() => { setActiveTab('taxation'); setIsMobileSidebarOpen(false); }} 
              className={"sidebar-tab-btn " + (activeTab === 'taxation' ? 'active' : '')}
              title="Taxation"
            >
              <Percent size={14} color={activeTab === 'taxation' ? '#fff' : '#f97316'} />
              <span className="hide-collapsed">Taxation</span>
            </button>
          </div>`;

content = content.replace(oldNavSection, newNavSection);

// 7. Update Sidebar Footer section (Theme toggle, Alerts dropdown position alignment, Profile trigger, Logout)
const oldFooterSection = `          {/* Sidebar Footer */}
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
                <span style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '70px' }}>
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
          </div>`;

const newFooterSection = `          {/* Sidebar Footer */}
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
                    left: isSidebarCollapsed ? '40px' : '0px', 
                    bottom: isSidebarCollapsed ? '0px' : '40px', 
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
            <div style={{ position: 'relative', flexGrow: isSidebarCollapsed ? 0 : 1 }}>
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
                  <span style={{ fontSize: '1.2rem' }}>👨‍💻</span>
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
                    left: isSidebarCollapsed ? '40px' : '0px', 
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
          </div>`;

content = content.replace(oldFooterSection, newFooterSection);

// 8. Update Mobile Hamburger toggle trigger inside the main-content-header
const oldMainContentHeader = `          <header className="main-content-header">
            {/* Account & Financial Year Selectors */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>`;

const newMainContentHeader = `          <header className="main-content-header">
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>`;

content = content.replace(oldMainContentHeader, newMainContentHeader);

fs.writeFileSync(filePath, content, 'utf8');
console.log("App.tsx has been successfully updated with collapsible sidebar toggles!");
