import { supabase } from './supabase';

export type GamificationAction =
  | 'Entry with Image'
  | 'On-Time Entry'
  | 'Energy Reading'
  | '5-Day Streak Bonus'
  | 'Mila Comment';

/**
 * Award points to a user's gamification ledger.
 * Non-fatal — never throws; errors are logged only.
 *
 * @param userId   Supabase auth user ID (= profiles.id)
 * @param action   Action name matching gamification_actions.display_name
 * @param outletId UUID of the outlet (gamification_ledger.outlet_id is NOT NULL)
 */
export async function awardPoints(
  userId: string,
  action: GamificationAction,
  outletId: string
): Promise<void> {
  try {
    const { data: actionRow } = await supabase
      .from('gamification_actions')
      .select('id, points')
      .eq('display_name', action)
      .maybeSingle();

    if (!actionRow) {
      console.warn('[Gamification] Unknown action:', action);
      return;
    }

    // ── Daily deduplication: only award each action once per day ──
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const actionKey = action.toLowerCase().replace(/\s+/g, '_');

    const { data: existing } = await supabase
      .from('gamification_ledger')
      .select('id')
      .eq('profile_id', userId)
      .eq('action_key', actionKey)
      .gte('created_at', todayStart.toISOString())
      .maybeSingle();

    if (existing) {
      console.log(`[Gamification] Already awarded "${action}" today — skipping`);
      return;
    }

    // Insert with action_key for activity feed
    await supabase.from('gamification_ledger').insert({
      profile_id: userId,
      points_awarded: actionRow.points,
      outlet_id: outletId,
      action_key: actionKey,
    });
  } catch (err) {
    console.error('[Gamification] awardPoints failed:', err);
  }
}

/**
 * Fetch which quest actions the user has already completed today.
 * Returns a Set of action_key strings completed since midnight.
 */
export async function fetchTodayCompletedActions(userId: string): Promise<Set<string>> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('gamification_ledger')
      .select('action_key')
      .eq('profile_id', userId)
      .gte('created_at', todayStart.toISOString());
    return new Set((data || []).map((r: any) => r.action_key).filter(Boolean));
  } catch {
    return new Set();
  }
}

/**
 * Fetch the current user's total points, streak days, and rank.
 */
export async function fetchUserStats(userId: string): Promise<{
  totalPoints: number;
  streakDays: number;
  rank: number;
}> {
  try {
    // Total points
    const { data: ledger } = await supabase
      .from('gamification_ledger')
      .select('points_awarded')
      .eq('profile_id', userId);

    const totalPoints = ledger?.reduce((sum, r) => sum + (r.points_awarded || 0), 0) ?? 0;

    // Streak days from daily_checkins
    const { data: checkin } = await supabase
      .from('daily_checkins')
      .select('streak_days')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const streakDays = checkin?.streak_days ?? 0;

    // Rank: count how many users have more points
    const { data: allTotals } = await supabase
      .from('gamification_ledger')
      .select('profile_id, points_awarded');

    let rank = 1;
    if (allTotals) {
      const totalsMap: Record<string, number> = {};
      for (const row of allTotals) {
        if (row.profile_id) {
          totalsMap[row.profile_id] = (totalsMap[row.profile_id] || 0) + row.points_awarded;
        }
      }
      const myTotal = totalsMap[userId] ?? totalPoints;
      rank = Object.values(totalsMap).filter(t => t > myTotal).length + 1;
    }

    return { totalPoints, streakDays, rank };
  } catch (err) {
    console.error('[Gamification] fetchUserStats failed:', err);
    return { totalPoints: 0, streakDays: 0, rank: 1 };
  }
}
