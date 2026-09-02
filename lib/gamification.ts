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
): Promise<number> {
  try {
    const { data: actionRow } = await supabase
      .from('gamification_actions')
      .select('id, points')
      .eq('display_name', action)
      .maybeSingle();

    if (!actionRow) {
      console.warn('[Gamification] Unknown action:', action);
      return 0;
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
      return 0;
    }

    // Insert with action_key for activity feed
    const { error: insertError } = await supabase.from('gamification_ledger').insert({
      profile_id: userId,
      points_awarded: actionRow.points,
      outlet_id: outletId,
      action_key: actionKey,
    });

    if (insertError) {
      console.error('[Gamification] Ledger insert failed:', insertError.message);
      return 0;
    }

    console.log(`[Gamification] Awarded ${actionRow.points} pts for "${action}" to ${userId}`);
    return actionRow.points;
  } catch (err) {
    console.error('[Gamification] awardPoints failed:', err);
    return 0;
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
 * Streak is calculated from daily_checkins, with a fallback to
 * distinct activity dates from waste/resource logs if check-ins
 * are missing or have wrong streak_days values.
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

    // Streak days from daily_checkins (most recent row)
    const { data: checkin } = await supabase
      .from('daily_checkins')
      .select('streak_days, checkin_date')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    let streakDays = checkin?.streak_days ?? 0;

    // ── Fallback: if no check-in data or streak is 0, calculate from actual logs ──
    // This handles the case where record_daily_checkin RPC failed or wasn't deployed
    if (streakDays === 0) {
      streakDays = await calculateStreakFromLogs(userId);
    }

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

/**
 * Calculate streak from actual waste + resource log dates.
 * Counts consecutive days (ending today or yesterday) where the user
 * has at least one log entry.
 */
async function calculateStreakFromLogs(userId: string): Promise<number> {
  try {
    // Fetch all waste logs for this user
    const { data: wasteLogs } = await supabase
      .from('food_waste_logs')
      .select('created_at')
      .eq('user_id', userId);

    // Fetch all resource logs for this user
    const { data: resourceLogs } = await supabase
      .from('resource_logs')
      .select('created_at')
      .eq('user_id', userId);

    // Collect distinct dates (UTC YYYY-MM-DD from ISO timestamp)
    const dates = new Set<string>();
    [...(wasteLogs || []), ...(resourceLogs || [])].forEach((log: any) => {
      if (log.created_at) {
        dates.add(log.created_at.split('T')[0]);
      }
    });

    if (dates.size === 0) return 0;

    // Walk backwards from today (UTC), counting consecutive days
    const todayUTC = new Date().toISOString().split('T')[0];
    const yesterdayUTC = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Determine streak start date (today or yesterday, UTC)
    let cursorStr: string;
    if (dates.has(todayUTC)) {
      cursorStr = todayUTC;
    } else if (dates.has(yesterdayUTC)) {
      cursorStr = yesterdayUTC;
    } else {
      return 0; // No activity today or yesterday — streak broken
    }

    // Walk backwards counting consecutive days
    let streak = 0;
    const cursor = new Date(cursorStr + 'T00:00:00Z');
    while (dates.has(cursor.toISOString().split('T')[0])) {
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    console.log(`[Gamification] Streak from logs: ${streak} days (${dates.size} distinct dates)`);
    return streak;
  } catch (err) {
    console.error('[Gamification] calculateStreakFromLogs failed:', err);
    return 0;
  }
}

/**
 * Recalculate and fix streak_days for a user.
 *
 * 1. Backfills missing daily_checkins rows from waste/resource log dates
 *    (in case the record_daily_checkin RPC failed or wasn't deployed).
 * 2. Walks through all check-ins chronologically, counting consecutive days.
 * 3. Updates any rows where streak_days is incorrect.
 *
 * Returns the correct current streak.
 */
export async function recalculateStreak(userId: string): Promise<number> {
  try {
    // ── Step 1: Backfill missing check-ins from actual log dates ──
    const { data: wasteLogs } = await supabase
      .from('food_waste_logs')
      .select('created_at')
      .eq('user_id', userId);

    const { data: resourceLogs } = await supabase
      .from('resource_logs')
      .select('created_at')
      .eq('user_id', userId);

    // Collect distinct activity dates
    const activityDates = new Set<string>();
    [...(wasteLogs || []), ...(resourceLogs || [])].forEach((log: any) => {
      if (log.created_at) {
        // Use UTC date directly from ISO string to avoid timezone shifts
        activityDates.add(log.created_at.split('T')[0]);
      }
    });

    // Fetch existing check-in dates
    const { data: existingCheckins } = await supabase
      .from('daily_checkins')
      .select('checkin_date')
      .eq('user_id', userId);

    const existingDates = new Set(
      (existingCheckins || []).map((c: any) => {
        return c.checkin_date.split('T')[0];
      })
    );

    // Find dates with activity but no check-in row
    const missingDates = [...activityDates].filter(d => !existingDates.has(d)).sort();

    if (missingDates.length > 0) {
      console.log(`[Gamification] Backfilling ${missingDates.length} missing check-in rows`);
      // Fetch user info for the check-in rows
      const { data: { session } } = await supabase.auth.getSession();
      const { data: personnelRow } = await supabase
        .from('personnel')
        .select('outlet_id, full_name, role, email')
        .eq('user_id', userId)
        .maybeSingle();

      // Also try by email
      let personnel = personnelRow;
      if (!personnel && session?.user?.email) {
        const { data: byEmail } = await supabase
          .from('personnel')
          .select('outlet_id, full_name, role, email')
          .ilike('email', session.user.email)
          .maybeSingle();
        personnel = byEmail;
      }

      for (const dateStr of missingDates) {
        const { error: insertErr } = await supabase.from('daily_checkins').upsert({
          user_id: userId,
          user_name: personnel?.full_name || session?.user?.email?.split('@')[0] || 'Staff',
          user_role: personnel?.role || 'basic',
          outlet_code: personnel?.outlet_id || '',
          waste_entries: 0,
          water_entries: 0,
          energy_entries: 0,
          streak_days: 1, // Will be corrected below
          checkin_date: dateStr,
        }, { onConflict: 'user_id,checkin_date' });
        if (insertErr) {
          console.error('[Gamification] Backfill upsert failed for', dateStr, insertErr.message);
        }
      }
    }

    // ── Step 2: Recalculate streak_days for all check-ins ──
    const { data: checkins, error } = await supabase
      .from('daily_checkins')
      .select('id, checkin_date, streak_days')
      .eq('user_id', userId)
      .order('checkin_date', { ascending: true });

    if (error || !checkins || checkins.length === 0) {
      console.log('[Gamification] No check-ins found after backfill:', error?.message);
      // ── Fallback: calculate streak directly from log dates ──
      return calculateStreakFromLogs(userId);
    }

    // Sort by date ascending (oldest first)
    const sorted = [...checkins].sort((a, b) => new Date(a.checkin_date).getTime() - new Date(b.checkin_date).getTime());

    // Walk through and calculate consecutive streak for each day
    // Use UTC date strings for comparison to avoid timezone shifts
    let currentStreak = 0;
    let prevDateStr: string | null = null;
    const updates: { id: string; streak: number }[] = [];

    for (const c of sorted) {
      const dateStr = c.checkin_date.split('T')[0];

      if (prevDateStr) {
        const prev = new Date(prevDateStr + 'T00:00:00Z');
        const curr = new Date(dateStr + 'T00:00:00Z');
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          currentStreak++;
        } else if (diffDays > 1) {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }

      prevDateStr = dateStr;

      if (c.streak_days !== currentStreak) {
        updates.push({ id: c.id, streak: currentStreak });
      }
    }

    // Apply updates
    for (const u of updates) {
      const { error: updateErr } = await supabase
        .from('daily_checkins')
        .update({ streak_days: u.streak })
        .eq('id', u.id);
      if (updateErr) {
        console.error('[Gamification] Failed to update streak for check-in', u.id, updateErr.message);
      }
    }

    console.log(`[Gamification] Recalculated streak for ${userId}: ${currentStreak} (updated ${updates.length} rows, backfilled ${missingDates.length})`);
    return currentStreak;
  } catch (err) {
    console.error('[Gamification] recalculateStreak failed:', err);
    return 0;
  }
}

/**
 * Backfill missing gamification points based on actual log activity.
 *
 * Scans food_waste_logs and resource_logs for the user, determines which
 * days they had activity, and checks the gamification_ledger to see if
 * points were awarded for each action on each day. If not, awards them.
 *
 * This fixes the case where awardPoints() was never called or failed
 * silently on previous days.
 *
 * @param userId   Supabase auth user ID
 * @param outletId UUID of the user's outlet
 * @returns total points awarded during backfill
 */
export async function backfillPoints(userId: string, outletId: string): Promise<number> {
  try {
    // Fetch all waste logs for this user
    const { data: wasteLogs } = await supabase
      .from('food_waste_logs')
      .select('created_at, image_url')
      .eq('user_id', userId);

    // Fetch all resource logs for this user
    const { data: resourceLogs } = await supabase
      .from('resource_logs')
      .select('created_at, energy_kwh')
      .eq('user_id', userId);

    // Fetch existing ledger entries to know what's already been awarded
    const { data: existingLedger } = await supabase
      .from('gamification_ledger')
      .select('action_key, created_at, points_awarded')
      .eq('profile_id', userId);

    // Build a set of "YYYY-MM-DD" that already have ANY entry.
    // This is a conservative dedup: if there are already entries for a date,
    // we skip that date entirely. This prevents duplicates from null action_key
    // entries and from multiple backfill runs.
    const awardedDates = new Set<string>();
    (existingLedger || []).forEach((entry: any) => {
      if (entry.created_at) {
        // Use UTC date extraction (not local) to avoid timezone shifts
        const dateStr = entry.created_at.split('T')[0];
        awardedDates.add(dateStr);
      }
    });

    // Also count existing points per date to know if we need to top up
    const existingPointsByDate: Record<string, number> = {};
    (existingLedger || []).forEach((entry: any) => {
      if (entry.created_at) {
        const dateStr = entry.created_at.split('T')[0];
        existingPointsByDate[dateStr] = (existingPointsByDate[dateStr] || 0) + (entry.points_awarded || 0);
      }
    });

    // Fetch action points mapping
    const { data: actions } = await supabase
      .from('gamification_actions')
      .select('display_name, points');

    const actionPoints: Record<string, number> = {};
    (actions || []).forEach((a: any) => {
      actionPoints[a.display_name] = a.points;
    });

    let totalAwarded = 0;

    // Helper: extract UTC YYYY-MM-DD from an ISO timestamp
    const toUTCDate = (isoStr: string): string => {
      return isoStr.split('T')[0];
    };

    // Helper: award a specific action for a specific date if not already awarded
    const awardIfMissing = async (action: GamificationAction, dateStr: string) => {
      const actionKey = action.toLowerCase().replace(/\s+/g, '_');
      const pts = actionPoints[action];
      if (!pts) return;

      // Use noon UTC to avoid timezone edge cases
      const createdISO = dateStr + 'T12:00:00+00:00';

      const { error } = await supabase.from('gamification_ledger').insert({
        profile_id: userId,
        points_awarded: pts,
        outlet_id: outletId,
        action_key: actionKey,
        created_at: createdISO,
      });

      if (error) {
        console.error(`[Gamification] Backfill points failed: ${action} for ${dateStr}`, error.message);
      } else {
        totalAwarded += pts;
        console.log(`[Gamification] Backfilled ${action} (+${pts}) for ${dateStr}`);
      }
    };

    // Collect all activity dates (UTC) and what actions they qualify for
    const activityMap = new Map<string, { hasWaste: boolean; hasImage: boolean; hasEnergy: boolean }>();

    (wasteLogs || []).forEach((log: any) => {
      if (log.created_at) {
        const dateStr = toUTCDate(log.created_at);
        const hasImage = !!(log.image_url && log.image_url !== '[]' && log.image_url !== '');
        const existing = activityMap.get(dateStr) || { hasWaste: false, hasImage: false, hasEnergy: false };
        existing.hasWaste = true;
        existing.hasImage = existing.hasImage || hasImage;
        activityMap.set(dateStr, existing);
      }
    });

    (resourceLogs || []).forEach((log: any) => {
      if (log.created_at) {
        const dateStr = toUTCDate(log.created_at);
        const hasEnergy = Number(log.energy_kwh) > 0;
        const existing = activityMap.get(dateStr) || { hasWaste: false, hasImage: false, hasEnergy: false };
        existing.hasEnergy = existing.hasEnergy || hasEnergy;
        activityMap.set(dateStr, existing);
      }
    });

    // For each activity date, check if points are missing and award them
    // Expected per day: On-Time Entry (10) + Entry with Image (10 if images) + Energy Reading (10 if energy)
    for (const [dateStr, activity] of activityMap) {
      const expectedPoints = 10 + (activity.hasImage ? 10 : 0) + (activity.hasEnergy ? 10 : 0);
      const existingPts = existingPointsByDate[dateStr] || 0;

      if (existingPts >= expectedPoints) {
        // Already has enough points for this date — skip
        continue;
      }

      // If no existing entries for this date at all, award all qualifying actions
      if (existingPts === 0) {
        await awardIfMissing('On-Time Entry', dateStr);
        if (activity.hasImage) await awardIfMissing('Entry with Image', dateStr);
        if (activity.hasEnergy) await awardIfMissing('Energy Reading', dateStr);
      }
      // If partial points exist, we could top up, but to keep it simple and safe,
      // we only backfill dates with ZERO entries. Partial dates are left as-is
      // to avoid creating duplicates.
    }

    console.log(`[Gamification] Points backfill complete: +${totalAwarded} pts for ${userId}`);
    return totalAwarded;
  } catch (err) {
    console.error('[Gamification] backfillPoints failed:', err);
    return 0;
  }
}
