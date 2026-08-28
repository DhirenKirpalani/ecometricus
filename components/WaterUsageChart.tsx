
import React from 'react';
import { MoreHorizontal, Droplets } from 'lucide-react';

const WaterUsageChart = () => {
    // Mock data for water usage over time
    // Using a simplified SVG path for a smooth curve
    const points = [
        { x: 0, y: 80 },
        { x: 20, y: 60 },
        { x: 40, y: 75 },
        { x: 60, y: 45 },
        { x: 80, y: 55 },
        { x: 100, y: 30 }
    ];

    // Generate SVG path string
    const generatePath = (pts: { x: number, y: number }[]) => {
        if (pts.length === 0) return "";
        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 1; i < pts.length; i++) {
            // Simple line for now, can be Bezier for smoother curve
            d += ` L ${pts[i].x} ${pts[i].y}`;
        }
        return d;
    };

    // For a smooth curve, we'd ideally use cubic bezier, but straight lines work for a tech/data look too or we can try a simple smoothing.
    // Let's stick to a clean polyline for stability without external libs 
    const svgPath = `M0,80 C20,80 20,60 40,60 C40,60 50,80 60,50 C70,20 80,50 100,30 L100,100 L0,100 Z`; // Filled area
    const strokePath = `M0,80 C20,80 20,60 40,60 C40,60 50,80 60,50 C70,20 80,50 100,30`; // Stroke line

    return (
        <div className="bg-[#05110c] p-8 rounded-[40px] border border-[#1a2e26] relative overflow-hidden w-full aspect-video flex flex-col justify-between">
            {/* Background Glow Effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#3b82f6]/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                    <h3 className="text-white text-xl font-bold">Water Usage</h3>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Real-time Flow (L/min)</p>
                </div>
                <button className="text-white/20 hover:text-[#3b82f6] transition-colors">
                    <MoreHorizontal size={24} />
                </button>
            </div>

            <div className="h-full relative w-full flex items-end justify-center z-10">
                {/* Custom SVG Chart */}
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Area Fill */}
                    <path d={svgPath} fill="url(#waterGradient)" />

                    {/* Line Chart */}
                    <path d={strokePath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

                    {/* Points */}
                    <circle cx="0" cy="80" r="1.5" fill="#3b82f6" className="animate-pulse" />
                    <circle cx="40" cy="60" r="1.5" fill="#3b82f6" className="animate-pulse" />
                    <circle cx="60" cy="50" r="1.5" fill="#3b82f6" className="animate-pulse" />
                    <circle cx="100" cy="30" r="2.5" fill="white" stroke="#3b82f6" strokeWidth="1" className="animate-ping" />
                    <circle cx="100" cy="30" r="1.5" fill="white" />

                </svg>

                {/* Y Axes labels overlay */}
                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-white/20 font-bold uppercase pointer-events-none">
                    <span>100L</span>
                    <span>50L</span>
                    <span>0L</span>
                </div>
            </div>

            {/* Summary Stat */}
            <div className="mt-8 pt-6 border-t border-brand-gold/5 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#3b82f6]/20 rounded-lg text-[#3b82f6]">
                        <Droplets size={16} />
                    </div>
                    <span className="text-white/60 text-sm font-medium">Avg. Consumption</span>
                </div>
                <span className="text-white font-bold text-lg">1,240 L</span>
            </div>
        </div>
    );
};

export default WaterUsageChart;
