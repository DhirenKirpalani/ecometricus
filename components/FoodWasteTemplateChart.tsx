import React, { useState, useMemo } from 'react';
import { Info, Leaf, X as XIcon, TrendingDown } from 'lucide-react';
import { DailyWaste } from '../hooks/useFoodWasteChartData';
import { useI18n } from '../lib/useI18n';

const DAY_KEY_MAP: Record<string, string> = {
  'SUN': 'daySun', 'MON': 'dayMon', 'TUE': 'dayTue', 'WED': 'dayWed',
  'THU': 'dayThu', 'FRI': 'dayFri', 'SAT': 'daySat',
};

const DEFAULT_COLORS = ['#d4af37', '#77B139', '#F97316', '#60A5FA', '#A855F7', '#FF914D'];

interface OutletMeta { key: string; label: string; color: string; }

interface FoodWasteTemplateChartProps {
    data: DailyWaste[];
    benchmark: number;
    outletKeys?: string[];
    outletColors?: Record<string, string>;
    outletLabels?: Record<string, string>;
}

const FoodWasteTemplateChart: React.FC<FoodWasteTemplateChartProps> = ({
    data,
    benchmark,
    outletKeys = [],
    outletColors = {},
    outletLabels = {},
}) => {
    const { t } = useI18n();
    const tDay = (date: string) => {
        const upper = (date || '').toUpperCase();
        return DAY_KEY_MAP[upper] ? t(`charts.${DAY_KEY_MAP[upper]}`) : date;
    };
    const [selectedDay, setSelectedDay] = useState<DailyWaste | null>(null);
    const [hoveredDay, setHoveredDay] = useState<number | null>(null);

    const outletMeta: OutletMeta[] = useMemo(() => {
        if (outletKeys.length === 0) return [{ key: '__total', label: 'Total', color: DEFAULT_COLORS[0] }];
        return outletKeys.map((key, i) => ({
            key,
            label: outletLabels[key] || key.charAt(0) + key.slice(1).toLowerCase(),
            color: outletColors[key] || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        }));
    }, [outletKeys, outletColors, outletLabels]);

    const normalizedData = useMemo(() => {
        if (outletKeys.length > 0) return data;
        return data.map(d => {
            const total = Object.entries(d)
                .filter(([k]) => k !== 'date')
                .reduce((sum, [, v]) => sum + (Number(v) || 0), 0);
            return { ...d, __total: total };
        });
    }, [data, outletKeys]);

    const minVal = 0;
    const totals = normalizedData.map(d => outletMeta.reduce((sum, o) => sum + (Number((d as any)[o.key]) || 0), 0));
    // Dynamic Y-axis: scale to whichever is higher — actual data or benchmark — plus 20% headroom
    const { maxVal, yTicks } = (() => {
        const dataMax = benchmark;
        const paddedMax = dataMax * 1.2;
        const roughInterval = paddedMax / 5;
        const mag = Math.pow(10, Math.floor(Math.log10(roughInterval || 1)));
        const n = roughInterval / mag;
        const niceN = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
        const interval = niceN * mag;
        const niceMax = Math.ceil(paddedMax / interval) * interval;
        const count = Math.round(niceMax / interval);
        const ticks = Array.from({ length: count + 1 }, (_, i) => i * interval).reverse();
        return { maxVal: niceMax, yTicks: ticks };
    })();
    const range = maxVal - minVal;
    const fmtY = (v: number) => v === 0 ? '0' : v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1000 ? `${Math.round(v/1000)}K` : Math.round(v).toString();

    const getY = (val: number) => 100 - ((val - minVal) / (range || 1)) * 100;
    const getX = (index: number, total: number) => 10 + (index / (total - 1)) * 80;

    const weeklyTotal = totals.reduce((a, b) => a + b, 0);
    const avgDay = weeklyTotal / (normalizedData.length || 1);
    // benchmark is daily target; compare weekly total against 7 days * daily target
    const hasAlert = weeklyTotal > benchmark * 7;

    return (
        <div className="bg-[#1c3933] border border-brand-gold/20 rounded-2xl p-5 sm:p-6 shadow-xl w-full h-full flex flex-col transition-all duration-300 hover:border-brand-eco/30">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-eco/10 border border-brand-eco/20 flex items-center justify-center shrink-0">
                        <Leaf size={18} className="text-brand-eco" />
                    </div>
                    <div>
                        <h3 className="text-base font-geometric font-bold text-white uppercase tracking-tight leading-none">{t('charts.foodWasteTitle')}</h3>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-1">{t('charts.foodWasteSubtitle')}</p>
                    </div>
                </div>
                {hasAlert ? (
                    <div className="flex items-center gap-1.5 bg-brand-alert/15 border border-brand-alert/30 px-2.5 py-1 rounded-lg">
                        <Info size={11} className="text-brand-alert" />
                        <span className="text-[9px] font-black text-brand-alert uppercase tracking-widest">{t('charts.statusAttention')}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 bg-brand-eco/15 border border-brand-eco/30 px-2.5 py-1 rounded-lg">
                        <TrendingDown size={11} className="text-brand-eco" />
                        <span className="text-[9px] font-black text-brand-eco uppercase tracking-widest">{t('charts.statusOnTarget')}</span>
                    </div>
                )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
                    <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">{t('charts.statBenchmark')}</p>
                    <p className="text-sm font-geometric font-black text-white leading-none mt-1">{benchmark.toFixed(0)}<span className="text-[10px] text-white/40 ml-0.5">kg/d</span></p>
                </div>
                <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
                    <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">{t('charts.statWeekly')}</p>
                    <p className="text-sm font-geometric font-black text-white leading-none mt-1">{weeklyTotal.toFixed(1)}<span className="text-[10px] text-white/40 ml-0.5">kg</span></p>
                </div>
                <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
                    <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">{t('charts.statAvgDay')}</p>
                    <p className="text-sm font-geometric font-black text-white leading-none mt-1">{avgDay.toFixed(1)}<span className="text-[10px] text-white/40 ml-0.5">kg</span></p>
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 w-full relative min-h-0 pb-6">
                {/* Y-Axis */}
                <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between py-1 z-10 pointer-events-none w-12">
                    {yTicks.map((val, i) => (
                        <div key={i} className="flex items-center justify-end pr-2 h-0">
                            <span className="text-[9px] font-bold text-white/50 tabular-nums">{fmtY(val)}</span>
                        </div>
                    ))}
                </div>

                {/* Grid + Bars area */}
                <div className="absolute left-12 right-0 top-0 bottom-6">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {yTicks.map((_, i) => <div key={i} className="w-full border-t border-white/5" />)}
                    </div>

                    {/* SVG Stacked Bars */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <defs>
                            {outletMeta.map(o => (
                                <linearGradient key={o.key} id={`fw-${o.key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={o.color} stopOpacity="1" />
                                    <stop offset="100%" stopColor={o.color} stopOpacity="0.95" />
                                </linearGradient>
                            ))}
                            {/* Per-bar rounded clip paths */}
                            {normalizedData.map((d, i) => {
                                const x = getX(i, normalizedData.length);
                                const total = outletMeta.reduce((s, o) => s + (Number((d as any)[o.key]) || 0), 0);
                                const yTop = getY(Math.min(total, maxVal));
                                return (
                                    <clipPath key={i} id={`fw-clip-${i}`}>
                                        <rect x={x - 6} y={yTop} width={12} height={100 - yTop} rx={3} />
                                    </clipPath>
                                );
                            })}
                        </defs>
                        {/* Green safe zone below benchmark */}
                        <rect x="0" y={getY(benchmark)} width="100" height={100 - getY(benchmark)} fill="#77B139" fillOpacity="0.08" />
                        {/* Benchmark line */}
                        <line x1="0" y1={getY(benchmark)} x2="100" y2={getY(benchmark)} stroke="#C8A413" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" opacity="0.9" />
                        {normalizedData.map((d, i) => {
                            const x = getX(i, normalizedData.length);
                            const total = outletMeta.reduce((s, o) => s + (Number((d as any)[o.key]) || 0), 0);
                            const isOverBenchmark = total > benchmark;
                            const isHov = hoveredDay === i;
                            const dimmed = hoveredDay !== null && !isHov;
                            let cumulative = 0;
                            const segments = outletMeta.map(o => {
                                const val = Number((d as any)[o.key]) || 0;
                                const yTop = getY(cumulative + val);
                                const yBot = getY(cumulative);
                                const h = Math.max(0, yBot - yTop);
                                cumulative += val;
                                return { key: o.key, yTop, h };
                            });
                            const barTop = getY(Math.min(total, maxVal));
                            return (
                                <g key={i} className="cursor-pointer"
                                    onClick={() => setSelectedDay(d)}
                                    onMouseEnter={() => setHoveredDay(i)}
                                    onMouseLeave={() => setHoveredDay(null)}
                                    clipPath={`url(#fw-clip-${i})`}>
                                    {segments.map((s) => (
                                        <rect key={s.key} x={x - 6} y={s.yTop} width={12} height={s.h}
                                            fill={`url(#fw-${s.key})`}
                                            className="transition-all duration-300"
                                            style={{ opacity: dimmed ? 0.25 : 1 }} />
                                    ))}
                                    {/* Red danger overlay when over daily benchmark */}
                                    {isOverBenchmark && (
                                        <rect x={x - 6} y={barTop} width={12} height={100 - barTop}
                                            fill="rgba(239,68,68,0.22)"
                                            style={{ opacity: dimmed ? 0.25 : 1 }} />
                                    )}
                                    {/* Bright highlight on hover */}
                                    {isHov && total > 0 && (
                                        <rect x={x - 6} y={barTop} width={12} height={100 - barTop}
                                            fill="white" fillOpacity="0.12" />
                                    )}
                                    <rect x={x - 10} y="0" width="20" height="100" fill="transparent" />
                                </g>
                            );
                        })}
                    </svg>

                    {/* Benchmark label — after SVG so it renders on top of the line */}
                    <div className="absolute inset-0 pointer-events-none z-20">
                        <div className="absolute right-0 -translate-y-1/2 flex items-center gap-1" style={{ top: `${getY(benchmark)}%` }}>
                            <div className="w-2 h-2 rounded-full bg-brand-gold border border-brand-gold" />
                            <div className="bg-brand-gold px-1.5 py-0.5 rounded text-[7px] font-black text-[#0d2117] uppercase tracking-wider">
                                {benchmark.toFixed(1)}kg/d
                            </div>
                        </div>
                    </div>

                    {/* Data point dots */}
                    {normalizedData.map((d, i) => {
                        const xPct = getX(i, normalizedData.length);
                        const total = outletMeta.reduce((sum, o) => sum + (Number((d as any)[o.key]) || 0), 0);
                        const yPct = getY(Math.min(maxVal, Math.max(minVal, total)));
                        const isGood = total <= benchmark;
                        const isHovered = hoveredDay === i;
                        return (
                            <div key={`dot-${i}`} className="absolute z-20" style={{ left: `${xPct}%`, top: `${yPct}%`, transform: 'translate(-50%, -50%)' }}>
                                <div
                                    className={`w-2.5 h-2.5 rounded-full border-2 cursor-pointer transition-all ${isGood ? 'bg-brand-eco border-brand-eco' : 'bg-brand-alert border-brand-alert'} ${isHovered ? 'scale-150 shadow-lg' : 'hover:scale-125'}`}
                                    onMouseEnter={() => setHoveredDay(i)}
                                    onMouseLeave={() => setHoveredDay(null)}
                                    onClick={() => setSelectedDay(d)}
                                />
                                {isHovered && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-brand-dark border border-brand-gold/30 rounded-lg px-2 py-1 shadow-xl whitespace-nowrap z-30 pointer-events-none animate-in fade-in zoom-in duration-150">
                                        <p className="text-[7px] font-black text-brand-gold uppercase tracking-wider">{tDay((d as any).date || '')}</p>
                                        {outletMeta.map(o => {
                                            const val = Number((d as any)[o.key]) || 0;
                                            if (!val) return null;
                                            return <p key={o.key} className="text-[9px] font-black" style={{ color: o.color }}>{o.label}: {val.toFixed(1)}kg</p>;
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Click tooltip */}
                    {selectedDay && (() => {
                        const idx = normalizedData.findIndex(d => (d as any).date === (selectedDay as any).date);
                        const xPct = getX(idx, normalizedData.length);
                        const total = outletMeta.reduce((sum, o) => sum + (Number((selectedDay as any)[o.key]) || 0), 0);
                        const yPct = getY(Math.min(maxVal, Math.max(minVal, total)));
                        const isTop = yPct < 30;
                        return (
                            <>
                                <div className="absolute inset-0 z-40 cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedDay(null); }} />
                                <div className="absolute bg-brand-dark border border-brand-gold/30 rounded-lg px-3 py-2 shadow-2xl z-50 animate-in fade-in zoom-in duration-200 min-w-[100px]"
                                    style={{ left: `${xPct}%`, top: isTop ? `${yPct + 8}%` : `${yPct - 8}%`, transform: `translate(-50%, ${isTop ? '0%' : '-100%'})` }}>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedDay(null); }} className="absolute -top-2 -right-2 w-5 h-5 bg-brand-dark border border-brand-gold/30 rounded-full flex items-center justify-center hover:border-brand-gold/60 transition-colors z-10">
                                        <XIcon size={10} className="text-white/50 hover:text-white" />
                                    </button>
                                    <p className="text-[8px] font-black text-brand-gold uppercase tracking-wider text-center mb-1">{tDay((selectedDay as any).date || '')}</p>
                                    {outletMeta.map(o => {
                                        const val = Number((selectedDay as any)[o.key]) || 0;
                                        if (!val) return null;
                                        return <p key={o.key} className="text-[10px] font-black text-center" style={{ color: o.color }}>{o.label}: {val.toFixed(1)}kg</p>;
                                    })}
                                    <p className={`text-[7px] font-black uppercase text-center mt-1 ${total <= benchmark ? 'text-brand-eco/70' : 'text-brand-alert/70'}`}>
                                        {total <= benchmark ? t('charts.tooltipWithinLimit') : t('charts.tooltipOverLimit')}
                                    </p>
                                </div>
                            </>
                        );
                    })()}
                </div>

                {/* X-Axis labels */}
                <div className="absolute left-12 right-0 bottom-0 h-6">
                    {normalizedData.map((d, i) => (
                        <div key={i} className="absolute bottom-0 -translate-x-1/2 text-[8px] font-bold text-white uppercase tracking-wider" style={{ left: `${getX(i, normalizedData.length)}%` }}>
                            {tDay((d as any).date || '')}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            {outletMeta.length > 1 && (
                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 pt-2 border-t border-white/5">
                    {outletMeta.map(o => (
                        <div key={o.key} className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: o.color }} />
                            <span className="text-[8px] font-bold text-white/50 uppercase tracking-wide">{o.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FoodWasteTemplateChart;
