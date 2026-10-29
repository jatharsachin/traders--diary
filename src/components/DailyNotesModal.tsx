import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Save, Trash2, ChevronLeft, ChevronRight, CheckCircle2, 
  AlertCircle, List, ListOrdered, CheckSquare, Bold, BookOpenCheck
} from 'lucide-react';
import { useTradeStore } from '../store/useTradeStore';

interface DailyNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string; // YYYY-MM-DD
  activeAccountId?: string;
}

export function DailyNotesModal({ 
  isOpen, 
  onClose, 
  initialDate 
}: DailyNotesModalProps) {
  const { 
    dailyNotes, 
    saveDailyNote, 
    deleteDailyNote 
  } = useTradeStore();

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || getTodayStr());
  const [notesText, setNotesText] = useState<string>('');
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
      setLessonsText(existing.lessons || '');
      setPlanForTomorrow(existing.planForTomorrow || '');
    } else {
      setNotesText('');
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

  const insertTemplatePoint = (pointName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const text = textarea.value;
    const lastNewline = text.lastIndexOf('\n', start - 1);
    const isLineStart = start === 0 || lastNewline === start - 1;
    const prefix = isLineStart ? `• ${pointName}: ` : `\n• ${pointName}: `;
    insertAtCursor(prefix);
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
          e.preventDefault();
          const newText = text.substring(0, lineStart) + text.substring(start);
          setNotesText(newText);
          setTimeout(() => textarea.setSelectionRange(lineStart, lineStart), 0);
        } else {
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
          e.preventDefault();
          const newText = text.substring(0, lineStart) + text.substring(start);
          setNotesText(newText);
          setTimeout(() => textarea.setSelectionRange(lineStart, lineStart), 0);
        } else {
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
    if (!notesText.trim() && !lessonsText.trim() && !planForTomorrow.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Please enter your notes before saving.' });
      return;
    }

    saveDailyNote(selectedDate, {
      date: selectedDate,
      notes: notesText.trim(),
      lessons: lessonsText.trim(),
      planForTomorrow: planForTomorrow.trim(),
    });

    setFeedbackMsg({ type: 'success', text: `✓ Note for ${selectedDate} saved!` });
    setTimeout(() => {
      setFeedbackMsg(null);
      onClose();
    }, 1200);
  };

  // Delete handler
  const handleDelete = () => {
    if (!dailyNotes[selectedDate]) return;
    if (window.confirm(`Are you sure you want to delete the Day-End Note for ${selectedDate}?`)) {
      deleteDailyNote(selectedDate);
      setNotesText('');
      setLessonsText('');
      setPlanForTomorrow('');
      setFeedbackMsg({ type: 'success', text: `Note deleted.` });
      setTimeout(() => {
        onClose();
      }, 800);
    }
  };

  if (!isOpen) return null;

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
          width: '740px', 
          maxWidth: '96vw', 
          maxHeight: '90vh',
          padding: 0,
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          border: '1px solid var(--border-color)',
          background: 'rgba(20, 20, 24, 0.98)',
          backdropFilter: 'blur(20px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Header */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpenCheck size={18} color="#38bdf8" />
            <span style={{ fontSize: '0.95rem', fontWeight: 750, color: 'var(--text-main)' }}>
              Day-End Note
            </span>
          </div>

          <button 
            onClick={onClose} 
            className="btn btn-secondary" 
            style={{ 
              width: '30px', 
              height: '30px', 
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

        {/* Clean Date Navigation Bar */}
        <div 
          style={{ 
            padding: '8px 18px', 
            background: 'rgba(0, 0, 0, 0.25)', 
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => handleShiftDate(-1)}
              className="btn btn-secondary"
              style={{ padding: '3px 7px', fontSize: '0.74rem' }}
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
              style={{ padding: '3px 7px', fontSize: '0.74rem' }}
              title="Next Day"
            >
              <ChevronRight size={14} />
            </button>

            {!isToday && (
              <button
                onClick={handleSetToday}
                className="btn btn-secondary"
                style={{ padding: '3px 8px', fontSize: '0.72rem', fontWeight: 600, color: '#38bdf8' }}
              >
                Today
              </button>
            )}
          </div>

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

        {/* Body: Pure Note Writing Experience */}
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
          {feedbackMsg && (
            <div 
              style={{ 
                padding: '7px 12px', 
                borderRadius: '8px', 
                fontSize: '0.78rem', 
                fontWeight: 600,
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                background: feedbackMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: feedbackMsg.type === 'success' ? '#10b981' : '#ef4444',
                border: feedbackMsg.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)'
              }}
            >
              {feedbackMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Notes Container */}
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              borderRadius: '10px', 
              border: '1px solid var(--border-color)', 
              background: 'var(--bg-card)',
              overflow: 'hidden'
            }}
          >
            {/* Minimal Toolbar & Quick Points */}
            <div 
              style={{ 
                padding: '6px 10px', 
                borderBottom: '1px solid var(--border-color)', 
                background: 'rgba(255, 255, 255, 0.02)',
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                flexWrap: 'wrap'
              }}
            >
              {/* Formatting tools */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  type="button"
                  onClick={insertBullet}
                  className="btn btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Bullet List (• Bullet)"
                >
                  <List size={13} color="#38bdf8" />
                  <span>Bullet</span>
                </button>

                <button
                  type="button"
                  onClick={insertNumbering}
                  className="btn btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Numbered List (1. 2. 3.)"
                >
                  <ListOrdered size={13} color="#38bdf8" />
                  <span>Number</span>
                </button>

                <button
                  type="button"
                  onClick={insertCheckbox}
                  className="btn btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Checkbox (☐ Task)"
                >
                  <CheckSquare size={13} color="#10b981" />
                  <span>Task</span>
                </button>

                <button
                  type="button"
                  onClick={() => insertAtCursor('**', '**')}
                  className="btn btn-secondary"
                  style={{ padding: '3px 8px', fontSize: '0.74rem', fontWeight: 700 }}
                  title="Bold"
                >
                  <Bold size={13} />
                </button>
              </div>

              <div style={{ width: '1px', height: '16px', background: 'var(--border-color)', margin: '0 2px' }} />

              {/* Quick Structure Points */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Quick Insert:
                </span>

                {[
                  { label: 'Market Trend', text: 'Market Trend' },
                  { label: 'What went well', text: 'What went well' },
                  { label: 'Traps / Mistakes', text: 'Traps / Mistakes' },
                  { label: 'Mindset', text: 'Mindset' },
                  { label: 'Tomorrow', text: 'Tomorrow\'s Focus' },
                ].map(point => (
                  <button
                    key={point.label}
                    type="button"
                    onClick={() => insertTemplatePoint(point.text)}
                    className="btn btn-secondary"
                    style={{
                      padding: '2px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderColor: 'rgba(255, 255, 255, 0.08)'
                    }}
                    title={`Insert • ${point.text}: `}
                  >
                    <span style={{ color: '#38bdf8', fontWeight: 700 }}>+</span>
                    <span>{point.label}</span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const fullTemplate = `• Market Trend: \n• What went well: \n• Traps / Mistakes: \n• Mindset: \n• Tomorrow's Focus: `;
                    if (!notesText.trim()) {
                      setNotesText(fullTemplate);
                    } else {
                      const prefix = notesText.endsWith('\n') ? '' : '\n';
                      setNotesText(prev => prev + prefix + fullTemplate);
                    }
                    setTimeout(() => textareaRef.current?.focus(), 10);
                  }}
                  className="btn btn-secondary"
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 650,
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#38bdf8',
                    borderColor: 'rgba(56, 189, 248, 0.3)',
                    background: 'rgba(56, 189, 248, 0.06)'
                  }}
                  title="Insert full uniform structure template"
                >
                  <span>📋 + All Structure</span>
                </button>
              </div>
            </div>

            {/* Clean Textarea */}
            <textarea
              ref={textareaRef}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="दिवसभरातील महत्त्वाच्या नोंदी इथे लिहा...&#10;• Market Trend: &#10;• Execution & Setup: &#10;• Mindset & Psychology: "
              rows={9}
              style={{
                width: '100%',
                background: 'transparent',
                color: 'var(--text-main)',
                border: 'none',
                padding: '12px 14px',
                fontSize: '0.88rem',
                fontFamily: 'inherit',
                lineHeight: 1.65,
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Simple 2 Sub-fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                💡 Key Lesson from Today (Optional):
              </label>
              <input
                type="text"
                value={lessonsText}
                onChange={(e) => setLessonsText(e.target.value)}
                placeholder="उदा. Always follow stoploss strictly"
                style={{
                  width: '100%',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: 650, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                🎯 Focus for Tomorrow (Optional):
              </label>
              <input
                type="text"
                value={planForTomorrow}
                onChange={(e) => setPlanForTomorrow(e.target.value)}
                placeholder="उदा. Nifty Expiry - trade with small size"
                style={{
                  width: '100%',
                  background: 'var(--bg-card)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>
        </div>

        {/* Minimal Footer */}
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
                background: 'linear-gradient(135deg, #0a84ff 0%, #0071e3 100%)'
              }}
            >
              <Save size={14} />
              <span>Save Note</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
