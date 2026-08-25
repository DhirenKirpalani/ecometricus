
import React from 'react';
import { Target, Cpu, Scale, BarChart3, Globe2, BookOpen, Award, Trash2, Droplets, Zap, Cloud, ArrowRight } from 'lucide-react';
import { useI18n } from '../lib/useI18n';

const AboutPage: React.FC = () => {
  const { t } = useI18n();

  const gorillaMetrics = [
    { value: '50–70%', label: t('about.ofHotelTotal'), category: t('about.solidWaste'), icon: <Trash2 size={26} className="text-brand-dark" /> },
    { value: '15–30%', label: t('about.ofTotal'), category: t('about.waterConsumption'), icon: <Droplets size={26} className="text-brand-dark" /> },
    { value: '15–25%', label: t('about.ofTotal'), category: t('about.energyConsumption'), icon: <Zap size={26} className="text-brand-dark" /> },
    { value: '20–35%', label: t('about.ofTotal'), category: t('about.carbonFootprint'), icon: <Cloud size={26} className="text-brand-dark" /> },
  ];

  const pillars = [
    { title: t('about.actionableInsights'), icon: <BarChart3 className="text-brand-gold" size={28} />, desc: t('about.actionableDesc') },
    { title: t('about.milaAssistant'), icon: <Cpu className="text-brand-eco" size={28} />, desc: t('about.milaDesc') },
    { title: t('about.esgOps'), icon: <Scale className="text-brand-energy" size={28} />, desc: t('about.esgOpsDesc') },
  ];

  const insights = [
    { title: t('about.ghgProtocol'), icon: <Globe2 className="text-brand-eco" size={24} />, desc: t('about.ghgProtocolDesc') },
    { title: t('about.gstcFramework'), icon: <Award className="text-brand-gold" size={24} />, desc: t('about.gstcDesc') },
    { title: t('about.unSdgs'), icon: <Target className="text-brand-energy" size={24} />, desc: t('about.unSdgsDesc') },
    { title: t('about.caseAnalysis'), icon: <BookOpen className="text-white" size={24} />, desc: t('about.caseAnalysisDesc') },
  ];

  return (
    <div className="min-h-screen bg-brand-dark">

      {/* ─── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-white/5 min-h-[480px] sm:min-h-[540px] flex items-center">

        {/* Right — image covers right half */}
        <div className="absolute inset-y-0 right-0 w-1/2 hidden lg:block">
          <img
            src="/assets/Open kitchen Image.png"
            alt="Kitchen vision"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-dark via-brand-dark/20 to-transparent" />
        </div>

        {/* Left — text */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 sm:py-28 w-full">
          <div className="max-w-xl lg:max-w-[45%]">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.4em] text-brand-gold mb-4">{t('about.poweredBy')}</p>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-geometric font-bold text-white uppercase leading-[1.1] mb-6">
              {t('about.theVision')} <span className="text-brand-gold">{t('about.vision')}</span>
            </h1>
            <p className="text-lg sm:text-2xl text-gray-300 font-light leading-relaxed mb-8">
              {t('about.heroDesc')}
            </p>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-eco">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-eco animate-pulse" />
              {t('about.esgPlatform')}
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
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-eco/70 mb-4">{t('about.hiddenProblem')}</p>
              <h2 className="text-3xl sm:text-4xl font-geometric font-black text-brand-gold leading-tight mb-6">
                {t('about.gorillaTitle')}
              </h2>
              <p className="text-base text-gray-400 font-light leading-relaxed mb-6">
                {t('about.gorillaDesc')}
              </p>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold">
                {t('about.source')}
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
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold/70 mb-3">{t('about.ourApproach')}</p>
            <h2 className="text-3xl sm:text-4xl font-geometric font-black text-white uppercase tracking-wide mb-4">
              {t('about.whyFBRemains')} <span className="text-brand-gold">{t('about.criticalESGGap')}</span>
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
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold">{t('about.scope1')}</div>
                <div className="text-[9px] text-gray-600 uppercase tracking-widest">{t('about.directEmissions')}</div>
              </div>
              <div className="p-8 rounded-2xl border border-white/5 bg-brand-dark/60 flex flex-col items-center justify-center text-center gap-2 hover:border-brand-gold/20 transition-colors">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold">{t('about.scope2')}</div>
                <div className="text-[9px] text-gray-600 uppercase tracking-widest">{t('about.purchasedEnergy')}</div>
              </div>
              <div className="col-span-2 p-8 rounded-2xl border-2 border-brand-eco/50 bg-brand-eco/8 flex flex-col items-center justify-center text-center gap-3 shadow-[0_0_40px_rgba(119,177,57,0.08)]">
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-eco">{t('about.scope3Ops')}</div>
                <div className="text-sm font-bold text-white uppercase tracking-wide">{t('about.realtimeTracking')}</div>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-eco animate-pulse" />
                  <span className="text-[10px] text-brand-eco/70 uppercase tracking-widest font-bold">{t('about.ecometricusFocus')}</span>
                </div>
              </div>
            </div>

            {/* Text */}
            <div className="space-y-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-eco/70">{t('about.ghgCompliance')}</p>
              <h2 className="text-3xl sm:text-4xl font-geometric font-black text-white leading-tight">
                {t('about.scope3Title')}<br /><span className="text-brand-gold">{t('about.differentiator')}</span>
              </h2>
              <p className="text-base text-gray-400 font-light leading-relaxed">
                {t('about.scope3Desc')}
              </p>
              <ul className="space-y-3">
                {[
                  t('about.trackDaily'),
                  t('about.calculateCost'),
                  t('about.alignGSTC'),
                  t('about.educationalTraining'),
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
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-gold/70 mb-3">{t('about.standardsFrameworks')}</p>
            <h2 className="text-3xl sm:text-4xl font-geometric font-black text-white uppercase tracking-wide mb-4">
              {t('about.industry')} <span className="text-brand-gold">{t('about.insights')}</span>
            </h2>
            <p className="text-base text-gray-500 font-light max-w-xl mx-auto">
              {t('about.standardsDesc')}
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
