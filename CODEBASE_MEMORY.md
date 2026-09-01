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
6. **`Ledger.tsx`**: Capital deposits/withdrawals, bank transactions, expenses, investment portfolio tracker, **Subscriptions & Expenses Log Column-wise Sorting**.
7. **`AccountManager.tsx`**: Multi-broker account management (Zerodha, Groww, Angel One, Upstox, Fyers, Dhan, Kotak Neo), bank accounts & custom broker charges configs.
8. **`TradeLogger.tsx`**: Comprehensive trade entry modal (Options CE/PE, partial exit legs, SL/Target, emotions, mistakes, **Multi-Select Execution Mistake Tags**).
9. **`Taxation.tsx`**: Indian tax calculation engine (STCG, LTCG, F&O income, STT, SEBI, GST, stamp duty).
10. **`ProfileSettingsModal.tsx`**: User profile, Financial Year locking, backup/restore, cloud settings.

## 3. Calculation & Tax Engines (`src/utils/`)
- `taxEngine.ts`: Precise Indian stock market tax & brokerage calculator (STT, Stamp Duty, SEBI turnover, GST 18%) for Equity Delivery, Intraday, Futures, and Options.
- `fyHelper.ts`: Indian Financial Year range helper (April 1 to March 31).
- `statementParser.ts`: Imports trade contract notes & CSV tradebooks (Kotak Neo, etc.).
- `brandLogos.ts`: Visual logos for Indian stock brokers and banks.

## 4. Audited & Verified Edge Cases
- **Subscriptions & Expenses Log Column Sorting**: Interactive column-head sorting (`Date`, `Subscription Name`, `Frequency`, `Paid Source`, `Amount (₹)`, `Notes`) in `Ledger.tsx` with ascending/descending toggle & visual indicators (`ArrowUpDown`).
- **Multi-Select Execution Mistake Tags**: `TradeLogger.tsx` supports selecting multiple execution mistakes per trade (e.g. FOMO Entry + Panic Exit). Uses `getTradeMistakes()` and `formatTradeMistakes()` for 100% backward compatibility with single-string trades.
- **Data Integrity Assurance**: Existing trade logs, capital adjustments, and broker accounts are never overwritten, deleted, or reset. Zero auto-generated mock trades.
- **Telegram Integration Removal**: Completely removed all Telegram bot settings, notification handlers, files (`telegramNotifier.ts`), and 3:30 PM auto-schedulers per user request.
- **F&O Heuristic Fallback**: Fixed `isOption` calculation in `taxEngine.ts` to prevent low-priced Stock Futures from being misclassified as Options.
- **Partial Exits RR & PnL**: Weighted average exit price calculated across partial exit legs for accurate net PnL, ROI, and Risk-to-Reward (RR) ratio.
- **Multi-View Investments & No-Trade Days**: Full support across Weekly, Monthly, and Yearly Calendar Views.

## 5. Recent Bugfixes & Stability Audit
- **Missing `create` Import in Store**: Restored `import { create } from 'zustand';` at line 1 of `src/store/useTradeStore.ts`.
- **Fail-Safe Store Data Loaders**: Added `Array.isArray()` and `null` safety guards across `loadTrades`, `loadBrokerAccounts`, `loadBankAccounts`, `loadAdjustments`, `loadInvestments`, `loadLockedFYs`, and `loadNoTradeDays` to eliminate all possibility of runtime crashes due to invalid localStorage state.
- **Global ErrorBoundary & Safe Lazy Loading**: Added `ErrorBoundary` in `src/main.tsx` and `safeLazy` retry logic in `src/App.tsx` to handle network/chunk errors seamlessly.
- **Comprehensive Codebase Audit & Fixes**:
  - `src/store/useTradeStore.ts`: Fixed `computeTradeCalculations` missing `else` branch for automatic charges calculation, preserved manual brokerage/taxes in manual mode, and fixed double-entry bank transaction ID matching.
  - `src/utils/taxEngine.ts`: Added `optionsFlatFee ?? 20` fallback guards to prevent `NaN` cascading.
  - `src/utils/fyHelper.ts`: Protected `formatTimeToAMPM` against duplicate AM/PM suffixes, added timestamp safety to `filterTradesByFY`, and expanded `FINANCIAL_YEARS`.
  - `src/utils/statementParser.ts`: Fixed proportional charges deduction on partial execution matching legs.
  - `src/components/Dashboard.tsx`: Fixed mistake cost calculation and discipline rating using `getTradeMistakes(t)`, and fixed heatmap modal date interpolation.
  - `src/components/TradeTable.tsx`: Removed stray `$` in ribbon filter, added null-safety to CSV notes, and used `formatTradeMistakes(t)` in PDF export.
  - `src/components/DayBook.tsx`: Fixed Jan-Mar financial year detection using `getFinancialYear(dateStr)`.
  - `src/components/TradingCalendar.tsx`: Defaulted `currentDate` to live `new Date()` and used `formatTradeMistakes(t)` for mistake badges.
  - `src/components/Ledger.tsx`: Fixed bank transactions empty table row `colSpan` from 7 to 6.
  - `src/App.tsx`: Fixed mistake leak alert calculation and restored legacy trades visibility.
