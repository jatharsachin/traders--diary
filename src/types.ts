export type Segment = 'Equity' | 'F&O' | 'Commodity' | 'Currency';
export type Product = 'Intraday' | 'Delivery';
export type Broker = 'Zerodha' | 'Groww' | 'Angel One' | 'Upstox' | 'Fyers' | 'Dhan' | 'Kotak Neo' | 'Other';
export type TradeAction = 'BUY' | 'SELL';
export type Emotion = 'Calm' | 'Greedy' | 'Fearful' | 'Impatient' | 'Revengeful';
export type Mistake = 'None' | 'Overtrading' | 'FOMO Entry' | 'Moving SL' | 'Early Exit' | 'No Setup' | 'Late Exit' | 'Panic Exit' | 'Greed Hold' | 'Manual Intervention' | 'Tech / API Issue';

export interface Trade {
  id: string;
  date: string; // YYYY-MM-DD
  entryTime: string; // HH:MM
  exitTime: string; // HH:MM
  exitDate?: string; // YYYY-MM-DD
  segment: Segment;
  product: Product;
  action: TradeAction;
  symbol: string;
  qty: number;
  entryPrice: number;
  exitPrice: number;
  slippagePoints: number;
  stopLoss: number;
  target: number;
  strategy: string;
  rulesFollowed: string[];
  emotion: Emotion;
  mistake: Mistake;
  notes: string;
  chartUrl?: string;
  
  // Option specific fields
  strikePrice?: number;
  optionType?: 'CE' | 'PE' | 'None';
  
  // Custom tagging fields
  setupType?: 'Breakout' | 'Pullback' | 'Reversal' | 'Range Bound' | 'None';
  tags?: string[];
  
  // Auto-calculated fields
  isExpiryDay: boolean;
  durationMinutes: number;
  grossPnL: number;
  brokerage: number;
  taxes: number; // STT, Stamp Duty, SEBI, GST, Exchange Tx charges
  netPnL: number;
  roi: number; // Percentage
  actualRR: number;
  
  // Manual charges override fields
  useManualCharges?: boolean;
  manualBrokerage?: number;
  manualTaxes?: number;

  // Partial Exit legs details
  partialExits?: { id: string; qty: number; price: number; time: string }[];

  // Capital Gains holding classification
  holdingType?: 'Short Term' | 'Long Term';

  // Broker details
  broker?: Broker;
  brokerAccountId?: string; // Links to specific broker-user account
}

export interface Setup {
  name: string;
  description: string;
}

export interface DailyPnL {
  date: string; // YYYY-MM-DD
  netPnL: number;
  tradesCount: number;
}

export interface CapitalAdjustment {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  notes: string;
  broker?: Broker;
  brokerAccountId?: string; // Links to specific broker-user account
  bankAccountId?: string;   // Links to specific bank account
}

export interface Investment {
  id: string;
  type: 'ETF' | 'BOND' | 'EQUITY';
  symbol: string;
  qty: number;
  buyPrice: number;
  currentPrice: number;
  date: string; // YYYY-MM-DD
  notes: string;
  status?: 'ACTIVE' | 'EXITED';
  exitPrice?: number;
  exitDate?: string;
  exitNotes?: string;
  broker?: Broker;
  brokerAccountId?: string; // Links to specific broker-user account
}

// NEW ENTITIES

export interface BrokerAccount {
  id: string; // Unique ID, e.g. " Zerodha-Sachin"
  broker: Broker;
  accountName: string; // e.g. "Sachin" or "Wife"
  startingCapital: number;
  active: boolean;
}

export interface BankAccount {
  id: string; // Unique ID, e.g. "SBI-Sachin"
  bankName: string; // e.g. "SBI", "HDFC"
  accountHolderName: string; // e.g. "Sachin" or "Wife"
  startingBalance: number;
  active: boolean;
}

export interface SubscriptionExpense {
  id: string;
  name: string; // e.g. "Tradetron Algo"
  amount: number;
  date: string; // YYYY-MM-DD
  paymentSource: 'Broker' | 'Bank';
  brokerAccountId?: string; // if paid from broker
  bankAccountId?: string;   // if paid from bank
  notes: string;
  frequency: 'One-Time' | 'Monthly' | 'Yearly';
}

export interface BankTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  bankAccountId: string;
  type: 'DEPOSIT' | 'WITHDRAWAL'; // Deposit = money added to bank, Withdrawal = money removed from bank
  amount: number;
  category: 'Direct Deposit' | 'Direct Withdrawal' | 'Broker Pay-in' | 'Broker Pay-out' | 'Subscription/Expense';
  notes: string;
  brokerAccountId?: string; // linked broker account if pay-in/out
  expenseId?: string;       // linked expense if paid from bank
}

export interface BrokerChargesConfig {
  broker: Broker;
  deliveryRatePct: number; // e.g. 0% for Zerodha, 0.05% for Groww
  deliveryMaxFee: number;   // e.g. ₹0 for Zerodha, ₹20 for Groww
  intradayRatePct: number; // e.g. 0.03%
  intradayMaxFee: number;   // e.g. ₹20
  optionsFlatFee: number;   // e.g. ₹20 per order
  futuresRatePct: number;  // e.g. 0.03%
  futuresMaxFee: number;    // e.g. ₹20
}
