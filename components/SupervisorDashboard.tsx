import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate as useRouterNavigate } from 'react-router-dom';
import { UserProfile, Outlet } from '../types';
import Logo from './Logo';
import {
  BarChart3,
  TrendingUp,
  Leaf,
  Zap,
  Droplets,
  Cpu,
  MessageSquare,
  DollarSign,
  Clock,
  AlertTriangle,
  FileText,
  MessageCircle,
  LogOut,
  ChevronRight,
  Calendar,
  Cloud,
  ChevronDown,
  Info,
  History,
  TrendingDown,
  ShieldCheck,
  Award,
  Search,
  CheckCircle2,
  Settings,
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  Printer,
  ShieldAlert,
  X as XIcon,
  Target,
  Database,
  Inbox
} from 'lucide-react';
import FoodCostTemplateChart from './FoodCostTemplateChart';
import LaborCostTemplateChart from './LaborCostTemplateChart';
import ProfitMarginTemplateChart from './ProfitMarginTemplateChart';
import FoodWasteTemplateChart from './FoodWasteTemplateChart';
import WaterUsageTemplateChart from './WaterUsageTemplateChart';
import EnergyUsageTemplateChart from './EnergyUsageTemplateChart';
import Co2EmissionsTemplateChart from './Co2EmissionsTemplateChart';
import AvgCheckTemplateChart from './AvgCheckTemplateChart';
import SalesTemplateChart from './SalesTemplateChart';
import SentimentTemplateChart from './SentimentTemplateChart';
import MilaWidget from './MilaWidget';
import ReportAlertBox from './ReportAlertBox';
import ReportAlertBoxKPI from './ReportAlertBoxKPI';

import { supabase } from '../lib/supabase';

interface SupervisorDashboardProps {
  user: UserProfile;
  onLogout: () => void;
}

