/**
 * Yahoo Finance Symbol Mapper for Indian Equities, ETFs, and Sovereign Gold Bonds (SGBs)
 */

export const KNOWN_YAHOO_ALIASES: Record<string, string[]> = {
  // Common SGB Series variations on NSE/BSE
  'SGBJAN29': ['SGBJAN29.NS', 'SGBJAN29X.NS', 'SGBJAN29-GB.NS'],
  'SGBJAN29X': ['SGBJAN29X.NS', 'SGBJAN29.NS', 'SGBJAN29-GB.NS'],
  'SGBFEB29': ['SGBFEB29.NS', 'SGBFEB29-GB.NS'],
  'SGBMAR29': ['SGBMAR29.NS', 'SGBMAR29-GB.NS'],
  'SGBMAY29': ['SGBMAY29.NS', 'SGBMAY29-GB.NS'],
  'SGBSEP29': ['SGBSEP29.NS', 'SGBSEP29-GB.NS'],
  'SGBOCT29': ['SGBOCT29.NS', 'SGBOCT29-GB.NS'],
  'SGBDEC29': ['SGBDEC29.NS', 'SGBDEC29-GB.NS'],
  'GOLDBEES': ['GOLDBEES.NS', 'GOLDBEES.BO'],
  'SILVERBEES': ['SILVERBEES.NS', 'SILVERBEES.BO'],
  'NIFTYBEES': ['NIFTYBEES.NS', 'NIFTYBEES.BO'],
  'BANKBEES': ['BANKBEES.NS', 'BANKBEES.BO'],
  'MON100': ['MON100.NS', 'MON100.BO'],
};

export function getYahooCandidateTickers(symbol: string): string[] {
  const clean = symbol.trim().toUpperCase().replace(/\s+/g, '');
  const candidates: string[] = [];

  // Check known map
  const baseKey = clean.replace(/\.NS$|\.BO$|-GB$/i, '');
  if (KNOWN_YAHOO_ALIASES[baseKey]) {
    candidates.push(...KNOWN_YAHOO_ALIASES[baseKey]);
  }

  // SGB specific patterns
  if (clean.startsWith('SGB')) {
    const rawSgb = clean.replace(/-GB$|\.NS$|\.BO$/i, '');
    candidates.push(`${rawSgb}.NS`);
    candidates.push(`${rawSgb}-GB.NS`);
    if (rawSgb.endsWith('X')) {
      candidates.push(`${rawSgb.slice(0, -1)}.NS`);
    } else {
      candidates.push(`${rawSgb}X.NS`);
    }
  }

  // Standard NSE fallback
  const standardNs = clean.includes('.') ? clean : `${clean}.NS`;
  if (!candidates.includes(standardNs)) {
    candidates.push(standardNs);
  }

  // Standard BSE fallback
  const standardBo = clean.includes('.') ? clean : `${clean}.BO`;
  if (!candidates.includes(standardBo)) {
    candidates.push(standardBo);
  }

  return Array.from(new Set(candidates));
}
