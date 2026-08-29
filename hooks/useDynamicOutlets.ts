import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface OutletInfo {
  id: string;
  name: string;
  code: string;
  color_hex: string;
  /** uppercase key used for chart data mapping */
  key: string;
}

/**
 * Fetches outlets from Supabase and provides dynamic outlet keys
 * for chart data mapping (replaces hardcoded ROYAL/FISHER'S/RALPH'S/GUSTO).
 */
export const useDynamicOutlets = () => {
  const [outlets, setOutlets] = useState<OutletInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOutlets = async () => {
      try {
        const { data, error } = await supabase
          .from('outlets')
          .select('id, name, code, color_hex')
          .order('name', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const mapped: OutletInfo[] = data.map((o: any) => ({
            id: o.id,
            name: o.name,
            code: o.code,
            color_hex: o.color_hex || '#94a3b8',
            key: o.name.toUpperCase(),
          }));
          setOutlets(mapped);
        }
      } catch (err) {
        console.error('Error fetching outlets:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOutlets();
  }, []);

  /** Match a log's outlet name to an outlet key (fuzzy match) */
  const matchOutletKey = useCallback((outletName: string): string | null => {
    if (!outlets.length) return null;
    const upper = outletName.toUpperCase();
    // Try exact match first
    const exact = outlets.find(o => o.key === upper);
    if (exact) return exact.key;
    // Try contains match
    const contains = outlets.find(o => upper.includes(o.key) || o.key.includes(upper));
    if (contains) return contains.key;
    // Try partial word match (first 4 chars)
    const partial = outlets.find(o => o.key.slice(0, 4) === upper.slice(0, 4));
    if (partial) return partial.key;
    return null;
  }, [outlets]);

  /** Build an empty day map with dynamic outlet keys */
  const buildEmptyDayMap = useCallback(<T extends Record<string, any>>(
    days: string[],
    dateField: string,
    initialValue: T
  ): Record<string, T & { [k: string]: any }> => {
    const map: Record<string, any> = {};
    days.forEach(day => {
      map[day] = { [dateField]: day, ...initialValue };
      outlets.forEach(o => {
        map[day][o.key] = 0;
      });
    });
    return map;
  }, [outlets]);

  /** Sum all outlet values from a day row */
  const sumOutlets = useCallback((row: Record<string, any>): number => {
    return outlets.reduce((sum, o) => sum + (Number(row[o.key]) || 0), 0);
  }, [outlets]);

  /** Get outlet keys */
  const outletKeys = outlets.map(o => o.key);

  return {
    outlets,
    outletKeys,
    isLoading,
    matchOutletKey,
    buildEmptyDayMap,
    sumOutlets,
  };
};
