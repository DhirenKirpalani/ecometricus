import React, { useState, useMemo } from 'react';
import { Info, Cloud, ShieldCheck } from 'lucide-react';
import { DailyWaste } from '../hooks/useFoodWasteChartData';

interface Co2EmissionsTemplateChartProps {
    data: DailyWaste[];
    benchmark: number;
    weeklyTotal: number;
}

const OUTLET_COLORS = [
    { key: 'ROYAL', label: 'Royal', color: '#d4af37' },
    { key: "FISHER'S", label: "Fisher's", color: '#77B139' },
    { key: "RALPH'S", label: "Ralph's", color: '#F97316' },
    { key: 'GUSTO', label: 'Gusto', color: '#60A5FA' },
];

const Co2EmissionsTemplateChart: React.FC<Co2EmissionsTemplateChartProps> = ({ data, benchmark, weeklyTotal }) => {
    const [selectedDay, setSelectedDay] = useState<DailyWaste | null>(null);

    const minVal = 0;
    const totals = data.map(d => OUTLET_COLORS.reduce((sum, o) => sum + ((d as any)[o.key] || 0), 0));
    const maxVal = Math.max(benchmark * 1.5, ...totals, 100);
    const range = maxVal - minVal;

    const getY = (val: number) => 100 - ((val - minVal) / (range || 1)) * 100;
    const getX = (index: number, total: number) => 10 + (index / (total - 1)) * 80;

    const weeklyTarget = benchmark * 7;
    const hasAlert = weeklyTotal > weeklyTarget;
    const efficiency = weeklyTarget > 0 ? Math.round((1 - weeklyTotal / weeklyTarget) * 100) : 100;

    return (
        <div className="bg-[#1c3933] border border-brand-gold/20 rounded-2xl p-5 sm:p-6 shadow-xl w-full h-full flex flex-col transition-all duration-300 hover:border-brand-gold/40">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <Cloud size={18} className="text-white/60" />
                    </div>
                    <div>
                        <h3 className="text-base font-geometric font-bold text-white uppercase tracking-tight leading-none">CO2 Emissions</h3>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-1">Daily Carbon Footprint</p>
                    </div>
                </div>
                {hasAlert ? (
                    <div className="flex items-center gap-1.5 bg-brand-alert/15 border border-brand-alert/30 px-2.5 py-1 rounded-lg">
                        <Info size={11} className="text-brand-alert" />
                        <span className="text-[9px] font-black text-brand-alert uppercase tracking-widest">Attention</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 bg-brand-eco/15 border border-brand-eco/30 px-2.5 py-1 rounded-lg">
                        <ShieldCheck size={11} className="text-brand-eco" />
                        <span className="text-[9px] font-black text-brand-eco uppercase tracking-widest">Optimal</span>
                    </div>
                )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
                    <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">Benchmark</p>
                    <p className="text-sm font-geometric font-black text-white leading-none mt-1">{Math.round(benchmark)}<span className="text-[10px] text-white/40 ml-0.5">kg</span></p>
                </div>
                <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
                    <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">Weekly</p>
                    <p className="text-sm font-geometric font-black text-white leading-none mt-1">{Math.round(weeklyTotal)}<span className="text-[10px] text-white/40 ml-0.5">kg</span></p>
                </div>
                <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
                    <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">Efficiency</p>
                    <p className={`text-sm font-geometric font-black leading-none mt-1 ${efficiency >= 0 ? 'text-brand-eco' : 'text-brand-alert'}`}>{efficiency >= 0 ? efficiency : 0}<span className="text-[10px] text-white/40 ml-0.5">%</span></p>
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 w-full relative min-h-0 pb-6">
                {/* Y-Axis */}
                <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between py-1 z-10 pointer-events-none w-8">
                    {[maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25, 0].map((val, i) => (
                        <div key={i} className="flex items-center justify-end pr-2 h-0">
                            <span className="text-[8px] font-bold text-white/30">{Math.round(val)}</span>
                        </div>
                    ))}
                </div>

                {/* Grid + Bars */}
                <div className="absolute left-8 right-0 top-0 bottom-6">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="w-full border-t border-white/5" />
                        ))}
                    </div>

                    {/* Benchmark line */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute w-full border-t border-dashed border-brand-gold/50" style={{ top: `${getY(benchmark)}%` }} />
                        <div className="absolute right-0 -translate-y-1/2 bg-brand-gold/20 border border-brand-gold/40 px-1.5 py-0.5 rounded text-[7px] font-black text-brand-gold uppercase tracking-wider" style={{ top: `${getY(benchmark)}%` }}>
                            {Math.round(benchmark)}kg
                        </div>
                    </div>

                    {/* SVG Stacked Bars */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <defs>
                            {OUTLET_COLORS.map(o => (
                                <linearGradient key={o.key} id={`co2-${o.key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={o.color} stopOpacity="0.9" />
                                    <stop offset="100%" stopColor={o.color} stopOpacity="0.65" />
                                </linearGradient>
                            ))}
                        </defs>
                        {data.map((t, i) => {
                            const x = getX(i, data.length);
                            let cumulative = 0;
                            const segments = OUTLET_COLORS.map(o => {
                                const val = (t as any)[o.key] || 0;
                                const start = cumulative;
                                cumulative += val;
                                const end = cumulative;
                                if (end <= minVal || start >= maxVal) return null;
                                const yTop = getY(Math.min(end, maxVal));
                                const yBottom = getY(Math.max(start, minVal));
                                const h = yBottom - yTop;
                                return { yTop, h, color: o.color, key: o.key };
                            }).filter(Boolean);

                            return (
                                <g key={i} className="cursor-pointer" onClick={() => setSelectedDay(t)}>
                                    {segments.map((s, si) => (
                                        <rect key={si} x={x - 5} y={s.yTop} width="10" height={s.h} fill={`url(#co2-${s.key})`} rx={si === 0 ? "3" : "0"}
                                            className="transition-all duration-300" style={{ opacity: selectedDay && selectedDay.date !== t.date ? 0.4 : 0.85 }} />
                                    ))}
                                    <rect x={x - 10} y="0" width="20" height="100" fill="transparent" />
                                </g>
                            );
                        })}
                    </svg>

                    {/* Tooltip */}
                    {selectedDay && (() => {
                        const index = data.findIndex(d => d.date === selectedDay.date);
                        const xPct = getX(index, data.length);
                        const total = OUTLET_COLORS.reduce((sum, o) => sum + ((selectedDay as any)[o.key] || 0), 0);
                        const yPct = getY(Math.min(maxVal, total));
                        const isTop = yPct < 30;
                        return (
                            <div className="absolute bg-brand-dark border border-brand-gold/30 rounded-lg px-3 py-2 shadow-2xl z-50 animate-in fade-in zoom-in duration-200 pointer-events-none min-w-[130px]"
                                style={{ left: `${xPct}%`, top: isTop ? `${yPct + 8}%` : `${yPct - 8}%`, transform: `translate(-50%, ${isTop ? '0%' : '-100%'})` }}>
                                <p className="text-[8px] font-black text-brand-gold uppercase tracking-wider text-center mb-1.5">{selectedDay.date}</p>
                                <p className="text-base font-geometric font-black text-white text-center mb-1.5">{Math.round(total)}kg</p>
                                <div className="space-y-0.5">
                                    {OUTLET_COLORS.map(o => {
                                        const val = Math.round((selectedDay as any)[o.key] || 0);
                                        if (val === 0) return null;
                                        return (
                                            <div key={o.key} className="flex justify-between items-center text-[8px] font-bold">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: o.color }} />
                                                    <span className="text-white/60 uppercase">{o.label}</span>
                                                </div>
                                                <span className="text-white">{val}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* X-Axis labels */}
                <div className="absolute left-8 right-0 bottom-0 h-6">
                    {data.map((t, i) => (
                        <div key={t.date} className="absolute bottom-0 -translate-x-1/2 text-[8px] font-bold text-white/30 uppercase tracking-wider" style={{ left: `${getX(i, data.length)}%` }}>
                            {t.date}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3 pt-3 border-t border-white/5 mt-2">
                {OUTLET_COLORS.map(o => (
                    <div key={o.key} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: o.color }} />
                        <span className="text-[8px] font-bold text-white/50 uppercase tracking-wider">{o.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Co2EmissionsTemplateChart;
