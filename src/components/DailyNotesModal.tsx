import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Save, Trash2, Calendar, Star, ChevronLeft, ChevronRight, 
  CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, BookOpenCheck,
  TrendingUp, TrendingDown, Target, Clock, AlertCircle
} from 'lucide-react';
import { useTradeStore } from '../store/useTradeStore';
import { formatTradeMistakes, getTradeMistakes } from '../types';

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

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || getTodayStr());
  const [notesText, setNotesText] = useState<string>('');
  const [rating, setRating] = useState<number>(5);
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [rulesFollowed, setRulesFollowed] = useState<string>('YES');
  const [lessonsText, setLessonsText] = useState<string>('');
  const [planForTomorrow, setPlanForTomorrow] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // Day's Trades Summary (Read-Only Context)
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
    const grossPnL = dayTrades.reduce((sum, t) => sum + (t.grossPnL || 0), 0);
    const totalCharges = dayTrades.reduce((sum, t) => sum + ((t.brokerage || 0) + (t.taxes || 0)), 0);
    const winTrades = dayTrades.filter(t => (t.netPnL || 0) > 0);
    const lossTrades = dayTrades.filter(t => (t.netPnL || 0) < 0);
    const winRate = count > 0 ? (winTrades.length / count) * 100 : 0;
    
    // Day mistakes
    const mistakes = dayTrades.flatMap(t => getTradeMistakes(t));

    return { count, netPnL, grossPnL, totalCharges, wins: winTrades.length, losses: lossTrades.length, winRate, mistakes };
  }, [dayTrades]);

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

  // Save handler
  const handleSave = () => {
    if (!notesText.trim() && !lessonsText.trim() && !planForTomorrow.trim() && !selectedMood) {
      setFeedbackMsg({ type: 'error', text: 'Please enter at least some notes or reflection before saving.' });
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

  // Quick insertion helpers for notes
  const handleAppendTemplate = (text: string) => {
    setNotesText(prev => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed}\n• ${text}: ` : `• ${text}: `;
    });
  };

  if (!isOpen) return null;

  // Formatted date string (e.g. "Thursday, 29 October 2026")
  const dateObj = (() => {
    try {
      const parts = selectedDate.split('-');
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } catch {
      return new Date();
    }
  })();

  const formattedDateTitle = dateObj.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
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
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 24px rgba(10, 132, 255, 0.25)',
          border: '1px solid var(--border-color)',
          background: 'rgba(20, 20, 24, 0.94)',
          backdropFilter: 'blur(20px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div 
          style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid var(--border-color)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 100%)' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(168, 85, 247, 0.25) 100%)', 
                border: '1px solid rgba(56, 189, 248, 0.4)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#38bdf8' 
              }}
            >
              <BookOpenCheck size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.18rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Day-End Notes & Reflection</span>
                <span 
                  style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 650, 
                    padding: '2px 8px', 
                    borderRadius: '12px', 
                    background: hasExistingNote ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                    color: hasExistingNote ? '#10b981' : '#38bdf8',
                    border: hasExistingNote ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(56, 189, 248, 0.3)'
                  }}
                >
                  {hasExistingNote ? 'Note Recorded' : 'New Entry'}
                </span>
              </h2>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                दिवसभरातील मार्केट अनुभव, ट्रेडिंग सायकॉलॉजी, नियम पालन आणि उद्याचा प्लॅन
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="btn btn-secondary" 
            style={{ 
              width: '34px', 
              height: '34px', 
              padding: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: '50%',
              cursor: 'pointer' 
            }}
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Date Selector Navigation Bar */}
        <div 
          style={{ 
            padding: '10px 20px', 
            background: 'rgba(0, 0, 0, 0.25)', 
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => handleShiftDate(-1)}
              className="btn btn-secondary"
              style={{ padding: '5px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Previous Day"
            >
              <ChevronLeft size={16} />
              <span className="hide-mobile">Prev Day</span>
            </button>
            <button
              onClick={() => handleShiftDate(1)}
              className="btn btn-secondary"
              style={{ padding: '5px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="Next Day"
            >
              <span className="hide-mobile">Next Day</span>
              <ChevronRight size={16} />
            </button>
            {!isToday && (
              <button
                onClick={handleSetToday}
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '0.78rem', fontWeight: 650, color: '#38bdf8' }}
              >
                Snap to Today
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
              {formattedDateTitle}
            </span>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              style={{
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1.5px solid var(--border-color)',
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '0.8rem',
                outline: 'none',
                fontFamily: 'inherit',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div 
          style={{ 
            padding: '20px', 
            overflowY: 'auto', 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px' 
          }}
        >
          {/* Day Automated Trading Context Widget */}
          <div 
            style={{ 
              padding: '12px 16px', 
              borderRadius: '14px', 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={15} color="var(--text-muted)" />
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Day's Automated Activity Snapshot
                </span>
                {activeAccountId !== 'Combined' && (
                  <span style={{ fontSize: '0.7rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                    Filtered Account
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {dayStats.count > 0 ? (
                  <span>{dayStats.wins} Wins • {dayStats.losses} Losses ({dayStats.winRate.toFixed(0)}% Win Rate)</span>
                ) : (
                  <span style={{ color: '#10b981', fontWeight: 600 }}>☕ No Trades Taken • Pure Observation / Disciplined Day</span>
                )}
              </div>
            </div>

            {dayStats.count > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '4px' }}>
                <div style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Trades Executed</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{dayStats.count} Trades</div>
                </div>

                <div style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Net Realized P&L</div>
                  <div style={{ 
                    fontSize: '0.95rem', 
                    fontWeight: 800, 
                    fontFamily: 'var(--font-mono)', 
                    color: dayStats.netPnL >= 0 ? '#10b981' : '#ef4444' 
                  }}>
                    {isPnlVisible ? `${dayStats.netPnL >= 0 ? '+' : ''}₹${Math.round(dayStats.netPnL).toLocaleString('en-IN')}` : '••••'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gross P&L</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: dayStats.grossPnL >= 0 ? '#10b981' : '#ef4444' }}>
                    {isPnlVisible ? `${dayStats.grossPnL >= 0 ? '+' : ''}₹${Math.round(dayStats.grossPnL).toLocaleString('en-IN')}` : '••••'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Brokerage & Taxes</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    ₹{Math.round(dayStats.totalCharges).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ) : null}

            {dayStats.mistakes.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 650 }}>Flagged Mistakes in Trades:</span>
                {dayStats.mistakes.map((m, idx) => (
                  <span 
                    key={idx}
                    style={{ 
                      fontSize: '0.68rem', 
                      background: 'rgba(239, 68, 68, 0.15)', 
                      color: '#f87171', 
                      padding: '2px 8px', 
                      borderRadius: '6px', 
                      border: '1px solid rgba(239, 68, 68, 0.3)' 
                    }}
                  >
                    ⚠️ {m}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Feedback banner */}
          {feedbackMsg && (
            <div 
              style={{ 
                padding: '10px 14px', 
                borderRadius: '10px', 
                fontSize: '0.82rem', 
                fontWeight: 650,
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: feedbackMsg.type === 'success' ? '#10b981' : '#ef4444',
                border: feedbackMsg.type === 'success' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)'
              }}
            >
              {feedbackMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Core Day-End Notes Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📝 Day-End Notes & Market Observations</span>
                <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 600 }}>* महत्त्वाच्या नोंदी</span>
              </label>

              {/* Quick Template Insert Pills */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: 'center' }}>Quick Insert:</span>
                <button
                  type="button"
                  onClick={() => handleAppendTemplate('Market Behavior & Trend')}
                  className="btn btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: '6px' }}
                >
                  + Market Trend
                </button>
                <button
                  type="button"
                  onClick={() => handleAppendTemplate('What went well')}
                  className="btn btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: '6px' }}
                >
                  + What went well
                </button>
                <button
                  type="button"
                  onClick={() => handleAppendTemplate('Mistakes / Traps avoided')}
                  className="btn btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: '6px' }}
                >
                  + Traps / Mistakes
                </button>
                <button
                  type="button"
                  onClick={() => handleAppendTemplate('Trading Mindset')}
                  className="btn btn-secondary"
                  style={{ padding: '2px 8px', fontSize: '0.7rem', borderRadius: '6px' }}
                >
                  + Mindset
                </button>
              </div>
            </div>

            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="आज दिवसभरातील मार्केट निरीक्षणे, ट्रेडिंग सायकोलॉजी, काय चांगले झाले, काय चुकले, आणि मुख्य नोंदी इथे लिहा...&#10;उदा.&#10;• Nifty 24,000 level वरून strong bounce दिला.&#10;• Morning session मध्ये घाई न करता breakout confirmation ची वाट बघितली, good patience!&#10;• SL strictly follow केला."
              rows={7}
              style={{
                width: '100%',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1.5px solid var(--border-color)',
                borderRadius: '12px',
                padding: '12px 14px',
                fontSize: '0.88rem',
                fontFamily: 'inherit',
                lineHeight: 1.6,
                outline: 'none',
                resize: 'vertical',
                transition: 'border-color 0.2s',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
          </div>

          {/* Quick Discipline & Psychology Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            {/* Day Rating */}
            <div style={{ background: 'var(--bg-card)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                ⭐ Day Performance Rating:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px',
                      color: s <= rating ? '#eab308' : 'rgba(255, 255, 255, 0.2)',
                      transition: 'transform 0.1s'
                    }}
                    title={`${s} Star${s > 1 ? 's' : ''}`}
                  >
                    <Star size={24} fill={s <= rating ? '#eab308' : 'none'} />
                  </button>
                ))}
                <span style={{ fontSize: '0.78rem', fontWeight: 650, color: 'var(--text-muted)', marginLeft: '6px' }}>
                  {rating === 5 ? 'Masterclass' : rating === 4 ? 'Good Discipline' : rating === 3 ? 'Average' : rating === 2 ? 'Need Improvement' : 'Strict Audit Required'}
                </span>
              </div>
            </div>

            {/* Trading Rules Adherence */}
            <div style={{ background: 'var(--bg-card)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                🛡️ Did You Follow Trading Rules?
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[
                  { value: 'YES', label: '100% Yes', color: '#10b981' },
                  { value: 'PARTIAL', label: 'Partially', color: '#f59e0b' },
                  { value: 'NO', label: 'No (Rule Break)', color: '#ef4444' }
                ].map(opt => {
                  const isSelected = rulesFollowed === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRulesFollowed(opt.value)}
                      style={{
                        flex: 1,
                        padding: '6px 4px',
                        borderRadius: '8px',
                        fontSize: '0.76rem',
                        fontWeight: 650,
                        cursor: 'pointer',
                        background: isSelected ? `${opt.color}25` : 'transparent',
                        color: isSelected ? opt.color : 'var(--text-muted)',
                        border: `1.5px solid ${isSelected ? opt.color : 'var(--border-color)'}`,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Psychology & Mindset Pills */}
          <div style={{ background: 'var(--bg-card)', padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
              🧠 Day Mindset & Emotional State:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {MOOD_OPTIONS.map(m => {
                const isSelected = selectedMood === m.label;
                return (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => setSelectedMood(isSelected ? '' : m.label)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: isSelected ? `${m.color}25` : 'rgba(255, 255, 255, 0.03)',
                      color: isSelected ? m.color : 'var(--text-main)',
                      border: `1px solid ${isSelected ? m.color : 'var(--border-color)'}`,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Key Lesson of the Day */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>💡 Key Lesson / Takeaway from Today</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(आजचा मुख्य धडा)</span>
            </label>
            <input
              type="text"
              value={lessonsText}
              onChange={(e) => setLessonsText(e.target.value)}
              placeholder="उदा. Never trade without stoploss; breakout वर घाई करायची नाही..."
              style={{
                width: '100%',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1.5px solid var(--border-color)',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '0.85rem',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Tomorrow's Plan & Watchlist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🎯 Plan, Focus & Levels for Tomorrow</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(उद्याचा ट्रेडिंग प्लॅन)</span>
            </label>
            <textarea
              value={planForTomorrow}
              onChange={(e) => setPlanForTomorrow(e.target.value)}
              placeholder="उद्याचे महत्त्वाचे लेव्हल्स, एक्सपायरी वॉचलिस्ट, रिस्क मॅनेजमेंट फोकस इथे लिहून ठेवा..."
              rows={3}
              style={{
                width: '100%',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1.5px solid var(--border-color)',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '0.85rem',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div 
          style={{ 
            padding: '14px 20px', 
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
                  padding: '6px 12px', 
                  fontSize: '0.78rem', 
                  color: '#ef4444', 
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px' 
                }}
                title="Delete note for this day"
              >
                <Trash2 size={14} />
                <span>Delete Note</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '7px 16px', fontSize: '0.82rem' }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary"
              style={{ 
                padding: '7px 20px', 
                fontSize: '0.84rem', 
                fontWeight: 700, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '7px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0a84ff 0%, #0071e3 100%)',
                boxShadow: '0 4px 14px rgba(10, 132, 255, 0.4)'
              }}
            >
              <Save size={15} />
              <span>Save Day-End Note</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
