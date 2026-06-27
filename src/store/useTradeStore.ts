import { create } from 'zustand';
import type { 
  Trade, Setup, Broker, CapitalAdjustment, Investment, BrokerAccount, BankAccount, 
  SubscriptionExpense, BankTransaction, BrokerChargesConfig 
} from '../types';
import { calculateIndianTaxesAndBrokerage } from '../utils/taxEngine';
import { 
  syncTradeToCloud, fetchTradesFromCloud, syncMetaToCloud, 
  fetchMetaFromCloud, getSupabaseClient 
} from '../utils/supabaseClient';
import { getFinancialYear } from '../utils/fyHelper';

const getCurrentLiveFY = () => {
  const today = new Date().toISOString().split('T')[0];
  return getFinancialYear(today);
};

const checkFYAndConfirm = (targetFY: string, actionType: string): boolean => {
  const currentLive = getCurrentLiveFY();
  if (targetFY !== currentLive) {
    return window.confirm(`Warning: You are performing a ${actionType} action in a historical/non-current financial year (${targetFY}). Are you sure you want to proceed?`);
  }
  return true;
};

const notifyFYSave = (targetFY: string) => {
  const currentLive = getCurrentLiveFY();
  if (targetFY !== currentLive) {
    setTimeout(() => {
      alert(`Success: Data successfully saved for Financial Year ${targetFY}!`);
    }, 100);
  }
};

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
  editCapitalAdjustment: (id: string, notes: string) => void;
  resetToMockData: () => void;
  pullTradesFromCloud: () => Promise<boolean>;

  // Investments
  investments: Investment[];
  addInvestment: (invData: Omit<Investment, 'id'>) => void;
  editInvestment: (id: string, invData: Partial<Investment>) => void;
  deleteInvestment: (id: string) => void;
  exitInvestment: (id: string, exitPrice: number, exitDate: string, exitNotes: string, exitQty?: number) => void;
  updateInvestmentsList: (updatedList: Investment[]) => void;
  syncAllInvestmentPrices: () => Promise<{ updatedCount: number; failedSymbols: string[] }>;

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

  // Financial Year Filter
  selectedFY: string;
  setSelectedFY: (fy: string) => void;
  lockedFYs: string[];
  toggleLockFY: (fy: string) => void;
  clearFYData: (fy: string) => void;
  noTradeDays: string[];
  toggleNoTradeDay: (date: string) => void;

  bulkImportTrades: (
    imported: Omit<Trade, 'id' | 'grossPnL' | 'brokerage' | 'taxes' | 'netPnL' | 'roi' | 'actualRR' | 'isExpiryDay' | 'durationMinutes'>[],
    overwrite: boolean
  ) => void;

  // Profile and Broker settings
  userName: string;
  userAvatar: string;
  activeBrokers: Broker[];
  defaultBroker: Broker;
  setProfile: (name: string, avatar: string) => void;
  setActiveBrokers: (brokers: Broker[]) => void;
  setDefaultBroker: (broker: Broker) => void;

  // NEW MULTI-USER & BANK LEDGER PROPERTIES
  brokerAccounts: BrokerAccount[];
  bankAccounts: BankAccount[];
  subscriptionExpenses: SubscriptionExpense[];
  bankTransactions: BankTransaction[];
  brokerCharges: BrokerChargesConfig[];

  addBrokerAccount: (account: Omit<BrokerAccount, 'id'>) => void;
  editBrokerAccount: (id: string, accountData: Partial<BrokerAccount>) => void;
  deleteBrokerAccount: (id: string) => void;

  addBankAccount: (bank: Omit<BankAccount, 'id'>) => void;
  editBankAccount: (id: string, bankData: Partial<BankAccount>) => void;
  deleteBankAccount: (id: string) => void;

  addSubscriptionExpense: (expense: Omit<SubscriptionExpense, 'id'>) => void;
  deleteSubscriptionExpense: (id: string) => void;

  updateBrokerCharges: (charges: BrokerChargesConfig[]) => void;
  
  // Bank transaction direct adjustments
  addDirectBankTransaction: (tx: Omit<BankTransaction, 'id'>) => void;
  deleteDirectBankTransaction: (id: string) => void;
  editDirectBankTransaction: (id: string, txData: Partial<BankTransaction>) => void;
}

const DEFAULT_SETUPS: Setup[] = [
  { name: 'EMA Crossover', description: 'Trading based on 9 and 15 EMA cross on 5-min chart' },
  { name: 'Support Reversal', description: 'Buying at key daily/weekly support levels' },
  { name: 'ORB Breakout', description: 'Opening Range Breakout of first 15 mins' },
  { name: 'VWAP Pullback', description: 'Entering on pullbacks to the VWAP line' },
  { name: 'Price Action Breakout', description: 'Trading flag and pole or cup and handle pattern breakouts' },
];

const DEFAULT_BROKER_ACCOUNTS: BrokerAccount[] = [
  { id: 'acc-1', broker: 'Zerodha', accountName: 'Sachin', startingCapital: 500000, active: true },
  { id: 'acc-2', broker: 'Dhan', accountName: 'Sachin', startingCapital: 200000, active: true },
  { id: 'acc-3', broker: 'Dhan', accountName: 'Rupali', startingCapital: 100000, active: true },
];

const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
  { id: 'bank-1', bankName: 'SBI', accountHolderName: 'Sachin', startingBalance: 150000, active: true },
  { id: 'bank-2', bankName: 'HDFC', accountHolderName: 'Rupali', startingBalance: 80000, active: true },
];

const DEFAULT_BROKER_CHARGES: BrokerChargesConfig[] = [
  { broker: 'Zerodha', deliveryRatePct: 0, deliveryMaxFee: 0, intradayRatePct: 0.03, intradayMaxFee: 20, optionsFlatFee: 20, futuresRatePct: 0.03, futuresMaxFee: 20 },
  { broker: 'Groww', deliveryRatePct: 0.05, deliveryMaxFee: 20, intradayRatePct: 0.05, intradayMaxFee: 20, optionsFlatFee: 20, futuresRatePct: 0.05, futuresMaxFee: 20 },
  { broker: 'Angel One', deliveryRatePct: 0, deliveryMaxFee: 0, intradayRatePct: 0.03, intradayMaxFee: 20, optionsFlatFee: 20, futuresRatePct: 0.03, futuresMaxFee: 20 },
  { broker: 'Upstox', deliveryRatePct: 0.1, deliveryMaxFee: 20, intradayRatePct: 0.05, intradayMaxFee: 20, optionsFlatFee: 20, futuresRatePct: 0.05, futuresMaxFee: 20 },
  { broker: 'Fyers', deliveryRatePct: 0, deliveryMaxFee: 0, intradayRatePct: 0.03, intradayMaxFee: 20, optionsFlatFee: 20, futuresRatePct: 0.03, futuresMaxFee: 20 },
  { broker: 'Dhan', deliveryRatePct: 0, deliveryMaxFee: 0, intradayRatePct: 0.03, intradayMaxFee: 20, optionsFlatFee: 20, futuresRatePct: 0.03, futuresMaxFee: 20 },
  { broker: 'Kotak Neo', deliveryRatePct: 0, deliveryMaxFee: 0, intradayRatePct: 0, intradayMaxFee: 0, optionsFlatFee: 20, futuresRatePct: 0.03, futuresMaxFee: 20 },
  { broker: 'Other', deliveryRatePct: 0.1, deliveryMaxFee: 20, intradayRatePct: 0.03, intradayMaxFee: 20, optionsFlatFee: 20, futuresRatePct: 0.03, futuresMaxFee: 20 },
];

const DEFAULT_SUBSCRIPTION_EXPENSES: SubscriptionExpense[] = [
  { id: 'sub-1', name: 'Tradetron Algo Basic', amount: 1200, date: '2026-06-01', paymentSource: 'Bank', bankAccountId: 'bank-1', notes: 'Monthly algo platform fee', frequency: 'Monthly' },
  { id: 'sub-2', name: 'Sensibull Options Pro', amount: 800, date: '2026-06-05', paymentSource: 'Broker', brokerAccountId: 'acc-1', notes: 'Options analysis subscription', frequency: 'Monthly' },
];

// Helper to compute calculated fields for a trade
const computeTradeCalculations = (
  trade: Omit<Trade, 'id' | 'grossPnL' | 'brokerage' | 'taxes' | 'netPnL' | 'roi' | 'actualRR' | 'isExpiryDay' | 'durationMinutes'> & {
    strikePrice?: number;
    optionType?: 'CE' | 'PE' | 'None';
    setupType?: 'Breakout' | 'Pullback' | 'Reversal' | 'Range Bound' | 'None';
    useManualCharges?: boolean;
    manualBrokerage?: number;
    manualTaxes?: number;
    holdingType?: 'Short Term' | 'Long Term';
    broker?: Broker;
  },
  chargesConfig?: BrokerChargesConfig
) => {
  const { date, entryTime, exitTime, exitDate, segment, product, action, qty, entryPrice, exitPrice, stopLoss } = trade;

  // 1. Expiry Day Detection (Thursday check)
  const parts = date.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const d = new Date(year, month, day);
  const isExpiryDay = d.getDay() === 4; // 4 = Thursday

  // 2. Holding Duration Calculation in Minutes
  let durationMinutes = 0;
  const actualExitDate = exitDate || date;
  try {
    const entryDateTimeStr = `${date}T${entryTime}:00`;
    const exitDateTimeStr = `${actualExitDate}T${exitTime}:00`;
    const entryDateObj = new Date(entryDateTimeStr);
    const exitDateObj = new Date(exitDateTimeStr);
    const diffMs = exitDateObj.getTime() - entryDateObj.getTime();
    durationMinutes = Math.max(0, Math.floor(diffMs / (1000 * 60)));
  } catch (err) {
    const entryParts = entryTime.split(':');
    const exitParts = exitTime.split(':');
    const entryMins = parseInt(entryParts[0], 10) * 60 + parseInt(entryParts[1], 10);
    const exitMins = parseInt(exitParts[0], 10) * 60 + parseInt(exitParts[1], 10);
    durationMinutes = exitMins - entryMins;
    if (durationMinutes < 0) durationMinutes = 0;
  } 

  // Gross PnL
  const grossPnL = action === 'BUY' 
    ? (exitPrice - entryPrice) * qty 
    : (entryPrice - exitPrice) * qty;

  // Taxes & Brokerage
  let brokerage = 0;
  let taxes = 0;
  let totalCharges = 0;

  if (trade.useManualCharges) {
    brokerage = trade.manualBrokerage || 0;
    taxes = trade.manualTaxes || 0;
    totalCharges = brokerage + taxes;
  } else {
    const taxResult = calculateIndianTaxesAndBrokerage(segment, product, action, qty, entryPrice, exitPrice, chargesConfig);
    brokerage = taxResult.brokerage;
    taxes = taxResult.totalCharges - brokerage;
    totalCharges = taxResult.totalCharges;
  }
  const netPnL = grossPnL - totalCharges;

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
    brokerage: Math.round(brokerage * 100) / 100,
    taxes: Math.round(taxes * 100) / 100,
    netPnL: Math.round(netPnL * 100) / 100,
    roi: Math.round(roi * 100) / 100,
    actualRR: Math.round(actualRR * 100) / 100,
  };
};

const updateBaseCapital = (accounts: BrokerAccount[]) => {
  return accounts.filter(a => a.active).reduce((sum, a) => sum + a.startingCapital, 0);
};

