import React, { useState, useMemo } from 'react';
import { Info, Cloud, X as XIcon } from 'lucide-react';

import { DailyWaste } from '../hooks/useFoodWasteChartData';

interface Co2EmissionsTemplateChartProps {
    data: DailyWaste[];
    benchmark: number;
    weeklyTotal: number;
}

const Co2EmissionsTemplateChart: React.FC<Co2EmissionsTemplateChartProps> = ({ data, benchmark, weeklyTotal }) => {
    const [selectedDay, setSelectedDay] = useState<DailyWaste | null>(null);

    // Axis Logic: 0 to Max (Dynamic)
    const minVal = 0;
    const totals = data.map(d => (d.ROYAL || 0) + (d["FISHER'S"] || 0) + (d["RALPH'S"] || 0) + (d.GUSTO || 0));
    const maxVal = Math.max(benchmark * 1.5, ...totals, 100);
    const range = maxVal - minVal;

    const getY = (val: number) => 100 - ((val - minVal) / (range || 1)) * 100;
    const getX = (index: number, total: number) => 10 + (index / (total - 1)) * 80;

    // Logic: Red if current weekly total exceeds a proportional benchmark? 
    // Proportional weekly target = dailyBenchmark * 7
    const weeklyTarget = benchmark * 7;
    const hasAlert = weeklyTotal > weeklyTarget;

    return (
        <div className="bg-[#0f2420] border border-brand-gold/60 p-6 sm:p-10 rounded-[35px] shadow-2xl space-y-6 relative group w-full h-full flex flex-col overflow-hidden">
            {/* Header Section - Exactly as shown in the reference image, but now dynamic */}
            <div className="flex justify-between items-start z-20 relative">
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-brand-gold/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                        <Cloud size={22} className="text-white/60" />
                    </div>
                    <div>
                        <h3 className="text-3xl font-geometric font-black text-white uppercase tracking-tight leading-none">CO2 EMISSIONS</h3>
                        <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] mt-1">DAILY CARBON FOOTPRINT</p>
                        <div className="flex items-center gap-3 mt-4">
                            <div className="flex items-center gap-2 bg-[#1A302B] px-4 py-1.5 rounded-lg border border-brand-gold/30">
                                <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest leading-none">BENCHMARK: <span className="text-white ml-1">{Math.round(benchmark).toLocaleString()} KG</span></span>
                            </div>
                            <div className="flex items-center gap-2 bg-[#1A302B] px-4 py-1.5 rounded-lg border border-brand-gold/30">
                                <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest leading-none">WEEKLY CO2E: <span className="text-white ml-1">{Math.round(weeklyTotal).toLocaleString()} KG</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`animate-in fade-in zoom-in duration-500 ${hasAlert ? 'opacity-100' : 'opacity-40'}`}>
                    <div className={`bg-[#3D1414] border px-6 py-2.5 rounded-xl flex items-center gap-3 shadow-[0_0_20px_rgba(255,77,77,0.15)] cursor-pointer group/alert ${hasAlert ? 'border-[#FF4D4D]/40' : 'border-brand-gold/10'}`}>
                        <Info size={14} className={hasAlert ? "text-[#FF4D4D]" : "text-white/40"} />
                        <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${hasAlert ? "text-[#FF4D4D] group-hover/alert:text-white" : "text-white/40"}`}>
                            {hasAlert ? 'ATTENTION' : 'OPTIMAL'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Chart Container */}
            <div className="flex-1 w-full relative min-h-0">
                {/* Y-Axis Labels */}
                <div className="absolute left-[-15px] lg:left-0 top-0 bottom-6 flex flex-col justify-between py-1 z-10 pointer-events-none">
                    {[Math.round(maxVal), Math.round(maxVal * 0.75), Math.round(maxVal * 0.5), Math.round(maxVal * 0.25), 0].map((val) => (
                        <div key={val} className="relative flex items-center justify-end pr-4 h-0">
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{val.toLocaleString()}</span>
                            <div className="absolute right-0 w-2 h-[1px] bg-white/10"></div>
                        </div>
                    ))}
                </div>

                {/* Grid Lines */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
                    {[Math.round(maxVal), Math.round(maxVal * 0.75), Math.round(maxVal * 0.5), Math.round(maxVal * 0.25), 0].map((val) => (
                        <div key={val} className="w-full border-t border-brand-gold/5 h-0"></div>
                    ))}
                </div>

                {/* Benchmark Line */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 z-10 pointer-events-none">
                    <div
                        className="absolute w-full border-t-2 border-brand-gold border-dotted opacity-80"
                        style={{ top: `${getY(benchmark)}%`, transform: 'translateY(-50%)' }}
                    ></div>
                </div>

                {/* Chart SVG (Outlet-Stacked Columns) */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 overflow-visible z-20">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        {data.map((t, i) => {
                            const x = getX(i, data.length);
                            
                            const renderRect = (startVal: number, endVal: number, color: string) => {
                                const effectiveStart = Math.max(startVal, minVal);
                                const effectiveEnd = Math.min(endVal, maxVal);
                                if (effectiveEnd <= effectiveStart) return null;

                                const yTop = getY(effectiveEnd);
                                const yBottom = getY(effectiveStart);
                                const h = yBottom - yTop;

                                return (
                                    <rect
                                        x={x - 6}
                                        y={yTop}
                                        width="12"
                                        height={h}
                                        fill={color}
                                        className="transition-all duration-300 opacity-80 hover:opacity-100"
                                    />
                                );
                            };

                            const v1 = t.ROYAL || 0;
                            const v2 = v1 + (t["FISHER'S"] || 0);
                            const v3 = v2 + (t["RALPH'S"] || 0);
                            const v4 = v3 + (t.GUSTO || 0);

                            return (
                                <g key={i} className="cursor-pointer group/point" onClick={(e) => { e.stopPropagation(); setSelectedDay(t); }}>
                                    {renderRect(0, v1, '#d4af37')}   {/* Royal - Gold */}
                                    {renderRect(v1, v2, '#77B139')} {/* Fisher's - Green */}
                                    {renderRect(v2, v3, '#F97316')} {/* Ralph's - Orange */}
                                    {renderRect(v3, v4, '#60A5FA')} {/* Gusto - Blue */}
                                    <rect x={x - 12} y="0" width="24" height="100" fill="transparent" />
                                </g>
                            );
                        })}
                    </svg>

                    {/* Pop-up Info */}
                    {selectedDay && (() => {
                        const index = data.findIndex(d => d.date === selectedDay.date);
                        const xPct = getX(index, data.length);
                        const total = (selectedDay.ROYAL || 0) + (selectedDay["FISHER'S"] || 0) + (selectedDay["RALPH'S"] || 0) + (selectedDay.GUSTO || 0);
                        const yPct = getY(Math.min(maxVal, total));

                        const isTop = yPct < 25;
                        const topPosition = isTop ? `${yPct + 10}%` : `${yPct - 15}%`;
                        const verticalTranslate = isTop ? '0%' : '-100%';
                        const horizontalTranslate = `-${xPct}%`;

                        return (
                            <div
                                className="absolute bg-[#152E2A] border border-brand-gold/60 rounded-lg px-3 py-2 shadow-2xl z-[50] animate-in fade-in zoom-in duration-200 min-w-[140px] pointer-events-none"
                                style={{
                                    left: `${xPct}%`,
                                    top: topPosition,
                                    transform: `translate(${horizontalTranslate}, ${verticalTranslate})`,
                                    zIndex: 100
                                }}
                            >
                                <div className="flex justify-between items-center mb-1 border-b border-brand-gold/10 pb-1">
                                    <span className="text-[7px] font-black text-brand-gold uppercase tracking-wider">{selectedDay.date} Detail</span>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedDay(null); }} className="pointer-events-auto">
                                        <XIcon size={8} className="text-gray-500 hover:text-white transition-colors" />
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[7px] uppercase font-bold text-gray-400">
                                        <span>Total</span>
                                        <span className="text-white">{Math.round(total).toLocaleString()} Kg</span>
                                    </div>
                                    <div className="w-full h-[1px] bg-white/10 my-1"></div>
                                    <div className="flex justify-between text-[7px] uppercase font-bold text-[#d4af37]">
                                        <span>Royal</span>
                                        <span>{Math.round(selectedDay.ROYAL || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-[7px] uppercase font-bold text-[#77B139]">
                                        <span>Fisher's</span>
                                        <span>{Math.round(selectedDay["FISHER'S"] || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-[7px] uppercase font-bold text-[#F97316]">
                                        <span>Ralph's</span>
                                        <span>{Math.round(selectedDay["RALPH'S"] || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-[7px] uppercase font-bold text-[#60A5FA]">
                                        <span>Gusto</span>
                                        <span>{Math.round(selectedDay.GUSTO || 0)}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })()}
                </div>

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
            
            {/* Horizontal Legend - As shown in Image 2 */}
            <div className="flex justify-center gap-8 pt-4 border-t border-brand-gold/5">
                {[
                    { label: 'ROYAL', color: '#d4af37' },
                    { label: "FISHER'S", color: '#77B139' },
                    { label: "RALPH'S", color: '#F97316' },
                    { label: 'GUSTO', color: '#60A5FA' }
                ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Co2EmissionsTemplateChart;
