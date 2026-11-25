import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Plus, Eye, EyeOff, LayoutDashboard, Calendar, BookOpenCheck,
  ScrollText, BookOpen, Receipt, Briefcase, FileSpreadsheet, Target,
  Landmark, LifeBuoy, Settings, CornerDownLeft, X
} from 'lucide-react';
import type { Trade } from '../types';

export interface CommandItem {
  id: string;
  group: 'Quick Actions' | 'Navigation' | 'Recent Trades';
  label: string;
  sublabel?: string;
  shortcut?: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  isPnlVisible: boolean;
  onNavigateTab: (tab: any) => void;
  onNewTrade: () => void;
  onTogglePrivacy: () => void;
  onOpenSettings: () => void;
  onEditTrade: (id: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  trades,
  isPnlVisible,
  onNavigateTab,
  onNewTrade,
  onTogglePrivacy,
  onOpenSettings,
  onEditTrade,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [isOpen]);

  const allItems = useMemo<CommandItem[]>(() => {
    const actions: CommandItem[] = [
      {
        id: 'act-new-trade',
        group: 'Quick Actions',
        label: 'Log New Trade',
        sublabel: 'Open Trade Logger window',
        shortcut: 'N',
        icon: <Plus size={15} color="#3b82f6" />,
        onSelect: () => { onClose(); onNewTrade(); },
      },
      {
        id: 'act-toggle-privacy',
        group: 'Quick Actions',
        label: isPnlVisible ? 'Hide P&L Numbers (Privacy Mode)' : 'Show P&L Numbers',
        sublabel: 'Mask or reveal currency figures across the app',
        icon: isPnlVisible ? <EyeOff size={15} color="#f59e0b" /> : <Eye size={15} color="#10b981" />,
        onSelect: () => { onTogglePrivacy(); onClose(); },
      },
      {
        id: 'act-settings',
        group: 'Quick Actions',
        label: 'Profile, Brokers & Import Settings',
        sublabel: 'Manage accounts, brokerages, JSON backup & statement import',
        icon: <Settings size={15} color="#a855f7" />,
        onSelect: () => { onClose(); onOpenSettings(); },
      },
    ];

    const navItems: CommandItem[] = [
      { id: 'nav-dashboard', group: 'Navigation', label: 'Dashboard', sublabel: 'Performance KPIs, Equity Curve & Heatmap', icon: <LayoutDashboard size={15} color="#60a5fa" />, onSelect: () => { onNavigateTab('dashboard'); onClose(); } },
      { id: 'nav-calendar', group: 'Navigation', label: 'Trading Calendar', sublabel: 'Daily / Weekly / Monthly P&L mapping', icon: <Calendar size={15} color="#a855f7" />, onSelect: () => { onNavigateTab('calendar'); onClose(); } },
      { id: 'nav-daybook', group: 'Navigation', label: 'Day Book', sublabel: 'Daily chronological ledger & notes', icon: <BookOpenCheck size={15} color="#0ea5e9" />, onSelect: () => { onNavigateTab('daybook'); onClose(); } },
      { id: 'nav-logs', group: 'Navigation', label: 'Trade Logs', sublabel: 'Search, filter, edit or duplicate trades', icon: <ScrollText size={15} color="#10b981" />, onSelect: () => { onNavigateTab('logs'); onClose(); } },
      { id: 'nav-mistakes', group: 'Navigation', label: 'Journal & Notes', sublabel: 'Mistakes, emotions & daily reflections', icon: <BookOpen size={15} color="#f43f5e" />, onSelect: () => { onNavigateTab('mistakes'); onClose(); } },
      { id: 'nav-ledger', group: 'Navigation', label: 'Bank & Broker Ledger', sublabel: 'Double-entry deposits, withdrawals & charges', icon: <Receipt size={15} color="#f59e0b" />, onSelect: () => { onNavigateTab('ledger'); onClose(); } },
      { id: 'nav-account', group: 'Navigation', label: 'Investments', sublabel: 'Long-term holdings & portfolio tracker', icon: <Briefcase size={15} color="#3b82f6" />, onSelect: () => { onNavigateTab('account'); onClose(); } },
      { id: 'nav-contract', group: 'Navigation', label: 'Contract Notes', sublabel: 'Daily broker charge reconciliation', icon: <FileSpreadsheet size={15} color="#10b981" />, onSelect: () => { onNavigateTab('contractNotes'); onClose(); } },
      { id: 'nav-strategies', group: 'Navigation', label: 'Setups & Strategies', sublabel: 'Strategy win-rate & expectancy analytics', icon: <Target size={15} color="#ec4899" />, onSelect: () => { onNavigateTab('strategies'); onClose(); } },
      { id: 'nav-taxation', group: 'Navigation', label: 'Indian Taxation & ITR', sublabel: 'Sec 115BAC, F&O turnover & advance tax', icon: <Landmark size={15} color="#f97316" />, onSelect: () => { onNavigateTab('taxation'); onClose(); } },
      { id: 'nav-help', group: 'Navigation', label: 'Help & Guides', sublabel: 'Complete user manual & keyboard shortcuts', icon: <LifeBuoy size={15} color="#06b6d4" />, onSelect: () => { onNavigateTab('help'); onClose(); } },
    ];

    const q = query.trim().toLowerCase();
    const matchedTrades: CommandItem[] = q.length >= 2
      ? trades
          .filter(t =>
            t.symbol.toLowerCase().includes(q) ||
            (t.strategy || '').toLowerCase().includes(q) ||
            t.date.includes(q)
          )
          .slice(-8)
          .reverse()
          .map(t => ({
            id: `trade-${t.id}`,
            group: 'Recent Trades' as const,
            label: `${t.symbol} (${t.action})`,
            sublabel: `${t.exitDate || t.date} • Qty ${t.qty} • ${isPnlVisible ? `${t.netPnL >= 0 ? '+' : ''}₹${t.netPnL.toFixed(0)}` : '••••'}`,
            icon: <ScrollText size={15} color={t.netPnL >= 0 ? '#30d158' : '#ff453a'} />,
            onSelect: () => { onClose(); onEditTrade(t.id); },
          }))
      : [];

    const base = [...actions, ...navItems];
    const filteredBase = q
      ? base.filter(item =>
          item.label.toLowerCase().includes(q) ||
          (item.sublabel || '').toLowerCase().includes(q)
        )
      : base;

    return [...filteredBase, ...matchedTrades];
  }, [query, trades, isPnlVisible, onClose, onNewTrade, onTogglePrivacy, onOpenSettings, onNavigateTab, onEditTrade]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (allItems.length > 0 ? (prev + 1) % allItems.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (allItems.length > 0 ? (prev - 1 + allItems.length) % allItems.length : 0));
      } else if (e.key === 'Enter' && allItems[activeIndex]) {
        e.preventDefault();
        allItems[activeIndex].onSelect();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allItems, activeIndex, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" style={{ zIndex: 100000, alignItems: 'flex-start', paddingTop: '12vh' }} onClick={onClose}>
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '94vw',
          maxWidth: '580px',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.72)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid var(--border-color)' }}>
          <Search size={17} color="var(--primary)" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to tab, run action, or search symbol (e.g. NIFTY, Taxation)..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              fontFamily: 'var(--font-sans)',
            }}
          />
          <button
            type="button"
            onClick={onClose}
            className="btn-icon-only"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            aria-label="Close command palette"
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '8px' }}>
          {allItems.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              No matching commands or trades found for "{query}".
            </div>
          ) : (
            allItems.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onSelect}
                  onMouseEnter={() => setActiveIndex(idx)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '9px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: isSelected ? 'rgba(10, 132, 255, 0.16)' : 'transparent',
                    color: 'var(--text-main)',
                    transition: 'background 0.1s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </div>
                      {item.sublabel && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.sublabel}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.64rem', color: 'var(--text-dim)', padding: '2px 7px', borderRadius: '9999px', background: 'rgba(255,255,255,0.04)' }}>
                      {item.group}
                    </span>
                    {isSelected && <CornerDownLeft size={13} color="var(--primary)" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderTop: '1px solid var(--border-color)', fontSize: '0.68rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.015)' }}>
          <span>↑↓ Navigate • ↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
