
import React from 'react';
import { Page } from '../types';
import Logo from './Logo';
import { useI18n } from '../lib/useI18n';

interface FooterProps {
  onNavigate: (page: Page) => void;
  currentPage: Page;
}

const Footer: React.FC<FooterProps> = ({ onNavigate, currentPage }) => {
  const year = new Date().getFullYear();
  const { t } = useI18n();

  const navLinks = [
    { label: t('navbar.home'),     page: Page.HOME },
    { label: t('navbar.aboutUs'),  page: Page.ABOUT },
    { label: t('navbar.faq'),      page: Page.FAQ },
    { label: t('navbar.signUp'),   page: Page.SIGN_UP },
    { label: t('navbar.logIn'),    page: Page.SIGN_IN },
  ];

  const legalLinks = [
    { label: t('footer.privacyPolicy'),  page: Page.PRIVACY },
    { label: t('footer.termsOfService'), page: Page.TERMS },
    { label: t('footer.contactUs'),      page: Page.CONTACT },
  ];

  return (
    <footer className="bg-[#1c3933] border-t border-brand-gold/15 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(200,164,19,0.04), transparent 55%)' }} />

      {/* Main footer */}
      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 py-10 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 md:gap-16">

          {/* Brand */}
          <div className="space-y-4 sm:space-y-5">
            <Logo size="md" withLabel />
            <p className="text-xs text-gray-500 leading-relaxed max-w-[220px]">
              {t('footer.brandTagline')}
            </p>
            <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">
              {t('footer.byBureau')}
            </p>
          </div>

          {/* Navigate */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-4">{t('footer.navigate')}</p>
            <ul className="space-y-2.5" aria-label={t('footer.navigate')}>
              {navLinks.map((link) => {
                const active = currentPage === link.page;
                return (
                  <li key={link.page}>
                    <button
                      onClick={() => onNavigate(link.page)}
                      aria-current={active ? 'page' : undefined}
                      className={`text-xs transition-colors duration-200 flex items-center gap-1.5 ${active ? 'text-brand-gold font-bold' : 'text-white/70 hover:text-white'}`}
                    >
                      {active && <span className="w-1 h-1 rounded-full bg-brand-gold" aria-hidden="true" />}
                      {link.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-4">{t('footer.legalContact')}</p>
            <ul className="space-y-2.5" aria-label={t('footer.legalContact')}>
              {legalLinks.map((item) => {
                const active = currentPage === item.page;
                return (
                  <li key={item.label}>
                    <button
                      onClick={() => onNavigate(item.page)}
                      aria-current={active ? 'page' : undefined}
                      className={`text-xs transition-colors duration-200 flex items-center gap-1.5 ${active ? 'text-brand-gold font-bold' : 'text-white/70 hover:text-white'}`}
                    >
                      {active && <span className="w-1 h-1 rounded-full bg-brand-gold" aria-hidden="true" />}
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-brand-gold/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2 text-center">
          <p className="text-[10px] text-white/40 uppercase tracking-widest">
            {t('footer.copyright', { year: String(year) })}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-eco animate-pulse" />
            <p className="text-[10px] text-brand-eco/70 uppercase tracking-widest">{t('footer.engineActive')}</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
