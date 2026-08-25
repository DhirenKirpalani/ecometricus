
import React, { useState, useEffect, useRef } from 'react';
import { Mail, CalendarCheck, MessageSquare, MapPin, Send, Check, ChevronDown, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../lib/useI18n';

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error';
interface Toast { id: number; type: ToastType; msg: string; createdAt: number }

const TOAST_DURATION = 4500;

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
  const { t } = useI18n();
  const [progress, setProgress] = useState(100);
  const isSuccess = toast.type === 'success';

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - toast.createdAt;
      const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION) * 100);
      setProgress(remaining);
    }, 30);
    return () => clearInterval(interval);
  }, [toast.createdAt]);

  return (
    <div className={`relative w-80 rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.5)] pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-300 ${
      isSuccess ? 'bg-[#0d2620]' : 'bg-[#200d0d]'
    }`}>
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isSuccess ? 'bg-brand-eco' : 'bg-brand-alert'}`} />

      {/* Content */}
      <div className="flex items-start gap-3.5 px-5 py-4 pl-5">
        {/* Icon */}
        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
          isSuccess ? 'bg-brand-eco/15 border border-brand-eco/30' : 'bg-brand-alert/15 border border-brand-alert/30'
        }`}>
          {isSuccess
            ? <CheckCircle2 size={15} className="text-brand-eco" />
            : <AlertCircle size={15} className="text-brand-alert" />
          }
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-[0.25em] mb-0.5 ${isSuccess ? 'text-brand-eco' : 'text-brand-alert'}`}>
            {isSuccess ? t('contact.success') : t('contact.error')}
          </p>
          <p className="text-sm text-white/85 leading-snug">{toast.msg}</p>
        </div>

        {/* Dismiss */}
        <button
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/8 transition-all mt-0.5"
        >
          <X size={12} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-[3px] bg-white/5">
        <div
          className={`h-full transition-none ${isSuccess ? 'bg-brand-eco/50' : 'bg-brand-alert/50'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: number) => void }> = ({ toasts, onDismiss }) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2.5 pointer-events-none">
    {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />)}
  </div>
);

// ─── Custom Select ─────────────────────────────────────────────────────────────
const SUBJECT_VALUES = [
  { value: 'demo',        key: 'topicDemo' },
  { value: 'pricing',     key: 'topicPricing' },
  { value: 'support',     key: 'topicSupport' },
  { value: 'partnership', key: 'topicPartnership' },
  { value: 'press',       key: 'topicPress' },
  { value: 'other',       key: 'topicOther' },
] as const;

