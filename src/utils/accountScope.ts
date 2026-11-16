import type { BrokerAccount } from '../types';

/**
 * Returns true if the entity (trade, adjustment, investment, or account)
 * matches the currently selected account(s).
 *
 * Strict Isolation:
 * - When accId is present, strictly matches against targetIds.
 * - Never leaks across same-broker accounts (e.g. Sachin Dhan vs Rupali Dhan).
 * - Fallback to brokerName ONLY when accId is missing (legacy pre-multiaccount trades).
 */
export function isMatchAccount(
  activeAccountId: string | undefined | null,
  brokerAccounts: BrokerAccount[],
  accId?: string | null,
  brokerName?: string | null
): boolean {
  if (!activeAccountId || activeAccountId === 'Combined') return true;

  const targetIds = activeAccountId.split(',').filter(Boolean);
  if (targetIds.length === 0) return true;

  // 1. Strict Account ID Match
  if (accId) {
    return targetIds.includes(accId);
  }

  // 2. Legacy fallback only when accId is not present on the record
  if (brokerName) {
    const selectedAccounts = brokerAccounts.filter(a => targetIds.includes(a.id));
    return selectedAccounts.some(
      a => (a.broker || '').trim().toLowerCase() === brokerName.trim().toLowerCase()
    );
  }

  return false;
}
