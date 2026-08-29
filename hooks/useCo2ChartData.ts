import { useState, useEffect } from 'react';
import { useFoodWasteChartData } from './useFoodWasteChartData';
import { useResourceChartData } from './useResourceChartData';

export interface Co2Data {
    day: string;
    foodWaste: number;
    water: number;
    energy: number;
}

export const useCo2ChartData = () => {
    const { chartData: wasteData, outletKeys: wasteKeys, isLoading: wasteLoading } = useFoodWasteChartData();
    const { waterData, energyData, outletKeys: resourceKeys, isLoading: resourceLoading } = useResourceChartData();
    const [co2Data, setCo2Data] = useState<Co2Data[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const DAY_MAP = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const DAY_DISPLAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    useEffect(() => {
        if (!wasteLoading && !resourceLoading) {
            // Aggregate daily CO2 segments from live data across all outlets
            const aggregated = DAY_MAP.map((dayKey, index) => {
                // 1. Food Waste CO2 (already in CO2e from hook: mass * 2.85)
                const wasteDay = wasteData.find(d => (d as any).date === dayKey || (d as any).day === dayKey);
                const foodCo2 = wasteDay ? wasteKeys.reduce((s, k) => s + (Number((wasteDay as any)[k]) || 0), 0) : 0;

                // 2. Water CO2 (conversion factor: 0.0003 kg CO2 per litre)
                const waterDay = waterData.find(d => (d as any).day === dayKey);
                const waterCo2 = waterDay ? resourceKeys.reduce((s, k) => s + (Number((waterDay as any)[k]) || 0) * 0.0003, 0) : 0;

                // 3. Energy CO2 (conversion factor: 0.45 kg CO2 per kWh)
                const energyDay = energyData.find(d => (d as any).day === dayKey);
                const energyCo2 = energyDay ? resourceKeys.reduce((s, k) => s + (Number((energyDay as any)[k]) || 0) * 0.45, 0) : 0;

                return {
                    day: DAY_DISPLAY[index],
                    foodWaste: foodCo2,
                    water: waterCo2,
                    energy: energyCo2
                };
            });

            setCo2Data(aggregated);
            setIsLoading(false);
        }
    }, [wasteData, wasteKeys, wasteLoading, waterData, energyData, resourceKeys, resourceLoading]);

    return { co2Data, isLoading };
};
