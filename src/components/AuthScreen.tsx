import React, { useState } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import logoImg from '../assets/tradediary_logo.png';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';

export function AuthScreen() {
  const { signInUser, signUpUser } = useTradeStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setLoading(true);
      const { error: signUpErr } = await signUpUser(email, password);
      setLoading(false);
      if (signUpErr) {
        setError(signUpErr.message || 'An error occurred during Sign Up.');
      } else {
        alert('Registration request submitted! If email confirmation is enabled, please verify your email before logging in.');
        setIsSignUp(false);
      }
    } else {
      setLoading(true);
      const { error: signInErr } = await signInUser(email, password);
      setLoading(false);
      if (signInErr) {
        setError(signInErr.message || 'Invalid email or password.');
      }
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-color)',
        padding: '24px',
        backgroundImage: 'radial-gradient(circle at 50% 50%, var(--primary-glow) 0%, transparent 60%)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text-main)',
        transition: 'background-color 0.3s ease'
      }}
    >
      <div
        className="glass-card"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px 32px',
          textAlign: 'center',
          boxShadow: 'var(--shadow-glow)'
        }}
      >
        {/* Logo and Brand */}
        <div style={{ marginBottom: '28px' }}>
          <img
            src={logoImg}
            alt="TradeDiary Pro Logo"
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '22px',
              marginBottom: '16px',
              border: '2px solid var(--border-color)',
              boxShadow: 'var(--shadow-card)',
              objectFit: 'cover'
            }}
          />
          <h2
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '6px'
            }}
          >
            TradeDiary Pro
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 400 }}>
            Enterprise multi-user trading diary & cognitive journal
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div
            style={{
              color: 'var(--color-loss)',
              backgroundColor: 'var(--color-loss-bg)',
              border: '1px solid var(--color-loss-border)',
              padding: '12px',
              borderRadius: '10px',
              fontSize: '0.78rem',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '20px'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' }}>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={12} /> Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="form-input"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={12} /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="form-input"
              required
              disabled={loading}
            />
          </div>

          {isSignUp && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={12} /> Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                required
                disabled={loading}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              marginTop: '10px',
              height: '42px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : isSignUp ? (
              <UserPlus size={16} />
            ) : (
              <LogIn size={16} />
            )}
            <span>{isSignUp ? 'Create SaaS Account' : 'Sign In to Journal'}</span>
          </button>
        </form>

        {/* Switch Modes */}
        <div style={{ marginTop: '28px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {isSignUp ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setError(null); setIsSignUp(false); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setError(null); setIsSignUp(true); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                Register Here
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