const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({ user, onLogout }) => {
  const routerNavigate = useRouterNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [activeCommentCard, setActiveCommentCard] = useState<string | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedDaySales, setSelectedDaySales] = useState<any | null>(null);
  const [selectedFoodCostDay, setSelectedFoodCostDay] = useState<any | null>(null);
  const [selectedLaborCostDay, setSelectedLaborCostDay] = useState<any | null>(null);

  // Dynamic Data Linkage - Same session persistence
  const [sessionOutlets, setSessionOutlets] = useState<Outlet[]>([]);
  const [sessionWasteEntries, setSessionWasteEntries] = useState<any[]>([]);
  const [sessionResourceEntries, setSessionResourceEntries] = useState<any[]>([]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync session data on mount
  useEffect(() => {
    const savedOutlets = localStorage.getItem('ecometricus_outlets');
    const savedWaste = localStorage.getItem('ecometricus_waste_entries');
    const savedResources = localStorage.getItem('ecometricus_resource_entries');
    if (savedOutlets) setSessionOutlets(JSON.parse(savedOutlets));
    if (savedWaste) setSessionWasteEntries(JSON.parse(savedWaste));
    if (savedResources) setSessionResourceEntries(JSON.parse(savedResources));
  }, []);

  // Operational Benchmarks
  const benchmarks = {
    waste: 100,
    foodCost: 30.0,
    laborCost: 28.0,
    profitMargin: 18.0,
    avgSales: 50000
  };

  // State for Charts (Hybrid: Mock + Supabase)
  // State for Charts — populated from Supabase, starts empty
  const [weeklyTrends, setWeeklyTrends] = useState([
    { day: 'Sun', foodCost: 0, laborCost: 0, profitMargin: 0, sentiment: 0 },
    { day: 'Mon', foodCost: 0, laborCost: 0, profitMargin: 0, sentiment: 0 },
    { day: 'Tue', foodCost: 0, laborCost: 0, profitMargin: 0, sentiment: 0 },
    { day: 'Wed', foodCost: 0, laborCost: 0, profitMargin: 0, sentiment: 0 },
    { day: 'Thu', foodCost: 0, laborCost: 0, profitMargin: 0, sentiment: 0 },
    { day: 'Fri', foodCost: 0, laborCost: 0, profitMargin: 0, sentiment: 0 },
    { day: 'Sat', foodCost: 0, laborCost: 0, profitMargin: 0, sentiment: 0 },
  ]);

  // Supabase Data Fetch - Food Cost
  useEffect(() => {
    const fetchFoodCost = async () => {
      // 🛡️ Auth Sync Gate (Phase 3 Repair)
      const { data: { session }, error: operationalAuthError } = await supabase.auth.getSession();
      if (!session || operationalAuthError) {
        onLogout();
        return;
      }
      
      // 1. Get Outlet ID for the current user's outlet (or default to Royal if needed for demo)
      const targetOutletCode = user.outletCode || 'ROY02';

      const { data: outletData } = await supabase
        .from('outlets')
        .select('id')
        .eq('code', targetOutletCode)
        .single();

      if (!outletData) {
        console.warn(`Outlet ${targetOutletCode} not found.`);
        return;
      }

      const outletId = outletData.id;

      // 2. Fetch Logs for this Outlet AND the Legacy ID to ensure history is shown
      const LEGACY_ID = '87ce73ab-b490-4b4c-815b-f6b79dcff9c7';
      const { data, error } = await supabase
        .from('food_cost_logs')
        .select('*')
        .or(`outlet_id.eq.${outletId},outlet_id.eq.${LEGACY_ID}`)
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        // Map Supabase values to the existing days structure (preserving other mock metrics)
        setWeeklyTrends(prev => prev.map((item) => {
          // Find log entry for this day
          // Note: This matches based on "Sun", "Mon", etc. 
          // Ideally logs are within the current week. 
          // If multiple logs exist for "Mon", we take the latest one.
          const logForDay = data.filter(d =>
            new Date(d.created_at).toLocaleDateString('en-US', { weekday: 'short' }) === item.day
          ).pop(); // Take the last one (latest)

          if (logForDay) {
            return { ...item, foodCost: parseFloat(logForDay.value) };
          }
          return item;
        }));
      } else {
        console.log("No Supabase data found, using mock.");
      }
    };
    fetchFoodCost();
  }, [user.outletCode]);


  // Sales data — empty until real data is available
  const salesChartData = [
    { day: 'Sun', total: 0, food: 0, bev: 0 },
    { day: 'Mon', total: 0, food: 0, bev: 0 },
    { day: 'Tue', total: 0, food: 0, bev: 0 },
    { day: 'Wed', total: 0, food: 0, bev: 0 },
    { day: 'Thu', total: 0, food: 0, bev: 0 },
    { day: 'Fri', total: 0, food: 0, bev: 0 },
    { day: 'Sat', total: 0, food: 0, bev: 0 },
  ];

  // Recalculate operational data based on session linkage
  const sessionData = useMemo(() => {
    const totalWasteKg = sessionWasteEntries.reduce((sum, e) => sum + e.amount, 0);
    const totalWaterUsage = sessionResourceEntries.filter(e => e.type === 'water').reduce((sum, e) => sum + e.amount, 0);
    const totalEnergyUsage = sessionResourceEntries.filter(e => e.type === 'energy').reduce((sum, e) => sum + e.amount, 0);

    // Impact coefficients matching StaffPortal logic
    const costPerItemUnit = 7.50;
    const costPerDisposalUnit = 1.25;
    const carbonCoeff = 2.85;
    const waterCoeff = 3.40;

    const financialLossItems = totalWasteKg * costPerItemUnit;
    const financialLossDisposal = totalWasteKg * costPerDisposalUnit;
    const totalFinancialLoss = financialLossItems + financialLossDisposal;

    return {
      waste: {
        kg: totalWasteKg,
        cost: financialLossItems,
        disposalCost: financialLossDisposal
      },
      water: totalWaterUsage,
      energy: totalEnergyUsage,
      impacts: {
        carbonImpact: totalWasteKg * carbonCoeff,
        waterFootprint: totalWasteKg * waterCoeff,
        totalFinancialLoss: totalFinancialLoss,
        isDeviating: totalWasteKg > benchmarks.waste
      }
    };
  }, [sessionWasteEntries, sessionResourceEntries, benchmarks.waste]);

  // Calculate stats from dynamic WeeklyTrends
  const latestFoodCost = weeklyTrends[5].foodCost; // Targeting Friday (Index 5) as per instruction "Friday value is 30.8"

  const operationalData = {
    sales: 0,
    profitMargin: 0,
    avgCheck: 0,
    foodCost: latestFoodCost,
    laborCost: 0,
    customerReview: 0,
    ...sessionData
  };

  const impacts = sessionData.impacts;

  // REPORT ALERTS LOGIC
  // 1. KPI Alert: Daily Food Cost > Benchmark (30.0 logic override)
  const showKpiAlert = operationalData.foodCost > 30.0;
  // 2. Sustainability Alert: Daily Waste > Benchmark
  const showSustainabilityAlert = operationalData.waste.kg > benchmarks.waste;

  const activeAlerts = {
    kpi: showKpiAlert,
    sustainability: showSustainabilityAlert
  };

  // Derived information linked to Admin Data
  const currentOutletName = useMemo(() => {
    const found = sessionOutlets.find(o => o.code === user.outletCode);
    return found ? found.name : (user.outletCode === 'ROY02' ? 'Royal' : 'Fisher’s');
  }, [sessionOutlets, user.outletCode]);

  // Refined Tooltip for edge cases
  const Tooltip = ({ id, text, align = 'center', direction = 'up' }: { id: string, text: string, align?: 'center' | 'left' | 'right', direction?: 'up' | 'down' }) => (
    <div className="relative inline-block ml-2 align-middle">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip(showTooltip === id ? null : id);
        }}
        className={`transition-colors focus:outline-none ${showTooltip === id ? 'text-brand-gold' : 'text-gray-500 hover:text-brand-gold'}`}
      >
        <Info size={16} />
      </button>
      {showTooltip === id && (
        <div className={`absolute w-64 p-4 bg-[#152E2A] border-2 border-brand-gold rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[200] animate-in fade-in zoom-in-95 duration-200 
          ${direction === 'up' ? 'bottom-full mb-4' : 'top-full mt-4'} 
          ${align === 'right' ? 'right-0 translate-x-4' : 'left-1/2 -translate-x-1/2'}`}
        >
          <p className="text-[10px] text-gray-200 font-black uppercase leading-relaxed tracking-[0.1em]">
            {text}
          </p>
          <div className={`absolute w-4 h-4 bg-[#152E2A] border-brand-gold rotate-45 
            ${direction === 'up' ? 'bottom-[-9px] border-r-2 border-b-2' : 'top-[-9px] border-l-2 border-t-2'} 
            ${align === 'right' ? 'right-6' : 'left-1/2 -translate-x-1/2'}`}></div>
        </div>
      )}
    </div>
  );

  const KpiCard = ({ id, label, value, unit, icon: Icon, color, trend, tooltipText }: any) => (
    <div className={`bg-[#0f2420] border-2 border-brand-gold/40 p-6 rounded-[30px] shadow-2xl space-y-4 group hover:border-brand-gold/70 transition-all relative ${activeCommentCard === id ? 'ring-2 ring-brand-gold/50' : ''}`}>
      <div className="flex items-center justify-between">
        <div className={`p-3 bg-brand-dark/60 rounded-xl border-2 border-white/10 group-hover:border-brand-gold/30 transition-all`}>
          <Icon className={color || 'text-brand-gold'} size={20} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveCommentCard(activeCommentCard === id ? null : id)}
            className={`transition-colors ${comments[id] ? 'text-brand-gold' : 'text-gray-600 hover:text-brand-gold'}`}
          >
            <MessageCircle size={16} />
          </button>
          <Tooltip id={id} text={tooltipText || `${label} metrics tracking for the current operational shift.`} />
        </div>
      </div>
      <div>
        <h4 className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em]">{label}</h4>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-black text-white">{value}</span>
          <span className="text-[10px] font-bold text-gray-500 uppercase">{unit}</span>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-[9px] font-black uppercase tracking-widest ${trend > 0 ? 'text-brand-eco' : 'text-brand-alert'}`}>
            {trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(trend)}% vs Last Period
          </div>
        )}
      </div>
      {activeCommentCard === id && (
        <div className="mt-4 pt-4 border-t border-white/10 animate-in fade-in slide-in-from-top-2 duration-300">
          <textarea
            className="w-full bg-brand-dark/80 border border-white/10 rounded-xl p-3 text-[10px] text-white outline-none focus:border-brand-gold resize-none h-20"
            placeholder="Add operational feedback for staff..."
            value={comments[id] || ""}
            onChange={(e) => setComments({ ...comments, [id]: e.target.value })}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={() => setActiveCommentCard(null)}
              className="px-3 py-1 bg-brand-eco text-brand-dark rounded-full text-[8px] font-black uppercase tracking-widest"
            >
              Commit Comment
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const handleDigitalReport = () => {
    alert("Compiling Digital PDF Report...\nIncluding Supervisor Comments & ESG Deviations.");
  };

  return (
    <div className="min-h-screen bg-[#0a1a17] flex flex-col font-body selection:bg-brand-gold/20 selection:text-brand-gold antialiased overflow-x-hidden" onClick={() => { setShowTooltip(null); setSelectedFoodCostDay(null); setSelectedLaborCostDay(null); }}>

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 shrink-0 border-b border-white/6"
        style={{ background: 'linear-gradient(180deg, #0e1f1c 0%, rgba(14,31,28,0.97) 100%)', backdropFilter: 'blur(20px)' }}>

        <div className="max-w-[1920px] mx-auto h-14 px-4 sm:px-6 flex items-center justify-between gap-4">

          {/* Left: Logo */}
          <button
            onClick={() => routerNavigate('/')}
            className="hover:opacity-80 transition-opacity shrink-0"
            aria-label="Go to home page"
          >
            <Logo size="sm" withLabel />
          </button>

          {/* Right: user + logout */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-gold/25 to-brand-gold/5 border border-brand-gold/30 flex items-center justify-center shrink-0">
              <span className="text-brand-gold text-sm font-black leading-none">{user.fullName?.[0] ?? 'S'}</span>
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-[13px] font-semibold text-white">{user.fullName}</p>
              <p className="text-[10px] text-brand-gold/60 font-medium tracking-wide mt-0.5">
                {user.position} · {currentOutletName}
              </p>
            </div>
            <div className="hidden sm:block w-px h-7 bg-white/8" />
            <button
              onClick={onLogout}
              title="Log out"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white/30 hover:text-brand-alert hover:bg-brand-alert/8 transition-all"
            >
              <LogOut size={14} />
              <span className="hidden lg:inline text-[11px] font-medium">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 sm:p-8 lg:p-10 max-w-[1600px] mx-auto w-full space-y-8 sm:space-y-10">

        {/* Greeting */}
        {(() => {
          const h = currentTime.getHours();
          const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
          const firstName = user.fullName?.split(' ')[0] ?? 'there';
          return (
            <div>
              <h2 className="text-3xl sm:text-4xl font-geometric font-black text-white leading-none tracking-tight">
                {greeting}, <span className="text-brand-gold">{firstName}</span>
              </h2>
              <p className="text-[11px] font-medium text-white/30 mt-2 tracking-wide">
                {currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })} · {currentOutletName}
              </p>
            </div>
          );
        })()}

        {/* Mila Intelligence — ESG Snapshot */}
        <div className="bg-[#0e1f1c] border border-brand-gold/25 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
          <div className="absolute inset-0 pointer-events-none" style={{backgroundImage:'radial-gradient(ellipse at 80% 0%, rgba(200,164,19,0.05), transparent 55%)'}} />

          <div className="flex items-center gap-4 mb-6">
            <div className="w-11 h-11 bg-brand-gold/10 border border-brand-gold/30 rounded-xl flex items-center justify-center shrink-0">
              <Cpu className="text-brand-gold" size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-brand-gold/60 uppercase tracking-[0.35em]">Mila Intelligence</p>
              <h3 className="text-base font-geometric font-black text-white leading-tight">ESG Performance Snapshot</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 relative z-10">
            {/* Carbon */}
            <div className="flex flex-col gap-2 p-5 bg-white/3 rounded-xl border border-white/7 hover:border-brand-gold/25 transition-all">
              <span className="text-[9px] font-black text-brand-gold/60 uppercase tracking-widest flex items-center gap-2">
                <Cloud size={13} /> Carbon Lifecycle
              </span>
              <div className="text-2xl font-geometric font-black text-white">
                {impacts.carbonImpact > 0 ? `${impacts.carbonImpact.toFixed(1)}` : '—'}<span className="text-xs font-normal text-white/30 ml-1">kg CO₂e</span>
              </div>
              <div className="flex items-center gap-1.5 mt-auto">
                {impacts.isDeviating ? (
                  <>
                    <AlertTriangle className="text-brand-alert" size={12} />
                    <p className="text-[9px] text-brand-alert/80 uppercase font-bold tracking-wide">Deviation impact</p>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="text-brand-eco" size={12} />
                    <p className="text-[9px] text-brand-eco/80 uppercase font-bold tracking-wide">Within target</p>
                  </>
                )}
              </div>
            </div>

            {/* Water */}
            <div className="flex flex-col gap-2 p-5 bg-white/3 rounded-xl border border-white/7 hover:border-blue-500/30 transition-all">
              <span className="text-[9px] font-black text-brand-gold/60 uppercase tracking-widest flex items-center gap-2">
                <Droplets size={13} /> Water Resource
              </span>
              <div className="text-2xl font-geometric font-black text-white">
                {impacts.waterFootprint > 0 ? `${impacts.waterFootprint.toFixed(1)}` : '—'}<span className="text-xs font-normal text-white/30 ml-1">L</span>
              </div>
              <div className="flex items-center gap-1.5 mt-auto">
                <ShieldCheck className="text-brand-eco" size={12} />
                <p className="text-[9px] text-brand-eco/80 uppercase font-bold tracking-wide">Averted loss</p>
              </div>
            </div>

            {/* Financial */}
            <div className={`flex flex-col gap-2 p-5 rounded-xl border transition-all ${impacts.isDeviating ? 'bg-brand-alert/8 border-brand-alert/40' : 'bg-brand-eco/8 border-brand-eco/30'}`}>
              <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${impacts.isDeviating ? 'text-brand-alert/70' : 'text-brand-eco/70'}`}>
                <DollarSign size={13} /> Financial Impact
              </span>
              <div className={`text-2xl font-geometric font-black ${impacts.isDeviating ? 'text-brand-alert' : 'text-brand-eco'}`}>
                {impacts.totalFinancialLoss > 0 ? `$${impacts.totalFinancialLoss.toFixed(2)}` : '$0.00'}
              </div>
              {impacts.isDeviating ? (
                <div className="mt-auto flex items-center gap-1.5">
                  <AlertTriangle size={11} className="text-brand-alert" />
                  <p className="text-[9px] text-brand-alert/80 uppercase font-bold tracking-wide">Supervisor notified</p>
                </div>
              ) : (
                <div className="mt-auto flex items-center gap-1.5">
                  <ShieldCheck size={11} className="text-brand-eco" />
                  <p className="text-[9px] text-brand-eco/80 uppercase font-bold tracking-wide">On target</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Missing Data Alert */}
        <div className="bg-brand-alert/8 border border-brand-alert/25 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="text-brand-alert shrink-0" size={18} />
          <div>
            <p className="text-[11px] font-bold text-brand-alert uppercase tracking-wide">Missing Data Alert</p>
            <p className="text-[10px] text-white/40 mt-0.5">Breakfast shift log incomplete.</p>
          </div>
        </div>

        {/* ── KPI Report ── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 size={18} className="text-brand-gold/60" />
            <h2 className="text-lg font-geometric font-black text-white">KPI Report</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-[440px] sm:h-[480px] w-full">
              <FoodCostTemplateChart data={weeklyTrends} benchmark={benchmarks.foodCost} />
            </div>
            <div className="h-[440px] sm:h-[480px] w-full">
              <LaborCostTemplateChart data={weeklyTrends} benchmark={benchmarks.laborCost} />
            </div>
            <div className="h-[440px] sm:h-[480px] w-full">
              <ProfitMarginTemplateChart data={weeklyTrends} benchmark={benchmarks.profitMargin} />
            </div>
            <div className="h-[440px] sm:h-[480px] w-full">
              <SalesTemplateChart data={salesChartData} benchmark={16500} />
            </div>
            <div className="h-[440px] sm:h-[480px] w-full">
              <SentimentTemplateChart data={weeklyTrends} benchmark={4.5} />
            </div>
            <div className="h-[440px] sm:h-[480px] w-full">
              <AvgCheckTemplateChart
                data={[
                  { day: 'Sun', restaurant: 45, bar: 32, banquets: 60, rollingAverage: 45.6 },
                  { day: 'Mon', restaurant: 42, bar: 35, banquets: 0, rollingAverage: 44.2 },
                  { day: 'Tue', restaurant: 48, bar: 30, banquets: 55, rollingAverage: 46.5 },
                  { day: 'Wed', restaurant: 50, bar: 38, banquets: 0, rollingAverage: 48.0 },
                  { day: 'Thu', restaurant: 52, bar: 40, banquets: 65, rollingAverage: 49.5 },
                  { day: 'Fri', restaurant: 55, bar: 45, banquets: 70, rollingAverage: 51.0 },
                  { day: 'Sat', restaurant: 60, bar: 50, banquets: 80, rollingAverage: 53.5 }
                ]}
                benchmark={47}
              />
            </div>
          </div>

          {/* KPI Alert */}
          {showKpiAlert && (
            <div className="mt-4">
              <ReportAlertBoxKPI
                title="KPI Deviation: Food Cost"
                issue={`Current Food Cost (${operationalData.foodCost}%) exceeds operational benchmark.`}
                suggestion="Review portion control on protein items and check waste logs."
                type="kpi"
              />
            </div>
          )}
        </div>

        {/* ── Sustainability Report ── */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Leaf size={18} className="text-brand-eco/60" />
            <h2 className="text-lg font-geometric font-black text-white">Sustainability Report</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="h-[440px] sm:h-[480px] w-full">
              <FoodWasteTemplateChart
                data={[
                  { day: 'Sun', waste: 22 },
                  { day: 'Mon', waste: 9 },
                  { day: 'Tue', waste: 13 },
                  { day: 'Wed', waste: 11 },
                  { day: 'Thu', waste: 18 },
                  { day: 'Fri', waste: 12 },
                  { day: 'Sat', waste: 17 }
                ]}
                benchmark={13}
              />
            </div>
            <div className="h-[440px] sm:h-[480px] w-full">
              <WaterUsageTemplateChart
                data={[
                  { day: 'Sun', usage: 28000 },
                  { day: 'Mon', usage: 20000 },
                  { day: 'Tue', usage: 22000 },
                  { day: 'Wed', usage: 24000 },
                  { day: 'Thu', usage: 21000 },
                  { day: 'Fri', usage: 25000 },
                  { day: 'Sat', usage: 31000 }
                ]}
                benchmark={22000}
              />
            </div>
            <div className="h-[440px] sm:h-[480px] w-full">
              <EnergyUsageTemplateChart
                data={[
                  { day: 'Sun', usage: 3500 },
                  { day: 'Mon', usage: 2600 },
                  { day: 'Tue', usage: 3700 },
                  { day: 'Wed', usage: 3000 },
                  { day: 'Thu', usage: 3200 },
                  { day: 'Fri', usage: 3400 },
                  { day: 'Sat', usage: 4100 }
                ]}
                benchmark={3400}
              />
            </div>
            <div className="h-[440px] sm:h-[480px] w-full">
              <Co2EmissionsTemplateChart
                data={[
                  { date: 'Sun', ROYAL: 125, "FISHER'S": 100, "RALPH'S": 150, GUSTO: 125 },
                  { date: 'Mon', ROYAL: 94, "FISHER'S": 94, "RALPH'S": 94, GUSTO: 94 },
                  { date: 'Tue', ROYAL: 100, "FISHER'S": 100, "RALPH'S": 100, GUSTO: 100 },
                  { date: 'Wed', ROYAL: 106, "FISHER'S": 106, "RALPH'S": 106, GUSTO: 106 },
                  { date: 'Thu', ROYAL: 113, "FISHER'S": 113, "RALPH'S": 113, GUSTO: 113 },
                  { date: 'Fri', ROYAL: 138, "FISHER'S": 138, "RALPH'S": 138, GUSTO: 138 },
                  { date: 'Sat', ROYAL: 150, "FISHER'S": 150, "RALPH'S": 150, GUSTO: 150 }
                ]}
                benchmark={1500}
                weeklyTotal={0}
              />
            </div>
          </div>

          {/* Sustainability Alert */}
          {showSustainabilityAlert && (
            <div className="mt-4">
              <ReportAlertBox
                title="Sustainability Alert: Excessive Waste"
                issue={`Daily Organic Waste (${operationalData.waste.kg}kg) exceeds ESG target (${benchmarks.waste}kg).`}
                suggestion="Implement 'Seconds' program for buffet leftovers or audit prep-station trimming."
                type="sustainability"
              />
            </div>
          )}
        </div>

        {/* Metric Analytic Cumulative Cards - Linked with Session Waste, Water, Energy */}
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Energy Card Removed as requested */}
        </div>



        {/* Weekly Performance Cycle — compact action bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0e1f1c] border border-white/8 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Calendar className="text-brand-gold/60 shrink-0" size={18} />
            <div>
              <p className="text-sm font-bold text-white">Weekly Performance Cycle</p>
              <p className="text-[10px] text-white/30 mt-0.5">Cut period: Sun 12:00 AM — Sat 11:59 PM</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleDigitalReport}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-eco text-brand-dark rounded-xl text-[11px] font-bold tracking-wide hover:brightness-110 transition-all"
            >
              <Printer size={14} /> Print Report
            </button>
            <button
              onClick={() => setShowAuditModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 border border-white/15 text-white/60 rounded-xl text-[11px] font-bold tracking-wide hover:border-brand-gold/40 hover:text-brand-gold transition-all"
            >
              <ClipboardList size={14} /> Audit Entries
            </button>
          </div>
        </div>
      </main>

      {/* Audit Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-dark/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="max-w-4xl w-full bg-[#0e1f1c] border border-brand-gold/30 rounded-2xl p-8 shadow-2xl relative">
            <button onClick={() => setShowAuditModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors">
              <XIcon size={20} />
            </button>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-geometric font-black text-white">Daily Data Audit Registry</h3>
            </div>
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-3 text-[10px] font-bold text-brand-gold/60 uppercase tracking-widest">Entry Date/Time</th>
                    <th className="py-3 text-[10px] font-bold text-brand-gold/60 uppercase tracking-widest">Staff</th>
                    <th className="py-3 text-[10px] font-bold text-brand-gold/60 uppercase tracking-widest">Category / Item</th>
                    <th className="py-3 text-[10px] font-bold text-brand-gold/60 uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sessionWasteEntries.length > 0 ? sessionWasteEntries.map((entry, i) => (
                    <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                      <td className="py-3 text-[11px] text-white/40">{entry.timestamp}</td>
                      <td className="py-3 text-[11px] font-bold text-white">{entry.staffName || 'Anonymous'}</td>
                      <td className="py-3 text-[11px] text-white/40">{entry.product}</td>
                      <td className="py-3 text-[10px] uppercase text-right">
                        <span className="text-brand-eco font-bold">Verified</span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="py-16 text-center text-white/20 text-sm">
                        No session data found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <MilaWidget context={{
        operationalData,
        benchmarks,
        weeklyTrends,
        currentShift: 'Lunch', // Mock context
        userName: user.fullName,
        activeAlerts // Pass alert context to Mila
      }} />

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(200, 164, 19, 0.2); border-radius: 10px; }
        
        .animate-in { animation: animate-in 0.5s ease-out forwards; }
        @keyframes animate-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div >
  );
};

export default SupervisorDashboard;