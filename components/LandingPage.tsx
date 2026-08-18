
import React from 'react';
import { Page } from '../types';
import { Leaf, Droplets, Zap, Globe, Users, ArrowRight, Infinity, GlassWater, Sun, Eye, Sparkles, CalendarCheck, Clock, ChartBar, CheckCircle, ClipboardList, ChevronDown, PieChart, Database } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (page: Page) => void;
  isLoggedIn?: boolean;
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
interface FAQEntry {
  q: string;
  tag: string;
  a?: string;
  multi?: { label: string; icon: React.ReactNode; color: string; items: string[] }[];
}

const faqs: FAQEntry[] = [
  {
    tag: 'Platform',
    q: 'What is Ecometricus?',
    a: 'Ecometricus is an F&B Dashboard Metrics (KPIs) application designed for the hotel industry. It drives data-driven decision making through real-time sustainability, financial, and operational metrics displayed per outlet.',
  },
  {
    tag: 'Metrics',
    q: 'What categories of metrics are tracked?',
    multi: [
      { label: 'Financial', icon: <PieChart size={13} />, color: 'text-brand-gold', items: ['Total Sales (Food, Bev, Banquet)', 'Net Profit & Margin', 'Food & Labor Cost %', 'COGS'] },
      { label: 'Operational', icon: <Zap size={13} />, color: 'text-brand-eco', items: ['Average Check & Headcount', 'Inventory Turnover Ratio', 'Peak Hour Analysis', 'Customer Retention Rate'] },
      { label: 'Sustainability ESG', icon: <Database size={13} />, color: 'text-brand-energy', items: ['Food Waste (Weight & Monetary)', 'Water & Energy Waste', 'CO₂ Emission Reduction'] },
      { label: 'Other KPIs', icon: <Users size={13} />, color: 'text-gray-300', items: ['Online Reviews & Ratings', 'Employee Engagement Scores', 'Distribution Costs'] },
    ],
  },
  {
    tag: 'ESG',
    q: 'How does Ecometricus help with ESG goals?',
    a: 'Ecometricus provides daily manual input for food waste tracking by weight. Chefs log data by categories like preparation, plate waste, storage, and overproduction. The Mila AI then calculates the monetary cost of waste, water and energy savings, CO₂ reduction, and aligns data with GHG protocol and GSTC criteria.',
  },
  {
    tag: 'Data',
    q: 'Where does the data come from?',
    a: "All data is extracted from your hotel's existing systems (PMS, CRM, POS) alongside historic internal data and public reports (STR, RevPAR Guru). Gathered through secure APIs — with daily food waste weight as a manual chef input.",
  },
  {
    tag: 'Security',
    q: 'How secure is our data?',
    a: 'Ecometricus uses encrypted, read-only API connections (TLS/HTTPS), role-based access controls, and no plain-text credentials. We collect only what\'s needed for analytics, never resell data, and clients retain full ownership at all times.',
  },
  {
    tag: 'Updates',
    q: 'How often is the data updated?',
    a: "All charts and metrics update every 24 hours at 12 AM (user's local time zone), ensuring the most current insights for daily operational management.",
  },
  {
    tag: 'Access',
    q: 'Are there different access levels?',
    a: 'Yes. Ecometricus supports Admin Privilege (full access and benchmarking), Supervisor Privilege (including Chef Privilege for ESG input and Manager Privilege for labor and forecast input).',
  },
];

