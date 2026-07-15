import { useState, useEffect, useRef } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import type { Segment, Product, Broker, TradeAction, Emotion, Mistake } from '../types';
import { X, Save, ShieldAlert, Check, AlertTriangle } from 'lucide-react';
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
  if (sym.includes('NIFTY')) return 65;
  if (sym.includes('SENSEX')) return 10;
  if (sym.includes('BANKEX')) return 15;
  return 1;
};

const TRADING_RULES = [
  'System Executed',
  'Risk Limit OK',
  'API & Tech OK',
  'Exit Plan Followed',
  'No Manual Override',
  'Slippage Checked'
];

const EMOTIONS: { value: Emotion; label: string; emoji: string }[] = [
  { value: 'Calm', label: 'Calm', emoji: '😌' },
  { value: 'Greedy', label: 'Greedy', emoji: '🤑' },
  { value: 'Fearful', label: 'Fearful', emoji: '😰' },
  { value: 'Impatient', label: 'Impatient', emoji: '⏱️' },
  { value: 'Revengeful', label: 'Revenge', emoji: '😡' },
];

const MISTAKES: Mistake[] = [
  'None',
  'FOMO Entry',
  'Overtrading',
  'No Setup',
  'Moving SL',
  'Early Exit',
  'Late Exit',
  'Panic Exit',
  'Greed Hold',
  'Manual Intervention',
  'Tech / API Issue'
];

