import React, { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  AreaChart, Area, ComposedChart,
} from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Outlet } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────
interface KpiChartProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  iconColor?: string;
  benchmark?: number;
  benchmarkLabel?: string;
  unit?: string;
  unitPrefix?: string;
  data: Record<string, any>[];
  dataKey: string;
  multiSeries?: boolean;
  seriesKey?: string;
  outlets?: Outlet[];
  chartType?: 'line' | 'bar' | 'area' | 'composed';
  yDomain?: [number, number];
  yTicks?: number[];
  alertIfAbove?: boolean;
  stacked?: boolean;
  stackKeys?: { key: string; name: string; color: string }[];
  rollingAverageKey?: string;
}

// ── Color palette ──────────────────────────────────────────────────────────
const COLORS = {
  gold: '#C8A413',
  eco: '#77B139',
  alert: '#FF3131',
  energy: '#FF914D',
  blue: '#3B82F6',
  purple: '#A855F7',
  grid: 'rgba(255,255,255,0.04)',
  axis: 'rgba(255,255,255,0.15)',
  text: 'rgba(255,255,255,0.35)',
};

const SERIES_COLORS = ['#C8A413', '#77B139', '#3B82F6', '#FF914D', '#A855F7', '#FF3131'];

// ── Custom tooltip ─────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, unit, unitPrefix }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0a1815] border border-brand-gold/25 rounded-lg px-3 py-2 shadow-2xl">
      <p className="text-[10px] font-bold text-brand-gold/60 uppercase tracking-wide mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-[11px] py-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-white/40">{p.name}:</span>
          <span className="text-white font-bold ml-auto">
            {unitPrefix || ''}{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}{unit || ''}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Component ──────────────────────────────────────────────────────────────
