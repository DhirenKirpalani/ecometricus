import React from 'react';
import { Cpu, Droplets, Zap, AlertTriangle, CheckCircle2, Info, TrendingDown, Store } from 'lucide-react';
import { useResourceChartData } from '../hooks/useResourceChartData';
import ResourceTemplateChart from './ResourceTemplateChart';
import { Outlet } from '../types';

interface ResourceIntelligenceProps {
  allOutlets: Outlet[];
}

const ResourceIntelligence: React.FC<ResourceIntelligenceProps> = ({ allOutlets }) => {
  const {
    waterData,
    energyData,
    waterTarget,
    energyTarget,
    waterDailyBenchmark,
    energyDailyBenchmark,
    waterWeeklyTotal,
    energyWeeklyTotal,
    isLoading
  } = useResourceChartData();

  const showAlertWater = waterWeeklyTotal > waterTarget;
  const showAlertEnergy = energyWeeklyTotal > energyTarget;

  // Compute per-outlet totals from chart data
  const OUTLET_KEYS = ['ROYAL', "FISHER'S", "RALPH'S", 'GUSTO'] as const;
  const outletBreakdown = OUTLET_KEYS.map(key => {
    const water = waterData.reduce((acc, d) => acc + (d[key] || 0), 0);
    const energy = energyData.reduce((acc, d) => acc + (d[key] || 0), 0);
    return { name: key.charAt(0) + key.slice(1).toLowerCase(), water, energy };
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Mila Actionable Intelligence Header */}
      <div className="flex items-center gap-6 mb-10">
        <div className="p-4 bg-brand-gold rounded-2xl shadow-[0_0_20px_rgba(212,175,55,0.4)]">
          <Cpu className="text-[#0B221E]" size={32} />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white tracking-tight uppercase leading-tight">
            Resource Portfolio Intelligence
          </h2>
          <div className="flex items-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold">
              Cumulative Utility Load & Baseline Analysis
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Water Card */}
        <div className="bg-[#0B221E] border border-white/10 rounded-[32px] p-8 flex flex-col justify-between h-[230px] relative overflow-hidden group hover:border-[#3b82f6]/30 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#3b82f6]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-[#3b82f6]/10 transition-colors"></div>
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <Droplets size={16} className="text-[#3b82f6]" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3b82f6]">Total Water Usage</h4>
              </div>
              {showAlertWater && (
                <div className="bg-[#FF4D4D]/10 text-[#FF4D4D] border border-[#FF4D4D]/30 px-3 py-1 rounded-lg flex items-center gap-2 animate-pulse">
                  <AlertTriangle size={12} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Attention</span>
                </div>
              )}
            </div>
            <p className="text-5xl font-black text-white tracking-tighter tabular-nums">
              {waterWeeklyTotal.toLocaleString()} <span className="text-xs font-medium text-white/30 uppercase ml-1">Litres</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!showAlertWater ? (
              <>
                <CheckCircle2 size={14} className="text-[#77B139]" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Standard Consumption Pattern.</span>
              </>
            ) : (
              <>
                <Info size={14} className="text-[#FF4D4D]" />
                <span className="text-[10px] font-bold text-[#FF4D4D] uppercase tracking-widest font-black">Benchmark Overload Detected.</span>
              </>
            )}
          </div>
        </div>

        {/* Total Energy Card */}
        <div className="bg-[#0B221E] border border-white/10 rounded-[32px] p-8 flex flex-col justify-between h-[230px] relative overflow-hidden group hover:border-brand-gold/30 transition-all">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-gold/10 transition-colors"></div>
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <Zap size={16} className="text-brand-gold" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-gold">Total Energy Load</h4>
              </div>
              {showAlertEnergy && (
                <div className="bg-[#FF4D4D]/10 text-[#FF4D4D] border border-[#FF4D4D]/30 px-3 py-1 rounded-lg flex items-center gap-2 animate-pulse">
                  <AlertTriangle size={12} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Attention</span>
                </div>
              )}
            </div>
            <p className="text-5xl font-black text-white tracking-tighter tabular-nums">
              {energyWeeklyTotal.toLocaleString()} <span className="text-xs font-medium text-white/30 uppercase ml-1">kWh</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!showAlertEnergy ? (
              <>
                <CheckCircle2 size={14} className="text-[#77B139]" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Load Within Tolerance Range.</span>
              </>
            ) : (
              <>
                <Info size={14} className="text-[#FF4D4D]" />
                <span className="text-[10px] font-bold text-[#FF4D4D] uppercase tracking-widest font-black">Critical Energy Spike Logged.</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[500px]">
        <ResourceTemplateChart 
          data={waterData} 
          benchmark={waterDailyBenchmark} 
          title="WATER USAGE" 
          subtitle="Cumulative Flow Analysis" 
          unit="L" 
          maxVal={5000} 
          icon={<Droplets size={18} className="text-[#3b82f6]" />} 
          allOutlets={allOutlets}
        />
        <ResourceTemplateChart 
          data={energyData} 
          benchmark={energyDailyBenchmark} 
          title="ENERGY LOAD" 
          subtitle="Real-time Power Distribution" 
          unit="kWh" 
          maxVal={250} 
          icon={<Zap size={18} className="text-brand-gold" />} 
          allOutlets={allOutlets}
        />
      </div>

      {/* Outlet Performance Breakdown — Card Grid */}
      <div>
        <div className="flex items-center gap-6 mb-6">
          <div className="p-3 border border-brand-gold/50 rounded-full bg-brand-gold/5">
            <TrendingDown size={20} className="text-brand-gold" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xl font-black text-white tracking-tight uppercase leading-tight">
              Outlet Performance
            </h4>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold">
              Resource Breakdown Analytics
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {outletBreakdown.map((outlet, id) => {
            const isWaterAttention = outlet.water > waterTarget / OUTLET_KEYS.length;
            const isEnergyAttention = outlet.energy > energyTarget / OUTLET_KEYS.length;
            const isAttention = isWaterAttention || isEnergyAttention;
            return (
              <div key={id} className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${isAttention ? 'border-[#FF4D4D]/40 bg-[#FF4D4D]/5' : 'border-white/10 bg-[#0B221E] hover:border-brand-gold/20'}`}>
                {/* Outlet name + status badge */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Store size={14} className="text-brand-gold/50" />
                    <span className="text-sm font-black text-white uppercase tracking-wider truncate">{outlet.name}</span>
                  </div>
                  {isAttention && (
                    <div className="flex items-center gap-1.5 bg-[#FF4D4D]/20 text-[#FF4D4D] border border-[#FF4D4D]/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0">
                      <AlertTriangle size={9} /> Attention
                    </div>
                  )}
                </div>

                {/* Water metric */}
                <div className="mb-3">
                  <p className="text-[10px] font-bold text-[#3b82f6]/60 uppercase tracking-widest mb-1">Water Usage</p>
                  <p className="text-xl font-geometric font-black text-white leading-none">
                    {outlet.water.toLocaleString()}
                    <span className="text-xs font-medium text-white/40 uppercase ml-1.5">L</span>
                  </p>
                </div>

                {/* Energy metric */}
                <div className="pt-3 border-t border-white/8">
                  <p className="text-[10px] font-bold text-brand-gold/60 uppercase tracking-widest mb-1">Energy Load</p>
                  <p className="text-xl font-geometric font-bold text-brand-gold leading-none">
                    {outlet.energy.toLocaleString()}
                    <span className="text-xs font-medium text-white/40 uppercase ml-1.5">kWh</span>
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

export default ResourceIntelligence;
