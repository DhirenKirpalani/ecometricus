
import React, { useState, useEffect, useRef } from 'react';
import { X, PieChart, Database, Zap, Users } from 'lucide-react';
import { useI18n } from '../lib/useI18n';

interface FAQEntry {
  question: string;
  answer: React.ReactNode;
}

const FAQPage: React.FC = () => {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const faqs: FAQEntry[] = [
    {
      question: t('faq.q1'),
      answer: t('faq.a1')
    },
    {
      question: t('faq.q2'),
      answer: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-2">
          <div className="space-y-3">
            <h4 className="text-brand-gold font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <PieChart size={14} className="text-brand-gold" /> {t('faq.financialMetrics')}
            </h4>
            <ul className="text-sm text-gray-400 space-y-1.5 pl-3">
              <li>{t('faq.faqTotalSales')}</li>
              <li>{t('faq.faqNetProfit')}</li>
              <li>{t('faq.faqFoodLabor')}</li>
              <li>{t('faq.faqCogs')}</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-brand-eco font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <Zap size={14} className="text-brand-eco" /> {t('faq.operationalMetrics')}
            </h4>
            <ul className="text-sm text-gray-400 space-y-1.5 pl-3">
              <li>{t('faq.faqAvgCheck')}</li>
              <li>{t('faq.faqInventory')}</li>
              <li>{t('faq.faqPeakHour')}</li>
              <li>{t('faq.faqRetention')}</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-brand-energy font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <Database size={14} className="text-brand-energy" /> {t('faq.sustainabilityESG')}
            </h4>
            <ul className="text-sm text-gray-400 space-y-1.5 pl-3">
              <li>{t('faq.faqFoodWaste')}</li>
              <li>{t('faq.faqWaterEnergy')}</li>
              <li>{t('faq.faqCo2Reduction')}</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <Users size={14} className="text-brand-eco" /> {t('faq.otherKPIs')}
            </h4>
            <ul className="text-sm text-gray-400 space-y-1.5 pl-3">
              <li>{t('faq.faqReviews')}</li>
              <li>{t('faq.faqEmployee')}</li>
              <li>{t('faq.faqDistribution')}</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      question: t('faq.q3'),
      answer: t('faq.a3')
    },
    {
      question: t('faq.q4'),
      answer: t('faq.a4')
    },
    {
      question: t('faq.q5'),
      answer: (
        <div className="space-y-3 text-sm text-gray-400 leading-relaxed">
          <p>{t('faq.a5a')}</p>
          <p>{t('faq.a5b')}</p>
        </div>
      )
    },
    {
      question: t('faq.q6'),
      answer: t('faq.a6')
    },
    {
      question: t('faq.q7'),
      answer: t('faq.a7')
    },
    {
      question: t('faq.q8'),
      answer: t('faq.a8')
    },
    {
      question: t('faq.q9'),
      answer: t('faq.a9')
    }
  ];

  const activeFaq = activeIndex !== null ? faqs[activeIndex] : null;

  // Esc to close, focus trap, body scroll lock
  useEffect(() => {
    if (activeFaq) {
      document.body.style.overflow = 'hidden';
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setActiveIndex(null);
          triggerRef.current?.focus();
        }
      };
      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab' || !modalRef.current) return;
        const focusable = modalRef.current.querySelectorAll<HTMLElement>('button, a, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      };
      document.addEventListener('keydown', handleEsc);
      document.addEventListener('keydown', handleTab);
      setTimeout(() => closeBtnRef.current?.focus(), 100);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEsc);
        document.removeEventListener('keydown', handleTab);
      };
    }
    document.body.style.overflow = '';
  }, [activeFaq]);

  return (
    <div className="min-h-screen bg-brand-dark">
      <div className="max-w-4xl mx-auto px-5 sm:px-6 py-14 sm:py-28">

        {/* Title */}
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em] text-brand-gold/70 mb-3">{t('faq.knowledgeBase')}</p>
          <h1 className="text-3xl sm:text-5xl font-geometric font-black text-white uppercase tracking-[0.15em] sm:tracking-widest">{t('faq.title')}</h1>
        </div>

        {/* Question list */}
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <button
              key={i}
              ref={i === activeIndex ? triggerRef : undefined}
              onClick={() => setActiveIndex(i === activeIndex ? null : i)}
              aria-expanded={activeIndex === i}
              className="w-full text-left flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5 rounded-xl border border-brand-gold/12 bg-white/2 hover:bg-white/4 hover:border-brand-gold/35 transition-all duration-200 group"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <span className="text-[10px] font-black text-brand-gold/40 font-mono tabular-nums shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-xs sm:text-sm font-geometric font-bold text-white/80 group-hover:text-white tracking-wide">{faq.question}</span>
              </div>
              <span className={`shrink-0 w-6 h-6 rounded-full border border-brand-gold/30 flex items-center justify-center group-hover:border-brand-gold group-hover:bg-brand-gold/10 transition-all ${activeIndex === i ? 'rotate-45' : ''}`}>
                <span className="text-brand-gold text-sm leading-none">+</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Modal overlay */}
      {activeFaq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
          onClick={() => { setActiveIndex(null); triggerRef.current?.focus(); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm" />

          {/* Modal */}
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="faq-modal-title"
            className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto scrollbar-gold bg-[#1c3933] border border-brand-gold/30 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)] p-5 sm:p-9 animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Top accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-gold/50 to-transparent rounded-t-2xl" />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-black text-brand-gold/50 font-mono tabular-nums shrink-0 mt-0.5">
                  {String(activeIndex! + 1).padStart(2, '0')} / {String(faqs.length).padStart(2, '0')}
                </span>
                <h3 id="faq-modal-title" className="text-sm sm:text-base font-geometric font-black text-white uppercase tracking-wide leading-snug">
                  {activeFaq.question}
                </h3>
              </div>
              <button
                ref={closeBtnRef}
                onClick={() => { setActiveIndex(null); triggerRef.current?.focus(); }}
                aria-label={t('faq.close') || 'Close'}
                className="shrink-0 w-8 h-8 rounded-lg bg-white/5 border border-brand-gold/10 flex items-center justify-center text-white/40 hover:text-white hover:border-brand-gold/25 transition-all"
              >
                <X size={14} />
              </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/8 mb-5" />

            {/* Answer */}
            <div className="text-sm text-gray-400 leading-relaxed">
              {activeFaq.answer}
            </div>

            {/* Prev / Next */}
            <div className="flex items-center justify-between mt-7 pt-5 border-t border-brand-gold/8">
              <button
                onClick={() => setActiveIndex(i => i !== null && i > 0 ? i - 1 : i)}
                disabled={activeIndex === 0}
                className="text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white disabled:opacity-20 transition-colors"
              >
                {t('faq.prev')}
              </button>
              <div className="flex gap-1.5">
                {faqs.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveIndex(i)}
                    aria-label={`${i + 1} / ${faqs.length}`}
                    className={`h-1.5 rounded-full transition-all duration-200 ${i === activeIndex ? 'bg-brand-gold w-4' : 'bg-white/15 w-1.5 hover:bg-white/30'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setActiveIndex(i => i !== null && i < faqs.length - 1 ? i + 1 : i)}
                disabled={activeIndex === faqs.length - 1}
                className="text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white disabled:opacity-20 transition-colors"
              >
                {t('faq.next')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQPage;
