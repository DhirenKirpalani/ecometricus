import React, { useState, useMemo } from 'react';
import { Info, Smile, X as XIcon } from 'lucide-react';
import { Outlet } from '../types';

interface SentimentData {
    day: string;
    rating_value: number;
    outlet_code?: string;
}

interface CustomerSentimentChartProps {
    data: SentimentData[];
    benchmark?: number;
    outlets?: Outlet[];
}

const STRICT_OUTLETS: Outlet[] = [
    { name: 'Royal', code: 'ROY02', color_hex: '#FF914D' },     // Orange
    { name: 'Fisher\'s', code: 'FISH01', color_hex: '#C8A413' }, // Gold
    { name: 'Ralph\'s', code: 'RAL03', color_hex: '#77B139' },   // Green
    { name: 'Gusto', code: 'GUS04', color_hex: '#718096' }      // Grey
];

const CustomerSentimentChart: React.FC<CustomerSentimentChartProps> = ({ data, benchmark = 4.5, outlets: _ignoredOutlets = [] }) => {
    // Force use of strict outlets to guarantee design requirements and mock data mapping
    const outlets = STRICT_OUTLETS;
    const [selectedDay, setSelectedDay] = useState<SentimentData | null>(null);

    // Y-Axis Configuration (3.0 - 5.0)
    const minVal = 3.0;
    const maxVal = 5.0;
    const range = maxVal - minVal;

    // Helper to calculate Y position (top%)
    const getY = (val: number) => {
        const clamped = Math.max(minVal, Math.min(val, maxVal));
        return 100 - ((clamped - minVal) / range) * 100;
    };

    // Strict X-Axis Placement (Matches others: 10% to 90% spread)
    const getX = (index: number, total: number) => 10 + (index / (Math.max(total - 1, 1))) * 80;

    // Alert Logic: Show attention if any day is BELOW benchmark
    const hasAlert = useMemo(() => {
        return data.some(d => d.rating_value < benchmark);
    }, [data, benchmark]);

    // Group Data for Multi-Series
    const seriesData = useMemo(() => {
        const grouped: Record<string, SentimentData[]> = {};

        // Initialize for all known outlets to ensure colors match even if no data
        outlets.forEach(o => { grouped[o.code] = []; });

        data.forEach(d => {
            if (d.outlet_code && grouped[d.outlet_code]) {
                grouped[d.outlet_code].push(d);
            }
        });
        return grouped;
    }, [data, outlets]);

    return (
        <div className="bg-[#0f2420] border border-brand-gold/60 p-6 sm:p-8 rounded-[35px] shadow-2xl space-y-4 relative group w-full h-full flex flex-col" style={{ overflow: 'hidden', position: 'relative' }} onClick={() => setSelectedDay(null)}>
            {/* Header */}
            <div className="flex justify-between items-start z-20 relative shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-eco/10 flex items-center justify-center border border-brand-eco/20 shadow-[0_0_15px_rgba(119,177,57,0.1)]">
                        {/* Bright green smiley/sentiment icon */}
                        <Smile size={18} className="text-brand-eco" />
                    </div>
                    <div>
                        <h3 className="text-lg font-geometric font-black text-white uppercase tracking-tight">CUSTOMER SENTIMENT</h3>
                        <p className="text-[9px] font-black text-brand-gold uppercase tracking-[0.2em] mt-0.5">Performance Variance vs regional benchmark</p>
                        <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1.5 bg-brand-gold/10 px-2 py-0.5 rounded-md border border-brand-gold/20">
                                <span className="text-[9px] font-black text-brand-gold uppercase tracking-widest">BENCHMARK: <span className="text-white">{benchmark.toFixed(1)} Rating</span></span>
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

            {/* Chart Container */}
            <div className="flex-1 w-full relative min-h-0">
                {/* Y-Axis Labels (3.0 - 5.0 in 0.5 steps) */}
                <div className="absolute left-[-15px] lg:left-0 top-0 bottom-6 flex flex-col justify-between py-1 z-10 pointer-events-none">
                    {[5.0, 4.5, 4.0, 3.5, 3.0].map((val) => (
                        <div key={val} className="relative flex items-center justify-end pr-4 h-0 group">
                            <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">{val.toFixed(1)}</span>
                            <div className="absolute right-0 w-2 h-[1px] bg-white/10"></div>
                        </div>
                    ))}
                </div>

                {/* Grid Lines */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
                    {[5.0, 4.5, 4.0, 3.5, 3.0].map((val) => (
                        <div key={val} className="w-full border-t border-brand-gold/5 h-0"></div>
                    ))}
                </div>

                {/* Benchmark Line (Gold Dotted at 4.5) */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 z-10 pointer-events-none">
                    <div
                        className="absolute w-full border-t-2 border-brand-gold border-dotted opacity-80"
                        style={{ top: `${getY(benchmark)}%`, transform: 'translateY(-50%)' }}
                    ></div>
                </div>

                {/* SVG Chart Area */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 overflow-visible z-20">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        {/* MULTI-SERIES RENDERING */}
                        {(() => {
                            // Day Mapping for correct X-position
                            const dayMap: { [key: string]: number } = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };

                            return Object.entries(seriesData).map(([outletCode, points]) => {
                                if (points.length < 1) return null;
                                const outlet = outlets.find(o => o.code === outletCode);
                                const color = outlet?.color_hex || '#FFFFFF';

                                // Sort points to ensure line is drawn in order
                                const sortedPoints = [...points].sort((a, b) => (dayMap[a.day] || 0) - (dayMap[b.day] || 0));

                                const polyPoints = sortedPoints.map((p) => {
                                    const dayIndex = dayMap[p.day] !== undefined ? dayMap[p.day] : 0;
                                    return `${getX(dayIndex, 7)},${getY(p.rating_value)}`;
                                }).join(' ');

                                return (
                                    <g key={outletCode} className="group/line hover:opacity-100 transition-opacity duration-300">
                                        <polyline
                                            fill="none"
                                            stroke={color}
                                            strokeWidth="0.5"
                                            strokeLinejoin="round"
                                            strokeLinecap="round"
                                            points={polyPoints}
                                            className="opacity-90 hover:stroke-[1.5] transition-all duration-300"
                                        />
                                        {sortedPoints.map((p, i) => {
                                            const dayIndex = dayMap[p.day] !== undefined ? dayMap[p.day] : 0;
                                            const cx = getX(dayIndex, 7);
                                            const cy = getY(p.rating_value);
                                            const isSelected = selectedDay && selectedDay.day === p.day && selectedDay.outlet_code === p.outlet_code;

                                            return (
                                                <g key={i} className="cursor-pointer group/point" onClick={(e) => { e.stopPropagation(); setSelectedDay(p); }}>
                                                    <circle cx={cx} cy={cy} r="8" fill="transparent" />
                                                    <circle
                                                        cx={cx} cy={cy}
                                                        r={isSelected ? "3" : "0"}
                                                        fill={color}
                                                        className="opacity-30 transition-all duration-300"
                                                    />
                                                    <circle
                                                        cx={cx} cy={cy}
                                                        r="1"
                                                        fill="#152E2A"
                                                        stroke={color}
                                                        strokeWidth="1"
                                                        className="transition-all duration-300 hover:r-[2px]"
                                                    />
                                                </g>
                                            );
                                        })}
                                    </g>
                                );
                            });
                        })()}
                    </svg>

                    {/* Pop-up Info */}
                    {selectedDay && (() => {
                        // Find index to calculate X position
                        const dayMap: { [key: string]: number } = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
                        const index = dayMap[selectedDay.day] !== undefined ? dayMap[selectedDay.day] : 0;

                        const xPct = getX(index, 7);
                        const yPct = getY(selectedDay.rating_value);

                        // Vertical Logic
                        const isTop = yPct < 35;
                        const topPosition = isTop ? `${yPct + 10}%` : `${yPct - 15}%`;
                        const verticalTranslate = isTop ? '0%' : '-100%';

                        // Horizontal Logic
                        const horizontalTranslate = `-${xPct}%`;

                        const outletName = outlets.find(o => o.code === selectedDay.outlet_code)?.name;

                        return (
                            <div
                                className="absolute bg-[#152E2A] border border-brand-gold/60 rounded-lg px-4 py-3 shadow-2xl z-[50] animate-in fade-in zoom-in duration-200 min-w-[140px] pointer-events-none"
                                style={{
                                    left: `${xPct}%`,
                                    top: topPosition,
                                    transform: `translate(${horizontalTranslate}, ${verticalTranslate})`,
                                    maxWidth: '180px'
                                }}
                            >
                                <div className="flex justify-between items-center mb-2 border-b border-brand-gold/10 pb-1">
                                    <span className="text-[9px] font-black text-brand-gold uppercase tracking-wider">{selectedDay.day} Status</span>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedDay(null); }} className="pointer-events-auto">
                                        <XIcon size={10} className="text-gray-500 hover:text-white transition-colors" />
                                    </button>
                                </div>
                                <div className="text-center">
                                    {outletName && <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{outletName}</div>}
                                    <div className="text-xl font-geometric font-black text-white">{selectedDay.rating_value.toFixed(1)}</div>
                                    <span className="block text-[7px] font-bold text-gray-500 uppercase">Rating</span>
                                    {selectedDay.rating_value < benchmark && (
                                        <div className="text-[8px] font-black uppercase mt-1 text-brand-alert flex flex-col gap-0.5">
                                            <span>Attention Alert</span>
                                            <span className="opacity-80">Below Target</span>
                                        </div>
                                    )}
                                    {selectedDay.rating_value >= benchmark && (
                                        <div className="text-[8px] font-black uppercase mt-1 text-brand-energy">Exceeding Benchmark</div>
                                    )}
                                </div>
                                <div
                                    className={`absolute w-3 h-3 bg-[#152E2A] border-brand-gold/60 rotate-45`}
                                    style={{
                                        left: `${xPct}%`,
                                        bottom: isTop ? 'auto' : '-7px',
                                        top: isTop ? '-7px' : 'auto',
                                        borderRightWidth: isTop ? '0' : '1px',
                                        borderBottomWidth: isTop ? '0' : '1px',
                                        borderLeftWidth: isTop ? '1px' : '0',
                                        borderTopWidth: isTop ? '1px' : '0',
                                        transform: 'translateX(-50%)'
                                    }}
                                ></div>
                            </div>
                        );
                    })()}

                </div>

                {/* X-Axis Labels */}
                <div className="absolute bottom-[-20px] left-0 right-0 flex justify-between px-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                        <div
                            key={day}
                            className="absolute bottom-0 -translate-x-1/2 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center"
                            style={{ left: `${getX(i, 7)}%` }}
                        >
                            {day}
                        </div>
                    ))}
                </div>
            </div>

            {/* Admin Legend */}
            {outlets.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-4 mt-2 pt-4 border-t border-brand-gold/5 z-20">
                    {outlets.map(outlet => (
                        <div key={outlet.code} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-brand-gold/5">
                            <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_5px_rgba(255,255,255,0.2)]" style={{ backgroundColor: outlet.color_hex || '#fff' }} />
                            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">{outlet.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomerSentimentChart;
