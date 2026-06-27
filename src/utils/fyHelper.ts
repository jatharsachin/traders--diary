import type { Trade } from '../types';

export function getFinancialYear(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Unknown';
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed: 3 = April
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
  'FY 2026-27',
  'FY 2025-26',
  'FY 2024-25',
  'FY 2023-24'
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
