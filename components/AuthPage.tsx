
import React, { useState, useRef, useEffect } from 'react';
import { Page, UserProfile } from '../types';
import {
  CheckCircle2, Eye, EyeOff, Lock, Mail, User,
  ShieldCheck, Send
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/useI18n';
import { sha256 } from '../lib/hash';

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
  const { t } = useI18n();
  if (!password) return null;
  const { score, criteria } = getStrength(password);
  const labels = [t('auth.pwTooWeak'), t('auth.pwWeak'), t('auth.pwFair'), t('auth.pwGood'), t('auth.pwStrong')];
  const label = labels[score];
  const color = score <= 1 ? 'text-red-400' : score === 2 ? 'text-yellow-400' : 'text-brand-eco';
  const barColor = score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-yellow-500' : 'bg-brand-eco';
  const translatedCriteria = criteria.map((c, i) => ({
    ...c,
    text: [t('auth.pw8Chars'), t('auth.pwUppercase'), t('auth.pwNumber'), t('auth.pwSpecial')][i],
  }));
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
        {translatedCriteria.map((c) => (
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
const inputBase = 'w-full bg-brand-dark border border-brand-gold/20 focus:border-brand-gold rounded-xl py-3 sm:py-3.5 text-sm text-white outline-none transition-all placeholder:text-white/20 shadow-[inset_0_1px_0_rgba(200,164,19,0.04)]';

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
  readOnly?: boolean;
}> = ({ label, type = 'text', value, onChange, placeholder, required, icon, right, minLength, readOnly }) => (
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
        readOnly={readOnly}
        className={`${inputBase} ${icon ? 'pl-11 pr-4' : 'px-4'} ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
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
  readOnly?: boolean;
}> = ({ label, value, onChange, placeholder = '••••••••', required, right, readOnly }) => {
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
          readOnly={readOnly}
          className={`${inputBase} pl-11 pr-11 ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
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
  const { t } = useI18n();
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [fullName, setFullName]         = useState('');
  const [acceptTerms, setAcceptTerms]   = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [successMsg, setSuccessMsg]     = useState<string | null>(null);

  // ── Invite link detection ──
  // URL format: /access/OUTL01?token=abc123
  // When detected, look up the personnel record by access_code and pre-fill
  // the signup form with the correct role/permissions (not admin).
  const [inviteData, setInviteData] = useState<{ role: string; position: string; email: string; fullName: string; outletCode: string; outletName: string; pincode: string; invitedBy: string } | null>(null);
  const role = inviteData?.role || 'admin'; // Default admin only for direct sign-ups
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    const token = new URLSearchParams(window.location.search).get('token');
    if (path.startsWith('/access/') && token) {
      setInviteLoading(true);
      // Extract outlet code from path: /access/OUTL01 → OUTL01
      const outletCode = path.replace('/access/', '').split('/')[0] || '';
      // Look up personnel by access_code (URL-safe code), fall back to hashed pincode
      const lookupPersonnel = async () => {
        // Try access_code first
        let { data } = await supabase.from('personnel').select('*').eq('access_code', token.toUpperCase()).maybeSingle();
        // Fallback: try hashed pincode
        if (!data) {
          const hashedToken = await sha256(token);
          const res = await supabase.from('personnel').select('*').eq('pincode', hashedToken).maybeSingle();
          data = res.data;
        }
        // Legacy fallback: try plaintext pincode (for records created before hashing was added)
        if (!data) {
          const res = await supabase.from('personnel').select('*').eq('pincode', token.toUpperCase()).maybeSingle();
          data = res.data;
        }
        // If found, try to get the inviter's name and outlet name
        if (data) {
          let invitedBy = data.invited_by || '';
          // Fallback: look up sender name from profiles table using user_id
          if (!invitedBy && data.user_id) {
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', data.user_id).maybeSingle();
            if (profile?.full_name) invitedBy = profile.full_name;
          }
          // Look up outlet name from outlets table using outlet_id
          let outletName = '';
          if (data.outlet_id) {
            const { data: outlet } = await supabase.from('outlets').select('name').eq('id', data.outlet_id).maybeSingle();
            if (outlet?.name) outletName = outlet.name;
          }
          return { ...data, invited_by: invitedBy, outlet_name: outletName };
        }
        return data;
      };
      Promise.resolve(lookupPersonnel())
        .then((data) => {
          if (data) {
            const pin = data.pincode || '';
            setInviteData({
              role: data.role || 'supervisor',
              position: data.position || 'Staff',
              email: data.email || '',
              fullName: data.full_name || '',
              outletCode: data.outlet_id || outletCode,
              outletName: data.outlet_name || '',
              pincode: pin,
              invitedBy: data.invited_by || '',
            });
            // Pre-fill the form
            if (data.email) setEmail(data.email);
            if (data.full_name) setFullName(data.full_name);
            if (pin) { setPassword(pin); setVerifyPassword(pin); }
          }
          setInviteLoading(false);
        })
        .catch(() => setInviteLoading(false));
    }
  }, []);

  // Rate limiting
  const lastAttemptTime = useRef<number>(0);
  const attemptCount    = useRef<number>(0);
  const RATE_LIMIT_MS   = 3000;
  const MAX_ATTEMPTS    = 5;

  const isSignIn = currentView === Page.SIGN_IN;
  const isSignUp = currentView === Page.SIGN_UP;
  const isForgot = currentView === Page.FORGOT_PASSWORD;
  const isInvite = !!inviteData; // Arrived via access link

  // Detect ?confirmed=true set by App.tsx after email link is clicked
  const isEmailConfirmed = new URLSearchParams(window.location.search).get('confirmed') === 'true';

  // Clear the ?confirmed param from URL after first render so refresh doesn't re-show the banner
  useEffect(() => {
    if (isEmailConfirmed) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canAttemptAuth = (): boolean => {
    const now = Date.now();
    if (attemptCount.current >= MAX_ATTEMPTS) {
      setError(t('auth.errTooManyAttempts'));
      return false;
    }
    if (now - lastAttemptTime.current < RATE_LIMIT_MS) {
      setError(t('auth.errRateLimit', { n: Math.ceil((RATE_LIMIT_MS - (now - lastAttemptTime.current)) / 1000) }));
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
        setSuccessMsg(t('auth.errResetSent'));
      } catch (err: any) {
        setError(err.message || t('auth.errResetFailed'));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // ── Validation ──
    if (isSignUp && password !== verifyPassword) { setError(t('auth.errPwMismatch')); return; }
    if (isSignUp && !acceptTerms)               { setError(t('auth.errMustAccept')); return; }
    if (isSignUp && password.length < 6)        { setError(t('auth.errPwTooShort')); return; }
    if (isSignUp && !fullName.trim())            { setError(t('auth.errNameRequired')); return; }

    // ── Email-outlet uniqueness check (sign-up only, not invite) ──
    // An email registered to one outlet cannot join another outlet
    if (isSignUp && !isInvite) {
      const { data: existingPersonnel } = await supabase
        .from('personnel')
        .select('outlet_id, role')
        .ilike('email', email.toLowerCase())
        .maybeSingle();
      if (existingPersonnel?.outlet_id) {
        setError(t('auth.errEmailAlreadyOutlet'));
        return;
      }
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('outlet_id')
        .ilike('email', email.toLowerCase())
        .maybeSingle();
      if (existingProfile?.outlet_id) {
        setError(t('auth.errEmailAlreadyOutlet'));
        return;
      }
    }

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
            data: {
              full_name: fullName,
              role,
              position: inviteData?.position || 'Admin',
              outlet_code: inviteData?.outletCode || '',
              auth_origin: inviteData ? 'invite' : 'registration',
            },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });
        if (signUpErr) throw signUpErr;
        authUser = signUpData.user;
        if (!authUser?.id) throw new Error(t('auth.errSignupFailed'));

        // ── Email confirmation required ──
        // session === null means Supabase sent a confirmation email (email confirm enabled).
        // This is the reliable check — email_confirmed_at can be set even before the user
        // clicks the link in some Supabase configurations.
        if (!signUpData.session) {
          // Still sync profile so data is ready when they confirm
          try {
            await supabase.from('profiles').upsert({
              id: authUser.id,
              full_name: fullName,
              role, // From invite or default 'admin'
              position: inviteData?.position || 'Admin',
              legal_consent: false,
            }, { onConflict: 'id' });
            // Only create company_settings for direct sign-ups (admins), not invited staff
            if (!inviteData) {
              await supabase.from('company_settings').upsert({
                user_id: authUser.id,
                admin_name: fullName,
                company_name: 'My Organization',
                audit_cycle: 'Monthly',
              }, { onConflict: 'user_id' });
            }
          } catch (syncErr: any) {
            console.warn('Profile sync warning:', syncErr.message);
          }
          setSuccessMsg('confirmation_sent'); // triggers the check-email screen
          return;
        }
      }

      if (!authUser) throw new Error(t('auth.errAuthFailed'));

      const dynamicFullName = fullName || authUser.user_metadata?.full_name || 'Admin User';
      // ── Super Admin override (from DB/personnel, not hardcoded) ──
      const metaRole = (authUser.user_metadata?.role || '').toLowerCase();
      const isSuperAdmin = metaRole === 'super_admin';
      const finalRole = isSuperAdmin ? 'super_admin' : (authUser.user_metadata?.role || inviteData?.role || 'admin');
      const finalPosition = isSuperAdmin ? 'Super Admin' : (authUser.user_metadata?.position || inviteData?.position || 'Admin');
      const finalOutletCode = authUser.user_metadata?.outlet_code || inviteData?.outletCode || 'ROY02';

      onLogin({
        id: authUser.id,
        fullName: dynamicFullName,
        email: authUser.email || email,
        role: finalRole as any,
        position: finalPosition as any,
        outletCode: finalOutletCode,
        legal_consent: authUser.user_metadata?.legal_consent === true,
      });

    } catch (err: any) {
      let msg = err.message || 'Authentication failed.';
      if (msg.includes('Email not confirmed'))    msg = t('auth.errEmailNotConfirmed');
      if (msg.includes('Invalid login credentials')) msg = t('auth.errInvalidCredentials');
      if (msg.includes('rate limit'))             msg = t('auth.errTooManyRequests');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };



  // Left panel bullet points
  const leftBullets = isSignIn
    ? [t('authBranding.signInBullet1'), t('authBranding.signInBullet2'), t('authBranding.signInBullet3')]
    : [t('authBranding.signUpBullet1'), t('authBranding.signUpBullet2'), t('authBranding.signUpBullet3')];

  return (
    <div className="min-h-screen flex overflow-hidden">

      {/* ── Left branding panel (desktop only) ─── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col relative overflow-hidden bg-[#1c3933]">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 30% 60%, rgba(119,177,57,0.08), transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(200,164,19,0.05), transparent 50%)' }} />
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/8 to-transparent" />

        <div className="relative flex flex-col h-full px-12 py-10">

          {/* Main content */}
          <div className="flex-1 flex flex-col justify-center items-center gap-10 text-center">

            {/* Logo — click to go home */}
            <button onClick={() => onNavigate(Page.HOME)} className="hover:opacity-80 transition-opacity">
              <div className="w-28 h-28 xl:w-32 xl:h-32">
                <img src="/logo.png" alt="Ecometricus" className="w-full h-full object-contain" />
              </div>
            </button>

            {/* Tagline */}
            <div className="space-y-3 max-w-xs">
              <h2 className="text-2xl sm:text-3xl font-geometric font-bold text-white leading-snug">
                {isSignIn ? (
                  <>{t('authBranding.signInHeadline')}<br /><span className="text-brand-gold">{t('authBranding.signInHeadlineGold')}</span></>
                ) : (
                  <>{t('authBranding.signUpHeadline')}<br /><span className="text-brand-gold">{t('authBranding.signUpHeadlineGold')}</span></>
                )}
              </h2>
              <p className="text-sm text-white/40 leading-relaxed">
                {isSignIn ? t('authBranding.signInTagline') : t('authBranding.signUpTagline')}
              </p>
            </div>

            {/* Bullets */}
            <ul className="space-y-3.5 text-left">
              {leftBullets.map(b => (
                <li key={b} className="flex items-center gap-3 text-sm text-white/60">
                  <CheckCircle2 size={16} className="text-brand-eco shrink-0" />
                  {b}
                </li>
              ))}
            </ul>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck size={12} className="text-brand-eco shrink-0" />
            <p className="text-xs text-white/25">{t('auth.encrypted')}</p>
          </div>

        </div>
      </div>

      {/* ── Right form panel ─── */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-brand-dark">

        {/* Mobile logo — hidden, moved into centered container below */}

        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8">
          <div className="w-full max-w-sm">

            {/* Mobile logo — inside centered container */}
            <div className="lg:hidden flex justify-center mb-6">
              <button onClick={() => onNavigate(Page.HOME)} className="hover:opacity-80 transition-opacity">
                <div className="w-14 h-14 sm:w-16 sm:h-16">
                  <img src="/logo.png" alt="Ecometricus" className="w-full h-full object-contain" />
                </div>
              </button>
            </div>

            {/* ── Check-your-email confirmation screen ── */}
            {successMsg === 'confirmation_sent' && (
              <div className="flex flex-col items-center text-center gap-5 sm:gap-6 py-4 sm:py-8">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-brand-eco/10 border border-brand-eco/30 flex items-center justify-center">
                    <Mail size={28} className="text-brand-eco sm:hidden" />
                    <Mail size={36} className="text-brand-eco hidden sm:block" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-eco border-2 border-brand-dark flex items-center justify-center">
                    <CheckCircle2 size={11} className="text-brand-dark" />
                  </span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-geometric font-bold text-white">{t('auth.checkInbox')}</h2>
                  <p className="text-xs sm:text-sm text-white/40 leading-relaxed max-w-sm">
                    {t('auth.confirmationSent', { email })}
                  </p>
                </div>
                <div className="w-full p-4 rounded-xl bg-white/3 border border-brand-gold/15 text-left space-y-2">
                  {[t('auth.tipSpam'), t('auth.tipExpires'), t('auth.tipDashboard')].map((tip) => (
                    <div key={tip} className="flex items-start gap-2.5">
                      <span className="w-1 h-1 rounded-full bg-brand-gold/50 mt-2 shrink-0" />
                      <p className="text-xs text-white/35">{tip}</p>
                    </div>
                  ))}
                </div>
                <a
                  href={(() => {
                    const domain = email.split('@')[1]?.toLowerCase() ?? '';
                    if (domain.includes('gmail'))                         return 'https://mail.google.com';
                    if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live') || domain.includes('msn')) return 'https://outlook.live.com';
                    if (domain.includes('yahoo'))                         return 'https://mail.yahoo.com';
                    if (domain.includes('icloud') || domain.includes('me.com') || domain.includes('mac.com')) return 'https://www.icloud.com/mail';
                    if (domain.includes('proton'))                        return 'https://mail.proton.me';
                    return `mailto:${email}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-[#1c3933] border border-brand-gold/25 text-brand-gold hover:bg-brand-gold/10 hover:border-brand-gold/50 rounded-xl py-3 text-sm font-semibold transition-all"
                >
                  <Mail size={15} />
                  Open Email App
                </a>
                <button type="button" onClick={() => { setSuccessMsg(null); onNavigate(Page.SIGN_IN); }} className="text-sm text-white/30 hover:text-white transition-colors">
                  {t('auth.backToLogIn')}
                </button>
              </div>
            )}

            {/* ── Normal form ── */}
            {successMsg !== 'confirmation_sent' && (
              <div className="space-y-6">

                {/* Header */}
                {isForgot ? (
                  <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-geometric font-bold text-white">{t('auth.forgotPassword')}</h1>
                    <p className="text-xs sm:text-sm text-white/40">{t('auth.forgotPasswordDesc')}</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl font-geometric font-bold text-white">
                      {isSignIn ? t('auth.welcomeBack') : t('auth.createAccount')}
                    </h1>
                    <p className="text-xs sm:text-sm text-white/40">
                      {isSignIn ? t('auth.signInAccount') : t('auth.setUpAccount')}
                    </p>
                  </div>
                )}

                {/* Email confirmation success banner */}
                {isSignIn && isEmailConfirmed && (
                  <div className="p-3.5 bg-brand-eco/10 border border-brand-eco/30 rounded-xl flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-brand-eco shrink-0 mt-0.5" />
                    <p className="text-sm text-brand-eco font-medium">Email confirmed! Please sign in to access your dashboard.</p>
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
                        className="w-full flex items-center justify-center gap-2 bg-[#1c3933] border border-brand-gold/25 text-brand-gold hover:bg-brand-gold/10 hover:border-brand-gold/50 rounded-xl py-3 text-sm font-semibold transition-all"
                      >
                        <Mail size={15} />
                        {t('auth.openEmail')}
                      </a>
                    )}
                  </div>
                )}

                {/* Form card */}
                <form onSubmit={handleSubmit} className="bg-[#1c3933] border border-brand-gold/25 rounded-2xl p-4 sm:p-6 space-y-4">

                  {/* Invite banner */}
                  {isInvite && isSignUp && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-gold/10 border border-brand-gold/25">
                      <ShieldCheck size={16} className="text-brand-gold shrink-0" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-gold">Invitation</p>
                        <p className="text-xs text-white/70 mt-0.5">
                          {inviteData?.invitedBy
                            ? <><span className="text-brand-gold font-bold">{inviteData.invitedBy}</span> has invited you to join {inviteData?.outletName ? <span className="text-brand-gold font-bold">{inviteData.outletName}</span> : null} as <span className="text-brand-gold font-bold">{inviteData?.position}</span></>
                            : <>You've been invited{inviteData?.outletName ? <> to join <span className="text-brand-gold font-bold">{inviteData.outletName}</span></> : null} as <span className="text-brand-gold font-bold">{inviteData?.position}</span></>
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  {inviteLoading && (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-5 h-5 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
                      <span className="ml-3 text-xs text-white/50">Loading invitation…</span>
                    </div>
                  )}

                  {isSignUp && (
                    <Field label={t('auth.fullName')} value={fullName} onChange={setFullName} placeholder={t('auth.fullNamePlaceholder')} required icon={<User size={14} />} readOnly={isInvite} />
                  )}

                  <Field label={t('auth.email')} type="email" value={email} onChange={setEmail} placeholder={t('auth.emailPlaceholder')} required icon={<Mail size={14} />} readOnly={isInvite} />

                  {!isForgot && (
                    <div className="space-y-2">
                      <PasswordField
                        label={t('auth.password')}
                        value={password}
                        onChange={setPassword}
                        required
                        readOnly={isInvite}
                        right={isSignIn ? (
                          <button type="button" onClick={() => { onNavigate(Page.FORGOT_PASSWORD); setError(null); }} className="text-xs text-brand-gold hover:underline transition-colors">
                            {t('auth.forgotPasswordLink')}
                          </button>
                        ) : undefined}
                      />
                      {isSignUp && <PasswordStrength password={password} />}
                    </div>
                  )}

                  {isSignUp && (
                    <PasswordField label={t('auth.confirmPassword')} value={verifyPassword} onChange={setVerifyPassword} placeholder={t('auth.repeatPassword')} required readOnly={isInvite} />
                  )}

                  {isSignUp && (
                    <div className="flex items-start gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setAcceptTerms(!acceptTerms)}
                        className={`shrink-0 w-4 h-4 rounded border mt-0.5 flex items-center justify-center transition-all ${acceptTerms ? 'bg-brand-eco border-brand-eco' : 'border-brand-gold/20 hover:border-brand-eco'}`}
                      >
                        {acceptTerms && <CheckCircle2 size={10} className="text-brand-dark" />}
                      </button>
                      <span className="text-xs text-white/40 leading-relaxed">
                        {t('auth.agreeTerms')}{' '}
                        <button type="button" onClick={() => onNavigate(Page.TERMS)} className="text-brand-gold hover:underline">{t('auth.terms')}</button>
                        {' '}{t('auth.and')}{' '}
                        <button type="button" onClick={() => onNavigate(Page.PRIVACY)} className="text-brand-gold hover:underline">{t('auth.privacyPolicy')}</button>
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || (isSignUp && !acceptTerms)}
                    className="w-full flex items-center justify-center gap-2.5 bg-brand-eco text-brand-dark py-3 sm:py-3.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all shadow-[0_6px_20px_rgba(119,177,57,0.3)] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <><div className="w-4 h-4 border-2 border-brand-dark/30 border-t-brand-dark rounded-full animate-spin" />
                      {isSignIn ? t('auth.signingIn') : isSignUp ? t('auth.creatingAccount') : t('auth.sending')}</>
                    ) : (
                      <>
                        {isForgot && <Send size={14} />}
                        {isSignIn && t('auth.signIn')}
                        {isSignUp && t('auth.createAccountBtn')}
                        {isForgot && t('auth.sendResetLink')}
                      </>
                    )}
                  </button>

                  {isForgot && (
                    <button type="button" onClick={() => { onNavigate(Page.SIGN_IN); setError(null); setSuccessMsg(null); }} className="w-full text-center text-sm text-white/30 hover:text-white transition-colors">
                      {t('auth.backToSignIn')}
                    </button>
                  )}
                </form>

                {/* Switch link */}
                {!isForgot && (
                  <p className="text-center text-sm text-white/40">
                    {isSignIn ? (
                      <>{t('auth.noAccount')}{' '}<button type="button" onClick={() => { onNavigate(Page.SIGN_UP); setError(null); setSuccessMsg(null); }} className="text-brand-gold font-semibold hover:underline">{t('auth.signUpLink')}</button></>
                    ) : (
                      <>{t('auth.haveAccount')}{' '}<button type="button" onClick={() => { onNavigate(Page.SIGN_IN); setError(null); setSuccessMsg(null); }} className="text-brand-gold font-semibold hover:underline">{t('auth.signInLink')}</button></>
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
