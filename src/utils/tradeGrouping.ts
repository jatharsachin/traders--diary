import type { Trade } from '../types';
import { getTradeMistakes } from '../types';

export interface GroupedTradePosition {
  id: string; // leg1.id or trade.id
  isHedgedSpread: boolean;
  leg1: Trade;
  leg2?: Trade;
  date: string;
  entryTime?: string;
  broker?: string;
  strategy?: string;
  combinedNetPnL: number;
  mistakes: string[];
  emotion?: string;
  notes: string;
  rulesFollowed: string[];
}

/**
 * Cleans note text by removing automatic hedge leg annotations like "(Hedge Leg for NIFTY 23250 CE)"
 */
export function cleanHedgeNote(notes?: string): string {
  if (!notes) return '';
  return notes.replace(/\(Hedge Leg.*?\)/gi, '').trim();
}

/**
 * Checks whether a trade represents a secondary hedge leg of a spread
 */
export function isHedgeLeg(t: Trade): boolean {
  return Boolean(
    t.tags?.includes('#spread_leg2') ||
    t.tags?.includes('#hedge_leg') ||
    (t.notes && /hedge\s*leg/i.test(t.notes))
  );
}

/**
 * Checks whether a trade is explicitly marked as leg 1 or hedged
 */
export function isHedgeLeg1(t: Trade): boolean {
  return Boolean(
    t.tags?.includes('#spread_leg1') ||
    t.tags?.includes('#hedged')
  );
}

/**
 * Groups paired hedge / spread legs into a unified position to prevent duplicate notes,
 * double-counting mistake decisions, and redundant UI clutter.
 */
export function groupHedgedTrades(trades: Trade[]): GroupedTradePosition[] {
  const processedTradeIds = new Set<string>();
  const groups: GroupedTradePosition[] = [];

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    if (processedTradeIds.has(t.id)) continue;

    let leg1: Trade = t;
    let leg2: Trade | undefined = undefined;

    if (isHedgeLeg(t)) {
      // t is a hedge leg; look for its sibling leg1
      const sibling = trades.find(other =>
        other.id !== t.id &&
        !processedTradeIds.has(other.id) &&
        (other.date === t.date || other.exitDate === t.exitDate || other.date === t.exitDate || other.exitDate === t.date) &&
        (
          (t.notes && other.symbol && t.notes.includes(other.symbol)) ||
          (
            (other.entryTime === t.entryTime || !t.entryTime || !other.entryTime) &&
            (other.brokerAccountId === t.brokerAccountId || other.broker === t.broker) &&
            (
              other.tags?.includes('#spread_leg1') ||
              other.tags?.includes('#hedged') ||
              (other.strategy && t.strategy && other.strategy === t.strategy) ||
              (cleanHedgeNote(other.notes) && cleanHedgeNote(other.notes) === cleanHedgeNote(t.notes))
            )
          )
        )
      );

      if (sibling) {
        leg1 = sibling;
        leg2 = t;
      } else {
        leg1 = t;
      }
    } else {
      // t is potential leg1, search for leg2
      const sibling = trades.find(other =>
        other.id !== t.id &&
        !processedTradeIds.has(other.id) &&
        (other.date === t.date || other.exitDate === t.exitDate || other.date === t.exitDate || other.exitDate === t.date) &&
        (
          (other.notes && t.symbol && other.notes.includes(t.symbol)) ||
          (
            (other.entryTime === t.entryTime || !t.entryTime || !other.entryTime) &&
            (other.brokerAccountId === t.brokerAccountId || other.broker === t.broker) &&
            (
              isHedgeLeg(other) ||
              other.tags?.includes('#spread_leg2') ||
              other.tags?.includes('#hedge_leg') ||
              (other.tags?.includes('#hedged') && other.action !== t.action) ||
              (
                other.strategy && 
                t.strategy && 
                other.strategy === t.strategy && 
                other.action !== t.action &&
                cleanHedgeNote(other.notes) === cleanHedgeNote(t.notes) && 
                cleanHedgeNote(t.notes).length > 0
              )
            )
          )
        )
      );

      if (sibling) {
        if (isHedgeLeg(sibling)) {
          leg1 = t;
          leg2 = sibling;
        } else if (isHedgeLeg(t)) {
          leg1 = sibling;
          leg2 = t;
        } else if (t.action === 'SELL' && sibling.action === 'BUY') {
          leg1 = t;
          leg2 = sibling;
        } else {
          leg1 = t;
          leg2 = sibling;
        }
      }
    }

    processedTradeIds.add(leg1.id);
    if (leg2) {
      processedTradeIds.add(leg2.id);
    }

    const m1 = getTradeMistakes(leg1);
    const m2 = leg2 ? getTradeMistakes(leg2) : [];
    const combinedMistakes = Array.from(new Set([...m1, ...m2]));

    const combinedNetPnL = leg1.netPnL + (leg2 ? leg2.netPnL : 0);
    const primaryNote = cleanHedgeNote(leg1.notes) || cleanHedgeNote(leg2?.notes);

    const r1 = leg1.rulesFollowed || [];
    const r2 = leg2?.rulesFollowed || [];
    const combinedRules = Array.from(new Set([...r1, ...r2]));

    groups.push({
      id: leg1.id,
      isHedgedSpread: Boolean(leg2),
      leg1,
      leg2,
      date: leg1.exitDate || leg1.date,
      entryTime: leg1.entryTime,
      broker: leg1.broker || leg2?.broker,
      strategy: leg1.strategy || leg2?.strategy,
      combinedNetPnL,
      mistakes: combinedMistakes,
      emotion: leg1.emotion || leg2?.emotion,
      notes: primaryNote,
      rulesFollowed: combinedRules
    });
  }

  return groups;
}
