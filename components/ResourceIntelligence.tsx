import React, { useMemo } from 'react';
import { Cpu, Droplets, Zap, AlertTriangle, ShieldCheck, TrendingDown, Store } from 'lucide-react';
import { useResourceChartData } from '../hooks/useResourceChartData';
import ResourceTemplateChart from './ResourceTemplateChart';
import { Outlet } from '../types';

interface ResourceIntelligenceProps {
  allOutlets: Outlet[];
}

const DEFAULT_COLORS = ['#d4af37', '#77B139', '#F97316', '#60A5FA', '#A855F7', '#FF914D'];

const ResourceIntelligence: React.FC<ResourceIntelligenceProps> = ({ allOutlets }) => {
  const {
    waterData,
    energyData,
    outletKeys,
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

  // Build outlet breakdown dynamically
  const outletBreakdown = useMemo(() => {
    return outletKeys.map(key => {
      const outlet = allOutlets.find(o => o.name.toUpperCase() === key);
      const water = waterData.reduce((acc, d) => acc + (Number(d[key]) || 0), 0);
      const energy = energyData.reduce((acc, d) => acc + (Number(d[key]) || 0), 0);
      return {
        name: outlet?.name || key.charAt(0) + key.slice(1).toLowerCase(),
        water,
        energy,
      };
    });
  }, [outletKeys, waterData, energyData, allOutlets]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-700">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-brand-gold/10 border border-brand-gold/30 rounded-xl flex items-center justify-center shrink-0">
          <Cpu className="text-brand-gold" size={24} />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
            Resource Portfolio Intelligence
          </h2>
          <p className="text-[11px] sm:text-xs text-brand-gold font-medium mt-1">
            Cumulative Utility Load & Baseline Analysis
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Water */}
        <div className="bg-[#1c3933] border border-brand-gold/20 rounded-2xl p-5 sm:p-6 shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center shrink-0">
                <Droplets size={18} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-base font-geometric font-bold text-white uppercase tracking-tight leading-none">Total Water Usage</h3>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-1">Weekly cumulative</p>
              </div>
            </div>
            {showAlertWater ? (
              <div className="flex items-center gap-1.5 bg-brand-alert/15 border border-brand-alert/30 px-2.5 py-1 rounded-lg shrink-0">
                <AlertTriangle size={11} className="text-brand-alert" />
                <span className="text-[9px] font-black text-brand-alert uppercase tracking-widest">Alert</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-brand-eco/15 border border-brand-eco/30 px-2.5 py-1 rounded-lg shrink-0">
                <ShieldCheck size={11} className="text-brand-eco" />
                <span className="text-[9px] font-black text-brand-eco uppercase tracking-widest">On Target</span>
              </div>
            )}
          </div>
          <p className="text-3xl font-geometric font-black text-white leading-none mb-2">
            {waterWeeklyTotal.toLocaleString()}<span className="text-sm font-medium text-white/40 uppercase ml-1.5">Litres</span>
          </p>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
            {showAlertWater ? 'Benchmark overload detected' : 'Standard consumption pattern'}
          </p>
        </div>

        {/* Total Energy */}
        <div className="bg-[#1c3933] border border-brand-gold/20 rounded-2xl p-5 sm:p-6 shadow-xl">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
                <Zap size={18} className="text-brand-gold" />
              </div>
              <div>
                <h3 className="text-base font-geometric font-bold text-white uppercase tracking-tight leading-none">Total Energy Load</h3>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-1">Weekly cumulative</p>
              </div>
            </div>
            {showAlertEnergy ? (
              <div className="flex items-center gap-1.5 bg-brand-alert/15 border border-brand-alert/30 px-2.5 py-1 rounded-lg shrink-0">
                <AlertTriangle size={11} className="text-brand-alert" />
                <span className="text-[9px] font-black text-brand-alert uppercase tracking-widest">Alert</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-brand-eco/15 border border-brand-eco/30 px-2.5 py-1 rounded-lg shrink-0">
                <ShieldCheck size={11} className="text-brand-eco" />
                <span className="text-[9px] font-black text-brand-eco uppercase tracking-widest">On Target</span>
              </div>
            )}
          </div>
          <p className="text-3xl font-geometric font-black text-white leading-none mb-2">
            {energyWeeklyTotal.toLocaleString()}<span className="text-sm font-medium text-white/40 uppercase ml-1.5">kWh</span>
          </p>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
            {showAlertEnergy ? 'Critical energy spike logged' : 'Load within tolerance range'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[440px]">
        <ResourceTemplateChart
          data={waterData}
          benchmark={waterDailyBenchmark}
          title="Water Usage"
          subtitle="Cumulative Flow Analysis"
          unit="L"
          maxVal={5000}
          icon={<Droplets size={18} className="text-blue-400" />}
          allOutlets={allOutlets}
          outletKeys={outletKeys}
        />
        <ResourceTemplateChart
          data={energyData}
          benchmark={energyDailyBenchmark}
          title="Energy Load"
          subtitle="Real-time Power Distribution"
          unit="kWh"
          maxVal={250}
          icon={<Zap size={18} className="text-brand-gold" />}
          allOutlets={allOutlets}
          outletKeys={outletKeys}
        />
      </div>

      {/* Outlet Performance */}
      {outletBreakdown.length > 0 && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-brand-gold/10 border border-brand-gold/30 rounded-xl flex items-center justify-center shrink-0">
              <TrendingDown className="text-brand-gold" size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                Outlet Performance
              </h2>
              <p className="text-[11px] sm:text-xs text-brand-gold font-medium mt-1">
                Resource Breakdown Analytics
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {outletBreakdown.map((outlet, id) => {
              const perOutletTarget = outletKeys.length > 0 ? waterTarget / outletKeys.length : waterTarget;
              const perOutletEnergyTarget = outletKeys.length > 0 ? energyTarget / outletKeys.length : energyTarget;
              const isWaterAttention = outlet.water > perOutletTarget;
              const isEnergyAttention = outlet.energy > perOutletEnergyTarget;
              const isAttention = isWaterAttention || isEnergyAttention;
              return (
                <div key={id} className={`rounded-2xl border p-5 shadow-xl transition-all duration-300 ${isAttention ? 'border-brand-alert/40 bg-brand-alert/5' : 'border-brand-gold/20 bg-[#1c3933] hover:border-brand-gold/30'}`}>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <Store size={14} className="text-brand-gold/50" />
                      <span className="text-sm font-bold text-white uppercase tracking-wider truncate">{outlet.name}</span>
                    </div>
                    {isAttention && (
                      <div className="flex items-center gap-1.5 bg-brand-alert/15 border border-brand-alert/30 px-2 py-0.5 rounded-lg shrink-0">
                        <AlertTriangle size={9} className="text-brand-alert" />
                        <span className="text-[8px] font-black text-brand-alert uppercase tracking-widest">Alert</span>
                      </div>
                    )}
                  </div>

                  {/* Water */}
                  <div className="mb-3">
                    <p className="text-[8px] font-black text-blue-400/60 uppercase tracking-widest mb-1">Water Usage</p>
                    <p className="text-xl font-geometric font-black text-white leading-none">
                      {outlet.water.toLocaleString()}<span className="text-xs font-medium text-white/40 uppercase ml-1">L</span>
                    </p>
                  </div>

                  {/* Energy */}
                  <div className="pt-3 border-t border-white/5">
                    <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest mb-1">Energy Load</p>
                    <p className="text-xl font-geometric font-black text-brand-gold leading-none">
                      {outlet.energy.toLocaleString()}<span className="text-xs font-medium text-white/40 uppercase ml-1">kWh</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceIntelligence;
