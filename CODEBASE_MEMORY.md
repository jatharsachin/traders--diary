# Traders Diary - Quick Codebase Architecture Memory

## Tech Stack & Entry Points
- **Framework**: React 19 + TypeScript + Vite 8
- **State Store**: Zustand (`src/store/useTradeStore.ts`)
- **Main View / Router**: `src/App.tsx` (Sidebar Layout, Top Status Bar with Live Nifty Ticker & IST Clock)
- **Database & Cloud**: Supabase Auth + Postgres Cloud Sync (`src/utils/supabaseClient.ts`)

## Key Modules (`src/components/`)
1. `Dashboard.tsx`: PnL stats, win rate, performance calendar heatmap, win/loss distribution, expectancy score.
2. `DayBook.tsx`: Intraday execution timeline and notes.
3. `TradingCalendar.tsx`: Monthly & daily PnL calendar grid.
4. `TradeTable.tsx`: Searchable/filterable trade history table with CSV export/import.
5. `StrategyManager.tsx`: Setups, strategy performance analytics, execution rules.
6. `Ledger.tsx`: Capital deposits/withdrawals, bank transactions, expenses, investment portfolio.
7. `AccountManager.tsx`: Multi-broker accounts (Zerodha, Groww, Angel One, Upstox, Fyers, Dhan, Kotak Neo), bank accounts & custom charges setup.
8. `TradeLogger.tsx`: Comprehensive trade logging modal (Options CE/PE, partial exit legs, SL/target, emotions, mistakes).
9. `Taxation.tsx`: Indian tax calculation engine (STCG, LTCG, F&O, STT, SEBI, GST, stamp duty).
10. `ProfileSettingsModal.tsx`: User profile, Financial Year locking, data backup/restore, cloud settings.

## Calculation Utilities (`src/utils/`)
- `taxEngine.ts`: Precise Indian stock market tax & charges calculator for Intraday, Delivery, Futures, and Options.
- `fyHelper.ts`: Financial Year range helper (April 1 to March 31, e.g., FY 2024-25).
- `statementParser.ts`: Imports trade contract notes & CSV tradebooks (Kotak Neo, etc.).
- `brandLogos.ts`: Indian broker & bank visual logos.
