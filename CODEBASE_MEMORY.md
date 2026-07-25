# Traders Diary - Comprehensive Architecture & Memory Index

## 1. Overview & Core Stack
- **Framework**: React 19 + TypeScript + Vite 8
- **State Store**: Zustand (`src/store/useTradeStore.ts`) with reactive sync to local storage & Supabase Cloud
- **Main View & Navigation**: `src/App.tsx` (Collapsible Left Sidebar Layout, Top Status Bar with Live Nifty Ticker & IST Clock)
- **Database & Auth**: Supabase JS + Postgres (`src/utils/supabaseClient.ts`), Yahoo Finance Proxy (`api/yahoo-proxy.js`) for market quotes

## 2. Key Modules & Views (`src/components/`)
1. **`Dashboard.tsx`**: High-level PnL performance metrics, success rate, streak analysis, GitHub-style calendar heatmap, win/loss charts, expectancy score.
2. **`TradingCalendar.tsx`**: Daily, Weekly & Monthly PnL calendar grid with prominent Investment Badges (`💼 -₹X` Buy / `💼 +₹Y` Exit), No-Trade Day highlights (`🛡️ No Trade Day`), and day/week/month log details pane.
3. **`DayBook.tsx`**: Intraday execution timeline and price-action notes.
4. **`TradeTable.tsx`**: Tabbed trade history grid with search, multi-field filters (FY, Segment, Broker Account, Setup, Emotion, Mistake), sorting, and CSV export/import.
5. **`StrategyManager.tsx`**: Setups, rules checklist, strategy-wise performance analytics.
6. **`Ledger.tsx`**: Capital deposits/withdrawals, bank transactions, expenses, investment portfolio tracker.
7. **`AccountManager.tsx`**: Multi-broker account management (Zerodha, Groww, Angel One, Upstox, Fyers, Dhan, Kotak Neo), bank accounts & custom broker charges configs.
8. **`TradeLogger.tsx`**: Comprehensive trade entry modal (Options CE/PE, partial exit legs, SL/Target, emotions, mistakes).
9. **`Taxation.tsx`**: Indian tax calculation engine (STCG, LTCG, F&O income, STT, SEBI, GST, stamp duty).
10. **`ProfileSettingsModal.tsx`**: User profile, Financial Year locking (FY 2024-25, FY 2025-26), backup/restore, cloud settings.

## 3. Calculation & Tax Engines (`src/utils/`)
- `taxEngine.ts`: Precise Indian stock market tax & brokerage calculator (STT, Stamp Duty, SEBI turnover, GST 18%) for Equity Delivery, Intraday, Futures, and Options.
- `fyHelper.ts`: Indian Financial Year range helper (April 1 to March 31).
- `statementParser.ts`: Imports trade contract notes & CSV tradebooks (Kotak Neo, etc.).
- `brandLogos.ts`: Visual logos for Indian stock brokers and banks.

## 4. Audited & Verified Edge Cases
- **F&O Heuristic Fallback**: Fixed `isOption` calculation in `taxEngine.ts` to prevent low-priced Stock Futures from being misclassified as Options.
- **Partial Exits RR & PnL**: Weighted average exit price calculated across partial exit legs for accurate net PnL, ROI, and Risk-to-Reward (RR) ratio.
- **Multi-View Investments & No-Trade Days**: Full support across Weekly, Monthly, and Yearly Calendar Views.
