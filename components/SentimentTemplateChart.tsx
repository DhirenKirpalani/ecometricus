import React, { useState } from 'react';
import { Info, Smile, TrendingUp, AlertTriangle, X as XIcon } from 'lucide-react';

interface SentimentData {
    day: string;
    sentiment: number;
}

interface SentimentTemplateChartProps {
    data: SentimentData[];
    benchmark: number;
}

const SentimentTemplateChart: React.FC<SentimentTemplateChartProps> = ({ data, benchmark }) => {
    const [selectedDay, setSelectedDay] = useState<SentimentData | null>(null);

    // Y-Axis Configuration (3.0 - 5.0)
    const MIN_Y = 3.0;
    const MAX_Y = 5.0;
    const RANGE = MAX_Y - MIN_Y;

    // Helper to calculate Y position (top%)
    const getY = (val: number) => {
        const clamped = Math.max(MIN_Y, Math.min(val, MAX_Y));
        return 100 - ((clamped - MIN_Y) / RANGE) * 100;
    };

    // Strict X-Axis Placement (Matches others: 10% to 90% spread)
    const getX = (index: number, total: number) => 10 + (index / (total - 1)) * 80;

    // Alert Logic: Show attention if any day is BELOW benchmark (< 4.5)
    // Note: User said "If rating <4.5 Benchmark 'Attention' alert."
    const hasAlert = data.some(d => d.sentiment < benchmark);

    return (
        <div className="bg-[#0f2420] border border-brand-gold/60 p-6 sm:p-8 rounded-[35px] shadow-2xl space-y-4 relative group w-full h-full flex flex-col" style={{ overflow: 'visible', position: 'relative' }}>

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
            <div className="flex-1 w-full relative min-h-0 pb-8">

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
                        <div key={val} className="w-full border-t border-white/5 h-0"></div>
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
                        {/* Line - Thinner and Stylish */}
                        <polyline
                            fill="none"
                            stroke="#77B139"
                            strokeWidth="1"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                            points={data.map((t, i) => `${getX(i, data.length)},${getY(t.sentiment)}`).join(' ')}
                            className="drop-shadow-[0_0_4px_rgba(119,177,57,0.3)]"
                        />

                        {/* Markers - Thinner, Stylish Rings (Dynamic like Food Cost) */}
                        {data.map((d, i) => {
                            const x = getX(i, data.length);
                            const y = getY(d.sentiment);
                            const isSelected = selectedDay?.day === d.day;

                            return (
                                <g key={i} className="cursor-pointer group/point" onClick={(e) => { e.stopPropagation(); setSelectedDay(d); }}>
                                    {/* Invisible hit area */}
                                    <circle cx={x} cy={y} r="12" fill="transparent" />
                                    {/* Outer Glow for selection */}
                                    <circle
                                        cx={x} cy={y}
                                        r={isSelected ? "4" : "0"}
                                        fill="#77B139"
                                        className="opacity-20 transition-all duration-300"
                                    />
                                    {/* Main Dot */}
                                    <circle
                                        cx={x} cy={y}
                                        r={isSelected ? "2.5" : "1.5"}
                                        fill="#152E2A"
                                        stroke="#77B139"
                                        strokeWidth="1"
                                        className="transition-all duration-300"
                                    />
                                </g>
                            );
                        })}
                    </svg>

                    {/* Pop-up Info (Confined) */}
                    {selectedDay && (() => {
                        const index = data.findIndex(d => d.day === selectedDay.day);

                        // Smart Positioning System:
                        const xPct = getX(index, data.length);
                        const yPct = getY(selectedDay.sentiment);

                        // Vertical Logic
                        const isTop = yPct < 35;
                        const topPosition = isTop ? `${yPct + 10}%` : `${yPct - 15}%`;
                        const verticalTranslate = isTop ? '0%' : '-100%';

                        // Horizontal Logic (Proportional)
                        const horizontalTranslate = `-${xPct}%`;

                        return (
                            <div
                                className="absolute bg-[#152E2A] border border-brand-gold/60 rounded-lg px-3 py-2 shadow-2xl z-[50] animate-in fade-in zoom-in duration-200 min-w-[100px] pointer-events-none"
                                style={{
                                    left: `${xPct}%`,
                                    top: topPosition,
                                    transform: `translate(${horizontalTranslate}, ${verticalTranslate})`,
                                    maxWidth: '120px'
                                }}
                            >
                                <div className="flex justify-between items-center mb-1 border-b border-white/10 pb-1">
                                    <span className="text-[7px] font-black text-brand-gold uppercase tracking-wider">{selectedDay.day} Status</span>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedDay(null); }} className="pointer-events-auto">
                                        <XIcon size={8} className="text-gray-500 hover:text-white transition-colors" />
                                    </button>
                                </div>
                                <div className="space-y-1 text-center">
                                    <span className="text-xl font-black text-white">{selectedDay.sentiment.toFixed(1)}</span>
                                    <span className="block text-[7px] font-bold text-gray-500 uppercase">Rating</span>
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

export default SentimentTemplateChart;
