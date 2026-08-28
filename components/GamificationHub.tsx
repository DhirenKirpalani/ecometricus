import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
    Trophy,
    Crown,
    Medal,
    Sparkles,
    CheckCircle2,
    Clock,
    Zap,
    RefreshCw
} from 'lucide-react';

// --- Interfaces ---

interface OutletData {
    id: string;
    name: string;
    outlet_color: string;
    total_points: number;
    engagement_pct: number;
}

interface LeaderboardData {
    id: string;
    name: string;
    outlet_name: string;
    outlet_dot_color: string;
    total_points: number;
}

interface ActionLogEntry {
    id: number;
    points_awarded: number;
    created_at: string;
    action_name: string;
    staff_name: string | null;
    outlet_name: string;
}

const GamificationHub: React.FC = () => {
    const [outlets, setOutlets] = useState<OutletData[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardData[]>([]);
    const [logs, setLogs] = useState<ActionLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const OUTLET_GOAL = 3000;

    const fetchData = async () => {
        try {
            // 1. Outlets (Horizontal View)
            const { data: oData } = await supabase
                .from('outlet_engagement_overview')
                .select('*')
                .order('total_points', { ascending: false });

            if (oData && oData.length > 0) {
                const fetchedOutlets = oData.slice(0, 4);
                setOutlets(fetchedOutlets);

                // Calculate Cumulative Average for Global Sync (Avg of 4 outlets)
                const avg = Math.round(fetchedOutlets.reduce((sum: number, o: any) => sum + o.engagement_pct, 0) / fetchedOutlets.length);
                localStorage.setItem('ecometricus_cumulative_engagement', avg.toString());
            } else {
                // Fallback Mock Data
                const mockOutlets: OutletData[] = [
                    { id: '1', name: 'Royal', outlet_color: '#ff5722', total_points: 2580, engagement_pct: 86 },
                    { id: '2', name: 'Gusto', outlet_color: '#94a3b8', total_points: 2430, engagement_pct: 81 },
                    { id: '3', name: "Fisher's", outlet_color: '#eab308', total_points: 2220, engagement_pct: 74 },
                    { id: '4', name: "Ralph's", outlet_color: '#22c55e', total_points: 2040, engagement_pct: 68 },
                ];
                setOutlets(mockOutlets);
                const avg = Math.round(mockOutlets.reduce((sum, o) => sum + o.engagement_pct, 0) / mockOutlets.length);
                localStorage.setItem('ecometricus_cumulative_engagement', avg.toString());
            }

            // 2. Leaderboard - ROBUST FETCH STRATEGY
            // Strategy: Try the view first. If empty, join raw tables.
            let leaderboardRows: LeaderboardData[] = [];

            const { data: viewData, error: viewError } = await supabase
                .from('staff_leaderboard_display')
                .select('id, name, outlet_name, outlet_dot_color, total_points')
                .order('total_points', { ascending: false })
                .limit(10);

            if (viewData && viewData.length > 0) {
                leaderboardRows = viewData;
            } else {
                console.warn("LEADERBOARD_VIEW_EMPTY: Falling back to raw table query...");
                // Fallback: Fetch profiles joined with outlets, then join with aggregated ledger
                const { data: profData } = await supabase
                    .from('profiles')
                    .select('id, full_name, outlets(name, color_hex)');

                const { data: ledgerData } = await supabase
                    .from('gamification_ledger')
                    .select('profile_id, points_awarded');

                if (profData) {
                    leaderboardRows = profData.map(p => {
                        const total = (ledgerData || [])
                            .filter(l => l.profile_id === p.id)
                            .reduce((sum, curr) => sum + curr.points_awarded, 0);

                        return {
                            id: p.id,
                            name: p.full_name,
                            outlet_name: (p as any).outlets?.name || 'Unknown',
                            outlet_dot_color: (p as any).outlets?.color_hex || '#ccc',
                            total_points: total
                        };
                    }).sort((a, b) => b.total_points - a.total_points);
                }
            }
            setLeaderboard(leaderboardRows.slice(0, 7));

            // 3. Action Logs
            const { data: lData } = await supabase
                .from('gamification_recent_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            if (lData) setLogs(lData);

        } catch (error) {
            console.error("DATA_SYNC_CATASTROPHIC:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const sub = supabase.channel('gamification_strict_final')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gamification_ledger' }, () => fetchData())
            .subscribe();
        return () => { supabase.removeChannel(sub); };
    }, []);

    const handleResetAndCalibrate = async () => {
        if (!confirm('RESET & CALIBRATE: Re-sync precise data for Outlets & Staff?')) return;
        setLoading(true);

        try {
            await supabase.from('gamification_ledger').delete().neq('id', 0);

            const { data: anchorOutlets } = await supabase.from('outlets').select('*');
            const { data: anchorActions } = await supabase.from('gamification_actions').select('*');

            if (!anchorOutlets || !anchorActions) throw new Error("Sync failed: Mandatory tables empty.");

            const entries: any[] = [];
            const outletTargets = { 'Royal': 2580, 'Gusto': 2430, "Fisher's": 2220, "Ralph's": 2040 };
            const staffTargets = [
                { name: 'Jack', points: 576, outlet: 'Royal' },
                { name: 'Jill', points: 564, outlet: "Fisher's" },
                { name: 'Asli', points: 535, outlet: "Ralph's" },
                { name: 'Francesca', points: 522, outlet: 'Gusto' },
                { name: 'Hum', points: 520, outlet: 'Royal' }
            ];

            // 1. Seed Outlets
            for (const o of anchorOutlets) {
                const target = (outletTargets as any)[o.name];
                if (!target) continue;
                let cur = 0;
                while (cur < target) {
                    const act = anchorActions[Math.floor(Math.random() * anchorActions.length)];
                    entries.push({
                        outlet_id: o.id,
                        action_id: act.id,
                        points_awarded: act.points_value,
                        created_at: new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString()
                    });
                    cur += act.points_value;
                }
            }

            // 2. Seed Staff (profiles)
            for (const s of staffTargets) {
                const outlet = anchorOutlets.find(o => o.name === s.outlet);
                if (!outlet) continue;

                const { data: profRec } = await supabase.from('profiles').upsert({
                    full_name: s.name,
                    outlet_id: outlet.id
                }, { onConflict: 'full_name' }).select().single();

                if (profRec) {
                    let cur = 0;
                    while (cur < s.points) {
                        const act = anchorActions[Math.floor(Math.random() * anchorActions.length)];
                        entries.push({
                            outlet_id: outlet.id,
                            profile_id: profRec.id,
                            action_id: act.id,
                            points_awarded: act.points_value,
                            created_at: new Date(Date.now() - Math.floor(Math.random() * 43200000)).toISOString()
                        });
                        cur += act.points_value;
                    }
                }
            }

            if (entries.length > 0) {
                await supabase.from('gamification_ledger').insert(entries);
            }

            await fetchData();
        } catch (e: any) {
            console.error(e);
            alert("Calibration error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-mono text-[10px] text-brand-gold uppercase animate-pulse">Synchronizing Intelligence...</div>;

    return (
        <div className="animate-in fade-in duration-700 flex flex-col gap-10 pb-20 text-white leading-relaxed">

            {/* Header Area */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-[#0a1a17] border border-brand-gold/30 rounded-2xl shadow-xl">
                        <Sparkles size={28} className="text-brand-gold" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tight leading-none mb-1 text-white">Earth Keeper</h1>
                        <div className="flex items-center gap-3">
                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">ADMIN PERFORMANCE HUB</p>
                            <div className="h-1 w-1 rounded-full bg-brand-gold/30"></div>
                            <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.4em]">
                                Cumulative Engagement: {outlets.length > 0 ? Math.round(outlets.reduce((sum, o) => sum + o.engagement_pct, 0) / outlets.length) : 0}%
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={fetchData} className="p-3 bg-white/5 border border-brand-gold/10 rounded-full hover:bg-white/10 transition-all text-white/50 hover:text-white">
                        <RefreshCw size={16} />
                    </button>
                    <button onClick={handleResetAndCalibrate} className="px-6 py-2 border border-brand-gold/20 rounded-full text-[10px] font-black text-brand-gold/50 hover:border-brand-gold hover:text-brand-gold transition-all">
                        RESET & CALIBRATE
                    </button>
                    <div className="px-6 py-2 bg-brand-gold/10 border border-brand-gold/40 rounded-full flex items-center gap-2">
                        <Trophy size={14} className="text-brand-gold" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold">GOAL: {OUTLET_GOAL} PTS</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-10">

                {/* --- OUTLET STATUS (Original Horizontal Layout) --- */}
                <div className="xl:col-span-3 space-y-8">
                    {outlets.map((o) => {
                        const n = o.name.toLowerCase();
                        let themeColor = '#94a3b8';
                        if (n.includes('royal')) themeColor = '#ff5722';
                        if (n.includes('gusto')) themeColor = '#94a3b8';
                        if (n.includes('fisher')) themeColor = '#eab308';
                        if (n.includes('ralph')) themeColor = '#22c55e';

                        return (
                            <div key={o.id} className="bg-[#0a1a17] border border-[#d4af37]/30 rounded-[20px] p-8 flex items-center gap-10 group hover:border-[#d4af37] transition-all duration-500 relative">
                                <div className="shrink-0 flex flex-col items-center">
                                    <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                                            <circle cx="60" cy="60" r="50" stroke="#050d0c" strokeWidth="12" fill="transparent" />
                                            <circle
                                                cx="60" cy="60" r="50"
                                                stroke={themeColor}
                                                strokeWidth="12"
                                                fill="transparent"
                                                strokeDasharray={314.159}
                                                strokeDashoffset={314.159 - (Math.min(o.engagement_pct, 100) / 100) * 314.159}
                                                strokeLinecap="round"
                                                className="transition-all duration-1000 ease-out"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                                            <span className="text-[28px] font-black text-white leading-none">{Math.round(o.engagement_pct)}%</span>
                                            <span className="text-[7px] font-black text-brand-gold uppercase tracking-[0.2em] leading-none mt-1">ENGAGED</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColor }}></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{o.name}</span>
                                    </div>
                                </div>

                                <div className="flex-grow space-y-6">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest mb-1">WEEKLY POINTS</p>
                                            <h4 className="text-5xl font-black tracking-tighter">{o.total_points.toLocaleString()}</h4>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">TARGETS</span>
                                        </div>
                                    </div>

                                    <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden p-[1px]">
                                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(o.engagement_pct, 100)}%`, backgroundColor: themeColor }}></div>
                                    </div>

                                    <div className="px-5 py-3 bg-brand-gold/5 border border-brand-gold/40 rounded-xl flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <Zap size={14} className="text-brand-gold" />
                                            <span className="text-[9px] font-black text-white/80 uppercase tracking-widest">REWARD UNLOCKED: SUSTAINABILITY LUNCH</span>
                                        </div>
                                        <Sparkles size={14} className="text-brand-gold" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* --- SIDEBAR LEADERBOARD (Theme Reverted to Gold/Green) --- */}
                <div className="xl:col-span-1 h-full">
                    <div className="bg-[#0a1a17] border border-[#d4af37]/40 rounded-[20px] p-6 h-full flex flex-col shadow-2xl relative overflow-hidden group">

                        <div className="mb-8 relative z-10 text-center">
                            <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-6">Leaderboard</h3>

                            {/* Filter Tabs (Refined Colors) */}
                            <div className="flex justify-center gap-2 mb-6">
                                {['All Time', 'This Month', 'This Week'].map((tab, i) => (
                                    <button key={tab} className={`px-3 py-1 rounded-full text-[8px] font-bold border transition-all ${i === 0 ? 'bg-brand-gold/10 border-brand-gold text-brand-gold' : 'border-brand-gold/10 text-white/30'}`}>
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Top Performers Podium (Resilient Rendering) */}
                        <div className="mb-10 relative z-10 border border-brand-gold/30 rounded-2xl p-4 bg-brand-gold/[0.03]">
                            <h4 className="text-center text-brand-gold text-sm font-black uppercase mb-8">Top Performers</h4>

                            <div className="flex items-end justify-between gap-2 px-1">
                                {[1, 0, 2].map((idx) => {
                                    const s = leaderboard[idx];
                                    if (!s) return <div key={idx} className="flex-1" />; // Placeholder

                                    const isFirst = idx === 0;
                                    const isSecond = idx === 1;

                                    return (
                                        <div key={s.id} className={`flex flex-col items-center gap-2 flex-1 ${isFirst ? '-translate-y-4' : ''}`}>
                                            <div className="relative">
                                                {isFirst ? (
                                                    <Crown size={18} className="text-brand-gold absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce" />
                                                ) : isSecond ? (
                                                    <Medal size={14} className="text-slate-300 absolute -top-5 left-1/2 -translate-x-1/2" />
                                                ) : (
                                                    <Medal size={14} className="text-[#cd7f32] absolute -top-5 left-1/2 -translate-x-1/2" />
                                                )}
                                                <div className={`w-14 h-14 rounded-full border-2 p-1 ${isFirst ? 'border-brand-gold shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'border-brand-gold/10'}`}>
                                                    <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center overflow-hidden border border-brand-gold/5">
                                                        <span className="text-white text-xs font-black">{s.name.charAt(0)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-center w-full">
                                                <p className="text-[10px] font-black text-white truncate px-1">{s.name}</p>
                                                <p className="text-[11px] font-black text-brand-gold leading-none mt-1">{s.total_points}</p>
                                                <p className="text-[6px] font-bold text-white/20 uppercase tracking-widest">PTS</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Global Ranking List (Table Format) */}
                        <div className="flex-grow relative z-10 overflow-hidden">
                            <div className="flex justify-between items-center px-4 py-2 border-b border-brand-gold/5 mb-4">
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Rank</span>
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">User Name</span>
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Points</span>
                            </div>

                            <div className="space-y-1 overflow-y-auto max-h-[280px] pr-2 custom-scrollbar">
                                {leaderboard.map((s, idx) => (
                                    <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.02] transition-all group">
                                        <div className="flex items-center gap-4">
                                            <span className={`text-[10px] font-black w-4 ${idx < 3 ? 'text-brand-gold' : 'text-white/20'}`}>{idx + 1}</span>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-brand-gold/5 overflow-hidden group-hover:border-brand-gold/30 transition-colors">
                                                    <span className="text-white text-[9px] font-black">{s.name.charAt(0)}</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-white group-hover:text-brand-gold transition-colors">{s.name}</p>
                                                    <p className="text-[7px] font-bold text-white/10 uppercase tracking-tighter">{s.outlet_name}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-brand-gold">{s.total_points}</p>
                                        </div>
                                    </div>
                                ))}
                                {leaderboard.length === 0 && (
                                    <div className="text-center py-10 opacity-20 text-[8px] font-black uppercase tracking-[0.3em]">Awaiting Sync Data...</div>
                                )}
                            </div>
                        </div>

                        {/* Social Interaction Bar (Mockup) */}
                        <div className="mt-6 pt-6 border-t border-brand-gold/5 flex items-center justify-between px-4">
                            <div className="flex gap-4 opacity-30">
                                <Sparkles size={14} className="text-white" />
                                <Trophy size={14} className="text-white" />
                                <Zap size={14} className="text-white" />
                            </div>
                            <span className="text-[8px] font-bold text-white/20 uppercase tracking-widest">12 Likes • 4 Comments</span>
                        </div>
                    </div>
                </div>

                {/* --- LIVE ACTION LOG (Full Width Bottom) --- */}
                <div className="xl:col-span-3">
                    <div className="bg-[#0a1a17] border border-[#d4af37]/30 rounded-[20px] p-8 flex flex-col shadow-2xl relative group">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-2 h-2 bg-[#4ade80] rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                            <h3 className="text-lg font-black uppercase tracking-tight">LIVE ACTIVITY</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                            {logs.map(log => (
                                <div key={log.id} className="bg-white/5 border border-brand-gold/5 rounded-2xl p-4 flex items-start gap-4 hover:border-brand-gold/30 transition-all">
                                    <div className="mt-1 w-6 h-6 bg-brand-eco/10 border border-brand-eco/40 rounded-full flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={12} className="text-brand-eco" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-white uppercase leading-tight">{log.action_name}</p>
                                        <div className="flex items-center gap-2 opacity-30">
                                            <Clock size={8} />
                                            <span className="text-[8px] font-black uppercase tracking-widest">{log.staff_name || log.outlet_name}</span>
                                        </div>
                                    </div>
                                    <div className="ml-auto">
                                        <span className="text-[9px] font-black text-brand-gold">+{log.points_awarded}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default GamificationHub;
