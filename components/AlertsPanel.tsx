import React, { useState, useMemo } from 'react';
import { AlertTriangle, AlertCircle, Info, ShieldCheck, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../lib/useI18n';

interface StructuredAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  date: string;
  title: string;
  outletsAffected: { name: string; detail: string }[];
  recommendation: string;
}

interface Suggestion {
  category: string;
  severity: 'critical' | 'warning' | 'info';
  date: string;
  text: string;
}

interface AlertsPanelProps {
  impacts: {
    carbonImpact: number;
    waterFootprint: number;
    totalFinancialLoss: number;
    isDeviating: boolean;
  };
  rawWasteLogs: any[];
  rawResourceLogs: any[];
  outlets: any[];
  effectiveParams: {
    wasteTarget?: number;
    waterTarget?: number;
    energyTarget?: number;
  };
}

const ALERTS_PER_PAGE = 3;
const SUGGESTIONS_PER_PAGE = 3;

const SeverityIcon: React.FC<{ severity: 'critical' | 'warning' | 'info'; size?: number }> = ({ severity, size = 14 }) => {
  if (severity === 'critical') return <AlertTriangle size={size} className="text-brand-alert shrink-0" />;
  if (severity === 'warning') return <AlertCircle size={size} className="text-brand-gold shrink-0" />;
  return <Info size={size} className="text-brand-eco shrink-0" />;
};

const severityColor = (s: 'critical' | 'warning' | 'info') =>
  s === 'critical' ? 'brand-alert' : s === 'warning' ? 'brand-gold' : 'brand-eco';

