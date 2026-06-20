export type Segment = 'Equity' | 'F&O' | 'Commodity' | 'Currency';
export type Product = 'MIS' | 'CNC' | 'NRML'; // MIS = Intraday, CNC = Delivery, NRML = Carry forward F&O
export type TradeAction = 'BUY' | 'SELL';
export type Emotion = 'Calm' | 'Greedy' | 'Fearful' | 'Impatient' | 'Revengeful';
export type Mistake = 'None' | 'Overtrading' | 'FOMO Entry' | 'Moving SL' | 'Early Exit' | 'No Setup';

export interface Trade {
  id: string;
  date: string; // YYYY-MM-DD
  entryTime: string; // HH:MM
  exitTime: string; // HH:MM
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
}

