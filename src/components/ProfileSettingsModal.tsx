import React, { useState, useEffect } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import type { Broker, BrokerChargesConfig } from '../types';
import { filterTradesByFY } from '../utils/fyHelper';
import { BROKER_LOGOS, getBankLogoSvg } from '../utils/brandLogos';
import { syncMetaToCloud, syncTradeToCloud } from '../utils/supabaseClient';
import { parseKotakNeoText, matchExecutionsIntoTrades } from '../utils/statementParser';
import { 
  X, User, ShieldAlert, Save, Download, Upload, 
  Database, Trash2, IndianRupee, Settings, Plus,
  Percent, HelpCircle
} from 'lucide-react';

function BankLogoBadge({ bankName }: { bankName: string }) {
  const localLogo = getBankLogoSvg(bankName);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <img
        src={localLogo}
        alt={bankName}
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          objectFit: 'contain',
          background: '#fff',
          padding: '1.5px',
          border: '1px solid var(--border-color)'
        }}
      />
      <span>{bankName}</span>
    </span>
  );
}

function BrokerLogoIcon({ broker }: { broker: Broker }) {
  const localLogo = BROKER_LOGOS[broker] || BROKER_LOGOS['Other'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <img
        src={localLogo}
        alt={broker}
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          objectFit: 'contain',
          background: '#fff',
          padding: '1.5px',
          border: '1px solid var(--border-color)'
        }}
      />
      <span>{broker}</span>
    </span>
  );
}

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  useTwoRowHeader: boolean;
  setUseTwoRowHeader: (val: boolean) => void;
}

