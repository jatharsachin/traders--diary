import { useState, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTradeStore } from '../store/useTradeStore';
import type { Trade } from '../types';
import { filterTradesByFY } from '../utils/fyHelper';
import { isMatchAccount as isMatchAccountUtil } from '../utils/accountScope';
import { Modal } from './ui/Modal';
import {
  Coins, Percent, Briefcase, Scale,
  HelpCircle, Info, Sparkles, Receipt,
  Calendar, Printer, SlidersHorizontal,
  Layers, Wallet, FileText, Users, Building2
} from 'lucide-react';

type TaxCategory = 'STCG' | 'LTCG' | 'SPECULATIVE' | 'NON_SPECULATIVE';

const getTradeTaxCategory = (t: Trade): TaxCategory => {
  if (t.segment === 'Equity' && t.product === 'Delivery') {
    if (t.holdingType === 'Long Term') return 'LTCG';
    if (!t.holdingType && t.exitDate && t.date) {
      const days =
        (new Date(t.exitDate).getTime() - new Date(t.date).getTime()) / (1000 * 60 * 60 * 24);
      if (days >= 365) return 'LTCG';
    }
    return 'STCG';
  }
  if (t.segment === 'Equity' && t.product === 'Intraday') {
    return 'SPECULATIVE';
  }
  return 'NON_SPECULATIVE';
};

interface SlabTier {
  label: string;
  chunk: number;
  ratePct: number;
  tax: number;
}

interface ProgressiveTaxResult {
  tiers: SlabTier[];
  baseTax: number;
  rebate87A: number;
  marginalRelief: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  effectiveRate: number;
}

interface TaxComputation {
  tradesCount: number;
  stcgNet: number;
  ltcgNet: number;
  effectiveTaxableStcg: number;
  effectiveTaxableLtcg: number;
  ltcgExemptionUsed: number;
  unabsorbedStcl: number;
  unabsorbedLtcl: number;
  stcgTax: number;
  ltcgTax: number;
  totalCapitalGainsBaseTax: number;
  totalCapitalGainsTax: number;
  speculativeNet: number;
  nonSpeculativeNet: number;
  grossTaxableBusiness: number;
  netTaxableBusiness: number;
  unabsorbedSpecLoss: number;
  unabsorbedNonSpecLoss: number;
  setOffAgainstStcg: number;
  setOffAgainstLtcg: number;
  totalTaxableIncome: number;
  businessTaxCalc: ProgressiveTaxResult;
  newRegimeTotalTax: number;
  oldRegimeTotalTax: number;
  totalEstimatedTax: number;
  netTaxPayableOrRefund: number;
  totalBrokerage: number;
  totalGovtTaxes: number;
  absolutePnlTurnover: number;
  optionSalePremiumTurnover: number;
  totalIcaiTurnover: number;
  requiresAudit: boolean;
  requiresBooksOfAccounts: boolean;
  recommendedItr: string;
  isBudget2025Plus: boolean;
  rebateLimit: number;
  isAdvanceTaxApplicable: boolean;
}

const formatCurrency = (val: number) => {
  const abs = Math.abs(val);
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.round(abs));
  return val < 0 ? `-₹${formatted}` : `₹${formatted}`;
};

const parseFyStartYear = (fy: string): number => {
  const match = fy.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : 2025;
};

function calculateSlabTaxForRegime(
  businessIncome: number,
  stcgTaxable: number,
  ltcgTaxable: number,
  regime: 'NEW' | 'OLD',
  isBudget2025Plus: boolean
): {
  businessCalc: ProgressiveTaxResult;
  cgBaseTax: number;
  cgSurcharge: number;
  cgCess: number;
  cgTotalTax: number;
  combinedTotalTax: number;
} {
  const safeBiz = Math.max(0, businessIncome);
  const safeStcg = Math.max(0, stcgTaxable);
  const safeLtcg = Math.max(0, ltcgTaxable);
  const totalTaxableIncome = safeBiz + safeStcg + safeLtcg;

  const stcgBaseTax = safeStcg * 0.20; // Sec 111A (20%)
  const ltcgBaseTax = safeLtcg * 0.125; // Sec 112A (12.5%)
  const cgBaseTax = stcgBaseTax + ltcgBaseTax;

  let slabRanges: { limit: number; rate: number; label: string }[];
  let rebateLimit: number;
  let maxRebate: number;

  if (regime === 'NEW') {
    if (isBudget2025Plus) {
      slabRanges = [
        { limit: 400000, rate: 0, label: '₹0 - ₹4,00,000' },
        { limit: 800000, rate: 0.05, label: '₹4,00,001 - ₹8,00,000' },
        { limit: 1200000, rate: 0.10, label: '₹8,00,001 - ₹12,00,000' },
        { limit: 1600000, rate: 0.15, label: '₹12,00,001 - ₹16,00,000' },
        { limit: 2000000, rate: 0.20, label: '₹16,00,001 - ₹20,00,000' },
        { limit: 2400000, rate: 0.25, label: '₹20,00,001 - ₹24,00,000' },
        { limit: Infinity, rate: 0.30, label: 'Above ₹24,00,000' },
      ];
      rebateLimit = 1200000;
      maxRebate = 60000;
    } else {
      slabRanges = [
        { limit: 300000, rate: 0, label: '₹0 - ₹3,00,000' },
        { limit: 700000, rate: 0.05, label: '₹3,00,001 - ₹7,00,000' },
        { limit: 1000000, rate: 0.10, label: '₹7,00,001 - ₹10,00,000' },
        { limit: 1200000, rate: 0.15, label: '₹10,00,001 - ₹12,00,000' },
        { limit: 1500000, rate: 0.20, label: '₹12,00,001 - ₹15,00,000' },
        { limit: Infinity, rate: 0.30, label: 'Above ₹15,00,000' },
      ];
      rebateLimit = 700000;
      maxRebate = 25000;
    }
  } else {
    slabRanges = [
      { limit: 250000, rate: 0, label: '₹0 - ₹2,50,000' },
      { limit: 500000, rate: 0.05, label: '₹2,50,001 - ₹5,00,000' },
      { limit: 1000000, rate: 0.20, label: '₹5,00,001 - ₹10,00,000' },
      { limit: Infinity, rate: 0.30, label: 'Above ₹10,00,000' },
    ];
    rebateLimit = 500000;
    maxRebate = 12500;
  }

  let prevLimit = 0;
  let bizBaseTax = 0;
  const tiers: SlabTier[] = [];

  for (const slab of slabRanges) {
    if (safeBiz > prevLimit) {
      const chunk = Math.min(safeBiz, slab.limit) - prevLimit;
      const tax = chunk * slab.rate;
      bizBaseTax += tax;
      tiers.push({ label: slab.label, chunk, ratePct: slab.rate * 100, tax });
    }
    prevLimit = slab.limit;
  }

  // Sec 87A Rebate: evaluated against COMBINED totalTaxableIncome, applies only to normal slab tax (not 111A/112A)
  let rebate87A = 0;
  let marginalRelief = 0;
  let bizTaxAfterRebate = bizBaseTax;

  if (totalTaxableIncome > 0 && totalTaxableIncome <= rebateLimit) {
    rebate87A = Math.min(bizBaseTax, maxRebate);
    bizTaxAfterRebate = Math.max(0, bizBaseTax - rebate87A);
  } else if (regime === 'NEW' && safeBiz > 0 && totalTaxableIncome > rebateLimit) {
    const excessIncome = totalTaxableIncome - rebateLimit;
    const totalTaxBeforeRelief = bizBaseTax + cgBaseTax;
    if (totalTaxBeforeRelief > excessIncome && cgBaseTax <= excessIncome) {
      const targetBizTax = Math.max(0, excessIncome - cgBaseTax);
      if (bizBaseTax > targetBizTax) {
        marginalRelief = bizBaseTax - targetBizTax;
        bizTaxAfterRebate = targetBizTax;
      }
    }
  }

  // Surcharge evaluated on totalTaxableIncome (STCG/LTCG surcharge capped at 15%)
  let bizSurchargeRate = 0;
  if (totalTaxableIncome > 5000000 && totalTaxableIncome <= 10000000) bizSurchargeRate = 0.10;
  else if (totalTaxableIncome > 10000000 && totalTaxableIncome <= 20000000) bizSurchargeRate = 0.15;
  else if (totalTaxableIncome > 20000000) bizSurchargeRate = regime === 'NEW' ? 0.25 : 0.37;

  const cgSurchargeRate = Math.min(bizSurchargeRate, 0.15);

  const bizSurcharge = bizTaxAfterRebate * bizSurchargeRate;
  const bizCess = (bizTaxAfterRebate + bizSurcharge) * 0.04;
  const bizTotalTax = bizTaxAfterRebate + bizSurcharge + bizCess;

  const cgSurcharge = cgBaseTax * cgSurchargeRate;
  const cgCess = (cgBaseTax + cgSurcharge) * 0.04;
  const cgTotalTax = cgBaseTax + cgSurcharge + cgCess;

  return {
    businessCalc: {
      tiers,
      baseTax: bizBaseTax,
      rebate87A,
      marginalRelief,
      surcharge: bizSurcharge,
      cess: bizCess,
      totalTax: bizTotalTax,
      effectiveRate: safeBiz > 0 ? (bizTotalTax / safeBiz) * 100 : 0,
    },
    cgBaseTax,
    cgSurcharge,
    cgCess,
    cgTotalTax,
    combinedTotalTax: bizTotalTax + cgTotalTax,
  };
}

function computeTaxSummary(
  scopedTrades: Trade[],
  selectedFY: string,
  taxRegime: 'NEW' | 'OLD',
  allowableExpenses: number,
  advanceTaxPaid: number,
  tdsCredits: number
): TaxComputation {
  const fyStartYear = parseFyStartYear(selectedFY);
  const isBudget2025Plus = fyStartYear >= 2025;
  const rebateLimit = taxRegime === 'NEW' ? (isBudget2025Plus ? 1200000 : 700000) : 500000;

  // 1. Capital Gains (Sec 70(2) & 70(3) intra-head first, NO ₹1.25L exemption yet!)
  const stcgTrades = scopedTrades.filter((t) => getTradeTaxCategory(t) === 'STCG');
  const ltcgTrades = scopedTrades.filter((t) => getTradeTaxCategory(t) === 'LTCG');

  const stcgNet = stcgTrades.reduce((acc, t) => acc + t.netPnL, 0);
  const ltcgNet = ltcgTrades.reduce((acc, t) => acc + t.netPnL, 0);

  let preExemptionStcg = 0;
  let preExemptionLtcg = 0;
  let unabsorbedStcl = 0;
  let unabsorbedLtcl = 0;

  if (stcgNet >= 0 && ltcgNet >= 0) {
    preExemptionStcg = stcgNet;
    preExemptionLtcg = ltcgNet;
  } else if (stcgNet < 0 && ltcgNet >= 0) {
    const stcl = Math.abs(stcgNet);
    if (ltcgNet >= stcl) {
      preExemptionLtcg = ltcgNet - stcl;
    } else {
      unabsorbedStcl = stcl - ltcgNet;
    }
  } else if (stcgNet >= 0 && ltcgNet < 0) {
    // LTCL can NEVER offset STCG under Sec 70(3)
    preExemptionStcg = stcgNet;
    unabsorbedLtcl = Math.abs(ltcgNet);
  } else {
    unabsorbedStcl = Math.abs(stcgNet);
    unabsorbedLtcl = Math.abs(ltcgNet);
  }

  // 2. Business Income (Speculative vs Non-Speculative)
  const speculativeTrades = scopedTrades.filter((t) => getTradeTaxCategory(t) === 'SPECULATIVE');
  const nonSpeculativeTrades = scopedTrades.filter(
    (t) => getTradeTaxCategory(t) === 'NON_SPECULATIVE'
  );

  const speculativeNet = speculativeTrades.reduce((acc, t) => acc + t.netPnL, 0);
  const nonSpeculativeNet = nonSpeculativeTrades.reduce((acc, t) => acc + t.netPnL, 0);

  let grossTaxableBusiness = 0;
  let unabsorbedSpecLoss = 0;
  let remainingNonSpecLoss = 0;

  if (speculativeNet >= 0 && nonSpeculativeNet >= 0) {
    grossTaxableBusiness = speculativeNet + nonSpeculativeNet;
  } else if (speculativeNet < 0 && nonSpeculativeNet >= 0) {
    // Speculative loss CANNOT offset F&O profit (Sec 73)
    grossTaxableBusiness = nonSpeculativeNet;
    unabsorbedSpecLoss = Math.abs(speculativeNet);
  } else if (speculativeNet >= 0 && nonSpeculativeNet < 0) {
    const fnoLoss = Math.abs(nonSpeculativeNet);
    if (speculativeNet >= fnoLoss) {
      grossTaxableBusiness = speculativeNet - fnoLoss;
    } else {
      remainingNonSpecLoss = fnoLoss - speculativeNet;
    }
  } else {
    unabsorbedSpecLoss = Math.abs(speculativeNet);
    remainingNonSpecLoss = Math.abs(nonSpeculativeNet);
  }

  const netTaxableBusiness = Math.max(0, grossTaxableBusiness - allowableExpenses);

  // 3. Sec 71(2) Inter-head set-off: Non-speculative business loss offsets STCG/LTCG BEFORE ₹1.25L exemption
  let setOffAgainstStcg = 0;
  let setOffAgainstLtcg = 0;
  let unabsorbedNonSpecLoss = remainingNonSpecLoss;

  if (unabsorbedNonSpecLoss > 0 && preExemptionStcg > 0) {
    setOffAgainstStcg = Math.min(unabsorbedNonSpecLoss, preExemptionStcg);
    preExemptionStcg -= setOffAgainstStcg;
    unabsorbedNonSpecLoss -= setOffAgainstStcg;
  }
  if (unabsorbedNonSpecLoss > 0 && preExemptionLtcg > 0) {
    setOffAgainstLtcg = Math.min(unabsorbedNonSpecLoss, preExemptionLtcg);
    preExemptionLtcg -= setOffAgainstLtcg;
    unabsorbedNonSpecLoss -= setOffAgainstLtcg;
  }

  // 4. Sec 112A ₹1,25,000 LTCG Exemption applied AFTER Sec 71(2) set-off
  const effectiveTaxableStcg = preExemptionStcg;
  const ltcgExemptionUsed = Math.min(preExemptionLtcg, 125000);
  const effectiveTaxableLtcg = Math.max(0, preExemptionLtcg - 125000);

  const stcgTax = effectiveTaxableStcg * 0.20;
  const ltcgTax = effectiveTaxableLtcg * 0.125;

  const newRes = calculateSlabTaxForRegime(
    netTaxableBusiness,
    effectiveTaxableStcg,
    effectiveTaxableLtcg,
    'NEW',
    isBudget2025Plus
  );
  const oldRes = calculateSlabTaxForRegime(
    netTaxableBusiness,
    effectiveTaxableStcg,
    effectiveTaxableLtcg,
    'OLD',
    isBudget2025Plus
  );

  const activeRes = taxRegime === 'NEW' ? newRes : oldRes;
  const totalEstimatedTax = activeRes.combinedTotalTax;
  const netTaxPayableOrRefund = totalEstimatedTax - advanceTaxPaid - tdsCredits;

  // 5. Charges & ICAI Sec 44AB Turnover
  const totalBrokerage = scopedTrades.reduce((acc, t) => acc + (t.brokerage || 0), 0);
  const totalGovtTaxes = scopedTrades.reduce((acc, t) => acc + (t.taxes || 0), 0);

  const fnoTrades = scopedTrades.filter((t) => getTradeTaxCategory(t) === 'NON_SPECULATIVE');
  const absolutePnlTurnover = fnoTrades.reduce((acc, t) => acc + Math.abs(t.netPnL), 0);
  const optionSalePremiumTurnover = fnoTrades.reduce((acc, t) => {
    const isOption =
      (t.optionType && t.optionType !== 'None') ||
      /CE|PE|CALL|PUT/i.test(t.symbol);
    if (!isOption) return acc;
    if (t.action === 'SELL') return acc + t.entryPrice * t.qty;
    if (t.action === 'BUY') return acc + t.exitPrice * t.qty;
    return acc;
  }, 0);

  const totalIcaiTurnover = absolutePnlTurnover + optionSalePremiumTurnover;
  const digitalAuditLimit = 100000000; // ₹10 Crore
  const requiresAudit = absolutePnlTurnover > digitalAuditLimit || totalIcaiTurnover > digitalAuditLimit;
  const requiresBooksOfAccounts =
    Math.abs(grossTaxableBusiness) > 250000 || absolutePnlTurnover > 2500000;

  let recommendedItr = 'ITR-1 (Sahaj)';
  if (
    speculativeTrades.length > 0 ||
    nonSpeculativeTrades.length > 0 ||
    grossTaxableBusiness !== 0 ||
    unabsorbedSpecLoss > 0 ||
    unabsorbedNonSpecLoss > 0
  ) {
    recommendedItr = 'ITR-3 (Business + Trading)';
  } else if (stcgTrades.length > 0 || ltcgTrades.length > 0) {
    recommendedItr = 'ITR-2 (Capital Gains)';
  }

  return {
    tradesCount: scopedTrades.length,
    stcgNet,
    ltcgNet,
    effectiveTaxableStcg,
    effectiveTaxableLtcg,
    ltcgExemptionUsed,
    unabsorbedStcl,
    unabsorbedLtcl,
    stcgTax,
    ltcgTax,
    totalCapitalGainsBaseTax: activeRes.cgBaseTax,
    totalCapitalGainsTax: activeRes.cgTotalTax,
    speculativeNet,
    nonSpeculativeNet,
    grossTaxableBusiness,
    netTaxableBusiness,
    unabsorbedSpecLoss,
    unabsorbedNonSpecLoss,
    setOffAgainstStcg,
    setOffAgainstLtcg,
    totalTaxableIncome: netTaxableBusiness + effectiveTaxableStcg + effectiveTaxableLtcg,
    businessTaxCalc: activeRes.businessCalc,
    newRegimeTotalTax: newRes.combinedTotalTax,
    oldRegimeTotalTax: oldRes.combinedTotalTax,
    totalEstimatedTax,
    netTaxPayableOrRefund,
    totalBrokerage,
    totalGovtTaxes,
    absolutePnlTurnover,
    optionSalePremiumTurnover,
    totalIcaiTurnover,
    requiresAudit,
    requiresBooksOfAccounts,
    recommendedItr,
    isBudget2025Plus,
    rebateLimit,
    isAdvanceTaxApplicable: totalEstimatedTax > 10000,
  };
}

export function Taxation({ activeAccountId = 'Combined' }: { activeAccountId?: string }) {
  const { allTrades, selectedFY, brokerAccounts, sessionUser } = useTradeStore(
    useShallow((s) => ({
      allTrades: s.trades,
      selectedFY: s.selectedFY,
      brokerAccounts: s.brokerAccounts,
      sessionUser: s.sessionUser,
    }))
  );

  const fyTrades = useMemo(() => filterTradesByFY(allTrades, selectedFY), [allTrades, selectedFY]);

  const activeAccountTrades = useMemo(() => {
    if (activeAccountId === 'Combined') return fyTrades;
    return fyTrades.filter((t) =>
      isMatchAccountUtil(activeAccountId, brokerAccounts, t.brokerAccountId, t.broker)
    );
  }, [activeAccountId, brokerAccounts, fyTrades]);

  // Map each trade to a Person/PAN name (accountName on brokerAccount, so Sachin's Dhan + Kotak merge, while Rupali's Dhan stays separate!)
  const getTradePerson = useMemo(() => {
    const accMap = new Map(brokerAccounts.map((a) => [a.id, a]));
    const activeByBroker = new Map<string, string[]>();
    brokerAccounts
      .filter((a) => a.active !== false)
      .forEach((a) => {
        const list = activeByBroker.get(a.broker) || [];
        list.push(a.accountName?.trim() || a.broker);
        activeByBroker.set(a.broker, list);
      });

    return (t: Trade): string => {
      if (t.brokerAccountId) {
        const acc = accMap.get(t.brokerAccountId);
        if (acc?.accountName?.trim()) return acc.accountName.trim();
        if (acc?.broker) return acc.broker;
      }
      const candidates = t.broker ? activeByBroker.get(t.broker) : undefined;
      if (candidates && candidates.length === 1) return candidates[0];
      return t.broker || 'Primary';
    };
  }, [brokerAccounts]);

  // Distinct Person/PAN names present in active accounts or trades
  const taxpayerPersons = useMemo(() => {
    const set = new Set<string>();
    brokerAccounts
      .filter((a) => a.active !== false)
      .forEach((a) => {
        if (a.accountName?.trim()) set.add(a.accountName.trim());
      });
    activeAccountTrades.forEach((t) => set.add(getTradePerson(t)));
    return Array.from(set);
  }, [brokerAccounts, activeAccountTrades, getTradePerson]);

  const [selectedTaxpayer, setSelectedTaxpayer] = useState<string>('ALL');
  const [subTab, setSubTab] = useState<'overview' | 'slabs' | 'accounts'>('overview');

  // If selectedTaxpayer disappears (e.g. account switched), reset to ALL
  useEffect(() => {
    if (selectedTaxpayer !== 'ALL' && !taxpayerPersons.includes(selectedTaxpayer)) {
      setSelectedTaxpayer('ALL');
    }
  }, [taxpayerPersons, selectedTaxpayer]);

  const effectiveScopeKey =
    activeAccountId !== 'Combined'
      ? `acc_${activeAccountId}`
      : selectedTaxpayer !== 'ALL'
      ? `person_${selectedTaxpayer}`
      : 'ALL';

  const taxScopeKey = `${sessionUser?.id || 'guest'}_${selectedFY}_${effectiveScopeKey}`;

  const [taxRegime, setTaxRegime] = useState<'NEW' | 'OLD'>(() => {
    const saved = localStorage.getItem(`traders_diary_tax_regime_${taxScopeKey}`);
    return saved === 'OLD' ? 'OLD' : 'NEW';
  });
  const [allowableExpenses, setAllowableExpenses] = useState<number>(() => {
    const saved = localStorage.getItem(`traders_diary_tax_expenses_${taxScopeKey}`);
    return saved ? parseFloat(saved) || 0 : 0;
  });
  const [advanceTaxPaid, setAdvanceTaxPaid] = useState<number>(() => {
    const saved = localStorage.getItem(`traders_diary_advance_tax_${taxScopeKey}`);
    return saved ? parseFloat(saved) || 0 : 0;
  });
  const [tdsCredits, setTdsCredits] = useState<number>(() => {
    const saved = localStorage.getItem(`traders_diary_tds_credits_${taxScopeKey}`);
    return saved ? parseFloat(saved) || 0 : 0;
  });

  useEffect(() => {
    const savedRegime = localStorage.getItem(`traders_diary_tax_regime_${taxScopeKey}`);
    setTaxRegime(savedRegime === 'OLD' ? 'OLD' : 'NEW');
    const savedExp = localStorage.getItem(`traders_diary_tax_expenses_${taxScopeKey}`);
    setAllowableExpenses(savedExp ? parseFloat(savedExp) || 0 : 0);
    const savedAdv = localStorage.getItem(`traders_diary_advance_tax_${taxScopeKey}`);
    setAdvanceTaxPaid(savedAdv ? parseFloat(savedAdv) || 0 : 0);
    const savedTds = localStorage.getItem(`traders_diary_tds_credits_${taxScopeKey}`);
    setTdsCredits(savedTds ? parseFloat(savedTds) || 0 : 0);
  }, [taxScopeKey]);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showTaxPaidModal, setShowTaxPaidModal] = useState(false);

  const [tempExpenseInput, setTempExpenseInput] = useState(allowableExpenses.toString());
  const [tempAdvanceInput, setTempAdvanceInput] = useState(advanceTaxPaid.toString());
  const [tempTdsInput, setTempTdsInput] = useState(tdsCredits.toString());

  useEffect(() => {
    localStorage.setItem(`traders_diary_tax_regime_${taxScopeKey}`, taxRegime);
  }, [taxRegime, taxScopeKey]);

  useEffect(() => {
    localStorage.setItem(`traders_diary_tax_expenses_${taxScopeKey}`, allowableExpenses.toString());
    setTempExpenseInput(allowableExpenses.toString());
  }, [allowableExpenses, taxScopeKey]);

  useEffect(() => {
    localStorage.setItem(`traders_diary_advance_tax_${taxScopeKey}`, advanceTaxPaid.toString());
    setTempAdvanceInput(advanceTaxPaid.toString());
  }, [advanceTaxPaid, taxScopeKey]);

  useEffect(() => {
    localStorage.setItem(`traders_diary_tds_credits_${taxScopeKey}`, tdsCredits.toString());
    setTempTdsInput(tdsCredits.toString());
  }, [tdsCredits, taxScopeKey]);

  // Trades matching active person filter
  const scopedTrades = useMemo(() => {
    if (activeAccountId !== 'Combined' || selectedTaxpayer === 'ALL') {
      return activeAccountTrades;
    }
    return activeAccountTrades.filter((t) => getTradePerson(t) === selectedTaxpayer);
  }, [activeAccountId, activeAccountTrades, selectedTaxpayer, getTradePerson]);

  // Current view tax computation
  const calc = useMemo(
    () =>
      computeTaxSummary(
        scopedTrades,
        selectedFY,
        taxRegime,
        allowableExpenses,
        advanceTaxPaid,
        tdsCredits
      ),
    [scopedTrades, selectedFY, taxRegime, allowableExpenses, advanceTaxPaid, tdsCredits]
  );

  // Person / PAN-wise independent tax calculations (crucial when >1 person shares a broker!)
  const personSummaries = useMemo(() => {
    const grouped = new Map<string, Trade[]>();
    activeAccountTrades.forEach((t) => {
      const person = getTradePerson(t);
      const list = grouped.get(person) || [];
      list.push(t);
      grouped.set(person, list);
    });

    return Array.from(grouped.entries()).map(([person, personTrades]) => {
      const personKey = `${sessionUser?.id || 'guest'}_${selectedFY}_person_${person}`;
      const pRegime = localStorage.getItem(`traders_diary_tax_regime_${personKey}`) === 'OLD' ? 'OLD' : 'NEW';
      const pExp = parseFloat(localStorage.getItem(`traders_diary_tax_expenses_${personKey}`) || '0') || 0;
      const pAdv = parseFloat(localStorage.getItem(`traders_diary_advance_tax_${personKey}`) || '0') || 0;
      const pTds = parseFloat(localStorage.getItem(`traders_diary_tds_credits_${personKey}`) || '0') || 0;

      const summary = computeTaxSummary(personTrades, selectedFY, pRegime, pExp, pAdv, pTds);
      const brokers = Array.from(new Set(personTrades.map((t) => t.broker || 'Other')));
      const netPnL = personTrades.reduce((s, t) => s + t.netPnL, 0);

      return {
        person,
        brokers,
        netPnL,
        regime: pRegime,
        summary,
      };
    });
  }, [activeAccountTrades, getTradePerson, sessionUser?.id, selectedFY, taxRegime, allowableExpenses, advanceTaxPaid, tdsCredits]);

  // If viewing ALL taxpayers and there are multiple distinct persons, sum each person's PAN tax!
  const isMultiPersonCombined =
    activeAccountId === 'Combined' && selectedTaxpayer === 'ALL' && personSummaries.length > 1;

  const displayTotalTax = isMultiPersonCombined
    ? personSummaries.reduce((s, p) => s + p.summary.totalEstimatedTax, 0)
    : calc.totalEstimatedTax;

  const displayNetTaxDue = isMultiPersonCombined
    ? personSummaries.reduce((s, p) => s + p.summary.netTaxPayableOrRefund, 0)
    : calc.netTaxPayableOrRefund;

  // Account-wise Breakdown (Broker + Person separated, NEVER merging Sachin & Rupali on Dhan!)
  const accountSummaryList = useMemo(() => {
    const accMap = new Map(brokerAccounts.map((a) => [a.id, a]));
    const rows: Record<
      string,
      {
        label: string;
        person: string;
        broker: string;
        tradesCount: number;
        netPnL: number;
        brokerage: number;
        taxes: number;
      }
    > = {};

    scopedTrades.forEach((t) => {
      const person = getTradePerson(t);
      const acc = t.brokerAccountId ? accMap.get(t.brokerAccountId) : undefined;
      const broker = acc?.broker || t.broker || 'Other';
      const key = t.brokerAccountId || `${broker}::${person}`;

      if (!rows[key]) {
        rows[key] = {
          label: `${broker} (${person})`,
          person,
          broker,
          tradesCount: 0,
          netPnL: 0,
          brokerage: 0,
          taxes: 0,
        };
      }
      rows[key].tradesCount += 1;
      rows[key].netPnL += t.netPnL;
      rows[key].brokerage += t.brokerage || 0;
      rows[key].taxes += t.taxes || 0;
    });

    return Object.values(rows).sort((a, b) => b.netPnL - a.netPnL);
  }, [scopedTrades, brokerAccounts, getTradePerson]);

  const itrDueDates = useMemo(() => {
    const startYear = parseFyStartYear(selectedFY);
    const ayStart = startYear + 1;
    const ayShort = (ayStart + 1).toString().slice(-2);
    const assessmentYear = `AY ${ayStart}-${ayShort}`;

    return {
      assessmentYear,
      nonAuditDate: `31 July ${ayStart}`,
      auditReportDate: `30 September ${ayStart}`,
      auditReturnDate: `31 October ${ayStart}`,
      belatedDate: `31 December ${ayStart}`,
      advQ1: `15 June ${startYear}`,
      advQ2: `15 Sept ${startYear}`,
      advQ3: `15 Dec ${startYear}`,
      advQ4: `15 March ${startYear + 1}`,
    };
  }, [selectedFY]);

  const advanceTaxSchedule = [
    { dueDate: itrDueDates.advQ1, pct: 15, label: '1st Installment (15%)' },
    { dueDate: itrDueDates.advQ2, pct: 45, label: '2nd Installment (45% Cumulative)' },
    { dueDate: itrDueDates.advQ3, pct: 75, label: '3rd Installment (75% Cumulative)' },
    { dueDate: itrDueDates.advQ4, pct: 100, label: '4th Installment (100% Cumulative)' },
  ];

  const handleSaveExpenses = () => {
    const val = parseFloat(tempExpenseInput);
    setAllowableExpenses(isNaN(val) || val < 0 ? 0 : val);
    setShowExpenseModal(false);
  };

  const handleSaveTaxPaid = () => {
    const adv = parseFloat(tempAdvanceInput);
    const tds = parseFloat(tempTdsInput);
    setAdvanceTaxPaid(isNaN(adv) || adv < 0 ? 0 : adv);
    setTdsCredits(isNaN(tds) || tds < 0 ? 0 : tds);
    setShowTaxPaidModal(false);
  };

  const savingsDiff = calc.oldRegimeTotalTax - calc.newRegimeTotalTax;

  return (
    <div id="taxation-printable-area" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #taxation-printable-area, #taxation-printable-area * { visibility: visible; }
          #taxation-printable-area {
            position: absolute; left: 0; top: 0; width: 100%;
            background: #ffffff !important; color: #000000 !important; padding: 20px;
          }
          .no-print { display: none !important; }
          .glass-card {
            background: #f9fafb !important; border: 1px solid #d1d5db !important;
            box-shadow: none !important; color: #111827 !important; break-inside: avoid;
          }
        }
      `}</style>

      {/* HEADER BAR */}
      <div
        className="glass-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'rgba(139, 92, 246, 0.14)', padding: '10px', borderRadius: '10px' }}>
            <Scale size={20} color="#a78bfa" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.12rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                Tax &amp; ITR Compliance
              </h2>
              <span
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: 'rgba(16, 185, 129, 0.14)',
                  color: '#10b981',
                }}
              >
                {selectedFY} ({calc.isBudget2025Plus ? 'Budget 2025 Slabs' : 'Budget 2024 Slabs'})
              </span>
            </div>
            <p style={{ fontSize: '0.73rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
              PAN-wise Indian Income Tax (Sec 111A, 112A, 70/71/73, 115BAC &amp; 44AB)
            </p>
          </div>
        </div>

        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Regime Switcher */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(0,0,0,0.35)',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            {(['NEW', 'OLD'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTaxRegime(r)}
                style={{
                  padding: '5px 10px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  background: taxRegime === r ? 'var(--primary)' : 'transparent',
                  color: taxRegime === r ? '#fff' : 'var(--text-muted)',
                }}
              >
                {r === 'NEW' ? 'New Regime' : 'Old Regime'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowExpenseModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '7px 11px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <SlidersHorizontal size={13} />
            <span>Sec 37</span>
          </button>

          <button
            onClick={() => setShowTaxPaidModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '7px 11px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#10b981',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Wallet size={13} />
            <span>Taxes Paid</span>
          </button>

          <button
            onClick={() => window.print()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '7px 11px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Printer size={13} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* TAXPAYER (PAN) SELECTOR BAR - Separates different people on the same broker */}
      {activeAccountId === 'Combined' && taxpayerPersons.length > 0 && (
        <div
          className="no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              <Users size={14} color="var(--primary)" />
              Taxpayer (PAN):
            </span>

            <button
              onClick={() => setSelectedTaxpayer('ALL')}
              style={{
                padding: '5px 11px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 700,
                border: selectedTaxpayer === 'ALL' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                background: selectedTaxpayer === 'ALL' ? 'rgba(99, 102, 241, 0.16)' : 'transparent',
                color: selectedTaxpayer === 'ALL' ? 'var(--primary)' : 'var(--text-dim)',
                cursor: 'pointer',
              }}
            >
              All Taxpayers ({personSummaries.length})
            </button>

            {taxpayerPersons.map((person) => (
              <button
                key={person}
                onClick={() => setSelectedTaxpayer(person)}
                style={{
                  padding: '5px 11px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  border: selectedTaxpayer === person ? '1px solid #10b981' : '1px solid var(--border-color)',
                  background: selectedTaxpayer === person ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: selectedTaxpayer === person ? '#10b981' : 'var(--text-dim)',
                  cursor: 'pointer',
                }}
              >
                {person}
              </button>
            ))}
          </div>

          {isMultiPersonCombined && (
            <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 600 }}>
              Each person&apos;s PAN slab &amp; ₹1.25L LTCG exemption is computed separately and summed
            </span>
          )}
        </div>
      )}

      {/* 4 CRISP KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: '14px' }}>
        <div
          className="glass-card"
          style={{
            padding: '18px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {isMultiPersonCombined ? 'Combined Family Tax' : 'Est. Total Tax'}
            </span>
            <Percent size={15} color="var(--color-loss)" />
          </div>
          <div
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: displayTotalTax > 0 ? 'var(--color-loss)' : 'var(--color-win)',
              margin: '6px 0 4px 0',
            }}
          >
            {formatCurrency(displayTotalTax)}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
            {isMultiPersonCombined
              ? `Sum of ${personSummaries.length} separate PAN returns`
              : `Slab: ${formatCurrency(calc.businessTaxCalc.totalTax)} + CG: ${formatCurrency(calc.totalCapitalGainsTax)}`}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Net Taxable Income
            </span>
            <Briefcase size={15} color="var(--primary)" />
          </div>
          <div
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-main)',
              margin: '6px 0 4px 0',
            }}
          >
            {formatCurrency(calc.totalTaxableIncome)}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
            Biz: {formatCurrency(calc.netTaxableBusiness)} | CG: {formatCurrency(calc.effectiveTaxableStcg + calc.effectiveTaxableLtcg)}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {displayNetTaxDue > 0 ? 'Balance Tax Due' : displayNetTaxDue < 0 ? 'Refund Due' : 'Tax Status'}
            </span>
            <Wallet size={15} color={displayNetTaxDue <= 0 ? 'var(--color-win)' : 'var(--color-loss)'} />
          </div>
          <div
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: displayNetTaxDue > 0 ? 'var(--color-loss)' : 'var(--color-win)',
              margin: '6px 0 4px 0',
            }}
          >
            {formatCurrency(Math.abs(displayNetTaxDue))}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
            Adv Tax: {formatCurrency(advanceTaxPaid)} | TDS: {formatCurrency(tdsCredits)}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              ITR &amp; Sec 44AB Audit
            </span>
            <FileText size={15} color={calc.requiresAudit ? 'var(--color-loss)' : '#10b981'} />
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', margin: '8px 0 4px 0' }}>
            {calc.recommendedItr}
          </div>
          <div style={{ fontSize: '0.68rem', color: calc.requiresAudit ? 'var(--color-loss)' : '#10b981', fontWeight: 600 }}>
            {calc.requiresAudit
              ? 'Audit Mandatory (> ₹10 Cr)'
              : `No Audit (Turnover: ${formatCurrency(calc.absolutePnlTurnover)})`}
          </div>
        </div>
      </div>

      {/* SIMPLIFIED 3-TAB NAVIGATION */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '10px',
          flexWrap: 'wrap',
        }}
      >
        {[
          { id: 'overview', label: '1. Overview & ITR', icon: Sparkles },
          { id: 'slabs', label: '2. Slab & Turnover Audit', icon: Layers },
          { id: 'accounts', label: `3. Person & Account Audit (${personSummaries.length})`, icon: Building2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as typeof subTab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: active ? '1px solid var(--primary)' : '1px solid transparent',
                background: active ? 'rgba(99, 102, 241, 0.14)' : 'rgba(255,255,255,0.03)',
                color: active ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '0.76rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & ITR */}
      {/* ========================================================================= */}
      {subTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Smart Regime Comparison Banner */}
          {!isMultiPersonCombined && calc.totalTaxableIncome > 0 && (
            <div
              className="glass-card"
              style={{
                padding: '12px 16px',
                background:
                  savingsDiff > 0
                    ? 'rgba(16, 185, 129, 0.08)'
                    : savingsDiff < 0
                    ? 'rgba(56, 189, 248, 0.08)'
                    : 'rgba(255,255,255,0.03)',
                border: `1px solid ${savingsDiff > 0 ? 'rgba(16,185,129,0.28)' : 'rgba(56,189,248,0.28)'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', fontWeight: 700 }}>
                <Sparkles size={16} color={savingsDiff >= 0 ? '#10b981' : '#38bdf8'} />
                <span>
                  {savingsDiff > 0
                    ? `New Regime saves ${formatCurrency(savingsDiff)} vs Old Regime (Sec 87A limit: ${formatCurrency(calc.isBudget2025Plus ? 1200000 : 700000)})`
                    : savingsDiff < 0
                    ? `Old Regime saves ${formatCurrency(Math.abs(savingsDiff))} vs New Regime`
                    : 'Both regimes give identical tax for this income'}
                </span>
              </div>
              <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                New: {formatCurrency(calc.newRegimeTotalTax)} | Old: {formatCurrency(calc.oldRegimeTotalTax)}
              </span>
            </div>
          )}

          {/* Side-by-side Capital Gains & Business Income Set-off */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '16px' }}>
            {/* Capital Gains Card */}
            <div className="glass-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Coins size={16} color="var(--primary)" />
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0 }}>Capital Gains (Sec 111A / 112A)</h3>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Tax: {formatCurrency(calc.totalCapitalGainsTax)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.76rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>STCG Net P&amp;L (20% u/s 111A):</span>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: calc.stcgNet >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {formatCurrency(calc.stcgNet)}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>LTCG Net P&amp;L (12.5% u/s 112A):</span>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: calc.ltcgNet >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {formatCurrency(calc.ltcgNet)}
                  </strong>
                </div>
                {(calc.setOffAgainstStcg > 0 || calc.setOffAgainstLtcg > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#38bdf8' }}>
                    <span>Less: Sec 71(2) F&amp;O Loss Set-off:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>
                      -{formatCurrency(calc.setOffAgainstStcg + calc.setOffAgainstLtcg)}
                    </strong>
                  </div>
                )}
                {calc.ltcgExemptionUsed > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                    <span>Less: Sec 112A LTCG Exemption (₹1.25L):</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>-{formatCurrency(calc.ltcgExemptionUsed)}</strong>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Taxable STCG + LTCG:</span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {formatCurrency(calc.effectiveTaxableStcg)} + {formatCurrency(calc.effectiveTaxableLtcg)}
                  </span>
                </div>
                {(calc.unabsorbedStcl > 0 || calc.unabsorbedLtcl > 0) && (
                  <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '4px' }}>
                    Carry Forward (8 Yrs): STCL {formatCurrency(calc.unabsorbedStcl)} | LTCL {formatCurrency(calc.unabsorbedLtcl)}
                  </div>
                )}
              </div>
            </div>

            {/* Business Income Card */}
            <div className="glass-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Briefcase size={16} color="#f59e0b" />
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0 }}>Business Income (Intraday &amp; F&amp;O)</h3>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Tax: {formatCurrency(calc.businessTaxCalc.totalTax)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.76rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Speculative (Intraday Equity):</span>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: calc.speculativeNet >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {formatCurrency(calc.speculativeNet)}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Non-Speculative (F&amp;O / Commodity):</span>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: calc.nonSpeculativeNet >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {formatCurrency(calc.nonSpeculativeNet)}
                  </strong>
                </div>
                {allowableExpenses > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981' }}>
                    <span>Less: Sec 37 Trading Expenses:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>-{formatCurrency(allowableExpenses)}</strong>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>Net Taxable Business Income:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                    {formatCurrency(calc.netTaxableBusiness)}
                  </span>
                </div>
                {(calc.unabsorbedSpecLoss > 0 || calc.unabsorbedNonSpecLoss > 0) && (
                  <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '4px' }}>
                    Carry Forward: Speculative {formatCurrency(calc.unabsorbedSpecLoss)} (4 Yrs) | F&amp;O {formatCurrency(calc.unabsorbedNonSpecLoss)} (8 Yrs)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Advance Tax Calendar (if applicable) */}
          {calc.isAdvanceTaxApplicable && !isMultiPersonCombined && (
            <div className="glass-card" style={{ padding: '18px', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Calendar size={16} color="#f59e0b" />
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>
                  Sec 208 Advance Tax Schedule (Tax &gt; ₹10,000)
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                {advanceTaxSchedule.map((sc) => (
                  <div key={sc.dueDate} style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>{sc.label}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                      {formatCurrency((calc.totalEstimatedTax * sc.pct) / 100)}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#f59e0b' }}>Due: {sc.dueDate}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ITR Filing Coach */}
          <div className="glass-card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={16} color="var(--primary)" />
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>
                  ITR Filing Coach ({itrDueDates.assessmentYear})
                </h3>
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#10b981' }}>
                Due Date: {calc.requiresAudit ? itrDueDates.auditReturnDate : itrDueDates.nonAuditDate}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.73rem', color: 'var(--text-dim)' }}>
              <span>• Recommended Form: <strong style={{ color: 'var(--text-main)' }}>{calc.recommendedItr}</strong></span>
              <span>• Sec 44AA Books: <strong style={{ color: 'var(--text-main)' }}>{calc.requiresBooksOfAccounts ? 'Required (Profit > ₹2.5L or Turnover > ₹25L)' : 'Not Mandatory'}</strong></span>
              <span>• Belated Return: <strong style={{ color: 'var(--text-main)' }}>{itrDueDates.belatedDate}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SLAB & TURNOVER AUDIT */}
      {/* ========================================================================= */}
      {subTab === 'slabs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Slab-by-Slab Table */}
          <div className="glass-card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color="var(--primary)" />
                <h3 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0 }}>
                  Slab Breakdown ({taxRegime === 'NEW' ? (calc.isBudget2025Plus ? 'Budget 2025 Sec 115BAC' : 'Budget 2024 Sec 115BAC') : 'Old Slab Regime'})
                </h3>
              </div>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                Taxable Business: {formatCurrency(calc.netTaxableBusiness)}
              </span>
            </div>

            {calc.businessTaxCalc.tiers.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)' }}>Slab</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>Taxable Chunk</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>Rate</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc.businessTaxCalc.tiers.map((t, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{t.label}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(t.chunk)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{t.ratePct}%</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{formatCurrency(t.tax)}</td>
                      </tr>
                    ))}
                    {calc.businessTaxCalc.rebate87A > 0 && (
                      <tr style={{ color: '#10b981' }}>
                        <td colSpan={3} style={{ padding: '8px 10px', fontWeight: 600 }}>
                          Less: Sec 87A Rebate (Total Income ≤ {formatCurrency(calc.rebateLimit)})
                        </td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          -{formatCurrency(calc.businessTaxCalc.rebate87A)}
                        </td>
                      </tr>
                    )}
                    {calc.businessTaxCalc.marginalRelief > 0 && (
                      <tr style={{ color: '#38bdf8' }}>
                        <td colSpan={3} style={{ padding: '8px 10px', fontWeight: 600 }}>Less: Sec 87A Marginal Relief</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                          -{formatCurrency(calc.businessTaxCalc.marginalRelief)}
                        </td>
                      </tr>
                    )}
                    {calc.businessTaxCalc.surcharge > 0 && (
                      <tr>
                        <td colSpan={3} style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--color-loss)' }}>Add: Surcharge</td>
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-loss)' }}>
                          +{formatCurrency(calc.businessTaxCalc.surcharge)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td colSpan={3} style={{ padding: '8px 10px', color: 'var(--text-dim)' }}>Add: 4% Health &amp; Education Cess</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>+{formatCurrency(calc.businessTaxCalc.cess)}</td>
                    </tr>
                    <tr style={{ borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
                      <td colSpan={3} style={{ padding: '9px 10px', fontWeight: 800 }}>Net Business Tax Payable</td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                        {formatCurrency(calc.businessTaxCalc.totalTax)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '16px 0', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                No taxable business income in this scope. Business slab tax is ₹0.
              </div>
            )}
          </div>

          {/* Sec 44AB Turnover & Expenses Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '14px' }}>
            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                Broker Turnover (|Profit| + |Loss|)
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', margin: '6px 0' }}>
                {formatCurrency(calc.absolutePnlTurnover)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                Used by Dhan, Zerodha &amp; most discount brokers for F&amp;O Tax P&amp;L.
              </div>
            </div>

            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                ICAI Comprehensive Turnover
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', margin: '6px 0', color: calc.requiresAudit ? 'var(--color-loss)' : 'var(--text-main)' }}>
                {formatCurrency(calc.totalIcaiTurnover)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                Absolute P&amp;L + Option Sale Premium ({formatCurrency(calc.optionSalePremiumTurnover)}). Audit limit: ₹10 Cr.
              </div>
            </div>

            <div className="glass-card" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Brokerage &amp; Statutory Charges
                </span>
                <Receipt size={14} color="var(--primary)" />
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', margin: '6px 0' }}>
                {formatCurrency(calc.totalBrokerage + calc.totalGovtTaxes)}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                Brokerage: {formatCurrency(calc.totalBrokerage)} | STT/GST/Stamp: {formatCurrency(calc.totalGovtTaxes)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PERSON (PAN) & BROKER ACCOUNT AUDIT */}
      {/* ========================================================================= */}
      {subTab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Person / PAN-wise Independent Tax Table */}
          <div className="glass-card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} color="#10b981" />
                <h3 style={{ fontSize: '0.94rem', fontWeight: 800, margin: 0 }}>
                  Person / PAN-Wise Independent Tax Summary
                </h3>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                Same-person brokers merge under 1 PAN; different persons stay isolated
              </span>
            </div>

            {personSummaries.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)' }}>Taxpayer (PAN)</th>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)' }}>Brokers</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>Net P&amp;L</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>Taxable Income</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>Est. Tax</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>ITR / Audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personSummaries.map((p) => (
                      <tr
                        key={p.person}
                        onClick={() => {
                          setSelectedTaxpayer(p.person);
                          setSubTab('overview');
                        }}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }}
                        title={`Click to inspect ${p.person}'s full tax breakdown`}
                      >
                        <td style={{ padding: '9px 10px', fontWeight: 700, color: 'var(--primary)' }}>
                          {p.person} <span style={{ fontSize: '0.64rem', color: 'var(--text-dim)' }}>({p.regime})</span>
                        </td>
                        <td style={{ padding: '9px 10px', color: 'var(--text-dim)' }}>{p.brokers.join(', ')}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: p.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                          {formatCurrency(p.netPnL)}
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency(p.summary.totalTaxableIncome)}
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: p.summary.totalEstimatedTax > 0 ? 'var(--color-loss)' : 'var(--color-win)' }}>
                          {formatCurrency(p.summary.totalEstimatedTax)}
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'center', fontSize: '0.7rem' }}>
                          {p.summary.recommendedItr.split(' ')[0]} • {p.summary.requiresAudit ? 'Audit' : 'No Audit'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '16px 0', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                No trades recorded for {selectedFY}.
              </div>
            )}
          </div>

          {/* Broker + Person Account Breakdown */}
          <div className="glass-card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
              <Building2 size={16} color="var(--primary)" />
              <h3 style={{ fontSize: '0.94rem', fontWeight: 800, margin: 0 }}>
                Broker Account Breakdown (Separated by Person)
              </h3>
            </div>

            {accountSummaryList.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-muted)' }}>Broker Account</th>
                      <th style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>Trades</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>Net P&amp;L</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>Brokerage</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>Govt Taxes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountSummaryList.map((row) => (
                      <tr key={row.label} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '9px 10px', fontWeight: 700 }}>{row.label}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{row.tradesCount}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: row.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                          {formatCurrency(row.netPnL)}
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                          {formatCurrency(row.brokerage)}
                        </td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                          {formatCurrency(row.taxes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '16px 0', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                No broker account trades found for {selectedFY}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div
        style={{
          padding: '12px 14px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.7rem',
          color: 'var(--text-dim)',
        }}
      >
        <Info size={14} color="var(--text-muted)" />
        <span>
          Estimates assume trading is the primary income source under Indian Income Tax Act rules for {selectedFY}. Consult a Chartered Accountant before filing your final ITR.
        </span>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: SECTION 37 TRADING EXPENSES */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title="Sec 37 Business Deductions"
        subtitle={`Scoped to ${selectedTaxpayer === 'ALL' ? 'current view' : selectedTaxpayer} (${selectedFY})`}
        icon={<SlidersHorizontal size={16} color="var(--primary)" />}
        maxWidth="420px"
        footer={
          <>
            <button
              onClick={() => setShowExpenseModal(false)}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveExpenses}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--primary)',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Save Deductions
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.5 }}>
            TradingView subscriptions, internet, advisory fees, or laptop depreciation claimed against F&amp;O / Intraday business profits.
          </p>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Total Allowable Expenses (₹)
            </label>
            <input
              type="number"
              min="0"
              value={tempExpenseInput}
              onChange={(e) => setTempExpenseInput(e.target.value)}
              placeholder="e.g. 25000"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(0,0,0,0.35)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: ADVANCE TAX & TDS CREDITS */}
      {/* ========================================================================= */}
      <Modal
        isOpen={showTaxPaidModal}
        onClose={() => setShowTaxPaidModal(false)}
        title="Advance Tax & TDS Credits"
        subtitle={`Scoped to ${selectedTaxpayer === 'ALL' ? 'current view' : selectedTaxpayer} (${selectedFY})`}
        icon={<Wallet size={16} color="#10b981" />}
        maxWidth="420px"
        footer={
          <>
            <button
              onClick={() => setShowTaxPaidModal(false)}
              style={{
                padding: '7px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTaxPaid}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#10b981',
                color: '#000',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Save Payments
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Advance Tax Paid via Challan 280 (₹)
            </label>
            <input
              type="number"
              min="0"
              value={tempAdvanceInput}
              onChange={(e) => setTempAdvanceInput(e.target.value)}
              placeholder="e.g. 15000"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(0,0,0,0.35)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              TDS / TCS Credits in Form 26AS / AIS (₹)
            </label>
            <input
              type="number"
              min="0"
              value={tempTdsInput}
              onChange={(e) => setTempTdsInput(e.target.value)}
              placeholder="e.g. 5000"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(0,0,0,0.35)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
