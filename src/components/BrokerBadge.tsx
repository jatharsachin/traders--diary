import { BROKER_LOGOS } from '../utils/brandLogos';
import type { Broker } from '../types';

export function BrokerBadge({ broker }: { broker?: Broker }) {
  if (!broker) return null;

  const colors: Record<Broker, { bg: string; text: string; border: string }> = {
    'Zerodha': { bg: 'rgba(56, 126, 209, 0.12)', text: '#60a5fa', border: 'rgba(56, 126, 209, 0.35)' },
    'Groww': { bg: 'rgba(0, 208, 156, 0.12)', text: '#34d399', border: 'rgba(0, 208, 156, 0.35)' },
    'Angel One': { bg: 'rgba(0, 82, 204, 0.12)', text: '#38bdf8', border: 'rgba(0, 82, 204, 0.35)' },
    'Upstox': { bg: 'rgba(162, 114, 255, 0.12)', text: '#c084fc', border: 'rgba(162, 114, 255, 0.35)' },
    'Fyers': { bg: 'rgba(51, 205, 95, 0.12)', text: '#4ade80', border: 'rgba(51, 205, 95, 0.35)' },
    'Dhan': { bg: 'rgba(234, 179, 8, 0.14)', text: '#fbbf24', border: 'rgba(234, 179, 8, 0.35)' },
    'Kotak Neo': { bg: 'rgba(239, 68, 68, 0.12)', text: '#f87171', border: 'rgba(239, 68, 68, 0.35)' },
    'Other': { bg: 'rgba(148, 163, 184, 0.12)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.28)' },
  };

  const config = colors[broker] || colors['Other'];
  const localLogo = BROKER_LOGOS[broker] || BROKER_LOGOS['Other'];

  return (
    <span 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '5px', 
        background: config.bg, 
        color: config.text, 
        padding: '2px 7px', 
        borderRadius: '6px', 
        fontSize: '0.68rem', 
        fontWeight: 700,
        letterSpacing: '0.015em',
        border: `1px solid ${config.border}`,
        whiteSpace: 'nowrap'
      }}
    >
      <img
        src={localLogo}
        alt={broker}
        style={{
          width: '13px',
          height: '13px',
          borderRadius: '50%',
          objectFit: 'contain',
          background: '#fff',
          padding: '1px',
          flexShrink: 0
        }}
      />
      <span>{broker}</span>
    </span>
  );
}
