import React, { useState } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import logoImg from '../assets/tradediary_logo.png';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, Loader2 } from 'lucide-react';

export function AuthScreen() {
  const { signInUser, signUpUser, signInUserWithGoogle } = useTradeStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    const { error: oAuthErr } = await signInUserWithGoogle();
    if (oAuthErr) {
      setError(oAuthErr.message || 'Failed to authenticate with Google.');
      setGoogleLoading(false);
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
              disabled={loading || googleLoading}
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
              disabled={loading || googleLoading}
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
                disabled={loading || googleLoading}
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
              cursor: loading || googleLoading ? 'not-allowed' : 'pointer',
              opacity: loading || googleLoading ? 0.7 : 1
            }}
            disabled={loading || googleLoading}
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

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: '10px' }}>
          <div style={{ flexGrow: 1, height: '1px', background: 'var(--border-color)' }}></div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Or continue with</span>
          <div style={{ flexGrow: 1, height: '1px', background: 'var(--border-color)' }}></div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            width: '100%',
            height: '42px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-main)',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            cursor: loading || googleLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: loading || googleLoading ? 0.7 : 1
          }}
          disabled={loading || googleLoading}
        >
          {googleLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path
                fill="#4285F4"
                d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.69-1.55 2.69-3.84 2.69-6.57z"
              />
              <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.24c-.8.54-1.84.87-3.06.87-2.35 0-4.34-1.59-5.05-3.73H.95v2.3C2.43 15.98 5.51 18 9 18z"
              />
              <path
                fill="#FBBC05"
                d="M3.95 10.72A5.4 5.4 0 0 1 3.6 9c0-.6.1-1.18.25-1.72V4.98H.95A8.99 8.99 0 0 0 0 9c0 1.45.35 2.82.95 4.02l3-2.3z"
              />
              <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.8 11.43 0 9 0 5.51 0 2.43 2.02.95 4.98l3 2.3c.71-2.14 2.7-3.72 5.05-3.72z"
              />
            </svg>
          )}
          <span>Continue with Google</span>
        </button>

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
