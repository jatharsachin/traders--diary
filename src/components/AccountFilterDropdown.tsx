import React, { useState, useRef, useEffect } from 'react';
import type { BrokerAccount } from '../types';
import { BROKER_LOGOS } from '../utils/brandLogos';
import { Check, ChevronDown, Layers } from 'lucide-react';

interface AccountFilterDropdownProps {
  brokerAccounts: BrokerAccount[];
  selectedAccountIds: string[];
  onChange: (newSelectedIds: string[]) => void;
  style?: React.CSSProperties;
}

export function AccountFilterDropdown({
  brokerAccounts,
  selectedAccountIds,
  onChange,
  style
}: AccountFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeAccounts = brokerAccounts.filter(a => a.active);
  const allActiveIds = activeAccounts.map(a => a.id);

  // If selectedAccountIds contains all or is marked as all, it's combined
  const isAllSelected = allActiveIds.length > 0 && allActiveIds.every(id => selectedAccountIds.includes(id));
  const isCombined = isAllSelected || selectedAccountIds.length === 0;

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle clicking "Combined Accounts"
  const handleToggleCombined = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(allActiveIds);
  };

  // Handle toggling an individual account
  const handleToggleAccount = (accId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isChecked = selectedAccountIds.includes(accId);

    if (isChecked) {
      // If user unchecks this account, only uncheck if at least 1 account remains
      if (selectedAccountIds.length > 1) {
        const next = selectedAccountIds.filter(id => id !== accId);
        onChange(next);
      }
    } else {
      const next = [...selectedAccountIds, accId];
      onChange(next);
    }
  };

  // Handle "Only" button to quickly select just one broker
  const handleSelectOnly = (accId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([accId]);
  };

  // Get current button label and icon
  const getButtonContent = () => {
    if (isCombined) {
      return {
        label: 'Combined Accounts',
        icon: <Layers size={14} color="var(--primary)" />
      };
    }

    if (selectedAccountIds.length === 1) {
      const matched = activeAccounts.find(a => a.id === selectedAccountIds[0]);
      if (matched) {
        const logo = BROKER_LOGOS[matched.broker] || BROKER_LOGOS['Other'];
        return {
          label: `${matched.accountName} (${matched.broker})`,
          icon: (
            <img 
              src={logo} 
              alt={matched.broker} 
              style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'contain', background: '#fff', padding: '1px' }} 
            />
          )
        };
      }
    }

    return {
      label: `${selectedAccountIds.length} Accounts Selected`,
      icon: <Layers size={14} color="var(--primary)" />
    };
  };

  const buttonContent = getButtonContent();

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', ...style }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '4px 12px',
          fontSize: '0.78rem',
          fontWeight: 650,
          height: '32px',
          background: 'var(--bg-card)',
          border: isOpen ? '1px solid var(--primary)' : '1px solid var(--border-color)',
          borderRadius: '9999px',
          color: 'var(--text-main)',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 12px var(--primary-glow)' : 'var(--shadow-sm)',
          transition: 'all 0.2s ease',
          outline: 'none',
          whiteSpace: 'nowrap'
        }}
        title="Select Broker Accounts"
      >
        <span style={{ display: 'flex', alignItems: 'center' }}>
          {buttonContent.icon}
        </span>
        <span>{buttonContent.label}</span>
        <ChevronDown 
          size={13} 
          style={{ 
            color: 'var(--text-muted)', 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            minWidth: '240px',
            background: 'var(--bg-card)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1.5px solid var(--border-color)',
            borderRadius: '14px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.55), 0 0 1px rgba(255, 255, 255, 0.15)',
            padding: '6px',
            zIndex: 2500,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Header text */}
          <div style={{ padding: '6px 8px 4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Select Active Accounts
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              {selectedAccountIds.length}/{activeAccounts.length}
            </span>
          </div>

          {/* Option: Combined Accounts (All) */}
          <div
            onClick={handleToggleCombined}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '7px 10px',
              borderRadius: '9px',
              cursor: 'pointer',
              background: isCombined ? 'rgba(10, 132, 255, 0.12)' : 'transparent',
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!isCombined) (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              if (!isCombined) (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              {/* Checkbox */}
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '5px',
                  border: isCombined ? '1.5px solid var(--primary)' : '1.5px solid var(--border-color)',
                  background: isCombined ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s ease'
                }}
              >
                {isCombined && <Check size={12} color="#ffffff" strokeWidth={3.5} />}
              </div>

              {/* Icon & Label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Layers size={12} color="var(--primary)" />
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 650, color: isCombined ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  Combined Accounts
                </span>
              </div>
            </div>

            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              All
            </span>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 2px' }} />

          {/* Individual Broker Accounts */}
          {activeAccounts.map((acc) => {
            const isChecked = selectedAccountIds.includes(acc.id);
            const logo = BROKER_LOGOS[acc.broker] || BROKER_LOGOS['Other'];

            return (
              <div
                key={acc.id}
                onClick={(e) => handleToggleAccount(acc.id, e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '7px 10px',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  background: isChecked && !isCombined ? 'rgba(10, 132, 255, 0.1)' : 'transparent',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = isChecked && !isCombined 
                    ? 'rgba(10, 132, 255, 0.16)' 
                    : 'rgba(255, 255, 255, 0.06)';
                  const onlyBtn = e.currentTarget.querySelector('.only-btn') as HTMLElement;
                  if (onlyBtn) onlyBtn.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = isChecked && !isCombined 
                    ? 'rgba(10, 132, 255, 0.1)' 
                    : 'transparent';
                  const onlyBtn = e.currentTarget.querySelector('.only-btn') as HTMLElement;
                  if (onlyBtn) onlyBtn.style.opacity = '0';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  {/* Checkbox with blue checkmark */}
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '5px',
                      border: isChecked ? '1.5px solid var(--primary)' : '1.5px solid var(--border-color)',
                      background: isChecked ? 'var(--primary)' : 'rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isChecked && <Check size={12} color="#ffffff" strokeWidth={3.5} />}
                  </div>

                  {/* Broker Logo */}
                  <img 
                    src={logo} 
                    alt={acc.broker} 
                    style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '50%', 
                      objectFit: 'contain', 
                      background: '#fff', 
                      padding: '1.5px',
                      border: '1px solid var(--border-color)',
                      flexShrink: 0
                    }} 
                  />

                  {/* Account Name and Broker */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 650, color: isChecked ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {acc.accountName}
                    </span>
                    <span style={{ fontSize: '0.67rem', color: 'var(--text-dim)', marginTop: '-1px' }}>
                      {acc.broker}
                    </span>
                  </div>
                </div>

                {/* "Only" button shortcut */}
                <button
                  type="button"
                  className="only-btn"
                  onClick={(e) => handleSelectOnly(acc.id, e)}
                  style={{
                    opacity: 0,
                    transition: 'opacity 0.15s ease',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '5px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--primary)',
                    cursor: 'pointer'
                  }}
                  title={`Select only ${acc.accountName} (${acc.broker})`}
                >
                  Only
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
