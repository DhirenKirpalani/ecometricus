import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getPlatformSettings, getWeekStartISO } from '../lib/platformSettings';

export interface DailyWaste {
  date: string;
  [outletKey: string]: number | string;
}

export const useFoodWasteChartData = (targetKg: number = 80, activeOutletCount: number = 4, scopeOutletName?: string, scopeUserId?: string, scopeOutletId?: string, dailyMode: boolean = false, preloadedOutlets?: any[], weekOffset: number = 0) => {
  const [chartData, setChartData] = useState<DailyWaste[]>([]);
  const [outletKeys, setOutletKeys] = useState<string[]>([]);
  const [target, setTarget] = useState(1800);
  const [dailyBenchmark, setDailyBenchmark] = useState(0);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [totalKg, setTotalKg] = useState(0);
  const [totalCo2e, setTotalCo2e] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  useEffect(() => {
    const handleStorageChange = () => fetchChartData();
    window.addEventListener('ecometricus_waste_updated', handleStorageChange);

    const fetchChartData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 0. Use preloaded outlets if available, otherwise fetch from Supabase
        let outletsData: any[] | null = null;
        if (preloadedOutlets && preloadedOutlets.length > 0) {
          // Filter preloaded outlets by scope
          outletsData = preloadedOutlets;
          if (scopeOutletId) {
            outletsData = outletsData.filter(o => o.id === scopeOutletId);
          } else if (scopeOutletName) {
            outletsData = outletsData.filter(o => (o.outlet_name || o.name) === scopeOutletName);
          }
        } else {
          let outletsQuery = supabase
            .from('outlets')
            .select('id, outlet_name, outlet_id, color_hex')
            .order('outlet_name', { ascending: true });
          if (scopeOutletId) {
            outletsQuery = outletsQuery.eq('id', scopeOutletId);
          } else if (scopeOutletName) {
            outletsQuery = outletsQuery.eq('outlet_name', scopeOutletName);
          } else if (scopeUserId) {
            outletsQuery = outletsQuery.eq('user_id', scopeUserId);
          }
          const { data: fetched } = await outletsQuery;
          outletsData = fetched;
        }

        const keys: string[] = [];
        if (outletsData && outletsData.length > 0) {
          outletsData.forEach((o: any) => keys.push((o.outlet_name || o.name || '').toUpperCase()));
        }
        setOutletKeys(keys);

        // 1. Fetch Live Data — daily mode: today only (resets at midnight); weekly mode: chart week (Sun-Sat)
        let startDateISO: string;
        let endDateISO: string | null = null;
        if (dailyMode) {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          startDateISO = todayStart.toISOString();
        } else {
          const settings = await getPlatformSettings();
          startDateISO = getWeekStartISO(settings.weekly_reset_day);
          if (weekOffset !== 0) {
            const d = new Date(startDateISO);
            d.setDate(d.getDate() + (7 * weekOffset));
            startDateISO = d.toISOString();
          }
          // End date = start + 7 days (for previous week filtering)
          const endD = new Date(startDateISO);
          endD.setDate(endD.getDate() + 7);
          endDateISO = endD.toISOString();
        }

        let wasteQuery = supabase
          .from('food_waste_logs')
          .select('*')
          .gte('created_at', startDateISO);
        if (endDateISO) {
          wasteQuery = wasteQuery.lt('created_at', endDateISO);
        }
        if (scopeOutletId) {
          wasteQuery = wasteQuery.eq('outlet_id', scopeOutletId);
        } else if (scopeOutletName) {
          wasteQuery = wasteQuery.eq('outlet_name', scopeOutletName);
        } else if (scopeUserId && outletsData && outletsData.length > 0) {
          // Admin/GM: scope waste logs to their own outlets only
          const outletIds = outletsData.map((o: any) => o.id).filter(Boolean);
          if (outletIds.length > 0) {
            wasteQuery = wasteQuery.in('outlet_id', outletIds);
          }
        } else if (scopeUserId || scopeOutletName || scopeOutletId) {
          // Non-admin user whose outlet hasn't been resolved yet — don't fetch all data
          setChartData(DAYS.map(day => ({ date: day })));
          setOutletKeys([]);
          setWeeklyTotal(0);
          setIsLoading(false);
          return;
        }
        const { data: wasteLogs, error: wasteError } = await wasteQuery
          .order('created_at', { ascending: false })
          .limit(200);

        if (wasteError) throw wasteError;

        // Count actual active outlets (outlets with waste data this week)
        // This ensures the benchmark reflects reality, not just registered outlets
        const activeOutletIds = new Set<string>();
        if (wasteLogs && wasteLogs.length > 0) {
          wasteLogs.forEach((log: any) => {
            if (log.outlet_id) activeOutletIds.add(log.outlet_id);
          });
        }
        const effectiveOutletCount = Math.max(activeOutletIds.size, 1);

        // Mila Logic: Standardized Proportional Scaling
        // Use actual active outlet count for benchmark (not total registered outlets)
        const weeklyMassTarget = targetKg * effectiveOutletCount;
        const dailyMassTarget = (targetKg / 7) * effectiveOutletCount;

        const weeklyCo2Target = weeklyMassTarget * 2.85;
        const dailyCo2Benchmark = dailyMassTarget * 2.85;

        setTarget(weeklyCo2Target);
        setDailyBenchmark(dailyCo2Benchmark);

        // 2. Initialize Day Maps with dynamic outlet keys
        const dayMap: Record<string, any> = {};

        DAYS.forEach(day => {
          dayMap[day] = { date: day };
          keys.forEach(k => { dayMap[day][k] = 0; });
        });

        // Build a map of outlet_id → outlet_name for lookups
        const outletMap: Record<string, string> = {};
        if (outletsData) {
          outletsData.forEach((o: any) => {
            const name = (o.outlet_name || o.name || '').toUpperCase();
            if (o.id) outletMap[o.id] = name;
          });
        }

        // 3. Map Live Data to Days
        if (wasteLogs && wasteLogs.length > 0) {
          wasteLogs.forEach((log: any) => {
            const date = new Date(log.created_at);
            const dayLabel = DAYS[date.getDay()];
            const outletName = (log.outlet_name || outletMap[log.outlet_id] || '').toUpperCase();
            const mass = Number(log.mass_kg) || 0;
            const co2e = mass * 2.85;

            // Match outlet name to a dynamic key
            const matchedKey = keys.find(k => k === outletName) ||
              keys.find(k => outletName.includes(k) || k.includes(outletName)) ||
              keys.find(k => k.slice(0, 4) === outletName.slice(0, 4));

            if (matchedKey && dayMap[dayLabel]) {
              dayMap[dayLabel][matchedKey] += co2e;
            }
          });
        }

        const transformed = DAYS.map(day => dayMap[day]);
        setChartData(transformed);

        // 4. Calculate Weekly Aggregate
        const total = transformed.reduce((acc, curr) =>
          acc + keys.reduce((s, k) => s + (Number(curr[k]) || 0), 0), 0);
        setWeeklyTotal(Number(total.toFixed(1)));

      } catch (err) {
        console.error('Error in useFoodWasteChartData:', err);
        setError(err instanceof Error ? err.message : 'Failed to load waste data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();

    // Listen to shared realtime events from DashboardPage (single Supabase channel)
    // instead of creating a duplicate subscription
    return () => {
      window.removeEventListener('ecometricus_waste_updated', handleStorageChange);
    };
  }, [targetKg, activeOutletCount, scopeOutletName, scopeUserId, scopeOutletId, dailyMode, preloadedOutlets, weekOffset]);

  return { chartData, outletKeys, target, dailyBenchmark, weeklyTotal, isLoading, error };
};
