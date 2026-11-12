import { useState, useEffect } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { filterTradesByFY } from '../utils/fyHelper';
import { 
  Coins, Percent, Briefcase, Scale, 
  HelpCircle, Info, ShieldAlert, Sparkles, Receipt
} from 'lucide-react';

export function Taxation({ activeAccountId = 'Combined' }: { activeAccountId?: string }) {
  const { trades: allTrades, selectedFY, brokerAccounts } = useTradeStore();
  const fyTrades = filterTradesByFY(allTrades, selectedFY);
  const isMatchAccount = (accId?: string, brokerName?: string) => {
    if (activeAccountId === 'Combined' || !activeAccountId) return true;
    const targetIds = activeAccountId.split(',').filter(Boolean);
    if (accId && targetIds.includes(accId)) return true;
    if (brokerName) {
      const selectedAccs = brokerAccounts.filter(a => targetIds.includes(a.id));
      return selectedAccs.some(a => (a.broker || '').toLowerCase() === (brokerName || '').toLowerCase());
    }
    return false;
  };
  const trades = activeAccountId === 'Combined'
    ? fyTrades
    : fyTrades.filter(t => isMatchAccount(t.brokerAccountId, t.broker));

  // --- INDIAN TAXATION COMPUTATIONS ---
  
  // Regime selection state (safe localStorage)
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

  // 1. Capital Gains (Equity Delivery Trades)
  const stcgTrades = trades.filter(t => t.segment === 'Equity' && t.product === 'Delivery' && t.holdingType !== 'Long Term');
  const ltcgTrades = trades.filter(t => t.segment === 'Equity' && t.product === 'Delivery' && t.holdingType === 'Long Term');

  const stcgNet = stcgTrades.reduce((acc, t) => acc + t.netPnL, 0);
  const ltcgNet = ltcgTrades.reduce((acc, t) => acc + t.netPnL, 0);

  // Capital Gains loss set-off logic
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
    if (ltcgNet > stcl) {
      taxableStcg = 0;
      taxableLtcg = Math.max(0, (ltcgNet - stcl) - 125000);
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

  // STCG Tax is 20% (Budget 2024 revision)
  const stcgTax = taxableStcg > 0 ? taxableStcg * 0.20 : 0;

  // LTCG Tax is 12.5% on gains exceeding ₹1.25L exemption threshold
  const ltcgExemptionThreshold = 125000;
  const ltcgTax = taxableLtcg > 0 ? taxableLtcg * 0.125 : 0;

  // 2. Business Income (Equity Intraday + F&O + Commodity + Currency)
  const speculativeTrades = trades.filter(t => t.segment === 'Equity' && t.product === 'Intraday');
  const nonSpeculativeTrades = trades.filter(t => t.segment === 'F&O' || t.segment === 'Commodity' || t.segment === 'Currency');

  const speculativeNet = speculativeTrades.reduce((acc, t) => acc + t.netPnL, 0);
  const nonSpeculativeNet = nonSpeculativeTrades.reduce((acc, t) => acc + t.netPnL, 0);
  const totalBusinessNet = speculativeNet + nonSpeculativeNet;

  // Speculative loss can only offset speculative profit
  const netSpeculativeProfit = Math.max(0, speculativeNet);
  const unabsorbedSpeculativeLoss = speculativeNet < 0 ? Math.abs(speculativeNet) : 0;

  // Non-speculative business profit
  const netNonSpeculativeProfit = Math.max(0, nonSpeculativeNet);
  const unabsorbedNonSpeculativeLoss = nonSpeculativeNet < 0 ? Math.abs(nonSpeculativeNet) : 0;

  const totalTaxableBusiness = netSpeculativeProfit + netNonSpeculativeProfit;

  // --- PROGRESSIVE SLAB TAX CALCULATION (SLAB-BY-SLAB) ---
  const calculateProgressiveSlabTax = (income: number, regime: 'NEW' | 'OLD') => {
    if (income <= 0) {
      return { baseTax: 0, rebate: 0, cess: 0, totalTax: 0, effectiveRate: 0, tiers: [] };
    }

    let rawTax = 0;
    const tiers: { label: string; chunk: number; ratePct: number; tax: number }[] = [];

    if (regime === 'NEW') {
      // Slabs: 0-3L @ 0%, 3-7L @ 5%, 7-10L @ 10%, 10-12L @ 15%, 12-15L @ 20%, >15L @ 30%
      const slabRanges = [
        { limit: 300000, rate: 0, label: 'Up to ₹3L (0%)' },
        { limit: 700000, rate: 0.05, label: '₹3L - ₹7L (5%)' },
        { limit: 1000000, rate: 0.10, label: '₹7L - ₹10L (10%)' },
        { limit: 1200000, rate: 0.15, label: '₹10L - ₹12L (15%)' },
        { limit: 1500000, rate: 0.20, label: '₹12L - ₹15L (20%)' },
        { limit: Infinity, rate: 0.30, label: 'Above ₹15L (30%)' }
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

      // Sec 87A rebate: full rebate if taxable income <= ₹7,00,000 under New Regime
      let rebate = 0;
      let taxAfterRebate = rawTax;
      if (income <= 700000) {
        rebate = rawTax;
        taxAfterRebate = 0;
      }

      const cess = Math.round(taxAfterRebate * 0.04);
      const totalTax = taxAfterRebate + cess;
      const effectiveRate = income > 0 ? (totalTax / income) * 100 : 0;
      return { baseTax: rawTax, rebate, cess, totalTax, effectiveRate, tiers };
    } else {
      // OLD Regime: 0-2.5L @ 0%, 2.5-5L @ 5%, 5-10L @ 20%, >10L @ 30%
      const slabRanges = [
        { limit: 250000, rate: 0, label: 'Up to ₹2.5L (0%)' },
        { limit: 500000, rate: 0.05, label: '₹2.5L - ₹5L (5%)' },
        { limit: 1000000, rate: 0.20, label: '₹5L - ₹10L (20%)' },
        { limit: Infinity, rate: 0.30, label: 'Above ₹10L (30%)' }
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

      // Sec 87A rebate: full rebate if taxable income <= ₹5,00,000 under Old Regime
      let rebate = 0;
      let taxAfterRebate = rawTax;
      if (income <= 500000) {
        rebate = rawTax;
        taxAfterRebate = 0;
      }

      const cess = Math.round(taxAfterRebate * 0.04);
      const totalTax = taxAfterRebate + cess;
      const effectiveRate = income > 0 ? (totalTax / income) * 100 : 0;
      return { baseTax: rawTax, rebate, cess, totalTax, effectiveRate, tiers };
    }
  };

  const businessTaxCalc = calculateProgressiveSlabTax(totalTaxableBusiness, taxRegime);

  // Capital gains 4% Health & Education Cess
  const capitalGainsCess = Math.round((stcgTax + ltcgTax) * 0.04);
  const totalEstimatedTax = Math.round(stcgTax + ltcgTax + capitalGainsCess + businessTaxCalc.totalTax);

  // 4. Charges Breakdown
  const totalBrokerage = trades.reduce((acc, t) => acc + t.brokerage, 0);
  const totalGovtTaxes = trades.reduce((acc, t) => acc + t.taxes, 0);
  const totalCharges = totalBrokerage + totalGovtTaxes;

  // Formatting currency helper
  const formatCurrency = (val: number) => {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });
    return formatter.format(val);
  };

  // Helper to determine if we have any losses that can be set off or carried forward
  const hasBusinessLoss = totalBusinessNet < 0;
  const hasStcgLoss = stcgNet < 0;
  const hasLtcgLoss = ltcgNet < 0;

  // Group trades by broker
  const getBrokerSummary = () => {
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
  };
  
  const brokerSummaryList = getBrokerSummary();

  // Section 44AB Tax Audit check:
  // F&O turnover is sum of absolute P&Ls (plus premiums in options if strictly calculated, 
  // but standard audit turnover is sum of absolute profits & losses).
  const calculateAuditTurnover = () => {
    const businessTrades = [...speculativeTrades, ...nonSpeculativeTrades];
    return businessTrades.reduce((acc, t) => acc + Math.abs(t.grossPnL), 0);
  };
  const auditTurnover = calculateAuditTurnover();
  const requiresAudit = auditTurnover > 100000000; // > 10 Crore limit for digital transactions (standard discount broker)
  const isEligible44AD = auditTurnover > 0 && auditTurnover <= 20000000; // <= ₹2 Crore limit for Sec 44AD presumptive taxation

  return (
    <div className="animate-tab-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Selector and Title Bar */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '16px 20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Coins size={20} color="var(--primary)" />
            Indian Taxation & ITR Auditor
          </h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Progressive slab-by-slab tax liabilities, Capital Gains set-offs, and Sec 44AB/44AD compliance checks
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Regime Switcher */}
          <div 
            style={{ 
              display: 'flex', 
              background: 'rgba(255,255,255,0.06)', 
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
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: 650,
                cursor: 'pointer',
                background: taxRegime === 'NEW' ? 'var(--primary)' : 'transparent',
                color: taxRegime === 'NEW' ? '#fff' : 'var(--text-dim)',
                transition: 'all 0.2s ease'
              }}
              title="Default regime under Section 115BAC (0% up to ₹3L, full 87A rebate up to ₹7L)"
            >
              New Regime (115BAC)
            </button>
            <button
              onClick={() => setTaxRegime('OLD')}
              style={{
                border: 'none',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: 650,
                cursor: 'pointer',
                background: taxRegime === 'OLD' ? 'var(--primary)' : 'transparent',
                color: taxRegime === 'OLD' ? '#fff' : 'var(--text-dim)',
                transition: 'all 0.2s ease'
              }}
              title="Traditional slab regime (0% up to ₹2.5L, full 87A rebate up to ₹5L)"
            >
              Old Regime
            </button>
          </div>

          {/* Read-Only Active Financial Year Badge */}
          <div 
            style={{ 
              padding: '6px 12px', 
              background: 'rgba(255,255,255,0.02)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--text-dim)',
              height: '32px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            Active FY: {selectedFY}
          </div>
        </div>
      </div>

      {/* Primary KPI Grid: Tax Estimates */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* Total Estimated Tax Card */}
        <div 
          className="glass-card" 
          style={{ 
            padding: '24px', 
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            boxShadow: 'var(--shadow-card)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.04 }}>
            <Percent size={120} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Est. Tax Payable
              </span>
              <h3 
                style={{ 
                  fontSize: '2rem', 
                  fontWeight: 800, 
                  fontFamily: 'var(--font-mono)', 
                  color: totalEstimatedTax > 0 ? 'var(--color-loss)' : 'var(--color-win)',
                  marginTop: '8px',
                  lineHeight: 1
                }}
              >
                {formatCurrency(totalEstimatedTax)}
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Incl. 4% Cess ({taxRegime === 'NEW' ? 'New Regime Sec 115BAC' : 'Old Tax Regime'})
              </p>
            </div>
            <div style={{ background: 'var(--color-loss-bg)', padding: '8px', borderRadius: '8px' }}>
              <Scale size={20} color="var(--color-loss)" />
            </div>
          </div>
        </div>

        {/* Business/Slab Progressive Card */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Business Tax ({taxRegime === 'NEW' ? 'New Slabs' : 'Old Slabs'})
              </span>
              <div style={{ background: 'var(--primary-glow)', padding: '6px', borderRadius: '6px' }}>
                <Percent size={16} color="var(--primary)" />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Net Business Income:</span>
              <strong style={{ fontSize: '1rem', fontFamily: 'var(--font-mono)', color: totalTaxableBusiness > 0 ? 'var(--color-win)' : 'var(--text-dim)' }}>
                {formatCurrency(totalTaxableBusiness)}
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Progressive Slab Tax:</span>
              <strong style={{ fontSize: '0.88rem', fontFamily: 'var(--font-mono)', color: businessTaxCalc.totalTax > 0 ? 'var(--color-loss)' : 'var(--color-win)' }}>
                {formatCurrency(businessTaxCalc.totalTax)}
              </strong>
            </div>

            {businessTaxCalc.rebate > 0 && (
              <p style={{ fontSize: '0.68rem', color: 'var(--color-win)', marginTop: '6px', fontWeight: 600 }}>
                ✓ Sec 87A Full Rebate: -{formatCurrency(businessTaxCalc.rebate)} (Taxable income under {taxRegime === 'NEW' ? '₹7 Lakh' : '₹5 Lakh'})
              </p>
            )}
          </div>

          <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Effective Business Tax Rate:</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
              {businessTaxCalc.effectiveRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Audit Advisory Card */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sec 44AB / 44AD Audit Check
              </span>
              <div style={{ background: requiresAudit ? 'var(--color-loss-bg)' : 'var(--color-win-bg)', padding: '6px', borderRadius: '6px' }}>
                <ShieldAlert size={16} color={requiresAudit ? 'var(--color-loss)' : 'var(--color-win)'} />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>F&O Absolute Turnover:</span>
              <strong style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                {formatCurrency(auditTurnover)}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>Digital Audit Limit (95%+ Online):</span>
              <span style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>₹10.00 Crore</span>
            </div>
          </div>

          <div 
            style={{ 
              marginTop: '12px', 
              fontSize: '0.7rem', 
              padding: '6px 10px', 
              borderRadius: '6px',
              background: requiresAudit ? 'rgba(239, 68, 68, 0.04)' : 'rgba(16, 185, 129, 0.04)',
              border: `1px solid ${requiresAudit ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}`,
              color: requiresAudit ? 'var(--color-loss)' : 'var(--color-win)',
              fontWeight: 550,
              lineHeight: 1.3
            }}
          >
            {requiresAudit 
              ? '⚠️ Turnover > ₹10 Cr. Formal Tax Audit under Sec 44AB is mandatory.'
              : isEligible44AD
                ? '✓ Within limits. Eligible for Sec 44AD Presumptive Taxation (6% profit).'
                : '✓ Turnover within ₹10 Crore digital limit. Tax audit is not legally mandatory.'}
          </div>
        </div>
      </div>

      {/* Main breakdown grids */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        
        {/* Left Column: Capital Gains & Business Breakdowns */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 1: Capital Gains (Equity CNC Delivery) */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <Briefcase size={16} color="var(--primary)" />
              1. Capital Gains Tax Summary (Equity Delivery)
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* STCG */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Short-Term Capital Gains (STCG)</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Held &lt; 1 Year (Taxed @ 20%)</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: stcgNet >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {formatCurrency(stcgNet)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Tax: {formatCurrency(stcgTax)}
                  </div>
                </div>
              </div>

              {/* LTCG */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Long-Term Capital Gains (LTCG)</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Held &gt; 1 Year (Taxed @ 12.5% above ₹1.25L)</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: ltcgNet >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {formatCurrency(ltcgNet)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Tax: {formatCurrency(ltcgTax)}
                  </div>
                </div>
              </div>

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
                  LTCG gains under ₹1,25,000 are fully exempt in a financial year.
                  {ltcgNet > 0 && ltcgNet <= ltcgExemptionThreshold && (
                    <span style={{ color: 'var(--color-win)', display: 'block', marginTop: '2px', fontWeight: 600 }}>
                      ✓ Your LTCG is ₹{ltcgNet.toLocaleString('en-IN')}, which is under the threshold. Nil Tax applies!
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Business & Speculative Income (Intraday & Derivatives) */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <Scale size={16} color="var(--primary)" />
              2. Business Income Summary (F&O / Intraday)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Speculative */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.015)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Speculative Business Income</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Equity Intraday (Taxed @ Slab)</div>
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
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Non-Speculative Business Income</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>F&O Derivatives, Commodities, Currencies</div>
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

              {/* Total Business */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255, 255, 255, 0.03)', border: '1.5px solid var(--border-color-active)', borderRadius: '8px' }}>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Total Taxable Business Profit:</strong>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: totalTaxableBusiness >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {formatCurrency(totalTaxableBusiness)}
                  </strong>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
                    Est. Slab Tax: {formatCurrency(businessTaxCalc.totalTax)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Broker-wise Breakdown */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <Coins size={16} color="var(--primary)" />
              Broker-Wise Charges & Performance Summary
            </h3>

            {brokerSummaryList.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px' }}>Broker Name</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Trades</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Net P&L</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Brokerage</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Govt Taxes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brokerSummaryList.map((b) => (
                        <tr key={b.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '10px 8px', fontWeight: 600 }}>{b.name}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{b.tradesCount}</td>
                          <td 
                            style={{ 
                              padding: '10px 8px', 
                              textAlign: 'right', 
                              fontWeight: 700, 
                              fontFamily: 'var(--font-mono)',
                              color: b.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)'
                            }}
                          >
                            {formatCurrency(b.netPnL)}
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(b.brokerage)}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatCurrency(b.taxes)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.01)', padding: '8px', borderRadius: '6px', marginTop: '4px' }}>
                  💡 Use this to audit which broker is costing you the most in commissions, and track returns across multiple trading accounts.
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                No trades logged for the selected Financial Year.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Fees Breakdown & ITR Coach */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 3: Brokerage & Govt Charges breakdown */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <Receipt size={16} color="var(--primary)" />
              3. Expenses & Government Levies Audit
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Broker Commissions / Brokerage:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(totalBrokerage)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Govt Levies (STT, Stamp Duty, GST, Exchange Tx):</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(totalGovtTaxes)}</span>
              </div>
              
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
                <span>Total Charges Deducted:</span>
                <span style={{ color: 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>{formatCurrency(totalCharges)}</span>
              </div>

              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                💡 <strong>Tax Tip:</strong> In India, brokerage and other government charges paid on F&O trades are fully deductible business expenses. You can claim them to reduce your taxable business income when filing ITR-3! (Note: STT on Equity delivery is not deductible).
              </div>
            </div>
          </div>

          {/* Card 4: ITR Filing Coach */}
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <HelpCircle size={16} color="var(--primary)" />
              ITR Filing Coach & Loss Carry-Forward
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Business Loss Carriage */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ background: 'var(--primary-glow)', width: '6px', borderRadius: '4px', flexShrink: 0 }}></div>
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700 }}>Carry Forward F&O Loss</h4>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                    If you have a net F&O loss (₹{totalBusinessNet < 0 ? Math.abs(totalBusinessNet).toLocaleString('en-IN') : '0'}), you can carry it forward for up to <strong>8 years</strong> to offset future F&O profits, provided you file your ITR-3 on time (usually before July 31st).
                  </p>
                </div>
              </div>

              {/* Speculative Loss Carriage */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ background: 'rgba(251, 146, 60, 0.2)', width: '6px', borderRadius: '4px', flexShrink: 0 }}></div>
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700 }}>Speculative Loss (Intraday Equity)</h4>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                    Equity intraday losses can only be set off against intraday profits. They cannot offset F&O profits, and can only be carried forward for <strong>4 years</strong>.
                  </p>
                </div>
              </div>

              {/* Capital Gains Loss Carriage */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.2)', width: '6px', borderRadius: '4px', flexShrink: 0 }}></div>
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700 }}>Capital Losses set-off</h4>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.4' }}>
                    Short-Term Capital Losses (STCL) can be set off against both STCG and LTCG. Long-Term Capital Losses (LTCL) can only be set off against LTCG. Unabsorbed capital losses can be carried forward for <strong>8 years</strong>.
                  </p>
                </div>
              </div>

              {/* Setoff warning indicators */}
              {(hasBusinessLoss || hasStcgLoss || hasLtcgLoss) && (
                <div 
                  style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    background: 'rgba(10, 132, 255, 0.04)', 
                    border: '1.5px solid rgba(10, 132, 255, 0.1)', 
                    display: 'flex', 
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '0.72rem'
                  }}
                >
                  <Sparkles size={16} color="#0a84ff" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>ITR Planning Alert:</strong> You have active losses in this period:
                    <ul style={{ paddingLeft: '16px', marginTop: '4px', listStyleType: 'disc' }}>
                      {hasBusinessLoss && <li>Business Net Loss of {formatCurrency(Math.abs(totalBusinessNet))}. Make sure to file ITR-3 to lock in carry-forward!</li>}
                      {hasStcgLoss && <li>Short-term Capital Loss of {formatCurrency(Math.abs(stcgNet))}. Can offset future capital gains.</li>}
                      {hasLtcgLoss && <li>Long-term Capital Loss of {formatCurrency(Math.abs(ltcgNet))}. Can only offset future LTCG.</li>}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
