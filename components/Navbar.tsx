
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
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-brand-dark/98 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.4)]'
        : 'bg-brand-dark/90 backdrop-blur-xl'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-20">

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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavigate(Page.DASHBOARD)}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-gold/25 to-brand-gold/5 border border-brand-gold/30 flex items-center justify-center hover:border-brand-gold/60 transition-all duration-200"
                  aria-label="Go to dashboard"
                >
                  <span className="text-brand-gold text-sm font-black leading-none">{userInitial.toUpperCase()}</span>
                </button>
                <button
                  onClick={onLogout}
                  className="w-9 h-9 rounded-full border border-white/10 bg-white/3 flex items-center justify-center text-gray-400 hover:text-white hover:border-white/25 hover:bg-white/8 transition-all duration-200"
                  aria-label="Log out"
                >
                  <LogOut size={14} />
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

      {/* Mobile drawer */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-brand-dark/98 backdrop-blur-xl border-b border-brand-gold/20 animate-in slide-in-from-top duration-200 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
          <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-2">
            {navLinks.map((link) => {
              const active = currentPage === link.page;
              return (
                <button
                  key={link.page}
                  onClick={() => handleNavigate(link.page)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-[0.15em] transition-all ${
                    active
                      ? 'text-brand-gold bg-brand-gold/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
            <div className="h-px bg-white/5 my-2" />

            {/* Mobile language toggle */}
            <div className="flex items-center justify-center gap-0.5 bg-white/5 border border-white/10 rounded-full p-0.5 self-center my-1">
              <button
                onClick={() => changeLang('en')}
                className={`px-5 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 ${lang === 'en' ? 'bg-brand-gold text-brand-dark' : 'text-white/35'}`}
              >
                EN
              </button>
              <button
                onClick={() => changeLang('es')}
                className={`px-5 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 ${lang === 'es' ? 'bg-brand-gold text-brand-dark' : 'text-white/35'}`}
              >
                ES
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {isLoggedIn ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleNavigate(Page.DASHBOARD)}
                    className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border border-brand-gold/20 bg-brand-gold/5 hover:bg-brand-gold/10 transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-gold/25 to-brand-gold/5 border border-brand-gold/30 flex items-center justify-center shrink-0">
                      <span className="text-brand-gold text-sm font-black leading-none">{userInitial.toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-bold text-white/80 uppercase tracking-widest">{t('navbar.myDashboard')}</span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="w-12 flex items-center justify-center rounded-xl border border-white/10 bg-white/3 text-gray-400 hover:text-white hover:border-white/25 transition-all"
                    aria-label="Log out"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => handleNavigate(Page.SIGN_IN)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-300 border border-white/10 hover:border-white/25 transition-all"
                  >
                    <LogIn size={14} /> {t('navbar.logIn')}
                  </button>
                  <button
                    onClick={() => handleNavigate(Page.SIGN_UP)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-widest bg-brand-eco text-brand-dark shadow-[0_4px_15px_rgba(119,177,57,0.3)]"
                  >
                    <UserPlus size={14} /> {t('navbar.signUp')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
