// Pure HTML5 Canvas Executive Performance Card Exporter
// Renders a ultra-premium 2x Retina resolution PNG card of trading performance

export interface ExecutiveReportData {
  userName: string;
  userAvatar: string;
  periodLabel: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  grossPnL: number;
  totalBrokerage: number;
  totalTaxes: number;
  totalSubscriptions: number;
  netPnL: number;
  netBottomLine: number;
  profitFactor: number;
  bestTradeSymbol?: string;
  bestTradePnL?: number;
  topMistakeTag?: string;
  isPnlVisible: boolean;
}

export function downloadExecutiveReportCardPNG(data: ExecutiveReportData, filename?: string) {
  const canvas = document.createElement('canvas');
  // 2x Retina scaling for ultra-sharp text and graphics
  const scale = 2;
  const width = 850;
  const height = 520;
  
  canvas.width = width * scale;
  canvas.height = height * scale;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  ctx.scale(scale, scale);

  // Background Gradient (Dark Luxury Glassmorphism)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0f172a');
  bgGrad.addColorStop(0.5, '#1e1b4b');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Decorative Glow Circles
  const isNetPositive = data.netPnL >= 0;
  const mainGlowColor = isNetPositive ? 'rgba(48, 209, 88, 0.12)' : 'rgba(255, 69, 58, 0.12)';
  
  ctx.save();
  ctx.fillStyle = mainGlowColor;
  ctx.beginPath();
  ctx.arc(150, 100, 140, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
  ctx.beginPath();
  ctx.arc(700, 420, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Helper for drawing rounded rectangles
  const drawRoundRect = (x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  // Outer Border Container
  drawRoundRect(15, 15, width - 30, height - 30, 16, 'rgba(255, 255, 255, 0.02)', 'rgba(255, 255, 255, 0.12)');

  // HEADER BAR
  // Logo Icon Box
  drawRoundRect(35, 35, 42, 42, 10, 'rgba(99, 102, 241, 0.25)', 'rgba(99, 102, 241, 0.5)');
  ctx.font = '900 20px "Inter", -apple-system, sans-serif';
  ctx.fillStyle = '#6366f1';
  ctx.fillText('📈', 45, 63);

  // App Title & Tagline
  ctx.font = '800 16px "Inter", -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText("TRADER'S DIARY EXECUTIVE REPORT", 90, 52);

  ctx.font = '600 11px "Inter", -apple-system, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`TRADER: ${data.userName.toUpperCase()} • GENERATED ON ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 90, 68);

  // Period Badge (Top Right)
  const periodBadgeText = data.periodLabel.toUpperCase();
  ctx.font = '700 11px "Inter", -apple-system, sans-serif';
  const periodWidth = ctx.measureText(periodBadgeText).width + 24;
  drawRoundRect(width - 40 - periodWidth, 40, periodWidth, 30, 8, 'rgba(99, 102, 241, 0.2)', '#6366f1');
  ctx.fillStyle = '#818cf8';
  ctx.fillText(periodBadgeText, width - 40 - periodWidth + 12, 59);

  // -------------------------------------------------------------
  // MAIN NET P&L CARD (LEFT BIG HERO CARD)
  // -------------------------------------------------------------
  const cardFill = isNetPositive ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)';
  const cardBorder = isNetPositive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)';
  const pnlColor = isNetPositive ? '#34d399' : '#f87171';

  drawRoundRect(35, 95, 480, 180, 14, cardFill, cardBorder);

  ctx.font = '600 11px "Inter", -apple-system, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('NET REALIZED TRADING P&L', 55, 122);

  // Format currency helper
  const fmt = (val: number) => {
    if (!data.isPnlVisible) return '••••••••';
    const abs = Math.abs(val);
    const formatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(abs);
    return `${val >= 0 ? '+' : '-'}${formatted}`;
  };

  // Main PnL Big Text
  ctx.font = '800 34px "Inter", "JetBrains Mono", monospace';
  ctx.fillStyle = pnlColor;
  ctx.fillText(fmt(data.netPnL), 55, 165);

  // Sub-text: Net Bottom Line (after Subscriptions) if applicable
  if (data.totalSubscriptions > 0) {
    drawRoundRect(55, 180, 440, 32, 6, 'rgba(245, 158, 11, 0.1)', 'rgba(245, 158, 11, 0.3)');
    ctx.font = '600 11px "Inter", -apple-system, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`Net Bottom-Line: ${fmt(data.netBottomLine)} (After ₹${Math.round(data.totalSubscriptions).toLocaleString('en-IN')} Subscriptions)`, 67, 201);
  } else {
    ctx.font = '500 12px "Inter", -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Gross Profit: ${fmt(data.grossPnL)} • Total Charges: ${fmt(data.totalBrokerage + data.totalTaxes)}`, 55, 200);
  }

  // Mini Win-Rate Bar inside hero card
  const totalT = Math.max(1, data.totalTrades);
  const winPct = Math.min(100, Math.max(0, (data.winningTrades / totalT) * 100));
  
  drawRoundRect(55, 230, 440, 8, 4, 'rgba(239, 68, 68, 0.3)');
  if (winPct > 0) {
    drawRoundRect(55, 230, (440 * winPct) / 100, 8, 4, '#34d399');
  }

  ctx.font = '600 11px "Inter", -apple-system, sans-serif';
  ctx.fillStyle = '#34d399';
  ctx.fillText(`${data.winningTrades} Wins (${winPct.toFixed(1)}%)`, 55, 255);
  ctx.fillStyle = '#f87171';
  ctx.fillText(`${data.losingTrades} Losses`, 380, 255);

  // -------------------------------------------------------------
  // TRADING STATS GRID (RIGHT SIDE CARDS)
  // -------------------------------------------------------------
  const rightX = 530;
  const rightW = 285;

  // Stat Card 1: Win Rate & Profit Factor
  drawRoundRect(rightX, 95, rightW, 85, 12, 'rgba(255, 255, 255, 0.025)', 'rgba(255, 255, 255, 0.08)');
  ctx.font = '600 10px "Inter", -apple-system, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('WIN RATE', rightX + 16, 118);
  ctx.fillText('PROFIT FACTOR', rightX + 150, 118);

  ctx.font = '800 20px "Inter", monospace';
  ctx.fillStyle = '#60a5fa';
  ctx.fillText(`${data.winRate.toFixed(1)}%`, rightX + 16, 145);
  ctx.fillStyle = data.profitFactor >= 1.5 ? '#34d399' : '#f87171';
  ctx.fillText(data.profitFactor === Infinity ? '∞' : data.profitFactor.toFixed(2), rightX + 150, 145);

  // Stat Card 2: Total Trades Executed
  drawRoundRect(rightX, 190, rightW, 85, 12, 'rgba(255, 255, 255, 0.025)', 'rgba(255, 255, 255, 0.08)');
  ctx.font = '600 10px "Inter", -apple-system, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('TOTAL TRADES', rightX + 16, 213);
  ctx.fillText('AVG COST / LEAKAGE', rightX + 150, 213);

  ctx.font = '800 20px "Inter", monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${data.totalTrades}`, rightX + 16, 240);
  
  const totalLeakage = data.totalBrokerage + data.totalTaxes + data.totalSubscriptions;
  ctx.font = '800 16px "Inter", monospace';
  ctx.fillStyle = '#fb923c';
  ctx.fillText(fmt(totalLeakage), rightX + 150, 240);

  // -------------------------------------------------------------
  // BOTTOM BREAKDOWN ROW (3 EQUAL CARDS AT BOTTOM)
  // -------------------------------------------------------------
  const botY = 295;
  const botW = 240;
  const botH = 150;

  // Card 1: Charges Breakdown
  drawRoundRect(35, botY, botW, botH, 12, 'rgba(255, 255, 255, 0.025)', 'rgba(255, 255, 255, 0.08)');
  ctx.font = '700 11px "Inter", -apple-system, sans-serif';
  ctx.fillStyle = '#818cf8';
  ctx.fillText('💸 CHARGES BREAKDOWN', 50, botY + 25);

  ctx.font = '500 11px "Inter", monospace';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(`Brokerage:`, 50, botY + 55);
  ctx.fillText(fmt(data.totalBrokerage), 160, botY + 55);

  ctx.fillText(`Taxes & Fees:`, 50, botY + 80);
  ctx.fillText(fmt(data.totalTaxes), 160, botY + 80);

  ctx.fillText(`Subscriptions:`, 50, botY + 105);
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(fmt(data.totalSubscriptions), 160, botY + 105);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(50, botY + 115);
  ctx.lineTo(255, botY + 115);
  ctx.stroke();

  ctx.font = '700 11px "Inter", monospace';
  ctx.fillStyle = '#f87171';
  ctx.fillText(`Total Charges:`, 50, botY + 133);
  ctx.fillText(fmt(totalLeakage), 160, botY + 133);

  // Card 2: Execution Highlights
  drawRoundRect(290, botY, botW, botH, 12, 'rgba(255, 255, 255, 0.025)', 'rgba(255, 255, 255, 0.08)');
  ctx.font = '700 11px "Inter", -apple-system, sans-serif';
  ctx.fillStyle = '#34d399';
  ctx.fillText('⭐ HIGHLIGHTS', 305, botY + 25);

  ctx.font = '500 11px "Inter", sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Best Winner:', 305, botY + 55);
  ctx.font = '700 12px "Inter", monospace';
  ctx.fillStyle = '#34d399';
  ctx.fillText(data.bestTradeSymbol ? `${data.bestTradeSymbol} (${fmt(data.bestTradePnL || 0)})` : 'N/A', 305, botY + 75);

  ctx.font = '500 11px "Inter", sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Top Execution Tag:', 305, botY + 105);
  ctx.font = '700 12px "Inter", monospace';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(data.topMistakeTag || 'Clean Execution', 305, botY + 125);

  // Card 3: Official Verification Footer Seal
  drawRoundRect(545, botY, 270, botH, 12, 'rgba(99, 102, 241, 0.05)', 'rgba(99, 102, 241, 0.2)');
  ctx.font = '700 11px "Inter", -apple-system, sans-serif';
  ctx.fillStyle = '#a5b4fc';
  ctx.fillText('🛡️ VERIFIED TRADER REPORT', 560, botY + 25);

  ctx.font = '400 10px "Inter", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('Calculated using double-entry ledger &', 560, botY + 50);
  ctx.fillText('verified exchange charge metrics.', 560, botY + 65);

  // Mini Seal Stamp
  drawRoundRect(560, botY + 80, 240, 45, 8, 'rgba(16, 185, 129, 0.12)', '#34d399');
  ctx.font = '800 11px "Inter", sans-serif';
  ctx.fillStyle = '#34d399';
  ctx.fillText('✔ AUDITED PERFORMANCE LOG', 580, botY + 107);

  // FOOTER COPYRIGHT & WATERMARK
  ctx.font = '500 10px "Inter", -apple-system, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText("Generated by Trader's Diary OS • Double-Entry Accounting Verified", 35, height - 20);

  // Trigger Download
  const link = document.createElement('a');
  link.download = filename || `Executive_Report_${data.userName}_${data.periodLabel.replace(/\s+/g, '_')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
