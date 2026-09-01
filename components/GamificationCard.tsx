import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, Flame, Star, Zap, Camera, MessageSquare, Award, Sparkles, Target, Crown, Medal, CheckCircle2 } from 'lucide-react';
import { fetchUserStats, fetchTodayCompletedActions } from '../lib/gamification';
import { useI18n } from '../lib/useI18n';
import type { UserProfile } from '../types';

interface GamificationCardProps {
  user: UserProfile;
}

const BADGE_TIERS = [
  { label: 'Gold',     min: 2000, color: '#F59E0B', glow: 'rgba(245,158,11,0.4)',  emoji: '🥇', icon: Crown },
  { label: 'Silver',   min: 1000, color: '#C0C8D4', glow: 'rgba(192,200,212,0.3)', emoji: '🥈', icon: Medal },
  { label: 'Bronze',   min: 500,  color: '#CD7C2F', glow: 'rgba(205,124,47,0.3)',  emoji: '🥉', icon: Medal },
  { label: 'Starter',  min: 0,    color: '#77B139', glow: 'rgba(119,177,57,0.3)',  emoji: '🌱', icon: Sparkles },
];

const ACTIONS = [
  { action: 'On-Time Entry',      pts: 10, descKey: 'gamification.questOnTime',      icon: Zap,           color: '#C8A413' },
  { action: 'Entry with Image',   pts: 10, descKey: 'gamification.questPhoto',       icon: Camera,        color: '#3b82f6' },
  { action: 'Energy Reading',     pts: 10, descKey: 'gamification.questEnergy',      icon: Zap,           color: '#f97316' },
  { action: '5-Day Streak Bonus', pts: 50, descKey: 'gamification.questStreak',      icon: Flame,         color: '#ef4444' },
  { action: 'Mila Comment',       pts: 5,  descKey: 'gamification.questMila',        icon: MessageSquare, color: '#77B139' },
];

