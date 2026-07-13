import type { Trade } from '../types';

export function getFinancialYear(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return 'Unknown';
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed: 3 = April
  if (isNaN(year) || isNaN(month)) return 'Unknown';
  
  if (month >= 3) {
    return `FY ${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `FY ${year - 1}-${year.toString().slice(-2)}`;
  }
}

export function filterTradesByFY(trades: Trade[], fy: string): Trade[] {
  if (fy === 'All') return trades;
  const match = fy.match(/FY (\d{4})/);
  if (!match) return trades;
  const startYear = parseInt(match[1], 10);
  const endYear = startYear + 1;

  const startStr = `${startYear}-04-01`;
  const endStr = `${endYear}-03-31`;

  return trades.filter((t) => t.date >= startStr && t.date <= endStr);
}

export const FINANCIAL_YEARS = [
  'All',
  'FY 2026-27'
];

export function getCurrentLiveFY(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed: 3 = April
  if (month >= 3) {
    return `FY ${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `FY ${year - 1}-${year.toString().slice(-2)}`;
  }
}

export function formatTimeToAMPM(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;
  
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');
  
  if (isNaN(hours)) return timeStr;
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  const formattedHours = hours.toString().padStart(2, '0');
  
  return `${formattedHours}:${minutes} ${ampm}`;
}
