# Trader's Diary — Phase 0 Mandatory Backup Manifest

> **Creation Timestamp:** 2026-09-25 20:37:00 IST (UTC+05:30)  
> **Status:** COMPLETED & VERIFIED  
> **Pre-Redesign Baseline Commit:** `284eff40f99c9e82051e871f4bd54c2bf6d51fa0`  
> **Git Checkpoint Branch:** `pre-liquid-glass-backup`  
> **Git Checkpoint Tag:** `v-pre-liquid-glass` (Pushed to GitHub `origin`)

---

## 1. Executive Summary & Purpose

This backup manifest documents the complete, multi-tiered snapshot created prior to any UI/theme redesign, refactoring, or styling overhaul for **Trader's Diary**.

Per mandatory instructions, the application state has been preserved across all layers:
1. **Full Source Code**
2. **Current Styling System & Theme Tokens**
3. **Application Configuration & Environment Settings**
4. **Complete User Database & Live Trade Logs (204 active trades, capital adjustments, bank ledgers, reflections)**
5. **User-Uploaded Media & Attachments**
6. **Version-Control Checkpoints (Git branch & tag pushed to remote)**
7. **Automated One-Click Rollback / Restore Utilities**

---

## 2. Inventory of Backed-Up Assets

### 2.1 Source Code (`BACKUP/source/`)
Complete mirror of the working tree preserving exact directory structure:
- `src/` — All React components, state stores (`useTradeStore.ts`), utility libraries (`taxEngine.ts`, `statementParser.ts`, `fyHelper.ts`, `tradeGrouping.ts`, `supabaseClient.ts`), and TypeScript types (`types.ts`).
- `api/` — Backend serverless routes (`yahoo-proxy.js`).
- `scripts/` — Database migration and setup scripts (`setup-db.js`, `run_phase0_backup.py`).
- `public/` — Static assets, icons, logos, and manifests.
- Root configuration files: `index.html`, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`, `vercel.json`, `README.md`, `CODEBASE_MEMORY.md`, `Start_Diary.bat`.

### 2.2 Theme & Styling System (`BACKUP/theme/`)
- `index.css` — Verbatim copy of current global stylesheet with all CSS custom properties (`:root`), glassmorphic definitions (`.glass-card`, `.glass-modal`, backdrop-filter), typography, animations (`@keyframes`), and component utilities.
- `theme_tokens.json` — Extracted machine-readable tokens for colors, typography, border radius, shadows, and backdrop blurs.

### 2.3 Application Configuration & Settings (`BACKUP/config/`)
- `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`, `vercel.json`, `package.json`.
- `.env.example` — Sanitized environment variable template.
- `.env.backup` — Local encrypted/protected copy of local environment variables (guarded by `.gitignore` to prevent any secret exposure to Git).

### 2.4 Database & User Data Dump (`BACKUP/database/`)
- **Primary Data Source:** Browser LocalStorage LevelDB for `https://tradersdiary-pro.vercel.app` + Supabase PostgreSQL schema.
- **`user_database_dump.json`:** Comprehensive JSON dump of all 31 keys containing every trade, balance, preference, and setting.
- **Domain-Specific Extracted JSON Tables:**
  - `trades.json` — **204 live trades** (complete trade log with symbol, entry/exit prices, timestamps, P&L, brokerage, taxes, strategies, mistakes, emotions, notes, partial exits, and multi-leg spreads).
  - `adjustments.json` — Capital deposits, withdrawals, and balance reconciliations.
  - `investments.json` — Long-term equity/mutual fund holdings.
  - `bank_transactions.json` — Bank ledger cashflows.
  - `broker_charges.json` — Custom brokerage and regulatory turnover charge rates.
  - `broker_accounts.json` — Multi-broker account credentials and profiles.
  - `bank_accounts.json` — Configured trading bank accounts.
  - `subscription_expenses.json` — Trading software subscription tracking.
  - `weekly_retrospectives.json` — Weekend review logs, ratings, and action plans.
  - `setups.json` — Custom user setup tags.
- **`schema.sql`:** DDL schema for PostgreSQL / Supabase `trades` and metadata tables.
- **`leveldb_raw/`:** Direct verbatim copy of the raw Chromium LevelDB database directory (`.ldb` and `.log` tables).
- **`restore_database.py`:** Python restoration tool that validates dumps and outputs browser injection scripts.
- **`restore_in_browser.js`:** One-line instant JavaScript restore command that repopulates `localStorage` in any browser console.

### 2.5 User-Uploaded Media (`BACKUP/uploads/`)
- 24 user-uploaded screenshots and attachments from `.user_uploaded/` (`media_*.png`).
- Public image assets and logos (`public/tradediary_logo.png`, etc.).

---

## 3. Verification Report

| Check Item | Expected Result | Actual Result | Verification Status |
| :--- | :--- | :--- | :---: |
| Source code files exist | Complete `src/` tree | All 25+ components & stores present | **PASS** |
| Theme files non-empty | `index.css` > 20KB | 28.9 KB valid CSS | **PASS** |
| Configuration backup | All configs copied | 8 config files present | **PASS** |
| Database dump valid | JSON parseable | 31 keys, valid JSON | **PASS** |
| Active trades preserved | > 0 trades | **204 trades verified** | **PASS** |
| Raw LevelDB binary backup | Contains `.ldb` and `.log` | 6 raw files copied | **PASS** |
| Uploaded files preserved | 24 media screenshots | 24 files copied | **PASS** |
| Git checkpoint created | Remote tag & branch | `pre-liquid-glass-backup` & `v-pre-liquid-glass` | **PASS** |
| Secrets exclusion | `.env.backup` not in git | Verified by `git status --ignored` | **PASS** |

---

## 4. Rollback & Disaster Recovery Plan

If at any point during or after the Liquid Glass redesign you need to restore the software to this exact state, follow these procedures:

### Option A: Complete Codebase Rollback via Git (Instant)
```bash
git checkout pre-liquid-glass-backup
# Or hard reset if needed:
git reset --hard v-pre-liquid-glass
npm install
npm run build
```

### Option B: Restore Source Code from `BACKUP/source/`
```powershell
# Copy backup source back over working tree:
Copy-Item -Path "BACKUP\source\*" -Destination "." -Recurse -Force
npm run build
```

### Option C: Restore User Data / Trades in Browser (Zero Data Loss)
1. Open Trader's Diary in your browser (`https://tradersdiary-pro.vercel.app` or `http://localhost:5173`).
2. Press **F12** (Developer Tools) and select the **Console** tab.
3. Open `BACKUP/database/restore_in_browser.js` in any text editor, copy its contents, paste into the Console, and press **Enter**.
4. The page will reload immediately with all 204 trades, adjustments, bank accounts, and settings restored.

### Option D: Restore Raw LevelDB Storage
If using Microsoft Edge:
1. Close Microsoft Edge.
2. Copy all files from `BACKUP/database/leveldb_raw/` into:
   `%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Local Storage\leveldb\`
3. Relaunch Edge — all local storage will be restored.

---

## 5. Phase 0 Hard Safety Sign-Off

All backup requirements from Phase 0 have been completed, verified, and checked into version control. The application is 100% restorable.
