const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'TradeTable.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update TradeTableProps interface and function signature
const oldSignature = `interface TradeTableProps {
  onEditTrade: (id: string) => void;
  activeAccountId?: string;
}

export function TradeTable({ onEditTrade, activeAccountId }: TradeTableProps) {`;

const newSignature = `interface TradeTableProps {
  onEditTrade: (id: string) => void;
  activeAccountId?: string;
  initialDateFilter?: string | null;
  onClearDateFilter?: () => void;
}

export function TradeTable({ 
  onEditTrade, 
  activeAccountId,
  initialDateFilter = null,
  onClearDateFilter
}: TradeTableProps) {`;

content = content.replace(oldSignature, newSignature);

// Update Lucide icon imports to include X and SlidersHorizontal
content = content.replace(
  "import { Edit2, Trash2, Search, Filter, ShieldAlert, ArrowUpDown, ChevronLeft, ChevronRight, Clock, ShieldCheck, Download, Settings } from 'lucide-react';",
  "import { Edit2, Trash2, Search, Filter, ShieldAlert, ArrowUpDown, ChevronLeft, ChevronRight, Clock, ShieldCheck, Download, Settings, X, SlidersHorizontal } from 'lucide-react';"
);

// 2. Add state declaration for isFilterDrawerOpen
const stateAnchor = "  // Search & Filter state\n  const [searchTerm, setSearchTerm] = useState('');";
const stateDecl = `  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);`;

content = content.replace(stateAnchor, stateDecl);

// 3. Update trades filtering logic to include date filter
const oldFilter = `  // Filter trades
  const filteredTrades = trades.filter((trade) => {
    const matchesSearch = trade.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSegment = selectedSegment === 'All' || trade.segment === selectedSegment;
    const matchesAction = selectedAction === 'All' || trade.action === selectedAction;
    const matchesStrategy = selectedStrategy === 'All' || trade.strategy === selectedStrategy;
    const matchesMistake = selectedMistake === 'All' || trade.mistake === selectedMistake;
    const matchesSetupType = selectedSetupType === 'All' || trade.setupType === selectedSetupType;
    const matchesTag = !selectedTag.trim() || (trade.tags && trade.tags.some((tag: string) => tag.toLowerCase().includes(selectedTag.trim().toLowerCase())));
    const matchesBroker = selectedBroker === 'All' || trade.broker === selectedBroker;

    return matchesSearch && matchesSegment && matchesAction && matchesStrategy && matchesMistake && matchesSetupType && matchesTag && matchesBroker;
  });`;

const newFilter = `  // Filter trades
  const filteredTrades = trades.filter((trade) => {
    const matchesSearch = trade.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSegment = selectedSegment === 'All' || trade.segment === selectedSegment;
    const matchesAction = selectedAction === 'All' || trade.action === selectedAction;
    const matchesStrategy = selectedStrategy === 'All' || trade.strategy === selectedStrategy;
    const matchesMistake = selectedMistake === 'All' || trade.mistake === selectedMistake;
    const matchesSetupType = selectedSetupType === 'All' || trade.setupType === selectedSetupType;
    const matchesTag = !selectedTag.trim() || (trade.tags && trade.tags.some((tag: string) => tag.toLowerCase().includes(selectedTag.trim().toLowerCase())));
    const matchesBroker = selectedBroker === 'All' || trade.broker === selectedBroker;
    const matchesDate = !initialDateFilter || trade.date === initialDateFilter;

    return matchesSearch && matchesSegment && matchesAction && matchesStrategy && matchesMistake && matchesSetupType && matchesTag && matchesBroker && matchesDate;
  });`;

content = content.replace(oldFilter, newFilter);

// Update clearFilters helper to call onClearDateFilter
const oldClearFilters = `  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTag('');
    setSelectedSegment('All');
    setSelectedAction('All');
    setSelectedStrategy('All');
    setSelectedMistake('All');
    setSelectedSetupType('All');
    setSelectedBroker('All');
    setCurrentPage(1);
  };`;

const newClearFilters = `  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTag('');
    setSelectedSegment('All');
    setSelectedAction('All');
    setSelectedStrategy('All');
    setSelectedMistake('All');
    setSelectedSetupType('All');
    setSelectedBroker('All');
    if (onClearDateFilter) {
      onClearDateFilter();
    }
    setCurrentPage(1);
  };`;

content = content.replace(oldClearFilters, newClearFilters);

// 4. Redesign the entire Filter Grid block (old lines 503-645) to use the new collapsible filter ribbon with chips
// Find the index of {/* Filter Toolbar */}
const toolbarStartAnchor = '      {/* Filter Toolbar */}';
const toolbarStartIndex = content.indexOf(toolbarStartAnchor);
if (toolbarStartIndex === -1) {
  console.error("Could not find {/* Filter Toolbar */} in TradeTable.tsx");
  process.exit(1);
}