export const useTradeStore = create<TradeStore>((set, get) => {
  const getMockInvestments = (): Investment[] => {
    return [];
  };

  // Helper to get user-scoped key
  const getScopedKey = (baseKey: string) => {
    try {
      const state = typeof get === 'function' ? get() : null;
      const userId = state?.sessionUser?.id;
      return userId ? `${baseKey}_${userId}` : baseKey;
    } catch (e) {
      return baseKey;
    }
  };

  // Load initial data from LocalStorage with Migrations
  const loadBrokerAccounts = (): BrokerAccount[] => {
    const saved = localStorage.getItem('traders_diary_broker_accounts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as BrokerAccount[];
        let changed = false;
        const updated = parsed.map(a => {
          if (a.accountName === 'Wife') {
            a.accountName = 'Rupali';
            changed = true;
          }
          return a;
        });
        if (changed) {
          localStorage.setItem('traders_diary_broker_accounts', JSON.stringify(updated));
        }
        return updated;
      } catch (e) {
        console.error('Failed to parse broker accounts', e);
      }
    }
    localStorage.setItem('traders_diary_broker_accounts', JSON.stringify(DEFAULT_BROKER_ACCOUNTS));
    return DEFAULT_BROKER_ACCOUNTS;
  };

  const loadBankAccounts = (): BankAccount[] => {
    const saved = localStorage.getItem('traders_diary_bank_accounts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as BankAccount[];
        let changed = false;
        const updated = parsed.map(b => {
          if (b.accountHolderName === 'Wife') {
            b.accountHolderName = 'Rupali';
            changed = true;
          }
          return b;
        });
        if (changed) {
          localStorage.setItem('traders_diary_bank_accounts', JSON.stringify(updated));
        }
        return updated;
      } catch (e) {
        console.error('Failed to parse bank accounts', e);
      }
    }
    localStorage.setItem('traders_diary_bank_accounts', JSON.stringify(DEFAULT_BANK_ACCOUNTS));
    return DEFAULT_BANK_ACCOUNTS;
  };

  const loadBrokerCharges = (): BrokerChargesConfig[] => {
    const saved = localStorage.getItem('traders_diary_broker_charges');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse broker charges', e);
      }
    }
    localStorage.setItem('traders_diary_broker_charges', JSON.stringify(DEFAULT_BROKER_CHARGES));
    return DEFAULT_BROKER_CHARGES;
  };

  const loadSubscriptionExpenses = (): SubscriptionExpense[] => {
    const saved = localStorage.getItem('traders_diary_subscription_expenses');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse subscription expenses', e);
      }
    }
    localStorage.setItem('traders_diary_subscription_expenses', JSON.stringify(DEFAULT_SUBSCRIPTION_EXPENSES));
    return DEFAULT_SUBSCRIPTION_EXPENSES;
  };

  const loadBankTransactions = (): BankTransaction[] => {
    const saved = localStorage.getItem('traders_diary_bank_transactions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse bank transactions', e);
      }
    }
    localStorage.setItem('traders_diary_bank_transactions', JSON.stringify([]));
    return [];
  };

  const loadTrades = (accountsList: BrokerAccount[]): Trade[] => {
    const saved = localStorage.getItem('traders_diary_trades');
    let tradesList: Trade[] = [];
    if (saved) {
      try {
        tradesList = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse trades', e);
        tradesList = [];
      }
    }
    if (tradesList.length === 0 && !saved) {
      tradesList = []; 
    }

    // Migrate trades to new schema (assigning brokerAccountId)
    let migrated = false;
    const updated = tradesList.map((t) => {
      if (!t.brokerAccountId) {
        const matched = accountsList.find(a => a.broker === t.broker);
        t.brokerAccountId = matched ? matched.id : (accountsList[0]?.id || 'acc-1');
        migrated = true;
      }
      return t;
    });

    if (migrated || !saved) {
      localStorage.setItem('traders_diary_trades', JSON.stringify(updated));
    }
    return updated;
  };

  const loadBaseCapital = (accountsList: BrokerAccount[]): number => {
    return updateBaseCapital(accountsList);
  };

  const loadTheme = (): 'light' | 'dark' => {
    const saved = localStorage.getItem('traders_diary_theme');
    return saved === 'light' ? 'light' : 'dark';
  };

  const loadAdjustments = (accountsList: BrokerAccount[], banksList: BankAccount[]): CapitalAdjustment[] => {
    const saved = localStorage.getItem('traders_diary_adjustments');
    let adjList: CapitalAdjustment[] = [];
    if (saved) {
      try {
        adjList = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse adjustments', e);
      }
    }

    // Migrate adjustments to new schema
    let migrated = false;
    const updated = adjList.map((a) => {
      if (!a.brokerAccountId) {
        const matched = accountsList.find(acc => acc.broker === a.broker);
        a.brokerAccountId = matched ? matched.id : (accountsList[0]?.id || 'acc-1');
        migrated = true;
      }
      if (!a.bankAccountId) {
        a.bankAccountId = banksList[0]?.id || 'bank-1';
        migrated = true;
      }
      return a;
    });

    if (migrated || !saved) {
      localStorage.setItem('traders_diary_adjustments', JSON.stringify(updated));
    }
    return updated;
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
    return getMockInvestments();
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

  const loadUserName = (): string => {
    return localStorage.getItem('traders_diary_user_name') || 'Sachin';
  };

  const loadUserAvatar = (): string => {
    return localStorage.getItem('traders_diary_user_avatar') || 'bull';
  };

  const loadActiveBrokers = (): Broker[] => {
    const saved = localStorage.getItem('traders_diary_active_brokers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse active brokers', e);
      }
    }
    return ['Zerodha', 'Groww', 'Angel One', 'Upstox', 'Fyers', 'Dhan', 'Kotak Neo', 'Other'];
  };

  const loadDefaultBroker = (): Broker => {
    const saved = localStorage.getItem('traders_diary_default_broker');
    if (saved && ['Zerodha', 'Groww', 'Angel One', 'Upstox', 'Fyers', 'Dhan', 'Kotak Neo', 'Other'].includes(saved)) {
      return saved as Broker;
    }
    return 'Zerodha';
  };

  const loadLockedFYs = (): string[] => {
    const saved = localStorage.getItem('traders_diary_locked_fys');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse locked FYs', e);
      }
    }
    return ['FY 2024-25', 'FY 2025-26'];
  };

  const loadNoTradeDays = (): string[] => {
    const saved = localStorage.getItem(getScopedKey('traders_diary_notradedays'));
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse no trade days', e);
      }
    }
    return [];
  };

  // Seed default collections first to make sure they exist
  const initialAccounts = loadBrokerAccounts();
  const initialBanks = loadBankAccounts();
  const initialCharges = loadBrokerCharges();
  const initialExpenses = loadSubscriptionExpenses();
  const initialBankTx = loadBankTransactions();

  return {
    brokerAccounts: initialAccounts,
    bankAccounts: initialBanks,
    brokerCharges: initialCharges,
    subscriptionExpenses: initialExpenses,
    bankTransactions: initialBankTx,

    trades: loadTrades(initialAccounts),
    setups: DEFAULT_SETUPS,
    baseCapital: loadBaseCapital(initialAccounts),
    capitalAdjustments: loadAdjustments(initialAccounts, initialBanks),
    theme: loadTheme(),
    investments: loadInvestments(),
    sessionUser: null,
    isPnlVisible: loadPnlVisibility(),
    weeklyRetrospectives: loadWeeklyRetrospectives(),
    selectedFY: getCurrentLiveFY(),
    lockedFYs: loadLockedFYs(),
    noTradeDays: loadNoTradeDays(),
    userName: loadUserName(),
    userAvatar: loadUserAvatar(),
    activeBrokers: loadActiveBrokers(),
    defaultBroker: loadDefaultBroker(),

    setSessionUser: (user) => set((state) => {
      const shouldResetFY = !state.sessionUser && user;
      return {
        sessionUser: user,
        ...(shouldResetFY ? { selectedFY: getCurrentLiveFY() } : {}),
        noTradeDays: loadNoTradeDays()
      };
    }),
    setSelectedFY: (fy) => set({ selectedFY: fy }),
    toggleNoTradeDay: (date) => set((state) => {
      const exists = state.noTradeDays.includes(date);
      const nextNoTradeDays = exists 
        ? state.noTradeDays.filter(d => d !== date)
        : [...state.noTradeDays, date];
      localStorage.setItem(getScopedKey('traders_diary_notradedays'), JSON.stringify(nextNoTradeDays));
      syncMetaToCloud('notradedays', nextNoTradeDays);
      return { noTradeDays: nextNoTradeDays };
    }),
    toggleLockFY: (fy) => set((state) => {
      const isLocked = state.lockedFYs.includes(fy);
      const nextLocked = isLocked 
        ? state.lockedFYs.filter(f => f !== fy)
        : [...state.lockedFYs, fy];
      localStorage.setItem('traders_diary_locked_fys', JSON.stringify(nextLocked));
      return { lockedFYs: nextLocked };
    }),
    clearFYData: (fy) => set((state) => {
      const match = fy.match(/FY (\d{4})/);
      if (!match) return {};
      const startYear = parseInt(match[1], 10);
      const endYear = startYear + 1;
      const startStr = `${startYear}-04-01`;
      const endStr = `${endYear}-03-31`;

      const remainingTrades = state.trades.filter(t => t.date < startStr || t.date > endStr);
      const remainingAdjustments = state.capitalAdjustments.filter(a => a.date < startStr || a.date > endStr);

      localStorage.setItem('traders_diary_trades', JSON.stringify(remainingTrades));
      localStorage.setItem('traders_diary_adjustments', JSON.stringify(remainingAdjustments));

      return { 
        trades: remainingTrades,
        capitalAdjustments: remainingAdjustments
      };
    }),

    setBaseCapital: (capital) => set(() => {
      // Legacy compatibility
      localStorage.setItem('traders_diary_capital', capital.toString());
      return { baseCapital: capital };
    }),

    toggleTheme: () => set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(getScopedKey('traders_diary_theme'), nextTheme);
      return { theme: nextTheme };
    }),

    addTrade: (tradeData) => set((state) => {
      const tradeFY = getFinancialYear(tradeData.date);
      if (state.lockedFYs.includes(tradeFY)) {
        alert(`Cannot add trade: The financial year "${tradeFY}" is locked. Unlock it in Profile settings.`);
        return {};
      }
      if (state.selectedFY !== 'All' && tradeFY !== state.selectedFY) {
        alert(`Cannot add trade: The date ${tradeData.date} does not fall within the active financial year "${state.selectedFY}".`);
        return {};
      }
      if (!checkFYAndConfirm(tradeFY, 'Add Trade')) {
        return {};
      }
      const chargesConfig = state.brokerCharges.find((c) => c.broker === tradeData.broker);
      const calculated = computeTradeCalculations(tradeData, chargesConfig);
      const newTrade: Trade = {
        ...tradeData,
        id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...calculated,
      };
      const updatedTrades = [...state.trades, newTrade];
      localStorage.setItem(getScopedKey('traders_diary_trades'), JSON.stringify(updatedTrades));
      
      // Async Cloud Sync
      syncTradeToCloud('insert', newTrade);

      notifyFYSave(tradeFY);
      return { trades: updatedTrades };
    }),

    editTrade: (id, tradeData) => set((state) => {
      const targetTrade = state.trades.find(t => t.id === id);
      if (targetTrade) {
        const oldFY = getFinancialYear(targetTrade.date);
        if (state.lockedFYs.includes(oldFY)) {
          alert(`Cannot edit trade: The financial year "${oldFY}" is locked. Unlock it in Profile settings.`);
          return {};
        }
        if (tradeData.date) {
          const newFY = getFinancialYear(tradeData.date);
          if (state.lockedFYs.includes(newFY)) {
            alert(`Cannot edit trade: The target financial year "${newFY}" is locked. Unlock it in Profile settings.`);
            return {};
          }
          if (state.selectedFY !== 'All' && newFY !== state.selectedFY) {
            alert(`Cannot edit trade: The target date ${tradeData.date} does not fall within the active financial year "${state.selectedFY}".`);
            return {};
          }
          if (!checkFYAndConfirm(newFY, 'Edit Trade')) {
            return {};
          }
        } else {
          if (!checkFYAndConfirm(oldFY, 'Edit Trade')) {
            return {};
          }
        }
      }
      let targetFY = '';
      const updatedTrades = state.trades.map((t) => {
        if (t.id === id) {
          const merged = { ...t, ...tradeData };
          targetFY = getFinancialYear(merged.date);
          const chargesConfig = state.brokerCharges.find((c) => c.broker === merged.broker);
          const calculated = computeTradeCalculations({
            date: merged.date,
            entryTime: merged.entryTime,
            exitTime: merged.exitTime,
            exitDate: merged.exitDate,
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
            setupType: merged.setupType,
            useManualCharges: merged.useManualCharges,
            manualBrokerage: merged.manualBrokerage,
            manualTaxes: merged.manualTaxes,
            holdingType: merged.holdingType,
            broker: merged.broker,
          }, chargesConfig);
          const updatedTrade = { ...merged, ...calculated };
          
          // Async Cloud Sync
          syncTradeToCloud('update', updatedTrade);

          return updatedTrade;
        }
        return t;
      });
      localStorage.setItem(getScopedKey('traders_diary_trades'), JSON.stringify(updatedTrades));
      if (targetFY) {
        notifyFYSave(targetFY);
      }
      return { trades: updatedTrades };
    }),

    deleteTrade: (id) => set((state) => {
      const targetTrade = state.trades.find(t => t.id === id);
      if (targetTrade) {
        const oldFY = getFinancialYear(targetTrade.date);
        if (state.lockedFYs.includes(oldFY)) {
          alert(`Cannot delete trade: The financial year "${oldFY}" is locked. Unlock it in Profile settings.`);
          return {};
        }
        if (!checkFYAndConfirm(oldFY, 'Delete Trade')) {
          return {};
        }
        const updatedTrades = state.trades.filter((t) => t.id !== id);
        localStorage.setItem(getScopedKey('traders_diary_trades'), JSON.stringify(updatedTrades));
        
        // Async Cloud Sync
        syncTradeToCloud('delete', { id });

        notifyFYSave(oldFY);
        return { trades: updatedTrades };
      }
      return {};
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

    addCapitalAdjustment: (adj) => set((state) => {
      const adjFY = getFinancialYear(adj.date);
      if (state.lockedFYs.includes(adjFY)) {
        alert(`Cannot add entry: The financial year "${adjFY}" is locked. Unlock it in Profile settings.`);
        return {};
      }
      if (state.selectedFY !== 'All' && adjFY !== state.selectedFY) {
        alert(`Cannot add entry: The date ${adj.date} does not fall within the active financial year "${state.selectedFY}".`);
        return {};
      }
      if (!checkFYAndConfirm(adjFY, 'Add Capital Flow')) {
        return {};
      }
      const newAdj: CapitalAdjustment = {
        ...adj,
        id: `adj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      
      const updated = [newAdj, ...state.capitalAdjustments];
      localStorage.setItem(getScopedKey('traders_diary_adjustments'), JSON.stringify(updated));
      syncMetaToCloud('capital_adjustments', updated);

      // Link to Bank Ledger Transaction (Double-entry)
      let updatedBankTx = state.bankTransactions;
      if (adj.bankAccountId) {
        const newBankTx: BankTransaction = {
          id: `btx-${newAdj.id}`,
          date: adj.date,
          time: adj.time,
          bankAccountId: adj.bankAccountId,
          type: adj.type === 'DEPOSIT' ? 'WITHDRAWAL' : 'DEPOSIT', // opposite direction
          amount: adj.amount,
          category: adj.type === 'DEPOSIT' ? 'Broker Pay-in' : 'Broker Pay-out',
          notes: adj.notes || `${adj.type === 'DEPOSIT' ? 'Pay-in to' : 'Pay-out from'} ${adj.broker || 'broker'} account`,
          brokerAccountId: adj.brokerAccountId,
        };
        updatedBankTx = [newBankTx, ...state.bankTransactions];
        localStorage.setItem(getScopedKey('traders_diary_bank_transactions'), JSON.stringify(updatedBankTx));
        syncMetaToCloud('bank_transactions', updatedBankTx);
      }

      notifyFYSave(adjFY);
      return { capitalAdjustments: updated, bankTransactions: updatedBankTx };
    }),

    deleteCapitalAdjustment: (id) => set((state) => {
      const targetAdj = state.capitalAdjustments.find(a => a.id === id);
      if (targetAdj) {
        const oldFY = getFinancialYear(targetAdj.date);
        if (state.lockedFYs.includes(oldFY)) {
          alert(`Cannot delete entry: The financial year "${oldFY}" is locked. Unlock it in Profile settings.`);
          return {};
        }
        if (!checkFYAndConfirm(oldFY, 'Delete Capital Flow')) {
          return {};
        }
        const updated = state.capitalAdjustments.filter((a) => a.id !== id);
        localStorage.setItem(getScopedKey('traders_diary_adjustments'), JSON.stringify(updated));
        syncMetaToCloud('capital_adjustments', updated);

        // Clean up linked double-entry Bank Transaction
        const updatedBankTx = state.bankTransactions.filter((tx) => tx.id !== `btx-${id}`);
        localStorage.setItem(getScopedKey('traders_diary_bank_transactions'), JSON.stringify(updatedBankTx));
        syncMetaToCloud('bank_transactions', updatedBankTx);

        notifyFYSave(oldFY);
        return { capitalAdjustments: updated, bankTransactions: updatedBankTx };
      }
      return {};
    }),

    editCapitalAdjustment: (id, notes) => set((state) => {
      const oldAdj = state.capitalAdjustments.find(a => a.id === id);
      if (oldAdj) {
        const oldFY = getFinancialYear(oldAdj.date);
        if (state.lockedFYs.includes(oldFY)) {
          alert(`Cannot edit entry: The financial year "${oldFY}" is locked. Unlock it in Profile settings.`);
          return {};
        }
        if (!checkFYAndConfirm(oldFY, 'Edit Capital Flow')) {
          return {};
        }
        const updated = state.capitalAdjustments.map((a) => {
          if (a.id === id) {
            return { ...a, notes };
          }
          return a;
        });
        localStorage.setItem(getScopedKey('traders_diary_adjustments'), JSON.stringify(updated));
        syncMetaToCloud('capital_adjustments', updated);
        notifyFYSave(oldFY);
        return { capitalAdjustments: updated };
      }
      return {};
    }),

    resetToMockData: () => set(() => {
      const mock: Trade[] = []; // Clear trades by default or reset
      const mockInv = getMockInvestments();
      localStorage.setItem(getScopedKey('traders_diary_trades'), JSON.stringify(mock));
      localStorage.setItem(getScopedKey('traders_diary_setups'), JSON.stringify(DEFAULT_SETUPS));
      localStorage.setItem(getScopedKey('traders_diary_adjustments'), JSON.stringify([]));
      localStorage.setItem(getScopedKey('traders_diary_investments'), JSON.stringify(mockInv));
      localStorage.setItem(getScopedKey('traders_diary_weekly_retrospectives'), JSON.stringify({}));
      
      // Reset new structures
      localStorage.setItem(getScopedKey('traders_diary_broker_accounts'), JSON.stringify(DEFAULT_BROKER_ACCOUNTS));
      localStorage.setItem(getScopedKey('traders_diary_bank_accounts'), JSON.stringify(DEFAULT_BANK_ACCOUNTS));
      localStorage.setItem(getScopedKey('traders_diary_broker_charges'), JSON.stringify(DEFAULT_BROKER_CHARGES));
      localStorage.setItem(getScopedKey('traders_diary_subscription_expenses'), JSON.stringify(DEFAULT_SUBSCRIPTION_EXPENSES));
      localStorage.setItem(getScopedKey('traders_diary_bank_transactions'), JSON.stringify([]));

      syncMetaToCloud('setups', DEFAULT_SETUPS);
      syncMetaToCloud('capital_adjustments', []);
      syncMetaToCloud('broker_accounts', DEFAULT_BROKER_ACCOUNTS);
      syncMetaToCloud('bank_accounts', DEFAULT_BANK_ACCOUNTS);
      syncMetaToCloud('broker_charges', DEFAULT_BROKER_CHARGES);
      syncMetaToCloud('subscription_expenses', DEFAULT_SUBSCRIPTION_EXPENSES);
      syncMetaToCloud('bank_transactions', []);

      return { 
        trades: mock, 
        setups: DEFAULT_SETUPS, 
        capitalAdjustments: [], 
        investments: mockInv, 
        weeklyRetrospectives: {},
        brokerAccounts: DEFAULT_BROKER_ACCOUNTS,
        bankAccounts: DEFAULT_BANK_ACCOUNTS,
        brokerCharges: DEFAULT_BROKER_CHARGES,
        subscriptionExpenses: DEFAULT_SUBSCRIPTION_EXPENSES,
        bankTransactions: [],
        baseCapital: updateBaseCapital(DEFAULT_BROKER_ACCOUNTS)
      };
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

      // 7. Broker Accounts
      const accountsCloud = await fetchMetaFromCloud('broker_accounts');
      if (accountsCloud !== null) {
        set({ brokerAccounts: accountsCloud, baseCapital: updateBaseCapital(accountsCloud) });
        localStorage.setItem(`traders_diary_broker_accounts_${userId}`, JSON.stringify(accountsCloud));
      }

      // 8. Bank Accounts
      const banksCloud = await fetchMetaFromCloud('bank_accounts');
      if (banksCloud !== null) {
        set({ bankAccounts: banksCloud });
        localStorage.setItem(`traders_diary_bank_accounts_${userId}`, JSON.stringify(banksCloud));
      }

      // 9. Broker Charges
      const chargesCloud = await fetchMetaFromCloud('broker_charges');
      if (chargesCloud !== null) {
        set({ brokerCharges: chargesCloud });
        localStorage.setItem(`traders_diary_broker_charges_${userId}`, JSON.stringify(chargesCloud));
      }

      // 10. Expenses
      const expensesCloud = await fetchMetaFromCloud('subscription_expenses');
      if (expensesCloud !== null) {
        set({ subscriptionExpenses: expensesCloud });
        localStorage.setItem(`traders_diary_subscription_expenses_${userId}`, JSON.stringify(expensesCloud));
      }

      // 11. Bank Transactions
      const bankTxCloud = await fetchMetaFromCloud('bank_transactions');
      if (bankTxCloud !== null) {
        set({ bankTransactions: bankTxCloud });
        localStorage.setItem(`traders_diary_bank_transactions_${userId}`, JSON.stringify(bankTxCloud));
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

    updateInvestmentsList: (updatedList) => set(() => {
      localStorage.setItem(getScopedKey('traders_diary_investments'), JSON.stringify(updatedList));
      syncMetaToCloud('investments', updatedList);
      return { investments: updatedList };
    }),

    syncAllInvestmentPrices: async () => {
      const state = get();
      const activeInvs = state.investments.filter((i) => i.status === 'ACTIVE' || !i.status);
      if (activeInvs.length === 0) return { updatedCount: 0, failedSymbols: [] };

      let updatedCount = 0;
      const failedSymbols: string[] = [];

      const fetchLatestPriceFromYahoo = async (symbol: string): Promise<number | null> => {
        const cleanSymbol = symbol.trim().toUpperCase();
        const ticker = cleanSymbol.includes('.') ? cleanSymbol : `${cleanSymbol}.NS`;
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
          const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
          if (!response.ok) return null;
          const json = await response.json();
          const data = JSON.parse(json.contents);
          const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
          if (price && typeof price === 'number') {
            return price;
          }
        } catch (e) {
          console.warn(`Failed to fetch price for ${ticker} from Yahoo Finance:`, e);
        }
        return null;
      };

      const updatedList = await Promise.all(
        state.investments.map(async (inv) => {
          if (inv.status === 'ACTIVE' || !inv.status) {
            const livePrice = await fetchLatestPriceFromYahoo(inv.symbol);
            if (livePrice !== null) {
              updatedCount++;
              return { ...inv, currentPrice: livePrice, status: 'ACTIVE' as const };
            } else {
              failedSymbols.push(inv.symbol);
            }
          }
          return inv;
        })
      );

      if (updatedCount > 0) {
        set({ investments: updatedList });
        localStorage.setItem(getScopedKey('traders_diary_investments'), JSON.stringify(updatedList));
        syncMetaToCloud('investments', updatedList);
      }

      return { updatedCount, failedSymbols };
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

      const rawBrokerAccs = getOrMigrate('traders_diary_broker_accounts', DEFAULT_BROKER_ACCOUNTS) as BrokerAccount[];
      const brokerAccounts = rawBrokerAccs.map(a => {
        if (a.accountName === 'Wife') a.accountName = 'Rupali';
        return a;
      });

      const rawBankAccs = getOrMigrate('traders_diary_bank_accounts', DEFAULT_BANK_ACCOUNTS) as BankAccount[];
      const bankAccounts = rawBankAccs.map(b => {
        if (b.accountHolderName === 'Wife') b.accountHolderName = 'Rupali';
        return b;
      });
      const brokerCharges = getOrMigrate('traders_diary_broker_charges', DEFAULT_BROKER_CHARGES);
      const subscriptionExpenses = getOrMigrate('traders_diary_subscription_expenses', DEFAULT_SUBSCRIPTION_EXPENSES);
      const bankTransactions = getOrMigrate('traders_diary_bank_transactions', []);

      const trades = loadTrades(brokerAccounts);
      const setups = getOrMigrate('traders_diary_setups', DEFAULT_SETUPS);
      const baseCapital = updateBaseCapital(brokerAccounts);
      const capitalAdjustments = loadAdjustments(brokerAccounts, bankAccounts);
      const investments = getOrMigrate('traders_diary_investments', getMockInvestments());
      const weeklyRetrospectives = getOrMigrate('traders_diary_weekly_retrospectives', {});

      const userName = localStorage.getItem(`traders_diary_user_name_${userId}`) || localStorage.getItem('traders_diary_user_name') || 'Sachin';
      const userAvatar = localStorage.getItem(`traders_diary_user_avatar_${userId}`) || localStorage.getItem('traders_diary_user_avatar') || 'bull';
      const activeBrokers = getOrMigrate('traders_diary_active_brokers', ['Zerodha', 'Groww', 'Angel One', 'Upstox', 'Fyers', 'Dhan', 'Kotak Neo', 'Other']);
      const defaultBroker = localStorage.getItem(`traders_diary_default_broker_${userId}`) || localStorage.getItem('traders_diary_default_broker') || 'Zerodha';

      set({
        trades,
        setups,
        baseCapital,
        capitalAdjustments,
        investments,
        weeklyRetrospectives,
        userName,
        userAvatar,
        activeBrokers,
        defaultBroker: defaultBroker as Broker,
        brokerAccounts,
        bankAccounts,
        brokerCharges,
        subscriptionExpenses,
        bankTransactions,
      });

      get().pullTradesFromCloud();
    },

    saveWeeklyRetrospective: (weekId, notes) => set((state) => {
      const updated = { ...state.weeklyRetrospectives, [weekId]: notes };
      localStorage.setItem(getScopedKey('traders_diary_weekly_retrospectives'), JSON.stringify(updated));
      syncMetaToCloud('weekly_retrospectives', updated);
      return { weeklyRetrospectives: updated };
    }),

    bulkImportTrades: (imported, overwrite) => set((state) => {
      const parsedTrades = imported.map((t, idx) => {
        const chargesConfig = state.brokerCharges.find((c) => c.broker === t.broker);
        const calculated = computeTradeCalculations(t, chargesConfig);
        const matchedAcc = state.brokerAccounts.find(a => a.broker === t.broker);
        const brokerAccountId = t.brokerAccountId || (matchedAcc ? matchedAcc.id : (state.brokerAccounts[0]?.id || 'acc-1'));
        return {
          ...t,
          brokerAccountId,
          id: `trade-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`,
          ...calculated
        };
      });

      const updatedTrades = overwrite ? parsedTrades : [...state.trades, ...parsedTrades];
      localStorage.setItem(getScopedKey('traders_diary_trades'), JSON.stringify(updatedTrades));
      
      // Batch sync
      if (overwrite) {
        syncMetaToCloud('trades_overwrite_sync', updatedTrades); 
      } else {
        parsedTrades.forEach(t => syncTradeToCloud('insert', t));
      }

      return { trades: updatedTrades };
    }),

    setProfile: (name, avatar) => {
      localStorage.setItem(getScopedKey('traders_diary_user_name'), name);
      localStorage.setItem(getScopedKey('traders_diary_user_avatar'), avatar);
      set({ userName: name, userAvatar: avatar });
    },

    setActiveBrokers: (brokers) => {
      localStorage.setItem(getScopedKey('traders_diary_active_brokers'), JSON.stringify(brokers));
      set({ activeBrokers: brokers });
    },

    setDefaultBroker: (broker) => {
      localStorage.setItem(getScopedKey('traders_diary_default_broker'), broker);
      set({ defaultBroker: broker });
    },

    // NEW ACTIONS IMPLEMENTATION

    addBrokerAccount: (account) => set((state) => {
      const newAcc: BrokerAccount = {
        ...account,
        id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      };
      const updated = [...state.brokerAccounts, newAcc];
      localStorage.setItem(getScopedKey('traders_diary_broker_accounts'), JSON.stringify(updated));
      syncMetaToCloud('broker_accounts', updated);
      return { 
        brokerAccounts: updated, 
        baseCapital: updateBaseCapital(updated) 
      };
    }),

    editBrokerAccount: (id, accountData) => set((state) => {
      const updated = state.brokerAccounts.map((a) => a.id === id ? { ...a, ...accountData } : a);
      localStorage.setItem(getScopedKey('traders_diary_broker_accounts'), JSON.stringify(updated));
      syncMetaToCloud('broker_accounts', updated);
      return { 
        brokerAccounts: updated, 
        baseCapital: updateBaseCapital(updated) 
      };
    }),

    deleteBrokerAccount: (id) => set((state) => {
      const updated = state.brokerAccounts.filter((a) => a.id !== id);
      localStorage.setItem(getScopedKey('traders_diary_broker_accounts'), JSON.stringify(updated));
      syncMetaToCloud('broker_accounts', updated);
      return { 
        brokerAccounts: updated, 
        baseCapital: updateBaseCapital(updated) 
      };
    }),

    addBankAccount: (bank) => set((state) => {
      const newBank: BankAccount = {
        ...bank,
        id: `bank-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      };
      const updated = [...state.bankAccounts, newBank];
      localStorage.setItem(getScopedKey('traders_diary_bank_accounts'), JSON.stringify(updated));
      syncMetaToCloud('bank_accounts', updated);
      return { bankAccounts: updated };
    }),

    editBankAccount: (id, bankData) => set((state) => {
      const updated = state.bankAccounts.map((b) => b.id === id ? { ...b, ...bankData } : b);
      localStorage.setItem(getScopedKey('traders_diary_bank_accounts'), JSON.stringify(updated));
      syncMetaToCloud('bank_accounts', updated);
      return { bankAccounts: updated };
    }),

    deleteBankAccount: (id) => set((state) => {
      const updated = state.bankAccounts.filter((b) => b.id !== id);
      localStorage.setItem(getScopedKey('traders_diary_bank_accounts'), JSON.stringify(updated));
      syncMetaToCloud('bank_accounts', updated);
      return { bankAccounts: updated };
    }),

    addSubscriptionExpense: (expense) => set((state) => {
      const newExp: SubscriptionExpense = {
        ...expense,
        id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      };
      const updatedExpenses = [...state.subscriptionExpenses, newExp];
      localStorage.setItem(getScopedKey('traders_diary_subscription_expenses'), JSON.stringify(updatedExpenses));
      syncMetaToCloud('subscription_expenses', updatedExpenses);

      // Handle pay from Bank
      let updatedBankTx = state.bankTransactions;
      if (expense.paymentSource === 'Bank' && expense.bankAccountId) {
        const newBankTx: BankTransaction = {
          id: `btx-${newExp.id}`,
          date: expense.date,
          time: '12:00',
          bankAccountId: expense.bankAccountId,
          type: 'WITHDRAWAL',
          amount: expense.amount,
          category: 'Subscription/Expense',
          notes: `Paid: ${expense.name}. ${expense.notes}`,
          expenseId: newExp.id,
        };
        updatedBankTx = [newBankTx, ...state.bankTransactions];
        localStorage.setItem(getScopedKey('traders_diary_bank_transactions'), JSON.stringify(updatedBankTx));
        syncMetaToCloud('bank_transactions', updatedBankTx);
      }

      // Handle pay from Broker
      let updatedAdjustments = state.capitalAdjustments;
      if (expense.paymentSource === 'Broker' && expense.brokerAccountId) {
        const matchingAcc = state.brokerAccounts.find(a => a.id === expense.brokerAccountId);
        const newAdj: CapitalAdjustment = {
          id: `adj-${newExp.id}`,
          date: expense.date,
          time: '12:00',
          type: 'WITHDRAWAL',
          amount: expense.amount,
          notes: `Subscription/Expense: ${expense.name}`,
          broker: matchingAcc?.broker || 'Other',
          brokerAccountId: expense.brokerAccountId
        };
        updatedAdjustments = [newAdj, ...state.capitalAdjustments];
        localStorage.setItem(getScopedKey('traders_diary_adjustments'), JSON.stringify(updatedAdjustments));
        syncMetaToCloud('capital_adjustments', updatedAdjustments);
      }

      return { 
        subscriptionExpenses: updatedExpenses, 
        bankTransactions: updatedBankTx,
        capitalAdjustments: updatedAdjustments
      };
    }),

    deleteSubscriptionExpense: (id) => set((state) => {
      const updatedExpenses = state.subscriptionExpenses.filter((e) => e.id !== id);
      localStorage.setItem(getScopedKey('traders_diary_subscription_expenses'), JSON.stringify(updatedExpenses));
      syncMetaToCloud('subscription_expenses', updatedExpenses);

      // Clean up linked double entry transaction
      const updatedBankTx = state.bankTransactions.filter((tx) => tx.id !== `btx-${id}`);
      localStorage.setItem(getScopedKey('traders_diary_bank_transactions'), JSON.stringify(updatedBankTx));
      syncMetaToCloud('bank_transactions', updatedBankTx);

      // Clean up linked double entry capital adjustment
      const updatedAdjustments = state.capitalAdjustments.filter((a) => a.id !== `adj-${id}`);
      localStorage.setItem(getScopedKey('traders_diary_adjustments'), JSON.stringify(updatedAdjustments));
      syncMetaToCloud('capital_adjustments', updatedAdjustments);

      return { 
        subscriptionExpenses: updatedExpenses, 
        bankTransactions: updatedBankTx,
        capitalAdjustments: updatedAdjustments
      };
    }),

    updateBrokerCharges: (charges) => set(() => {
      localStorage.setItem(getScopedKey('traders_diary_broker_charges'), JSON.stringify(charges));
      syncMetaToCloud('broker_charges', charges);
      return { brokerCharges: charges };
    }),

    addDirectBankTransaction: (tx) => set((state) => {
      const btxId = `btx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newTx: BankTransaction = {
        ...tx,
        id: btxId
      };
      
      const updatedBankTxList = [newTx, ...state.bankTransactions];
      localStorage.setItem(getScopedKey('traders_diary_bank_transactions'), JSON.stringify(updatedBankTxList));
      syncMetaToCloud('bank_transactions', updatedBankTxList);

      let updatedAdjustments = state.capitalAdjustments;
      if ((tx.category === 'Broker Pay-in' || tx.category === 'Broker Pay-out') && tx.brokerAccountId) {
        const matchedAcc = state.brokerAccounts.find(a => a.id === tx.brokerAccountId);
        const adjType = (tx.type === 'DEPOSIT' ? 'WITHDRAWAL' : 'DEPOSIT') as 'DEPOSIT' | 'WITHDRAWAL';
        const newAdj: CapitalAdjustment = {
          id: `adj-${btxId}`,
          date: tx.date,
          time: tx.time,
          type: adjType,
          amount: tx.amount,
          notes: tx.notes,
          broker: matchedAcc ? matchedAcc.broker : 'Other',
          brokerAccountId: tx.brokerAccountId,
          bankAccountId: tx.bankAccountId
        };
        updatedAdjustments = [newAdj, ...state.capitalAdjustments];
        localStorage.setItem(getScopedKey('traders_diary_adjustments'), JSON.stringify(updatedAdjustments));
        syncMetaToCloud('capital_adjustments', updatedAdjustments);
      }

      return { 
        bankTransactions: updatedBankTxList,
        capitalAdjustments: updatedAdjustments,
        baseCapital: updateBaseCapital(state.brokerAccounts)
      };
    }),

    deleteDirectBankTransaction: (id) => set((state) => {
      const oldTx = state.bankTransactions.find(t => t.id === id);
      if (!oldTx) return {};

      const oldFY = getFinancialYear(oldTx.date);
      if (state.lockedFYs.includes(oldFY)) {
        alert(`Cannot delete entry: The financial year "${oldFY}" is locked. Unlock it in Profile settings.`);
        return {};
      }

      const updated = state.bankTransactions.filter((t) => t.id !== id);
      localStorage.setItem(getScopedKey('traders_diary_bank_transactions'), JSON.stringify(updated));
      syncMetaToCloud('bank_transactions', updated);

      // Clean up linked adjustments
      const adjId = id.startsWith('btx-adj-') ? id.replace('btx-adj-', 'adj-') : `adj-${id}`;
      const updatedAdjustments = state.capitalAdjustments.filter((a) => a.id !== adjId && a.id !== id.replace('btx-', ''));
      localStorage.setItem(getScopedKey('traders_diary_adjustments'), JSON.stringify(updatedAdjustments));
      syncMetaToCloud('capital_adjustments', updatedAdjustments);

      // Clean up linked subscription expenses
      const subId = id.startsWith('btx-sub-') ? id.replace('btx-sub-', '') : id;
      const updatedExpenses = state.subscriptionExpenses.filter((s) => s.id !== subId);
      localStorage.setItem(getScopedKey('traders_diary_subscription_expenses'), JSON.stringify(updatedExpenses));
      syncMetaToCloud('subscription_expenses', updatedExpenses);

      return { 
        bankTransactions: updated, 
        capitalAdjustments: updatedAdjustments,
        subscriptionExpenses: updatedExpenses,
        baseCapital: updateBaseCapital(state.brokerAccounts)
      };
    }),

    editDirectBankTransaction: (id, txData) => set((state) => {
      const oldTx = state.bankTransactions.find(t => t.id === id);
      if (!oldTx) return {};

      const oldFY = getFinancialYear(oldTx.date);
      if (state.lockedFYs.includes(oldFY)) {
        alert(`Cannot edit entry: The financial year "${oldFY}" is locked. Unlock it in Profile settings.`);
        return {};
      }
      if (txData.date) {
        const newFY = getFinancialYear(txData.date);
        if (state.lockedFYs.includes(newFY)) {
          alert(`Cannot edit entry: The target financial year "${newFY}" is locked. Unlock it in Profile settings.`);
          return {};
        }
      }

      const updatedTxList = state.bankTransactions.map((tx) => {
        if (tx.id === id) {
          return { ...tx, ...txData };
        }
        return tx;
      });
      localStorage.setItem(getScopedKey('traders_diary_bank_transactions'), JSON.stringify(updatedTxList));
      syncMetaToCloud('bank_transactions', updatedTxList);

      let updatedAdjustments = state.capitalAdjustments;
      const targetCategory = txData.category !== undefined ? txData.category : oldTx.category;
      const targetType = txData.type !== undefined ? txData.type : oldTx.type;
      const targetAmount = txData.amount !== undefined ? txData.amount : oldTx.amount;
      const targetNotes = txData.notes !== undefined ? txData.notes : oldTx.notes;
      const targetDate = txData.date || oldTx.date;
      const targetTime = txData.time || oldTx.time;
      const targetBrokerAccountId = txData.brokerAccountId || oldTx.brokerAccountId;
      const targetBankAccountId = txData.bankAccountId || oldTx.bankAccountId;

      const adjId = id.startsWith('btx-adj-') ? id.replace('btx-adj-', 'adj-') : `adj-${id}`;
      const hasAdj = state.capitalAdjustments.some(a => a.id === adjId);
      const adjType = (targetType === 'DEPOSIT' ? 'WITHDRAWAL' : 'DEPOSIT') as 'DEPOSIT' | 'WITHDRAWAL';

      if (targetCategory === 'Broker Pay-in' || targetCategory === 'Broker Pay-out') {
        if (targetBrokerAccountId) {
          const matchedAcc = state.brokerAccounts.find(a => a.id === targetBrokerAccountId);
          const newAdjData: CapitalAdjustment = {
            id: adjId,
            date: targetDate,
            time: targetTime,
            type: adjType,
            amount: targetAmount,
            notes: targetNotes,
            broker: matchedAcc ? matchedAcc.broker : 'Other',
            brokerAccountId: targetBrokerAccountId,
            bankAccountId: targetBankAccountId
          };
          if (hasAdj) {
            updatedAdjustments = state.capitalAdjustments.map(a => a.id === adjId ? newAdjData : a);
          } else {
            updatedAdjustments = [newAdjData, ...state.capitalAdjustments];
          }
          localStorage.setItem(getScopedKey('traders_diary_adjustments'), JSON.stringify(updatedAdjustments));
          syncMetaToCloud('capital_adjustments', updatedAdjustments);
        }
      } else {
        // Changed to a non-broker category, so remove the linked adjustment if it exists
        if (hasAdj) {
          updatedAdjustments = state.capitalAdjustments.filter(a => a.id !== adjId);
          localStorage.setItem(getScopedKey('traders_diary_adjustments'), JSON.stringify(updatedAdjustments));
          syncMetaToCloud('capital_adjustments', updatedAdjustments);
        }
      }

      return { 
        bankTransactions: updatedTxList,
        capitalAdjustments: updatedAdjustments,
        baseCapital: updateBaseCapital(state.brokerAccounts)
      };
    }),

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
          selectedFY: getCurrentLiveFY(),
          noTradeDays: []
        });
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

    togglePnlVisibility: () => set((state) => {
      const nextVisible = !state.isPnlVisible;
      localStorage.setItem(getScopedKey('traders_diary_pnl_visibility'), JSON.stringify(nextVisible));
      return { isPnlVisible: nextVisible };
    }),
  };
});