// Animated counter that counts up to the target value
const useCountUp = (target: number, duration = 800) => {
  const [value, setValue] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const start = prevRef.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(start + diff * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
};

// Circular progress ring
const ProgressRing: React.FC<{ progress: number; size: number; stroke: number; color: string; glow: string; children?: React.ReactNode }> = ({
  progress, size, stroke, color, glow, children
}) => {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
        <circle
          cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out', filter: `drop-shadow(0 0 6px ${glow})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

const GamificationCard: React.FC<GamificationCardProps> = ({ user }) => {
  const { t } = useI18n();
  const [stats, setStats] = useState({ totalPoints: 0, streakDays: 0, rank: 1 });
  const [loading, setLoading] = useState(true);
  const [justEarned, setJustEarned] = useState(false);
  const [todayDone, setTodayDone] = useState<Set<string>>(new Set());
  const prevPointsRef = useRef(0);

  const load = useCallback(async () => {
    if (!user.id) return;
    const [s, done] = await Promise.all([
      fetchUserStats(user.id),
      fetchTodayCompletedActions(user.id),
    ]);
    if (s.totalPoints > prevPointsRef.current && prevPointsRef.current > 0) {
      setJustEarned(true);
      setTimeout(() => setJustEarned(false), 2000);
    }
    prevPointsRef.current = s.totalPoints;
    setStats(s);
    setTodayDone(done);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const handler = () => load();
    window.addEventListener('ecometricus_points_updated', handler);
    return () => window.removeEventListener('ecometricus_points_updated', handler);
  }, [load]);

  const animatedPoints = useCountUp(stats.totalPoints);
  const badge = BADGE_TIERS.find(b => stats.totalPoints >= b.min) ?? BADGE_TIERS[3];
  const nextBadge = BADGE_TIERS[BADGE_TIERS.indexOf(badge) - 1];
  const progressToNext = nextBadge
    ? Math.min(100, ((stats.totalPoints - badge.min) / (nextBadge.min - badge.min)) * 100)
    : 100;
  const ptsToNext = nextBadge ? nextBadge.min - stats.totalPoints : 0;

  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const BadgeIcon = badge.icon;

  return (
    <div className={`relative overflow-hidden rounded-2xl border transition-all duration-500 ${
      justEarned ? 'border-brand-gold/60 scale-[1.01]' : 'border-brand-gold/15'
    }`}
    style={{
      background: `radial-gradient(ellipse at top, ${badge.color}15 0%, #1c3933 60%)`,
    }}>
      {/* Glow burst on points earned */}
      {justEarned && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-brand-gold/20 animate-ping" />
        </div>
      )}

      <div className="relative p-5 sm:p-6">
        {/* Header with badge tier */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all"
            style={{ background: `${badge.color}20`, border: `1px solid ${badge.color}50`, boxShadow: `0 0 12px ${badge.glow}` }}
          >
            <BadgeIcon size={20} style={{ color: badge.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              {t('gamification.earthKeeper')}
              {justEarned && <Sparkles size={12} className="text-brand-gold animate-pulse" />}
            </h3>
            <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">
              {badge.emoji} {t(`gamification.tier${badge.label}`)}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Central progress ring with points */}
            <div className="flex items-center justify-center mb-6">
              <ProgressRing progress={progressToNext} size={140} stroke={8} color={badge.color} glow={badge.glow}>
                <div className="text-center">
                  <div className="text-3xl font-black text-white tabular-nums leading-none">
                    {animatedPoints.toLocaleString()}
                  </div>
                  <div className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">{t('gamification.totalPoints')}</div>
                  {nextBadge && (
                    <div className="text-[8px] font-bold mt-1.5 px-2 py-0.5 rounded-full" style={{ background: `${nextBadge.color}20`, color: nextBadge.color }}>
                      {ptsToNext.toLocaleString()} {t('gamification.to')} {nextBadge.emoji} {t(`gamification.tier${nextBadge.label}`)}
                    </div>
                  )}
                </div>
              </ProgressRing>
            </div>

            {/* Stats row — streak + rank */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {/* Streak */}
              <div className="relative rounded-xl p-4 overflow-hidden" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Flame size={14} className="text-[#ef4444]" />
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{t('gamification.streak')}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-[#ef4444] tabular-nums leading-none">{stats.streakDays}</span>
                  <span className="text-[10px] font-bold text-[#ef4444]/60">{t('gamification.days')}</span>
                </div>
                {/* Streak dots — 5 day milestone tracker */}
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map(d => (
                    <div
                      key={d}
                      className={`h-1 flex-1 rounded-full transition-all ${d <= stats.streakDays % 5 || (stats.streakDays > 0 && stats.streakDays % 5 === 0 && d <= 5) ? 'bg-[#ef4444]' : 'bg-white/10'}`}
                      style={d <= (stats.streakDays % 5 || 5) ? { boxShadow: '0 0 4px rgba(239,68,68,0.5)' } : {}}
                    />
                  ))}
                </div>
              </div>

              {/* Rank */}
              <div className="relative rounded-xl p-4 overflow-hidden" style={{ background: 'rgba(119,177,57,0.08)', border: '1px solid rgba(119,177,57,0.2)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Trophy size={14} className="text-brand-eco" />
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{t('gamification.rank')}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-brand-eco tabular-nums leading-none">{ordinal(stats.rank)}</span>
                </div>
                <div className="text-[9px] font-bold text-brand-eco/60 uppercase tracking-wider mt-2">
                  {stats.rank === 1 ? t('gamification.leadingPack') : stats.rank <= 3 ? t('gamification.podiumFinish') : t('gamification.keepClimbing')}
                </div>
              </div>
            </div>

            {/* Badge progression bar */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: badge.color }}>
                  {badge.emoji} {t(`gamification.tier${badge.label}`)}
                </span>
                {nextBadge && (
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
                    {nextBadge.emoji} {t(`gamification.tier${nextBadge.label}`)}
                  </span>
                )}
              </div>
              <div className="h-2.5 rounded-full bg-white/5 overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-1000 relative"
                  style={{
                    width: `${progressToNext}%`,
                    background: `linear-gradient(90deg, ${badge.color}60, ${badge.color})`,
                    boxShadow: `0 0 8px ${badge.glow}`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                </div>
              </div>
            </div>

            {/* How to earn — gamified quest list */}
            <div>
              <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Target size={11} /> {t('gamification.quests')}
              </p>
              <div className="grid grid-cols-1 gap-2">
                {ACTIONS.map(({ action, pts, descKey, icon: Icon, color }) => {
                  const key = action.toLowerCase().replace(/\s+/g, '_');
                  const done = todayDone.has(key);
                  return (
                    <div
                      key={action}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                        done
                          ? 'bg-brand-eco/8 border-brand-eco/25 opacity-70'
                          : 'bg-white/3 border-white/5 hover:border-white/10 hover:bg-white/5'
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                        style={{ background: done ? '#22c55e20' : `${color}15`, border: `1px solid ${done ? '#22c55e40' : `${color}30`}` }}
                      >
                        {done
                          ? <CheckCircle2 size={13} className="text-brand-eco" />
                          : <Icon size={13} style={{ color }} />
                        }
                      </div>
                      <span className={`text-[11px] flex-1 font-medium ${done ? 'text-brand-eco/70 line-through' : 'text-white/60'}`}>{t(descKey)}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {done
                          ? <span className="text-[10px] font-black text-brand-eco uppercase tracking-wide">{t('gamification.done')}</span>
                          : <><span className="text-[11px] font-black tabular-nums" style={{ color }}>+{pts}</span><Star size={9} className="text-white/20" /></>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Streak milestone callout */}
            {stats.streakDays > 0 && stats.streakDays < 5 && (
              <div className="mt-4 flex items-center gap-2.5 px-3 py-3 rounded-xl bg-[#ef4444]/8 border border-[#ef4444]/25">
                <div className="relative shrink-0">
                  <Flame size={16} className="text-[#ef4444]" />
                  <div className="absolute inset-0 bg-[#ef4444]/30 rounded-full animate-ping" style={{ width: 16, height: 16 }} />
                </div>
                <p className="text-[11px] text-white/70">
                  <span className="font-black text-[#ef4444]">{5 - stats.streakDays} {(5 - stats.streakDays) !== 1 ? t('gamification.moreDayPlural') : t('gamification.moreDay')}</span> {t('gamification.toUnlock')} <span className="font-black text-brand-gold">+50 {t('gamification.pts')}</span> {t('gamification.streakBonus')}!
                </p>
              </div>
            )}
            {stats.streakDays >= 5 && (
              <div className="mt-4 flex items-center gap-2.5 px-3 py-3 rounded-xl bg-brand-eco/8 border border-brand-eco/25">
                <Award size={16} className="text-brand-eco shrink-0" />
                <p className="text-[11px] text-white/70">
                  <span className="font-black text-brand-eco">🔥 {stats.streakDays}-{t('gamification.dayStreakActive')}</span> {t('gamification.nextBonusAt')} {(Math.floor(stats.streakDays / 5) + 1) * 5}.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GamificationCard;
