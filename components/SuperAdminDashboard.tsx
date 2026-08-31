import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/useI18n';
import { createPortal } from 'react-dom';
import { getPlatformSettings, savePlatformSettings } from '../lib/platformSettings';
import MilaKnowledgeManager from './MilaKnowledgeManager';
import {
  LayoutDashboard, Users, Building2, Database, Activity, ShieldCheck,
  TrendingUp, TrendingDown, Server, Globe, Cpu, AlertTriangle,
  CheckCircle2, DollarSign, Leaf, Zap, Droplets, Cloud,
  RefreshCcw, Search, Eye, EyeOff, Ban, Unlock,
  BarChart3, Settings, Bell, FileText, Mail, Webhook,
  ArrowUpRight, ArrowDownRight, Clock, ChevronRight, UserPlus, Trash2, BookOpen,
  Languages, ExternalLink, PieChart, Target, Rocket, Percent, Award, Gauge
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

interface PlatformUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  position: string;
  outlet_name: string;
  company_name: string;
  created_at: string;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ user }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'users' | 'system'>('overview');

  // Super admin user management
  const [superAdminEmails, setSuperAdminEmails] = useState<string[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminError, setAdminError] = useState('');

  // Delete user confirmation
  const [userToDelete, setUserToDelete] = useState<PlatformUser | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      // Delete from profiles
      await supabase.from('profiles').delete().eq('id', userToDelete.id);
      // Delete from personnel
      await supabase.from('personnel').delete().eq('user_id', userToDelete.id);
      // Delete from auth.users (via RPC if available, otherwise just remove from tables)
      try {
        await supabase.rpc('delete_user_account', { user_id: userToDelete.id });
      } catch (e) {
        console.warn('Auth user deletion RPC not available:', e);
      }
      // Remove from local state
      setPlatformUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
    } finally {
      setDeletingUser(false);
    }
  };

  // Load super admins from personnel table
  useEffect(() => {
    const loadSuperAdmins = async () => {
      const { data } = await supabase
        .from('personnel')
        .select('email')
        .ilike('role', '%super_admin%');
      if (data && data.length > 0) {
        const emails = data.map((r: any) => r.email?.toLowerCase()).filter(Boolean);
        setSuperAdminEmails(emails);
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
      const companyRes = await supabase
        .from('company_settings')
        .select('*');
      const companyData = companyRes.data;
      if (companyRes.error) console.error('company_settings query error:', companyRes.error);

      // Fetch outlets (linked to companies via user_id)
      const outletRes = await supabase
        .from('outlets')
        .select('*');
      const outletData = outletRes.data;
      if (outletRes.error) console.error('outlets query error:', outletRes.error);

      // Fetch personnel (staff invited by admins)
      const personnelRes = await supabase
        .from('personnel')
        .select('*');
      const personnelData = personnelRes.data;
      if (personnelRes.error) console.error('personnel query error:', personnelRes.error);

      // Fetch profiles (all registered users on the platform)
      // Try with updated_at first, fall back to without it
      let profilesData: any[] | null = null;
      const profilesRes = await supabase
        .from('profiles')
        .select('id, email, role, full_name, created_at, updated_at');
      if (profilesRes.error) {
        console.warn('profiles query with updated_at failed, retrying without:', profilesRes.error);
        const profilesFallback = await supabase
          .from('profiles')
          .select('id, email, role, full_name, created_at');
        profilesData = profilesFallback.data;
        if (profilesFallback.error) console.error('profiles fallback query error:', profilesFallback.error);
      } else {
        profilesData = profilesRes.data;
      }

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
      // Count ALL unique users: profiles + personnel (matching the table logic)
      const profileIds = new Set((profilesData || []).map((p: any) => p.id));
      // Personnel: use user_id if available, otherwise use id
      const personnelIds = new Set(
        (personnelData || []).map((p: any) => (p.user_id || p.id)).filter(Boolean)
      );
      // Merge: anyone in profiles OR personnel
      const allUserIds = new Set([...profileIds, ...personnelIds]);
      const totalUsers = allUserIds.size;
      // Count companies: company_settings rows + admins in profiles without company_settings
      const companySettingUserIds = new Set((companyData || []).map((c: any) => c.user_id));
      const adminProfileCount = (profilesData || []).filter((p: any) => {
        const rl = (p.role || '').toLowerCase();
        return (rl === 'admin' || rl === 'super_admin') && !companySettingUserIds.has(p.id);
      }).length;
      const totalCompanies = (companyData?.length || 0) + adminProfileCount;

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

      // Build company rows — from company_settings, plus fallback from profiles (admins without company_settings)
      const rows: CompanyRow[] = [];

      // Build a lookup map: user_id → company_settings (for fallback companies)
      const companySettingsByUserId = new Map<string, any>();
      (companyData || []).forEach((c: any) => {
        if (c.user_id) companySettingsByUserId.set(c.user_id, c);
      });

      // First: companies with company_settings rows
      (companyData || []).forEach((c: any) => {
        const companyOutlets = outletData?.filter((o: any) => o.user_id === c.user_id) || [];
        const companyPersonnel = personnelData?.filter((p: any) => p.user_id === c.user_id) || [];
        rows.push({
          id: c.id,
          name: c.company_name || c.admin_name || 'Unnamed',
          region: c.region || '—',
          city: c.city_country || c.city || '—',
          outlets: companyOutlets.length,
          users: companyPersonnel.length + 1,
          status: 'active' as const,
          created_at: c.updated_at || c.created_at || '',
        });
      });

      // Fallback: admins/super_admins in profiles that don't have company_settings yet
      const companyUserIds = new Set((companyData || []).map((c: any) => c.user_id));
      (profilesData || []).forEach((p: any) => {
        const rl = (p.role || '').toLowerCase();
        if ((rl === 'admin' || rl === 'super_admin') && !companyUserIds.has(p.id)) {
          const adminOutlets = outletData?.filter((o: any) => o.user_id === p.id) || [];
          const adminPersonnel = personnelData?.filter((per: any) => per.user_id === p.id) || [];
          // Try to find company_settings by matching personnel email to admin email
          const adminEmail = p.email?.toLowerCase();
          const matchingSettings = (companyData || []).find((c: any) => {
            const personnel = (personnelData || []).find((per: any) => per.user_id === c.user_id && per.email?.toLowerCase() === adminEmail);
            return personnel || c.user_id === p.id;
          });
          // Derive location from company_settings (if found) or outlets
          const region = matchingSettings?.region || '—';
          const city = matchingSettings?.city_country || matchingSettings?.city || adminOutlets.map((o: any) => o.location).filter(Boolean)[0] || '—';
          rows.push({
            id: p.id,
            name: p.full_name ? `${p.full_name}'s Company` : 'Unnamed',
            region,
            city,
            outlets: adminOutlets.length,
            users: adminPersonnel.length + 1,
            status: 'active' as const,
            created_at: p.updated_at || p.created_at || '',
          });
        }
      });

      // Sort all companies by created_at descending (newest first)
      rows.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      setCompanies(rows);

      // Build platform-wide user list from profiles + personnel
      const outletMap = new Map<string, string>();
      (outletData || []).forEach((o: any) => {
        if (o.id && o.outlet_name) outletMap.set(o.id, o.outlet_name);
      });
      const companyMap = new Map<string, string>();
      (companyData || []).forEach((c: any) => {
        if (c.user_id) companyMap.set(c.user_id, c.company_name || 'Unnamed');
      });

      const users: PlatformUser[] = [];
      const seenIds = new Set<string>();

      // From profiles (registered auth users)
      (profilesData || []).forEach((p: any) => {
        if (seenIds.has(p.id)) return;
        seenIds.add(p.id);
        const userOutlets = (outletData || []).filter((o: any) => o.user_id === p.id);
        users.push({
          id: p.id,
          full_name: p.full_name || '—',
          email: p.email || '—',
          role: p.role || 'admin',
          position: p.position || '—',
          outlet_name: userOutlets.map((o: any) => o.outlet_name).join(', ') || '—',
          company_name: companyMap.get(p.id) || (p.full_name ? `${p.full_name}'s Company` : '—'),
          created_at: p.updated_at || p.created_at || '',
        });
      });

      // From personnel (invited staff, may not be in profiles yet)
      (personnelData || []).forEach((p: any) => {
        const uid = p.user_id || p.id;
        if (seenIds.has(uid)) return;
        seenIds.add(uid);
        const outletName = p.outlet_id ? (outletMap.get(p.outlet_id) || '—') : '—';
        const adminCompany = companyData?.find((c: any) => c.user_id === p.user_id);
        users.push({
          id: uid,
          full_name: p.full_name || '—',
          email: p.email || '—',
          role: p.role || '—',
          position: p.position || '—',
          outlet_name: outletName,
          company_name: adminCompany?.company_name || '—',
          created_at: p.updated_at || p.created_at || '',
        });
      });

      // Sort users by created_at descending (newest first)
      users.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      setPlatformUsers(users);
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
      // Try company_settings first
      const { error: csError } = await supabase.from('company_settings').update({ status: newStatus }).eq('id', companyId);
      // If no row was updated (company derived from profiles), update profiles
      if (csError || true) {
        await supabase.from('profiles').update({ status: newStatus }).eq('id', companyId);
      }
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, status: newStatus as any } : c));
    } catch (err) {
      console.error('Failed to update company status:', err);
    }
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.city.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.ceil(filteredCompanies.length / ITEMS_PER_PAGE);
  const paginatedCompanies = filteredCompanies.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset to page 1 when search changes
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

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
                {/* Market Penetration */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 border border-brand-gold/50 rounded-xl bg-brand-gold/5 flex items-center justify-center shrink-0">
                      <Building2 size={18} className="text-brand-gold" />
                    </div>
                    <div>
                      <h4 className="text-lg font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                        Market Penetration
                      </h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold/80">
                        Tenant Acquisition & Footprint
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <StatCard icon={Building2} label="Companies Onboarded" value={stats?.totalCompanies || 0} sublabel="Active tenants" color="brand-gold" trend="up" />
                    <StatCard icon={Building2} label="Outlets Deployed" value={stats?.totalOutlets || 0} sublabel="Locations live" color="brand-gold" />
                    <StatCard icon={Users} label="Users Acquired" value={stats?.totalUsers || 0} sublabel={`${stats?.activeUsers || 0} active`} color="brand-eco" trend="up" />
                    <StatCard icon={Database} label="Data Captured" value={stats?.totalDataPoints || 0} sublabel="Total entries logged" color="brand-gold" trend="up" />
                  </div>
                </div>

                {/* Revenue Risk & ESG Liability */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 border border-brand-alert/50 rounded-xl bg-brand-alert/5 flex items-center justify-center shrink-0">
                      <DollarSign size={18} className="text-brand-alert" />
                    </div>
                    <div>
                      <h4 className="text-lg font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                        Revenue Risk & ESG Liability
                      </h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-alert/80">
                        Financial Exposure Across Portfolio
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    <StatCard icon={Cloud} label="Carbon Liability" value={stats?.totalCarbonImpact.toFixed(1) || '0'} sublabel="kg CO₂e — exposure" color="brand-gold" />
                    <StatCard icon={Droplets} label="Water Risk" value={stats?.totalWaterFootprint.toFixed(1) || '0'} sublabel="Liters — portfolio wide" color="brand-gold" />
                    <StatCard icon={DollarSign} label="Financial Loss" value={`$${stats?.totalFinancialLoss.toFixed(2) || '0'}`} sublabel="Tracked waste value" color="brand-alert" />
                  </div>
                </div>

                {/* Operational Throughput */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 border border-brand-eco/50 rounded-xl bg-brand-eco/5 flex items-center justify-center shrink-0">
                      <BarChart3 size={18} className="text-brand-eco" />
                    </div>
                    <div>
                      <h4 className="text-lg font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                        Operational Throughput
                      </h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-eco/80">
                        Data Pipeline Volume
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <StatCard icon={Leaf} label="Waste Logs" value={stats?.totalWasteEntries || 0} sublabel="Food waste entries" color="brand-eco" />
                    <StatCard icon={Zap} label="Resource Logs" value={stats?.totalResourceEntries || 0} sublabel="Energy + water entries" color="brand-energy" />
                  </div>
                </div>

                {/* Investor Metrics */}
                {(() => {
                  const totalCompanies = stats?.totalCompanies || 0;
                  const totalOutlets = stats?.totalOutlets || 0;
                  const totalUsers = stats?.totalUsers || 0;
                  const activeUsers = stats?.activeUsers || 0;
                  const dataPoints = stats?.totalDataPoints || 0;
                  const wasteEntries = stats?.totalWasteEntries || 0;
                  const resourceEntries = stats?.totalResourceEntries || 0;
                  const carbonImpact = stats?.totalCarbonImpact || 0;
                  const financialLoss = stats?.totalFinancialLoss || 0;
                  const waterFootprint = stats?.totalWaterFootprint || 0;

                  // Derived investor metrics
                  const avgUsersPerCompany = totalCompanies > 0 ? (totalUsers / totalCompanies).toFixed(1) : '0';
                  const avgOutletsPerCompany = totalCompanies > 0 ? (totalOutlets / totalCompanies).toFixed(1) : '0';
                  const engagementRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0;
                  const avgDataPerCompany = totalCompanies > 0 ? Math.round(dataPoints / totalCompanies) : 0;
                  const avgCarbonPerOutlet = totalOutlets > 0 ? (carbonImpact / totalOutlets).toFixed(1) : '0';
                  const avgFinancialPerOutlet = totalOutlets > 0 ? `$${(financialLoss / totalOutlets).toFixed(2)}` : '$0';
                  const wasteToResourceRatio = resourceEntries > 0 ? `${wasteEntries}:${resourceEntries}` : '—';
                  const waterPerUser = totalUsers > 0 ? Math.round(waterFootprint / totalUsers).toLocaleString() : '0';
                  const carbonPerUser = totalUsers > 0 ? (carbonImpact / totalUsers).toFixed(1) : '0';
                  const dataPerUser = totalUsers > 0 ? (dataPoints / totalUsers).toFixed(1) : '0';
                  const financialPerUser = totalUsers > 0 ? `$${(financialLoss / totalUsers).toFixed(2)}` : '$0';
                  const esgScore = totalUsers > 0 ? Math.min(100, Math.round((dataPoints / totalUsers) * 10)) : 0;

                  return (
                    <div>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 border border-brand-gold/50 rounded-xl bg-brand-gold/5 flex items-center justify-center shrink-0">
                          <PieChart size={18} className="text-brand-gold" />
                        </div>
                        <div>
                          <h4 className="text-lg font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                            Unit Economics
                          </h4>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold/80">
                            Per-Tenant & Per-Seat Margins
                          </p>
                        </div>
                      </div>

                      {/* Row 1: Density & Expansion */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
                        <StatCard icon={Users} label="Seats/Tenant" value={avgUsersPerCompany} sublabel="User density" color="brand-eco" />
                        <StatCard icon={Building2} label="Locations/Tenant" value={avgOutletsPerCompany} sublabel="Expansion ratio" color="brand-eco" />
                        <StatCard icon={Percent} label="Seat Utilization" value={`${engagementRate}%`} sublabel="Active / total seats" color="brand-gold" trend={engagementRate > 50 ? 'up' : 'down'} />
                        <StatCard icon={Database} label="Data/Tenant" value={avgDataPerCompany} sublabel="Records per company" color="brand-gold" />
                      </div>

                      {/* Row 2: Cost Per Unit */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
                        <StatCard icon={Cloud} label="Carbon/Location" value={avgCarbonPerOutlet} sublabel="kg CO₂e per outlet" color="brand-gold" />
                        <StatCard icon={DollarSign} label="Loss/Location" value={avgFinancialPerOutlet} sublabel="$ waste per outlet" color="brand-alert" />
                        <StatCard icon={Cloud} label="Carbon/Seat" value={carbonPerUser} sublabel="kg CO₂e per user" color="brand-gold" />
                        <StatCard icon={Droplets} label="Water/Seat" value={waterPerUser} sublabel="Liters per user" color="brand-gold" />
                      </div>

                      {/* Row 3: Business Health */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        <StatCard icon={Gauge} label="Sustainability Index" value={esgScore} sublabel="ESG health score" color={esgScore > 50 ? 'brand-eco' : 'brand-alert'} trend={esgScore > 50 ? 'up' : 'down'} />
                        <StatCard icon={Target} label="Data/Seat" value={dataPerUser} sublabel="Records per user" color="brand-gold" />
                        <StatCard icon={DollarSign} label="Loss/Seat" value={financialPerUser} sublabel="$ waste per user" color="brand-alert" />
                        <StatCard icon={Activity} label="Waste:Resource" value={wasteToResourceRatio} sublabel="Entry mix ratio" color="brand-eco" />
                      </div>

                      {/* Executive Summary */}
                      <div className="mt-6 rounded-2xl border border-brand-gold/20 bg-gradient-to-r from-brand-gold/5 to-brand-eco/5 p-5 sm:p-6">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center shrink-0">
                            <Award size={18} className="text-brand-gold" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-white mb-1">Executive Summary</p>
                            <p className="text-xs text-white/50 leading-relaxed">
                              {totalCompanies} tenants operating {totalOutlets} locations with {totalUsers} seats generating {dataPoints} data records.
                              Portfolio exposure: {carbonImpact.toFixed(1)} kg CO₂e, {waterFootprint.toLocaleString()} L water, ${financialLoss.toFixed(2)} in tracked waste value.
                              {engagementRate >= 80 ? ' Seat utilization is excellent.' : engagementRate >= 50 ? ' Seat utilization is healthy.' : ' Seat utilization requires attention.'}
                              {esgScore >= 70 ? ' Strong sustainability performance.' : esgScore >= 40 ? ' Moderate sustainability performance.' : ' Sustainability performance needs improvement.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
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
                          <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-brand-gold">Created</th>
                          <th className="text-center px-5 py-3 text-[10px] font-black uppercase tracking-widest text-brand-gold">{t('superAdmin.thStatus')}</th>
                          <th className="text-right px-5 py-3 text-[10px] font-black uppercase tracking-widest text-brand-gold">{t('superAdmin.thActions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedCompanies.map(c => (
                          <tr key={c.id} className="border-b border-brand-gold/10 hover:bg-brand-gold/5 transition-colors">
                            <td className="px-5 py-4">
                              <span className="text-sm font-bold text-white">{c.name}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-xs text-white/50">{[c.region, c.city].filter(v => v && v !== '—').join(' · ') || '—'}</span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="text-sm font-bold text-white">{c.outlets}</span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="text-sm font-bold text-white">{c.users}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-xs text-white/50">
                                {c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                              </span>
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
                            <td colSpan={7} className="px-5 py-16 text-center">
                              <p className="text-sm text-white/30">{t('superAdmin.noCompanies')}</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-brand-gold/10">
                      <p className="text-[10px] text-white/40 uppercase tracking-widest">
                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredCompanies.length)} of {filteredCompanies.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-brand-gold/20 text-white/60 hover:border-brand-gold/40 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Prev
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${
                              currentPage === page
                                ? 'bg-brand-gold text-brand-dark'
                                : 'border border-brand-gold/20 text-white/50 hover:border-brand-gold/40 hover:text-white'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-brand-gold/20 text-white/60 hover:border-brand-gold/40 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
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

                {/* Search */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="relative flex-grow">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search by name, email, role, or outlet..."
                      className="w-full bg-brand-dark/80 border border-brand-gold/15 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white outline-none focus:border-brand-gold transition-all"
                    />
                  </div>
                </div>

                {/* User table */}
                <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-brand-gold/15">
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-brand-gold/70">User</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-brand-gold/70">Email</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-brand-gold/70">Role</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-brand-gold/70">Outlet</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-brand-gold/70">Company</th>
                          <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-brand-gold/70">Created</th>
                          <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-brand-gold/70">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {platformUsers
                          .filter(u => {
                            if (!searchQuery) return true;
                            const q = searchQuery.toLowerCase();
                            return u.full_name.toLowerCase().includes(q) ||
                                   u.email.toLowerCase().includes(q) ||
                                   u.role.toLowerCase().includes(q) ||
                                   u.outlet_name.toLowerCase().includes(q) ||
                                   u.company_name.toLowerCase().includes(q);
                          })
                          .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                          .map(u => {
                            const initials = u.full_name !== '—'
                              ? u.full_name.split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                              : '?';
                            const rl = (u.role || '').toLowerCase();
                            const roleColor = rl === 'super_admin' ? 'text-brand-gold' : rl === 'admin' ? 'text-brand-eco' : rl === 'supervisor' ? 'text-[#3b82f6]' : 'text-white/50';
                            return (
                              <tr key={u.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-gold/25 to-brand-gold/5 border border-brand-gold/30 flex items-center justify-center shrink-0">
                                      <span className="text-brand-gold text-[10px] font-black">{initials}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-white">{u.full_name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-white/60">{u.email}</td>
                                <td className="px-4 py-3">
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${roleColor}`}>
                                    {u.role.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-white/50">{u.outlet_name}</td>
                                <td className="px-4 py-3 text-sm text-white/50">{u.company_name}</td>
                                <td className="px-4 py-3">
                                  <span className="text-xs text-white/40">
                                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {u.id !== user.id && (
                                    <button
                                      onClick={() => setUserToDelete(u)}
                                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-alert/10 border border-brand-alert/30 hover:bg-brand-alert/20 hover:border-brand-alert/50 transition-all"
                                      title="Remove user"
                                    >
                                      <Trash2 size={13} className="text-brand-alert" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        {platformUsers.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-sm text-white/30">No users found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {(() => {
                    const filteredUsers = platformUsers.filter(u => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return u.full_name.toLowerCase().includes(q) ||
                             u.email.toLowerCase().includes(q) ||
                             u.role.toLowerCase().includes(q) ||
                             u.outlet_name.toLowerCase().includes(q) ||
                             u.company_name.toLowerCase().includes(q);
                    });
                    const userTotalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
                    if (userTotalPages <= 1) return null;
                    return (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-brand-gold/10">
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">
                          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-brand-gold/20 text-white/60 hover:border-brand-gold/40 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            Prev
                          </button>
                          {Array.from({ length: userTotalPages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${
                                currentPage === page
                                  ? 'bg-brand-gold text-brand-dark'
                                  : 'border border-brand-gold/20 text-white/50 hover:border-brand-gold/40 hover:text-white'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            onClick={() => setCurrentPage(p => Math.min(userTotalPages, p + 1))}
                            disabled={currentPage === userTotalPages}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-brand-gold/20 text-white/60 hover:border-brand-gold/40 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    );
                  })()}
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
                        {email !== user.email?.toLowerCase() && (
                          <button
                            onClick={async () => {
                              // Revert role to admin in personnel table
                              await supabase
                                .from('personnel')
                                .update({ role: 'admin' })
                                .ilike('email', email);
                              setSuperAdminEmails(prev => prev.filter(e => e !== email));
                            }}
                            className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-alert/10 border border-brand-alert/30 hover:bg-brand-alert/20 hover:border-brand-alert/50 transition-all shrink-0"
                            title={t('superAdmin.removeSuperAdmin')}
                          >
                            <Trash2 size={16} className="text-brand-alert" />
                          </button>
                        )}
                        {email === user.email?.toLowerCase() && (
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

        {/* Delete user confirmation modal */}
        {userToDelete && createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-[#1c3933] border border-brand-alert/30 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-brand-alert/15 border border-brand-alert/30 flex items-center justify-center">
                <Trash2 size={24} className="text-brand-alert" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">Remove User</h3>
              <p className="text-sm text-white/60 mb-1">Are you sure you want to remove</p>
              <p className="text-sm font-bold text-white mb-1">{userToDelete.full_name}</p>
              <p className="text-xs text-white/40 mb-6">{userToDelete.email}</p>
              <p className="text-[11px] text-white/30 mb-6">This will delete the user from profiles, personnel, and auth. This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteUser}
                  disabled={deletingUser}
                  className="flex-1 py-3 rounded-xl bg-brand-alert text-white font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                >
                  {deletingUser ? 'Removing...' : 'Remove User'}
                </button>
                <button
                  onClick={() => setUserToDelete(null)}
                  disabled={deletingUser}
                  className="flex-1 py-3 rounded-xl border border-white/15 text-white/50 font-black text-xs uppercase tracking-widest hover:border-white/30 hover:text-white/70 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default SuperAdminDashboard;
