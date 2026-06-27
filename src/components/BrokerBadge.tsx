import { useState } from 'react';
import type { Broker } from '../types';

export function BrokerBadge({ broker }: { broker?: Broker }) {
  if (!broker) return null;
  const [imgError, setImgError] = useState(false);

  const colors: Record<Broker, { bg: string; text: string; dot: string; domain?: string }> = {
    'Zerodha': { bg: 'rgba(56, 126, 209, 0.12)', text: '#387ed1', dot: '#387ed1', domain: 'zerodha.com' },
    'Groww': { bg: 'rgba(0, 208, 156, 0.12)', text: '#00d09c', dot: '#00d09c', domain: 'groww.in' },
    'Angel One': { bg: 'rgba(0, 82, 204, 0.12)', text: '#0052cc', dot: '#0052cc', domain: 'angelone.in' },
    'Upstox': { bg: 'rgba(162, 114, 255, 0.12)', text: '#a272ff', dot: '#a272ff', domain: 'upstox.com' },
    'Fyers': { bg: 'rgba(51, 205, 95, 0.12)', text: '#33cd5f', dot: '#33cd5f', domain: 'fyers.in' },
    'Dhan': { bg: 'rgba(229, 193, 88, 0.12)', text: '#e5c158', dot: '#e5c158', domain: 'dhan.co' },
    'Kotak Neo': { bg: 'rgba(230, 28, 36, 0.12)', text: '#e61c24', dot: '#e61c24', domain: 'kotaksecurities.com' },
    'Other': { bg: 'rgba(120, 120, 120, 0.12)', text: '#888888', dot: '#888888' },
  };

  const config = colors[broker] || colors['Other'];
  const initial = broker.charAt(0);
  const logoUrl = config.domain ? `https://logo.clearbit.com/${config.domain}` : null;

  return (
    <span 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '6px', 
        background: config.bg, 
        color: config.text, 
        padding: '3px 8px', 
        borderRadius: '12px', 
        fontSize: '0.72rem', 
        fontWeight: 600,
        border: `1px solid ${config.bg}`
      }}
    >
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={broker}
          onError={() => setImgError(true)}
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '4px',
            objectFit: 'contain',
            background: '#fff',
            padding: '1px'
          }}
        />
      ) : (
        <span 
          style={{ 
            width: '12px', 
            height: '12px', 
            borderRadius: '50%', 
            background: config.dot, 
            color: '#fff', 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '0.55rem',
            fontWeight: 800
          }}
        >
          {initial}
        </span>
      )}
      {broker}
    </span>
  );
}
