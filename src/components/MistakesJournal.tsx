import { useState, useMemo } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { getTradeMistakes } from '../types';
import { filterTradesByFY, formatTimeToAMPM } from '../utils/fyHelper';
import { groupHedgedTrades } from '../utils/tradeGrouping';
import type { GroupedTradePosition } from '../utils/tradeGrouping';
import { BrokerBadge } from './BrokerBadge';
import { 
  AlertTriangle, BookOpen, Calendar, Clock, Filter, Search, 
  Tag, CheckCircle2, ChevronDown, ChevronRight, Eye, EyeOff, 
  ExternalLink, Sparkles, TrendingUp, TrendingDown, ArrowUpDown, 
  MessageSquare, ShieldCheck, Flame, X, Printer, ShieldAlert
} from 'lucide-react';

interface MistakesJournalProps {
  activeAccountId?: string;
  onEditTrade?: (id: string) => void;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
};

export function MistakesJournal({ activeAccountId = 'Combined', onEditTrade }: MistakesJournalProps) {
  const { 
    trades: allTrades, 
    selectedFY, 
    isPnlVisible, 
    togglePnlVisibility,
    brokerAccounts 
  } = useTradeStore();

  // Filter scoped to account
  const isMatchAccount = (brokerAccId?: string) => {
    if (activeAccountId === 'Combined' || !activeAccountId) return true;
    if (!brokerAccId) return false;
    return activeAccountId === brokerAccId || activeAccountId.split(',').includes(brokerAccId);
  };

  const fyTrades = useMemo(() => filterTradesByFY(allTrades, selectedFY), [allTrades, selectedFY]);
  const accountTrades = useMemo(() => {
    return activeAccountId === 'Combined'
      ? fyTrades
      : fyTrades.filter(t => isMatchAccount(t.brokerAccountId));
  }, [fyTrades, activeAccountId]);

  // Group hedged spread legs into unified positions to avoid duplicate cards and notes
  const accountPositions = useMemo(() => {
    return groupHedgedTrades(accountTrades);
  }, [accountTrades]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMistakeType, setSelectedMistakeType] = useState<string>('All');
  const [selectedEmotion, setSelectedEmotion] = useState<string>('All');
  const [typeFilter, setTypeFilter] = useState<'all' | 'mistakes' | 'notes' | 'losses'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');

  // Filter positions to only those that have either a mistake OR a note
  const notedPositions = useMemo(() => {
    return accountPositions.filter(p => {
      const hasNote = Boolean(p.notes && p.notes.trim().length > 0);
      const hasMistake = p.mistakes.length > 0;
      return hasNote || hasMistake;
    });
  }, [accountPositions]);

  // Extract all unique mistake types that appeared in the dataset
  const availableMistakes = useMemo(() => {
    const set = new Set<string>();
    notedPositions.forEach(p => {
      p.mistakes.forEach(m => set.add(m));
    });
    return Array.from(set).sort();
  }, [notedPositions]);

  // Extract all unique months available in the dataset
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    notedPositions.forEach(p => {
      const dateStr = p.date;
      if (dateStr && dateStr.length >= 7) {
        set.add(dateStr.substring(0, 7)); // YYYY-MM
      }
    });
    return Array.from(set).sort().reverse();
  }, [notedPositions]);

  // Overall Cognitive & Mistakes Metrics
  const stats = useMemo(() => {
    let totalMistakePositions = 0;
    let totalMistakeLoss = 0;
    let totalNotesCount = 0;
    const mistakeFrequencies: Record<string, { count: number; loss: number }> = {};

    notedPositions.forEach(p => {
      if (p.notes && p.notes.trim().length > 0) totalNotesCount++;
      if (p.mistakes.length > 0) {
        totalMistakePositions++;
        if (p.combinedNetPnL < 0) totalMistakeLoss += Math.abs(p.combinedNetPnL);
        p.mistakes.forEach(m => {
          if (!mistakeFrequencies[m]) mistakeFrequencies[m] = { count: 0, loss: 0 };
          mistakeFrequencies[m].count++;
          if (p.combinedNetPnL < 0) mistakeFrequencies[m].loss += Math.abs(p.combinedNetPnL);
        });
      }
    });

    const topMistake = Object.entries(mistakeFrequencies).sort((a, b) => b[1].count - a[1].count)[0];
    const uniqueDays = new Set(notedPositions.map(p => p.date)).size;

    return {
      uniqueDays,
      totalNotesCount,
      totalMistakePositions,
      totalMistakeLoss,
      topMistake: topMistake ? { name: topMistake[0], count: topMistake[1].count, loss: topMistake[1].loss } : null
    };
  }, [notedPositions]);

  // Filtered list of positions based on UI controls
  const filteredPositions = useMemo(() => {
    return notedPositions.filter(p => {
      const hasMistake = p.mistakes.length > 0;
      const hasNote = Boolean(p.notes && p.notes.trim().length > 0);
      const dateStr = p.date;

      // Filter by type pill
      if (typeFilter === 'mistakes' && !hasMistake) return false;
      if (typeFilter === 'notes' && !hasNote) return false;
      if (typeFilter === 'losses' && p.combinedNetPnL >= 0) return false;

      // Filter by month
      if (selectedMonth !== 'All' && !dateStr.startsWith(selectedMonth)) return false;

      // Filter by specific mistake type
      if (selectedMistakeType !== 'All' && !p.mistakes.includes(selectedMistakeType)) return false;

      // Filter by emotion
      if (selectedEmotion !== 'All' && p.emotion !== selectedEmotion) return false;

      // Search query (symbol, note content, strategy)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inSymbol1 = p.leg1.symbol.toLowerCase().includes(q);
        const inSymbol2 = p.leg2 ? p.leg2.symbol.toLowerCase().includes(q) : false;
        const inNote = p.notes ? p.notes.toLowerCase().includes(q) : false;
        const inStrategy = p.strategy ? p.strategy.toLowerCase().includes(q) : false;
        const inMistake = p.mistakes.some(m => m.toLowerCase().includes(q));
        if (!inSymbol1 && !inSymbol2 && !inNote && !inStrategy && !inMistake) return false;
      }

      return true;
    });
  }, [notedPositions, typeFilter, selectedMonth, selectedMistakeType, selectedEmotion, searchQuery]);

  // Group filtered positions by Date
  const dayGroups = useMemo(() => {
    const map: Record<string, GroupedTradePosition[]> = {};

    filteredPositions.forEach(p => {
      const d = p.date;
      if (!map[d]) map[d] = [];
      map[d].push(p);
    });

    const entries = Object.entries(map).map(([date, positions]) => {
      // Sort positions within the day by time
      const sortedPositions = [...positions].sort((a, b) => {
        const timeA = a.entryTime || '00:00';
        const timeB = b.entryTime || '00:00';
        return timeA.localeCompare(timeB);
      });

      const dayNetPnL = sortedPositions.reduce((sum, p) => sum + p.combinedNetPnL, 0);
      const dayMistakesCount = sortedPositions.filter(p => p.mistakes.length > 0).length;
      const dayNotesCount = sortedPositions.filter(p => p.notes && p.notes.trim().length > 0).length;

      return {
        date,
        positions: sortedPositions,
        dayNetPnL,
        dayMistakesCount,
        dayNotesCount
      };
    });

    // Sort dates
    return entries.sort((a, b) => {
      return sortOrder === 'desc' 
        ? b.date.localeCompare(a.date) 
        : a.date.localeCompare(b.date);
    });
  }, [filteredPositions, sortOrder]);

  const formatDateDisplay = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const getRelativeDayLabel = (dateStr: string) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (dateStr === todayStr) return 'आज (Today)';

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (dateStr === yesterdayStr) return 'काल (Yesterday)';

    return null;
  };

  return (
    <div className="glass-card animate-tab-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. Header Bar with Title, Subtitle, and Eyeball Visibility */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            width: '46px', 
            height: '46px', 
            borderRadius: '14px', 
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(245, 158, 11, 0.25) 100%)', 
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.45rem',
            border: '1.5px solid rgba(239, 68, 68, 0.35)',
            boxShadow: '0 4px 16px rgba(239, 68, 68, 0.15)'
          }}>
            ⚠️
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 850, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                Mistakes & Trade Notes Journal
              </h2>
              <span style={{ 
                fontSize: '0.7rem', 
                fontWeight: 750, 
                padding: '2px 8px', 
                borderRadius: '9999px', 
                background: 'rgba(239, 68, 68, 0.15)', 
                color: '#f87171', 
                border: '1px solid rgba(239, 68, 68, 0.3)' 
              }}>
                दैनंदिन चुका व नोट्स
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              दिवसनिहाय तुमच्या सर्व ट्रेड नोट्स, चुका व भावनांचे स्वतंत्र विश्लेषण — चुका सुधारा आणि शिस्त वाढवा.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={togglePnlVisibility}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            title={isPnlVisible ? "Hide P&L Numbers" : "Show P&L Numbers"}
          >
            {isPnlVisible ? <EyeOff size={15} /> : <Eye size={15} color="var(--primary)" />}
            <span>{isPnlVisible ? 'Hide P&L' : 'Show P&L'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Print or Export Journal to PDF"
          >
            <Printer size={15} />
            <span className="hide-mobile">Print / PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Analytical KPI Leak & Mistake Pattern Bar */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '12px' 
        }}
      >
        {/* Card 1: Total Days */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '12px 16px', 
            borderRadius: '14px', 
            border: '1px solid var(--border-color)', 
            background: 'var(--bg-card)' 
          }}
        >
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            नोंद असलेले दिवस (Days Traded)
          </span>
          <div style={{ fontSize: '1.45rem', fontWeight: 850, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '2px' }}>
            {stats.uniqueDays} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)' }}>Days</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
            {stats.totalNotesCount} trade notes logged
          </span>
        </div>

        {/* Card 2: Tagged Mistakes */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '12px 16px', 
            borderRadius: '14px', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            background: 'rgba(239, 68, 68, 0.04)' 
          }}
        >
          <span style={{ fontSize: '0.68rem', color: '#f87171', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            एकूण नोंदवलेल्या चुका (Mistakes)
          </span>
          <div style={{ fontSize: '1.45rem', fontWeight: 850, fontFamily: 'var(--font-mono)', color: '#f87171', marginTop: '2px' }}>
            {stats.totalMistakePositions} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fca5a5' }}>Decisions</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#f87171', opacity: 0.9, marginTop: '2px', display: 'block' }}>
            {((stats.totalMistakePositions / (accountPositions.length || 1)) * 100).toFixed(1)}% of trade decisions
          </span>
        </div>

        {/* Card 3: Mistake Financial Penalty Cost */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '12px 16px', 
            borderRadius: '14px', 
            border: '1px solid rgba(239, 68, 68, 0.35)', 
            background: 'rgba(239, 68, 68, 0.07)' 
          }}
        >
          <span style={{ fontSize: '0.68rem', color: '#f87171', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            चुकांमुळे झालेला तोटा (Mistake Cost)
          </span>
          <div style={{ fontSize: '1.45rem', fontWeight: 850, fontFamily: 'var(--font-mono)', color: '#ef4444', marginTop: '2px' }}>
            {isPnlVisible ? `-₹${Math.round(stats.totalMistakeLoss).toLocaleString('en-IN')}` : '••••••'}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#fca5a5', marginTop: '2px', display: 'block' }}>
            या चुका टाळल्यास भांडवल वाचले असते
          </span>
        </div>

        {/* Card 4: Most Common Mistake */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '12px 16px', 
            borderRadius: '14px', 
            border: '1px solid rgba(245, 158, 11, 0.3)', 
            background: 'rgba(245, 158, 11, 0.04)' 
          }}
        >
          <span style={{ fontSize: '0.68rem', color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            सर्वात मोठी चूक (Top Repeat Error)
          </span>
          <div style={{ fontSize: '1.1rem', fontWeight: 850, color: '#fbbf24', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {stats.topMistake ? stats.topMistake.name : 'None (No Mistakes)'}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px', display: 'block' }}>
            {stats.topMistake ? `${stats.topMistake.count} times repeated` : 'Clean execution discipline'}
          </span>
        </div>
      </div>

      {/* 3. Search and Multi-Criteria Filtering Controls */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '16px', 
          borderRadius: '16px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          background: 'rgba(255, 255, 255, 0.015)' 
        }}
      >
        {/* Top Row: Search Input + Selects */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          
          {/* Keyword Search */}
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search 
              size={15} 
              color="var(--text-dim)" 
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in trade notes, symbol, setup..."
              className="input-field"
              style={{ 
                paddingLeft: '34px', 
                paddingRight: '12px', 
                paddingTop: '6px', 
                paddingBottom: '6px', 
                fontSize: '0.8rem', 
                borderRadius: '9999px',
                width: '100%',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)'
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Month Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>महिना:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="form-select"
              style={{ padding: '5px 10px', fontSize: '0.78rem', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', outline: 'none', cursor: 'pointer' }}
            >
              <option value="All">All Months ({selectedFY})</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Mistake Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>चूक (Mistake):</span>
            <select
              value={selectedMistakeType}
              onChange={(e) => setSelectedMistakeType(e.target.value)}
              className="form-select"
              style={{ padding: '5px 10px', fontSize: '0.78rem', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', outline: 'none', cursor: 'pointer' }}
            >
              <option value="All">All Mistakes ({availableMistakes.length})</option>
              {availableMistakes.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Emotion Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>भावना:</span>
            <select
              value={selectedEmotion}
              onChange={(e) => setSelectedEmotion(e.target.value)}
              className="form-select"
              style={{ padding: '5px 10px', fontSize: '0.78rem', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', outline: 'none', cursor: 'pointer' }}
            >
              <option value="All">All Emotions</option>
              <option value="Calm">Calm (शांत)</option>
              <option value="Fearful">Fearful (भीती)</option>
              <option value="Impatient">Impatient (अधीर)</option>
              <option value="Greedy">Greedy (लोभी)</option>
              <option value="Revengeful">Revengeful (सूड भावना)</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="btn btn-secondary"
            style={{ padding: '5px 12px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            title={sortOrder === 'desc' ? "Showing Newest Dates First" : "Showing Oldest Dates First"}
          >
            <ArrowUpDown size={14} />
            <span>{sortOrder === 'desc' ? 'नवीन दिवस आधी (Newest)' : 'जुने दिवस आधी (Oldest)'}</span>
          </button>
        </div>

        {/* Quick Filter Pill Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setTypeFilter('all')}
              className="btn"
              style={{
                padding: '4px 14px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '9999px',
                background: typeFilter === 'all' ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
                color: typeFilter === 'all' ? '#fff' : 'var(--text-muted)',
                border: '1px solid ' + (typeFilter === 'all' ? 'var(--primary)' : 'var(--border-color)')
              }}
            >
              सर्व दिवस (All Noted Days — {dayGroups.length})
            </button>

            <button
              onClick={() => setTypeFilter('mistakes')}
              className="btn"
              style={{
                padding: '4px 14px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '9999px',
                background: typeFilter === 'mistakes' ? '#ef4444' : 'rgba(255,255,255,0.04)',
                color: typeFilter === 'mistakes' ? '#fff' : 'var(--text-muted)',
                border: '1px solid ' + (typeFilter === 'mistakes' ? '#ef4444' : 'var(--border-color)')
              }}
            >
              ⚠️ फक्त चुका झालेले दिवस (Only Mistakes)
            </button>

            <button
              onClick={() => setTypeFilter('notes')}
              className="btn"
              style={{
                padding: '4px 14px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '9999px',
                background: typeFilter === 'notes' ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
                color: typeFilter === 'notes' ? '#fff' : 'var(--text-muted)',
                border: '1px solid ' + (typeFilter === 'notes' ? 'var(--primary)' : 'var(--border-color)')
              }}
            >
              📝 फक्त नोट्स असलेले दिवस (Only Notes)
            </button>

            <button
              onClick={() => setTypeFilter('losses')}
              className="btn"
              style={{
                padding: '4px 14px',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '9999px',
                background: typeFilter === 'losses' ? '#f87171' : 'rgba(255,255,255,0.04)',
                color: typeFilter === 'losses' ? '#fff' : 'var(--text-muted)',
                border: '1px solid ' + (typeFilter === 'losses' ? '#f87171' : 'var(--border-color)')
              }}
            >
              🔴 तोटा झालेले दिवस (Loss Days)
            </button>
          </div>

          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Showing {dayGroups.length} days ({filteredPositions.length} trade decisions)
          </span>
        </div>
      </div>

      {/* 4. Day-wise Feed Stream (The Core User Feature) */}
      {dayGroups.length === 0 ? (
        <div 
          style={{ 
            textAlign: 'center', 
            padding: '60px 20px', 
            background: 'rgba(255,255,255,0.015)', 
            borderRadius: '18px', 
            border: '1px dashed var(--border-color)',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <div style={{ fontSize: '2.5rem' }}>🎯</div>
          <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
            या फिल्टरमध्ये कोणतीही नोंद किंवा चूक आढळली नाही.
          </strong>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '480px', margin: 0 }}>
            ट्रेड लॉग (Trade Log) करताना तुमच्या ट्रेड्सचे कारण आणि विचार 'Notes' मध्ये लिहा आणि चुका 'Mistakes' मध्ये टॅग करा. ते सर्व या टॅबमध्ये दिवसनिहाय सुरक्षितपणे दिसतील.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {dayGroups.map((group) => {
            const relativeLabel = getRelativeDayLabel(group.date);
            const isProfit = group.dayNetPnL >= 0;
            const hasMistakesOnDay = group.dayMistakesCount > 0;

            return (
              <div 
                key={group.date}
                className="glass-card"
                style={{
                  padding: 0,
                  borderRadius: '18px',
                  overflow: 'hidden',
                  border: hasMistakesOnDay 
                    ? '1.5px solid rgba(239, 68, 68, 0.35)' 
                    : '1px solid var(--border-color)',
                  background: 'var(--bg-card)'
                }}
              >
                {/* Day Header Bar */}
                <div 
                  style={{
                    padding: '12px 18px',
                    background: hasMistakesOnDay 
                      ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.12) 0%, rgba(0, 0, 0, 0.3) 100%)' 
                      : 'linear-gradient(90deg, rgba(10, 132, 255, 0.08) 0%, rgba(0, 0, 0, 0.25) 100%)',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      color: 'var(--text-main)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Calendar size={15} color="var(--primary)" />
                      <span>{formatDateDisplay(group.date)}</span>
                    </div>

                    {relativeLabel && (
                      <span style={{ 
                        fontSize: '0.68rem', 
                        fontWeight: 750, 
                        padding: '2px 8px', 
                        borderRadius: '6px', 
                        background: 'rgba(10, 132, 255, 0.2)', 
                        color: 'var(--primary)',
                        border: '1px solid rgba(10, 132, 255, 0.35)'
                      }}>
                        {relativeLabel}
                      </span>
                    )}

                    {/* Day Badges */}
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                      {group.positions.length} {group.positions.length === 1 ? 'Trade Position' : 'Trade Positions'}
                    </span>

                    {hasMistakesOnDay ? (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 750, 
                        padding: '2px 8px', 
                        borderRadius: '9999px',
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.35)'
                      }}>
                        ⚠️ {group.dayMistakesCount} {group.dayMistakesCount === 1 ? 'Mistake' : 'Mistakes'}
                      </span>
                    ) : (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 750, 
                        padding: '2px 8px', 
                        borderRadius: '9999px',
                        background: 'rgba(48, 209, 88, 0.15)',
                        color: '#4ade80',
                        border: '1px solid rgba(48, 209, 88, 0.3)'
                      }}>
                        🛡️ Clean Discipline (0 Mistakes)
                      </span>
                    )}
                  </div>

                  {/* Day Realized P&L Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Day P&L:</span>
                    <span 
                      style={{ 
                        fontSize: '0.92rem', 
                        fontWeight: 850, 
                        fontFamily: 'var(--font-mono)',
                        color: isProfit ? 'var(--color-win)' : 'var(--color-loss)',
                        background: isProfit ? 'var(--color-win-bg)' : 'var(--color-loss-bg)',
                        border: '1px solid ' + (isProfit ? 'var(--color-win-border)' : 'var(--color-loss-border)'),
                        padding: '3px 10px',
                        borderRadius: '8px'
                      }}
                    >
                      {isPnlVisible ? `${isProfit ? '+' : ''}${formatCurrency(group.dayNetPnL)}` : '••••••'}
                    </span>
                  </div>
                </div>

                {/* Day Positions Stream */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {group.positions.map((pos) => {
                    const isSpread = pos.isHedgedSpread && Boolean(pos.leg2);
                    const isPosWin = pos.combinedNetPnL >= 0;
                    const hasMistake = pos.mistakes.length > 0;
                    const hasNote = Boolean(pos.notes && pos.notes.trim().length > 0);

                    // ==========================================
                    // 1. UNIFIED HEDGED SPREAD CARD (NO DUPLICATES)
                    // ==========================================
                    if (isSpread && pos.leg2) {
                      const leg1 = pos.leg1;
                      const leg2 = pos.leg2;

                      return (
                        <div 
                          key={pos.id}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '14px',
                            border: hasMistake 
                              ? '1.5px solid rgba(239, 68, 68, 0.35)' 
                              : '1.5px solid rgba(10, 132, 255, 0.35)',
                            background: hasMistake ? 'rgba(239, 68, 68, 0.02)' : 'rgba(10, 132, 255, 0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {/* Top Row: Hedged Badge, Leg 1, Leg 2, Time, Broker, Net Spread P&L */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span 
                                style={{ 
                                  fontSize: '0.72rem', 
                                  fontWeight: 800, 
                                  padding: '2px 8px', 
                                  borderRadius: '6px',
                                  background: 'rgba(10, 132, 255, 0.18)',
                                  color: '#60a5fa',
                                  border: '1px solid rgba(10, 132, 255, 0.35)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                🛡️ Hedged Spread (2 Legs)
                              </span>

                              {/* Leg 1 Pill */}
                              <span style={{ 
                                fontSize: '0.78rem', 
                                fontWeight: 750, 
                                color: 'var(--text-main)', 
                                background: 'rgba(255,255,255,0.05)', 
                                padding: '3px 8px', 
                                borderRadius: '6px', 
                                border: '1px solid var(--border-color)', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '5px' 
                              }}>
                                <span style={{ color: leg1.action === 'BUY' ? '#60a5fa' : '#c084fc', fontWeight: 800, fontSize: '0.7rem' }}>
                                  {leg1.action}
                                </span>
                                <span>{leg1.symbol}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: leg1.netPnL >= 0 ? '#4ade80' : '#f87171' }}>
                                  ({leg1.netPnL >= 0 ? '+' : ''}{formatCurrency(leg1.netPnL)})
                                </span>
                              </span>

                              {/* Leg 2 Pill */}
                              <span style={{ 
                                fontSize: '0.78rem', 
                                fontWeight: 750, 
                                color: 'var(--text-main)', 
                                background: 'rgba(255,255,255,0.05)', 
                                padding: '3px 8px', 
                                borderRadius: '6px', 
                                border: '1px solid var(--border-color)', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '5px' 
                              }}>
                                <span style={{ color: leg2.action === 'BUY' ? '#60a5fa' : '#c084fc', fontWeight: 800, fontSize: '0.7rem' }}>
                                  {leg2.action}
                                </span>
                                <span>{leg2.symbol}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: leg2.netPnL >= 0 ? '#4ade80' : '#f87171' }}>
                                  ({leg2.netPnL >= 0 ? '+' : ''}{formatCurrency(leg2.netPnL)})
                                </span>
                              </span>

                              {pos.entryTime && (
                                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <Clock size={12} />
                                  <span>{formatTimeToAMPM(pos.entryTime)}</span>
                                </span>
                              )}

                              {pos.broker && <BrokerBadge broker={pos.broker} />}
                            </div>

                            {/* Spread Combined Net P&L & Edit Button */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span 
                                style={{ 
                                  fontSize: '0.88rem', 
                                  fontWeight: 850, 
                                  fontFamily: 'var(--font-mono)',
                                  color: isPosWin ? 'var(--color-win)' : 'var(--color-loss)',
                                  background: isPosWin ? 'var(--color-win-bg)' : 'var(--color-loss-bg)',
                                  border: '1px solid ' + (isPosWin ? 'var(--color-win-border)' : 'var(--color-loss-border)'),
                                  padding: '3px 9px',
                                  borderRadius: '6px'
                                }}
                              >
                                {isPnlVisible ? `Spread Net: ${isPosWin ? '+' : ''}${formatCurrency(pos.combinedNetPnL)}` : '••••••'}
                              </span>

                              {onEditTrade && (
                                <button
                                  onClick={() => onEditTrade(leg1.id)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--primary)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 650
                                  }}
                                  title="Open spread in TradeLogger"
                                >
                                  <span>Edit</span>
                                  <ExternalLink size={13} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Deduplicated Mistakes & Emotion Tags */}
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            {hasMistake ? (
                              pos.mistakes.map(m => (
                                <span 
                                  key={m}
                                  style={{ 
                                    fontSize: '0.72rem', 
                                    fontWeight: 750, 
                                    padding: '2px 8px', 
                                    borderRadius: '9999px',
                                    background: 'rgba(239, 68, 68, 0.18)',
                                    color: '#fca5a5',
                                    border: '1px solid rgba(239, 68, 68, 0.4)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <span>⚠️ चूक:</span> {m}
                                </span>
                              ))
                            ) : (
                              <span 
                                style={{ 
                                  fontSize: '0.68rem', 
                                  fontWeight: 650, 
                                  padding: '2px 7px', 
                                  borderRadius: '9999px',
                                  background: 'rgba(48, 209, 88, 0.12)',
                                  color: '#4ade80',
                                  border: '1px solid rgba(48, 209, 88, 0.25)'
                                }}
                              >
                                ✓ चूक नाही (Clean Setup)
                              </span>
                            )}

                            {pos.emotion && (
                              <span 
                                style={{ 
                                  fontSize: '0.68rem', 
                                  fontWeight: 650, 
                                  padding: '2px 7px', 
                                  borderRadius: '9999px',
                                  background: 'rgba(191, 90, 242, 0.12)',
                                  color: '#d8b4fe',
                                  border: '1px solid rgba(191, 90, 242, 0.25)'
                                }}
                              >
                                भावना: {pos.emotion}
                              </span>
                            )}

                            {pos.strategy && (
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', padding: '2px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                                Strategy: {pos.strategy}
                              </span>
                            )}
                          </div>

                          {/* Unified Trade Notes Quote Box (Rendered EXACTLY ONCE) */}
                          <div 
                            style={{ 
                              padding: '12px 14px', 
                              borderRadius: '10px', 
                              background: hasNote ? 'rgba(0, 0, 0, 0.35)' : 'rgba(255, 255, 255, 0.015)',
                              borderLeft: hasNote ? '3.5px solid ' + (hasMistake ? '#f87171' : 'var(--primary)') : '3px solid var(--border-color)',
                              fontSize: '0.82rem',
                              color: hasNote ? 'var(--text-main)' : 'var(--text-dim)',
                              lineHeight: 1.55
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: hasNote ? '4px' : '0' }}>
                              <span style={{ fontSize: '0.74rem', fontWeight: 750, color: hasNote ? (hasMistake ? '#fca5a5' : 'var(--primary)') : 'var(--text-dim)' }}>
                                📝 तुमची स्प्रेड ट्रेड नोंद (Trade Note):
                              </span>
                            </div>
                            {hasNote ? (
                              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{pos.notes}</p>
                            ) : (
                              <span style={{ fontStyle: 'italic', fontSize: '0.76rem' }}>
                                या स्प्रेडसाठी कोणतीही नोंद लिहिलेली नाही (No note written).
                              </span>
                            )}
                          </div>

                          {/* Rules Followed / Broken */}
                          {pos.rulesFollowed && pos.rulesFollowed.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                              <span style={{ fontWeight: 650 }}>नियम पाळले:</span>
                              {pos.rulesFollowed.map(r => (
                                <span key={r} style={{ padding: '1px 6px', borderRadius: '4px', background: 'rgba(48, 209, 88, 0.08)', color: '#86efac', border: '1px solid rgba(48, 209, 88, 0.2)' }}>
                                  ✓ {r}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }

                    // ==========================================
                    // 2. NORMAL SINGLE TRADE CARD
                    // ==========================================
                    const trade = pos.leg1;
                    return (
                      <div 
                        key={trade.id}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '14px',
                          border: hasMistake 
                            ? '1.5px solid rgba(239, 68, 68, 0.3)' 
                            : '1px solid var(--border-color)',
                          background: hasMistake ? 'rgba(239, 68, 68, 0.02)' : 'rgba(255, 255, 255, 0.015)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {/* Trade Top Bar: Action, Symbol, Time, Broker, P&L */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span 
                              style={{ 
                                fontSize: '0.72rem', 
                                fontWeight: 800, 
                                padding: '2px 7px', 
                                borderRadius: '5px',
                                background: trade.action === 'BUY' ? 'rgba(10, 132, 255, 0.2)' : 'rgba(191, 90, 242, 0.2)',
                                color: trade.action === 'BUY' ? '#60a5fa' : '#c084fc',
                                border: '1px solid ' + (trade.action === 'BUY' ? 'rgba(10, 132, 255, 0.35)' : 'rgba(191, 90, 242, 0.35)')
                              }}
                            >
                              {trade.action}
                            </span>

                            <strong style={{ fontSize: '0.94rem', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                              {trade.symbol}
                            </strong>

                            {trade.entryTime && (
                              <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Clock size={12} />
                                <span>{formatTimeToAMPM(trade.entryTime)}</span>
                              </span>
                            )}

                            {trade.segment && (
                              <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-dim)' }}>
                                {trade.segment}
                              </span>
                            )}

                            {trade.broker && <BrokerBadge broker={trade.broker} />}
                          </div>

                          {/* P&L & Edit Shortcut */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span 
                              style={{ 
                                fontSize: '0.88rem', 
                                fontWeight: 850, 
                                fontFamily: 'var(--font-mono)',
                                color: isPosWin ? 'var(--color-win)' : 'var(--color-loss)',
                                background: isPosWin ? 'var(--color-win-bg)' : 'var(--color-loss-bg)',
                                border: '1px solid ' + (isPosWin ? 'var(--color-win-border)' : 'var(--color-loss-border)'),
                                padding: '3px 9px',
                                borderRadius: '6px'
                              }}
                            >
                              {isPnlVisible ? `${isPosWin ? '+' : ''}${formatCurrency(trade.netPnL)}` : '••••••'}
                            </span>

                            {onEditTrade && (
                              <button
                                onClick={() => onEditTrade(trade.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--primary)',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 650
                                }}
                                title="Open trade in TradeLogger"
                              >
                                <span>Edit</span>
                                <ExternalLink size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Mistakes & Emotion Tags */}
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          {hasMistake ? (
                            pos.mistakes.map(m => (
                              <span 
                                key={m}
                                style={{ 
                                  fontSize: '0.72rem', 
                                  fontWeight: 750, 
                                  padding: '2px 8px', 
                                  borderRadius: '9999px',
                                  background: 'rgba(239, 68, 68, 0.18)',
                                  color: '#fca5a5',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <span>⚠️ चूक:</span> {m}
                              </span>
                            ))
                          ) : (
                            <span 
                              style={{ 
                                fontSize: '0.68rem', 
                                fontWeight: 650, 
                                padding: '2px 7px', 
                                borderRadius: '9999px',
                                background: 'rgba(48, 209, 88, 0.12)',
                                color: '#4ade80',
                                border: '1px solid rgba(48, 209, 88, 0.25)'
                              }}
                            >
                              ✓ चूक नाही (Clean Setup)
                            </span>
                          )}

                          {trade.emotion && (
                            <span 
                              style={{ 
                                fontSize: '0.68rem', 
                                fontWeight: 650, 
                                padding: '2px 7px', 
                                borderRadius: '9999px',
                                background: 'rgba(191, 90, 242, 0.12)',
                                color: '#d8b4fe',
                                border: '1px solid rgba(191, 90, 242, 0.25)'
                              }}
                            >
                              भावना: {trade.emotion}
                            </span>
                          )}

                          {trade.strategy && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', padding: '2px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                              Strategy: {trade.strategy}
                            </span>
                          )}
                        </div>

                        {/* Trade Notes Quote Box (Highlighted in Full Detail) */}
                        <div 
                          style={{ 
                            padding: '12px 14px', 
                            borderRadius: '10px', 
                            background: hasNote ? 'rgba(0, 0, 0, 0.35)' : 'rgba(255, 255, 255, 0.015)',
                            borderLeft: hasNote ? '3.5px solid ' + (hasMistake ? '#f87171' : 'var(--primary)') : '3px solid var(--border-color)',
                            fontSize: '0.82rem',
                            color: hasNote ? 'var(--text-main)' : 'var(--text-dim)',
                            lineHeight: 1.55
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: hasNote ? '4px' : '0' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: 750, color: hasNote ? (hasMistake ? '#fca5a5' : 'var(--primary)') : 'var(--text-dim)' }}>
                              📝 तुमची ट्रेड नोंद (Trade Note):
                            </span>
                          </div>
                          {hasNote ? (
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{pos.notes}</p>
                          ) : (
                            <span style={{ fontStyle: 'italic', fontSize: '0.76rem' }}>
                              या ट्रेडसाठी कोणतीही नोंद लिहिलेली नाही (No note written).
                            </span>
                          )}
                        </div>

                        {/* Rules Followed / Broken */}
                        {trade.rulesFollowed && trade.rulesFollowed.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                            <span style={{ fontWeight: 650 }}>नियम पाळले:</span>
                            {trade.rulesFollowed.map(r => (
                              <span key={r} style={{ padding: '1px 6px', borderRadius: '4px', background: 'rgba(48, 209, 88, 0.08)', color: '#86efac', border: '1px solid rgba(48, 209, 88, 0.2)' }}>
                                ✓ {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
