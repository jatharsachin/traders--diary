const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Let's find and replace the sidebar-footer block in App.tsx
// The sidebar-footer block is located between {/* Sidebar Footer */} and </aside>
const footerStartAnchor = '          {/* Sidebar Footer */}';
const footerStartIndex = content.indexOf(footerStartAnchor);
if (footerStartIndex === -1) {
  console.error("Could not find {/* Sidebar Footer */} in App.tsx");
  process.exit(1);
}

const asideEndAnchor = '        </aside>';
const footerEndIndex = content.indexOf(asideEndAnchor, footerStartIndex);
if (footerEndIndex === -1) {
  console.error("Could not find </aside> after sidebar footer in App.tsx");
  process.exit(1);
}

const newFooterBlock = `          {/* Sidebar Footer */}
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
`;

let contentPart1 = content.substring(0, footerStartIndex) + newFooterBlock + content.substring(footerEndIndex);

// 2. Now let's update the main-content-header Clock block to insert notifications and logout
const clockAnchor = `              {/* Clock */}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', background: 'rgba(255, 255, 255, 0.02)', border: '1.2px solid var(--border-color)', borderRadius: '8px', padding: '4px 8px', height: '32px', display: 'flex', alignItems: 'center', fontFamily: 'var(--font-mono)' }}>
                {liveTime || 'Loading...'}
              </div>`;

const clockIndex = contentPart1.indexOf(clockAnchor);
if (clockIndex === -1) {
  console.error("Could not find Clock block inside main-content-header in contentPart1");
  process.exit(1);
}

const newClockWithIconsBlock = `              {/* Clock */}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', background: 'rgba(255, 255, 255, 0.02)', border: '1.2px solid var(--border-color)', borderRadius: '8px', padding: '4px 8px', height: '32px', display: 'flex', alignItems: 'center', fontFamily: 'var(--font-mono)' }}>
                {liveTime || 'Loading...'}
              </div>

              {/* Vertical Divider */}
              <div style={{ width: '1px', height: '18px', background: 'var(--border-color)', margin: '0 4px' }} />

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
                    background: 'var(--bg-card)',
                    border: '1.2px solid var(--border-color)'
                  }}
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
                <LogOut size={13} />
              </button>`;

const finalContent = contentPart1.substring(0, clockIndex) + newClockWithIconsBlock + contentPart1.substring(clockIndex + clockAnchor.length);

fs.writeFileSync(filePath, finalContent, 'utf8');
console.log("App.tsx has been successfully updated with shifted footer buttons!");
