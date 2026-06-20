import { useState } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import type { Trade } from '../types';
import { Edit2, Trash2, Search, Filter, ShieldAlert, ArrowUpDown, ChevronLeft, ChevronRight, Clock, ShieldCheck, Download } from 'lucide-react';

interface TradeTableProps {
  onEditTrade: (id: string) => void;
}

export function TradeTable({ onEditTrade }: TradeTableProps) {
  const { trades, deleteTrade, setups, isPnlVisible } = useTradeStore();
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string>('All');
  const [selectedAction, setSelectedAction] = useState<string>('All');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('All');
  const [selectedMistake, setSelectedMistake] = useState<string>('All');
  const [selectedSetupType, setSelectedSetupType] = useState<string>('All');

  // Sorting state
  const [sortField, setSortField] = useState<keyof Trade>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Formatting helpers
  const formatCurrency = (val: number) => {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    });
    return formatter.format(val);
  };

  // Handle Sort
  const handleSort = (field: keyof Trade) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter trades
  const filteredTrades = trades.filter((trade) => {
    const matchesSearch = trade.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSegment = selectedSegment === 'All' || trade.segment === selectedSegment;
    const matchesAction = selectedAction === 'All' || trade.action === selectedAction;
    const matchesStrategy = selectedStrategy === 'All' || trade.strategy === selectedStrategy;
    const matchesMistake = selectedMistake === 'All' || trade.mistake === selectedMistake;
    const matchesSetupType = selectedSetupType === 'All' || trade.setupType === selectedSetupType;
    const matchesTag = !selectedTag.trim() || (trade.tags && trade.tags.some(tag => tag.toLowerCase().includes(selectedTag.trim().toLowerCase())));

    return matchesSearch && matchesSegment && matchesAction && matchesStrategy && matchesMistake && matchesSetupType && matchesTag;
  });

  // Sort trades
  const sortedTrades = [...filteredTrades].sort((a, b) => {
    let valueA = a[sortField];
    let valueB = b[sortField];

    if (sortField === 'date' || sortField === 'entryTime') {
      const dateTimeA = new Date(`${a.date}T${a.entryTime}`).getTime();
      const dateTimeB = new Date(`${b.date}T${b.entryTime}`).getTime();
      return sortDirection === 'asc' ? dateTimeA - dateTimeB : dateTimeB - dateTimeA;
    }

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortDirection === 'asc' 
        ? valueA.localeCompare(valueB) 
        : valueB.localeCompare(valueA);
    }

    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    }

    return 0;
  });

  // Pagination calculations
  const totalPages = Math.ceil(sortedTrades.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTrades = sortedTrades.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedTag('');
    setSelectedSegment('All');
    setSelectedAction('All');
    setSelectedStrategy('All');
    setSelectedMistake('All');
    setSelectedSetupType('All');
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const headers = [
      'Date', 'Entry Time', 'Exit Time', 'Symbol', 'Segment', 'Product', 'Action', 
      'Qty', 'Entry Price', 'Exit Price', 'Gross P&L', 'Charges', 'Net P&L', 
      'ROI %', 'Emotion', 'Mistake', 'Setup Type', 'Notes'
    ];
    
    const rows = sortedTrades.map((t) => [
      t.date, t.entryTime, t.exitTime, t.symbol, t.segment, t.product, t.action,
      t.qty, t.entryPrice, t.exitPrice, t.grossPnL, (t.brokerage + t.taxes).toFixed(2), t.netPnL,
      t.roi.toFixed(2), t.emotion, t.mistake, t.setupType || 'None', t.notes.replace(/"/g, '""')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TradeDiary_Pro_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to export PDF.");
      return;
    }
    
    const tableRows = sortedTrades.map(t => `
      <tr>
        <td>${t.date}</td>
        <td>${t.symbol}</td>
        <td><span style="color: ${t.action === 'BUY' ? '#10b981' : '#f87171'}; font-weight: bold;">${t.action}</span></td>
        <td>${t.qty}</td>
        <td>₹${t.entryPrice}</td>
        <td>₹${t.exitPrice}</td>
        <td style="color: ${t.netPnL >= 0 ? '#10b981' : '#f87171'}; font-weight: bold;">₹${t.netPnL.toFixed(2)}</td>
        <td>${t.emotion}</td>
        <td>${t.mistake}</td>
        <td>${t.setupType || 'None'}</td>
      </tr>
    `).join('');
    
    const totalPnl = sortedTrades.reduce((acc, t) => acc + t.netPnL, 0);
    const winTrades = sortedTrades.filter(t => t.netPnL > 0).length;
    const winRate = sortedTrades.length > 0 ? (winTrades / sortedTrades.length) * 100 : 0;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>TradeDiary Pro - Performance Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #333; }
            h1 { font-size: 24px; color: #0a84ff; margin-bottom: 5px; }
            p { font-size: 14px; margin-top: 0; color: #666; }
            .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
            .card { border: 1px solid #eee; padding: 15px; border-radius: 8px; background: #fafafa; }
            .card-title { font-size: 12px; color: #666; text-transform: uppercase; }
            .card-val { font-size: 18px; font-weight: bold; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #eee; padding: 8px 10px; text-align: left; }
            th { background-color: #f3f4f6; color: #374151; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9fafb; }
            @media print {
              .print-btn { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0a84ff; padding-bottom: 15px;">
            <div>
              <h1>TradeDiary Pro Performance Report</h1>
              <p>Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
            <button class="print-btn" onclick="window.print()" style="padding: 10px 20px; font-weight: bold; color: white; background: #0a84ff; border: none; border-radius: 6px; cursor: pointer;">Print / Save as PDF</button>
          </div>
          
          <div class="summary-cards">
            <div class="card">
              <div class="card-title">Total Trades</div>
              <div class="card-val">${sortedTrades.length}</div>
            </div>
            <div class="card">
              <div class="card-title">Success Rate</div>
              <div class="card-val">${winRate.toFixed(1)}%</div>
            </div>
            <div class="card">
              <div class="card-title">Net Realized P&L</div>
              <div class="card-val" style="color: ${totalPnl >= 0 ? '#10b981' : '#f87171'}">₹${totalPnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Symbol</th>
                <th>Action</th>
                <th>Qty</th>
                <th>Entry Price</th>
                <th>Exit Price</th>
                <th>Net P&L</th>
                <th>Emotion</th>
                <th>Mistake</th>
                <th>Setup Type</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="glass-card animate-tab-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Trade Logs History</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Review, filter, and modify your logged trading executions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={exportToCSV}
            title="Download CSV for Excel/Tax filing"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={exportToPDF}
            title="Generate Performance Report PDF"
          >
            <Download size={14} color="var(--primary)" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search 
            size={16} 
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
            placeholder="Search symbol..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="form-input"
            style={{ paddingLeft: '36px' }}
          />
        </div>

        {/* Tag Filter */}
        <div style={{ position: 'relative' }}>
          <Filter 
            size={16} 
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
            style={{ paddingLeft: '36px' }}
          />
        </div>

        {/* Segment Filter */}
        <select
          value={selectedSegment}
          onChange={(e) => { setSelectedSegment(e.target.value); setCurrentPage(1); }}
          className="form-select"
        >
          <option value="All">All Segments</option>
          <option value="Equity">Equity</option>
          <option value="F&O">F&O</option>
          <option value="Commodity">Commodity</option>
          <option value="Currency">Currency</option>
        </select>

        {/* Action Filter */}
        <select
          value={selectedAction}
          onChange={(e) => { setSelectedAction(e.target.value); setCurrentPage(1); }}
          className="form-select"
        >
          <option value="All">All Actions</option>
          <option value="BUY">BUY / Long</option>
          <option value="SELL">SELL / Short</option>
        </select>

        {/* Strategy Filter */}
        <select
          value={selectedStrategy}
          onChange={(e) => { setSelectedStrategy(e.target.value); setCurrentPage(1); }}
          className="form-select"
        >
          <option value="All">All Strategies</option>
          {setups.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Mistake Filter */}
        <select
          value={selectedMistake}
          onChange={(e) => { setSelectedMistake(e.target.value); setCurrentPage(1); }}
          className="form-select"
        >
          <option value="All">All Mistakes</option>
          <option value="None">No Mistakes</option>
          <option value="Overtrading">Overtrading</option>
          <option value="FOMO Entry">FOMO Entry</option>
          <option value="Moving SL">Moving SL</option>
          <option value="Early Exit">Early Exit</option>
          <option value="No Setup">No Setup</option>
        </select>

        {/* Setup Type Filter */}
        <select
          value={selectedSetupType}
          onChange={(e) => { setSelectedSetupType(e.target.value); setCurrentPage(1); }}
          className="form-select"
        >
          <option value="All">All Setup Types</option>
          <option value="None">None</option>
          <option value="Breakout">Breakout</option>
          <option value="Pullback">Pullback</option>
          <option value="Reversal">Reversal</option>
          <option value="Range Bound">Range Bound</option>
        </select>
      </div>

      {/* Clear Filters Button */}
      {(searchTerm || selectedSegment !== 'All' || selectedAction !== 'All' || selectedStrategy !== 'All' || selectedMistake !== 'All' || selectedSetupType !== 'All') && (
        <button 
          onClick={clearFilters} 
          className="btn btn-secondary" 
          style={{ padding: '4px 10px', fontSize: '0.75rem', marginBottom: '16px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <Filter size={12} />
          Reset Filters
        </button>
      )}

      {/* Table Container */}
      <div className="table-container">
        {currentTrades.length > 0 ? (
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('date')}>
                  Date & Duration <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('symbol')}>
                  Symbol <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('segment')}>
                  Type <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
                </th>
                <th>Action</th>
                <th>Qty</th>
                <th>Entry Price</th>
                <th>Exit Price</th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('netPnL')}>
                  Net P&L <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
                </th>
                <th>Psychology</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentTrades.map((trade) => {
                const isProfit = trade.netPnL >= 0;
                return (
                  <tr 
                    key={trade.id}
                    className={selectedRowId === trade.id ? 'selected-row' : ''}
                    onClick={() => setSelectedRowId(selectedRowId === trade.id ? null : trade.id)}
                  >
                    <td>
                      <div style={{ fontWeight: 500 }}>{trade.date}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {trade.entryTime} - {trade.exitTime}
                      </div>
                      <div 
                        style={{ 
                          fontSize: '0.7rem', 
                          color: 'var(--text-dim)', 
                          fontWeight: 650,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          marginTop: '2px'
                        }}
                      >
                        <Clock size={10} color="var(--text-dim)" />
                        {trade.durationMinutes} mins
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {trade.symbol}
                        {trade.optionType && trade.optionType !== 'None' && (
                          <span 
                            className="badge" 
                            style={{ 
                              fontSize: '0.6rem', 
                              padding: '2px 6px',
                              backgroundColor: trade.optionType === 'CE' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              color: trade.optionType === 'CE' ? 'var(--color-win)' : 'var(--color-loss)',
                              border: `1px solid ${trade.optionType === 'CE' ? 'var(--color-win-border)' : 'var(--color-loss-border)'}`
                            }}
                          >
                            {trade.optionType}
                          </span>
                        )}
                        {trade.isExpiryDay && (
                          <span 
                            className="badge" 
                            style={{ 
                              fontSize: '0.6rem', 
                              padding: '2px 6px',
                              backgroundColor: 'rgba(139, 92, 246, 0.12)',
                              color: 'var(--color-neutral)',
                              border: '1px solid rgba(139, 92, 246, 0.2)'
                            }}
                            title="Nifty Weekly Expiry Day"
                          >
                            EXPIRY
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                        <span>{trade.strategy || 'No Setup'}</span>
                        {trade.setupType && trade.setupType !== 'None' && (
                          <span className="badge badge-neutral" style={{ fontSize: '0.6rem', padding: '1px 5px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}>
                            {trade.setupType}
                          </span>
                        )}
                      </div>
                      {trade.tags && trade.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                          {trade.tags.map((t) => (
                            <span 
                              key={t} 
                              className="badge" 
                              style={{ 
                                fontSize: '0.58rem', 
                                padding: '1px 4px', 
                                background: 'rgba(10, 132, 255, 0.08)', 
                                border: '1px solid rgba(10, 132, 255, 0.18)', 
                                color: '#0a84ff',
                                textTransform: 'lowercase'
                              }}
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{trade.segment}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{trade.product}</div>
                    </td>
                    <td>
                      <span className={`badge ${trade.action === 'BUY' ? 'badge-win' : 'badge-loss'}`}>
                        {trade.action}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{trade.qty}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{trade.entryPrice.toFixed(2)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{trade.exitPrice.toFixed(2)}</td>
                    <td 
                      style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontWeight: 700, 
                        color: isProfit ? 'var(--color-win)' : 'var(--color-loss)' 
                      }}
                    >
                      {isProfit ? '+' : ''}{isPnlVisible ? formatCurrency(trade.netPnL) : '••••'}
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 400 }}>
                        Charges: {isPnlVisible ? formatCurrency(trade.brokerage + trade.taxes) : '••••'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.75rem' }}>Mood: {trade.emotion}</span>
                        {trade.mistake !== 'None' ? (
                          <span 
                            style={{ 
                              fontSize: '0.7rem', 
                              color: 'var(--color-loss)', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '2px' 
                            }}
                          >
                            <ShieldAlert size={10} />
                            {trade.mistake}
                          </span>
                        ) : (
                          <span 
                            style={{ 
                              fontSize: '0.7rem', 
                              color: 'var(--color-win)',
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '2px'
                            }}
                          >
                            <ShieldCheck size={10} />
                            Clean
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '6px' }} 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (window.confirm('Are you sure you want to edit this trade log?')) {
                              onEditTrade(trade.id); 
                            }
                          }}
                          title="Edit Log"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '6px' }} 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Are you sure you want to delete this trade?')) {
                              deleteTrade(trade.id);
                            }
                          }}
                          title="Delete Log"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
            No trades match the current filter criteria.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginTop: '20px' 
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, sortedTrades.length)} of {sortedTrades.length} trades
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px' }} 
              disabled={currentPage === 1}
              onClick={() => paginate(currentPage - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i + 1}
                className="btn"
                style={{
                  padding: '6px 12px',
                  background: currentPage === i + 1 ? 'var(--primary)' : 'rgba(255, 255, 255, 0.03)',
                  color: '#fff',
                  border: `1px solid ${currentPage === i + 1 ? 'var(--primary)' : 'var(--border-color)'}`
                }}
                onClick={() => paginate(i + 1)}
              >
                {i + 1}
              </button>
            ))}

            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px' }} 
              disabled={currentPage === totalPages}
              onClick={() => paginate(currentPage + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
