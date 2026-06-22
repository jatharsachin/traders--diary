import { create } from 'zustand';
import type { Trade, Setup, Segment, Product, TradeAction, Emotion, Mistake, CapitalAdjustment, Investment } from '../types';
import { calculateIndianTaxesAndBrokerage } from '../utils/taxEngine';
import { syncTradeToCloud, fetchTradesFromCloud, syncMetaToCloud, fetchMetaFromCloud, getSupabaseClient } from '../utils/supabaseClient';

interface TradeStore {
  trades: Trade[];
  setups: Setup[];
  baseCapital: number;
  capitalAdjustments: CapitalAdjustment[];
  theme: 'light' | 'dark';
  setBaseCapital: (capital: number) => void;
  toggleTheme: () => void;
  addTrade: (tradeData: Omit<Trade, 'id' | 'grossPnL' | 'brokerage' | 'taxes' | 'netPnL' | 'roi' | 'actualRR' | 'isExpiryDay' | 'durationMinutes'>) => void;
  editTrade: (id: string, tradeData: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
  addSetup: (setup: Setup) => void;
  deleteSetup: (name: string) => void;
  addCapitalAdjustment: (adj: Omit<CapitalAdjustment, 'id'>) => void;
  deleteCapitalAdjustment: (id: string) => void;
  resetToMockData: () => void;
  pullTradesFromCloud: () => Promise<boolean>;

  // Investments
  investments: Investment[];
  addInvestment: (invData: Omit<Investment, 'id'>) => void;
  editInvestment: (id: string, invData: Partial<Investment>) => void;
  deleteInvestment: (id: string) => void;
  exitInvestment: (id: string, exitPrice: number, exitDate: string, exitNotes: string, exitQty?: number) => void;

  // Supabase SaaS Auth Settings
  sessionUser: any;
  setSessionUser: (user: any) => void;
  signUpUser: (email: string, pass: string, metadata?: { first_name?: string; last_name?: string; mobile?: string }) => Promise<{ error: any }>;
  signInUser: (email: string, pass: string) => Promise<{ error: any }>;
  signOutUser: () => Promise<{ error: any }>;
  sendPasswordResetEmail: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  loadUserData: (userId: string) => void;

  // Privacy Settings
  isPnlVisible: boolean;
  togglePnlVisibility: () => void;

  // Weekly Retrospectives
  weeklyRetrospectives: Record<string, string>;
  saveWeeklyRetrospective: (weekId: string, notes: string) => void;
}

const DEFAULT_SETUPS: Setup[] = [
  { name: 'EMA Crossover', description: 'Trading based on 9 and 15 EMA cross on 5-min chart' },
  { name: 'Support Reversal', description: 'Buying at key daily/weekly support levels' },
  { name: 'ORB Breakout', description: 'Opening Range Breakout of first 15 mins' },
  { name: 'VWAP Pullback', description: 'Entering on pullbacks to the VWAP line' },
  { name: 'Price Action Breakout', description: 'Trading flag and pole or cup and handle pattern breakouts' },
];

// Helper to compute calculated fields for a trade
const computeTradeCalculations = (
  trade: Omit<Trade, 'id' | 'grossPnL' | 'brokerage' | 'taxes' | 'netPnL' | 'roi' | 'actualRR' | 'isExpiryDay' | 'durationMinutes'> & {
    strikePrice?: number;
    optionType?: 'CE' | 'PE' | 'None';
    setupType?: 'Breakout' | 'Pullback' | 'Reversal' | 'Range Bound' | 'None';
  }
) => {
  const { date, entryTime, exitTime, segment, product, action, qty, entryPrice, exitPrice, stopLoss } = trade;

  // 1. Expiry Day Detection (Thursday check)
  const parts = date.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  const isExpiryDay = d.getDay() === 4; // 4 = Thursday

  // 2. Holding Duration Calculation in Minutes
  const entryParts = entryTime.split(':');
  const exitParts = exitTime.split(':');
  const entryMins = parseInt(entryParts[0], 10) * 60 + parseInt(entryParts[1], 10);
  const exitMins = parseInt(exitParts[0], 10) * 60 + parseInt(exitParts[1], 10);
  let durationMinutes = exitMins - entryMins;
  if (durationMinutes < 0) durationMinutes = 0; // Handle overnight or entry error

  // Gross PnL
  // Long trade: (exit - entry) * qty. Short trade: (entry - exit) * qty
  const grossPnL = action === 'BUY' 
    ? (exitPrice - entryPrice) * qty 
    : (entryPrice - exitPrice) * qty;

  // Taxes & Brokerage
  const taxResult = calculateIndianTaxesAndBrokerage(segment, product, action, qty, entryPrice, exitPrice);
  
  const brokerage = taxResult.brokerage;
  const taxes = taxResult.totalCharges - brokerage;
  const netPnL = grossPnL - taxResult.totalCharges;

  // ROI: (Net PnL / Capital Deployed) * 100
  const capital = entryPrice * qty;
  const roi = capital > 0 ? (netPnL / capital) * 100 : 0;

  // Risk-to-Reward Ratio
  const riskPoints = Math.abs(entryPrice - stopLoss);
  const rewardPoints = Math.abs(exitPrice - entryPrice);
  const actualRR = riskPoints > 0 ? rewardPoints / riskPoints : 0;

  return {
    isExpiryDay,
    durationMinutes,
    grossPnL: Math.round(grossPnL * 100) / 100,
    brokerage,
    taxes: Math.round(taxes * 100) / 100,
    netPnL: Math.round(netPnL * 100) / 100,
    roi: Math.round(roi * 100) / 100,
    actualRR: Math.round(actualRR * 100) / 100,
  };
};

const getMockTrades = (): Trade[] => {
  const rawMockData = [
    {
      date: '2026-06-02',
      entryTime: '09:30',
      exitTime: '09:42',
      segment: 'F&O' as Segment,
      product: 'MIS' as Product,
      action: 'BUY' as TradeAction,
      symbol: 'NIFTY 22400 CE',
      qty: 100,
      entryPrice: 120,
      exitPrice: 165,
      slippagePoints: 0.5,
      stopLoss: 100,
      target: 160,
      strategy: 'EMA Crossover',
      rulesFollowed: ['Trend Alignment', 'Position Sizing OK'],
      emotion: 'Calm' as Emotion,
      mistake: 'None' as Mistake,
      notes: 'Clean entry on EMA crossover. Exited at target resistance zone.',
      strikePrice: 22400,
      optionType: 'CE' as const,
    },
    {
      date: '2026-06-03',
      entryTime: '11:15',
      exitTime: '12:05',
      segment: 'Equity' as Segment,
      product: 'MIS' as Product,
      action: 'BUY' as TradeAction,
      symbol: 'RELIANCE',
      qty: 50,
      entryPrice: 2450,
      exitPrice: 2430,
      slippagePoints: 1,
      stopLoss: 2440,
      target: 2480,
      strategy: 'Support Reversal',
      rulesFollowed: ['Patience Kept'],
      emotion: 'Fearful' as Emotion,
      mistake: 'Moving SL' as Mistake,
      notes: 'Moved stop loss lower in panic during a dip, resulting in a larger loss than planned. Need to follow rules.',
    },
    {
      date: '2026-06-04',
      entryTime: '14:00',
      exitTime: '14:05',
      segment: 'F&O' as Segment,
      product: 'MIS' as Product,
      action: 'BUY' as TradeAction,
      symbol: 'NIFTY 22500 CE',
      qty: 150,
      entryPrice: 40,
      exitPrice: 75,
      slippagePoints: 1,
      stopLoss: 25,
      target: 70,
      strategy: 'ORB Breakout',
      rulesFollowed: ['Patience Kept', 'Clean Execution'],
      emotion: 'Calm' as Emotion,
      mistake: 'None' as Mistake,
      notes: 'Expiry day momentum spike. Captured 35 points in 5 minutes.',
      strikePrice: 22500,
      optionType: 'CE' as const,
    },
    {
      date: '2026-06-08',
      entryTime: '14:20',
      exitTime: '15:10',
      segment: 'Equity' as Segment,
      product: 'CNC' as Product,
      action: 'BUY' as TradeAction,
      symbol: 'HDFCBANK',
      qty: 40,
      entryPrice: 1420,
      exitPrice: 1455,
      slippagePoints: 0,
      stopLoss: 1390,
      target: 1460,
      strategy: 'Support Reversal',
      rulesFollowed: ['Position Sizing OK', 'Patience Kept'],
      emotion: 'Calm' as Emotion,
      mistake: 'None' as Mistake,
      notes: 'Swing trade entry near historical support level. Exited just before target due to market weakness.',
    },
    {
      date: '2026-06-10',
      entryTime: '09:45',
      exitTime: '10:35',
      segment: 'F&O' as Segment,
      product: 'MIS' as Product,
      action: 'BUY' as TradeAction,
      symbol: 'NIFTY 22500 PE',
      qty: 150,
      entryPrice: 95,
      exitPrice: 60,
      slippagePoints: 1.5,
      stopLoss: 80,
      target: 130,
      strategy: 'ORB Breakout',
      rulesFollowed: [],
      emotion: 'Impatient' as Emotion,
      mistake: 'FOMO Entry' as Mistake,
      notes: 'Chased the market. Entered option buying trade without confirmation. Complete FOMO trade.',
      strikePrice: 22500,
      optionType: 'PE' as const,
    },
    {
      date: '2026-06-11',
      entryTime: '13:00',
      exitTime: '13:45',
      segment: 'F&O' as Segment,
      product: 'MIS' as Product,
      action: 'BUY' as TradeAction,
      symbol: 'BANKNIFTY 48200 CE',
      qty: 60,
      entryPrice: 280,
      exitPrice: 180,
      slippagePoints: 3,
      stopLoss: 240,
      target: 360,
      strategy: 'VWAP Pullback',
      rulesFollowed: [],
      emotion: 'Fearful' as Emotion,
      mistake: 'Moving SL' as Mistake,
      notes: 'Held options on expiry day. Premium melted fast as Banknifty traded sideways. Major decay loss.',
      strikePrice: 48200,
      optionType: 'CE' as const,
    },
    {
      date: '2026-06-15',
      entryTime: '10:30',
      exitTime: '10:48',
      segment: 'Equity' as Segment,
      product: 'MIS' as Product,
      action: 'SELL' as TradeAction,
      symbol: 'TATASTEEL',
      qty: 500,
      entryPrice: 155,
      exitPrice: 157.5,
      slippagePoints: 0.1,
      stopLoss: 154,
      target: 160,
      strategy: 'Price Action Breakout',
      rulesFollowed: ['Position Sizing OK'],
      emotion: 'Fearful' as Emotion,
      mistake: 'Moving SL' as Mistake,
      notes: 'Short trade in Tata Steel. Stock broke out on the upside instead of breaking down. Stop loss hit.',
    },
    {
      date: '2026-06-17',
      entryTime: '11:00',
      exitTime: '11:55',
      segment: 'F&O' as Segment,
      product: 'MIS' as Product,
      action: 'BUY' as TradeAction,
      symbol: 'NIFTY 22600 CE',
      qty: 100,
      entryPrice: 85,
      exitPrice: 50,
      slippagePoints: 1,
      stopLoss: 70,
      target: 120,
      strategy: 'EMA Crossover',
      rulesFollowed: [],
      emotion: 'Revengeful' as Emotion,
      mistake: 'Overtrading' as Mistake,
      notes: 'Took a random trade after the previous loss to recover money. Kept averaging and lost more.',
      strikePrice: 22600,
      optionType: 'CE' as const,
    },
    {
      date: '2026-06-18',
      entryTime: '09:20',
      exitTime: '09:32',
      segment: 'F&O' as Segment,
      product: 'MIS' as Product,
      action: 'BUY' as TradeAction,
      symbol: 'BANKNIFTY 48500 CE',
      qty: 60,
      entryPrice: 310,
      exitPrice: 420,
      slippagePoints: 2,
      stopLoss: 270,
      target: 400,
      strategy: 'ORB Breakout',
      rulesFollowed: ['Trend Alignment', 'Risk Size', 'Patience Kept'],
      emotion: 'Calm' as Emotion,
      mistake: 'None' as Mistake,
      notes: 'Opening range breakout trade on expiry day. Executed perfectly according to the plan.',
      strikePrice: 48500,
      optionType: 'CE' as const,
    },
    {
      date: '2026-06-19',
      entryTime: '13:50',
      exitTime: '14:05',
      segment: 'F&O' as Segment,
      product: 'MIS' as Product,
      action: 'BUY' as TradeAction,
      symbol: 'NIFTY 22700 CE',
      qty: 150,
      entryPrice: 75,
      exitPrice: 90,
      slippagePoints: 0.5,
      stopLoss: 60,
      target: 100,
      strategy: 'VWAP Pullback',
      rulesFollowed: ['Position Sizing OK'],
      emotion: 'Greedy' as Emotion,
      mistake: 'Early Exit' as Mistake,
      notes: 'Panicked and exited early at 90. Stock later went up to 110. Need to hold with patience.',
      strikePrice: 22700,
      optionType: 'CE' as const,
    }
  ];

  return rawMockData.map((t, idx) => {
    const computed = computeTradeCalculations(t);
    return {
      ...t,
      id: `trade-${idx + 1}-${Date.now()}`,
      ...computed
    };
  });
};

export const useTradeStore = create<TradeStore>((set, get) => {
  const getMockInvestments = (): Investment[] => {
    return [
      {
        id: 'inv-1',
        type: 'ETF',
        symbol: 'NIFTYBEES',
        qty: 250,
        buyPrice: 215,
        currentPrice: 242.50,
        date: '2026-01-10',
        notes: 'Long-term equity benchmark tracking Nifty 50.',
        status: 'ACTIVE',
      },
      {
        id: 'inv-2',
        type: 'BOND',
        symbol: 'SGB 2.50% Oct 2031',
        qty: 20,
        buyPrice: 6200,
        currentPrice: 6980,
        date: '2026-02-15',
        notes: 'Sovereign Gold Bond with 2.5% semi-annual interest.',
        status: 'ACTIVE',
      }
    ];
  };

  // Helper to get user-scoped key
  const getScopedKey = (baseKey: string) => {
    const userId = get().sessionUser?.id;
    return userId ? `${baseKey}_${userId}` : baseKey;
  };

  // Load initial data from LocalStorage (guest/fallback defaults)
  const loadTrades = (): Trade[] => {
    const saved = localStorage.getItem('traders_diary_trades');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse trades', e);
      }
    }
    const mock = getMockTrades();
    localStorage.setItem('traders_diary_trades', JSON.stringify(mock));
    return mock;
  };

