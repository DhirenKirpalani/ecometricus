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

    // Insert without action_id (column may not exist in some deployments)
    await supabase.from('gamification_ledger').insert({
      profile_id: userId,
      points_awarded: actionRow.points,
      outlet_id: outletId,
    });
  } catch (err) {
    console.error('[Gamification] awardPoints failed:', err);
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
