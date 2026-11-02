import React from 'react';
import { X, Wallet, TrendingUp, ArrowDownLeft, ArrowUpRight, ShieldCheck } from 'lucide-react';
import type { BrokerAccount } from '../types';

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
}) => {
  if (!isOpen) return null;

  const formatINR = (val: number) => {
    return '₹' + Math.round(val).toLocaleString('en-IN');
  };

  // Total cash contributed from pocket = startingCapital + net external deposits
  const totalPocketMoneyIn = startingCapital + netInflow;

  return (
    <div className="modal-overlay" style={{ zIndex: 99999 }} onClick={onClose}>
      <div 
        className="modal-content glass-card animate-scale-up"
        style={{
          maxWidth: '560px',
          width: '92%',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '16px',
          border: '1.5px solid var(--border-color)',
          background: 'var(--bg-card)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
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
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(10, 132, 255, 0.15)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(10, 132, 255, 0.3)',
              }}
            >
              <Wallet size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Capital & P&L Separation Audit
              </h3>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                {activeAccountName} • Pocket Inflow vs Trading Gains Breakdown
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

        {/* Modal Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '78vh', overflowY: 'auto' }}>
          
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
                gap: '4px',
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
                Starting capital + Net bank deposits put into broker
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
                gap: '4px',
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

          {/* Detailed Ledger Breakdown Rows */}
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
              Detailed Component Ledger
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

            {netInvestedCost > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>- Deployed into Delivery Assets:</span>
                <strong style={{ fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>
                  {isPnlVisible ? `-${formatINR(netInvestedCost)}` : '••••'}
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
            justifyContent: 'flex-end',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
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
