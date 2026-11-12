import React, { useState } from 'react';
import { X, Wallet, TrendingUp, ArrowDownLeft, ShieldCheck, Calendar, Receipt, ExternalLink } from 'lucide-react';
import type { BrokerAccount, CapitalAdjustment, BankAccount } from '../types';

interface CapitalBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPnlVisible: boolean;
  activeAccountName: string;
  isCombinedView: boolean;
  // Quantities
  startingCapital: number;
  totalNetPnL: number;
  totalDeposits: number;
  totalWithdrawals: number;
  netInflow: number;
  netInvestedCost: number;
  currentCapital: number;
  totalInvCurrent: number;
  combinedWealth: number;
  // Account details
  brokerAccounts: BrokerAccount[];
  effectiveAccountIds: string[];
  // Datewise adjustments
  capitalAdjustments?: CapitalAdjustment[];
  bankAccounts?: BankAccount[];
  onNavigateToLedger?: () => void;
}

export const CapitalBreakdownModal: React.FC<CapitalBreakdownModalProps> = ({
  isOpen,
  onClose,
  isPnlVisible,
  activeAccountName,
  isCombinedView,
  startingCapital,
  totalNetPnL,
  totalDeposits,
  totalWithdrawals,
  netInflow,
  netInvestedCost,
  currentCapital,
  totalInvCurrent,
  combinedWealth,
  brokerAccounts,
  effectiveAccountIds,
  capitalAdjustments = [],
  bankAccounts = [],
  onNavigateToLedger,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'statement'>('statement');
  const [filterFlow, setFilterFlow] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAWAL'>('ALL');

  if (!isOpen) return null;

  const formatINR = (val: number) => {
    return '₹' + Math.round(val).toLocaleString('en-IN');
  };

  // Total cash contributed from pocket = startingCapital + net external deposits
  const totalPocketMoneyIn = startingCapital + netInflow;

  // Filter adjustments for the active broker account(s)
  const relevantAdjustments = capitalAdjustments.filter((a) => {
    if (isCombinedView) return true;
    if (a.brokerAccountId && effectiveAccountIds.includes(a.brokerAccountId)) return true;
    const activeAccs = brokerAccounts.filter(acc => effectiveAccountIds.includes(acc.id));
    if (!a.brokerAccountId && a.broker) {
      return activeAccs.some(acc => acc.broker === a.broker);
    }
    return false;
  }).sort((a, b) => {
    const dateComp = (b.date || '').localeCompare(a.date || '');
    if (dateComp !== 0) return dateComp;
    return (b.time || '').localeCompare(a.time || '');
  });

  const displayList = relevantAdjustments.filter(item => {
    if (filterFlow === 'ALL') return true;
    return item.type === filterFlow;
  });

  return (
    <div className="modal-overlay" style={{ zIndex: 99999 }} onClick={onClose}>
      <div 
        className="modal-content glass-card animate-scale-up"
        style={{
          maxWidth: '640px',
          width: '94%',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '16px',
          border: '1.5px solid var(--border-color)',
          background: 'var(--bg-card)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div 
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(10, 132, 255, 0.15)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(10, 132, 255, 0.3)',
              }}
            >
              <Wallet size={19} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Pocket Money In & Capital Statement
              </h3>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {activeAccountName} • Bank to Broker Inflows with Date-wise Audit
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{
              width: '32px',
              height: '32px',
              padding: 0,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Sub-Tab Navigator */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 20px 0 20px',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(255, 255, 255, 0.015)'
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveSubTab('statement')}
              className={`nav-tab ${activeSubTab === 'statement' ? 'active' : ''}`}
              style={{ 
                padding: '6px 14px', 
                fontSize: '0.78rem',
                borderBottom: activeSubTab === 'statement' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                borderRadius: '6px 6px 0 0',
                fontWeight: 650
              }}
            >
              <Calendar size={13} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: '-1px' }} />
              Date-wise Pocket Inflow Statement ({relevantAdjustments.length})
            </button>
            <button
              onClick={() => setActiveSubTab('overview')}
              className={`nav-tab ${activeSubTab === 'overview' ? 'active' : ''}`}
              style={{ 
                padding: '6px 14px', 
                fontSize: '0.78rem',
                borderBottom: activeSubTab === 'overview' ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                borderRadius: '6px 6px 0 0',
                fontWeight: 650
              }}
            >
              <Receipt size={13} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: '-1px' }} />
              Summary & P&L Audit
            </button>
          </div>

          {activeSubTab === 'statement' && (
            <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
              <button 
                onClick={() => setFilterFlow('ALL')}
                className="btn btn-secondary"
                style={{ padding: '2px 8px', fontSize: '0.66rem', height: '22px', background: filterFlow === 'ALL' ? 'var(--primary)' : 'transparent', color: filterFlow === 'ALL' ? '#fff' : 'var(--text-muted)' }}
              >
                All
              </button>
              <button 
                onClick={() => setFilterFlow('DEPOSIT')}
                className="btn btn-secondary"
                style={{ padding: '2px 8px', fontSize: '0.66rem', height: '22px', background: filterFlow === 'DEPOSIT' ? 'var(--color-win)' : 'transparent', color: filterFlow === 'DEPOSIT' ? '#fff' : 'var(--text-muted)' }}
              >
                + Deposits
              </button>
              <button 
                onClick={() => setFilterFlow('WITHDRAWAL')}
                className="btn btn-secondary"
                style={{ padding: '2px 8px', fontSize: '0.66rem', height: '22px', background: filterFlow === 'WITHDRAWAL' ? 'var(--color-loss)' : 'transparent', color: filterFlow === 'WITHDRAWAL' ? '#fff' : 'var(--text-muted)' }}
              >
                - Withdrawals
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '72vh', overflowY: 'auto' }}>
          
          {/* Top 2 Primary Comparative Cards: Pocket Money vs Trading P&L */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {/* Card 1: Pocket Money (Total Bank Inflow) */}
            <div 
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1.5px solid rgba(59, 130, 246, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowDownLeft size={14} color="var(--primary)" />
                <span style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Pocket Money In
                </span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary)', marginTop: '2px' }}>
                {isPnlVisible ? formatINR(totalPocketMoneyIn) : '••••'}
              </div>
              <span style={{ fontSize: '0.64rem', color: 'var(--text-dim)', lineHeight: 1.25 }}>
                Starting capital ({formatINR(startingCapital)}) + Net deposits ({netInflow >= 0 ? '+' : ''}{formatINR(netInflow)})
              </span>
            </div>

            {/* Card 2: Net Trading Profit/Loss */}
            <div 
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: totalNetPnL >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: totalNetPnL >= 0 ? '1.5px solid rgba(16, 185, 129, 0.25)' : '1.5px solid rgba(239, 68, 68, 0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={14} color={totalNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)'} />
                <span style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Net Trading P&L
                </span>
              </div>
              <div 
                style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: 800, 
                  fontFamily: 'var(--font-mono)', 
                  color: totalNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)',
                  marginTop: '2px' 
                }}
              >
                {isPnlVisible ? `${totalNetPnL >= 0 ? '+' : ''}${formatINR(totalNetPnL)}` : '••••'}
              </div>
              <span style={{ fontSize: '0.64rem', color: 'var(--text-dim)', lineHeight: 1.25 }}>
                Realized market profit / loss after all charges
              </span>
            </div>
          </div>

          {/* TAB 1: DATE-WISE STATEMENT */}
          {activeSubTab === 'statement' && (
            <div 
              style={{
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                overflow: 'hidden'
              }}
            >
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.015)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={14} color="var(--primary)" />
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Chronological Pay-in / Deposit Statement
                  </span>
                </div>
                {onNavigateToLedger && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToLedger();
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '2px 8px', fontSize: '0.68rem', height: '24px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Open full Broker & Bank Ledger tab"
                  >
                    <span>Open Full Ledger</span>
                    <ExternalLink size={11} />
                  </button>
                )}
              </div>

              {/* Initial Starting Balance Row */}
              <div 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 16px',
                  background: 'rgba(59, 130, 246, 0.04)',
                  borderBottom: '1px solid var(--border-color)',
                  fontSize: '0.76rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-primary-subtle" style={{ fontSize: '0.62rem', padding: '1px 6px' }}>
                    BASE CAPITAL
                  </span>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>Initial Starting Pocket Money</strong>
                    <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
                      Account setup balance / carry forward
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontSize: '0.86rem' }}>
                    {isPnlVisible ? formatINR(startingCapital) : '••••'}
                  </strong>
                </div>
              </div>

              {/* Transactions List */}
              {displayList.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.76rem' }}>
                  No date-wise deposit/withdrawal entries logged yet.
                  <div style={{ marginTop: '6px', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    Tip: You can add new deposits anytime via <strong>Ledger ➔ Log Pay-in/Out</strong>.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {displayList.map((item, idx) => {
                    const isDeposit = item.type === 'DEPOSIT';
                    const matchedAcc = brokerAccounts.find(a => a.id === item.brokerAccountId);
                    const matchedBank = bankAccounts.find(b => b.id === item.bankAccountId);

                    const formattedDate = (() => {
                      try {
                        const parts = item.date.split('-');
                        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                      } catch {
                        return item.date;
                      }
                    })();

                    return (
                      <div 
                        key={item.id || idx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 16px',
                          borderBottom: idx === displayList.length - 1 ? 'none' : '1px solid var(--border-color)',
                          fontSize: '0.76rem',
                          background: idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'
                        }}
                      >
                        {/* Left: Date, Type Badge, Notes */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span 
                            style={{ 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              fontSize: '0.62rem', 
                              fontWeight: 700,
                              background: isDeposit ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              color: isDeposit ? 'var(--color-win)' : 'var(--color-loss)',
                              border: `1px solid ${isDeposit ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                            }}
                          >
                            {isDeposit ? 'PAY-IN' : 'PAY-OUT'}
                          </span>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ color: 'var(--text-main)', fontSize: '0.78rem' }}>{formattedDate}</strong>
                              {item.time && <span style={{ fontSize: '0.64rem', color: 'var(--text-dim)' }}>{item.time}</span>}
                              {matchedAcc && (
                                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '1px 5px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                  {matchedAcc.broker} ({matchedAcc.accountName})
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {item.notes || (isDeposit ? 'Bank Capital Deposit' : 'Capital Withdrawal')}
                              {matchedBank && <span style={{ color: 'var(--text-dim)' }}> • Via {matchedBank.bankName}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount */}
                        <div style={{ textAlign: 'right' }}>
                          <strong 
                            style={{ 
                              fontFamily: 'var(--font-mono)', 
                              color: isDeposit ? 'var(--color-win)' : 'var(--color-loss)',
                              fontSize: '0.88rem' 
                            }}
                          >
                            {isDeposit ? '+' : '-'}{formatINR(item.amount)}
                          </strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DETAILED SUMMARY & AUDIT */}
          {activeSubTab === 'overview' && (
            <div 
              style={{
                padding: '14px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                Component Ledger Overview
              </span>

              {/* Row 1: Starting Capital */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Initial Starting Balance:</span>
                <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>
                  {isPnlVisible ? formatINR(startingCapital) : '••••'}
                </strong>
              </div>

              {/* Row 2: Bank Deposits (Pay-in) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: 'var(--color-win)' }}>+</span> Bank Deposits (Pay-in):
                </span>
                <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-win)' }}>
                  {isPnlVisible ? `+${formatINR(totalDeposits)}` : '••••'}
                </strong>
              </div>

              {/* Row 3: Bank Withdrawals (Pay-out) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: 'var(--color-loss)' }}>-</span> Bank Withdrawals (Pay-out):
                </span>
                <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-loss)' }}>
                  {isPnlVisible ? `-${formatINR(totalWithdrawals)}` : '••••'}
                </strong>
              </div>

              {/* Row 4: Net Bank Cash Inflow */}
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  fontSize: '0.78rem',
                  borderTop: '1px dashed var(--border-color)',
                  paddingTop: '6px'
                }}
              >
                <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Net Capital Inflow (From Bank):</span>
                <strong style={{ fontFamily: 'var(--font-mono)', color: netInflow >= 0 ? 'var(--primary)' : 'var(--text-dim)' }}>
                  {isPnlVisible ? `${netInflow >= 0 ? '+' : ''}${formatINR(netInflow)}` : '••••'}
                </strong>
              </div>

              {/* Row 5: Realized Trading P&L */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-main)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ color: totalNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {totalNetPnL >= 0 ? '+' : '-'}
                  </span>
                  Total Realized Trading P&L:
                </span>
                <strong style={{ fontFamily: 'var(--font-mono)', color: totalNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>
                  {isPnlVisible ? `${totalNetPnL >= 0 ? '+' : ''}${formatINR(totalNetPnL)}` : '••••'}
                </strong>
              </div>

              {netInvestedCost !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {netInvestedCost > 0 ? '- Deployed into Delivery Assets:' : '+ Net Realized Return from Exited Assets:'}
                  </span>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: netInvestedCost > 0 ? '#f59e0b' : 'var(--color-win)' }}>
                    {isPnlVisible ? (netInvestedCost > 0 ? `-${formatINR(netInvestedCost)}` : `+${formatINR(Math.abs(netInvestedCost))}`) : '••••'}
                  </strong>
                </div>
              )}

              {/* Final Highlight: Current Trading Capital */}
              <div 
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.84rem',
                  borderTop: '1.5px solid var(--border-color)',
                  paddingTop: '8px',
                  marginTop: '2px',
                }}
              >
                <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>Current Broker Trading Capital:</span>
                <strong 
                  style={{ 
                    fontFamily: 'var(--font-mono)', 
                    color: totalNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)',
                    fontSize: '0.96rem' 
                  }}
                >
                  {isPnlVisible ? formatINR(currentCapital) : '••••'}
                </strong>
              </div>

              {totalInvCurrent > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', marginTop: '2px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>+ Holdings Portfolio Value:</span>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                    {isPnlVisible ? formatINR(totalInvCurrent) : '••••'}
                  </strong>
                </div>
              )}

              {totalInvCurrent > 0 && (
                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    fontSize: '0.86rem',
                    borderTop: '1px dashed var(--border-color)',
                    paddingTop: '6px'
                  }}
                >
                  <span style={{ color: 'var(--text-main)', fontWeight: 800 }}>Total Combined Net Worth:</span>
                  <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-win)', fontSize: '1.02rem' }}>
                    {isPnlVisible ? formatINR(combinedWealth) : '••••'}
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* Individual Accounts Summary when viewing Combined or multiple accounts */}
          {isCombinedView && brokerAccounts.length > 1 && (
            <div 
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.015)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Broker Accounts Breakdown
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {brokerAccounts.filter(a => a.active && effectiveAccountIds.includes(a.id)).map(acc => (
                  <div 
                    key={acc.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.74rem',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <span style={{ color: 'var(--text-main)' }}>
                      <strong>{acc.broker}</strong> ({acc.accountName})
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Initial: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-main)' }}>{isPnlVisible ? formatINR(acc.startingCapital) : '••••'}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Helpful summary insight note */}
          <div 
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.06)',
              border: '1px solid rgba(56, 189, 248, 0.2)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              fontSize: '0.72rem',
              color: 'var(--text-dim)',
              lineHeight: 1.4,
            }}
          >
            <ShieldCheck size={16} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Audit Insight:</strong> Total money you put in from your pocket/bank is{' '}
              <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{isPnlVisible ? formatINR(totalPocketMoneyIn) : '••••'}</span>.
              {' '}Your trading performance has contributed{' '}
              <span style={{ color: totalNetPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontWeight: 700 }}>
                {isPnlVisible ? `${totalNetPnL >= 0 ? '+' : ''}${formatINR(totalNetPnL)}` : '••••'}
              </span>{' '}
              to your broker balance.
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div 
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            💡 To add more deposit entries, go to <strong>Ledger ➔ Log Pay-in/Out</strong>
          </span>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
            style={{ padding: '6px 16px', fontSize: '0.78rem' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
