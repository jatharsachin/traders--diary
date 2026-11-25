import { useState, useMemo } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import type { Trade, Mistake } from '../types';
import { getTradeMistakes, formatTradeMistakes } from '../types';
import { 
  Edit2, Trash2, Search, ShieldAlert, ArrowUpDown, 
  ChevronLeft, ChevronRight, Clock, ShieldCheck, Download, 
  X, SlidersHorizontal, Upload, TrendingUp, TrendingDown, Layers,
  Copy, FileText
} from 'lucide-react';
import { filterTradesByFY, formatTimeToAMPM, getFinancialYear } from '../utils/fyHelper';
import { BrokerBadge } from './BrokerBadge';
import { toast } from '../utils/toast';
import { isMatchAccount as isMatchAccountUtil } from '../utils/accountScope';
import { generateMonthlyPDFReport } from '../utils/monthlyStatementPdf';

interface TradeTableProps {
  onEditTrade: (id: string) => void;
  onDuplicateTrade?: (id: string) => void;
  activeAccountId?: string;
  initialDateFilter?: string | null;
  onClearDateFilter?: () => void;
  onOpenImport?: () => void;
}

export function TradeTable({ 
  onEditTrade, 
  onDuplicateTrade,
  activeAccountId,
  initialDateFilter = null,
  onClearDateFilter,
  onOpenImport
}: TradeTableProps) {
  const { 
    trades: allTrades, 
    deleteTrade, 
    setups, 
    isPnlVisible, 
    selectedFY, 
    activeBrokers,
    investments: allInvestments,
    brokerAccounts,
    userName
  } = useTradeStore();

  const fyTrades = useMemo(() => filterTradesByFY(allTrades, selectedFY), [allTrades, selectedFY]);

  const fyInvestments = useMemo(() => {
    const purchaseItems = (allInvestments || []).map(i => ({
      id: `${i.id}-buy`,
      date: i.date,
      exitDate: i.status === 'EXITED' ? i.exitDate : undefined,
      entryTime: '09:15',
      exitTime: i.status === 'EXITED' ? '15:30' : '09:15',
      durationMinutes: 0,
      symbol: i.symbol,
      broker: i.broker || 'Other',
      brokerAccountId: i.brokerAccountId,
      segment: (i.type === 'ETF' || i.type === 'BOND') ? 'Equity' : (i.type || 'Equity'),
      rawType: i.type,
      product: 'Delivery' as const,
      action: 'BUY' as const,
      qty: i.qty,
      entryPrice: i.buyPrice,
      exitPrice: i.status === 'EXITED' ? (i.exitPrice || 0) : (i.currentPrice || i.buyPrice),
      grossPnL: i.status === 'EXITED' ? i.qty * ((i.exitPrice || 0) - i.buyPrice) : i.qty * ((i.currentPrice || i.buyPrice) - i.buyPrice),
      brokerage: 0,
      taxes: 0,
      netPnL: i.status === 'EXITED' ? i.qty * ((i.exitPrice || 0) - i.buyPrice) : i.qty * ((i.currentPrice || i.buyPrice) - i.buyPrice),
      strategy: 'Delivery Investment',
      mistake: 'None',
      setupType: 'None' as const,
      notes: i.notes || 'Investment holding log',
      isInvestment: true,
      emotion: 'Calm' as const,
      roi: i.buyPrice > 0 ? (((i.status === 'EXITED' ? (i.exitPrice || 0) : (i.currentPrice || i.buyPrice)) - i.buyPrice) / i.buyPrice) * 100 : 0,
      actualRR: 0,
      isExpiryDay: false,
      optionType: 'None' as const,
      tags: ['#investment', `#${i.type || 'HOLDING'}`] as string[]
    }));
    if (selectedFY === 'All') return purchaseItems;
    return purchaseItems.filter(i => getFinancialYear(i.exitDate || i.date) === selectedFY);
  }, [allInvestments, selectedFY]);

  const tradesFiltered = useMemo(() => activeAccountId === 'Combined'
    ? fyTrades
    : fyTrades.filter(t => isMatchAccountUtil(activeAccountId, brokerAccounts, t.brokerAccountId, t.broker)),
    [activeAccountId, brokerAccounts, fyTrades]);

  const investmentsFiltered = useMemo(() => activeAccountId === 'Combined'
    ? fyInvestments
    : fyInvestments.filter(i => isMatchAccountUtil(activeAccountId, brokerAccounts, i.brokerAccountId, i.broker)),
    [activeAccountId, brokerAccounts, fyInvestments]);

  const trades = useMemo(() => [...tradesFiltered, ...investmentsFiltered], [tradesFiltered, investmentsFiltered]);
  
  const allAvailableStrategies = useMemo(() => {
    const names = new Set(setups.map(s => s.name));
    tradesFiltered.forEach(t => {
      if (t.strategy && t.strategy !== 'None') {
        names.add(t.strategy);
      }
    });
    return Array.from(names);
  }, [setups, tradesFiltered]);

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const selectedTrade = useMemo(() => {
    if (!selectedRowId) return null;
    return trades.find(t => t.id === selectedRowId) || null;
  }, [trades, selectedRowId]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<string>('All');
  const [selectedAction, setSelectedAction] = useState<string>('All');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('All');
  const [selectedMistake, setSelectedMistake] = useState<string>('All');
  const [selectedSetupType, setSelectedSetupType] = useState<string>('All');
  const [selectedBroker, setSelectedBroker] = useState<string>('All');

  // Sorting state
  const [sortField, setSortField] = useState<keyof Trade>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

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
  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      const matchesSearch = searchTerm.trim() === '' || 
        trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (trade.strategy && trade.strategy.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (trade.tags && trade.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase())));

      const matchesOutcome = 
        outcomeFilter === 'ALL' || 
        (outcomeFilter === 'WIN' && trade.netPnL > 0) || 
        (outcomeFilter === 'LOSS' && trade.netPnL < 0);

      const matchesSegment = selectedSegment === 'All' || trade.segment === selectedSegment || (trade as any).rawType === selectedSegment;
      const matchesAction = selectedAction === 'All' || trade.action === selectedAction;
      const matchesStrategy = selectedStrategy === 'All' || trade.strategy === selectedStrategy;
      const matchesMistake = selectedMistake === 'All' || getTradeMistakes(trade).includes(selectedMistake as Mistake);
      const matchesSetupType = selectedSetupType === 'All' || trade.setupType === selectedSetupType;
      const matchesTag = !selectedTag.trim() || (trade.tags && trade.tags.some((tag: string) => tag.toLowerCase().includes(selectedTag.trim().toLowerCase())));
      const matchesBroker = selectedBroker === 'All' || trade.broker === selectedBroker;
      const matchesDate = !initialDateFilter || (trade.exitDate || trade.date) === initialDateFilter;

      return matchesSearch && matchesOutcome && matchesSegment && matchesAction && matchesStrategy && matchesMistake && matchesSetupType && matchesTag && matchesBroker && matchesDate;
    });
  }, [trades, searchTerm, outcomeFilter, selectedSegment, selectedAction, selectedStrategy, selectedMistake, selectedSetupType, selectedTag, selectedBroker, initialDateFilter]);

  // Sort trades
  const sortedTrades = useMemo(() => {
    return [...filteredTrades].sort((a, b) => {
      let valueA = (a as any)[sortField];
      let valueB = (b as any)[sortField];

      if (sortField === 'date' || sortField === 'entryTime') {
        const keyA = `${a.exitDate || a.date || ''} ${(a.entryTime || '').padStart(5, '0')}`;
        const keyB = `${b.exitDate || b.date || ''} ${(b.entryTime || '').padStart(5, '0')}`;
        return sortDirection === 'asc' ? keyA.localeCompare(keyB) : keyB.localeCompare(keyA);
      }

      if (typeof valueA === 'string' || typeof valueB === 'string') {
        const strA = String(valueA || '');
        const strB = String(valueB || '');
        return sortDirection === 'asc' 
          ? strA.localeCompare(strB) 
          : strB.localeCompare(strA);
      }

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }

      return 0;
    });
  }, [filteredTrades, sortField, sortDirection]);

  // Summary KPIs for current filtered set
  const summaryStats = useMemo(() => {
    let gross = 0;
    let net = 0;
    let charges = 0;
    let wins = 0;
    let losses = 0;

    filteredTrades.forEach(t => {
      gross += t.grossPnL || 0;
      net += t.netPnL || 0;
      charges += (t.brokerage || 0) + (t.taxes || 0);
      if (t.netPnL > 0) wins++;
      else if (t.netPnL < 0) losses++;
    });

    const totalDecisive = wins + losses;
    const winRate = totalDecisive > 0 ? (wins / totalDecisive) * 100 : 0;

    return {
      total: filteredTrades.length,
      wins,
      losses,
      winRate: Math.round(winRate),
      gross: Math.round(gross * 100) / 100,
      net: Math.round(net * 100) / 100,
      charges: Math.round(charges * 100) / 100,
    };
  }, [filteredTrades]);

  // Pagination calculations (clamped to valid range when filters/FY change)
  const totalPages = Math.max(1, Math.ceil(sortedTrades.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const indexOfLastItem = safeCurrentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTrades = sortedTrades.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const getPageNumbers = (current: number, total: number) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    pages.push(1);

    if (current > 3) {
      pages.push('...');
    }

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < total - 2) {
      pages.push('...');
    }

    pages.push(total);
    return pages;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setOutcomeFilter('ALL');
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
  };

  const handleEdit = (id: string) => {
    const tr = trades.find(t => t.id === id);
    if (!tr) return;
    if ((tr as any).isInvestment) {
      toast.info('Please view and edit this investment in the Investments tab');
      return;
    }
    onEditTrade(id);
  };

  const handleDeleteTrade = (id: string) => {
    const tr = trades.find(t => t.id === id);
    if (!tr) return;
    if ((tr as any).isInvestment) {
      toast.error('Investment holdings must be deleted in the Investments tab');
      return;
    }
    if (window.confirm(`Delete trade ${tr.symbol} on ${tr.date}?`)) {
      deleteTrade(id);
      if (selectedRowId === id) setSelectedRowId(null);
      toast.success('Trade deleted');
    }
  };

  const exportToCSV = () => {
    if (!isPnlVisible) {
      const proceed = window.confirm(
        'Privacy Mode is active: Figures are masked on screen, but the exported CSV file will contain unmasked figures for accounting purposes. Do you wish to continue?'
      );
      if (!proceed) return;
    }

    const headers = [
      'Date', 'Entry Time', 'Exit Time', 'Symbol', 'Segment', 'Product', 'Action', 
      'Qty', 'Entry Price', 'Exit Price', 'Gross P&L', 'Charges', 'Net P&L', 
      'ROI %', 'Emotion', 'Mistake', 'Setup Type', 'Notes'
    ];
    
    const sanitizeCsvCell = (val: any) => {
      let str = String(val ?? '');
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = sortedTrades.map((t) => [
      t.date, t.entryTime, t.exitTime, t.symbol, t.segment, t.product, t.action,
      t.qty, t.entryPrice, t.exitPrice, t.grossPnL, (t.brokerage + t.taxes).toFixed(2), t.netPnL,
      t.roi.toFixed(2), t.emotion, formatTradeMistakes(t), t.setupType || 'None', t.notes || ''
    ]);
    
    const csvContent = [
      headers.map(sanitizeCsvCell).join(','),
      ...rows.map(row => row.map(sanitizeCsvCell).join(','))
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
    if (!isPnlVisible) {
      const proceed = window.confirm(
        'Privacy Mode is active: Figures are masked on screen, but the exported PDF report will contain unmasked figures for accounting purposes. Do you wish to continue?'
      );
      if (!proceed) return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Please allow popups to export PDF.");
      return;
    }

    const escapeHtml = (str: any) => String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m] || m);
    
    const tableRows = sortedTrades.map(t => `
      <tr>
        <td>${escapeHtml(t.date)}</td>
        <td>${escapeHtml(t.symbol)}</td>
        <td><span style="color: ${t.action === 'BUY' ? '#10b981' : '#f87171'}; font-weight: bold;">${escapeHtml(t.action)}</span></td>
        <td>${t.qty}</td>
        <td>₹${t.entryPrice}</td>
        <td>₹${t.exitPrice}</td>
        <td style="color: ${t.netPnL >= 0 ? '#10b981' : '#f87171'}; font-weight: bold;">₹${t.netPnL.toFixed(2)}</td>
        <td>${escapeHtml(t.emotion)}</td>
        <td>${escapeHtml(formatTradeMistakes(t))}</td>
        <td>${escapeHtml(t.setupType || 'None')}</td>
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

  const handleExportMonthlyPDF = () => {
    // Determine active target month
    const now = new Date();
    const currentMonthPrefix = now.toISOString().substring(0, 7);
    
    let targetMonthPrefix = currentMonthPrefix;
    if (initialDateFilter && /^\d{4}-\d{2}/.test(initialDateFilter)) {
      targetMonthPrefix = initialDateFilter.substring(0, 7);
    } else if (sortedTrades.length > 0) {
      targetMonthPrefix = sortedTrades[0].date.substring(0, 7);
    }

    const monthTrades = (allTrades || []).filter(t => 
      (t.exitDate || t.date).startsWith(targetMonthPrefix) && isMatchAccountUtil(activeAccountId, brokerAccounts, t.brokerAccountId, t.broker)
    );

    if (monthTrades.length === 0) {
      toast.error(`No trades found for ${targetMonthPrefix} to generate monthly statement.`);
      return;
    }

    generateMonthlyPDFReport({
      trades: monthTrades,
      monthStr: targetMonthPrefix,
      userName: userName || 'Sachin Jathar',
      brokerAccounts,
      activeAccountId,
    });
  };

  const activeFiltersCount = 
    (selectedSegment !== 'All' ? 1 : 0) +
    (selectedAction !== 'All' ? 1 : 0) +
    (selectedStrategy !== 'All' ? 1 : 0) +
    (selectedMistake !== 'All' ? 1 : 0) +
    (selectedSetupType !== 'All' ? 1 : 0) +
    (selectedBroker !== 'All' ? 1 : 0) +
    (selectedTag.trim() !== '' ? 1 : 0) +
    (initialDateFilter ? 1 : 0) +
    (outcomeFilter !== 'ALL' ? 1 : 0);

  return (
    <div className="glass-card animate-tab-panel" style={{ padding: '18px 20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '4px', fontWeight: 700 }}>Trade Logs History</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Review, filter, and manage your logged trading executions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Active Financial Year Badge */}
          <div 
            style={{ 
              padding: '6px 14px', 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--text-dim)',
              height: '32px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Active: {selectedFY}
          </div>

          {/* Current Month P&L Widget */}
          {(() => {
            const today = new Date();
            const currentMonthName = today.toLocaleDateString('en-IN', { month: 'short' });
            const monthPrefix = today.toISOString().substring(0, 7);
            const monthPnL = allTrades
              .filter(t => t.date.startsWith(monthPrefix))
              .reduce((sum, t) => sum + t.netPnL, 0);

            return (
              <div 
                className="glass-card" 
                style={{ 
                  padding: '6px 14px', 
                  border: '1.5px solid var(--border-color)', 
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '32px',
                  background: 'rgba(255,255,255,0.02)'
                }}
              >
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 650 }}>
                  {currentMonthName} P&L:
                </span>
                <strong 
                  style={{ 
                    fontSize: '0.85rem', 
                    fontFamily: 'var(--font-mono)',
                    color: !isPnlVisible ? 'var(--text-dim)' : monthPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' 
                  }}
                >
                  {isPnlVisible 
                    ? `${monthPnL >= 0 ? '+' : ''}${monthPnL.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}` 
                    : '••••'
                  }
                </strong>
              </div>
            );
          })()}

          {onOpenImport && (
            <button 
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}
              onClick={onOpenImport}
              title="Import Zerodha, Dhan or Kotak Tradebook CSV"
            >
              <Upload size={14} color="var(--primary)" />
              <span>Import</span>
            </button>
          )}

          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}
            onClick={exportToCSV}
            title="Download CSV for Excel/Tax filing"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', height: '32px' }}
            onClick={exportToPDF}
            title="Generate Performance Report PDF"
          >
            <Download size={14} color="var(--primary)" />
            <span>PDF</span>
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ 
              padding: '6px 12px', 
              fontSize: '0.78rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              height: '32px',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              background: 'rgba(16, 185, 129, 0.08)'
            }}
            onClick={handleExportMonthlyPDF}
            title="Generate 1-Page CA & Tax Monthly PDF Statement"
          >
            <FileText size={14} color="#10b981" />
            <span>1-Page Monthly PDF</span>
          </button>
        </div>
      </div>

      {/* Top Summary Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '14px' }}>
        {/* Card 1: Total Trades & Win Rate */}
        <div className="glass-card" style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
          <Layers size={58} color="var(--primary)" style={{ position: 'absolute', right: '-8px', bottom: '-8px', opacity: 0.05, pointerEvents: 'none' }} />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={13} color="var(--primary)" />
            <span>Filtered Trades</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '4px' }}>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {summaryStats.total}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                🟢 {summaryStats.wins} Wins • 🔴 {summaryStats.losses} Losses
              </div>
            </div>
            {/* Circular Win Rate Gauge */}
            <div style={{ position: 'relative', width: '38px', height: '38px', flexShrink: 0 }}>
              <svg width="38" height="38" viewBox="0 0 38 38">
                <circle cx="19" cy="19" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
                <circle 
                  cx="19" 
                  cy="19" 
                  r="15" 
                  fill="none" 
                  stroke={summaryStats.winRate >= 50 ? '#34d399' : '#f87171'} 
                  strokeWidth="3.5" 
                  strokeDasharray={94.2}
                  strokeDashoffset={94.2 - (94.2 * (summaryStats.winRate || 0)) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 19 19)"
                  style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
              </svg>
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: summaryStats.winRate >= 50 ? '#34d399' : '#f87171' }}>
                {summaryStats.winRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Net Realized P&L */}
        <div className="glass-card" style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
          <TrendingUp size={58} color={summaryStats.net >= 0 ? 'var(--color-win)' : 'var(--color-loss)'} style={{ position: 'absolute', right: '-8px', bottom: '-8px', opacity: 0.06, pointerEvents: 'none' }} />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {summaryStats.net >= 0 ? <TrendingUp size={13} color="var(--color-win)" /> : <TrendingDown size={13} color="var(--color-loss)" />}
            <span>Net Realized P&L</span>
          </div>
          <div style={{ marginTop: '4px' }}>
            <span style={{ 
              fontSize: '1.25rem', 
              fontWeight: 800, 
              fontFamily: 'var(--font-mono)',
              color: !isPnlVisible ? 'var(--text-dim)' : summaryStats.net >= 0 ? 'var(--color-win)' : 'var(--color-loss)'
            }}>
              {isPnlVisible ? (
                <>
                  {summaryStats.net >= 0 ? '+' : ''}{formatCurrency(summaryStats.net)}
                </>
              ) : '••••••'}
            </span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Gross: {isPnlVisible ? `${summaryStats.gross >= 0 ? '+' : ''}${formatCurrency(summaryStats.gross)}` : '••••'}
          </div>
        </div>

        {/* Card 3: Total Charges & Brokerage */}
        <div className="glass-card" style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
          <Clock size={58} color="#ff9500" style={{ position: 'absolute', right: '-8px', bottom: '-8px', opacity: 0.05, pointerEvents: 'none' }} />
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={13} color="var(--text-dim)" />
            <span>Total Charges</span>
          </div>
          <div style={{ marginTop: '4px' }}>
            <span style={{ 
              fontSize: '1.25rem', 
              fontWeight: 800, 
              fontFamily: 'var(--font-mono)',
              color: !isPnlVisible ? 'var(--text-dim)' : '#ff9500'
            }}>
              {isPnlVisible ? formatCurrency(summaryStats.charges) : '••••••'}
            </span>
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>
            Brokerage + Taxes
          </div>
        </div>
      </div>

      {/* Filter and Search Ribbon */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search & Quick Status Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexGrow: 1, flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '220px', flexGrow: 1 }}>
              <Search 
                size={14} 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} 
              />
              <input
                type="text"
                placeholder="Search symbol, setup, tags..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="form-input"
                style={{ paddingLeft: '34px', height: '36px', fontSize: '0.82rem' }}
              />
            </div>

            {/* Quick Outcome Filter Pills: All | Wins | Losses */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '9999px', padding: '3px', border: '1px solid var(--border-color)' }}>
              {[
                { key: 'ALL', label: 'All Trades' },
                { key: 'WIN', label: '🟢 Wins' },
                { key: 'LOSS', label: '🔴 Losses' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setOutcomeFilter(tab.key as any); setCurrentPage(1); }}
                  style={{
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '5px 14px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: outcomeFilter === tab.key ? 'var(--primary)' : 'transparent',
                    color: outcomeFilter === tab.key ? '#fff' : 'var(--text-dim)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Advanced Filters Button & Clear */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
              className="btn btn-secondary"
              style={{
                height: '36px',
                padding: '0 12px',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: isFilterDrawerOpen ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-card)',
                border: isFilterDrawerOpen ? '1px solid var(--primary)' : '1px solid var(--border-color)'
              }}
            >
              <SlidersHorizontal size={13} color="var(--primary)" />
              <span>More Filters</span>
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
                    justifyContent: 'center'
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
                  padding: '0 10px',
                  fontSize: '0.75rem',
                  color: 'var(--color-loss)',
                  border: '1px solid var(--border-color)'
                }}
              >
                Reset
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
                {allAvailableStrategies.map((name: string) => (
                  <option key={name} value={name}>
                    {name}
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
                <option value="10K Rule">10K Rule</option>
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

            {/* Tag Filter */}
            <div>
              <label style={{ fontSize: '0.68rem', fontWeight: 650, color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Tag Filter</label>
              <input
                type="text"
                placeholder="e.g. #expiry, #hero"
                value={selectedTag}
                onChange={(e) => { setSelectedTag(e.target.value); setCurrentPage(1); }}
                className="form-input"
                style={{ height: '34px', fontSize: '0.75rem' }}
              />
            </div>
          </div>
        )}

        {/* Active Filter Badges Ribbon */}
        {activeFiltersCount > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginRight: '4px', fontWeight: 600 }}>Active Filters:</span>
            
            {initialDateFilter && (
              <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '9999px' }}>
                <span>Date: {initialDateFilter}</span>
                <X 
                  size={10} 
                  onClick={() => { if (onClearDateFilter) onClearDateFilter(); setCurrentPage(1); }} 
                  style={{ cursor: 'pointer', color: 'var(--text-dim)' }} 
                />
              </span>
            )}

            {outcomeFilter !== 'ALL' && (
              <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '9999px' }}>
                <span>Outcome: {outcomeFilter === 'WIN' ? 'Wins' : 'Losses'}</span>
                <X 
                  size={10} 
                  onClick={() => { setOutcomeFilter('ALL'); setCurrentPage(1); }} 
                  style={{ cursor: 'pointer', color: 'var(--text-dim)' }} 
                />
              </span>
            )}

            {selectedSegment !== 'All' && (
              <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '9999px' }}>
                <span>Segment: {selectedSegment}</span>
                <X 
                  size={10} 
                  onClick={() => { setSelectedSegment('All'); setCurrentPage(1); }} 
                  style={{ cursor: 'pointer', color: 'var(--text-dim)' }} 
                />
              </span>
            )}

            {selectedAction !== 'All' && (
              <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '9999px' }}>
                <span>Action: {selectedAction}</span>
                <X 
                  size={10} 
                  onClick={() => { setSelectedAction('All'); setCurrentPage(1); }} 
                  style={{ cursor: 'pointer', color: 'var(--text-dim)' }} 
                />
              </span>
            )}

            {selectedStrategy !== 'All' && (
              <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '9999px' }}>
                <span>Strategy: {selectedStrategy}</span>
                <X 
                  size={10} 
                  onClick={() => { setSelectedStrategy('All'); setCurrentPage(1); }} 
                  style={{ cursor: 'pointer', color: 'var(--text-dim)' }} 
                />
              </span>
            )}

            {selectedSetupType !== 'All' && (
              <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '9999px' }}>
                <span>Setup: {selectedSetupType}</span>
                <X 
                  size={10} 
                  onClick={() => { setSelectedSetupType('All'); setCurrentPage(1); }} 
                  style={{ cursor: 'pointer', color: 'var(--text-dim)' }} 
                />
              </span>
            )}

            {selectedMistake !== 'All' && (
              <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '9999px' }}>
                <span>Mistake: {selectedMistake}</span>
                <X 
                  size={10} 
                  onClick={() => { setSelectedMistake('All'); setCurrentPage(1); }} 
                  style={{ cursor: 'pointer', color: 'var(--text-dim)' }} 
                />
              </span>
            )}

            {selectedBroker !== 'All' && (
              <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '9999px' }}>
                <span>Broker: {selectedBroker}</span>
                <X 
                  size={10} 
                  onClick={() => { setSelectedBroker('All'); setCurrentPage(1); }} 
                  style={{ cursor: 'pointer', color: 'var(--text-dim)' }} 
                />
              </span>
            )}

            {selectedTag.trim() !== '' && (
              <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', fontSize: '0.68rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '9999px' }}>
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

      {/* Common Selected Trade Action Toolbar */}
      {selectedTrade && (
        <div 
          className="glass-card animate-tab-panel"
          style={{
            padding: '12px 18px',
            marginBottom: '14px',
            background: 'rgba(10, 132, 255, 0.09)',
            border: '1.5px solid var(--primary)',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 20px rgba(10, 132, 255, 0.16)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.9rem'
              }}
            >
              ✓
            </div>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{selectedTrade.symbol}</span>
                <span className={`badge ${selectedTrade.action === 'BUY' ? 'badge-win' : 'badge-loss'}`} style={{ padding: '2px 8px', fontSize: '0.72rem' }}>
                  {selectedTrade.action}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>• {selectedTrade.date}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Qty: {selectedTrade.qty} @ ₹{selectedTrade.entryPrice.toFixed(2)} → ₹{selectedTrade.exitPrice.toFixed(2)} | Net P&L: 
                <strong style={{ 
                  color: selectedTrade.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)',
                  marginLeft: '4px',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {isPnlVisible ? `${selectedTrade.netPnL >= 0 ? '+' : ''}${formatCurrency(selectedTrade.netPnL)}` : '••••'}
                </strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!(selectedTrade as any).isInvestment ? (
              <>
                <button
                  onClick={() => handleEdit(selectedTrade.id)}
                  className="btn btn-primary"
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '32px',
                    fontWeight: 650
                  }}
                >
                  <Edit2 size={13} />
                  <span>Edit Trade</span>
                </button>

                {onDuplicateTrade && (
                  <button
                    onClick={() => onDuplicateTrade(selectedTrade.id)}
                    className="btn btn-secondary"
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '32px',
                      fontWeight: 650,
                      background: 'rgba(234, 179, 8, 0.12)',
                      border: '1px solid rgba(234, 179, 8, 0.4)',
                      color: '#eab308',
                      borderRadius: '9999px',
                      cursor: 'pointer'
                    }}
                    title="Clone this trade setup for a quick re-entry with today's date & time"
                  >
                    <Copy size={13} />
                    <span>⚡ Duplicate / Re-Entry</span>
                  </button>
                )}

                <button
                  onClick={() => handleDeleteTrade(selectedTrade.id)}
                  className="btn"
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '32px',
                    background: 'rgba(239, 68, 68, 0.16)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: 'var(--color-loss)',
                    borderRadius: '9999px',
                    fontWeight: 650,
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={13} />
                  <span>Delete Trade</span>
                </button>
              </>
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                Holding investment — manage in Investments tab
              </span>
            )}

            <button
              onClick={() => setSelectedRowId(null)}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.78rem', height: '32px' }}
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="table-container sticky-table-container">
        {currentTrades.length > 0 ? (
          <table className="custom-table">
            <thead className="sticky-table-header">
              <tr>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('date')}>
                  Date & Time <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('symbol')}>
                  Symbol & Setup <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
                </th>
                <th style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => handleSort('broker')}>
                  Broker <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
                </th>
                <th style={{ cursor: 'pointer' }} onClick={() => handleSort('segment')}>
                  Type <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
                </th>
                <th style={{ textAlign: 'center' }}>Action</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Entry</th>
                <th style={{ textAlign: 'right' }}>Exit</th>
                <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('netPnL')}>
                  Net P&L <ArrowUpDown size={12} style={{ marginLeft: '4px', display: 'inline' }} />
                </th>
                <th>Psychology</th>
              </tr>
            </thead>
            <tbody>
              {currentTrades.map((trade) => {
                const isProfit = trade.netPnL >= 0;
                return (
                  <tr 
                    key={trade.id}
                    onClick={() => setSelectedRowId(selectedRowId === trade.id ? null : trade.id)}
                    onDoubleClick={() => handleEdit(trade.id)}
                    className={selectedRowId === trade.id ? 'selected-row' : ''}
                    style={{
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title="Click to select, double-click to edit"
                  >
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                        {trade.product === 'Delivery' && trade.exitDate && trade.exitDate !== trade.date
                          ? `${trade.date} → ${trade.exitDate}`
                          : trade.date
                        }
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <span>{formatTimeToAMPM(trade.entryTime)} - {formatTimeToAMPM(trade.exitTime)}</span>
                        <span style={{ color: 'var(--text-dim)' }}>•</span>
                        <span style={{ color: 'var(--text-dim)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                          <Clock size={10} />
                          {trade.durationMinutes}m
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 650, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem' }}>
                        <span>{trade.symbol}</span>
                        {trade.optionType && trade.optionType !== 'None' && (
                          <span 
                            className="badge" 
                            style={{ 
                              fontSize: '0.62rem', 
                              padding: '1px 6px',
                              fontWeight: 700,
                              backgroundColor: trade.optionType === 'CE' ? 'rgba(10, 132, 255, 0.16)' : 'rgba(191, 90, 242, 0.16)',
                              color: trade.optionType === 'CE' ? '#60a5fa' : '#c084fc',
                              border: `1px solid ${trade.optionType === 'CE' ? 'rgba(10, 132, 255, 0.38)' : 'rgba(191, 90, 242, 0.38)'}`,
                              boxShadow: `0 0 8px ${trade.optionType === 'CE' ? 'rgba(10, 132, 255, 0.22)' : 'rgba(191, 90, 242, 0.22)'}`
                            }}
                          >
                            {trade.optionType}
                          </span>
                        )}
                        {trade.isExpiryDay && (
                          <span 
                            className="badge" 
                            style={{ 
                              fontSize: '0.58rem', 
                              padding: '1px 5px',
                              backgroundColor: 'rgba(139, 92, 246, 0.15)',
                              color: 'var(--color-neutral)',
                              border: '1px solid rgba(139, 92, 246, 0.3)'
                            }}
                            title="Nifty Weekly Expiry Day"
                          >
                            EXPIRY
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
                        <span>{trade.strategy || 'No Setup'}</span>
                        {trade.setupType && trade.setupType !== 'None' && (
                          <span className="badge badge-neutral" style={{ fontSize: '0.6rem', padding: '1px 5px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)' }}>
                            {trade.setupType}
                          </span>
                        )}
                        {trade.tags && trade.tags.map((t: string) => (
                          <span 
                            key={t} 
                            style={{ 
                              fontSize: '0.6rem', 
                              padding: '1px 4px', 
                              background: 'rgba(10, 132, 255, 0.08)', 
                              border: '1px solid rgba(10, 132, 255, 0.18)', 
                              color: '#38bdf8',
                              borderRadius: '4px'
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <BrokerBadge broker={trade.broker} />
                    </td>
                    <td>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{trade.segment}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{trade.product}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span 
                        className="badge" 
                        style={{ 
                          padding: '2px 8px', 
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: trade.action === 'BUY' ? 'rgba(48, 209, 88, 0.14)' : 'rgba(245, 158, 11, 0.14)',
                          color: trade.action === 'BUY' ? '#34d399' : '#fbbf24',
                          border: `1px solid ${trade.action === 'BUY' ? 'rgba(48, 209, 88, 0.38)' : 'rgba(245, 158, 11, 0.38)'}`,
                          boxShadow: `0 0 8px ${trade.action === 'BUY' ? 'rgba(48, 209, 88, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                        }}
                      >
                        {trade.action}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 600 }}>{trade.qty}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{trade.entryPrice.toFixed(2)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>{trade.exitPrice.toFixed(2)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                      <div style={{ 
                        fontWeight: 700, 
                        color: isProfit ? 'var(--color-win)' : 'var(--color-loss)',
                        fontSize: '0.92rem'
                      }}>
                        {isProfit ? '+' : ''}{isPnlVisible ? formatCurrency(trade.netPnL) : '••••'}
                      </div>
                      <div 
                        style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '2px', whiteSpace: 'nowrap' }}
                        title={isPnlVisible ? `Brokerage: ${formatCurrency(trade.brokerage)} | Taxes & Charges: ${formatCurrency(trade.taxes)}` : undefined}
                      >
                        {isPnlVisible ? `Brk: ₹${Math.round(trade.brokerage || 0)} • Chgs: ₹${Math.round(trade.taxes || 0)}` : '••••'}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ 
                          fontSize: '0.72rem', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          color: trade.emotion === 'Calm' ? '#34d399' : (trade.emotion === 'Fearful' ? '#f87171' : 'var(--text-main)'),
                          fontWeight: 600
                        }}>
                          {trade.emotion === 'Calm' && '🧘'}
                          {trade.emotion === 'Fearful' && '⚡'}
                          {trade.emotion === 'Greedy' && '🤑'}
                          {trade.emotion === 'Revengeful' && '🔥'}
                          {trade.emotion === 'Impatient' && '⏳'}
                          <span>{trade.emotion || 'Neutral'}</span>
                        </span>
                        {getTradeMistakes(trade).length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {getTradeMistakes(trade).map((m) => (
                              <span 
                                key={m}
                                style={{ 
                                  fontSize: '0.65rem', 
                                  color: 'var(--color-loss)', 
                                  background: 'rgba(255, 69, 58, 0.1)',
                                  border: '1px solid rgba(255, 69, 58, 0.25)',
                                  padding: '1px 5px', 
                                  borderRadius: '4px',
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '3px' 
                                }}
                              >
                                <ShieldAlert size={9} />
                                {m}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span 
                            style={{ 
                              fontSize: '0.68rem', 
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
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginTop: '16px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Showing {sortedTrades.length === 0 ? 0 : indexOfFirstItem + 1}–{Math.min(indexOfLastItem, sortedTrades.length)} of {sortedTrades.length} trades
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Per page:</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="form-select"
              style={{ height: '28px', fontSize: '0.72rem', padding: '2px 6px', width: 'auto', background: 'rgba(255,255,255,0.04)' }}
            >
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <button 
              className="btn btn-secondary" 
              style={{ padding: '4px 8px', fontSize: '0.75rem', height: '28px' }} 
              disabled={currentPage === 1}
              onClick={() => paginate(currentPage - 1)}
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>
            
            {getPageNumbers(currentPage, totalPages).map((p, idx) => {
              if (p === '...') {
                return (
                  <span key={`el-${idx}`} style={{ padding: '0 4px', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                    •••
                  </span>
                );
              }
              const pageNum = Number(p);
              return (
                <button
                  key={pageNum}
                  className="btn"
                  style={{
                    padding: '2px 8px',
                    minWidth: '28px',
                    height: '28px',
                    fontSize: '0.75rem',
                    fontWeight: currentPage === pageNum ? 700 : 500,
                    background: currentPage === pageNum ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                    color: currentPage === pageNum ? '#fff' : 'var(--text-main)',
                    border: `1px solid ${currentPage === pageNum ? 'var(--primary)' : 'var(--border-color)'}`,
                    borderRadius: '6px'
                  }}
                  onClick={() => paginate(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}

            <button 
              className="btn btn-secondary" 
              style={{ padding: '4px 8px', fontSize: '0.75rem', height: '28px' }} 
              disabled={currentPage === totalPages}
              onClick={() => paginate(currentPage + 1)}
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
