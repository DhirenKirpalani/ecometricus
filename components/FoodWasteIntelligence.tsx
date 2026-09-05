import React from 'react';
import { AlertCircle, AlertTriangle, TrendingDown, Scale, Cloud, DollarSign } from 'lucide-react';
import { useFoodWasteData } from '../hooks/useFoodWasteData';
import { useFoodWasteChartData } from '../hooks/useFoodWasteChartData';
import Co2EmissionsTemplateChart from './Co2EmissionsTemplateChart';
import FoodWasteTemplateChart from './FoodWasteTemplateChart';
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
  const { totalMass, carbonImpact, financialLoss, outletDetails, isLoading, error: wasteError } = useFoodWasteData(
    outletId,
    unitType,
    allOutlets,
    dailyMode,
    weekOffset
  );
  const activeOutletsCount = outletId ? 1 : allOutlets.length;
  const { chartData: cumulativeData, outletKeys: wasteOutletKeys, dailyBenchmark, weeklyTotal, isLoading: isLoadingCumulative, error: chartError } = useFoodWasteChartData(
    benchmarks.food_waste_target_kg,
    activeOutletsCount,
    scopeOutletName,
    scopeUserId,
    scopeOutletId,
    dailyMode,
    allOutlets,
    weekOffset
  );

  // Transform hook data for FoodWasteTemplateChart (aggregate all outlets per day)
  const foodWasteTemplateData = cumulativeData.map(d => {
    const waste = wasteOutletKeys.reduce((s, k) => s + (Number((d as any)[k]) || 0), 0);
    return {
      day: d.date.charAt(0) + d.date.slice(1).toLowerCase(),
      waste,
    };
  });

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
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-brand-eco/10 border border-brand-eco/30 rounded-xl flex items-center justify-center shrink-0">
          <Scale className="text-brand-eco" size={24} />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
            {t('intelligence.foodWaste.title')}
          </h2>
          <p className="text-[11px] sm:text-xs text-brand-gold font-medium mt-1">
            {t('intelligence.foodWaste.subtitle')}
          </p>
        </div>
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
                  data={foodWasteTemplateData}
                  benchmark={dailyBenchmark}
                />
              </div>
              <div className="w-full h-full">
                <Co2EmissionsTemplateChart
                  data={cumulativeData}
                  benchmark={dailyBenchmark}
                  weeklyTotal={weeklyTotal}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Outlet Performance Breakdown — Card Grid */}
      <div>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 border border-brand-eco/50 rounded-xl bg-brand-eco/5 flex items-center justify-center shrink-0">
            <TrendingDown size={18} className="text-brand-eco" />
          </div>
          <div>
            <h4 className="text-lg font-geometric font-bold text-white tracking-tight uppercase leading-tight">
              {t('intelligence.foodWaste.outletPerfTitle')}
            </h4>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold/80">
              {t('intelligence.foodWaste.outletPerfSubtitle')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {outletDetails.filter(o => o.mass > 0).map((outlet, id) => {
            const isAttention = outlet.mass > massTarget / Math.max(outletDetails.filter(o => o.mass > 0).length, 1);
            return (
              <div key={id} className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${isAttention ? 'border-brand-alert/40 bg-brand-alert/5' : 'border-brand-gold/10 bg-[#1c3933] hover:border-brand-gold/20'}`}>
                {/* Outlet name + status badge */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="text-sm font-black text-white uppercase tracking-wider truncate">{outlet.name}</span>
                  {isAttention && (
                    <div className="flex items-center gap-1.5 bg-brand-alert/20 text-brand-alert border border-brand-alert/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0">
                      <AlertCircle size={9} /> {t('intelligence.foodWaste.attention')}
                    </div>
                  )}
                </div>

                {/* Mass metric */}
                <div className="mb-3">
                  <p className="text-[10px] font-bold text-brand-gold/60 uppercase tracking-widest mb-1">{t('intelligence.foodWaste.massLabel')}</p>
                  <p className="text-2xl font-geometric font-black text-white leading-none">
                    {outlet.mass.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    <span className="text-xs font-medium text-white/40 uppercase ml-1.5">{unitType}</span>
                  </p>
                </div>

                {/* Cost metric */}
                <div className="pt-3 border-t border-brand-gold/8">
                  <p className="text-[10px] font-bold text-brand-gold/60 uppercase tracking-widest mb-1">{t('intelligence.foodWaste.costLabel')}</p>
                  <p className="text-lg font-geometric font-bold text-brand-gold leading-none">
                    $ {outlet.cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
