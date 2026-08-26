
import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import Logo from './Logo';
import { Menu, X, LogIn, UserPlus, LogOut } from 'lucide-react';
import { useI18n } from '../lib/useI18n';

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isLoggedIn?: boolean;
  userInitial?: string;
  onLogout?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, isLoggedIn = false, userInitial = 'A', onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t, lang, changeLang } = useI18n();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: t('navbar.home'),     page: Page.HOME },
    { label: t('navbar.aboutUs'),  page: Page.ABOUT },
    { label: t('navbar.faq'),      page: Page.FAQ },
    { label: t('navbar.contact'),  page: Page.CONTACT },
  ];

  const handleNavigate = (page: Page) => {
    onNavigate(page);
    setIsMenuOpen(false);
  };

  return (
    <>
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-brand-dark/98 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.4)]'
        : 'bg-brand-dark/90 backdrop-blur-xl'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">

          {/* Logo */}
          <div
            className="cursor-pointer flex-shrink-0"
            onClick={() => handleNavigate(Page.HOME)}
          >
            <Logo size="md" withLabel />
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = currentPage === link.page;
              return (
                <button
                  key={link.page}
                  onClick={() => handleNavigate(link.page)}
                  className={`relative px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] transition-all duration-200 ${
                    active
                      ? 'text-brand-gold bg-brand-gold/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-brand-gold shadow-[0_0_8px_rgba(200,164,19,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Desktop action buttons */}
          <div className="hidden md:flex items-center gap-3">
            <div className="w-px h-5 bg-white/10" />

            {/* Language toggle — segmented pill */}
            <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-full p-0.5">
              <button
                onClick={() => changeLang('en')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all duration-200 ${lang === 'en' ? 'bg-brand-gold text-brand-dark shadow-sm' : 'text-white/35 hover:text-white/70'}`}
              >
                EN
              </button>
              <button
                onClick={() => changeLang('es')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all duration-200 ${lang === 'es' ? 'bg-brand-gold text-brand-dark shadow-sm' : 'text-white/35 hover:text-white/70'}`}
              >
                ES
              </button>
            </div>

            <div className="w-px h-5 bg-white/10" />
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                {/* Avatar — matches dashboard */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-gold/25 to-brand-gold/5 border border-brand-gold/30 flex items-center justify-center shrink-0">
                  <span className="text-brand-gold text-xs font-black leading-none tracking-tight">
                    {userInitial.toUpperCase()}
                  </span>
                </div>

                {/* Divider */}
                <div className="hidden sm:block w-px h-7 bg-white/8" />

                {/* Logout — matches dashboard */}
                <button
                  onClick={onLogout}
                  title="Log out"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/15 text-white/60 hover:text-white hover:border-brand-alert/60 hover:bg-brand-alert/10 transition-all duration-150"
                >
                  <LogOut size={14} />
                  <span className="text-[11px] font-semibold">Log out</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => handleNavigate(Page.SIGN_IN)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:text-white border border-white/10 hover:border-white/25 transition-all duration-200"
                >
                  <LogIn size={13} /> {t('navbar.logIn')}
                </button>
                <button
                  onClick={() => handleNavigate(Page.SIGN_UP)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-brand-eco text-brand-dark hover:brightness-110 transition-all transform hover:scale-105 shadow-[0_4px_15px_rgba(119,177,57,0.35)]"
                >
                  <UserPlus size={13} /> {t('navbar.signUp')}
                </button>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-xl text-gray-400 hover:text-brand-gold hover:bg-white/5 transition-all"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Gold separator line */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent" />

    </nav>

      {/* Mobile drawer — outside nav to escape backdrop-blur containing block */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 z-40 bg-[#0f2420] border-b border-brand-gold/15 shadow-[0_12px_40px_rgba(0,0,0,0.7)] animate-in slide-in-from-top duration-200">

          {/* Nav links */}
          <div className="px-4 pt-3 pb-1">
            {navLinks.map((link) => {
              const active = currentPage === link.page;
              return (
                <button
                  key={link.page}
                  onClick={() => handleNavigate(link.page)}
                  className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                    active
                      ? 'text-brand-gold'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {active && <span className="w-1 h-4 rounded-full bg-brand-gold shrink-0" />}
                  {!active && <span className="w-1 h-4 rounded-full bg-transparent shrink-0" />}
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="mx-4 h-px bg-white/5" />

          {/* Bottom row: lang + actions */}
          <div className="px-4 py-3 flex items-center justify-between gap-3">

            {/* Language toggle */}
            <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-full p-0.5">
              <button
                onClick={() => changeLang('en')}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${lang === 'en' ? 'bg-brand-gold text-brand-dark' : 'text-white/30 hover:text-white/60'}`}
              >EN</button>
              <button
                onClick={() => changeLang('es')}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${lang === 'es' ? 'bg-brand-gold text-brand-dark' : 'text-white/30 hover:text-white/60'}`}
              >ES</button>
            </div>

            {/* Auth actions */}
            {isLoggedIn ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavigate(Page.DASHBOARD)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-gold/20 bg-brand-gold/8 hover:bg-brand-gold/15 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-gold/30 to-brand-gold/10 border border-brand-gold/30 flex items-center justify-center shrink-0">
                    <span className="text-brand-gold text-[10px] font-black">{userInitial.toUpperCase()}</span>
                  </div>
                  <span className="text-xs font-bold text-white/70 uppercase tracking-widest">{t('navbar.myDashboard')}</span>
                </button>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-white/40 hover:text-brand-alert hover:border-brand-alert/40 transition-all"
                >
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavigate(Page.SIGN_IN)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest text-white/60 border border-white/10 hover:border-white/25 hover:text-white transition-all"
                >
                  <LogIn size={13} /> {t('navbar.logIn')}
                </button>
                <button
                  onClick={() => handleNavigate(Page.SIGN_UP)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest bg-brand-eco text-brand-dark shadow-[0_4px_15px_rgba(119,177,57,0.35)]"
                >
                  <UserPlus size={13} /> {t('navbar.signUp')}
                </button>
              </div>
            )}
          </div>

        </div>
      )}
    </>
  );
};

export default Navbar;
