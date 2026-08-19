
import React, { useState } from 'react';
import { X, PieChart, Database, Zap, Users } from 'lucide-react';

interface FAQEntry {
  question: string;
  answer: React.ReactNode;
}

const FAQPage: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const faqs: FAQEntry[] = [
    {
      question: "What is an Ecometricus app?",
      answer: "Ecometricus is an application designed as an F&B Dashboard Metrics (KPIs) with displayed charts per outlet. It is used as a sophisticated tool for the hotel industry to drive data-driven decision making."
    },
    {
      question: "What are the main categories of metrics tracked?",
      answer: (
        <div className="grid sm:grid-cols-2 gap-6 mt-2">
          <div className="space-y-3">
            <h4 className="text-brand-gold font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <PieChart size={14} className="text-brand-gold" /> Financial Metrics
            </h4>
            <ul className="text-sm text-gray-400 space-y-1.5 pl-3">
              <li>Total Sales (Food, Bev, Banquet)</li>
              <li>Net Profit & Margin</li>
              <li>Food & Labor Cost Percentages</li>
              <li>Cost of Goods Sold (COGS)</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-brand-eco font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <Zap size={14} className="text-brand-eco" /> Operational Metrics
            </h4>
            <ul className="text-sm text-gray-400 space-y-1.5 pl-3">
              <li>Average Check & Headcount</li>
              <li>Inventory Turnover Ratio</li>
              <li>Peak Hour Analysis</li>
              <li>Customer Retention Rate</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-brand-energy font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <Database size={14} className="text-brand-energy" /> Sustainability ESG
            </h4>
            <ul className="text-sm text-gray-400 space-y-1.5 pl-3">
              <li>Food Waste (Weight & Monetary)</li>
              <li>Water & Energy Waste</li>
              <li>CO₂ Emission Reduction</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <Users size={14} className="text-brand-eco" /> Other KPIs
            </h4>
            <ul className="text-sm text-gray-400 space-y-1.5 pl-3">
              <li>Online Reviews & Ratings</li>
              <li>Employee Engagement Scores</li>
              <li>Distribution Costs</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      question: "How does Ecometricus help with ESG goals?",
      answer: "Ecometricus provides daily manual input for food waste tracking by weight. Chefs log data by categories like preparation, plate waste, storage, and overproduction. The Mila AI then calculates the monetary cost of wasted food, water and energy savings, CO₂ reduction, and aligns data with GHG protocol and GSTC criteria."
    },
    {
      question: "Where does the data come from?",
      answer: "All data is extracted from your hotel's existing systems — PMS, CRM, and POS — alongside historic internal data and public reports (e.g., STR, RevPAR Guru). Gathered through secure APIs, with daily food waste weight as a manual chef input."
    },
    {
      question: "How secure is our data?",
      answer: (
        <div className="space-y-3 text-sm text-gray-400 leading-relaxed">
          <p>Ecometricus uses encrypted, read-only API connections (TLS/HTTPS), role-based access controls, and no plain-text credential storage.</p>
          <p>We collect only what's needed for analytics, never resell data, and clients retain full ownership at all times.</p>
        </div>
      )
    },
    {
      question: "How does Ecometricus provide actionable insights?",
      answer: "The app includes Suggestion windows with next-month actions to improve metrics, and an Alert window that triggers when metrics deviate from pre-established parameters — often with AI-suggested actions for food cost, inventory, or occupancy deviations."
    },
    {
      question: "How often is the data updated?",
      answer: "All charts and metrics update every 24 hours at 12 AM based on the user's local time zone, ensuring the most current insights for daily operational management."
    },
    {
      question: "What kind of reports does Ecometricus generate?",
      answer: "100% digital, real-time reports organized daily, weekly, monthly, or quarterly. Operational sustainability reports are shareable with staff and guests, while outlet comparative KPIs and benchmarking reports are generated for management and HQ."
    },
    {
      question: "Are there different access levels for staff?",
      answer: "Yes. Ecometricus supports Admin Privilege (full access and benchmarking) and Supervisor Privilege (including Chef Privilege for ESG input and Manager Privilege for labor and forecast input)."
    }
  ];

  const activeFaq = activeIndex !== null ? faqs[activeIndex] : null;

  return (
    <div className="min-h-screen bg-brand-dark">
      <div className="max-w-4xl mx-auto px-6 py-20 sm:py-28">

        {/* Title */}
        <div className="text-center mb-14">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold/70 mb-3">Knowledge Base</p>
          <h1 className="text-4xl sm:text-5xl font-geometric font-black text-white uppercase tracking-widest">FAQ</h1>
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
                ← Prev
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
                Next →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQPage;
