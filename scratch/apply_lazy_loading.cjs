const fs = require('fs');
const path = require('path');

// 1. Append spin keyframes to index.css
const cssPath = path.join(__dirname, '..', 'src', 'index.css');
let cssContent = fs.readFileSync(cssPath, 'utf8');
cssContent = cssContent.replace(/\r\n/g, '\n');

const spinKeyframes = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;

if (cssContent.indexOf("spin") === -1) {
  cssContent += spinKeyframes;
  fs.writeFileSync(cssPath, cssContent, 'utf8');
  console.log("Successfully appended spin keyframes to index.css!");
} else {
  console.log("spin keyframes already exist in index.css.");
}

// 2. Modify App.tsx to use lazy loading
const appPath = path.join(__dirname, '..', 'src', 'App.tsx');
let appContent = fs.readFileSync(appPath, 'utf8');
appContent = appContent.replace(/\r\n/g, '\n');

// Update imports at the top
const oldReactImport = "import { useState, useEffect } from 'react';";
const newReactImport = "import { useState, useEffect, lazy, Suspense } from 'react';";

if (appContent.indexOf(oldReactImport) === -1) {
  console.error("Could not find React import in App.tsx");
  process.exit(1);
}
appContent = appContent.replace(oldReactImport, newReactImport);

// Remove synchronous component imports
const importsToRemove = [
  "import { Dashboard } from './components/Dashboard';",
  "import { TradingCalendar } from './components/TradingCalendar';",
  "import { TradeTable } from './components/TradeTable';",
  "import { StrategyManager } from './components/StrategyManager';",
  "import { Ledger } from './components/Ledger';",
  "import { AccountManager } from './components/AccountManager';",
  "import { ProfileSettingsModal } from './components/ProfileSettingsModal';",
  "import { TradeLogger } from './components/TradeLogger';",
  "import { Taxation } from './components/Taxation';",
  "import { DayBook } from './components/DayBook';",
  "import { Help } from './components/Help';"
];

for (const imp of importsToRemove) {
  if (appContent.indexOf(imp) !== -1) {
    appContent = appContent.replace(imp, "");
  }
}

// Add lazy declarations before export default function App
const lazyDeclarations = `
const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const TradingCalendar = lazy(() => import('./components/TradingCalendar').then(m => ({ default: m.TradingCalendar })));
const TradeTable = lazy(() => import('./components/TradeTable').then(m => ({ default: m.TradeTable })));
const StrategyManager = lazy(() => import('./components/StrategyManager').then(m => ({ default: m.StrategyManager })));
const Ledger = lazy(() => import('./components/Ledger').then(m => ({ default: m.Ledger })));
const AccountManager = lazy(() => import('./components/AccountManager').then(m => ({ default: m.AccountManager })));
const ProfileSettingsModal = lazy(() => import('./components/ProfileSettingsModal').then(m => ({ default: m.ProfileSettingsModal })));
const TradeLogger = lazy(() => import('./components/TradeLogger').then(m => ({ default: m.TradeLogger })));
const Taxation = lazy(() => import('./components/Taxation').then(m => ({ default: m.Taxation })));
const DayBook = lazy(() => import('./components/DayBook').then(m => ({ default: m.DayBook })));
const Help = lazy(() => import('./components/Help').then(m => ({ default: m.Help })));
`;

const anchorExport = "export default function App() {";
if (appContent.indexOf(anchorExport) === -1) {
  console.error("Could not find export default function App declaration in App.tsx");
  process.exit(1);
}
appContent = appContent.replace(anchorExport, lazyDeclarations + "\n" + anchorExport);

// Wrap main tab content panels inside Suspense
const oldMainPanelBlock = `      <main style={{ minHeight: '60vh' }}>
        {activeTab === 'dashboard' && (
          <Dashboard 
            activeAccountId={activeAccountId} 
            onNavigateToTab={setActiveTab} 
            onSelectDateFilter={(date) => {
              setSelectedDateFilter(date);
              setActiveTab('logs');
            }}
          />
        )}
        {activeTab === 'daybook' && <DayBook activeAccountId={activeAccountId} />}
        {activeTab === 'calendar' && (
          <TradingCalendar 
            activeAccountId={activeAccountId} 
            onEditTrade={handleEditTrade} 
          />
        )}
        {activeTab === 'logs' && (
          <TradeTable 
            onEditTrade={handleEditTrade} 
            activeAccountId={activeAccountId} 
            initialDateFilter={selectedDateFilter}
            onClearDateFilter={() => setSelectedDateFilter(null)}
          />
        )}
        {activeTab === 'ledger' && <Ledger activeAccountId={activeAccountId} />}
        {activeTab === 'taxation' && <Taxation activeAccountId={activeAccountId} />}
        {activeTab === 'strategies' && <StrategyManager />}
        {activeTab === 'account' && <AccountManager />}
        {activeTab === 'help' && <Help />}
      </main>`;

