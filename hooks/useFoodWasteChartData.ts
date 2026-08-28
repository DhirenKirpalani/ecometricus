import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DailyWaste {
  date: string;
  ROYAL: number;
  "FISHER'S": number;
  "RALPH'S": number;
  GUSTO: number;
}

export const useFoodWasteChartData = (targetKg: number = 80, activeOutletCount: number = 4) => {
  const [chartData, setChartData] = useState<DailyWaste[]>([]);
  const [target, setTarget] = useState(1800);
  const [dailyBenchmark, setDailyBenchmark] = useState(0);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [totalKg, setTotalKg] = useState(0);
  const [totalCo2e, setTotalCo2e] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  useEffect(() => {
    // Daily reset for cumulative waste data
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem('ecometricus_waste_last_date');
    if (lastDate !== today) {
      // New day: clear cumulative waste storage
      localStorage.removeItem('ecometricus_cumulative_waste');
      localStorage.setItem('ecometricus_waste_last_date', today);
    }

    // Listen for new waste entries to refresh chart
    const handleStorageChange = () => fetchChartData();
    window.addEventListener('ecometricus_waste_updated', handleStorageChange);

    const fetchChartData = async () => {

      setIsLoading(true);
      try {
        // Mila Logic: Standardized Proportional Scaling
        const weeklyMassTarget = targetKg * activeOutletCount;
        const dailyMassTarget = (targetKg / 7) * activeOutletCount;
        
        // Co2 Target derived from Mass Target (Factor 2.85)
        const weeklyCo2Target = weeklyMassTarget * 2.85;
        const dailyCo2Benchmark = dailyMassTarget * 2.85;
        
        setTarget(weeklyCo2Target);
        setDailyBenchmark(dailyCo2Benchmark);

        // 2. Fetch Live Data from all outlets
        const { data: wasteLogs, error: wasteError } = await supabase
          .from('food_waste_logs')
          .select('mass_kg, created_at, outlet_name, outlets(name)')
          .order('created_at', { ascending: false })
          .limit(200);

        if (wasteError) throw wasteError;

        // 3. Data Mapping — only use real data from Supabase
        const dayMap: Record<string, any> = {};
        
        DAYS.forEach(day => {
          dayMap[day] = {
            "date": day,
            "ROYAL": 0,
            "FISHER'S": 0,
            "RALPH'S": 0,
            "GUSTO": 0
          };
        });
 
        // Map Live Data to Days — support both outlet_name column and joined outlets.name
        if (wasteLogs && wasteLogs.length > 0) {
          wasteLogs.forEach((log: any) => {
            const date = new Date(log.created_at);
            const dayLabel = DAYS[date.getDay()];
            const outletName = (log.outlet_name || log.outlets?.name || 'ROYAL').toUpperCase();
            const mass = Number(log.mass_kg) || 0;
            const co2e = mass * 2.85;

            if (dayMap[dayLabel]) {
              if (outletName.includes('ROYAL')) dayMap[dayLabel]["ROYAL"] += co2e;
              else if (outletName.includes('FISHER')) dayMap[dayLabel]["FISHER'S"] += co2e;
              else if (outletName.includes('RALPH')) dayMap[dayLabel]["RALPH'S"] += co2e;
              else if (outletName.includes('GUSTO')) dayMap[dayLabel]["GUSTO"] += co2e;
              else dayMap[dayLabel]["ROYAL"] += co2e; // default to Royal
            }
          });
        }
 
        const transformed = DAYS.map(day => dayMap[day]);
        setChartData(transformed);

        // 4. Calculate Weekly Aggregate for KPI reporting
        const total = transformed.reduce((acc, curr) => {
          return acc + (curr["ROYAL"] || 0) + (curr["FISHER'S"] || 0) + (curr["RALPH'S"] || 0) + (curr["GUSTO"] || 0);
        }, 0);
        setWeeklyTotal(Number(total.toFixed(1)));

      } catch (err) {
        console.error('Error in useFoodWasteChartData (Hybrid):', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
    return () => window.removeEventListener('ecometricus_waste_updated', handleStorageChange);
  }, []);

  return { chartData, target, dailyBenchmark, weeklyTotal, isLoading };
};
