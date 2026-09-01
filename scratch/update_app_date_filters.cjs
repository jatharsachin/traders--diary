const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add the state declaration
const stateAnchor = "  const [activeAccountId, setActiveAccountId] = useState<string>('Combined');";
const stateDecl = `  const [activeAccountId, setActiveAccountId] = useState<string>('Combined');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);`;

content = content.replace(stateAnchor, stateDecl);

// Update Dashboard and TradeTable renders inside <main>
const oldDashboardRender = "{activeTab === 'dashboard' && <Dashboard activeAccountId={activeAccountId} onNavigateToTab={setActiveTab} />}";
const newDashboardRender = `{activeTab === 'dashboard' && (
          <Dashboard 
            activeAccountId={activeAccountId} 
            onNavigateToTab={setActiveTab} 
            onSelectDateFilter={(date) => {
              setSelectedDateFilter(date);
              setActiveTab('logs');
            }}
          />
        )}`;

const oldLogsRender = "{activeTab === 'logs' && <TradeTable onEditTrade={handleEditTrade} activeAccountId={activeAccountId} />}";
const newLogsRender = `{activeTab === 'logs' && (
          <TradeTable 
            onEditTrade={handleEditTrade} 
            activeAccountId={activeAccountId} 
            initialDateFilter={selectedDateFilter}
            onClearDateFilter={() => setSelectedDateFilter(null)}
          />
        )}`;

content = content.replace(oldDashboardRender, newDashboardRender);
content = content.replace(oldLogsRender, newLogsRender);

fs.writeFileSync(filePath, content, 'utf8');
console.log("App.tsx date filter sharing state successfully implemented!");
