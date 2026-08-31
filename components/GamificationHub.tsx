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
    outletIds?: string[];
}

const GamificationHub: React.FC<GamificationHubProps> = ({ goal = 3000, outletIds = [] }) => {
    const { t } = useI18n();
    const [outlets, setOutlets] = useState<OutletData[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardData[]>([]);
    const [logs, setLogs] = useState<ActionLogEntry[]>([]);
    const [checkins, setCheckins] = useState<CheckinData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'outlets' | 'leaderboard' | 'streaks' | 'activity'>('outlets');

    const OUTLET_GOAL = goal;

    // Stabilize outletIds to avoid re-fetching on every render
    const outletIdsKey = outletIds.sort().join(',');
    const fetchData = useCallback(async () => {
        const ids = outletIdsKey.split(',').filter(Boolean);
        if (ids.length === 0) {
            setLoading(false);
            return;
        }
        try {
            // 1. Outlets — filter to current company's outlets only
            const { data: oData } = await supabase
                .from('outlet_engagement_overview')
                .select('*')
                .order('total_points', { ascending: false });

            // Filter to only this company's outlets
            const scopedOutlets = ids.length > 0
                ? (oData || []).filter((o: any) => ids.includes(o.id))
                : (oData || []);

            if (scopedOutlets.length > 0) {
                setOutlets(scopedOutlets.slice(0, 4));
                const avg = Math.round(scopedOutlets.slice(0, 4).reduce((sum: number, o: any) => sum + o.engagement_pct, 0) / Math.min(scopedOutlets.length, 4));
                localStorage.setItem('ecometricus_cumulative_engagement', avg.toString());
            } else {
                setOutlets([]);
            }

            // 2. Leaderboard — filter to current company's outlets via gamification_ledger.outlet_id
            let leaderboardRows: LeaderboardData[] = [];

            // Fetch ledger entries scoped to this company's outlets
            let ledgerQuery = supabase
                .from('gamification_ledger')
                .select('profile_id, outlet_id, points_awarded');
            if (ids.length > 0) {
                ledgerQuery = ledgerQuery.in('outlet_id', ids);
            }
            const { data: ledgerData } = await ledgerQuery;

            // Fetch personnel for this company's outlets to get names
            let personnelQuery = supabase
                .from('personnel')
                .select('user_id, full_name, outlet_id, email');
            if (ids.length > 0) {
                personnelQuery = personnelQuery.in('outlet_id', ids);
            }
            const { data: personnelData } = await personnelQuery;

            // Also fetch profiles to map profile_id -> name (personnel.user_id is the admin's ID, not the staff's)
            // Fetch only the specific profile IDs from the ledger to avoid RLS issues
            const profileIds = [...new Set((ledgerData || [])
                .map((l: any) => l.profile_id)
                .filter(Boolean))] as string[];
            let profilesData: any[] = [];
            if (profileIds.length > 0) {
                const { data: profData, error: profErr } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .in('id', profileIds);
                if (profErr) console.error('GAMIFICATION: profiles query error:', profErr);
                profilesData = profData || [];
            }

            if (ledgerData) {
                // Build a map of profile_id -> name from profiles
                const profileNames = new Map<string, string>();
                profilesData.forEach((p: any) => {
                    profileNames.set(p.id, p.full_name || 'Staff');
                });
                // Also try personnel email -> name as fallback
                const personnelByEmail = new Map<string, string>();
                (personnelData || []).forEach((p: any) => {
                    if (p.email) personnelByEmail.set(p.email.toLowerCase(), p.full_name);
                });
                // Match profiles to personnel by email
                profilesData.forEach((p: any) => {
                    if (p.email && personnelByEmail.has(p.email.toLowerCase())) {
                        profileNames.set(p.id, personnelByEmail.get(p.email.toLowerCase()) || p.full_name);
                    }
                });

                // Aggregate points by profile_id from the ledger
                const pointsMap = new Map<string, number>();
                (ledgerData as any[]).forEach((l: any) => {
                    if (l.profile_id) {
                        pointsMap.set(l.profile_id, (pointsMap.get(l.profile_id) || 0) + (l.points_awarded || 0));
                    }
                });

                // Build leaderboard from personnel who have points
                leaderboardRows = (personnelData || [])
                    .filter((p: any) => {
                        // Match personnel to profile by email
                        const profile = profilesData.find((pr: any) => pr.email?.toLowerCase() === p.email?.toLowerCase());
                        return profile && pointsMap.has(profile.id);
                    })
                    .map((p: any) => {
                        const profile = profilesData.find((pr: any) => pr.email?.toLowerCase() === p.email?.toLowerCase());
                        const outlet = scopedOutlets.find((o: any) => o.id === p.outlet_id);
                        return {
                            id: profile?.id || p.user_id,
                            name: p.full_name || 'Unknown',
                            outlet_name: outlet?.name || 'Unknown',
                            outlet_dot_color: outlet?.color_hex || '#ccc',
                            total_points: pointsMap.get(profile?.id) || 0
                        };
                    })
                    .sort((a, b) => b.total_points - a.total_points);
            }
            setLeaderboard(leaderboardRows.slice(0, 7));

            // 3. Action Logs — fetch directly from ledger filtered by outlet_id
            let logsQuery = supabase
                .from('gamification_ledger')
                .select('id, profile_id, outlet_id, action_key, points_awarded, created_at')
                .order('created_at', { ascending: false })
                .limit(20);
            if (ids.length > 0) {
                logsQuery = logsQuery.in('outlet_id', ids);
            }
            const { data: lData } = await logsQuery;
            if (lData) {
                // Map profile_id to names using profiles data
                const profileNames = new Map<string, string>();
                profilesData.forEach((p: any) => {
                    profileNames.set(p.id, p.full_name || 'Staff');
                });
                // Also try personnel email match
                const personnelByEmail = new Map<string, string>();
                (personnelData || []).forEach((p: any) => {
                    if (p.email) personnelByEmail.set(p.email.toLowerCase(), p.full_name);
                });
                profilesData.forEach((p: any) => {
                    if (p.email && personnelByEmail.has(p.email.toLowerCase())) {
                        profileNames.set(p.id, personnelByEmail.get(p.email.toLowerCase()) || p.full_name);
                    }
                });
                const outletNames = new Map<string, string>();
                scopedOutlets.forEach((o: any) => outletNames.set(o.id, o.name));

                const mappedLogs = (lData as any[]).map((l: any) => ({
                    id: l.id,
                    points_awarded: l.points_awarded,
                    created_at: l.created_at,
                    action_name: l.action_key ? l.action_key.replace(/_/g, ' ') : 'points earned',
                    staff_name: profileNames.get(l.profile_id) || 'Staff',
                    outlet_name: outletNames.get(l.outlet_id) || 'Outlet'
                }));
                setLogs(mappedLogs.slice(0, 10));
            }

            // 4. Daily Check-ins (streaks) — filter by outlet_code at the query level
            let checkinQuery = supabase
                .from('daily_checkins')
                .select('*')
                .order('checkin_date', { ascending: false })
                .limit(20);
            if (ids.length > 0) {
                checkinQuery = checkinQuery.in('outlet_code', ids);
            }
            const { data: checkinData, error: checkinErr } = await checkinQuery;
            if (checkinErr) {
                console.error('GAMIFICATION: checkins query error:', checkinErr);
                // Fallback: try without outlet filter
                const { data: fallbackCheckins } = await supabase
                    .from('daily_checkins')
                    .select('*')
                    .order('checkin_date', { ascending: false })
                    .limit(20);
                if (fallbackCheckins) {
                    const filtered = fallbackCheckins.filter((c: any) => ids.includes(c.outlet_code));
                    setCheckins(filtered as any);
                }
            } else if (checkinData) {
                setCheckins(checkinData as any);
            }
            console.log('GAMIFICATION: checkins:', checkinData, 'error:', checkinErr, 'ids:', ids);

        } catch (error) {
            console.error("Gamification data fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, [outletIdsKey]);

    useEffect(() => {
        fetchData();
        const sub = supabase.channel('gamification_hub')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'gamification_ledger' }, () => fetchData())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_checkins' }, () => fetchData())
            .subscribe();
        return () => { supabase.removeChannel(sub); };
    }, [fetchData]);

    const getThemeColor = (name: string, colorHex?: string) => {
        if (colorHex) return colorHex;
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

    const tabButtons = [
        { id: 'outlets' as const, label: 'Outlet Status', icon: Building2 },
        { id: 'leaderboard' as const, label: 'Leaderboard', icon: Trophy },
        { id: 'streaks' as const, label: 'Streaks', icon: Flame },
        { id: 'activity' as const, label: 'Live Activity', icon: Zap },
    ];

    const maxStreak = Math.max(...checkins.map(c => c.streak_days), 1);
    const todayStr = new Date().toISOString().split('T')[0];
    const totalCheckinsToday = checkins.filter(c => {
        const cDate = typeof c.checkin_date === 'string' ? c.checkin_date.split('T')[0] : new Date(c.checkin_date).toISOString().split('T')[0];
        return cDate === todayStr;
    }).length;
    // Fallback: if no exact match for today, count the most recent date's check-ins
    const latestCheckinDate = checkins.length > 0 ? checkins[0].checkin_date : null;
    const displayCheckins = totalCheckinsToday > 0 ? totalCheckinsToday : (latestCheckinDate ? checkins.filter(c => c.checkin_date === latestCheckinDate).length : 0);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6 sm:gap-8 pb-20">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-eco/10 border border-brand-eco/30 rounded-xl flex items-center justify-center shrink-0">
                        <Sparkles className="text-brand-eco" size={24} />
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
                    <p className="text-2xl font-geometric font-black text-white leading-none">{displayCheckins}</p>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mt-1">{t('gamification.activeUsersToday')}</p>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex overflow-x-auto gap-2 w-full sm:w-fit shrink-0 scrollbar-hide pb-1">
                {tabButtons.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
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
                ))}
            </div>

            {/* ── Outlet Status Tab ── */}
            {activeView === 'outlets' && (
                <div className="space-y-4 animate-in fade-in duration-500">
                    {outlets.map((o) => {
                        const themeColor = getThemeColor(o.name, (o as any).color_hex);
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
                        <div className="grid grid-cols-[auto_1fr_auto] gap-3 px-5 py-3 border-b border-brand-gold/15 items-center">
                            <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest min-w-[20px]">{t('gamification.rankHeader')}</span>
                            <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{t('gamification.staffMemberHeader')}</span>
                            <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest text-right min-w-[40px]">{t('gamification.pointsHeader')}</span>
                        </div>
                        <div className="divide-y divide-brand-gold/5">
                            {leaderboard.map((s, idx) => (
                                <div key={s.id} className="grid grid-cols-[auto_1fr_auto] gap-3 px-5 py-3 hover:bg-brand-gold/5 transition-all items-center">
                                    <span className={`text-sm font-black min-w-[20px] ${idx < 3 ? 'text-brand-gold' : 'text-white/30'}`}>{idx + 1}</span>
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 border border-brand-gold/20 flex items-center justify-center shrink-0">
                                            <span className="text-brand-gold text-xs font-black">{s.name.charAt(0)}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{s.name}</p>
                                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider truncate">{s.outlet_name}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-black text-brand-gold text-right min-w-[40px]">{s.total_points}</span>
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
                                    .map((c, i) => {
                                        const outlet = outlets.find((o: any) => o.id === c.outlet_code);
                                        return (
                                        <div key={i} className={`rounded-2xl border p-5 ${i === 0 ? 'border-brand-alert/40 bg-brand-alert/5' : 'border-brand-gold/20 bg-[#1c3933]'}`}>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <Flame size={18} className={i === 0 ? 'text-brand-alert' : 'text-brand-gold/60'} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold">#{i + 1} Streak</span>
                                                </div>
                                                {i === 0 && <Crown size={16} className="text-brand-alert" />}
                                            </div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 border border-brand-gold/20 flex items-center justify-center shrink-0">
                                                    <span className="text-brand-gold text-sm font-black">{c.user_name?.charAt(0) || '?'}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-lg font-geometric font-black text-white truncate">{c.user_name}</p>
                                                    <p className="text-[10px] text-white/40 uppercase tracking-wider truncate">{outlet?.name || 'Outlet'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-black text-white">{c.streak_days}</span>
                                                <span className="text-[10px] font-bold text-white/40 uppercase">days</span>
                                            </div>
                                        </div>
                                        );
                                    })}
                            </div>

                            {/* Full check-in list */}
                            <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] overflow-hidden">
                                <div className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-5 py-3 border-b border-brand-gold/15 items-center">
                                    <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{t('gamification.userHeader')}</span>
                                    <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest text-center">W / Wa / E</span>
                                    <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest text-center min-w-[45px]">{t('gamification.streakHeader')}</span>
                                    <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest text-right min-w-[55px]">{t('gamification.dateHeader')}</span>
                                </div>
                                <div className="divide-y divide-brand-gold/5">
                                    {checkins.map((c, i) => {
                                        const outlet = outlets.find((o: any) => o.id === c.outlet_code);
                                        const formattedDate = new Date(c.checkin_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                        return (
                                        <div key={i} className="grid grid-cols-[auto_1fr_auto_auto] gap-3 px-5 py-4 hover:bg-brand-gold/5 transition-all items-center">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 border border-brand-gold/20 flex items-center justify-center shrink-0">
                                                    <span className="text-brand-gold text-xs font-black">{c.user_name?.charAt(0) || '?'}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-white truncate">{c.user_name}</p>
                                                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider truncate">{outlet?.name || 'Outlet'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 justify-center">
                                                <span className="text-brand-eco text-[11px] font-black" title="Waste">{c.waste_entries}</span>
                                                <span className="text-white/15 text-[10px]">/</span>
                                                <span className="text-blue-400 text-[11px] font-black" title="Water">{c.water_entries}</span>
                                                <span className="text-white/15 text-[10px]">/</span>
                                                <span className="text-amber-400 text-[11px] font-black" title="Energy">{c.energy_entries}</span>
                                            </div>
                                            <div className="flex items-center gap-1 justify-center min-w-[45px]">
                                                <Flame size={12} className={c.streak_days >= 3 ? 'text-brand-alert' : 'text-white/30'} />
                                                <span className="text-sm font-black text-white">{c.streak_days}</span>
                                            </div>
                                            <span className="text-[10px] text-white/30 font-medium text-right min-w-[55px]">{formattedDate}</span>
                                        </div>
                                        );
                                    })}
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
                                {logs.map(log => {
                                    const actionLabels: Record<string, string> = {
                                        'on-time_entry': 'On-Time Entry',
                                        'entry_with_image': 'Entry with Photo',
                                        'energy_reading': 'Energy Reading',
                                        '5-day_streak_bonus': '5-Day Streak Bonus',
                                        'mila_comment': 'Mila AI Comment',
                                        'accuracy_bonus': 'Accuracy Bonus',
                                    };
                                    const actionLabel = actionLabels[log.action_name] || (log.action_name && log.action_name !== 'points earned' ? log.action_name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Points Earned');
                                    const timeStr = new Date(log.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                                    const dateStr = new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                    return (
                                    <div key={log.id} className="bg-brand-dark/40 border border-brand-gold/10 rounded-xl p-4 flex items-start gap-3 hover:border-brand-gold/30 transition-all">
                                        <div className="mt-0.5 w-8 h-8 bg-brand-eco/10 border border-brand-eco/30 rounded-lg flex items-center justify-center shrink-0">
                                            <CheckCircle2 size={14} className="text-brand-eco" />
                                        </div>
                                        <div className="flex-grow space-y-1">
                                            <p className="text-[11px] font-bold text-white uppercase leading-tight">{actionLabel}</p>
                                            <div className="flex items-center gap-2 text-white/30">
                                                <Clock size={9} />
                                                <span className="text-[9px] font-black uppercase tracking-widest">{log.staff_name}</span>
                                                <span className="text-white/15">·</span>
                                                <span className="text-[9px] font-medium normal-case tracking-normal">{timeStr} · {dateStr}</span>
                                            </div>
                                        </div>
                                        <div className="shrink-0">
                                            <span className="text-sm font-black text-brand-gold">+{log.points_awarded}</span>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GamificationHub;
