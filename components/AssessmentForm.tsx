
import React, { useState, useMemo } from 'react';
import { Page } from '../types';
import { Check, ChevronLeft, Send, Leaf, ShieldCheck } from 'lucide-react';
import { useI18n } from '../lib/useI18n';

interface AssessmentFormProps {
  onNavigate: (page: Page) => void;
}

type QuestionType = 'text' | 'select' | 'single' | 'multi' | 'multi-limit';

interface BaseQuestion {
  id: string;
  number: number;
  label: string;
  required: boolean;
  type: QuestionType;
  helper?: string;
}
interface TextQuestion extends BaseQuestion { type: 'text'; placeholder?: string; }
interface SelectQuestion extends BaseQuestion { type: 'select'; options: string[]; placeholder?: string; }
interface SingleQuestion extends BaseQuestion { type: 'single'; options: string[]; }
interface MultiQuestion extends BaseQuestion { type: 'multi' | 'multi-limit'; options: string[]; max?: number; }

type Question = TextQuestion | SelectQuestion | SingleQuestion | MultiQuestion;

interface Section {
  id: string;
  title: string;
  questions: Question[];
}

const sections: Section[] = [
  {
    id: 'org',
    title: 'section1',
    questions: [
      { id: 'q1', number: 1, label: 'q1Label', required: true, type: 'select', placeholder: 'selectDefault', options: ['Hotel', 'Resort', 'Boutique Hotel', 'Restaurant', 'Cruise Ship', 'Other'] },
      { id: 'q2', number: 2, label: 'q2Label', required: true, type: 'select', placeholder: 'selectDefault', options: ['1', '2-3', '4-6', '7-10', '10+'] },
      { id: 'q3', number: 3, label: 'q3Label', required: true, type: 'select', placeholder: 'selectDefault', options: ['Less than 50', '50-100', '101-200', '201-500', '500+'] },
    ],
  },
  {
    id: 'ops',
    title: 'section2',
    questions: [
      { id: 'q4', number: 4, label: 'q4Label', required: true, type: 'single', options: ['No tracking at all', 'Manual visual estimate only', 'Periodic weighing (Not daily)', 'Daily weighing with spreadsheets', 'Using a waste tracking system'] },
      { id: 'q5', number: 5, label: 'q5Label', required: false, type: 'multi', options: ['Preparation waste (kitchen prep)', 'Buffet waste (overproduction)', 'Plate waste (guest leftovers)', 'Spoilage (storage/inventory issues)', 'We cannot classify by source'] },
      { id: 'q6', number: 6, label: 'q6Label', required: true, type: 'single', options: ["We don't track food cost %", 'Monthly P&L review only', 'Weekly inventory counts', 'Daily tracking per outlet', 'Real-time POS integration'] },
      { id: 'q7', number: 7, label: 'q7Label', required: true, type: 'multi-limit', max: 3, options: ['Food cost control', 'Labor efficiency', 'Waste management', 'Menu profitability', 'Inventory accuracy', 'Guest satisfaction', 'Supply chain management'] },
    ],
  },
  {
    id: 'esg',
    title: 'section3',
    questions: [
      { id: 'q8', number: 8, label: 'q8Label', required: true, type: 'select', placeholder: 'selectDefault', options: ['Yes, annually', 'Yes, periodically', 'No, but planning to', 'No'] },
      { id: 'q9', number: 9, label: 'q9Label', required: true, type: 'multi', options: ['Food waste weight/volume', 'Food waste as % of purchases', 'Carbon footprint (Scope 3) from F&B', 'Water consumption from F&B', 'Local/sustainable sourcing %', "We don't include F&B-specific metrics"] },
      { id: 'q10', number: 10, label: 'q10Label', required: true, type: 'select', placeholder: 'selectDefault', options: ['Yes, fully aware', 'Somewhat aware', 'No, I was unaware'] },
      { id: 'q11', number: 11, label: 'q11Label', required: true, type: 'multi', options: ['Meet corporate ESG targets', 'Reduce operational costs', 'Guest/brand expectations', 'Regulatory compliance', 'Achieve sustainability certifications', 'No specific goal yet'] },
    ],
  },
  {
    id: 'tech',
    title: 'section4',
    questions: [
      { id: 'q12', number: 12, label: 'q12Label', required: true, type: 'multi', options: ['POS (point of sale)', 'Inventory management software', 'Recipe/menu engineering platform', 'Waste tracking system (Winnow, Leanpath, etc.)', 'ESG reporting platform', 'Spreadsheets only'] },
      { id: 'q13', number: 13, label: 'q13Label', required: true, type: 'multi', options: ['Not applicable - we don\'t use one', 'High upfront hardware costs ($3,000-6,000+)', 'Long implementation time', 'Staff resistance to using it', "Data doesn't integrate with other systems", 'Limited actionable insights', 'Proprietary hardware lock-in'] },
      { id: 'q14', number: 14, label: 'q14Label', required: true, type: 'select', placeholder: 'selectDefault', options: ['1 - Very uncomfortable', '2 - Uncomfortable', '3 - Neutral', '4 - Comfortable', '5 - Very comfortable'] },
      { id: 'q15', number: 15, label: 'q15Label', required: true, type: 'select', placeholder: 'selectDefault', options: ['Real-time', 'Daily', 'Weekly', 'Monthly', 'Quarterly'] },
    ],
  },
  {
    id: 'ai',
    title: 'section5',
    questions: [
      { id: 'q16', number: 16, label: 'q16Label', required: true, type: 'multi', options: ['Waste trends by time, day, or season', 'Financial impact (cost per kg wasted)', 'CO₂ equivalents for ESG reporting', 'Predictive alerts (forecasted waste spikes)', 'Comparison vs industry benchmarks', 'Outlet-by-outlet performance'] },
      { id: 'q17', number: 17, label: 'q17Label', required: true, type: 'single', options: ['Yes, all of the above', 'Some of the above', 'Not sure yet', 'No'] },
      { id: 'q18', number: 18, label: 'q18Label', required: true, type: 'select', placeholder: 'selectDefault', options: ['1 - Not important', '2 - Slightly important', '3 - Moderately important', '4 - Very important', '5 - Critical'] },
    ],
  },
  {
    id: 'invest',
    title: 'section6',
    questions: [
      { id: 'q19', number: 19, label: 'q19Label', required: true, type: 'select', placeholder: 'selectDefault', options: ['No budget allocated yet', 'Less than $1k/month', '$1k - $5k/month', '$5k - $10k/month', '$10k+/month'] },
      { id: 'q20', number: 20, label: 'q20Label', required: true, type: 'select', placeholder: 'selectDefault', options: ['Immediately', '1-3 months', '3-6 months', '6-12 months', 'Just exploring'] },
      { id: 'q21', number: 21, label: 'q21Label', required: true, type: 'select', placeholder: 'selectDefault', options: ['1 - Not important', '2 - Slightly important', '3 - Moderately important', '4 - Very important', '5 - Critical'] },
      { id: 'q22', number: 22, label: 'q22Label', required: true, type: 'select', placeholder: 'selectDefault', options: ['F&B Director', 'Executive Chef', 'General Manager', 'Owner', 'Sustainability/ESG Officer', 'Other'] },
    ],
  },
  {
    id: 'pain',
    title: 'section7',
    questions: [
      { id: 'q23', number: 23, label: 'q23Label', required: true, type: 'multi-limit', max: 3, options: ['Reduce food costs immediately', 'Meet ESG reporting requirements', 'Improve team accountability', 'Achieve sustainability certifications', 'Enhance brand reputation', 'Simplify data collection for staff', 'Get real-time operational insights'] },
    ],
  },
];

