import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
  maxHeight?: string;
  zIndex?: number;
  closeOnBackdropClick?: boolean;
  confirmOnEscape?: boolean;
  confirmMessage?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  headerActions,
  footer,
  children,
  maxWidth = '640px',
  maxHeight = '90vh',
  zIndex = 99999,
  closeOnBackdropClick = false,
  confirmOnEscape = false,
  confirmMessage = 'Do you want to discard unsaved changes and close?',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmOnEscape && !window.confirm(confirmMessage)) return;
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, confirmOnEscape, confirmMessage]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay"
      style={{ zIndex }}
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      <div
        className="modal-content glass-card animate-fade-in"
        style={{
          padding: 0,
          width: '95vw',
          maxWidth,
          maxHeight,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || icon || headerActions) && (
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              {icon}
              <div style={{ minWidth: 0 }}>
                {typeof title === 'string' ? (
                  <h2 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {title}
                  </h2>
                ) : (
                  title
                )}
                {subtitle && (
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {subtitle}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {headerActions}
              <button
                type="button"
                className="btn-secondary modal-close-icon"
                style={{ padding: '6px', borderRadius: '50%', border: 'none', background: 'transparent', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={onClose}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        <div className="modal-body" style={{ overflowY: 'auto', flexGrow: 1, padding: '20px' }}>
          {children}
        </div>

        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};