const KpiChart: React.FC<KpiChartProps> = ({
  title,
  subtitle,
  icon: Icon,
  iconColor = 'text-brand-gold',
  benchmark,
  benchmarkLabel,
  unit = '',
  unitPrefix = '',
  data,
  dataKey,
  multiSeries = false,
  seriesKey = 'outlet_code',
  outlets = [],
  chartType = 'line',
  yDomain,
  yTicks,
  alertIfAbove = true,
  stacked = false,
  stackKeys = [],
  rollingAverageKey,
}) => {
  // Check if any value exceeds benchmark
  const hasAlert = useMemo(() => {
    if (!benchmark || !alertIfAbove) return false;
    return data.some(d => Number(d[dataKey]) > benchmark);
  }, [data, dataKey, benchmark, alertIfAbove]);

  // Transform data for multi-series
  const chartData = useMemo(() => {
    if (!multiSeries) return data;
    const days = [...new Set(data.map(d => d.day))];
    return days.map(day => {
      const row: Record<string, any> = { day };
      data.filter(d => d.day === day).forEach(d => {
        const outletName = outlets.find(o => o.code === d[seriesKey])?.name || d[seriesKey];
        row[outletName] = Number(d[dataKey]);
      });
      return row;
    });
  }, [data, multiSeries, seriesKey, outlets, dataKey]);

  const seriesNames = useMemo(() => {
    if (!multiSeries) return [];
    return outlets.map(o => o.name).filter(name =>
      chartData.some(d => d[name] !== undefined)
    );
  }, [multiSeries, outlets, chartData]);

  // Compute summary: latest value + trend vs first
  const summary = useMemo(() => {
    if (!data.length) return null;
    const values = data.map(d => Number(d[dataKey])).filter(v => !isNaN(v));
    if (!values.length) return null;
    const latest = values[values.length - 1];
    const first = values[0];
    const delta = latest - first;
    const pctChange = first !== 0 ? ((delta / first) * 100) : 0;
    return { latest, delta, pctChange };
  }, [data, dataKey]);

  // For stacked charts, compute total of latest day
  const stackTotal = useMemo(() => {
    if (!stacked || !stackKeys.length || !data.length) return null;
    const last = data[data.length - 1];
    const total = stackKeys.reduce((sum, s) => sum + (Number(last[s.key]) || 0), 0);
    return total;
  }, [stacked, stackKeys, data]);

  const displayValue = stackTotal !== null ? stackTotal : summary?.latest;
  const trendDelta = summary?.delta;
  const trendUp = trendDelta !== undefined && trendDelta > 0;
  const trendDown = trendDelta !== undefined && trendDelta < 0;
  const trendFlat = trendDelta === 0;

  // Shared axis props
  const axisProps = {
    stroke: COLORS.axis,
    tick: { fontSize: 10, fill: COLORS.text },
    axisLine: false,
    tickLine: false,
  };

  const gridProps = {
    strokeDasharray: '3 3',
    stroke: COLORS.grid,
    vertical: false as const,
  };

  const renderBenchmark = () =>
    benchmark !== undefined && (
      <ReferenceLine y={benchmark} stroke={COLORS.gold} strokeDasharray="4 4" strokeOpacity={0.4} />
    );

  const renderChart = () => {
    if (chartType === 'composed' && rollingAverageKey) {
      return (
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="day" {...axisProps} />
          <YAxis {...axisProps} domain={yDomain || ['auto', 'auto']} ticks={yTicks} />
          <Tooltip content={<CustomTooltip unit={unit} unitPrefix={unitPrefix} />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
          {stackKeys.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} radius={i === stackKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} maxBarSize={40} />
          ))}
          <Line type="monotone" dataKey={rollingAverageKey} name="Rolling Avg" stroke={COLORS.gold} strokeWidth={2} dot={false} />
          {renderBenchmark()}
        </ComposedChart>
      );
    }

    if (chartType === 'bar') {
      return (
        <BarChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="day" {...axisProps} />
          <YAxis {...axisProps} domain={yDomain || ['auto', 'auto']} ticks={yTicks} />
          <Tooltip content={<CustomTooltip unit={unit} unitPrefix={unitPrefix} />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
          {stacked && stackKeys.length > 0 ? (
            stackKeys.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} radius={i === stackKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} maxBarSize={36} />
            ))
          ) : multiSeries ? (
            seriesNames.map((name, i) => (
              <Bar key={name} dataKey={name} fill={outlets.find(o => o.name === name)?.color_hex || SERIES_COLORS[i % SERIES_COLORS.length]} radius={[3, 3, 0, 0]} maxBarSize={36} />
            ))
          ) : (
            <Bar dataKey={dataKey} fill={COLORS.eco} radius={[3, 3, 0, 0]} maxBarSize={40} />
          )}
          {renderBenchmark()}
        </BarChart>
      );
    }

    if (chartType === 'area') {
      return (
        <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.eco} stopOpacity={0.25} />
              <stop offset="100%" stopColor={COLORS.eco} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="day" {...axisProps} />
          <YAxis {...axisProps} domain={yDomain || ['auto', 'auto']} ticks={yTicks} />
          <Tooltip content={<CustomTooltip unit={unit} unitPrefix={unitPrefix} />} />
          {multiSeries ? (
            seriesNames.map((name, i) => (
              <Area key={name} type="monotone" dataKey={name} stroke={outlets.find(o => o.name === name)?.color_hex || SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2} fillOpacity={0.08} fill={outlets.find(o => o.name === name)?.color_hex || SERIES_COLORS[i % SERIES_COLORS.length]} />
            ))
          ) : (
            <Area type="monotone" dataKey={dataKey} stroke={COLORS.eco} strokeWidth={2} fill={`url(#grad-${title})`} />
          )}
          {renderBenchmark()}
        </AreaChart>
      );
    }

    // Default: line chart
    return (
      <LineChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="day" {...axisProps} />
        <YAxis {...axisProps} domain={yDomain || ['auto', 'auto']} ticks={yTicks} />
        <Tooltip content={<CustomTooltip unit={unit} unitPrefix={unitPrefix} />} />
        {multiSeries ? (
          seriesNames.map((name, i) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={outlets.find(o => o.name === name)?.color_hex || SERIES_COLORS[i % SERIES_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 2.5, fill: '#0e1f1c', strokeWidth: 1.5 }}
              activeDot={{ r: 4 }}
            />
          ))
        ) : (
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={COLORS.eco}
            strokeWidth={2}
            dot={{ r: 2.5, fill: '#0e1f1c', strokeWidth: 1.5, stroke: COLORS.eco }}
            activeDot={{ r: 4 }}
          />
        )}
        {renderBenchmark()}
      </LineChart>
    );
  };

  return (
    <div className="bg-[#0e1f1c] border border-white/6 rounded-xl p-4 sm:p-5 flex flex-col h-full hover:border-white/10 transition-colors">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Left: icon + title */}
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-white/3 border border-white/6 flex items-center justify-center shrink-0">
              <Icon size={14} className={iconColor} />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-[13px] font-geometric font-black text-white leading-tight truncate">{title}</h3>
            {subtitle && <p className="text-[10px] text-white/25 mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>

        {/* Right: current value + trend */}
        {displayValue !== null && displayValue !== undefined && (
          <div className="flex flex-col items-end shrink-0">
            <span className="text-lg font-geometric font-black text-white leading-none">
              {unitPrefix}{displayValue.toFixed(1)}{unit}
            </span>
            {trendDelta !== undefined && !stacked && (
              <div className="flex items-center gap-0.5 mt-1">
                {trendUp ? (
                  <TrendingUp size={10} className="text-brand-alert" />
                ) : trendDown ? (
                  <TrendingDown size={10} className="text-brand-eco" />
                ) : (
                  <Minus size={10} className="text-white/20" />
                )}
                <span className={`text-[9px] font-bold ${trendUp ? 'text-brand-alert/70' : trendDown ? 'text-brand-eco/70' : 'text-white/20'}`}>
                  {Math.abs(summary!.pctChange).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Benchmark + Alert badges row */}
      {(benchmark !== undefined || hasAlert) && (
        <div className="flex items-center gap-2 mb-2">
          {benchmark !== undefined && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-brand-gold/6 border border-brand-gold/15">
              <span className="text-[9px] font-bold text-brand-gold/60 uppercase tracking-wide">
                {benchmarkLabel || 'Bench'}
              </span>
              <span className="text-[9px] font-bold text-white/50">
                {unitPrefix}{benchmark}{unit}
              </span>
            </div>
          )}
          {hasAlert && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-brand-alert/8 border border-brand-alert/20">
              <AlertTriangle size={9} className="text-brand-alert" />
              <span className="text-[9px] font-bold text-brand-alert/80 uppercase tracking-wide">Alert</span>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="flex-grow min-h-0 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Legend for multi-series / stacked */}
      <div className="mt-2 pt-2 border-t border-white/4">
        {multiSeries && seriesNames.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {seriesNames.map((name, i) => (
              <div key={name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: outlets.find(o => o.name === name)?.color_hex || SERIES_COLORS[i % SERIES_COLORS.length] }} />
                <span className="text-[9px] text-white/35 font-medium">{name}</span>
              </div>
            ))}
          </div>
        ) : stacked && stackKeys.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {stackKeys.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[9px] text-white/35 font-medium">{s.name}</span>
              </div>
            ))}
            {rollingAverageKey && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-[2px] rounded-full bg-brand-gold" />
                <span className="text-[9px] text-white/35 font-medium">Rolling Avg</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default KpiChart;
