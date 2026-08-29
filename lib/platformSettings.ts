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
// (midnight local time on the configured reset day).
//
// weeklyResetDay: 0=Sun, 1=Mon, ... 6=Sat
//
// Example: weeklyResetDay=6 (Saturday), today is Wednesday (day 3)
//   diff = (3 - 6 + 7) % 7 = 4
//   weekStart = today - 4 days = last Saturday
//
// On Saturday itself: diff = (6 - 6 + 7) % 7 = 0 → weekStart = today (reset day)
export function getWeekStart(weeklyResetDay: number = 6, now: Date = new Date()): Date {
  const currentDay = now.getDay(); // 0=Sun ... 6=Sat
  const diff = (currentDay - weeklyResetDay + 7) % 7;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0); // midnight local
  return weekStart;
}

// Convenience: returns the ISO string for Supabase .gte() queries
export function getWeekStartISO(weeklyResetDay: number = 6, now: Date = new Date()): string {
  return getWeekStart(weeklyResetDay, now).toISOString();
}