const AlertsPanel: React.FC<AlertsPanelProps> = ({
  impacts,
  rawWasteLogs,
  rawResourceLogs,
  outlets,
  effectiveParams,
}) => {
  const { t, lang } = useI18n();
  const [openAlerts, setOpenAlerts] = useState<Set<string>>(new Set());
  const [alertPage, setAlertPage] = useState(0);
  const [suggestionPage, setSuggestionPage] = useState(0);

  const toggleAlert = (id: string) =>
    setOpenAlerts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const today = new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const wasteTarget = effectiveParams.wasteTarget || 100;
  const waterTarget = effectiveParams.waterTarget || 25000;
  const energyTarget = effectiveParams.energyTarget || 1000;

  const { structuredAlerts, suggestions } = useMemo(() => {
    const outletWasteMap: Record<string, { name: string; kg: number }> = {};
    rawWasteLogs.forEach((log: any) => {
      const oid = log.outlet_id;
      if (!oid) return;
      const o = outlets.find((x: any) => x.id === oid);
      const name = o?.name || o?.code || oid;
      if (!outletWasteMap[oid]) outletWasteMap[oid] = { name, kg: 0 };
      outletWasteMap[oid].kg += parseFloat(log.mass_kg) || 0;
    });

    const outletWaterMap: Record<string, { name: string; liters: number }> = {};
    const outletEnergyMap: Record<string, { name: string; kwh: number }> = {};
    rawResourceLogs.forEach((log: any) => {
      const oid = log.outlet_id;
      if (!oid) return;
      const o = outlets.find((x: any) => x.id === oid);
      const name = o?.name || o?.code || oid;
      if (log.water_liters) {
        if (!outletWaterMap[oid]) outletWaterMap[oid] = { name, liters: 0 };
        outletWaterMap[oid].liters += parseFloat(log.water_liters) || 0;
      }
      if (log.energy_kwh) {
        if (!outletEnergyMap[oid]) outletEnergyMap[oid] = { name, kwh: 0 };
        outletEnergyMap[oid].kwh += parseFloat(log.energy_kwh) || 0;
      }
    });

    const alerts: StructuredAlert[] = [];
    const suggestions: Suggestion[] = [];

    // Food Waste — per outlet
    const overWasteOutlets = Object.values(outletWasteMap)
      .filter(o => o.kg > wasteTarget)
      .map(o => {
        const pct = Math.round(((o.kg - wasteTarget) / wasteTarget) * 100);
        return { name: o.name, detail: t('dashboard.alertWasteDetail', { kg: Math.round(o.kg), pct, target: wasteTarget }), pct };
      });
    if (overWasteOutlets.length > 0) {
      const maxPct = Math.max(...overWasteOutlets.map(o => o.pct));
      alerts.push({ id: 'waste', severity: maxPct > 20 ? 'critical' : 'warning', category: t('dashboard.catFoodWaste'), date: today, title: t('dashboard.alertWasteTitle'), outletsAffected: overWasteOutlets, recommendation: t('dashboard.sugWaste') });
      suggestions.push({ category: t('dashboard.catFoodWaste'), severity: maxPct > 20 ? 'critical' : 'warning', date: today, text: t('dashboard.sugWaste') });
    }

    // Carbon — aggregate
    if (impacts.isDeviating) {
      alerts.push({ id: 'carbon', severity: 'critical', category: t('dashboard.catCarbon'), date: today, title: t('dashboard.alertCarbonTitle'), outletsAffected: [{ name: t('dashboard.alertsAllOutlets'), detail: t('dashboard.alertCarbonDetail', { co2: impacts.carbonImpact.toFixed(1) }) }], recommendation: t('dashboard.sugCarbon') });
      suggestions.push({ category: t('dashboard.catCarbon'), severity: 'critical', date: today, text: t('dashboard.sugCarbon') });
    }

    // Financial — aggregate
    if (impacts.totalFinancialLoss > 500) {
      const savings = Math.round(impacts.totalFinancialLoss * 0.10);
      alerts.push({ id: 'financial', severity: 'warning', category: t('dashboard.catFinancial'), date: today, title: t('dashboard.alertFinancialTitle', { amount: impacts.totalFinancialLoss.toFixed(2) }), outletsAffected: [{ name: t('dashboard.alertsAllOutlets'), detail: t('dashboard.alertFinancialDetail') }], recommendation: t('dashboard.sugFinancial', { savings }) });
      suggestions.push({ category: t('dashboard.catFinancial'), severity: 'warning', date: today, text: t('dashboard.sugFinancial', { savings }) });
    }

    // Water — per outlet
    const overWaterOutlets = Object.values(outletWaterMap)
      .filter(o => o.liters > waterTarget)
      .map(o => {
        const pct = Math.round(((o.liters - waterTarget) / waterTarget) * 100);
        return { name: o.name, detail: t('dashboard.alertWaterDetail', { liters: Math.round(o.liters).toLocaleString(), pct, target: waterTarget.toLocaleString() }) };
      });
    if (overWaterOutlets.length > 0) {
      const maxPct = Math.max(...Object.values(outletWaterMap).filter(o => o.liters > waterTarget).map(o => Math.round(((o.liters - waterTarget) / waterTarget) * 100)));
      alerts.push({ id: 'water', severity: maxPct > 30 ? 'critical' : 'warning', category: t('dashboard.catWater'), date: today, title: t('dashboard.alertWaterTitle'), outletsAffected: overWaterOutlets, recommendation: t('dashboard.sugWater') });
      suggestions.push({ category: t('dashboard.catWater'), severity: maxPct > 30 ? 'critical' : 'warning', date: today, text: t('dashboard.sugWater') });
    }

    // Energy — per outlet
    const overEnergyOutlets = Object.values(outletEnergyMap)
      .filter(o => o.kwh > energyTarget)
      .map(o => {
        const pct = Math.round(((o.kwh - energyTarget) / energyTarget) * 100);
        return { name: o.name, detail: t('dashboard.alertEnergyDetail', { kwh: Math.round(o.kwh).toLocaleString(), pct, target: energyTarget.toLocaleString() }) };
      });
    if (overEnergyOutlets.length > 0) {
      const maxPct = Math.max(...Object.values(outletEnergyMap).filter(o => o.kwh > energyTarget).map(o => Math.round(((o.kwh - energyTarget) / energyTarget) * 100)));
      alerts.push({ id: 'energy', severity: maxPct > 30 ? 'critical' : 'warning', category: t('dashboard.catEnergy'), date: today, title: t('dashboard.alertEnergyTitle'), outletsAffected: overEnergyOutlets, recommendation: t('dashboard.sugEnergy') });
      suggestions.push({ category: t('dashboard.catEnergy'), severity: maxPct > 30 ? 'critical' : 'warning', date: today, text: t('dashboard.sugEnergy') });
    }

    return { structuredAlerts: alerts, suggestions };
  }, [rawWasteLogs, rawResourceLogs, outlets, impacts, wasteTarget, waterTarget, energyTarget, t]);

  // Pagination slices
  const totalAlertPages = Math.ceil(structuredAlerts.length / ALERTS_PER_PAGE);
  const totalSuggestionPages = Math.ceil(suggestions.length / SUGGESTIONS_PER_PAGE);
  const pagedAlerts = structuredAlerts.slice(alertPage * ALERTS_PER_PAGE, (alertPage + 1) * ALERTS_PER_PAGE);
  const pagedSuggestions = suggestions.slice(suggestionPage * SUGGESTIONS_PER_PAGE, (suggestionPage + 1) * SUGGESTIONS_PER_PAGE);

  if (structuredAlerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-eco/10 border border-brand-eco/30 flex items-center justify-center mb-4">
          <ShieldCheck size={26} className="text-brand-eco" />
        </div>
        <p className="text-sm text-white/60 font-medium">{t('dashboard.alertsAllClear')}</p>
        <p className="text-[11px] text-white/30 mt-1">{t('dashboard.alertsNone')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── ALERTS ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-1 h-5 bg-brand-alert rounded-full" />
          <span className="text-[11px] font-black text-brand-alert uppercase tracking-widest">{t('dashboard.alertsLabel')}</span>
          <span className="ml-auto text-[10px] text-white/30 uppercase tracking-widest">{t('dashboard.alertsActive', { count: structuredAlerts.length })}</span>
        </div>

        <div className="space-y-2">
          {pagedAlerts.map(alert => {
            const isOpen = openAlerts.has(alert.id);
            const col = severityColor(alert.severity);
            return (
              <div
                key={alert.id}
                className={`rounded-xl border overflow-hidden transition-all ${
                  alert.severity === 'critical' ? 'border-brand-alert/50 bg-brand-alert/5' :
                  alert.severity === 'warning'  ? 'border-brand-gold/40 bg-brand-gold/5' :
                                                  'border-brand-eco/30 bg-brand-eco/5'
                }`}
              >
                {/* Accordion header — always visible */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  onClick={() => toggleAlert(alert.id)}
                >
                  <SeverityIcon severity={alert.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-brand-alert">{alert.category}</span>
                      <span className="text-[9px] text-white/20">·</span>
                      <span className="text-[9px] text-white/30 uppercase tracking-wide">{alert.date}</span>
                    </div>
                    <p className="text-[13px] font-bold text-white leading-tight">{alert.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-${col}/20 text-${col}`}>
                      {alert.outletsAffected.length === 1
                        ? t('dashboard.alertsOutlets', { count: alert.outletsAffected.length })
                        : t('dashboard.alertsOutletsPlural', { count: alert.outletsAffected.length })}
                    </span>
                    {isOpen
                      ? <ChevronUp size={13} className="text-white/40" />
                      : <ChevronDown size={13} className="text-white/40" />}
                  </div>
                </button>

                {/* Expanded body */}
                {isOpen && (
                  <div className={`px-4 pb-4 pt-1 border-t ${
                    alert.severity === 'critical' ? 'border-brand-alert/15' :
                    alert.severity === 'warning'  ? 'border-brand-gold/15' :
                                                    'border-brand-eco/15'
                  }`}>
                    {/* Outlet breakdown */}
                    <div className="space-y-1.5 mb-3">
                      {alert.outletsAffected.map((outlet, oi) => (
                        <div key={oi} className="flex items-center gap-2 pl-2">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 bg-${col}/70`} />
                          <span className="text-[11px] font-bold text-white/80 shrink-0">{outlet.name}</span>
                          <span className="text-[10px] text-white/40 ml-auto text-right">{outlet.detail}</span>
                        </div>
                      ))}
                    </div>
                    {/* Recommendation */}
                    <p className="text-[11px] text-brand-eco/80 leading-relaxed pl-2">
                      <span className="font-bold">→ </span>{alert.recommendation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Alert pagination */}
        {totalAlertPages > 1 && (
          <div className="flex items-center justify-between mt-3 px-1">
            <button
              onClick={() => { setAlertPage(p => Math.max(0, p - 1)); setOpenAlerts(new Set()); }}
              disabled={alertPage === 0}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/30 disabled:opacity-30 hover:text-white/60 transition-colors"
            >
              <ChevronLeft size={12} /> {t('dashboard.alertsPrev')}
            </button>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
              {alertPage + 1} / {totalAlertPages}
            </span>
            <button
              onClick={() => { setAlertPage(p => Math.min(totalAlertPages - 1, p + 1)); setOpenAlerts(new Set()); }}
              disabled={alertPage === totalAlertPages - 1}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/30 disabled:opacity-30 hover:text-white/60 transition-colors"
            >
              {t('dashboard.alertsNext')} <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* ── SUGGESTIONS ── */}
      {suggestions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-brand-eco rounded-full" />
            <span className="text-[11px] font-black text-brand-eco uppercase tracking-widest">{t('dashboard.alertsSuggestions')}</span>
          </div>

          <div className="space-y-2">
            {pagedSuggestions.map((s, i) => {
              // Category-based color: Food Waste/Carbon/Water/Energy = green, Financial = yellow
              const isFinancial = s.category === 'Financial';
              const catColor = isFinancial ? '#C8A413' : '#22c55e';
              return (
                <div
                  key={i}
                  className="rounded-xl border px-4 py-3"
                  style={{ borderColor: `${catColor}55`, backgroundColor: `${catColor}0e` }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityIcon severity={s.severity} size={11} />
                    <span
                      className="text-[9px] font-black uppercase tracking-widest"
                      style={{ color: catColor }}
                    >
                      {s.category}
                    </span>
                    <span className="text-[9px] text-white/20">·</span>
                    <span className="text-[9px] text-white/30 uppercase tracking-wide">{s.date}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-white">
                    <span className="font-bold" style={{ color: catColor }}>→ </span>{s.text}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Suggestion pagination */}
          {totalSuggestionPages > 1 && (
            <div className="flex items-center justify-between mt-3 px-1">
              <button
                onClick={() => setSuggestionPage(p => Math.max(0, p - 1))}
                disabled={suggestionPage === 0}
                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/30 disabled:opacity-30 hover:text-white/60 transition-colors"
              >
                <ChevronLeft size={12} /> {t('dashboard.alertsPrev')}
              </button>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/20">
                {suggestionPage + 1} / {totalSuggestionPages}
              </span>
              <button
                onClick={() => setSuggestionPage(p => Math.min(totalSuggestionPages - 1, p + 1))}
                disabled={suggestionPage === totalSuggestionPages - 1}
                className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-white/30 disabled:opacity-30 hover:text-white/60 transition-colors"
              >
                {t('dashboard.alertsNext')} <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AlertsPanel;
