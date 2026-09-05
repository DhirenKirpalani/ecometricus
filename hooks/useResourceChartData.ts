import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getPlatformSettings, getWeekStartISO } from '../lib/platformSettings';

export interface ResourceData {
  day: string;
  [outletKey: string]: number | string;
}

export const useResourceChartData = (waterTargetParam?: number, energyTargetParam?: number, scopeOutletName?: string, scopeUserId?: string, scopeOutletId?: string, dailyMode: boolean = false, preloadedOutlets?: any[], weekOffset: number = 0) => {
  const [waterData, setWaterData] = useState<ResourceData[]>([]);
  const [energyData, setEnergyData] = useState<ResourceData[]>([]);
  const [outletKeys, setOutletKeys] = useState<string[]>([]);

  const waterTarget = waterTargetParam ?? 25000;
  const energyTarget = energyTargetParam ?? 1000;

  // Daily benchmark = weekly target / 7
  const waterDailyBenchmark = Math.round(waterTarget / 7);
  const energyDailyBenchmark = Math.round(energyTarget / 7);

  const [waterWeeklyTotal, setWaterWeeklyTotal] = useState(0);
  const [energyWeeklyTotal, setEnergyWeeklyTotal] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  useEffect(() => {
    const handleStorageChange = () => fetchResourceData();
    window.addEventListener('ecometricus_resource_updated', handleStorageChange);

    const fetchResourceData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 0. Use preloaded outlets if available, otherwise fetch from Supabase
        let outletsData: any[] | null = null;
        if (preloadedOutlets && preloadedOutlets.length > 0) {
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

        // 1. Fetch resource logs — daily mode: today only (resets at midnight); weekly mode: chart week (Sun-Sat)
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
          const endD = new Date(startDateISO);
          endD.setDate(endD.getDate() + 7);
          endDateISO = endD.toISOString();
        }

        let resourceQuery = supabase
          .from('resource_logs')
          .select('*')
          .gte('created_at', startDateISO);
        if (endDateISO) {
          resourceQuery = resourceQuery.lt('created_at', endDateISO);
        }
        if (scopeOutletId) {
          // resource_logs has no outlet_id column — resolve to outlet_name
          const scopedOutlet = outletsData?.find((o: any) => o.id === scopeOutletId);
          if (scopedOutlet?.outlet_name) {
            resourceQuery = resourceQuery.eq('outlet_name', scopedOutlet.outlet_name);
          } else {
            // Fallback: no match, return nothing
            resourceQuery = resourceQuery.eq('outlet_name', '__none__');
          }
        } else if (scopeOutletName) {
          resourceQuery = resourceQuery.eq('outlet_name', scopeOutletName);
        } else if (scopeUserId && outletsData && outletsData.length > 0) {
          // Admin/GM: scope resource logs to their own outlets only
          // resource_logs has no outlet_id column — use outlet_name instead
          const outletNames = outletsData.map((o: any) => o.outlet_name).filter(Boolean);
          if (outletNames.length > 0) {
            resourceQuery = resourceQuery.in('outlet_name', outletNames);
          }
        } else if (scopeUserId || scopeOutletName || scopeOutletId) {
          // Non-admin user whose outlet hasn't been resolved yet — don't fetch all data
          setWaterData(DAYS.map(day => ({ day })));
          setEnergyData(DAYS.map(day => ({ day })));
          setOutletKeys([]);
          setWaterWeeklyTotal(0);
          setEnergyWeeklyTotal(0);
          setIsLoading(false);
          return;
        }
        const { data: resourceLogs, error } = await resourceQuery
          .order('created_at', { ascending: false })
          .limit(200);

        // 2. Initialize Day Maps with dynamic outlet keys
        const waterMap: Record<string, any> = {};
        const energyMap: Record<string, any> = {};

        DAYS.forEach(day => {
          waterMap[day] = { day };
          energyMap[day] = { day };
          keys.forEach(k => {
            waterMap[day][k] = 0;
            energyMap[day][k] = 0;
          });
        });

        // 3. Map Live Data
        // Build a map of outlet_id → outlet_name for lookups
        const outletMap: Record<string, string> = {};
        if (outletsData) {
          outletsData.forEach((o: any) => {
            const name = (o.outlet_name || o.name || '').toUpperCase();
            if (o.id) outletMap[o.id] = name;
          });
        }

        if (resourceLogs && resourceLogs.length > 0) {
          resourceLogs.forEach((log: any) => {
            const date = new Date(log.created_at);
            const dayLabel = DAYS[date.getDay()];
            const outletName = (log.outlet_name || outletMap[log.outlet_id] || outletMap[log.outlet_code] || '').toUpperCase();

            const matchedKey = keys.find(k => k === outletName) ||
              keys.find(k => outletName.includes(k) || k.includes(outletName)) ||
              keys.find(k => k.slice(0, 4) === outletName.slice(0, 4));

            if (!matchedKey || !dayLabel) return;

            // Table schema uses water_liters and energy_kwh columns (not amount + resource_type)
            const waterAmount = Number(log.water_liters) || 0;
            const energyAmount = Number(log.energy_kwh) || 0;
            const rType = log.resource_type || log.type;
            const amount = Number(log.amount) || 0;

            if (waterAmount > 0 && waterMap[dayLabel]) {
              waterMap[dayLabel][matchedKey] += waterAmount;
            }
            if (energyAmount > 0 && energyMap[dayLabel]) {
              energyMap[dayLabel][matchedKey] += energyAmount;
            }
            // Fallback for rows that use amount + resource_type columns
            if (amount > 0 && rType) {
              if (rType === 'water' && waterMap[dayLabel]) {
                waterMap[dayLabel][matchedKey] += amount;
              } else if (rType === 'energy' && energyMap[dayLabel]) {
                energyMap[dayLabel][matchedKey] += amount;
              }
            }
          });
        }

        const wTransformed = DAYS.map(d => waterMap[d]);
        const eTransformed = DAYS.map(d => energyMap[d]);

        setWaterData(wTransformed);
        setEnergyData(eTransformed);

        // 4. Totals
        const wTotal = wTransformed.reduce((acc, curr) =>
          acc + keys.reduce((s, k) => s + (Number(curr[k]) || 0), 0), 0);
        const eTotal = eTransformed.reduce((acc, curr) =>
          acc + keys.reduce((s, k) => s + (Number(curr[k]) || 0), 0), 0);

        setWaterWeeklyTotal(Number(wTotal.toFixed(0)));
        setEnergyWeeklyTotal(Number(eTotal.toFixed(0)));

        // 5. Filter outletKeys to only those with actual data
        const activeKeys = keys.filter(k => {
          const hasWater = wTransformed.some(d => Number(d[k]) > 0);
          const hasEnergy = eTransformed.some(d => Number(d[k]) > 0);
          return hasWater || hasEnergy;
        });
        setOutletKeys(activeKeys);

      } catch (err) {
        console.error('Error fetching resource data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load resource data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResourceData();

    // Listen to shared realtime events from DashboardPage (single Supabase channel)
    // instead of creating a duplicate subscription
    return () => {
      window.removeEventListener('ecometricus_resource_updated', handleStorageChange);
    };
  }, [waterTarget, energyTarget, scopeOutletName, scopeUserId, scopeOutletId, dailyMode, preloadedOutlets, weekOffset]);

  return {
    waterData,
    energyData,
    outletKeys,
    waterTarget,
    energyTarget,
    waterDailyBenchmark,
    energyDailyBenchmark,
    waterWeeklyTotal,
    energyWeeklyTotal,
    isLoading,
    error
  };
};
