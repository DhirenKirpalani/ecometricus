
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Outlet } from '../types';

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
}

const LBS_CONVERSION = 2.20462;

export const useFoodWasteData = (
  outletId: string | null, // UUID from public.outlets
  unitType: 'kg' | 'Lbs',
  allOutlets: Outlet[],
  dailyMode: boolean = false
) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        let startDate: Date;
        if (dailyMode) {
          // Today only — resets at midnight
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
        } else {
          // Rolling 7 days (admin/GM cumulative view)
          startDate = new Date();
          startDate.setDate(startDate.getDate() - 7);
        }

        let query = supabase
          .from('food_waste_logs')
          .select('*')
          .gte('created_at', startDate.toISOString());
        
        if (outletId) {
          query = query.eq('outlet_id', outletId);
        }

        const { data: result, error } = await query;

        if (error) throw error;
        setData(result || []);
      } catch (err) {
        console.error('Error fetching food waste logs:', err);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [outletId, dailyMode]);

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
      isLoading
    };
  }, [data, unitType, allOutlets, isLoading]);

  return foodWasteStats;
};
