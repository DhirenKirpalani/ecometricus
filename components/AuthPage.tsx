
import React, { useState, useRef } from 'react';
import { Page, UserProfile } from '../types';
import Logo from './Logo';
import {
  CheckCircle2, Eye, EyeOff, Lock, Mail, User,
  ShieldCheck, Send
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthPageProps {
  currentView: Page;
  onNavigate: (page: Page) => void;
  onLogin: (user: UserProfile) => void;
}

// ─── Password strength ────────────────────────────────────────────────────────
interface StrengthResult {
  score: number;       // 0-4
  label: string;
  color: string;       // tailwind text color
  barColor: string;    // tailwind bg color
  criteria: { text: string; met: boolean }[];
}

const getStrength = (pw: string): StrengthResult => {
  const criteria = [
    { text: 'At least 8 characters',        met: pw.length >= 8 },
    { text: 'Uppercase letter (A–Z)',        met: /[A-Z]/.test(pw) },
    { text: 'Number (0–9)',                  met: /[0-9]/.test(pw) },
    { text: 'Special character (!@#$…)',     met: /[^A-Za-z0-9]/.test(pw) },
  ];
  const score = criteria.filter(c => c.met).length;
  const levels = [
    { label: 'Too weak',  color: 'text-red-400',    barColor: 'bg-red-500'    },
    { label: 'Weak',      color: 'text-orange-400',  barColor: 'bg-orange-500' },
    { label: 'Fair',      color: 'text-yellow-400',  barColor: 'bg-yellow-500' },
    { label: 'Good',      color: 'text-brand-eco',   barColor: 'bg-brand-eco'  },
    { label: 'Strong',    color: 'text-brand-eco',   barColor: 'bg-brand-eco'  },
  ];
  return { score, criteria, ...levels[score] };
};

const PasswordStrength: React.FC<{ password: string }> = ({ password }) => {
  if (!password) return null;
  const { score, label, color, barColor, criteria } = getStrength(password);
  return (
    <div className="space-y-3 pt-1">
      {/* Bar segments */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1.5 flex-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i < score ? barColor : 'bg-white/8'
              }`}
            />
          ))}
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 ${color}`}>
          {label}
        </span>
      </div>
      {/* Criteria checklist */}
      <div className="grid grid-cols-2 gap-1.5">
        {criteria.map((c) => (
          <div key={c.text} className="flex items-center gap-1.5">
            <span className={`shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black ${c.met ? 'bg-brand-eco/20 text-brand-eco' : 'bg-white/5 text-white/20'}`}>
              {c.met ? '✓' : '·'}
            </span>
            <span className={`text-[9px] uppercase tracking-wide ${c.met ? 'text-white/50' : 'text-white/20'}`}>{c.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Shared input base class ─────────────────────────────────────────────────
const inputBase = 'w-full bg-[#0e1f1c] border border-brand-gold/20 focus:border-brand-gold rounded-xl py-3.5 text-sm text-white outline-none transition-all placeholder:text-white/20 shadow-[inset_0_1px_0_rgba(200,164,19,0.04)]';

// ─── Reusable input ───────────────────────────────────────────────────────────
const Field: React.FC<{
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  minLength?: number;
}> = ({ label, type = 'text', value, onChange, placeholder, required, icon, right, minLength }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <label className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-gold/70">{label}</label>
      {right}
    </div>
    <div className="relative">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gold/25 pointer-events-none">
          {icon}
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className={`${inputBase} ${icon ? 'pl-11 pr-4' : 'px-4'}`}
      />
    </div>
  </div>
);

// ─── Password field with show/hide ────────────────────────────────────────────
const PasswordField: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  right?: React.ReactNode;
}> = ({ label, value, onChange, placeholder = '••••••••', required, right }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-gold/70">{label}</label>
        {right}
      </div>
      <div className="relative">
        <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-gold/25 pointer-events-none" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          minLength={6}
          className={`${inputBase} pl-11 pr-11`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShow(!show)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-brand-gold/60 transition-colors"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const AuthPage: React.FC<AuthPageProps> = ({ currentView, onNavigate, onLogin }) => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [fullName, setFullName]         = useState('');
  const role = 'admin'; // New sign-ups are always workspace admins; roles are assigned via invites
  const [acceptTerms, setAcceptTerms]   = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [successMsg, setSuccessMsg]     = useState<string | null>(null);

  // Rate limiting
  const lastAttemptTime = useRef<number>(0);
  const attemptCount    = useRef<number>(0);
  const RATE_LIMIT_MS   = 3000;
  const MAX_ATTEMPTS    = 5;

  const isSignIn = currentView === Page.SIGN_IN;
  const isSignUp = currentView === Page.SIGN_UP;
  const isForgot = currentView === Page.FORGOT_PASSWORD;

  const canAttemptAuth = (): boolean => {
    const now = Date.now();
    if (attemptCount.current >= MAX_ATTEMPTS) {
      setError('Too many attempts. Please wait 1 minute and refresh the page.');
      return false;
    }
    if (now - lastAttemptTime.current < RATE_LIMIT_MS) {
      setError(`Please wait ${Math.ceil((RATE_LIMIT_MS - (now - lastAttemptTime.current)) / 1000)}s before trying again.`);
      return false;
    }
    lastAttemptTime.current = now;
    attemptCount.current += 1;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // ── Forgot Password ──
    if (isForgot) {
      if (!canAttemptAuth()) return;
      setIsLoading(true);
      try {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/?reset=true`,
        });
        if (resetErr) throw resetErr;
        setSuccessMsg('Password reset link sent! Check your inbox.');
      } catch (err: any) {
        setError(err.message || 'Failed to send reset email. Please try again.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // ── Validation ──
    if (isSignUp && password !== verifyPassword) { setError('Passwords do not match.'); return; }
    if (isSignUp && !acceptTerms)               { setError('You must accept the Terms and Privacy Policy.'); return; }
    if (isSignUp && password.length < 6)        { setError('Password must be at least 6 characters.'); return; }
    if (isSignUp && !fullName.trim())            { setError('Please enter your full name.'); return; }

    if (!canAttemptAuth()) return;
    setIsLoading(true);

    try {
      let authUser = null;

      if (isSignIn) {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        authUser = data.user;
      } else {
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role, auth_origin: 'registration' },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (signUpErr) throw signUpErr;
        authUser = signUpData.user;
        if (!authUser?.id) throw new Error('Signup failed. Please try again.');

        // ── Email confirmation required ──
        // If the user has no session yet (email_confirmed_at is null),
        // Supabase sent a confirmation email. Stop here and show the check-email screen.
        if (!authUser.email_confirmed_at) {
          // Still sync profile so data is ready when they confirm
          try {
            await supabase.from('profiles').upsert({
              id: authUser.id,
              full_name: fullName,
              role: 'admin',
              position: 'GM',
              legal_consent: false,
            }, { onConflict: 'id' });
            await supabase.from('company_settings').upsert({
              user_id: authUser.id,
              admin_name: fullName,
              company_name: 'My Organization',
              audit_cycle: 'Monthly',
            }, { onConflict: 'user_id' });
          } catch (syncErr: any) {
            console.warn('Profile sync warning:', syncErr.message);
          }
          setSuccessMsg('confirmation_sent'); // triggers the check-email screen
          return;
        }
      }

      if (!authUser) throw new Error('Authentication failed to retrieve user session.');

      const dynamicFullName = fullName || authUser.user_metadata?.full_name || 'Admin User';
      const finalRole = authUser.user_metadata?.role || 'admin';
      const finalPosition = authUser.user_metadata?.position || 'GM';

      onLogin({
        id: authUser.id,
        fullName: dynamicFullName,
        email: authUser.email || email,
        role: finalRole as any,
        position: finalPosition as any,
        outletCode: authUser.user_metadata?.outlet_code || 'ROY02',
        legal_consent: authUser.user_metadata?.legal_consent === true,
      });

    } catch (err: any) {
      let msg = err.message || 'Authentication failed.';
      if (msg.includes('Email not confirmed'))    msg = 'Please confirm your email before signing in.';
      if (msg.includes('Invalid login credentials')) msg = 'Incorrect email or password.';
      if (msg.includes('rate limit'))             msg = 'Too many requests. Please wait and try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };



  // Left panel bullet points
  const leftBullets = isSignIn
    ? [
        'Real-time ESG intelligence for your F&B operation',
        'Track food waste, energy & water in one platform',
        'AI-powered insights tailored to your property',
      ]
    : [
        'No credit card required to start',
        'Full dashboard access from day one',
        'Set up your operation in under 10 minutes',
      ];

  return (
    <div className="min-h-screen flex overflow-hidden">

      {/* ── Left branding panel (desktop only) ─── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col relative overflow-hidden bg-[#0a1a17]">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 30% 60%, rgba(119,177,57,0.08), transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(200,164,19,0.05), transparent 50%)' }} />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/8 to-transparent" />

        <div className="relative flex flex-col h-full px-12 py-10">

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center gap-10">

            {/* Logo — click to go home */}
            <button onClick={() => onNavigate(Page.HOME)} className="self-start hover:opacity-80 transition-opacity">
              <Logo size="lg" withLabel />
            </button>

            {/* Tagline */}
            <div className="space-y-3 max-w-xs">
              <h2 className="text-2xl sm:text-3xl font-geometric font-bold text-white leading-snug">
                {isSignIn ? (
                  <>Measure what matters.<br /><span className="text-brand-gold">Profit from sustainability.</span></>
                ) : (
                  <>Start tracking<br /><span className="text-brand-gold">what matters today.</span></>
                )}
              </h2>
              <p className="text-sm text-white/40 leading-relaxed">
                {isSignIn
                  ? 'The premier AI-powered ESG platform for luxury F&B operations worldwide.'
                  : 'Everything you need to measure, optimize, and report your ESG performance.'}
              </p>
            </div>

            {/* Bullets */}
            <ul className="space-y-3.5">
              {leftBullets.map(b => (
                <li key={b} className="flex items-center gap-3 text-sm text-white/60">
                  <CheckCircle2 size={16} className="text-brand-eco shrink-0" />
                  {b}
                </li>
              ))}
            </ul>

          </div>

          {/* Footer */}
          <div className="flex items-center gap-2">
            <ShieldCheck size={12} className="text-brand-eco shrink-0" />
            <p className="text-xs text-white/25">256-bit encrypted · GDPR compliant</p>
          </div>

        </div>
      </div>

      {/* ── Right form panel ─── */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-[#0d1b18]">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center justify-center p-6">
          <button onClick={() => onNavigate(Page.HOME)} className="hover:opacity-80 transition-opacity">
            <Logo size="md" withLabel />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">

            {/* ── Check-your-email confirmation screen ── */}
            {successMsg === 'confirmation_sent' && (
              <div className="flex flex-col items-center text-center gap-6 py-8">
                <div className="relative w-20 h-20">
                  <div className="w-20 h-20 rounded-2xl bg-brand-eco/10 border border-brand-eco/30 flex items-center justify-center">
                    <Mail size={36} className="text-brand-eco" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-eco border-2 border-[#0d1b18] flex items-center justify-center">
                    <CheckCircle2 size={11} className="text-brand-dark" />
                  </span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-geometric font-bold text-white">Check your inbox</h2>
                  <p className="text-sm text-white/40 leading-relaxed max-w-sm">
                    We sent a confirmation link to <span className="text-white/70 font-medium">{email}</span>. Click it to activate your account.
                  </p>
                </div>
                <div className="w-full p-4 rounded-xl bg-white/3 border border-white/8 text-left space-y-2">
                  {["Check your spam folder if it doesn't arrive", 'The link expires in 24 hours', 'Once confirmed you\'ll go straight to your dashboard'].map((tip) => (
                    <div key={tip} className="flex items-start gap-2.5">
                      <span className="w-1 h-1 rounded-full bg-brand-gold/50 mt-2 shrink-0" />
                      <p className="text-xs text-white/35">{tip}</p>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => { setSuccessMsg(null); onNavigate(Page.SIGN_IN); }} className="text-sm text-white/30 hover:text-white transition-colors">
                  ← Back to Log In
                </button>
              </div>
            )}

            {/* ── Normal form ── */}
            {successMsg !== 'confirmation_sent' && (
              <div className="space-y-6">

                {/* Header */}
                {isForgot ? (
                  <div className="space-y-1">
                    <h1 className="text-2xl font-geometric font-bold text-white">Forgot Password?</h1>
                    <p className="text-sm text-white/40">Enter your email and we'll send you a reset link.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <h1 className="text-2xl font-geometric font-bold text-white">
                      {isSignIn ? 'Welcome back' : 'Create your account'}
                    </h1>
                    <p className="text-sm text-white/40">
                      {isSignIn ? 'Sign in to your Ecometricus account' : 'Get started with Ecometricus for free'}
                    </p>
                  </div>
                )}

                {/* Error / success banners */}
                {error && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/25 rounded-xl">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}
                {successMsg && successMsg !== 'confirmation_sent' && (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-brand-eco/10 border border-brand-eco/30 rounded-xl flex items-start gap-3">
                      <CheckCircle2 size={16} className="text-brand-eco shrink-0 mt-0.5" />
                      <p className="text-sm text-brand-eco">{successMsg}</p>
                    </div>
                    {isForgot && (
                      <a
                        href="mailto:"
                        className="w-full flex items-center justify-center gap-2 bg-[#0f2620] border border-brand-gold/25 text-brand-gold hover:bg-brand-gold/10 hover:border-brand-gold/50 rounded-xl py-3 text-sm font-semibold transition-all"
                      >
                        <Mail size={15} />
                        Open Email App
                      </a>
                    )}
                  </div>
                )}

                {/* Form card */}
                <form onSubmit={handleSubmit} className="bg-[#0f2620] border border-white/8 rounded-2xl p-6 space-y-4">

                  {isSignUp && (
                    <Field label="Full Name" value={fullName} onChange={setFullName} placeholder="John Doe" required icon={<User size={14} />} />
                  )}

                  <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="name@company.com" required icon={<Mail size={14} />} />

                  {!isForgot && (
                    <div className="space-y-2">
                      <PasswordField
                        label="Password"
                        value={password}
                        onChange={setPassword}
                        required
                        right={isSignIn ? (
                          <button type="button" onClick={() => { onNavigate(Page.FORGOT_PASSWORD); setError(null); }} className="text-xs text-brand-gold hover:underline transition-colors">
                            Forgot password?
                          </button>
                        ) : undefined}
                      />
                      {isSignUp && <PasswordStrength password={password} />}
                    </div>
                  )}

                  {isSignUp && (
                    <PasswordField label="Confirm Password" value={verifyPassword} onChange={setVerifyPassword} placeholder="Repeat password" required />
                  )}

                  {isSignUp && (
                    <div className="flex items-start gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setAcceptTerms(!acceptTerms)}
                        className={`shrink-0 w-4 h-4 rounded border mt-0.5 flex items-center justify-center transition-all ${acceptTerms ? 'bg-brand-gold border-brand-gold' : 'border-white/20 hover:border-brand-gold'}`}
                      >
                        {acceptTerms && <CheckCircle2 size={10} className="text-brand-dark" />}
                      </button>
                      <span className="text-xs text-white/40 leading-relaxed">
                        I agree to the{' '}
                        <button type="button" onClick={() => onNavigate(Page.TERMS)} className="text-brand-gold hover:underline">Terms</button>
                        {' '}and{' '}
                        <button type="button" onClick={() => onNavigate(Page.PRIVACY)} className="text-brand-gold hover:underline">Privacy Policy</button>
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || (isSignUp && !acceptTerms)}
                    className="w-full flex items-center justify-center gap-2.5 bg-brand-gold text-brand-dark py-3.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all shadow-[0_6px_20px_rgba(200,164,19,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <><div className="w-4 h-4 border-2 border-brand-dark/30 border-t-brand-dark rounded-full animate-spin" />
                      {isSignIn ? 'Signing In…' : isSignUp ? 'Creating Account…' : 'Sending…'}</>
                    ) : (
                      <>
                        {isForgot && <Send size={14} />}
                        {isSignIn && 'Sign in'}
                        {isSignUp && 'Create Account'}
                        {isForgot && 'Send Reset Link'}
                      </>
                    )}
                  </button>

                  {isForgot && (
                    <button type="button" onClick={() => { onNavigate(Page.SIGN_IN); setError(null); setSuccessMsg(null); }} className="w-full text-center text-sm text-white/30 hover:text-white transition-colors">
                      ← Back to Sign In
                    </button>
                  )}
                </form>

                {/* Switch link */}
                {!isForgot && (
                  <p className="text-center text-sm text-white/40">
                    {isSignIn ? (
                      <>Don't have an account?{' '}<button type="button" onClick={() => { onNavigate(Page.SIGN_UP); setError(null); setSuccessMsg(null); }} className="text-brand-gold font-semibold hover:underline">Sign up free</button></>
                    ) : (
                      <>Already have an account?{' '}<button type="button" onClick={() => { onNavigate(Page.SIGN_IN); setError(null); setSuccessMsg(null); }} className="text-brand-gold font-semibold hover:underline">Sign in</button></>
                    )}
                  </p>
                )}

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