const FAQSection: React.FC = () => {
  const [active, setActive] = React.useState(0);
  const current = faqs[active];
  return (
    <section className="py-20 sm:py-28 bg-[#0e1f1c] border-t border-white/5 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 70% 50%, rgba(200,164,19,0.04), transparent 55%)' }} />
      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold/70 mb-3">Knowledge Base</p>
          <h2 className="text-3xl sm:text-4xl font-geometric font-black text-white uppercase tracking-widest">
            Frequently Asked <span className="text-brand-gold">Questions</span>
          </h2>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

          {/* Left: question list */}
          <div className="lg:col-span-2 flex flex-col gap-2">
            {faqs.map((faq, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`w-full text-left flex items-start gap-4 px-5 py-4 rounded-xl transition-all duration-200 group ${
                  active === i
                    ? 'bg-brand-gold/10 border border-brand-gold/40'
                    : 'border border-transparent hover:border-white/8 hover:bg-white/3'
                }`}
              >
                <span className={`shrink-0 text-[10px] font-black tabular-nums mt-0.5 ${active === i ? 'text-brand-gold' : 'text-gray-600 group-hover:text-gray-400'}`}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <span className={`block text-[9px] font-bold uppercase tracking-[0.25em] mb-1 ${active === i ? 'text-brand-gold/70' : 'text-gray-600'}`}>
                    {faq.tag}
                  </span>
                  <span className={`text-sm font-geometric font-bold leading-snug transition-colors ${active === i ? 'text-white' : 'text-gray-400 group-hover:text-white/80'}`}>
                    {faq.q}
                  </span>
                </div>
                {active === i && (
                  <ArrowRight size={14} className="shrink-0 text-brand-gold mt-1" />
                )}
              </button>
            ))}
          </div>

          {/* Right: answer panel */}
          <div className="lg:col-span-3 sticky top-24">
            <div className="border border-brand-gold/20 rounded-2xl bg-brand-dark/70 p-7 sm:p-10 min-h-[280px] shadow-[0_0_40px_rgba(0,0,0,0.3)] relative overflow-hidden">
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent" />

              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-[9px] font-black uppercase tracking-[0.25em] text-brand-gold">
                  {current.tag}
                </span>
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                  {String(active + 1).padStart(2, '0')} / {String(faqs.length).padStart(2, '0')}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-geometric font-black text-white uppercase tracking-wide mb-5 leading-snug">
                {current.q}
              </h3>

              {current.multi ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {current.multi.map((group) => (
                    <div key={group.label} className="bg-white/3 border border-white/5 rounded-xl p-4">
                      <p className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-3 ${group.color}`}>
                        {group.icon} {group.label}
                      </p>
                      <ul className="space-y-1.5">
                        {group.items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-xs text-gray-500 leading-relaxed">
                            <span className="shrink-0 mt-1.5 w-1 h-1 rounded-full bg-brand-gold/30" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 leading-relaxed">{current.a}</p>
              )}

              {/* Prev / Next */}
              <div className="flex items-center justify-between mt-8 pt-5 border-t border-white/5">
                <button
                  onClick={() => setActive(Math.max(0, active - 1))}
                  disabled={active === 0}
                  className="text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:text-white disabled:opacity-20 transition-colors flex items-center gap-2"
                >
                  ← Prev
                </button>
                <div className="flex gap-1.5">
                  {faqs.map((_, i) => (
                    <button key={i} onClick={() => setActive(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${i === active ? 'bg-brand-gold w-4' : 'bg-white/15 hover:bg-white/30'}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setActive(Math.min(faqs.length - 1, active + 1))}
                  disabled={active === faqs.length - 1}
                  className="text-[10px] font-bold uppercase tracking-widest text-gray-600 hover:text-white disabled:opacity-20 transition-colors flex items-center gap-2"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, isLoggedIn = false }) => {
  const [engagementAvg, setEngagementAvg] = React.useState('87');

  React.useEffect(() => {
    const saved = localStorage.getItem('ecometricus_cumulative_engagement');
    if (saved) setEngagementAvg(saved);
  }, []);

  const metrics = [
    { value: '5,675', unit: 'kg', label: 'Food Waste Saved', icon: <Leaf className="text-brand-gold" size={32} /> },
    { value: '895', unit: 'Lts', label: 'Water Saved', icon: <Droplets className="text-brand-gold" size={32} /> },
    { value: '13,000', unit: 'kWh', label: 'Energy Reduced', icon: <Zap className="text-brand-gold" size={32} /> },
    { value: '2,890', unit: 'kg', label: 'CO₂ Emissions Avoided', icon: <Globe className="text-brand-gold" size={32} /> },
    { value: `+${engagementAvg}%`, unit: '', label: 'Staff Engagement Avg.', icon: <Users className="text-brand-gold" size={32} /> },
  ];

  const sdgs = [
    {
      id: 12,
      number: "12",
      title: 'Responsible Consumption',
      label: "RESPONSIBLE CONSUMPTION",
      icon: <Infinity className="text-brand-gold" size={48} strokeWidth={1.5} />
    },
    {
      id: 6,
      number: "6",
      title: 'Clean Water',
      label: "CLEAN WATER & SANITATION",
      icon: <GlassWater className="text-brand-gold" size={48} strokeWidth={1.5} />
    },
    {
      id: 7,
      number: "7",
      title: 'Energy Efficiency',
      label: "AFFORDABLE & CLEAN ENERGY",
      icon: <Sun className="text-brand-gold" size={48} strokeWidth={1.5} />
    },
    {
      id: 13,
      number: "13",
      title: 'Climate Action',
      label: "CLIMATE ACTION",
      icon: <Eye className="text-brand-gold" size={48} strokeWidth={1.5} />
    },
  ];

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative aspect-[9/16] sm:aspect-[4/3] lg:aspect-video xl:aspect-[21/9] w-full flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/hero-kitchen.png"
            alt="Chefs working at a kitchen prep table under heat lamps"
            className="w-full h-full object-cover opacity-95 brightness-[0.55] contrast-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/95 via-brand-dark/40 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
          <div className="space-y-6 sm:space-y-10 max-w-3xl text-left">
            <div className="inline-block px-4 py-1.5 rounded-full border border-brand-gold/40 bg-brand-gold/10 backdrop-blur-xl text-brand-gold text-[10px] sm:text-xs uppercase tracking-[0.4em] font-bold">
              F&B Intelligence
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-geometric font-bold leading-[1.1] text-white drop-shadow-2xl">
              Sustainability metrics that drive <span className="text-brand-gold">operational profit.</span>
            </h1>
            <p className="text-lg sm:text-2xl text-gray-100 font-light leading-relaxed max-w-xl drop-shadow-lg">
              Empowering F&B leaders to measure, optimize, and report ESG performance with unmatched luxury precision.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 pt-4">
              {isLoggedIn ? (
                /* ── Logged-in: single "Go to Dashboard" CTA ── */
                <button
                  onClick={() => onNavigate(Page.DASHBOARD)}
                  className="flex items-center gap-3 bg-brand-eco text-brand-dark hover:brightness-110 px-12 py-4 rounded-full font-bold shadow-[0_15px_35px_rgba(119,177,57,0.45)] transition-all transform hover:scale-105 uppercase tracking-widest text-xs"
                >
                  Go to Dashboard <ArrowRight size={15} />
                </button>
              ) : (
                /* ── Guest: Watch Demo + Sign Up ── */
                <>
                  <a
                    href="https://yellow-rabbit-520973.hostingersite.com/Videos/Ecometricus%20Walkthrough%20Presentation.mp4"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-2 border-brand-gold text-brand-gold bg-brand-dark/10 backdrop-blur-xl hover:bg-brand-gold hover:text-brand-dark px-10 py-4 rounded-full font-bold transition-all uppercase tracking-widest text-xs shadow-xl text-center"
                  >
                    Watch Demo
                  </a>
                  <button
                    className="bg-brand-eco text-brand-dark hover:brightness-110 px-12 py-4 rounded-full font-bold shadow-[0_15px_35px_rgba(119,177,57,0.5)] transition-all transform hover:scale-105 uppercase tracking-widest text-xs"
                    onClick={() => onNavigate(Page.SIGN_UP)}
                  >
                    Sign Up Now
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Global Impact Metrics */}
      <section className="py-20 sm:py-28 bg-brand-dark relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(200,164,19,0.05), transparent 55%)' }} />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-14">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold/70 mb-3">Platform Performance</p>
            <h2 className="text-3xl sm:text-4xl font-geometric font-bold uppercase tracking-[0.3em] text-white">
              Global Impact
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-stretch">
            {metrics.map((m, i) => (
              <div key={i} className="relative group cursor-default h-full">
                <div className="h-full relative border border-brand-gold/20 group-hover:border-brand-gold/60 rounded-2xl p-6 bg-[#0e1f1c] flex flex-col gap-5 transition-all duration-300 shadow-[inset_0_1px_0_rgba(200,164,19,0.08)] group-hover:shadow-[0_0_24px_rgba(200,164,19,0.08)]">
                  <div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shrink-0">
                    {m.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-geometric font-black text-brand-gold leading-none">
                      {m.value}
                      {m.unit && <span className="text-xs font-light text-gray-500 ml-1">{m.unit}</span>}
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-[0.18em] font-bold mt-2 leading-relaxed">{m.label}</div>
                  </div>
                  <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-brand-gold/0 group-hover:via-brand-gold/30 to-transparent transition-all duration-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Impact & SDG Alignment */}
      <section className="py-20 sm:py-28 bg-[#0e1f1c] border-y border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(119,177,57,0.05), transparent 40%), radial-gradient(ellipse at 80% 50%, rgba(200,164,19,0.05), transparent 40%)' }} />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-16">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-eco/70 mb-3">UN Sustainable Development Goals</p>
            <h2 className="text-3xl sm:text-4xl font-geometric font-bold uppercase tracking-[0.3em] text-white">
              Industry Impact & Global Alignment
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {sdgs.map((sdg) => (
              <div key={sdg.id} className="group relative border border-white/5 hover:border-brand-gold/40 rounded-2xl p-7 bg-brand-dark/60 flex flex-col items-center text-center transition-all duration-400 cursor-default overflow-hidden">
                {/* Glow backdrop */}
                <div className="absolute inset-0 bg-brand-gold/0 group-hover:bg-brand-gold/4 transition-all duration-500 pointer-events-none rounded-2xl" />
                {/* SDG number badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 mb-6 self-start">
                  <span className="text-lg font-geometric font-black text-brand-gold leading-none">{sdg.number}</span>
                  <div className="text-[7px] font-black uppercase tracking-widest text-brand-gold/70 text-left leading-[1.3]">
                    {sdg.label.split(' ').slice(0, 2).join(' ')}<br />
                    {sdg.label.split(' ').slice(2).join(' ')}
                  </div>
                </div>
                {/* Icon */}
                <div className="w-20 h-20 rounded-2xl bg-brand-gold/8 border border-brand-gold/15 flex items-center justify-center mb-6 transform group-hover:scale-105 group-hover:border-brand-gold/40 transition-all duration-400">
                  {sdg.icon}
                </div>
                {/* Label */}
                <p className="text-xs font-geometric font-bold text-gray-400 uppercase tracking-widest group-hover:text-brand-gold transition-colors duration-300">
                  SDG {sdg.number}
                </p>
                <p className="text-sm font-medium text-white/80 mt-1">{sdg.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Operational Snapshots */}
      <section className="py-20 sm:py-28 bg-brand-dark relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 90% 50%, rgba(200,164,19,0.04), transparent 45%)' }} />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-14 gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold/70 mb-3">Real-World Results</p>
              <h2 className="text-3xl sm:text-4xl font-geometric font-bold uppercase tracking-[0.2em]">
                Operational <span className="text-brand-gold">Snapshots</span>
              </h2>
            </div>
            <button className="flex items-center gap-3 text-brand-gold hover:text-white transition-all group font-bold uppercase tracking-[0.2em] text-xs shrink-0">
              Explore Case Studies <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[
              {
                name: "137 PILLARS",
                location: "Thailand",
                tag: "Staff Engagement",
                stat: "+23%",
                statLabel: "participation in 4 months",
                desc: "Staff participation in sustainable F&B practices increased 23% in 4 months after implementing Ecometricus real-time tracking.",
                logoColor: "#152b28",
              },
              {
                name: "MAISON LA FLORIDE",
                location: "France",
                tag: "Cost Savings",
                stat: "€675",
                statLabel: "saved per outlet / month",
                desc: "Substantial waste reduction and operational cost savings achieved per outlet through Mila AI-powered intervention.",
                logoColor: "#0e1f1c",
              },
            ].map((partner, i) => (
              <div
                key={i}
                className="relative rounded-2xl overflow-hidden p-8 sm:p-10 flex flex-col justify-between gap-8 border border-brand-gold/15 hover:border-brand-gold/45 bg-[#0e1f1c] transition-all duration-300 group cursor-default shadow-[inset_0_1px_0_rgba(200,164,19,0.06)]"
              >
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl bg-brand-gold/0 group-hover:bg-brand-gold/3 transition-all duration-400 pointer-events-none" />

                {/* Top row */}
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/8 text-gray-400 border border-white/10 mb-4">
                      {partner.tag}
                    </span>
                    <h3 className="text-lg sm:text-xl font-geometric font-black text-white uppercase tracking-wide mb-1">{partner.name}</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-widest">{partner.location}</p>
                  </div>
                  {/* Stat callout */}
                  <div className="shrink-0 text-right">
                    <div className="text-3xl sm:text-4xl font-geometric font-black text-brand-gold leading-none">{partner.stat}</div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 max-w-[100px] leading-relaxed">{partner.statLabel}</div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-400 leading-relaxed">{partner.desc}</p>


              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Book Demo CTA */}
      <section className="py-20 sm:py-28 bg-brand-dark border-t border-white/5 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 70% 50%, rgba(200,164,19,0.08), transparent 60%)' }}></div>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left: text */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold mb-4">Personalized Walkthrough</p>
              <h2 className="text-3xl sm:text-4xl font-geometric font-bold text-white leading-tight mb-6">
                Ready to see Ecometricus<br /><span className="text-brand-gold">working for your team?</span>
              </h2>
              <p className="text-base text-gray-400 font-light leading-relaxed mb-8 max-w-md">
                Our team will walk you through a live session tailored to your property's F&B setup — no generic slides, just real insights for your operation.
              </p>
              <button
                className="inline-flex items-center gap-3 bg-brand-gold text-brand-dark hover:brightness-110 px-10 py-4 rounded-full font-bold shadow-[0_15px_35px_rgba(200,164,19,0.35)] transition-all transform hover:scale-105 uppercase tracking-widest text-xs"
                onClick={() => window.open("https://calendly.com/urbanseed-ai/ai-bureau-services", "_blank")}
              >
                <CalendarCheck size={16} /> Book a Demo
              </button>
            </div>

            {/* Right: feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: <Clock className="text-brand-gold" size={22} />, title: '30-Minute Session', desc: 'A focused, no-fluff walkthrough of the platform.' },
                { icon: <ChartBar className="text-brand-gold" size={22} />, title: 'Live ESG Metrics', desc: 'See real-time F&B sustainability data in action.' },
                { icon: <CheckCircle className="text-brand-gold" size={22} />, title: 'Tailored to You', desc: 'Customized to your property type and outlet count.' },
                { icon: <Users className="text-brand-gold" size={22} />, title: 'Team Onboarding', desc: 'Learn how staff adoption works from day one.' },
              ].map((item, i) => (
                <div key={i} className="metric-card p-5 rounded-2xl bg-brand-dark/60 flex gap-4 items-start group hover:bg-brand-gold/5 transition-all duration-300">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-geometric font-bold text-white mb-1">{item.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <FAQSection />

      {/* F&B Operations Assessment CTA */}
      <section className="py-20 sm:py-28 bg-[#0e1f1c] border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 30% 50%, rgba(119,177,57,0.07), transparent 55%)' }}></div>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left: steps */}
            <div className="space-y-4">
              {[
                { step: '01', title: 'Answer 23 Quick Questions', desc: 'Covering waste tracking, tech stack, ESG goals, and budget.' },
                { step: '02', title: 'Get Your Sustainability Score', desc: 'Instantly understand where your operation stands today.' },
                { step: '03', title: 'Receive Tailored Insights', desc: 'See which Ecometricus features deliver the most value for you.' },
              ].map((s) => (
                <div key={s.step} className="flex gap-5 items-start p-5 rounded-2xl bg-brand-dark/60 border border-white/5 hover:border-brand-eco/30 transition-all duration-300">
                  <span className="shrink-0 text-2xl font-geometric font-black text-brand-eco/30 leading-none mt-0.5">{s.step}</span>
                  <div>
                    <p className="text-sm font-geometric font-bold text-white mb-1">{s.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: text + CTA */}
            <div>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-eco/15 border border-brand-eco/30 mb-6">
                <ClipboardList className="text-brand-eco" size={26} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-eco mb-4">5-Minute Assessment</p>
              <h2 className="text-3xl sm:text-4xl font-geometric font-bold text-white leading-tight mb-6">
                Where does your<br /><span className="text-brand-eco">F&B operation</span> stand?
              </h2>
              <p className="text-base text-gray-400 font-light leading-relaxed mb-8 max-w-md">
                Curious how your operation measures up? This optional assessment gives you a clear picture of where you stand — no sign-up required.
              </p>
              <a
                href="https://tally.so/r/aQ0ZOZ"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-brand-eco text-brand-dark hover:brightness-110 px-10 py-4 rounded-full font-bold shadow-[0_15px_35px_rgba(119,177,57,0.4)] transition-all transform hover:scale-105 uppercase tracking-widest text-xs"
              >
                <Sparkles size={16} /> Start the Assessment
              </a>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
