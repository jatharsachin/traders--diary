import type { Trade, BrokerAccount } from '../types';

export interface MonthlyReportParams {
  trades: Trade[];
  monthStr: string; // e.g. "2026-11" or "November 2026"
  userName?: string;
  brokerAccounts?: BrokerAccount[];
  activeAccountId?: string;
}

export function generateMonthlyPDFReport({
  trades,
  monthStr,
  userName = 'Sachin',
  brokerAccounts = [],
  activeAccountId = 'Combined',
}: MonthlyReportParams): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups in your browser to view and print the 1-Page Monthly PDF Report.');
    return;
  }

  // Parse Month Title
  let formattedMonth = monthStr;
  if (/^\d{4}-\d{2}$/.test(monthStr)) {
    const [y, m] = monthStr.split('-');
    const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    formattedMonth = dateObj.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  // Determine active account label
  let accountLabel = 'All Accounts (Combined)';
  if (activeAccountId && activeAccountId !== 'Combined') {
    const ids = activeAccountId.split(',').filter(Boolean);
    const matched = brokerAccounts.filter(a => ids.includes(a.id));
    if (matched.length > 0) {
      accountLabel = matched.map(a => `${a.broker} (${a.accountName || a.id})`).join(', ');
    }
  }

  // Calculations
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.netPnL > 0);
  const losingTrades = trades.filter(t => t.netPnL < 0);

  const winCount = winningTrades.length;
  const lossCount = losingTrades.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;

  const grossPnL = trades.reduce((sum, t) => sum + (t.grossPnL || 0), 0);
  const totalBrokerage = trades.reduce((sum, t) => sum + (t.brokerage || 0), 0);
  const totalTaxes = trades.reduce((sum, t) => sum + (t.taxes || 0), 0);
  const totalCharges = totalBrokerage + totalTaxes;
  const netPnL = trades.reduce((sum, t) => sum + (t.netPnL || 0), 0);

  const grossProfit = winningTrades.reduce((sum, t) => sum + t.netPnL, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.netPnL, 0));
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : (grossProfit > 0 ? 99.9 : 0);

  const avgWin = winCount > 0 ? grossProfit / winCount : 0;
  const avgLoss = lossCount > 0 ? grossLoss / lossCount : 0;
  const riskRewardRatio = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : 'N/A';

  // Unique trading days
  const tradingDaysSet = new Set(trades.map(t => t.date));
  const tradingDaysCount = tradingDaysSet.size;

  // Turnover calculation (Section 44AB for F&O: sum of absolute net profit/loss per trade)
  const fnoTurnover = trades.reduce((sum, t) => {
    if (t.segment === 'F&O') {
      return sum + Math.abs(t.grossPnL || 0);
    }
    // Equity delivery / intraday
    return sum + (t.qty * t.entryPrice);
  }, 0);

  // Group by Week
  const weeklyMap: Record<string, { trades: number; wins: number; gross: number; charges: number; net: number }> = {};
  trades.forEach(t => {
    const day = new Date(t.date).getDate();
    const weekNum = Math.min(Math.ceil(day / 7), 5);
    const key = `Week ${weekNum}`;
    if (!weeklyMap[key]) {
      weeklyMap[key] = { trades: 0, wins: 0, gross: 0, charges: 0, net: 0 };
    }
    weeklyMap[key].trades += 1;
    if (t.netPnL > 0) weeklyMap[key].wins += 1;
    weeklyMap[key].gross += t.grossPnL || 0;
    weeklyMap[key].charges += (t.brokerage || 0) + (t.taxes || 0);
    weeklyMap[key].net += t.netPnL || 0;
  });

  const weeklyList = Object.entries(weeklyMap).sort(([a], [b]) => a.localeCompare(b));

  // Top 3 Trades
  const sortedByPnL = [...trades].sort((a, b) => b.netPnL - a.netPnL);
  const topWinningTrades = sortedByPnL.filter(t => t.netPnL > 0).slice(0, 3);

  const fmtINR = (val: number) => {
    return (val < 0 ? '-₹' : '₹') + Math.abs(Math.round(val)).toLocaleString('en-IN');
  };

  const escapeHtml = (str: any) =>
    String(str ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m] || m);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Monthly Trading Statement - ${escapeHtml(formattedMonth)} - ${escapeHtml(userName)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.35;
    }
    .page-container {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    .no-print-bar {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      border-radius: 8px;
      font-size: 13px;
    }
    .print-btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 7px 16px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
    }
    .print-btn:hover {
      background: #1d4ed8;
    }
    @media print {
      .no-print-bar {
        display: none !important;
      }
      body {
        padding: 0;
      }
    }
    
    /* Header */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .header-logo {
      font-size: 19px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }
    .header-logo span {
      color: #2563eb;
    }
    .header-sub {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin-top: 2px;
      font-weight: 700;
    }
    .header-meta {
      text-align: right;
      font-size: 10px;
      color: #334155;
    }
    .header-meta strong {
      color: #0f172a;
    }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .kpi-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      background: #f8fafc;
    }
    .kpi-title {
      font-size: 8.5px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .kpi-value {
      font-size: 16px;
      font-weight: 800;
      margin-top: 3px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .kpi-sub {
      font-size: 8.5px;
      color: #64748b;
      margin-top: 2px;
    }
    .text-green { color: #15803d; }
    .text-red { color: #b91c1c; }

    /* 2 Columns Section */
    .two-cols {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 12px;
      background: #ffffff;
    }
    .box-title {
      font-size: 10.5px;
      font-weight: 750;
      color: #1e293b;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .box-title span {
      font-size: 8.5px;
      font-weight: 600;
      color: #2563eb;
    }
    
    .data-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3.5px 0;
      font-size: 10px;
      border-bottom: 1px dashed #f1f5f9;
    }
    .data-row:last-child {
      border-bottom: none;
    }
    .data-label {
      color: #475569;
    }
    .data-val {
      font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      color: #0f172a;
    }
    .data-val-highlight {
      font-weight: 800;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      color: #b91c1c;
    }

    /* Tables */
    .custom-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      margin-top: 4px;
    }
    .custom-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      padding: 4px 6px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    .custom-table td {
      padding: 4px 6px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .custom-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .font-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    /* Tax Notice Note */
    .tax-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 7px 10px;
      margin-bottom: 10px;
      font-size: 9px;
      color: #166534;
      line-height: 1.35;
    }

    /* Footer */
    .footer {
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      margin-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 8.5px;
      color: #64748b;
    }
    .sign-box {
      text-align: right;
      padding-top: 20px;
    }
    .sign-line {
      border-top: 1px solid #94a3b8;
      width: 160px;
      display: inline-block;
      margin-top: 15px;
      padding-top: 3px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="no-print-bar">
      <div>
        <strong>TradeDiary Pro</strong> - 1-Page Monthly Performance & CA Tax Statement
      </div>
      <div>
        <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF (1 Page)</button>
      </div>
    </div>

    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <div class="header-logo">TradeDiary <span>Pro</span></div>
          <div class="header-sub">Official Monthly Performance &amp; CA Tax Audit Statement</div>
        </td>
        <td class="header-meta" style="vertical-align: top;">
          <div><strong>Trader:</strong> ${escapeHtml(userName)}</div>
          <div><strong>Period:</strong> <span style="font-weight: 700; color: #2563eb;">${escapeHtml(formattedMonth)}</span></div>
          <div><strong>Scope:</strong> ${escapeHtml(accountLabel)}</div>
          <div><strong>Statement Date:</strong> ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
        </td>
      </tr>
    </table>

    <!-- KPI Grid -->
    <div class="kpi-grid">
      <div class="kpi-card" style="border-left: 3.5px solid ${netPnL >= 0 ? '#15803d' : '#b91c1c'};">
        <div class="kpi-title">Net Realized P&L</div>
        <div class="kpi-value ${netPnL >= 0 ? 'text-green' : 'text-red'}">
          ${netPnL >= 0 ? '+' : ''}${fmtINR(netPnL)}
        </div>
        <div class="kpi-sub">Gross: ${grossPnL >= 0 ? '+' : ''}${fmtINR(grossPnL)}</div>
      </div>

      <div class="kpi-card" style="border-left: 3.5px solid #2563eb;">
        <div class="kpi-title">Success Rate</div>
        <div class="kpi-value font-mono" style="color: #1e293b;">
          ${winRate.toFixed(1)}%
        </div>
        <div class="kpi-sub">${winCount} Wins / ${lossCount} Losses (${totalTrades} trades)</div>
      </div>

      <div class="kpi-card" style="border-left: 3.5px solid #d97706;">
        <div class="kpi-title">Total Trading Charges</div>
        <div class="kpi-value text-red font-mono">
          ${fmtINR(totalCharges)}
        </div>
        <div class="kpi-sub">Brokerage: ${fmtINR(totalBrokerage)} | Taxes: ${fmtINR(totalTaxes)}</div>
      </div>

      <div class="kpi-card" style="border-left: 3.5px solid #0d9488;">
        <div class="kpi-title">Profit Factor &amp; Activity</div>
        <div class="kpi-value font-mono" style="color: #0f172a;">
          ${profitFactor.toFixed(2)}
        </div>
        <div class="kpi-sub">${tradingDaysCount} Trading Days Active</div>
      </div>
    </div>

    <!-- 2 Column Section -->
    <div class="two-cols">
      <!-- Left: CA Tax & Expense Audit -->
      <div class="box">
        <div class="box-title">
          <span>CA AUDIT &amp; TAX SCHEDULE</span>
          Trading Business Expenses
        </div>

        <div class="data-row">
          <span class="data-label">Brokerage Deductions (Section 37):</span>
          <span class="data-val">${fmtINR(totalBrokerage)}</span>
        </div>
        <div class="data-row">
          <span class="data-label">Exchange, GST, Stamp &amp; SEBI Levies:</span>
          <span class="data-val">${fmtINR(totalTaxes)}</span>
        </div>
        <div class="data-row" style="background: #f8fafc; padding: 4px 6px; border-radius: 4px; margin: 3px 0;">
          <span class="data-label" style="font-weight: 700; color: #0f172a;">Total Allowable Business Expenses:</span>
          <span class="data-val-highlight">${fmtINR(totalCharges)}</span>
        </div>
        <div class="data-row">
          <span class="data-label">Estimated F&amp;O Turnover (Sec 44AB):</span>
          <span class="data-val">${fmtINR(fnoTurnover)}</span>
        </div>
        <div class="data-row">
          <span class="data-label">Tax Audit Applicability (Sec 44AB):</span>
          <span class="data-val" style="color: ${fnoTurnover > 100000000 ? '#b91c1c' : '#15803d'};">
            ${fnoTurnover > 100000000 ? 'Audit Mandatory (>10 Cr)' : 'Audit Not Mandatory (Exempt)'}
          </span>
        </div>
        <div class="data-row">
          <span class="data-label">Average Win / Average Loss Ratio:</span>
          <span class="data-val">${fmtINR(avgWin)} / ${fmtINR(avgLoss)} (${riskRewardRatio})</span>
        </div>
      </div>

      <!-- Right: Weekly Performance Schedule -->
      <div class="box">
        <div class="box-title">
          <span>BREAKDOWN</span>
          Weekly Performance Schedule
        </div>

        ${weeklyList.length > 0 ? `
        <table class="custom-table">
          <thead>
            <tr>
              <th>Week</th>
              <th style="text-align: center;">Trades</th>
              <th style="text-align: center;">Win%</th>
              <th style="text-align: right;">Charges</th>
              <th style="text-align: right;">Net P&amp;L</th>
            </tr>
          </thead>
          <tbody>
            ${weeklyList.map(([wKey, wData]) => {
              const wWinRate = wData.trades > 0 ? (wData.wins / wData.trades) * 100 : 0;
              const isProfit = wData.net >= 0;
              return `
              <tr>
                <td style="font-weight: 600;">${wKey}</td>
                <td style="text-align: center;" class="font-mono">${wData.trades}</td>
                <td style="text-align: center;" class="font-mono">${wWinRate.toFixed(0)}%</td>
                <td style="text-align: right;" class="font-mono">${fmtINR(wData.charges)}</td>
                <td style="text-align: right; font-weight: 700;" class="font-mono ${isProfit ? 'text-green' : 'text-red'}">
                  ${isProfit ? '+' : ''}${fmtINR(wData.net)}
                </td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ` : `
        <div style="text-align: center; color: #94a3b8; padding: 20px 0;">No trades recorded for this month.</div>
        `}
      </div>
    </div>

    <!-- Top Trades Table (Highlights) -->
    <div class="box" style="margin-bottom: 10px;">
      <div class="box-title">
        <span>TRADE HIGHLIGHTS</span>
        Top Winning Executions of the Month
      </div>
      ${topWinningTrades.length > 0 ? `
      <table class="custom-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Symbol</th>
            <th>Action</th>
            <th style="text-align: right;">Qty</th>
            <th style="text-align: right;">Entry Price</th>
            <th style="text-align: right;">Exit Price</th>
            <th>Strategy Setup</th>
            <th style="text-align: right;">Net P&amp;L</th>
          </tr>
        </thead>
        <tbody>
          ${topWinningTrades.map(t => `
          <tr>
            <td>${escapeHtml(t.date)}</td>
            <td style="font-weight: 600;">${escapeHtml(t.symbol)}</td>
            <td><strong style="color: ${t.action === 'BUY' ? '#15803d' : '#b91c1c'};">${t.action}</strong></td>
            <td style="text-align: right;" class="font-mono">${t.qty}</td>
            <td style="text-align: right;" class="font-mono">₹${t.entryPrice.toFixed(2)}</td>
            <td style="text-align: right;" class="font-mono">₹${t.exitPrice.toFixed(2)}</td>
            <td>${escapeHtml(t.strategy || 'Discretionary')}</td>
            <td style="text-align: right; font-weight: 800;" class="font-mono text-green">
              +${fmtINR(t.netPnL)}
            </td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      ` : `
      <div style="font-size: 9.5px; color: #64748b; padding: 4px 0;">No winning trades logged for this period.</div>
      `}
    </div>

    <!-- Tax Compliance Note -->
    <div class="tax-box">
      <strong>📌 CA &amp; Tax Compliance Note:</strong> In India, F&O is classified as non-speculative business income under Section 43(5). Brokerage, exchange transaction fees, and STT on F&O are allowable business deductions under Section 37(1). Ensure this statement matches your broker P&amp;L statement when preparing ITR-3.
    </div>

    <!-- Footer -->
    <div class="footer">
      <div>
        Generated by <strong>TradeDiary Pro</strong> | Certified Trading Audit Record<br>
        Confidential Document &bull; For Tax &amp; Portfolio Accounting Use
      </div>
      <div class="sign-box">
        <div class="sign-line">Trader / Auditor Signature</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
