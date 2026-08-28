import React from 'react';
import { Info, CheckCircle2, Zap } from 'lucide-react';

interface ReportAlertBoxProps {
    title: string;
    issue: string;
    suggestion: string;
    type: 'kpi' | 'sustainability';
}

const ReportAlertBoxKPI: React.FC<ReportAlertBoxProps> = ({ title, issue, suggestion, type }) => {
    // High-Alert Styling Logic
    const borderColor = 'border-brand-gold';

    return (
        <div className={`mt-8 bg-[#0f2420] border-l-4 ${borderColor} rounded-r-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden font-body animate-in fade-in slide-in-from-bottom-6 duration-700`}>

            {/* Header / Flashing Attention */}
            <div className="flex items-center gap-3 p-4 border-b border-brand-gold/5 bg-brand-gold/10">
                <div className="flex items-center gap-2 animate-pulse">
                    <Info className="text-brand-gold" size={18} />
                    <span className="text-xs font-black text-brand-gold uppercase tracking-[0.2em]">REVIEW</span>
                </div>
                <div className="h-4 w-[1px] bg-white/20"></div>
                <h3 className="text-sm font-geometric font-bold text-white uppercase tracking-tight">{title}</h3>
            </div>

            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10 p-6">

                {/* Alert Side (Problem) */}
                <div className="flex-1 space-y-2 md:pr-6">
                    <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest flex items-center gap-2">
                        <Zap size={12} /> Deviation Detect
                    </span>
                    <p className="text-xs font-bold text-white leading-relaxed">
                        {issue}
                    </p>
                </div>

                {/* Solution Side (Suggestion) */}
                <div className="flex-1 space-y-2 md:pl-6 pt-4 md:pt-0">
                    <span className="text-[10px] font-black text-brand-eco uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 size={12} /> Recommended Action
                    </span>
                    <p className="text-xs font-medium text-white/90 leading-relaxed">
                        {suggestion}
                    </p>
                </div>
            </div>

            {/* Mila Call-to-Action Footer */}
            <div className="bg-brand-dark/50 p-3 flex items-center justify-center border-t border-brand-gold/5">
                <p className="text-[10px] text-gray-500 font-medium italic flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse"></span>
                    Need a deeper regional strategy? Ask Mila for regional competitive solutions.
                </p>
            </div>
        </div>
    );
};

export default ReportAlertBoxKPI;
