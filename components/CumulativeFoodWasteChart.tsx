import React, { useState, useMemo } from 'react';
import { Info, Scale, X as XIcon } from 'lucide-react';
import { DailyWaste } from '../hooks/useFoodWasteChartData';

interface CumulativeFoodWasteChartProps {
  data: DailyWaste[];
  benchmark: number;
}

const CumulativeFoodWasteChart: React.FC<CumulativeFoodWasteChartProps> = ({ data, benchmark }) => {
  const [selectedDay, setSelectedDay] = useState<DailyWaste | null>(null);

  // Dynamic axis logic based on benchmark and data
  const maxDataPoint = useMemo(() => {
    return Math.max(...data.map(d => d.Royal + d.Fishers + d.Ralphs + d.Gusto), benchmark);
  }, [data, benchmark]);

  const minVal = 0;
  const maxVal = Math.ceil(maxDataPoint / 10) * 10 + 10; // Round up to nearest 10 plus padding
  const range = maxVal - minVal;

  const getY = (val: number) => 100 - ((val - minVal) / range) * 100;
  const getX = (index: number, total: number) => 10 + (index / (total - 1)) * 80;

  const hasAlert = useMemo(() => {
    return data.some(d => (d.Royal + d.Fishers + d.Ralphs + d.Gusto) > benchmark);
  }, [data, benchmark]);

  const weeklyTotal = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.Royal + curr.Fishers + curr.Ralphs + curr.Gusto, 0).toLocaleString();
  }, [data]);

  const renderRect = (x: number, startVal: number, endVal: number, color: string) => {
    const effectiveStart = Math.max(startVal, minVal);
    const effectiveEnd = Math.min(endVal, maxVal);

    if (effectiveEnd <= effectiveStart) return null;

    const yTop = getY(effectiveEnd);
    const yBottom = getY(effectiveStart);
    const h = Math.max(0, yBottom - yTop);

    return (
      <rect
        x={x - 5.5}
        y={yTop}
        width="11"
        height={h}
        fill={color}
        className="transition-all duration-300 opacity-80 hover:opacity-100"
      />
    );
  };

  return (
    <div className="bg-[#0f2420] border border-brand-gold/60 p-6 sm:p-8 rounded-[35px] shadow-2xl space-y-4 relative group w-full h-[400px] flex flex-col overflow-hidden">
      {/* Header Section */}
      <div className="flex justify-between items-start z-20 relative">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-brand-gold/10 flex items-center justify-center border border-brand-gold/20 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
            <Scale size={18} className="text-brand-gold" />
          </div>
          <div>
            <h3 className="text-lg font-geometric font-black text-white uppercase tracking-tight">CUMULATIVE FOOD WASTE (KG)</h3>
            <p className="text-[9px] font-black text-brand-gold uppercase tracking-[0.2em] mt-0.5">Daily Resource Footprint</p>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5 bg-brand-gold/10 px-2 py-0.5 rounded-md border border-brand-gold/20">
                <span className="text-[9px] font-black text-brand-gold uppercase tracking-widest">Benchmark: <span className="text-white">{benchmark} Kg</span></span>
              </div>
              <div className="flex items-center gap-1.5 bg-brand-gold/10 px-2 py-0.5 rounded-md border border-brand-gold/20">
                <span className="text-[9px] font-black text-brand-gold uppercase tracking-widest">Weekly Total: <span className="text-white">{weeklyTotal} Kg</span></span>
              </div>
            </div>
          </div>
        </div>

        {hasAlert && (
          <div className="animate-in fade-in zoom-in duration-300">
            <div className="bg-brand-alert/10 border border-brand-alert/30 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-[0_0_10px_rgba(255,49,49,0.1)] cursor-pointer group/alert">
              <Info size={12} className="text-brand-alert" />
              <span className="text-[9px] font-black text-brand-alert uppercase tracking-widest group-hover/alert:underline">Attention</span>
            </div>
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div className="flex-1 w-full relative min-h-0 mt-6">
        {/* Y-Axis Labels */}
        <div className="absolute left-[-15px] lg:left-0 top-0 bottom-6 flex flex-col justify-between py-1 z-10 pointer-events-none">
          {[maxVal, maxVal * 0.8, maxVal * 0.6, maxVal * 0.4, maxVal * 0.2, 0].map((val) => (
            <div key={val} className="relative flex items-center justify-end pr-4 h-0">
              <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{val.toFixed(0)}</span>
              <div className="absolute right-0 w-2 h-[1px] bg-white/10"></div>
            </div>
          ))}
        </div>

        {/* Grid Lines */}
        <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
          {[maxVal, maxVal * 0.8, maxVal * 0.6, maxVal * 0.4, maxVal * 0.2, 0].map((val) => (
            <div key={val} className="w-full border-t border-brand-gold/5 h-0"></div>
          ))}
        </div>

        {/* Benchmark Line (Dashed Gold) */}
        <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 z-10 pointer-events-none">
          <div
            className="absolute w-full border-t-2 border-brand-gold border-dotted opacity-80"
            style={{ top: `${getY(benchmark)}%`, transform: 'translateY(-50%)' }}
          ></div>
        </div>

        {/* Chart SVG */}
        <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 overflow-visible z-20">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
            {data.map((t, i) => {
              const x = getX(i, data.length);
              
              const val1 = t.Gusto;
              const val2 = t.Gusto + t.Ralphs;
              const val3 = t.Gusto + t.Ralphs + t.Fishers;
              const val4 = t.Gusto + t.Ralphs + t.Fishers + t.Royal;

              return (
                <g key={i} className="cursor-pointer group/point" onClick={(e) => { e.stopPropagation(); setSelectedDay(t); }}>
                  {/* Stacked segments: Gusto (Grey) -> Ralphs (Green) -> Fishers (Gold) -> Royal (Orange) */}
                  {renderRect(x, 0, val1, '#718096')}
                  {renderRect(x, val1, val2, '#77B139')}
                  {renderRect(x, val2, val3, '#C8A413')}
                  {renderRect(x, val3, val4, '#F97316')}
                  
                  <rect x={x - 12} y="0" width="24" height="100" fill="transparent" />
                </g>
              );
            })}
          </svg>

          {/* Details Tooltip */}
          {selectedDay && (() => {
            const index = data.findIndex(d => d.date === selectedDay.date);
            const xPct = getX(index, data.length);
            const total = selectedDay.Royal + selectedDay.Fishers + selectedDay.Ralphs + selectedDay.Gusto;
            const yPct = getY(Math.min(maxVal, total));

            return (
              <div
                className="absolute bg-[#152E2A] border border-brand-gold/60 rounded-lg px-3 py-2 shadow-2xl z-[50] animate-in fade-in zoom-in duration-200 min-w-[140px] pointer-events-none"
                style={{
                  left: `${xPct}%`,
                  top: `${yPct}%`,
                  transform: `translate(-50%, -110%)`,
                }}
              >
                <div className="flex justify-between items-center mb-1 border-b border-brand-gold/10 pb-1">
                  <span className="text-[7px] font-black text-brand-gold uppercase tracking-wider">{selectedDay.date} Detail</span>
                  <XIcon size={8} className="text-gray-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[7px] uppercase font-bold text-white">
                    <span>Total</span>
                    <span>{total.toLocaleString()} Kg</span>
                  </div>
                  <div className="w-full h-[1px] bg-white/10 my-1"></div>
                  <div className="flex justify-between text-[7px] uppercase font-bold text-[#F97316]">
                    <span>Royal</span>
                    <span>{selectedDay.Royal}</span>
                  </div>
                  <div className="flex justify-between text-[7px] uppercase font-bold text-[#C8A413]">
                    <span>Fishers</span>
                    <span>{selectedDay.Fishers}</span>
                  </div>
                  <div className="flex justify-between text-[7px] uppercase font-bold text-[#77B139]">
                    <span>Ralphs</span>
                    <span>{selectedDay.Ralphs}</span>
                  </div>
                  <div className="flex justify-between text-[7px] uppercase font-bold text-[#718096]">
                    <span>Gusto</span>
                    <span>{selectedDay.Gusto}</span>
                  </div>
                </div>
                <div className="absolute w-2.5 h-2.5 bg-[#152E2A] border-r border-b border-brand-gold/60 rotate-45 left-1/2 -bottom-[6px] -translate-x-1/2"></div>
              </div>
            );
          })()}
        </div>

        {/* X-Axis Labels */}
        <div className="absolute left-[30px] lg:left-[40px] right-0 bottom-0 h-6">
          {data.map((t, i) => (
            <div
              key={t.date}
              className="absolute bottom-0 -translate-x-1/2 text-[7px] font-black text-gray-500 uppercase tracking-widest text-center"
              style={{ left: `${getX(i, data.length)}%` }}
            >
              {t.date}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CumulativeFoodWasteChart;
