import React, { useMemo, useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, TrendingDown, Scale, Cloud, DollarSign, Store, Filter } from 'lucide-react';
import { useFoodWasteData } from '../hooks/useFoodWasteData';
import { useFoodWasteChartData } from '../hooks/useFoodWasteChartData';
import Co2EmissionsTemplateChart from './Co2EmissionsTemplateChart';
import FoodWasteTemplateChart from './FoodWasteTemplateChart';
import CustomSelect from './CustomSelect';
import { supabase } from '../lib/supabase';
import { Outlet } from '../types';
import { useI18n } from '../lib/useI18n';

interface FoodWasteIntelligenceProps {
  outletId: string | null;
  unitType: 'kg' | 'Lbs';
  allOutlets: Outlet[];
  benchmarks: {
    food_waste_target_kg: number;
    financial_cap: number;
  };
  dailyMode?: boolean;
  scopeOutletName?: string;
  scopeOutletId?: string;
  scopeUserId?: string;
  weekOffset?: number;
}

const FoodWasteIntelligence: React.FC<FoodWasteIntelligenceProps> = ({
  outletId,
  unitType,
  allOutlets,
  benchmarks,
  dailyMode = false,
  scopeOutletName,
  scopeOutletId,
  scopeUserId,
  weekOffset = 0
}) => {
  const { t } = useI18n();
  const [chartOutletFilter, setChartOutletFilter] = useState<string>(allOutlets[0]?.code || 'all');

  // Per-outlet benchmarks for chart filter
  const [chartOutletBenchmarks, setChartOutletBenchmarks] = useState<{ waste: number } | null>(null);
  useEffect(() => {
    const fetchOutletBenchmarks = async () => {
      if (!chartOutletFilter || chartOutletFilter === 'all' || allOutlets.length <= 1) {
        setChartOutletBenchmarks(null);
        return;
      }
      const outlet = allOutlets.find(o => o.code === chartOutletFilter);
      if (!outlet) { setChartOutletBenchmarks(null); return; }
      const outletName = outlet.outlet_name || outlet.name || '';
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('benchmarks')
        .select('food_waste_target_kg')
        .eq('outlet_name', outletName)
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (data && data.food_waste_target_kg) {
        setChartOutletBenchmarks({ waste: data.food_waste_target_kg });
      } else {
        setChartOutletBenchmarks(null);
      }
    };
    fetchOutletBenchmarks();
  }, [chartOutletFilter, allOutlets]);

  // Effective chart benchmarks — use per-outlet values when available
  const effectiveWasteTarget = chartOutletBenchmarks?.waste ?? benchmarks.food_waste_target_kg;
  const effectiveDailyMassBenchmark = effectiveWasteTarget / 7;
  const effectiveDailyCo2Benchmark = (effectiveWasteTarget / 7) * 2.85;
  const { totalMass, carbonImpact, financialLoss, outletDetails, isLoading, error: wasteError } = useFoodWasteData(
    outletId,
    unitType,
    allOutlets,
    dailyMode,
    weekOffset
  );
  const activeOutletsCount = outletId ? 1 : allOutlets.length;
  const { chartData: cumulativeData, outletKeys: wasteOutletKeys, dailyBenchmark, dailyMassBenchmark, weeklyTotal, isLoading: isLoadingCumulative, error: chartError } = useFoodWasteChartData(
    benchmarks.food_waste_target_kg,
    activeOutletsCount,
    scopeOutletName,
    scopeUserId,
    scopeOutletId,
    dailyMode,
    allOutlets,
    weekOffset
  );

  // Outlet color/label maps and all outlet name keys derived from allOutlets
  const wasteOutletColors = allOutlets.reduce((acc, o) => {
    acc[(o.outlet_name || o.name).toUpperCase()] = o.color_hex || '#77B139';
    return acc;
  }, {} as Record<string, string>);
  const wasteOutletLabels = allOutlets.reduce((acc, o) => {
    acc[(o.outlet_name || o.name).toUpperCase()] = o.name;
    return acc;
  }, {} as Record<string, string>);
  const allWasteOutletKeys = allOutlets.map(o => (o.outlet_name || o.name).toUpperCase());

  // Filtered outlet keys based on chart outlet filter
  const filteredWasteOutletKeys = useMemo(() => {
    if (chartOutletFilter === 'all') return allWasteOutletKeys;
    const selected = allOutlets.find(o => o.code === chartOutletFilter);
    if (!selected) return allWasteOutletKeys;
    return [(selected.outlet_name || selected.name).toUpperCase()];
  }, [chartOutletFilter, allWasteOutletKeys, allOutlets]);

  // Targets — scale to daily for non-admin (today-only view)
  const divisor = dailyMode ? 7 : 1;
  const massTarget = (benchmarks.food_waste_target_kg || 100) / divisor;
  const carbonTarget = 180 / divisor;
  const financialTarget = (benchmarks.financial_cap || 650) / divisor;

  const showAlertMass = totalMass > massTarget;
  const showAlertCarbon = carbonImpact > carbonTarget;
  const showAlertFinance = financialLoss > financialTarget;

  if (wasteError || chartError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle size={32} className="text-brand-alert mx-auto mb-3" />
          <p className="text-sm text-brand-alert font-semibold">{wasteError || chartError}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 bg-brand-eco/10 border border-brand-eco/30 rounded-xl flex items-center justify-center shrink-0">
          <Scale className="text-brand-eco" size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
            {t('intelligence.foodWaste.title')}
          </h2>
          <p className="text-[11px] sm:text-xs text-brand-gold font-medium mt-1">
            {t('intelligence.foodWaste.subtitle')}
          </p>
        </div>
        {/* Outlet filter for charts */}
        {allOutlets.length > 1 && (
          <div className="flex items-center gap-2 w-full sm:w-auto sm:shrink-0">
            <Filter size={14} className="text-brand-gold/60 shrink-0" />
            <div className="flex-1 sm:w-44">
              <CustomSelect
                compact
                value={(() => {
                  const o = allOutlets.find(o => o.code === chartOutletFilter);
                  return o ? `${o.name} (${o.code})` : '';
                })()}
                options={allOutlets.filter(o => o.name).map(o => `${o.name} (${o.code})`)}
                onChange={v => {
                  const code = allOutlets.find(o => `${o.name} (${o.code})` === v)?.code || '';
                  setChartOutletFilter(code);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Total Volume */}
        <div className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${showAlertMass ? 'border-brand-alert/40 bg-brand-alert/5' : 'border-brand-gold/10 bg-[#1c3933] hover:border-brand-gold/20'}`}>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Scale size={16} className="text-brand-gold" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-brand-gold">{t('intelligence.foodWaste.totalVolumeTitle')}</h4>
            </div>
            {showAlertMass && (
              <div className="flex items-center gap-1.5 bg-brand-alert/20 text-brand-alert border border-brand-alert/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0">
                <AlertTriangle size={9} /> {t('intelligence.foodWaste.attention')}
              </div>
            )}
          </div>
          <p className="text-3xl font-geometric font-black text-white leading-none mb-2">
            {totalMass.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            <span className="text-xs font-medium text-white/50 uppercase ml-1.5">{unitType}</span>
          </p>
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
            {t('intelligence.foodWaste.targetPrefix')}{massTarget} {unitType}
          </p>
        </div>

        {/* Carbon Impact */}
        <div className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${showAlertCarbon ? 'border-brand-alert/40 bg-brand-alert/5' : 'border-brand-gold/10 bg-[#1c3933] hover:border-brand-gold/20'}`}>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Cloud size={16} className="text-brand-gold" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-brand-gold">{t('intelligence.foodWaste.carbonImpactTitle')}</h4>
            </div>
            {showAlertCarbon && (
              <div className="flex items-center gap-1.5 bg-brand-alert/20 text-brand-alert border border-brand-alert/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0">
                <AlertTriangle size={9} /> {t('intelligence.foodWaste.attention')}
              </div>
            )}
          </div>
          <p className="text-3xl font-geometric font-black text-white leading-none mb-2">
            {carbonImpact.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            <span className="text-xs font-medium text-white/50 uppercase ml-1.5">{t('intelligence.foodWaste.carbonUnit')}</span>
          </p>
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
            {t('intelligence.foodWaste.targetPrefix')}{carbonTarget} {t('intelligence.foodWaste.carbonUnit')}
          </p>
        </div>

        {/* Net Financial Loss */}
        <div className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${showAlertFinance ? 'border-brand-alert/40 bg-brand-alert/5' : 'border-brand-gold/10 bg-[#1c3933] hover:border-brand-gold/20'}`}>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-brand-gold" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-brand-gold">{t('intelligence.foodWaste.financialLossTitle')}</h4>
            </div>
            {showAlertFinance && (
              <div className="flex items-center gap-1.5 bg-brand-alert/20 text-brand-alert border border-brand-alert/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0">
                <AlertTriangle size={9} /> {t('intelligence.foodWaste.attention')}
              </div>
            )}
          </div>
          <p className="text-3xl font-geometric font-black text-white leading-none mb-2">
            ${financialLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
            {t('intelligence.foodWaste.targetPrefix')}{t('intelligence.foodWaste.currency')}{financialTarget}
          </p>
        </div>
      </div>

      {/* Food Waste + CO2 Emissions Charts */}
      <div className="pt-4 border-t border-brand-gold/5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[440px] sm:h-[480px]">
          {isLoadingCumulative ? (
            <>
              <div className="flex items-center justify-center h-full bg-[#1c3933] border border-brand-gold/10 rounded-2xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
              </div>
              <div className="flex items-center justify-center h-full bg-[#1c3933] border border-brand-gold/10 rounded-2xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
              </div>
            </>
          ) : (
            <>
              <div className="w-full h-full">
                <FoodWasteTemplateChart
                  data={cumulativeData}
                  benchmark={effectiveDailyMassBenchmark}
                  outletKeys={filteredWasteOutletKeys}
                  outletColors={wasteOutletColors}
                  outletLabels={wasteOutletLabels}
                />
              </div>
              <div className="w-full h-full">
                <Co2EmissionsTemplateChart
                  data={cumulativeData}
                  benchmark={effectiveDailyCo2Benchmark}
                  weeklyTotal={weeklyTotal}
                  outletKeys={filteredWasteOutletKeys}
                  outletColors={wasteOutletColors}
                  outletLabels={wasteOutletLabels}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Outlet Performance Breakdown — Card Grid */}
      <div>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-brand-eco/10 border border-brand-eco/30 rounded-xl flex items-center justify-center shrink-0">
            <TrendingDown className="text-brand-eco" size={24} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
              {t('intelligence.foodWaste.outletPerfTitle')}
            </h2>
            <p className="text-[11px] sm:text-xs text-brand-gold font-medium mt-1">
              {t('intelligence.foodWaste.outletPerfSubtitle')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {outletDetails.map((outlet, id) => {
            const activeCount = Math.max(allOutlets.length, 1);
            const perOutletMassTarget = massTarget / activeCount;
            const isAttention = outlet.mass > perOutletMassTarget;
            const outletColor = wasteOutletColors[(outlet.name || '').toUpperCase()] || '#d4af37';
            return (
              <div key={id} className={`rounded-2xl border p-5 shadow-xl transition-all duration-300 ${isAttention ? 'border-brand-alert/40 bg-brand-alert/5' : 'border-brand-gold/20 bg-[#1c3933] hover:border-brand-gold/30'}`}>
                {/* Outlet name + status badge */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Store size={14} className="text-brand-gold/50" />
                    <span className="text-sm font-bold text-white uppercase tracking-wider truncate">{outlet.name}</span>
                  </div>
                  {isAttention && (
                    <div className="flex items-center gap-1.5 bg-brand-alert/15 border border-brand-alert/30 px-2 py-0.5 rounded-lg shrink-0">
                      <AlertTriangle size={9} className="text-brand-alert" />
                      <span className="text-[8px] font-black text-brand-alert uppercase tracking-widest">{t('intelligence.foodWaste.attention')}</span>
                    </div>
                  )}
                </div>

                {/* Mass metric */}
                <div className="mb-3">
                  <p className="text-[8px] font-black text-brand-eco/60 uppercase tracking-widest mb-1">{t('intelligence.foodWaste.massLabel')}</p>
                  <p className="text-xl font-geometric font-black text-white leading-none">
                    {outlet.mass.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    <span className="text-xs font-medium text-white/40 uppercase ml-1">{unitType}</span>
                  </p>
                </div>

                {/* Carbon Impact */}
                <div className="mb-3 pt-3 border-t border-white/5">
                  <p className="text-[8px] font-black text-blue-400/60 uppercase tracking-widest mb-1">{t('intelligence.foodWaste.carbonImpactTitle')}</p>
                  <p className="text-xl font-geometric font-black text-white leading-none">
                    {outlet.carbon.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    <span className="text-xs font-medium text-white/40 uppercase ml-1">kg</span>
                  </p>
                </div>

                {/* Financial Impact */}
                <div className="pt-3 border-t border-white/5">
                  <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: `${outletColor}99` }}>{t('intelligence.foodWaste.costLabel')}</p>
                  <p className="text-xl font-geometric font-black leading-none" style={{ color: outletColor }}>
                    ${outlet.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FoodWasteIntelligence;
