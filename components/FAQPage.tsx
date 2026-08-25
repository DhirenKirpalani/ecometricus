
import React, { useState } from 'react';
import { X, PieChart, Database, Zap, Users } from 'lucide-react';
import { useI18n } from '../lib/useI18n';

interface FAQEntry {
  question: string;
  answer: React.ReactNode;
}

const FAQPage: React.FC = () => {
  const { t } = useI18n();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const faqs: FAQEntry[] = [
    {
      question: t('faq.q1'),
      answer: t('faq.a1')
    },
    {
      question: t('faq.q2'),
      answer: (
        <div className="grid sm:grid-cols-2 gap-6 mt-2">
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

  return (
    <div className="min-h-screen bg-brand-dark">
      <div className="max-w-4xl mx-auto px-6 py-20 sm:py-28">

        {/* Title */}
        <div className="text-center mb-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold/70 mb-3">{t('faq.knowledgeBase')}</p>
          <h1 className="text-4xl sm:text-5xl font-geometric font-black text-white uppercase tracking-widest">{t('faq.title')}</h1>
        </div>

        {/* Question list */}
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className="w-full text-left flex items-center justify-between gap-4 px-6 py-5 rounded-xl border border-white/6 bg-white/2 hover:bg-white/4 hover:border-brand-gold/30 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black text-brand-gold/40 font-mono tabular-nums shrink-0">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-sm font-geometric font-bold text-white/80 group-hover:text-white tracking-wide">{faq.question}</span>
              </div>
              <span className="shrink-0 w-5 h-5 rounded-full border border-brand-gold/30 flex items-center justify-center group-hover:border-brand-gold group-hover:bg-brand-gold/10 transition-all">
                <span className="text-brand-gold text-xs leading-none">+</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Modal overlay */}
      {activeFaq && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={() => setActiveIndex(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative w-full max-w-xl bg-[#0e1f1c] border border-brand-gold/30 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)] p-7 sm:p-9 animate-in fade-in zoom-in-95 duration-200"
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
                <h3 className="text-sm sm:text-base font-geometric font-black text-white uppercase tracking-wide leading-snug">
                  {activeFaq.question}
                </h3>
              </div>
              <button
                onClick={() => setActiveIndex(null)}
                className="shrink-0 w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/25 transition-all"
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
            <div className="flex items-center justify-between mt-7 pt-5 border-t border-white/8">
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
