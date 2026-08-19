
import React, { useState, useEffect } from 'react';
import { Target, Cpu, Scale, BarChart3, Globe2, BookOpen, Award, Trash2, Droplets, Zap, Cloud, ArrowRight } from 'lucide-react';

const heroImages = [
  '/assets/Open kitchen Image.png',
  '/assets/6 Chef outcome.png',
];

const AboutPage: React.FC = () => {
  const [heroIndex, setHeroIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setHeroIndex(i => (i + 1) % heroImages.length);
        setFading(false);
      }, 700);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const gorillaMetrics = [
    { value: '50–70%', label: "of a hotel's total", category: 'Solid Waste', icon: <Trash2 size={26} className="text-brand-dark" /> },
    { value: '15–30%', label: 'of total', category: 'Water Consumption', icon: <Droplets size={26} className="text-brand-dark" /> },
    { value: '15–25%', label: 'of total', category: 'Energy Consumption', icon: <Zap size={26} className="text-brand-dark" /> },
    { value: '20–35%', label: 'of indirect', category: 'Carbon Footprint (Scope 3)', icon: <Cloud size={26} className="text-brand-dark" /> },
  ];

  const pillars = [
    { title: 'Actionable Insights', icon: <BarChart3 className="text-brand-gold" size={28} />, desc: 'Transforming raw financial data into clear visualizations, enabling hotels to make informed decisions proactively.' },
    { title: 'Mila AI Assistant', icon: <Cpu className="text-brand-eco" size={28} />, desc: 'Integrating Generative AI to offer intelligent suggestions and alerts, facilitating goal achievement at every level.' },
    { title: 'ESG Operationalization', icon: <Scale className="text-brand-energy" size={28} />, desc: 'Tracking the monetary implications of food, water, and energy waste to achieve true environmental stewardship.' },
  ];

  const insights = [
    { title: 'GHG Protocol', icon: <Globe2 className="text-brand-eco" size={24} />, desc: 'Compliance with greenhouse gas accounting standards for operational transparency.' },
    { title: 'GSTC Framework', icon: <Award className="text-brand-gold" size={24} />, desc: 'Alignment with Global Sustainable Tourism Council criteria for luxury hotels.' },
    { title: 'UN SDGs', icon: <Target className="text-brand-energy" size={24} />, desc: 'Measurable contributions toward goals 6, 7, 12, and 13.' },
    { title: 'Case Analysis', icon: <BookOpen className="text-white" size={24} />, desc: 'Real-time benchmarking against luxury competitors for continued market leadership.' },
  ];

  return (
    <div className="min-h-screen bg-brand-dark">

      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/5 min-h-[420px] sm:min-h-[500px] flex items-center">
        {/* Background slideshow */}
        <div className="absolute inset-0 z-0">
          <img
            key={heroIndex}
            src={heroImages[heroIndex]}
            alt="About hero background"
            className="w-full h-full object-cover object-center"
            style={{
              opacity: fading ? 0 : 0.35,
              filter: 'brightness(0.5)',
              transition: 'opacity 0.7s ease-in-out',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/95 via-brand-dark/75 to-brand-dark/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/60 via-transparent to-transparent" />
        </div>

        {/* Slide dots */}
        <div className="absolute bottom-5 right-6 z-10 flex gap-2">
          {heroImages.map((_, i) => (
            <button
              key={i}
              onClick={() => { setFading(true); setTimeout(() => { setHeroIndex(i); setFading(false); }, 300); }}
              className={`h-1 rounded-full transition-all duration-300 ${i === heroIndex ? 'w-5 bg-brand-gold' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
            />
          ))}
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 sm:py-28 w-full">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold mb-4">Powered by Us+AI Bureau</p>
            <h1 className="text-4xl sm:text-6xl font-geometric font-black text-white uppercase leading-tight mb-6">
              The<br /><span className="text-brand-gold">Vision</span>
            </h1>
            <p className="text-base sm:text-lg text-gray-300 font-light leading-relaxed mb-8 max-w-lg">
              Empowering the hotel Food & Beverage industry with a comprehensive, intelligent platform for optimizing performance and enhancing profitability.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-eco">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-eco animate-pulse" />
              ESG Intelligence Platform
            </div>
          </div>
        </div>
      </section>

      {/* ─── 800-Pound Gorilla ─────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-[#0e1f1c] border-b border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 80% 50%, rgba(119,177,57,0.05), transparent 50%)' }} />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-eco/70 mb-4">The Hidden Problem</p>
              <h2 className="text-3xl sm:text-4xl font-geometric font-black text-brand-gold leading-tight mb-6">
                The 800-Pound Gorilla is in the Kitchen.
              </h2>
              <p className="text-base text-gray-400 font-light leading-relaxed mb-6">
                While guest-facing initiatives are important, the F&B department is consistently the largest contributor to a hotel's environmental footprint — a fact often under-measured in ESG reporting.
              </p>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">
                Source: Sustainable Hospitality Alliance, Greenview.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {gorillaMetrics.map((m, i) => (
                <div key={i} className="relative group border border-white/5 hover:border-brand-eco/40 rounded-2xl p-5 bg-brand-dark/60 transition-all duration-300 overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-brand-eco/5 -translate-y-8 translate-x-8 group-hover:bg-brand-eco/10 transition-all duration-500" />
                  <div className="w-10 h-10 rounded-xl bg-brand-eco flex items-center justify-center mb-4 shrink-0">
                    {m.icon}
                  </div>
                  <div className="text-2xl font-geometric font-black text-white mb-1">{m.value}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-widest">{m.label}</div>
                  <div className="text-xs font-bold text-brand-eco mt-1">{m.category}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Why F&B Remains a Critical ESG Gap ────────────── */}
      <section className="py-20 sm:py-28 bg-brand-dark border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold/70 mb-3">Our Approach</p>
            <h2 className="text-3xl sm:text-4xl font-geometric font-black text-white uppercase tracking-wide mb-4">
              Why F&B Remains a <span className="text-brand-gold">Critical ESG Gap</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {pillars.map((p, i) => (
              <div key={i} className="group relative border border-white/5 hover:border-brand-gold/35 rounded-2xl p-8 bg-[#0e1f1c] transition-all duration-400 flex flex-col gap-5 overflow-hidden">
                <div className="absolute inset-0 bg-brand-gold/0 group-hover:bg-brand-gold/3 transition-all duration-500 rounded-2xl pointer-events-none" />
                <div className="w-12 h-12 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center group-hover:scale-110 group-hover:border-brand-gold/40 transition-all duration-300">
                  {p.icon}
                </div>
                <div>
                  <h3 className="text-base font-geometric font-black text-white uppercase tracking-wider mb-3">{p.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ESG Scope 3 Differentiator ────────────────────── */}
      <section className="py-20 sm:py-28 bg-[#0e1f1c] border-b border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 30% 50%, rgba(200,164,19,0.05), transparent 50%)' }} />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            {/* Scope visual */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-8 rounded-2xl border border-white/5 bg-brand-dark/60 flex flex-col items-center justify-center text-center gap-2 hover:border-brand-gold/20 transition-colors">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold">Scope 1</div>
                <div className="text-[9px] text-gray-600 uppercase tracking-widest">Direct Emissions</div>
              </div>
              <div className="p-8 rounded-2xl border border-white/5 bg-brand-dark/60 flex flex-col items-center justify-center text-center gap-2 hover:border-brand-gold/20 transition-colors">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold">Scope 2</div>
                <div className="text-[9px] text-gray-600 uppercase tracking-widest">Purchased Energy</div>
              </div>
              <div className="col-span-2 p-8 rounded-2xl border-2 border-brand-eco/50 bg-brand-eco/8 flex flex-col items-center justify-center text-center gap-3 shadow-[0_0_40px_rgba(119,177,57,0.08)]">
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-eco">Scope 3 — Operations</div>
                <div className="text-sm font-bold text-white uppercase tracking-wide">Real-time F&B tracking & reporting</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-eco animate-pulse" />
                  <span className="text-[10px] text-brand-eco/70 uppercase tracking-widest font-bold">Ecometricus Focus</span>
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="space-y-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-eco/70">GHG Protocol Compliance</p>
              <h2 className="text-3xl sm:text-4xl font-geometric font-black text-white leading-tight">
                ESG Scope 3:<br /><span className="text-brand-gold">The Differentiator</span>
              </h2>
              <p className="text-base text-gray-400 font-light leading-relaxed">
                According to the <strong className="text-white">GHG Protocol</strong>, food waste falls under <strong className="text-white">Scope 3</strong> ("Waste Generated in Operations"). Despite its impact, it is often an industry blind spot. Ecometricus turns ESG from reporting into real-time results.
              </p>
              <ul className="space-y-3">
                {[
                  'Track daily waste by outlet and category',
                  'Calculate cost, carbon, water, and energy impact',
                  'Align with GSTC sustainability criteria',
                  'Educational webinar & workshop training',
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                    <ArrowRight size={14} className="text-brand-eco shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Industry Insights ─────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-brand-dark">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold/70 mb-3">Standards & Frameworks</p>
            <h2 className="text-3xl sm:text-4xl font-geometric font-black text-white uppercase tracking-wide mb-4">
              Industry <span className="text-brand-gold">Insights</span>
            </h2>
            <p className="text-base text-gray-500 font-light max-w-xl mx-auto">
              Intelligence that meets global standards and pushes the boundaries of luxury hospitality.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {insights.map((item, i) => (
              <div key={i} className="group border border-white/5 hover:border-brand-gold/30 rounded-2xl p-6 bg-[#0e1f1c] flex flex-col gap-4 transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center group-hover:scale-110 group-hover:border-brand-gold/30 transition-all duration-300">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-sm font-geometric font-black text-white uppercase tracking-widest mb-2">{item.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};

export default AboutPage;
