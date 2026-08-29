import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/useI18n';
import {
    Trophy, Crown, Medal, Sparkles, CheckCircle2, Clock, Zap,
    RefreshCw, Flame, Target, TrendingUp, Award, Users, Building2,
    Calendar, Star
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

interface CheckinData {
    user_name: string;
    user_role: string;
    outlet_code: string;
    waste_entries: number;
    water_entries: number;
    energy_entries: number;
    streak_days: number;
    checkin_date: string;
}

interface GamificationHubProps {
    goal?: number;
}

const GamificationHub: React.FC<GamificationHubProps> = ({ goal = 3000 }) => {
    const { t } = useI18n();
    const [outlets, setOutlets] = useState<OutletData[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardData[]>([]);
    const [logs, setLogs] = useState<ActionLogEntry[]>([]);
    const [checkins, setCheckins] = useState<CheckinData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'outlets' | 'leaderboard' | 'streaks' | 'activity'>('outlets');

    const OUTLET_GOAL = goal;

    const fetchData = useCallback(async () => {
        try {
            // 1. Outlets
            const { data: oData } = await supabase
                .from('outlet_engagement_overview')
                .select('*')
                .order('total_points', { ascending: false });

            if (oData && oData.length > 0) {
                setOutlets(oData.slice(0, 4));
                const avg = Math.round(oData.slice(0, 4).reduce((sum: number, o: any) => sum + o.engagement_pct, 0) / Math.min(oData.length, 4));
                localStorage.setItem('ecometricus_cumulative_engagement', avg.toString());
            }

            // 2. Leaderboard
            let leaderboardRows: LeaderboardData[] = [];
            const { data: viewData } = await supabase
                .from('staff_leaderboard_display')
                .select('id, name, outlet_name, outlet_dot_color, total_points')
                .order('total_points', { ascending: false })
                .limit(10);

            if (viewData && viewData.length > 0) {
                leaderboardRows = viewData;
            } else {
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

            // 4. Daily Check-ins (streaks)
            const { data: checkinData } = await supabase
                .from('daily_checkins')
                .select('*')
                .order('checkin_date', { ascending: false })
                .limit(20);
            if (checkinData) setCheckins(checkinData as any);

        } catch (error) {
            console.error("Gamification data fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const sub = supabase.channel('gamification_hub')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gamification_ledger' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_checkins' }, () => fetchData())
            .subscribe();
        return () => { supabase.removeChannel(sub); };
    }, [fetchData]);

    const getThemeColor = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('royal')) return '#ff5722';
        if (n.includes('gusto')) return '#94a3b8';
        if (n.includes('fisher')) return '#eab308';
        if (n.includes('ralph')) return '#22c55e';
        return '#94a3b8';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
            </div>
        );
    }

    const TabButton: React.FC<{ id: typeof activeView; label: string; icon: React.ElementType }> = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setActiveView(id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap border ${
                activeView === id
                    ? 'bg-brand-gold/15 border-brand-gold/40 text-white shadow-[0_2px_12px_rgba(200,164,19,0.15)]'
                    : 'border-transparent text-white/50 hover:text-white/80 hover:bg-brand-dark/60'
            }`}
        >
            <Icon size={16} className={activeView === id ? 'text-brand-gold' : 'text-white/40'} />
            <span className="text-[13px] font-bold tracking-tight">{label}</span>
        </button>
    );

    const maxStreak = Math.max(...checkins.map(c => c.streak_days), 1);
    const totalCheckinsToday = checkins.filter(c => c.checkin_date === new Date().toISOString().split('T')[0]).length;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6 sm:gap-8 pb-20">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-gold/10 border border-brand-gold/30 rounded-xl flex items-center justify-center shrink-0">
                        <Sparkles className="text-brand-gold" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                            Earth Keeper
                        </h1>
                        <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em]">{t('gamification.subtitle')}</p>
                            <div className="h-1 w-1 rounded-full bg-brand-gold/30"></div>
                            <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.3em]">
                                {t('gamification.engagement', { value: outlets.length > 0 ? Math.round(outlets.reduce((sum, o) => sum + o.engagement_pct, 0) / outlets.length) : 0 })}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchData} className="p-3 bg-brand-dark/60 border border-brand-gold/20 rounded-xl hover:border-brand-gold/40 transition-all text-white/50 hover:text-brand-gold">
                        <RefreshCw size={16} />
                    </button>
                    <div className="px-4 py-2.5 bg-brand-gold/10 border border-brand-gold/40 rounded-xl flex items-center gap-2">
                        <Trophy size={14} className="text-brand-gold" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold">{t('gamification.goalBadge', { value: OUTLET_GOAL })}</span>
                    </div>
                </div>
            </div>

            {/* ── KPI Summary Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Building2 size={16} className="text-brand-gold" />
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-brand-gold">{t('gamification.topOutlet')}</h4>
                    </div>
                    <p className="text-2xl font-geometric font-black text-white leading-none">{outlets[0]?.name || '—'}</p>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mt-1">{outlets[0]?.total_points.toLocaleString() || 0} pts</p>
                </div>
                <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Users size={16} className="text-brand-gold" />
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-brand-gold">{t('gamification.topStaff')}</h4>
                    </div>
                    <p className="text-2xl font-geometric font-black text-white leading-none">{leaderboard[0]?.name || '—'}</p>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mt-1">{leaderboard[0]?.total_points || 0} pts</p>
                </div>
                <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Flame size={16} className="text-brand-alert" />
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-brand-gold">{t('gamification.bestStreak')}</h4>
                    </div>
                    <p className="text-2xl font-geometric font-black text-white leading-none">{maxStreak} days</p>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mt-1">{t('gamification.consecutiveCheckins')}</p>
                </div>
                <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Calendar size={16} className="text-brand-eco" />
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-brand-gold">{t('gamification.todaysCheckins')}</h4>
                    </div>
                    <p className="text-2xl font-geometric font-black text-white leading-none">{totalCheckinsToday}</p>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mt-1">{t('gamification.activeUsersToday')}</p>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex overflow-x-auto gap-2 w-full sm:w-fit shrink-0 scrollbar-hide pb-1">
                <TabButton id="outlets" label="Outlet Status" icon={Building2} />
                <TabButton id="leaderboard" label="Leaderboard" icon={Trophy} />
                <TabButton id="streaks" label="Streaks" icon={Flame} />
                <TabButton id="activity" label="Live Activity" icon={Zap} />
            </div>

            {/* ── Outlet Status Tab ── */}
            {activeView === 'outlets' && (
                <div className="space-y-4 animate-in fade-in duration-500">
                    {outlets.map((o) => {
                        const themeColor = getThemeColor(o.name);
                        return (
                            <div key={o.id} className="bg-[#1c3933] border border-brand-gold/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6 hover:border-brand-gold/30 transition-all">
                                {/* Circular Progress */}
                                <div className="shrink-0 flex flex-col items-center">
                                    <div className="relative w-28 h-28 flex items-center justify-center mb-3">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                                            <circle cx="60" cy="60" r="50" stroke="#050d0c" strokeWidth="10" fill="transparent" />
                                            <circle
                                                cx="60" cy="60" r="50"
                                                stroke={themeColor}
                                                strokeWidth="10"
                                                fill="transparent"
                                                strokeDasharray={314.159}
                                                strokeDashoffset={314.159 - (Math.min(o.engagement_pct, 100) / 100) * 314.159}
                                                strokeLinecap="round"
                                                className="transition-all duration-1000 ease-out"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                                            <span className="text-2xl font-black text-white leading-none">{Math.round(o.engagement_pct)}%</span>
                                            <span className="text-[7px] font-black text-brand-gold uppercase tracking-[0.2em] leading-none mt-1">{t('gamification.engaged')}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: themeColor }}></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{o.name}</span>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex-grow w-full space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest mb-1">{t('gamification.weeklyPoints')}</p>
                                            <h4 className="text-3xl sm:text-4xl font-geometric font-black tracking-tighter text-white">{o.total_points.toLocaleString()}</h4>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t('gamification.goal')}</p>
                                            <p className="text-sm font-bold text-white/60">{OUTLET_GOAL.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(o.engagement_pct, 100)}%`, backgroundColor: themeColor }}></div>
                                    </div>

                                    <div className="flex items-center justify-between px-4 py-2.5 bg-brand-gold/5 border border-brand-gold/30 rounded-xl">
                                        <div className="flex items-center gap-2">
                                            <Zap size={14} className="text-brand-gold" />
                                            <span className="text-[9px] font-black text-white/80 uppercase tracking-widest">
                                                {o.engagement_pct >= 80 ? t('gamification.rewardUnlocked') : o.engagement_pct >= 50 ? t('gamification.halfwayToGoal') : t('gamification.keepGoing')}
                                            </span>
                                        </div>
                                        <Sparkles size={14} className="text-brand-gold" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Leaderboard Tab ── */}
            {activeView === 'leaderboard' && (
                <div className="animate-in fade-in duration-500 space-y-6">
                    {/* Podium */}
                    {leaderboard.length >= 3 && (
                        <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] p-6">
                            <h4 className="text-center text-brand-gold text-sm font-black uppercase tracking-widest mb-8">{t('gamification.topPerformers')}</h4>
                            <div className="flex items-end justify-center gap-4 sm:gap-8">
                                {[1, 0, 2].map((idx) => {
                                    const s = leaderboard[idx];
                                    if (!s) return <div key={idx} className="flex-1 max-w-[100px]" />;
                                    const isFirst = idx === 0;
                                    const isSecond = idx === 1;
                                    return (
                                        <div key={s.id} className={`flex flex-col items-center gap-2 flex-1 max-w-[120px] ${isFirst ? '-translate-y-4' : ''}`}>
                                            <div className="relative">
                                                {isFirst ? <Crown size={20} className="text-brand-gold absolute -top-7 left-1/2 -translate-x-1/2 animate-bounce" />
                                                : isSecond ? <Medal size={16} className="text-slate-300 absolute -top-6 left-1/2 -translate-x-1/2" />
                                                : <Medal size={16} className="text-[#cd7f32] absolute -top-6 left-1/2 -translate-x-1/2" />}
                                                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 p-1 ${isFirst ? 'border-brand-gold shadow-[0_0_15px_rgba(212,175,55,0.4)]' : 'border-brand-gold/20'}`}>
                                                    <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center overflow-hidden">
                                                        <span className="text-white text-sm font-black">{s.name.charAt(0)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-center w-full">
                                                <p className="text-[11px] font-black text-white truncate">{s.name}</p>
                                                <p className="text-sm font-black text-brand-gold leading-none mt-1">{s.total_points}</p>
                                                <p className="text-[7px] font-bold text-white/30 uppercase tracking-widest">pts</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Full Ranking */}
                    <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] overflow-hidden">
                        <div className="flex justify-between items-center px-5 py-3 border-b border-brand-gold/15">
                            <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{t('gamification.rankHeader')}</span>
                            <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{t('gamification.staffMemberHeader')}</span>
                            <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{t('gamification.pointsHeader')}</span>
                        </div>
                        <div className="divide-y divide-brand-gold/5">
                            {leaderboard.map((s, idx) => (
                                <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-brand-gold/5 transition-all">
                                    <div className="flex items-center gap-4">
                                        <span className={`text-sm font-black w-6 ${idx < 3 ? 'text-brand-gold' : 'text-white/30'}`}>{idx + 1}</span>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center border border-brand-gold/10">
                                                <span className="text-white text-[10px] font-black">{s.name.charAt(0)}</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{s.name}</p>
                                                <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">{s.outlet_name}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-brand-gold">{s.total_points}</p>
                                    </div>
                                </div>
                            ))}
                            {leaderboard.length === 0 && (
                                <div className="text-center py-12 text-[10px] font-black uppercase tracking-[0.3em] text-white/20">{t('gamification.awaitingSyncData')}</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Streaks Tab ── */}
            {activeView === 'streaks' && (
                <div className="animate-in fade-in duration-500 space-y-6">
                    {checkins.length === 0 ? (
                        <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] p-12 text-center">
                            <Flame size={32} className="text-white/20 mx-auto mb-3" />
                            <p className="text-sm text-white/40">{t('gamification.noCheckinsTitle')}</p>
                            <p className="text-xs text-white/25 mt-1">{t('gamification.noCheckinsHint')}</p>
                        </div>
                    ) : (
                        <>
                            {/* Streak leaders */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[...checkins]
                                    .sort((a, b) => b.streak_days - a.streak_days)
                                    .slice(0, 3)
                                    .map((c, i) => (
                                        <div key={i} className={`rounded-2xl border p-5 ${i === 0 ? 'border-brand-alert/40 bg-brand-alert/5' : 'border-brand-gold/20 bg-[#1c3933]'}`}>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Flame size={18} className={i === 0 ? 'text-brand-alert' : 'text-brand-gold/60'} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold">#{i + 1} Streak</span>
                                                </div>
                                                {i === 0 && <Crown size={16} className="text-brand-alert" />}
                                            </div>
                                            <p className="text-lg font-geometric font-black text-white truncate">{c.user_name}</p>
                                            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-3">{c.user_role} · {c.outlet_code}</p>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-black text-white">{c.streak_days}</span>
                                                <span className="text-[10px] font-bold text-white/40 uppercase">days</span>
                                            </div>
                                        </div>
                                    ))}
                            </div>

                            {/* Full check-in list */}
                            <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] overflow-hidden">
                                <div className="flex justify-between items-center px-5 py-3 border-b border-brand-gold/15">
                                    <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{t('gamification.userHeader')}</span>
                                    <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest hidden sm:block">{t('gamification.entriesHeader')}</span>
                                    <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{t('gamification.streakHeader')}</span>
                                    <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest hidden sm:block">{t('gamification.dateHeader')}</span>
                                </div>
                                <div className="divide-y divide-brand-gold/5">
                                    {checkins.map((c, i) => (
                                        <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-brand-gold/5 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center border border-brand-gold/10">
                                                    <span className="text-white text-[10px] font-black">{c.user_name?.charAt(0) || '?'}</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white">{c.user_name}</p>
                                                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">{c.user_role} · {c.outlet_code}</p>
                                                </div>
                                            </div>
                                            <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold">
                                                <span className="text-brand-eco">{c.waste_entries}</span>
                                                <span className="text-white/20">/</span>
                                                <span className="text-blue-400">{c.water_entries}</span>
                                                <span className="text-white/20">/</span>
                                                <span className="text-amber-400">{c.energy_entries}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Flame size={14} className={c.streak_days >= 3 ? 'text-brand-alert' : 'text-white/30'} />
                                                <span className="text-sm font-black text-white">{c.streak_days}</span>
                                            </div>
                                            <span className="hidden sm:block text-[10px] text-white/30">{c.checkin_date}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Live Activity Tab ── */}
            {activeView === 'activity' && (
                <div className="animate-in fade-in duration-500">
                    <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-2 h-2 bg-brand-eco rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
                            <h3 className="text-sm font-black uppercase tracking-widest text-white">{t('gamification.tabLiveActivity')}</h3>
                        </div>

                        {logs.length === 0 ? (
                            <div className="text-center py-12">
                                <Zap size={32} className="text-white/20 mx-auto mb-3" />
                                <p className="text-sm text-white/40">{t('gamification.noRecentActivity')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {logs.map(log => (
                                    <div key={log.id} className="bg-brand-dark/40 border border-brand-gold/10 rounded-xl p-4 flex items-start gap-3 hover:border-brand-gold/30 transition-all">
                                        <div className="mt-0.5 w-8 h-8 bg-brand-eco/10 border border-brand-eco/30 rounded-lg flex items-center justify-center shrink-0">
                                            <CheckCircle2 size={14} className="text-brand-eco" />
                                        </div>
                                        <div className="flex-grow space-y-1">
                                            <p className="text-[11px] font-bold text-white uppercase leading-tight">{log.action_name}</p>
                                            <div className="flex items-center gap-2 text-white/30">
                                                <Clock size={9} />
                                                <span className="text-[9px] font-black uppercase tracking-widest">{log.staff_name || log.outlet_name}</span>
                                            </div>
                                        </div>
                                        <div className="shrink-0">
                                            <span className="text-[10px] font-black text-brand-gold">+{log.points_awarded}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GamificationHub;
