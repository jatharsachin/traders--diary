import React, { useState } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import { 
  Plus, Trash2, Edit2, ShieldAlert, Award, Star, Compass, 
  BarChart2 as LucideBarChart
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts';

export function StrategyManager() {
  const { setups, addSetup, editSetup, deleteSetup, trades } = useTradeStore();
  const [newSetupName, setNewSetupName] = useState('');
  const [newSetupDesc, setNewSetupDesc] = useState('');
  const [editOldName, setEditOldName] = useState<string | null>(null);
  const [selectedStrategyName, setSelectedStrategyName] = useState<string | null>(null);
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

    const nameClean = newSetupName.trim();
    const descClean = newSetupDesc.trim() || 'No description provided.';

    if (!nameClean) {
      setError('Strategy name cannot be empty.');
      return;
    }

    // Check duplicate
    const isDuplicate = setups.some(
      (s) => s.name.toLowerCase() === nameClean.toLowerCase() && s.name !== editOldName
    );
    if (isDuplicate) {
      setError('A strategy with this name already exists.');
      return;
    }

    if (editOldName) {
      if (!window.confirm(`Are you sure you want to update strategy "${editOldName}"? This will also rename all associated trades.`)) {
        return;
      }
      editSetup(editOldName, { name: nameClean, description: descClean });
      setEditOldName(null);
      alert('Strategy updated successfully!');
    } else {
      if (!window.confirm('Are you sure you want to add this strategy setup tag?')) {
        return;
      }
      addSetup({ name: nameClean, description: descClean });
      alert('Strategy tag added successfully!');
    }

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

  // Curated premium HSL colors for Pie chart slices
  const PIE_COLORS = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#ec4899', // pink
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#ef4444', // red
    '#14b8a6'  // teal
  ];

  const chartData = setups.map((s) => {
    const stats = getSetupStats(s.name);
    return {
      name: s.name,
      trades: stats.count,
      netPnL: stats.netPnL,
      winRate: stats.winRate
    };
  }).filter(d => d.trades > 0);

  const hasChartData = chartData.length > 0;

  return (
    <div className="animate-tab-panel grid-2col-2-1">
      
      {/* List & Stats */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem' }}>Strategies & Setups Matrix</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              Performance breakdown and Win Rate per setup tag
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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

            {/* Common Action Toolbar */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!selectedStrategyName}
                onClick={() => {
                  if (selectedStrategyName) {
                    const matched = setups.find(s => s.name === selectedStrategyName);
                    if (matched) {
                      setEditOldName(matched.name);
                      setNewSetupName(matched.name);
                      setNewSetupDesc(matched.description);
                    }
                  }
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: selectedStrategyName ? 1 : 0.5,
                  cursor: selectedStrategyName ? 'pointer' : 'not-allowed',
                  height: '32px'
                }}
              >
                <Edit2 size={12} />
                <span>Edit Strategy</span>
              </button>
              
              <button
                type="button"
                className="btn btn-danger"
                disabled={!selectedStrategyName}
                onClick={() => {
                  if (selectedStrategyName) {
                    if (window.confirm(`Are you sure you want to delete strategy "${selectedStrategyName}"?`)) {
                      deleteSetup(selectedStrategyName);
                      setSelectedStrategyName(null);
                    }
                  }
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: selectedStrategyName ? 1 : 0.5,
                  cursor: selectedStrategyName ? 'pointer' : 'not-allowed',
                  height: '32px'
                }}
              >
                <Trash2 size={12} />
                <span>Delete Strategy</span>
              </button>
            </div>
          </div>
        </div>

        {!selectedStrategyName && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '12px', background: 'rgba(255,255,255,0.01)', padding: '6px 12px', borderRadius: '6px', border: '1px dashed var(--border-color)' }}>
            💡 Click on any strategy row in the list below to select it, then use the toolbar to Edit or Delete.
          </div>
        )}

        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Strategy Name & Description</th>
                <th style={{ textAlign: 'center' }}>Trades</th>
                <th style={{ textAlign: 'center' }}>Win Rate</th>
                <th>Net P&L</th>
                <th>Avg / Trade</th>
              </tr>
            </thead>
            <tbody>
              {setups.map((setup) => {
                const stats = getSetupStats(setup.name);
                const isProfit = stats.netPnL >= 0;
                const isSelected = selectedStrategyName === setup.name;
                
                return (
                  <tr 
                    key={setup.name}
                    onClick={() => setSelectedStrategyName(isSelected ? null : setup.name)}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      background: isSelected ? 'var(--primary-glow)' : 'transparent',
                      cursor: 'pointer'
                    }}
                  >
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
          {editOldName ? 'Edit Strategy Tag' : 'Create Strategy Tag'}
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

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            {editOldName && (
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setEditOldName(null);
                  setNewSetupName('');
                  setNewSetupDesc('');
                }}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            )}
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
              <Plus size={16} />
              {editOldName ? 'Save Changes' : 'Add Strategy Tag'}
            </button>
          </div>
        </form>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="glass-card" style={{ gridColumn: 'span 2', padding: '24px', marginTop: '20px' }}>
        <h3 style={{ fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LucideBarChart size={18} color="var(--primary)" />
          Strategy Performance & Distribution Visualizer
        </h3>
        
        {!hasChartData ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)', border: '1px dashed var(--border-color)', borderRadius: '10px' }}>
            💡 No trade data recorded for your strategies yet. Add strategy tags when logging your trades in Log Trade or Logs tabs to view visual performance analytics.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            
            {/* Chart 1: Net P&L per Strategy */}
            <div style={{ background: 'rgba(255,255,255,0.015)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 600 }}>
                Net P&L comparison per Strategy
              </h4>
              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <XAxis 
                      dataKey="name" 
                      stroke="var(--text-dim)" 
                      fontSize={10} 
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="var(--text-dim)" 
                      fontSize={10} 
                      tickLine={false} 
                      tickFormatter={(value) => {
                        const absVal = Math.abs(value);
                        if (absVal >= 100000) return `${(value / 100000).toFixed(1)}L`;
                        if (absVal >= 1000) return `${(value / 1000).toFixed(0)}k`;
                        return value;
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{ background: 'var(--bg-tooltip-opaque)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.78rem' }}
                      labelStyle={{ color: 'var(--text-main)', fontWeight: 'bold' }}
                      formatter={(value) => [formatCurrency(Number(value)), 'Net P&L']}
                    />
                    <Bar dataKey="netPnL">
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.netPnL >= 0 ? 'var(--color-win)' : 'var(--color-loss)'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Trade Distribution */}
            <div style={{ background: 'rgba(255,255,255,0.015)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '16px', fontWeight: 600 }}>
                Trade Volume Share per Setup
              </h4>
              <div style={{ width: '100%', height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="trades"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      labelLine={false}
                      label={({ name, percent }: any) => (percent !== undefined && percent > 0.05) ? `${name} (${(percent * 100).toFixed(0)}%)` : ''}
                      style={{ fontSize: '0.62rem', fill: 'var(--text-main)', fontWeight: 600 }}
                    >
                      {chartData.map((_, index) => (
                        <Cell 
                          key={`cell-pie-${index}`} 
                          fill={PIE_COLORS[index % PIE_COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-tooltip-opaque)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.78rem' }}
                      formatter={(value, name) => [`${value} trades`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
