import { useState, useEffect, useMemo } from 'react';
import { X, Save, Star, Calendar, CheckCircle2, AlertTriangle, Target, BookOpen } from 'lucide-react';
import { useTradeStore } from '../store/useTradeStore';
import { filterTradesByFY } from '../utils/fyHelper';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
};

interface WeeklyJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWeekId?: string | null;
}

export function WeeklyJournalModal({ isOpen, onClose, initialWeekId }: WeeklyJournalModalProps) {
  const { 
    trades: allTrades, 
    selectedFY, 
    weeklyRetrospectives, 
    saveWeeklyRetrospective,
    isPnlVisible 
  } = useTradeStore();

  const fyTrades = useMemo(() => filterTradesByFY(allTrades, selectedFY), [allTrades, selectedFY]);

  // Group trades by week YYYY-Www
  const weeksList = useMemo(() => {
    const map: Record<string, { weekNum: number; startDate: string; endDate: string; trades: typeof fyTrades }> = {};

    fyTrades.forEach((t) => {
      const d = new Date(t.date);
      const oneJan = new Date(d.getFullYear(), 0, 1);
      const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
      const weekNum = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
      const weekId = `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;

      if (!map[weekId]) {
        map[weekId] = {
          weekNum,
          startDate: t.date,
          endDate: t.date,
          trades: []
        };
      }
      map[weekId].trades.push(t);
      if (t.date < map[weekId].startDate) map[weekId].startDate = t.date;
      if (t.date > map[weekId].endDate) map[weekId].endDate = t.date;
    });

    return Object.entries(map).map(([weekId, data]) => ({
      weekId,
      ...data
    })).sort((a, b) => b.weekId.localeCompare(a.weekId));
  }, [fyTrades]);

  const defaultWeek = weeksList[0]?.weekId || `${new Date().getFullYear()}-W28`;
  const [selectedWeekId, setSelectedWeekId] = useState<string>(initialWeekId || defaultWeek);

  // Form State
  const [rating, setRating] = useState<number>(5);
  const [winsText, setWinsText] = useState<string>('');
  const [mistakesText, setMistakesText] = useState<string>('');
  const [goalsText, setGoalsText] = useState<string>('');
  const [saveMessage, setSaveMessage] = useState<string>('');

  // Load existing reflection when selectedWeekId changes
  useEffect(() => {
    if (initialWeekId) {
      setSelectedWeekId(initialWeekId);
    }
  }, [initialWeekId]);

  useEffect(() => {
    const raw = weeklyRetrospectives[selectedWeekId];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
          setRating(parsed.rating || 5);
          setWinsText(parsed.wins || '');
          setMistakesText(parsed.mistakes || '');
          setGoalsText(parsed.goals || '');
          return;
        }
      } catch (e) {
        // Plain text fallback
        setWinsText(raw);
        setMistakesText('');
        setGoalsText('');
        setRating(5);
        return;
      }
    }
    setRating(5);
    setWinsText('');
    setMistakesText('');
    setGoalsText('');
  }, [selectedWeekId, weeklyRetrospectives]);

  const currentWeekObj = weeksList.find(w => w.weekId === selectedWeekId);
  const weekTrades = currentWeekObj?.trades || [];
  
  const weekNetPnL = weekTrades.reduce((sum, t) => sum + t.netPnL, 0);
  const weekWinCount = weekTrades.filter(t => t.netPnL > 0).length;
  const weekWinRate = weekTrades.length > 0 ? (weekWinCount / weekTrades.length) * 100 : 0;
  const weekCharges = weekTrades.reduce((sum, t) => sum + t.brokerage + t.taxes, 0);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = JSON.stringify({
      rating,
      wins: winsText.trim(),
      mistakes: mistakesText.trim(),
      goals: goalsText.trim(),
      updatedAt: new Date().toISOString()
    });

    saveWeeklyRetrospective(selectedWeekId, payload);
    setSaveMessage('Weekly Reflection Journal saved successfully! ✨');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div 
        className="modal-content glass-card animate-scale-up" 
        style={{ 
          width: '820px', 
          maxWidth: '95vw', 
          padding: 0, 
          maxHeight: '92vh', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden' 
        }}
      >
        {/* Modal Header */}
        <div 
          className="modal-header" 
          style={{ 
            padding: '16px 24px', 
            borderBottom: '1px solid var(--border-color)', 
            display: 'flex', 
            justify: 'space-between', 
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--primary)' }}>
              <BookOpen size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Guided Weekly Reflection & Journal</h3>
              <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Audit your weekly execution, mindset, mistakes, and next week's strategic focus.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="btn btn-secondary" 
            style={{ border: 'none', padding: '6px', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Week Selector & Performance Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="var(--primary)" />
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Select Week:</span>
                <select 
                  value={selectedWeekId} 
                  onChange={(e) => setSelectedWeekId(e.target.value)}
                  className="input-field"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', minWidth: '220px', borderRadius: '8px' }}
                >
                  {weeksList.map((w) => (
                    <option key={w.weekId} value={w.weekId}>
                      {w.weekId} ({w.startDate} to {w.endDate}) - {w.trades.length} Trades
                    </option>
                  ))}
                  {weeksList.length === 0 && (
                    <option value={selectedWeekId}>{selectedWeekId}</option>
                  )}
                </select>
              </div>

              {/* Weekly Performance Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>WEEKLY NET P&L</span>
                  <strong style={{ fontSize: '0.88rem', color: weekNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                    {isPnlVisible ? `${weekNetPnL >= 0 ? '+' : ''}${formatCurrency(weekNetPnL)}` : '••••'}
                  </strong>
                </div>
                <div style={{ width: '1px', height: '18px', background: 'var(--border-color)' }} />
                <div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>TRADES / WIN %</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {weekTrades.length} Trades ({weekWinRate.toFixed(0)}%)
                  </span>
                </div>
                <div style={{ width: '1px', height: '18px', background: 'var(--border-color)' }} />
                <div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>CHARGES</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {isPnlVisible ? formatCurrency(weekCharges) : '••••'}
                  </span>
                </div>
              </div>
            </div>

            {/* Rating Stars Section */}
            <div className="glass-card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block' }}>Weekly Discipline & Rule Execution Score</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Rate how well you adhered to your trading plan and risk limits.</span>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                    title={`Rate ${star} Star${star > 1 ? 's' : ''}`}
                  >
                    <Star 
                      size={22} 
                      color={star <= rating ? '#fbbf24' : 'var(--text-dim)'} 
                      fill={star <= rating ? '#fbbf24' : 'transparent'} 
                    />
                  </button>
                ))}
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fbbf24', marginLeft: '6px', width: '32px' }}>
                  {rating}/5
                </span>
              </div>
            </div>

            {/* Prompt 1: Wins & Execution */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-win)' }}>
                <CheckCircle2 size={16} />
                <span>1. What Went Well This Week? (Wins & Good Execution)</span>
              </label>
              <textarea
                value={winsText}
                onChange={(e) => setWinsText(e.target.value)}
                placeholder="e.g., Followed stop loss strictly on Tuesday, waited for confirmation on VWAP breakout, kept position sizing small..."
                className="input-field"
                rows={3}
                style={{ fontSize: '0.82rem', padding: '10px', resize: 'vertical' }}
              />
            </div>

            {/* Prompt 2: Mistakes & Lessons Learned */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171' }}>
                <AlertTriangle size={16} />
                <span>2. What Mistakes Were Made & Lessons Learned?</span>
              </label>
              <textarea
                value={mistakesText}
                onChange={(e) => setMistakesText(e.target.value)}
                placeholder="e.g., FOMO entry on Thursday expiry, exited early on winning trade due to fear, overtraded during choppy morning session..."
                className="input-field"
                rows={3}
                style={{ fontSize: '0.82rem', padding: '10px', resize: 'vertical' }}
              />
            </div>

            {/* Prompt 3: Action Plan & Goals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa' }}>
                <Target size={16} />
                <span>3. Key Focus & Strategic Rules for Next Week</span>
              </label>
              <textarea
                value={goalsText}
                onChange={(e) => setGoalsText(e.target.value)}
                placeholder="e.g., Maximum 2 trades per day limit, wait for 15-min candle close before entry, no trades in first 5 minutes of market open..."
                className="input-field"
                rows={3}
                style={{ fontSize: '0.82rem', padding: '10px', resize: 'vertical' }}
              />
            </div>

            {saveMessage && (
              <div style={{ color: '#34d399', fontSize: '0.8rem', fontWeight: 650, background: 'rgba(52, 211, 153, 0.12)', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                {saveMessage}
              </div>
            )}

          </div>

          {/* Modal Footer Actions */}
          <div 
            className="modal-footer" 
            style={{ 
              padding: '16px 24px', 
              borderTop: '1px solid var(--border-color)', 
              display: 'flex', 
              justify: 'space-between', 
              alignItems: 'center',
              background: 'rgba(255,255,255,0.02)' 
            }}
          >
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              🔒 Saved securely in local diary memory and synced with your cloud profile.
            </span>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.8rem' }}
              >
                Close
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '8px 20px', fontSize: '0.8rem', gap: '8px', fontWeight: 700 }}
              >
                <Save size={16} />
                <span>Save Weekly Journal</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