interface CustomSelectProps {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  placeholder: string;
  options: { value: string; label: string }[];
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, error, placeholder, options }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(s => s.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between bg-brand-dark border rounded-xl px-4 py-3 text-sm outline-none transition-all ${
          open ? 'border-brand-gold' : error ? 'border-brand-alert/60' : 'border-white/12 hover:border-white/25'
        }`}
      >
        <span className={selected ? 'text-white' : 'text-white/25'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={15}
          className={`text-white/40 transition-transform duration-200 ${open ? 'rotate-180 text-brand-gold' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 w-full bg-[#0e1f1c] border border-brand-gold/25 rounded-xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)] animate-in fade-in slide-in-from-top-2 duration-150">
          {options.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => { onChange(s.value); setOpen(false); }}
              className={`w-full text-left px-4 py-3 text-sm transition-all flex items-center gap-3 ${
                value === s.value
                  ? 'bg-brand-gold/10 text-brand-gold font-bold'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              {value === s.value && <span className="w-1 h-1 rounded-full bg-brand-gold shrink-0" />}
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const ContactPage: React.FC = () => {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', email: '', property: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  const subjects = SUBJECT_VALUES.map(s => ({ value: s.value, label: t(`contact.${s.key}`) }));

  const addToast = (type: ToastType, msg: string) => {
    const id = ++toastCounter.current;
    setToasts(prev => [...prev, { id, type, msg, createdAt: Date.now() }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), TOAST_DURATION);
  };

  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  // ── Client-side validation ──
  const validate = (): string | null => {
    if (!form.name.trim()) return t('contact.errNameRequired');
    if (!form.email.trim()) return t('contact.errEmailRequired');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return t('contact.errEmailInvalid');
    if (!form.message.trim()) return t('contact.errMessageEmpty');
    if (form.message.trim().length < 10) return t('contact.errMessageShort');
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);

    // Client validation
    const clientError = validate();
    if (clientError) {
      addToast('error', clientError);
      return;
    }

    setLoading(true);

    // Simulated server-side save (localStorage as placeholder until backend is wired)
    try {
      await new Promise(r => setTimeout(r, 800)); // simulate network latency
      const existing = JSON.parse(localStorage.getItem('ecometricus_contact_submissions') || '[]');
      // Server-side check: duplicate submission within 60s
      const recent = existing.find((s: { email: string; submittedAt: string }) =>
        s.email === form.email.trim() &&
        Date.now() - new Date(s.submittedAt).getTime() < 60_000
      );
      if (recent) {
        addToast('error', t('contact.errDuplicate'));
        setLoading(false);
        return;
      }
      existing.push({ ...form, submittedAt: new Date().toISOString() });
      localStorage.setItem('ecometricus_contact_submissions', JSON.stringify(existing));
      addToast('success', t('contact.successMsg'));
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (_) {
      addToast('error', t('contact.errGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full bg-brand-dark border rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-brand-gold ${
      attempted && !(form as Record<string, string>)[field]?.trim()
        ? 'border-brand-alert/60'
        : 'border-white/12'
    }`;

  const channels = [
    {
      icon: <Mail className="text-brand-gold" size={24} />,
      title: t('contact.emailUs'),
      desc: t('contact.emailUsDesc'),
      action: 'earth@urbanseed.net',
      href: 'mailto:earth@urbanseed.net',
    },
    {
      icon: <CalendarCheck className="text-brand-eco" size={24} />,
      title: t('contact.bookDemo'),
      desc: t('contact.bookDemoDesc'),
      action: t('contact.bookOnCalendly'),
      href: 'https://calendly.com/urbanseed-ai/ai-bureau-services',
    },
    {
      icon: <MapPin className="text-brand-energy" size={24} />,
      title: t('contact.ourBureau'),
      desc: t('contact.bureauDesc'),
      action: t('contact.byAppointment'),
      href: undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-brand-dark">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 100%, rgba(200,164,19,0.07), transparent 55%)' }} />
        <div className="max-w-4xl mx-auto px-6 py-20 sm:py-28 text-center relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-gold/10 border border-brand-gold/30 mb-6">
            <MessageSquare className="text-brand-gold" size={30} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold mb-3">{t('contact.getInTouch')}</p>
          <h1 className="text-3xl sm:text-5xl font-geometric font-black text-white uppercase tracking-widest mb-4">
            {t('contact.title')}
          </h1>
          <p className="text-base text-gray-400 font-light max-w-xl mx-auto leading-relaxed">
            {t('contact.subtitle')}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-14 pb-24">

        {/* Contact channel cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-16">
          {channels.map((ch, i) => (
            <div key={i} className="bg-[#0e1f1c] border border-white/10 rounded-2xl p-6 hover:border-brand-gold/30 transition-all duration-300 flex flex-col gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="w-12 h-12 rounded-xl bg-white/8 border border-white/8 flex items-center justify-center">
                {ch.icon}
              </div>
              <div>
                <p className="text-sm font-geometric font-black text-white uppercase tracking-widest mb-1">{ch.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{ch.desc}</p>
                {ch.href ? (
                  <a
                    href={ch.href}
                    target={ch.href.startsWith('http') ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="text-xs font-bold uppercase tracking-widest text-brand-gold hover:text-white transition-colors"
                  >
                    {ch.action} →
                  </a>
                ) : (
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-600">{ch.action}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Form + success state */}
        {submitted ? (
          <div className="max-w-xl mx-auto text-center py-16 space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand-eco/15 border-2 border-brand-eco mx-auto">
              <Check className="text-brand-eco" size={40} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-geometric font-black text-white uppercase tracking-widest">{t('contact.messageSent')}</h2>
            <p className="text-gray-400 leading-relaxed">
              {t('contact.messageSentDesc')}
            </p>
            <button
              onClick={() => { setSubmitted(false); setForm({ name: '', email: '', property: '', subject: '', message: '' }); setAttempted(false); }}
              className="mt-4 px-8 py-3 border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10 rounded-full font-bold text-xs uppercase tracking-widest transition-all"
            >
              {t('contact.sendAnother')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">

            {/* Left info panel */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#0e1f1c] border border-brand-gold/20 rounded-2xl p-6 sm:p-8 shadow-[inset_0_1px_0_rgba(200,164,19,0.06)]">
                <h2 className="text-lg font-geometric font-black text-white uppercase tracking-widest mb-4">
                  {t('contact.whyReachOut')}
                </h2>
                <ul className="space-y-4">
                  {[
                    t('contact.why1'),
                    t('contact.why2'),
                    t('contact.why3'),
                    t('contact.why4'),
                    t('contact.why5'),
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-400 leading-relaxed">
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brand-gold/60 mt-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#0e1f1c] border border-white/10 rounded-2xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-eco mb-2">{t('contact.responseTime')}</p>
                <p className="text-sm text-gray-400 leading-relaxed">{t('contact.responseTimeDesc')}</p>
              </div>
            </div>

            {/* Right form */}
            <form onSubmit={handleSubmit} noValidate className="lg:col-span-3 bg-[#0e1f1c] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <h2 className="text-lg font-geometric font-black text-white uppercase tracking-widest mb-2">{t('contact.sendMessage')}</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">{t('contact.fullName')}</label>
                  <input type="text" placeholder={t('contact.fullNamePlaceholder')} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputClass('name')} />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">{t('contact.email')}</label>
                  <input type="email" placeholder={t('contact.emailPlaceholder')} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputClass('email')} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">{t('contact.property')}</label>
                <input type="text" placeholder={t('contact.propertyPlaceholder')} value={form.property} onChange={e => setForm(p => ({ ...p, property: e.target.value }))} className="w-full bg-brand-dark border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-all focus:border-brand-gold" />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">{t('contact.subject')}</label>
                <CustomSelect
                  value={form.subject}
                  onChange={v => setForm(p => ({ ...p, subject: v }))}
                  placeholder={t('contact.selectTopic')}
                  options={subjects}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/60 mb-2">{t('contact.message')}</label>
                <textarea
                  rows={5}
                  placeholder={t('contact.messagePlaceholder')}
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  className={`${inputClass('message')} resize-none`}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-brand-eco text-brand-dark hover:brightness-110 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all transform hover:scale-[1.02] shadow-[0_10px_25px_rgba(119,177,57,0.3)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-brand-dark/30 border-t-brand-dark animate-spin" />
                ) : (
                  <Send size={15} />
                )}
                {loading ? t('contact.sending') : t('contact.sendBtn')}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactPage;
