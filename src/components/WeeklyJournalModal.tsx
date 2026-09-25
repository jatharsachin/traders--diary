import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Save, Star, Calendar, CheckCircle2, AlertTriangle, Target, 
  BookOpen, MessageSquare, AlertCircle, Clock, ShieldCheck, 
  ExternalLink, Sparkles, Filter, ChevronRight
} from 'lucide-react';
import { useTradeStore } from '../store/useTradeStore';
import { filterTradesByFY, formatTimeToAMPM } from '../utils/fyHelper';
import { getTradeMistakes } from '../types';
import { groupHedgedTrades } from '../utils/tradeGrouping';
import { BrokerBadge } from './BrokerBadge';

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
  onEditTrade?: (id: string) => void;
}

export function WeeklyJournalModal({ isOpen, onClose, initialWeekId, onEditTrade }: WeeklyJournalModalProps) {
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

  // Calculate current week
  const currentCalWeekId = useMemo(() => {
    const now = new Date();
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);
    return `${now.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
  }, []);

  const defaultWeek = weeksList.find(w => w.weekId === currentCalWeekId)?.weekId || weeksList[0]?.weekId || currentCalWeekId;
  const [selectedWeekId, setSelectedWeekId] = useState<string>(initialWeekId || defaultWeek);

  // Active view: 'notes' (Trade Notes & Mistakes Feed) | 'reflection' (Weekly Plan & Reflection)
  const [activeTab, setActiveTab] = useState<'notes' | 'reflection'>('notes');

  // Filter within notes feed: 'all' | 'mistakes' | 'notes' | 'losses'
  const [feedFilter, setFeedFilter] = useState<'all' | 'mistakes' | 'notes' | 'losses'>('all');

  // Form State for Reflection
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
  
  // Sort trades newest first (or by date/time)
  const sortedWeekTrades = useMemo(() => {
    return [...weekTrades].sort((a, b) => {
      const dateA = `${a.date} ${a.entryTime || '00:00'}`;
      const dateB = `${b.date} ${b.entryTime || '00:00'}`;
      return dateB.localeCompare(dateA);
    });
  }, [weekTrades]);

  // Group trades into positions (merging paired hedged spread legs)
  const groupedWeekPositions = useMemo(() => {
    return groupHedgedTrades(sortedWeekTrades);
  }, [sortedWeekTrades]);

  // Aggregate weekly mistakes and notes analytics
  const mistakeStats = useMemo(() => {
    const counts: Record<string, { count: number; loss: number }> = {};
    let totalMistakeTrades = 0;
    let totalMistakeLoss = 0;
    let totalNotesCount = 0;

    groupedWeekPositions.forEach(p => {
      if (p.notes && p.notes.trim().length > 0) {
        totalNotesCount++;
      }
      if (p.mistakes.length > 0) {
        totalMistakeTrades++;
        if (p.combinedNetPnL < 0) {
          totalMistakeLoss += Math.abs(p.combinedNetPnL);
        }
        p.mistakes.forEach(m => {
          if (!counts[m]) counts[m] = { count: 0, loss: 0 };
          counts[m].count++;
          if (p.combinedNetPnL < 0) counts[m].loss += Math.abs(p.combinedNetPnL);
        });
      }
    });

    const list = Object.entries(counts).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => b.count - a.count || b.loss - a.loss);

    return { list, totalMistakeTrades, totalMistakeLoss, totalNotesCount };
  }, [groupedWeekPositions]);

  // Filtered positions for the feed
  const filteredFeedPositions = useMemo(() => {
    return groupedWeekPositions.filter(p => {
      if (feedFilter === 'mistakes') {
        return p.mistakes.length > 0;
      }
      if (feedFilter === 'notes') {
        return p.notes && p.notes.trim().length > 0;
      }
      if (feedFilter === 'losses') {
        return p.combinedNetPnL < 0;
      }
      return true;
    });
  }, [groupedWeekPositions, feedFilter]);

  const weekNetPnL = weekTrades.reduce((sum, t) => sum + t.netPnL, 0);
  const weekWinCount = weekTrades.filter(t => t.netPnL > 0).length;
  const weekWinRate = weekTrades.length > 0 ? (weekWinCount / weekTrades.length) * 100 : 0;
  const weekCharges = weekTrades.reduce((sum, t) => sum + (t.brokerage || 0) + (t.taxes || 0), 0);

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

  const formatDateDisplay = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div 
        className="modal-content glass-card animate-scale-up" 
        style={{ 
          width: '920px', 
          maxWidth: '96vw', 
          padding: 0, 
          maxHeight: '94vh', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          borderRadius: '22px'
        }}
      >
        {/* Modal Header */}
        <div 
          className="modal-header" 
          style={{ 
            padding: '16px 22px', 
            borderBottom: '1px solid var(--border-color)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.25) 0%, rgba(191, 90, 242, 0.25) 100%)', 
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}>
              🗓️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, letterSpacing: '-0.01em' }}>
                  Weekend Review & Notes Audit
                </h3>
                <span style={{ 
                  fontSize: '0.68rem', 
                  fontWeight: 700, 
                  background: 'rgba(10, 132, 255, 0.15)', 
                  color: 'var(--primary)', 
                  padding: '2px 8px', 
                  borderRadius: '9999px',
                  border: '1px solid rgba(10, 132, 255, 0.25)'
                }}>
                  वीकेंड आत्मपरीक्षण
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                ह्या आठवड्यात ट्रेड लॉगमध्ये लिहिलेल्या सर्व नोट्स, चुका व भावनांचा सविस्तर रिव्ह्यू.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="btn btn-secondary" 
            style={{ border: 'none', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Week Selector Bar & Key Performance Metrics */}
        <div style={{ 
          padding: '12px 22px', 
          borderBottom: '1px solid var(--border-color)', 
          background: 'rgba(0, 0, 0, 0.18)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Week Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>निवडा आठवडा:</span>
            <select 
              value={selectedWeekId} 
              onChange={(e) => setSelectedWeekId(e.target.value)}
              className="input-field"
              style={{ 
                padding: '5px 12px', 
                fontSize: '0.8rem', 
                minWidth: '240px', 
                borderRadius: '8px',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {weeksList.map((w) => (
                <option key={w.weekId} value={w.weekId}>
                  {w.weekId} ({w.startDate} to {w.endDate}) — {w.trades.length} Trades
                </option>
              ))}
              {weeksList.length === 0 && (
                <option value={selectedWeekId}>{selectedWeekId} (No Trades)</option>
              )}
            </select>
          </div>

          {/* Quick Stats Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(255,255,255,0.03)', padding: '5px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>WEEKLY NET P&L</span>
              <strong style={{ fontSize: '0.86rem', color: weekNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                {isPnlVisible ? `${weekNetPnL >= 0 ? '+' : ''}${formatCurrency(weekNetPnL)}` : '••••'}
              </strong>
            </div>
            <div style={{ width: '1px', height: '18px', background: 'var(--border-color)' }} />
            <div>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>TRADES / ACCURACY</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {weekTrades.length} Trades ({weekWinRate.toFixed(0)}%)
              </span>
            </div>
            <div style={{ width: '1px', height: '18px', background: 'var(--border-color)' }} />
            <div>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>NOTES & MISTAKES</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: mistakeStats.totalMistakeTrades > 0 ? '#f87171' : 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                📝 {mistakeStats.totalNotesCount} • ⚠️ {mistakeStats.totalMistakeTrades}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Toggle Navigation */}
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          padding: '10px 22px 0 22px', 
          borderBottom: '1px solid var(--border-color)', 
          background: 'rgba(255, 255, 255, 0.01)' 
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            style={{
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'notes' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              color: activeTab === 'notes' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <MessageSquare size={15} />
            <span>ट्रेड नोट्स व चुका (Trade Notes & Mistakes Feed)</span>
            <span style={{ 
              fontSize: '0.68rem', 
              padding: '1px 6px', 
              borderRadius: '9999px', 
              background: activeTab === 'notes' ? 'var(--primary-glow)' : 'rgba(255,255,255,0.06)',
              color: activeTab === 'notes' ? 'var(--primary)' : 'var(--text-muted)' 
            }}>
              {weekTrades.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reflection')}
            style={{
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'reflection' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              color: activeTab === 'reflection' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Target size={15} />
            <span>आठवड्याचे आत्मपरीक्षण व नियम (Weekly Reflection & Rules)</span>
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>
          
          {/* TAB 1: TRADE NOTES & MISTAKES FEED */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Mistakes Summary Analytics Banner */}
              {mistakeStats.list.length > 0 && (
                <div 
                  className="glass-card" 
                  style={{ 
                    padding: '12px 16px', 
                    borderRadius: '14px', 
                    border: '1px solid rgba(239, 68, 68, 0.25)', 
                    background: 'rgba(239, 68, 68, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={16} color="#f87171" />
                      <strong style={{ fontSize: '0.82rem', color: '#f87171' }}>
                        या आठवड्यातील चुकांचे विश्लेषण (Weekly Mistake Pattern):
                      </strong>
                    </div>
                    {mistakeStats.totalMistakeLoss > 0 && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                        तोटा: -{formatCurrency(mistakeStats.totalMistakeLoss)}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {mistakeStats.list.map(m => (
                      <span 
                        key={m.name} 
                        style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 650, 
                          padding: '3px 9px', 
                          borderRadius: '9999px',
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: '#fca5a5',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <span>⚠️ {m.name}:</span>
                        <strong>{m.count} {m.count === 1 ? 'trade' : 'trades'}</strong>
                        {m.loss > 0 && <span style={{ opacity: 0.85 }}>(-₹{Math.round(m.loss).toLocaleString('en-IN')})</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter Pills */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setFeedFilter('all')}
                    className="btn"
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 650,
                      borderRadius: '9999px',
                      background: feedFilter === 'all' ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
                      color: feedFilter === 'all' ? '#fff' : 'var(--text-muted)',
                      border: '1px solid ' + (feedFilter === 'all' ? 'var(--primary)' : 'var(--border-color)')
                    }}
                  >
                    सर्व पोझिशन्स ({groupedWeekPositions.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedFilter('notes')}
                    className="btn"
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 650,
                      borderRadius: '9999px',
                      background: feedFilter === 'notes' ? 'var(--primary)' : 'rgba(255,255,255,0.04)',
                      color: feedFilter === 'notes' ? '#fff' : 'var(--text-muted)',
                      border: '1px solid ' + (feedFilter === 'notes' ? 'var(--primary)' : 'var(--border-color)')
                    }}
                  >
                    📝 फक्त नोट्स असलेले ({mistakeStats.totalNotesCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedFilter('mistakes')}
                    className="btn"
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 650,
                      borderRadius: '9999px',
                      background: feedFilter === 'mistakes' ? '#ef4444' : 'rgba(255,255,255,0.04)',
                      color: feedFilter === 'mistakes' ? '#fff' : 'var(--text-muted)',
                      border: '1px solid ' + (feedFilter === 'mistakes' ? '#ef4444' : 'var(--border-color)')
                    }}
                  >
                    ⚠️ फक्त चुका झालेले ({mistakeStats.totalMistakeTrades})
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedFilter('losses')}
                    className="btn"
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 650,
                      borderRadius: '9999px',
                      background: feedFilter === 'losses' ? '#f87171' : 'rgba(255,255,255,0.04)',
                      color: feedFilter === 'losses' ? '#fff' : 'var(--text-muted)',
                      border: '1px solid ' + (feedFilter === 'losses' ? '#f87171' : 'var(--border-color)')
                    }}
                  >
                    🔴 तोट्यातील पोझिशन्स ({groupedWeekPositions.filter(p => p.combinedNetPnL < 0).length})
                  </button>
                </div>

                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  {filteredFeedPositions.length} positions shown
                </span>
              </div>

              {/* Feed of Trades */}
              {filteredFeedPositions.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px', 
                  background: 'rgba(255,255,255,0.015)', 
                  borderRadius: '16px', 
                  border: '1px dashed var(--border-color)',
                  color: 'var(--text-muted)'
                }}>
                  <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>या फिल्टरमध्ये कोणतेही ट्रेड्स आढळले नाहीत.</p>
                  <p style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-dim)' }}>
                    ट्रेड लॉग करताना Notes आणि Mistakes नक्की नोंदवा जेणेकरून वीकेंडला सुधारणा करता येईल.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredFeedPositions.map((pos) => {
                    const isSpread = pos.isHedgedSpread && Boolean(pos.leg2);
                    const isWin = pos.combinedNetPnL >= 0;
                    const hasMistake = pos.mistakes.length > 0;
                    const hasNote = Boolean(pos.notes && pos.notes.trim().length > 0);

                    // Hedged Spread Position
                    if (isSpread && pos.leg2) {
                      const leg1 = pos.leg1;
                      const leg2 = pos.leg2;

                      return (
                        <div 
                          key={pos.id}
                          className="glass-card"
                          style={{
                            padding: '14px 16px',
                            borderRadius: '16px',
                            border: hasMistake 
                              ? '1px solid rgba(239, 68, 68, 0.35)' 
                              : '1px solid rgba(10, 132, 255, 0.35)',
                            background: hasMistake ? 'rgba(239, 68, 68, 0.02)' : 'rgba(10, 132, 255, 0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {/* Top Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span 
                                style={{ 
                                  fontSize: '0.7rem', 
                                  fontWeight: 800, 
                                  padding: '2px 8px', 
                                  borderRadius: '5px',
                                  background: 'rgba(10, 132, 255, 0.2)',
                                  color: '#60a5fa',
                                  border: '1px solid rgba(10, 132, 255, 0.35)'
                                }}
                              >
                                🛡️ Hedged Spread (2 Legs)
                              </span>

                              {/* Leg 1 Pill */}
                              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: '5px', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: leg1.action === 'BUY' ? '#60a5fa' : '#c084fc', fontWeight: 800 }}>{leg1.action}</span>
                                <span>{leg1.symbol}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: leg1.netPnL >= 0 ? '#4ade80' : '#f87171' }}>
                                  ({leg1.netPnL >= 0 ? '+' : ''}{formatCurrency(leg1.netPnL)})
                                </span>
                              </span>

                              {/* Leg 2 Pill */}
                              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: '5px', border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ color: leg2.action === 'BUY' ? '#60a5fa' : '#c084fc', fontWeight: 800 }}>{leg2.action}</span>
                                <span>{leg2.symbol}</span>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: leg2.netPnL >= 0 ? '#4ade80' : '#f87171' }}>
                                  ({leg2.netPnL >= 0 ? '+' : ''}{formatCurrency(leg2.netPnL)})
                                </span>
                              </span>

                              <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>• {formatDateDisplay(pos.date)}</span>
                                {pos.entryTime && <span>({formatTimeToAMPM(pos.entryTime)})</span>}
                              </span>

                              {pos.broker && <BrokerBadge broker={pos.broker} />}
                            </div>

                            {/* P&L Badge */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span 
                                style={{ 
                                  fontSize: '0.85rem', 
                                  fontWeight: 800, 
                                  fontFamily: 'var(--font-mono)',
                                  color: isWin ? 'var(--color-win)' : 'var(--color-loss)',
                                  background: isWin ? 'var(--color-win-bg)' : 'var(--color-loss-bg)',
                                  border: '1px solid ' + (isWin ? 'var(--color-win-border)' : 'var(--color-loss-border)'),
                                  padding: '3px 8px',
                                  borderRadius: '6px'
                                }}
                              >
                                {isPnlVisible ? `Spread Net: ${isWin ? '+' : ''}₹${Math.round(pos.combinedNetPnL).toLocaleString('en-IN')}` : '••••'}
                              </span>

                              {onEditTrade && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onEditTrade(leg1.id);
                                  }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--primary)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  title="Inspect or Edit Spread in TradeLogger"
                                >
                                  <ExternalLink size={14} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Deduplicated Mistakes & Emotion */}
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                            {hasMistake ? (
                              pos.mistakes.map(m => (
                                <span 
                                  key={m}
                                  style={{ 
                                    fontSize: '0.7rem', 
                                    fontWeight: 700, 
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
                                  fontWeight: 600, 
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

                          {/* Spread Trade Note Displayed ONCE */}
                          <div 
                            style={{ 
                              padding: '10px 12px', 
                              borderRadius: '10px', 
                              background: hasNote ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.015)',
                              borderLeft: hasNote ? '3px solid ' + (hasMistake ? '#f87171' : 'var(--primary)') : '3px solid var(--border-color)',
                              fontSize: '0.8rem',
                              color: hasNote ? 'var(--text-main)' : 'var(--text-dim)',
                              lineHeight: 1.5
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: hasNote ? '4px' : '0' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: hasNote ? (hasMistake ? '#fca5a5' : 'var(--primary)') : 'var(--text-dim)' }}>
                                📝 तुमची स्प्रेड नोंद (Trade Note):
                              </span>
                            </div>
                            {hasNote ? (
                              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{pos.notes}</p>
                            ) : (
                              <span style={{ fontStyle: 'italic', fontSize: '0.75rem' }}>
                                या स्प्रेडसाठी कोणतीही नोंद लिहिलेली नाही (No note written).
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Single Trade Position
                    const t = pos.leg1;
                    return (
                      <div 
                        key={t.id}
                        className="glass-card"
                        style={{
                          padding: '14px 16px',
                          borderRadius: '16px',
                          border: hasMistake 
                            ? '1px solid rgba(239, 68, 68, 0.35)' 
                            : '1px solid var(--border-color)',
                          background: hasMistake ? 'rgba(239, 68, 68, 0.02)' : 'var(--bg-card)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {/* Trade Top Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span 
                              style={{ 
                                fontSize: '0.7rem', 
                                fontWeight: 800, 
                                padding: '2px 7px', 
                                borderRadius: '5px',
                                background: t.action === 'BUY' ? 'rgba(10, 132, 255, 0.2)' : 'rgba(191, 90, 242, 0.2)',
                                color: t.action === 'BUY' ? '#60a5fa' : '#c084fc',
                                border: '1px solid ' + (t.action === 'BUY' ? 'rgba(10, 132, 255, 0.35)' : 'rgba(191, 90, 242, 0.35)')
                              }}
                            >
                              {t.action}
                            </span>

                            <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                              {t.symbol}
                            </strong>

                            <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span>• {formatDateDisplay(t.date)}</span>
                              {t.entryTime && <span>({formatTimeToAMPM(t.entryTime)})</span>}
                            </span>

                            {t.broker && <BrokerBadge broker={t.broker} />}
                          </div>

                          {/* P&L Badge */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span 
                              style={{ 
                                fontSize: '0.85rem', 
                                fontWeight: 800, 
                                fontFamily: 'var(--font-mono)',
                                color: isWin ? 'var(--color-win)' : 'var(--color-loss)',
                                background: isWin ? 'var(--color-win-bg)' : 'var(--color-loss-bg)',
                                border: '1px solid ' + (isWin ? 'var(--color-win-border)' : 'var(--color-loss-border)'),
                                padding: '3px 8px',
                                borderRadius: '6px'
                              }}
                            >
                              {isPnlVisible ? `${isWin ? '+' : ''}₹${Math.round(t.netPnL).toLocaleString('en-IN')}` : '••••'}
                            </span>

                            {onEditTrade && (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onEditTrade(t.id);
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: 'var(--primary)',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Inspect or Edit Trade in TradeLogger"
                              >
                                <ExternalLink size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Mistakes & Emotion Tags Row */}
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          {hasMistake ? (
                            pos.mistakes.map(m => (
                              <span 
                                key={m}
                                style={{ 
                                  fontSize: '0.7rem', 
                                  fontWeight: 700, 
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
                              ✓ चूक नाही (No Mistake)
                            </span>
                          )}

                          {t.emotion && (
                            <span 
                              style={{ 
                                fontSize: '0.68rem', 
                                fontWeight: 600, 
                                padding: '2px 7px', 
                                borderRadius: '9999px',
                                background: 'rgba(191, 90, 242, 0.12)',
                                color: '#d8b4fe',
                                border: '1px solid rgba(191, 90, 242, 0.25)'
                              }}
                            >
                              भावना: {t.emotion}
                            </span>
                          )}

                          {t.strategy && (
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', padding: '2px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                              Strategy: {t.strategy}
                            </span>
                          )}
                        </div>

                        {/* Actual Trader Note written during trade logging */}
                        <div 
                          style={{ 
                            padding: '10px 12px', 
                            borderRadius: '10px', 
                            background: hasNote ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.015)',
                            borderLeft: hasNote ? '3px solid ' + (hasMistake ? '#f87171' : 'var(--primary)') : '3px solid var(--border-color)',
                            fontSize: '0.8rem',
                            color: hasNote ? 'var(--text-main)' : 'var(--text-dim)',
                            lineHeight: 1.5
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: hasNote ? '4px' : '0' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: hasNote ? (hasMistake ? '#fca5a5' : 'var(--primary)') : 'var(--text-dim)' }}>
                              📝 तुमची नोंद (Trade Note):
                            </span>
                          </div>
                          {hasNote ? (
                            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{pos.notes}</p>
                          ) : (
                            <span style={{ fontStyle: 'italic', fontSize: '0.75rem' }}>
                              या ट्रेडसाठी कोणतीही नोंद लिहिलेली नाही (No note written).
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WEEKLY REFLECTION & ACTION PLAN */}
          {activeTab === 'reflection' && (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Rating Stars Section */}
              <div className="glass-card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, display: 'block' }}>Weekly Discipline & Rule Execution Score</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Rate how well you adhered to your trading plan and risk limits this week.</span>
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
                  <span>1. काय चांगले झाले? (Wins & Good Execution)</span>
                </label>
                <textarea
                  value={winsText}
                  onChange={(e) => setWinsText(e.target.value)}
                  placeholder="उदा. मंगळवारी स्टॉप लॉस काटेकोरपणे पाळला, ब्रेकआऊटवर कॅन्डल क्लोजिंगची वाट बघितली, पोझिशन साईझ नियंत्रणात ठेवली..."
                  className="input-field"
                  rows={3}
                  style={{ fontSize: '0.82rem', padding: '10px', resize: 'vertical', borderRadius: '10px' }}
                />
              </div>

              {/* Prompt 2: Mistakes & Lessons Learned */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171' }}>
                  <AlertTriangle size={16} />
                  <span>2. कोणत्या चुका झाल्या व काय शिकायला मिळाले? (Mistakes & Lessons Learned)</span>
                </label>
                <textarea
                  value={mistakesText}
                  onChange={(e) => setMistakesText(e.target.value)}
                  placeholder="उदा. गुरुवारी एक्स्पायरीला FOMO एन्ट्री घेतली, भीतीपोटी चांगल्या ट्रेडमधून लवकर एक्झिट केली, स्टॉप लॉस पुढे ढकलला..."
                  className="input-field"
                  rows={3}
                  style={{ fontSize: '0.82rem', padding: '10px', resize: 'vertical', borderRadius: '10px' }}
                />
              </div>

              {/* Prompt 3: Action Plan & Goals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa' }}>
                  <Target size={16} />
                  <span>3. पुढील आठवड्यासाठी नियम व कमिटमेंट्स (Rules & Focus for Next Week)</span>
                </label>
                <textarea
                  value={goalsText}
                  onChange={(e) => setGoalsText(e.target.value)}
                  placeholder="उदा. दररोज जास्तीत जास्त २ ट्रेड्स, १५ मिनिटांच्या कॅन्डल क्लोजिंगशिवाय कोणतीही नवीन एन्ट्री नाही, स्टॉप लॉस कधीही बदलणार नाही..."
                  className="input-field"
                  rows={3}
                  style={{ fontSize: '0.82rem', padding: '10px', resize: 'vertical', borderRadius: '10px' }}
                />
              </div>

              {saveMessage && (
                <div style={{ color: '#34d399', fontSize: '0.8rem', fontWeight: 650, background: 'rgba(52, 211, 153, 0.12)', padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                  {saveMessage}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '6px' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 24px', fontSize: '0.82rem', gap: '8px', fontWeight: 700 }}
                >
                  <Save size={16} />
                  <span>सेव्ह करा (Save Reflection)</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div 
          className="modal-footer" 
          style={{ 
            padding: '14px 22px', 
            borderTop: '1px solid var(--border-color)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'rgba(255,255,255,0.02)' 
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            🔒 सुरक्षित: ट्रेड्स, लेजर किंवा कॅपिटलचा कोणताही डेटा बदलत नाही.
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '7px 16px', fontSize: '0.8rem' }}
            >
              बंद करा (Close)
            </button>
            {activeTab === 'notes' && (
              <button
                type="button"
                onClick={() => setActiveTab('reflection')}
                className="btn btn-primary"
                style={{ padding: '7px 18px', fontSize: '0.8rem', gap: '6px', fontWeight: 700 }}
              >
                <span>सुधारणा नियम लिहा (Write Rules)</span>
                <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
