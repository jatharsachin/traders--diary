import React, { useState, useEffect } from 'react';
import { useTradeStore } from '../store/useTradeStore';
import logoImg from '../assets/tradediary_logo.png';
import { Mail, Lock, LogIn, UserPlus, AlertCircle, Loader2, User, Phone, KeyRound, Eye, EyeOff } from 'lucide-react';

interface AuthScreenProps {
  recoveryMode?: boolean;
  onRecoveryComplete?: () => void;
}

export function AuthScreen({ recoveryMode = false, onRecoveryComplete }: AuthScreenProps) {
  const { signInUser, signUpUser, sendPasswordResetEmail, updatePassword, signOutUser } = useTradeStore();
  const [view, setView] = useState<'signin' | 'signup' | 'forgot' | 'recovery'>(recoveryMode ? 'recovery' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (recoveryMode) {
      setView('recovery');
    } else {
      setView('signin');
    }
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [recoveryMode]);

  useEffect(() => {
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [view]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Forgot Password Flow
    if (view === 'forgot') {
      if (!email) {
        setError('Please enter your email address.');
        return;
      }
      setLoading(true);
      const { error: resetErr } = await sendPasswordResetEmail(email);
      setLoading(false);
      if (resetErr) {
        setError(resetErr.message || 'Failed to send password reset email.');
      } else {
        setSuccessMessage('Password reset link sent to your email! Please check your inbox.');
        setEmail('');
      }
      return;
    }

    // Password Recovery/Update Flow
    if (view === 'recovery') {
      if (!password || !confirmPassword) {
        setError('Please enter your new password and confirm it.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setLoading(true);
      const { error: updateErr } = await updatePassword(password);
      if (updateErr) {
        setError(updateErr.message || 'Failed to update password.');
        setLoading(false);
      } else {
        await signOutUser();
        setLoading(false);
        alert('Password updated successfully! Please sign in with your new password.');
        if (onRecoveryComplete) {
          onRecoveryComplete();
        } else {
          setView('signin');
        }
      }
      return;
    }

    // Normal Registration / Sign Up Flow
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (view === 'signup') {
      if (!firstName || !lastName || !mobile) {
        setError('Please fill in all details (First Name, Last Name, and Mobile).');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setLoading(true);
      const { error: signUpErr } = await signUpUser(email, password, {
        first_name: firstName,
        last_name: lastName,
        mobile: mobile
      });
      setLoading(false);
      if (signUpErr) {
        setError(signUpErr.message || 'An error occurred during Sign Up.');
      } else {
        alert('Registration request submitted! If email confirmation is enabled, please verify your email before logging in.');
        setView('signin');
      }
    } else {
      // Normal Login / Sign In Flow
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
            {view === 'recovery' ? 'Reset Password' : 'TradeDiary Pro'}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 400 }}>
            {view === 'recovery' 
              ? 'Enter your new credentials to secure your account' 
              : view === 'forgot'
                ? 'Request a secure password recovery link'
                : 'Enterprise multi-user trading diary & cognitive journal'
            }
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

        {/* Success Notification */}
        {successMessage && (
          <div
            style={{
              color: 'var(--color-win)',
              backgroundColor: 'var(--color-win-bg)',
              border: '1px solid var(--color-win-border)',
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
            <span style={{ color: 'var(--color-win)', fontWeight: 'bold', marginRight: '6px' }}>✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'left' }}>
          
          {view === 'signup' && (
            <>
              <div className="grid-2col-equal-small" style={{ gap: '12px', marginBottom: 0 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={12} /> First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                    className="form-input"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={12} /> Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                    className="form-input"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={12} /> Mobile Number
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Mobile Number"
                  className="form-input"
                  required
                  disabled={loading}
                />
              </div>
            </>
          )}

          {view !== 'recovery' && (
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
                autoFocus={view === 'signin' || view === 'forgot'}
              />
            </div>
          )}

          {(view === 'signin' || view === 'signup') && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 0 }}>
                  <Lock size={12} /> Password
                </label>
                {view === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setError(null); setSuccessMessage(null); setView('forgot'); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      padding: 0,
                      fontWeight: 600,
                      textDecoration: 'underline'
                    }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input"
                  style={{ paddingRight: '40px' }}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px'
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {view === 'signup' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lock size={12} /> Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input"
                  style={{ paddingRight: '40px' }}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px'
                  }}
                  title={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {view === 'recovery' && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <KeyRound size={12} /> New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New Password (min 6 characters)"
                    className="form-input"
                    style={{ paddingRight: '40px' }}
                    required
                    disabled={loading}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px'
                    }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={12} /> Confirm New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="form-input"
                    style={{ paddingRight: '40px' }}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-dim)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px'
                    }}
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
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
            ) : view === 'signup' ? (
              <UserPlus size={16} />
            ) : view === 'forgot' ? (
              <Mail size={16} />
            ) : view === 'recovery' ? (
              <KeyRound size={16} />
            ) : (
              <LogIn size={16} />
            )}
            <span>
              {view === 'signup' && 'Create SaaS Account'}
              {view === 'forgot' && 'Send Reset Link'}
              {view === 'recovery' && 'Update Password'}
              {view === 'signin' && 'Sign In to Journal'}
            </span>
          </button>
        </form>

        {/* Switch Modes */}
        <div style={{ marginTop: '28px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {view === 'signup' && (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setError(null); setSuccessMessage(null); setView('signin'); }}
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
          )}
          {view === 'signin' && (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setError(null); setSuccessMessage(null); setView('signup'); }}
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
          {view === 'forgot' && (
            <span>
              Remembered your password?{' '}
              <button
                type="button"
                onClick={() => { setError(null); setSuccessMessage(null); setView('signin'); }}
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
                Back to Login
              </button>
            </span>
          )}
          {view === 'recovery' && (
            <span>
              Want to cancel recovery?{' '}
              <button
                type="button"
                onClick={async () => {
                  setError(null);
                  setSuccessMessage(null);
                  await signOutUser();
                  if (onRecoveryComplete) {
                    onRecoveryComplete();
                  } else {
                    setView('signin');
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-loss)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                Cancel and Log Out
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
