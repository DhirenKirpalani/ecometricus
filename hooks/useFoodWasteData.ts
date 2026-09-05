
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Outlet } from '../types';
import { getPlatformSettings, getWeekStartISO } from '../lib/platformSettings';

interface FoodWasteData {
  totalMass: number;
  carbonImpact: number;
  financialLoss: number;
  outletDetails: {
    name: string;
    mass: number;
    cost: number;
  }[];
  isLoading: boolean;
  error: string | null;
}

const LBS_CONVERSION = 2.20462;

export const useFoodWasteData = (
  outletId: string | null, // UUID from public.outlets
  unitType: 'kg' | 'Lbs',
  allOutlets: Outlet[],
  dailyMode: boolean = false,
  weekOffset: number = 0
) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let startDateISO: string;
        let endDateISO: string | null = null;
        if (dailyMode) {
          // Today only — resets at midnight
          const startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          startDateISO = startDate.toISOString();
        } else {
          // Week-aligned (Sun–Sat) — matches chart hooks and Overview KPI cards
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

        let query = supabase
          .from('food_waste_logs')
          .select('*')
          .gte('created_at', startDateISO);
        if (endDateISO) {
          query = query.lt('created_at', endDateISO);
        }
        
        if (outletId) {
          query = query.eq('outlet_id', outletId);
        }

        const { data: result, error } = await query;

        if (error) throw error;
        setData(result || []);
      } catch (err) {
        console.error('Error fetching food waste logs:', err);
        setError(err instanceof Error ? err.message : 'Failed to load food waste data');
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [outletId, dailyMode, weekOffset]);

  const foodWasteStats = useMemo((): FoodWasteData => {
    const hasData = Array.isArray(data) && data.length > 0;
    
    let totalMass = hasData ? data.reduce((acc, curr) => acc + (Number(curr.mass_kg) || 0), 0) : 0;
    
    // Aggregation Logic: Carbon = Mass * 2.85 (matching Mila CO2 coefficient), Financial = Mass * 6.53 (consistent with benchmarks)
    let carbonImpact = totalMass * 2.85;
    let financialLoss = hasData ? data.reduce((acc, curr) => acc + ((Number(curr.mass_kg) || 0) * (Number(curr.cost_per_kg) || 6.53)), 0) : 0;

    // Unit Conversion
    if (unitType === 'Lbs') {
      totalMass *= LBS_CONVERSION;
    }

    // Map outlet specific data
    const outletDetails = (allOutlets || []).map(outlet => {
      const outletData = data.filter(d => d.outlet_id === (outlet as any).id);
      let mass = outletData.reduce((acc, curr) => acc + (Number(curr.mass_kg) || 0), 0);
      let cost = outletData.reduce((acc, curr) => acc + (Number(curr.cost_usd) || 0), 0);

      if (unitType === 'Lbs') {
        mass *= LBS_CONVERSION;
      }

      return {
        name: outlet.name,
        mass,
        cost
      };
    });

    return {
      totalMass: totalMass || 0,
      carbonImpact: carbonImpact || 0,
      financialLoss: financialLoss || 0,
      outletDetails,
      isLoading,
      error
    };
  }, [data, unitType, allOutlets, isLoading]);

  return foodWasteStats;
};
