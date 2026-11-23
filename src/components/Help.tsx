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
  marathiTitle: string;
  icon: typeof Rocket;
  color: string;
  badge?: string;
  keywords: string[];
}

const SECTIONS: SectionItem[] = [
  {
    id: 'quickstart',
    title: '1. Quick-Start 5-Step Guide',
    marathiTitle: '५ मिनिटांत संपूर्ण गाईड',
    icon: Rocket,
    color: '#06b6d4',
    badge: 'START HERE',
    keywords: ['quick start', 'beginner', 'first trade', 'setup', 'suruvat', 'step', 'guide', 'workflow']
  },
  {
    id: 'dashboard',
    title: '2. Dashboard & Performance KPIs',
    marathiTitle: 'डॅशबोर्ड व मेट्रिक्स विश्लेषण',
    icon: LayoutDashboard,
    color: '#3b82f6',
    keywords: ['dashboard', 'win rate', 'profit factor', 'expectancy', 'drawdown', 'equity curve', 'kpi']
  },
  {
    id: 'calendar',
    title: '3. Calendar & Day Book Tracking',
    marathiTitle: 'कॅलेंडर व दैनंदिन नोंदी',
    icon: CalendarRange,
    color: '#a855f7',
    keywords: ['calendar', 'day book', 'tile view', 'row view', 'no trade day', 'streak', 'heatmap']
  },
  {
    id: 'logger',
    title: '4. Logging Trades & Importers',
    marathiTitle: 'ट्रेड्स नोंदवणे व इम्पोर्ट करणे',
    icon: ScrollText,
    color: '#10b981',
    keywords: ['log trade', 'n key', 'shortcut', 'kotak neo', 'csv', 'broker import', 'options', 'manual log']
  },
  {
    id: 'journal',
    title: '5. Journal, Mistakes & Psychology',
    marathiTitle: 'सायकॉलॉजी व चुकांचे ऑडिट',
    icon: BookOpenCheck,
    color: '#ec4899',
    badge: 'KEY EDGE',
    keywords: ['journal', 'mistakes', 'fomo', 'overtrading', 'early exit', 'calm', 'fear', 'day note', 'psychology']
  },
  {
    id: 'contractNotes',
    title: '6. Contract Notes & Charges Audit',
    marathiTitle: 'कॉन्ट्रॅक्ट नोट व चार्जेस ताळा',
    icon: FileSpreadsheet,
    color: '#f59e0b',
    keywords: ['contract notes', 'stt', 'gst', 'sebi', 'exchange fees', 'brokerage', 'reconciliation', 'gross net']
  },
  {
    id: 'investments',
    title: '7. Investments & Long-Term Assets',
    marathiTitle: 'गुंतवणूक व पोर्टफोलिओ',
    icon: Briefcase,
    color: '#14b8a6',
    keywords: ['investments', 'portfolio', 'delivery', 'etf', 'bonds', 'sgb', 'wealth', 'holdings']
  },
  {
    id: 'ledger',
    title: '8. Double-Entry Bank & Broker Ledger',
    marathiTitle: 'बँक लेजर व कॅपिटल फ्लो',
    icon: Receipt,
    color: '#eab308',
    keywords: ['bank ledger', 'double entry', 'pay in', 'pay out', 'capital', 'cash flow', 'sbi', 'hdfc']
  },
  {
    id: 'taxation',
    title: '9. Setups Analytics & Indian Tax Engine',
    marathiTitle: 'स्ट्रॅटेजी व इन्कम टॅक्स नियम',
    icon: Landmark,
    color: '#f97316',
    keywords: ['taxation', 'setups', 'f&o', 'section 43(5)', 'stcg', 'ltcg', 'audit 44ab', 'hit rate']
  },
  {
    id: 'shortcuts',
    title: '10. Shortcuts, Privacy & Multi-Account',
    marathiTitle: 'शॉर्टकट्स, प्रायव्हसी व क्लाउड',
    icon: Zap,
    color: '#8b5cf6',
    keywords: ['shortcuts', 'hotkeys', 'privacy eye', 'multi account', 'dhan sachin', 'rupali', 'cloud sync']
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
      s.marathiTitle.toLowerCase().includes(q) ||
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
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
              सर्वसमावेशक मार्गदर्शक: ट्रेड्स नोंदवणे, कॅलेंडर विश्लेषण, सायकोलॉजी जर्नल, बँक लेजर आणि टॅक्सेशन ऑडिटची परिपूर्ण माहिती.
            </p>
          </div>
        </div>

        {/* Live Search Input */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search guides (उदा. STT, Shortcut, No-Trade)..." 
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
              {filteredSections.length} Sections
            </span>
          </div>

          {filteredSections.length === 0 ? (
            <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              कोणताही विभाग आढळला नाही. सर्च क्वेरी बदला.
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
                        {sec.marathiTitle}
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
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>नवशिक्यांसाठी ५ मिनिटांत संपूर्ण सॉफ्टवेअर समजून घेण्याचा मास्टर प्लॅन</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
                  Onboarding Step-by-Step
                </span>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                TradeDiary Pro हे केवळ सामान्य डायरी नसून एक **Institutional-Grade Trading Operating System** आहे. नवीन युझर म्हणून खालील ५ टप्प्यांचे पालन केल्यास तुमच्या ट्रेडिंगमध्ये तात्काळ शिस्त आणि स्पष्टता येईल:
              </p>

              {/* 5-Step Interactive Roadmap */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Step 1 */}
                <div style={{ display: 'flex', gap: '14px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)', color: '#fff', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                    १
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        खाते निवडा (Account & Financial Year Selection)
                      </h3>
                      <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 600 }}>Top Header</span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                      वरच्या हेडरमध्ये जाऊन तुमचे ब्रोकर खाते (उदा. <strong>Dhan Sachin</strong>, <strong>Dhan Rupali</strong> किंवा <strong>2 Accounts Selected</strong> एकत्रित व्ह्यू) निवडा. तसेच चालू आर्थिक वर्ष (उदा. <strong>FY 2026-27</strong>) निवडा, जेणेकरून सर्व P&L आणि आकडेवारी त्या वर्षाशी जुळतील.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div style={{ display: 'flex', gap: '14px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                    २
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        ट्रेड नोंदवा (Log Your Trades)
                      </h3>
                      <span style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 600 }}>+ Log Trade किंवा [N] Key</span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                      डाव्या बाजूच्या <strong>+ Log Trade</strong> बटणावर क्लिक करा किंवा कीबोर्डवर <strong>[N]</strong> दाबा. Buy/Sell, Symbol (उदा. NIFTY 24400 CE), Entry, Exit किंमत आणि Quantity टाका. सर्वात महत्त्वाचे: <strong>Setup</strong> (उदा. Zen Credit Spread, Vacuum GRID) आणि <strong>Emotion</strong> (Calm 🧘 किंवा Fear ⚡) अवश्य निवडा.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div style={{ display: 'flex', gap: '14px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: '#fff', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                    ३
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        कॅलेंडर व डे बुक तपासा (Review Calendar & Day Book)
                      </h3>
                      <span style={{ fontSize: '0.65rem', color: '#a855f7', fontWeight: 600 }}>Calendar / Day Book Tab</span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                      <strong>Calendar</strong> टॅबमध्ये तुमच्या महिन्याचे सर्व हिरवे (Win) आणि लाल (Loss) दिवस स्पष्ट दिसतील. कोणत्याही तारखेवर क्लिक करून त्या दिवसाचे ट्रेड तपशील खाली उघडा. ज्या दिवशी तुम्ही ट्रेड केला नाही, त्या दिवशी <strong>Mark as No-Trade Day 🛡️</strong> करा — हीच शिस्त तुम्हाला दीर्घकाळ टिकवते!
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div style={{ display: 'flex', gap: '14px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', color: '#fff', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                    ४
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        कॉन्ट्रॅक्ट नोट व टॅक्स चार्जेस जुळवा (Contract Notes Audit)
                      </h3>
                      <span style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 600 }}>Contract Notes Tab</span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                      ब्रोकरकडून ईमेलवर येणारी कॉन्ट्रॅक्ट नोट उघडा. <strong>Contract Notes</strong> टॅबमध्ये जाऊन प्रत्यक्ष ब्रोकरेज, STT, GST आणि SEBI चार्जेस तपासा. Gross P&L आणि Net P&L मधील तफावत समजून घेतल्याने तुमच्या खात्यातून चार्जेसमध्ये किती रक्कम जाते याचा अचूक ताळा होतो.
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div style={{ display: 'flex', gap: '14px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                    ५
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                        सायकॉलॉजी जर्नल व चुकांचे ऑडिट (Daily Journal & Mistakes)
                      </h3>
                      <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>Journal & Notes Tab</span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                      बाजार संपल्यानंतर <strong>Journal & Notes</strong> मध्ये जा. आज झालेल्या चुका (उदा. <strong>FOMO</strong>, <strong>Overtrading</strong>, <strong>Early Exit</strong>) टॅग करा. दिवसाचा अनुभव (Day Reflection) आणि उद्याचा प्लॅन लिहून ठेवा. जे ट्रेडर चुका लिहून काढतात, तेच मार्केटमध्ये प्रॉफिटेबल बनतात!
                    </p>
                  </div>
                </div>

              </div>

              {/* Quick Summary Pill Callout */}
              <div style={{ background: 'rgba(6, 182, 212, 0.04)', border: '1px solid rgba(6, 182, 212, 0.25)', borderRadius: '8px', padding: '14px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Sparkles size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                  <strong>महत्त्वाची टीप:</strong> तुम्ही कधीही स्क्रीनवर असताना प्रायव्हसी हवी असल्यास हेडरमधील <strong>Eye (डोळा) आयकॉन</strong> दाबा — तात्काळ सर्व P&L आकडे हायड होतील आणि केवळ टक्केवारी दिसेल!
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
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>तुमच्या ट्रेडिंग परफॉर्मन्सचे मुख्य आकडे कसे वाचावे व समजावे</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                डॅशबोर्ड हा तुमच्या ट्रेडिंग करिअरचा आरसा आहे. येथे केवळ नफा-तोटा नाही, तर तुमच्या रणनीतीची गुणवत्ता सिद्ध करणारे ४ मुख्य मेट्रिक्स मोजले जातात:
              </p>

              {/* 4 Big KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Win Rate (विजय दर)
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-win)', margin: '4px 0' }}>
                    एकूण नफ्यातील ट्रेड्स %
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    एकूण झालेल्या ट्रेड्सपैकी किती टक्के ट्रेड्स पॉझिटिव्ह संपले. सामान्यतः ५०-६०% विन रेट उत्तम मानला जातो जर रिस्क-रिवॉर्ड चांगला असेल.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Profit Factor (प्रॉफिट फॅक्टर)
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#3b82f6', margin: '4px 0' }}>
                    Gross Profit ÷ Gross Loss
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    <strong>१.५ च्या वर</strong>: चांगली रणनीती.<br />
                    <strong>२.० च्या वर</strong>: उत्कृष्ट व्यावसायिक रणनीती.<br />
                    <strong>१.० च्या खाली</strong>: सिस्टीम तोट्यात आहे.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Expectancy (प्रति ट्रेड सरासरी नफा)
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#a855f7', margin: '4px 0' }}>
                    (Win% × Avg Win) - (Loss% × Avg Loss)
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    प्रत्येक ट्रेडमागे तुम्ही सरासरी किती रुपये कमवत आहात. जर Expectancy पॉझिटिव्ह असेल तर दीर्घकाळात संपत्ती निर्माण होते.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Max Drawdown (कमाल घसरण)
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-loss)', margin: '4px 0' }}>
                    Peak to Trough Loss %
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    हायएस्ट कॅपिटलपासून झालेले जास्तीत जास्त नुकसान. हे जितके कमी तितकी तुमची रिस्क मॅनेजमेंट मजबूत असते.
                  </p>
                </div>

              </div>

              {/* Equity Curve & Heatmap Explanation */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} color="var(--primary)" />
                  Cumulative Equity Curve आणि Heatmap चा उपयोग:
                </h3>
                <ul style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, paddingLeft: '18px', lineHeight: 1.6 }}>
                  <li><strong>Equity Curve:</strong> ही रेषा सतत वर (Upward Sloping) जात असेल तर तुमची स्ट्रॅटेजी सातत्यपूर्ण आहे. अचानक मोठी घसरण झाल्यास लगेच रिव्ह्यू करा.</li>
                  <li><strong>Yearly Activity Heatmap:</strong> GitHub प्रमाणे वर्षभरातील सर्व ३६५ दिवसांचे बॉक्सेस दिसतात. कोणत्याही बॉक्सवर माउस फिरवल्यास त्या दिवसाचा नफा/तोटा आणि ऑर्डर्सची संख्या दिसते.</li>
                  <li><strong>Broker Performance:</strong> Dhan, Zerodha, Groww पैकी कोणत्या खात्यावर जास्त नफा होतो आणि कुठे चार्जेस जास्त जातात याची तुलना डॅशबोर्डवर उपलब्ध आहे.</li>
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
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Tile View, Row View, No-Trade Days आणि सविस्तर दैनंदिन ताळा</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                कॅलेंडर हे TradeDiary Pro चे सर्वात लोकप्रिय फिचर आहे. येथे महिन्यातील प्रत्येक दिवसाचा नफा, तोटा, चार्जेस आणि स्ट्रिक्स एका नजरेत दिसतात.
              </p>

              {/* View Comparison Table */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.74rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '10px 14px', color: 'var(--text-main)' }}>फिचर / View</th>
                      <th style={{ padding: '10px 14px', color: 'var(--text-main)' }}>Tile View (ग्रिड व्ह्यू)</th>
                      <th style={{ padding: '10px 14px', color: 'var(--text-main)' }}>Row View (तक्ता व्ह्यू)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--primary)' }}>डिझाईन</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>पारंपारिक सोमवार-रविवार कॅलेंडर ग्रिड (स्वच्छ हिरवे/लाल कार्ड्स)</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>तारीख, ट्रेड्स संख्या, Gross P&L, Net P&L आणि चार्जेसचा सुटसुटीत तक्ता</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--primary)' }}>तपशील उघडणे</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>कोणत्याही तारखेच्या बॉक्सवर क्लिक करताच खाली त्या दिवसाचे सर्व ट्रेड्स लोड होतात</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>ओळीवर क्लिक केल्यास त्या दिवसाचे विश्लेषण आणि कॉन्ट्रॅक्ट नोट उघडते</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--primary)' }}>उपयुक्तता</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>महिन्यातील प्रॉफिटेबल दिवस आणि सलग विजय (Winning Streaks) पाहण्यासाठी सर्वोत्तम</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-dim)' }}>एका नजरेत चार्जेस व Gross vs Net फरक तपासण्यासाठी उत्तम</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Special Disciplined Feature: No Trade Day */}
              <div style={{ border: '1.2px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', padding: '16px', background: 'rgba(59, 130, 246, 0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <ShieldCheck size={18} color="#3b82f6" />
                  <h3 style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    शिस्तप्रिय "No-Trade Day" 🛡️ फिचर
                  </h3>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  जेव्हा बाजारात सेटअप बनत नाही किंवा एक्सपायरीचा गोंधळ असतो, तेव्हा ट्रेड न करणे हाही एक मोठा नफा असतो! कॅलेंडरमध्ये तारीख सिलेक्ट करून <strong>Mark Date as No-Trade Day</strong> वर क्लिक करा. तो दिवस कॅलेंडरवर निळ्या रंगात (Discipline Badge सह) दिसेल. यामुळे ओव्हरट्रेडिंगची सवय मोडण्यास मदत होते.
                </p>
              </div>

              {/* PDF and Weekend Review */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    📄 1-Page Month PDF
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    वरच्या <strong>1-Page Month PDF</strong> बटणावर क्लिक करून संपूर्ण महिन्याचे कॅलेंडर, Gross, Charges आणि Net P&L चा 1-पेज सुंदर रिपोर्ट डाऊनलोड करा. सीए (CA) किंवा मेंटॉरला दाखवण्यासाठी हा अत्यंत उपयुक्त आहे.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    📖 Weekend Review Mode
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    शनिवार-रविवारी <strong>Weekend Review</strong> बटण दाबल्यास आठवड्यातील सर्व ट्रेड्स, घेतलेले स्टॉपलॉस आणि नफ्याची सरासरी समोर येते, ज्यामुळे पुढील आठवड्याची तयारी करता येते.
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
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>मॅन्युअल एंट्री, [N] कीबोर्ड शॉर्टकट आणि ब्रोकर स्टेटमेंट ऑटो-इम्पोर्ट</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                TradeDiary Pro मध्ये ट्रेड्स नोंदवण्यासाठी दोन सोपे पर्याय उपलब्ध आहेत:
              </p>

              {/* Method 1: Manual Modal */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'rgba(255,255,255,0.015)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    पर्याय १: मॅन्युअल लॉगिंग डायलॉग (+ Log Trade / [N] Hotkey)
                  </h3>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                    सर्वात अचूक
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                  तुम्ही कुठेही असताना कीबोर्डवरील <strong>[N]</strong> बटण दाबल्यास नवीन ट्रेड फॉर्म उघडतो. या फॉर्ममध्ये:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <strong style={{ fontSize: '0.74rem', color: 'var(--text-main)', display: 'block' }}>१. Symbol Auto-Detection:</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>"NIFTY 24400 CE" टाकल्यास स्ट्राइक आणि CE/PE आपोआप ओळखले जाते.</span>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <strong style={{ fontSize: '0.74rem', color: 'var(--text-main)', display: 'block' }}>२. Broker Selection:</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Dhan, Zerodha, Groww किंवा इतर कनेक्ट केलेले खाते निवडा.</span>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.25)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <strong style={{ fontSize: '0.74rem', color: 'var(--text-main)', display: 'block' }}>३. Setups & Emotion:</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ट्रेड घेताना डोक्यात काय विचार होता (Calm, FOMO, Revenge) ते नोंदवा.</span>
                  </div>
                </div>
              </div>

              {/* Method 2: Copy Paste Importer */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'rgba(255,255,255,0.015)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '0.88rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    पर्याय २: Kotak Neo / Broker स्टेटमेंट थेट कॉपी-पेस्ट
                  </h3>
                  <span style={{ fontSize: '0.65rem', background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                    हाय-स्पीड
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  प्रोफाईल मेनूमध्ये जाऊन <strong>Import Trade Statements</strong> पर्याय निवडा. तुमच्या ब्रोकरच्या ट्रेडबुकमधील सर्व कॉलम्स (Symbol, Buy/Sell, Qty, Price, Time) जसेच्या तसे कॉपी करून टेक्स्टबॉक्समध्ये पेस्ट करा. आमचे स्मार्ट पार्सर Buy आणि Sell लेग्ज आपोआप मॅच करून संपूर्ण दिवसाचे ट्रेड्स एका सेकंदात इम्पोर्ट करते!
                </p>
              </div>

              {/* Logs Search & Advanced Ribbon */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  🔍 Logs Tab मधील Advanced Filter Ribbon:
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  हजारो ट्रेड्समधून विशिष्ट ट्रेड शोधण्यासाठी <strong>Logs</strong> टॅबमध्ये जा. तेथे सेटअप, मिस्टेक, ब्रोकर आणि सेगमेंटनुसार फिल्टर्स लावा. कोणत्याही फिल्टर चिपवरील <strong>✕</strong> दाबताच तो फिल्टर लगेच काढला जातो.
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
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>मार्केटमध्ये ९०% यश सायकॉलॉजीवर अवलंबून असते — जाणून घ्या कसे ट्रॅक करावे</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                एक सामान्य ट्रेडर केवळ नफा मोजतो, परंतु एक व्यावसायिक ट्रेडर स्वतःच्या **भावनिक चुका (Emotional Mistakes)** मोजतो. TradeDiary Pro चे हे फिचर तुम्हाला शिस्तबद्ध बनवण्यासाठी तयार करण्यात आले आहे.
              </p>

              {/* Emotion & Mistake Tags Showcase */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#10b981' }}>🧘 Mindset & Emotions</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.25)', fontWeight: 700 }}>
                      CALM (शांत मन)
                    </span>
                    <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.25)', fontWeight: 700 }}>
                      FEAR (भीती/घाई)
                    </span>
                    <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.25)', fontWeight: 700 }}>
                      GREED (अतिलोभ)
                    </span>
                    <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(168, 85, 247, 0.12)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.25)', fontWeight: 700 }}>
                      REVENGE (बदला घेण्याची वृत्ती)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    ट्रेड घेताना तुमचे मन कसे होते? डॅशबोर्डवर महिनाअखेर दिसेल की Calm असताना तुम्ही किती नफ्यात होतात आणि Fear/Revenge असताना किती मोठे नुकसान झाले!
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', background: 'rgba(255,255,255,0.015)' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#ef4444' }}>⚠️ Common Mistake Tags</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 600 }}>
                      EARLY EXIT (लवकर बाहेर पडणे)
                    </span>
                    <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 600 }}>
                      FOMO (संधी हुकल्याची घाई)
                    </span>
                    <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 600 }}>
                      OVERTRADING (अनावश्यक ट्रेड्स)
                    </span>
                    <span style={{ fontSize: '0.68rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', fontWeight: 600 }}>
                      NO STOP LOSS (स्टॉपलॉस न ठेवणे)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    कॅलेंडर आणि Logs मध्ये ट्रेडवर मिस्टेक टॅग करा. उदा. 'Early Exit' मुळे किती संभाव्य नफा सुटला, किंवा 'Overtrading' मुळे चार्जेस किती वाढले.
                  </p>
                </div>

              </div>

              {/* Day Note & Reflections */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 8px 0' }}>
                  📝 Day Note, Account-wise Logs व Tomorrow's Prep:
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                  <strong>Journal & Notes</strong> टॅबमध्ये तुमच्या प्रत्येक खात्यानुसार (Dhan Sachin, Dhan Rupali) ट्रेड्सचे नोट्स सेव्ह होतात. तुम्ही खालील ३ गोष्टी रोज नोंदवू शकता:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.73rem', color: 'var(--text-dim)' }}>
                  <div>🔹 <strong>Lessons Learned:</strong> आजच्या दिवसातून मार्केटने काय शिकवले (उदा. "Gap-up नंतर चेस करू नका").</div>
                  <div>🔹 <strong>Market Structure:</strong> निफ्टी/बँकनिफ्टी ट्रेंडिंग होती की रेंजबाउंड?</div>
                  <div>🔹 <strong>Tomorrow's Game Plan:</strong> उद्या कोणते लेव्हल्स महत्त्वाचे आहेत आणि काय टाळायचे आहे.</div>
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
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>STT, GST, SEBI फी आणि ब्रोकरेजचा प्रत्यक्ष कॉन्ट्रॅक्ट नोटशी तंतोतंत ताळा</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                अनेक ट्रेडर केवळ स्क्रीनवर दिसणारा P&L पाहतात, परंतु दिवसाच्या शेवटी ब्रोकरच्या चार्जेसमुळे प्रत्यक्षात खात्यात कमी पैसे जमा होतात. TradeDiary Pro मध्ये <strong>Gross P&L</strong> आणि <strong>Net P&L</strong> मधील फरक अगदी पारदर्शकपणे तपासता येतो.
              </p>

              {/* Breakdown of Charges Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)' }}>
                  <strong style={{ fontSize: '0.76rem', color: '#f59e0b', display: 'block', marginBottom: '4px' }}>Brokerage (दलाली)</strong>
                  <p style={{ fontSize: '0.71rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    प्रत्येक एक्झिक्युटेड ऑर्डरमागे फ्लॅट ₹२० (किंवा ०.०३%). एका ट्रेडमध्ये Buy आणि Sell दोन्ही मिळून साधारण ₹४० ब्रोकरेज लागते.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)' }}>
                  <strong style={{ fontSize: '0.76rem', color: '#f59e0b', display: 'block', marginBottom: '4px' }}>STT / CTT (सरकारी कर)</strong>
                  <p style={{ fontSize: '0.71rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    ऑप्शन्स विक्रीवर (Sell Premium) ०.१% ते ०.१२५% पर्यंत STT आकारला जातो. ऑप्शन्स खरेदीवर STT नसतो.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)' }}>
                  <strong style={{ fontSize: '0.76rem', color: '#f59e0b', display: 'block', marginBottom: '4px' }}>Exchange Tx & SEBI Fee</strong>
                  <p style={{ fontSize: '0.71rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    NSE/BSE एक्सचेंज टर्नओव्हर चार्जेस आणि SEBI रेग्युलेटरी फी (₹१० प्रति कोटी टर्नओव्हर).
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)' }}>
                  <strong style={{ fontSize: '0.76rem', color: '#f59e0b', display: 'block', marginBottom: '4px' }}>GST (१८% वस्तू व सेवा कर)</strong>
                  <p style={{ fontSize: '0.71rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    (ब्रोकरेज + एक्सचेंज चार्जेस + SEBI फी) या तिन्हींच्या बेरजेवर १८% जीएसटी आकारला जातो.
                  </p>
                </div>

              </div>

              {/* Day's Charges / Contract Note Button in Calendar */}
              <div style={{ background: 'rgba(245, 158, 11, 0.04)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px', padding: '16px' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                  📑 Day's Charges / Contract Note बटणाचा वापर:
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  कॅलेंडरमध्ये तारीख निवडल्यानंतर वरती निळे <strong>Day's Charges / Contract Note</strong> बटण दिसेल. त्यावर क्लिक करताच त्या दिवसाच्या ब्रोकर नोटमधील चार्जेस (जसे STT, GST, Stamp Duty) तुम्ही एडिट किंवा व्हेरिफाय करू शकता. यामुळे महिनाअखेर एक पैशाचाही फरक राहत नाही!
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
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>ट्रेडिंग प्रॉफिटचे सुरक्षित संपत्तीमध्ये रूपांतर करा — होल्डिंग्स व पोर्टफोलिओ</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                एक हुशार ट्रेडर F&O किंवा इंट्राडेमधून झालेला नफा पुन्हा बाजारात पणाला न लावता **दीर्घकालीन संपत्ती (Long-Term Wealth)** मध्ये गुंतवतो. <strong>Investments</strong> टॅब यासाठीच डिझाइन केला आहे.
              </p>

              {/* Supported Asset Classes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)' }}>
                  <strong style={{ fontSize: '0.76rem', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>📈 Equity Delivery (शेअर्स)</strong>
                  <span style={{ fontSize: '0.71rem', color: 'var(--text-dim)' }}>ब्लूचिप शेअर्स (उदा. Reliance, TCS, HDFC Bank) चे सरासरी खरेदी मूल्य आणि होल्डिंग रिटर्न्स.</span>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)' }}>
                  <strong style={{ fontSize: '0.76rem', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>📊 ETFs & Mutual Funds</strong>
                  <span style={{ fontSize: '0.71rem', color: 'var(--text-dim)' }}>NiftyBeES, BankBeES किंवा इंडेक्स फंड्समधील नियमित SIP आणि गुंतवणूक.</span>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)' }}>
                  <strong style={{ fontSize: '0.76rem', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>🪙 Sovereign Gold Bonds (SGB)</strong>
                  <span style={{ fontSize: '0.71rem', color: 'var(--text-dim)' }}>२.५% वार्षिक व्याजासह टॅक्स-फ्री सोन्यातील सुरक्षित गुंतवणूक ट्रॅकिंग.</span>
                </div>

              </div>

              {/* Wealth KPI vs Capital KPI */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                  💡 Capital (भांडवल) आणि Wealth (एकूण संपत्ती) मधील फरक:
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  हेडरमधील <strong>Capital</strong> हा आकडा केवळ तुमच्या ट्रेडिंग खात्यातील ऍक्टिव्ह मार्जिन दर्शवतो. तर <strong>Wealth</strong> हा आकडा तुमचे बँक बॅलन्स + डिमॅटमधील शेअर्स + ट्रेडिंग भांडवल यांची एकत्रित खरी नेटवर्थ दर्शवतो!
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
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>बँक खात्यातून ब्रोकरकडे होणारे पे-इन व पे-आऊट अचूक ताळेबंद पद्धतीने नोंदवा</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                अनेकदा ट्रेडर बँकेतून ब्रोकरकडे ₹५०,००० पाठवतो, परंतु डायरीत नोंद न राहिल्याने कॅपिटलमध्ये गोंधळ होतो. TradeDiary Pro चे <strong>Double-Entry Ledger</strong> बँक आणि ब्रोकर या दोन्हींचा समांतर हिशेब ठेवते.
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
                    जेव्हा तुम्ही बँकेतून ब्रोकरकडे फंड ऍड करता, तेव्हा बँकेतून ती रक्कम वजा होऊन ब्रोकरच्या कॅपिटलमध्ये आपोआप जमा होते.
                  </p>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-main)' }}>
                    🔵 Broker Pay-Out (Withdrawal)
                  </h4>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.4 }}>
                    ट्रेडिंगमधून कमवलेला नफा जेव्हा तुम्ही बँकेत काढता, तेव्हा ब्रोकर कॅपिटल कमी होते आणि बँक बॅलन्स वाढते.
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
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>रणनीतींचा हिट रेट, आयकर नियम (Section 43(5), STCG, LTCG) व टॅक्स ऑडिट मर्यादा</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                भारतीय शेअर बाजारातील कायद्यांनुसार F&O, इंट्राडे आणि डिलिव्हरी या तिन्ही सेगमेंटवर वेगळे कर आकारले जातात. TradeDiary Pro चे टॅक्स इंजिन आपोआप सर्व नियमांनुसार हिशेब ठेवते.
              </p>

              {/* Indian Tax Rules Table */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.73rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '8px 12px', color: 'var(--text-main)' }}>ट्रेडिंग सेगमेंट</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-main)' }}>आयकर कलम (Income Tax Act)</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-main)' }}>कर आकारणी (Tax Treatment)</th>
                      <th style={{ padding: '8px 12px', color: 'var(--text-main)' }}>खर्चांची वजावट (Deductions)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: 'var(--primary)' }}>F&O (Futures & Options)</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-dim)' }}>Section 43(5)</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-dim)' }}>Non-Speculative Business Income (तुमच्या सामान्य स्लॅबनुसार)</td>
                      <td style={{ padding: '9px 12px', color: 'var(--color-win)' }}>ब्रोकरेज, इंटरनेट, लॅपटॉप डेप्रिसिएशन, सॉफ्टवेअर फी वजा मिळते</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#f59e0b' }}>Equity Intraday</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-dim)' }}>Section 73</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-dim)' }}>Speculative Business Income (सट्टेबाजी व्यवसाय उत्पन्न)</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-dim)' }}>केवळ इंट्राडे नफ्यासमोरच इंट्राडे तोटा सेटऑफ करता येतो</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#10b981' }}>Short-Term Capital Gain (STCG)</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-dim)' }}>Section 111A</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-dim)' }}>फ्लॅट २०% (१ वर्षाच्या आत विकलेले शेअर्स)</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-muted)' }}>कोणताही व्यावसायिक खर्च वजा मिळत नाही</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#a855f7' }}>Long-Term Capital Gain (LTCG)</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-dim)' }}>Section 112A</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text-dim)' }}>१२.५% (₹१.२५ लाखांवरील नफ्यावर, १ वर्षानंतर)</td>
                      <td style={{ padding: '9px 12px', color: 'var(--color-win)' }}>₹१,२५,००० पर्यंतचा वार्षिक नफा पूर्णपणे करमुक्त!</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Setups Analytics Card */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'rgba(255,255,255,0.015)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Target size={18} color="#ec4899" />
                  <h3 style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    🎯 Setups Hit Rate Analytics (रणनीतींचे ऑडिट)
                  </h3>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  <strong>Setups</strong> टॅबमध्ये गेल्यावर तुम्ही वापरलेल्या सर्व स्ट्रॅटेजीज (उदा. <em>Zen Credit Spread</em>, <em>Vacuum GRID</em>, <em>Breakout</em>, <em>Expiry Scalping</em>) चा स्वतंत्र विन-रेट आणि सरासरी प्रॉफिट फॅक्टर समोर येतो. जी स्ट्रॅटेजी तोट्यात चालू आहे ती त्वरित थांबवून नफा देणाऱ्या स्ट्रॅटेजीवर लक्ष केंद्रित करा!
                </p>
              </div>

              {/* Section 44AB Tax Audit Rule */}
              <div style={{ border: '1px solid rgba(249, 115, 22, 0.3)', borderRadius: '10px', padding: '14px', background: 'rgba(249, 115, 22, 0.04)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f97316', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Scale size={16} />
                  टॅक्स ऑडिटची मर्यादा (Section 44AB Audit Threshold):
                </div>
                <p style={{ fontSize: '0.73rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  F&O मध्ये टर्नओव्हर मोजताना <strong>Absolute Profit + Absolute Loss</strong> मोजला जातो. जर तुमचे ९५% व्यवहार डिजिटल/बँकिंग चॅनलद्वारे असतील तर <strong>₹१० कोटी</strong> टर्नओव्हरपर्यंत ऑडिटची आवश्यकता नसते (जर नफा ६% पेक्षा जास्त दाखवला असेल किंवा प्रिजम्प्टिव्ह टॅक्सेशन लागू नसेल). अधिक माहितीसाठी नेहमी आपल्या चार्टर्ड अकाउंटंट (CA) चा सल्ला घ्या.
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
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>कीबोर्ड शॉर्टकट्स, प्रायव्हसी हाइड पर्याय आणि क्लाउड बॅकअप</span>
                </div>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                TradeDiary Pro वापरताना तुमचा वेग आणि उत्पादकता वाढवण्यासाठी खालील पॉवर-फिचर्स् वापरा:
              </p>

              {/* Hotkeys Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                
                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid var(--border-color-active)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>
                    [N]
                  </kbd>
                  <div>
                    <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)', display: 'block' }}>Log New Trade</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>कुठल्याही टॅबमधून थेट नवीन ट्रेड फॉर्म उघडतो.</span>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ background: 'rgba(6, 182, 212, 0.12)', border: '1.5px solid rgba(6, 182, 212, 0.3)', borderRadius: '6px', padding: '6px 8px', color: 'var(--primary)' }}>
                    <Eye size={18} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)', display: 'block' }}>Privacy Eye Toggle</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>हेडरमधील डोळा दाबून P&L आकडे हायड करा.</span>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'rgba(255,255,255,0.015)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <kbd style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid var(--border-color-active)', borderRadius: '6px', padding: '6px 10px', fontSize: '0.85rem', fontWeight: 800, color: '#a855f7', fontFamily: 'monospace' }}>
                    FY Switcher
                  </kbd>
                  <div>
                    <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)', display: 'block' }}>FY 2026-27 / All Time</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>आर्थिक वर्षानुसार एका क्लिकवर डेटा फिल्टर करा.</span>
                  </div>
                </div>

              </div>

              {/* Multi Account Switcher Guide */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'rgba(0,0,0,0.2)' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} color="var(--color-win)" />
                  Multi-Account Terminal Mode (एकाधिक खाती एकाच जागी):
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  जर तुम्ही स्वतःच्या खात्यासह कुटुंबातील इतर सदस्यांचे (उदा. <strong>Sachin</strong> व <strong>Rupali</strong>) ट्रेडिंग हँडल करत असाल, तर वरच्या हेडरमधील <strong>Account Switcher</strong> वरून दोन्ही खाती सिलेक्ट करा. संपूर्ण कॅलेंडर, जर्नल आणि डॅशबोर्ड स्वतंत्रपणे किंवा दोन्हीचे एकत्रित (Combined View) पाहता येते.
                </p>
              </div>

              {/* Cloud Sync & Security */}
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'rgba(255,255,255,0.015)' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                  ☁️ Local Storage & Supabase Cloud Backup (डेटा सुरक्षा हमी):
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
                  तुमचा सर्व डेटा स्थानिक ब्राउझरमध्ये सुरक्षितपणे साठवला जातो. तसेच प्रोफाईलमध्ये Supabase Cloud Sync सक्षम केल्यास तुमचा डेटा सुरक्षित क्लाउडवर बॅकअप होतो, जेणेकरून लॅपटॉप बदलला तरी एकही ट्रेड गहाळ होणार नाही!
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}