// Find where it ends: immediately preceding {/* Table Container */}
const tableContainerAnchor = '      {/* Table Container */}';
const toolbarEndIndex = content.indexOf(tableContainerAnchor, toolbarStartIndex);
if (toolbarEndIndex === -1) {
  console.error("Could not find {/* Table Container */} in TradeTable.tsx");
  process.exit(1);
}

const activeFiltersCountCode = `  const activeFiltersCount = 
    (selectedSegment !== 'All' ? 1 : 0) +
    (selectedAction !== 'All' ? 1 : 0) +
    (selectedStrategy !== 'All' ? 1 : 0) +
    (selectedMistake !== 'All' ? 1 : 0) +
    (selectedSetupType !== 'All' ? 1 : 0) +
    (selectedBroker !== 'All' ? 1 : 0) +
    (selectedTag.trim() !== '' ? 1 : 0) +
    (initialDateFilter ? 1 : 0);`;

const newToolbarCode = `      {/* Advanced Filter Ribbon & Collapse Layout */}
      \${(() => {
        ${activeFiltersCountCode}
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {/* Primary Search & Ribbon Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexGrow: 1, flexWrap: 'wrap' }}>
                {/* Search Input */}
                <div style={{ position: 'relative', minWidth: '220px', flexGrow: 1 }}>
                  <Search 
                    size={15} 
                    style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      color: 'var(--text-dim)' 
                    }} 
                  />
                  <input
                    type="text"
                    placeholder="Search by symbol (e.g. NIFTY)..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="form-input"
                    style={{ paddingLeft: '36px', height: '36px' }}
                  />
                </div>

                {/* Tag Input */}
                <div style={{ position: 'relative', minWidth: '180px', flexGrow: 0.5 }}>
                  <Filter 
                    size={14} 
                    style={{ 
                      position: 'absolute', 
                      left: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      color: 'var(--text-dim)' 
                    }} 
                  />
                  <input
                    type="text"
                    placeholder="Filter by #tag..."
                    value={selectedTag}
                    onChange={(e) => { setSelectedTag(e.target.value); setCurrentPage(1); }}
                    className="form-input"
                    style={{ paddingLeft: '36px', height: '36px' }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
                  className="btn btn-secondary"
                  style={{
                    height: '36px',
                    padding: '0 14px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: isFilterDrawerOpen ? 'rgba(255,255,255,0.05)' : 'var(--bg-card)',
                    border: isFilterDrawerOpen ? '1px solid var(--border-color-active)' : '1px solid var(--border-color)'
                  }}
                >
                  <SlidersHorizontal size={13} color="var(--primary)" />
                  <span>Advanced Filters</span>
                  {activeFiltersCount > 0 && (
                    <span 
                      style={{ 
                        background: 'var(--primary)', 
                        color: '#fff', 
                        fontSize: '0.62rem', 
                        fontWeight: 'bold', 
                        borderRadius: '50%', 
                        width: '18px', 
                        height: '18px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        boxShadow: '0 0 6px var(--primary-glow)'
                      }}
                    >
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="btn btn-secondary"
                    style={{
                      height: '36px',
                      padding: '0 12px',
                      fontSize: '0.78rem',
                      color: 'var(--color-loss)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Dropdown Advanced Filters Drawer */}
            {isFilterDrawerOpen && (
              <div 
                className="glass-card animate-tab-panel"
                style={{
                  padding: '16px',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '12px'
                }}
              >
                {/* Segment Filter */}
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 650, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Segment</label>
                  <select
                    value={selectedSegment}
                    onChange={(e) => { setSelectedSegment(e.target.value); setCurrentPage(1); }}
                    className="form-select"
                    style={{ height: '34px', fontSize: '0.75rem' }}
                  >
                    <option value="All">All Segments</option>
                    <option value="Equity">Equity</option>
                    <option value="F&O">F&O</option>
                    <option value="Commodity">Commodity</option>
                    <option value="Currency">Currency</option>
                  </select>
                </div>

                {/* Action Filter */}
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 650, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Action</label>
                  <select
                    value={selectedAction}
                    onChange={(e) => { setSelectedAction(e.target.value); setCurrentPage(1); }}
                    className="form-select"
                    style={{ height: '34px', fontSize: '0.75rem' }}
                  >
                    <option value="All">All Actions</option>
                    <option value="BUY">BUY / Long</option>
                    <option value="SELL">SELL / Short</option>
                  </select>
                </div>

                {/* Strategy Filter */}
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 650, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Setup / Strategy</label>
                  <select
                    value={selectedStrategy}
                    onChange={(e) => { setSelectedStrategy(e.target.value); setCurrentPage(1); }}
                    className="form-select"
                    style={{ height: '34px', fontSize: '0.75rem' }}
                  >
                    <option value="All">All Strategies</option>
                    {setups.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Setup Type Filter */}
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 650, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Setup Type</label>
                  <select
                    value={selectedSetupType}
                    onChange={(e) => { setSelectedSetupType(e.target.value); setCurrentPage(1); }}
                    className="form-select"
                    style={{ height: '34px', fontSize: '0.75rem' }}
                  >
                    <option value="All">All Setup Types</option>
                    <option value="None">None</option>
                    <option value="Breakout">Breakout</option>
                    <option value="Pullback">Pullback</option>
                    <option value="Reversal">Reversal</option>
                    <option value="Range Bound">Range Bound</option>
                  </select>
                </div>

                {/* Mistake Filter */}
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 650, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Mistakes Tagged</label>
                  <select
                    value={selectedMistake}
                    onChange={(e) => { setSelectedMistake(e.target.value); setCurrentPage(1); }}
                    className="form-select"
                    style={{ height: '34px', fontSize: '0.75rem' }}
                  >
                    <option value="All">All Mistakes</option>
                    <option value="None">No Mistakes</option>
                    <option value="Overtrading">Overtrading</option>
                    <option value="FOMO Entry">FOMO Entry</option>
                    <option value="Moving SL">Moving SL</option>
                    <option value="Early Exit">Early Exit</option>
                    <option value="No Setup">No Setup</option>
                  </select>
                </div>

                {/* Broker Filter */}
                <div>
                  <label style={{ fontSize: '0.68rem', fontWeight: 650, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Broker Executed</label>
                  <select
                    value={selectedBroker}
                    onChange={(e) => { setSelectedBroker(e.target.value); setCurrentPage(1); }}
                    className="form-select"
                    style={{ height: '34px', fontSize: '0.75rem' }}
                  >
                    <option value="All">All Brokers</option>
                    {activeBrokers.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Active Filter Badges Ribbon */}
            {activeFiltersCount > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginRight: '4px', fontWeight: 600 }}>Active Filters:</span>
                
                {/* Date Filter Badge */}
                {initialDateFilter && (
                  <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <span>Date: {initialDateFilter}</span>
                    <X 
                      size={10} 
                      onClick={() => { if (onClearDateFilter) onClearDateFilter(); setCurrentPage(1); }} 
                      style={{ cursor: 'pointer', color: 'var(--text-dim)' }} 
                    />
                  </span>
                )}

                {/* Segment Filter Badge */}
                {selectedSegment !== 'All' && (
                  <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <span>Segment: {selectedSegment}</span>
                    <X 
                      size={10} 
                      onClick={() => { setSelectedSegment('All'); setCurrentPage(1); }} 
                      style={{ cursor: 'pointer', color: 'var(--text-dim)' }} 
                    />
                  </span>
                )}

                {/* Action Filter Badge */}
                {selectedAction !== 'All' && (
                  <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <span>Action: {selectedAction}</span>
                    <X 
                      size={10} 
                      onClick={() => { setSelectedAction('All'); setCurrentPage(1); }} 
                      style={{ cursor: 'pointer', color: 'var(--text-dim)' }} 
                    />
                  </span>
                )}

                {/* Strategy Filter Badge */}
                {selectedStrategy !== 'All' && (
                  <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <span>Strategy: {selectedStrategy}</span>
                    <X 
                      size={10} 
                      onClick={() => { setSelectedStrategy('All'); setCurrentPage(1); }} 
                      style={{ cursor: 'pointer', color: 'var(--text-dim)' }} 
                    />
                  </span>
                )}

                {/* Setup Type Filter Badge */}
                {selectedSetupType !== 'All' && (
                  <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <span>Setup Type: {selectedSetupType}</span>
                    <X 
                      size={10} 
                      onClick={() => { setSelectedSetupType('All'); setCurrentPage(1); }} 
                      style={{ cursor: 'pointer', color: 'var(--text-dim)' }} 
                    />
                  </span>
                )}

                {/* Mistake Filter Badge */}
                {selectedMistake !== 'All' && (
                  <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <span>Mistake: {selectedMistake}</span>
                    <X 
                      size={10} 
                      onClick={() => { setSelectedMistake('All'); setCurrentPage(1); }} 
                      style={{ cursor: 'pointer', color: 'var(--text-dim)' }} 
                    />
                  </span>
                )}

                {/* Broker Filter Badge */}
                {selectedBroker !== 'All' && (
                  <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <span>Broker: {selectedBroker}</span>
                    <X 
                      size={10} 
                      onClick={() => { setSelectedBroker('All'); setCurrentPage(1); }} 
                      style={{ cursor: 'pointer', color: 'var(--text-dim)' }} 
                    />
                  </span>
                )}

                {/* Tag Filter Badge */}
                {selectedTag.trim() !== '' && (
                  <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <span>Tag: #{selectedTag}</span>
                    <X 
                      size={10} 
                      onClick={() => { setSelectedTag(''); setCurrentPage(1); }} 
                      style={{ cursor: 'pointer', color: 'var(--text-dim)' }} 
                    />
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })()}
`;

const beforeToolbar = content.substring(0, toolbarStartIndex);
const afterToolbar = content.substring(toolbarEndIndex);
const finalContent = beforeToolbar + newToolbarCode + afterToolbar;

fs.writeFileSync(filePath, finalContent, 'utf8');
console.log("TradeTable.tsx filters ribbon successfully implemented!");
