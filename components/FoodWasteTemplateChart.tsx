import React, { useState, useMemo } from 'react';
import { Info, Leaf, X as XIcon } from 'lucide-react';

interface FoodWasteData {
    day: string;
    waste: number; // Changed from profitMargin to waste
}

interface FoodWasteTemplateChartProps {
    data: FoodWasteData[];
    benchmark: number; // Should be 8
}

const FoodWasteTemplateChart: React.FC<FoodWasteTemplateChartProps> = ({ data, benchmark }) => {
    const [selectedDay, setSelectedDay] = useState<FoodWasteData | null>(null);

    // Axis Logic: 5kg to 25kg
    const minVal = 5;
    const maxVal = 25;
    const range = maxVal - minVal;

    const getY = (val: number) => 100 - ((val - minVal) / range) * 100;
    const getX = (index: number, total: number) => 10 + (index / (total - 1)) * 80;

    // Logic: Green if < Benchmark, Red if > Benchmark
    const hasAlert = data.some(d => d.waste > benchmark);

    // Calculate Cumulative Weekly Waste
    const weeklyWaste = useMemo(() => {
        return data.reduce((acc, curr) => acc + curr.waste, 0).toFixed(1);
    }, [data]);

    return (
        <div className="bg-[#0f2420] border border-brand-gold/60 p-6 sm:p-8 rounded-[35px] shadow-2xl space-y-4 relative group w-full h-full flex flex-col" style={{ overflow: 'visible', position: 'relative' }}>
            {/* Header Section */}
            <div className="flex justify-between items-start z-20 relative">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-eco/10 flex items-center justify-center border border-brand-eco/20 shadow-[0_0_15px_rgba(119,177,57,0.1)]">
                        <Leaf size={18} className="text-brand-eco" />
                    </div>
                    <div>
                        <h3 className="text-lg font-geometric font-black text-white uppercase tracking-tight">FOOD WASTE</h3>
                        <p className="text-[9px] font-black text-brand-gold uppercase tracking-[0.2em] mt-0.5">Daily Production Waste</p>
                        <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1.5 bg-brand-gold/10 px-2 py-0.5 rounded-md border border-brand-gold/20">
                                <span className="text-[9px] font-black text-brand-gold uppercase tracking-widest">Benchmark: <span className="text-white">{benchmark}kg</span></span>
                            </div>
                            {/* Weekly Waste Legend */}
                            <div className="flex items-center gap-1.5 bg-brand-gold/10 px-2 py-0.5 rounded-md border border-brand-gold/20">
                                <span className="text-[9px] font-black text-brand-gold uppercase tracking-widest">Weekly Waste: <span className="text-white">{weeklyWaste}kg</span></span>
                            </div>

                            {selectedDay && (
                                <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest animate-in fade-in slide-in-from-left-2">
                                    | {selectedDay.day}: <span className={selectedDay.waste <= benchmark ? "text-brand-eco" : "text-brand-alert"}>{selectedDay.waste}kg</span>
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
                {/* Y-Axis Labels - 5 to 25 */}
                <div className="absolute left-[-15px] lg:left-0 top-0 bottom-6 flex flex-col justify-between py-1 z-10 pointer-events-none">
                    {[25, 20, 15, 10, 5].map((val) => (
                        <div key={val} className="relative flex items-center justify-end pr-4 h-0">
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{val}kg</span>
                            <div className="absolute right-0 w-2 h-[1px] bg-white/10"></div>
                        </div>
                    ))}
                </div>

                {/* Grid Lines */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
                    {[25, 20, 15, 10, 5].map((val) => (
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

                {/* Chart SVG (Bars) */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 overflow-visible z-20">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        {data.map((t, i) => {
                            const x = getX(i, data.length);
                            const clampedWaste = Math.max(minVal, Math.min(maxVal, t.waste)); // Clamp for visual
                            const y = getY(clampedWaste);
                            const height = 100 - y;
                            const isGood = t.waste <= benchmark; // < 8 is green. > 8 is red. 8? Green.
                            // User strict: > 8Kg bar change to red.
                            const barColor = isGood ? '#77B139' : '#FF453A';

                            return (
                                <g key={i} className="cursor-pointer group/point" onClick={(e) => { e.stopPropagation(); setSelectedDay(t); }}>
                                    <rect
                                        x={x - 5.5}
                                        y={y}
                                        width="11"
                                        height={height}
                                        fill={barColor}
                                        rx="4"
                                        className="transition-all duration-300 opacity-80 hover:opacity-100 hover:scale-110 origin-bottom"
                                    />
                                    <rect x={x - 12} y="0" width="24" height="100" fill="transparent" />
                                </g>
                            );
                        })}
                    </svg>

                    {/* Pop-up Info */}
                    {selectedDay && (() => {
                        const index = data.findIndex(d => d.day === selectedDay.day);
                        const xPct = getX(index, data.length);
                        const clampedWaste = Math.max(minVal, Math.min(maxVal, selectedDay.waste));
                        const yPct = getY(clampedWaste);

                        const isTop = yPct < 25;
                        const topPosition = isTop ? `${yPct + 10}%` : `${yPct - 15}%`;
                        const verticalTranslate = isTop ? '0%' : '-100%';
                        const horizontalTranslate = `-${xPct}%`;

                        return (
                            <div
                                className="absolute bg-[#152E2A] border border-brand-gold/60 rounded-lg px-3 py-2 shadow-2xl z-[50] animate-in fade-in zoom-in duration-200 min-w-[120px] pointer-events-none"
                                style={{
                                    left: `${xPct}%`,
                                    top: topPosition,
                                    transform: `translate(${horizontalTranslate}, ${verticalTranslate})`,
                                    maxWidth: '140px'
                                }}
                            >
                                <div className="flex justify-between items-center mb-1 border-b border-white/10 pb-1">
                                    <span className="text-[7px] font-black text-brand-gold uppercase tracking-wider">{selectedDay.day} Waste</span>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedDay(null); }} className="pointer-events-auto">
                                        <XIcon size={8} className="text-gray-500 hover:text-white transition-colors" />
                                    </button>
                                </div>
                                <div className="text-center">
                                    <div className={`text-sm font-geometric font-black ${selectedDay.waste <= benchmark ? 'text-brand-eco' : 'text-brand-alert'}`}>{selectedDay.waste}kg</div>
                                    {selectedDay.waste > benchmark && (
                                        <div className="text-[6px] font-black uppercase mt-1 text-brand-alert flex flex-col gap-0.5">
                                            <span>Over Limit</span>
                                            <span className="opacity-80">Reduce Waste</span>
                                        </div>
                                    )}
                                    {selectedDay.waste <= benchmark && (
                                        <div className="text-[6px] font-black uppercase mt-1 text-brand-energy">Within Limits</div>
                                    )}
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

export default FoodWasteTemplateChart;