export function TradeLogger({ isOpen, onClose, editTradeId, activeAccountId }: TradeLoggerProps) {
  const { addTrade, editTrade, trades, setups, selectedFY, defaultBroker, brokerAccounts, brokerCharges } = useTradeStore();
  const lastTrade = trades.length > 0 ? trades[trades.length - 1] : undefined;
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);
  const [tagsInput, setTagsInput] = useState('');
  const [showTagsField, setShowTagsField] = useState(false);
  const [error, setError] = useState('');

  const [lotsInput, setLotsInput] = useState<string>('');
  const [lotSizeInput, setLotSizeInput] = useState<string>('65');
  const [underlyingIndex, setUnderlyingIndex] = useState<string>('NIFTY');

  // Spread / Multi-Leg States
  const [isMultiLeg, setIsMultiLeg] = useState(false);
  const [leg2Action, setLeg2Action] = useState<TradeAction>('BUY');
  const [leg2Strike, setLeg2Strike] = useState<number>(0);
  const [leg2OptionType, setLeg2OptionType] = useState<'CE' | 'PE' | 'None'>('CE');
  const [leg2EntryPrice, setLeg2EntryPrice] = useState<number>(0);
  const [leg2ExitPrice, setLeg2ExitPrice] = useState<number>(0);
  const [leg2Symbol, setLeg2Symbol] = useState<string>('');

  const prevSymbolPrefixRef = useRef('');

  const [manualBrokerageText, setManualBrokerageText] = useState<string>('0');
  const [manualTaxesText, setManualTaxesText] = useState<string>('0');

  const [usePartialExits, setUsePartialExits] = useState(false);

  const getFYDateLimits = () => {
    if (selectedFY && selectedFY !== 'All') {
      const match = selectedFY.match(/FY (\d{4})/);
      if (match) {
        const startYear = parseInt(match[1], 10);
        return {
          min: `${startYear}-04-01`,
          max: `${startYear + 1}-03-31`
        };
      }
    }
    return { min: undefined, max: undefined };
  };
  const fyLimits = getFYDateLimits();
  const [partialExits, setPartialExits] = useState<{ id: string; qty: number; price: number; time: string }[]>([
    { id: '1', qty: 0, price: 0, time: new Date().toTimeString().slice(0, 5) }
  ]);

  // Sync partial exits to total qty, exit price, and final exit time
  useEffect(() => {
    if (usePartialExits) {
      const validExits = partialExits.filter(e => e.qty > 0 && e.price > 0);
      if (validExits.length > 0) {
        const totalQty = validExits.reduce((sum, e) => sum + e.qty, 0);
        const weightedSum = validExits.reduce((sum, e) => sum + (e.qty * e.price), 0);
        const avgPrice = Math.round((weightedSum / totalQty) * 100) / 100;
        
        let latestTime = formData.exitTime;
        const validTimes = validExits.filter(e => e.time);
        if (validTimes.length > 0) {
          validTimes.sort((a, b) => a.time.localeCompare(b.time));
          latestTime = validTimes[validTimes.length - 1].time;
        }

        setFormData(prev => ({
          ...prev,
          qty: totalQty,
          exitPrice: avgPrice,
          exitTime: latestTime
        }));

        if (formData.segment === 'F&O') {
          const lSize = parseFloat(lotSizeInput) || 1;
          const computedLots = totalQty / lSize;
          setLotsInput(Number.isInteger(computedLots) ? computedLots.toString() : computedLots.toFixed(2));
        }
      }
    }
  }, [partialExits, usePartialExits, lotSizeInput, formData.segment]);

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

        if (existing.partialExits && existing.partialExits.length > 0) {
          setUsePartialExits(true);
          setPartialExits(existing.partialExits);
        } else {
          setUsePartialExits(false);
          setPartialExits([{ id: '1', qty: 0, price: 0, time: new Date().toTimeString().slice(0, 5) }]);
        }

        // Set lots and lot size on edit load
        const guessedSz = guessLotSize(existing.symbol);
        setLotSizeInput(guessedSz.toString());
        setLotsInput((existing.qty / guessedSz).toString());
        if (existing.symbol) {
          const match = existing.symbol.toUpperCase().match(/^(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX|BANKEX)/);
          if (match) {
            setUnderlyingIndex(match[1]);
          }
        }
      }
    } else {
      const draft = localStorage.getItem('traders_diary_draft_trade');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setFormData(parsed);
          setTagsInput(parsed.tagsInput || '');
          setManualBrokerageText((parsed.manualBrokerage || 0).toString());
          setManualTaxesText((parsed.manualTaxes || 0).toString());
          if (parsed.symbol) {
            const guessedSz = guessLotSize(parsed.symbol);
            setLotSizeInput(guessedSz.toString());
            if (parsed.qty) setLotsInput((parsed.qty / guessedSz).toString());
            const match = parsed.symbol.toUpperCase().match(/^(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX|BANKEX)/);
            if (match) {
              setUnderlyingIndex(match[1]);
            }
          }
          return;
        } catch (e) {
          console.error("Failed to parse draft trade", e);
        }
      }

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
      setLotSizeInput(lastTrade && lastTrade.segment === 'F&O' ? guessLotSize(lastTrade.symbol).toString() : '65');
      if (lastTrade && lastTrade.segment === 'F&O' && lastTrade.symbol) {
        const match = lastTrade.symbol.toUpperCase().match(/^(NIFTY|BANKNIFTY|FINNIFTY|MIDCPNIFTY|SENSEX|BANKEX)/);
        if (match) {
          setUnderlyingIndex(match[1]);
        }
      } else {
        setUnderlyingIndex('NIFTY');
      }
      setIsMultiLeg(false);
      setLeg2Action('BUY');
      setLeg2Strike(0);
      setLeg2OptionType('CE');
      setLeg2EntryPrice(0);
      setLeg2ExitPrice(0);
      setLeg2Symbol('');
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

    // Auto-detect lot sizes if segment is F&O (only for new entries to prevent overwriting manual inputs)
    if (formData.segment === 'F&O' && formData.symbol && isOpen && !editTradeId) {
      const prefix = formData.symbol.trim().split(' ')[0].toUpperCase();
      if (prefix !== prevSymbolPrefixRef.current) {
        prevSymbolPrefixRef.current = prefix;
        const guessed = guessLotSize(formData.symbol);
        setLotSizeInput(guessed.toString());
        
        const l = parseFloat(lotsInput);
        if (!isNaN(l) && l >= 0) {
          setFormData((prev) => ({ ...prev, qty: Math.round(l * guessed) }));
        } else if (formData.qty > 0) {
          setLotsInput((formData.qty / guessed).toString());
        }
      }
    }
  }, [formData.symbol, formData.segment, isOpen, lotsInput, editTradeId]);

  // Dynamically auto-construct symbol from index, strike price, and option type
  useEffect(() => {
    if (formData.segment === 'F&O' && formData.strikePrice > 0 && formData.optionType !== 'None' && isOpen) {
      const newSymbol = `${underlyingIndex} ${formData.strikePrice} ${formData.optionType}`;
      if (formData.symbol !== newSymbol) {
        setFormData(prev => ({
          ...prev,
          symbol: newSymbol
        }));
      }
    }
  }, [underlyingIndex, formData.strikePrice, formData.optionType, formData.segment, isOpen]);

  // Sync Leg 2's Option Type with Leg 1 by default
  useEffect(() => {
    if (isMultiLeg) {
      setLeg2OptionType(formData.optionType);
    }
  }, [formData.optionType, isMultiLeg]);

  // Dynamic Leg 2 Symbol Generation
  useEffect(() => {
    if (formData.segment === 'F&O' && leg2Strike > 0 && leg2OptionType !== 'None' && isOpen) {
      setLeg2Symbol(`${underlyingIndex} ${leg2Strike} ${leg2OptionType}`);
    } else {
      setLeg2Symbol('');
    }
  }, [underlyingIndex, leg2Strike, leg2OptionType, formData.segment, isOpen]);

  // Real-time auto-calculation of charges & taxes
  useEffect(() => {
    if (!formData.useManualCharges && isOpen) {
      const { segment, product, action, qty, entryPrice, exitPrice, strategy } = formData;
      if (qty > 0 && entryPrice > 0 && exitPrice > 0) {
        const config = brokerCharges.find(c => c.broker === formData.broker);
        const isOpt = formData.optionType && formData.optionType !== 'None';
        const activeExits = usePartialExits ? partialExits.filter(e => e.qty > 0 && e.price > 0) : undefined;
        const taxResult = calculateIndianTaxesAndBrokerage(segment, product, action, qty, entryPrice, exitPrice, config, isOpt, activeExits, strategy);
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
    isOpen,
    partialExits,
    usePartialExits
  ]);

  // Save draft to localStorage as user types
  useEffect(() => {
    if (!editTradeId && isOpen) {
      localStorage.setItem('traders_diary_draft_trade', JSON.stringify({
        ...formData,
        tagsInput
      }));
    }
  }, [formData, tagsInput, editTradeId, isOpen]);

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


  const handleQuickIndexOption = (index: 'NIFTY' | 'SENSEX', type: 'CE' | 'PE') => {
    const strike = index === 'NIFTY' ? 23000 : 80000;
    const lotSz = index === 'NIFTY' ? 65 : 10;
    const sym = `${index} ${strike} ${type}`;
    
    setUnderlyingIndex(index);
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
    if (isMultiLeg) {
      if (formData.qty <= 0) {
        setError('Quantity must be greater than zero.');
        return;
      }
      if (formData.entryPrice <= 0 || formData.exitPrice <= 0) {
        setError('Leg 1 prices must be greater than zero.');
        return;
      }
      if (leg2EntryPrice <= 0 || leg2ExitPrice <= 0) {
        setError('Leg 2 prices must be greater than zero.');
        return;
      }
      if (!leg2Strike) {
        setError('Please enter Leg 2 Strike Price.');
        return;
      }
      if (!formData.strikePrice) {
        setError('Please enter Leg 1 Strike Price.');
        return;
      }
    } else {
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

    let finalSymbol = formData.symbol;
    if (formData.segment === 'F&O') {
      if (formData.strikePrice > 0 && formData.optionType !== 'None') {
        finalSymbol = `${underlyingIndex} ${formData.strikePrice} ${formData.optionType}`;
      }
    }

    if (isMultiLeg) {
      const leg1Symbol = finalSymbol || `${underlyingIndex} ${formData.strikePrice} ${formData.optionType}`;
      const calculatedLeg2Symbol = leg2Symbol || `${underlyingIndex} ${leg2Strike} ${leg2OptionType}`;

      const finalTradeData = {
        ...formData,
        symbol: leg1Symbol,
        exitDate: formData.date,
        tags: [...parsedTags, '#spread_leg1', '#hedged'],
      };

      const finalTrade2Data = {
        ...formData,
        id: crypto.randomUUID ? crypto.randomUUID() : `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        action: leg2Action,
        strikePrice: leg2Strike,
        optionType: leg2OptionType,
        symbol: calculatedLeg2Symbol,
        entryPrice: leg2EntryPrice,
        exitPrice: leg2ExitPrice,
        exitDate: formData.date,
        tags: [...parsedTags, '#spread_leg2', '#hedge_leg', '#hedged'],
        notes: (formData.notes ? formData.notes + ' ' : '') + `(Hedge Leg for ${leg1Symbol})`,
      };

      if (!window.confirm('Are you sure you want to log both spread legs?')) return;
      
      addTrade(finalTradeData);
      addTrade(finalTrade2Data);
    } else {
      const finalTradeData = {
        ...formData,
        symbol: finalSymbol,
        exitDate: formData.product === 'Delivery' ? (formData.exitDate || formData.date) : formData.date,
        tags: parsedTags,
        partialExits: usePartialExits ? partialExits.filter(e => e.qty > 0 && e.price > 0) : undefined,
      };

      if (editTradeId) {
        if (!window.confirm('Are you sure you want to update this trade log?')) return;
        editTrade(editTradeId, finalTradeData);
      } else {
        if (!window.confirm('Are you sure you want to log this trade?')) return;
        addTrade(finalTradeData);
      }
    }
    
    localStorage.removeItem('traders_diary_draft_trade');
    onClose();
  };

  const handleClose = () => {
    localStorage.removeItem('traders_diary_draft_trade');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card animate-fade-in" style={{ padding: 0, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h2>{editTradeId ? 'Edit Options/Equity Log' : 'Log Options/Equity Trade'}</h2>
          <button type="button" className="btn-secondary" style={{ padding: '6px', borderRadius: '50%', border: 'none', background: 'transparent' }} onClick={handleClose}>
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
                  min={fyLimits.min}
                  max={fyLimits.max}
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
                  style={usePartialExits ? { background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', cursor: 'not-allowed' } : {}}
                  required
                  disabled={usePartialExits}
                />
              </div>
              {formData.product === 'Delivery' && (
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--color-win)', fontWeight: 600 }}>Exit Date</label>
                  <input
                    type="date"
                    name="exitDate"
                    min={fyLimits.min}
                    max={fyLimits.max}
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
            {/* Conditionally Render F&O Options Fields */}
            {formData.segment === 'F&O' && (
              <>
                {/* Spread Mode Toggle (Only for new logs) */}
                {!editTradeId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(59, 130, 246, 0.05)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.15)', marginBottom: '16px' }}>
                    <input 
                      type="checkbox" 
                      id="isMultiLeg" 
                      checked={isMultiLeg} 
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsMultiLeg(checked);
                        if (checked) {
                          setFormData(prev => ({ ...prev, action: 'SELL' }));
                          setLeg2Action('BUY');
                        }
                      }} 
                      style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <label htmlFor="isMultiLeg" style={{ fontSize: '0.8rem', fontWeight: 650, color: 'var(--text-main)', cursor: 'pointer', userSelect: 'none' }}>
                      🛡️ Hedge Mode
                    </label>
                  </div>
                )}

                {/* Underlying Index Selection */}
                <div 
                  className="grid-logger-fo"
                  style={{ 
                    background: 'rgba(59, 130, 246, 0.03)',
                    border: '1px solid rgba(59, 130, 246, 0.08)',
                    padding: '12px',
                    borderRadius: '8px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                    marginBottom: '16px'
                  }}
                >
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: 'var(--primary)', fontWeight: 600 }}>Underlying Index</label>
                    <select
                      value={underlyingIndex}
                      onChange={(e) => {
                        const idx = e.target.value;
                        setUnderlyingIndex(idx);
                        let defaultLot = 1;
                        if (idx === 'NIFTY') defaultLot = 65;
                        else if (idx === 'BANKNIFTY') defaultLot = 15;
                        else if (idx === 'FINNIFTY') defaultLot = 25;
                        else if (idx === 'MIDCPNIFTY') defaultLot = 50;
                        else if (idx === 'SENSEX') defaultLot = 10;
                        else if (idx === 'BANKEX') defaultLot = 15;
                        setLotSizeInput(defaultLot.toString());
                        
                        const currentLots = parseFloat(lotsInput);
                        if (!isNaN(currentLots) && currentLots >= 0) {
                          setFormData(prev => ({ ...prev, qty: Math.round(currentLots * defaultLot) }));
                        } else if (formData.qty > 0) {
                          setLotsInput((formData.qty / defaultLot).toString());
                        }
                      }}
                      className="form-select"
                      style={{ borderColor: 'var(--primary-glow)' }}
                    >
                      <option value="NIFTY">NIFTY (Lot: 65)</option>
                      <option value="BANKNIFTY">BANKNIFTY (Lot: 15)</option>
                      <option value="FINNIFTY">FINNIFTY (Lot: 25)</option>
                      <option value="MIDCPNIFTY">MIDCPNIFTY (Lot: 50)</option>
                      <option value="SENSEX">SENSEX (Lot: 10)</option>
                      <option value="BANKEX">BANKEX (Lot: 15)</option>
                    </select>
                  </div>

                  {!isMultiLeg && (
                    <>
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
                    </>
                  )}

                  {isMultiLeg && (
                    <>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ color: '#bf5af2', fontWeight: 650 }}>Lots</label>
                        <input
                          type="number"
                          step="any"
                          value={lotsInput}
                          onChange={(e) => handleLotsChange(e.target.value)}
                          placeholder="e.g. 2"
                          className="form-input"
                          style={{ borderColor: 'rgba(191, 87, 242, 0.2)' }}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ color: '#bf5af2', fontWeight: 650 }}>Total Quantity</label>
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
                    </>
                  )}
                </div>

                {isMultiLeg && (
                  /* Two leg side-by-side card layout */
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    {/* Leg 1 Card */}
                    <div className="glass-card" style={{ padding: '16px', background: formData.action === 'BUY' ? 'rgba(52, 211, 153, 0.04)' : 'rgba(239, 68, 68, 0.04)', border: formData.action === 'BUY' ? '1px solid rgba(52, 211, 153, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)' }}>
                      <h4 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Leg 1: Selling/Main Leg</span>
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Action</label>
                            <select
                              name="action"
                              value={formData.action}
                              onChange={handleChange}
                              className="form-select"
                              style={{ color: formData.action === 'BUY' ? 'var(--color-win)' : 'var(--color-loss)', fontWeight: 600 }}
                            >
                              <option value="BUY">BUY / Long</option>
                              <option value="SELL">SELL / Short</option>
                            </select>
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Option Type</label>
                            <select
                              name="optionType"
                              value={formData.optionType}
                              onChange={handleChange}
                              className="form-select"
                            >
                              <option value="CE">CE</option>
                              <option value="PE">PE</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Strike Price</label>
                          <input
                            type="number"
                            name="strikePrice"
                            value={formData.strikePrice || ''}
                            onChange={handleChange}
                            placeholder="e.g. 22400"
                            className="form-input"
                            required
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
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
                          <div className="form-group" style={{ marginBottom: 0 }}>
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
                        </div>
                      </div>
                    </div>

                    {/* Leg 2 Card */}
                    <div className="glass-card" style={{ padding: '16px', background: leg2Action === 'BUY' ? 'rgba(52, 211, 153, 0.04)' : 'rgba(239, 68, 68, 0.04)', border: leg2Action === 'BUY' ? '1px solid rgba(52, 211, 153, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)' }}>
                      <h4 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Leg 2: Hedge Leg</span>
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Action</label>
                            <select
                              value={leg2Action}
                              onChange={(e) => setLeg2Action(e.target.value as TradeAction)}
                              className="form-select"
                              style={{ color: leg2Action === 'BUY' ? 'var(--color-win)' : 'var(--color-loss)', fontWeight: 600 }}
                            >
                              <option value="BUY">BUY / Long</option>
                              <option value="SELL">SELL / Short</option>
                            </select>
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Option Type</label>
                            <select
                              value={leg2OptionType}
                              onChange={(e) => setLeg2OptionType(e.target.value as 'CE' | 'PE' | 'None')}
                              className="form-select"
                            >
                              <option value="CE">CE</option>
                              <option value="PE">PE</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label">Strike Price</label>
                          <input
                            type="number"
                            value={leg2Strike || ''}
                            onChange={(e) => setLeg2Strike(parseFloat(e.target.value) || 0)}
                            placeholder="e.g. 22500"
                            className="form-input"
                            required
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Entry Price</label>
                            <input
                              type="number"
                              value={leg2EntryPrice || ''}
                              onChange={(e) => setLeg2EntryPrice(parseFloat(e.target.value) || 0)}
                              step="0.05"
                              placeholder="0.00"
                              className="form-input"
                              required
                            />
                          </div>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label">Exit Price</label>
                            <input
                              type="number"
                              value={leg2ExitPrice || ''}
                              onChange={(e) => setLeg2ExitPrice(parseFloat(e.target.value) || 0)}
                              step="0.05"
                              placeholder="0.00"
                              className="form-input"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Grid 2: Symbol & Broker & Product & Action */}
            {!isMultiLeg && (
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
            )}

            {isMultiLeg && (
              /* Shared details for multi-leg mode */
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr 1fr', 
                  gap: '16px', 
                  marginBottom: '16px' 
                }}
              >
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
            )}

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
            {formData.segment === 'F&O' && !isMultiLeg && (
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
                    style={{ borderColor: 'rgba(191, 87, 242, 0.2)', ...(usePartialExits ? { background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', cursor: 'not-allowed' } : {}) }}
                    required
                    disabled={usePartialExits}
                  />
                </div>
              </div>
            )}

            {/* Grid 3: Trade Execution Numbers */}
            {!isMultiLeg && (
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
                      style={usePartialExits ? { background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)', cursor: 'not-allowed' } : {}}
                      required
                      disabled={usePartialExits}
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
                <div className="form-group" style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Exit Price</label>
                    <button 
                      type="button"
                      onClick={() => {
                        const active = !usePartialExits;
                        setUsePartialExits(active);
                        if (active && partialExits.length === 1 && partialExits[0].qty === 0) {
                          setPartialExits([{ id: '1', qty: formData.qty || 0, price: formData.exitPrice || 0, time: formData.exitTime || new Date().toTimeString().slice(0, 5) }]);
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#bf5af2', fontSize: '0.72rem', cursor: 'pointer', padding: 0 }}
                    >
                      {usePartialExits ? "← Single Exit" : "+ Partial Exits"}
                    </button>
                  </div>
                  {!usePartialExits ? (
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
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', height: '36px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0 10px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Avg: ₹{formData.exitPrice || '0.00'} (Calc)
                    </div>
                  )}
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
            )}

            {/* Partial Exits Legs Row list */}
            {usePartialExits && (
              <div 
                className="glass-card" 
                style={{ 
                  padding: '12px 16px', 
                  marginBottom: '16px', 
                  border: '1px dashed var(--border-color)', 
                  background: 'rgba(255,255,255,0.01)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>Partial Exit Legs</span>
                  <button 
                    type="button" 
                    onClick={() => setPartialExits([...partialExits, { id: Date.now().toString(), qty: 0, price: 0, time: new Date().toTimeString().slice(0, 5) }])}
                    className="btn btn-secondary" 
                    style={{ padding: '3px 8px', fontSize: '0.7rem', height: '24px' }}
                  >
                    + Add Leg
                  </button>
                </div>

                {partialExits.map((leg, idx) => (
                  <div key={leg.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ flex: '1.2' }}>
                      <input 
                        type="number" 
                        placeholder="Qty (Units)" 
                        value={leg.qty || ''} 
                        onChange={(e) => {
                          const updated = [...partialExits];
                          updated[idx].qty = parseFloat(e.target.value) || 0;
                          setPartialExits(updated);
                        }}
                        className="form-input"
                        style={{ height: '30px', fontSize: '0.78rem' }}
                        required
                      />
                    </div>
                    <div style={{ flex: '1.2' }}>
                      <input 
                        type="number" 
                        placeholder="Exit Price" 
                        value={leg.price || ''} 
                        onChange={(e) => {
                          const updated = [...partialExits];
                          updated[idx].price = parseFloat(e.target.value) || 0;
                          setPartialExits(updated);
                        }}
                        className="form-input"
                        style={{ height: '30px', fontSize: '0.78rem' }}
                        step="0.05"
                        required
                      />
                    </div>
                    <div style={{ flex: '1' }}>
                      <input 
                        type="time" 
                        value={leg.time || ''} 
                        onChange={(e) => {
                          const updated = [...partialExits];
                          updated[idx].time = e.target.value;
                          setPartialExits(updated);
                        }}
                        className="form-input"
                        style={{ height: '30px', fontSize: '0.78rem', padding: '0 4px' }}
                        required
                      />
                    </div>
                    {partialExits.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setPartialExits(partialExits.filter(l => l.id !== leg.id));
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--color-loss)', cursor: 'pointer', fontSize: '0.85rem', padding: '4px' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

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
                <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Execution Mistake Tag</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {MISTAKES.map((m) => {
                    const isNone = m === 'None';
                    const isSelected = formData.mistake === m;
                    return (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setFormData((prev) => ({ ...prev, mistake: m }))}
                        className="btn"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                          cursor: 'pointer',
                          background: isSelected 
                            ? (isNone ? 'var(--color-win-bg)' : 'var(--color-loss-bg)') 
                            : 'var(--bg-card)',
                          border: isSelected 
                            ? `1.5px solid ${isNone ? 'var(--color-win)' : 'var(--color-loss)'}` 
                            : '1.5px solid var(--border-color)',
                          color: isSelected 
                            ? (isNone ? 'var(--color-win)' : 'var(--color-loss)') 
                            : 'var(--text-dim)',
                          fontWeight: isSelected ? 600 : 400
                        }}
                      >
                        {isNone ? (
                          <>
                            <Check size={12} />
                            <span>No Mistake (Clean Trade)</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={12} />
                            <span>{m}</span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Checklist Rules */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.92rem', marginBottom: '12px', color: 'var(--text-main)', fontWeight: 650 }}>
                Rule Checklist Compliance
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                {(() => {
                  const renderedRules = Array.from(new Set([
                    ...TRADING_RULES,
                    ...(formData.rulesFollowed || [])
                  ]));
                  return renderedRules.map((rule) => {
                    const isChecked = formData.rulesFollowed.includes(rule);
                    return (
                      <button
                        type="button"
                        key={rule}
                        onClick={() => handleRuleToggle(rule)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          background: isChecked ? 'var(--primary-glow)' : 'var(--bg-card)',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: `1.5px solid ${isChecked ? 'var(--primary)' : 'var(--border-color)'}`,
                          color: isChecked ? 'var(--text-main)' : 'var(--text-muted)',
                          fontWeight: isChecked ? 600 : 400,
                          transition: 'all 0.15s ease',
                          textAlign: 'left'
                        }}
                      >
                        <span>{rule}</span>
                        <div 
                          style={{ 
                            width: '16px', 
                            height: '16px', 
                            borderRadius: '4px', 
                            border: `1.5px solid ${isChecked ? 'var(--primary)' : 'var(--border-color)'}`,
                            background: isChecked ? 'var(--primary)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isChecked && <Check size={11} color="#ffffff" strokeWidth={3} />}
                        </div>
                      </button>
                    );
                  });
                })()}
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

            {/* Collapsible Custom Tags */}
            <div style={{ marginTop: '12px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => setShowTagsField(!showTagsField)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.72rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0,
                  fontWeight: 600
                }}
              >
                {showTagsField ? '[-]' : '[+]'} Show Custom Tags input (never used)
              </button>

              {showTagsField && (
                <div className="form-group" style={{ marginTop: '10px' }}>
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
              )}
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
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
