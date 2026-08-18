import React, { useState } from 'react';
import { XIcon, TrendingUp, AlertCircle } from 'lucide-react';

interface SalesData {
    day: string;
    total: number;
    food: number;
    bev: number;
}

interface SalesTemplateChartProps {
    data: SalesData[];
    benchmark: number;
}

const SalesTemplateChart: React.FC<SalesTemplateChartProps> = ({ data, benchmark }) => {
    const [selectedDay, setSelectedDay] = useState<SalesData | null>(null);

    // Y-Axis Configuration ($10k - $35k)
    const MIN_Y = 10000;
    const MAX_Y = 35000;
    const RANGE = MAX_Y - MIN_Y;

    const getY = (val: number) => {
        const clamped = Math.max(MIN_Y, Math.min(val, MAX_Y));
        return 100 - ((clamped - MIN_Y) / RANGE) * 100;
    };

    // Strict X-Axis Placement (Matches Profit Margin: 10% to 90% spread)
    const getX = (index: number, total: number) => 10 + (index / (total - 1)) * 80;

    // Alert Logic: Show attention if any day is BELOW benchmark
    const hasAlert = data.some(d => d.total < benchmark);

    // Calculate Weekly Total
    const weeklyTotal = data.reduce((acc, cur) => acc + cur.total, 0);

    return (
        <div className="bg-[#0f2420] border border-brand-gold/60 p-6 sm:p-8 rounded-[35px] shadow-2xl space-y-4 relative group w-full h-full flex flex-col" style={{ overflow: 'visible', position: 'relative' }}>

            {/* Header */}
            <div className="flex justify-between items-start z-20 relative shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-eco/10 flex items-center justify-center border border-brand-eco/20 shadow-[0_0_15px_rgba(119,177,57,0.1)]">
                        <TrendingUp size={18} className="text-brand-eco" />
                    </div>
                    <div>
                        <h3 className="text-lg font-geometric font-black text-white uppercase tracking-tight">TOTAL OUTLET SALES</h3>
                        <p className="text-[9px] font-black text-brand-gold uppercase tracking-[0.2em] mt-0.5">Weekly Stacked Breakdown</p>
                        <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1.5 bg-brand-gold/10 px-2 py-0.5 rounded-md border border-brand-gold/20">
                                <span className="text-[9px] font-black text-brand-gold uppercase tracking-widest">Benchmark: <span className="text-white">${benchmark.toLocaleString()}</span></span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-brand-gold/10 px-2 py-0.5 rounded-md border border-brand-gold/20">
                                <span className="text-[9px] font-black text-brand-gold uppercase tracking-widest">Weekly Sales: <span className="text-white">${weeklyTotal.toLocaleString()}</span></span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Attention Icon - Dynamic Logic matching Profit Margin */}
                {hasAlert && (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <div className="bg-brand-alert/10 border border-brand-alert/30 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-[0_0_10px_rgba(255,49,49,0.1)] cursor-pointer group/alert">
                            <AlertCircle size={12} className="text-brand-alert" />
                            <span className="text-[9px] font-black text-brand-alert uppercase tracking-widest group-hover/alert:underline">Attention</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Chart Container */}
            <div className="flex-1 w-full relative min-h-0 pb-8">

                {/* Y-Axis Labels */}
                <div className="absolute left-[-15px] lg:left-0 top-0 bottom-6 flex flex-col justify-between py-1 z-10 pointer-events-none">
                    {[35000, 30000, 25000, 20000, 15000, 10000].map((val) => (
                        <div key={val} className="relative flex items-center justify-end pr-4 h-0 group">
                            <span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">${val / 1000}k</span>
                            <div className="absolute right-0 w-2 h-[1px] bg-white/10"></div>
                        </div>
                    ))}
                </div>

                {/* Grid Lines */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
                    {[35000, 30000, 25000, 20000, 15000, 10000].map((val) => (
                        <div key={val} className="w-full border-t border-white/5 h-0"></div>
                    ))}
                </div>

                {/* Benchmark Line (Gold Dotted) */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 z-10 pointer-events-none">
                    <div
                        className="absolute w-full border-t-2 border-brand-gold border-dotted opacity-80"
                        style={{ top: `${getY(benchmark)}%`, transform: 'translateY(-50%)' }}
                    ></div>
                </div>

                {/* SVG Chart Area */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 overflow-visible z-20">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        {data.map((d, i) => {
                            const x = getX(i, data.length);
                            const yTotal = getY(d.total); // Top of the stack
                            const totalHeight = 100 - yTotal;

                            // Stack Logic
                            const bevHeight = (d.bev / d.total) * totalHeight;
                            const foodHeight = (d.food / d.total) * totalHeight;

                            // SVG coordinates (0 is top)
                            // Top Rect is Bev
                            const bevY = yTotal;
                            // Bottom Rect is Food (starts where Bev ends)
                            const foodY = yTotal + bevHeight;

                            return (
                                <g key={i} className="cursor-pointer group/point" onClick={(e) => { e.stopPropagation(); setSelectedDay(d); }}>
                                    {/* Bev Rect (Orange) - Top Stack */}
                                    <rect
                                        x={x - 5.5}
                                        y={bevY}
                                        width="11"
                                        height={bevHeight}
                                        fill="#F97316" // Orange-500 (Matches Bar/Energy)
                                        className="transition-all duration-300 opacity-80 hover:opacity-100"
                                    />
                                    {/* Food Rect (Green) - Bottom Stack */}
                                    <rect
                                        x={x - 5.5}
                                        y={foodY}
                                        width="11"
                                        height={foodHeight}
                                        fill="#77B139" // Brand Eco Green
                                        className="transition-all duration-300 opacity-80 hover:opacity-100"
                                    />
                                    {/* Invisible hit area */}
                                    <rect x={x - 12} y="0" width="24" height="100" fill="transparent" />
                                </g>
                            );
                        })}
                    </svg>

                    {/* Pop-up Info (Confined) */}
                    {selectedDay && (() => {
                        const index = data.findIndex(d => d.day === selectedDay.day);

                        // Smart Positioning System:
                        const xPct = getX(index, data.length);
                        const yPct = getY(selectedDay.total);

                        // Vertical Logic
                        const isTop = yPct < 35;
                        const topPosition = isTop ? `${yPct + 10}%` : `${yPct - 15}%`;
                        const verticalTranslate = isTop ? '0%' : '-100%';

                        // Horizontal Logic (Proportional)
                        const horizontalTranslate = `-${xPct}%`;

                        return (
                            <div
                                className="absolute bg-[#152E2A] border border-brand-gold/60 rounded-lg px-3 py-2 shadow-2xl z-[50] animate-in fade-in zoom-in duration-200 min-w-[130px] pointer-events-none"
                                style={{
                                    left: `${xPct}%`,
                                    top: topPosition,
                                    transform: `translate(${horizontalTranslate}, ${verticalTranslate})`,
                                    maxWidth: '150px'
                                }}
                            >
                                <div className="flex justify-between items-center mb-1 border-b border-white/10 pb-1">
                                    <span className="text-[7px] font-black text-brand-gold uppercase tracking-wider">{selectedDay.day} Breakdown</span>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedDay(null); }} className="pointer-events-auto">
                                        <XIcon size={8} className="text-gray-500 hover:text-white transition-colors" />
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase">
                                        <span>Food</span>
                                        <span className="text-brand-eco">${selectedDay.food.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase">
                                        <span>Bev</span>
                                        <span className="text-[#FF914D]">${selectedDay.bev.toLocaleString()}</span>
                                    </div>
                                    <div className="border-t border-white/10 pt-1 flex justify-between text-[10px] font-black text-white uppercase">
                                        <span>Total</span>
                                        <span>${selectedDay.total.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div
                                    className={`absolute w-2.5 h-2.5 bg-[#152E2A] border-brand-gold/60 rotate-45`}
                                    style={{
                                        left: `${xPct}%`,
                                        bottom: isTop ? 'auto' : '-6px',
                                        top: isTop ? '-6px' : 'auto',
                                        borderRightWidth: isTop ? '0' : '1px',
                                        borderBottomWidth: isTop ? '0' : '1px',
                                        borderLeftWidth: isTop ? '1px' : '0',
                                        borderTopWidth: isTop ? '1px' : '0',
                                        transform: 'translateX(-50%)'
                                    }}
                                ></div>
                            </div>
                        )
                    })()}

                </div>

                {/* X-Axis Labels */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 bottom-0 h-6">
                    {data.map((t, i) => (
                        <div
                            key={t.day}
                            className="absolute bottom-0 -translate-x-1/2 text-[7px] font-black text-gray-500 uppercase tracking-widest text-center"
                            style={{ left: `${getX(i, data.length)}%` }}
                        >
                            {t.day}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SalesTemplateChart;
