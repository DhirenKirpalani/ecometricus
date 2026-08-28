import React, { useState, useMemo } from 'react';
import { Info, DollarSign, X as XIcon } from 'lucide-react';
import { Outlet } from '../types';

interface PROFIT_MARGINS_DATA {
    day: string;
    profitMargin: number;
    outlet_code?: string;
    created_at?: string;
}

interface ProfitMarginLuxuryChartProps {
    data: PROFIT_MARGINS_DATA[];
    BENCHMARK_VALUE: number;
    outlets: Outlet[];
}

const ProfitMarginLuxuryChart: React.FC<ProfitMarginLuxuryChartProps> = ({ data, BENCHMARK_VALUE, outlets: _propsOutlets }) => {
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

    // Enforce strict outlets to guarantee exact colors as requested
    const outlets = [
        { id: '1', name: 'Royal', code: 'ROY02', color_hex: '#FF914D', country: 'Thai', type: 'Fine' },
        { id: '2', name: 'Fisher\'s', code: 'FISH01', color_hex: '#C8A413', country: 'Thai', type: 'Fine' },
        { id: '3', name: 'Ralph\'s', code: 'RAL03', color_hex: '#77B139', country: 'Thai', type: 'Fine' },
        { id: '4', name: 'Gusto', code: 'GUS04', color_hex: '#718096', country: 'Thai', type: 'Fine' }
    ];

    // Y-Axis Configuration: Fixed 0% to 40% (Extra Luxury Pricing Power)
    const MIN_Y = 0;
    const MAX_Y = 40;
    const RANGE = MAX_Y - MIN_Y;

    const getY = (val: number) => 100 - ((val - MIN_Y) / RANGE) * 100;
    // Center the bar horizontally if there's only one day
    const getX = (index: number, total: number) => total === 1 ? 50 : 10 + (index / (Math.max(total - 1, 1))) * 80;

    // Group and Stack Data - Full Week Restored
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Robust day matcher (handles "Sun", "Sunday", "SUN", etc.)
    const getStandardDay = (dayStr: string) => {
        const d = dayStr.trim().toLowerCase().slice(0, 3);
        const map: Record<string, string> = {
            'sun': 'Sun', 'mon': 'Mon', 'tue': 'Tue', 'wed': 'Wed', 'thu': 'Thu', 'fri': 'Fri', 'sat': 'Sat'
        };
        return map[d] || null;
    };

    const stackedData = useMemo(() => {
        const grouped: Record<string, Record<string, number>> = {};

        // Initialize days
        days.forEach(day => {
            grouped[day] = {};
            outlets.forEach(o => { grouped[day][o.code] = 0; });
        });

        // Fill data with robust day matching
        data.forEach(d => {
            const standardDay = getStandardDay(d.day);
            // ONLY try to access and set if we actually initialized this day (i.e., 'Mon')
            if (standardDay && d.outlet_code && grouped[standardDay]) {
                grouped[standardDay][d.outlet_code] = d.profitMargin;
            }
        });

        // Convert to individual segments (not stacked, but overlapping from back to front)
        return days.map(day => {
            let total = 0;
            const segments = outlets.map(o => {
                const val = grouped[day]?.[o.code] || 0;
                total += val;
                return {
                    outletCode: o.code,
                    value: val,
                    endY: val, // Absolute value, no longer stacked height
                    color: o.color_hex
                };
            }).sort((a, b) => b.value - a.value); // Sort highest to lowest to render back-to-front

            return { day, segments, total: total };
        });
    }, [data, outlets]);

    // Check for alerts (Any outlet BELOW BENCHMARK_VALUE)
    const hasAlert = data.some(d => d.profitMargin < BENCHMARK_VALUE);

    return (
        <div className="bg-[#0f2420] border border-brand-gold/60 p-6 sm:p-8 rounded-[35px] shadow-2xl space-y-4 relative group w-full h-full flex flex-col" style={{ overflow: 'hidden', position: 'relative' }}>
            {/* Header Section */}
            <div className="flex justify-between items-start z-20 relative">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-brand-eco/10 flex items-center justify-center border border-brand-eco/20 shadow-[0_0_15px_rgba(119,177,57,0.1)]">
                        <DollarSign size={24} className="text-brand-eco" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-geometric font-black text-white uppercase tracking-tight">PROFIT MARGINS</h3>
                        <p className="text-xs font-black text-brand-gold/60 uppercase tracking-[0.2em] mt-1">Luxury Boutique Performance Metrics</p>
                        <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1.5 bg-brand-gold/10 px-3 py-1 rounded-md border border-brand-gold/20">
                                <span className="text-xs font-black text-brand-gold uppercase tracking-widest">BENCHMARK <span className="text-white">{BENCHMARK_VALUE}%</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attention Icon - Dynamic Logic */}
                {hasAlert && (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <div className="bg-brand-alert/10 border border-brand-alert/30 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-[0_0_10px_rgba(255,49,49,0.1)] cursor-pointer group/alert">
                            <Info size={12} className="text-brand-alert" />
                            <span className="text-[9px] font-black text-brand-alert uppercase tracking-widest group-hover/alert:underline">Attention</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Chart Area */}
            <div className="flex-1 w-full relative min-h-0">
                {/* Y-Axis Labels */}
                <div className="absolute left-[-15px] lg:left-0 top-0 bottom-6 flex flex-col justify-between py-1 z-10 pointer-events-none">
                    {[40, 30, 20, 10, 0].map((val) => (
                        <div key={val} className="relative flex items-center justify-end pr-4 h-0">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{val}%</span>
                            <div className="absolute right-0 w-2 h-[1px] bg-white/10"></div>
                        </div>
                    ))}
                </div>

                {/* Grid Lines */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
                    {[40, 30, 20, 10, 0].map((val) => (
                        <div key={val} className="w-full border-t border-brand-gold/5 h-0"></div>
                    ))}
                </div>

                {/* BENCHMARK Line (Elite 25%) */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 z-10 pointer-events-none">
                    <div
                        className="absolute w-full border-t-2 border-brand-gold border-dotted opacity-80"
                        style={{ top: `${getY(BENCHMARK_VALUE)}%`, transform: 'translateY(-50%)' }}
                    ></div>
                </div>

                {/* SVG Bars */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 overflow-visible z-20">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        {stackedData.map((d, i) => {
                            const x = getX(i, days.length);
                            return (
                                <g key={d.day} className="cursor-pointer group/bar" onClick={() => setSelectedDay(selectedDay === d.day ? null : d.day)}>
                                    {d.segments.map((seg, sIdx) => {
                                        const y = getY(seg.endY);
                                        const h = (seg.value / RANGE) * 100;
                                        return (
                                            <rect
                                                key={seg.outletCode}
                                                x={x - 6}
                                                y={y}
                                                width="12"
                                                height={Math.max(h, 0)}
                                                fill={seg.color}
                                                className="transition-all duration-300 opacity-80 hover:opacity-100"
                                                style={{ shapeRendering: 'crispEdges' }}
                                            />
                                        );
                                    })}
                                    {/* Hit Area */}
                                    <rect x={x - 15} y="0" width="30" height="100" fill="transparent" />
                                </g>
                            );
                        })}
                    </svg>

                    {/* Pop-up Info */}
                    {selectedDay && (() => {
                        const dayInfo = stackedData.find(d => d.day === selectedDay);
                        if (!dayInfo) return null;
                        const index = days.indexOf(selectedDay);
                        const xPct = getX(index, days.length);
                        const isRightSide = index >= 5;

                        return (
                            <div
                                className="absolute bg-brand-dark border border-brand-gold/60 rounded-xl p-4 shadow-2xl z-50 animate-in fade-in zoom-in duration-200 min-w-[180px]"
                                style={{
                                    left: `${xPct}%`,
                                    top: '20%',
                                    transform: `translateX(${isRightSide ? '-100%' : '0%'})`,
                                    marginLeft: isRightSide ? '-20px' : '20px'
                                }}
                            >
                                <div className="flex justify-between items-center mb-3 border-b border-brand-gold/10 pb-2">
                                    <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{selectedDay} Margins</span>
                                    <XIcon size={12} className="text-gray-500 cursor-pointer" onClick={() => setSelectedDay(null)} />
                                </div>
                                <div className="space-y-2">
                                    {dayInfo.segments.sort((a, b) => b.value - a.value).map(seg => (
                                        <div key={seg.outletCode} className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5" style={{ backgroundColor: seg.color }}></div>
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">{seg.outletCode}</span>
                                            </div>
                                            <span className={`text-[10px] font-black ${seg.value >= BENCHMARK_VALUE ? 'text-brand-eco' : 'text-brand-alert'}`}>
                                                {seg.value}%
                                            </span>
                                        </div>
                                    ))}
                                    <div className="pt-2 border-t border-brand-gold/10 flex justify-between items-center">
                                        <span className="text-[9px] font-black text-white uppercase tracking-widest">Avg Margin</span>
                                        <span className="text-xs font-black text-brand-gold">
                                            {(dayInfo.total / outlets.length).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* X-Axis Labels */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 bottom-[-25px] flex justify-between px-2">
                    {days.map((day, i) => (
                        <div
                            key={day}
                            className="absolute bottom-0 -translate-x-1/2 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center"
                            style={{ left: `${getX(i, days.length)}%` }}
                        >
                            {day}
                        </div>
                    ))}
                </div>
            </div>

            {/* Admin Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 mt-8 pt-6 border-t border-brand-gold/5 z-20">
                {outlets.map(outlet => (
                    <div key={outlet.code} className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5" style={{ backgroundColor: outlet.color_hex }} />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{outlet.name}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProfitMarginLuxuryChart;
