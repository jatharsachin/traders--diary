import { useState, useEffect, useMemo } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { filterTradesByFY } from '../utils/fyHelper';
import { isMatchAccount as isMatchAccountUtil } from '../utils/accountScope';
import { 
  Coins, Percent, Briefcase, Scale, 
  HelpCircle, Info, ShieldAlert, Sparkles, Receipt,
  Calendar, Printer, SlidersHorizontal,
  Layers
} from 'lucide-react';

interface SlabTier {
  label: string;
  chunk: number;
  ratePct: number;
  tax: number;
}

interface TaxCalculationResult {
  baseTax: number;
  rebate87A: number;
  marginalRelief: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  effectiveRate: number;
  tiers: SlabTier[];
}

export function Taxation({ activeAccountId = 'Combined' }: { activeAccountId?: string }) {
  const { trades: allTrades, selectedFY, brokerAccounts } = useTradeStore();
  const fyTrades = filterTradesByFY(allTrades, selectedFY);
  const isMatchAccount = (accId?: string, brokerName?: string) => {
    return isMatchAccountUtil(activeAccountId, brokerAccounts, accId, brokerName);
  };
  const trades = activeAccountId === 'Combined'
    ? fyTrades
    : fyTrades.filter(t => isMatchAccount(t.brokerAccountId, t.broker));

  // --- REGIME SELECTION STATE ---
  const [taxRegime, setTaxRegime] = useState<'NEW' | 'OLD'>(() => {
    try {
      const saved = localStorage.getItem('traders_diary_tax_regime');
      return (saved === 'OLD' || saved === 'NEW') ? saved : 'NEW';
    } catch {
      return 'NEW';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('traders_diary_tax_regime', taxRegime);
    } catch {
      // ignore
    }
  }, [taxRegime]);

  // --- SECTION 37 ALLOWABLE BUSINESS EXPENSES ---
  // Subscriptions (TradingView/Tools), Internet, Office/Utilities, Tech Depreciation
  const [allowableExpenses, setAllowableExpenses] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('traders_diary_tax_expenses');
      return saved ? Number(saved) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [showExpenseModal, setShowExpenseModal] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('traders_diary_tax_expenses', allowableExpenses.toString());
    } catch {
      // ignore
    }
  }, [allowableExpenses]);

  // =========================================================================
  // 1. CAPITAL GAINS (EQUITY DELIVERY TRADES)
  // =========================================================================
  const stcgTrades = trades.filter(t => t.segment === 'Equity' && t.product === 'Delivery' && t.holdingType !== 'Long Term');
  const ltcgTrades = trades.filter(t => t.segment === 'Equity' && t.product === 'Delivery' && t.holdingType === 'Long Term');

  const stcgNet = stcgTrades.reduce((acc, t) => acc + t.netPnL, 0);
  const ltcgNet = ltcgTrades.reduce((acc, t) => acc + t.netPnL, 0);

  // Capital Gains loss set-off logic (Sec 70(2) & 70(3))
  // STCL can offset STCG AND LTCG. LTCL can ONLY offset LTCG.
  let taxableStcg = 0;
  let taxableLtcg = 0;
  let unabsorbedStcl = 0;
  let unabsorbedLtcl = 0;

  if (stcgNet >= 0 && ltcgNet >= 0) {
    taxableStcg = stcgNet;
    taxableLtcg = Math.max(0, ltcgNet - 125000);
  } else if (stcgNet < 0 && ltcgNet >= 0) {
    const stcl = Math.abs(stcgNet);
    if (ltcgNet >= stcl) {
      taxableStcg = 0;
      taxableLtcg = Math.max(0, (ltcgNet - stcl) - 125000);
      unabsorbedStcl = 0;
    } else {
      taxableStcg = 0;
      taxableLtcg = 0;
      unabsorbedStcl = stcl - ltcgNet;
    }
  } else if (stcgNet >= 0 && ltcgNet < 0) {
    taxableStcg = stcgNet;
    taxableLtcg = 0;
    unabsorbedLtcl = Math.abs(ltcgNet);
  } else {
    taxableStcg = 0;
    taxableLtcg = 0;
    unabsorbedStcl = Math.abs(stcgNet);
    unabsorbedLtcl = Math.abs(ltcgNet);
  }

  // Budget 2024 revisions (Finance (No. 2) Act, 2024):
  // Section 111A: STCG is 20%
  // Section 112A: LTCG is 12.5% on gains exceeding ₹1.25L exemption
  const ltcgExemptionThreshold = 125000;

  // =========================================================================
  // 2. BUSINESS INCOME & INTRA-HEAD SET-OFF (EQUITY INTRADAY + F&O + COMMODITY)
  // =========================================================================
  const speculativeTrades = trades.filter(t => t.segment === 'Equity' && t.product === 'Intraday');
  const nonSpeculativeTrades = trades.filter(t => t.segment === 'F&O' || t.segment === 'Commodity' || t.segment === 'Currency');

  const speculativeNet = speculativeTrades.reduce((acc, t) => acc + t.netPnL, 0);
  const nonSpeculativeNet = nonSpeculativeTrades.reduce((acc, t) => acc + t.netPnL, 0);

  // Statutory loss set-off under Section 70(1) & Section 73:
  // - Sec 73: Speculative business loss (Equity Intraday) CANNOT offset non-speculative profit.
  // - Sec 70(1): Non-speculative business loss (F&O) CAN offset speculative profit in the same year!
  let taxableSpeculative = 0;
  let taxableNonSpeculative = 0;
  let unabsorbedSpeculativeLoss = 0;
  let unabsorbedNonSpeculativeLoss = 0;

  if (speculativeNet >= 0 && nonSpeculativeNet >= 0) {
    taxableSpeculative = speculativeNet;
    taxableNonSpeculative = nonSpeculativeNet;
  } else if (speculativeNet < 0 && nonSpeculativeNet >= 0) {
    // Speculative loss cannot offset F&O profit
    taxableSpeculative = 0;
    taxableNonSpeculative = nonSpeculativeNet;
    unabsorbedSpeculativeLoss = Math.abs(speculativeNet);
  } else if (speculativeNet >= 0 && nonSpeculativeNet < 0) {
    // Non-speculative F&O loss CAN offset speculative intraday profit
    const nonSpecLoss = Math.abs(nonSpeculativeNet);
    if (speculativeNet >= nonSpecLoss) {
      taxableSpeculative = speculativeNet - nonSpecLoss;
      taxableNonSpeculative = 0;
      unabsorbedNonSpeculativeLoss = 0;
    } else {
      taxableSpeculative = 0;
      taxableNonSpeculative = 0;
      unabsorbedNonSpeculativeLoss = nonSpecLoss - speculativeNet;
    }
  } else {
    // Both are losses
    taxableSpeculative = 0;
    taxableNonSpeculative = 0;
    unabsorbedSpeculativeLoss = Math.abs(speculativeNet);
    unabsorbedNonSpeculativeLoss = Math.abs(nonSpeculativeNet);
  }

  // Inter-head setoff of current year Non-Speculative loss against Capital Gains (Sec 71(2))
  let lossSetoffAgainstCapitalGains = 0;
  let effectiveTaxableStcg = taxableStcg;
  let effectiveTaxableLtcg = taxableLtcg;

  if (unabsorbedNonSpeculativeLoss > 0 && (effectiveTaxableStcg > 0 || effectiveTaxableLtcg > 0)) {
    // Can absorb against STCG first, then LTCG
    let remainingLoss = unabsorbedNonSpeculativeLoss;
    if (effectiveTaxableStcg > 0) {
      const offset = Math.min(remainingLoss, effectiveTaxableStcg);
      effectiveTaxableStcg -= offset;
      remainingLoss -= offset;
      lossSetoffAgainstCapitalGains += offset;
    }
    if (remainingLoss > 0 && effectiveTaxableLtcg > 0) {
      const offset = Math.min(remainingLoss, effectiveTaxableLtcg);
      effectiveTaxableLtcg -= offset;
      remainingLoss -= offset;
      lossSetoffAgainstCapitalGains += offset;
    }
    unabsorbedNonSpeculativeLoss = remainingLoss;
  }

  const adjustedStcgTax = effectiveTaxableStcg > 0 ? effectiveTaxableStcg * 0.20 : 0;
  const adjustedLtcgTax = effectiveTaxableLtcg > 0 ? effectiveTaxableLtcg * 0.125 : 0;

  // Gross Business Profit before Section 37 expense deduction
  const grossTaxableBusiness = taxableSpeculative + taxableNonSpeculative;

  // Net Taxable Business Income after allowable business expenses (Sec 37)
  const netTaxableBusiness = Math.max(0, grossTaxableBusiness - allowableExpenses);

  // =========================================================================
  // 3. PROGRESSIVE SLAB TAX CALCULATION (BUDGET 2024 SECTION 115BAC & OLD)
  // =========================================================================
  const calculateProgressiveSlabTax = (income: number, regime: 'NEW' | 'OLD'): TaxCalculationResult => {
    if (income <= 0) {
      return { baseTax: 0, rebate87A: 0, marginalRelief: 0, surcharge: 0, cess: 0, totalTax: 0, effectiveRate: 0, tiers: [] };
    }

    let rawTax = 0;
    const tiers: SlabTier[] = [];

    if (regime === 'NEW') {
      // Slabs under Finance (No. 2) Act 2024 (Section 115BAC):
      // 0 - 3L: 0%
      // 3L - 7L: 5%
      // 7L - 10L: 10%
      // 10L - 12L: 15%
      // 12L - 15L: 20%
      // > 15L: 30%
      const slabRanges = [
        { limit: 300000, rate: 0, label: '₹0 - ₹3,00,000' },
        { limit: 700000, rate: 0.05, label: '₹3,00,001 - ₹7,00,000' },
        { limit: 1000000, rate: 0.10, label: '₹7,00,001 - ₹10,00,000' },
        { limit: 1200000, rate: 0.15, label: '₹10,00,001 - ₹12,00,000' },
        { limit: 1500000, rate: 0.20, label: '₹12,00,001 - ₹15,00,000' },
        { limit: Infinity, rate: 0.30, label: 'Above ₹15,00,000' }
      ];

      let prevLimit = 0;
      for (const s of slabRanges) {
        if (income > prevLimit) {
          const chunk = Math.min(income, s.limit) - prevLimit;
          const chunkTax = chunk * s.rate;
          rawTax += chunkTax;
          if (chunk > 0) {
            tiers.push({ label: s.label, chunk, ratePct: s.rate * 100, tax: chunkTax });
          }
          prevLimit = s.limit;
        } else {
          break;
        }
      }

      // Section 87A rebate & Marginal Relief
      // If income <= ₹7,00,000: full rebate (tax = 0)
      // If income > ₹7,00,000: marginal relief so that tax payable <= (income - 7,00,000)
      let rebate87A = 0;
      let marginalRelief = 0;
      let taxAfterRebate = rawTax;

      if (income <= 700000) {
        rebate87A = rawTax;
        taxAfterRebate = 0;
      } else {
        const excessIncome = income - 700000;
        if (rawTax > excessIncome) {
          marginalRelief = rawTax - excessIncome;
          taxAfterRebate = excessIncome;
        }
      }

      // Surcharge (if taxable income > ₹50 Lakh)
      let surcharge = 0;
      if (income > 20000000) {
        surcharge = taxAfterRebate * 0.25; // New regime max surcharge capped at 25%
      } else if (income > 10000000) {
        surcharge = taxAfterRebate * 0.15;
      } else if (income > 5000000) {
        surcharge = taxAfterRebate * 0.10;
      }

      const cess = Math.round((taxAfterRebate + surcharge) * 0.04);
      const totalTax = Math.round(taxAfterRebate + surcharge + cess);
      const effectiveRate = income > 0 ? (totalTax / income) * 100 : 0;

      return { baseTax: rawTax, rebate87A, marginalRelief, surcharge, cess, totalTax, effectiveRate, tiers };
    } else {
      // OLD Regime: 0-2.5L @ 0%, 2.5-5L @ 5%, 5-10L @ 20%, >10L @ 30%
      const slabRanges = [
        { limit: 250000, rate: 0, label: '₹0 - ₹2,50,000' },
        { limit: 500000, rate: 0.05, label: '₹2,50,001 - ₹5,00,000' },
        { limit: 1000000, rate: 0.20, label: '₹5,00,001 - ₹10,00,000' },
        { limit: Infinity, rate: 0.30, label: 'Above ₹10,00,000' }
      ];

      let prevLimit = 0;
      for (const s of slabRanges) {
        if (income > prevLimit) {
          const chunk = Math.min(income, s.limit) - prevLimit;
          const chunkTax = chunk * s.rate;
          rawTax += chunkTax;
          if (chunk > 0) {
            tiers.push({ label: s.label, chunk, ratePct: s.rate * 100, tax: chunkTax });
          }
          prevLimit = s.limit;
        } else {
          break;
        }
      }

      // Section 87A rebate for Old Regime: full rebate up to ₹5,00,000
      let rebate87A = 0;
      let marginalRelief = 0;
      let taxAfterRebate = rawTax;

      if (income <= 500000) {
        rebate87A = rawTax;
        taxAfterRebate = 0;
      }

      // Surcharge for Old Regime
      let surcharge = 0;
      if (income > 50000000) {
        surcharge = taxAfterRebate * 0.37;
      } else if (income > 20000000) {
        surcharge = taxAfterRebate * 0.25;
      } else if (income > 10000000) {
        surcharge = taxAfterRebate * 0.15;
      } else if (income > 5000000) {
        surcharge = taxAfterRebate * 0.10;
      }

      const cess = Math.round((taxAfterRebate + surcharge) * 0.04);
      const totalTax = Math.round(taxAfterRebate + surcharge + cess);
      const effectiveRate = income > 0 ? (totalTax / income) * 100 : 0;

      return { baseTax: rawTax, rebate87A, marginalRelief, surcharge, cess, totalTax, effectiveRate, tiers };
    }
  };

  const businessTaxCalc = useMemo(() => {
    return calculateProgressiveSlabTax(netTaxableBusiness, taxRegime);
  }, [netTaxableBusiness, taxRegime]);

  // Comparative optimization: Calculate both New & Old regimes to find tax savings
  const newRegimeCalc = useMemo(() => calculateProgressiveSlabTax(netTaxableBusiness, 'NEW'), [netTaxableBusiness]);
  const oldRegimeCalc = useMemo(() => calculateProgressiveSlabTax(netTaxableBusiness, 'OLD'), [netTaxableBusiness]);
  const regimeDifference = oldRegimeCalc.totalTax - newRegimeCalc.totalTax;

  // Capital gains 4% Health & Education Cess
  const capitalGainsCess = Math.round((adjustedStcgTax + adjustedLtcgTax) * 0.04);
  const totalCapitalGainsTax = Math.round(adjustedStcgTax + adjustedLtcgTax + capitalGainsCess);

  // Grand Total Estimated Tax Liability
  const totalEstimatedTax = Math.round(totalCapitalGainsTax + businessTaxCalc.totalTax);

  // Charges Breakdown
  const totalBrokerage = trades.reduce((acc, t) => acc + t.brokerage, 0);
  const totalGovtTaxes = trades.reduce((acc, t) => acc + t.taxes, 0);
  const totalCharges = totalBrokerage + totalGovtTaxes;

  // Currency Formatter
  const formatCurrency = (val: number) => {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });
    return formatter.format(val);
  };

  // Turnovers & Section 44AB/44AD Audit Computations
  // Under ICAI Guidance Note: F&O Turnover = Absolute Profit + Absolute Loss (+ Option sale premium if counted)
  const auditTurnover = useMemo(() => {
    const businessTrades = [...speculativeTrades, ...nonSpeculativeTrades];
    return businessTrades.reduce((acc, t) => acc + Math.abs(t.grossPnL), 0);
  }, [speculativeTrades, nonSpeculativeTrades]);

  // Digital transaction limit: ₹10 Crore if >= 95% transactions are digital (standard broker transfers)
  const digitalAuditLimit = 100000000; // ₹10 Crore
  const requiresAudit = auditTurnover > digitalAuditLimit;
  const isEligible44AD = auditTurnover > 0 && auditTurnover <= 20000000; // <= ₹2 Crore limit for Presumptive 44AD (6% deemed profit)

  // =========================================================================
  // 4. ADVANCE TAX INSTALLMENT SCHEDULE (SECTION 208)
  // =========================================================================
  // In India, if estimated tax liability exceeds ₹10,000, advance tax must be paid in 4 tranches:
  const isAdvanceTaxApplicable = totalEstimatedTax > 10000;
  const advanceTaxSchedule = useMemo(() => {
    return [
      { tranche: '1st Installment (15%)', dueDate: '15 June', pct: 15, cumulativeAmount: Math.round(totalEstimatedTax * 0.15) },
      { tranche: '2nd Installment (45%)', dueDate: '15 September', pct: 45, cumulativeAmount: Math.round(totalEstimatedTax * 0.45) },
      { tranche: '3rd Installment (75%)', dueDate: '15 December', pct: 75, cumulativeAmount: Math.round(totalEstimatedTax * 0.75) },
      { tranche: '4th Installment (100%)', dueDate: '15 March', pct: 100, cumulativeAmount: totalEstimatedTax },
    ];
  }, [totalEstimatedTax]);

  // Broker Summary
  const brokerSummaryList = useMemo(() => {
    const brokerMap: Record<string, { tradesCount: number; netPnL: number; brokerage: number; taxes: number }> = {};
    trades.forEach((t) => {
      const brokerName = t.broker || 'Other';
      if (!brokerMap[brokerName]) {
        brokerMap[brokerName] = { tradesCount: 0, netPnL: 0, brokerage: 0, taxes: 0 };
      }
      brokerMap[brokerName].tradesCount += 1;
      brokerMap[brokerName].netPnL += t.netPnL;
      brokerMap[brokerName].brokerage += t.brokerage;
      brokerMap[brokerName].taxes += t.taxes;
    });
    return Object.entries(brokerMap).map(([name, data]) => ({
      name,
      ...data,
      totalCharges: data.brokerage + data.taxes
    })).sort((a, b) => b.tradesCount - a.tradesCount);
  }, [trades]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="animate-tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Header & Regime Switcher */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '16px 20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%)',
          border: '1px solid var(--border-color-active)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Coins size={20} color="var(--primary)" />
              Indian Stock Market Taxation & ITR Auditor
            </h2>
            <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: '8px', background: 'rgba(249, 115, 22, 0.12)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.25)' }}>
              Budget 2024 Revised
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            High-precision slab-by-slab tax computation, statutory loss set-offs, Section 37 deductions, and Section 44AB compliance
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Print/Export Button */}
          <button
            onClick={handlePrint}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
            title="Print or export tax audit report"
          >
            <Printer size={13} />
            <span>Print Tax Statement</span>
          </button>

          {/* Regime Switcher */}
          <div 
            style={{ 
              display: 'flex', 
              background: 'rgba(0,0,0,0.3)', 
              borderRadius: '8px', 
              padding: '3px', 
              border: '1px solid var(--border-color)' 
            }}
          >
            <button
              onClick={() => setTaxRegime('NEW')}
              style={{
                border: 'none',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: taxRegime === 'NEW' ? 'var(--primary)' : 'transparent',
                color: taxRegime === 'NEW' ? '#fff' : 'var(--text-dim)',
                transition: 'all 0.15s ease'
              }}
              title="Default regime under Section 115BAC (Budget 2024 slabs, Nil tax up to ₹7 Lakh with Sec 87A rebate & marginal relief)"
            >
              New Regime (Sec 115BAC)
            </button>
            <button
              onClick={() => setTaxRegime('OLD')}
              style={{
                border: 'none',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: taxRegime === 'OLD' ? 'var(--primary)' : 'transparent',
                color: taxRegime === 'OLD' ? '#fff' : 'var(--text-dim)',
                transition: 'all 0.15s ease'
              }}
              title="Traditional slab regime (0% up to ₹2.5L, full 87A rebate up to ₹5L)"
            >
              Old Regime
            </button>
          </div>

          {/* Active FY Badge */}
          <div 
            style={{ 
              padding: '6px 12px', 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--primary)',
              fontFamily: 'var(--font-mono)'
            }}
          >
            FY {selectedFY}
          </div>
        </div>
      </div>

      {/* Regime Comparison Callout Banner */}
      {netTaxableBusiness > 0 && (
        <div 
          className="glass-card" 
          style={{ 
            padding: '12px 16px', 
            background: regimeDifference > 0 ? 'rgba(52, 211, 153, 0.05)' : 'rgba(59, 130, 246, 0.05)', 
            border: `1px solid ${regimeDifference > 0 ? 'rgba(52, 211, 153, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`,
            borderRadius: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={18} color={regimeDifference > 0 ? 'var(--color-win)' : 'var(--primary)'} />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
              <strong>Tax Optimizer Comparison:</strong>{' '}
              {regimeDifference > 0 ? (
                <span>
                  The <strong>New Regime (115BAC)</strong> saves you <strong>{formatCurrency(regimeDifference)}</strong> compared to the Old Regime on current business income!
                </span>
              ) : regimeDifference < 0 ? (
                <span>
                  The <strong>Old Regime</strong> saves you <strong>{formatCurrency(Math.abs(regimeDifference))}</strong> compared to the New Regime!
                </span>
              ) : (
                <span>Both tax regimes result in identical tax liability for this income bracket.</span>
              )}
            </div>
          </div>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', background: 'rgba(0,0,0,0.2)', padding: '3px 8px', borderRadius: '4px' }}>
            New: {formatCurrency(newRegimeCalc.totalTax)} vs Old: {formatCurrency(oldRegimeCalc.totalTax)}
          </span>
        </div>
      )}

      {/* Primary KPI Grid: Tax Estimates */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        
        {/* Total Estimated Tax Card */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '22px', 
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            boxShadow: 'var(--shadow-card)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.03 }}>
            <Percent size={130} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Est. Tax Liability
              </span>
              <h3 
                style={{ 
                  fontSize: '1.9rem', 
                  fontWeight: 800, 
                  fontFamily: 'var(--font-mono)', 
                  color: totalEstimatedTax > 0 ? 'var(--color-loss)' : 'var(--color-win)',
                  margin: '8px 0 4px 0',
                  lineHeight: 1
                }}
              >
                {formatCurrency(totalEstimatedTax)}
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0 }}>
                Includes Capital Gains + F&O/Intraday + 4% Cess ({taxRegime === 'NEW' ? 'New Slabs' : 'Old Slabs'})
              </p>
            </div>
            <div style={{ background: 'var(--color-loss-bg)', padding: '8px', borderRadius: '8px' }}>
              <Scale size={20} color="var(--color-loss)" />
            </div>
          </div>

          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Business Slab Tax:</span>
            <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>{formatCurrency(businessTaxCalc.totalTax)}</strong>
          </div>
          <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Capital Gains Tax (STCG/LTCG):</span>
            <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>{formatCurrency(totalCapitalGainsTax)}</strong>
          </div>
        </div>

        {/* Business/Slab Progressive Card */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Business Tax ({taxRegime === 'NEW' ? 'New Regime 115BAC' : 'Old Regime'})
              </span>
              <button
                onClick={() => setShowExpenseModal(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '0.65rem',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
                title="Add Section 37 trading deductions (software, internet, equipment)"
              >
                <SlidersHorizontal size={11} />
                <span>Sec 37 Deductions</span>
              </button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '12px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>Gross Business P&L:</span>
              <strong style={{ fontSize: '0.92rem', fontFamily: 'var(--font-mono)', color: grossTaxableBusiness > 0 ? 'var(--color-win)' : 'var(--text-dim)' }}>
                {formatCurrency(grossTaxableBusiness)}
              </strong>
            </div>

            {allowableExpenses > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
                <span style={{ fontSize: '0.72rem', color: '#10b981' }}>Less: Sec 37 Expenses:</span>
                <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: '#10b981', fontWeight: 600 }}>
                  -{formatCurrency(allowableExpenses)}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-main)', fontWeight: 600 }}>Net Taxable Business:</span>
              <strong style={{ fontSize: '1rem', fontFamily: 'var(--font-mono)', color: netTaxableBusiness > 0 ? 'var(--primary)' : 'var(--text-dim)' }}>
                {formatCurrency(netTaxableBusiness)}
              </strong>
            </div>

            {businessTaxCalc.rebate87A > 0 && (
              <p style={{ fontSize: '0.68rem', color: 'var(--color-win)', marginTop: '8px', fontWeight: 600 }}>
                ✓ Sec 87A Full Rebate: -{formatCurrency(businessTaxCalc.rebate87A)} (Taxable income under {taxRegime === 'NEW' ? '₹7 Lakh' : '₹5 Lakh'})
              </p>
            )}

            {businessTaxCalc.marginalRelief > 0 && (
              <p style={{ fontSize: '0.68rem', color: '#38bdf8', marginTop: '4px', fontWeight: 600 }}>
                ✓ Sec 87A Marginal Relief: -{formatCurrency(businessTaxCalc.marginalRelief)} (Tax capped to excess over ₹7L)
              </p>
            )}
          </div>

          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Effective Business Tax Rate:</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
              {businessTaxCalc.effectiveRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Section 44AB / 44AD Audit Advisory Card */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sec 44AB / 44AD Audit Threshold
              </span>
              <div style={{ background: requiresAudit ? 'var(--color-loss-bg)' : 'var(--color-win-bg)', padding: '6px', borderRadius: '6px' }}>
                <ShieldAlert size={16} color={requiresAudit ? 'var(--color-loss)' : 'var(--color-win)'} />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>F&O Absolute Turnover:</span>
              <strong style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                {formatCurrency(auditTurnover)}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Digital Audit Limit (≥95% Digital):</span>
              <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>₹10.00 Crore</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Turnover Utilized:</span>
              <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: requiresAudit ? 'var(--color-loss)' : 'var(--color-win)', fontWeight: 600 }}>
                {((auditTurnover / digitalAuditLimit) * 100).toFixed(2)}% of ₹10 Cr
              </span>
            </div>
          </div>

          <div 
            style={{ 
              marginTop: '12px', 
              fontSize: '0.7rem', 
              padding: '8px 10px', 
              borderRadius: '6px',
              background: requiresAudit ? 'rgba(239, 68, 68, 0.06)' : 'rgba(16, 185, 129, 0.06)',
              border: `1px solid ${requiresAudit ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
              color: requiresAudit ? 'var(--color-loss)' : 'var(--color-win)',
              fontWeight: 600,
              lineHeight: 1.3
            }}
          >
            {requiresAudit 
              ? '⚠️ Turnover > ₹10 Cr. Formal Tax Audit under Section 44AB by a CA is mandatory.'
              : isEligible44AD
                ? '✓ Eligible for Sec 44AD Presumptive Taxation (6% deemed profit on digital turnover).'
                : '✓ Turnover within ₹10 Crore digital threshold. No mandatory tax audit required.'}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 37 EXPENSES MODAL / POPUP */}
      {/* ========================================================================= */}
      {showExpenseModal && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.7)', 
            backdropFilter: 'blur(6px)', 
            zIndex: 9999, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            className="glass-card animate-tab-panel" 
            style={{ 
              maxWidth: '480px', 
              width: '100%', 
              padding: '24px', 
              borderRadius: '14px', 
              border: '1px solid var(--border-color-active)',
              background: 'var(--bg-card)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
                  Section 37 Allowable Trading Expenses
                </h3>
              </div>
              <button 
                onClick={() => setShowExpenseModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Under Indian Income Tax Act Section 37, legitimate expenses incurred wholly and exclusively for trading business are deductible against F&O/intraday profits.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Total Annual Business Deductions (₹):
              </label>
              <input 
                type="number"
                min="0"
                step="1000"
                value={allowableExpenses}
                onChange={(e) => setAllowableExpenses(Math.max(0, Number(e.target.value) || 0))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(0,0,0,0.3)',
                  color: 'var(--text-main)',
                  fontSize: '0.95rem',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  outline: 'none'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Common Presets:</span>
                {[15000, 30000, 60000, 100000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setAllowableExpenses(amt)}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '0.65rem',
                      color: 'var(--primary)',
                      cursor: 'pointer'
                    }}
                  >
                    ₹{(amt / 1000)}k
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: 1.4, marginBottom: '16px' }}>
              <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>Eligible Expense Items:</strong>
              • TradingView / Charting Software subscriptions<br />
              • High-speed fiber broadband & internet bills<br />
              • Depreciation on trading laptop, desktop & multi-monitor setups<br />
              • Advisory, books, research tools, and educational subscriptions
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowExpenseModal(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '6px',
                  background: 'var(--primary)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Apply Deductions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLAB-BY-SLAB DETAILED BREAKDOWN TABLE */}
      {/* ========================================================================= */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Slab-by-Slab Tax Calculation ({taxRegime === 'NEW' ? 'Budget 2024 Section 115BAC' : 'Old Slab Regime'})
            </h3>
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            Net Taxable Business: {formatCurrency(netTaxableBusiness)}
          </span>
        </div>

        {businessTaxCalc.tiers.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>Income Slab Tier</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>Taxable Chunk</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>Tax Rate</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)' }}>Computed Tax</th>
                </tr>
              </thead>
              <tbody>
                {businessTaxCalc.tiers.map((t, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: 'var(--text-main)' }}>{t.label}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(t.chunk)}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: t.ratePct === 0 ? 'var(--color-win)' : 'var(--text-main)' }}>
                      {t.ratePct}%
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: t.tax > 0 ? 'var(--color-loss)' : 'var(--text-dim)' }}>
                      {formatCurrency(t.tax)}
                    </td>
                  </tr>
                ))}
                
                {/* Summary Rows */}
                <tr style={{ borderTop: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.015)' }}>
                  <td colSpan={3} style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                    Base Tax before Rebate:
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {formatCurrency(businessTaxCalc.baseTax)}
                  </td>
                </tr>

                {businessTaxCalc.rebate87A > 0 && (
                  <tr style={{ background: 'rgba(52, 211, 153, 0.04)' }}>
                    <td colSpan={3} style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--color-win)' }}>
                      Less: Section 87A Full Tax Rebate:
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-win)' }}>
                      -{formatCurrency(businessTaxCalc.rebate87A)}
                    </td>
                  </tr>
                )}

                {businessTaxCalc.marginalRelief > 0 && (
                  <tr style={{ background: 'rgba(56, 189, 248, 0.04)' }}>
                    <td colSpan={3} style={{ padding: '8px 12px', fontWeight: 600, color: '#38bdf8' }}>
                      Less: Section 87A Marginal Relief:
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>
                      -{formatCurrency(businessTaxCalc.marginalRelief)}
                    </td>
                  </tr>
                )}

                {businessTaxCalc.surcharge > 0 && (
                  <tr>
                    <td colSpan={3} style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--color-loss)' }}>
                      Add: Surcharge (Income &gt; ₹50L):
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-loss)' }}>
                      +{formatCurrency(businessTaxCalc.surcharge)}
                    </td>
                  </tr>
                )}

                <tr>
                  <td colSpan={3} style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-dim)' }}>
                    Add: 4% Health &amp; Education Cess:
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)' }}>
                    +{formatCurrency(businessTaxCalc.cess)}
                  </td>
                </tr>

                <tr style={{ borderTop: '1.5px solid var(--border-color-active)', background: 'rgba(0,0,0,0.25)' }}>
                  <td colSpan={3} style={{ padding: '10px 12px', fontWeight: 800, color: 'var(--text-main)' }}>
                    Net Business Tax Payable:
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.88rem', color: businessTaxCalc.totalTax > 0 ? 'var(--color-loss)' : 'var(--color-win)' }}>
                    {formatCurrency(businessTaxCalc.totalTax)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
            No taxable business income for the selected timeframe. Net tax liability is ₹0.
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: ADVANCE TAX STATUTORY CALENDAR (SECTION 208) */}
      {/* ========================================================================= */}
      {isAdvanceTaxApplicable && (
        <div className="glass-card" style={{ padding: '20px', border: '1px solid rgba(245, 158, 11, 0.25)', background: 'rgba(245, 158, 11, 0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Calendar size={18} color="#f59e0b" />
            <h3 style={{ fontSize: '0.96rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
              Section 208 Advance Tax Installment Schedule
            </h3>
            <span style={{ fontSize: '0.65rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              Mandatory if Tax &gt; ₹10,000
            </span>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-dim)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
            To avoid penal interest under Sections 234B and 234C (1% per month), pay the cumulative percentage of your estimated total tax by the following statutory dates:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {advanceTaxSchedule.map((sc, idx) => (
              <div 
                key={idx}
                style={{ 
                  background: 'rgba(0,0,0,0.25)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px', 
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>{sc.tranche}</span>
                  <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontWeight: 700 }}>
                    Due: {sc.dueDate}
                  </span>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '4px' }}>
                  {formatCurrency(sc.cumulativeAmount)}
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                  Cumulative {sc.pct}% of total tax
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main breakdown grids: Capital Gains & Broker-wise Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '16px' }}>
        
        {/* Left Column: Capital Gains & Loss Set-offs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card 1: Capital Gains (Equity CNC Delivery) */}
          <div className="glass-card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <Briefcase size={16} color="var(--primary)" />
              1. Capital Gains Tax Summary (Equity Delivery)
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* STCG */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Short-Term Capital Gains (STCG)</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Held &lt; 1 Year (Section 111A @ 20%)</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: stcgNet >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {formatCurrency(stcgNet)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Tax: {formatCurrency(adjustedStcgTax)}
                  </div>
                </div>
              </div>

              {/* LTCG */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Long-Term Capital Gains (LTCG)</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Held &gt; 1 Year (Section 112A @ 12.5% above ₹1.25L)</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: ltcgNet >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {formatCurrency(ltcgNet)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Tax: {formatCurrency(adjustedLtcgTax)}
                  </div>
                </div>
              </div>

              {/* Inter-head Loss Set-off Indicator */}
              {lossSetoffAgainstCapitalGains > 0 && (
                <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.7rem', color: 'var(--color-win)', fontWeight: 600 }}>
                  ✓ Section 71(2) Benefit: {formatCurrency(lossSetoffAgainstCapitalGains)} current-year F&amp;O loss set off against Capital Gains!
                </div>
              )}

              {/* Loss Set-off & Carry Forward Badges */}
              {stcgNet < 0 && ltcgNet > 0 && (
                <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', fontSize: '0.7rem', color: '#38bdf8', fontWeight: 600 }}>
                  ⚡ Auto Set-off: {formatCurrency(Math.min(Math.abs(stcgNet), ltcgNet))} STCL adjusted against LTCG gains!
                </div>
              )}
              {unabsorbedStcl > 0 && (
                <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.7rem', color: 'var(--color-loss)' }}>
                  📌 Unabsorbed STCL: <strong>{formatCurrency(unabsorbedStcl)}</strong> (Eligible to carry forward for 8 years in ITR-2/3)
                </div>
              )}
              {unabsorbedLtcl > 0 && (
                <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.7rem', color: 'var(--color-loss)' }}>
                  📌 Unabsorbed LTCL: <strong>{formatCurrency(unabsorbedLtcl)}</strong> (Can only offset future LTCG, 8 years carry-forward)
                </div>
              )}

              {/* Exemption Notice */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px', background: 'rgba(10, 132, 255, 0.03)', border: '1px solid rgba(10, 132, 255, 0.08)', borderRadius: '8px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <Info size={14} color="#0a84ff" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  LTCG gains under ₹1,25,000 are fully exempt per financial year.
                  {ltcgNet > 0 && ltcgNet <= ltcgExemptionThreshold && (
                    <span style={{ color: 'var(--color-win)', display: 'block', marginTop: '2px', fontWeight: 600 }}>
                      ✓ Your LTCG is ₹{ltcgNet.toLocaleString('en-IN')}, which is under the threshold. Nil Tax applies!
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Business & Speculative Income Breakdown */}
          <div className="glass-card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <Scale size={16} color="var(--primary)" />
              2. Business Income Set-off Summary (Sec 70 &amp; 73)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Speculative */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Speculative Business (Equity Intraday)</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Section 73: Losses can only offset intraday profit</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: speculativeNet >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {formatCurrency(speculativeNet)}
                  </div>
                  {unabsorbedSpeculativeLoss > 0 && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-loss)', marginTop: '2px' }}>
                      4-yr carry-forward
                    </div>
                  )}
                </div>
              </div>

              {/* Non-Speculative */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Non-Speculative (F&amp;O / Commodities)</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Section 43(5): Normal business income (8-yr carry-forward)</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: nonSpeculativeNet >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {formatCurrency(nonSpeculativeNet)}
                  </div>
                  {unabsorbedNonSpeculativeLoss > 0 && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-loss)', marginTop: '2px' }}>
                      8-yr carry-forward
                    </div>
                  )}
                </div>
              </div>

              {/* Intra-head adjustment note if applicable */}
              {speculativeNet >= 0 && nonSpeculativeNet < 0 && (
                <div style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', fontSize: '0.7rem', color: '#38bdf8', fontWeight: 600 }}>
                  ⚡ Section 70(1) Intra-head Set-off: F&amp;O loss absorbed speculative intraday profits!
                </div>
              )}

              {/* Total Business */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255, 255, 255, 0.03)', border: '1.5px solid var(--border-color-active)', borderRadius: '8px' }}>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Total Net Taxable Business:</strong>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: netTaxableBusiness > 0 ? 'var(--color-win)' : 'var(--text-dim)' }}>
                    {formatCurrency(netTaxableBusiness)}
                  </strong>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
                    Est. Slab Tax: {formatCurrency(businessTaxCalc.totalTax)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Expenses, Broker Summary & ITR Filing Coach */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Card 3: Brokerage & Govt Levies Audit */}
          <div className="glass-card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <Receipt size={16} color="var(--primary)" />
              3. Expenses &amp; Government Levies Audit
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Broker Commissions / Brokerage:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(totalBrokerage)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Govt Levies (STT, Stamp Duty, GST, Exchange Tx):</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(totalGovtTaxes)}</span>
              </div>
              {allowableExpenses > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: '#10b981' }}>Section 37 Business Deductions Claimed:</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#10b981' }}>{formatCurrency(allowableExpenses)}</span>
                </div>
              )}
              
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  fontSize: '0.85rem', 
                  fontWeight: 700, 
                  borderTop: '1px solid var(--border-color)', 
                  paddingTop: '10px',
                  marginTop: '4px' 
                }}
              >
                <span>Total Deductible Trading Expenses:</span>
                <span style={{ color: 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(totalCharges + allowableExpenses)}</span>
              </div>

              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                💡 <strong>Tax Tip:</strong> All brokerage and transactional taxes (STT, GST, Exchange charges) on F&amp;O and intraday trades are legitimate deductible business expenses in ITR-3!
              </div>
            </div>
          </div>

          {/* Card: Broker-wise Breakdown */}
          <div className="glass-card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <Coins size={16} color="var(--primary)" />
              Broker-Wise Charges &amp; Performance Summary
            </h3>

            {brokerSummaryList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px' }}>Broker Name</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Trades</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Net P&amp;L</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Brokerage</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Govt Taxes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brokerSummaryList.map((b) => (
                        <tr key={b.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '9px 8px', fontWeight: 600 }}>{b.name}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{b.tradesCount}</td>
                          <td 
                            style={{ 
                              padding: '9px 8px', 
                              textAlign: 'right', 
                              fontWeight: 700, 
                              fontFamily: 'var(--font-mono)',
                              color: b.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)'
                            }}
                          >
                            {formatCurrency(b.netPnL)}
                          </td>
                          <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(b.brokerage)}</td>
                          <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(b.taxes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                No executions recorded for the selected timeframe.
              </div>
            )}
          </div>

          {/* Card 4: ITR Filing Coach */}
          <div className="glass-card" style={{ padding: '18px 20px' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <HelpCircle size={16} color="var(--primary)" />
              ITR Filing Coach &amp; Loss Carry-Forward Rules
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Business Loss Carriage */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ background: 'var(--primary-glow)', width: '4px', borderRadius: '4px', flexShrink: 0 }}></div>
                <div>
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 700, margin: 0 }}>Carry Forward F&amp;O Loss (8 Years)</h4>
                  <p style={{ fontSize: '0.71rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                    Non-speculative F&amp;O losses can be carried forward for up to <strong>8 consecutive assessment years</strong> to offset future business profits, provided you file ITR-3 on or before the due date (usually July 31st).
                  </p>
                </div>
              </div>

              {/* Speculative Loss Carriage */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ background: 'rgba(251, 146, 60, 0.4)', width: '4px', borderRadius: '4px', flexShrink: 0 }}></div>
                <div>
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 700, margin: 0 }}>Carry Forward Speculative Loss (4 Years)</h4>
                  <p style={{ fontSize: '0.71rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                    Equity intraday losses can only be set off against intraday profits. They cannot offset F&amp;O profits, and can only be carried forward for <strong>4 years</strong>.
                  </p>
                </div>
              </div>

              {/* Capital Gains Loss Carriage */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.4)', width: '4px', borderRadius: '4px', flexShrink: 0 }}></div>
                <div>
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 700, margin: 0 }}>Capital Losses Set-off (8 Years)</h4>
                  <p style={{ fontSize: '0.71rem', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                    Short-Term Capital Losses (STCL) can offset both STCG and LTCG. Long-Term Capital Losses (LTCL) can only offset LTCG. Both carry forward for <strong>8 years</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
