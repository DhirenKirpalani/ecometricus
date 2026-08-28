import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard, Users, Building2, Database, Activity, ShieldCheck,
  TrendingUp, TrendingDown, Server, Globe, Cpu, AlertTriangle,
  CheckCircle2, DollarSign, Leaf, Zap, Droplets, Cloud,
  RefreshCcw, Search, Eye, EyeOff, Ban, Unlock,
  BarChart3, Settings, Bell, FileText, Mail, Webhook,
  ArrowUpRight, ArrowDownRight, Clock, ChevronRight
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
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'users' | 'system'>('overview');

  const fetchPlatformData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch companies
      const { data: companyData } = await supabase
        .from('company_settings')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch outlets
      const { data: outletData } = await supabase
        .from('outlets')
        .select('*');

      // Fetch users
      const { data: userData } = await supabase
        .from('users')
        .select('*');

      // Fetch waste logs count
      const { count: wasteCount } = await supabase
        .from('food_waste_logs')
        .select('*', { count: 'exact', head: true });

      // Fetch resource logs count
      const { count: resourceCount } = await supabase
        .from('resource_logs')
        .select('*', { count: 'exact', head: true });

      const totalOutlets = outletData?.length || 0;
      const totalUsers = userData?.length || 0;
      const totalCompanies = companyData?.length || 0;

      setStats({
        totalCompanies,
        totalOutlets,
        totalUsers,
        activeUsers: userData?.filter((u: any) => u.status !== 'suspended')?.length || 0,
        totalDataPoints: (wasteCount || 0) + (resourceCount || 0),
        totalWasteEntries: wasteCount || 0,
        totalResourceEntries: resourceCount || 0,
        totalCarbonImpact: 0,
        totalFinancialLoss: 0,
        totalWaterFootprint: 0,
      });

      // Build company rows
      const rows: CompanyRow[] = (companyData || []).map((c: any) => ({
        id: c.id,
        name: c.name || 'Unnamed',
        region: c.region || '—',
        city: c.city || '—',
        outlets: outletData?.filter((o: any) => o.company_id === c.id)?.length || 0,
        users: userData?.filter((u: any) => u.company_id === c.id)?.length || 0,
        status: c.status || 'active',
        created_at: c.created_at || '',
      }));

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
            Platform Control Center
          </h1>
          <p className="text-[11px] sm:text-xs text-white/50 font-medium mt-1">
            Global oversight of all companies, outlets, users, and data across the Ecometricus platform.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 w-full sm:w-fit shrink-0 scrollbar-hide pb-1">
        <TabButton id="overview" label="Overview" icon={LayoutDashboard} />
        <TabButton id="companies" label="Companies" icon={Building2} />
        <TabButton id="users" label="Users" icon={Users} />
        <TabButton id="system" label="System" icon={Server} />
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
                  <StatCard icon={Building2} label="Total Companies" value={stats?.totalCompanies || 0} sublabel="Registered" color="brand-gold" />
                  <StatCard icon={Building2} label="Total Outlets" value={stats?.totalOutlets || 0} sublabel="Across all companies" color="brand-gold" />
                  <StatCard icon={Users} label="Total Users" value={stats?.totalUsers || 0} sublabel={`${stats?.activeUsers || 0} active`} color="brand-eco" trend="up" />
                  <StatCard icon={Database} label="Data Points" value={stats?.totalDataPoints || 0} sublabel="Waste + Resource logs" color="brand-gold" />
                </div>

                {/* ESG Impact Summary */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 border border-brand-eco/50 rounded-xl bg-brand-eco/5 flex items-center justify-center shrink-0">
                      <Leaf size={18} className="text-brand-eco" />
                    </div>
                    <div>
                      <h4 className="text-lg font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                        Platform ESG Impact
                      </h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold/80">
                        Aggregate Across All Tenants
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    <StatCard icon={Cloud} label="Carbon Lifecycle" value={stats?.totalCarbonImpact.toFixed(1) || '0'} sublabel="kg CO₂e total" color="brand-gold" />
                    <StatCard icon={Droplets} label="Water Footprint" value={stats?.totalWaterFootprint.toFixed(1) || '0'} sublabel="Liters total" color="brand-gold" />
                    <StatCard icon={DollarSign} label="Financial Impact" value={`$${stats?.totalFinancialLoss.toFixed(2) || '0'}`} sublabel="Total loss tracked" color="brand-alert" />
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
                        Data Breakdown
                      </h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold/80">
                        Entry Volume by Category
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <StatCard icon={Leaf} label="Waste Entries" value={stats?.totalWasteEntries || 0} sublabel="Food waste logs" color="brand-eco" />
                    <StatCard icon={Zap} label="Resource Entries" value={stats?.totalResourceEntries || 0} sublabel="Energy + Water logs" color="brand-energy" />
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
                          Recent Companies
                        </h4>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold/80">
                          Latest Registrations
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('companies')} className="flex items-center gap-1 text-[11px] font-bold text-brand-gold hover:text-brand-gold/80 transition-colors">
                      View All <ChevronRight size={14} />
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
                      placeholder="Search companies..."
                      className="w-full bg-brand-dark/80 border border-brand-gold/15 rounded-xl py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-brand-gold transition-all"
                    />
                  </div>
                  <button onClick={fetchPlatformData} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-dark/60 border border-brand-gold/20 text-white/60 hover:text-brand-gold hover:border-brand-gold/40 transition-all">
                    <RefreshCcw size={16} /> Refresh
                  </button>
                </div>

                {/* Companies Table */}
                <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-brand-gold/15">
                          <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-brand-gold">Company</th>
                          <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-brand-gold">Location</th>
                          <th className="text-center px-5 py-3 text-[10px] font-black uppercase tracking-widest text-brand-gold">Outlets</th>
                          <th className="text-center px-5 py-3 text-[10px] font-black uppercase tracking-widest text-brand-gold">Users</th>
                          <th className="text-center px-5 py-3 text-[10px] font-black uppercase tracking-widest text-brand-gold">Status</th>
                          <th className="text-right px-5 py-3 text-[10px] font-black uppercase tracking-widest text-brand-gold">Actions</th>
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
                                {c.status === 'suspended' ? <><Unlock size={12} /> Activate</> : <><Ban size={12} /> Suspend</>}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredCompanies.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-5 py-16 text-center">
                              <p className="text-sm text-white/30">No companies found.</p>
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
                  <StatCard icon={Users} label="Total Users" value={stats?.totalUsers || 0} sublabel="All registered" color="brand-gold" />
                  <StatCard icon={CheckCircle2} label="Active Users" value={stats?.activeUsers || 0} sublabel="Not suspended" color="brand-eco" />
                  <StatCard icon={Ban} label="Suspended" value={(stats?.totalUsers || 0) - (stats?.activeUsers || 0)} sublabel="Inactive accounts" color="brand-alert" />
                </div>
                <div className="rounded-2xl border border-brand-gold/20 bg-[#1c3933] p-8 text-center">
                  <Users size={32} className="text-white/20 mx-auto mb-3" />
                  <p className="text-sm text-white/40">User management table loads from the users table.</p>
                  <p className="text-xs text-white/25 mt-1">Use the Companies tab to manage tenant-level access.</p>
                </div>
              </div>
            )}

            {/* ── System Tab ── */}
            {activeTab === 'system' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  <StatCard icon={Server} label="Supabase Status" value="Online" sublabel="Edge functions active" color="brand-eco" trend="up" />
                  <StatCard icon={Cpu} label="Mila AI Engine" value="Active" sublabel="Agent + RAG running" color="brand-gold" trend="up" />
                  <StatCard icon={Webhook} label="Webhooks" value="0" sublabel="No integrations" color="brand-gold" />
                  <StatCard icon={Globe} label="API Endpoints" value="12" sublabel="REST routes" color="brand-gold" />
                  <StatCard icon={Bell} label="Alert System" value="Active" sublabel="Anomaly detection on" color="brand-eco" trend="up" />
                  <StatCard icon={FileText} label="Audit Logs" value="Enabled" sublabel="All actions tracked" color="brand-gold" />
                </div>

                {/* System Controls */}
                <div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 border border-brand-gold/50 rounded-xl bg-brand-gold/5 flex items-center justify-center shrink-0">
                      <Settings size={18} className="text-brand-gold" />
                    </div>
                    <div>
                      <h4 className="text-lg font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                        System Controls
                      </h4>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold/80">
                        Platform Operations
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <button className="flex items-center gap-3 p-5 rounded-2xl border border-brand-gold/20 bg-[#1c3933] hover:border-brand-gold/40 transition-all text-left">
                      <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
                        <RefreshCcw size={18} className="text-brand-gold" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Refresh All Data</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Reload platform metrics</p>
                      </div>
                    </button>
                    <button className="flex items-center gap-3 p-5 rounded-2xl border border-brand-gold/20 bg-[#1c3933] hover:border-brand-gold/40 transition-all text-left">
                      <div className="w-10 h-10 rounded-xl bg-brand-eco/10 border border-brand-eco/20 flex items-center justify-center shrink-0">
                        <Cpu size={18} className="text-brand-eco" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Mila AI Status</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Check agent health</p>
                      </div>
                    </button>
                    <button className="flex items-center gap-3 p-5 rounded-2xl border border-brand-gold/20 bg-[#1c3933] hover:border-brand-gold/40 transition-all text-left">
                      <div className="w-10 h-10 rounded-xl bg-brand-alert/10 border border-brand-alert/20 flex items-center justify-center shrink-0">
                        <Bell size={18} className="text-brand-alert" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Alert Config</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Manage thresholds</p>
                      </div>
                    </button>
                    <button className="flex items-center gap-3 p-5 rounded-2xl border border-brand-gold/20 bg-[#1c3933] hover:border-brand-gold/40 transition-all text-left">
                      <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
                        <FileText size={18} className="text-brand-gold" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Audit Trail</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">View all system actions</p>
                      </div>
                    </button>
                    <button className="flex items-center gap-3 p-5 rounded-2xl border border-brand-gold/20 bg-[#1c3933] hover:border-brand-gold/40 transition-all text-left">
                      <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
                        <Mail size={18} className="text-brand-gold" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Email Templates</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Manage notifications</p>
                      </div>
                    </button>
                    <button className="flex items-center gap-3 p-5 rounded-2xl border border-brand-gold/20 bg-[#1c3933] hover:border-brand-gold/40 transition-all text-left">
                      <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
                        <Database size={18} className="text-brand-gold" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Database Health</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider">Check table sizes</p>
                      </div>
                    </button>
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
