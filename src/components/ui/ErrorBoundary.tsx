import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[TabErrorBoundary] ${this.props.fallbackTitle || 'Section'}:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          className="td-panel" 
          style={{
            margin: '24px auto',
            maxWidth: '650px',
            padding: '28px',
            borderRadius: '16px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            background: 'rgba(239, 68, 68, 0.04)',
            boxShadow: '0 12px 30px rgba(0, 0, 0, 0.25)',
            textAlign: 'center'
          }}
        >
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.12)',
            color: 'var(--color-loss, #ef4444)',
            marginBottom: '14px'
          }}>
            <AlertTriangle size={24} />
          </div>

          <h3 style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '6px'
          }}>
            {this.props.fallbackTitle || 'Unable to Load Section'}
          </h3>

          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            marginBottom: '16px',
            lineHeight: 1.5
          }}>
            An unexpected error occurred while rendering this tab. Your trade logs and account balances are completely safe and untouched.
          </p>

          {this.state.error?.message && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '8px',
              padding: '8px 12px',
              marginBottom: '18px',
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono, monospace)',
              color: 'var(--color-loss, #f87171)',
              overflowX: 'auto',
              textAlign: 'left'
            }}>
              {this.state.error.message}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={this.handleReset}
              className="td-btn td-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={14} />
              <span>Retry / Reload Tab</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
