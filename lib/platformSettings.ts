import { supabase } from './supabase';

// ── Types ──────────────────────────────────────────────────────────────────
export interface PlatformSettings {
  weekly_reset_day: number;  // 0=Sun, 1=Mon, ... 6=Sat
  banner_enabled: boolean;
  banner_text: string;
  banner_type: 'info' | 'warning' | 'success';
}

const DEFAULT_SETTINGS: PlatformSettings = {
  weekly_reset_day: 6,       // Saturday
  banner_enabled: false,
  banner_text: '',
  banner_type: 'info',
};

// In-memory cache so we don't hit Supabase on every chart render
let cachedSettings: PlatformSettings | null = null;
let fetchPromise: Promise<PlatformSettings> | null = null;

// ── Load settings from Supabase (with cache) ───────────────────────────────
export async function getPlatformSettings(force = false): Promise<PlatformSettings> {
  if (cachedSettings && !force) return cachedSettings;
  if (fetchPromise && !force) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        cachedSettings = { ...DEFAULT_SETTINGS };
        return cachedSettings;
      }

      cachedSettings = {
        weekly_reset_day: typeof data.weekly_reset_day === 'number' ? data.weekly_reset_day : DEFAULT_SETTINGS.weekly_reset_day,
        banner_enabled: !!data.banner_enabled,
        banner_text: data.banner_text || '',
        banner_type: (data.banner_type as PlatformSettings['banner_type']) || 'info',
      };
      return cachedSettings;
    } catch {
      cachedSettings = { ...DEFAULT_SETTINGS };
      return cachedSettings;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

// ── Save settings to Supabase ──────────────────────────────────────────────
export async function savePlatformSettings(settings: Partial<PlatformSettings>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('platform_settings')
      .upsert({
        ...settings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) return false;

    // Refresh cache
    cachedSettings = null;
    await getPlatformSettings(true);
    return true;
  } catch {
    return false;
  }
}

// ── Week-start calculation ─────────────────────────────────────────────────
// Returns the Date representing the start of the current chart week
// (midnight local time on the day AFTER the configured reset day).
//
// weeklyResetDay: 0=Sun, 1=Mon, ... 6=Sat
// The reset day is the LAST day of the chart week. The new week starts
// the day after the reset day. This means on the reset day itself,
// the current week's data is still shown (reset happens at end of day).
//
// Example: weeklyResetDay=6 (Saturday), today is Saturday (day 6)
//   weekStartDay = (6 + 1) % 7 = 0 (Sunday)
//   diff = (6 - 0 + 7) % 7 = 6
//   weekStart = today - 6 = last Sunday → full Sun-Sat week still visible
//
// Example: weeklyResetDay=6 (Saturday), today is Sunday (day 0)
//   weekStartDay = 0 (Sunday)
//   diff = (0 - 0 + 7) % 7 = 0
//   weekStart = today → new week starts
export function getWeekStart(weeklyResetDay: number = 6, now: Date = new Date()): Date {
  const currentDay = now.getDay(); // 0=Sun ... 6=Sat
  // The week starts the day AFTER the reset day (reset day = last day of week)
  const weekStartDay = (weeklyResetDay + 1) % 7;
  const diff = (currentDay - weekStartDay + 7) % 7;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0); // midnight local
  return weekStart;
}

// Convenience: returns the ISO string for Supabase .gte() queries
export function getWeekStartISO(weeklyResetDay: number = 6, now: Date = new Date()): string {
  return getWeekStart(weeklyResetDay, now).toISOString();
}
