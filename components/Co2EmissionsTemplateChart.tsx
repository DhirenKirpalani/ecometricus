import React, { useState, useMemo } from 'react';
import { Info, Cloud, ShieldCheck, X as XIcon } from 'lucide-react';
import { DailyWaste } from '../hooks/useFoodWasteChartData';
import { useI18n } from '../lib/useI18n';

const DAY_KEY_MAP: Record<string, string> = {
  'Sun': 'daySun', 'Mon': 'dayMon', 'Tue': 'dayTue', 'Wed': 'dayWed',
  'Thu': 'dayThu', 'Fri': 'dayFri', 'Sat': 'daySat',
};

const DEFAULT_COLORS = ['#d4af37', '#77B139', '#F97316', '#60A5FA', '#A855F7', '#FF914D'];

interface OutletMeta {
    key: string;
    label: string;
    color: string;
}

interface Co2EmissionsTemplateChartProps {
    data: DailyWaste[];
    benchmark: number;
    weeklyTotal: number;
    /** Dynamic outlet keys from the hook */
    outletKeys?: string[];
    /** Outlet color mapping */
    outletColors?: Record<string, string>;
    /** Outlet display names */
    outletLabels?: Record<string, string>;
}

const Co2EmissionsTemplateChart: React.FC<Co2EmissionsTemplateChartProps> = ({
    data,
    benchmark,
    weeklyTotal,
    outletKeys = [],
    outletColors = {},
    outletLabels = {},
}) => {
    const { t } = useI18n();
    const tDay = (day: string) => DAY_KEY_MAP[day] ? t(`charts.${DAY_KEY_MAP[day]}`) : day;
    const [selectedDay, setSelectedDay] = useState<DailyWaste | null>(null);
    const [hoveredDay, setHoveredDay] = useState<number | null>(null);

    const outletMeta: OutletMeta[] = useMemo(() => {
        if (outletKeys.length === 0) {
            // Fallback: aggregate all numeric values per day as a single "Total" series
            return [{ key: '__total', label: 'Total', color: DEFAULT_COLORS[0] }];
        }
        return outletKeys.map((key, i) => ({
            key,
            label: outletLabels[key] || key.charAt(0) + key.slice(1).toLowerCase(),
            color: outletColors[key] || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        }));
    }, [outletKeys, outletColors, outletLabels]);

    // Build normalized data: if no outletKeys, compute total from all numeric fields
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
    const totals = normalizedData.map((d: any) => outletMeta.reduce((sum, o) => sum + (Number(d[o.key]) || 0), 0));
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
                        <h3 className="text-base font-geometric font-bold text-white uppercase tracking-tight leading-none">{t('charts.co2Title')}</h3>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-1">{t('charts.co2Subtitle')}</p>
                    </div>
                </div>
                {hasAlert ? (
                    <div className="flex items-center gap-1.5 bg-brand-alert/15 border border-brand-alert/30 px-2.5 py-1 rounded-lg shrink-0">
                        <Info size={11} className="text-brand-alert" />
                        <span className="text-[9px] font-black text-brand-alert uppercase tracking-widest">{t('charts.statusAttention')}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 bg-brand-eco/15 border border-brand-eco/30 px-2.5 py-1 rounded-lg shrink-0">
                        <ShieldCheck size={11} className="text-brand-eco" />
                        <span className="text-[9px] font-black text-brand-eco uppercase tracking-widest">{t('charts.statusOptimal')}</span>
                    </div>
                )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
                    <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">{t('charts.statBenchmark')}</p>
                    <p className="text-sm font-geometric font-black text-white leading-none mt-1">{Math.round(benchmark)}<span className="text-[10px] text-white/40 ml-0.5">kg</span></p>
                </div>
                <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
                    <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">{t('charts.statWeekly')}</p>
                    <p className="text-sm font-geometric font-black text-white leading-none mt-1">{Math.round(weeklyTotal)}<span className="text-[10px] text-white/40 ml-0.5">kg</span></p>
                </div>
                <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
                    <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">{t('charts.statEfficiency')}</p>
                    <p className={`text-sm font-geometric font-black leading-none mt-1 ${efficiency >= 0 ? 'text-brand-eco' : 'text-brand-alert'}`}>{efficiency >= 0 ? efficiency : 0}<span className="text-[10px] text-white/40 ml-0.5">%</span></p>
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 w-full relative min-h-0 pb-6">
                {/* Y-Axis */}
                <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between py-1 z-10 pointer-events-none w-12">
                    {[maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25, 0].map((val, i) => (
                        <div key={i} className="flex items-center justify-end pr-2 h-0">
                            <span className="text-[9px] font-bold text-white/50 tabular-nums">{Math.round(val)}</span>
                        </div>
                    ))}
                </div>

                {/* Grid + Bars */}
                <div className="absolute left-12 right-0 top-0 bottom-6">
                    {/* Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        {[0, 1, 2, 3, 4].map(i => (
                            <div key={i} className="w-full border-t border-white/5" />
                        ))}
                    </div>

                    {/* Benchmark label */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute right-0 -translate-y-1/2 flex items-center gap-1" style={{ top: `${getY(benchmark)}%` }}>
                            <div className="w-2 h-2 rounded-full bg-brand-gold border border-brand-gold" />
                            <div className="bg-brand-gold/20 border border-brand-gold/40 px-1.5 py-0.5 rounded text-[7px] font-black text-brand-gold uppercase tracking-wider">
                                {Math.round(benchmark)}kg
                            </div>
                        </div>
                    </div>

                    {/* SVG Stacked Bars */}
                    {outletMeta.length > 0 && (
                        <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                            <defs>
                                {outletMeta.map(o => (
                                    <linearGradient key={o.key} id={`co2-${o.key}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={o.color} stopOpacity="0.9" />
                                        <stop offset="100%" stopColor={o.color} stopOpacity="0.65" />
                                    </linearGradient>
                                ))}
                                <linearGradient id="co2-alert" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
                                    <stop offset="100%" stopColor="#dc2626" stopOpacity="0.6" />
                                </linearGradient>
                            </defs>
                            {/* Gold dotted benchmark line */}
                            <line x1="0" y1={getY(benchmark)} x2="100" y2={getY(benchmark)} stroke="#C8A413" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" opacity="0.85" />
                            {normalizedData.map((t: any, i) => {
                                const x = getX(i, normalizedData.length);
                                const dayTotal = outletMeta.reduce((sum, o) => sum + (Number(t[o.key]) || 0), 0);
                                const isOverBenchmark = dayTotal > benchmark;
                                let cumulative = 0;
                                const segments = outletMeta.map(o => {
                                    const val = Number(t[o.key]) || 0;
                                    const start = cumulative;
                                    cumulative += val;
                                    const end = cumulative;
                                    if (end <= minVal || start >= maxVal) return null;
                                    const yTop = getY(Math.min(end, maxVal));
                                    const yBottom = getY(Math.max(start, minVal));
                                    return { yTop, h: yBottom - yTop, key: o.key };
                                }).filter((s): s is { yTop: number; h: number; key: string } => s !== null);

                                return (
                                    <g key={i} className="cursor-pointer" onClick={() => setSelectedDay(t)}>
                                        {segments.map((s, si) => (
                                            <rect key={si} x={x - 5} y={s.yTop} width="10" height={s.h}
                                                fill={isOverBenchmark ? `url(#co2-alert)` : `url(#co2-${s.key})`}
                                                rx={si === 0 ? "3" : "0"}
                                                className="transition-all duration-300" style={{ opacity: selectedDay && selectedDay.date !== t.date ? 0.4 : 0.85 }} />
                                        ))}
                                        <rect x={x - 10} y="0" width="20" height="100" fill="transparent" />
                                    </g>
                                );
                            })}
                        </svg>
                    )}

                    {/* Data point dots with hover labels */}
                    {normalizedData.map((t: any, i) => {
                        const xPct = getX(i, normalizedData.length);
                        const total = outletMeta.reduce((sum, o) => sum + (Number(t[o.key]) || 0), 0);
                        const yPct = getY(Math.min(maxVal, Math.max(minVal, total)));
                        const isGood = total <= benchmark;
                        const isHovered = hoveredDay === i;
                        return (
                            <div key={`dot-${i}`} className="absolute z-20" style={{ left: `${xPct}%`, top: `${yPct}%`, transform: 'translate(-50%, -50%)' }}>
                                <div
                                    className={`w-2.5 h-2.5 rounded-full border-2 cursor-pointer transition-all ${isGood ? 'bg-brand-gold border-brand-gold' : 'bg-brand-alert border-brand-alert'} ${isHovered ? 'scale-150 shadow-lg' : 'hover:scale-125'}`}
                                    onMouseEnter={() => setHoveredDay(i)}
                                    onMouseLeave={() => setHoveredDay(null)}
                                    onClick={() => setSelectedDay(t)}
                                />
                                {isHovered && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-brand-dark border border-brand-gold/30 rounded-lg px-2 py-1 shadow-xl whitespace-nowrap z-30 pointer-events-none animate-in fade-in zoom-in duration-150">
                                        <p className="text-[7px] font-black text-brand-gold uppercase tracking-wider">{tDay(t.date)}</p>
                                        <p className={`text-[10px] font-black ${isGood ? 'text-brand-gold' : 'text-brand-alert'}`}>{Math.round(total)}kg</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Tooltip */}
                    {selectedDay && (() => {
                        const index = normalizedData.findIndex(d => d.date === selectedDay.date);
                        const xPct = getX(index, data.length);
                        const total = outletMeta.reduce((sum, o) => sum + (Number((selectedDay as any)[o.key]) || 0), 0);
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
                                    <p className="text-[8px] font-black text-brand-gold uppercase tracking-wider text-center mb-1.5">{tDay(selectedDay.date)}</p>
                                    <p className="text-base font-geometric font-black text-white text-center mb-1.5">{Math.round(total)}kg</p>
                                    <div className="space-y-0.5">
                                        {outletMeta.map(o => {
                                            const val = Math.round(Number((selectedDay as any)[o.key]) || 0);
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
                            </>
                        );
                    })()}
                </div>

                {/* X-Axis labels */}
                <div className="absolute left-12 right-0 bottom-0 h-6">
                    {normalizedData.map((t, i) => (
                        <div key={t.date} className="absolute bottom-0 -translate-x-1/2 text-[8px] font-bold text-white uppercase tracking-wider" style={{ left: `${getX(i, normalizedData.length)}%` }}>
                            {tDay(t.date)}
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend */}
            {outletMeta.length > 0 && (
                <div className="flex flex-wrap justify-center gap-3 pt-3 border-t border-white/5 mt-2">
                    {outletMeta.map(o => (
                        <div key={o.key} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: o.color }} />
                            <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider">{o.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Co2EmissionsTemplateChart;
