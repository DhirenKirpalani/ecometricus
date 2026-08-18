import React, { useState, useMemo } from 'react';
import { Info, Users, X as XIcon } from 'lucide-react';
import { Outlet } from '../types';

interface LaborCostData {
    day: string;
    laborCost: number;
    outlet_code?: string;
}

interface LaborCostTemplateChartProps {
    data: LaborCostData[];
    benchmark: number;
    multiSeries?: boolean;
    outlets?: Outlet[];
}

const LaborCostTemplateChart: React.FC<LaborCostTemplateChartProps> = ({ data, benchmark, multiSeries = false, outlets = [] }) => {
    const [selectedDay, setSelectedDay] = useState<LaborCostData | null>(null);

    // Axis Logic: 20% to 40%
    const minVal = 20;
    const maxVal = 40;
    const range = maxVal - minVal;

    const getY = (val: number) => 100 - ((val - minVal) / range) * 100;

    // Logic for X-axis (distributed)
    const getX = (index: number, total: number) => 10 + (index / (Math.max(total - 1, 1))) * 80;

    const hasAlert = useMemo(() => {
        return data.some(d => d.laborCost > benchmark);
    }, [data, benchmark]);

    // Group Data for Multi-Series
    const seriesData = useMemo(() => {
        if (!multiSeries) return null;
        const grouped: Record<string, LaborCostData[]> = {};

        // Initialize for all known outlets to ensure colors match even if no data
        outlets.forEach(o => { grouped[o.code] = []; });

        data.forEach(d => {
            if (d.outlet_code && grouped[d.outlet_code]) {
                grouped[d.outlet_code].push(d);
            }
        });
        return grouped;
    }, [data, outlets, multiSeries]);

    return (
        <div className="bg-[#0f2420] border border-brand-gold/60 p-6 sm:p-8 rounded-[35px] shadow-2xl space-y-4 relative group w-full h-full flex flex-col" style={{ overflow: 'visible', position: 'relative' }} onClick={() => setSelectedDay(null)}>
            {/* Header Section */}
            <div className="flex justify-between items-start z-20 relative">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-brand-eco/10 flex items-center justify-center border border-brand-eco/20 shadow-[0_0_15px_rgba(119,177,57,0.1)]">
                        <Users size={24} className="text-brand-eco" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-geometric font-black text-white uppercase tracking-tight">LABOR COST</h3>
                        <p className="text-xs font-black text-brand-gold uppercase tracking-[0.2em] mt-1">Performance Variance vs regional benchmark</p>
                        <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1.5 bg-brand-gold/10 px-3 py-1 rounded-md border border-brand-gold/20">
                                <span className="text-xs font-black text-brand-gold uppercase tracking-widest">Benchmark: <span className="text-white">{benchmark}%</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                {hasAlert && (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <div className="bg-brand-alert/10 border border-brand-alert/30 px-4 py-2 rounded-lg flex items-center gap-2 shadow-[0_0_10px_rgba(255,49,49,0.1)] cursor-pointer group/alert">
                            <Info size={14} className="text-brand-alert" />
                            <span className="text-xs font-black text-brand-alert uppercase tracking-widest group-hover/alert:underline">Attention</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Chart Container */}
            <div className="flex-1 w-full relative min-h-0 pb-8">
                {/* Y-Axis Labels */}
                <div className="absolute left-[-15px] lg:left-0 top-0 bottom-6 flex flex-col justify-between py-1 z-10 pointer-events-none">
                    {[40, 35, 30, 25, 20].map((val) => (
                        <div key={val} className="relative flex items-center justify-end pr-4 h-0">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{val}%</span>
                            <div className="absolute right-0 w-2 h-[1px] bg-white/10"></div>
                        </div>
                    ))}
                </div>

                {/* Grid Lines */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
                    {[40, 35, 30, 25, 20].map((val) => (
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

                {/* Chart SVG */}
                <div className="absolute left-[30px] lg:left-[40px] right-0 top-0 bottom-6 overflow-visible z-20">
                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        {multiSeries && seriesData ? (
                            // MULTI-SERIES RENDERING
                            (() => {
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
                                        return `${getX(dayIndex, 7)},${getY(p.laborCost)}`;
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
                                                const cy = getY(p.laborCost);
                                                const isSelected = selectedDay && selectedDay.day === p.day && selectedDay.outlet_code === p.outlet_code;
                                                return (
                                                    <g key={i} className="cursor-pointer group/point" onClick={(e) => { e.stopPropagation(); setSelectedDay(p); }}>
                                                        <circle cx={cx} cy={cy} r="8" fill="transparent" />
                                                        <circle
                                                            cx={cx}
                                                            cy={cy}
                                                            r={isSelected ? "3" : "0"}
                                                            fill={color}
                                                            className="opacity-30 transition-all duration-300"
                                                        />
                                                        <circle
                                                            cx={cx}
                                                            cy={cy}
                                                            r="1"
                                                            fill="#0f2420"
                                                            stroke={color}
                                                            strokeWidth="1"
                                                            className="transition-all duration-300 hover:r-2"
                                                        />
                                                    </g>
                                                );
                                            })}
                                        </g>
                                    );
                                });
                            })()
                        ) : (
                            // SINGLE SERIES RENDERING
                            (() => {
                                const dayMap: { [key: string]: number } = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
                                const sortedData = [...data].sort((a, b) => (dayMap[a.day] || 0) - (dayMap[b.day] || 0));

                                return (
                                    <>
                                        <polyline
                                            fill="none"
                                            stroke="#FF914D"
                                            strokeWidth="0.5"
                                            strokeLinejoin="round"
                                            strokeLinecap="round"
                                            points={sortedData.map((t) => {
                                                const dayIndex = dayMap[t.day] !== undefined ? dayMap[t.day] : 0;
                                                return `${getX(dayIndex, 7)},${getY(t.laborCost)}`;
                                            }).join(' ')}
                                            className="drop-shadow-[0_0_4px_rgba(255,145,77,0.3)]"
                                        />
                                        {sortedData.map((t, i) => {
                                            const isSelected = selectedDay?.day === t.day;
                                            const dayIndex = dayMap[t.day] !== undefined ? dayMap[t.day] : 0;
                                            const cx = getX(dayIndex, 7);
                                            const cy = getY(t.laborCost);

                                            return (
                                                <g key={i} className="cursor-pointer group/point" onClick={(e) => { e.stopPropagation(); setSelectedDay(t); }}>
                                                    <circle cx={cx} cy={cy} r="12" fill="transparent" />
                                                    <circle
                                                        cx={cx}
                                                        cy={cy}
                                                        r={isSelected ? "3" : "0"}
                                                        fill="#FF914D"
                                                        className="opacity-20 transition-all duration-300"
                                                    />
                                                    <circle
                                                        cx={cx}
                                                        cy={cy}
                                                        r="1"
                                                        fill="#152E2A"
                                                        stroke="#FF914D"
                                                        strokeWidth="1"
                                                        className="transition-all duration-300 hover:r-2"
                                                    />
                                                </g>
                                            );
                                        })}
                                    </>
                                );
                            })()
                        )}
                    </svg>

                    {/* Pop-up Info */}
                    {selectedDay && (() => {
                        // Find index to calculate X position
                        let index = 0;
                        let totalPoints = data.length;

                        // If multi-series, filter data for this outlet
                        if (multiSeries && selectedDay.outlet_code) {
                            const outletData = data.filter(d => d.outlet_code === selectedDay.outlet_code);
                            index = outletData.findIndex(d => d.day === selectedDay.day);
                            totalPoints = outletData.length;
                        } else {
                            index = data.findIndex(d => d.day === selectedDay.day);
                        }

                        const xPct = getX(index, totalPoints);
                        const yPct = getY(selectedDay.laborCost);

                        // Vertical Logic
                        const isTop = yPct < 25;
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
                                <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-1">
                                    <span className="text-[9px] font-black text-brand-gold uppercase tracking-wider">{selectedDay.day} Status</span>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedDay(null); }} className="pointer-events-auto">
                                        <XIcon size={10} className="text-gray-500 hover:text-white transition-colors" />
                                    </button>
                                </div>
                                <div className="text-center">
                                    {outletName && <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{outletName}</div>}
                                    <div className="text-lg font-geometric font-black text-white">{selectedDay.laborCost}%</div>
                                    {selectedDay.laborCost > benchmark && (
                                        <div className="text-[8px] font-black uppercase mt-1 text-brand-alert flex flex-col gap-0.5">
                                            <span>High Cost</span>
                                            <span className="opacity-80">Variance detected</span>
                                        </div>
                                    )}
                                    {selectedDay.laborCost <= benchmark && (
                                        <div className="text-[8px] font-black uppercase mt-1 text-brand-energy">Within Target</div>
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
                    {/* Always show 7 days for the weekly view */}
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
            {multiSeries && outlets.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-4 mt-2 pt-4 border-t border-white/5 z-20">
                    {outlets.map(outlet => (
                        <div key={outlet.code} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 border border-white/5">
                            <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_5px_rgba(255,255,255,0.2)]" style={{ backgroundColor: outlet.color_hex || '#fff' }} />
                            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">{outlet.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LaborCostTemplateChart;
