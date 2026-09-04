import React, { useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceDot,
  AreaChart, Area, ComposedChart,
} from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, Minus, ShieldCheck } from 'lucide-react';
import { Outlet } from '../types';
import { useI18n, translate } from '../lib/useI18n';

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
  text: 'rgba(255,255,255,1)',
};

const SERIES_COLORS = ['#C8A413', '#77B139', '#3B82F6', '#FF914D', '#A855F7', '#FF3131'];

// ── Custom tooltip ─────────────────────────────────────────────────────────
const TOOLTIP_DAY_MAP: Record<string, string> = {
  'Sun': 'charts.daySun', 'Mon': 'charts.dayMon', 'Tue': 'charts.dayTue', 'Wed': 'charts.dayWed',
  'Thu': 'charts.dayThu', 'Fri': 'charts.dayFri', 'Sat': 'charts.daySat',
};
const TOOLTIP_SEG_MAP: Record<string, string> = {
  'Food': 'charts.segFood', 'Beverage': 'charts.segBeverage',
  'Restaurant': 'charts.segRestaurant', 'Bar': 'charts.segBar', 'Banquets': 'charts.segBanquets',
  'Rolling Avg': 'charts.rollingAverage',
};
const CustomTooltip = ({ active, payload, label, unit, unitPrefix }: any) => {
  if (!active || !payload?.length) return null;
  const tLabel = TOOLTIP_DAY_MAP[label] ? translate(TOOLTIP_DAY_MAP[label]) : label;
  return (
    <div className="bg-brand-dark border border-brand-gold/30 rounded-lg px-3 py-2 shadow-2xl">
      <p className="text-[8px] font-black text-brand-gold uppercase tracking-wider mb-1.5 text-center">{tLabel}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-[10px] py-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-white/50">{TOOLTIP_SEG_MAP[p.name] ? translate(TOOLTIP_SEG_MAP[p.name]) : p.name}:</span>
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
  const { t } = useI18n();
  const SEG_KEY_MAP: Record<string, string> = {
    'Food': 'segFood', 'Beverage': 'segBeverage',
    'Restaurant': 'segRestaurant', 'Bar': 'segBar', 'Banquets': 'segBanquets',
  };
  const tSeg = (name: string) => SEG_KEY_MAP[name] ? t(`charts.${SEG_KEY_MAP[name]}`) : name;
  const hasAlert = useMemo(() => {
    if (!benchmark || !alertIfAbove) return false;
    return data.some(d => Number(d[dataKey]) > benchmark);
  }, [data, dataKey, benchmark, alertIfAbove]);

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

  const DAY_KEY_MAP: Record<string, string> = {
    'Sun': 'daySun', 'Mon': 'dayMon', 'Tue': 'dayTue', 'Wed': 'dayWed',
    'Thu': 'dayThu', 'Fri': 'dayFri', 'Sat': 'daySat',
  };
  const tDay = (day: string) => DAY_KEY_MAP[day] ? t(`charts.${DAY_KEY_MAP[day]}`) : day;

  const axisProps = {
    stroke: COLORS.axis,
    tick: { fontSize: 9, fill: COLORS.text },
    axisLine: false,
    tickLine: false,
  };
  const xAxisProps = { ...axisProps, tickFormatter: (v: string) => tDay(v) };

  const gridProps = {
    strokeDasharray: '3 3',
    stroke: COLORS.grid,
    vertical: false as const,
  };

  const renderBenchmark = () =>
    benchmark !== undefined && (
      <ReferenceDot y={benchmark} x={data.length - 1} r={5} fill={COLORS.alert} stroke={COLORS.alert} strokeOpacity={0.8} />
    );

  const renderChart = () => {
    if (chartType === 'composed' && rollingAverageKey) {
      return (
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="day" {...xAxisProps} />
          <YAxis {...axisProps} domain={yDomain || ['auto', 'auto']} ticks={yTicks} />
          <Tooltip content={<CustomTooltip unit={unit} unitPrefix={unitPrefix} />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
          {stackKeys.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} radius={i === stackKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} maxBarSize={40} />
          ))}
          <Line type="monotone" dataKey={rollingAverageKey} name={t('charts.rollingAverage')} stroke={COLORS.gold} strokeWidth={2} dot={false} />
          {renderBenchmark()}
        </ComposedChart>
      );
    }

    if (chartType === 'bar') {
      return (
        <BarChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="day" {...xAxisProps} />
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
          <XAxis dataKey="day" {...xAxisProps} />
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
        <XAxis dataKey="day" {...xAxisProps} />
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
              dot={{ r: 2.5, fill: '#1c3933', strokeWidth: 1.5 }}
              activeDot={{ r: 4 }}
            />
          ))
        ) : (
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={COLORS.eco}
            strokeWidth={2}
            dot={{ r: 2.5, fill: '#1c3933', strokeWidth: 1.5, stroke: COLORS.eco }}
            activeDot={{ r: 4 }}
          />
        )}
        {renderBenchmark()}
      </LineChart>
    );
  };

  // Format benchmark display
  const formatBenchmark = (val: number) => {
    if (unitPrefix === '$') return `$${val.toLocaleString()}`;
    if (unit === '%') return `${val}%`;
    return `${val}${unit}`;
  };

  return (
    <div className="bg-[#1c3933] border border-brand-gold/20 rounded-2xl p-5 sm:p-6 shadow-xl w-full h-full flex flex-col transition-all duration-300 hover:border-brand-gold/30">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0`}>
              <Icon size={18} className={iconColor} />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-base font-geometric font-bold text-white uppercase tracking-tight leading-none truncate">{title}</h3>
            {subtitle && <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-1 truncate">{subtitle}</p>}
          </div>
        </div>
        {hasAlert ? (
          <div className="flex items-center gap-1.5 bg-brand-alert/15 border border-brand-alert/30 px-2.5 py-1 rounded-lg shrink-0">
            <AlertTriangle size={11} className="text-brand-alert" />
            <span className="text-[9px] font-black text-brand-alert uppercase tracking-widest">{t('charts.statusAlert')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-brand-eco/15 border border-brand-eco/30 px-2.5 py-1 rounded-lg shrink-0">
            <ShieldCheck size={11} className="text-brand-eco" />
            <span className="text-[9px] font-black text-brand-eco uppercase tracking-widest">{t('charts.statusOnTarget')}</span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {benchmark !== undefined && (
          <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
            <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">{benchmarkLabel || t('charts.statBenchmark')}</p>
            <p className="text-sm font-geometric font-black text-white leading-none mt-1">{formatBenchmark(benchmark)}</p>
          </div>
        )}
        {displayValue !== null && displayValue !== undefined && (
          <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
            <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">{t('charts.statCurrent')}</p>
            <p className="text-sm font-geometric font-black text-white leading-none mt-1">
              {unitPrefix}{displayValue.toFixed(1)}{unit}
            </p>
          </div>
        )}
        {trendDelta !== undefined && !stacked && (
          <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
            <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">{t('charts.statTrend')}</p>
            <div className="flex items-center gap-1 mt-1">
              {trendUp ? (
                <TrendingUp size={12} className="text-brand-alert" />
              ) : trendDown ? (
                <TrendingDown size={12} className="text-brand-eco" />
              ) : (
                <Minus size={12} className="text-white/20" />
              )}
              <span className={`text-sm font-geometric font-black leading-none ${trendUp ? 'text-brand-alert' : trendDown ? 'text-brand-eco' : 'text-white/40'}`}>
                {Math.abs(summary!.pctChange).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
        {stacked && stackKeys.length > 0 && (
          <div className="bg-brand-dark/40 rounded-lg px-3 py-2 border border-brand-gold/5">
            <p className="text-[8px] font-black text-brand-gold/60 uppercase tracking-widest">{t('charts.statSegments')}</p>
            <p className="text-sm font-geometric font-black text-white leading-none mt-1">{stackKeys.length}</p>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="flex-grow min-h-0 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-white/5">
        {multiSeries && seriesNames.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {seriesNames.map((name, i) => (
              <div key={name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: outlets.find(o => o.name === name)?.color_hex || SERIES_COLORS[i % SERIES_COLORS.length] }} />
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider">{name}</span>
              </div>
            ))}
          </div>
        ) : stacked && stackKeys.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {stackKeys.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider">{tSeg(s.name)}</span>
              </div>
            ))}
            {rollingAverageKey && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-[2px] rounded-full bg-brand-gold" />
                <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider">{t('charts.rollingAverage')}</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default KpiChart;