const newMainPanelBlock = `      <main style={{ minHeight: '60vh', position: 'relative' }}>
        <Suspense fallback={
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '350px', color: 'var(--text-dim)', gap: '12px' }}>
            <div style={{ border: '3px solid rgba(255,255,255,0.05)', borderTop: '3px solid var(--primary)', borderRadius: '50%', width: '32px', height: '32px', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '0.78rem', letterSpacing: '0.05em' }}>LOADING PANEL...</span>
          </div>
        }>
          {activeTab === 'dashboard' && (
            <Dashboard 
              activeAccountId={activeAccountId} 
              onNavigateToTab={setActiveTab} 
              onSelectDateFilter={(date) => {
                setSelectedDateFilter(date);
                setActiveTab('logs');
              }}
            />
          )}
          {activeTab === 'daybook' && <DayBook activeAccountId={activeAccountId} />}
          {activeTab === 'calendar' && (
            <TradingCalendar 
              activeAccountId={activeAccountId} 
              onEditTrade={handleEditTrade} 
            />
          )}
          {activeTab === 'logs' && (
            <TradeTable 
              onEditTrade={handleEditTrade} 
              activeAccountId={activeAccountId} 
              initialDateFilter={selectedDateFilter}
              onClearDateFilter={() => setSelectedDateFilter(null)}
            />
          )}
          {activeTab === 'ledger' && <Ledger activeAccountId={activeAccountId} />}
          {activeTab === 'taxation' && <Taxation activeAccountId={activeAccountId} />}
          {activeTab === 'strategies' && <StrategyManager />}
          {activeTab === 'account' && <AccountManager />}
          {activeTab === 'help' && <Help />}
        </Suspense>
      </main>`;

if (appContent.indexOf(oldMainPanelBlock) === -1) {
  console.error("Could not find oldMainPanelBlock in App.tsx");
  process.exit(1);
}
appContent = appContent.replace(oldMainPanelBlock, newMainPanelBlock);

// Wrap overlays modals inside Suspense
const oldModalsBlock = `      {/* Log Form Modal Overlay */}
      <TradeLogger 
        isOpen={isLoggerOpen} 
        onClose={handleCloseLogger} 
        editTradeId={editTradeId} 
        activeAccountId={activeAccountId}
      />

      {/* Profile & Settings Modal Overlay */}
      <ProfileSettingsModal 
        isOpen={isProfileSettingsOpen}
        onClose={() => setIsProfileSettingsOpen(false)}
        useTwoRowHeader={useTwoRowHeader}
        setUseTwoRowHeader={setUseTwoRowHeader}
      />`;

const newModalsBlock = `      <Suspense fallback={null}>
        {/* Log Form Modal Overlay */}
        <TradeLogger 
          isOpen={isLoggerOpen} 
          onClose={handleCloseLogger} 
          editTradeId={editTradeId} 
          activeAccountId={activeAccountId}
        />

        {/* Profile & Settings Modal Overlay */}
        <ProfileSettingsModal 
          isOpen={isProfileSettingsOpen}
          onClose={() => setIsProfileSettingsOpen(false)}
          useTwoRowHeader={useTwoRowHeader}
          setUseTwoRowHeader={setUseTwoRowHeader}
        />
      </Suspense>`;

if (appContent.indexOf(oldModalsBlock) === -1) {
  console.error("Could not find oldModalsBlock in App.tsx");
  process.exit(1);
}
appContent = appContent.replace(oldModalsBlock, newModalsBlock);

fs.writeFileSync(appPath, appContent, 'utf8');
console.log("App.tsx successfully updated with React lazy loading and Suspense boundary containers!");
