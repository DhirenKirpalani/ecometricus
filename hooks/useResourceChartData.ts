import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ResourceData {
  day: string;
  "ROYAL": number;
  "FISHER'S": number;
  "RALPH'S": number;
  "GUSTO": number;
}

export const useResourceChartData = () => {
  const [waterData, setWaterData] = useState<ResourceData[]>([]);
  const [energyData, setEnergyData] = useState<ResourceData[]>([]);
  
  const [waterTarget] = useState(25000);
  const [energyTarget] = useState(1000);
  
  const [waterDailyBenchmark] = useState(3751); // 25000 / 7 approx
  const [energyDailyBenchmark] = useState(142); // 1000 / 7 approx
  
  const [waterWeeklyTotal, setWaterWeeklyTotal] = useState(0);
  const [energyWeeklyTotal, setEnergyWeeklyTotal] = useState(0);
  
  const [isLoading, setIsLoading] = useState(true);

  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  useEffect(() => {
    const fetchResourceData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch Royal Data from resource_logs if available
        const { data: royalLogs, error } = await supabase
          .from('resource_logs')
          .select('amount, resource_type, created_at, outlets(name)')
          .filter('outlets.name', 'ilike', 'Royal');

        // 2. Initialize Day Maps — empty until real data arrives
        const waterMap: Record<string, any> = {};
        const energyMap: Record<string, any> = {};
        
        DAYS.forEach(day => {
          waterMap[day] = { day, "ROYAL": 0, "FISHER'S": 0, "RALPH'S": 0, "GUSTO": 0 };
          energyMap[day] = { day, "ROYAL": 0, "FISHER'S": 0, "RALPH'S": 0, "GUSTO": 0 };
        });

        // 3. Map Royal Live Data
        if (royalLogs && royalLogs.length > 0) {
          royalLogs.forEach((log: any) => {
            const date = new Date(log.created_at);
            const dayLabel = DAYS[date.getDay()];
            if (log.resource_type === 'water') {
              waterMap[dayLabel]["ROYAL"] += Number(log.amount);
            } else {
              energyMap[dayLabel]["ROYAL"] += Number(log.amount);
            }
          });
        }

        const wTransformed = DAYS.map(d => waterMap[d]);
        const eTransformed = DAYS.map(d => energyMap[d]);

        setWaterData(wTransformed);
        setEnergyData(eTransformed);

        // 4. Totals
        const wTotal = wTransformed.reduce((acc, curr) => acc + curr["ROYAL"] + curr["FISHER'S"] + curr["RALPH'S"] + curr["GUSTO"], 0);
        const eTotal = eTransformed.reduce((acc, curr) => acc + curr["ROYAL"] + curr["FISHER'S"] + curr["RALPH'S"] + curr["GUSTO"], 0);

        setWaterWeeklyTotal(Number(wTotal.toFixed(0)));
        setEnergyWeeklyTotal(Number(eTotal.toFixed(0)));

      } catch (err) {
        console.error('Error fetching resource data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResourceData();
  }, []);

  return { 
    waterData, 
    energyData, 
    waterTarget, 
    energyTarget, 
    waterDailyBenchmark, 
    energyDailyBenchmark,
    waterWeeklyTotal,
    energyWeeklyTotal,
    isLoading 
  };
};
