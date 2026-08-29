import React, { useState, useMemo } from 'react';
import { Info, X as XIcon, ShieldCheck } from 'lucide-react';
import { Outlet } from '../types';

export interface ResourceData {
    day: string;
    "ROYAL": number;
    "FISHER'S": number;
    "RALPH'S": number;
    "GUSTO": number;
}

const OUTLET_KEYS = ['ROYAL', "FISHER'S", "RALPH'S", 'GUSTO'] as const;

const OUTLET_META = [
    { key: 'ROYAL', label: 'Royal', color: '#d4af37' },
    { key: "FISHER'S", label: "Fisher's", color: '#77B139' },
    { key: "RALPH'S", label: "Ralph's", color: '#F97316' },
    { key: 'GUSTO', label: 'Gusto', color: '#60A5FA' },
];

interface ResourceTemplateChartProps {
    data: ResourceData[];
    benchmark: number;
    title: string;
    subtitle: string;
    unit: string;
    maxVal: number;
    icon: React.ReactNode;
    allOutlets?: Outlet[];
}

const ResourceTemplateChart: React.FC<ResourceTemplateChartProps> = ({
    data,
    benchmark,
    title,
    subtitle,
    unit,
    maxVal,
    icon,
    allOutlets
}) => {
    const [selectedDay, setSelectedDay] = useState<ResourceData | null>(null);

    const minVal = 0;
    const range = maxVal - minVal;

    const getY = (val: number) => 100 - ((val - minVal) / (range || 1)) * 100;
    const getX = (index: number, total: number) => 10 + (index / (total - 1)) * 80;

    const hasAlert = data.some(d => OUTLET_KEYS.reduce((sum, k) => sum + (d[k] || 0), 0) > benchmark);

    const weeklyTotal = useMemo(() =>
        data.reduce((acc, curr) => acc + OUTLET_KEYS.reduce((s, k) => s + (curr[k] || 0), 0), 0).toLocaleString(),
        [data]
    );

    const avgDaily = useMemo(() =>
        Math.round(data.reduce((acc, curr) => acc + OUTLET_KEYS.reduce((s, k) => s + (curr[k] || 0), 0), 0) / (data.length || 1)).toLocaleString(),
        [data]
    );

    const colors = useMemo(() => {
        const map: Record<string, string> = {};
        OUTLET_META.forEach(o => { map[o.key] = o.color; });
        if (allOutlets) {
            allOutlets.forEach(o => {
                const clean = o.name.toUpperCase();
                OUTLET_META.forEach(m => {
                    if (clean.includes(m.key)) map[m.key] = o.color_hex || m.color;
                });
            });
        }
        return map;
    }, [allOutlets]);

    const yAxisLabels = useMemo(() => {
        const steps = 5;
        const labels = [];
        for (let i = steps; i >= 0; i--) {
            labels.push(Math.round(minVal + (i / steps) * range));
        }
        return labels;
    }, [minVal, maxVal, range]);

    return (
        <div className="bg-[#1c3933] border border-brand-gold/20 rounded-2xl p-5 sm:p-6 shadow-xl w-full h-full flex flex-col transition-all duration-300 hover:border-brand-gold/30">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        {icon}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base font-geometric font-bold text-white uppercase tracking-tight leading-none truncate">{title}</h3>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-1 truncate">{subtitle}</p>
                    </div>
                </div>
                {hasAlert ? (
                    <div className="flex items-center gap-1.5 bg-brand-alert/15 border border-brand-alert/30 px-2.5 py-1 rounded-lg shrink-0">
                        <Info size={11} className="text-brand-alert" />
                        <span className="text-[9px] font-black text-brand-alert uppercase tracking-widest">Alert</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 bg-brand-eco/15 border border-brand-eco/30 px-2.5 py-1 rounded-lg shrink-0">
                        <ShieldCheck size={11} className="text-brand-eco" />
                        <span className="text-[9px] font-black text-brand-eco uppercase tracking-widest">On Target</span>
                    </div>
                )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
                    <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">Benchmark</p>
                    <p className="text-sm font-geometric font-black text-white leading-none mt-1">{benchmark.toLocaleString()}<span className="text-[10px] text-white/40 ml-0.5">{unit}</span></p>
                </div>
                <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
                    <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">Weekly</p>
                    <p className="text-sm font-geometric font-black text-white leading-none mt-1">{weeklyTotal}<span className="text-[10px] text-white/40 ml-0.5">{unit}</span></p>
                </div>
                <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
                    <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">Avg/Day</p>
                    <p className="text-sm font-geometric font-black text-white leading-none mt-1">{avgDaily}<span className="text-[10px] text-white/40 ml-0.5">{unit}</span></p>
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 w-full relative min-h-0 pb-6">
                {/* Y-Axis */}
                <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between py-1 z-10 pointer-events-none w-10">
                    {yAxisLabels.map((val, i) => (
                        <div key={i} className="flex items-center justify-end pr-2 h-0">
                            <span className="text-[8px] font-bold text-white/30">{val.toLocaleString()}</span>
                        </div>
                    ))}
                </div>

                {/* Grid + Bars */}
                <div className="absolute left-10 right-0 top-0 bottom-6">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {yAxisLabels.map((_, i) => (
                            <div key={i} className="w-full border-t border-white/5" />
                        ))}
                    </div>

                    {/* Benchmark line */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute w-full border-t border-dashed border-brand-gold/50" style={{ top: `${getY(benchmark)}%` }} />
                        <div className="absolute right-0 -translate-y-1/2 bg-brand-gold/20 border border-brand-gold/40 px-1.5 py-0.5 rounded text-[7px] font-black text-brand-gold uppercase tracking-wider" style={{ top: `${getY(benchmark)}%` }}>
                            {benchmark.toLocaleString()}{unit}
                        </div>
                    </div>

                    {/* SVG Stacked Bars */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <defs>
                            {OUTLET_KEYS.map(k => (
                                <linearGradient key={k} id={`res-${k}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={colors[k]} stopOpacity="0.9" />
                                    <stop offset="100%" stopColor={colors[k]} stopOpacity="0.65" />
                                </linearGradient>
                            ))}
                        </defs>
                        {data.map((t, i) => {
                            const x = getX(i, data.length);
                            let cumulative = 0;
                            const segments = OUTLET_KEYS.map(k => {
                                const val = t[k] || 0;
                                const start = cumulative;
                                cumulative += val;
                                const end = cumulative;
                                if (end <= minVal || start >= maxVal) return null;
                                const yTop = getY(Math.min(end, maxVal));
                                const yBottom = getY(Math.max(start, minVal));
                                return { yTop, h: yBottom - yTop, key: k };
                            }).filter(Boolean);

                            return (
                                <g key={i} className="cursor-pointer" onClick={() => setSelectedDay(t)}>
                                    {segments.map((s, si) => (
                                        <rect key={si} x={x - 5} y={s.yTop} width="10" height={s.h} fill={`url(#res-${s.key})`} rx={si === 0 ? "3" : "0"}
                                            className="transition-all duration-300" style={{ opacity: selectedDay && selectedDay.day !== t.day ? 0.4 : 0.85 }} />
                                    ))}
                                    <rect x={x - 10} y="0" width="20" height="100" fill="transparent" />
                                </g>
                            );
                        })}
                    </svg>

                    {/* Tooltip */}
                    {selectedDay && (() => {
                        const index = data.findIndex(d => d.day === selectedDay.day);
                        const xPct = getX(index, data.length);
                        const total = OUTLET_KEYS.reduce((sum, k) => sum + (selectedDay[k] || 0), 0);
                        const yPct = getY(Math.min(maxVal, total));
                        const isTop = yPct < 30;
                        return (
                            <>
                                <div className="absolute inset-0 z-40 cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedDay(null); }} />
                                <div className="absolute bg-brand-dark border border-brand-gold/30 rounded-lg px-3 py-2 shadow-2xl z-50 animate-in fade-in zoom-in duration-200 min-w-[130px]"
                                    style={{ left: `${xPct}%`, top: isTop ? `${yPct + 8}%` : `${yPct - 8}%`, transform: `translate(-50%, ${isTop ? '0%' : '-100%'})` }}>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedDay(null); }} className="absolute -top-2 -right-2 w-5 h-5 bg-brand-dark border border-brand-gold/30 rounded-full flex items-center justify-center hover:border-brand-gold/60 transition-colors z-10">
                                        <XIcon size={10} className="text-white/50 hover:text-white" />
                                    </button>
                                    <p className="text-[8px] font-black text-brand-gold uppercase tracking-wider text-center mb-1.5">{selectedDay.day}</p>
                                    <p className="text-base font-geometric font-black text-white text-center mb-1.5">{Math.round(total).toLocaleString()}{unit}</p>
                                    <div className="space-y-0.5">
                                        {OUTLET_META.map(o => {
                                            const val = Math.round(selectedDay[o.key] || 0);
                                            if (val === 0) return null;
                                            return (
                                                <div key={o.key} className="flex justify-between items-center text-[8px] font-bold">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: o.color }} />
                                                        <span className="text-white/60 uppercase">{o.label}</span>
                                                    </div>
                                                    <span className="text-white">{val.toLocaleString()}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </div>

                {/* X-Axis labels */}
                <div className="absolute left-10 right-0 bottom-0 h-6">
                    {data.map((t, i) => (
                        <div key={t.day} className="absolute bottom-0 -translate-x-1/2 text-[8px] font-bold text-white/30 uppercase tracking-wider" style={{ left: `${getX(i, data.length)}%` }}>
                            {t.day}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3 pt-3 border-t border-white/5 mt-2">
                {OUTLET_META.map(o => (
                    <div key={o.key} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: o.color }} />
                        <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider">{o.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResourceTemplateChart;
