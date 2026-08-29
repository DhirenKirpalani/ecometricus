import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ResourceData {
  day: string;
  [outletKey: string]: number | string;
}

export const useResourceChartData = () => {
  const [waterData, setWaterData] = useState<ResourceData[]>([]);
  const [energyData, setEnergyData] = useState<ResourceData[]>([]);
  const [outletKeys, setOutletKeys] = useState<string[]>([]);

  const [waterTarget] = useState(25000);
  const [energyTarget] = useState(1000);

  const [waterDailyBenchmark] = useState(3751);
  const [energyDailyBenchmark] = useState(142);

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
          .select('id, name, code, color_hex')
          .order('name', { ascending: true });

        const keys: string[] = [];
        if (outletsData && outletsData.length > 0) {
          outletsData.forEach((o: any) => keys.push(o.name.toUpperCase()));
        }
        setOutletKeys(keys);

        // 1. Fetch all resource logs
        const { data: resourceLogs, error } = await supabase
          .from('resource_logs')
          .select('amount, resource_type, created_at, outlet_name, outlets(name)')
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
        if (resourceLogs && resourceLogs.length > 0) {
          resourceLogs.forEach((log: any) => {
            const date = new Date(log.created_at);
            const dayLabel = DAYS[date.getDay()];
            const outletName = (log.outlet_name || log.outlets?.name || '').toUpperCase();
            const amount = Number(log.amount) || 0;

            // Match outlet name to a dynamic key
            const matchedKey = keys.find(k => k === outletName) ||
              keys.find(k => outletName.includes(k) || k.includes(outletName)) ||
              keys.find(k => k.slice(0, 4) === outletName.slice(0, 4));

            if (!matchedKey || !dayLabel) return;

            if (log.resource_type === 'water' && waterMap[dayLabel]) {
              waterMap[dayLabel][matchedKey] += amount;
            } else if (log.resource_type === 'energy' && energyMap[dayLabel]) {
              energyMap[dayLabel][matchedKey] += amount;
            }
          });
        }

        const wTransformed = DAYS.map(d => waterMap[d]);
        const eTransformed = DAYS.map(d => energyMap[d]);

        setWaterData(wTransformed);
        setEnergyData(eTransformed);

        // 4. Totals — sum all dynamic outlet keys
        const wTotal = wTransformed.reduce((acc, curr) =>
          acc + keys.reduce((s, k) => s + (Number(curr[k]) || 0), 0), 0);
        const eTotal = eTransformed.reduce((acc, curr) =>
          acc + keys.reduce((s, k) => s + (Number(curr[k]) || 0), 0), 0);

        setWaterWeeklyTotal(Number(wTotal.toFixed(0)));
        setEnergyWeeklyTotal(Number(eTotal.toFixed(0)));

      } catch (err) {
        console.error('Error fetching resource data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResourceData();
    return () => window.removeEventListener('ecometricus_resource_updated', handleStorageChange);
  }, []);

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
