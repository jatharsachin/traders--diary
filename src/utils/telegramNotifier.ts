import type { Trade } from '../types';
import { getTradeMistakes } from '../types';

export function formatDailyTelegramReport(
  dateStr: string,
  todayTrades: Trade[],
  isNoTradeDay: boolean = false
): string {
  const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (isNoTradeDay || todayTrades.length === 0) {
    return (
      `📊 *TRADERS DIARY - DAILY MARKET CLOSE REPORT*\n` +
      `📅 *Date:* ${formattedDate}\n\n` +
      `🛡️ *DISCIPLINED NO-TRADE DAY*\n` +
      `• *Status:* No trades taken today.\n` +
      `• *P&L:* ₹0.00\n` +
      `• *Capital Preserved:* 100%\n\n` +
      `💡 _"Patience is key. Preserving capital on unclear market days is a huge win!"_`
    );
  }

  const totalTrades = todayTrades.length;
  const wins = todayTrades.filter((t) => t.netPnL > 0).length;
  const losses = todayTrades.filter((t) => t.netPnL < 0).length;
  const breakevens = todayTrades.filter((t) => t.netPnL === 0).length;

  const grossPnL = todayTrades.reduce((sum, t) => sum + t.grossPnL, 0);
  const netPnL = todayTrades.reduce((sum, t) => sum + t.netPnL, 0);
  const brokerage = todayTrades.reduce((sum, t) => sum + t.brokerage, 0);
  const taxes = todayTrades.reduce((sum, t) => sum + t.taxes, 0);
  const totalCharges = brokerage + taxes;

  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0';

  const pnlEmoji = netPnL >= 0 ? '🚀 📈' : '⚠️ 📉';
  const pnlPrefix = netPnL >= 0 ? '+' : '';

  // Collect top emotions and mistakes
  const emotionsList = Array.from(new Set(todayTrades.map((t) => t.emotion))).filter(Boolean).join(', ');
  const mistakesList = Array.from(new Set(todayTrades.flatMap((t) => getTradeMistakes(t)))).join(', ');

  return (
    `📊 *TRADERS DIARY - DAILY SUMMARY REPORT*\n` +
    `📅 *Date:* ${formattedDate}\n\n` +
    `💼 *PERFORMANCE OVERVIEW*\n` +
    `• *Net P&L:* ${pnlPrefix}₹${Math.round(netPnL).toLocaleString('en-IN')} ${pnlEmoji}\n` +
    `• *Gross P&L:* ${grossPnL >= 0 ? '+' : ''}₹${Math.round(grossPnL).toLocaleString('en-IN')}\n` +
    `• *Total Trades:* ${totalTrades} (${wins} Wins, ${losses} Losses${breakevens > 0 ? `, ${breakevens} BE` : ''})\n` +
    `• *Win Rate:* ${winRate}%\n\n` +
    `💸 *CHARGES BREAKDOWN*\n` +
    `• *Brokerage:* ₹${Math.round(brokerage).toLocaleString('en-IN')}\n` +
    `• *Taxes & Fees:* ₹${Math.round(taxes).toLocaleString('en-IN')}\n` +
    `• *Total Charges:* ₹${Math.round(totalCharges).toLocaleString('en-IN')}\n\n` +
    `🧠 *PSYCHOLOGY & DISCIPLINE*\n` +
    `• *Emotions:* ${emotionsList || 'Calm'}\n` +
    `• *Mistakes:* ${mistakesList || 'None (Disciplined execution)'}\n\n` +
    `💪 _Keep sticking to your trading plan and risk management!_`
  );
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  messageText: string
): Promise<{ success: boolean; error?: string }> {
  if (!botToken || !chatId) {
    return { success: false, error: 'Telegram Bot Token and Chat ID are required.' };
  }

  const cleanToken = botToken.trim();
  const cleanChatId = chatId.trim();

  const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: messageText,
        parse_mode: 'Markdown',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return {
        success: false,
        error: data.description || 'Failed to send message to Telegram API.',
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network error while connecting to Telegram API.';
    return { success: false, error: errorMsg };
  }
}

export async function testTelegramConnection(
  botToken: string,
  chatId: string
): Promise<{ success: boolean; error?: string }> {
  const testMessage = (
    `✅ *TRADERS DIARY - TELEGRAM BOT CONNECTED!*\n\n` +
    `Your Telegram bot integration is active & working perfectly.\n` +
    `You will now receive daily trading close summaries at 3:30 PM IST! 🚀`
  );

  return sendTelegramMessage(botToken, chatId, testMessage);
}
