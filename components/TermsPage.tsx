
import React from 'react';
import { ScrollText } from 'lucide-react';
import { useI18n } from '../lib/useI18n';

interface Section {
  titleKey: string;
  content: string | string[];
}

const TermsPage: React.FC = () => {
  const { t, lang } = useI18n();

  const sections: Section[] = [
    {
      titleKey: 'terms.acceptance',
      content: t('terms.acceptanceDesc'),
    },
    {
      titleKey: 'terms.platformUse',
      content: [
        t('terms.platformUse1'),
        t('terms.platformUse2'),
        t('terms.platformUse3'),
        t('terms.platformUse4'),
      ],
    },
    {
      titleKey: 'terms.permittedUse',
      content: [
        t('terms.permittedUse1'),
        t('terms.permittedUse2'),
        t('terms.permittedUse3'),
        t('terms.permittedUse4'),
      ],
    },
    {
      titleKey: 'terms.prohibited',
      content: [
        t('terms.prohibited1'),
        t('terms.prohibited2'),
        t('terms.prohibited3'),
        t('terms.prohibited4'),
        t('terms.prohibited5'),
      ],
    },
    {
      titleKey: 'terms.intellectualProperty',
      content: t('terms.intellectualPropertyDesc'),
    },
    {
      titleKey: 'terms.dataAccuracy',
      content: t('terms.dataAccuracyDesc'),
    },
    {
      titleKey: 'terms.availability',
      content: t('terms.availabilityDesc'),
    },
    {
      titleKey: 'terms.liability',
      content: t('terms.liabilityDesc'),
    },
    {
      titleKey: 'terms.termination',
      content: t('terms.terminationDesc'),
    },
    {
      titleKey: 'terms.changesToTerms',
      content: t('terms.changesToTermsDesc'),
    },
    {
      titleKey: 'terms.governingLaw',
      content: t('terms.governingLawDesc'),
    },
  ];

  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 100%, rgba(119,177,57,0.06), transparent 55%)' }} />
        <div className="max-w-4xl mx-auto px-6 py-20 sm:py-28 text-center relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-eco/10 border border-brand-eco/30 mb-6">
            <ScrollText className="text-brand-eco" size={30} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-eco mb-3">{t('terms.legal')}</p>
          <h1 className="text-3xl sm:text-5xl font-geometric font-black text-white uppercase tracking-widest mb-4">
            {t('terms.title')}
          </h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest">{t('terms.lastUpdated')} {new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Intro */}
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-4">
        <div className="bg-brand-eco/5 border border-brand-eco/20 rounded-2xl p-6 sm:p-8">
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
            {t('terms.intro')}
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6 pb-24">
        {sections.map((section, i) => (
          <div key={i} className="bg-brand-dark/60 border border-white/5 rounded-2xl p-6 sm:p-8 hover:border-brand-eco/20 transition-all duration-300">
            <div className="flex items-start gap-4 mb-4">
              <span className="shrink-0 text-xs font-black text-brand-eco/40 font-geometric tabular-nums mt-1">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 className="text-base sm:text-lg font-geometric font-black text-white uppercase tracking-widest">
                {t(section.titleKey)}
              </h2>
            </div>
            {Array.isArray(section.content) ? (
              <ul className="space-y-3 ml-8">
                {section.content.map((item, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-gray-400 leading-relaxed">
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brand-eco/60 mt-2" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ml-8 text-sm text-gray-400 leading-relaxed">{section.content}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TermsPage;