- **Dhan Direct Connect Removed**: Completely removed Dhan direct connect API integration and modal per user request, preserving 100% original software architecture, zero external broker connection dependencies, and full peace of mind.
- **Trading Calendar `dateStr` Variable Fix**: Fixed `ReferenceError: dateStr is not defined` inside `getDayTradesSummary` in `src/components/TradingCalendar.tsx` by properly constructing the ISO date string `${year}-${formattedMonth}-${formattedDay}`.
- **Dual Progress Bars for Days & Trades Streaks**: Enhanced the Consistency Audit card with two dedicated, independent dual-tone progress bars (one for **Days Streak** and one for **Trades Streak**), providing clear visual split tracking for both daily consistency and trade execution runs.
- **Dual Streak Metric Display (Days & Trades Basis)**: Enhanced the Consistency Audit card to simultaneously display both **Days Streak** (consecutive Green/Red days) and **Trades Streak** (consecutive winning/losing trade executions) with dedicated iconography, color badges, and timeline tooltips.
- **Day-Level Winning & Losing Streak Calculation**: Switched winning/losing streak calculations across `Dashboard.tsx` from individual trade executions to daily P&L outcomes (`dailyPnL`), displaying consecutive profitable trading days vs losing trading days (e.g. `13W Days / 5L Days`) with clear timeline tooltips.
- **Responsive Auto-Wrap & Overflow Protection on Metric Cards**: Added `.metrics-grid-row2` with responsive breakpoints (6 -> 3 -> 2 -> 1 columns), enforced `min-width: 0` and `word-break: break-word` across all KPI cards, and refactored the Best / Worst Days card layout so dates and P&L amounts wrap cleanly without ever overflowing or getting clipped.
- **Dashboard Financial Terminal Visual Touch-Ups**: Added live Discipline Rating & Mindset Pill in the top Welcome Banner, integrated visual win-rate progress tracks across broker cards, polished tactile accent typography, and ensured seamless responsive alignment.
- **Dashboard Look & Feel & UX Polish**: Added Quick Segment Filter Chips (All, Options, Futures, Equity Cash, Commodity, Currency) above the KPI grid, refined CustomEquityTooltip with floating growth/drawdown pill badges, added subtle ambient top accent borders on Returns Breakdown (`primary`) and Consistency Audit (`win-green`), and upgraded the streak visual progress bar into a smooth dual-tone capsule track.
- **Eye-Comfort Soft Warm Paper & Slate Light Theme Palette**: Replaced harsh stark white glare with a soothing Apple/Notion-style soft warm slate paper background (`#e9ecf2`), crisp white card containers (`rgba(255, 255, 255, 0.94)`), deep forest green/crimson tones (`#15803d` / `#dc2626`), and soft contrast borders (`rgba(0,0,0,0.09)`) to eliminate eye strain.
- **Clean Card Surfaces (Removed Glass Reflection / Glare Animation)**: Removed `.glass-card::after` pseudo-element and `--glass-shine` diagonal gradient sweep animations on mouse hover across all cards, modals, and windows, leaving clean, stable, and calm Apple-style surface backgrounds.
- **Broker-Standard Realized P&L Exit Date Attribution**: Aligned `TradingCalendar.tsx`, `DayBook.tsx`, `Dashboard.tsx`, and `fyHelper.ts` with Dhan/Zerodha contract note standards where overnight/positional trades realize profit/loss on their **Exit Date** (`exitDate || date`), while maintaining full entry metadata and timeline tags in drawer inspection.
- **Dhan & Indian Market Precision Regulatory Tax Engine (Post-Oct 2024 SEBI & Budget Update)**: Fixed Option vs Futures misclassification bug where `optionType: 'None'` caused option premium trades to be taxed under Futures rates. Upgraded `taxEngine.ts` with exact Dhan brokerage (₹20/order, ₹0 Delivery), NSE revised Option Exchange Tx (0.03553%), BSE SENSEX/BANKEX Option Exchange Tx (0.0325%), STT (0.1% on Option sell premium, 0.02% on Futures, 0.025% on Intraday), Stamp Duty, SEBI turnover fees (₹10/crore), and 18% GST.
- **Top Metadata Active Account Selector**: Moved `Active Account` to the top metadata grid in `TradeLogger.tsx` so the active broker (e.g. Dhan) is always selected and drives real-time charge calculation across single, multi-leg, and all segments.
- **All-in-One Performance & Tax Engine Update**: Updated Indian tax engine rates, added signed Risk-to-Reward (R:R) for losing trades, implemented Supabase cloud pagination batching (>1000 records), and memoized heavy metrics in `Dashboard.tsx`.
- **Apple iOS & WalletPulse Glassmorphic Theme**: Applied Apple iOS pitch obsidian dark (`#000000`) & grouped light (`#f2f2f7`) palette, backdrop blur (`30px`), squircle corners (`18px-20px`), smooth page slide entrance animation (`ios-page-enter`), MS Excel smooth cell selection glide animation (`excelSelectionGlide`), and full Apple iOS Capsule Pill (`border-radius: 9999px`) styling across sidebar menu tabs, header dropdown selects, buttons, and tab controls with `iosPillGlide` spring animation.
