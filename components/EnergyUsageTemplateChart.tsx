import React, { useState, useMemo } from 'react';
import { Info, Zap, TrendingDown, X as XIcon } from 'lucide-react';
import { useI18n } from '../lib/useI18n';

interface EnergyUsageData {
    day: string;
    usage: number;
}

interface EnergyUsageTemplateChartProps {
    data: EnergyUsageData[];
    benchmark: number;
}

const EnergyUsageTemplateChart: React.FC<EnergyUsageTemplateChartProps> = ({ data, benchmark }) => {
    const { t } = useI18n();
    const [selectedDay, setSelectedDay] = useState<EnergyUsageData | null>(null);
    const [hoveredDay, setHoveredDay] = useState<number | null>(null);

    const minVal = 0;
    const maxVal = Math.max(4500, ...data.map(d => d.usage), benchmark * 1.3);
    const range = maxVal - minVal;

    const getY = (val: number) => 100 - ((val - minVal) / range) * 100;
    const getX = (index: number, total: number) => 10 + (index / (total - 1)) * 80;

    const hasAlert = data.some(d => d.usage > benchmark);

    const weeklyUsage = useMemo(() => data.reduce((acc, curr) => acc + curr.usage, 0).toLocaleString(), [data]);
    const avgUsage = useMemo(() => Math.round(data.reduce((acc, curr) => acc + curr.usage, 0) / (data.length || 1)).toLocaleString(), [data]);

    // Build smooth area path
    const points = data.map((d, i) => ({ x: getX(i, data.length), y: getY(Math.max(minVal, Math.min(maxVal, d.usage))) }));
    const linePath = points.length > 0 ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : '';
    const areaPath = points.length > 0 ? `${linePath} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z` : '';

    return (
        <div className="bg-[#1c3933] border border-brand-gold/20 rounded-2xl p-5 sm:p-6 shadow-xl w-full h-full flex flex-col transition-all duration-300 hover:border-brand-gold/40">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
                        <Zap size={18} className="text-brand-gold" />
                    </div>
                    <div>
                        <h3 className="text-base font-geometric font-bold text-white uppercase tracking-tight leading-none">{t('charts.energyTitle')}</h3>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-1">{t('charts.energySubtitle')}</p>
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
                        <span className="text-[9px] font-black text-brand-eco uppercase tracking-widest">{t('charts.statusEfficient')}</span>
                    </div>
                )}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
                    <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">{t('charts.statBenchmark')}</p>
                    <p className="text-sm font-geometric font-black text-white leading-none mt-1">{benchmark.toLocaleString()}<span className="text-[10px] text-white/40 ml-0.5">kWh</span></p>
                </div>
                <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
                    <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">{t('charts.statWeekly')}</p>
                    <p className="text-sm font-geometric font-black text-white leading-none mt-1">{weeklyUsage}<span className="text-[10px] text-white/40 ml-0.5">kWh</span></p>
                </div>
                <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
                    <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">{t('charts.statAvgDay')}</p>
                    <p className="text-sm font-geometric font-black text-white leading-none mt-1">{avgUsage}<span className="text-[10px] text-white/40 ml-0.5">kWh</span></p>
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 w-full relative min-h-0 pb-6">
                {/* Y-Axis */}
                <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between py-1 z-10 pointer-events-none w-14">
                    {[maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25, 0].map((val, i) => (
                        <div key={i} className="flex items-center justify-end pr-2 h-0">
                            <span className="text-[9px] font-bold text-white/50 tabular-nums">{Math.round(val).toLocaleString()}</span>
                        </div>
                    ))}
                </div>

                {/* Grid + Area */}
                <div className="absolute left-14 right-0 top-0 bottom-6">
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
                                {benchmark.toLocaleString()}kWh
                            </div>
                        </div>
                    </div>

                    {/* SVG Area Chart */}
                    <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <defs>
                            <linearGradient id="energyArea" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FACC15" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="#FACC15" stopOpacity="0.02" />
                            </linearGradient>
                        </defs>
                        {/* Gold dotted benchmark line */}
                        <line x1="0" y1={getY(benchmark)} x2="100" y2={getY(benchmark)} stroke="#C8A413" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" opacity="0.85" />
                        {areaPath && <path d={areaPath} fill="url(#energyArea)" />}
                        {linePath && <path d={linePath} fill="none" stroke="#FACC15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                        {points.map((p, i) => {
                            const isGood = data[i].usage <= benchmark;
                            return (
                                <g key={i} className="cursor-pointer" onClick={() => setSelectedDay(data[i])}>
                                    <circle cx={p.x} cy={p.y} r="1.8" fill={isGood ? '#FACC15' : '#ef4444'} stroke="#1c3933" strokeWidth="0.5"
                                        className="transition-all duration-300" style={{ opacity: selectedDay && selectedDay.day !== data[i].day ? 0.3 : 1 }} />
                                    <rect x={p.x - 8} y="0" width="16" height="100" fill="transparent" />
                                </g>
                            );
                        })}
                    </svg>

                    {/* Data point dots with hover labels */}
                    {data.map((t, i) => {
                        const xPct = getX(i, data.length);
                        const yPct = getY(Math.max(minVal, Math.min(maxVal, t.usage)));
                        const isGood = t.usage <= benchmark;
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
                                        <p className="text-[7px] font-black text-brand-gold uppercase tracking-wider">{t.day}</p>
                                        <p className={`text-[10px] font-black ${isGood ? 'text-brand-gold' : 'text-brand-alert'}`}>{t.usage.toLocaleString()}kWh</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Tooltip */}
                    {selectedDay && (() => {
                        const index = data.findIndex(d => d.day === selectedDay.day);
                        const xPct = getX(index, data.length);
                        const yPct = getY(Math.max(minVal, Math.min(maxVal, selectedDay.usage)));
                        const isTop = yPct < 30;
                        return (
                            <>
                                <div className="absolute inset-0 z-40 cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedDay(null); }} />
                                <div className="absolute bg-brand-dark border border-brand-gold/30 rounded-lg px-3 py-2 shadow-2xl z-50 animate-in fade-in zoom-in duration-200 min-w-[100px]"
                                    style={{ left: `${xPct}%`, top: isTop ? `${yPct + 8}%` : `${yPct - 8}%`, transform: `translate(-50%, ${isTop ? '0%' : '-100%'})` }}>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedDay(null); }} className="absolute -top-2 -right-2 w-5 h-5 bg-brand-dark border border-brand-gold/30 rounded-full flex items-center justify-center hover:border-brand-gold/60 transition-colors z-10">
                                        <XIcon size={10} className="text-white/50 hover:text-white" />
                                    </button>
                                    <p className="text-[8px] font-black text-brand-gold uppercase tracking-wider text-center mb-1">{selectedDay.day}</p>
                                    <p className={`text-base font-geometric font-black text-center ${selectedDay.usage <= benchmark ? 'text-brand-gold' : 'text-brand-alert'}`}>{selectedDay.usage.toLocaleString()}kWh</p>
                                    <p className={`text-[7px] font-black uppercase text-center mt-0.5 ${selectedDay.usage <= benchmark ? 'text-brand-gold/70' : 'text-brand-alert/70'}`}>
                                        {selectedDay.usage <= benchmark ? 'Efficient' : 'High Usage'}
                                    </p>
                                </div>
                            </>
                        );
                    })()}
                </div>

                {/* X-Axis labels */}
                <div className="absolute left-14 right-0 bottom-0 h-6">
                    {data.map((t, i) => (
                        <div key={t.day} className="absolute bottom-0 -translate-x-1/2 text-[8px] font-bold text-white uppercase tracking-wider" style={{ left: `${getX(i, data.length)}%` }}>
                            {t.day}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EnergyUsageTemplateChart;
