import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Save, Trash2, ChevronLeft, ChevronRight, CheckCircle2, 
  AlertCircle, List, ListOrdered, CheckSquare, Bold, Italic, 
  Underline, Strikethrough, BookOpenCheck, Palette, Type
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
  const [lessonsText, setLessonsText] = useState<string>('');
  const [planForTomorrow, setPlanForTomorrow] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Font family, size, and font color customization
  const [editorFontFamily, setEditorFontFamily] = useState<string>(() => {
    return localStorage.getItem('traders_diary_notes_font_family') || 'sans';
  });
  const [editorFontSize, setEditorFontSize] = useState<string>(() => {
    return localStorage.getItem('traders_diary_notes_font_size') || '16px';
  });
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [selectedTextColor, setSelectedTextColor] = useState<string>('#38bdf8');

  const editorRef = useRef<HTMLDivElement>(null);

  const getFontFamilyStyle = (fontKey: string) => {
    switch (fontKey) {
      case 'mono':
        return 'Consolas, "Courier New", monospace';
      case 'serif':
        return 'Georgia, Cambria, "Times New Roman", serif';
      case 'trebuchet':
        return '"Trebuchet MS", "Lucida Grande", sans-serif';
      default:
        return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    }
  };

  const handleFontFamilyChange = (font: string) => {
    setEditorFontFamily(font);
    localStorage.setItem('traders_diary_notes_font_family', font);
    if (editorRef.current) {
      editorRef.current.style.fontFamily = getFontFamilyStyle(font);
    }
  };

  const handleFontSizeChange = (size: string) => {
    setEditorFontSize(size);
    localStorage.setItem('traders_diary_notes_font_size', size);
    if (editorRef.current) {
      editorRef.current.style.fontSize = size;
    }
  };

  // Sync initial date & content when modal opens or date changes
  useEffect(() => {
    if (isOpen) {
      const targetDate = initialDate || getTodayStr();
      setSelectedDate(targetDate);
      loadNoteForDate(targetDate);
      setFeedbackMsg(null);
    }
  }, [isOpen, initialDate]);

  const loadNoteForDate = (dateStr: string) => {
    const existing = dailyNotes[dateStr];
    if (existing) {
      const notes = existing.notes || '';
      if (editorRef.current) {
        if (notes && !notes.includes('<')) {
          editorRef.current.innerHTML = notes.replace(/\n/g, '<br/>');
        } else {
          editorRef.current.innerHTML = notes;
        }
      }
      setLessonsText(existing.lessons || '');
      setPlanForTomorrow(existing.planForTomorrow || '');
    } else {
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
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

  // WYSIWYG Document Executive Formatter
  const executeFormat = (command: string, value: string | undefined = undefined) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  };

  // Insert HTML at cursor inside contentEditable
  const insertHtmlAtCursor = (htmlSnippet: string) => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const el = document.createElement('div');
      el.innerHTML = htmlSnippet;
      const frag = document.createDocumentFragment();
      let node: Node | null;
      let lastNode: Node | null = null;
      while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);
      if (lastNode) {
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } else {
      if (editorRef.current) {
        editorRef.current.innerHTML += htmlSnippet;
      }
    }
  };

  // Save handler
  const handleSave = () => {
    const editorContent = editorRef.current ? editorRef.current.innerHTML.trim() : '';
    const plainText = editorRef.current ? (editorRef.current.innerText || '').trim() : '';

    if (!plainText && !lessonsText.trim() && !planForTomorrow.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Please enter your notes before saving.' });
      return;
    }

    saveDailyNote(selectedDate, {
      date: selectedDate,
      notes: editorContent,
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
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
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

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 99999 }} onClick={onClose}>
      <div 
        className="modal-content glass-card animate-scale-up" 
        style={{ 
          width: '780px', 
          maxWidth: '96vw', 
          maxHeight: '92vh',
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
            {/* MS Word-Style Toolbar & Quick Points */}
            <div 
              style={{ 
                padding: '8px 10px', 
                borderBottom: '1px solid var(--border-color)', 
                background: 'rgba(255, 255, 255, 0.02)',
                display: 'flex', 
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {/* Row 1: MS Word Formatting Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {/* Font Family & Size Selectors */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <select
                    value={editorFontFamily}
                    onChange={(e) => handleFontFamilyChange(e.target.value)}
                    style={{
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '4px 6px',
                      fontSize: '0.74rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    title="Font Family"
                  >
                    <option value="sans">Font: Default (Clean)</option>
                    <option value="mono">Font: Terminal / Code (Courier)</option>
                    <option value="serif">Font: Classic Serif (Georgia)</option>
                    <option value="trebuchet">Font: Modern (Trebuchet)</option>
                  </select>

                  <select
                    value={editorFontSize}
                    onChange={(e) => handleFontSizeChange(e.target.value)}
                    style={{
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      padding: '4px 6px',
                      fontSize: '0.74rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    title="Font Size"
                  >
                    <option value="13px">Size: Small (13px)</option>
                    <option value="16px">Size: Normal (16px)</option>
                    <option value="20px">Size: Large (20px)</option>
                    <option value="24px">Size: Extra Large (24px)</option>
                  </select>
                </div>

                <div style={{ width: '1px', height: '18px', background: 'var(--border-color)', margin: '0 2px' }} />

                {/* MS Word-Style Formatting Tools */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => executeFormat('bold')}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.76rem', fontWeight: 850, minWidth: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Bold (Ctrl+B)"
                  >
                    <Bold size={13} />
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => executeFormat('italic')}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.76rem', minWidth: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Italic (Ctrl+I)"
                  >
                    <Italic size={13} />
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => executeFormat('underline')}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.76rem', minWidth: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Underline (Ctrl+U)"
                  >
                    <Underline size={13} />
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => executeFormat('strikeThrough')}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.76rem', minWidth: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Strikethrough"
                  >
                    <Strikethrough size={13} />
                  </button>

                  {/* Font Color Picker Popover */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIsColorPickerOpen(prev => !prev);
                      }}
                      className="btn btn-secondary"
                      style={{ 
                        padding: '3px 8px', 
                        fontSize: '0.74rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '5px',
                        borderColor: isColorPickerOpen ? '#38bdf8' : 'var(--border-color)' 
                      }}
                      title="Font Color (Text Highlight)"
                    >
                      <Palette size={13} color={selectedTextColor} />
                      <span 
                        style={{ 
                          width: '10px', 
                          height: '10px', 
                          borderRadius: '50%', 
                          background: selectedTextColor,
                          boxShadow: `0 0 6px ${selectedTextColor}88`
                        }} 
                      />
                    </button>

                    {isColorPickerOpen && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: '0',
                          marginTop: '6px',
                          background: 'rgba(20, 20, 26, 0.98)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          padding: '8px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 22px)',
                          gap: '6px',
                          zIndex: 100,
                          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                          backdropFilter: 'blur(16px)'
                        }}
                      >
                        {[
                          { hex: '#ffffff', name: 'White' },
                          { hex: '#10b981', name: 'Green (Profit/Win)' },
                          { hex: '#ef4444', name: 'Red (Loss/Error)' },
                          { hex: '#38bdf8', name: 'Sky Blue (Trend/Levels)' },
                          { hex: '#f59e0b', name: 'Amber (Trap/Warning)' },
                          { hex: '#a855f7', name: 'Purple (Mindset)' },
                          { hex: '#f97316', name: 'Orange (Trigger)' },
                          { hex: '#14b8a6', name: 'Teal (Observation)' },
                        ].map(color => (
                          <button
                            key={color.hex}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSelectedTextColor(color.hex);
                              setIsColorPickerOpen(false);
                              executeFormat('foreColor', color.hex);
                            }}
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              background: color.hex,
                              border: selectedTextColor === color.hex ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                              cursor: 'pointer',
                              transition: 'transform 0.15s ease'
                            }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ width: '1px', height: '18px', background: 'var(--border-color)', margin: '0 2px' }} />

                {/* Lists and Tasks */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => executeFormat('insertUnorderedList')}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Bullet List"
                  >
                    <List size={13} color="#38bdf8" />
                    <span>Bullet</span>
                  </button>

                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => executeFormat('insertOrderedList')}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Numbered List"
                  >
                    <ListOrdered size={13} color="#38bdf8" />
                    <span>Number</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Quick Structure Points */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Quick Insert:
                </span>

                {[
                  { label: 'Market Opening', text: 'Market Opening' },
                  { label: 'Market Trend', text: 'Market Trend' },
                  { label: 'What went well', text: 'What went well' },
                  { label: 'Traps / Mistakes', text: 'Traps / Mistakes' },
                  { label: 'Mindset', text: 'Mindset' },
                  { label: 'Tomorrow', text: 'Tomorrow\'s Focus' },
                ].map(point => (
                  <button
                    key={point.label}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      insertHtmlAtCursor(`<div>• <b>${point.text}:</b>&nbsp;</div>`);
                    }}
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
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const fullTemplate = `<div>• <b>Market Opening:</b>&nbsp;</div><div>• <b>Market Trend:</b>&nbsp;</div><div>• <b>What went well:</b>&nbsp;</div><div>• <b>Traps / Mistakes:</b>&nbsp;</div><div>• <b>Mindset:</b>&nbsp;</div><div>• <b>Tomorrow's Focus:</b>&nbsp;</div>`;
                    if (editorRef.current) {
                      const plain = editorRef.current.innerText || '';
                      if (!plain.trim()) {
                        editorRef.current.innerHTML = fullTemplate;
                      } else {
                        editorRef.current.innerHTML += `<br/>${fullTemplate}`;
                      }
                      editorRef.current.focus();
                    }
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

            {/* WYSIWYG contentEditable Document Area */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              style={{
                width: '100%',
                minHeight: '220px',
                maxHeight: '400px',
                overflowY: 'auto',
                background: 'transparent',
                color: 'var(--text-main)',
                border: 'none',
                padding: '14px 16px',
                fontSize: editorFontSize,
                fontFamily: getFontFamilyStyle(editorFontFamily),
                lineHeight: 1.65,
                outline: 'none',
                wordBreak: 'break-word'
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
                  padding: '7px 10px',
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
                  padding: '7px 10px',
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
            padding: '12px 18px', 
            borderTop: '1px solid var(--border-color)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)' 
          }}
        >
          <div>
            {dailyNotes[selectedDate] && (
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
                title="Delete this note"
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
                padding: '6px 16px', 
                fontSize: '0.8rem', 
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: '8px'
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
