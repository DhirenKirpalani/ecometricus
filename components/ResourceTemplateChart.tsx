import React, { useState, useMemo } from 'react';
import { Info, Cloud, X as XIcon } from 'lucide-react';
import { Outlet } from '../types';

export interface ResourceData {
    day: string;
    "ROYAL": number;
    "FISHER'S": number;
    "RALPH'S": number;
    "GUSTO": number;
}

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

    const getY = (val: number) => 100 - ((val - minVal) / range) * 100;
    const getX = (index: number, total: number) => 10 + (index / (total - 1)) * 80;

    const hasAlert = data.some(d => (d["ROYAL"] + d["FISHER'S"] + d["RALPH'S"] + d["GUSTO"]) > benchmark);

    const weeklyTotal = useMemo(() => {
        return data.reduce((acc, curr) => acc + curr["ROYAL"] + curr["FISHER'S"] + curr["RALPH'S"] + curr["GUSTO"], 0).toLocaleString();
    }, [data]);

    const COLORS = useMemo(() => {
        const map: Record<string, string> = {
            "ROYAL": '#FF914D',
            "FISHER'S": '#C8A413',
            "RALPH'S": '#77B139',
            "GUSTO": '#718096'
        };
        
        if (allOutlets) {
            allOutlets.forEach(o => {
                const clean = o.name.toUpperCase();
                if (map[clean]) map[clean] = o.color_hex;
                if (clean.includes('ROYAL')) map["ROYAL"] = '#FF914D';
            });
        }
        return map;
    }, [allOutlets]);

    const yAxisLabels = useMemo(() => {
        const steps = 6;
        const labels = [];
        for (let i = steps; i >= 0; i--) {
            labels.push(Math.round(minVal + (i / steps) * range));
        }
        return labels;
    }, [minVal, maxVal, range]);

    return (
        <div className="bg-[#0f2420] border border-brand-gold/60 p-6 sm:p-8 rounded-[35px] shadow-2xl space-y-4 relative group w-full h-full flex flex-col" style={{ overflow: 'visible' }}>
            {/* Header Section */}
            <div className="flex justify-between items-start z-20 relative">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-500/10 flex items-center justify-center border border-gray-500/20">
                        {icon}
                    </div>
                    <div>
                        <h3 className="text-lg font-geometric font-black text-white uppercase tracking-tight">{title}</h3>
                        <p className="text-[9px] font-black text-brand-gold uppercase tracking-[0.2em] mt-0.5">{subtitle}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1.5 bg-brand-gold/10 px-2 py-0.5 rounded-md border border-brand-gold/20">
                                <span className="text-[9px] font-black text-brand-gold uppercase tracking-widest">Benchmark: <span className="text-white">{benchmark.toLocaleString()} {unit}</span></span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-brand-gold/10 px-2 py-0.5 rounded-md border border-brand-gold/20">
                                <span className="text-[9px] font-black text-brand-gold uppercase tracking-widest">Weekly: <span className="text-white">{weeklyTotal} {unit}</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                {hasAlert && (
                    <div className="bg-brand-alert/10 border border-brand-alert/30 px-3 py-1.5 rounded-lg flex items-center gap-2">
                        <Info size={12} className="text-brand-alert" />
                        <span className="text-[9px] font-black text-brand-alert uppercase tracking-widest">Attention</span>
                    </div>
                )}
            </div>

            {/* Chart Container */}
            <div className="flex-1 w-full relative min-h-0 pt-4">
                {/* Y-Axis Labels */}
                <div className="absolute left-[-15px] lg:left-0 top-0 bottom-6 flex flex-col justify-between py-1 z-10 pointer-events-none">
                    {yAxisLabels.map((val) => (
                        <div key={val} className="relative flex items-center justify-end pr-4 h-0">
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{val.toLocaleString()}</span>
                            <div className="absolute right-0 w-2 h-[1px] bg-white/10"></div>
                        </div>
                    ))}
                </div>

                {/* Grid Lines */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
                    {yAxisLabels.map((_, i) => (
                        <div key={i} className="w-full border-t border-white/5 h-0"></div>
                    ))}
                </div>

                {/* Benchmark Line */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 z-10 pointer-events-none">
                    <div
                        className="absolute w-full border-t-2 border-brand-gold border-dotted opacity-80 shadow-[0_0_8px_rgba(200,164,19,0.5)]"
                        style={{ top: `${getY(benchmark)}%` }}
                    ></div>
                </div>

                {/* Chart SVG (Stacked Bars) */}
                <div className="absolute left-[40px] right-0 top-0 bottom-6 overflow-visible z-20">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        {data.map((t, i) => {
                            const x = getX(i, data.length);
                            const renderRect = (startVal: number, endVal: number, color: string) => {
                                const effectiveStart = Math.max(startVal, minVal);
                                const effectiveEnd = Math.min(endVal, maxVal);
                                if (effectiveEnd <= effectiveStart) return null;
                                const yTop = getY(effectiveEnd);
                                const yBottom = getY(effectiveStart);
                                return (
                                    <rect key={`${i}-${color}`} x={x - 5} y={yTop} width="10" height={yBottom - yTop} fill={color} className="opacity-90 hover:opacity-100 transition-opacity" />
                                );
                            };

                            const v1 = t["ROYAL"];
                            const v2 = v1 + t["FISHER'S"];
                            const v3 = v2 + t["RALPH'S"];
                            const v4 = v3 + t["GUSTO"];

                            return (
                                <g key={i} className="cursor-pointer" onClick={() => setSelectedDay(t)}>
                                    {renderRect(0, v1, COLORS["ROYAL"])}
                                    {renderRect(v1, v2, COLORS["FISHER'S"])}
                                    {renderRect(v2, v3, COLORS["RALPH'S"])}
                                    {renderRect(v3, v4, COLORS["GUSTO"])}
                                    {v4 > benchmark && (
                                        <g transform={`translate(${x}, ${getY(v4) - 8})`}>
                                            <circle r="5" fill="#FF4D4D" />
                                            <text y="2" textAnchor="middle" fill="white" className="text-[6px] font-black">!</text>
                                        </g>
                                    )}
                                    <rect x={x - 10} y="0" width="20" height="100" fill="transparent" />
                                </g>
                            );
                        })}
                    </svg>

                    {/* Simple Tooltip (Uppercase) */}
                    {selectedDay && (
                        <div className="absolute bg-[#152E2A] border border-brand-gold/60 rounded-lg p-3 shadow-2xl z-50 text-[8px] font-bold uppercase pointer-events-none"
                             style={{ left: `${getX(data.findIndex(d => d.day === selectedDay.day), data.length)}%`, top: '10%' }}>
                            <div className="text-brand-gold mb-2 border-b border-white/10 pb-1">{selectedDay.day} BREAKDOWN</div>
                            <div className="space-y-1">
                                <div className="flex justify-between gap-4 text-[#FF914D]"><span>ROYAL</span><span>{selectedDay["ROYAL"].toFixed(1)}</span></div>
                                <div className="flex justify-between gap-4 text-[#D3AF37]"><span>FISHER'S</span><span>{selectedDay["FISHER'S"].toFixed(1)}</span></div>
                                <div className="flex justify-between gap-4 text-[#77B139]"><span>RALPH'S</span><span>{selectedDay["RALPH'S"].toFixed(1)}</span></div>
                                <div className="flex justify-between gap-4 text-[#718096]"><span>GUSTO</span><span>{selectedDay["GUSTO"].toFixed(1)}</span></div>
                                <div className="border-t border-white/10 pt-1 mt-1 flex justify-between text-white"><span>TOTAL</span><span>{(selectedDay["ROYAL"] + selectedDay["FISHER'S"] + selectedDay["RALPH'S"] + selectedDay["GUSTO"]).toFixed(1)}</span></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* X-Axis Labels (Uppercase Restoration) */}
                <div className="absolute left-[40px] right-0 bottom-0 h-4 flex justify-between items-end">
                    {data.map((t, i) => (
                        <div key={t.day} className="text-[7px] font-black text-white/60 uppercase tracking-widest w-10 text-center" style={{ left: `${getX(i, data.length)}%`, position: 'absolute', transform: 'translateX(-50%)' }}>
                            {t.day}
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-white/5 bg-black/10 rounded-b-[20px] py-4">
                {Object.entries(COLORS).map(([name, color]) => (
                    <div key={name} className="flex items-center gap-2">
                        <div className="w-2.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/60">{name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResourceTemplateChart;
