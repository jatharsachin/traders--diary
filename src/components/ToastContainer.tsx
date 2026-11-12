import React, { useEffect, useState } from 'react';
import { toast, type ToastItem } from '../utils/toast';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((items) => {
      setToasts(items);
    });
    return unsubscribe;
  }, []);

  if (toasts.length === 0) return null;

  const getToastConfig = (type: ToastItem['type']) => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 size={16} color="#34d399" />,
          borderColor: 'rgba(52, 211, 153, 0.4)',
          bg: 'rgba(16, 185, 129, 0.14)',
          textColor: '#34d399'
        };
      case 'error':
        return {
          icon: <AlertCircle size={16} color="#f87171" />,
          borderColor: 'rgba(248, 113, 113, 0.4)',
          bg: 'rgba(239, 68, 68, 0.14)',
          textColor: '#f87171'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={16} color="#fbbf24" />,
          borderColor: 'rgba(251, 191, 36, 0.4)',
          bg: 'rgba(245, 158, 11, 0.14)',
          textColor: '#fbbf24'
        };
      default:
        return {
          icon: <Info size={16} color="#60a5fa" />,
          borderColor: 'rgba(96, 165, 250, 0.4)',
          bg: 'rgba(59, 130, 246, 0.14)',
          textColor: '#60a5fa'
        };
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
        maxWidth: '380px',
        width: 'calc(100% - 40px)'
      }}
    >
      {toasts.map((item) => {
        const config = getToastConfig(item.type);
        return (
          <div
            key={item.id}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'rgba(18, 20, 29, 0.94)',
              border: `1.5px solid ${config.borderColor}`,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(0,0,0,0.2)',
              animation: 'toastSlideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0, flex: 1 }}>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {config.icon}
              </div>
              <span 
                style={{ 
                  fontSize: '0.78rem', 
                  fontWeight: 600, 
                  color: 'var(--text-main)', 
                  lineHeight: '1.35',
                  wordBreak: 'break-word'
                }}
              >
                {item.message}
              </span>
            </div>
            <button
              onClick={() => toast.dismiss(item.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0
              }}
              title="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
