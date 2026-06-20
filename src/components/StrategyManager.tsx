import React, { useState } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { Plus, Trash2, ShieldAlert, Award, Star, Compass } from 'lucide-react';

export function StrategyManager() {
  const { setups, addSetup, deleteSetup, trades } = useTradeStore();
  const [newSetupName, setNewSetupName] = useState('');
  const [newSetupDesc, setNewSetupDesc] = useState('');
  const [error, setError] = useState('');

  // Calculate statistics for each setup
  const getSetupStats = (setupName: string) => {
    const setupTrades = trades.filter((t) => t.strategy === setupName);
    const count = setupTrades.length;

    if (count === 0) {
      return { count: 0, winRate: 0, netPnL: 0, avgPnL: 0 };
    }

    const wins = setupTrades.filter((t) => t.netPnL > 0).length;
    const winRate = (wins / count) * 100;
    const netPnL = setupTrades.reduce((acc, t) => acc + t.netPnL, 0);
    const avgPnL = netPnL / count;

    return {
      count,
      winRate: Math.round(winRate * 10) / 10,
      netPnL: Math.round(netPnL * 100) / 100,
      avgPnL: Math.round(avgPnL * 100) / 100,
    };
  };

  const handleAddSetup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newSetupName.trim()) {
      setError('Strategy name cannot be empty.');
      return;
    }

    // Check duplicate
    if (setups.some((s) => s.name.toLowerCase() === newSetupName.trim().toLowerCase())) {
      setError('A strategy with this name already exists.');
      return;
    }

    if (!window.confirm('Are you sure you want to add this strategy setup tag?')) {
      return;
    }

    addSetup({
      name: newSetupName.trim(),
      description: newSetupDesc.trim() || 'No description provided.',
    });

    setNewSetupName('');
    setNewSetupDesc('');
  };

  const formatCurrency = (val: number) => {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });
    return formatter.format(val);
  };

  // Find best performing strategy
  const getBestStrategy = () => {
    if (setups.length === 0) return null;
    
    let bestName = '';
    let maxPnL = -Infinity;

    setups.forEach((s) => {
      const stats = getSetupStats(s.name);
      if (stats.count > 0 && stats.netPnL > maxPnL) {
        maxPnL = stats.netPnL;
        bestName = s.name;
      }
    });

    return maxPnL > 0 ? { name: bestName, pnl: maxPnL } : null;
  };

  const bestStrategy = getBestStrategy();

  return (
    <div className="animate-tab-panel grid-2col-2-1">
      
      {/* List & Stats */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>Strategies & Setups Matrix</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Performance breakdown and Win Rate per setup tag
            </p>
          </div>
          
          {bestStrategy && (
            <div 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px', 
                backgroundColor: 'rgba(250, 204, 21, 0.1)', 
                border: '1px solid rgba(250, 204, 21, 0.2)',
                color: '#facc15',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              <Award size={14} />
              <span>Best: {bestStrategy.name} ({formatCurrency(bestStrategy.pnl)})</span>
            </div>
          )}
        </div>

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Strategy Name & Description</th>
                <th style={{ textAlign: 'center' }}>Trades</th>
                <th style={{ textAlign: 'center' }}>Win Rate</th>
                <th>Net P&L</th>
                <th>Avg / Trade</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {setups.map((setup) => {
                const stats = getSetupStats(setup.name);
                const isProfit = stats.netPnL >= 0;
                
                return (
                  <tr key={setup.name}>
                    <td style={{ maxWidth: '280px' }}>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {bestStrategy?.name === setup.name && <Star size={12} fill="#facc15" color="#facc15" />}
                        {setup.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'normal' }}>
                        {setup.description}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      {stats.count}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      {stats.count > 0 ? `${stats.winRate}%` : '-'}
                    </td>
                    <td 
                      style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontWeight: 700, 
                        color: stats.count > 0 ? (isProfit ? 'var(--color-win)' : 'var(--color-loss)') : 'var(--text-dim)'
                      }}
                    >
                      {stats.count > 0 ? `${isProfit ? '+' : ''}${formatCurrency(stats.netPnL)}` : 'No Trades'}
                    </td>
                    <td 
                      style={{ 
                        fontFamily: 'var(--font-mono)',
                        color: stats.count > 0 ? (stats.avgPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)') : 'var(--text-dim)'
                      }}
                    >
                      {stats.count > 0 ? formatCurrency(stats.avgPnL) : '-'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '6px' }}
                          title="Delete Strategy"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete strategy "${setup.name}"?`)) {
                              deleteSetup(setup.name);
                            }
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Setup Form */}
      <div className="glass-card" style={{ padding: '24px', height: 'fit-content' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={18} className="text-primary" style={{ color: 'var(--primary)' }} />
          Create Strategy Tag
        </h2>

        <form onSubmit={handleAddSetup}>
          {error && (
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                backgroundColor: 'var(--color-loss-bg)', 
                border: '1px solid var(--color-loss-border)', 
                color: 'var(--color-loss)',
                padding: '10px',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '0.8rem'
              }}
            >
              <ShieldAlert size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Strategy Name</label>
            <input
              type="text"
              placeholder="e.g. CPR Reversal"
              value={newSetupName}
              onChange={(e) => setNewSetupName(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Setup Description</label>
            <textarea
              placeholder="Describe trigger conditions, timeframe, indicators..."
              value={newSetupDesc}
              onChange={(e) => setNewSetupDesc(e.target.value)}
              className="form-textarea"
              rows={4}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }}>
            <Plus size={16} />
            Add Strategy Tag
          </button>
        </form>
      </div>

    </div>
  );
}
