
import React from 'react';
import { MoreHorizontal } from 'lucide-react';

const FoodWasteChart = () => {
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    // Mock data for waste in kg
    const data = [45, 62, 38, 75, 52, 68, 40];
    const maxVal = Math.max(...data);

    return (
        <div className="bg-[#05110c] p-8 rounded-[40px] border border-[#1a2e26] relative group w-full aspect-video flex flex-col justify-between" style={{ overflow: 'hidden', position: 'relative' }}>
            {/* Background Glow Effect */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#facc15]/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="flex justify-between items-start mb-8 relative z-10">
                <div>
                    <h3 className="text-white text-xl font-bold">Food Waste</h3>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Daily Breakdown (KG)</p>
                </div>
                <button className="text-white/20 hover:text-[#facc15] transition-colors">
                    <MoreHorizontal size={24} />
                </button>
            </div>

            <div className="flex items-end justify-between h-full gap-2 relative z-10">
                {data.map((value, index) => {
                    const heightPercentage = (value / maxVal) * 100;
                    const isRightSide = index >= data.length - 2;
                    const isLeftSide = index <= 1;
                    const isTall = heightPercentage > 85;

                    // Base classes
                    let positionClasses = "left-1/2 -translate-x-1/2"; // Center x
                    let colorClasses = "bg-[#facc15] text-[#020806]"; // Yellow bg
                    let verticalTransform = "-translate-y-[120%]"; // Move Up (Above bar)

                    // Horizontal Adjustments
                    if (isRightSide) positionClasses = "right-0 translate-x-0";
                    if (isLeftSide) positionClasses = "left-0 translate-x-0";

                    // Tall Bar Logic (Flip Down / Inside)
                    if (isTall) {
                        verticalTransform = "translate-y-[10%]"; // Move Down (Inside bar)
                        colorClasses = "bg-[#020806] text-[#facc15]"; // Dark bg for contrast
                    }

                    return (
                        <div key={index} className="flex flex-col items-center gap-3 flex-1 group/bar">
                            <div className="relative w-full flex justify-center items-end h-full">
                                {/* Bar */}
                                <div
                                    className="w-full max-w-[40px] bg-[#1a2e26] rounded-t-xl relative overflow-hidden transition-all duration-500 group-hover/bar:bg-[#facc15]"
                                    style={{ height: `${heightPercentage}%` }}
                                >
                                    {/* Inner Gradient/Shine */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/bar:opacity-100 transition-opacity"></div>
                                </div>

                                {/* Tooltip - Positioned by Bottom % */}
                                <div
                                    className={`absolute opacity-0 group-hover/bar:opacity-100 transition-all duration-300 text-xs font-bold py-1 px-3 rounded-lg shadow-lg pointer-events-none whitespace-nowrap z-20 ${positionClasses} ${colorClasses} ${verticalTransform}`}
                                    style={{ bottom: `${heightPercentage}%` }}
                                >
                                    {value} kg
                                </div>
                            </div>
                            <span className="text-white/40 text-xs font-bold uppercase transition-colors group-hover/bar:text-white">{days[index]}</span>
                        </div>
                    );
                })}
            </div>

            {/* Summary Stat */}
            <div className="mt-8 pt-6 border-t border-brand-gold/5 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#facc15]"></div>
                    <span className="text-white/60 text-sm font-medium">Total Waste</span>
                </div>
                <span className="text-white font-bold text-lg">380 kg</span>
            </div>
        </div>
    );
};

export default FoodWasteChart;
