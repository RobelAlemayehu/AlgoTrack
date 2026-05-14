import React, { useState } from 'react';
import { Trophy, Code, Lock, Mail, User as UserIcon, Sparkles } from 'lucide-react';

export default function AuthView({ onAuth, loading, error }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', username: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAuth(form, isLogin);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--bg-base)', overflow: 'hidden'
    }}>
      {/* Left decorative panel */}
      <div style={{
        width: '45%', background: 'linear-gradient(145deg, #0D1526 0%, #111827 100%)',
        borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 48, position: 'relative', overflow: 'hidden'
      }}>
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '5%', width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="animate-float" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <img src="/logo.png" alt="AlgoTrack Logo" style={{
            width: 80, height: 80, borderRadius: 20, margin: '0 auto 24px',
            boxShadow: '0 0 40px rgba(99,102,241,0.4)',
            display: 'block'
          }} />
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 12 }}>
            <span className="gradient-text">AlgoTrack</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 280, lineHeight: 1.7 }}>
            Track your competitive programming journey across LeetCode & Codeforces — all in one place.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32
      }}>
        <div style={{ width: '100%', maxWidth: 380 }} className="animate-fade-in">
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 6 }}>
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {isLogin ? 'Sign in to your AlgoTrack account' : 'Start tracking your DSA journey'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!isLogin && (
              <div style={{ position: 'relative' }}>
                <UserIcon size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input-field" type="text" placeholder="Username" required
                  style={{ paddingLeft: 38 }}
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                />
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input-field" type="email" placeholder="Email address" required
                style={{ paddingLeft: 38 }}
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input-field" type="password" placeholder="Password" required
                style={{ paddingLeft: 38 }}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.25)',
                color: 'var(--red)', fontSize: 13
              }}>{error}</div>
            )}

            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '11px' }}>
              {loading ? 'Processing…' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button
              onClick={() => setIsLogin(!isLogin)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}
            >
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <span style={{ color: 'var(--indigo-light)', fontWeight: 600 }}>
                {isLogin ? 'Sign up' : 'Sign in'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
