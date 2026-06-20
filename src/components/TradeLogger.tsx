import { useState, useEffect } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import type { Segment, Product, TradeAction, Emotion, Mistake } from '../types';
import { X, Save, ShieldAlert, Sparkles } from 'lucide-react';

interface TradeLoggerProps {
  isOpen: boolean;
  onClose: () => void;
  editTradeId?: string | null;
}

const DEFAULT_FORM_STATE = {
  date: new Date().toISOString().split('T')[0],
  entryTime: new Date().toTimeString().slice(0, 5),
  exitTime: new Date(Date.now() + 15 * 60 * 1000).toTimeString().slice(0, 5), // Default 15 mins hold
  segment: 'F&O' as Segment,
  product: 'MIS' as Product,
  action: 'BUY' as TradeAction,
  symbol: '',
  qty: 1,
  entryPrice: 0,
  exitPrice: 0,
  slippagePoints: 0,
  stopLoss: 0,
  target: 0,
  strategy: '',
  rulesFollowed: [] as string[],
  emotion: 'Calm' as Emotion,
  mistake: 'None' as Mistake,
  notes: '',
  strikePrice: 0,
  optionType: 'None' as 'CE' | 'PE' | 'None',
  setupType: 'None' as 'Breakout' | 'Pullback' | 'Reversal' | 'Range Bound' | 'None',
};

const TRADING_RULES = [
  'Trend Alignment',
  'Position Sizing OK',
  'Patience Kept',
  'Waited for Setup',
  'Followed Stop Loss Plan',
  'Clean Execution',
];

const EMOTIONS: { value: Emotion; label: string; emoji: string }[] = [
  { value: 'Calm', label: 'Calm', emoji: '😌' },
  { value: 'Greedy', label: 'Greedy', emoji: '🤑' },
  { value: 'Fearful', label: 'Fearful', emoji: '😰' },
  { value: 'Impatient', label: 'Impatient', emoji: '⏱️' },
  { value: 'Revengeful', label: 'Revenge', emoji: '😡' },
];

const MISTAKES: Mistake[] = ['None', 'Overtrading', 'FOMO Entry', 'Moving SL', 'Early Exit', 'No Setup'];

