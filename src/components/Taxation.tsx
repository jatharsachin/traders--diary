import { useState, useEffect } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { filterTradesByFY, FINANCIAL_YEARS } from '../utils/fyHelper';
import { 
  Coins, Percent, Briefcase, Scale, 
  HelpCircle, Info, ShieldAlert, Sparkles, Receipt
} from 'lucide-react';

export function Taxation({ activeAccountId = 'Combined' }: { activeAccountId?: string }) {
  const { trades: allTrades, selectedFY, setSelectedFY } = useTradeStore();
  const fyTrades = filterTradesByFY(allTrades, selectedFY);
  const trades = activeAccountId === 'Combined'
    ? fyTrades
    : fyTrades.filter(t => t.brokerAccountId === activeAccountId);

  // --- INDIAN TAXATION COMPUTATIONS ---
  
  // 1. Capital Gains (Equity Delivery Trades)
  const stcgTrades = trades.filter(t => t.segment === 'Equity' && t.product === 'Delivery' && t.holdingType !== 'Long Term');
  const ltcgTrades = trades.filter(t => t.segment === 'Equity' && t.product === 'Delivery' && t.holdingType === 'Long Term');

  const stcgNet = stcgTrades.reduce((acc, t) => acc + t.netPnL, 0);
  const ltcgNet = ltcgTrades.reduce((acc, t) => acc + t.netPnL, 0);

  // STCG Tax is 20%
  const stcgTax = stcgNet > 0 ? stcgNet * 0.20 : 0;

  // LTCG Tax is 12.5% on gains exceeding ₹1.25L
  const ltcgExemptionThreshold = 125000;
  const ltcgTaxableGains = ltcgNet > ltcgExemptionThreshold ? ltcgNet - ltcgExemptionThreshold : 0;
  const ltcgTax = ltcgTaxableGains > 0 ? ltcgTaxableGains * 0.125 : 0;

  // 2. Business Income (Equity Intraday + F&O + Commodity + Currency)
  const speculativeTrades = trades.filter(t => t.segment === 'Equity' && t.product === 'Intraday');
  const nonSpeculativeTrades = trades.filter(t => t.segment === 'F&O' || t.segment === 'Commodity' || t.segment === 'Currency');

  const speculativeNet = speculativeTrades.reduce((acc, t) => acc + t.netPnL, 0);
  const nonSpeculativeNet = nonSpeculativeTrades.reduce((acc, t) => acc + t.netPnL, 0);
  const totalBusinessNet = speculativeNet + nonSpeculativeNet;

  // --- AUTOMATIC TAX SLAB DETECTION ---
  const netAnnualIncome = Math.max(0, stcgNet + ltcgNet + totalBusinessNet);
  
  const getAutoSlabRate = (income: number): number => {
    if (income <= 300000) return 0;
    if (income <= 700000) return 5;
    if (income <= 1000000) return 10;
    if (income <= 1200000) return 15;
    if (income <= 1500000) return 20;
    return 30;
  };

  const autoSlabRate = getAutoSlabRate(netAnnualIncome);

  // Auto-slab state
  const [isAutoSlab, setIsAutoSlab] = useState<boolean>(() => {
    const saved = localStorage.getItem('traders_diary_auto_slab');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Local storage for tax slab selector
  const [slabRate, setSlabRate] = useState<number>(() => {
    const saved = localStorage.getItem('traders_diary_tax_slab');
    return saved ? parseInt(saved, 10) : autoSlabRate;
  });

  useEffect(() => {
    localStorage.setItem('traders_diary_auto_slab', JSON.stringify(isAutoSlab));
  }, [isAutoSlab]);

  useEffect(() => {
    localStorage.setItem('traders_diary_tax_slab', slabRate.toString());
  }, [slabRate]);

  // Sync slabRate if autoSlab is enabled
  useEffect(() => {
    if (isAutoSlab) {
      setSlabRate(autoSlabRate);
    }
  }, [isAutoSlab, autoSlabRate]);

  // Business income is taxed at the individual's slab rate
  const businessTax = totalBusinessNet > 0 ? totalBusinessNet * (slabRate / 100) : 0;

  // 3. Totals
  const totalEstimatedTax = stcgTax + ltcgTax + businessTax;
  
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
            Real-time estimated tax liabilities and ITR filing compliance checks
          </p>
        </div>

        {/* Global Financial Year Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 550 }}>FY Selector:</span>
          <select
            value={selectedFY}
            onChange={(e) => setSelectedFY(e.target.value)}
            className="form-select"
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              height: '35px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              cursor: 'pointer'
            }}
          >
            {FINANCIAL_YEARS.map((fy) => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>
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
                Estimated liability for {selectedFY === 'All' ? 'All Transactions' : selectedFY}
              </p>
            </div>
            <div style={{ background: 'var(--color-loss-bg)', padding: '8px', borderRadius: '8px' }}>
              <Scale size={20} color="var(--color-loss)" />
            </div>
          </div>
        </div>

        {/* Business/Slab Selector Card */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Income Tax Slab (F&O / Intraday)
              </span>
              <div style={{ background: 'var(--primary-glow)', padding: '6px', borderRadius: '6px' }}>
                <Percent size={16} color="var(--primary)" />
              </div>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              Tax slab rate used for calculating Business & F&O taxes:
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
              <input
                type="checkbox"
                id="isAutoSlab"
                checked={isAutoSlab}
                onChange={(e) => setIsAutoSlab(e.target.checked)}
                style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              <label htmlFor="isAutoSlab" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 550 }}>
                Auto-detect slab based on trading profits
              </label>
            </div>
            {isAutoSlab && (
              <p style={{ fontSize: '0.68rem', color: 'var(--color-win)', marginTop: '4px', fontWeight: 500 }}>
                💡 Est. Net Trading Income: {formatCurrency(netAnnualIncome)}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '16px' }}>
            <select
              value={slabRate}
              disabled={isAutoSlab}
              onChange={(e) => setSlabRate(parseInt(e.target.value, 10))}
              className="form-select"
              style={{
                flex: 1,
                fontSize: '0.85rem',
                height: '38px',
                borderColor: isAutoSlab ? 'var(--border-color)' : 'var(--primary-glow)',
                opacity: isAutoSlab ? 0.7 : 1,
                cursor: isAutoSlab ? 'not-allowed' : 'pointer'
              }}
            >
              <option value={0}>0% Slab (Income ≤ ₹3L)</option>
              <option value={5}>5% Slab (Income ₹3L - ₹7L)</option>
              <option value={10}>10% Slab (Income ₹7L - ₹10L)</option>
              <option value={15}>15% Slab (Income ₹10L - ₹12L)</option>
              <option value={20}>20% Slab (Income ₹12L - ₹15L)</option>
              <option value={30}>30% Slab (Income &gt; ₹15L)</option>
            </select>
            <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {slabRate}%
            </div>
          </div>
        </div>

        {/* Audit Advisory Card */}
        <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Section 44AB Tax Audit
              </span>
              <div style={{ background: requiresAudit ? 'var(--color-loss-bg)' : 'var(--color-win-bg)', padding: '6px', borderRadius: '6px' }}>
                <ShieldAlert size={16} color={requiresAudit ? 'var(--color-loss)' : 'var(--color-win)'} />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Audit Turnover:</span>
              <strong style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                {formatCurrency(auditTurnover)}
              </strong>
            </div>
          </div>

          <div 
            style={{ 
              marginTop: '12px', 
              fontSize: '0.7rem', 
              padding: '6px 10px', 
              borderRadius: '6px',
              background: requiresAudit ? 'rgba(239, 68, 68, 0.04)' : 'rgba(16, 185, 129, 0.04)',
              border: `1px solid ${requiresAudit ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)'}`,
              color: requiresAudit ? 'var(--color-loss)' : 'var(--color-win)',
              fontWeight: 550
            }}
          >
            {requiresAudit 
              ? '⚠️ Turnover > ₹10 Crore. Tax audit under Sec 44AB is likely required.'
              : '✓ Turnover within ₹10 Crore limit. Audit is not legally mandatory.'}
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

              {/* Exemption Notice */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px', background: 'rgba(10, 132, 255, 0.03)', border: '1px solid rgba(10, 132, 255, 0.08)', borderRadius: '8px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <Info size={14} color="#0a84ff" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  LTCG gains under ₹1,25,000 are fully exempt from taxes in a financial year. Tax applies only on the excess amount.
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
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Slab Rate: {slabRate}%
                  </div>
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
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Slab Rate: {slabRate}%
                  </div>
                </div>
              </div>

              {/* Total Business */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255, 255, 255, 0.03)', border: '1.5px solid var(--border-color-active)', borderRadius: '8px' }}>
                <strong style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>Total Business Net Profit:</strong>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)', color: totalBusinessNet >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {formatCurrency(totalBusinessNet)}
                  </strong>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 600 }}>
                    Est. Tax: {formatCurrency(businessTax)}
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
