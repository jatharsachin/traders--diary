const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'Dashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize content line endings for consistent replacement
content = content.replace(/\r\n/g, '\n');

// 1. Update signature of Dashboard function using regex
const sigRegex = /export\s+function\s+Dashboard\s*\(\s*\{\s*activeAccountId\s*=\s*['"]Combined['"],\s*onNavigateToTab\s*\}\s*:\s*\{\s*activeAccountId\?\s*:\s*string;\s*onNavigateToTab\?\s*:\s*\(tab:\s*any\)\s*=>\s*void;\s*\}\s*\)\s*\{/;

if (!sigRegex.test(content)) {
  console.error("Could not match the signature of Dashboard in Dashboard.tsx");
  process.exit(1);
}

content = content.replace(sigRegex, `export function Dashboard({ 
  activeAccountId = 'Combined', 
  onNavigateToTab,
  onSelectDateFilter
}: { 
  activeAccountId?: string; 
  onNavigateToTab?: (tab: any) => void;
  onSelectDateFilter?: (date: string) => void;
}) {`);

// 2. Add state declaration using regex
const stateRegex = /const\s*\{\s*trades\s*:\s*allTrades,\s*investments\s*:\s*allInvestments,/;

if (!stateRegex.test(content)) {
  console.error("Could not find the state anchor in Dashboard.tsx");
  process.exit(1);
}

content = content.replace(stateRegex, `const [selectedHeatmapDate, setSelectedHeatmapDate] = useState<string | null>(null);
  const {
    trades: allTrades,
    investments: allInvestments,`);

// 3. Add cell click handler
const oldCellClassName = 'className="heatmap-cell"';
const newCellClassName = 'onClick={() => setSelectedHeatmapDate(dateStr)} className="heatmap-cell"';

if (content.indexOf(oldCellClassName) === -1) {
  console.error("Could not find heatmap-cell className in Dashboard.tsx");
  process.exit(1);
}
content = content.replace(oldCellClassName, newCellClassName);

// 4. Render modal at the end before Broker-wise card
const endAnchor = "      {/* Card: Broker-wise performance stats */}";
const modalCode = `      {/* Heatmap Date Trades Detail Modal Overlay */}
      {selectedHeatmapDate && (() => {
        const dayTrades = trades.filter(t => t.date === selectedHeatmapDate);
        const dayInvestments = investments.filter(i => i.date === selectedHeatmapDate);
        const totalNetPnLOnDay = dayTrades.reduce((sum, t) => sum + t.netPnL, 0);
        const totalTradesCount = dayTrades.length;
        const isNoTradeDay = noTradeDays.includes(selectedHeatmapDate);
        
        return (
          <div 
            className="sidebar-backdrop" 
            onClick={() => setSelectedHeatmapDate(null)}
            style={{ 
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(4px)',
              zIndex: 3000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div 
              className="glass-card animate-tab-panel"
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '90%',
                maxWidth: '650px',
                background: 'var(--bg-tooltip-opaque)',
                border: '1.5px solid var(--border-color-active)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: 'var(--shadow-glow)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-color)', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                    Trades Logged: \${new Date(selectedHeatmapDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
                    Quick overview of trades executed on this calendar day
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedHeatmapDate(null)}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </div>

              {/* Day Metrics Ribbon */}
              {totalTradesCount > 0 && (
                <div style={{ display: 'flex', gap: '16px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Realized Net P&L</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: !isPnlVisible ? 'var(--text-dim)' : totalNetPnLOnDay >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                      {isPnlVisible ? (totalNetPnLOnDay >= 0 ? '+' : '') + '₹' + totalNetPnLOnDay.toLocaleString('en-IN') : '••••'}
                    </div>
                  </div>
                  <div style={{ width: '1px', background: 'var(--border-color)' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Executed Trades</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                      {totalTradesCount} Trades
                    </div>
                  </div>
                </div>
              )}

              {/* Trades List */}
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1.5px solid var(--border-color)', borderRadius: '8px' }}>
                {totalTradesCount > 0 || dayInvestments.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1.5px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Time</th>
                        <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Symbol</th>
                        <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Action</th>
                        <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Qty</th>
                        <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Net P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayTrades.map((t, idx) => (
                        <tr key={t.id} style={{ borderBottom: idx === dayTrades.length - 1 && dayInvestments.length === 0 ? 'none' : '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{t.entryTime}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                            {t.symbol}
                            {t.optionType && t.optionType !== 'None' && (
                              <span style={{ fontSize: '0.58rem', marginLeft: '4px', padding: '1px 3.5px', borderRadius: '3px', background: t.optionType === 'CE' ? 'rgba(48,209,88,0.1)' : 'rgba(255,69,58,0.1)', color: t.optionType === 'CE' ? 'var(--color-win)' : 'var(--color-loss)', border: t.optionType === 'CE' ? '1px solid var(--color-win-border)' : '1px solid var(--color-loss-border)' }}>{t.optionType}</span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 700, background: t.action === 'BUY' ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)', color: t.action === 'BUY' ? 'var(--color-win)' : 'var(--color-loss)' }}>{t.action}</span>
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{t.qty}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: !isPnlVisible ? 'var(--text-dim)' : t.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                            {isPnlVisible ? (t.netPnL >= 0 ? '+' : '') + '₹' + t.netPnL.toLocaleString('en-IN') : '••••'}
                          </td>
                        </tr>
                      ))}
                      {dayInvestments.map((inv, idx) => (
                        <tr key={inv.id} style={{ borderBottom: idx === dayInvestments.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>09:15</td>
                          <td style={{ padding: '8px 10px', fontWeight: 700 }}>{inv.symbol} <span style={{ fontSize: '0.58rem', padding: '1px 4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', borderRadius: '3px', border: '1px solid var(--border-color)' }}>INV</span></td>
                          <td style={{ padding: '8px 10px' }}><span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 700, background: 'rgba(48,209,88,0.12)', color: 'var(--color-win)' }}>BUY</span></td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>{inv.qty}</td>
                          <td style={{ padding: '8px 10px', color: 'var(--text-dim)' }}>Holding</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {isNoTradeDay ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '1.5rem' }}>🛡️</span>
                        <strong>Disciplined No-Trade Day</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>You explicitly marked this day to avoid trading!</span>
                      </div>
                    ) : (
                      "No trades logged on this calendar day"
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer / Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button 
                  onClick={() => setSelectedHeatmapDate(null)}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                >
                  Close
                </button>
                {totalTradesCount > 0 && onSelectDateFilter && (
                  <button 
                    onClick={() => {
                      onSelectDateFilter(selectedHeatmapDate);
                      setSelectedHeatmapDate(null);
                    }}
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>View in Logs Tab</span>
                    <span>→</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

`;

if (content.indexOf(endAnchor) === -1) {
  console.error("Could not find endAnchor in Dashboard.tsx");
  process.exit(1);
}
content = content.replace(endAnchor, modalCode + endAnchor);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Dashboard.tsx successfully updated with regex-based replacements!");
