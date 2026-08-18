import React, { useState, useMemo } from 'react';
import { Info, User, X as XIcon } from 'lucide-react';

interface AvgCheckData {
    day: string;
    restaurant: number;
    bar: number;
    banquets: number;
    rollingAverage: number;
}

interface AvgCheckTemplateChartProps {
    data: AvgCheckData[];
    benchmark: number;
}

const AvgCheckTemplateChart: React.FC<AvgCheckTemplateChartProps> = ({ data, benchmark }) => {
    const [selectedDay, setSelectedDay] = useState<AvgCheckData | null>(null);

    // Axis Logic: $30 to $80
    const minVal = 30;
    const maxVal = 80;
    const range = maxVal - minVal;

    const getY = (val: number) => 100 - ((val - minVal) / range) * 100;
    const getX = (index: number, total: number) => 10 + (index / (total - 1)) * 80;

    // Logic: Alert if something is off? Maybe if Rolling Avg < Benchmark?
    const hasAlert = data.some(d => d.rollingAverage < benchmark); // Alert if trend is below benchmark

    // Calculate Weekly Average Check (Cumulative Value?)
    const weeklyCheck = useMemo(() => {
        const avg = data.reduce((acc, curr) => acc + curr.rollingAverage, 0) / data.length;
        return avg.toFixed(2);
    }, [data]);

    return (
        <div className="bg-[#0f2420] border border-brand-gold/60 p-6 sm:p-8 rounded-[35px] shadow-2xl space-y-4 relative group w-full h-full flex flex-col" style={{ overflow: 'visible', position: 'relative' }}>
            {/* Header Section */}
            <div className="flex justify-between items-start z-20 relative">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-eco/10 flex items-center justify-center border border-brand-eco/20 shadow-[0_0_15px_rgba(119,177,57,0.1)]">
                        <User size={18} className="text-brand-eco" />
                    </div>
                    <div>
                        <h3 className="text-lg font-geometric font-black text-white uppercase tracking-tight">AVG CHECK</h3>
                        <p className="text-[9px] font-black text-brand-gold uppercase tracking-[0.2em] mt-0.5">Rolling Monthly Average Check</p>
                        <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1.5 bg-brand-gold/10 px-2 py-0.5 rounded-md border border-brand-gold/20">
                                <span className="text-[9px] font-black text-brand-gold uppercase tracking-widest">Benchmark: <span className="text-white">${benchmark}</span></span>
                            </div>
                            {/* Weekly Check Legend */}
                            <div className="flex items-center gap-1.5 bg-brand-gold/10 px-2 py-0.5 rounded-md border border-brand-gold/20">
                                <span className="text-[9px] font-black text-brand-gold uppercase tracking-widest">Weekly Check: <span className="text-white">${weeklyCheck}</span></span>
                            </div>

                            {selectedDay && (
                                <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest animate-in fade-in slide-in-from-left-2">
                                    | {selectedDay.day}: <span className={selectedDay.rollingAverage >= benchmark ? "text-brand-eco" : "text-brand-alert"}>${selectedDay.rollingAverage.toFixed(2)}</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

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
            <div className="flex-1 w-full relative min-h-0 pb-8">
                {/* Y-Axis Labels - $30 - $80 */}
                <div className="absolute left-[-15px] lg:left-0 top-0 bottom-6 flex flex-col justify-between py-1 z-10 pointer-events-none">
                    {[80, 70, 60, 50, 40, 30].map((val) => (
                        <div key={val} className="relative flex items-center justify-end pr-4 h-0">
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">${val}</span>
                            <div className="absolute right-0 w-2 h-[1px] bg-white/10"></div>
                        </div>
                    ))}
                </div>

                {/* Grid Lines */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
                    {[80, 70, 60, 50, 40, 30].map((val) => (
                        <div key={val} className="w-full border-t border-white/5 h-0"></div>
                    ))}
                </div>

                {/* Benchmark Line */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 z-10 pointer-events-none">
                    <div
                        className="absolute w-full border-t-2 border-brand-gold border-dotted opacity-80"
                        style={{ top: `${getY(benchmark)}%`, transform: 'translateY(-50%)' }}
                    ></div>
                </div>

                {/* Chart SVG (Clustered Columns + Trend Line) */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 overflow-visible z-20">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        {/* Bars - Clustered */}
                        {data.map((t, i) => {
                            const x = getX(i, data.length);
                            const barWidth = 3; // Reduced for separation

                            // Adjust positioning for tighter grouping but no overlap
                            // 10-90% spread = ~13.3 units gap.
                            // Cluster width should be < 12.
                            // Left (-3.5), Center (0), Right (+3.5) -> Span 7 + 3 = 10 units width. nice gap.
                            const xRest = x - 3.5;
                            const xBar = x;
                            const xBanq = x + 3.5;

                            // Calculate heights
                            const yRest = getY(Math.max(minVal, Math.min(maxVal, t.restaurant)));
                            const hRest = 100 - yRest;

                            const yBar = getY(Math.max(minVal, Math.min(maxVal, t.bar)));
                            const hBar = 100 - yBar;

                            const yBanq = getY(Math.max(minVal, Math.min(maxVal, t.banquets)));
                            const hBanq = 100 - yBanq;

                            return (
                                <g key={i} className="cursor-pointer group/point" onClick={(e) => { e.stopPropagation(); setSelectedDay(t); }}>
                                    {/* Restaurant Bar (Green) */}
                                    <rect
                                        x={xRest - barWidth / 2}
                                        y={yRest}
                                        width={barWidth}
                                        height={hRest}
                                        fill="#77B139" // Brand Eco Green
                                        className="transition-all duration-300 opacity-80 hover:opacity-100"
                                    />
                                    {/* Bar Bar (Orange) */}
                                    <rect
                                        x={xBar - barWidth / 2}
                                        y={yBar}
                                        width={barWidth}
                                        height={hBar}
                                        fill="#F97316" // Orange-500
                                        className="transition-all duration-300 opacity-80 hover:opacity-100"
                                    />
                                    {/* Banquets Bar (Bright Brown) */}
                                    <rect
                                        x={xBanq - barWidth / 2}
                                        y={yBanq}
                                        width={barWidth}
                                        height={hBanq}
                                        fill="#CD853F" // Peru (Bright Brown)
                                        className="transition-all duration-300 opacity-80 hover:opacity-100"
                                    />

                                    {/* Hit Area - Precise (Width ~12) */}
                                    {/* Center at x. Width 12 covers the cluster (x-6 to x+6) */}
                                    <rect x={x - 6} y="0" width="12" height="100" fill="transparent" />
                                </g>
                            );
                        })}

                        {/* Trend Line (Rolling Average) */}
                        <path
                            d={`M ${data.map((d, i) => `${getX(i, data.length)} ${getY(Math.max(minVal, Math.min(maxVal, d.rollingAverage)))}`).join(' L ')}`}
                            fill="none"
                            stroke="#FACC15" // Brand Gold
                            strokeWidth="2"
                            className="drop-shadow-[0_0_4px_rgba(250,204,21,0.5)]"
                        />
                        {/* Trend Points */}
                        {data.map((t, i) => (
                            <circle
                                key={i}
                                cx={getX(i, data.length)}
                                cy={getY(Math.max(minVal, Math.min(maxVal, t.rollingAverage)))}
                                r="2"
                                fill="#152E2A"
                                stroke="#FACC15"
                                strokeWidth="1"
                            />
                        ))}

                    </svg>

                    {/* Pop-up Info */}
                    {selectedDay && (() => {
                        const index = data.findIndex(d => d.day === selectedDay.day);
                        const xPct = getX(index, data.length);
                        // Anchor to the highest bar or the trend line? Let's anchor to Trend Line.
                        const yVal = selectedDay.rollingAverage;
                        const clampedVal = Math.max(minVal, Math.min(maxVal, yVal));
                        const yPct = getY(clampedVal);

                        const isTop = yPct < 30;
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
                                <div className="flex justify-between items-center mb-1 border-b border-white/10 pb-1">
                                    <span className="text-[7px] font-black text-brand-gold uppercase tracking-wider">{selectedDay.day} Check</span>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedDay(null); }} className="pointer-events-auto">
                                        <XIcon size={8} className="text-gray-500 hover:text-white transition-colors" />
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[7px] uppercase font-bold text-brand-gold border-b border-white/5 pb-1">
                                        <span>Rolling Avg</span>
                                        <span>${selectedDay.rollingAverage.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-[7px] uppercase font-bold text-[#77B139]">
                                        <span>Restaurant</span>
                                        <span>${selectedDay.restaurant}</span>
                                    </div>
                                    <div className="flex justify-between text-[7px] uppercase font-bold text-[#F97316]">
                                        <span>Bar</span>
                                        <span>${selectedDay.bar}</span>
                                    </div>
                                    <div className="flex justify-between text-[7px] uppercase font-bold text-[#CD853F]">
                                        <span>Banquets</span>
                                        <span>${selectedDay.banquets}</span>
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

export default AvgCheckTemplateChart;
