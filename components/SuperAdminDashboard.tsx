import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/useI18n';
import { getPlatformSettings, savePlatformSettings } from '../lib/platformSettings';
import MilaKnowledgeManager from './MilaKnowledgeManager';
import {
  LayoutDashboard, Users, Building2, Database, Activity, ShieldCheck,
  TrendingUp, TrendingDown, Server, Globe, Cpu, AlertTriangle,
  CheckCircle2, DollarSign, Leaf, Zap, Droplets, Cloud,
  RefreshCcw, Search, Eye, EyeOff, Ban, Unlock,
  BarChart3, Settings, Bell, FileText, Mail, Webhook,
  ArrowUpRight, ArrowDownRight, Clock, ChevronRight, UserPlus, Trash2, BookOpen,
  Languages, ExternalLink
} from 'lucide-react';

interface SuperAdminDashboardProps {
  user: UserProfile;
}

interface PlatformStats {
  totalCompanies: number;
  totalOutlets: number;
  totalUsers: number;
  activeUsers: number;
  totalDataPoints: number;
  totalWasteEntries: number;
  totalResourceEntries: number;
  totalCarbonImpact: number;
  totalFinancialLoss: number;
  totalWaterFootprint: number;
}

interface CompanyRow {
  id: string;
  name: string;
  region: string;
  city: string;
  outlets: number;
  users: number;
  status: 'active' | 'suspended' | 'trial';
  created_at: string;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ user }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'users' | 'system'>('overview');

  // Super admin user management
  const [superAdminEmails, setSuperAdminEmails] = useState<string[]>([
    'dhirenkirpalani2308@gmail.com',
  ]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Load super admins from personnel table
  useEffect(() => {
    const loadSuperAdmins = async () => {
      const { data } = await supabase
        .from('personnel')
        .select('email')
        .ilike('role', '%super_admin%');
      if (data && data.length > 0) {
        const emails = data.map((r: any) => r.email?.toLowerCase()).filter(Boolean);
        // Merge with hardcoded primary
        const merged = [...new Set(['dhirenkirpalani2308@gmail.com', ...emails])];
        setSuperAdminEmails(merged);
      }
    };
    loadSuperAdmins();
  }, []);

  // Announcement banner config
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerText, setBannerText] = useState('');
  const [bannerType, setBannerType] = useState<'info' | 'warning' | 'success'>('info');
  const [bannerSaved, setBannerSaved] = useState(false);

  // Weekly chart reset config
  const [weeklyResetDay, setWeeklyResetDay] = useState<number>(6); // 6 = Saturday
  const [weeklyResetSaved, setWeeklyResetSaved] = useState(false);

  const fetchPlatformData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch companies (company_settings table — one row per admin/company)
      const { data: companyData } = await supabase
        .from('company_settings')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch outlets (linked to companies via user_id)
      const { data: outletData } = await supabase
        .from('outlets')
        .select('*');

      // Fetch personnel (users/staff registered per company)
      const { data: personnelData } = await supabase
        .from('personnel')
        .select('*');

      // Fetch waste logs count
      const { count: wasteCount } = await supabase
        .from('food_waste_logs')
        .select('*', { count: 'exact', head: true });

      // Fetch resource logs count
      const { count: resourceCount } = await supabase
        .from('resource_logs')
        .select('*', { count: 'exact', head: true });

      // Fetch waste logs for carbon/financial impact
      const { data: wasteLogs } = await supabase
        .from('food_waste_logs')
        .select('mass_kg, cost_per_kg');

      // Fetch resource logs for water footprint
      const { data: resourceLogs } = await supabase
        .from('resource_logs')
        .select('water_liters, energy_kwh, resource_type, amount');

      const totalOutlets = outletData?.length || 0;
      const totalUsers = (personnelData?.length || 0) + (companyData?.length || 0);
      const totalCompanies = companyData?.length || 0;

      // Calculate ESG impact from actual data
      const carbonImpact = (wasteLogs || []).reduce((sum: number, log: any) =>
        sum + ((log.mass_kg || 0) * 2.5), 0); // ~2.5 kg CO2e per kg waste
      const financialLoss = (wasteLogs || []).reduce((sum: number, log: any) =>
        sum + ((log.mass_kg || 0) * (log.cost_per_kg || 6.5)), 0);
      const waterFootprint = (resourceLogs || []).reduce((sum: number, r: any) => {
        // New schema: water_liters column
        if (r.water_liters) return sum + Number(r.water_liters);
        // Old schema: amount + resource_type
        if (r.resource_type === 'water') return sum + (r.amount || 0);
        return sum;
      }, 0);

      setStats({
        totalCompanies,
        totalOutlets,
        totalUsers,
        activeUsers: totalUsers, // No status column — all are active
        totalDataPoints: (wasteCount || 0) + (resourceCount || 0),
        totalWasteEntries: wasteCount || 0,
        totalResourceEntries: resourceCount || 0,
        totalCarbonImpact: carbonImpact,
        totalFinancialLoss: financialLoss,
        totalWaterFootprint: waterFootprint,
      });

      // Build company rows — match outlets by user_id
      const rows: CompanyRow[] = (companyData || []).map((c: any) => {
        const companyOutlets = outletData?.filter((o: any) => o.user_id === c.user_id) || [];
        const companyPersonnel = personnelData?.filter((p: any) => p.user_id === c.user_id) || [];
        return {
          id: c.id,
          name: c.company_name || c.admin_name || 'Unnamed',
          region: c.region || '—',
          city: c.city_country || c.city || '—',
          outlets: companyOutlets.length,
          users: companyPersonnel.length + 1, // +1 for the admin themselves
          status: 'active' as const,
          created_at: c.created_at || '',
        };
      });

      setCompanies(rows);
    } catch (err) {
      console.error('Failed to fetch platform data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatformData();
  }, [fetchPlatformData]);

  // Load platform settings (weekly reset day + banner config)
  useEffect(() => {
    getPlatformSettings().then(s => {
      setWeeklyResetDay(s.weekly_reset_day);
      setBannerEnabled(s.banner_enabled);
      setBannerText(s.banner_text);
      setBannerType(s.banner_type);
    });
  }, []);

  const handleSuspendCompany = async (companyId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    try {
      await supabase.from('company_settings').update({ status: newStatus }).eq('id', companyId);
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, status: newStatus as any } : c));
    } catch (err) {
      console.error('Failed to update company status:', err);
    }
  };

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const StatCard: React.FC<{
    icon: React.ElementType;
    label: string;
    value: string | number;
    sublabel?: string;
    trend?: 'up' | 'down';
    color?: string;
  }> = ({ icon: Icon, label, value, sublabel, trend, color = 'brand-gold' }) => (
    <div className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 border-${color}/20 bg-[#1c3933] hover:border-${color}/40`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Icon size={16} className={`text-${color}`} />
          <h4 className="text-[11px] font-black uppercase tracking-widest text-brand-gold">{label}</h4>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 ${trend === 'up' ? 'text-brand-eco' : 'text-brand-alert'}`}>
            {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          </div>
        )}
      </div>
      <p className="text-3xl font-geometric font-black text-white leading-none mb-2">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sublabel && <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{sublabel}</p>}
    </div>
  );

  const TabButton: React.FC<{ id: typeof activeTab; label: string; icon: React.ElementType }> = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap border ${
        activeTab === id
          ? 'bg-brand-gold/15 border-brand-gold/40 text-white shadow-[0_2px_12px_rgba(200,164,19,0.15)]'
          : 'border-transparent text-white/50 hover:text-white/80 hover:bg-brand-dark/60'
      }`}
    >
      <Icon size={16} className={activeTab === id ? 'text-brand-gold' : 'text-white/40'} />
      <span className="text-[13px] font-bold tracking-tight">{label}</span>
    </button>
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-brand-alert/10 border border-brand-alert/30 rounded-xl flex items-center justify-center shrink-0">
          <ShieldCheck className="text-brand-alert" size={24} />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
            {t('superAdmin.title')}
          </h1>
          <p className="text-[11px] sm:text-xs text-white/50 font-medium mt-1">
            {t('superAdmin.subtitle')}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 w-full sm:w-fit shrink-0 scrollbar-hide pb-1">
        <TabButton id="overview" label={t('superAdmin.tabOverview')} icon={LayoutDashboard} />
        <TabButton id="companies" label={t('superAdmin.tabCompanies')} icon={Building2} />
        <TabButton id="users" label={t('superAdmin.tabUsers')} icon={Users} />
        <TabButton id="system" label={t('superAdmin.tabSystem')} icon={Server} />
      </div>

      {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-gold"></div>
          </div>
        ) : (
          <>
            {/* ── Overview Tab ── */}
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Platform KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  <StatCard icon={Building2} label={t('superAdmin.kpiTotalCompanies')} value={stats?.totalCompanies || 0} sublabel={t('superAdmin.kpiTotalCompaniesSub')} color="brand-gold" />
                  <StatCard icon={Building2} label={t('superAdmin.kpiTotalOutlets')} value={stats?.totalOutlets || 0} sublabel={t('superAdmin.kpiTotalOutletsSub')} color="brand-gold" />
                  <StatCard icon={Users} label={t('superAdmin.kpiTotalUsers')} value={stats?.totalUsers || 0} sublabel={`${stats?.activeUsers || 0}${t('superAdmin.kpiTotalUsersSub')}`} color="brand-eco" trend="up" />
                  <StatCard icon={Database} label={t('superAdmin.kpiDataPoints')} value={stats?.totalDataPoints || 0} sublabel={t('superAdmin.kpiDataPointsSub')} color="brand-gold" />
                </div>

                {/* ESG Impact Summary */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 border border-brand-eco/50 rounded-xl bg-brand-eco/5 flex items-center justify-center shrink-0">
                      <Leaf size={18} className="text-brand-eco" />
                    </div>
                    <div>
                      <h4 className="text-lg font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                        {t('superAdmin.esgHeading')}
                      </h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold/80">
                        {t('superAdmin.esgSublabel')}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    <StatCard icon={Cloud} label={t('superAdmin.esgCarbon')} value={stats?.totalCarbonImpact.toFixed(1) || '0'} sublabel={t('superAdmin.esgCarbonSub')} color="brand-gold" />
                    <StatCard icon={Droplets} label={t('superAdmin.esgWater')} value={stats?.totalWaterFootprint.toFixed(1) || '0'} sublabel={t('superAdmin.esgWaterSub')} color="brand-gold" />
                    <StatCard icon={DollarSign} label={t('superAdmin.esgFinancial')} value={`$${stats?.totalFinancialLoss.toFixed(2) || '0'}`} sublabel={t('superAdmin.esgFinancialSub')} color="brand-alert" />
                  </div>
                </div>

                {/* Data Breakdown */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 border border-brand-gold/50 rounded-xl bg-brand-gold/5 flex items-center justify-center shrink-0">
                      <BarChart3 size={18} className="text-brand-gold" />
                    </div>
                    <div>
                      <h4 className="text-lg font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                        {t('superAdmin.dataBreakdown')}
                      </h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold/80">
                        {t('superAdmin.dataBreakdownSub')}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <StatCard icon={Leaf} label={t('superAdmin.dataWaste')} value={stats?.totalWasteEntries || 0} sublabel={t('superAdmin.dataWasteSub')} color="brand-eco" />
                    <StatCard icon={Zap} label={t('superAdmin.dataResource')} value={stats?.totalResourceEntries || 0} sublabel={t('superAdmin.dataResourceSub')} color="brand-energy" />
                  </div>
                </div>

                {/* Recent Companies */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 border border-brand-gold/50 rounded-xl bg-brand-gold/5 flex items-center justify-center shrink-0">
                        <Building2 size={18} className="text-brand-gold" />
                      </div>
                      <div>
                        <h4 className="text-lg font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                          {t('superAdmin.recentCompanies')}
                        </h4>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold/80">
                          {t('superAdmin.recentCompaniesSub')}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('companies')} className="flex items-center gap-1 text-[11px] font-bold text-brand-gold hover:text-brand-gold/80 transition-colors">
                      {t('superAdmin.viewAll')} <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCompanies.slice(0, 6).map(c => (
                      <div key={c.id} className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] p-5 hover:border-brand-gold/30 transition-all">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-black text-white uppercase tracking-wider truncate">{c.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            c.status === 'active' ? 'bg-brand-eco/15 text-brand-eco border-brand-eco/30' :
                            c.status === 'suspended' ? 'bg-brand-alert/15 text-brand-alert border-brand-alert/30' :
                            'bg-brand-gold/15 text-brand-gold border-brand-gold/30'
                          }`}>{c.status}</span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-white/50 uppercase tracking-widest">
                          <span className="flex items-center gap-1"><Building2 size={11} /> {c.outlets} outlets</span>
                          <span className="flex items-center gap-1"><Users size={11} /> {c.users} users</span>
                        </div>
                        <p className="text-[10px] text-white/30 mt-2">{c.region} · {c.city}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Companies Tab ── */}
            {activeTab === 'companies' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Search */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-grow max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={t('superAdmin.searchPlaceholder')}
                      className="w-full bg-brand-dark/80 border border-brand-gold/15 rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-brand-gold transition-all"
                    />
                  </div>
                  <button onClick={fetchPlatformData} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-dark/60 border border-brand-gold/20 text-white/60 hover:text-brand-gold hover:border-brand-gold/40 transition-all">
                    <RefreshCcw size={16} /> {t('superAdmin.refresh')}
                  </button>
                </div>

                {/* Companies Table */}
                <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-brand-gold/15">
                          <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-brand-gold">{t('superAdmin.thCompany')}</th>
                          <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-brand-gold">{t('superAdmin.thLocation')}</th>
                          <th className="text-center px-5 py-3 text-[10px] font-black uppercase tracking-widest text-brand-gold">{t('superAdmin.thOutlets')}</th>
                          <th className="text-center px-5 py-3 text-[10px] font-black uppercase tracking-widest text-brand-gold">{t('superAdmin.thUsers')}</th>
                          <th className="text-center px-5 py-3 text-[10px] font-black uppercase tracking-widest text-brand-gold">{t('superAdmin.thStatus')}</th>
                          <th className="text-right px-5 py-3 text-[10px] font-black uppercase tracking-widest text-brand-gold">{t('superAdmin.thActions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCompanies.map(c => (
                          <tr key={c.id} className="border-b border-brand-gold/10 hover:bg-brand-gold/5 transition-colors">
                            <td className="px-5 py-4">
                              <span className="text-sm font-bold text-white">{c.name}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-xs text-white/50">{c.region} · {c.city}</span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="text-sm font-bold text-white">{c.outlets}</span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="text-sm font-bold text-white">{c.users}</span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                c.status === 'active' ? 'bg-brand-eco/15 text-brand-eco border-brand-eco/30' :
                                c.status === 'suspended' ? 'bg-brand-alert/15 text-brand-alert border-brand-alert/30' :
                                'bg-brand-gold/15 text-brand-gold border-brand-gold/30'
                              }`}>{c.status}</span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <button
                                onClick={() => handleSuspendCompany(c.id, c.status)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                  c.status === 'suspended'
                                    ? 'bg-brand-eco/10 border border-brand-eco/30 text-brand-eco hover:bg-brand-eco/20'
                                    : 'bg-brand-alert/10 border border-brand-alert/30 text-brand-alert hover:bg-brand-alert/20'
                                }`}
                              >
                                {c.status === 'suspended' ? <><Unlock size={12} /> {t('superAdmin.activate')}</> : <><Ban size={12} /> {t('superAdmin.suspend')}</>}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredCompanies.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-5 py-16 text-center">
                              <p className="text-sm text-white/30">{t('superAdmin.noCompanies')}</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── Users Tab ── */}
            {activeTab === 'users' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4">
                  <StatCard icon={Users} label={t('superAdmin.usersTotal')} value={stats?.totalUsers || 0} sublabel={t('superAdmin.usersTotalSub')} color="brand-gold" />
                  <StatCard icon={CheckCircle2} label={t('superAdmin.usersActive')} value={stats?.activeUsers || 0} sublabel={t('superAdmin.usersActiveSub')} color="brand-eco" />
                  <StatCard icon={Ban} label={t('superAdmin.usersSuspended')} value={(stats?.totalUsers || 0) - (stats?.activeUsers || 0)} sublabel={t('superAdmin.usersSuspendedSub')} color="brand-alert" />
                </div>
                <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] p-8 text-center">
                  <Users size={32} className="text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-white/40">{t('superAdmin.usersInfo1')}</p>
                  <p className="text-xs text-white/25 mt-1">{t('superAdmin.usersInfo2')}</p>
                </div>
              </div>
            )}

            {/* ── System Tab ── */}
            {activeTab === 'system' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <StatCard icon={Server} label={t('superAdmin.sysSupabase')} value={t('superAdmin.sysSupabaseVal')} sublabel={t('superAdmin.sysSupabaseSub')} color="brand-eco" trend="up" />
                  <StatCard icon={Webhook} label={t('superAdmin.sysWebhooks')} value="0" sublabel={t('superAdmin.sysWebhooksSub')} color="brand-gold" />
                  <StatCard icon={Globe} label={t('superAdmin.sysApiEndpoints')} value="12" sublabel={t('superAdmin.sysApiEndpointsSub')} color="brand-gold" />
                  <StatCard icon={Bell} label={t('superAdmin.sysAlert')} value={t('superAdmin.sysAlertVal')} sublabel={t('superAdmin.sysAlertSub')} color="brand-eco" trend="up" />
                  <StatCard icon={FileText} label={t('superAdmin.sysAudit')} value={t('superAdmin.sysAuditVal')} sublabel={t('superAdmin.sysAuditSub')} color="brand-gold" />
                </div>

                {/* System Controls */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 border border-brand-gold/50 rounded-xl bg-brand-gold/5 flex items-center justify-center shrink-0">
                      <Settings size={18} className="text-brand-gold" />
                    </div>
                    <div>
                      <h4 className="text-lg font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                        {t('superAdmin.sysControls')}
                      </h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold/80">
                        {t('superAdmin.sysControlsSub')}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <button className="flex items-center gap-3 p-5 rounded-2xl border border-brand-gold/20 bg-[#1c3933] hover:border-brand-gold/40 transition-all text-left">
                      <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
                        <RefreshCcw size={18} className="text-brand-gold" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{t('superAdmin.ctrlRefreshData')}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">{t('superAdmin.ctrlRefreshDataSub')}</p>
                      </div>
                    </button>
                    <button className="flex items-center gap-3 p-5 rounded-2xl border border-brand-gold/20 bg-[#1c3933] hover:border-brand-gold/40 transition-all text-left">
                      <div className="w-10 h-10 rounded-xl bg-brand-alert/10 border border-brand-alert/20 flex items-center justify-center shrink-0">
                        <Bell size={18} className="text-brand-alert" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{t('superAdmin.ctrlAlertConfig')}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">{t('superAdmin.ctrlAlertConfigSub')}</p>
                      </div>
                    </button>
                    <button className="flex items-center gap-3 p-5 rounded-2xl border border-brand-gold/20 bg-[#1c3933] hover:border-brand-gold/40 transition-all text-left">
                      <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
                        <FileText size={18} className="text-brand-gold" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{t('superAdmin.ctrlAuditTrail')}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">{t('superAdmin.ctrlAuditTrailSub')}</p>
                      </div>
                    </button>
                    <button className="flex items-center gap-3 p-5 rounded-2xl border border-brand-gold/20 bg-[#1c3933] hover:border-brand-gold/40 transition-all text-left">
                      <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
                        <Mail size={18} className="text-brand-gold" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{t('superAdmin.ctrlEmailTemplates')}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">{t('superAdmin.ctrlEmailTemplatesSub')}</p>
                      </div>
                    </button>
                    <button className="flex items-center gap-3 p-5 rounded-2xl border border-brand-gold/20 bg-[#1c3933] hover:border-brand-gold/40 transition-all text-left">
                      <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
                        <Database size={18} className="text-brand-gold" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{t('superAdmin.ctrlDbHealth')}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">{t('superAdmin.ctrlDbHealthSub')}</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* ── Announcement Banner Config ── */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 border border-brand-gold/50 rounded-xl bg-brand-gold/5 flex items-center justify-center shrink-0">
                      <Bell size={18} className="text-brand-gold" />
                    </div>
                    <div>
                      <h4 className="text-lg font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                        {t('superAdmin.announcementHeading')}
                      </h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold/80">
                        {t('superAdmin.announcementSub')}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] p-5 sm:p-6 space-y-5">
                    {/* Enable / Disable */}
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-white">{t('superAdmin.enableBanner')}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">{t('superAdmin.enableBannerSub')}</p>
                      </div>
                      <button
                        onClick={() => setBannerEnabled(!bannerEnabled)}
                        className={`relative w-12 h-6 rounded-full transition-all duration-300 shrink-0 ${bannerEnabled ? 'bg-brand-eco/40' : 'bg-brand-dark/80 border border-brand-gold/20'}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 ${bannerEnabled ? 'left-6 bg-brand-eco' : 'left-0.5 bg-white/40'}`} />
                      </button>
                    </div>

                    {/* Banner Type */}
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-brand-gold/80 mb-2 block">{t('superAdmin.bannerType')}</label>
                      <div className="flex gap-2">
                        {(['info', 'warning', 'success'] as const).map(bt => (
                          <button
                            key={bt}
                            onClick={() => setBannerType(bt)}
                            className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border ${
                              bannerType === bt
                                ? bt === 'warning' ? 'bg-brand-alert/15 border-brand-alert/40 text-brand-alert'
                                  : bt === 'success' ? 'bg-brand-eco/15 border-brand-eco/40 text-brand-eco'
                                  : 'bg-brand-gold/15 border-brand-gold/40 text-brand-gold'
                                : 'border-brand-gold/15 text-white/40 hover:text-white/70'
                            }`}
                          >
                            {bt === 'info' ? t('superAdmin.bannerTypeInfo') : bt === 'warning' ? t('superAdmin.bannerTypeWarning') : t('superAdmin.bannerTypeSuccess')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Banner Text */}
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-brand-gold/80 mb-2 block">{t('superAdmin.bannerMessage')}</label>
                      <textarea
                        value={bannerText}
                        onChange={e => setBannerText(e.target.value)}
                        placeholder={t('superAdmin.bannerPlaceholder')}
                        rows={3}
                        className="w-full bg-brand-dark/80 border border-brand-gold/15 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-brand-gold transition-all resize-none"
                      />
                    </div>

                    {/* Preview */}
                    {bannerEnabled && bannerText.trim() && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-brand-gold/80 mb-2 block">{t('superAdmin.bannerPreview')}</label>
                        <div className={`rounded-xl px-4 py-3 text-sm font-bold border ${
                          bannerType === 'warning' ? 'bg-brand-alert/10 border-brand-alert/30 text-brand-alert'
                            : bannerType === 'success' ? 'bg-brand-eco/10 border-brand-eco/30 text-brand-eco'
                            : 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold'
                        }`}>
                          {bannerText}
                        </div>
                      </div>
                    )}

                    {/* Save */}
                    <div className="flex justify-end">
                      <button
                        onClick={async () => {
                          const ok = await savePlatformSettings({
                            banner_enabled: bannerEnabled,
                            banner_text: bannerText,
                            banner_type: bannerType,
                          });
                          if (ok) {
                            setBannerSaved(true);
                            setTimeout(() => setBannerSaved(false), 1500);
                          }
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-gold/15 border border-brand-gold/40 text-brand-gold text-sm font-bold hover:bg-brand-gold/25 transition-all"
                      >
                        {bannerSaved ? <CheckCircle2 size={16} /> : <Bell size={16} />}
                        {bannerSaved ? t('superAdmin.bannerSaved') : t('superAdmin.bannerSave')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Weekly Chart Reset Config ── */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 border border-brand-gold/50 rounded-xl bg-brand-gold/5 flex items-center justify-center shrink-0">
                      <Clock size={18} className="text-brand-gold" />
                    </div>
                    <div>
                      <h4 className="text-lg font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                        {t('superAdmin.weeklyResetHeading')}
                      </h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold/80">
                        {t('superAdmin.weeklyResetSub')}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] p-5 sm:p-6 space-y-5">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-brand-gold/60 mb-2">
                        {t('superAdmin.weeklyResetDayLabel')}
                      </label>
                      <div className="grid grid-cols-7 gap-1.5">
                        {[
                          { day: 0, label: 'Sun' },
                          { day: 1, label: 'Mon' },
                          { day: 2, label: 'Tue' },
                          { day: 3, label: 'Wed' },
                          { day: 4, label: 'Thu' },
                          { day: 5, label: 'Fri' },
                          { day: 6, label: 'Sat' },
                        ].map(({ day, label }) => (
                          <button
                            key={day}
                            onClick={() => setWeeklyResetDay(day)}
                            className={`py-2.5 rounded-lg text-xs font-bold transition-all ${
                              weeklyResetDay === day
                                ? 'bg-brand-gold text-brand-dark shadow-sm'
                                : 'bg-brand-dark/40 text-white/50 border border-brand-gold/10 hover:text-white/80'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-white/40 mt-3 leading-relaxed">
                        {t('superAdmin.weeklyResetHint')}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={async () => {
                          const ok = await savePlatformSettings({ weekly_reset_day: weeklyResetDay });
                          if (ok) {
                            setWeeklyResetSaved(true);
                            setTimeout(() => setWeeklyResetSaved(false), 1500);
                          }
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-gold/15 border border-brand-gold/40 text-brand-gold text-sm font-bold hover:bg-brand-gold/25 transition-all"
                      >
                        {weeklyResetSaved ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                        {weeklyResetSaved ? t('superAdmin.weeklyResetSaved') : t('superAdmin.weeklyResetSave')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Mila Knowledge Base ── */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 border border-brand-gold/50 rounded-xl bg-brand-gold/5 flex items-center justify-center shrink-0">
                      <BookOpen size={18} className="text-brand-gold" />
                    </div>
                    <div>
                      <h4 className="text-lg font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                        {t('superAdmin.milaHeading')}
                      </h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold/80">
                        {t('superAdmin.milaSub')}
                      </p>
                    </div>
                  </div>
                  <MilaKnowledgeManager />
                </div>

                {/* ── Translation Manager ── */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 border border-brand-eco/50 rounded-xl bg-brand-eco/5 flex items-center justify-center shrink-0">
                      <Languages size={18} className="text-brand-eco" />
                    </div>
                    <div>
                      <h4 className="text-lg font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                        {t('superAdmin.transHeading')}
                      </h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-eco/80">
                        {t('superAdmin.transSub')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/translations')}
                    className="flex items-center gap-3 p-5 rounded-2xl border border-brand-eco/20 bg-brand-eco/5 hover:border-brand-eco/40 hover:bg-brand-eco/10 transition-all text-left w-full sm:w-fit"
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-eco/10 border border-brand-eco/20 flex items-center justify-center shrink-0">
                      <Languages size={18} className="text-brand-eco" />
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm font-bold text-white">{t('superAdmin.transButton')}</p>
                    </div>
                    <ExternalLink size={16} className="text-brand-eco/60 shrink-0" />
                  </button>
                </div>

                {/* ── Super Admin User Management ── */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 border border-brand-alert/50 rounded-xl bg-brand-alert/5 flex items-center justify-center shrink-0">
                      <ShieldCheck size={18} className="text-brand-alert" />
                    </div>
                    <div>
                      <h4 className="text-lg font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                        {t('superAdmin.saHeading')}
                      </h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-alert/80">
                        {t('superAdmin.saSub')}
                      </p>
                    </div>
                  </div>

                  {/* Add super admin */}
                  <div className="rounded-2xl border border-brand-alert/20 bg-brand-alert/5 p-5 sm:p-6 mb-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="email"
                        value={newAdminEmail}
                        onChange={e => setNewAdminEmail(e.target.value)}
                        placeholder={t('superAdmin.saPlaceholder')}
                        className="flex-grow bg-brand-dark/80 border border-brand-gold/15 rounded-xl py-3.5 px-4 text-sm text-white outline-none focus:border-brand-gold transition-all"
                      />
                      <button
                        onClick={async () => {
                          const email = newAdminEmail.trim().toLowerCase();
                          if (!email || !email.includes('@')) return;
                          if (superAdminEmails.includes(email)) return;
                          setAdminError('');

                          // 1. Check if user exists in personnel table
                          const { data: existingUser, error: lookupError } = await supabase
                            .from('personnel')
                            .select('id, email, role')
                            .ilike('email', email)
                            .maybeSingle();

                          if (lookupError) {
                            setAdminError(`Database error: ${lookupError.message}`);
                            return;
                          }

                          if (!existingUser) {
                            setAdminError(`User "${email}" is not registered. Enroll them as personnel first in the Team tab before granting super admin access.`);
                            return;
                          }

                          // 2. Update personnel table role to super_admin
                          const { error: personnelError } = await supabase
                            .from('personnel')
                            .update({ role: 'super_admin' })
                            .eq('id', existingUser.id);

                          if (personnelError) {
                            setAdminError(`Failed to update role: ${personnelError.message}`);
                            return;
                          }

                          setSuperAdminEmails(prev => [...prev, email]);
                          setNewAdminEmail('');
                          setAddingAdmin(true);
                          setTimeout(() => setAddingAdmin(false), 1500);
                        }}
                        disabled={!newAdminEmail.trim() || !newAdminEmail.includes('@')}
                        className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-alert/15 border border-brand-alert/40 text-brand-alert text-sm font-bold hover:bg-brand-alert/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {addingAdmin ? <CheckCircle2 size={16} /> : <UserPlus size={16} />}
                        {addingAdmin ? t('superAdmin.addedSuperAdmin') : t('superAdmin.addSuperAdmin')}
                      </button>
                    </div>
                    {adminError && (
                      <p className="text-[10px] text-brand-alert mt-3">{adminError}</p>
                    )}
                    <p className="text-[10px] text-white/30 mt-3">
                      Updates the user's role to super_admin in the personnel table. The user will have super admin access on next login.
                    </p>
                  </div>

                  {/* Super admin list */}
                  <div className="space-y-3">
                    {superAdminEmails.map((email, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-brand-gold/20 bg-[#1c3933] hover:border-brand-gold/30 transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-brand-alert/10 border border-brand-alert/30 flex items-center justify-center shrink-0">
                            <ShieldCheck size={16} className="text-brand-alert" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{email}</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider">
                              {email === user.email?.toLowerCase() ? t('superAdmin.currentSession') : t('superAdmin.saRole')}
                            </p>
                          </div>
                        </div>
                        {email !== 'dhirenkirpalani2308@gmail.com' && (
                          <button
                            onClick={async () => {
                              // Revert role to admin in personnel table
                              await supabase
                                .from('personnel')
                                .update({ role: 'admin' })
                                .ilike('email', email);
                              setSuperAdminEmails(prev => prev.filter(e => e !== email));
                            }}
                            className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-dark/60 border border-brand-gold/20 text-white/40 hover:text-brand-alert hover:border-brand-alert/30 transition-colors shrink-0"
                            title={t('superAdmin.removeSuperAdmin')}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        {email === 'dhirenkirpalani2308@gmail.com' && (
                          <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-brand-eco/15 text-brand-eco border border-brand-eco/30 shrink-0">
                            {t('superAdmin.primaryBadge')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
    </div>
  );
};

export default SuperAdminDashboard;
