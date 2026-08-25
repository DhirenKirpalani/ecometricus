
import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useI18n } from '../lib/useI18n';

interface Section {
  titleKey: string;
  content: string | string[];
}

const PrivacyPage: React.FC = () => {
  const { t, lang } = useI18n();

  const sections: Section[] = [
    {
      titleKey: 'privacy.infoWeCollect',
      content: [
        t('privacy.infoWeCollect1'),
        t('privacy.infoWeCollect2'),
        t('privacy.infoWeCollect3'),
        t('privacy.infoWeCollect4'),
      ],
    },
    {
      titleKey: 'privacy.howWeUse',
      content: [
        t('privacy.howWeUse1'),
        t('privacy.howWeUse2'),
        t('privacy.howWeUse3'),
        t('privacy.howWeUse4'),
      ],
    },
    {
      titleKey: 'privacy.dataConfidentiality',
      content: t('privacy.dataConfidentialityDesc'),
    },
    {
      titleKey: 'privacy.dataSecurity',
      content: t('privacy.dataSecurityDesc'),
    },
    {
      titleKey: 'privacy.dataOwnership',
      content: t('privacy.dataOwnershipDesc'),
    },
    {
      titleKey: 'privacy.cookies',
      content: t('privacy.cookiesDesc'),
    },
    {
      titleKey: 'privacy.changesToPolicy',
      content: t('privacy.changesToPolicyDesc'),
    },
    {
      titleKey: 'privacy.contactSection',
      content: t('privacy.contactDesc'),
    },
  ];

  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Hero header */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 100%, rgba(200,164,19,0.07), transparent 55%)' }} />
        <div className="max-w-4xl mx-auto px-6 py-20 sm:py-28 text-center relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-gold/10 border border-brand-gold/30 mb-6">
            <ShieldCheck className="text-brand-gold" size={30} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold mb-3">{t('privacy.legal')}</p>
          <h1 className="text-3xl sm:text-5xl font-geometric font-black text-white uppercase tracking-widest mb-4">
            {t('privacy.title')}
          </h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest">{t('privacy.lastUpdated')} {new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* Intro */}
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-4">
        <div className="bg-brand-gold/5 border border-brand-gold/20 rounded-2xl p-6 sm:p-8">
          <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
            {t('privacy.intro')}
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6 pb-24">
        {sections.map((section, i) => (
          <div key={i} className="bg-brand-dark/60 border border-white/5 rounded-2xl p-6 sm:p-8 hover:border-brand-gold/20 transition-all duration-300">
            <div className="flex items-start gap-4 mb-4">
              <span className="shrink-0 text-xs font-black text-brand-gold/40 font-geometric tabular-nums mt-1">
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
                    <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-brand-gold/60 mt-2" />
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

export default PrivacyPage;
