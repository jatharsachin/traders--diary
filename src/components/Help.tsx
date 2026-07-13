import { useState } from 'react';
import { 
  Play, Calendar, HelpCircle, FileText, ShieldCheck, Compass, Receipt, Percent
} from 'lucide-react';

export function Help() {
  const [activeSection, setActiveSection] = useState<'intro' | 'logger' | 'calendar' | 'ledger' | 'taxation'>('intro');

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Help Hero Header */}
      <div 
        className="glass-card animate-tab-panel" 
        style={{ 
          padding: '30px 24px', 
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%)',
          border: '1px solid var(--border-color-active)',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ 
            background: 'rgba(6, 182, 212, 0.12)', 
            border: '1.2px solid rgba(6, 182, 212, 0.3)',
            borderRadius: '12px',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <HelpCircle size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>Help Center & Guides</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
              Learn how to navigate TradeDiary Pro, analyze setups, audit tax liabilities, and manage capital ledgers.
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Navigation & Content */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* Left Column: Quick Navigation Links */}
        <div 
          className="glass-card" 
          style={{ 
            width: '100%', 
            maxWidth: '280px', 
            padding: '16px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', padding: '0 8px 4px 8px', borderBottom: '1px solid var(--border-color)' }}>
            USER GUIDES
          </span>
          
          <button 
            onClick={() => setActiveSection('intro')}
            className={`sidebar-tab-btn ${activeSection === 'intro' ? 'active' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 12px' }}
          >
            <Play size={14} color={activeSection === 'intro' ? '#fff' : '#06b6d4'} />
            <span style={{ fontSize: '0.78rem' }}>1. Getting Started & UI</span>
          </button>
          
          <button 
            onClick={() => setActiveSection('logger')}
            className={`sidebar-tab-btn ${activeSection === 'logger' ? 'active' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 12px' }}
          >
            <FileText size={14} color={activeSection === 'logger' ? '#fff' : '#34d399'} />
            <span style={{ fontSize: '0.78rem' }}>2. Logging & Importing Trades</span>
          </button>
          
          <button 
            onClick={() => setActiveSection('calendar')}
            className={`sidebar-tab-btn ${activeSection === 'calendar' ? 'active' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 12px' }}
          >
            <Calendar size={14} color={activeSection === 'calendar' ? '#fff' : '#a855f7'} />
            <span style={{ fontSize: '0.78rem' }}>3. Calendar & Performance</span>
          </button>
          
          <button 
            onClick={() => setActiveSection('ledger')}
            className={`sidebar-tab-btn ${activeSection === 'ledger' ? 'active' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 12px' }}
          >
            <Receipt size={14} color={activeSection === 'ledger' ? '#fff' : '#f59e0b'} />
            <span style={{ fontSize: '0.78rem' }}>4. Double-Entry Bank Ledger</span>
          </button>
          
          <button 
            onClick={() => setActiveSection('taxation')}
            className={`sidebar-tab-btn ${activeSection === 'taxation' ? 'active' : ''}`}
            style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 12px' }}
          >
            <Percent size={14} color={activeSection === 'taxation' ? '#fff' : '#f97316'} />
            <span style={{ fontSize: '0.78rem' }}>5. Setup Audits & Taxation</span>
          </button>
        </div>

        {/* Right Column: Guide Content Panel */}
        <div style={{ flex: 1, minWidth: '320px' }}>
          
          {/* SECTION 1: INTRODUCTION */}
          {activeSection === 'intro' && (
            <div className="glass-card animate-tab-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <Play size={18} color="var(--primary)" />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Getting Started & UI Navigation</h2>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                Welcome to **TradeDiary Pro**! This platform provides a complete suite of journal, tracking, analysis, and capital auditing utilities designed to help traders record trade logs systematically and avoid behavioral errors.
              </p>

              {/* Diagram 1: Navigation Layout */}
              <div style={{ display: 'flex', justifyContent: 'center', background: 'rgba(255,255,255,0.015)', border: '1.2px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                <svg width="100%" height="160" viewBox="0 0 600 160" style={{ maxWidth: '500px' }}>
                  {/* Left Sidebar Frame */}
                  <rect x="10" y="10" width="120" height="140" rx="8" fill="var(--bg-card)" stroke="var(--border-color)" strokeWidth="1.5" />
                  <rect x="20" y="25" width="100" height="24" rx="4" fill="rgba(6, 182, 212, 0.12)" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="1" />
                  <text x="70" y="40" fill="var(--primary)" fontSize="8" fontWeight="bold" textAnchor="middle">TradeDiary Pro</text>
                  <line x1="20" y1="60" x2="120" y2="60" stroke="var(--border-color)" strokeWidth="1" />
                  
                  <rect x="25" y="70" width="90" height="12" rx="3" fill="rgba(255,255,255,0.03)" />
                  <text x="32" y="78" fill="var(--text-main)" fontSize="7">🏠 Dashboard</text>
                  <rect x="25" y="88" width="90" height="12" rx="3" fill="rgba(255,255,255,0.03)" />
                  <text x="32" y="96" fill="var(--text-main)" fontSize="7">📅 Calendar</text>
                  <rect x="25" y="106" width="90" height="12" rx="3" fill="rgba(255,255,255,0.03)" />
                  <text x="32" y="114" fill="var(--text-main)" fontSize="7">⏱️ Help & Guide</text>

                  {/* Main Content Area Frame */}
                  <rect x="150" y="10" width="440" height="140" rx="8" fill="rgba(0,0,0,0.2)" stroke="var(--border-color)" strokeWidth="1.5" />
                  <rect x="160" y="20" width="420" height="25" rx="6" fill="var(--bg-card)" stroke="var(--border-color)" strokeWidth="1.2" />
                  <text x="172" y="36" fill="var(--text-muted)" fontSize="8">Top status bar: Account Switcher, Clock, P&L visibility eye toggle</text>
                  
                  {/* Status Bar Icons */}
                  <circle cx="535" cy="32" r="5" fill="var(--border-color)" />
                  <circle cx="550" cy="32" r="5" fill="var(--border-color)" />
                  <circle cx="565" cy="32" r="5" fill="var(--primary)" />

                  <rect x="160" y="55" width="200" height="85" rx="6" fill="var(--bg-card)" stroke="var(--border-color)" />
                  <text x="170" y="70" fill="var(--text-main)" fontSize="8" fontWeight="bold">Returns & Performance curve</text>
                  
                  <rect x="375" y="55" width="205" height="85" rx="6" fill="var(--bg-card)" stroke="var(--border-color)" />
                  <text x="385" y="70" fill="var(--text-main)" fontSize="8" fontWeight="bold">Setup breakdown charts</text>
                </svg>
              </div>

              {/* Core Features list */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <ShieldCheck size={14} color="var(--color-win)" />
                    <span>Real-time Multi-User Sync</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    Supports custom user accounts and cloud synchronization backed by Supabase. Your settings, journals, and balances remain backed up.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <ShieldCheck size={14} color="var(--color-win)" />
                    <span>P&L Privacy Toggle</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                    Click the **eye icon** in the top status bar to toggle digits visibility. Realized currency figures will be hidden, while percentage returns remain visible.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: LOGGER & IMPORTER */}
          {activeSection === 'logger' && (
            <div className="glass-card animate-tab-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <FileText size={18} color="#34d399" />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Logging & Pasting Trade Statements</h2>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                You can add trading records using two methods: **Manual Logging** or **Copy-Pasting Trade Executions** directly from contract notes.
              </p>

              {/* Tabbed Guide Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                <div style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ background: 'rgba(52, 211, 153, 0.12)', color: '#34d399', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', flexShrink: 0 }}>
                    1
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>Manual Logging Dialog</h3>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                      Click the **+ Log Trade** button. Fill out the segment (F&O, Equity, Commodity, Currency), strategy setups, and emotions. React dynamic validation checks if your date matches the selected Financial Year filter!
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ background: 'rgba(52, 211, 153, 0.12)', color: '#34d399', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', flexShrink: 0 }}>
                    2
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>Copy-Pasting Kotak Neo Statements</h3>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                      Go to **Profile Settings** (by clicking your avatar). Under "Import Trade Statements", paste raw columns copied from your Kotak Neo execution ledger. The system auto-matches buy/sell legs and logs them into double-entry trades!
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ background: 'rgba(52, 211, 153, 0.12)', color: '#34d399', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', flexShrink: 0 }}>
                    3
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>Advanced Filter Ribbon (Logs Tab)</h3>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                      Use the search bar in the **Logs** tab. Toggle **Advanced Filters** to filter by setups, mistakes, and brokers. You can dismiss active filters instantly by clicking the **✕** target on filter chips.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* SECTION 3: CALENDAR & HEATMAP */}
          {activeSection === 'calendar' && (
            <div className="glass-card animate-tab-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <Calendar size={18} color="#a855f7" />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Calendar & Heatmap Interaction</h2>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                Visual tracking helps you audit emotional streaks. TradeDiary Pro provides a weekly calendar view, monthly grids, and a full financial year heatmap.
              </p>

              {/* Diagram 2: Heatmap Clicks */}
              <div style={{ display: 'flex', justifyContent: 'center', background: 'rgba(255,255,255,0.015)', border: '1.2px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                <svg width="100%" height="160" viewBox="0 0 600 160" style={{ maxWidth: '500px' }}>
                  {/* Heatmap Grids */}
                  <text x="30" y="25" fill="var(--text-dim)" fontSize="8" fontWeight="bold">Visual Heatmap Grid (Dashboard)</text>
                  
                  {/* Calendar Row */}
                  <rect x="30" y="35" width="16" height="16" rx="3" fill="rgba(48, 209, 88, 0.8)" stroke="rgba(48, 209, 88, 0.4)" strokeWidth="1" style={{ cursor: 'pointer' }} />
                  <rect x="50" y="35" width="16" height="16" rx="3" fill="rgba(255, 69, 58, 0.5)" stroke="rgba(255, 69, 58, 0.4)" strokeWidth="1" />
                  <rect x="70" y="35" width="16" height="16" rx="3" fill="rgba(120, 120, 120, 0.1)" stroke="var(--border-color)" strokeWidth="1" />
                  <rect x="90" y="35" width="16" height="16" rx="3" fill="rgba(59, 130, 246, 0.25)" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="1" />
                  <text x="112" y="46" fill="var(--text-dim)" fontSize="7">← Click squares to inspect trades overlay!</text>

                  {/* Flow Arrow */}
                  <path d="M 120 75 L 180 75" stroke="var(--primary)" strokeWidth="1.5" markerEnd="url(#arrow)" fill="none" />
                  
                  {/* Popover Modal Illustration */}
                  <rect x="220" y="20" width="220" height="120" rx="8" fill="var(--bg-tooltip-opaque)" stroke="var(--border-color-active)" strokeWidth="1.2" />
                  <text x="230" y="36" fill="var(--text-main)" fontSize="9" fontWeight="bold">Trades: 10 Jul 2026</text>
                  <line x1="230" y1="44" x2="430" y2="44" stroke="var(--border-color)" strokeWidth="1" />
                  
                  <rect x="230" y="52" width="200" height="20" rx="4" fill="rgba(255,255,255,0.02)" stroke="var(--border-color)" />
                  <text x="236" y="64" fill="var(--color-win)" fontSize="8" fontWeight="bold">Net Realized P&L: +₹10,400</text>
                  
                  <text x="230" y="88" fill="var(--text-muted)" fontSize="7">10:20 AM - NIFTY 24400 CE (BUY) - +₹10,764</text>
                  
                  <rect x="360" y="112" width="70" height="18" rx="4" fill="var(--primary)" style={{ cursor: 'pointer' }} />
                  <text x="395" y="124" fill="#fff" fontSize="7" fontWeight="bold" textAnchor="middle">View in Logs →</text>
                </svg>
              </div>

              <div style={{ border: '1.2px dashed var(--border-color-active)', borderRadius: '8px', padding: '14px', background: 'rgba(168, 85, 247, 0.02)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                  💡 Heatmap & Calendar Pro-Tips:
                </div>
                <ul style={{ fontSize: '0.74rem', color: 'var(--text-dim)', paddingLeft: '20px', margin: 0, lineHeight: 1.5 }}>
                  <li>**Click cells**: Clicking a heatmap cell opens a detailed popover listing exact entry-exit timestamps, symbols, and segments.</li>
                  <li>**View in Logs**: Click the CTA inside the popover to instantly redirect to the Logs history tab filtering for that specific execution date.</li>
                  <li>**No-Trade Days (Blue Cells)**: Mark days as disciplined "No-Trade Days" using the toggle to track and celebrate non-trading restraint!</li>
                </ul>
              </div>
            </div>
          )}

          {/* SECTION 4: BANK LEDGER */}
          {activeSection === 'ledger' && (
            <div className="glass-card animate-tab-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <Receipt size={18} color="#f59e0b" />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Capital Adjustments & Double-Entry Bank Ledger</h2>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                Accounting audit integrity is maintained by tracking **Starting Capital**, **Adjustments**, and **Bank Transactions** as double-entries.
              </p>

              {/* Diagram 3: Double-Entry Flow */}
              <div style={{ display: 'flex', justifyContent: 'center', background: 'rgba(255,255,255,0.015)', border: '1.2px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                <svg width="100%" height="160" viewBox="0 0 600 160" style={{ maxWidth: '500px' }}>
                  {/* Bank Account */}
                  <rect x="20" y="30" width="160" height="100" rx="8" fill="var(--bg-card)" stroke="var(--border-color)" strokeWidth="1.2" />
                  <text x="100" y="48" fill="var(--text-main)" fontSize="10" fontWeight="bold" textAnchor="middle">🏦 Bank Ledger (SBI/HDFC)</text>
                  <text x="100" y="68" fill="var(--text-dim)" fontSize="8" textAnchor="middle">Starting: ₹1,500,000</text>
                  
                  {/* Broker Account */}
                  <rect x="380" y="30" width="160" height="100" rx="8" fill="var(--bg-card)" stroke="var(--border-color)" strokeWidth="1.2" />
                  <text x="460" y="48" fill="var(--text-main)" fontSize="10" fontWeight="bold" textAnchor="middle">💼 Broker Account (Dhan)</text>
                  <text x="460" y="68" fill="var(--text-dim)" fontSize="8" textAnchor="middle">Trading Capital: ₹500,000</text>
                  
                  {/* Flow Arrow Pay-In */}
                  <path d="M 190 60 L 370 60" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3,3" />
                  <rect x="235" y="45" width="90" height="12" rx="3" fill="#f59e0b" />
                  <text x="280" y="54" fill="#fff" fontSize="6" fontWeight="bold" textAnchor="middle">Broker Pay-In (Debit Bank)</text>
                  
                  {/* Flow Arrow Pay-Out */}
                  <path d="M 370 90 L 190 90" stroke="#34d399" strokeWidth="2" strokeDasharray="3,3" />
                  <rect x="235" y="80" width="90" height="12" rx="3" fill="#34d399" />
                  <text x="280" y="89" fill="#fff" fontSize="6" fontWeight="bold" textAnchor="middle">Broker Pay-Out (Credit Bank)</text>
                </svg>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-main)' }}>🏦 Bank Transactions</h4>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    Log deposits, withdrawals, interest payouts, and expense deductions. Selecting a category like **Broker Pay-in** or **Broker Pay-out** automatically flags it for matching double-entries.
                  </p>
                </div>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-main)' }}>💼 Broker Capital Adjustments</h4>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    Records changes in active trading capital. If you transfer money from bank to broker, the double-entry engine automatically reconciles the accounts in both ledgers!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: TAXATION */}
          {activeSection === 'taxation' && (
            <div className="glass-card animate-tab-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <Percent size={18} color="#f97316" />
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Setup Audits & Taxation Engine</h2>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                Analyze strategy hit rates and calculate your taxation liabilities using the built-in Indian Stock Market tax calculation rules.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                    <Compass size={15} color="#ec4899" />
                    <span>Setup Audits</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    Analyze trade parameters by custom-labeled setup configurations (e.g. EMA Crossover, Support Reversal). Review hit rates, expectancy ratios, profit factors, and average risk-reward returns.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                    <Percent size={15} color="#f97316" />
                    <span>Indian Taxation Engine</span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    Automatically computes transactional duties including **STT/CTT** (Securities/Commodities Transaction Tax), **Exchange Transaction Charges**, **SEBI Turnover Fees**, **Stamp Duty**, and **GST** (18% on fees).
                  </p>
                </div>

              </div>

              <div style={{ background: 'rgba(249, 115, 22, 0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                  TAX CHARGES SUMMARY (INDIAN STOCK MARKET RULES)
                </span>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '4px 0' }}>Tax Type</th>
                      <th>Equity Delivery</th>
                      <th>Equity Intraday</th>
                      <th>F&O Options</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '6px 0', color: 'var(--text-main)' }}>STT (STT/CTT)</td>
                      <td>0.1% on Buy & Sell</td>
                      <td>0.025% on Sell Side</td>
                      <td>0.15% on Sell Premium</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '6px 0', color: 'var(--text-main)' }}>Stamp Duty</td>
                      <td>0.015% on Buy Side</td>
                      <td>0.003% on Buy Side</td>
                      <td>0.003% on Buy Side</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '6px 0', color: 'var(--text-main)' }}>GST</td>
                      <td colSpan={3}>18% calculated over (Brokerage + Exchange Tx + SEBI Turnover Fee)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
