import { useState, useMemo } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { getTradeMistakes } from '../types';
import { filterTradesByFY, formatTimeToAMPM } from '../utils/fyHelper';
import { groupHedgedTrades, cleanHedgeNote, isHedgeLeg } from '../utils/tradeGrouping';
import type { GroupedTradePosition } from '../utils/tradeGrouping';
import { BrokerBadge } from './BrokerBadge';
import { 
  AlertTriangle, BookOpen, Calendar, Clock, Filter, Search, 
  Tag, CheckCircle2, ChevronDown, ChevronRight, Eye, EyeOff, 
  ExternalLink, Sparkles, TrendingUp, TrendingDown, ArrowUpDown, 
  MessageSquare, ShieldCheck, Flame, X, Printer, ShieldAlert,
  BookOpenCheck, Edit3, Trash2, Plus, LayoutGrid, List
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

  // Sub-tab toggle between Day-End Notes and Trade-level Mistakes
  const [journalView, setJournalView] = useState<'dayNotes' | 'tradeNotes'>(() => {
    return (localStorage.getItem('traders_diary_journal_subtab') as 'dayNotes' | 'tradeNotes') || 'dayNotes';
  });

  const handleSwitchView = (view: 'dayNotes' | 'tradeNotes') => {
    setJournalView(view);
    localStorage.setItem('traders_diary_journal_subtab', view);
  };

  // Layout density view mode for Day-End Notes (Grid vs List)
  const [notesLayout, setNotesLayout] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('traders_diary_notes_layout') as 'grid' | 'list') || 'grid';
  });

  const handleToggleLayout = (mode: 'grid' | 'list') => {
    setNotesLayout(mode);
    localStorage.setItem('traders_diary_notes_layout', mode);
  };

  // Convert dailyNotes to a sorted array
  const dailyNotesList = useMemo(() => {
    return Object.values(dailyNotes || {})
      .filter(n => n && (n.notes?.trim() || n.lessons?.trim() || n.planForTomorrow?.trim()))
      .sort((a, b) => {
        return sortOrder === 'desc' 
          ? b.date.localeCompare(a.date) 
          : a.date.localeCompare(b.date);
      });
  }, [dailyNotes, sortOrder]);

  // Filtered daily notes based on search query
  const filteredDailyNotes = useMemo(() => {
    if (!searchQuery.trim()) return dailyNotesList;
    const q = searchQuery.toLowerCase();
    return dailyNotesList.filter(n => 
      n.date.toLowerCase().includes(q) ||
      (n.notes || '').toLowerCase().includes(q) ||
      (n.lessons || '').toLowerCase().includes(q) ||
      (n.planForTomorrow || '').toLowerCase().includes(q)
    );
  }, [dailyNotesList, searchQuery]);

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

    // If text contains HTML tags from WYSIWYG editor, render directly with tight compact line-height!
    if (text.includes('<') && (text.includes('<b>') || text.includes('<strong>') || text.includes('<i>') || text.includes('<u>') || text.includes('<span') || text.includes('<div>') || text.includes('<ul>') || text.includes('<ol>') || text.includes('<br'))) {
      return (
        <div 
          className="journal-compact-content"
          style={{ fontSize: '0.82rem', lineHeight: 1.35, color: '#f1f5f9', wordBreak: 'break-word' }}
          dangerouslySetInnerHTML={{ 
            __html: `<style>.journal-compact-content p, .journal-compact-content div { margin: 0; padding: 0; line-height: 1.35; } .journal-compact-content ul, .journal-compact-content ol { margin: 2px 0 2px 14px; padding: 0; } .journal-compact-content li { margin-bottom: 2px; line-height: 1.35; }</style>${text}` 
          }}
        />
      );
    }

    const lines = text.split('\n');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.82rem', lineHeight: 1.35, color: '#f1f5f9' }}>
        {lines.map((line, idx) => {
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
    if (dateStr === todayStr) return 'Today';

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    if (dateStr === yesterdayStr) return 'Yesterday';

    return null;
  };

  return (
    <div className="glass-card animate-tab-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header Bar with Title, Subtitle, Segmented Switcher, and Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%)', 
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.35rem',
            border: '1.5px solid rgba(56, 189, 248, 0.35)',
            boxShadow: '0 4px 16px rgba(56, 189, 248, 0.15)'
          }}>
            <BookOpenCheck size={22} color="#38bdf8" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
                Journal & Notes
              </h2>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Daily reflections, market observations, and execution mistake audits.
            </p>
          </div>
        </div>

        {/* Minimal Apple-style Sub-tab Switcher */}
        <div style={{ 
          display: 'inline-flex', 
          background: 'rgba(255, 255, 255, 0.04)', 
          padding: '3px', 
          borderRadius: '10px', 
          border: '1px solid var(--border-color)' 
        }}>
          <button
            onClick={() => handleSwitchView('dayNotes')}
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: journalView === 'dayNotes' ? 700 : 500,
              borderRadius: '7px',
              border: 'none',
              background: journalView === 'dayNotes' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
              color: journalView === 'dayNotes' ? '#38bdf8' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <BookOpenCheck size={14} />
            <span>Day-End Notes ({dailyNotesList.length})</span>
          </button>
          <button
            onClick={() => handleSwitchView('tradeNotes')}
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: journalView === 'tradeNotes' ? 700 : 500,
              borderRadius: '7px',
              border: 'none',
              background: journalView === 'tradeNotes' ? 'rgba(239, 68, 68, 0.18)' : 'transparent',
              color: journalView === 'tradeNotes' ? '#f87171' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <AlertTriangle size={14} />
            <span>Trade Mistakes & Logs ({notedPositions.length})</span>
          </button>
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

      {/* Day-End Notes Tab View */}
      {journalView === 'dayNotes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Action & Search Bar */}
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '12px',
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}
          >
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '400px' }}>
              <Search 
                size={14} 
                color="var(--text-dim)" 
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in notes, lessons, plan..."
                style={{
                  width: '100%',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '9999px',
                  padding: '6px 12px 6px 34px',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Layout Switcher: Grid vs List */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  background: 'rgba(255, 255, 255, 0.04)', 
                  padding: '2px', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)' 
                }}
              >
                <button
                  type="button"
                  onClick={() => handleToggleLayout('grid')}
                  style={{
                    padding: '5px 9px',
                    fontSize: '0.74rem',
                    fontWeight: notesLayout === 'grid' ? 700 : 500,
                    borderRadius: '6px',
                    border: 'none',
                    background: notesLayout === 'grid' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                    color: notesLayout === 'grid' ? '#38bdf8' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Compact Grid View (Multi-Day)"
                >
                  <LayoutGrid size={13} />
                  <span>Compact Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleLayout('list')}
                  style={{
                    padding: '5px 9px',
                    fontSize: '0.74rem',
                    fontWeight: notesLayout === 'list' ? 700 : 500,
                    borderRadius: '6px',
                    border: 'none',
                    background: notesLayout === 'list' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                    color: notesLayout === 'list' ? '#38bdf8' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                  title="Single-Column List View"
                >
                  <List size={13} />
                  <span>List</span>
                </button>
              </div>

              {/* Sort button */}
              <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                title="Sort Newest / Oldest"
              >
                <ArrowUpDown size={13} />
                <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
              </button>

              {/* + Write Day Note button */}
              <button
                onClick={() => onOpenNoteModal?.(new Date().toISOString().split('T')[0])}
                className="btn btn-primary"
                style={{
                  padding: '6px 14px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={15} />
                <span>Write Day Note</span>
              </button>
            </div>
          </div>

          {/* Notes Cards Feed */}
          {filteredDailyNotes.length === 0 ? (
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
                {searchQuery ? 'No notes matched your search' : 'No Day-End Notes Recorded Yet'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto 16px' }}>
                Write your end-of-day market reflections, key lessons, and plan for the next trading session.
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
                display: 'grid', 
                gridTemplateColumns: notesLayout === 'grid' ? 'repeat(auto-fill, minmax(360px, 1fr))' : '1fr', 
                gap: '12px',
                alignItems: 'start'
              }}
            >
              {filteredDailyNotes.map(note => {
                const noteTrades = allTrades.filter(t => {
                  const d = t.exitDate || t.date;
                  if (d !== note.date) return false;
                  return isMatchAccount(t.brokerAccountId, t.broker);
                });

                // Calculate day's total Net PnL per strategy
                const strategyDayPnLMap = new Map<string, number>();
                for (const t of noteTrades) {
                  const sName = t.strategy || t.symbol || 'General Trade';
                  const key = sName.toLowerCase();
                  strategyDayPnLMap.set(key, (strategyDayPnLMap.get(key) || 0) + (t.netPnL || 0));
                }

                // Consolidate paired spreads and filter duplicate hedge legs into clean strategy notes
                const groupedPositions = groupHedgedTrades(noteTrades);
                const strategyNotesForDay: Array<{ id: string; strategy: string; note: string; strategyPnL: number }> = [];
                const seenNotes = new Set<string>();

                for (const pos of groupedPositions) {
                  // If not a recognized paired spread, but explicitly marked as an orphan hedge leg, skip it
                  if (!pos.isHedgedSpread && isHedgeLeg(pos.leg1)) {
                    continue;
                  }

                  const rawNote = pos.notes || pos.leg1.notes || pos.leg2?.notes || '';
                  const cleaned = cleanHedgeNote(rawNote).trim();
                  if (!cleaned) continue;

                  const stratName = pos.strategy || pos.leg1.strategy || pos.leg2?.strategy || pos.leg1.symbol || 'General Trade';
                  const dedupeKey = `${stratName.toLowerCase()}:::${cleaned.toLowerCase()}`;
                  if (seenNotes.has(dedupeKey)) continue;
                  seenNotes.add(dedupeKey);

                  const stratPnL = strategyDayPnLMap.get(stratName.toLowerCase()) ?? pos.combinedNetPnL;

                  strategyNotesForDay.push({
                    id: pos.id,
                    strategy: stratName,
                    note: cleaned,
                    strategyPnL: stratPnL
                  });
                }

                const netPnL = noteTrades.reduce((sum, t) => sum + (t.netPnL || 0), 0);
                const dateObj = (() => {
                  try {
                    const parts = note.date.split('-');
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

                return (
                  <div
                    key={note.date}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                    }}
                  >
                    {/* Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>
                          {formattedDate}
                        </span>

                        {/* Trade context summary */}
                        {noteTrades.length > 0 ? (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span>•</span>
                            <span>{noteTrades.length}T</span>
                            <span>•</span>
                            <span style={{ 
                              fontWeight: 700, 
                              color: netPnL >= 0 ? '#10b981' : '#f87171',
                              fontFamily: 'var(--font-mono)'
                            }}>
                              {isPnlVisible ? `${netPnL >= 0 ? '+' : ''}₹${Math.round(netPnL).toLocaleString('en-IN')}` : '••••'}
                            </span>
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            • 0 trades
                          </span>
                        )}
                      </div>

                      {/* Actions: Edit & Delete */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={() => onOpenNoteModal?.(note.date)}
                          className="btn btn-secondary"
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#38bdf8',
                            borderColor: 'rgba(56, 189, 248, 0.3)',
                            background: 'rgba(56, 189, 248, 0.06)'
                          }}
                          title="Edit Note"
                        >
                          <Edit3 size={11} />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteDailyNote(note.date)}
                          className="btn btn-secondary"
                          style={{
                            padding: '3px 6px',
                            fontSize: '0.72rem',
                            color: '#f87171',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Delete Note"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Card Content: 2-Column Split (Left: Day-End Reflections, Right: Trade Log Notes in the blank space) */}
                    {(() => {
                      const hasDayNotes = Boolean(note.notes || note.lessons || note.planForTomorrow);
                      const hasTradeNotes = strategyNotesForDay.length > 0;
                      const isTwoColumn = hasDayNotes && hasTradeNotes;

                      return (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: isTwoColumn ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr',
                            gap: '8px',
                            alignItems: 'start'
                          }}
                        >
                          {/* Left Column: Day Reflections, Key Lesson, Tomorrow's Plan */}
                          {hasDayNotes && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
                              {/* Formatted Note Text Body */}
                              {note.notes && (
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
                                  {renderFormattedNoteText(note.notes)}
                                </div>
                              )}

                              {/* Lesson */}
                              {note.lessons && (
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
                                  <span style={{ whiteSpace: 'pre-wrap' }}>{note.lessons}</span>
                                </div>
                              )}

                              {/* Plan For Tomorrow */}
                              {note.planForTomorrow && (
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
                                  <span style={{ whiteSpace: 'pre-wrap' }}>{note.planForTomorrow}</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Right Column: Trade Log Notes positioned in the front/blank space */}
                          {hasTradeNotes && (
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
                                Trade Log Notes ({strategyNotesForDay.length}):
                              </span>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {strategyNotesForDay.map(item => (
                                  <div 
                                    key={item.id}
                                    style={{ 
                                      display: 'flex', 
                                      alignItems: 'baseline', 
                                      gap: '5px', 
                                      fontSize: '0.78rem',
                                      lineHeight: 1.32,
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
                                    <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>:</span>
                                    <span style={{ color: '#f1f5f9', flex: 1, wordBreak: 'break-word' }}>
                                      {item.note}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Trade Mistakes & Logs Tab View */}
      {journalView === 'tradeNotes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
            Days Traded (With Notes)
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
            Identified Mistakes
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
            Financial Mistake Cost
          </span>
          <div style={{ fontSize: '1.45rem', fontWeight: 850, fontFamily: 'var(--font-mono)', color: '#ef4444', marginTop: '2px' }}>
            {isPnlVisible ? `-₹${Math.round(stats.totalMistakeLoss).toLocaleString('en-IN')}` : '••••••'}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#fca5a5', marginTop: '2px', display: 'block' }}>
            Realized losses from execution mistakes
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
            Top Repeat Error
          </span>
          <div style={{ fontSize: '1.1rem', fontWeight: 850, color: '#fbbf24', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {stats.topMistake ? stats.topMistake.name : 'None (Clean Execution)'}
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
              placeholder="Search in trade notes, symbol, setup, mistakes..."
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
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Month:</span>
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
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Mistake:</span>
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
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Emotion:</span>
            <select
              value={selectedEmotion}
              onChange={(e) => setSelectedEmotion(e.target.value)}
              className="form-select"
              style={{ padding: '5px 10px', fontSize: '0.78rem', borderRadius: '8px', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', outline: 'none', cursor: 'pointer' }}
            >
              <option value="All">All Emotions</option>
              <option value="Calm">Calm</option>
              <option value="Fearful">Fearful</option>
              <option value="Impatient">Impatient</option>
              <option value="Greedy">Greedy</option>
              <option value="Revengeful">Revengeful</option>
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
            <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
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
              All Noted Days ({dayGroups.length})
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
              ⚠️ Mistakes Only
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
              📝 Notes Only
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
              🔴 Loss Days
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
            No trade notes or mistakes found for this filter.
          </strong>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '480px', margin: 0 }}>
            When logging trades, record your reasoning in 'Notes' and tag execution errors in 'Mistakes' to review and audit them here.
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
                          className="journal-pos-card"
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
                                  <span>⚠️ Mistake:</span> {m}
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
                                ✓ Clean Setup
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
                                Emotion: {pos.emotion}
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
                                📝 Trade Note (Hedged Spread):
                              </span>
                            </div>
                            {hasNote ? (
                              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{pos.notes}</p>
                            ) : (
                              <span style={{ fontStyle: 'italic', fontSize: '0.76rem' }}>
                                No notes logged for this spread.
                              </span>
                            )}
                          </div>

                          {/* Rules Followed / Broken */}
                          {pos.rulesFollowed && pos.rulesFollowed.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                              <span style={{ fontWeight: 650 }}>Rules Followed:</span>
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
                        className="journal-pos-card"
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
                                <span>⚠️ Mistake:</span> {m}
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
                              ✓ Clean Setup
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
                              Emotion: {trade.emotion}
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
                              📝 Trade Note:
                            </span>
                          </div>
                          {hasNote ? (
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{pos.notes}</p>
                          ) : (
                            <span style={{ fontStyle: 'italic', fontSize: '0.76rem' }}>
                              No notes logged for this trade.
                            </span>
                          )}
                        </div>

                        {/* Rules Followed / Broken */}
                        {trade.rulesFollowed && trade.rulesFollowed.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                            <span style={{ fontWeight: 650 }}>Rules Followed:</span>
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
      )}

    </div>
  );
}
