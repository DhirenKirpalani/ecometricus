
import React from 'react';
import { Page } from '../types';
import { Leaf, Droplets, Zap, Globe, Users, ArrowRight, Infinity, GlassWater, Sun, Eye, Sparkles, CalendarCheck, Clock, ChartBar, CheckCircle, ClipboardList, ChevronDown } from 'lucide-react';
import { useI18n } from '../lib/useI18n';

interface LandingPageProps {
  onNavigate: (page: Page) => void;
  isLoggedIn?: boolean;
}

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, isLoggedIn = false }) => {
  const { t } = useI18n();
  const [engagementAvg, setEngagementAvg] = React.useState('87');

  React.useEffect(() => {
    const saved = localStorage.getItem('ecometricus_cumulative_engagement');
    if (saved) setEngagementAvg(saved);
  }, []);

  const metrics = [
    { value: '5,675', unit: 'kg', label: t('homepage.foodWasteSaved'), icon: <Leaf className="text-brand-gold" size={32} /> },
    { value: '895', unit: 'Lts', label: t('homepage.waterSaved'), icon: <Droplets className="text-brand-gold" size={32} /> },
    { value: '13,000', unit: 'kWh', label: t('homepage.energyReduced'), icon: <Zap className="text-brand-gold" size={32} /> },
    { value: '2,890', unit: 'kg', label: t('homepage.co2Avoided'), icon: <Globe className="text-brand-gold" size={32} /> },
    { value: `+${engagementAvg}%`, unit: '', label: t('homepage.staffEngagement'), icon: <Users className="text-brand-gold" size={32} /> },
  ];

  const sdgs = [
    {
      id: 12,
      number: "12",
      title: t('homepage.sdg12'),
      label: t('homepage.sdg12').toUpperCase(),
      icon: <Infinity className="text-brand-gold" size={48} strokeWidth={1.5} />
    },
    {
      id: 6,
      number: "6",
      title: t('homepage.sdg6'),
      label: t('homepage.sdg6').toUpperCase(),
      icon: <GlassWater className="text-brand-gold" size={48} strokeWidth={1.5} />
    },
    {
      id: 7,
      number: "7",
      title: t('homepage.sdg7'),
      label: t('homepage.sdg7').toUpperCase(),
      icon: <Sun className="text-brand-gold" size={48} strokeWidth={1.5} />
    },
    {
      id: 13,
      number: "13",
      title: t('homepage.sdg13'),
      label: t('homepage.sdg13').toUpperCase(),
      icon: <Eye className="text-brand-gold" size={48} strokeWidth={1.5} />
    },
  ];

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative min-h-[520px] sm:aspect-[4/3] lg:aspect-video xl:aspect-[21/9] w-full flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/hero-kitchen.png"
            alt="Chefs working at a kitchen prep table under heat lamps"
            className="w-full h-full object-cover opacity-95 brightness-[0.55] contrast-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/95 via-brand-dark/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/60 to-transparent sm:hidden" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 w-full py-16 sm:py-0">
          <div className="space-y-5 sm:space-y-10 max-w-3xl text-left">
            <div className="inline-block px-3 py-1.5 sm:px-4 rounded-full border border-brand-gold/40 bg-brand-gold/10 backdrop-blur-xl text-brand-gold text-[9px] sm:text-xs uppercase tracking-[0.3em] sm:tracking-[0.4em] font-bold">
              {t('homepage.heroBadge')}
            </div>
            <h1 className="text-2xl sm:text-5xl lg:text-6xl xl:text-7xl font-geometric font-bold leading-[1.15] sm:leading-[1.1] text-white drop-shadow-2xl">
              {t('homepage.heroTitle')} <span className="text-brand-gold">{t('homepage.heroTitleGold')}</span>
            </h1>
            <p className="text-sm sm:text-2xl text-gray-100 font-light leading-relaxed max-w-xl drop-shadow-lg">
              {t('homepage.heroSubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 pt-2 sm:pt-4">
              {isLoggedIn ? (
                /* ── Logged-in: single "Go to Dashboard" CTA ── */
                <button
                  onClick={() => onNavigate(Page.DASHBOARD)}
                  className="flex items-center justify-center gap-3 bg-brand-eco text-brand-dark hover:brightness-110 px-8 sm:px-12 py-3.5 sm:py-4 rounded-full font-bold shadow-[0_15px_35px_rgba(119,177,57,0.45)] transition-all transform hover:scale-105 uppercase tracking-widest text-xs"
                >
                  {t('homepage.goToDashboard')} <ArrowRight size={15} />
                </button>
              ) : (
                /* ── Guest: Watch Demo + Sign Up ── */
                <>
                  <a
                    href="https://yellow-rabbit-520973.hostingersite.com/Videos/Ecometricus%20Walkthrough%20Presentation.mp4"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-2 border-brand-gold text-brand-gold bg-brand-dark/10 backdrop-blur-xl hover:bg-brand-gold hover:text-brand-dark px-8 sm:px-10 py-3.5 sm:py-4 rounded-full font-bold transition-all uppercase tracking-widest text-xs shadow-xl text-center"
                  >
                    {t('homepage.watchDemo')}
                  </a>
                  <button
                    className="bg-brand-eco text-brand-dark hover:brightness-110 px-8 sm:px-12 py-3.5 sm:py-4 rounded-full font-bold shadow-[0_15px_35px_rgba(119,177,57,0.5)] transition-all transform hover:scale-105 uppercase tracking-widest text-xs"
                    onClick={() => onNavigate(Page.SIGN_UP)}
                  >
                    {t('homepage.signUpNow')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Global Impact Metrics */}
      <section className="py-14 sm:py-28 bg-brand-dark relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(200,164,19,0.05), transparent 55%)' }} />
        <div className="max-w-7xl mx-auto px-5 sm:px-6 relative">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em] text-brand-gold/70 mb-3">{t('homepage.platformPerformance')}</p>
            <h2 className="text-2xl sm:text-4xl font-geometric font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white">
              {t('homepage.globalImpact')}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 items-stretch">
            {metrics.map((m, i) => (
              <div key={i} className={`relative group cursor-default h-full ${i === 4 ? 'col-span-2 sm:col-span-1' : ''}`}>
                <div className="h-full relative border border-brand-gold/20 group-hover:border-brand-gold/60 rounded-2xl p-4 sm:p-6 bg-[#1c3933] flex flex-col gap-3 sm:gap-5 transition-all duration-300 shadow-[inset_0_1px_0_rgba(200,164,19,0.08)] group-hover:shadow-[0_0_24px_rgba(200,164,19,0.08)]">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shrink-0">
                    {React.cloneElement(m.icon, { size: 24, className: 'text-brand-gold' } as any)}
                  </div>
                  <div className="flex-1">
                    <div className="text-xl sm:text-2xl font-geometric font-black text-brand-gold leading-none">
                      {m.value}
                      {m.unit && <span className="text-xs font-light text-gray-500 ml-1">{m.unit}</span>}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-[0.15em] sm:tracking-[0.18em] font-bold mt-2 leading-relaxed">{m.label}</div>
                  </div>
                  <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-brand-gold/0 group-hover:via-brand-gold/30 to-transparent transition-all duration-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Impact & SDG Alignment */}
      <section className="py-14 sm:py-28 bg-[#1c3933] border-y border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(119,177,57,0.05), transparent 40%), radial-gradient(ellipse at 80% 50%, rgba(200,164,19,0.05), transparent 40%)' }} />
        <div className="max-w-7xl mx-auto px-5 sm:px-6 relative">
          <div className="text-center mb-10 sm:mb-16">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em] text-brand-eco/70 mb-3">{t('homepage.sdgLabel')}</p>
            <h2 className="text-2xl sm:text-4xl font-geometric font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white">
              {t('homepage.industryImpact')}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {sdgs.map((sdg) => (
              <div key={sdg.id} className="group relative border border-brand-gold/10 hover:border-brand-gold/40 rounded-2xl p-4 sm:p-7 bg-brand-dark/60 flex flex-col items-center text-center transition-all duration-400 cursor-default overflow-hidden">
                {/* Glow backdrop */}
                <div className="absolute inset-0 bg-brand-gold/0 group-hover:bg-brand-gold/4 transition-all duration-500 pointer-events-none rounded-2xl" />
                {/* SDG number badge */}
                <div className="inline-flex items-center gap-2 px-2.5 py-1.5 sm:px-3 rounded-full bg-brand-gold/10 border border-brand-gold/25 mb-4 sm:mb-6 self-start">
                  <span className="text-base sm:text-lg font-geometric font-black text-brand-gold leading-none">{sdg.number}</span>
                  <div className="text-[6px] sm:text-[7px] font-black uppercase tracking-widest text-brand-gold/70 text-left leading-[1.3] hidden sm:block">
                    {sdg.label.split(' ').slice(0, 2).join(' ')}<br />
                    {sdg.label.split(' ').slice(2).join(' ')}
                  </div>
                </div>
                {/* Icon */}
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-brand-gold/8 border border-brand-gold/15 flex items-center justify-center mb-4 sm:mb-6 transform group-hover:scale-105 group-hover:border-brand-gold/40 transition-all duration-400">
                  {React.cloneElement(sdg.icon, { size: 32, strokeWidth: 1.5, className: 'text-brand-gold' } as any)}
                </div>
                {/* Label */}
                <p className="text-[10px] sm:text-xs font-geometric font-bold text-gray-400 uppercase tracking-widest group-hover:text-brand-gold transition-colors duration-300">
                  SDG {sdg.number}
                </p>
                <p className="text-xs sm:text-sm font-medium text-white/80 mt-1">{sdg.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Operational Snapshots */}
      <section className="py-14 sm:py-28 bg-brand-dark relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 90% 50%, rgba(200,164,19,0.04), transparent 45%)' }} />
        <div className="max-w-7xl mx-auto px-5 sm:px-6 relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 sm:mb-14 gap-4 sm:gap-6">
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em] text-brand-gold/70 mb-3">{t('homepage.realWorldResults')}</p>
              <h2 className="text-2xl sm:text-4xl font-geometric font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em]">
                {t('homepage.operationalSnapshots')} <span className="text-brand-gold">{t('homepage.snapshots')}</span>
              </h2>
            </div>
            <button className="flex items-center gap-3 text-brand-gold hover:text-white transition-all group font-bold uppercase tracking-[0.2em] text-xs shrink-0">
              {t('homepage.exploreCaseStudies')} <ArrowRight size={16} className="group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {[
              {
                name: "137 PILLARS",
                location: "Thailand",
                tag: t('homepage.tagStaffEngagement'),
                stat: "+23%",
                statLabel: t('homepage.statParticipation'),
                desc: t('homepage.desc137Pillars'),
                logoColor: "#152b28",
              },
              {
                name: "MAISON LA FLORIDE",
                location: "France",
                tag: t('homepage.tagCostSavings'),
                stat: "€675",
                statLabel: t('homepage.statSavedPerOutlet'),
                desc: t('homepage.descMaison'),
                logoColor: "#0e1f1c",
              },
            ].map((partner, i) => (
              <div
                key={i}
                className="relative rounded-2xl overflow-hidden p-6 sm:p-10 flex flex-col justify-between gap-6 sm:gap-8 border border-brand-gold/15 hover:border-brand-gold/45 bg-[#1c3933] transition-all duration-300 group cursor-default shadow-[inset_0_1px_0_rgba(200,164,19,0.06)]"
              >
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl bg-brand-gold/0 group-hover:bg-brand-gold/3 transition-all duration-400 pointer-events-none" />

                {/* Top row */}
                <div className="flex items-start justify-between gap-4 sm:gap-6">
                  <div className="min-w-0">
                    <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/8 text-gray-400 border border-brand-gold/15 mb-4">
                      {partner.tag}
                    </span>
                    <h3 className="text-base sm:text-xl font-geometric font-black text-white uppercase tracking-wide mb-1">{partner.name}</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-widest">{partner.location}</p>
                  </div>
                  {/* Stat callout */}
                  <div className="shrink-0 text-right">
                    <div className="text-2xl sm:text-4xl font-geometric font-black text-brand-gold leading-none">{partner.stat}</div>
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
      <section className="py-14 sm:py-28 bg-brand-dark border-t border-white/5 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 70% 50%, rgba(200,164,19,0.08), transparent 60%)' }}></div>
        <div className="relative max-w-7xl mx-auto px-5 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">

            {/* Left: text */}
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em] text-brand-gold mb-4">{t('homepage.personalizedWalkthrough')}</p>
              <h2 className="text-2xl sm:text-4xl font-geometric font-bold text-white leading-tight mb-6">
                {t('homepage.demoTitle')}<br /><span className="text-brand-gold">{t('homepage.demoTitleGold')}</span>
              </h2>
              <p className="text-sm sm:text-base text-gray-400 font-light leading-relaxed mb-8 max-w-md">
                {t('homepage.demoSubtitle')}
              </p>
              <button
                className="inline-flex items-center gap-3 bg-brand-eco text-brand-dark hover:brightness-110 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full font-bold shadow-[0_15px_35px_rgba(119,177,57,0.35)] transition-all transform hover:scale-105 uppercase tracking-widest text-xs"
                onClick={() => window.open("https://calendly.com/urbanseed-ai/ai-bureau-services", "_blank")}
              >
                <CalendarCheck size={16} /> {t('homepage.bookDemo')}
              </button>
            </div>

            {/* Right: feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {[
                { icon: <Clock className="text-brand-gold" size={22} />, title: t('homepage.feature30Min'), desc: t('homepage.feature30MinDesc') },
                { icon: <ChartBar className="text-brand-gold" size={22} />, title: t('homepage.featureLiveMetrics'), desc: t('homepage.featureLiveMetricsDesc') },
                { icon: <CheckCircle className="text-brand-gold" size={22} />, title: t('homepage.featureTailored'), desc: t('homepage.featureTailoredDesc') },
                { icon: <Users className="text-brand-gold" size={22} />, title: t('homepage.featureOnboarding'), desc: t('homepage.featureOnboardingDesc') },
              ].map((item, i) => (
                <div key={i} className="metric-card p-4 sm:p-5 rounded-2xl bg-brand-dark/60 flex gap-3 sm:gap-4 items-start group hover:bg-brand-gold/5 transition-all duration-300">
                  <div className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center group-hover:scale-110 transition-transform">
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


      {/* F&B Operations Assessment CTA */}
      <section className="py-14 sm:py-28 bg-[#1c3933] border-t border-white/5 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(ellipse at 50% 50%, rgba(119,177,57,0.07), transparent 60%)' }}></div>
        <div className="relative max-w-2xl mx-auto px-5 sm:px-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-brand-eco/15 border border-brand-eco/30 mb-5 sm:mb-6">
            <ClipboardList className="text-brand-eco" size={22} />
          </div>
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em] text-brand-gold mb-4">
            <span className="text-brand-gold">{t('homepage.assessmentBadge')}</span>
          </p>
          <h2 className="text-2xl sm:text-4xl font-geometric font-bold text-white leading-tight mb-6">
            {t('homepage.assessmentTitle')} <span className="text-brand-gold">{t('homepage.assessmentTitleGold')}</span> {t('homepage.assessmentTitleEnd')}
          </h2>
          <p className="text-sm sm:text-base text-gray-400 font-light leading-relaxed mb-8 sm:mb-10 max-w-md mx-auto">
            {t('homepage.assessmentSubtitle')}
          </p>
          <a
            href="https://tally.so/r/aQ0ZOZ"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-brand-eco text-brand-dark hover:brightness-110 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full font-bold shadow-[0_15px_35px_rgba(119,177,57,0.4)] transition-all transform hover:scale-105 uppercase tracking-widest text-xs"
          >
            <Sparkles size={16} /> {t('homepage.startAssessment')}
          </a>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
