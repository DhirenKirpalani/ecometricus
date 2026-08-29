import React from 'react';
import { AlertCircle, AlertTriangle, TrendingDown, Scale, Cloud, DollarSign } from 'lucide-react';
import { useFoodWasteData } from '../hooks/useFoodWasteData';
import { useFoodWasteChartData } from '../hooks/useFoodWasteChartData';
import Co2EmissionsTemplateChart from './Co2EmissionsTemplateChart';
import { Outlet } from '../types';

interface FoodWasteIntelligenceProps {
  outletId: string | null;
  unitType: 'kg' | 'Lbs';
  allOutlets: Outlet[];
  benchmarks: {
    food_waste_target_kg: number;
    financial_cap: number;
  };
}

const FoodWasteIntelligence: React.FC<FoodWasteIntelligenceProps> = ({
  outletId,
  unitType,
  allOutlets,
  benchmarks
}) => {
  const { totalMass, carbonImpact, financialLoss, outletDetails, isLoading } = useFoodWasteData(
    outletId,
    unitType,
    allOutlets
  );
  const activeOutletsCount = outletId ? 1 : allOutlets.length;
  const { chartData: cumulativeData, dailyBenchmark, weeklyTotal, isLoading: isLoadingCumulative } = useFoodWasteChartData(
    benchmarks.food_waste_target_kg,
    activeOutletsCount
  );

  // Targets
  const massTarget = benchmarks.food_waste_target_kg || 100;
  const carbonTarget = 180;
  const financialTarget = benchmarks.financial_cap || 650;

  const showAlertMass = totalMass > massTarget;
  const showAlertCarbon = carbonImpact > carbonTarget;
  const showAlertFinance = financialLoss > financialTarget;

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
            Food Waste Intelligence
          </h2>
          <p className="text-[11px] sm:text-xs text-white/50 font-medium mt-1">
            Conversion of raw prep and spoilage data into financial impact.
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
              <h4 className="text-[11px] font-black uppercase tracking-widest text-brand-gold">Total Volume</h4>
            </div>
            {showAlertMass && (
              <div className="flex items-center gap-1.5 bg-brand-alert/20 text-brand-alert border border-brand-alert/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0">
                <AlertTriangle size={9} /> Attention
              </div>
            )}
          </div>
          <p className="text-3xl font-geometric font-black text-white leading-none mb-2">
            {totalMass.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            <span className="text-xs font-medium text-white/50 uppercase ml-1.5">{unitType}</span>
          </p>
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
            Target: &lt; {massTarget} {unitType}
          </p>
        </div>

        {/* Carbon Impact */}
        <div className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${showAlertCarbon ? 'border-brand-alert/40 bg-brand-alert/5' : 'border-brand-gold/10 bg-[#1c3933] hover:border-brand-gold/20'}`}>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Cloud size={16} className="text-brand-gold" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-brand-gold">Carbon Impact</h4>
            </div>
            {showAlertCarbon && (
              <div className="flex items-center gap-1.5 bg-brand-alert/20 text-brand-alert border border-brand-alert/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0">
                <AlertTriangle size={9} /> Attention
              </div>
            )}
          </div>
          <p className="text-3xl font-geometric font-black text-white leading-none mb-2">
            {carbonImpact.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            <span className="text-xs font-medium text-white/50 uppercase ml-1.5">kg CO₂e</span>
          </p>
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
            Target: &lt; {carbonTarget} kg CO₂e
          </p>
        </div>

        {/* Net Financial Loss */}
        <div className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${showAlertFinance ? 'border-brand-alert/40 bg-brand-alert/5' : 'border-brand-gold/10 bg-[#1c3933] hover:border-brand-gold/20'}`}>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-brand-gold" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-brand-gold">Net Financial Loss</h4>
            </div>
            {showAlertFinance && (
              <div className="flex items-center gap-1.5 bg-brand-alert/20 text-brand-alert border border-brand-alert/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0">
                <AlertTriangle size={9} /> Attention
              </div>
            )}
          </div>
          <p className="text-3xl font-geometric font-black text-white leading-none mb-2">
            ${financialLoss.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
            Target: &lt; ${financialTarget}
          </p>
        </div>
      </div>

      {/* CO2 Emissions Chart */}
      <div className="pt-4 border-t border-brand-gold/5">
        <div className="h-[440px] sm:h-[480px] w-full">
          {isLoadingCumulative ? (
            <div className="flex items-center justify-center h-full bg-[#1c3933] border border-brand-gold/10 rounded-2xl">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
            </div>
          ) : (
            <Co2EmissionsTemplateChart
              data={cumulativeData}
              benchmark={dailyBenchmark}
              weeklyTotal={weeklyTotal}
            />
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
              Outlet Performance
            </h4>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold/80">
              Breakdown Analytics
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
                      <AlertCircle size={9} /> Attention
                    </div>
                  )}
                </div>

                {/* Mass metric */}
                <div className="mb-3">
                  <p className="text-[10px] font-bold text-brand-gold/60 uppercase tracking-widest mb-1">Mass</p>
                  <p className="text-2xl font-geometric font-black text-white leading-none">
                    {outlet.mass.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    <span className="text-xs font-medium text-white/40 uppercase ml-1.5">{unitType}</span>
                  </p>
                </div>

                {/* Cost metric */}
                <div className="pt-3 border-t border-brand-gold/8">
                  <p className="text-[10px] font-bold text-brand-gold/60 uppercase tracking-widest mb-1">Cost</p>
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
