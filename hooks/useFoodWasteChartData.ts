import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DailyWaste {
  date: string;
  [outletKey: string]: number | string;
}

export const useFoodWasteChartData = (targetKg: number = 80, activeOutletCount: number = 4) => {
  const [chartData, setChartData] = useState<DailyWaste[]>([]);
  const [outletKeys, setOutletKeys] = useState<string[]>([]);
  const [target, setTarget] = useState(1800);
  const [dailyBenchmark, setDailyBenchmark] = useState(0);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [totalKg, setTotalKg] = useState(0);
  const [totalCo2e, setTotalCo2e] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  useEffect(() => {
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem('ecometricus_waste_last_date');
    if (lastDate !== today) {
      localStorage.removeItem('ecometricus_cumulative_waste');
      localStorage.setItem('ecometricus_waste_last_date', today);
    }

    const handleStorageChange = () => fetchChartData();
    window.addEventListener('ecometricus_waste_updated', handleStorageChange);

    const fetchChartData = async () => {
      setIsLoading(true);
      try {
        // Mila Logic: Standardized Proportional Scaling
        const weeklyMassTarget = targetKg * activeOutletCount;
        const dailyMassTarget = (targetKg / 7) * activeOutletCount;

        const weeklyCo2Target = weeklyMassTarget * 2.85;
        const dailyCo2Benchmark = dailyMassTarget * 2.85;

        setTarget(weeklyCo2Target);
        setDailyBenchmark(dailyCo2Benchmark);

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

        // 1. Fetch Live Data from all outlets
        const { data: wasteLogs, error: wasteError } = await supabase
          .from('food_waste_logs')
          .select('mass_kg, created_at, outlet_name, outlets(name)')
          .order('created_at', { ascending: false })
          .limit(200);

        if (wasteError) throw wasteError;

        // 2. Initialize Day Maps with dynamic outlet keys
        const dayMap: Record<string, any> = {};

        DAYS.forEach(day => {
          dayMap[day] = { date: day };
          keys.forEach(k => { dayMap[day][k] = 0; });
        });

        // 3. Map Live Data to Days
        if (wasteLogs && wasteLogs.length > 0) {
          wasteLogs.forEach((log: any) => {
            const date = new Date(log.created_at);
            const dayLabel = DAYS[date.getDay()];
            const outletName = (log.outlet_name || log.outlets?.name || '').toUpperCase();
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
    return () => window.removeEventListener('ecometricus_waste_updated', handleStorageChange);
  }, []);

  return { chartData, outletKeys, target, dailyBenchmark, weeklyTotal, isLoading };
};
