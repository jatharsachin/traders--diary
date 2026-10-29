import React, { useState, useMemo } from 'react';
import { 
  BookOpenCheck, Search, Calendar, Star, Edit3, Trash2, Plus, 
  CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, Filter, 
  TrendingUp, TrendingDown, Clock, ArrowUpDown
} from 'lucide-react';
import { useTradeStore } from '../store/useTradeStore';
import { getTradeMistakes } from '../types';
import type { DailyNote } from '../types';

interface DailyNotesProps {
  activeAccountId?: string;
  onOpenNoteModal?: (date?: string) => void;
}

export function DailyNotes({ 
  activeAccountId = 'Combined',
  onOpenNoteModal 
}: DailyNotesProps) {
  const { 
    dailyNotes, 
    deleteDailyNote, 
    trades: allTrades, 
    isPnlVisible,
    brokerAccounts,
    selectedFY
  } = useTradeStore();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRating, setFilterRating] = useState<string>('ALL');
  const [filterRules, setFilterRules] = useState<string>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Account filter matching helper
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

  // Convert dailyNotes dictionary to sorted array
  const allNotesList = useMemo(() => {
    return Object.values(dailyNotes || {})
      .filter(n => n && (n.notes?.trim() || n.lessons?.trim() || n.planForTomorrow?.trim() || n.mood))
      .sort((a, b) => {
        return sortOrder === 'desc' 
          ? b.date.localeCompare(a.date) 
          : a.date.localeCompare(b.date);
      });
  }, [dailyNotes, sortOrder]);

  // Filtered notes based on search & filter dropdowns
  const filteredNotes = useMemo(() => {
    return allNotesList.filter(n => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesContent = 
          n.date.toLowerCase().includes(q) ||
          (n.notes || '').toLowerCase().includes(q) ||
          (n.lessons || '').toLowerCase().includes(q) ||
          (n.planForTomorrow || '').toLowerCase().includes(q) ||
          (n.mood || '').toLowerCase().includes(q);
        if (!matchesContent) return false;
      }

      // Rating filter
      if (filterRating !== 'ALL') {
        const targetRating = parseInt(filterRating, 10);
        if (n.rating !== targetRating) return false;
      }

      // Rules filter
      if (filterRules !== 'ALL') {
        if (n.rulesFollowed !== filterRules) return false;
      }

      return true;
    });
  }, [allNotesList, searchQuery, filterRating, filterRules]);

  const handleDelete = (date: string) => {
    if (window.confirm(`Are you sure you want to delete the Day-End Note for ${date}?`)) {
      deleteDailyNote(date);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const hasTodayNote = !!dailyNotes[todayStr]?.notes;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingBottom: '40px' }}>
      {/* Top Header & Action Bar */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '18px 22px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '14px',
          borderRadius: '16px' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div 
            style={{ 
              width: '44px', 
              height: '44px', 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(168, 85, 247, 0.25) 100%)', 
              border: '1.5px solid rgba(56, 189, 248, 0.4)',
              color: '#38bdf8',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(56, 189, 248, 0.2)'
            }}
          >
            <BookOpenCheck size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                Day-End Notes & Daily Journal
              </h2>
              <span 
                style={{ 
                  fontSize: '0.74rem', 
                  fontWeight: 700, 
                  background: 'rgba(56, 189, 248, 0.15)', 
                  color: '#38bdf8',
                  padding: '2px 8px', 
                  borderRadius: '12px',
                  border: '1px solid rgba(56, 189, 248, 0.3)' 
                }}
              >
                {allNotesList.length} Notes Recorded
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
              दिवसभरातील महत्त्वाच्या नोंदी, ट्रेडिंग सायकॉलॉजी, चुका आणि उद्याचा प्लॅन
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => onOpenNoteModal && onOpenNoteModal(todayStr)}
            className="btn btn-primary"
            style={{
              padding: '9px 18px',
              fontSize: '0.84rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0a84ff 0%, #0071e3 100%)',
              boxShadow: '0 4px 14px rgba(10, 132, 255, 0.4)',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            <span>{hasTodayNote ? "Edit Today's Note" : "✍️ Write Today's Note"}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '12px 18px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '12px',
          borderRadius: '14px' 
        }}
      >
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px', maxWidth: '420px' }}>
          <Search 
            size={15} 
            color="var(--text-muted)" 
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
          />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in notes, lessons, mindset, or date..."
            style={{
              width: '100%',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              border: '1.5px solid var(--border-color)',
              borderRadius: '9px',
              padding: '7px 12px 7px 34px',
              fontSize: '0.82rem',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Rating filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>Rating:</span>
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              style={{
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '5px 8px',
                fontSize: '0.78rem',
                outline: 'none',
                fontFamily: 'inherit',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Ratings</option>
              <option value="5">⭐⭐⭐⭐⭐ (5 Stars)</option>
              <option value="4">⭐⭐⭐⭐ (4 Stars)</option>
              <option value="3">⭐⭐⭐ (3 Stars)</option>
              <option value="2">⭐⭐ (2 Stars)</option>
              <option value="1">⭐ (1 Star)</option>
            </select>
          </div>

          {/* Rules filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>Rules:</span>
            <select
              value={filterRules}
              onChange={(e) => setFilterRules(e.target.value)}
              style={{
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '5px 8px',
                fontSize: '0.78rem',
                outline: 'none',
                fontFamily: 'inherit',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Rules Status</option>
              <option value="YES">✅ 100% Followed</option>
              <option value="PARTIAL">⚠️ Partially Followed</option>
              <option value="NO">❌ Broke Rules</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="btn btn-secondary"
            style={{ padding: '5px 10px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            title="Sort Date Newest/Oldest"
          >
            <ArrowUpDown size={13} />
            <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
          </button>
        </div>
      </div>

      {/* Main Notes Cards Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredNotes.length === 0 ? (
          <div 
            className="glass-card" 
            style={{ 
              padding: '60px 20px', 
              textAlign: 'center', 
              borderRadius: '16px' 
            }}
          >
            <BookOpenCheck size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px', opacity: 0.4 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>
              {searchQuery || filterRating !== 'ALL' || filterRules !== 'ALL' 
                ? 'No notes matching your current filters' 
                : 'No Day-End Notes Recorded Yet'}
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 18px' }}>
              Record your daily trading reflections, psychology observations, lessons, and tomorrow's plan at the end of each trading session.
            </p>
            <button
              onClick={() => onOpenNoteModal && onOpenNoteModal(todayStr)}
              className="btn btn-primary"
              style={{
                padding: '8px 18px',
                fontSize: '0.84rem',
                fontWeight: 700,
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} />
              <span>✍️ Write Today's Day-End Note</span>
            </button>
          </div>
        ) : (
          filteredNotes.map((note) => {
            // Find trades context for this specific note date
            const noteTrades = allTrades.filter(t => {
              const d = t.exitDate || t.date;
              if (d !== note.date) return false;
              return isMatchAccount(t.brokerAccountId, t.broker);
            });

            const netPnL = noteTrades.reduce((sum, t) => sum + (t.netPnL || 0), 0);
            const winTrades = noteTrades.filter(t => (t.netPnL || 0) > 0);
            const winRate = noteTrades.length > 0 ? (winTrades.length / noteTrades.length) * 100 : 0;
            const mistakes = noteTrades.flatMap(t => getTradeMistakes(t));

            const dateObj = (() => {
              try {
                const parts = note.date.split('-');
                return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
              } catch {
                return new Date();
              }
            })();

            const formattedDate = dateObj.toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });

            return (
              <div 
                key={note.date}
                className="glass-card"
                style={{
                  padding: '18px 20px',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  border: '1px solid var(--border-color)',
                  transition: 'transform 0.15s ease, border-color 0.15s ease'
                }}
              >
                {/* Note Card Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                      📅 {formattedDate}
                    </span>

                    {/* Day Trading Result Badge */}
                    {noteTrades.length > 0 ? (
                      <span 
                        style={{ 
                          fontSize: '0.78rem', 
                          fontWeight: 750, 
                          fontFamily: 'var(--font-mono)',
                          color: netPnL >= 0 ? '#10b981' : '#ef4444',
                          background: netPnL >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          border: `1px solid ${netPnL >= 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        {isPnlVisible ? `${netPnL >= 0 ? '+' : ''}₹${Math.round(netPnL).toLocaleString('en-IN')}` : '••••'} ({noteTrades.length} Trades • {winRate.toFixed(0)}% Win)
                      </span>
                    ) : (
                      <span 
                        style={{ 
                          fontSize: '0.74rem', 
                          fontWeight: 650, 
                          color: '#10b981', 
                          background: 'rgba(16, 185, 129, 0.1)', 
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          padding: '3px 8px', 
                          borderRadius: '6px' 
                        }}
                      >
                        ☕ Disciplined No-Trade Day
                      </span>
                    )}

                    {/* Rating Stars */}
                    {note.rating && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(234, 179, 8, 0.1)', padding: '2px 6px', borderRadius: '6px', border: '1px solid rgba(234, 179, 8, 0.25)' }}>
                        {[...Array(note.rating)].map((_, i) => (
                          <Star key={i} size={12} fill="#eab308" color="#eab308" />
                        ))}
                      </div>
                    )}

                    {/* Mood Chip */}
                    {note.mood && (
                      <span 
                        style={{ 
                          fontSize: '0.74rem', 
                          fontWeight: 600, 
                          color: 'var(--text-main)', 
                          background: 'var(--bg-card)', 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          border: '1px solid var(--border-color)' 
                        }}
                      >
                        {note.mood}
                      </span>
                    )}

                    {/* Rules Followed Badge */}
                    {note.rulesFollowed && (
                      <span 
                        style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 650, 
                          padding: '2px 7px', 
                          borderRadius: '6px',
                          background: note.rulesFollowed === 'YES' ? 'rgba(16, 185, 129, 0.15)' : note.rulesFollowed === 'PARTIAL' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: note.rulesFollowed === 'YES' ? '#10b981' : note.rulesFollowed === 'PARTIAL' ? '#f59e0b' : '#ef4444',
                          border: `1px solid ${note.rulesFollowed === 'YES' ? 'rgba(16, 185, 129, 0.3)' : note.rulesFollowed === 'PARTIAL' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                        }}
                      >
                        {note.rulesFollowed === 'YES' ? '✅ Rules Followed' : note.rulesFollowed === 'PARTIAL' ? '⚠️ Partial Rules' : '❌ Rules Broken'}
                      </span>
                    )}
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => onOpenNoteModal && onOpenNoteModal(note.date)}
                      className="btn btn-secondary"
                      style={{ 
                        padding: '5px 12px', 
                        fontSize: '0.76rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '5px',
                        color: '#38bdf8',
                        borderColor: 'rgba(56, 189, 248, 0.35)',
                        background: 'rgba(56, 189, 248, 0.08)'
                      }}
                      title="Edit this Day-End Note"
                    >
                      <Edit3 size={13} />
                      <span>Edit Note</span>
                    </button>

                    <button
                      onClick={() => handleDelete(note.date)}
                      className="btn btn-secondary"
                      style={{ 
                        padding: '5px 8px', 
                        fontSize: '0.76rem', 
                        color: '#ef4444', 
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        display: 'flex', 
                        alignItems: 'center' 
                      }}
                      title="Delete this Day-End Note"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Mistakes in trades indicator */}
                {mistakes.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 650 }}>Mistakes tagged in day's trades:</span>
                    {[...new Set(mistakes)].map((m, idx) => (
                      <span 
                        key={idx}
                        style={{ 
                          fontSize: '0.68rem', 
                          background: 'rgba(239, 68, 68, 0.12)', 
                          color: '#f87171', 
                          padding: '1px 6px', 
                          borderRadius: '4px',
                          border: '1px solid rgba(239, 68, 68, 0.25)' 
                        }}
                      >
                        ⚠️ {m}
                      </span>
                    ))}
                  </div>
                )}

                {/* Formatted Notes Body */}
                {note.notes && (
                  <div 
                    style={{ 
                      fontSize: '0.88rem', 
                      lineHeight: 1.65, 
                      color: 'var(--text-main)', 
                      whiteSpace: 'pre-wrap',
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      fontFamily: 'inherit'
                    }}
                  >
                    {note.notes}
                  </div>
                )}

                {/* Key Lesson & Tomorrow's Plan Callouts */}
                {(note.lessons || note.planForTomorrow) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                    {note.lessons && (
                      <div 
                        style={{ 
                          background: 'rgba(234, 179, 8, 0.08)', 
                          border: '1px solid rgba(234, 179, 8, 0.28)', 
                          padding: '8px 12px', 
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}
                      >
                        <span style={{ fontSize: '0.72rem', fontWeight: 750, color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          💡 Key Lesson from Today:
                        </span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                          {note.lessons}
                        </span>
                      </div>
                    )}

                    {note.planForTomorrow && (
                      <div 
                        style={{ 
                          background: 'rgba(56, 189, 248, 0.08)', 
                          border: '1px solid rgba(56, 189, 248, 0.28)', 
                          padding: '8px 12px', 
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}
                      >
                        <span style={{ fontSize: '0.72rem', fontWeight: 750, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          🎯 Plan & Focus for Tomorrow:
                        </span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>
                          {note.planForTomorrow}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
