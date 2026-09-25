import { BROKER_LOGOS } from '../utils/brandLogos';
import type { Broker } from '../types';

export function BrokerBadge({ broker }: { broker?: Broker }) {
  if (!broker) return null;

  const colors: Record<Broker, { bg: string; text: string; dot: string }> = {
    'Zerodha': { bg: 'rgba(56, 126, 209, 0.12)', text: '#387ed1', dot: '#387ed1' },
    'Groww': { bg: 'rgba(0, 208, 156, 0.12)', text: '#00d09c', dot: '#00d09c' },
    'Angel One': { bg: 'rgba(0, 82, 204, 0.12)', text: '#0052cc', dot: '#0052cc' },
    'Upstox': { bg: 'rgba(162, 114, 255, 0.12)', text: '#a272ff', dot: '#a272ff' },
    'Fyers': { bg: 'rgba(51, 205, 95, 0.12)', text: '#33cd5f', dot: '#33cd5f' },
    'Dhan': { bg: 'rgba(229, 193, 88, 0.12)', text: '#e5c158', dot: '#e5c158' },
    'Kotak Neo': { bg: 'rgba(230, 28, 36, 0.12)', text: '#e61c24', dot: '#e61c24' },
    'Other': { bg: 'rgba(120, 120, 120, 0.12)', text: '#888888', dot: '#888888' },
  };

  const config = colors[broker] || colors['Other'];
  const localLogo = BROKER_LOGOS[broker] || BROKER_LOGOS['Other'];

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
      <img
        src={localLogo}
        alt={broker}
        style={{
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          objectFit: 'contain',
          background: '#fff',
          padding: '1px'
        }}
      />
      {broker}
    </span>
  );
}
