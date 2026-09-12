import React, { useState } from 'react';
import { Lock, Mail, User as UserIcon, Terminal, Eye, EyeOff } from 'lucide-react';

export default function AuthView({ onAuth, loading, error }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', username: '' });
  const [localErr, setLocalErr] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalErr('');
    if (!isLogin && form.password !== form.confirmPassword) {
      setLocalErr('Passwords do not match. Please verify your passwords.');
      return;
    }
    onAuth({ email: form.email, password: form.password, username: form.username }, isLogin);
  };

  const displayError = localErr || error;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--bg-base)', overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Left decorative panel */}
      <div className="auth-deco" style={{
        width: '45%', background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 48, position: 'relative'
      }}>
        <div style={{ textAlign: 'center', zIndex: 1 }}>
          <img src="/logo.png" alt="AlgoTrack Logo" style={{
            width: 64, height: 64, borderRadius: 10, margin: '0 auto 20px',
            display: 'block', objectFit: 'contain'
          }} />
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 10, color: 'var(--text-primary)' }}>
            AlgoTrack
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 280, lineHeight: 1.6 }}>
            DSA &amp; Competitive Programming progress tracker for LeetCode &amp; Codeforces.
          </p>
          <div style={{ marginTop: 24, padding: '8px 14px', borderRadius: 6, background: 'var(--bg-muted)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
            <Terminal size={14} />
            <span>$ algotrack --sync</span>
          </div>
        </div>
      </div>

      {/* Right form panel with background watermark ONLY */}
      <div className="auth-form-panel" style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32,
        position: 'relative', overflow: 'hidden'
      }}>
        {/* Right Side Watermark Logo */}
        <img
          src="/logo.png"
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-8deg)',
            width: '500px',
            height: '500px',
            objectFit: 'contain',
            opacity: 0.05,
            pointerEvents: 'none',
            zIndex: 0,
            userSelect: 'none',
            filter: 'drop-shadow(0 0 30px rgba(240, 136, 62, 0.12))'
          }}
        />

        <div style={{ width: '100%', maxWidth: 360, position: 'relative', zIndex: 1 }} className="animate-fade-in">
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {isLogin ? 'Enter your credentials to access your dashboard' : 'Join AlgoTrack and track your DSA journey'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!isLogin && (
              <div style={{ position: 'relative' }}>
                <UserIcon size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input-field" type="text" placeholder="Username" required
                  style={{ paddingLeft: 34 }}
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                />
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input-field" type="email" placeholder="Email address" required
                style={{ paddingLeft: 34 }}
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>

            {/* Password input with eye toggle */}
            <div style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input-field"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                required
                style={{ paddingLeft: 34, paddingRight: 36 }}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', padding: 2
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* Confirm Password input (Registration only) */}
            {!isLogin && (
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input-field"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm password"
                  required
                  style={{ paddingLeft: 34, paddingRight: 36 }}
                  value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', padding: 2
                  }}
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            )}

            {displayError && (
              <div style={{
                padding: '8px 12px', borderRadius: 6,
                background: 'var(--red-dim)', border: '1px solid rgba(255,123,114,0.3)',
                color: 'var(--cf-red)', fontSize: 12
              }}>{displayError}</div>
            )}

            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '10px' }}>
              {loading ? 'Processing…' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <button
              onClick={() => { setIsLogin(!isLogin); setLocalErr(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                {isLogin ? 'Sign up' : 'Sign in'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

