const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Update lucide-react imports to include HelpCircle
const oldLucideImports = "import { Plus, LayoutDashboard, Calendar, History, Compass, Receipt, Briefcase, ShieldCheck, Bell, LogOut, Sun, Moon, Percent, BookOpen, Menu } from 'lucide-react';";
const newLucideImports = "import { Plus, LayoutDashboard, Calendar, History, Compass, Receipt, Briefcase, ShieldCheck, Bell, LogOut, Sun, Moon, Percent, BookOpen, Menu, HelpCircle } from 'lucide-react';";

if (content.indexOf(oldLucideImports) === -1) {
  console.error("Could not find lucide-react import list in App.tsx");
  process.exit(1);
}
content = content.replace(oldLucideImports, newLucideImports);

// 2. Add Help component import
const oldHelpImport = "import { DayBook } from './components/DayBook';";
const newHelpImport = `import { DayBook } from './components/DayBook';
import { Help } from './components/Help';`;

if (content.indexOf(oldHelpImport) === -1) {
  console.error("Could not find DayBook import in App.tsx");
  process.exit(1);
}
content = content.replace(oldHelpImport, newHelpImport);

// 3. Update Tab type definition
const oldTabType = "type Tab = 'dashboard' | 'daybook' | 'calendar' | 'logs' | 'strategies' | 'ledger' | 'account' | 'taxation';";
const newTabType = "type Tab = 'dashboard' | 'daybook' | 'calendar' | 'logs' | 'strategies' | 'ledger' | 'account' | 'taxation' | 'help';";

if (content.indexOf(oldTabType) === -1) {
  console.error("Could not find Tab type definition in App.tsx");
  process.exit(1);
}
content = content.replace(oldTabType, newTabType);

// 4. Inject Help button into desktop Left Sidebar using regex
const sidebarTaxRegex = /<button\s+onClick=\{\(\)\s*=>\s*\{\s*setActiveTab\('taxation'\);\s*setIsMobileSidebarOpen\(false\);\s*\}\}\s+className=\{"sidebar-tab-btn\s*"\s*\+\s*\(activeTab\s*===\s*'taxation'\s*\?\s*'active'\s*:\s*''\)\}\s+title="Taxation"\s*>\s*<Percent\s+size=\{14\}\s+color=\{activeTab\s*===\s*'taxation'\s*\?\s*'#fff'\s*:\s*'#f97316'\}\s*\/>\s*<span\s+className="hide-collapsed">Taxation<\/span>\s*<\/button>/;

if (!sidebarTaxRegex.test(content)) {
  console.error("Could not find Taxation button in Left Sidebar using regex");
  process.exit(1);
}

const replacementSidebarBtn = `<button 
              onClick={() => { setActiveTab('taxation'); setIsMobileSidebarOpen(false); }} 
              className={"sidebar-tab-btn " + (activeTab === 'taxation' ? 'active' : '')}
              title="Taxation"
            >
              <Percent size={14} color={activeTab === 'taxation' ? '#fff' : '#f97316'} />
              <span className="hide-collapsed">Taxation</span>
            </button>

            {/* Support & Info Tab */}
            <div style={{ padding: '0 12px', marginTop: '12px' }} className="hide-collapsed">
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>SUPPORT & INFO</span>
            </div>
            <button 
              onClick={() => { setActiveTab('help'); setIsMobileSidebarOpen(false); }}
              className={"sidebar-tab-btn " + (activeTab === 'help' ? 'active' : '')}
              title="Help & Guides"
            >
              <HelpCircle size={14} color={activeTab === 'help' ? '#fff' : '#06b6d4'} />
              <span className="hide-collapsed">Help & Guides</span>
            </button>`;

content = content.replace(sidebarTaxRegex, replacementSidebarBtn);

// 5. Inject Help tab to the traditional navbar header tabs using regex
const navbarTaxRegex = /<button\s+onClick=\{\(\)\s*=>\s*setActiveTab\('taxation'\)\}\s+className=\{"nav-tab\s*"\s*\+\s*\(activeTab\s*===\s*'taxation'\s*\?\s*'active'\s*:\s*''\)\}\s+style=\{\{\s*display:\s*'flex',\s*alignItems:\s*'center',\s*gap:\s*'6px'\s*\}\}\s*>\s*<Percent\s+size=\{13\}\s+color="#f97316"\s*\/>\s*Taxation\s*<\/button>/;

if (!navbarTaxRegex.test(content)) {
  console.error("Could not find Taxation button in traditional Navbar using regex");
  process.exit(1);
}

const replacementNavbarBtn = `<button 
                onClick={() => setActiveTab('taxation')} 
                className={"nav-tab " + (activeTab === 'taxation' ? 'active' : '')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Percent size={13} color="#f97316" />
                Taxation
              </button>

              <button 
                onClick={() => setActiveTab('help')}
                className={"nav-tab " + (activeTab === 'help' ? 'active' : '')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <HelpCircle size={13} color={activeTab === 'help' ? '#fff' : '#06b6d4'} />
                Help
              </button>`;

content = content.replace(navbarTaxRegex, replacementNavbarBtn);

// 6. Inject the Help view renderer panel
const targetPanelAnchor = "        {activeTab === 'account' && <AccountManager />}";
const replacementPanel = `        {activeTab === 'account' && <AccountManager />}
        {activeTab === 'help' && <Help />}`;

if (content.indexOf(targetPanelAnchor) === -1) {
  console.error("Could not find AccountManager panel anchor in App.tsx");
  process.exit(1);
}
content = content.replace(targetPanelAnchor, replacementPanel);

fs.writeFileSync(filePath, content, 'utf8');
console.log("App.tsx successfully updated with Help tab navigation and layout render hooks!");