const profileFields = [
  { id: 'fullName', label: 'fullNameLabel', required: true, placeholder: 'fullNamePlaceholder', type: 'text' as const },
  { id: 'email', label: 'emailLabel', required: true, placeholder: 'emailPlaceholder', type: 'email' as const },
  { id: 'propertyName', label: 'propertyNameLabel', required: true, placeholder: 'propertyNamePlaceholder', type: 'text' as const },
];

const letterLabel = (i: number) => String.fromCharCode(65 + i); // A, B, C...

const AssessmentForm: React.FC<AssessmentFormProps> = ({ onNavigate }) => {
  const { t } = useI18n();
  const allQuestions = useMemo(() => sections.flatMap(s => s.questions), []);
  const [profile, setProfile] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const setSingle = (id: string, value: string) => setAnswers(prev => ({ ...prev, [id]: value }));

  const toggleMulti = (id: string, value: string, max?: number) => {
    setAnswers(prev => {
      const current = (prev[id] as string[]) || [];
      if (current.includes(value)) {
        return { ...prev, [id]: current.filter(v => v !== value) };
      }
      if (max && current.length >= max) return prev; // respect limit
      return { ...prev, [id]: [...current, value] };
    });
  };

  const isQuestionAnswered = (q: Question): boolean => {
    const a = answers[q.id];
    if (q.type === 'multi' || q.type === 'multi-limit') return Array.isArray(a) && a.length > 0;
    return typeof a === 'string' && a.trim().length > 0;
  };

  const isProfileComplete = () => profileFields.every(f => (profile[f.id] || '').trim().length > 0);

  const isFormComplete = () => isProfileComplete() && allQuestions.filter(q => q.required).every(isQuestionAnswered);

  const totalRequired = profileFields.filter(f => f.required).length + allQuestions.filter(q => q.required).length;
  const answeredCount = profileFields.filter(f => (profile[f.id] || '').trim().length > 0).length
    + allQuestions.filter(q => q.required && isQuestionAnswered(q)).length;
  const progress = Math.round((answeredCount / totalRequired) * 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete()) {
      setAttemptedSubmit(true);
      // scroll to first missing required question
      const firstMissing = allQuestions.find(q => q.required && !isQuestionAnswered(q));
      if (firstMissing) {
        const el = document.getElementById(`question-${firstMissing.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (!isProfileComplete()) {
        document.getElementById('assessment-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    const payload = { profile, answers, submittedAt: new Date().toISOString() };
    // Persist locally so the team can retrieve later; replace with API/Supabase when ready.
    try {
      const existing = JSON.parse(localStorage.getItem('ecometricus_assessments') || '[]');
      existing.push(payload);
      localStorage.setItem('ecometricus_assessments', JSON.stringify(existing));
    } catch (err) {
      console.warn('Could not persist assessment locally', err);
    }
    console.log('Ecometricus assessment submitted:', payload);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-xl w-full text-center space-y-6 sm:space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="flex justify-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-brand-eco/15 border-2 border-brand-eco flex items-center justify-center">
              <Check className="text-brand-eco" size={40} strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-2xl sm:text-4xl font-geometric font-black text-brand-gold tracking-widest uppercase">
            {t('assessment.successTitle')}
          </h1>
          <p className="text-sm sm:text-lg font-body text-white/80 leading-relaxed">
            {t('assessment.successMessage')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
            <button
              onClick={() => onNavigate(Page.HOME)}
              className="px-6 sm:px-8 py-3.5 sm:py-4 bg-brand-eco hover:bg-brand-eco/90 text-brand-dark font-geometric font-bold tracking-wide uppercase text-sm rounded-full transition-all shadow-[0_4px_14px_0_rgba(119,177,57,0.39)] hover:-translate-y-0.5"
            >
              {t('assessment.backToHome')}
            </button>
            <button
              onClick={() => { setSubmitted(false); setAnswers({}); setProfile({}); setAttemptedSubmit(false); }}
              className="px-6 sm:px-8 py-3.5 sm:py-4 border-2 border-brand-gold/50 text-brand-gold hover:bg-brand-gold/10 font-geometric font-bold tracking-wide uppercase text-sm rounded-full transition-all"
            >
              {t('assessment.submitAnother')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="assessment-top" className="min-h-screen bg-brand-dark text-white">
      {/* Sticky progress bar */}
      <div className="sticky top-0 z-30 bg-brand-dark/95 backdrop-blur-md border-b border-brand-gold/5">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => onNavigate(Page.HOME)}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/60 hover:text-brand-gold transition-colors shrink-0"
          >
            <ChevronLeft size={16} /> {t('assessment.back')}
          </button>
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-eco to-brand-gold transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs font-bold text-brand-gold tabular-nums shrink-0">{progress}%</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 sm:px-6 pb-24">
        {/* Cover */}
        <div className="relative h-40 sm:h-56 -mx-4 sm:-mx-6 mb-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-eco/40 via-brand-dark to-brand-gold/20" />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(200,164,19,0.4), transparent 50%), radial-gradient(circle at 80% 70%, rgba(119,177,57,0.4), transparent 50%)' }} />
          <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur border border-brand-gold/40 flex items-center justify-center mb-3">
              <Leaf className="text-brand-gold" size={28} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold/80">{t('assessment.brand')}</p>
          </div>
        </div>

        {/* Header card */}
        <div className="bg-brand-dark/60 border border-brand-gold/20 rounded-b-3xl rounded-t-none px-4 sm:px-10 py-8 sm:py-12 -mt-1 shadow-2xl">
          <h1 className="text-xl sm:text-3xl font-geometric font-black text-white tracking-wide uppercase leading-tight">
            {t('assessment.title')}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-white/70 font-body leading-relaxed">
            {t('assessment.subtitle')}
          </p>

          {/* Disclaimer */}
          <div className="mt-6 flex gap-3 rounded-2xl bg-brand-dark border border-brand-gold/15 p-4">
            <ShieldCheck className="text-brand-eco shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-white/60 leading-relaxed">
              {t('assessment.disclaimer')}
            </p>
          </div>

          {/* Profile fields */}
          <div className="mt-8 space-y-5">
            {profileFields.map(field => {
              const value = profile[field.id] || '';
              const showError = attemptedSubmit && field.required && !value.trim();
              return (
                <div key={field.id}>
                  <label className="block text-sm font-geometric font-bold text-white/90 mb-2">
                    {t(`assessment.${field.label}`)} {field.required && <span className="text-brand-alert">*</span>}
                  </label>
                  <input
                    type={field.type}
                    value={value}
                    placeholder={t(`assessment.${field.placeholder}`)}
                    onChange={e => setProfile(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className={`w-full bg-brand-dark border rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all focus:bg-brand-dark/80 focus:border-brand-gold ${
                      showError ? 'border-brand-alert/70' : 'border-brand-gold/25'
                    }`}
                  />
                  {showError && <p className="mt-1.5 text-xs text-brand-alert">{t('assessment.requiredField')}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sections */}
        <div className="mt-8 space-y-8">
          {sections.map(section => (
            <div key={section.id} className="bg-brand-dark/60 border border-brand-gold/15 rounded-3xl px-4 sm:px-10 py-6 sm:py-10 shadow-xl">
              <h2 className="text-base sm:text-xl font-geometric font-black text-brand-gold tracking-wide uppercase mb-5 sm:mb-6 pb-4 border-b border-brand-gold/15">
                {t(`assessment.${section.title}`)}
              </h2>
              <div className="space-y-8">
                {section.questions.map(q => (
                  <QuestionField
                    key={q.id}
                    question={q}
                    value={answers[q.id]}
                    onSingle={(v) => setSingle(q.id, v)}
                    onMulti={(v) => toggleMulti(q.id, v, (q as MultiQuestion).max)}
                    showError={attemptedSubmit && q.required && !isQuestionAnswered(q)}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Thank you note + submit */}
        <div className="mt-8 bg-brand-dark/60 border border-brand-gold/20 rounded-3xl px-4 sm:px-10 py-6 sm:py-10 shadow-xl text-center">
          <p className="text-sm text-white/70 leading-relaxed max-w-xl mx-auto">
            {t('assessment.preSubmitNote')}
          </p>
          <button
            type="submit"
            className="mt-6 inline-flex items-center gap-3 px-8 sm:px-10 py-3.5 sm:py-4 bg-brand-eco hover:bg-brand-eco/90 text-white font-geometric font-bold tracking-widest uppercase text-sm rounded-full transition-all shadow-[0_8px_24px_rgba(119,177,57,0.4)] hover:-translate-y-0.5"
          >
            <Send size={16} /> {t('assessment.submit')}
          </button>
          {attemptedSubmit && !isFormComplete() && (
            <p className="mt-4 text-xs text-brand-alert">
              {t('assessment.submitError')}
            </p>
          )}
        </div>
      </form>
    </div>
  );
};

const QuestionField: React.FC<{
  question: Question;
  value: string | string[] | undefined;
  onSingle: (v: string) => void;
  onMulti: (v: string) => void;
  showError: boolean;
  t: (key: string) => string;
}> = ({ question: q, value, onSingle, onMulti, showError, t }) => {
  const selectedArr = (q.type === 'multi' || q.type === 'multi-limit') ? (value as string[] | undefined) || [] : [];
  const atLimit = q.type === 'multi-limit' && !!q.max && selectedArr.length >= q.max;

  return (
    <div id={`question-${q.id}`}>
      <label className="block text-sm font-geometric font-bold text-white/90 mb-3">
        <span className="text-brand-gold mr-2">{q.number}.</span>
        {t(`assessment.${q.label}`)} {q.required && <span className="text-brand-alert">*</span>}
        {q.type === 'multi-limit' && q.max && (
          <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-white/60">
            ({selectedArr.length}/{q.max}{t('assessment.selectedSuffix')})
          </span>
        )}
      </label>

      {q.type === 'text' && (
        <input
          type="text"
          value={(value as string) || ''}
          placeholder={(q as TextQuestion).placeholder}
          onChange={e => onSingle(e.target.value)}
          className={`w-full bg-brand-dark border rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-all focus:bg-brand-dark/80 focus:border-brand-gold ${
            showError ? 'border-brand-alert/70' : 'border-brand-gold/25'
          }`}
        />
      )}

      {q.type === 'select' && (
        <div className="relative">
          <select
            value={(value as string) || ''}
            onChange={e => onSingle(e.target.value)}
            className={`w-full appearance-none bg-white/5 border rounded-xl px-4 py-3 pr-10 text-sm text-white outline-none transition-all focus:bg-white/10 focus:border-brand-gold ${
              (value as string) ? 'text-white' : 'text-white/60'
            } ${showError ? 'border-brand-alert/70' : 'border-brand-gold/25'}`}
          >
            <option value="" disabled className="bg-brand-dark text-white/60">{t(`assessment.${(q as SelectQuestion).placeholder || 'selectDefault'}`)}</option>
            {(q as SelectQuestion).options.map(opt => (
              <option key={opt} value={opt} className="bg-brand-dark text-white">{opt}</option>
            ))}
          </select>
          <svg className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/60" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </div>
      )}

      {(q.type === 'single' || q.type === 'multi' || q.type === 'multi-limit') && (
        <div className="grid grid-cols-1 gap-2.5">
          {(q as SingleQuestion | MultiQuestion).options.map((opt, i) => {
            const isSelected = q.type === 'single'
              ? value === opt
              : selectedArr.includes(opt);
            const disabled = q.type === 'multi-limit' && atLimit && !isSelected;
            return (
              <button
                key={opt}
                type="button"
                disabled={disabled}
                onClick={() => (q.type === 'single' ? onSingle(opt) : onMulti(opt))}
                className={`flex items-center gap-3 text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                  isSelected
                    ? 'bg-brand-gold/15 border-brand-gold text-white'
                    : 'bg-brand-dark border-brand-gold/20 text-white/80 hover:border-brand-gold/40 hover:bg-brand-dark/80'
                } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className={`shrink-0 w-6 h-6 flex items-center justify-center text-[11px] font-bold border rounded-md ${
                  isSelected ? 'bg-brand-eco text-brand-dark border-brand-eco' : 'border-brand-gold/25 text-white/50'
                }`}>
                  {isSelected ? <Check size={14} strokeWidth={3} /> : letterLabel(i)}
                </span>
                <span className="leading-snug">{opt}</span>
              </button>
            );
          })}
        </div>
      )}

      {showError && <p className="mt-2 text-xs text-brand-alert">{t('assessment.requiredQuestion')}</p>}
    </div>
  );
};

export default AssessmentForm;