export function TradeLogger({ isOpen, onClose, editTradeId }: TradeLoggerProps) {
  const { addTrade, editTrade, trades, setups } = useTradeStore();
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
  const [tagsInput, setTagsInput] = useState('');
  const [error, setError] = useState('');

  // Load existing data if editing
  useEffect(() => {
    if (editTradeId) {
      const existing = trades.find((t) => t.id === editTradeId);
      if (existing) {
        setFormData({
          date: existing.date,
          entryTime: existing.entryTime,
          exitTime: existing.exitTime,
          segment: existing.segment,
          product: existing.product,
          action: existing.action,
          symbol: existing.symbol,
          qty: existing.qty,
          entryPrice: existing.entryPrice,
          exitPrice: existing.exitPrice,
          slippagePoints: existing.slippagePoints,
          stopLoss: existing.stopLoss,
          target: existing.target,
          strategy: existing.strategy,
          rulesFollowed: existing.rulesFollowed,
          emotion: existing.emotion,
          mistake: existing.mistake,
          notes: existing.notes,
          strikePrice: existing.strikePrice || 0,
          optionType: existing.optionType || 'None',
          setupType: existing.setupType || 'None',
        });
        setTagsInput(existing.tags ? existing.tags.join(', ') : '');
      }
    } else {
      setFormData({
        ...DEFAULT_FORM_STATE,
        strategy: setups.length > 0 ? setups[0].name : '',
        date: new Date().toISOString().split('T')[0],
        entryTime: new Date().toTimeString().slice(0, 5),
        exitTime: new Date(Date.now() + 15 * 60 * 1000).toTimeString().slice(0, 5),
      });
      setTagsInput('');
    }
  }, [editTradeId, trades, setups, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['qty', 'entryPrice', 'exitPrice', 'slippagePoints', 'stopLoss', 'target', 'strikePrice'].includes(name)
        ? parseFloat(value) || 0
        : value,
    }));
  };

  const handleRuleToggle = (rule: string) => {
    setFormData((prev) => {
      const rules = prev.rulesFollowed.includes(rule)
        ? prev.rulesFollowed.filter((r) => r !== rule)
        : [...prev.rulesFollowed, rule];
      return { ...prev, rulesFollowed: rules };
    });
  };

  // Helper to auto-complete option symbol
  const handleAutoCompleteSymbol = () => {
    if (formData.segment === 'F&O' && formData.strikePrice > 0 && formData.optionType !== 'None') {
      const prefix = formData.symbol.toUpperCase().includes('NIFTY') ? 'NIFTY' : 'BANKNIFTY';
      setFormData(prev => ({
        ...prev,
        symbol: `${prefix} ${formData.strikePrice} ${formData.optionType}`
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!formData.symbol.trim()) {
      setError('Please enter a valid Trading Symbol.');
      return;
    }
    if (formData.qty <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }
    if (formData.entryPrice <= 0 || formData.exitPrice <= 0) {
      setError('Prices must be greater than zero.');
      return;
    }

    const parsedTags = tagsInput
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0)
      .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

    const finalTradeData = {
      ...formData,
      tags: parsedTags,
    };

    if (editTradeId) {
      if (!window.confirm('Are you sure you want to update this trade log?')) return;
      editTrade(editTradeId, finalTradeData);
    } else {
      if (!window.confirm('Are you sure you want to log this trade?')) return;
      addTrade(finalTradeData);
    }
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card animate-fade-in" style={{ padding: 0 }}>
        <div className="modal-header">
          <h2>{editTradeId ? 'Edit Options/Equity Log' : 'Log Options/Equity Trade'}</h2>
          <button className="btn-secondary" style={{ padding: '6px', borderRadius: '50%' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {error && (
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  backgroundColor: 'var(--color-loss-bg)', 
                  border: '1px solid var(--color-loss-border)', 
                  color: 'var(--color-loss)',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '0.85rem'
                }}
              >
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Grid 1: Basic Metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Entry Time</label>
                <input
                  type="time"
                  name="entryTime"
                  value={formData.entryTime}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Exit Time</label>
                <input
                  type="time"
                  name="exitTime"
                  value={formData.exitTime}
                  onChange={handleChange}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Segment</label>
                <select
                  name="segment"
                  value={formData.segment}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="Equity">Equity</option>
                  <option value="F&O">F&O (Index/Stock)</option>
                  <option value="Commodity">Commodity</option>
                  <option value="Currency">Currency</option>
                </select>
              </div>
            </div>

            {/* Conditionally Render F&O Options Fields */}
            {formData.segment === 'F&O' && (
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1.2fr 0.8fr', 
                  gap: '16px', 
                  marginBottom: '16px',
                  background: 'rgba(59, 130, 246, 0.04)',
                  border: '1px solid rgba(59, 130, 246, 0.1)',
                  padding: '12px',
                  borderRadius: '8px'
                }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: 'var(--primary)' }}>Strike Price</label>
                  <input
                    type="number"
                    name="strikePrice"
                    value={formData.strikePrice || ''}
                    onChange={handleChange}
                    placeholder="e.g. 22400"
                    className="form-input"
                    style={{ borderColor: 'var(--primary-glow)' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: 'var(--primary)' }}>Option Type</label>
                  <select
                    name="optionType"
                    value={formData.optionType}
                    onChange={handleChange}
                    className="form-select"
                    style={{ borderColor: 'var(--primary-glow)' }}
                  >
                    <option value="None">Futures / None</option>
                    <option value="CE">CE (Call Option)</option>
                    <option value="PE">PE (Put Option)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleAutoCompleteSymbol}
                    className="btn btn-secondary"
                    style={{ 
                      width: '100%', 
                      fontSize: '0.75rem', 
                      padding: '10px 6px',
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px',
                      borderColor: 'var(--primary-glow)'
                    }}
                    title="Generate standard symbol name"
                  >
                    <Sparkles size={12} color="var(--primary)" />
                    Auto-Fill
                  </button>
                </div>
              </div>
            )}

            {/* Grid 2: Symbol & Product & Action */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Symbol / Ticker</label>
                <input
                  type="text"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleChange}
                  placeholder="e.g. NIFTY 22400 CE or HDFCBANK"
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Product</label>
                <select
                  name="product"
                  value={formData.product}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="MIS">Intraday (MIS)</option>
                  <option value="CNC">Delivery (CNC)</option>
                  <option value="NRML">Carry Forward (NRML)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Action</label>
                <select
                  name="action"
                  value={formData.action}
                  onChange={handleChange}
                  className="form-select"
                  style={{
                    color: formData.action === 'BUY' ? 'var(--color-win)' : 'var(--color-loss)',
                    fontWeight: 600,
                  }}
                >
                  <option value="BUY" style={{ color: 'var(--color-win)' }}>BUY / Long</option>
                  <option value="SELL" style={{ color: 'var(--color-loss)' }}>SELL / Short</option>
                </select>
              </div>
            </div>

            {/* Grid 3: Trade Execution Numbers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Qty</label>
                <input
                  type="number"
                  name="qty"
                  value={formData.qty}
                  onChange={handleChange}
                  min="1"
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Entry Price</label>
                <input
                  type="number"
                  name="entryPrice"
                  value={formData.entryPrice || ''}
                  onChange={handleChange}
                  step="0.05"
                  placeholder="0.00"
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Exit Price</label>
                <input
                  type="number"
                  name="exitPrice"
                  value={formData.exitPrice || ''}
                  onChange={handleChange}
                  step="0.05"
                  placeholder="0.00"
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Slippage (Pts)</label>
                <input
                  type="number"
                  name="slippagePoints"
                  value={formData.slippagePoints}
                  onChange={handleChange}
                  step="0.05"
                  className="form-input"
                />
              </div>
            </div>

            {/* Grid 4: Risk Parameters & Setup */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">Stop Loss (SL)</label>
                <input
                  type="number"
                  name="stopLoss"
                  value={formData.stopLoss || ''}
                  onChange={handleChange}
                  step="0.05"
                  placeholder="0.00"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Target Price</label>
                <input
                  type="number"
                  name="target"
                  value={formData.target || ''}
                  onChange={handleChange}
                  step="0.05"
                  placeholder="0.00"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Strategy</label>
                <select
                  name="strategy"
                  value={formData.strategy}
                  onChange={handleChange}
                  className="form-select"
                >
                  {setups.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                  {setups.length === 0 && <option value="">No setups defined</option>}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Setup Type</label>
                <select
                  name="setupType"
                  value={formData.setupType}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="None">None</option>
                  <option value="Breakout">Breakout</option>
                  <option value="Pullback">Pullback</option>
                  <option value="Reversal">Reversal</option>
                  <option value="Range Bound">Range Bound</option>
                </select>
              </div>
            </div>

            {/* Psychology: Emotions & Mistakes */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>Trading Psychology & Emotions</h3>
              
              <div className="form-group">
                <label className="form-label">Dominant Emotion</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {EMOTIONS.map((emo) => {
                    const isSelected = formData.emotion === emo.value;
                    return (
                      <button
                        type="button"
                        key={emo.value}
                        onClick={() => setFormData((prev) => ({ ...prev, emotion: emo.value }))}
                        className="btn"
                        style={{
                          flex: '1',
                          minWidth: '90px',
                          padding: '8px 12px',
                          fontSize: '0.85rem',
                          background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                          color: '#fff',
                        }}
                      >
                        <span style={{ marginRight: '6px' }}>{emo.emoji}</span>
                        {emo.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label className="form-label">Execution Mistake Tag</label>
                <select
                  name="mistake"
                  value={formData.mistake}
                  onChange={handleChange}
                  className="form-select"
                  style={{
                    color: formData.mistake === 'None' ? 'var(--color-win)' : 'var(--color-loss)',
                    fontWeight: formData.mistake !== 'None' ? 600 : 400
                  }}
                >
                  {MISTAKES.map((m) => (
                    <option key={m} value={m} style={{ color: m === 'None' ? 'var(--color-win)' : 'var(--color-loss)' }}>
                      {m === 'None' ? '✅ No Mistake (Clean Trade)' : `⚠️ ${m}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Checklist Rules */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>Rule Checklist Compliance</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {TRADING_RULES.map((rule) => {
                  const isChecked = formData.rulesFollowed.includes(rule);
                  return (
                    <label
                      key={rule}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        color: isChecked ? '#fff' : 'var(--text-muted)',
                        background: 'rgba(255,255,255,0.01)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.02)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleRuleToggle(rule)}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <span>{rule}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <label className="form-label">Trade Notes & Reflections</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Write trade setup notes, mistakes, post-market feelings..."
                rows={3}
                className="form-textarea"
                style={{ marginBottom: '14px' }}
              />
            </div>

            {/* Custom Tags */}
            <div className="form-group">
              <label className="form-label">Custom Tags (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. scalp, expiry, fomo, rangebound"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="form-input"
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                Separate tags with commas. Hashtag prefix (#) will be added automatically.
              </span>
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Save size={16} />
              <span>{editTradeId ? 'Update Log' : 'Save Trade'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
