import React, { useState, useEffect, useRef } from 'react';
import { Lock, Mail, User as UserIcon, Terminal, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { API } from '../config/api';

export default function AuthView({ onAuth, onAuthSuccess, loading, error, initialView = 'login', initialEmail = '' }) {
  const [view, setView] = useState(initialView); // 'login' | 'register' | 'verify_otp' | 'forgot_password' | 'reset_password'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Forms state
  const [form, setForm] = useState({ email: initialEmail || '', password: '', confirmPassword: '', username: '' });
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpEmail, setOtpEmail] = useState(initialEmail || '');
  const [otpPurpose, setOtpPurpose] = useState('signup_verification'); // 'signup_verification' | 'password_reset'
  const [resetToken, setResetToken] = useState('');
  
  // New Password state (for reset_password view)
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // Feedback & Timers
  const [localErr, setLocalErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);

  const otpInputsRef = useRef([]);

  // Timer countdown effect for OTP resend button
  useEffect(() => {
    let interval = null;
    if (view === 'verify_otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [view, resendTimer]);

  // Sync prop changes (e.g. unverified login redirect)
  useEffect(() => {
    if (initialEmail) {
      setForm(f => ({ ...f, email: initialEmail }));
      setOtpEmail(initialEmail);
    }
  }, [initialEmail]);

  // Handle Login / Register Submit
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLocalErr('');
    setSuccessMsg('');

    const isLogin = view === 'login';

    if (!isLogin && form.password !== form.confirmPassword) {
      setLocalErr('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin
        ? { email: form.email, password: form.password }
        : { username: form.username, email: form.email, password: form.password };

      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle unverified user login response (status 403)
        if (data.requiresVerification && data.email) {
          setOtpEmail(data.email);
          setOtpPurpose('signup_verification');
          setOtpDigits(['', '', '', '', '', '']);
          setResendTimer(60);
          setSuccessMsg(data.msg || 'Please enter the verification code sent to your email.');
          setView('verify_otp');
          return;
        }
        setLocalErr(data.msg || data.error || 'Authentication failed.');
        return;
      }

      // If registration created account and requires verification
      if (data.requiresVerification && data.email) {
        setOtpEmail(data.email);
        setOtpPurpose('signup_verification');
        setOtpDigits(['', '', '', '', '', '']);
        setResendTimer(60);
        setSuccessMsg(data.msg || 'Account created! Please check your email for the verification code.');
        setView('verify_otp');
        return;
      }

      // Immediate login success (if token provided)
      if (data.token) {
        if (onAuthSuccess) {
          onAuthSuccess(data);
        } else if (onAuth) {
          onAuth({ email: form.email, password: form.password, username: form.username }, isLogin);
        }
      }
    } catch {
      setLocalErr('Unable to connect to server. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpDigitChange = (index, value) => {
    // Only allow single digit
    const cleaned = value.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];
    
    if (cleaned.length > 1) {
      // User pasted into box
      const pasted = cleaned.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      const nextFocus = Math.min(pasted.length, 5);
      if (otpInputsRef.current[nextFocus]) {
        otpInputsRef.current[nextFocus].focus();
      }
      return;
    }

    newDigits[index] = cleaned;
    setOtpDigits(newDigits);

    // Auto advance focus
    if (cleaned && index < 5 && otpInputsRef.current[index + 1]) {
      otpInputsRef.current[index + 1].focus();
    }
  };

  // Handle OTP backspace & keydown
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      if (otpInputsRef.current[index - 1]) {
        otpInputsRef.current[index - 1].focus();
      }
    }
  };

  // Handle full OTP Paste
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pastedData) {
      const newDigits = ['' ,'', '', '', '', ''];
      for (let i = 0; i < pastedData.length; i++) {
        newDigits[i] = pastedData[i];
      }
      setOtpDigits(newDigits);
      const focusIndex = Math.min(pastedData.length - 1, 5);
      if (otpInputsRef.current[focusIndex]) {
        otpInputsRef.current[focusIndex].focus();
      }
    }
  };

  // Submit OTP Verification
  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setLocalErr('');
    setSuccessMsg('');

    const fullCode = otpDigits.join('');
    if (fullCode.length < 6) {
      setLocalErr('Please enter all 6 digits of the verification code.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: otpEmail,
          code: fullCode,
          purpose: otpPurpose
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setLocalErr(data.msg || 'Verification failed. Please check the code.');
        return;
      }

      if (otpPurpose === 'signup_verification') {
        // Log user in upon successful signup verification
        if (onAuthSuccess) {
          onAuthSuccess(data);
        } else if (onAuth) {
          onAuth({ email: otpEmail }, true);
        }
      } else if (otpPurpose === 'password_reset') {
        // Transition to Set New Password screen with reset token
        setResetToken(data.resetToken);
        setSuccessMsg('Code verified! Please set your new password.');
        setView('reset_password');
      }

    } catch {
      setLocalErr('Unable to reach server. Please check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Resend OTP Code
  const handleResendOtp = async () => {
    if (resendTimer > 0 || isResending) return;
    setLocalErr('');
    setSuccessMsg('');
    setIsResending(true);

    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: otpEmail,
          purpose: otpPurpose
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setLocalErr(data.msg || 'Failed to resend verification code.');
        return;
      }

      setResendTimer(60);
      setSuccessMsg('A new 6-digit verification code has been sent to your email.');
      setOtpDigits(['', '', '', '', '', '']);
    } catch {
      setLocalErr('Unable to send code. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  // Submit Forgot Password request
  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setLocalErr('');
    setSuccessMsg('');

    if (!form.email) {
      setLocalErr('Please enter your email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          purpose: 'password_reset'
        })
      });

      const data = await res.json();
      setOtpEmail(form.email);
      setOtpPurpose('password_reset');
      setOtpDigits(['', '', '', '', '', '']);
      setResendTimer(60);
      setSuccessMsg(data.msg || 'If this email is registered, a code has been sent.');
      setView('verify_otp');
    } catch {
      setLocalErr('Unable to reach server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Reset Password (set new password)
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setLocalErr('');
    setSuccessMsg('');

    if (newPassword !== confirmNewPassword) {
      setLocalErr('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setLocalErr('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: otpEmail,
          resetToken,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setLocalErr(data.msg || 'Failed to reset password.');
        return;
      }

      // Success! Redirect to login view
      setSuccessMsg('Password reset successfully! Please sign in with your new password.');
      setForm(f => ({ ...f, password: '', confirmPassword: '' }));
      setNewPassword('');
      setConfirmNewPassword('');
      setView('login');
    } catch {
      setLocalErr('Unable to connect to server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localErr || error;
  const isGlobalLoading = loading || submitting;

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

      {/* Right form panel */}
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

        <div style={{ width: '100%', maxWidth: 380, position: 'relative', zIndex: 1 }} className="animate-fade-in">
          
          {/* Success Banner */}
          {successMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 20,
              background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#4ade80', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.5
            }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ────────────────── 1. LOGIN & REGISTER VIEW ────────────────── */}
          {(view === 'login' || view === 'register') && (
            <>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {view === 'login' ? 'Sign In' : 'Create Account'}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  {view === 'login' ? 'Enter your credentials to access your dashboard' : 'Join AlgoTrack and track your DSA journey'}
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {view === 'register' && (
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

                {/* Forgot password link (Login view only) */}
                {view === 'login' && (
                  <div style={{ textAlign: 'right', marginTop: -4 }}>
                    <button
                      type="button"
                      onClick={() => { setView('forgot_password'); setLocalErr(''); setSuccessMsg(''); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Confirm Password input (Registration only) */}
                {view === 'register' && (
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
                    color: 'var(--cf-red)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6
                  }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    <span>{displayError}</span>
                  </div>
                )}

                <button className="btn-primary" type="submit" disabled={isGlobalLoading} style={{ width: '100%', justifyContent: 'center', marginTop: 4, padding: '10px' }}>
                  {isGlobalLoading ? 'Processing…' : (view === 'login' ? 'Sign In' : 'Create Account')}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 18 }}>
                <button
                  onClick={() => { setView(view === 'login' ? 'register' : 'login'); setLocalErr(''); setSuccessMsg(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)' }}
                >
                  {view === 'login' ? "Don't have an account? " : "Already have an account? "}
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    {view === 'login' ? 'Sign up' : 'Sign in'}
                  </span>
                </button>
              </div>
            </>
          )}

          {/* ────────────────── 2. OTP VERIFICATION VIEW ────────────────── */}
          {view === 'verify_otp' && (
            <>
              <div style={{ marginBottom: 24 }}>
                <button
                  onClick={() => { setView('login'); setLocalErr(''); setSuccessMsg(''); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 16
                  }}
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </button>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {otpPurpose === 'signup_verification' ? 'Verify Your Email' : 'Enter Verification Code'}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                  {otpPurpose === 'signup_verification'
                    ? 'Verify your email to start tracking your DSA progress.'
                    : 'Reset your AlgoTrack password.'}
                  {' '}We sent a 6-digit code to <strong style={{ color: 'var(--text-primary)' }}>{otpEmail}</strong>.
                </p>
              </div>

              <form onSubmit={handleVerifyOtpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* 6 Digits Code Input */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '8px 0' }}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => otpInputsRef.current[idx] = el}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      style={{
                        width: 46, height: 52, borderRadius: 8, textAlign: 'center',
                        fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)',
                        background: 'var(--bg-surface)', border: digit ? '2px solid var(--accent)' : '1px solid var(--border)',
                        color: 'var(--text-primary)', outline: 'none', transition: 'all 0.15s ease',
                        boxShadow: digit ? '0 0 12px rgba(249, 115, 22, 0.25)' : 'none'
                      }}
                    />
                  ))}
                </div>

                {displayError && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 6,
                    background: 'var(--red-dim)', border: '1px solid rgba(255,123,114,0.3)',
                    color: 'var(--cf-red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{displayError}</span>
                  </div>
                )}

                <button
                  className="btn-primary"
                  type="submit"
                  disabled={isGlobalLoading || otpDigits.join('').length < 6}
                  style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: 4 }}
                >
                  {isGlobalLoading ? 'Verifying Code…' : 'Verify & Continue'}
                </button>
              </form>

              {/* Resend Code Action */}
              <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                  Didn't receive the code?
                </p>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0 || isResending}
                  style={{
                    background: 'none', border: 'none', cursor: (resendTimer > 0 || isResending) ? 'not-allowed' : 'pointer',
                    fontSize: 13, color: (resendTimer > 0 || isResending) ? 'var(--text-muted)' : 'var(--accent)',
                    fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6
                  }}
                >
                  <RefreshCw size={13} className={isResending ? 'spin' : ''} />
                  {resendTimer > 0
                    ? `Resend code in ${resendTimer}s`
                    : (isResending ? 'Sending…' : 'Resend code')}
                </button>
              </div>
            </>
          )}

          {/* ────────────────── 3. FORGOT PASSWORD VIEW ────────────────── */}
          {view === 'forgot_password' && (
            <>
              <div style={{ marginBottom: 24 }}>
                <button
                  onClick={() => { setView('login'); setLocalErr(''); setSuccessMsg(''); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 16
                  }}
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </button>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Forgot Password
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
                  Enter your registered email address and we will send you a 6-digit verification code to reset your password.
                </p>
              </div>

              <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="input-field" type="email" placeholder="Enter your email address" required
                    style={{ paddingLeft: 34 }}
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                {displayError && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 6,
                    background: 'var(--red-dim)', border: '1px solid rgba(255,123,114,0.3)',
                    color: 'var(--cf-red)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6
                  }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    <span>{displayError}</span>
                  </div>
                )}

                <button
                  className="btn-primary"
                  type="submit"
                  disabled={isGlobalLoading}
                  style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: 4 }}
                >
                  {isGlobalLoading ? 'Sending Code…' : 'Send Verification Code'}
                </button>
              </form>
            </>
          )}

          {/* ────────────────── 4. SET NEW PASSWORD VIEW ────────────────── */}
          {view === 'reset_password' && (
            <>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Set New Password
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  Create a new password for <strong style={{ color: 'var(--text-primary)' }}>{otpEmail}</strong>.
                </p>
              </div>

              <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                
                {/* New Password */}
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="input-field"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New password (min 6 characters)"
                    required
                    style={{ paddingLeft: 34, paddingRight: 36 }}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
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

                {/* Confirm New Password */}
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="input-field"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    required
                    style={{ paddingLeft: 34, paddingRight: 36 }}
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
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

                {displayError && (
                  <div style={{
                    padding: '8px 12px', borderRadius: 6,
                    background: 'var(--red-dim)', border: '1px solid rgba(255,123,114,0.3)',
                    color: 'var(--cf-red)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6
                  }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} />
                    <span>{displayError}</span>
                  </div>
                )}

                <button
                  className="btn-primary"
                  type="submit"
                  disabled={isGlobalLoading}
                  style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: 4 }}
                >
                  {isGlobalLoading ? 'Resetting Password…' : 'Reset Password & Sign In'}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
