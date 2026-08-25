
import React, { useState } from 'react';
import { Shield, ChevronRight, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface LegalConsentModalProps {
  user: UserProfile;
  onAccept: () => void;
  onLogout: () => void;
}

const LegalConsentModal: React.FC<LegalConsentModalProps> = ({ user, onAccept, onLogout }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasCheckedTerms, setHasCheckedTerms] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAccept = async () => {
    if (!hasScrolledToBottom || !hasCheckedTerms) return;
    
    setIsSubmitting(true);
    try {
    // Forensic UUID Validation for Supabase
    if (!user) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const isRealUser = uuidRegex.test(user.id);

      if (isRealUser) {
        const { error } = await supabase
          .from('profiles')
          .update({ legal_consent: true })
          .eq('id', user.id);

        if (error) throw error;
      } else {
        console.warn(`Demo Mode: Bypassing Supabase update for non-UUID user [${user.id}]`);
      }

      onAccept();
    } catch (err) {
      console.error('Error updating legal consent:', err);
      alert('Failed to save consent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDisagree = () => {
    if (confirm("By disagreeing, you will be unable to access the Ecometricus Benchmarking Engine and will be logged out. Proceed?")) {
      onLogout();
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Light/Frosted Blur Backdrop (User Request: softly visible dashboard) */}
      <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-[8px] transition-all duration-700"></div>

      {/* Modal Container: Clean Professional SaaS Interface */}
      <div className="relative w-full max-w-2xl bg-[#0a1512] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-500">
        
        {/* Header: Professional Dark Green Environment */}
        <div className="p-6 border-b border-white/5 bg-[#06241b]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
              <Shield className="text-brand-gold" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase tracking-tight leading-none">Legal Consent Required</h2>
              <p className="text-[10px] font-bold text-brand-gold uppercase tracking-[0.2em] mt-1.5">Master Service Agreement</p>
            </div>
          </div>
        </div>

        {/* Legal Content Scroll Area: Clean Typography */}
        <div 
          className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar scroll-smooth"
          onScroll={handleScroll}
        >
          {/* Welcome Message */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
            <p className="text-sm text-gray-300 leading-relaxed font-normal">
              Welcome, <span className="text-white font-bold">{user?.fullName || 'Administrator'}</span>. As an <span className="text-brand-gold font-bold uppercase tracking-wider text-xs">Administrator</span>, you are required to acknowledge and accept the following terms before accessing the Ecometricus Benchmarking Engine.
            </p>
          </div>

          {/* Section 1: Data Extraction */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <span className="text-brand-gold font-bold text-[10px]">01</span>
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">Data Extraction Authority</h3>
            </div>
            <div className="pl-9 space-y-2">
              <p className="text-xs text-gray-400 leading-relaxed font-normal border-l border-white/10 pl-4">
                The User provides full consent to Ecometricus for the automated extraction and linking of proprietary operational data from established POS (Point of Sale), PMS (Property Management Systems), and CRM platforms.
              </p>
            </div>
          </div>

          {/* Section 2: Methodology Recognition (STRICT CONTENT UPDATE) */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <span className="text-brand-gold font-bold text-[10px]">02</span>
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">Methodology Recognition</h3>
            </div>
            <div className="pl-9 space-y-2">
              <p className="text-xs text-gray-400 leading-relaxed font-normal border-l border-white/10 pl-4">
                The User acknowledges that Ecometricus utilizes a data-driven methodology for reporting. All generated reports are for informational and executive decision-making purposes. Due to direct system integrations, reporting variances compared to traditional manual estimates represent actual recorded operations.
              </p>
            </div>
          </div>

          {/* Section 3: Administrative Accountability */}
          <div className="space-y-3 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <span className="text-brand-gold font-bold text-[10px]">03</span>
              </div>
              <h3 className="text-xs font-bold text-white uppercase tracking-widest">Administrative Accountability</h3>
            </div>
            <div className="pl-9 space-y-2">
              <p className="text-xs text-gray-400 leading-relaxed font-normal border-l border-white/10 pl-4">
                As the primary administrator, the User is held directly responsible for the creation and oversight of all subsequent personnel profiles, system audits, and benchmarking parameters within this instance.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions: Clean Professional Buttons */}
        <div className="p-6 border-t border-white/5 bg-black/20 backdrop-blur-md space-y-5">
          
          {/* Verification Checkboxes */}
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
              <input 
                type="checkbox" 
                checked={hasCheckedTerms}
                onChange={(e) => setHasCheckedTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-white/20 bg-transparent text-brand-gold focus:ring-brand-gold"
              />
              <span className="text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wide leading-relaxed">
                I acknowledge and accept the <span className="text-white">Master Service Agreement</span> and organizational accountability protocols.
              </span>
            </label>
            
            {!hasScrolledToBottom && (
              <p className="text-[9px] font-bold text-brand-gold uppercase tracking-widest text-center">
                Please scroll to unlock acceptance
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Disagree Button: Neutral Corporate Style */}
            <button
              onClick={handleDisagree}
              disabled={isSubmitting}
              className="py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all duration-300 border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white"
            >
              I Disagree
            </button>

            {/* Agree Button: Gold Professional Style */}
            <button
              onClick={handleAccept}
              disabled={!hasScrolledToBottom || !hasCheckedTerms || isSubmitting}
              className={`
                relative py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all duration-500
                ${(hasScrolledToBottom && hasCheckedTerms)
                  ? 'bg-brand-eco text-brand-dark hover:brightness-110 active:scale-95 shadow-lg' 
                  : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'}
              `}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {(hasScrolledToBottom && hasCheckedTerms) ? <CheckCircle2 size={14} /> : <Lock size={14} />}
                  I Agree
                </span>
              )}
            </button>
          </div>

          <p className="text-[8px] font-medium text-white/10 uppercase tracking-[0.2em] text-center">
            Security ID: {user?.id?.slice(0, 8).toUpperCase() || 'SESSION'} | Data Extraction Protocol Active
          </p>
        </div>
      </div>
    </div>
  );
};

export default LegalConsentModal;