export function ProfileSettingsModal({ isOpen, onClose, useTwoRowHeader, setUseTwoRowHeader }: ProfileSettingsModalProps) {
  const { 
    trades, 
    baseCapital, 
    resetToMockData,
    bulkImportTrades,
    sessionUser,
    signOutUser,
    userName,
    userAvatar,
    setProfile,
    activeBrokers,
    setActiveBrokers,
    theme,
    setTheme,
    
    // NEW STATES & ACTIONS
    brokerAccounts,
    bankAccounts,
    brokerCharges,
    addBrokerAccount,
    editBrokerAccount,
    deleteBrokerAccount,
    addBankAccount,
    editBankAccount,
    deleteBankAccount,
    updateBrokerCharges,
    lockedFYs,
    toggleLockFY,
    capitalAdjustments,
    investments,
    weeklyRetrospectives,
    bankTransactions,
    subscriptionExpenses,
    noTradeDays
  } = useTradeStore();

  const [activeTab, setActiveTab] = useState<'profile' | 'charges' | 'backup' | 'danger'>('profile');

  // Profile forms
  const [profileNameInput, setProfileNameInput] = useState(userName);
  const [profileAvatarInput, setProfileAvatarInput] = useState(userAvatar);
  
  // Custom Profile Pic (Base64)
  const [customPicError, setCustomPicError] = useState('');

  // Add Account Form
  const [newAccBroker, setNewAccBroker] = useState<Broker>('Zerodha');
  const [newAccName, setNewAccName] = useState('');
  const [newAccCapital, setNewAccCapital] = useState('100000');

  // Add Bank Form
  const [newBankName, setNewBankName] = useState('');
  const [newBankHolder, setNewBankHolder] = useState('');
  const [newBankBalance, setNewBankBalance] = useState('50000');

  // Charges Form State
  const [selectedChargesBroker, setSelectedChargesBroker] = useState<Broker>('Zerodha');
  const [deliveryRate, setDeliveryRate] = useState('0');
  const [deliveryMax, setDeliveryMax] = useState('0');
  const [intradayRate, setIntradayRate] = useState('0.03');
  const [intradayMax, setIntradayMax] = useState('20');
  const [optionsFlat, setOptionsFlat] = useState('20');
  const [futuresRate, setFuturesRate] = useState('0.03');
  const [futuresMax, setFuturesMax] = useState('20');

  // CSV Settings
  const [csvImportMode, setCsvImportMode] = useState<'append' | 'overwrite'>('append');

  // State for Interactive Importer
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFormat, setImportFormat] = useState<'Standard' | 'KotakNeo'>('KotakNeo');
  const [importPastedText, setImportPastedText] = useState('');
  const [parsedImportTrades, setParsedImportTrades] = useState<any[]>([]);
  const [isReviewingImport, setIsReviewingImport] = useState(false);

  // Danger Zone confirmation
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [yeSelectedFY, setYeSelectedFY] = useState('FY 2026-27');

  // Sync inputs on open
  useEffect(() => {
    if (isOpen) {
      setProfileNameInput(userName);
      setProfileAvatarInput(userAvatar);
      setResetConfirmInput('');
      
      // Load current charges config for first active broker
      const firstActive = brokerCharges.find(c => c.broker === selectedChargesBroker) || brokerCharges[0];
      if (firstActive) {
        setChargesForm(firstActive);
      }
    }
  }, [isOpen, userName, userAvatar, brokerCharges]);

  const setChargesForm = (config: BrokerChargesConfig) => {
    setDeliveryRate(config.deliveryRatePct.toString());
    setDeliveryMax(config.deliveryMaxFee.toString());
    setIntradayRate(config.intradayRatePct.toString());
    setIntradayMax(config.intradayMaxFee.toString());
    setOptionsFlat(config.optionsFlatFee.toString());
    setFuturesRate(config.futuresRatePct.toString());
    setFuturesMax(config.futuresMaxFee.toString());
  };

  const handleBrokerChargesChange = (broker: Broker) => {
    setSelectedChargesBroker(broker);
    const config = brokerCharges.find(c => c.broker === broker);
    if (config) {
      setChargesForm(config);
    }
  };



  if (!isOpen) return null;

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileNameInput.trim()) {
      alert('Please enter a display name.');
      return;
    }
    setProfile(profileNameInput.trim(), profileAvatarInput);
    alert('Display profile saved successfully!');
  };

  // Image to base64 converter
  const handleCustomPicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomPicError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        setCustomPicError('Image size must be less than 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setProfileAvatarInput(reader.result);
        }
      };
      reader.onerror = () => {
        setCustomPicError('Failed to read image file.');
      };
      reader.readAsDataURL(file);
    }
  };

  // CRUD Handlers
  const handleAddAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) {
      alert('Please enter account holder name.');
      return;
    }
    const cap = parseFloat(newAccCapital) || 0;
    if (cap < 0) {
      alert('Starting capital cannot be negative.');
      return;
    }
    addBrokerAccount({
      broker: newAccBroker,
      accountName: newAccName.trim(),
      startingCapital: cap,
      active: true
    });
    
    // Auto add to active list if not already
    if (!activeBrokers.includes(newAccBroker)) {
      setActiveBrokers([...activeBrokers, newAccBroker]);
    }
    
    setNewAccName('');
    setNewAccCapital('100000');
    alert('Broker Account successfully added!');
  };

  const handleAddBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim() || !newBankHolder.trim()) {
      alert('Please fill out all bank details.');
      return;
    }
    const bal = parseFloat(newBankBalance) || 0;
    addBankAccount({
      bankName: newBankName.trim(),
      accountHolderName: newBankHolder.trim(),
      startingBalance: bal,
      active: true
    });
    setNewBankName('');
    setNewBankHolder('');
    setNewBankBalance('50000');
    alert('Bank Account successfully added!');
  };

  const handleSaveCharges = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedCharges = brokerCharges.map((config) => {
      if (config.broker === selectedChargesBroker) {
        return {
          broker: selectedChargesBroker,
          deliveryRatePct: parseFloat(deliveryRate) || 0,
          deliveryMaxFee: parseFloat(deliveryMax) || 0,
          intradayRatePct: parseFloat(intradayRate) || 0,
          intradayMaxFee: parseFloat(intradayMax) || 0,
          optionsFlatFee: parseFloat(optionsFlat) || 0,
          futuresRatePct: parseFloat(futuresRate) || 0,
          futuresMaxFee: parseFloat(futuresMax) || 0
        };
      }
      return config;
    });

    updateBrokerCharges(updatedCharges);
    alert(`Successfully updated master charges configuration for ${selectedChargesBroker}!`);
  };

  const handleExportBackup = () => {
    try {
      const backupData = {
        trades,
        baseCapital,
        brokerAccounts,
        bankAccounts,
        brokerCharges,
        userName,
        userAvatar,
        activeBrokers,
        capitalAdjustments,
        investments,
        weeklyRetrospectives,
        bankTransactions,
        subscriptionExpenses,
        noTradeDays
      };
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const filename = `tradediary_backup_${new Date().toISOString().split('T')[0]}.json`;
      
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', filename);
      link.click();
    } catch (e) {
      alert('Failed to generate backup JSON file.');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && Array.isArray(parsed.trades)) {
            const overwrite = window.confirm("Are you sure you want to restore this JSON snapshot? This will replace your current data.");
            if (overwrite) {
              const userId = sessionUser?.id;
              const suffix = userId ? `_${userId}` : '';

              if (parsed.brokerAccounts) {
                localStorage.setItem(`traders_diary_broker_accounts${suffix}`, JSON.stringify(parsed.brokerAccounts));
                if (userId) syncMetaToCloud('broker_accounts', parsed.brokerAccounts);
              }
              if (parsed.bankAccounts) {
                localStorage.setItem(`traders_diary_bank_accounts${suffix}`, JSON.stringify(parsed.bankAccounts));
                if (userId) syncMetaToCloud('bank_accounts', parsed.bankAccounts);
              }
              if (parsed.brokerCharges) {
                localStorage.setItem(`traders_diary_broker_charges${suffix}`, JSON.stringify(parsed.brokerCharges));
                if (userId) syncMetaToCloud('broker_charges', parsed.brokerCharges);
              }
              if (parsed.userName) {
                localStorage.setItem(`traders_diary_user_name${suffix}`, parsed.userName);
                if (userId) syncMetaToCloud('user_name', parsed.userName);
              }
              if (parsed.userAvatar) {
                localStorage.setItem(`traders_diary_user_avatar${suffix}`, parsed.userAvatar);
                if (userId) syncMetaToCloud('user_avatar', parsed.userAvatar);
              }
              if (parsed.capitalAdjustments) {
                localStorage.setItem(`traders_diary_adjustments${suffix}`, JSON.stringify(parsed.capitalAdjustments));
                if (userId) syncMetaToCloud('capital_adjustments', parsed.capitalAdjustments);
              }
              if (parsed.investments) {
                localStorage.setItem(`traders_diary_investments${suffix}`, JSON.stringify(parsed.investments));
                if (userId) syncMetaToCloud('investments', parsed.investments);
              }
              if (parsed.weeklyRetrospectives) {
                localStorage.setItem(`traders_diary_weekly_retrospectives${suffix}`, JSON.stringify(parsed.weeklyRetrospectives));
                if (userId) syncMetaToCloud('weekly_retrospectives', parsed.weeklyRetrospectives);
              }
              if (parsed.bankTransactions) {
                localStorage.setItem(`traders_diary_bank_transactions${suffix}`, JSON.stringify(parsed.bankTransactions));
                if (userId) syncMetaToCloud('bank_transactions', parsed.bankTransactions);
              }
              if (parsed.subscriptionExpenses) {
                localStorage.setItem(`traders_diary_subscription_expenses${suffix}`, JSON.stringify(parsed.subscriptionExpenses));
                if (userId) syncMetaToCloud('subscription_expenses', parsed.subscriptionExpenses);
              }
              if (parsed.noTradeDays) {
                localStorage.setItem(`traders_diary_notradedays${suffix}`, JSON.stringify(parsed.noTradeDays));
                if (userId) syncMetaToCloud('notradedays', parsed.noTradeDays);
              }

              bulkImportTrades(parsed.trades, true);
              alert("System database successfully restored!");
              window.location.reload();
            }
          } else {
            alert("Invalid backup JSON format.");
          }
        } catch (error) {
          alert("Failed to parse snapshot file.");
        }
      };
    }
  };

  const handleParseImport = () => {
    if (!importPastedText.trim()) {
      alert("Please paste statement text first.");
      return;
    }

    try {
      if (importFormat === 'KotakNeo') {
        const executions = parseKotakNeoText(importPastedText);
        if (executions.length === 0) {
          alert("No valid trade executions found. Make sure you copy-pasted the Excel columns correctly starting with a date column (DD/MM/YYYY).");
          return;
        }
        const matched = matchExecutionsIntoTrades(executions);
        setParsedImportTrades(matched);
        setIsReviewingImport(true);
      }
    } catch (e: any) {
      alert("Parsing error: " + e.message);
    }
  };

  const handleConfirmImport = () => {
    if (parsedImportTrades.length === 0) return;
    const overwrite = csvImportMode === 'overwrite';
    bulkImportTrades(parsedImportTrades, overwrite);
    alert(`Successfully imported ${parsedImportTrades.length} trades into your diary!`);
    setIsImportModalOpen(false);
    setIsReviewingImport(false);
    setImportPastedText('');
    setParsedImportTrades([]);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        setImportPastedText(event.target?.result as string || '');
      };
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 3000 }}>
      <div 
        className="modal-content glass-card animate-fade-in" 
        style={{ 
          width: '840px', 
          maxWidth: '92vw', 
          height: '630px', 
          maxHeight: '90vh', 
          padding: 0, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          border: '1px solid var(--border-color-active)'
        }}
      >
        
        {/* Header */}
        <div 
          style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid var(--border-color)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'rgba(255,255,255,0.015)' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em', color: 'var(--text)' }}>
              Traders Settings & Master Profile
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="btn btn-secondary" 
            style={{ width: '28px', height: '28px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', border: 'none' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body Container */}
        <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
          
          {/* Sidebar */}
          <div 
            style={{ 
              width: '210px', 
              borderRight: '1px solid var(--border-color)', 
              background: 'rgba(255, 255, 255, 0.01)', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '6px', 
              padding: '16px', 
              flexShrink: 0 
            }}
          >
            <button 
              onClick={() => setActiveTab('profile')} 
              className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none', justifyContent: 'flex-start', fontSize: '0.8rem', padding: '8px 12px', gap: '8px' }}
            >
              <User size={14} color="#3b82f6" />
              <span>Profile & Accounts</span>
            </button>

            <button 
              onClick={() => setActiveTab('charges')} 
              className={`btn ${activeTab === 'charges' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none', justifyContent: 'flex-start', fontSize: '0.8rem', padding: '8px 12px', gap: '8px' }}
            >
              <Percent size={14} color="#ec4899" />
              <span>Charges Master</span>
            </button>

            <button 
              onClick={() => setActiveTab('backup')} 
              className={`btn ${activeTab === 'backup' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ border: 'none', justifyContent: 'flex-start', fontSize: '0.8rem', padding: '8px 12px', gap: '8px' }}
            >
              <Database size={14} color="#eab308" />
              <span>Backup & Spreadsheet</span>
            </button>

            <div style={{ flexGrow: 1 }} />

            <button 
              onClick={() => setActiveTab('danger')} 
              className={`btn ${activeTab === 'danger' ? 'btn-danger' : 'btn-secondary'}`}
              style={{ border: 'none', justifyContent: 'flex-start', fontSize: '0.8rem', padding: '8px 12px', gap: '8px', color: activeTab === 'danger' ? '#fff' : 'var(--color-loss)' }}
            >
              <ShieldAlert size={14} color="#ef4444" />
              <span>Danger Zone</span>
            </button>
          </div>

          {/* Content Area */}
          <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', background: 'rgba(0,0,0,0.1)' }}>
            
            {/* TAB 1: Profile & Accounts */}
            {activeTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Profile configurations */}
                <div className="glass-card" style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={14} color="var(--primary)" />
                    Profile Configurations
                  </h3>
                  
                  <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
<div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', width: '100%' }}>
                      {/* Profile Photo Preview */}
                      <div style={{ position: 'relative', width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.1)' }}>
                        {profileAvatarInput && profileAvatarInput.startsWith('data:image/') ? (
                          <img src={profileAvatarInput} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="profile preview" />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(135deg, var(--primary) 0%, rgba(6, 182, 212, 0.4) 100%)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '1.6rem'
                          }}>
                            {(profileNameInput || 'S').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: '10px' }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Display Name</label>
                          <input 
                            type="text" 
                            value={profileNameInput} 
                            onChange={(e) => setProfileNameInput(e.target.value)} 
                            className="form-input" 
                            placeholder="e.g. Sachin"
                            required 
                          />
                        </div>
                        
                        {/* Custom profile upload */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Upload Photo</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleCustomPicUpload} 
                              style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }} 
                            />
                            {profileAvatarInput && profileAvatarInput.startsWith('data:image/') && (
                              <button 
                                type="button" 
                                className="btn btn-secondary" 
                                style={{ padding: '2px 8px', fontSize: '0.65rem', color: 'var(--color-loss)', cursor: 'pointer' }}
                                onClick={() => setProfileAvatarInput('bull')}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          {customPicError && <div style={{ color: 'var(--color-loss)', fontSize: '0.62rem', marginTop: '2px' }}>{customPicError}</div>}
                        </div>
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '14px' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '6px' }}>Premium Theme Preset</label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[
                          { id: 'dark', label: 'Dark Theme', colors: ['#0b0b0d', '#0a84ff'] },
                          { id: 'light', label: 'Light Theme', colors: ['#ffffff', '#007aff'] }
                        ].map((t) => {
                          const isSelected = theme === t.id;
                          return (
                            <button
                              type="button"
                              key={t.id}
                              onClick={() => setTheme(t.id as any)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.72rem',
                                background: isSelected ? 'var(--primary-glow)' : 'rgba(255, 255, 255, 0.02)',
                                border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                flex: '1 0 130px',
                                justifyContent: 'flex-start'
                              }}
                            >
                              <div style={{ display: 'flex', gap: '3px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.colors[0], border: '1px solid rgba(255,255,255,0.2)' }} />
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.colors[1] }} />
                              </div>
                              <span style={{ fontWeight: isSelected ? 700 : 500 }}>{t.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '14px' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={useTwoRowHeader}
                          onChange={(e) => {
                            setUseTwoRowHeader(e.target.checked);
                            localStorage.setItem('traders_diary_two_row_header', e.target.checked ? 'true' : 'false');
                          }}
                          style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                        />
                        <span>Use Traditional Top Header Layout (Uncheck for Modern Sidebar)</span>
                      </label>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', margin: '2px 0 0 20px' }}>
                        Unchecking switches to a modern left sidebar layout that utilizes screen side-space on wide displays.
                      </p>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: '0.75rem' }}>
                      <Save size={12} />
                      <span>Save Display Profile</span>
                    </button>
                  </form>
                </div>

                {/* Broker Accounts Panel */}
                <div className="glass-card" style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Settings size={14} color="var(--primary)" />
                    Broker Accounts (Multiple Users)
                  </h3>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    Configure multiple trading accounts under different brokers (e.g. Dhan-Sachin vs. Dhan-Wife).
                  </p>

                  <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '12px', background: 'rgba(0,0,0,0.1)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '8px' }}>User/Account Name</th>
                          <th style={{ padding: '8px' }}>Broker</th>
                          <th style={{ padding: '8px' }}>Starting Capital</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Active</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brokerAccounts.map((acc) => (
                          <tr key={acc.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px', fontWeight: 600 }}>{acc.accountName}</td>
                            <td style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <BrokerLogoIcon broker={acc.broker} />
                            </td>
                            <td style={{ padding: '8px' }}>
                              <input 
                                type="number" 
                                value={acc.startingCapital} 
                                onChange={(e) => editBrokerAccount(acc.id, { startingCapital: parseFloat(e.target.value) || 0 })}
                                style={{ width: '90px', background: 'transparent', border: 'none', borderBottom: '1px dashed var(--border-color)', color: 'var(--text)', fontSize: '0.75rem', outline: 'none' }}
                              />
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={acc.active} 
                                onChange={() => editBrokerAccount(acc.id, { active: !acc.active })}
                                style={{ accentColor: 'var(--primary)' }}
                              />
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <button 
                                onClick={() => { if (confirm('Delete this broker account?')) deleteBrokerAccount(acc.id); }}
                                className="btn btn-secondary" 
                                style={{ padding: '2px 6px', color: 'var(--color-loss)', border: 'none' }}
                                disabled={brokerAccounts.length <= 1}
                              >
                                <Trash2 size={11} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <form onSubmit={handleAddAccountSubmit} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '100px' }}>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Broker</label>
                      <select value={newAccBroker} onChange={(e) => setNewAccBroker(e.target.value as Broker)} className="form-select" style={{ height: '28px', fontSize: '0.72rem', padding: '2px 8px' }}>
                        <option value="Zerodha">🪁 Zerodha</option>
                        <option value="Groww">🌿 Groww</option>
                        <option value="Angel One">😇 Angel One</option>
                        <option value="Upstox">📈 Upstox</option>
                        <option value="Fyers">🔥 Fyers</option>
                        <option value="Dhan">🎯 Dhan</option>
                        <option value="Kotak Neo">🦁 Kotak Neo</option>
                        <option value="Other">💼 Other</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: 2, minWidth: '120px' }}>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Account Holder Name</label>
                      <input type="text" value={newAccName} onChange={(e) => setNewAccName(e.target.value)} placeholder="e.g. Sachin / Wife" className="form-input" style={{ height: '28px', fontSize: '0.72rem', padding: '2px 8px' }} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '100px' }}>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Starting Capital</label>
                      <input type="number" value={newAccCapital} onChange={(e) => setNewAccCapital(e.target.value)} className="form-input" style={{ height: '28px', fontSize: '0.72rem', padding: '2px 8px' }} required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ height: '28px', padding: '0 10px', fontSize: '0.72rem' }}>
                      <Plus size={12} />
                      <span>Add</span>
                    </button>
                  </form>
                </div>

                {/* Bank Accounts Panel */}
                <div className="glass-card" style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IndianRupee size={14} color="var(--primary)" />
                    Linked Bank Accounts (Double-Entry Ledger)
                  </h3>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    Manage multiple bank accounts. Adjusting capital will trigger opposite transactional flows in these bank statements.
                  </p>

                  <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '12px', background: 'rgba(0,0,0,0.1)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '8px' }}>Bank Name</th>
                          <th style={{ padding: '8px' }}>Holder Name</th>
                          <th style={{ padding: '8px' }}>Starting Balance</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Active</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bankAccounts.map((bank) => (
                          <tr key={bank.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px', fontWeight: 600 }}>
                              <BankLogoBadge bankName={bank.bankName} />
                            </td>
                            <td style={{ padding: '8px' }}>{bank.accountHolderName}</td>
                            <td style={{ padding: '8px' }}>
                              <input 
                                type="number" 
                                value={bank.startingBalance} 
                                onChange={(e) => editBankAccount(bank.id, { startingBalance: parseFloat(e.target.value) || 0 })}
                                style={{ width: '90px', background: 'transparent', border: 'none', borderBottom: '1px dashed var(--border-color)', color: 'var(--text)', fontSize: '0.75rem', outline: 'none' }}
                              />
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={bank.active} 
                                onChange={() => editBankAccount(bank.id, { active: !bank.active })}
                                style={{ accentColor: 'var(--primary)' }}
                              />
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <button 
                                onClick={() => { if (confirm('Delete this bank account?')) deleteBankAccount(bank.id); }}
                                className="btn btn-secondary" 
                                style={{ padding: '2px 6px', color: 'var(--color-loss)', border: 'none' }}
                                disabled={bankAccounts.length <= 1}
                              >
                                <Trash2 size={11} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <form onSubmit={handleAddBankSubmit} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', background: 'rgba(255,255,255,0.01)', padding: '10px', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1.5, minWidth: '100px' }}>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Bank Name (e.g. SBI, HDFC)</label>
                      <input type="text" value={newBankName} onChange={(e) => setNewBankName(e.target.value)} placeholder="e.g. SBI" className="form-input" style={{ height: '28px', fontSize: '0.72rem', padding: '2px 8px' }} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1.5, minWidth: '120px' }}>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Holder Name</label>
                      <input type="text" value={newBankHolder} onChange={(e) => setNewBankHolder(e.target.value)} placeholder="e.g. Sachin" className="form-input" style={{ height: '28px', fontSize: '0.72rem', padding: '2px 8px' }} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '90px' }}>
                      <label style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Starting Bal</label>
                      <input type="number" value={newBankBalance} onChange={(e) => setNewBankBalance(e.target.value)} className="form-input" style={{ height: '28px', fontSize: '0.72rem', padding: '2px 8px' }} required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ height: '28px', padding: '0 10px', fontSize: '0.72rem' }}>
                      <Plus size={12} />
                      <span>Add Bank</span>
                    </button>
                  </form>
                </div>

                {/* Financial Years Lock Manager */}
                <div className="glass-card" style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={14} color="var(--primary)" />
                    Financial Years Data Locking (Security Safeguard)
                  </h3>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Lock historical financial years to prevent accidental deletions, edits, or modifications. Lock status can be toggled with confirmation.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {['FY 2026-27'].map((fy) => {
                      const isLocked = lockedFYs.includes(fy);
                      return (
                        <div 
                          key={fy} 
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '8px 12px', 
                            background: 'rgba(255,255,255,0.02)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '8px' 
                          }}
                        >
                          <div>
                            <strong style={{ fontSize: '0.78rem', color: 'var(--text-main)' }}>{fy}</strong>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: '8px' }}>
                              {isLocked ? '🔒 Locked (Read-Only)' : '🔓 Unlocked (Editable)'}
                            </span>
                          </div>
                          
                          <button
                            type="button"
                            className={`btn ${isLocked ? 'btn-secondary' : 'btn-danger'}`}
                            style={{ 
                              padding: '4px 10px', 
                              fontSize: '0.7rem', 
                              height: '26px',
                              borderRadius: '6px',
                              border: 'none',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              if (isLocked) {
                                if (window.confirm(`Are you sure you want to UNLOCK editing for ${fy}? Editing old logs might affect your past tax data. Proceed with caution.`)) {
                                  toggleLockFY(fy);
                                }
                              } else {
                                if (window.confirm(`Are you sure you want to LOCK editing for ${fy}? This will protect all trades and adjustments logged in this year from edits or deletes.`)) {
                                  toggleLockFY(fy);
                                }
                              }
                            }}
                          >
                            {isLocked ? 'Unlock Year' : 'Lock Year'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Broker Charges Configuration Master */}
            {activeTab === 'charges' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="glass-card" style={{ padding: '16px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Percent size={14} color="var(--primary)" />
                    Broker Charges Master Configurations
                  </h3>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    Customize brokerage rates for each broker to automate charge estimations on trades. Rates can be adjusted anytime as rules evolve.
                  </p>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch' }}>
                    
                    {/* Left: Broker list */}
                    <div style={{ width: '150px', display: 'flex', flexDirection: 'column', gap: '4px', borderRight: '1px solid var(--border-color)', paddingRight: '12px', flexShrink: 0 }}>
                      {['Zerodha', 'Groww', 'Angel One', 'Upstox', 'Fyers', 'Dhan', 'Kotak Neo', 'Other'].map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => handleBrokerChargesChange(b as Broker)}
                          className={`btn ${selectedChargesBroker === b ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ border: 'none', justifyContent: 'flex-start', padding: '6px 10px', fontSize: '0.72rem', height: '28px' }}
                        >
                          {b}
                        </button>
                      ))}
                    </div>

                    {/* Right: Selected Broker Overrides Form */}
                    <form onSubmit={handleSaveCharges} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {selectedChargesBroker} Fee Structure
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        
                        {/* Equity Delivery */}
                        <div style={{ background: 'rgba(255,255,255,0.01)', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>Equity Delivery</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                              <label style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Rate (%)</label>
                              <input type="number" step="0.001" value={deliveryRate} onChange={(e) => setDeliveryRate(e.target.value)} className="form-input" style={{ height: '28px', fontSize: '0.75rem', padding: '2px 6px' }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                              <label style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Max Cap (₹)</label>
                              <input type="number" value={deliveryMax} onChange={(e) => setDeliveryMax(e.target.value)} className="form-input" style={{ height: '28px', fontSize: '0.75rem', padding: '2px 6px' }} />
                            </div>
                          </div>
                        </div>

                        {/* Equity Intraday */}
                        <div style={{ background: 'rgba(255,255,255,0.01)', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>Equity Intraday</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                              <label style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Rate (%)</label>
                              <input type="number" step="0.001" value={intradayRate} onChange={(e) => setIntradayRate(e.target.value)} className="form-input" style={{ height: '28px', fontSize: '0.75rem', padding: '2px 6px' }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                              <label style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Max Cap (₹)</label>
                              <input type="number" value={intradayMax} onChange={(e) => setIntradayMax(e.target.value)} className="form-input" style={{ height: '28px', fontSize: '0.75rem', padding: '2px 6px' }} />
                            </div>
                          </div>
                        </div>

                        {/* Options Flat Fee */}
                        <div style={{ background: 'rgba(255,255,255,0.01)', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>F&O Options</span>
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Flat Fee per order (₹)</label>
                            <input type="number" value={optionsFlat} onChange={(e) => setOptionsFlat(e.target.value)} className="form-input" style={{ height: '28px', fontSize: '0.75rem', padding: '2px 6px' }} />
                          </div>
                        </div>

                        {/* Futures Rates */}
                        <div style={{ background: 'rgba(255,255,255,0.01)', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-main)', display: 'block', marginBottom: '8px' }}>F&O Futures / General</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                              <label style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Rate (%)</label>
                              <input type="number" step="0.001" value={futuresRate} onChange={(e) => setFuturesRate(e.target.value)} className="form-input" style={{ height: '28px', fontSize: '0.75rem', padding: '2px 6px' }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                              <label style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Max Cap (₹)</label>
                              <input type="number" value={futuresMax} onChange={(e) => setFuturesMax(e.target.value)} className="form-input" style={{ height: '28px', fontSize: '0.75rem', padding: '2px 6px' }} />
                            </div>
                          </div>
                        </div>

                      </div>

                      <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '6px 14px', fontSize: '0.75rem', marginTop: '6px' }}>
                        <Save size={12} />
                        <span>Save Broker Charges Override</span>
                      </button>
                    </form>
                  </div>
                </div>

                {/* Indian Tax Engine Info card */}
                <div className="glass-card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(255,255,255,0.01)' }}>
                  <HelpCircle size={15} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-main)', display: 'block', marginBottom: '2px' }}>Regulatory Calculations</span>
                    <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                      In addition to your customized brokerage rates, the system dynamically calculates standard Indian government levies (STT/CTT, GST @ 18% on brokerage+tx fee, Exchange Tx charges, Stamp Duty, and SEBI Turnover fees) based on the asset segment.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Backup & Spreadsheet */}
            {activeTab === 'backup' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Cloud Database Synchronization */}
                <div className="glass-card" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Database size={16} color="var(--primary)" />
                    Cloud Database Synchronization
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: '1.4' }}>
                    Synchronize your local diary data (trades, investments, bank logs, settings, and subscription logs) directly with your online Supabase cloud database.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-win)', boxShadow: '0 0 8px var(--color-win)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-main)', fontWeight: 600 }}>Sync Status: Connected to Cloud</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={async () => {
                        if (window.confirm("Are you sure you want to pull all data from the cloud? This will overwrite your local storage data with the online database (trades, investments, bank logs, and subscription logs).")) {
                          const success = await useTradeStore.getState().pullTradesFromCloud();
                          if (success) {
                            alert("Successfully synchronized and pulled all online data from Supabase cloud database to local diary!");
                            window.location.reload();
                          } else {
                            alert("Failed to sync. Please ensure you are logged in and connected to the internet.");
                          }
                        }
                      }} 
                      style={{ fontSize: '0.75rem', height: '32px' }}
                    >
                      <Download size={13} />
                      <span>Pull Online Logs to Local</span>
                    </button>

                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={async () => {
                        if (window.confirm("Are you sure you want to push all local data to the cloud? This will overwrite the online database with your current local data.")) {
                          const state = useTradeStore.getState();
                          try {
                            await syncMetaToCloud('investments', state.investments);
                            await syncMetaToCloud('capital_adjustments', state.capitalAdjustments);
                            await syncMetaToCloud('setups', state.setups);
                            await syncMetaToCloud('weekly_retrospectives', state.weeklyRetrospectives);
                            await syncMetaToCloud('broker_accounts', state.brokerAccounts);
                            await syncMetaToCloud('bank_accounts', state.bankAccounts);
                            await syncMetaToCloud('broker_charges', state.brokerCharges);
                            await syncMetaToCloud('subscription_expenses', state.subscriptionExpenses);
                            await syncMetaToCloud('bank_transactions', state.bankTransactions);
                            
                            for (const t of state.trades) {
                              await syncTradeToCloud('update', t);
                            }
                            alert("Successfully pushed all local logs, trades, and configurations to Supabase cloud database!");
                          } catch (e: any) {
                            alert("Sync push failed: " + e.message);
                          }
                        }
                      }} 
                      style={{ fontSize: '0.75rem', height: '32px', border: '1px solid var(--border-color)' }}
                    >
                      <Upload size={13} />
                      <span>Push Local Logs to Cloud</span>
                    </button>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Database size={16} color="var(--primary)" />
                    Database Snapshots (JSON)
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: '1.4' }}>
                    Export a full snapshot file of your trading accounts, bank balances, setups, and diary history to restore or migrate browsers.
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="button" className="btn btn-primary" onClick={handleExportBackup} style={{ fontSize: '0.75rem', height: '32px' }}>
                      <Download size={13} />
                      <span>Export JSON Snapshot</span>
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => document.getElementById('modal-json-file')?.click()} style={{ fontSize: '0.75rem', height: '32px' }}>
                      <Upload size={13} />
                      <span>Restore JSON File</span>
                    </button>
                    <input id="modal-json-file" type="file" accept=".json" onChange={handleImportBackup} style={{ display: 'none' }} />
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Percent size={16} color="var(--color-win)" />
                    Excel/CSV Spreadsheet Logs Sync
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    Bulk import trade logs from CSV spreadsheets. Download our template first to align column names.
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.75rem', padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px', width: 'fit-content', marginBottom: '14px' }}>
                    <span style={{ color: 'var(--text-dim)', fontWeight: 650 }}>Import Mode:</span>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input type="radio" name="modalCsvMode" checked={csvImportMode === 'append'} onChange={() => setCsvImportMode('append')} style={{ accentColor: 'var(--primary)' }} />
                      <span>Append</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <input type="radio" name="modalCsvMode" checked={csvImportMode === 'overwrite'} onChange={() => setCsvImportMode('overwrite')} style={{ accentColor: 'var(--color-loss)' }} />
                      <span style={{ color: csvImportMode === 'overwrite' ? 'var(--color-loss)' : 'inherit' }}>Overwrite</span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-primary" onClick={handleExportBackup} style={{ fontSize: '0.75rem', height: '32px' }}>
                      <Download size={13} />
                      <span>Export Logs (CSV)</span>
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsImportModalOpen(true)} style={{ fontSize: '0.75rem', height: '32px' }}>
                      <Upload size={13} />
                      <span>Bulk Import / Auto-Match Statements</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: Danger Zone */}
            {activeTab === 'danger' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Year-End Rollover & Lock Card */}
                <div className="glass-card" style={{ padding: '20px', border: '1.5px solid var(--primary)', background: 'var(--primary-glow)' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Database size={16} color="var(--primary)" />
                    Year-End Rollover & FY Close
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: '1.4' }}>
                    This will close the active Financial Year, carry forward the capital balances of all active broker accounts to the next Financial Year as opening deposits, and automatically lock the completed year from future edits.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>Select Year to Close:</span>
                      <select 
                        value={yeSelectedFY} 
                        onChange={(e) => setYeSelectedFY(e.target.value)} 
                        className="form-select" 
                        style={{ height: '28px', fontSize: '0.72rem', padding: '2px 8px', maxWidth: '120px' }}
                      >
                        <option value="FY 2026-27">FY 2026-27</option>
                      </select>
                      
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ height: '28px', fontSize: '0.72rem', padding: '0 12px' }}
                        onClick={() => {
                          const match = yeSelectedFY.match(/FY (\d{4})/);
                          if (!match) return;
                          const startYear = parseInt(match[1], 10);
                          const nextYear = startYear + 1;
                          const nextYearStr = `FY ${nextYear}-${(nextYear + 1).toString().slice(-2)}`;

                          // Perform carry forward rollover for each active broker account
                          const activeAccounts = brokerAccounts.filter(a => a.active);
                          if (activeAccounts.length === 0) {
                            alert("No active broker accounts found to perform rollover.");
                            return;
                          }

                          if (window.confirm(`[STEP 1/2] Are you sure you want to perform the Year-End Rollover for ${yeSelectedFY}? This will calculate the closing balances of all ${activeAccounts.length} active broker accounts and carry them forward to ${nextYearStr}.`)) {
                            if (window.confirm(`[STEP 2/2] Final Confirmation: Do you want to proceed and LOCK editing for ${yeSelectedFY}? Once completed, past records of this year cannot be modified unless explicitly unlocked.`)) {
                              
                              // Perform rollover for each account
                              activeAccounts.forEach(acc => {
                                // Filter trades by FY and broker account
                                const accTrades = trades.filter(t => t.brokerAccountId === acc.id);
                                const fyTrades = filterTradesByFY(accTrades, yeSelectedFY);
                                const accNetPnL = fyTrades.reduce((sum, t) => sum + t.netPnL, 0);

                                // Adjustments
                                const accAdjustments = capitalAdjustments.filter(a => {
                                  const matchFY = filterTradesByFY([a as any], yeSelectedFY).length > 0;
                                  return matchFY && a.brokerAccountId === acc.id;
                                });
                                const accNetAdj = accAdjustments.reduce((sum, a) => a.type === 'DEPOSIT' ? sum + a.amount : sum - a.amount, 0);

                                const endingBalance = acc.startingCapital + accNetPnL + accNetAdj;
                                const nextFYDate = `${nextYear}-04-01`;

                                // Delete duplicate rollover if exists
                                const existing = capitalAdjustments.find(a => 
                                  a.date === nextFYDate && 
                                  a.notes?.startsWith("Rollover Carry-Forward") &&
                                  a.brokerAccountId === acc.id
                                );
                                if (existing) {
                                  useTradeStore.getState().deleteCapitalAdjustment(existing.id);
                                }

                                // Log carry forward deposit
                                useTradeStore.getState().addCapitalAdjustment({
                                  date: nextFYDate,
                                  time: "09:00",
                                  type: 'DEPOSIT',
                                  amount: Math.round(endingBalance * 100) / 100,
                                  notes: `Rollover Carry-Forward from ${yeSelectedFY}`,
                                  broker: acc.broker,
                                  brokerAccountId: acc.id
                                });
                              });

                              // Lock the year
                              if (!lockedFYs.includes(yeSelectedFY)) {
                                toggleLockFY(yeSelectedFY);
                              }

                              alert(`Successfully completed Year-End process for ${yeSelectedFY}! Closing balances have been carried forward to ${nextYearStr} opening capital, and the year ${yeSelectedFY} is now locked.`);
                            }
                          }
                        }}
                      >
                        Run Year-End Process
                      </button>
                    </div>
                  </div>
                </div>

                <div className="glass-card" style={{ padding: '20px', border: '1.5px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.02)' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px', color: 'var(--color-loss)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={16} color="var(--color-loss)" />
                    System Reset Danger Zone
                  </h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: '1.4' }}>
                    Resetting will wipe all trades, weekly retrospectives, setups, adjustments, and preferences, restoring original guest mock data. This is irreversible.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>To confirm, type <strong style={{ color: 'var(--color-loss)' }}>RESET</strong>:</span>
                      <input 
                        type="text" 
                        value={resetConfirmInput} 
                        onChange={(e) => setResetConfirmInput(e.target.value)} 
                        placeholder="Type RESET"
                        className="form-input" 
                        style={{ maxWidth: '100px', height: '28px', fontSize: '0.78rem', borderColor: resetConfirmInput === 'RESET' ? 'var(--color-loss)' : 'var(--border-color)' }}
                      />
                      <button 
                        type="button" 
                        className="btn btn-danger" 
                        disabled={resetConfirmInput !== 'RESET'}
                        onClick={() => {
                          if (window.confirm('Wipe database and restore mock trading data?')) {
                            resetToMockData();
                            setResetConfirmInput('');
                            alert('System reset successfully completed.');
                            onClose();
                          }
                        }}
                        style={{ opacity: resetConfirmInput === 'RESET' ? 1 : 0.5, cursor: resetConfirmInput === 'RESET' ? 'pointer' : 'not-allowed', height: '28px', fontSize: '0.75rem' }}
                      >
                        <Trash2 size={12} />
                        <span>Confirm Reset Database</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* SaaS Account Details */}
                <div className="glass-card" style={{ padding: '20px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={16} color="var(--primary)" />
                    Active SaaS Account Details
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                      <span>Email:</span>
                      <strong style={{ color: 'var(--text-main)' }}>{sessionUser?.email || 'Guest Session'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                      <span>User ID:</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-main)' }}>{sessionUser?.id || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px' }}>
                      <span>Sync Provider:</span>
                      <span style={{ color: 'var(--text-main)' }}>{sessionUser?.app_metadata?.provider || 'None (Local Cache)'}</span>
                    </div>
                    {sessionUser && (
                      <button 
                        type="button" 
                        className="btn btn-danger" 
                        onClick={() => { if (window.confirm('Sign out?')) { signOutUser(); onClose(); } }}
                        style={{ width: '100%', justifyContent: 'center', marginTop: '6px' }}
                      >
                        <span>Sign Out of Account</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>

      {/* Interactive Statement Importer Modal Overlay */}
      {isImportModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 4000, background: 'rgba(0,0,0,0.7)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content glass-card animate-fade-in" style={{ width: '780px', maxWidth: '92vw', height: '520px', maxHeight: '85vh', padding: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--border-color-active)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Upload size={18} color="var(--primary)" />
                  Kotak Neo Excel / CSV Statement Importer
                </h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Paste raw text copied directly from your Kotak Neo Excel/CSV transaction statements. We will auto-match buys and sells.
                </p>
              </div>
              <button type="button" onClick={() => { setIsImportModalOpen(false); setIsReviewingImport(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {!isReviewingImport ? (
                <>
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-dim)' }}>Select Format:</span>
                      <select value={importFormat} onChange={(e) => setImportFormat(e.target.value as any)} className="form-select" style={{ fontSize: '0.75rem', height: '32px', padding: '4px 8px' }}>
                        <option value="KotakNeo">Kotak Neo Transaction Statement (Excel Columns)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-dim)' }}>Upload File (Optional):</span>
                      <input type="file" accept=".csv,.txt,.xls,.xlsx" onChange={handleImportFileChange} style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 650, color: 'var(--text-dim)' }}>Paste Excel Data (Copy cells from Trade Date to STT/CTT and paste below):</span>
                    <textarea 
                      value={importPastedText} 
                      onChange={(e) => setImportPastedText(e.target.value)} 
                      placeholder="05/03/2026	09:41:50	09:41:50	Coal India Ltd	INE522F01014	NSE	Kotak Neo	Sell	Cash	160	448.55	71768	2.2	10	3.27	15.47	8.96&#10;05/03/2026	09:34:08	09:34:08	Coal India Ltd	INE522F01014	NSE	Kotak Neo	Buy	Cash	160	452.397	72383.5	2.2	10	3.3	15.52	9.04"
                      className="form-input" 
                      style={{ flex: 1, minHeight: '180px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', padding: '12px', background: 'rgba(0,0,0,0.2)', resize: 'none' }}
                    />
                  </div>
                </>
              ) : (
                /* Review / Preview Panel */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      🔍 Parsed {parsedImportTrades.length} matched trades from Kotak Neo:
                    </span>
                    <button type="button" onClick={() => setIsReviewingImport(false)} className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '4px 10px', height: '26px' }}>
                      Back to Paste
                    </button>
                  </div>
                  
                  <div style={{ flex: 1, border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'auto', background: 'rgba(0,0,0,0.1)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '8px' }}>Date</th>
                          <th style={{ padding: '8px' }}>Symbol</th>
                          <th style={{ padding: '8px' }}>Type</th>
                          <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Buy Px</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Sell Px</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>Net P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedImportTrades.map((t, idx) => {
                          const netPnL = t.action === 'BUY' 
                            ? (t.exitPrice - t.entryPrice) * t.qty - t.manualBrokerage - t.manualTaxes
                            : (t.entryPrice - t.exitPrice) * t.qty - t.manualBrokerage - t.manualTaxes;
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                              <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{t.date}</td>
                              <td style={{ padding: '8px', fontWeight: 600, color: 'var(--text-main)' }}>{t.symbol}</td>
                              <td style={{ padding: '8px' }}>
                                <span style={{ fontSize: '0.62rem', padding: '2px 6px', borderRadius: '4px', background: t.product === 'Intraday' ? 'rgba(59,130,246,0.15)' : 'rgba(168,85,247,0.15)', color: t.product === 'Intraday' ? '#3b82f6' : '#a855f7', fontWeight: 700 }}>
                                  {t.product}
                                </span>
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center', color: 'var(--text-muted)' }}>{t.qty}</td>
                              <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>₹{t.entryPrice.toFixed(2)}</td>
                              <td style={{ padding: '8px', textAlign: 'right', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>₹{t.exitPrice.toFixed(2)}</td>
                              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)', fontFamily: 'var(--font-mono)' }}>
                                ₹{Math.round(netPnL).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setIsImportModalOpen(false); setIsReviewingImport(false); }} style={{ fontSize: '0.75rem', height: '32px' }}>
                Cancel
              </button>
              {!isReviewingImport ? (
                <button type="button" className="btn btn-primary" onClick={handleParseImport} style={{ fontSize: '0.75rem', height: '32px' }}>
                  Analyze & Parse Data
                </button>
              ) : (
                <button type="button" className="btn btn-primary" onClick={handleConfirmImport} style={{ fontSize: '0.75rem', height: '32px' }}>
                  Confirm Import {parsedImportTrades.length} Trades
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
