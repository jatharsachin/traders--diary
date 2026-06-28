import { useState, useEffect } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import type { Segment, Product, Broker, TradeAction, Emotion, Mistake } from '../types';
import { X, Save, ShieldAlert, Sparkles } from 'lucide-react';
import { calculateIndianTaxesAndBrokerage } from '../utils/taxEngine';
import { getFinancialYear } from '../utils/fyHelper';

interface TradeLoggerProps {
  isOpen: boolean;
  onClose: () => void;
  editTradeId?: string | null;
  activeAccountId?: string;
}

const DEFAULT_FORM_STATE = {
  brokerAccountId: '',
  date: new Date().toISOString().split('T')[0],
  entryTime: new Date().toTimeString().slice(0, 5),
  exitTime: new Date(Date.now() + 15 * 60 * 1000).toTimeString().slice(0, 5), // Default 15 mins hold
  exitDate: '',
  segment: 'F&O' as Segment,
  product: 'Intraday' as Product,
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
  useManualCharges: false,
  manualBrokerage: 0,
  manualTaxes: 0,
  holdingType: 'Short Term' as 'Short Term' | 'Long Term',
  broker: 'Zerodha' as Broker,
};

const guessLotSize = (symbol: string): number => {
  const sym = symbol.toUpperCase();
  if (sym.includes('BANKNIFTY')) return 15;
  if (sym.includes('FINNIFTY')) return 25;
  if (sym.includes('MIDCPNIFTY')) return 50;
  if (sym.includes('NIFTY')) return 75;
  if (sym.includes('SENSEX')) return 10;
  if (sym.includes('BANKEX')) return 15;
  return 1;
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

export function TradeLogger({ isOpen, onClose, editTradeId, activeAccountId }: TradeLoggerProps) {
  const { addTrade, editTrade, trades, setups, selectedFY, defaultBroker, brokerAccounts, brokerCharges } = useTradeStore();
  const lastTrade = trades.length > 0 ? trades[trades.length - 1] : undefined;
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
  const [tagsInput, setTagsInput] = useState('');
  const [error, setError] = useState('');

  const [lotsInput, setLotsInput] = useState<string>('');
  const [lotSizeInput, setLotSizeInput] = useState<string>('75');

  const [manualBrokerageText, setManualBrokerageText] = useState<string>('0');
  const [manualTaxesText, setManualTaxesText] = useState<string>('0');

  // Load existing data if editing
  useEffect(() => {
    if (editTradeId) {
      const existing = trades.find((t) => t.id === editTradeId);
      if (existing) {
        setFormData({
          date: existing.date,
          entryTime: existing.entryTime,
          exitTime: existing.exitTime,
          exitDate: existing.exitDate || existing.date,
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
          useManualCharges: existing.useManualCharges || false,
          manualBrokerage: existing.manualBrokerage || 0,
          manualTaxes: existing.manualTaxes || 0,
          holdingType: existing.holdingType || 'Short Term',
          broker: existing.broker || 'Other',
          brokerAccountId: existing.brokerAccountId || '',
        });
        setTagsInput(existing.tags ? existing.tags.join(', ').replace(/#/g, '') : '');
        setManualBrokerageText((existing.manualBrokerage || 0).toString());
        setManualTaxesText((existing.manualTaxes || 0).toString());

        // Set lots and lot size on edit load
        const guessedSz = guessLotSize(existing.symbol);
        setLotSizeInput(guessedSz.toString());
        setLotsInput((existing.qty / guessedSz).toString());
      }
    } else {
      const getDefaultDateForFY = (fy: string): string => {
        const todayStr = new Date().toISOString().split('T')[0];
        if (fy === 'All') return todayStr;
        
        const todayFY = getFinancialYear(todayStr);
        if (todayFY === fy) return todayStr;

        const match = fy.match(/FY (\d{4})/);
        if (match) {
          const startYear = match[1];
          return `${startYear}-04-01`; 
        }
        return todayStr;
      };

      const matchedAcc = brokerAccounts.find((a) => a.id === activeAccountId) || brokerAccounts.find(a => a.active) || brokerAccounts[0];
      const initialBroker = matchedAcc ? matchedAcc.broker : (lastTrade ? (lastTrade.broker || defaultBroker) : defaultBroker);
      const initialAccId = matchedAcc ? matchedAcc.id : '';
      const initialDate = getDefaultDateForFY(selectedFY);

      setFormData({
        ...DEFAULT_FORM_STATE,
        broker: initialBroker,
        brokerAccountId: initialAccId,
        segment: lastTrade ? lastTrade.segment : 'F&O',
        product: lastTrade ? lastTrade.product : 'Intraday',
        strategy: lastTrade ? (lastTrade.strategy || '') : (setups.length > 0 ? setups[0].name : ''),
        date: initialDate,
        entryTime: new Date().toTimeString().slice(0, 5),
        exitTime: new Date(Date.now() + 15 * 60 * 1000).toTimeString().slice(0, 5),
        exitDate: initialDate,
        useManualCharges: false,
        manualBrokerage: 0,
        manualTaxes: 0,
        holdingType: 'Short Term',
        qty: 1,
        entryPrice: 0,
        exitPrice: 0,
        slippagePoints: 0,
        stopLoss: 0,
        target: 0,
        rulesFollowed: [],
        emotion: 'Calm',
        mistake: 'None',
        notes: '',
        strikePrice: 0,
        optionType: 'None',
        setupType: 'None',
      });
      setTagsInput('');
      setLotsInput('');
      setLotSizeInput(lastTrade && lastTrade.segment === 'F&O' ? guessLotSize(lastTrade.symbol).toString() : '75');
    }
  }, [editTradeId, trades, setups, isOpen, selectedFY, activeAccountId, brokerAccounts]);

  // Sync lots and quantity when lots or lot size changes
  const handleLotsChange = (val: string) => {
    setLotsInput(val);
    const l = parseFloat(val);
    const sz = parseFloat(lotSizeInput) || 1;
    if (!isNaN(l) && l >= 0) {
      setFormData((prev) => ({ ...prev, qty: Math.round(l * sz) }));
    }
  };

  const handleLotSizeChange = (val: string) => {
    setLotSizeInput(val);
    const sz = parseFloat(val) || 1;
    const l = parseFloat(lotsInput);
    if (!isNaN(l) && l >= 0) {
      setFormData((prev) => ({ ...prev, qty: Math.round(l * sz) }));
    } else if (formData.qty > 0) {
      setLotsInput((formData.qty / sz).toString());
    }
  };

  // Watch symbol to auto-detect lot sizes AND auto-fill optionType, strikePrice, segment
  useEffect(() => {
    if (!isOpen) return;
    const sym = formData.symbol.toUpperCase().trim();
    if (!sym) return;

    // Detect F&O index option format like: NIFTY 22400 CE, BANKNIFTY 48000 PE, FINNIFTY 20100 CE, etc.
    const optionMatch = sym.match(/(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX|BANKEX)?\s*(\d{5})\s*(CE|PE)/i);
    
    if (optionMatch) {
      const detectedStrike = parseInt(optionMatch[2], 10);
      const detectedType = optionMatch[3].toUpperCase() as 'CE' | 'PE';

      setFormData((prev) => {
        if (
          prev.segment !== 'F&O' ||
          prev.strikePrice !== detectedStrike ||
          prev.optionType !== detectedType
        ) {
          return {
            ...prev,
            segment: 'F&O',
            strikePrice: detectedStrike,
            optionType: detectedType,
          };
        }
        return prev;
      });
    } else if (sym.includes('FUT') || sym.includes('FUTURES')) {
      // Future contracts
      setFormData((prev) => {
        if (prev.segment !== 'F&O' || prev.optionType !== 'None' || prev.strikePrice !== 0) {
          return {
            ...prev,
            segment: 'F&O',
            optionType: 'None',
            strikePrice: 0
          };
        }
        return prev;
      });
    }

    // Auto-detect lot sizes if segment is F&O
    if (formData.segment === 'F&O') {
      const guessed = guessLotSize(formData.symbol);
      setLotSizeInput(guessed.toString());
      
      const l = parseFloat(lotsInput);
      if (!isNaN(l) && l >= 0) {
        setFormData((prev) => ({ ...prev, qty: Math.round(l * guessed) }));
      } else if (formData.qty > 0) {
        setLotsInput((formData.qty / guessed).toString());
      }
    }
  }, [formData.symbol, formData.segment, isOpen]);

  // Real-time auto-calculation of charges & taxes
  useEffect(() => {
    if (!formData.useManualCharges && isOpen) {
      const { segment, product, action, qty, entryPrice, exitPrice } = formData;
      if (qty > 0 && entryPrice > 0 && exitPrice > 0) {
        const config = brokerCharges.find(c => c.broker === formData.broker);
        const taxResult = calculateIndianTaxesAndBrokerage(segment, product, action, qty, entryPrice, exitPrice, config);
        const calcBrokerage = taxResult.brokerage;
        const calcTaxes = Math.round((taxResult.totalCharges - taxResult.brokerage) * 100) / 100;
        setFormData((prev) => ({
          ...prev,
          manualBrokerage: calcBrokerage,
          manualTaxes: calcTaxes
        }));
        setManualBrokerageText(calcBrokerage.toString());
        setManualTaxesText(calcTaxes.toString());
      } else {
        setFormData((prev) => ({
          ...prev,
          manualBrokerage: 0,
          manualTaxes: 0
        }));
        setManualBrokerageText('0');
        setManualTaxesText('0');
      }
    }
  }, [
    formData.useManualCharges,
    formData.segment,
    formData.product,
    formData.action,
    formData.qty,
    formData.entryPrice,
    formData.exitPrice,
    formData.broker,
    brokerCharges,
    isOpen
  ]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const type = e.target.type;
    
    let parsedVal: any = value;
    if (name === 'symbol') {
      parsedVal = value.toUpperCase();
    } else if (type === 'checkbox') {
      parsedVal = (e.target as HTMLInputElement).checked;
    } else if (['qty', 'entryPrice', 'exitPrice', 'slippagePoints', 'stopLoss', 'target', 'strikePrice', 'manualBrokerage', 'manualTaxes'].includes(name)) {
      parsedVal = parseFloat(value) || 0;
    }

    if (name === 'manualBrokerage') {
      setManualBrokerageText(value);
    } else if (name === 'manualTaxes') {
      setManualTaxesText(value);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: parsedVal,
    }));

    if (name === 'qty') {
      const q = parseFloat(value) || 0;
      const sz = parseFloat(lotSizeInput) || 1;
      setLotsInput((q / sz).toString());
    }
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


  const handleQuickIndexOption = (index: 'NIFTY' | 'SENSEX', type: 'CE' | 'PE') => {
    const strike = index === 'NIFTY' ? 23000 : 80000;
    const lotSz = index === 'NIFTY' ? 25 : 10;
    const sym = `${index} ${strike} ${type}`;
    
    setFormData((prev) => ({
      ...prev,
      segment: 'F&O',
      optionType: type,
      strikePrice: strike,
      symbol: sym,
    }));
    
    setLotSizeInput(lotSz.toString());
    const currentLots = parseFloat(lotsInput) || 1;
    if (isNaN(parseFloat(lotsInput))) {
      setLotsInput('1');
    }
    setFormData((prev) => ({
      ...prev,
      qty: Math.round(currentLots * lotSz)
    }));
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

    // Validate that trade date falls within the selected Financial Year
    if (selectedFY !== 'All') {
      const match = selectedFY.match(/FY (\d{4})/);
      if (match) {
        const startYear = parseInt(match[1], 10);
        const startStr = `${startYear}-04-01`;
        const endStr = `${startYear + 1}-03-31`;
        if (formData.date < startStr || formData.date > endStr) {
          setError(`Selected date (${formData.date}) falls outside the active Financial Year range (${selectedFY}: ${startStr} to ${endStr}). Please select a valid date or change the active FY selector.`);
          return;
        }
      }
    }

    const parsedTags = tagsInput
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0)
      .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));

    const finalTradeData = {
      ...formData,
      exitDate: formData.product === 'Delivery' ? (formData.exitDate || formData.date) : formData.date,
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
      <div className="modal-content glass-card animate-fade-in" style={{ padding: 0, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2>{editTradeId ? 'Edit Options/Equity Log' : 'Log Options/Equity Trade'}</h2>
          <button type="button" className="btn-secondary" style={{ padding: '6px', borderRadius: '50%', border: 'none', background: 'transparent' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flexGrow: 1 }}>
          <div className="modal-body" style={{ overflowY: 'auto', flexGrow: 1, padding: '20px' }}>
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
            {/* Grid 1: Basic Metadata */}
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', 
                gap: '12px', 
                marginBottom: '16px' 
              }}
            >
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  name="date"
                  min="2026-04-01"
                  max="2027-03-31"
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
              {formData.product === 'Delivery' && (
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--color-win)', fontWeight: 600 }}>Exit Date</label>
                  <input
                    type="date"
                    name="exitDate"
                    min="2026-04-01"
                    max="2027-03-31"
                    value={formData.exitDate || formData.date}
                    onChange={handleChange}
                    className="form-input"
                    style={{ borderColor: 'var(--color-win-border)' }}
                    required
                  />
                </div>
              )}
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
                className="grid-logger-fo"
                style={{ 
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

            {/* Grid 2: Symbol & Broker & Product & Action */}
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
                gap: '16px', 
                marginBottom: '16px' 
              }}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Symbol / Ticker</label>
                <input
                  type="text"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleChange}
                  placeholder="e.g. NIFTY 22400 CE"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Active Account</label>
                <select
                  name="brokerAccountId"
                  value={formData.brokerAccountId}
                  onChange={(e) => {
                    const accId = e.target.value;
                    const matched = brokerAccounts.find(a => a.id === accId);
                    setFormData(prev => ({
                      ...prev,
                      brokerAccountId: accId,
                      broker: matched ? matched.broker : 'Other'
                    }));
                  }}
                  className="form-select"
                >
                  {brokerAccounts.filter(a => a.active).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.broker})
                    </option>
                  ))}
                  {formData.brokerAccountId && !brokerAccounts.find(a => a.id === formData.brokerAccountId) && (
                    <option value={formData.brokerAccountId}>
                      {formData.broker} Account (Inactive)
                    </option>
                  )}
                  {brokerAccounts.length === 0 && <option value="">Other / Direct</option>}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Product</label>
                <select
                  name="product"
                  value={formData.product}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="Intraday">Intraday</option>
                  <option value="Delivery">Delivery</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
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

            {/* Quick Auto-Fill Index Option Tags */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 650 }}>Quick Option:</span>
              <button
                type="button"
                onClick={() => handleQuickIndexOption('NIFTY', 'CE')}
                className="btn"
                style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--primary)', height: '28px', cursor: 'pointer', borderRadius: '6px' }}
              >
                + NIFTY CE
              </button>
              <button
                type="button"
                onClick={() => handleQuickIndexOption('NIFTY', 'PE')}
                className="btn"
                style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--color-loss)', height: '28px', cursor: 'pointer', borderRadius: '6px' }}
              >
                + NIFTY PE
              </button>
              <button
                type="button"
                onClick={() => handleQuickIndexOption('SENSEX', 'CE')}
                className="btn"
                style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', color: 'var(--primary)', height: '28px', cursor: 'pointer', borderRadius: '6px' }}
              >
                + SENSEX CE
              </button>
              <button
                type="button"
                onClick={() => handleQuickIndexOption('SENSEX', 'PE')}
                className="btn"
                style={{ padding: '4px 10px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--color-loss)', height: '28px', cursor: 'pointer', borderRadius: '6px' }}
              >
                + SENSEX PE
              </button>
            </div>

            {/* Conditionally Render Equity Delivery Holding Type (STCG vs LTCG) */}
            {formData.segment === 'Equity' && formData.product === 'Delivery' && (
              <div 
                style={{ 
                  marginBottom: '16px',
                  background: 'rgba(16, 185, 129, 0.04)',
                  border: '1px solid rgba(16, 185, 129, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px'
                }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: 'var(--color-win)', fontWeight: 600 }}>Capital Gains Holding Duration</label>
                  <select
                    name="holdingType"
                    value={formData.holdingType}
                    onChange={handleChange}
                    className="form-select"
                    style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}
                  >
                    <option value="Short Term">Short Term / Swing (&lt; 1 Year) [STCG 20%]</option>
                    <option value="Long Term">Long Term Investment (&gt; 1 Year) [LTCG 12.5%]</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Used to calculate correct Indian capital gains taxes. STCG is taxed at 20%. LTCG is taxed at 12.5% after ₹1.25L exemption.
                </div>
              </div>
            )}

            {/* Conditionally Render F&O Lot Calculator */}
            {formData.segment === 'F&O' && (
              <div 
                className="grid-logger-fo" 
                style={{ 
                  marginBottom: '16px',
                  background: 'rgba(191, 87, 242, 0.03)',
                  border: '1px solid rgba(191, 87, 242, 0.08)',
                  padding: '12px',
                  borderRadius: '8px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '16px'
                }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#bf5af2', fontWeight: 600 }}>Lots</label>
                  <input
                    type="number"
                    step="any"
                    value={lotsInput}
                    onChange={(e) => handleLotsChange(e.target.value)}
                    placeholder="e.g. 2"
                    className="form-input"
                    style={{ borderColor: 'rgba(191, 87, 242, 0.2)' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#bf5af2', fontWeight: 600 }}>Lot Size</label>
                  <input
                    type="number"
                    value={lotSizeInput}
                    onChange={(e) => handleLotSizeChange(e.target.value)}
                    placeholder="e.g. 75"
                    className="form-input"
                    style={{ borderColor: 'rgba(191, 87, 242, 0.2)' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: '#bf5af2', fontWeight: 600 }}>Total Quantity</label>
                  <input
                    type="number"
                    name="qty"
                    value={formData.qty}
                    onChange={handleChange}
                    className="form-input"
                    style={{ borderColor: 'rgba(191, 87, 242, 0.2)' }}
                    required
                  />
                </div>
              </div>
            )}

            {/* Grid 3: Trade Execution Numbers */}
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: formData.segment === 'F&O' ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)', 
                gap: '16px', 
                marginBottom: '16px' 
              }}
            >
              {formData.segment !== 'F&O' && (
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
              )}
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

            {/* Grid 4: Setup & Strategy */}
            <div className="grid-2col-equal-small" style={{ marginBottom: '16px', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
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
              <div className="form-group" style={{ marginBottom: 0 }}>
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

            {/* Charges & Brokerage Section */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '0.95rem', margin: 0 }}>Charges & Brokerage (₹)</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    id="useManualCharges"
                    name="useManualCharges"
                    checked={formData.useManualCharges}
                    onChange={handleChange}
                    style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <label htmlFor="useManualCharges" style={{ fontSize: '0.78rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    Manual Edit Override
                  </label>
                </div>
              </div>

              <div 
                className="grid-2col-equal" 
                style={{ 
                  background: formData.useManualCharges ? 'rgba(251, 146, 60, 0.03)' : 'rgba(255, 255, 255, 0.01)',
                  border: formData.useManualCharges ? '1px solid rgba(251, 146, 60, 0.15)' : '1px solid var(--border-color)',
                  padding: '12px',
                  borderRadius: '8px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: formData.useManualCharges ? '#fb923c' : 'var(--text-muted)', fontWeight: 600 }}>
                    Brokerage {formData.useManualCharges ? '(Manual)' : '(Auto)'}
                  </label>
                  <input
                    type="number"
                    name="manualBrokerage"
                    value={manualBrokerageText}
                    onChange={handleChange}
                    placeholder="0.00"
                    disabled={!formData.useManualCharges}
                    className="form-input"
                    style={{ 
                      borderColor: formData.useManualCharges ? 'rgba(251, 146, 60, 0.3)' : 'var(--border-color)',
                      opacity: formData.useManualCharges ? 1 : 0.6,
                      cursor: formData.useManualCharges ? 'text' : 'not-allowed'
                    }}
                    step="any"
                    min="0"
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ color: formData.useManualCharges ? '#fb923c' : 'var(--text-muted)', fontWeight: 600 }}>
                    Government Taxes & Fees {formData.useManualCharges ? '(Manual)' : '(Auto)'}
                  </label>
                  <input
                    type="number"
                    name="manualTaxes"
                    value={manualTaxesText}
                    onChange={handleChange}
                    placeholder="0.00"
                    disabled={!formData.useManualCharges}
                    className="form-input"
                    style={{ 
                      borderColor: formData.useManualCharges ? 'rgba(251, 146, 60, 0.3)' : 'var(--border-color)',
                      opacity: formData.useManualCharges ? 1 : 0.6,
                      cursor: formData.useManualCharges ? 'text' : 'not-allowed'
                    }}
                    step="any"
                    min="0"
                  />
                </div>
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
                          background: isSelected ? 'var(--primary)' : 'var(--bg-card)',
                          border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                          color: isSelected ? '#fff' : 'var(--text-main)',
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
              <div className="grid-2col-equal-small" style={{ gap: '10px' }}>
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
                        color: 'var(--text-main)',
                        background: isChecked ? 'var(--primary-glow)' : 'var(--bg-card)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: `1.5px solid ${isChecked ? 'var(--primary)' : 'var(--border-color)'}`,
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
