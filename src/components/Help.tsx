import { useState, useMemo } from 'react';
import { 
  Rocket, 
  LayoutDashboard, 
  CalendarRange, 
  ScrollText, 
  BookOpenCheck, 
  Briefcase, 
  FileSpreadsheet, 
  Receipt, 
  Target, 
  Landmark, 
  LifeBuoy, 
  ShieldCheck, 
  Zap, 
  Eye, 
  Sparkles, 
  Search, 
  TrendingUp,
  Scale
} from 'lucide-react';

type SectionId = 
  | 'quickstart' 
  | 'dashboard' 
  | 'calendar' 
  | 'logger' 
  | 'journal' 
  | 'contractNotes' 
  | 'investments' 
  | 'ledger' 
  | 'taxation' 
  | 'shortcuts';

interface SectionItem {
  id: SectionId;
  title: string;
  subtitle: string;
  icon: typeof Rocket;
  color: string;
  badge?: string;
  keywords: string[];
}

const SECTIONS: SectionItem[] = [
  {
    id: 'quickstart',
    title: '1. Quick-Start Guide',
    subtitle: '5-Minute Onboarding Workflow',
    icon: Rocket,
    color: '#06b6d4',
    badge: 'START HERE',
    keywords: ['quick start', 'beginner', 'first trade', 'setup', 'onboarding', 'step', 'guide', 'workflow', 'how to use']
  },
  {
    id: 'dashboard',
    title: '2. Dashboard & KPIs',
    subtitle: 'Win Rate, Profit Factor & Drawdown',
    icon: LayoutDashboard,
    color: '#3b82f6',
    keywords: ['dashboard', 'win rate', 'profit factor', 'expectancy', 'drawdown', 'equity curve', 'kpi', 'metrics', 'analytics']
  },
  {
    id: 'calendar',
    title: '3. Calendar & Day Book',
    subtitle: 'Tile vs Row View & No-Trade Days',
    icon: CalendarRange,
    color: '#a855f7',
    keywords: ['calendar', 'day book', 'tile view', 'row view', 'no trade day', 'streak', 'heatmap', 'pdf review', 'weekend']
  },
  {
    id: 'logger',
    title: '4. Trade Logger & Importers',
    subtitle: 'Manual Logs & Broker Paste',
    icon: ScrollText,
    color: '#10b981',
    keywords: ['log trade', 'n key', 'shortcut', 'kotak neo', 'csv', 'broker import', 'options', 'manual log', 'symbol auto']
  },
  {
    id: 'journal',
    title: '5. Psychology & Mistakes',
    subtitle: 'Emotional Tagging & Day Reflections',
    icon: BookOpenCheck,
    color: '#ec4899',
    badge: 'PRO EDGE',
    keywords: ['journal', 'mistakes', 'fomo', 'overtrading', 'early exit', 'calm', 'fear', 'day note', 'psychology', 'reflection']
  },
  {
    id: 'contractNotes',
    title: '6. Contract Notes & Charges',
    subtitle: 'STT, GST, SEBI & Brokerage Audit',
    icon: FileSpreadsheet,
    color: '#f59e0b',
    keywords: ['contract notes', 'stt', 'gst', 'sebi', 'exchange fees', 'brokerage', 'reconciliation', 'gross net', 'charges']
  },
  {
    id: 'investments',
    title: '7. Investments & Portfolio',
    subtitle: 'Equity Delivery, ETFs & Gold Bonds',
    icon: Briefcase,
    color: '#14b8a6',
    keywords: ['investments', 'portfolio', 'delivery', 'etf', 'bonds', 'sgb', 'wealth', 'holdings', 'long term']
  },
  {
    id: 'ledger',
    title: '8. Bank & Broker Ledger',
    subtitle: 'Double-Entry Capital & Pay-In/Out',
    icon: Receipt,
    color: '#eab308',
    keywords: ['bank ledger', 'double entry', 'pay in', 'pay out', 'capital', 'cash flow', 'sbi', 'hdfc', 'transfer']
  },
  {
    id: 'taxation',
    title: '9. Setups & Tax Engine',
    subtitle: 'Section 43(5), STCG, LTCG & Audit',
    icon: Landmark,
    color: '#f97316',
    keywords: ['taxation', 'setups', 'f&o', 'section 43(5)', 'stcg', 'ltcg', 'audit 44ab', 'hit rate', 'speculative', 'business income']
  },
  {
    id: 'shortcuts',
    title: '10. Shortcuts & Privacy',
    subtitle: 'Hotkeys, Privacy Mode & Cloud Backup',
    icon: Zap,
    color: '#8b5cf6',
    keywords: ['shortcuts', 'hotkeys', 'privacy eye', 'multi account', 'dhan sachin', 'rupali', 'cloud sync', 'supabase', 'backup']
  }
];

