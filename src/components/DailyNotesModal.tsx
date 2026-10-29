import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Save, Trash2, Calendar, Star, ChevronLeft, ChevronRight, 
  CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, BookOpenCheck,
  Target, Clock, AlertCircle, List, ListOrdered, CheckSquare, 
  Bold, Heading, Search, Edit3, BookOpen
} from 'lucide-react';
import { useTradeStore } from '../store/useTradeStore';
import { getTradeMistakes } from '../types';

interface DailyNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string; // YYYY-MM-DD
  activeAccountId?: string;
}

const MOOD_OPTIONS = [
  { label: 'Calm & Disciplined', icon: '😌', color: '#10b981' },
  { label: 'Followed Plan', icon: '🎯', color: '#38bdf8' },
  { label: 'Patient Execution', icon: '🧘', color: '#818cf8' },
  { label: 'FOMO / Impatient', icon: '⚡', color: '#f59e0b' },
  { label: 'Revenge / Overtrading', icon: '😤', color: '#ef4444' },
  { label: 'Respected Stop Loss', icon: '🛡️', color: '#06b6d4' },
  { label: 'Disciplined No-Trade', icon: '☕', color: '#a855f7' },
];

export function DailyNotesModal({ 
  isOpen, 
  onClose, 
  initialDate, 
  activeAccountId = 'Combined' 
}: DailyNotesModalProps) {
  const { 
    trades: allTrades, 
    dailyNotes, 
    saveDailyNote, 
    deleteDailyNote, 
    isPnlVisible,
    brokerAccounts 
  } = useTradeStore();

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // View Tab: 'edit' (Write/Edit note) vs 'all' (Browse all recorded notes)
  const [activeTab, setActiveTab] = useState<'edit' | 'all'>('edit');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || getTodayStr());
  const [notesText, setNotesText] = useState<string>('');
  const [rating, setRating] = useState<number>(5);
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [rulesFollowed, setRulesFollowed] = useState<string>('YES');
  const [lessonsText, setLessonsText] = useState<string>('');
  const [planForTomorrow, setPlanForTomorrow] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync initial date when modal opens
  useEffect(() => {
    if (isOpen) {
      const targetDate = initialDate || getTodayStr();
      setSelectedDate(targetDate);
      loadNoteForDate(targetDate);
      setFeedbackMsg(null);
    }
  }, [isOpen, initialDate]);

  // Load note data whenever selectedDate changes
  const loadNoteForDate = (dateStr: string) => {
    const existing = dailyNotes[dateStr];
    if (existing) {
      setNotesText(existing.notes || '');
      setRating(existing.rating || 5);
      setSelectedMood(existing.mood || '');
      setRulesFollowed(existing.rulesFollowed || 'YES');
      setLessonsText(existing.lessons || '');
      setPlanForTomorrow(existing.planForTomorrow || '');
    } else {
      setNotesText('');
      setRating(5);
      setSelectedMood('');
      setRulesFollowed('YES');
      setLessonsText('');
      setPlanForTomorrow('');
    }
  };

  useEffect(() => {
    loadNoteForDate(selectedDate);
    setFeedbackMsg(null);
  }, [selectedDate, dailyNotes]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Account filter helper
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

  // Day's Trades Summary (Read-Only Context for the selected date)
  const dayTrades = useMemo(() => {
    return allTrades.filter(t => {
      const d = t.exitDate || t.date;
      if (d !== selectedDate) return false;
      return isMatchAccount(t.brokerAccountId, t.broker);
    });
  }, [allTrades, selectedDate, activeAccountId, brokerAccounts]);

  const dayStats = useMemo(() => {
    const count = dayTrades.length;
    const netPnL = dayTrades.reduce((sum, t) => sum + (t.netPnL || 0), 0);
    const winTrades = dayTrades.filter(t => (t.netPnL || 0) > 0);
    const lossTrades = dayTrades.filter(t => (t.netPnL || 0) < 0);
    const winRate = count > 0 ? (winTrades.length / count) * 100 : 0;
    const mistakes = dayTrades.flatMap(t => getTradeMistakes(t));

    return { count, netPnL, wins: winTrades.length, losses: lossTrades.length, winRate, mistakes };
  }, [dayTrades]);

  // List of all recorded notes sorted newest first
  const allRecordedNotes = useMemo(() => {
    return Object.values(dailyNotes || {})
      .filter(n => n && (n.notes?.trim() || n.lessons?.trim() || n.planForTomorrow?.trim() || n.mood))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [dailyNotes]);

  // Filtered recorded notes for "All Notes" tab
  const filteredRecordedNotes = useMemo(() => {
    if (!searchQuery.trim()) return allRecordedNotes;
    const q = searchQuery.toLowerCase();
    return allRecordedNotes.filter(n => 
      n.date.toLowerCase().includes(q) ||
      (n.notes || '').toLowerCase().includes(q) ||
      (n.lessons || '').toLowerCase().includes(q) ||
      (n.planForTomorrow || '').toLowerCase().includes(q) ||
      (n.mood || '').toLowerCase().includes(q)
    );
  }, [allRecordedNotes, searchQuery]);

  // Date navigation handlers
  const handleShiftDate = (days: number) => {
    const parts = selectedDate.split('-');
    const current = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    current.setDate(current.getDate() + days);
    const y = current.getFullYear();
    const m = (current.getMonth() + 1).toString().padStart(2, '0');
    const d = current.getDate().toString().padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const handleSetToday = () => {
    setSelectedDate(getTodayStr());
  };

  // Textarea formatting toolbar helpers
  const insertAtCursor = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selection = text.substring(start, end);

    const replacement = selection ? `${prefix}${selection}${suffix}` : `${prefix}${suffix}`;
    const newText = text.substring(0, start) + replacement + text.substring(end);
    
    setNotesText(newText);
    
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + (selection ? selection.length : 0);
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const insertBullet = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const text = textarea.value;
    const lastNewline = text.lastIndexOf('\n', start - 1);
    const isLineStart = start === 0 || lastNewline === start - 1;
    insertAtCursor(isLineStart ? '• ' : '\n• ');
  };

  const insertNumbering = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const text = textarea.value;
    const lastNewline = text.lastIndexOf('\n', start - 1);
    const isLineStart = start === 0 || lastNewline === start - 1;
    insertAtCursor(isLineStart ? '1. ' : '\n1. ');
  };

  const insertCheckbox = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const text = textarea.value;
    const lastNewline = text.lastIndexOf('\n', start - 1);
    const isLineStart = start === 0 || lastNewline === start - 1;
    insertAtCursor(isLineStart ? '☐ ' : '\n☐ ');
  };

  const insertHeading = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const text = textarea.value;
    const lastNewline = text.lastIndexOf('\n', start - 1);
    const isLineStart = start === 0 || lastNewline === start - 1;
    insertAtCursor(isLineStart ? '### ' : '\n### ');
  };

  const handleAppendTemplate = (text: string) => {
    setNotesText(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n• ${text}: ` : `• ${text}: `;
    });
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
      }
    }, 10);
  };

  // Smart Enter key handler (auto-continues bullet points and numbered lists)
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const text = textarea.value;
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const currentLine = text.substring(lineStart, start);

      const bulletMatch = currentLine.match(/^(\s*)(•|-|\*)\s+/);
      const numMatch = currentLine.match(/^(\s*)(\d+)\.\s+/);
      const todoMatch = currentLine.match(/^(\s*)(☐|\[ \]|\[x\])\s+/);

      if (bulletMatch) {
        if (currentLine.trim() === bulletMatch[2]) {
          // Empty bullet line -> press enter to clear and exit list
          e.preventDefault();
          const newText = text.substring(0, lineStart) + text.substring(start);
          setNotesText(newText);
          setTimeout(() => textarea.setSelectionRange(lineStart, lineStart), 0);
        } else {
          // Continue bullet on next line
          e.preventDefault();
          const nextBullet = `\n${bulletMatch[1]}• `;
          const newText = text.substring(0, start) + nextBullet + text.substring(start);
          setNotesText(newText);
          setTimeout(() => {
            const nextPos = start + nextBullet.length;
            textarea.setSelectionRange(nextPos, nextPos);
          }, 0);
        }
      } else if (numMatch) {
        const num = parseInt(numMatch[2]);
        if (currentLine.trim() === `${num}.`) {
          // Empty number line -> exit list
          e.preventDefault();
          const newText = text.substring(0, lineStart) + text.substring(start);
          setNotesText(newText);
          setTimeout(() => textarea.setSelectionRange(lineStart, lineStart), 0);
        } else {
          // Continue numbered list
          e.preventDefault();
          const nextNum = `\n${numMatch[1]}${num + 1}. `;
          const newText = text.substring(0, start) + nextNum + text.substring(start);
          setNotesText(newText);
          setTimeout(() => {
            const nextPos = start + nextNum.length;
            textarea.setSelectionRange(nextPos, nextPos);
          }, 0);
        }
      } else if (todoMatch) {
        if (currentLine.trim() === todoMatch[2]) {
          e.preventDefault();
          const newText = text.substring(0, lineStart) + text.substring(start);
          setNotesText(newText);
          setTimeout(() => textarea.setSelectionRange(lineStart, lineStart), 0);
        } else {
          e.preventDefault();
          const nextTodo = `\n${todoMatch[1]}☐ `;
          const newText = text.substring(0, start) + nextTodo + text.substring(start);
          setNotesText(newText);
          setTimeout(() => {
            const nextPos = start + nextTodo.length;
            textarea.setSelectionRange(nextPos, nextPos);
          }, 0);
        }
      }
    }
  };

  // Save handler
  const handleSave = () => {
    if (!notesText.trim() && !lessonsText.trim() && !planForTomorrow.trim() && !selectedMood) {
      setFeedbackMsg({ type: 'error', text: 'Please enter notes or reflection before saving.' });
      return;
    }

    saveDailyNote(selectedDate, {
      date: selectedDate,
      notes: notesText.trim(),
      rating,
      mood: selectedMood,
      rulesFollowed,
      lessons: lessonsText.trim(),
      planForTomorrow: planForTomorrow.trim(),
    });

    setFeedbackMsg({ type: 'success', text: `✓ Day-End Note for ${selectedDate} saved successfully!` });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 3500);
  };

  // Delete handler
  const handleDelete = () => {
    if (!dailyNotes[selectedDate]) return;
    if (window.confirm(`Are you sure you want to delete the Day-End Note for ${selectedDate}?`)) {
      deleteDailyNote(selectedDate);
      setNotesText('');
      setLessonsText('');
      setPlanForTomorrow('');
      setSelectedMood('');
      setRating(5);
      setRulesFollowed('YES');
      setFeedbackMsg({ type: 'success', text: `Note deleted for ${selectedDate}.` });
    }
  };

  if (!isOpen) return null;

  // Formatted date string
  const dateObj = (() => {
    try {
      const parts = selectedDate.split('-');
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } catch {
      return new Date();
    }
  })();

  const formattedDateTitle = dateObj.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const isToday = selectedDate === getTodayStr();
  const hasExistingNote = !!dailyNotes[selectedDate]?.notes;

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 99999 }} onClick={onClose}>
      <div 
        className="modal-content glass-card animate-scale-up" 
        style={{ 
          width: '840px', 
          maxWidth: '96vw', 
          maxHeight: '92vh',
          padding: 0,
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          borderRadius: '18px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75), 0 0 20px rgba(10, 132, 255, 0.2)',
          border: '1px solid var(--border-color)',
          background: 'rgba(20, 20, 24, 0.96)',
          backdropFilter: 'blur(20px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Simplified Header with View Tabs */}
        <div 
          style={{ 
            padding: '12px 18px', 
            borderBottom: '1px solid var(--border-color)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)' 
          }}
        >
          {/* Left: Mode Switcher Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '9px', 
                background: 'rgba(56, 189, 248, 0.15)', 
                color: '#38bdf8',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              <BookOpenCheck size={18} />
            </div>

            <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.35)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '7px',
                  fontSize: '0.8rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeTab === 'edit' ? '#0a84ff' : 'transparent',
                  color: activeTab === 'edit' ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                📝 Write / Edit Note
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '7px',
                  fontSize: '0.8rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeTab === 'all' ? '#0a84ff' : 'transparent',
                  color: activeTab === 'all' ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>📖 All Saved Notes</span>
                {allRecordedNotes.length > 0 && (
                  <span 
                    style={{ 
                      fontSize: '0.7rem', 
                      background: activeTab === 'all' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(56, 189, 248, 0.2)', 
                      color: activeTab === 'all' ? '#fff' : '#38bdf8',
                      padding: '1px 6px', 
                      borderRadius: '10px' 
                    }}
                  >
                    {allRecordedNotes.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="btn btn-secondary" 
            style={{ 
              width: '32px', 
              height: '32px', 
              padding: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: '50%',
              cursor: 'pointer' 
            }}
            title="Close (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* ================= TAB 1: WRITE / EDIT NOTE ================= */}
        {activeTab === 'edit' ? (
          <>
            {/* Clean Date Navigation & Compact 1-Line Day Snapshot */}
            <div 
              style={{ 
                padding: '8px 18px', 
                background: 'rgba(0, 0, 0, 0.25)', 
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              {/* Date Navigators */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => handleShiftDate(-1)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 7px', fontSize: '0.76rem', display: 'flex', alignItems: 'center' }}
                  title="Previous Day"
                >
                  <ChevronLeft size={14} />
                </button>

                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', padding: '0 4px' }}>
                  {formattedDateTitle}
                </span>

                <button
                  onClick={() => handleShiftDate(1)}
                  className="btn btn-secondary"
                  style={{ padding: '4px 7px', fontSize: '0.76rem', display: 'flex', alignItems: 'center' }}
                  title="Next Day"
                >
                  <ChevronRight size={14} />
                </button>

                {!isToday && (
                  <button
                    onClick={handleSetToday}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.72rem', fontWeight: 650, color: '#38bdf8' }}
                  >
                    Today
                  </button>
                )}

                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  style={{
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '3px 6px',
                    fontSize: '0.74rem',
                    outline: 'none',
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Compact 1-Line Day Activity Snapshot (Simplified!) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem' }}>
                {dayStats.count > 0 ? (
                  <>
                    <span style={{ background: 'var(--bg-card)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', fontWeight: 650 }}>
                      {dayStats.count} Trades
                    </span>
                    <span 
                      style={{ 
                        background: dayStats.netPnL >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', 
                        color: dayStats.netPnL >= 0 ? '#10b981' : '#ef4444',
                        border: `1px solid ${dayStats.netPnL >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        padding: '3px 8px', 
                        borderRadius: '6px', 
                        fontWeight: 750, 
                        fontFamily: 'var(--font-mono)' 
                      }}
                    >
                      {isPnlVisible ? `${dayStats.netPnL >= 0 ? '+' : ''}₹${Math.round(dayStats.netPnL).toLocaleString('en-IN')}` : '••••'}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      ({dayStats.winRate.toFixed(0)}% Win)
                    </span>
                    {dayStats.mistakes.length > 0 && (
                      <span 
                        style={{ 
                          fontSize: '0.68rem', 
                          background: 'rgba(245, 158, 11, 0.12)', 
                          color: '#f59e0b', 
                          padding: '2px 6px', 
                          borderRadius: '4px',
                          border: '1px solid rgba(245, 158, 11, 0.3)' 
                        }}
                        title={dayStats.mistakes.join(', ')}
                      >
                        ⚠️ {dayStats.mistakes[0]}
                      </span>
                    )}
                  </>
                ) : (
                  <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ☕ No Trades Taken
                  </span>
                )}
              </div>
            </div>

            {/* Scrollable Body */}
            <div 
              style={{ 
                padding: '16px 18px', 
                overflowY: 'auto', 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '12px' 
              }}
            >
              {/* Feedback banner */}
              {feedbackMsg && (
                <div 
                  style={{ 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    fontSize: '0.78rem', 
                    fontWeight: 650,
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: feedbackMsg.type === 'success' ? '#10b981' : '#ef4444',
                    border: feedbackMsg.type === 'success' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)'
                  }}
                >
                  {feedbackMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                  <span>{feedbackMsg.text}</span>
                </div>
              )}

              {/* Core Notes Editor Area with Toolbar */}
              <div 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  borderRadius: '12px', 
                  border: '1.5px solid var(--border-color)', 
                  background: 'var(--bg-card)',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.3)'
                }}
              >
                {/* Formatting Toolbar (Bullets, Numbering, Checkbox, Bold, Heading) */}
                <div 
                  style={{ 
                    padding: '6px 10px', 
                    borderBottom: '1px solid var(--border-color)', 
                    background: 'rgba(255, 255, 255, 0.02)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    flexWrap: 'wrap', 
                    gap: '6px' 
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {/* Bullet List Button */}
                    <button
                      type="button"
                      onClick={insertBullet}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Insert Bullet List (• Bullet)"
                    >
                      <List size={14} color="#38bdf8" />
                      <span>Bullet</span>
                    </button>

                    {/* Numbered List Button */}
                    <button
                      type="button"
                      onClick={insertNumbering}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Insert Numbered List (1. 2. 3.)"
                    >
                      <ListOrdered size={14} color="#38bdf8" />
                      <span>Number</span>
                    </button>

                    {/* Checkbox / Todo Button */}
                    <button
                      type="button"
                      onClick={insertCheckbox}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Insert Checkbox / Action Item"
                    >
                      <CheckSquare size={13} color="#10b981" />
                      <span>Task</span>
                    </button>

                    {/* Bold Button */}
                    <button
                      type="button"
                      onClick={() => insertAtCursor('**', '**')}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.74rem', fontWeight: 700 }}
                      title="Bold (**text**)"
                    >
                      <Bold size={13} />
                    </button>

                    {/* Heading Button */}
                    <button
                      type="button"
                      onClick={insertHeading}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.74rem' }}
                      title="Heading (### Section)"
                    >
                      <Heading size={13} />
                    </button>
                  </div>

                  {/* Quick Prompts */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => handleAppendTemplate('Market Behavior')}
                      className="btn btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '0.7rem', borderRadius: '5px' }}
                    >
                      + Trend
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAppendTemplate('What went well')}
                      className="btn btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '0.7rem', borderRadius: '5px' }}
                    >
                      + Good
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAppendTemplate('Mistakes to avoid')}
                      className="btn btn-secondary"
                      style={{ padding: '3px 8px', fontSize: '0.7rem', borderRadius: '5px' }}
                    >
                      + Mistake
                    </button>
                  </div>
                </div>

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder="दिवसभरातील महत्त्वाच्या नोंदी इथे लिहा... (Use Bullet or Number buttons above for lists)&#10;• Market Trend: &#10;• Setup & Patience: &#10;• Execution & Rules: "
                  rows={8}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    color: 'var(--text-main)',
                    border: 'none',
                    padding: '12px 14px',
                    fontSize: '0.88rem',
                    fontFamily: 'inherit',
                    lineHeight: 1.6,
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Simplified & Compact Reflection Bar (Rating + Rules in 1 row) */}
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                  gap: '10px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)'
                }}
              >
                {/* Rating */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 650, color: 'var(--text-muted)' }}>Rating:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setRating(s)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '1px',
                          color: s <= rating ? '#eab308' : 'rgba(255, 255, 255, 0.15)'
                        }}
                      >
                        <Star size={18} fill={s <= rating ? '#eab308' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rules Followed */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 650, color: 'var(--text-muted)' }}>Rules Followed:</span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {[
                      { value: 'YES', label: '✅ Yes', color: '#10b981' },
                      { value: 'PARTIAL', label: '⚠️ Partial', color: '#f59e0b' },
                      { value: 'NO', label: '❌ No', color: '#ef4444' }
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRulesFollowed(opt.value)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 650,
                          cursor: 'pointer',
                          background: rulesFollowed === opt.value ? `${opt.color}25` : 'transparent',
                          color: rulesFollowed === opt.value ? opt.color : 'var(--text-muted)',
                          border: `1px solid ${rulesFollowed === opt.value ? opt.color : 'var(--border-color)'}`
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mindset / Mood Chips (Clean Single Row) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>Mindset:</span>
                {MOOD_OPTIONS.map(m => {
                  const isSelected = selectedMood === m.label;
                  return (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => setSelectedMood(isSelected ? '' : m.label)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: isSelected ? `${m.color}25` : 'rgba(255, 255, 255, 0.03)',
                        color: isSelected ? m.color : 'var(--text-muted)',
                        border: `1px solid ${isSelected ? m.color : 'var(--border-color)'}`
                      }}
                    >
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Optional Lesson & Plan (Compact Inputs) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    💡 Key Lesson / Takeaway (धडा):
                  </label>
                  <input
                    type="text"
                    value={lessonsText}
                    onChange={(e) => setLessonsText(e.target.value)}
                    placeholder="e.g. Always respect stoploss; wait for 15-min candle"
                    style={{
                      width: '100%',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '0.78rem',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    🎯 Focus for Tomorrow (उद्याचा प्लॅन):
                  </label>
                  <input
                    type="text"
                    value={planForTomorrow}
                    onChange={(e) => setPlanForTomorrow(e.target.value)}
                    placeholder="e.g. Nifty Expiry - small size, trade only trend breakout"
                    style={{
                      width: '100%',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '0.78rem',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div 
              style={{ 
                padding: '10px 18px', 
                borderTop: '1px solid var(--border-color)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.35)' 
              }}
            >
              <div>
                {hasExistingNote && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="btn btn-secondary"
                    style={{ 
                      padding: '5px 10px', 
                      fontSize: '0.75rem', 
                      color: '#ef4444', 
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px' 
                    }}
                    title="Delete note for this day"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="btn btn-primary"
                  style={{ 
                    padding: '6px 18px', 
                    fontSize: '0.82rem', 
                    fontWeight: 700, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #0a84ff 0%, #0071e3 100%)',
                    boxShadow: '0 4px 12px rgba(10, 132, 255, 0.35)'
                  }}
                >
                  <Save size={14} />
                  <span>Save Day-End Note</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ================= TAB 2: ALL SAVED NOTES (HISTORY) ================= */
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Search Header */}
            <div 
              style={{ 
                padding: '10px 18px', 
                background: 'rgba(0, 0, 0, 0.25)', 
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}
            >
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes, lessons, mindset, or date..."
                  style={{
                    width: '100%',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '5px 10px 5px 32px',
                    fontSize: '0.78rem',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {filteredRecordedNotes.length} Note{filteredRecordedNotes.length !== 1 ? 's' : ''} recorded
              </div>
            </div>

            {/* Notes List Feed */}
            <div style={{ padding: '16px 18px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredRecordedNotes.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <BookOpen size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.9rem', fontWeight: 650, marginBottom: '6px' }}>
                    {searchQuery ? 'No notes matching your search.' : 'No Day-End Notes recorded yet.'}
                  </p>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Switch to the "Write / Edit Note" tab to add your first day-end reflection!
                  </p>
                </div>
              ) : (
                filteredRecordedNotes.map((note) => {
                  // Get day trading trades context for this card
                  const noteDayTrades = allTrades.filter(t => (t.exitDate || t.date) === note.date);
                  const noteNetPnL = noteDayTrades.reduce((sum, t) => sum + (t.netPnL || 0), 0);

                  return (
                    <div 
                      key={note.date}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        transition: 'border-color 0.15s ease'
                      }}
                    >
                      {/* Note Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 750, color: 'var(--text-main)' }}>
                            📅 {note.date}
                          </span>

                          {/* P&L Badge */}
                          {noteDayTrades.length > 0 ? (
                            <span 
                              style={{ 
                                fontSize: '0.72rem', 
                                fontWeight: 750, 
                                fontFamily: 'var(--font-mono)',
                                color: noteNetPnL >= 0 ? '#10b981' : '#ef4444',
                                background: noteNetPnL >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                border: `1px solid ${noteNetPnL >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                padding: '2px 6px',
                                borderRadius: '5px'
                              }}
                            >
                              {isPnlVisible ? `${noteNetPnL >= 0 ? '+' : ''}₹${Math.round(noteNetPnL).toLocaleString('en-IN')}` : '••••'} ({noteDayTrades.length} Trades)
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '5px' }}>
                              ☕ No Trades
                            </span>
                          )}

                          {/* Rating */}
                          {note.rating && (
                            <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                              {[...Array(note.rating)].map((_, i) => (
                                <Star key={i} size={12} fill="#eab308" color="#eab308" />
                              ))}
                            </div>
                          )}

                          {/* Mood */}
                          {note.mood && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '5px', border: '1px solid var(--border-color)' }}>
                              {note.mood}
                            </span>
                          )}
                        </div>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDate(note.date);
                            setActiveTab('edit');
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '3px 10px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>
                      </div>

                      {/* Note Content */}
                      {note.notes && (
                        <div 
                          style={{ 
                            fontSize: '0.84rem', 
                            lineHeight: 1.6, 
                            color: 'var(--text-main)', 
                            whiteSpace: 'pre-wrap',
                            background: 'var(--bg-card)',
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                          }}
                        >
                          {note.notes}
                        </div>
                      )}

                      {/* Lesson or Tomorrow Plan Callouts */}
                      {(note.lessons || note.planForTomorrow) && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '8px', fontSize: '0.76rem' }}>
                          {note.lessons && (
                            <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.25)', padding: '6px 10px', borderRadius: '6px' }}>
                              <span style={{ fontWeight: 700, color: '#eab308' }}>💡 Key Lesson: </span>
                              <span style={{ color: 'var(--text-main)' }}>{note.lessons}</span>
                            </div>
                          )}
                          {note.planForTomorrow && (
                            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '6px 10px', borderRadius: '6px' }}>
                              <span style={{ fontWeight: 700, color: '#38bdf8' }}>🎯 Tomorrow's Plan: </span>
                              <span style={{ color: 'var(--text-main)' }}>{note.planForTomorrow}</span>
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
        )}
      </div>
    </div>,
    document.body
  );
}
