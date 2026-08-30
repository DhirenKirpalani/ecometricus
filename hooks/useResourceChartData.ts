import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getPlatformSettings, getWeekStartISO } from '../lib/platformSettings';

export interface ResourceData {
  day: string;
  [outletKey: string]: number | string;
}

export const useResourceChartData = (waterTargetParam?: number, energyTargetParam?: number) => {
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

  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  useEffect(() => {
    const handleStorageChange = () => fetchResourceData();
    window.addEventListener('ecometricus_resource_updated', handleStorageChange);

    const fetchResourceData = async () => {
      setIsLoading(true);
      try {
        // 0. Fetch outlets dynamically
        const { data: outletsData } = await supabase
          .from('outlets')
          .select('id, outlet_name, outlet_id, color_hex')
          .order('outlet_name', { ascending: true });

        const keys: string[] = [];
        if (outletsData && outletsData.length > 0) {
          outletsData.forEach((o: any) => keys.push((o.outlet_name || o.name || '').toUpperCase()));
        }

        // 1. Fetch all resource logs (current chart week only)
        const settings = await getPlatformSettings();
        const weekStartISO = getWeekStartISO(settings.weekly_reset_day);

        const { data: resourceLogs, error } = await supabase
          .from('resource_logs')
          .select('*')
          .gte('created_at', weekStartISO)
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchResourceData();

    // Realtime subscription: auto-refresh when any user adds/updates/deletes resource entries
    const channel = supabase
      .channel('resource_logs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_logs' }, () => {
        fetchResourceData();
      })
      .subscribe();

    return () => {
      window.removeEventListener('ecometricus_resource_updated', handleStorageChange);
      supabase.removeChannel(channel);
    };
  }, [waterTarget, energyTarget]);

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
    isLoading
  };
};
