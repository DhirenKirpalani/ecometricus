import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/useI18n';
import {
    Trophy, Crown, Medal, Sparkles, CheckCircle2, Clock, Zap,
    Flame, Target, TrendingUp, Award, Users, Building2,
    Calendar, Star, Camera, Leaf, Droplets, ChevronUp, ChevronDown, Check
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
    action_key: string;
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
    allOutlets?: { id?: string; name: string; code: string }[];
    isAdmin?: boolean;
}

const GamificationHub: React.FC<GamificationHubProps> = ({ goal = 3000, outletIds = [], allOutlets = [], isAdmin = false }) => {
    const { t, lang } = useI18n();
    const [outlets, setOutlets] = useState<OutletData[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardData[]>([]);
    const [logs, setLogs] = useState<ActionLogEntry[]>([]);
    const [checkins, setCheckins] = useState<CheckinData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'outlets' | 'leaderboard' | 'streaks' | 'activity'>('outlets');
    const [leaderboardPeriod, setLeaderboardPeriod] = useState<'all' | 'month' | 'week'>('all');
    const [rawLedger, setRawLedger] = useState<{ profile_id: string; points_awarded: number; created_at: string; outlet_id: string }[]>([]);
    const [profileMap, setProfileMap] = useState<Map<string, { name: string; outlet_name: string; outlet_dot_color: string }>>(new Map());
    const [selectedOutletId, setSelectedOutletId] = useState<string>('all');

    const OUTLET_GOAL = goal;

    // Compute effective outlet IDs based on filter
    const effectiveOutletIds = useMemo(() => {
        if (selectedOutletId === 'all') return outletIds;
        return [selectedOutletId];
    }, [outletIds, selectedOutletId]);

    // Stabilize outletIds to avoid re-fetching on every render
    const outletIdsKey = effectiveOutletIds.sort().join(',');
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

            // Store raw ledger + profile map for period-based filtering
            setRawLedger((ledgerData || []) as any[]);
            const pMap = new Map<string, { name: string; outlet_name: string; outlet_dot_color: string }>();
            leaderboardRows.forEach(r => {
                pMap.set(r.id, { name: r.name, outlet_name: r.outlet_name, outlet_dot_color: r.outlet_dot_color });
            });
            // Also add profiles that didn't match personnel but are in the ledger
            profilesData.forEach((p: any) => {
                if (!pMap.has(p.id)) {
                    pMap.set(p.id, { name: p.full_name || 'Staff', outlet_name: '', outlet_dot_color: '#ccc' });
                }
            });
            setProfileMap(pMap);

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
                    action_key: l.action_key || '',
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

    // Period-filtered leaderboard derived from raw ledger
    const filteredLeaderboard = useMemo(() => {
        const now = new Date();
        let filtered = rawLedger;
        if (leaderboardPeriod === 'month') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            filtered = rawLedger.filter(e => new Date(e.created_at) >= start);
        } else if (leaderboardPeriod === 'week') {
            const start = new Date(now);
            start.setDate(start.getDate() - 7);
            filtered = rawLedger.filter(e => new Date(e.created_at) >= start);
        }
        const pointsMap = new Map<string, number>();
        filtered.forEach(e => {
            if (e.profile_id) pointsMap.set(e.profile_id, (pointsMap.get(e.profile_id) || 0) + (e.points_awarded || 0));
        });
        return [...pointsMap.entries()]
            .map(([pid, pts]) => {
                const meta = profileMap.get(pid);
                return { id: pid, name: meta?.name || 'Staff', outlet_name: meta?.outlet_name || '', outlet_dot_color: meta?.outlet_dot_color || '#ccc', total_points: pts };
            })
            .sort((a, b) => b.total_points - a.total_points)
            .slice(0, 10);
    }, [rawLedger, profileMap, leaderboardPeriod]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
            </div>
        );
    }

    const tabButtons = [
        { id: 'outlets' as const, label: t('gamification.tabOutletStatus'), icon: Building2 },
        { id: 'leaderboard' as const, label: t('gamification.tabLeaderboard'), icon: Trophy },
        { id: 'streaks' as const, label: t('gamification.tabStreaks'), icon: Flame },
        { id: 'activity' as const, label: t('gamification.tabLiveActivity'), icon: Zap },
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-eco/10 border border-brand-eco/30 rounded-xl flex items-center justify-center shrink-0">
                        <Sparkles className="text-brand-eco" size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                            {t('gamification.title')}
                        </h1>
                        <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
                            <p className="text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] sm:tracking-[0.3em]">{t('gamification.subtitle')}</p>
                            <div className="h-1 w-1 rounded-full bg-brand-gold/30"></div>
                            <p className="text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] sm:tracking-[0.3em]">
                                {t('gamification.engagement', { value: outlets.length > 0 ? Math.round(outlets.reduce((sum, o) => sum + o.engagement_pct, 0) / outlets.length) : 0 })}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
                    {/* Outlet filter — admin/GM only */}
                    {isAdmin && allOutlets.length > 1 && (
                        <OutletFilterDropdown
                            value={selectedOutletId}
                            options={allOutlets.filter(o => o.id)}
                            onChange={setSelectedOutletId}
                            allLabel={t('gamification.allOutlets')}
                        />
                    )}
                    <div className="px-4 py-2.5 bg-brand-gold/10 border border-brand-gold/40 rounded-xl flex items-center gap-2">
                        <Trophy size={14} className="text-brand-gold" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold">{t('gamification.goalBadge', { value: OUTLET_GOAL })}</span>
                    </div>
                </div>
            </div>

            {/* ── KPI Summary Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] p-3 sm:p-5">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <Building2 size={14} className="text-brand-gold" />
                        <h4 className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-brand-gold">{t('gamification.topOutlet')}</h4>
                    </div>
                    <p className="text-base sm:text-2xl font-geometric font-black text-white leading-none truncate">{outlets[0]?.name || '—'}</p>
                    <p className="text-[9px] sm:text-[10px] font-bold text-white/50 uppercase tracking-wider mt-1">{outlets[0]?.total_points.toLocaleString() || 0} {t('gamification.pts')}</p>
                </div>
                <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] p-3 sm:p-5">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <Users size={14} className="text-brand-gold" />
                        <h4 className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-brand-gold">{t('gamification.topStaff')}</h4>
                    </div>
                    <p className="text-base sm:text-2xl font-geometric font-black text-white leading-none truncate">{leaderboard[0]?.name || '—'}</p>
                    <p className="text-[9px] sm:text-[10px] font-bold text-white/50 uppercase tracking-wider mt-1">{leaderboard[0]?.total_points || 0} {t('gamification.pts')}</p>
                </div>
                <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] p-3 sm:p-5">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <Flame size={14} className="text-brand-alert" />
                        <h4 className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-brand-gold">{t('gamification.bestStreak')}</h4>
                    </div>
                    <p className="text-base sm:text-2xl font-geometric font-black text-white leading-none">{maxStreak} {t('gamification.days')}</p>
                    <p className="text-[9px] sm:text-[10px] font-bold text-white/50 uppercase tracking-wider mt-1">{t('gamification.consecutiveCheckins')}</p>
                </div>
                <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] p-3 sm:p-5">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <Calendar size={14} className="text-brand-eco" />
                        <h4 className="text-[9px] sm:text-[11px] font-black uppercase tracking-widest text-brand-gold">{t('gamification.todaysCheckins')}</h4>
                    </div>
                    <p className="text-base sm:text-2xl font-geometric font-black text-white leading-none">{displayCheckins}</p>
                    <p className="text-[9px] sm:text-[10px] font-bold text-white/50 uppercase tracking-wider mt-1">{t('gamification.activeUsersToday')}</p>
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
                            <div key={o.id} className="bg-[#1c3933] border border-brand-gold/20 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 hover:border-brand-gold/30 transition-all">
                                {/* Circular Progress */}
                                <div className="shrink-0 flex flex-col items-center">
                                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center mb-3">
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
                                            <span className="text-xl sm:text-2xl font-black text-white leading-none">{Math.round(o.engagement_pct)}%</span>
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
                                            <h4 className="text-2xl sm:text-4xl font-geometric font-black tracking-tighter text-white">{o.total_points.toLocaleString()}</h4>
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
                <div className="animate-in fade-in duration-500 space-y-4">

                    {/* Gamified header card */}
                    <div className="relative rounded-2xl overflow-hidden border border-brand-gold/30 bg-gradient-to-r from-[#0f1e1a] via-[#1a2e1c] to-[#0f1e1a] px-4 sm:px-6 py-3 sm:py-4">
                        {/* Subtle decorative glow blobs */}
                        <div className="absolute left-1/4 top-0 w-32 h-10 bg-brand-gold/10 blur-2xl rounded-full pointer-events-none" />
                        <div className="absolute right-1/4 bottom-0 w-24 h-8 bg-brand-gold/8 blur-2xl rounded-full pointer-events-none" />

                        <div className="relative flex items-center justify-between gap-3 flex-wrap">
                            {/* Trophy + title */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center shadow-[0_0_16px_rgba(200,164,19,0.2)] shrink-0">
                                    <Trophy size={20} className="text-brand-gold" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Star size={9} className="text-brand-gold/60 fill-brand-gold/40" />
                                        <span className="text-[9px] font-black text-brand-gold/60 uppercase tracking-[0.3em]">{t('gamification.title')}</span>
                                        <Star size={9} className="text-brand-gold/60 fill-brand-gold/40" />
                                    </div>
                                    <p className="text-[11px] font-black text-brand-gold uppercase tracking-[0.2em] mt-0.5">{t('gamification.topPerformers')}</p>
                                </div>
                            </div>

                            {/* Period filter pills */}
                            <div className="flex items-center gap-1.5">
                                {([['all', t('gamification.periodAllTime')], ['month', t('gamification.periodThisMonth')], ['week', t('gamification.periodThisWeek')]] as const).map(([id, label]) => (
                                    <button
                                        key={id}
                                        onClick={() => setLeaderboardPeriod(id)}
                                        className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                                            leaderboardPeriod === id
                                                ? 'border-brand-gold text-brand-gold bg-brand-gold/15 shadow-[0_0_8px_rgba(200,164,19,0.2)]'
                                                : 'border-white/10 text-white/35 hover:border-brand-gold/30 hover:text-brand-gold/60'
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Podium — Top 3 (adapts to available users) */}
                    {filteredLeaderboard.length > 0 && (() => {
                        const top3 = filteredLeaderboard.slice(0, 3);
                        // 1 user: single column, 2 users: 2 cols (1st right, 2nd left), 3 users: 3 cols
                        const cols = top3.length;
                        const order = cols === 1 ? [0] : cols === 2 ? [1, 0] : [1, 0, 2];
                        const accents = ['#C8A413', '#94a3b8', '#cd7f32'];
                        const heights = ['h-40', 'h-32', 'h-28'];
                        const icons = [
                            <Crown size={18} key="c" className="text-brand-gold" />,
                            <Medal size={16} key="s" className="text-slate-300" />,
                            <Medal size={16} key="b" className="text-[#cd7f32]" />,
                        ];
                        return (
                            <div className={`grid gap-2 sm:gap-4 items-end ${cols === 1 ? 'grid-cols-1 max-w-xs mx-auto' : cols === 2 ? 'grid-cols-2 max-w-md mx-auto' : 'grid-cols-3'}`}>
                                {order.map((dataIdx, slotIdx) => {
                                    const s = top3[dataIdx];
                                    const rank = dataIdx + 1;
                                    return (
                                        <PodiumCard
                                            key={s.id}
                                            rank={rank}
                                            name={s.name}
                                            points={s.total_points}
                                            outlet={s.outlet_name}
                                            color={s.outlet_dot_color}
                                            icon={icons[dataIdx]}
                                            accent={accents[dataIdx]}
                                            height={heights[dataIdx]}
                                        />
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {/* Remaining ranks 4+ — scrollable list */}
                    {filteredLeaderboard.length > 3 && (
                        <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] overflow-hidden">
                            <div className="px-4 sm:px-6 py-2 border-b border-brand-gold/10 bg-brand-gold/5 flex items-center justify-between">
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">{t('gamification.alsoRunning')}</span>
                                <span className="text-[9px] font-black text-brand-gold/60 uppercase tracking-widest">{t('gamification.moreCount', { count: filteredLeaderboard.length - 3 })}</span>
                            </div>
                            <div className="divide-y divide-brand-gold/5 max-h-[280px] overflow-y-auto scrollbar-thin scrollbar-thumb-brand-gold/20 scrollbar-track-transparent">
                                {filteredLeaderboard.slice(3).map((s, idx) => {
                                    const rank = idx + 4;
                                    const maxPts = filteredLeaderboard[0]?.total_points || 1;
                                    const pct = Math.round((s.total_points / maxPts) * 100);
                                    return (
                                        <div key={s.id} className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-brand-gold/5 transition-all">
                                            <span className="w-7 text-center text-xs font-black text-white/30 shrink-0">{rank}</span>
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-brand-gold/20 bg-brand-gold/10">
                                                <span className="text-brand-gold text-[10px] font-black">{s.name.charAt(0).toUpperCase()}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-sm font-bold text-white truncate">{s.name}</p>
                                                    {s.outlet_name && <span className="text-[8px] font-black text-white/30 uppercase tracking-wider shrink-0 hidden sm:inline">{s.outlet_name}</span>}
                                                </div>
                                                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full bg-gradient-to-r from-brand-gold/40 to-brand-gold transition-all duration-700" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                            <span className="text-sm font-black text-white/60 shrink-0">{s.total_points.toLocaleString()}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {filteredLeaderboard.length === 0 && (
                        <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] py-12 text-center">
                            <Trophy size={28} className="text-white/10 mx-auto mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                                {t('gamification.awaitingSyncData')}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Streaks Tab ── */}
            {activeView === 'streaks' && (
                <div className="animate-in fade-in duration-500 space-y-4 sm:space-y-6">
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
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold">{t('gamification.streakRank', { value: i + 1 })}</span>
                                                </div>
                                                {i === 0 && <Crown size={16} className="text-brand-alert" />}
                                            </div>
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 border border-brand-gold/20 flex items-center justify-center shrink-0">
                                                    <span className="text-brand-gold text-sm font-black">{c.user_name?.charAt(0) || '?'}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-lg font-geometric font-black text-white truncate">{c.user_name}</p>
                                                    <p className="text-[10px] text-white/40 uppercase tracking-wider truncate">{outlet?.name || t('gamification.outletFallback')}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-black text-white">{c.streak_days}</span>
                                                <span className="text-[10px] font-bold text-white/40 uppercase">{t('gamification.days')}</span>
                                            </div>
                                        </div>
                                        );
                                    })}
                            </div>

                            {/* Full check-in list */}
                            <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] overflow-hidden">
                                <table className="w-full">
                                    <colgroup>
                                        <col className="w-[40%]" />
                                        <col className="w-[20%]" />
                                        <col className="w-[20%]" />
                                        <col className="w-[20%]" />
                                    </colgroup>
                                    <thead>
                                        <tr className="border-b border-brand-gold/15">
                                            <th className="px-5 py-3 text-left text-[10px] font-black text-brand-gold uppercase tracking-widest">{t('gamification.userHeader')}</th>
                                            <th className="px-5 py-3 text-center text-[10px] font-black text-brand-gold uppercase tracking-widest">{t('gamification.entriesHeader')}</th>
                                            <th className="px-5 py-3 text-center text-[10px] font-black text-brand-gold uppercase tracking-widest">{t('gamification.streakHeader')}</th>
                                            <th className="px-5 py-3 text-right text-[10px] font-black text-brand-gold uppercase tracking-widest">{t('gamification.dateHeader')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-brand-gold/5">
                                        {checkins.map((c, i) => {
                                            const outlet = outlets.find((o: any) => o.id === c.outlet_code);
                                            const formattedDate = new Date(c.checkin_date).toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric' });
                                            return (
                                            <tr key={i} className="hover:bg-brand-gold/5 transition-all">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 border border-brand-gold/20 flex items-center justify-center shrink-0">
                                                            <span className="text-brand-gold text-xs font-black">{c.user_name?.charAt(0) || '?'}</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-white truncate">{c.user_name}</p>
                                                            <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider truncate">{outlet?.name || t('gamification.outletFallback')}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <div className="flex items-center gap-1.5 justify-center">
                                                        <span className="text-brand-eco text-[11px] font-black" title="Waste">{c.waste_entries}</span>
                                                        <span className="text-white/15 text-[10px]">/</span>
                                                        <span className="text-blue-400 text-[11px] font-black" title="Water">{c.water_entries}</span>
                                                        <span className="text-white/15 text-[10px]">/</span>
                                                        <span className="text-amber-400 text-[11px] font-black" title="Energy">{c.energy_entries}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <div className="flex items-center gap-1 justify-center">
                                                        <Flame size={12} className={c.streak_days >= 3 ? 'text-brand-alert' : 'text-white/30'} />
                                                        <span className="text-sm font-black text-white">{c.streak_days}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-right text-[10px] text-white/30 font-medium">{formattedDate}</td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── Live Activity Tab ── */}
            {activeView === 'activity' && (
                <LiveActivityTab logs={logs} t={t} lang={lang} />
            )}
        </div>
    );
};

// ── Live Activity Tab — grouped by date, collapsible ──
const ACTION_META: Record<string, { icon: React.ReactNode; color: string; labelKey: string }> = {
    'on-time_entry':      { icon: <Clock size={13} />,        color: '#22c55e', labelKey: 'gamification.actOnTimeEntry' },
    'on_time_entry':      { icon: <Clock size={13} />,        color: '#22c55e', labelKey: 'gamification.actOnTimeEntry' },
    'entry_with_image':   { icon: <Camera size={13} />,       color: '#60a5fa', labelKey: 'gamification.actEntryWithImage' },
    'energy_reading':     { icon: <Zap size={13} />,          color: '#fbbf24', labelKey: 'gamification.actEnergyReading' },
    '5-day_streak_bonus': { icon: <Flame size={13} />,        color: '#f97316', labelKey: 'gamification.act5DayStreakBonus' },
    '5_day_streak_bonus': { icon: <Flame size={13} />,        color: '#f97316', labelKey: 'gamification.act5DayStreakBonus' },
    'mila_comment':       { icon: <Star size={13} />,         color: '#a78bfa', labelKey: 'gamification.actMilaComment' },
    'mila_suggestion':    { icon: <Star size={13} />,         color: '#a78bfa', labelKey: 'gamification.actMilaSuggestion' },
    'accuracy_bonus':     { icon: <CheckCircle2 size={13} />, color: '#34d399', labelKey: 'gamification.actAccuracyBonus' },
    'daily_checkin':      { icon: <CheckCircle2 size={13} />, color: '#22c55e', labelKey: 'gamification.actDailyCheckin' },
    'waste_log':          { icon: <Leaf size={13} />,         color: '#4ade80', labelKey: 'gamification.actWasteLog' },
    'water_log':          { icon: <Droplets size={13} />,     color: '#38bdf8', labelKey: 'gamification.actWaterLog' },
    'points_earned':      { icon: <Trophy size={13} />,       color: '#C8A413', labelKey: 'gamification.actPointsEarned' },
};

const LiveActivityTab: React.FC<{
    logs: ActionLogEntry[];
    t: (key: string, opts?: any) => string;
    lang: string;
}> = ({ logs, t, lang }) => {
    const [expanded, setExpanded] = useState(false);
    const VISIBLE_COUNT = 6;
    const dateLocale = lang === 'es' ? 'es-ES' : 'en-US';
    const timeLocale = lang === 'es' ? 'es-ES' : 'en-US';

    // Group logs by date
    const grouped = useMemo(() => {
        const groups: Record<string, ActionLogEntry[]> = {};
        logs.forEach(log => {
            const dateKey = new Date(log.created_at).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(log);
        });
        return Object.entries(groups).sort((a, b) => {
            const da = new Date(a[1][0].created_at).getTime();
            const db = new Date(b[1][0].created_at).getTime();
            return db - da;
        });
    }, [logs, dateLocale]);

    if (logs.length === 0) {
        return (
            <div className="animate-in fade-in duration-500">
                <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] py-12 text-center">
                    <Zap size={32} className="text-white/20 mx-auto mb-3" />
                    <p className="text-sm text-white/40">{t('gamification.noRecentActivity')}</p>
                </div>
            </div>
        );
    }

    // Flatten for visible count
    const flatLogs = logs;
    const visibleLogs = expanded ? flatLogs : flatLogs.slice(0, VISIBLE_COUNT);

    // Re-group visible logs by date
    const visibleGrouped = useMemo(() => {
        const groups: Record<string, ActionLogEntry[]> = {};
        visibleLogs.forEach(log => {
            const dateKey = new Date(log.created_at).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(log);
        });
        return Object.entries(groups).sort((a, b) => {
            const da = new Date(a[1][0].created_at).getTime();
            const db = new Date(b[1][0].created_at).getTime();
            return db - da;
        });
    }, [visibleLogs, dateLocale]);

    return (
        <div className="animate-in fade-in duration-500">
            <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-brand-gold/10 bg-brand-gold/5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 bg-brand-eco rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-white">{t('gamification.tabLiveActivity')}</h3>
                    </div>
                    <span className="text-[9px] font-black text-brand-gold/60 uppercase tracking-widest">{t('gamification.eventsCount', { count: logs.length })}</span>
                </div>

                {/* Timeline */}
                <div className="p-4 sm:p-5 space-y-5 max-h-[520px] overflow-y-auto scrollbar-thin scrollbar-thumb-brand-gold/20 scrollbar-track-transparent">
                    {visibleGrouped.map(([dateKey, dateLogs]) => {
                        const dayPoints = dateLogs.reduce((s, l) => s + l.points_awarded, 0);
                        return (
                            <div key={dateKey}>
                                {/* Date header */}
                                <div className="flex items-center gap-3 mb-2.5">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={11} className="text-brand-gold/50" />
                                        <span className="text-[10px] font-black text-brand-gold/70 uppercase tracking-widest">{dateKey}</span>
                                    </div>
                                    <div className="flex-1 h-px bg-brand-gold/10" />
                                    <span className="text-[9px] font-black text-white/30 uppercase tracking-wider">+{dayPoints} pts</span>
                                </div>

                                {/* Activity rows */}
                                <div className="space-y-1.5 ml-1">
                                    {dateLogs.map(log => {
                                        const lookupKey = log.action_key || log.action_name.replace(/\s+/g, '_');
                                        const meta = ACTION_META[lookupKey] || { icon: <Trophy size={13} />, color: '#C8A413', labelKey: 'gamification.actPointsEarned' };
                                        const timeStr = new Date(log.created_at).toLocaleTimeString(timeLocale, { hour: 'numeric', minute: '2-digit' });
                                        return (
                                            <div key={log.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-brand-gold/5 transition-all group">
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                                     style={{ backgroundColor: `${meta.color}15`, border: `1px solid ${meta.color}30`, color: meta.color }}>
                                                    {meta.icon}
                                                </div>
                                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                                    <span className="text-[11px] font-bold text-white truncate">{t(meta.labelKey)}</span>
                                                    <span className="text-white/15 text-[10px]">·</span>
                                                    <span className="text-[9px] font-black text-white/40 uppercase tracking-wider truncate">{log.staff_name}</span>
                                                </div>
                                                <span className="text-[9px] text-white/25 font-medium shrink-0 hidden sm:inline">{timeStr}</span>
                                                <span className="text-xs font-black shrink-0" style={{ color: meta.color }}>+{log.points_awarded}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Show more / less */}
                {logs.length > VISIBLE_COUNT && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-full flex items-center justify-center gap-2 py-3 border-t border-brand-gold/10 hover:bg-brand-gold/5 transition-all text-[10px] font-black uppercase tracking-widest text-brand-gold/60 hover:text-brand-gold"
                    >
                        {expanded ? (
                            <><ChevronUp size={14} /> {t('gamification.showLess')}</>
                        ) : (
                            <><ChevronDown size={14} /> {t('gamification.showMore', { count: logs.length - VISIBLE_COUNT })}</>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

// ── Podium Card for top 3 leaderboard entries ──
const PodiumCard: React.FC<{
    rank: number;
    name: string;
    points: number;
    outlet: string;
    color: string;
    icon: React.ReactNode;
    accent: string;
    height: string;
}> = ({ rank, name, points, outlet, color, icon, accent, height }) => {
    const { t } = useI18n();
    const isFirst = rank === 1;
    return (
        <div className="flex flex-col items-center w-full">
            {/* Crown for 1st */}
            {isFirst && (
                <div className="mb-1">
                    <Crown size={18} className="text-brand-gold" fill="currentColor" />
                </div>
            )}

            {/* Avatar */}
            <div className="relative mb-2">
                <div
                    className={`rounded-full flex items-center justify-center border-2 shrink-0 ${isFirst ? 'w-14 h-14 sm:w-16 sm:h-16' : 'w-11 h-11 sm:w-12 sm:h-12'}`}
                    style={{
                        borderColor: isFirst ? '#C8A413' : `${accent}50`,
                        backgroundColor: '#1c3933',
                        boxShadow: isFirst ? '0 0 12px rgba(200,164,19,0.25)' : 'none',
                    }}
                >
                    <span
                        className="font-black"
                        style={{
                            color: isFirst ? '#C8A413' : accent,
                            fontSize: isFirst ? '16px' : '13px',
                        }}
                    >
                        {name.charAt(0).toUpperCase()}
                    </span>
                </div>
                {/* Rank badge */}
                <div
                    className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-[#1c3933]"
                    style={{
                        backgroundColor: isFirst ? '#C8A413' : accent,
                        color: isFirst ? '#1c3933' : '#fff',
                    }}
                >
                    {rank}
                </div>
            </div>

            {/* Name */}
            <p className={`text-center font-geometric font-bold text-white truncate max-w-full leading-tight ${isFirst ? 'text-sm' : 'text-[11px]'}`}>{name}</p>
            {outlet && <p className="text-[8px] font-bold uppercase tracking-wider text-brand-gold/40 truncate max-w-full mb-1">{outlet}</p>}

            {/* Podium platform */}
            <div
                className={`relative ${height} w-full rounded-t-lg flex flex-col items-center justify-end pb-3 overflow-hidden border-t-2 border-x border-brand-gold/10 bg-[#1c3933]`}
            >
                {/* Accent top bar */}
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: isFirst ? '#C8A413' : `${accent}60` }} />

                {/* Icon */}
                <div className="mb-1.5 opacity-70" style={{ color: isFirst ? '#C8A413' : accent }}>
                    {icon}
                </div>

                {/* Points */}
                <p
                    className="font-geometric font-black leading-none"
                    style={{ color: isFirst ? '#C8A413' : '#fff', fontSize: isFirst ? '18px' : '15px' }}
                >
                    {points.toLocaleString()}
                </p>
                <p className="text-[7px] font-black uppercase tracking-widest text-white/25 mt-1">{t('gamification.pts')}</p>
            </div>
        </div>
    );
};

// ── Outlet Filter Dropdown — matches Ecometricus CustomSelect design ──
const OutletFilterDropdown: React.FC<{
    value: string;
    options: { id?: string; name: string; code: string }[];
    onChange: (v: string) => void;
    allLabel: string;
}> = ({ value, options, onChange, allLabel }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const selectedName = value === 'all' ? allLabel : (options.find(o => o.id === value)?.name || allLabel);

    return (
        <div ref={ref} className="relative min-w-[160px]">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-2 bg-brand-dark/60 border border-brand-gold/20 rounded-xl pl-9 pr-8 py-2.5 text-[11px] font-black uppercase tracking-widest text-white/70 hover:border-brand-gold/40 transition-all cursor-pointer outline-none"
            >
                <Building2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-gold/50 pointer-events-none" />
                <span className="truncate">{selectedName}</span>
                <ChevronDown size={12} className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute z-[9999] mt-1 w-full rounded-xl border border-brand-gold/25 bg-[#152E2A] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
                    <ul className="max-h-56 overflow-y-auto scrollbar-gold py-1">
                        <li>
                            <button
                                type="button"
                                onClick={() => { onChange('all'); setOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 ${value === 'all' ? 'text-brand-gold bg-brand-gold/10' : 'text-white/70 hover:text-white hover:bg-brand-dark/60'}`}
                            >
                                {value === 'all' && <Check size={12} className="text-brand-gold shrink-0" />}
                                {value !== 'all' && <span className="w-3 shrink-0" />}
                                {allLabel}
                            </button>
                        </li>
                        {options.map(o => (
                            <li key={o.id}>
                                <button
                                    type="button"
                                    onClick={() => { onChange(o.id!); setOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 ${value === o.id ? 'text-brand-gold bg-brand-gold/10' : 'text-white/70 hover:text-white hover:bg-brand-dark/60'}`}
                                >
                                    {value === o.id && <Check size={12} className="text-brand-gold shrink-0" />}
                                    {value !== o.id && <span className="w-3 shrink-0" />}
                                    {o.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default GamificationHub;
