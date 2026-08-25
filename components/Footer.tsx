
import React from 'react';
import { Page } from '../types';
import Logo from './Logo';

interface FooterProps {
  onNavigate: (page: Page) => void;
  currentPage: Page;
}

const Footer: React.FC<FooterProps> = ({ onNavigate, currentPage }) => {
  const year = new Date().getFullYear();

  const navLinks = [
    { label: 'Home', page: Page.HOME },
    { label: 'About Us', page: Page.ABOUT },
    { label: 'FAQ', page: Page.FAQ },
    { label: 'Sign Up', page: Page.SIGN_UP },
    { label: 'Log In', page: Page.SIGN_IN },
  ];

  const legalLinks = [
    { label: 'Privacy Policy', page: Page.PRIVACY },
    { label: 'Terms of Service', page: Page.TERMS },
    { label: 'Contact Us', page: Page.CONTACT },
  ];

  return (
    <footer className="bg-[#0e1f1c] border-t border-brand-gold/15 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(200,164,19,0.04), transparent 55%)' }} />

      {/* Main footer */}
      <div className="relative max-w-7xl mx-auto px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">

          {/* Brand */}
          <div className="space-y-5">
            <Logo size="md" />
            <p className="text-xs text-gray-500 leading-relaxed max-w-[220px]">
              AI-powered sustainability intelligence for luxury F&B operations.
            </p>
            <p className="text-[10px] text-gray-700 uppercase tracking-widest leading-relaxed">
              By Us+AI Bureau
            </p>
          </div>

          {/* Navigate */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-4">Navigate</p>
            <ul className="space-y-2.5">
              {navLinks.map((link) => {
                const active = currentPage === link.page;
                return (
                  <li key={link.page}>
                    <button
                      onClick={() => onNavigate(link.page)}
                      className={`text-xs transition-colors duration-200 flex items-center gap-1.5 ${active ? 'text-brand-gold font-bold' : 'text-white/70 hover:text-white'}`}
                    >
                      {active && <span className="w-1 h-1 rounded-full bg-brand-gold" />}
                      {link.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white mb-4">Legal & Contact</p>
            <ul className="space-y-2.5">
              {legalLinks.map((item) => {
                const active = currentPage === item.page;
                return (
                  <li key={item.label}>
                    <button
                      onClick={() => onNavigate(item.page)}
                      className={`text-xs transition-colors duration-200 flex items-center gap-1.5 ${active ? 'text-brand-gold font-bold' : 'text-white/70 hover:text-white'}`}
                    >
                      {active && <span className="w-1 h-1 rounded-full bg-brand-gold" />}
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
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] text-gray-700 uppercase tracking-widest">
            &copy; {year} Ecometricus. All rights reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-eco animate-pulse" />
            <p className="text-[10px] text-gray-700 uppercase tracking-widest">ESG Intelligence Engine Active</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
