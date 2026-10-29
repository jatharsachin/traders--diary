import { useState, useMemo } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { filterTradesByFY } from '../utils/fyHelper';
import { groupHedgedTrades, cleanHedgeNote, isHedgeLeg } from '../utils/tradeGrouping';
import { 
  Calendar, Search, ArrowUpDown, X, Printer,
  BookOpenCheck, Edit3, Trash2, Plus,
  Eye, EyeOff, ExternalLink
} from 'lucide-react';

interface MistakesJournalProps {
  activeAccountId?: string;
  onEditTrade?: (id: string) => void;
  onOpenNoteModal?: (date?: string) => void;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
};

export function MistakesJournal({ activeAccountId = 'Combined', onEditTrade, onOpenNoteModal }: MistakesJournalProps) {
  const { 
    trades: allTrades, 
    selectedFY, 
    isPnlVisible, 
    togglePnlVisibility,
    brokerAccounts,
    dailyNotes,
    deleteDailyNote
  } = useTradeStore();

  // Filter scoped to account
  const isMatchAccount = (accId?: string, brokerName?: string) => {
    if (activeAccountId === 'Combined' || !activeAccountId) return true;
    const targetIds = activeAccountId.split(',').filter(Boolean);
    if (accId && targetIds.includes(accId)) return true;
    if (brokerName) {
      const selectedAccs = brokerAccounts.filter(a => targetIds.includes(a.id));
      return selectedAccs.some(a => (a.broker || '').toLowerCase() === (brokerName || '').toLowerCase());
    }
    return false;
  };

  const fyTrades = useMemo(() => filterTradesByFY(allTrades, selectedFY), [allTrades, selectedFY]);
  const accountTrades = useMemo(() => {
    return activeAccountId === 'Combined'
      ? fyTrades
      : fyTrades.filter(t => isMatchAccount(t.brokerAccountId, t.broker));
  }, [fyTrades, activeAccountId, brokerAccounts]);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'notes' | 'losses'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');

  const handleDeleteDailyNote = (date: string) => {
    if (window.confirm(`Are you sure you want to delete the Day-End Note for ${date}?`)) {
      deleteDailyNote(date);
    }
  };

  // Helper to parse MS Word style inline formatting (bold, italic, underline, strikethrough, and font color)
  const renderInlineMarkdown = (content: string): React.ReactNode => {
    if (!content) return '';
    const parts: React.ReactNode[] = [];
    let remaining = content;
    let key = 0;
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|<u>.*?<\/u>|~~[^~]+~~|<span style="color:[^"]+">.*?<\/span>)/;

    while (remaining.length > 0) {
      const match = remaining.match(regex);
      if (!match || match.index === undefined) {
        parts.push(remaining);
        break;
      }
      if (match.index > 0) {
        parts.push(remaining.substring(0, match.index));
      }
      const token = match[0];
      if (token.startsWith('**') && token.endsWith('**')) {
        parts.push(<strong key={key++} style={{ color: '#ffffff', fontWeight: 800 }}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith('*') && token.endsWith('*')) {
        parts.push(<em key={key++} style={{ fontStyle: 'italic', color: '#f8fafc' }}>{token.slice(1, -1)}</em>);
      } else if (token.startsWith('<u>') && token.endsWith('</u>')) {
        parts.push(<u key={key++} style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>{token.slice(3, -4)}</u>);
      } else if (token.startsWith('~~') && token.endsWith('~~')) {
        parts.push(<span key={key++} style={{ textDecoration: 'line-through', opacity: 0.7 }}>{token.slice(2, -2)}</span>);
      } else if (token.startsWith('<span style="color:') && token.endsWith('</span>')) {
        const colorMatch = token.match(/<span style="color:([^"]+)">([\s\S]*?)<\/span>/);
        if (colorMatch) {
          const colorHex = colorMatch[1];
          const innerText = colorMatch[2];
          parts.push(
            <span key={key++} style={{ color: colorHex, fontWeight: 700 }}>
              {renderInlineMarkdown(innerText)}
            </span>
          );
        } else {
          parts.push(token);
        }
      } else {
        parts.push(token);
      }
      remaining = remaining.substring(match.index + token.length);
    }
    return parts;
  };

  // Helper to format bullets, numbers, and checkboxes cleanly in daily notes with ultra-compact line spacing
  const renderFormattedNoteText = (text: string) => {
    if (!text) return null;

    const isBlankTemplateItem = (s: string) => {
      const plain = s.replace(/<[^>]*>/g, '').trim();
      return /^[•\-\*]\s*[^:]+:\s*$/.test(plain);
    };

    // If text contains HTML tags from WYSIWYG editor, render directly with tight compact line-height!
    if (text.includes('<') && (text.includes('<b>') || text.includes('<strong>') || text.includes('<i>') || text.includes('<u>') || text.includes('<span') || text.includes('<div>') || text.includes('<ul>') || text.includes('<ol>') || text.includes('<br'))) {
      let cleanedHtml = text;
      // Strip empty template tags like <div>• Market Trend:</div> to save vertical space
      cleanedHtml = cleanedHtml.replace(/<(div|p|li)>[•\-\*]\s*[^:<]+:\s*<\/\1>/gi, '');

      return (
        <div 
          className="journal-compact-content"
          style={{ fontSize: '0.82rem', lineHeight: 1.35, color: '#f1f5f9', wordBreak: 'break-word' }}
          dangerouslySetInnerHTML={{ 
            __html: `<style>.journal-compact-content p, .journal-compact-content div { margin: 0; padding: 0; line-height: 1.35; } .journal-compact-content ul, .journal-compact-content ol { margin: 2px 0 2px 14px; padding: 0; } .journal-compact-content li { margin-bottom: 2px; line-height: 1.35; }</style>${cleanedHtml}` 
          }}
        />
      );
    }

    const lines = text.split('\n');
    const hasPopulatedLine = lines.some(l => {
      const t = l.trim();
      return t && !isBlankTemplateItem(t);
    });

    const displayLines = hasPopulatedLine
      ? lines.filter(l => !isBlankTemplateItem(l.trim()))
      : lines;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.82rem', lineHeight: 1.35, color: '#f1f5f9' }}>
        {displayLines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} style={{ height: '3px' }} />;
          }
          if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', paddingLeft: '2px', lineHeight: 1.35 }}>
                <span style={{ color: '#38bdf8', fontWeight: 800, userSelect: 'none' }}>•</span>
                <span>{renderInlineMarkdown(trimmed.substring(2))}</span>
              </div>
            );
          }
          const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', paddingLeft: '2px', lineHeight: 1.35 }}>
                <span style={{ color: '#38bdf8', fontWeight: 700, minWidth: '16px', userSelect: 'none' }}>{numMatch[1]}.</span>
                <span>{renderInlineMarkdown(numMatch[2])}</span>
              </div>
            );
          }
          if (trimmed.startsWith('☐ ') || trimmed.startsWith('[ ] ')) {
            const content = trimmed.startsWith('☐ ') ? trimmed.substring(2) : trimmed.substring(4);
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', paddingLeft: '2px', lineHeight: 1.35 }}>
                <span style={{ color: 'var(--text-muted)', userSelect: 'none', fontSize: '0.9rem' }}>☐</span>
                <span>{renderInlineMarkdown(content)}</span>
              </div>
            );
          }
          if (trimmed.startsWith('☑ ') || trimmed.startsWith('[x] ') || trimmed.startsWith('[X] ')) {
            const content = trimmed.startsWith('☑ ') ? trimmed.substring(2) : trimmed.substring(4);
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', paddingLeft: '2px', lineHeight: 1.35 }}>
                <span style={{ color: '#10b981', userSelect: 'none', fontSize: '0.9rem' }}>☑</span>
                <span style={{ textDecoration: 'line-through', opacity: 0.75 }}>{renderInlineMarkdown(content)}</span>
              </div>
            );
          }
          return <div key={idx} style={{ lineHeight: 1.35 }}>{renderInlineMarkdown(line)}</div>;
        })}
      </div>
    );
  };

  const getRelativeDayLabel = (dateStr: string) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (dateStr === todayStr) return 'Today';

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (dateStr === yesterdayStr) return 'Yesterday';

    return null;
  };

  // =========================================================================
  // UNIFIED JOURNAL DAYS: Day-End Notes & Trade Log Notes
  // =========================================================================
  const journalDays = useMemo(() => {
    const datesSet = new Set<string>();

    // 1. Add dates from dailyNotes (that have non-empty content)
    Object.values(dailyNotes || {}).forEach(n => {
      if (n && (n.notes?.trim() || n.lessons?.trim() || n.planForTomorrow?.trim())) {
        datesSet.add(n.date);
      }
    });

    // 2. Add dates from accountTrades
    accountTrades.forEach(t => {
      const d = t.exitDate || t.date;
      if (d) datesSet.add(d);
    });

    // 3. Map each date into a clean day journal card
    const dayEntries = Array.from(datesSet).map(date => {
      const noteTrades = accountTrades.filter(t => (t.exitDate || t.date) === date);
      const dayNetPnL = noteTrades.reduce((sum, t) => sum + (t.netPnL || 0), 0);
      const tradesCount = noteTrades.length;

      // Calculate total day PnL per strategy
      const strategyDayPnLMap = new Map<string, number>();
      for (const t of noteTrades) {
        const sName = t.strategy || t.symbol || 'General Trade';
        const key = sName.toLowerCase();
        strategyDayPnLMap.set(key, (strategyDayPnLMap.get(key) || 0) + (t.netPnL || 0));
      }

      // Consolidate paired spreads and filter duplicate hedge legs
      const groupedPositions = groupHedgedTrades(noteTrades);
      const strategyNotesForDay: Array<{
        id: string;
        strategy: string;
        note: string;
        strategyPnL: number;
      }> = [];
      const seenEntries = new Set<string>();

      for (const pos of groupedPositions) {
        // Skip orphan hedge leg if it's already redundant
        if (!pos.isHedgedSpread && isHedgeLeg(pos.leg1)) {
          continue;
        }

        const rawNote = pos.notes || pos.leg1.notes || pos.leg2?.notes || '';
        const cleaned = cleanHedgeNote(rawNote).trim();

        // Include only if a trade note actually exists
        if (!cleaned) {
          continue;
        }

        const stratName = pos.strategy || pos.leg1.strategy || pos.leg2?.strategy || pos.leg1.symbol || 'General Trade';
        const dedupeKey = `${stratName.toLowerCase()}:::${cleaned.toLowerCase()}`;
        if (seenEntries.has(dedupeKey)) continue;
        seenEntries.add(dedupeKey);

        const stratPnL = strategyDayPnLMap.get(stratName.toLowerCase()) ?? pos.combinedNetPnL;

        strategyNotesForDay.push({
          id: pos.id,
          strategy: stratName,
          note: cleaned,
          strategyPnL: stratPnL
        });
      }

      const dNote = dailyNotes?.[date];
      const hasDayNotes = Boolean(dNote && (dNote.notes?.trim() || dNote.lessons?.trim() || dNote.planForTomorrow?.trim()));
      const hasTradeNotes = strategyNotesForDay.length > 0;

      const dateObj = (() => {
        try {
          const parts = date.split('-');
          return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } catch {
          return new Date();
        }
      })();

      const formattedDate = dateObj.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      return {
        date,
        formattedDate,
        relativeLabel: getRelativeDayLabel(date),
        dailyNote: dNote,
        hasDayNotes,
        tradesCount,
        dayNetPnL,
        strategyNotes: strategyNotesForDay,
        hasTradeNotes
      };
    });

    // Only include days with actual journal notes or trade notes
    return dayEntries.filter(d => d.hasDayNotes || d.hasTradeNotes);
  }, [dailyNotes, accountTrades]);

  // Months available
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    journalDays.forEach(d => {
      if (d.date && d.date.length >= 7) {
        set.add(d.date.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [journalDays]);

  // Filtered Journal Days based on Search, Pills, Month, and Sort
  const filteredJournalDays = useMemo(() => {
    return journalDays.filter(day => {
      // Type pill filter
      if (typeFilter === 'notes' && !day.hasDayNotes && day.strategyNotes.length === 0) return false;
      if (typeFilter === 'losses' && day.dayNetPnL >= 0) return false;

      // Month filter
      if (selectedMonth !== 'All' && !day.date.startsWith(selectedMonth)) return false;

      // Search query (date, reflections, lessons, plan, strategy, notes)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inDate = day.date.toLowerCase().includes(q) || day.formattedDate.toLowerCase().includes(q);
        const inDayNotes = (day.dailyNote?.notes || '').toLowerCase().includes(q) ||
                           (day.dailyNote?.lessons || '').toLowerCase().includes(q) ||
                           (day.dailyNote?.planForTomorrow || '').toLowerCase().includes(q);
        const inStrat = day.strategyNotes.some(s => 
          s.strategy.toLowerCase().includes(q) || 
          s.note.toLowerCase().includes(q)
        );
        if (!inDate && !inDayNotes && !inStrat) return false;
      }

      return true;
    }).sort((a, b) => {
      return sortOrder === 'desc' 
        ? b.date.localeCompare(a.date) 
        : a.date.localeCompare(b.date);
    });
  }, [journalDays, typeFilter, selectedMonth, searchQuery, sortOrder]);

  // Metric counts for filter pills
  const notedDaysCount = useMemo(() => journalDays.filter(d => d.hasDayNotes || d.strategyNotes.length > 0).length, [journalDays]);
  const lossDaysCount = useMemo(() => journalDays.filter(d => d.dayNetPnL < 0).length, [journalDays]);

  return (
    <div className="glass-card animate-tab-panel" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* 1. Header Bar: Title, Day Count Badge, and Action Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '28px', 
            height: '28px', 
            borderRadius: '8px', 
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)', 
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(56, 189, 248, 0.3)'
          }}>
            <BookOpenCheck size={16} color="#38bdf8" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Journal & Notes</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', background: 'rgba(255, 255, 255, 0.05)', padding: '1px 7px', borderRadius: '9999px', border: '1px solid var(--border-color)' }}>
                {journalDays.length} Days
              </span>
            </h2>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button 
            onClick={togglePnlVisibility}
            className="btn btn-secondary"
            style={{ padding: '4px 9px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            title={isPnlVisible ? "Hide P&L Numbers" : "Show P&L Numbers"}
          >
            {isPnlVisible ? <EyeOff size={13} /> : <Eye size={13} color="var(--primary)" />}
            <span>{isPnlVisible ? 'Hide P&L' : 'Show P&L'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="btn btn-secondary"
            style={{ padding: '4px 9px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Print or Export Journal to PDF"
          >
            <Printer size={13} />
            <span className="hide-mobile">Print / PDF</span>
          </button>
        </div>
      </div>

      {/* 2. Unified Action & Filter Toolbar */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '8px',
          padding: '6px 10px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '300px' }}>
          <Search 
            size={13} 
            color="var(--text-dim)" 
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} 
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in notes, lessons, plan, strategies..."
            style={{
              width: '100%',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '4px 10px 4px 28px',
              fontSize: '0.76rem',
              outline: 'none'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Quick Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setTypeFilter('all')}
            className="btn"
            style={{
              padding: '2px 9px',
              fontSize: '0.72rem',
              fontWeight: 700,
              borderRadius: '9999px',
              background: typeFilter === 'all' ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
              color: typeFilter === 'all' ? '#fff' : 'var(--text-muted)',
              border: '1px solid ' + (typeFilter === 'all' ? 'var(--primary)' : 'var(--border-color)')
            }}
          >
            All Days ({journalDays.length})
          </button>

          <button
            onClick={() => setTypeFilter('notes')}
            className="btn"
            style={{
              padding: '2px 9px',
              fontSize: '0.72rem',
              fontWeight: 700,
              borderRadius: '9999px',
              background: typeFilter === 'notes' ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
              color: typeFilter === 'notes' ? '#fff' : 'var(--text-muted)',
              border: '1px solid ' + (typeFilter === 'notes' ? 'var(--primary)' : 'var(--border-color)')
            }}
          >
            📝 Notes ({notedDaysCount})
          </button>

          <button
            onClick={() => setTypeFilter('losses')}
            className="btn"
            style={{
              padding: '2px 9px',
              fontSize: '0.72rem',
              fontWeight: 700,
              borderRadius: '9999px',
              background: typeFilter === 'losses' ? '#f87171' : 'rgba(255,255,255,0.04)',
              color: typeFilter === 'losses' ? '#fff' : 'var(--text-muted)',
              border: '1px solid ' + (typeFilter === 'losses' ? '#f87171' : 'var(--border-color)')
            }}
          >
            🔴 Losses ({lossDaysCount})
          </button>
        </div>

        {/* Month, Layout, Sort, and + Write Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {availableMonths.length > 1 && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="form-select"
              style={{ padding: '3px 7px', fontSize: '0.72rem', borderRadius: '5px', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', outline: 'none' }}
            >
              <option value="All">All Months</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}

          {/* Sort button */}
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}
            title="Sort Newest / Oldest"
          >
            <ArrowUpDown size={11} />
            <span>{sortOrder === 'desc' ? 'Newest' : 'Oldest'}</span>
          </button>

          {/* + Write Day Note button */}
          <button
            onClick={() => onOpenNoteModal?.(new Date().toISOString().split('T')[0])}
            className="btn btn-primary"
            style={{
              padding: '4px 9px',
              fontSize: '0.74rem',
              fontWeight: 700,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Plus size={13} />
            <span>Write Day Note</span>
          </button>
        </div>
      </div>

      {/* 3. Merged Day Cards Feed (List View) */}
      {filteredJournalDays.length === 0 ? (
        <div 
          style={{ 
            padding: '50px 20px', 
            textAlign: 'center', 
            borderRadius: '14px',
            border: '1px dashed var(--border-color)',
            background: 'rgba(255, 255, 255, 0.01)'
          }}
        >
          <BookOpenCheck size={40} color="var(--text-dim)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
            {searchQuery ? 'No journal notes matched your search' : 'No Journal Notes Found'}
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto 16px' }}>
            Log trade notes or record day reflections to see them organized here.
          </p>
          <button
            onClick={() => onOpenNoteModal?.(new Date().toISOString().split('T')[0])}
            className="btn btn-primary"
            style={{ padding: '7px 16px', fontSize: '0.82rem', fontWeight: 650, borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>Write Today's Note</span>
          </button>
        </div>
      ) : (
        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px' 
          }}
        >
          {filteredJournalDays.map(day => {
            const isProfit = day.dayNetPnL >= 0;
            const hasBothColumns = day.hasDayNotes && day.hasTradeNotes;

            return (
              <div
                key={day.date}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                }}
              >
                {/* Day Card Header Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} color="var(--primary)" />
                      <span>{day.formattedDate}</span>
                    </span>

                    {day.relativeLabel && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 750, padding: '1px 6px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                        {day.relativeLabel}
                      </span>
                    )}

                    {/* Trade Count & Day PnL */}
                    {day.tradesCount > 0 ? (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>•</span>
                        <span>{day.tradesCount}T</span>
                        <span>•</span>
                        <span style={{ 
                          fontWeight: 700, 
                          color: isProfit ? '#10b981' : '#f87171',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {isPnlVisible ? `${isProfit ? '+' : ''}₹${Math.round(day.dayNetPnL).toLocaleString('en-IN')}` : '••••'}
                        </span>
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                        • 0 trades
                      </span>
                    )}
                  </div>

                  {/* Actions: Edit / Write Day Note & Delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={() => onOpenNoteModal?.(day.date)}
                      className="btn btn-secondary"
                      style={{
                        padding: '2px 7px',
                        fontSize: '0.7rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        color: '#38bdf8',
                        borderColor: 'rgba(56, 189, 248, 0.3)',
                        background: 'rgba(56, 189, 248, 0.06)'
                      }}
                      title={day.hasDayNotes ? "Edit Day Note" : "Write Day Note for this date"}
                    >
                      <Edit3 size={11} />
                      <span>{day.hasDayNotes ? 'Edit Note' : '+ Day Note'}</span>
                    </button>

                    {day.hasDayNotes && (
                      <button
                        onClick={() => handleDeleteDailyNote(day.date)}
                        className="btn btn-secondary"
                        style={{
                          padding: '2px 5px',
                          fontSize: '0.7rem',
                          color: '#f87171',
                          borderColor: 'rgba(239, 68, 68, 0.3)',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Delete Day Note"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Content: 2-Column Split (Left: Day-End Reflections, Right: Trade Notes) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: hasBothColumns ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr',
                    gap: '8px',
                    alignItems: 'start'
                  }}
                >
                  {/* Left Column: Day-End Reflections */}
                  {day.hasDayNotes && day.dailyNote && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                      {/* Body Reflections */}
                      {day.dailyNote.notes && (
                        <div 
                          style={{ 
                            background: 'rgba(0, 0, 0, 0.25)', 
                            padding: '6px 10px', 
                            borderRadius: '6px', 
                            border: '1px solid rgba(255, 255, 255, 0.04)',
                            maxHeight: '190px',
                            overflowY: 'auto'
                          }}
                        >
                          {renderFormattedNoteText(day.dailyNote.notes)}
                        </div>
                      )}

                      {/* Lesson */}
                      {day.dailyNote.lessons && (
                        <div 
                          style={{ 
                            padding: '4px 8px', 
                            borderRadius: '6px', 
                            background: 'rgba(56, 189, 248, 0.05)', 
                            borderLeft: '3px solid #38bdf8',
                            fontSize: '0.76rem',
                            lineHeight: 1.35,
                            color: 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '5px'
                          }}
                        >
                          <span style={{ fontWeight: 700, color: '#38bdf8', whiteSpace: 'nowrap' }}>💡 Lesson:</span>
                          <span style={{ whiteSpace: 'pre-wrap' }}>{day.dailyNote.lessons}</span>
                        </div>
                      )}

                      {/* Tomorrow's Plan */}
                      {day.dailyNote.planForTomorrow && (
                        <div 
                          style={{ 
                            padding: '4px 8px', 
                            borderRadius: '6px', 
                            background: 'rgba(168, 85, 247, 0.05)', 
                            borderLeft: '3px solid #a855f7',
                            fontSize: '0.76rem',
                            lineHeight: 1.35,
                            color: 'var(--text-main)',
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '5px'
                          }}
                        >
                          <span style={{ fontWeight: 700, color: '#a855f7', whiteSpace: 'nowrap' }}>🎯 Tomorrow:</span>
                          <span style={{ whiteSpace: 'pre-wrap' }}>{day.dailyNote.planForTomorrow}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Right Column: Trade Log Notes */}
                  {day.hasTradeNotes && (
                    <div 
                      style={{ 
                        padding: '6px 8px', 
                        borderRadius: '6px', 
                        background: 'rgba(0, 0, 0, 0.2)', 
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                        maxHeight: '190px',
                        overflowY: 'auto',
                        minWidth: 0
                      }}
                    >
                      <span style={{ fontSize: '0.67rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1px' }}>
                        Trade Log Notes ({day.strategyNotes.length}):
                      </span>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {day.strategyNotes.map(item => (
                          <div 
                            key={item.id}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'baseline', 
                              gap: '5px', 
                              fontSize: '0.78rem', 
                              lineHeight: 1.35,
                              padding: '1px 2px'
                            }}
                          >
                            <span style={{ color: '#38bdf8', fontWeight: 800, userSelect: 'none', fontSize: '0.8rem' }}>•</span>
                            <span 
                              style={{ 
                                fontWeight: 700, 
                                color: '#38bdf8', 
                                whiteSpace: 'nowrap',
                                fontSize: '0.72rem'
                              }}
                            >
                              {item.strategy}
                            </span>
                            <span
                              style={{
                                fontSize: '0.67rem',
                                fontWeight: 700,
                                fontFamily: 'var(--font-mono)',
                                color: item.strategyPnL >= 0 ? '#10b981' : '#f87171',
                                background: item.strategyPnL >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                padding: '0 4px',
                                borderRadius: '3px',
                                whiteSpace: 'nowrap'
                              }}
                              title={`Day PnL for ${item.strategy}`}
                            >
                              {isPnlVisible ? `${item.strategyPnL >= 0 ? '+' : ''}₹${Math.round(item.strategyPnL).toLocaleString('en-IN')}` : '••••'}
                            </span>

                            {/* Note Text */}
                            <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>:</span>
                            <span style={{ color: '#f1f5f9', flex: 1, wordBreak: 'break-word' }}>
                              {item.note}
                            </span>

                            {/* Edit shortcut */}
                            {onEditTrade && (
                              <button
                                onClick={() => onEditTrade(item.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--text-dim)',
                                  cursor: 'pointer',
                                  padding: '0 2px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  opacity: 0.7
                                }}
                                title="Edit Trade in TradeLogger"
                              >
                                <ExternalLink size={10} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