export function Help() {
  const [activeSection, setActiveSection] = useState<SectionId>('quickstart');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return SECTIONS;
    const q = searchQuery.toLowerCase().trim();
    return SECTIONS.filter(s => 
      s.title.toLowerCase().includes(q) ||
      s.subtitle.toLowerCase().includes(q) ||
      s.keywords.some(k => k.includes(q))
    );
  }, [searchQuery]);

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1240px', margin: '0 auto' }}>
      
      {/* Help Hero Header */}
      <div 
        className="glass-card animate-tab-panel" 
        style={{ 
          padding: '28px 24px', 
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(99, 102, 241, 0.04) 50%, rgba(168, 85, 247, 0.03) 100%)',
          border: '1px solid var(--border-color-active)',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ 
            background: 'rgba(6, 182, 212, 0.12)', 
            border: '1.2px solid rgba(6, 182, 212, 0.35)',
            borderRadius: '14px',
            width: '52px',
            height: '52px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            boxShadow: '0 4px 16px rgba(6, 182, 212, 0.15)'
          }}>
            <LifeBuoy size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                TradeDiary Pro Knowledge Base & User Manual
              </h1>
              <span style={{ 
                fontSize: '0.62rem', 
                fontWeight: 700, 
                padding: '2px 8px', 
                borderRadius: '10px', 
                background: 'rgba(52, 211, 153, 0.12)', 
                color: 'var(--color-win)', 
                border: '1px solid rgba(52, 211, 153, 0.25)' 
              }}>
                v2026.11
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: 0 }}>
              Master every feature: trade logging, calendar analytics, psychology journaling, double-entry ledgers, and Indian tax audits.
            </p>
          </div>
        </div>

        {/* Live Search Input */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search documentation (e.g. STT, Shortcut, No-Trade)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              fontSize: '0.78rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'rgba(0, 0, 0, 0.3)',
              color: 'var(--text-main)',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Two Column Layout: Navigation & Content */}
      <div style={{ display: 'flex', gap: '22px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Left Column: Quick Navigation Links */}
        <div 
          className="glass-card" 
          style={{ 
            width: '100%', 
            maxWidth: '300px', 
            padding: '14px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px 8px 8px', borderBottom: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.06em' }}>
              GUIDE MODULES
            </span>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              {filteredSections.length} Topics
            </span>
          </div>

          {filteredSections.length === 0 ? (
            <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              No guide topics matched your search.
            </div>
          ) : (
            filteredSections.map(sec => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button 
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`sidebar-tab-btn ${isActive ? 'active' : ''}`}
                  style={{ 
                    width: '100%', 
                    justifyContent: 'space-between', 
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: isActive ? '1px solid var(--border-color-active)' : '1px solid transparent',
                    background: isActive ? 'var(--bg-card-hover)' : 'transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', minWidth: 0 }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '6px',
                      background: isActive ? sec.color : 'rgba(255, 255, 255, 0.04)',
                      color: isActive ? '#fff' : sec.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Icon size={14} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--text-main)' : 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sec.title}
                      </div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sec.subtitle}
                      </div>
                    </div>
                  </div>
                  {sec.badge && (
                    <span style={{ 
                      fontSize: '0.55rem', 
                      fontWeight: 800, 
                      padding: '2px 5px', 
                      borderRadius: '4px', 
                      background: 'rgba(236, 72, 153, 0.15)', 
                      color: '#ec4899',
                      letterSpacing: '0.04em'
                    }}>
                      {sec.badge}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Right Column: Guide Content Panel */}
        <div style={{ flex: 1, minWidth: '320px' }}>
          
          {/* ============================================================ */}
          {/* SECTION 1: QUICK START 5-STEP JOURNEY */}
          {/* ============================================================ */}
          {activeSection === 'quickstart' && (
            <div className="glass-card animate-tab-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', padding: '6px', borderRadius: '8px' }}>
                    <Rocket size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Quick-Start 5-Step Journey</h2>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>A beginner-friendly roadmap to get onboarded and master the system in 5 minutes</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                  Onboarding Step-by-Step
                </span>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                TradeDiary Pro is an **institutional-grade trading journal and capital audit OS**. Follow these 5 consecutive steps to establish disciplined trading records from day one:
              </p>

              {/* 5-Step Interactive Roadmap */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Step 1 */}
                <div style={{ display: 'flex', gap: '14px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                    1
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        Select Account & Financial Year
                      </h3>
                      <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 600 }}>Top Header Bar</span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                      Head to the top header and pick your active broker account (e.g. <strong>Dhan Sachin</strong>, <strong>Dhan Rupali</strong>, or <strong>Combined Multi-Account View</strong>). Ensure the active Financial Year (e.g. <strong>FY 2026-27</strong>) matches your current trading calendar so all P&L metrics align accurately.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div style={{ display: 'flex', gap: '14px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                    2
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        Log Your Executions
                      </h3>
                      <span style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 600 }}>+ Log Trade button or [N] Hotkey</span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                      Click the blue <strong>+ Log Trade</strong> button or press <strong>[N]</strong> on your keyboard. Fill in the Buy/Sell side, Contract Symbol (e.g. NIFTY 24400 CE), Entry/Exit prices, and Quantity. Most importantly, tag your verified <strong>Setup</strong> (e.g. Zen Credit Spread, Vacuum GRID) and your <strong>Emotional State</strong> (Calm 🧘 or Fear ⚡).
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div style={{ display: 'flex', gap: '14px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: '#fff', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                    3
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        Review Calendar & Mark Discipline Days
                      </h3>
                      <span style={{ fontSize: '0.65rem', color: '#a855f7', fontWeight: 600 }}>Calendar & Day Book Tab</span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                      Inspect your monthly distribution of green (Win) and red (Loss) days in the <strong>Calendar</strong>. Click any day to see its underlying executions. If the market gave no valid setup or you deliberately abstained from trading, toggle <strong>Mark as No-Trade Day 🛡️</strong> to track and reward discipline.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div style={{ display: 'flex', gap: '14px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                    4
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        Audit Contract Notes & Reconcile Charges
                      </h3>
                      <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 600 }}>Contract Notes Tab</span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                      Cross-reference your broker's end-of-day contract note against TradeDiary Pro. Audit exact Brokerage, STT/CTT, Exchange Turnover Fees, GST, and SEBI turnover levies. Reconciling the gap between <strong>Gross P&L</strong> and <strong>Net Realized P&L</strong> prevents hidden brokerage leakage.
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div style={{ display: 'flex', gap: '14px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                    5
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        Log Behavioral Reflections & Prep Tomorrow
                      </h3>
                      <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>Journal & Notes Tab</span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                      After market close, head to <strong>Journal & Notes</strong>. Tag behavioral execution errors (e.g. <strong>FOMO</strong>, <strong>Overtrading</strong>, <strong>Early Exit</strong>), write down your daily market lessons, and outline your game plan for tomorrow's open.
                    </p>
                  </div>
                </div>

              </div>

              {/* Quick Summary Callout */}
              <div style={{ background: 'rgba(6, 182, 212, 0.04)', border: '1px solid rgba(6, 182, 212, 0.25)', borderRadius: '8px', padding: '14px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Sparkles size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  <strong>Pro Tip:</strong> When presenting your screen or sharing screenshots with fellow traders, toggle the <strong>Eye Icon</strong> in the top header. It instantly blurs monetary values while preserving percentage returns!
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SECTION 2: DASHBOARD & METRICS */}
          {/* ============================================================ */}
          {activeSection === 'dashboard' && (
            <div className="glass-card animate-tab-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '6px', borderRadius: '8px' }}>
                  <LayoutDashboard size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Dashboard, Equity Curve & KPIs</h2>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Understand quantitative metrics that determine long-term trading longevity</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                The Dashboard serves as the central mission control for your trading business. Beyond raw P&L, it continuously computes 4 essential performance indicators:
              </p>

              {/* 4 Big KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Win Rate
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-win)', margin: '4px 0' }}>
                    Winning Trades ÷ Total Trades
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    Percentage of trades concluded in profit. In institutional trading, a 50% to 60% win rate generates immense alpha when paired with a favorable risk-reward ratio.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Profit Factor
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b82f6', margin: '4px 0' }}>
                    Gross Profit ÷ Gross Loss
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    <strong>Above 1.5:</strong> Healthy edge.<br />
                    <strong>Above 2.0:</strong> Exceptional institutional standard.<br />
                    <strong>Below 1.0:</strong> Negative edge (re-evaluate strategy).
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Expectancy Ratio
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#a855f7', margin: '4px 0' }}>
                    (Win% × Avg Win) - (Loss% × Avg Loss)
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    The average expected rupee return for every single executed trade. A positive expectancy proves statistical edge over a sample of 100+ executions.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Maximum Drawdown
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-loss)', margin: '4px 0' }}>
                    Peak-to-Trough Capital Dip %
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    The largest decline from historical equity peak. Keeping this metric contained is the single most critical factor in avoiding account blowups.
                  </p>
                </div>

              </div>

              {/* Equity Curve & Heatmap Explanation */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} color="var(--primary)" />
                  Cumulative Equity Curve & Broker Analytics:
                </h3>
                <ul style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, paddingLeft: '18px', lineHeight: 1.6 }}>
                  <li><strong>Cumulative Equity Curve:</strong> Displays compounding progress over time. A smooth upward slope confirms execution consistency without excessive volatility.</li>
                  <li><strong>Yearly Activity Heatmap:</strong> Visualizes all 365 days of the financial year. Hovering on any tile reveals day-specific trade frequency and realized return.</li>
                  <li><strong>Broker Performance Comparison:</strong> Evaluates which account (e.g. Dhan, Zerodha, Groww) delivers better execution fills and lower effective commission friction.</li>
                </ul>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SECTION 3: CALENDAR & DAY BOOK */}
          {/* ============================================================ */}
          {activeSection === 'calendar' && (
            <div className="glass-card animate-tab-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <div style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', padding: '6px', borderRadius: '8px' }}>
                  <CalendarRange size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Trading Calendar & Day Book Workflow</h2>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Switch seamlessly between Tile View, Row View, and audit daily execution runs</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                The Calendar maps each calendar session to realized P&L, statutory charges, winning/losing streaks, and session-level remarks.
              </p>

              {/* View Comparison Table */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '10px 14px', color: 'var(--text-main)' }}>Feature / Aspect</th>
                      <th style={{ padding: '10px 14px', color: 'var(--text-main)' }}>Tile View (Monthly Grid)</th>
                      <th style={{ padding: '10px 14px', color: 'var(--text-main)' }}>Row View (Compact List)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--primary)' }}>Layout</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>Traditional Monday-Sunday monthly grid with crisp Win/Loss cards</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>Chronological list detailing trades count, Gross P&L, Net P&L, and Charges</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--primary)' }}>Interaction</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>Clicking any day tile instantly pulls up its exact trade orders table below</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>Clicking a row expands session details and opens the contract note auditor</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--primary)' }}>Best For</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>Quick visual recognition of winning/losing streaks and monthly consistency</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>Auditing exact transaction fees and fee-to-profit ratios per trading day</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Special Disciplined Feature: No Trade Day */}
              <div style={{ border: '1.2px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', padding: '16px', background: 'rgba(59, 130, 246, 0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <ShieldCheck size={18} color="#3b82f6" />
                  <h3 style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    Disciplined "No-Trade Day" 🛡️ Marker
                  </h3>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  Sitting on your hands when market conditions are choppy is an active trading decision. When no setups trigger, select the date and click <strong>Mark Date as No-Trade Day</strong>. The date card turns blue with a discipline shield badge, protecting your capital and celebrating emotional restraint.
                </p>
              </div>

              {/* PDF and Weekend Review */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    📄 1-Page Month PDF
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    Click the <strong>1-Page Month PDF</strong> button to generate an executive-summary printout covering monthly turnover, net returns, and charge totals. Ideal for tax auditors, accountants, and mentoring reviews.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    📖 Weekend Review Mode
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    On non-trading days, trigger <strong>Weekend Review</strong> to inspect all weekly trades, stop-loss adherence, and position sizing without live market distractions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SECTION 4: LOGGER & IMPORTERS */}
          {/* ============================================================ */}
          {activeSection === 'logger' && (
            <div className="glass-card animate-tab-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '6px', borderRadius: '8px' }}>
                  <ScrollText size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Logging Trades, Hotkeys & Importers</h2>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Manual logging modal, [N] hotkey, and automatic broker statement imports</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                TradeDiary Pro provides two swift methods to capture your trade executions:
              </p>

              {/* Method 1: Manual Modal */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'rgba(255,255,255,0.015)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    Method 1: Manual Logging Dialog (+ Log Trade / [N] Hotkey)
                  </h3>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                    MOST ACCURATE
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                  Press <strong>[N]</strong> anywhere in the application to pop open the trade logger. Key features include:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <strong style={{ fontSize: '0.74rem', color: 'var(--text-main)', display: 'block' }}>1. Symbol Auto-Detection:</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Typing "NIFTY 24400 CE" automatically sets strike price, option type, and instrument index.</span>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <strong style={{ fontSize: '0.74rem', color: 'var(--text-main)', display: 'block' }}>2. Account Routing:</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Assign trades to specific accounts (Dhan, Zerodha, Groww) with customized brokerages.</span>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <strong style={{ fontSize: '0.74rem', color: 'var(--text-main)', display: 'block' }}>3. Setup & Emotion Tagging:</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tag your setup thesis (Zen Spread, GRID) and emotional state (Calm, Fear, FOMO).</span>
                  </div>
                </div>
              </div>

              {/* Method 2: Copy Paste Importer */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'rgba(255,255,255,0.015)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    Method 2: Copy-Paste Kotak Neo / Broker Statements
                  </h3>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                    HIGH-SPEED
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  Under <strong>Profile Settings → Import Trade Statements</strong>, paste the raw copied table columns from your Kotak Neo or broker tradebook. The intelligent parser matches corresponding buy/sell legs, calculates gross & net figures, and creates unified trades in seconds.
                </p>
              </div>

              {/* Logs Search & Advanced Ribbon */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  🔍 Logs Tab Advanced Filter Ribbon:
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  Filter thousands of historical trades across custom date windows, segments (F&O, Equity, Commodity), setups, emotions, and brokers. Clicking the <strong>✕</strong> badge on any active filter chip resets that parameter instantly.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SECTION 5: JOURNAL & PSYCHOLOGY */}
          {/* ============================================================ */}
          {activeSection === 'journal' && (
            <div className="glass-card animate-tab-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <div style={{ background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', padding: '6px', borderRadius: '8px' }}>
                  <BookOpenCheck size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Trading Psychology, Mistakes & Daily Reflections</h2>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Auditing emotional pitfalls is the secret differentiator of consistently profitable traders</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                Amateur traders track only their P&L, but professional traders ruthlessly track their **behavioral mistakes**. TradeDiary Pro is built to help you eliminate repeated behavioral leakages:
              </p>

              {/* Emotion & Mistake Tags Showcase */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#10b981' }}>🧘 Mindset & Emotional States</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)', fontWeight: 700 }}>
                      CALM (Disciplined Execution)
                    </span>
                    <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', fontWeight: 700 }}>
                      FEAR (Panic / Premature Cut)
                    </span>
                    <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)', fontWeight: 700 }}>
                      GREED (Over-leveraging)
                    </span>
                    <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.25)', fontWeight: 700 }}>
                      REVENGE (Chasing Losses)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    Tag your mind state at entry. At month-end, the Dashboard analytics reveal your exact P&L when Calm versus when operating under Fear or Revenge.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#ef4444' }}>⚠️ Behavioral Mistake Tags</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 600 }}>
                      EARLY EXIT (Cutting Winners)
                    </span>
                    <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 600 }}>
                      FOMO (Chasing Extended Green)
                    </span>
                    <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 600 }}>
                      OVERTRADING (Unplanned Fills)
                    </span>
                    <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 600 }}>
                      NO STOP LOSS (Unprotected Risk)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    Tag mistakes directly in the Trade Table. Quantify how much capital you surrendered to FOMO or early exits over any timeframe.
                  </p>
                </div>

              </div>

              {/* Day Note & Reflections */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 8px 0' }}>
                  📝 Day Notes, Account Reflections & Tomorrow's Preparation:
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                  Under <strong>Journal & Notes</strong>, daily notes are structured cleanly per broker account (e.g. Dhan Sachin, Dhan Rupali). Record 3 core takeaways daily:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.73rem', color: 'var(--text-dim)' }}>
                  <div>🔹 <strong>Lessons Learned:</strong> Key observations from session behavior (e.g. "Do not chase gap-ups beyond the opening range").</div>
                  <div>🔹 <strong>Market Structure:</strong> Was the index trending or mean-reverting within an established value area?</div>
                  <div>🔹 <strong>Tomorrow's Game Plan:</strong> Exact key support/resistance levels and planned risk allocations for tomorrow.</div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SECTION 6: CONTRACT NOTES & CHARGES */}
          {/* ============================================================ */}
          {activeSection === 'contractNotes' && (
            <div className="glass-card animate-tab-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '6px', borderRadius: '8px' }}>
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Contract Notes & Statutory Charges Reconciliation</h2>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Audit STT, GST, SEBI charges, and brokerage against your actual broker bills</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                Screens often display alluring gross profits, yet transactional friction can quietly eat 10% to 30% of gains. TradeDiary Pro provides total transparency between <strong>Gross P&L</strong> and <strong>Net Realized P&L</strong>:
              </p>

              {/* Breakdown of Charges Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)' }}>
                  <strong style={{ fontSize: '0.76rem', color: '#f59e0b', display: 'block', marginBottom: '4px' }}>Brokerage</strong>
                  <p style={{ fontSize: '0.71rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    Typically a flat ₹20 per executed order (or 0.03%). A completed trade (both entry and exit legs) incurs ₹40 standard brokerage.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)' }}>
                  <strong style={{ fontSize: '0.76rem', color: '#f59e0b', display: 'block', marginBottom: '4px' }}>STT / CTT (Govt Tax)</strong>
                  <p style={{ fontSize: '0.71rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    Securities Transaction Tax levied on option premium sell-side turnover (0.1% to 0.125%). Option buy legs incur zero STT.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)' }}>
                  <strong style={{ fontSize: '0.76rem', color: '#f59e0b', display: 'block', marginBottom: '4px' }}>Exchange Tx & SEBI Levies</strong>
                  <p style={{ fontSize: '0.71rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    NSE/BSE exchange turnover fees plus SEBI regulatory turnover charges (₹10 per crore turnover).
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)' }}>
                  <strong style={{ fontSize: '0.76rem', color: '#f59e0b', display: 'block', marginBottom: '4px' }}>GST (18% Goods & Services Tax)</strong>
                  <p style={{ fontSize: '0.71rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    Calculated as 18% on the sum of (Brokerage + Exchange Tx Fee + SEBI Turnover Fee).
                  </p>
                </div>

              </div>

              {/* Day's Charges / Contract Note Button in Calendar */}
              <div style={{ background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px', padding: '16px' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                  📑 Using the "Day's Charges / Contract Note" Auditor:
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  Whenever you select a session in the Calendar or Day Book, click the blue <strong>Day's Charges / Contract Note</strong> button. This opens a dedicated reconciliation dialog allowing you to verify or fine-tune exact STT, GST, and stamp duty charges against your broker's PDF bill, eliminating penny discrepancies.
                </p>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SECTION 7: INVESTMENTS & PORTFOLIO */}
          {/* ============================================================ */}
          {activeSection === 'investments' && (
            <div className="glass-card animate-tab-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <div style={{ background: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6', padding: '6px', borderRadius: '8px' }}>
                  <Briefcase size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Investments & Long-Term Asset Tracking</h2>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Convert active trading profits into long-term compounding generational wealth</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                Savvy market operators systematically sweep F&O/intraday profits out of their margin accounts and reinvest into **long-term asset classes**. The <strong>Investments</strong> module tracks this compounding engine:
              </p>

              {/* Supported Asset Classes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)' }}>
                  <strong style={{ fontSize: '0.76rem', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>📈 Equity Delivery Holdings</strong>
                  <span style={{ fontSize: '0.71rem', color: 'var(--text-dim)' }}>Blue-chip equities (Reliance, TCS, HDFC Bank) with tracked average cost basis and holding returns.</span>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)' }}>
                  <strong style={{ fontSize: '0.76rem', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>📊 ETFs & Index Funds</strong>
                  <span style={{ fontSize: '0.71rem', color: 'var(--text-dim)' }}>Regular SIP allocations across NiftyBeES, BankBeES, ITBeES, and broad market indices.</span>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)' }}>
                  <strong style={{ fontSize: '0.76rem', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>🪙 Sovereign Gold Bonds (SGB)</strong>
                  <span style={{ fontSize: '0.71rem', color: 'var(--text-dim)' }}>Tax-exempt gold investment tracking with 2.5% annual semi-annual coupon yields.</span>
                </div>

              </div>

              {/* Wealth KPI vs Capital KPI */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                  💡 Capital vs Wealth KPI Distinction:
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  The <strong>Capital</strong> pill in the top header reflects active deployable margin in your brokerage account. Meanwhile, the <strong>Wealth</strong> pill calculates your true consolidated net worth: bank balances + long-term equity delivery portfolios + active trading capital!
                </p>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SECTION 8: BANK LEDGER */}
          {/* ============================================================ */}
          {activeSection === 'ledger' && (
            <div className="glass-card animate-tab-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <div style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', padding: '6px', borderRadius: '8px' }}>
                  <Receipt size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Double-Entry Bank Ledger & Capital Adjustments</h2>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Reconcile fund transfers between bank accounts and trading brokers seamlessly</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                Traders frequently transfer funds back and forth without tracking cash flows, resulting in distorted capital figures. TradeDiary Pro utilizes true **double-entry bookkeeping** to keep both sides balanced:
              </p>

              {/* Diagram of Flow */}
              <div style={{ display: 'flex', justifyContent: 'center', background: 'rgba(255,255,255,0.015)', border: '1.2px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                <svg width="100%" height="150" viewBox="0 0 600 150" style={{ maxWidth: '520px' }}>
                  {/* Bank Box */}
                  <rect x="20" y="25" width="170" height="95" rx="8" fill="var(--bg-card)" stroke="var(--border-color)" strokeWidth="1.2" />
                  <text x="105" y="48" fill="var(--text-main)" fontSize="11" fontWeight="bold" textAnchor="middle">🏦 HDFC / SBI Bank</text>
                  <text x="105" y="70" fill="var(--text-muted)" fontSize="8.5" textAnchor="middle">Savings Account</text>
                  <text x="105" y="90" fill="var(--color-win)" fontSize="9" fontWeight="bold" textAnchor="middle">Balance: ₹15,00,000</text>

                  {/* Broker Box */}
                  <rect x="410" y="25" width="170" height="95" rx="8" fill="var(--bg-card)" stroke="var(--border-color)" strokeWidth="1.2" />
                  <text x="495" y="48" fill="var(--text-main)" fontSize="11" fontWeight="bold" textAnchor="middle">💼 Dhan / Zerodha</text>
                  <text x="495" y="70" fill="var(--text-muted)" fontSize="8.5" textAnchor="middle">Trading Margin</text>
                  <text x="495" y="90" fill="var(--primary)" fontSize="9" fontWeight="bold" textAnchor="middle">Capital: ₹5,00,000</text>

                  {/* Pay-In Arrow */}
                  <path d="M 200 50 L 400 50" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,4" />
                  <polygon points="398,47 406,50 398,53" fill="#f59e0b" />
                  <rect x="250" y="36" width="100" height="15" rx="3" fill="#f59e0b" />
                  <text x="300" y="47" fill="#fff" fontSize="7" fontWeight="bold" textAnchor="middle">Broker Pay-In (Debit Bank)</text>

                  {/* Pay-Out Arrow */}
                  <path d="M 400 90 L 200 90" stroke="#10b981" strokeWidth="2" strokeDasharray="4,4" />
                  <polygon points="202,87 194,90 202,93" fill="#10b981" />
                  <rect x="250" y="76" width="100" height="15" rx="3" fill="#10b981" />
                  <text x="300" y="87" fill="#fff" fontSize="7" fontWeight="bold" textAnchor="middle">Profit Withdrawal (Credit Bank)</text>
                </svg>
              </div>

              {/* Ledger Transaction Categories */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-main)' }}>
                    🟢 Broker Pay-In
                  </h4>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    When adding trading capital via UPI/NetBanking, the double-entry engine debits your bank balance and automatically credits your broker's active margin.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-main)' }}>
                    🔵 Broker Pay-Out (Withdrawal)
                  </h4>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    Sweeping realized profits back into your bank account decreases trading margin and credits your primary savings ledger.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SECTION 9: SETUPS & TAXATION ENGINE */}
          {/* ============================================================ */}
          {activeSection === 'taxation' && (
            <div className="glass-card animate-tab-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <div style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#f97316', padding: '6px', borderRadius: '8px' }}>
                  <Landmark size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Setups Analytics & Indian Taxation Engine</h2>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Strategy hit rate evaluation, Income Tax Act classifications, and Section 44AB audits</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                Under Indian tax regulations, F&O, intraday equity, and long-term deliveries are taxed under fundamentally different heads of income. TradeDiary Pro automatically categorizes your turnover:
              </p>

              {/* Indian Tax Rules Table */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '8px 12px', color: 'var(--text-main)' }}>Trading Segment</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-main)' }}>Income Tax Section</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-main)' }}>Tax Treatment</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-main)' }}>Allowable Deductions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: 'var(--primary)' }}>F&O (Futures & Options)</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-dim)' }}>Section 43(5)</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-dim)' }}>Non-Speculative Business Income (Taxed at individual slab rates)</td>
                      <td style={{ padding: '9px 12px', color: 'var(--color-win)' }}>Brokerage, internet bills, advisory fees, hardware depreciation</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#f59e0b' }}>Equity Intraday</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-dim)' }}>Section 73</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-dim)' }}>Speculative Business Income</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-dim)' }}>Intraday losses can only be set off against speculative intraday gains</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#10b981' }}>Short-Term Capital Gain (STCG)</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-dim)' }}>Section 111A</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-dim)' }}>Flat 20% on equity shares held under 12 months</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>Business expense deductions not permitted</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#a855f7' }}>Long-Term Capital Gain (LTCG)</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-dim)' }}>Section 112A</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-dim)' }}>12.5% on profits exceeding ₹1.25 Lakh per financial year</td>
                      <td style={{ padding: '9px 12px', color: 'var(--color-win)' }}>First ₹1,25,000 annual capital gains completely tax-free</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Setups Analytics Card */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'rgba(255,255,255,0.015)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Target size={18} color="#ec4899" />
                  <h3 style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    🎯 Setups Hit Rate Analytics:
                  </h3>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  The <strong>Setups</strong> tab analyzes win rates, payoff ratios, and expectancy across individual setups (e.g. <em>Zen Credit Spread</em>, <em>Vacuum GRID</em>, <em>Expiry Scalp</em>). Discard underperforming setups and double down on proven statistical edges.
                </p>
              </div>

              {/* Section 44AB Tax Audit Rule */}
              <div style={{ border: '1px solid rgba(249, 115, 22, 0.3)', borderRadius: '10px', padding: '14px', background: 'rgba(249, 115, 22, 0.04)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f97316', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Scale size={16} />
                  Section 44AB Tax Audit Thresholds:
                </div>
                <p style={{ fontSize: '0.73rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  In F&O, turnover is computed as <strong>Absolute Profit + Absolute Loss</strong>. When more than 95% of transactions are routed digitally through banking channels, the mandatory audit threshold is <strong>₹10 Crore</strong>. Always verify your specific declarations with a licensed Chartered Accountant (CA).
                </p>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* SECTION 10: SHORTCUTS, PRIVACY & CLOUD */}
          {/* ============================================================ */}
          {activeSection === 'shortcuts' && (
            <div className="glass-card animate-tab-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <div style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', padding: '6px', borderRadius: '8px' }}>
                  <Zap size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Shortcuts, Privacy Mode & Multi-Broker Sync</h2>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Accelerate your workflow with keyboard hotkeys, privacy masking, and encrypted cloud sync</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                Supercharge your journaling speed with native hotkeys and privacy controls:
              </p>

              {/* Hotkeys Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid var(--border-color-active)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>
                    [N]
                  </kbd>
                  <div>
                    <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)', display: 'block' }}>Log New Trade</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Instantly opens the trade entry modal from any view.</span>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(6, 182, 212, 0.12)', border: '1.5px solid rgba(6, 182, 212, 0.3)', borderRadius: '6px', padding: '6px 8px', color: 'var(--primary)' }}>
                    <Eye size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)', display: 'block' }}>Privacy Eye Toggle</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Hides absolute P&L digits, displaying only percentages.</span>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid var(--border-color-active)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.85rem', fontWeight: 800, color: '#a855f7', fontFamily: 'monospace' }}>
                    FY Switcher
                  </kbd>
                  <div>
                    <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)', display: 'block' }}>FY Filter</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Filter all dashboard curves by specific fiscal years.</span>
                  </div>
                </div>

              </div>

              {/* Multi Account Switcher Guide */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="var(--color-win)" />
                  Multi-Account Terminal Mode:
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  Manage multiple accounts (e.g. self, family members, or multiple brokers) under a unified interface. Use the top <strong>Account Switcher</strong> to isolate a single account or toggle multi-selection for a <strong>Consolidated Master Portfolio View</strong>.
                </p>
              </div>

              {/* Cloud Sync & Security */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'rgba(255,255,255,0.015)' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                  ☁️ Local-First Storage & Supabase Cloud Backup:
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  All your trade histories, journals, and notes are cached locally on your device for sub-millisecond response times. Enabling Supabase Cloud Sync automatically creates encrypted offsite backups, safeguarding your journal across hardware upgrades.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