  const loadSetups = (): Setup[] => {
    const saved = localStorage.getItem('traders_diary_setups');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse setups', e);
      }
    }
    localStorage.setItem('traders_diary_setups', JSON.stringify(DEFAULT_SETUPS));
    return DEFAULT_SETUPS;
  };

  const loadBaseCapital = (): number => {
    const saved = localStorage.getItem('traders_diary_capital');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 500000;
  };

  const loadTheme = (): 'light' | 'dark' => {
    const saved = localStorage.getItem('traders_diary_theme');
    return saved === 'light' ? 'light' : 'dark';
  };

  const loadAdjustments = (): CapitalAdjustment[] => {
    const saved = localStorage.getItem('traders_diary_adjustments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse adjustments', e);
      }
    }
    return [];
  };

  const loadInvestments = (): Investment[] => {
    const saved = localStorage.getItem('traders_diary_investments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse investments', e);
      }
    }
    const mock = getMockInvestments();
    localStorage.setItem('traders_diary_investments', JSON.stringify(mock));
    return mock;
  };

  const loadPnlVisibility = (): boolean => {
    const saved = localStorage.getItem('traders_diary_pnl_visibility');
    return saved !== null ? JSON.parse(saved) : true;
  };

  const loadWeeklyRetrospectives = (): Record<string, string> => {
    const saved = localStorage.getItem('traders_diary_weekly_retrospectives');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse weekly retrospectives', e);
      }
    }
    return {};
  };

  return {
    trades: loadTrades(),
    setups: loadSetups(),
    baseCapital: loadBaseCapital(),
    capitalAdjustments: loadAdjustments(),
    theme: loadTheme(),
    investments: loadInvestments(),
    sessionUser: null,
    isPnlVisible: loadPnlVisibility(),
    weeklyRetrospectives: loadWeeklyRetrospectives(),

    setSessionUser: (user) => set({ sessionUser: user }),

    signUpUser: async (email, pass, metadata) => {
      const client = getSupabaseClient();
      if (!client) return { error: new Error('Supabase client not configured') };
      try {
        const { error } = await client.auth.signUp({ 
          email, 
          password: pass,
          options: {
            data: metadata || {}
          }
        });
        if (error) return { error };
        return { error: null };
      } catch (e: any) {
        return { error: e };
      }
    },

    signInUser: async (email, pass) => {
      const client = getSupabaseClient();
      if (!client) return { error: new Error('Supabase client not configured') };
      try {
        const { error } = await client.auth.signInWithPassword({ email, password: pass });
        if (error) return { error };
        return { error: null };
      } catch (e: any) {
        return { error: e };
      }
    },

    sendPasswordResetEmail: async (email) => {
      const client = getSupabaseClient();
      if (!client) return { error: new Error('Supabase client not configured') };
      try {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });
        if (error) return { error };
        return { error: null };
      } catch (e: any) {
        return { error: e };
      }
    },

    updatePassword: async (password) => {
      const client = getSupabaseClient();
      if (!client) return { error: new Error('Supabase client not configured') };
      try {
        const { error } = await client.auth.updateUser({ password });
        if (error) return { error };
        return { error: null };
      } catch (e: any) {
        return { error: e };
      }
    },

    signOutUser: async () => {
      const client = getSupabaseClient();
      if (!client) return { error: new Error('Supabase client not configured') };
      try {
        const { error } = await client.auth.signOut();
        if (error) return { error };
        set({
          sessionUser: null,
          trades: [],
          setups: DEFAULT_SETUPS,
          baseCapital: 500000,
          capitalAdjustments: [],
          investments: [],
          weeklyRetrospectives: {},
        });
        return { error: null };
      } catch (e: any) {
        return { error: e };
      }
    },

    loadUserData: (userId) => {
      const getOrMigrate = (baseKey: string, defaultVal: any) => {
        const scopedKey = `${baseKey}_${userId}`;
        const savedScoped = localStorage.getItem(scopedKey);
        if (savedScoped) {
          try {
            return JSON.parse(savedScoped);
          } catch (e) {
            console.error(`Failed to parse ${scopedKey}`, e);
          }
        }
        
        // Migrate guest/default data if scoped key is empty
        const savedGuest = localStorage.getItem(baseKey);
        if (savedGuest) {
          try {
            const parsed = JSON.parse(savedGuest);
            localStorage.setItem(scopedKey, savedGuest);
            return parsed;
          } catch (e) {
            console.error(`Failed to parse guest key ${baseKey}`, e);
          }
        }
        
        localStorage.setItem(scopedKey, JSON.stringify(defaultVal));
        return defaultVal;
      };

      const trades = getOrMigrate('traders_diary_trades', []);
      const setups = getOrMigrate('traders_diary_setups', DEFAULT_SETUPS);
      const baseCapital = (() => {
        const scopedKey = `traders_diary_capital_${userId}`;
        const savedScoped = localStorage.getItem(scopedKey);
        if (savedScoped) {
          const parsed = parseFloat(savedScoped);
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
        const savedGuest = localStorage.getItem('traders_diary_capital');
        if (savedGuest) {
          const parsed = parseFloat(savedGuest);
          if (!isNaN(parsed) && parsed > 0) {
            localStorage.setItem(scopedKey, savedGuest);
            return parsed;
          }
        }
        return 500000;
      })();
      const capitalAdjustments = getOrMigrate('traders_diary_adjustments', []);
      const investments = getOrMigrate('traders_diary_investments', getMockInvestments());
      const weeklyRetrospectives = getOrMigrate('traders_diary_weekly_retrospectives', {});

      set({
        trades,
        setups,
        baseCapital,
        capitalAdjustments,
        investments,
        weeklyRetrospectives,
      });

      get().pullTradesFromCloud();
    },

    saveWeeklyRetrospective: (weekId, notes) => set((state) => {
      const updated = { ...state.weeklyRetrospectives, [weekId]: notes };
      localStorage.setItem(getScopedKey('traders_diary_weekly_retrospectives'), JSON.stringify(updated));
      syncMetaToCloud('weekly_retrospectives', updated);
      return { weeklyRetrospectives: updated };
    }),

    togglePnlVisibility: () => set((state) => {
      const next = !state.isPnlVisible;
      localStorage.setItem(getScopedKey('traders_diary_pnl_visibility'), JSON.stringify(next));
      return { isPnlVisible: next };
    }),

    setBaseCapital: (capital) => set(() => {
      localStorage.setItem(getScopedKey('traders_diary_capital'), capital.toString());
      syncMetaToCloud('base_capital', capital.toString());
      return { baseCapital: capital };
    }),

    toggleTheme: () => set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(getScopedKey('traders_diary_theme'), nextTheme);
      return { theme: nextTheme };
    }),

    addTrade: (tradeData) => set((state) => {
      const calculated = computeTradeCalculations(tradeData);
      const newTrade: Trade = {
        ...tradeData,
        id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...calculated
      };
      const updatedTrades = [newTrade, ...state.trades];
      localStorage.setItem(getScopedKey('traders_diary_trades'), JSON.stringify(updatedTrades));
      
      // Async Cloud Sync
      syncTradeToCloud('insert', newTrade);

      return { trades: updatedTrades };
    }),

    editTrade: (id, tradeData) => set((state) => {
      const updatedTrades = state.trades.map((t) => {
        if (t.id === id) {
          const merged = { ...t, ...tradeData };
          const calculated = computeTradeCalculations({
            date: merged.date,
            entryTime: merged.entryTime,
            exitTime: merged.exitTime,
            segment: merged.segment,
            product: merged.product,
            action: merged.action,
            symbol: merged.symbol,
            qty: merged.qty,
            entryPrice: merged.entryPrice,
            exitPrice: merged.exitPrice,
            slippagePoints: merged.slippagePoints,
            stopLoss: merged.stopLoss,
            target: merged.target,
            strategy: merged.strategy,
            rulesFollowed: merged.rulesFollowed,
            emotion: merged.emotion,
            mistake: merged.mistake,
            notes: merged.notes,
            chartUrl: merged.chartUrl,
            strikePrice: merged.strikePrice,
            optionType: merged.optionType,
            setupType: merged.setupType
          });
          const updatedTrade = { ...merged, ...calculated };
          
          // Async Cloud Sync
          syncTradeToCloud('update', updatedTrade);

          return updatedTrade;
        }
        return t;
      });
      localStorage.setItem(getScopedKey('traders_diary_trades'), JSON.stringify(updatedTrades));
      return { trades: updatedTrades };
    }),

    deleteTrade: (id) => set((state) => {
      const updatedTrades = state.trades.filter((t) => t.id !== id);
      localStorage.setItem(getScopedKey('traders_diary_trades'), JSON.stringify(updatedTrades));
      
      // Async Cloud Sync
      syncTradeToCloud('delete', { id });

      return { trades: updatedTrades };
    }),

    addSetup: (setup) => set((state) => {
      const updatedSetups = [...state.setups, setup];
      localStorage.setItem(getScopedKey('traders_diary_setups'), JSON.stringify(updatedSetups));
      syncMetaToCloud('setups', updatedSetups);
      return { setups: updatedSetups };
    }),

    deleteSetup: (name) => set((state) => {
      const updatedSetups = state.setups.filter((s) => s.name !== name);
      localStorage.setItem(getScopedKey('traders_diary_setups'), JSON.stringify(updatedSetups));
      syncMetaToCloud('setups', updatedSetups);
      return { setups: updatedSetups };
    }),

    resetToMockData: () => set(() => {
      const mock = getMockTrades();
      const mockInv = getMockInvestments();
      localStorage.setItem(getScopedKey('traders_diary_trades'), JSON.stringify(mock));
      localStorage.setItem(getScopedKey('traders_diary_setups'), JSON.stringify(DEFAULT_SETUPS));
      localStorage.setItem(getScopedKey('traders_diary_adjustments'), JSON.stringify([]));
      localStorage.setItem(getScopedKey('traders_diary_investments'), JSON.stringify(mockInv));
      localStorage.setItem(getScopedKey('traders_diary_weekly_retrospectives'), JSON.stringify({}));
      
      // Sync mock adjustments and setups to cloud
      syncMetaToCloud('setups', DEFAULT_SETUPS);
      syncMetaToCloud('capital_adjustments', []);
      syncMetaToCloud('investments', mockInv);
      syncMetaToCloud('weekly_retrospectives', {});
      for (const t of mock) {
        syncTradeToCloud('insert', t);
      }

      return { trades: mock, setups: DEFAULT_SETUPS, capitalAdjustments: [], investments: mockInv, weeklyRetrospectives: {} };
    }),

    addCapitalAdjustment: (adj) => set((state) => {
      const newAdj: CapitalAdjustment = {
        ...adj,
        id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      const updated = [newAdj, ...state.capitalAdjustments];
      localStorage.setItem(getScopedKey('traders_diary_adjustments'), JSON.stringify(updated));
      syncMetaToCloud('capital_adjustments', updated);
      return { capitalAdjustments: updated };
    }),

    deleteCapitalAdjustment: (id) => set((state) => {
      const updated = state.capitalAdjustments.filter((a) => a.id !== id);
      localStorage.setItem(getScopedKey('traders_diary_adjustments'), JSON.stringify(updated));
      syncMetaToCloud('capital_adjustments', updated);
      return { capitalAdjustments: updated };
    }),

    pullTradesFromCloud: async () => {
      const userId = get().sessionUser?.id;
      if (!userId) return false;

      // 1. Trades
      const cloudTrades = await fetchTradesFromCloud();
      if (cloudTrades !== null) {
        if (cloudTrades.length > 0) {
          set({ trades: cloudTrades });
          localStorage.setItem(`traders_diary_trades_${userId}`, JSON.stringify(cloudTrades));
        } else if (get().trades.length > 0) {
          for (const trade of get().trades) {
            await syncTradeToCloud('insert', trade);
          }
        }
      }

      // 2. Base Capital
      const baseCapitalCloud = await fetchMetaFromCloud('base_capital');
      if (baseCapitalCloud !== null) {
        const capitalNum = parseFloat(baseCapitalCloud);
        if (!isNaN(capitalNum)) {
          set({ baseCapital: capitalNum });
          localStorage.setItem(`traders_diary_capital_${userId}`, capitalNum.toString());
        }
      } else {
        await syncMetaToCloud('base_capital', get().baseCapital.toString());
      }

      // 3. Investments
      const investmentsCloud = await fetchMetaFromCloud('investments');
      if (investmentsCloud !== null) {
        set({ investments: investmentsCloud });
        localStorage.setItem(`traders_diary_investments_${userId}`, JSON.stringify(investmentsCloud));
      } else if (get().investments.length > 0) {
        await syncMetaToCloud('investments', get().investments);
      }

      // 4. Capital Adjustments
      const adjustmentsCloud = await fetchMetaFromCloud('capital_adjustments');
      if (adjustmentsCloud !== null) {
        set({ capitalAdjustments: adjustmentsCloud });
        localStorage.setItem(`traders_diary_adjustments_${userId}`, JSON.stringify(adjustmentsCloud));
      } else if (get().capitalAdjustments.length > 0) {
        await syncMetaToCloud('capital_adjustments', get().capitalAdjustments);
      }

      // 5. Setups
      const setupsCloud = await fetchMetaFromCloud('setups');
      if (setupsCloud !== null) {
        set({ setups: setupsCloud });
        localStorage.setItem(`traders_diary_setups_${userId}`, JSON.stringify(setupsCloud));
      } else if (get().setups.length > 0) {
        await syncMetaToCloud('setups', get().setups);
      }

      // 6. Weekly Retrospectives
      const retrosCloud = await fetchMetaFromCloud('weekly_retrospectives');
      if (retrosCloud !== null) {
        set({ weeklyRetrospectives: retrosCloud });
        localStorage.setItem(`traders_diary_weekly_retrospectives_${userId}`, JSON.stringify(retrosCloud));
      } else if (Object.keys(get().weeklyRetrospectives).length > 0) {
        await syncMetaToCloud('weekly_retrospectives', get().weeklyRetrospectives);
      }

      return true;
    },

    // Investments Action implementations
    addInvestment: (invData) => set((state) => {
      const newInv: Investment = {
        ...invData,
        status: 'ACTIVE',
        id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      };
      const updated = [...state.investments, newInv];
      localStorage.setItem(getScopedKey('traders_diary_investments'), JSON.stringify(updated));
      syncMetaToCloud('investments', updated);
      return { investments: updated };
    }),

    editInvestment: (id, invData) => set((state) => {
      const updated = state.investments.map((i) => i.id === id ? { ...i, ...invData } : i);
      localStorage.setItem(getScopedKey('traders_diary_investments'), JSON.stringify(updated));
      syncMetaToCloud('investments', updated);
      return { investments: updated };
    }),

    deleteInvestment: (id) => set((state) => {
      const updated = state.investments.filter((i) => i.id !== id);
      localStorage.setItem(getScopedKey('traders_diary_investments'), JSON.stringify(updated));
      syncMetaToCloud('investments', updated);
      return { investments: updated };
    }),

    exitInvestment: (id, exitPrice, exitDate, exitNotes, exitQty) => set((state) => {
      const newExits: Investment[] = [];
      const updated = state.investments.map((i) => {
        if (i.id === id) {
          const qtyToExit = exitQty !== undefined ? exitQty : i.qty;
          if (qtyToExit < i.qty && qtyToExit > 0) {
            const partialExitRecord: Investment = {
              ...i,
              id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              qty: qtyToExit,
              status: 'EXITED' as const,
              exitPrice,
              exitDate,
              exitNotes: `[Partial Exit of ${qtyToExit}/${i.qty}] ${exitNotes}`.trim()
            };
            newExits.push(partialExitRecord);
            return {
              ...i,
              qty: i.qty - qtyToExit,
              notes: `${i.notes}\n[Partial exit of ${qtyToExit} units on ${exitDate} @ ₹${exitPrice}]`.trim()
            };
          } else {
            return {
              ...i,
              status: 'EXITED' as const,
              exitPrice,
              exitDate,
              exitNotes
            };
          }
        }
        return i;
      });

      const finalInvestments = [...updated, ...newExits];
      localStorage.setItem(getScopedKey('traders_diary_investments'), JSON.stringify(finalInvestments));
      syncMetaToCloud('investments', finalInvestments);
      return { investments: finalInvestments };
    }),
  };
});
