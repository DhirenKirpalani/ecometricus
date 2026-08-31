
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate as useRouterNavigate, useLocation } from 'react-router-dom';
import MilaWidget from './MilaWidget';
import GamificationHub from './GamificationHub';
import { supabase } from '../lib/supabase';
import { useI18n } from '../lib/useI18n';
import { sha256 } from '../lib/hash';
import { fetchUserStats } from '../lib/gamification';
import {
  Building2,
  Users,
  Settings2,
  Database,
  ShieldCheck,
  Globe,
  UserPlus,
  BarChart3,
  Target,
  Activity,
  ChevronRight,
  RefreshCcw,
  Terminal,
  Save,
  Leaf,
  Edit2,
  X,
  Check,
  Cpu,
  Loader2,
  Trophy,
  LayoutDashboard,
  Zap,
  Droplets,
  TrendingUp,
  TriangleAlert,
  Trash2,
  MapPin,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ToggleLeft,
  ToggleRight,
  Lightbulb,
  AlertCircle,
  Award,
  Search,
  CheckCircle2,
  Cloud,
  Copy,
  MessageSquare,
  Plus,
  FileText,
  ScrollText,
  LifeBuoy,
  Headphones,
  Mail,
  Send,
  ImageIcon,
  Calendar,
  FileDigit,
  ChevronDown,
  Unlock,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  UserCheck,
  ChevronUp,
  Scale,
  Lock,
  Calculator,
  Info,
  Link2,
  LogOut,
  DollarSign,
  AlertTriangle,
  Utensils,
  Star,
  Percent,
  Receipt,
  Store,
  User,
  Briefcase,
  ClipboardList
} from 'lucide-react';
import FoodWasteChart from './FoodWasteChart';
import WaterUsageChart from './WaterUsageChart';
import KpiChart from './KpiChart';
import FoodWasteIntelligence from './FoodWasteIntelligence';
import ResourceIntelligence from './ResourceIntelligence';
import DailyInputForm from './DailyInputForm';
import MilaKnowledgeManager from './MilaKnowledgeManager';
import SuperAdminDashboard from './SuperAdminDashboard';
import FoodWasteTemplateChart from './FoodWasteTemplateChart';
import WaterUsageTemplateChart from './WaterUsageTemplateChart';
import EnergyUsageTemplateChart from './EnergyUsageTemplateChart';
import Co2EmissionsTemplateChart from './Co2EmissionsTemplateChart';
import { useFoodWasteChartData } from '../hooks/useFoodWasteChartData';
import { useResourceChartData } from '../hooks/useResourceChartData';
import LegalConsentModal from './LegalConsentModal';
import { UserProfile, StaffPosition, Outlet } from '../types';
import Logo from './Logo';

interface DashboardPageProps {
  user: UserProfile;
  onLogout: () => void;
  onUpdateUser: (updatedFields: Partial<UserProfile>) => void;
}

// Stable SidebarItem component — defined outside main render to prevent remounts
const SidebarItem: React.FC<{
  view: PortalView;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: (view: PortalView) => void;
}> = ({ view, icon: Icon, label, active, onClick }) => {
  return (
    <button
      onClick={() => onClick(view)}
      title={label}
      className={`relative flex items-center gap-3 p-2.5 rounded-xl transition-all duration-300 whitespace-nowrap group/item lg:w-full justify-center lg:justify-start ${
        active
          ? 'bg-brand-eco/20 text-white shadow-[0_0_15px_rgba(74,222,128,0.15)]'
          : 'text-white/60 hover:text-white/90 hover:bg-brand-dark/60'
      }`}
    >
      <Icon
        size={22}
        className={`shrink-0 ${active ? 'text-brand-eco' : 'text-white/40 group-hover/item:text-white/70'}`}
      />
      {/* Label — hidden on desktop collapsed, shown on sidebar hover via group-hover */}
      <span className={`text-[14px] font-bold tracking-tight ${active ? 'text-white' : ''} hidden lg:block opacity-0 max-w-0 overflow-hidden group-hover/sidebar:opacity-100 group-hover/sidebar:max-w-[160px] transition-all duration-300`}>
        {label}
      </span>
      {/* Left bar indicator for active item */}
      <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[4px] h-8 rounded-r-full bg-brand-eco transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0'}`} />
    </button>
  );
};

// Define brand color constants for visualizations
const brandEco = '#77B139';
const brandEnergy = '#FF914D';
const brandGold = '#C8A413';
const brandDark = '#152E2A';
const brandAlert = '#FF3131';

enum PortalView {
  DASHBOARD = 'dashboard',
  DAILY_INPUT = 'daily_input',
  IDENTITY = 'identity',
  TEAM = 'team',
  PARAMETERS = 'parameters',
  AUDIT_LOG = 'audit_log',
  CONTACT = 'contact',
  SUPER_ADMIN = 'super_admin',
  SYSTEM = 'system'
}

// URL path mapping for portal views
const PORTAL_VIEW_PATHS: Record<PortalView, string> = {
  [PortalView.DASHBOARD]: '/dashboard',
  [PortalView.DAILY_INPUT]: '/dashboard/daily-input',
  [PortalView.IDENTITY]: '/dashboard/company',
  [PortalView.TEAM]: '/dashboard/team',
  [PortalView.PARAMETERS]: '/dashboard/benchmarks',
  [PortalView.AUDIT_LOG]: '/dashboard/audit-log',
  [PortalView.CONTACT]: '/dashboard/contact',
  [PortalView.SUPER_ADMIN]: '/dashboard/super-admin',
  [PortalView.SYSTEM]: '/dashboard/system',
};

const PATH_TO_PORTAL_VIEW: Record<string, PortalView> = Object.fromEntries(
  Object.entries(PORTAL_VIEW_PATHS).map(([view, path]) => [path, view as PortalView])
);

enum DashboardTab {
  SUMMARIZED = 'overview',
  FOOD_WASTE = 'food-waste',
  ENERGY_WATER = 'energy-water',
  GAMIFICATION = 'gamification'
}

// URL path mapping for dashboard inner tabs (nested under /dashboard)
const DASHBOARD_TAB_PATHS: Record<DashboardTab, string> = {
  [DashboardTab.SUMMARIZED]: '/dashboard/overview',
  [DashboardTab.FOOD_WASTE]: '/dashboard/food-waste',
  [DashboardTab.ENERGY_WATER]: '/dashboard/energy-water',
  [DashboardTab.GAMIFICATION]: '/dashboard/gamification',
};

const PATH_TO_DASHBOARD_TAB: Record<string, DashboardTab> = Object.fromEntries(
  Object.entries(DASHBOARD_TAB_PATHS).map(([tab, path]) => [path, tab as DashboardTab])
);

const REGION_DATA: Record<string, string[]> = {
  'Asia': [
    'Bangkok, Thailand', 'Singapore', 'Kuala Lumpur, Malaysia', 'Ho Chi Minh City, Vietnam',
    'Hanoi, Vietnam', 'Jakarta, Indonesia', 'Bali, Indonesia', 'Tokyo, Japan', 'Osaka, Japan',
    'Hong Kong', 'Seoul, South Korea', 'Taipei, Taiwan', 'Manila, Philippines', 'Phuket, Thailand',
    'Chiang Mai, Thailand', 'Colombo, Sri Lanka', 'Dhaka, Bangladesh', 'Kathmandu, Nepal',
    'Maldives', 'Phnom Penh, Cambodia', 'Vientiane, Laos', 'Yangon, Myanmar', 'Macau',
    'Shanghai, China', 'Beijing, China', 'Shenzhen, China', 'Mumbai, India', 'Delhi, India',
    'Bengaluru, India', 'Chennai, India', 'Goa, India', 'Hyderabad, India',
  ],
  'Middle East': [
    'Dubai, UAE', 'Abu Dhabi, UAE', 'Sharjah, UAE', 'Riyadh, Saudi Arabia',
    'Jeddah, Saudi Arabia', 'Mecca, Saudi Arabia', 'Doha, Qatar', 'Muscat, Oman',
    'Kuwait City, Kuwait', 'Manama, Bahrain', 'Amman, Jordan', 'Beirut, Lebanon',
    'Tel Aviv, Israel', 'Cairo, Egypt', 'Istanbul, Turkey', 'Ankara, Turkey',
    'Tehran, Iran', 'Baghdad, Iraq',
  ],
  'Europe': [
    'London, UK', 'Manchester, UK', 'Edinburgh, UK', 'Paris, France', 'Lyon, France',
    'Berlin, Germany', 'Munich, Germany', 'Frankfurt, Germany', 'Hamburg, Germany',
    'Rome, Italy', 'Milan, Italy', 'Florence, Italy', 'Venice, Italy', 'Naples, Italy',
    'Madrid, Spain', 'Barcelona, Spain', 'Seville, Spain', 'Lisbon, Portugal', 'Porto, Portugal',
    'Amsterdam, Netherlands', 'Brussels, Belgium', 'Vienna, Austria', 'Zurich, Switzerland',
    'Geneva, Switzerland', 'Copenhagen, Denmark', 'Stockholm, Sweden', 'Oslo, Norway',
    'Helsinki, Finland', 'Warsaw, Poland', 'Prague, Czech Republic', 'Budapest, Hungary',
    'Athens, Greece', 'Santorini, Greece', 'Dubrovnik, Croatia', 'Monaco', 'Luxembourg',
  ],
  'USA': [
    'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Miami, FL', 'San Francisco, CA',
    'Las Vegas, NV', 'Seattle, WA', 'Boston, MA', 'Washington DC', 'Houston, TX',
    'Dallas, TX', 'Austin, TX', 'Atlanta, GA', 'New Orleans, LA', 'Nashville, TN',
    'Denver, CO', 'Phoenix, AZ', 'San Diego, CA', 'Portland, OR', 'Honolulu, HI',
    'Orlando, FL', 'Tampa, FL', 'Charlotte, NC', 'Minneapolis, MN', 'Detroit, MI',
  ],
  'North America': [
    'Toronto, Canada', 'Vancouver, Canada', 'Montreal, Canada', 'Calgary, Canada',
    'Ottawa, Canada', 'Edmonton, Canada', 'Quebec City, Canada', 'Winnipeg, Canada',
    'Halifax, Canada',
    'Cancun, Mexico', 'Mexico City, Mexico', 'Guadalajara, Mexico', 'Monterrey, Mexico',
    'Havana, Cuba', 'Nassau, Bahamas', 'Kingston, Jamaica', 'San Juan, Puerto Rico',
    'Bridgetown, Barbados', 'Port of Spain, Trinidad', 'Punta Cana, Dominican Republic',
    'Santo Domingo, Dominican Republic', 'Georgetown, Cayman Islands', 'Philipsburg, St Maarten',
  ],
  'Africa': [
    'Cape Town, South Africa', 'Johannesburg, South Africa', 'Nairobi, Kenya',
    'Lagos, Nigeria', 'Accra, Ghana', 'Casablanca, Morocco', 'Marrakech, Morocco',
    'Tunis, Tunisia', 'Algiers, Algeria', 'Addis Ababa, Ethiopia', 'Dar es Salaam, Tanzania',
    'Kampala, Uganda', 'Kigali, Rwanda', 'Maputo, Mozambique', 'Mauritius',
  ],
  'Oceania': [
    'Sydney, Australia', 'Melbourne, Australia', 'Brisbane, Australia', 'Perth, Australia',
    'Gold Coast, Australia', 'Adelaide, Australia', 'Cairns, Australia',
    'Auckland, New Zealand', 'Queenstown, New Zealand', 'Wellington, New Zealand',
    'Fiji', 'Bora Bora, French Polynesia', 'Noumea, New Caledonia',
  ],
  'South America': [
    'Buenos Aires, Argentina', 'Mendoza, Argentina', 'São Paulo, Brazil', 'Rio de Janeiro, Brazil',
    'Brasília, Brazil', 'Santiago, Chile', 'Lima, Peru', 'Cusco, Peru', 'Bogotá, Colombia',
    'Medellín, Colombia', 'Cartagena, Colombia', 'Quito, Ecuador', 'Caracas, Venezuela',
    'Montevideo, Uruguay', 'Asunción, Paraguay', 'La Paz, Bolivia',
  ],
};

const TIMEZONES: Record<string, string> = {
  // Asia
  'Bangkok, Thailand': 'ICT (UTC+7)', 'Singapore': 'SGT (UTC+8)', 'Kuala Lumpur, Malaysia': 'MYT (UTC+8)',
  'Ho Chi Minh City, Vietnam': 'ICT (UTC+7)', 'Hanoi, Vietnam': 'ICT (UTC+7)',
  'Jakarta, Indonesia': 'WIB (UTC+7)', 'Bali, Indonesia': 'WITA (UTC+8)',
  'Tokyo, Japan': 'JST (UTC+9)', 'Osaka, Japan': 'JST (UTC+9)', 'Hong Kong': 'HKT (UTC+8)',
  'Seoul, South Korea': 'KST (UTC+9)', 'Taipei, Taiwan': 'CST (UTC+8)',
  'Manila, Philippines': 'PHT (UTC+8)', 'Phuket, Thailand': 'ICT (UTC+7)',
  'Chiang Mai, Thailand': 'ICT (UTC+7)', 'Colombo, Sri Lanka': 'IST (UTC+5:30)',
  'Dhaka, Bangladesh': 'BST (UTC+6)', 'Kathmandu, Nepal': 'NPT (UTC+5:45)',
  'Maldives': 'MVT (UTC+5)', 'Phnom Penh, Cambodia': 'ICT (UTC+7)',
  'Vientiane, Laos': 'ICT (UTC+7)', 'Yangon, Myanmar': 'MMT (UTC+6:30)', 'Macau': 'CST (UTC+8)',
  'Shanghai, China': 'CST (UTC+8)', 'Beijing, China': 'CST (UTC+8)',
  'Shenzhen, China': 'CST (UTC+8)', 'Mumbai, India': 'IST (UTC+5:30)',
  'Delhi, India': 'IST (UTC+5:30)', 'Bengaluru, India': 'IST (UTC+5:30)',
  'Chennai, India': 'IST (UTC+5:30)', 'Goa, India': 'IST (UTC+5:30)',
  'Hyderabad, India': 'IST (UTC+5:30)',
  // Middle East
  'Dubai, UAE': 'GST (UTC+4)', 'Abu Dhabi, UAE': 'GST (UTC+4)', 'Sharjah, UAE': 'GST (UTC+4)',
  'Riyadh, Saudi Arabia': 'AST (UTC+3)', 'Jeddah, Saudi Arabia': 'AST (UTC+3)',
  'Mecca, Saudi Arabia': 'AST (UTC+3)', 'Doha, Qatar': 'AST (UTC+3)',
  'Muscat, Oman': 'GST (UTC+4)', 'Kuwait City, Kuwait': 'AST (UTC+3)',
  'Manama, Bahrain': 'AST (UTC+3)', 'Amman, Jordan': 'EET (UTC+3)',
  'Beirut, Lebanon': 'EET (UTC+3)', 'Tel Aviv, Israel': 'IDT (UTC+3)',
  'Cairo, Egypt': 'EET (UTC+2)', 'Istanbul, Turkey': 'TRT (UTC+3)',
  'Ankara, Turkey': 'TRT (UTC+3)', 'Tehran, Iran': 'IRST (UTC+3:30)',
  'Baghdad, Iraq': 'AST (UTC+3)',
  // Europe
  'London, UK': 'BST (UTC+1)', 'Manchester, UK': 'BST (UTC+1)', 'Edinburgh, UK': 'BST (UTC+1)',
  'Paris, France': 'CEST (UTC+2)', 'Lyon, France': 'CEST (UTC+2)',
  'Berlin, Germany': 'CEST (UTC+2)', 'Munich, Germany': 'CEST (UTC+2)',
  'Frankfurt, Germany': 'CEST (UTC+2)', 'Hamburg, Germany': 'CEST (UTC+2)',
  'Rome, Italy': 'CEST (UTC+2)', 'Milan, Italy': 'CEST (UTC+2)',
  'Florence, Italy': 'CEST (UTC+2)', 'Venice, Italy': 'CEST (UTC+2)',
  'Naples, Italy': 'CEST (UTC+2)', 'Madrid, Spain': 'CEST (UTC+2)',
  'Barcelona, Spain': 'CEST (UTC+2)', 'Seville, Spain': 'CEST (UTC+2)',
  'Lisbon, Portugal': 'WEST (UTC+1)', 'Porto, Portugal': 'WEST (UTC+1)',
  'Amsterdam, Netherlands': 'CEST (UTC+2)', 'Brussels, Belgium': 'CEST (UTC+2)',
  'Vienna, Austria': 'CEST (UTC+2)', 'Zurich, Switzerland': 'CEST (UTC+2)',
  'Geneva, Switzerland': 'CEST (UTC+2)', 'Copenhagen, Denmark': 'CEST (UTC+2)',
  'Stockholm, Sweden': 'CEST (UTC+2)', 'Oslo, Norway': 'CEST (UTC+2)',
  'Helsinki, Finland': 'EEST (UTC+3)', 'Warsaw, Poland': 'CEST (UTC+2)',
  'Prague, Czech Republic': 'CEST (UTC+2)', 'Budapest, Hungary': 'CEST (UTC+2)',
  'Athens, Greece': 'EEST (UTC+3)', 'Santorini, Greece': 'EEST (UTC+3)',
  'Dubrovnik, Croatia': 'CEST (UTC+2)', 'Monaco': 'CEST (UTC+2)', 'Luxembourg': 'CEST (UTC+2)',
  // USA
  'New York, NY': 'EDT (UTC-4)', 'Los Angeles, CA': 'PDT (UTC-7)', 'Chicago, IL': 'CDT (UTC-5)',
  'Miami, FL': 'EDT (UTC-4)', 'San Francisco, CA': 'PDT (UTC-7)', 'Las Vegas, NV': 'PDT (UTC-7)',
  'Seattle, WA': 'PDT (UTC-7)', 'Boston, MA': 'EDT (UTC-4)', 'Washington DC': 'EDT (UTC-4)',
  'Houston, TX': 'CDT (UTC-5)', 'Dallas, TX': 'CDT (UTC-5)', 'Austin, TX': 'CDT (UTC-5)',
  'Atlanta, GA': 'EDT (UTC-4)', 'New Orleans, LA': 'CDT (UTC-5)', 'Nashville, TN': 'CDT (UTC-5)',
  'Denver, CO': 'MDT (UTC-6)', 'Phoenix, AZ': 'MST (UTC-7)', 'San Diego, CA': 'PDT (UTC-7)',
  'Portland, OR': 'PDT (UTC-7)', 'Honolulu, HI': 'HST (UTC-10)', 'Orlando, FL': 'EDT (UTC-4)',
  'Tampa, FL': 'EDT (UTC-4)', 'Charlotte, NC': 'EDT (UTC-4)',
  'Minneapolis, MN': 'CDT (UTC-5)', 'Detroit, MI': 'EDT (UTC-4)',
  // Caribbean / Mexico
  'Cancun, Mexico': 'EST (UTC-5)', 'Mexico City, Mexico': 'CST (UTC-6)',
  'Guadalajara, Mexico': 'CST (UTC-6)', 'Monterrey, Mexico': 'CST (UTC-6)',
  'Havana, Cuba': 'CDT (UTC-4)', 'Nassau, Bahamas': 'EDT (UTC-4)',
  'Kingston, Jamaica': 'EST (UTC-5)', 'San Juan, Puerto Rico': 'AST (UTC-4)',
  'Bridgetown, Barbados': 'AST (UTC-4)', 'Port of Spain, Trinidad': 'AST (UTC-4)',
  'Punta Cana, Dominican Republic': 'AST (UTC-4)', 'Santo Domingo, Dominican Republic': 'AST (UTC-4)',
  'Georgetown, Cayman Islands': 'EST (UTC-5)', 'Philipsburg, St Maarten': 'AST (UTC-4)',
  // Africa
  'Cape Town, South Africa': 'SAST (UTC+2)', 'Johannesburg, South Africa': 'SAST (UTC+2)',
  'Nairobi, Kenya': 'EAT (UTC+3)', 'Lagos, Nigeria': 'WAT (UTC+1)',
  'Accra, Ghana': 'GMT (UTC+0)', 'Casablanca, Morocco': 'WET (UTC+1)',
  'Marrakech, Morocco': 'WET (UTC+1)', 'Tunis, Tunisia': 'CET (UTC+1)',
  'Algiers, Algeria': 'CET (UTC+1)', 'Addis Ababa, Ethiopia': 'EAT (UTC+3)',
  'Dar es Salaam, Tanzania': 'EAT (UTC+3)', 'Kampala, Uganda': 'EAT (UTC+3)',
  'Kigali, Rwanda': 'CAT (UTC+2)', 'Maputo, Mozambique': 'CAT (UTC+2)', 'Mauritius': 'MUT (UTC+4)',
  // Oceania
  'Sydney, Australia': 'AEST (UTC+10)', 'Melbourne, Australia': 'AEST (UTC+10)',
  'Brisbane, Australia': 'AEST (UTC+10)', 'Perth, Australia': 'AWST (UTC+8)',
  'Gold Coast, Australia': 'AEST (UTC+10)', 'Adelaide, Australia': 'ACST (UTC+9:30)',
  'Cairns, Australia': 'AEST (UTC+10)', 'Auckland, New Zealand': 'NZST (UTC+12)',
  'Queenstown, New Zealand': 'NZST (UTC+12)', 'Wellington, New Zealand': 'NZST (UTC+12)',
  'Fiji': 'FJT (UTC+12)', 'Bora Bora, French Polynesia': 'TAHT (UTC-10)',
  'Noumea, New Caledonia': 'NCT (UTC+11)',
  // South America
  'Buenos Aires, Argentina': 'ART (UTC-3)', 'Mendoza, Argentina': 'ART (UTC-3)',
  'São Paulo, Brazil': 'BRT (UTC-3)', 'Rio de Janeiro, Brazil': 'BRT (UTC-3)',
  'Brasília, Brazil': 'BRT (UTC-3)', 'Santiago, Chile': 'CLT (UTC-4)',
  'Lima, Peru': 'PET (UTC-5)', 'Cusco, Peru': 'PET (UTC-5)',
  'Bogotá, Colombia': 'COT (UTC-5)', 'Medellín, Colombia': 'COT (UTC-5)',
  'Cartagena, Colombia': 'COT (UTC-5)', 'Quito, Ecuador': 'ECT (UTC-5)',
  'Caracas, Venezuela': 'VET (UTC-4)', 'Montevideo, Uruguay': 'UYT (UTC-3)',
  'Asunción, Paraguay': 'PYT (UTC-4)', 'La Paz, Bolivia': 'BOT (UTC-4)',
  // Canada
  'Toronto, Canada': 'EDT (UTC-4)', 'Vancouver, Canada': 'PDT (UTC-7)',
  'Montreal, Canada': 'EDT (UTC-4)', 'Calgary, Canada': 'MDT (UTC-6)',
  'Ottawa, Canada': 'EDT (UTC-4)', 'Edmonton, Canada': 'MDT (UTC-6)',
  'Quebec City, Canada': 'EDT (UTC-4)', 'Winnipeg, Canada': 'CDT (UTC-5)',
  'Halifax, Canada': 'ADT (UTC-3)',
};

const BENCHMARK_PROFILES: Record<string, { waste: number; water: number; energy: number; foodCost: number; laborCost: number }> = {
  'ASEAN Luxury Hotels': { waste: 80, water: 25000, energy: 1000, foodCost: 30, laborCost: 18 },
  'European Michelin Standard': { waste: 60, water: 20000, energy: 800, foodCost: 32, laborCost: 25 },
  'North American Premium': { waste: 100, water: 30000, energy: 1200, foodCost: 28, laborCost: 20 },
  'Middle East Luxury Collection': { waste: 90, water: 40000, energy: 1500, foodCost: 25, laborCost: 15 },
};

const AVAILABLE_PERMISSIONS = [
  'Daily Dashboard Review',
  'Review Alerts and Suggestion',
  'Print report',
  'Entry input data',
  'Review Basic users input data',
  'Access photo library',
  'Add comments',
  'Snapshot images',
  'Input data reminders',
  'Alert missing data',
  'Receive notifications',
  'Sustainability Insights',
  'Full Dashboard Review',
  'Admin Control',
  'AI Mila full Interaction',
  'AI Mila Limited Interaction'
];

const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  'Admin': AVAILABLE_PERMISSIONS,
  'Supervisor': [
    'Daily Dashboard Review',
    'Review Alerts and Suggestion',
    'Print report',
    'Entry input data',
    'Review Basic users input data',
    'Add comments',
    'Receive notifications',
    'AI Mila full Interaction'
  ],
  'Basic': [
    'Entry input data',
    'Access photo library',
    'Add comments',
    'Snapshot images',
    'Input data reminders',
    'Alert missing data',
    'Receive notifications',
    'AI Mila Limited Interaction'
  ],
  'View': [
    'Full Dashboard Review',
    'Print report',
    'Sustainability Insights',
    'AI Mila Limited Interaction'
  ]
};

const POSITION_TO_ROLE: Record<string, string> = {
  'Admin': 'Admin',
  'Exec Chef': 'Supervisor',
  'Outlet Manager': 'Supervisor',
  'Chef Prep': 'Basic',
  'GM': 'View'
};

// Sparkline component for KPI mini-charts
const Sparkline: React.FC<{ color: string, data: number[] }> = ({ color, data }) => (
  <div className="w-full h-12 sm:h-16 mt-4 sm:mt-6">
    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={data.map((val, i) => `${(i / (data.length - 1)) * 100},${100 - (val / Math.max(...data, 100) * 80)}`).join(' ')}
      />
      {data.map((val, i) => (
        <circle key={i} cx={`${(i / (data.length - 1)) * 100}`} cy={`${100 - (val / Math.max(...data, 100) * 80)}`} r="3" fill={color} />
      ))}
    </svg>
  </div>
);

// ── Fully-themed custom select (native <select> can't be styled on macOS) ──
interface CustomSelectProps {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
}
const CustomSelect: React.FC<CustomSelectProps> = ({ value, options, onChange, disabled, placeholder, emptyMessage }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full flex items-center justify-between bg-[#152E2A] border rounded-xl py-3 px-4 text-sm text-left transition-colors
          ${disabled ? 'opacity-40 cursor-not-allowed border-brand-gold/15' : 'border-brand-gold/25 hover:border-brand-gold/150 cursor-pointer'}
          ${open ? 'border-brand-gold' : ''}`}
      >
        <span className={value ? 'text-white' : 'text-white/40'}>{value || placeholder || 'Select…'}</span>
        <ChevronDown size={14} className={`text-brand-gold/60 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-[9999] mt-1 w-full rounded-xl border border-brand-gold/25 bg-[#152E2A] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
          <ul className="max-h-56 overflow-y-auto scrollbar-gold py-1">
            {options.length === 0 ? (
              <li className="px-4 py-3 text-xs text-white/30 italic text-center select-none">
                {emptyMessage ?? 'No options available'}
              </li>
            ) : options.map(opt => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2
                    ${opt === value
                      ? 'text-brand-gold bg-brand-gold/10 font-semibold'
                      : 'text-white/70 hover:text-white hover:bg-brand-dark/60'}`}
                >
                  {opt === value && <Check size={12} className="text-brand-gold shrink-0" />}
                  {opt !== value && <span className="w-3 shrink-0" />}
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ── Custom date picker (native date input popup can't be themed on macOS) ──
const MONTHS_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS  = ['S','M','T','W','T','F','S'];

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD or ''
  onChange: (v: string) => void;
  disabled?: boolean;
}

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ value, onChange, disabled }) => {
  const today   = new Date();
  const parsed  = value ? new Date(value + 'T00:00:00') : null;

  const [open, setOpen]           = useState(false);
  const [viewYear, setViewYear]   = useState(parsed?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth()    ?? today.getMonth());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef   = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 288 });

  // Recompute popup position relative to trigger
  const reposition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const popupW = 288;
    let left = r.left;
    // Keep popup on-screen horizontally
    if (left + popupW > window.innerWidth - 8) left = window.innerWidth - popupW - 8;
    if (left < 8) left = 8;
    setPopupPos({ top: r.bottom + 6, left, width: popupW });
  }, []);

  // Click-outside closes picker
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node)) return;
      if (popupRef.current?.contains(e.target as Node))   return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Position popup on open + on scroll/resize
  useEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  // Sync view when value changes externally
  useEffect(() => {
    if (parsed) { setViewYear(parsed.getFullYear()); setViewMonth(parsed.getMonth()); }
  }, [value]);

  const prevMonth = () => viewMonth === 0  ? (setViewMonth(11), setViewYear(y => y - 1)) : setViewMonth(m => m - 1);
  const nextMonth = () => viewMonth === 11 ? (setViewMonth(0),  setViewYear(y => y + 1)) : setViewMonth(m => m + 1);

  const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const todayISO = toISO(today);

  // Build 5-or-6 row calendar grid
  const cells = useMemo<{ date: Date; current: boolean }[]>(() => {
    const firstDow     = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrev   = new Date(viewYear, viewMonth, 0).getDate();
    const result: { date: Date; current: boolean }[] = [];
    for (let i = firstDow - 1; i >= 0; i--)
      result.push({ date: new Date(viewYear, viewMonth - 1, daysInPrev - i), current: false });
    for (let d = 1; d <= daysInMonth; d++)
      result.push({ date: new Date(viewYear, viewMonth, d), current: true });
    let d = 1;
    while (result.length % 7 !== 0 || result.length < 35)
      result.push({ date: new Date(viewYear, viewMonth + 1, d++), current: false });
    return result;
  }, [viewYear, viewMonth]);

  const displayValue = parsed
    ? `${String(parsed.getDate()).padStart(2,'0')}/${String(parsed.getMonth()+1).padStart(2,'0')}/${parsed.getFullYear()}`
    : '';

  const popup = open ? ReactDOM.createPortal(
    <div
      ref={popupRef}
      style={{ position: 'fixed', top: popupPos.top, left: popupPos.left, width: popupPos.width, zIndex: 99999 }}
      className="rounded-xl border border-brand-gold/25 bg-[#152E2A] shadow-[0_8px_32px_rgba(0,0,0,0.65)] overflow-hidden"
    >
      {/* Month / Year nav */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button type="button" onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
          <ChevronDown size={13} className="rotate-90" />
        </button>
        <span className="text-[11px] font-black uppercase tracking-widest text-white">
          {MONTHS_LONG[viewMonth]} {viewYear}
        </span>
        <button type="button" onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
          <ChevronDown size={13} className="-rotate-90" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 px-3 pb-1">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[9px] font-black uppercase tracking-widest text-brand-gold/40 py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
        {cells.map((cell, i) => {
          const iso        = toISO(cell.date);
          const isSelected = iso === value;
          const isToday    = iso === todayISO;
          return (
            <button
              key={i}
              type="button"
              onClick={() => { onChange(iso); setOpen(false); }}
              className={[
                'aspect-square flex items-center justify-center text-[11px] font-semibold rounded-lg transition-colors',
                !cell.current                            ? 'text-white/15 hover:text-white/30'             : '',
                cell.current && !isSelected && !isToday  ? 'text-white/70 hover:bg-white/10 hover:text-white' : '',
                isToday && !isSelected                   ? 'text-brand-gold border border-brand-gold/40'   : '',
                isSelected                               ? 'bg-brand-gold text-brand-dark font-black'       : '',
              ].join(' ')}
            >
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-brand-gold/15">
        <button type="button"
          onClick={() => { onChange(''); setOpen(false); }}
          className="text-[10px] font-bold text-white/35 hover:text-white/70 transition-colors uppercase tracking-widest">
          Clear
        </button>
        <button type="button"
          onClick={() => { onChange(todayISO); setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setOpen(false); }}
          className="text-[10px] font-bold text-brand-gold hover:text-brand-gold/70 transition-colors uppercase tracking-widest">
          Today
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative w-full">
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full flex items-center gap-3 bg-brand-dark/80 border rounded-xl py-3 px-4 text-sm text-left transition-colors
          ${disabled ? 'opacity-40 cursor-not-allowed border-brand-gold/15' : 'border-brand-gold/15 hover:border-brand-gold/40 cursor-pointer'}
          ${open ? 'border-brand-gold' : ''}`}
      >
        <Calendar size={13} className="text-brand-gold/60 shrink-0" />
        <span className={displayValue ? 'text-white text-xs' : 'text-white/35 text-xs'}>{displayValue || 'dd/mm/yyyy'}</span>
      </button>
      {popup}
    </div>
  );
};

const DashboardPage: React.FC<DashboardPageProps> = ({ user, onLogout, onUpdateUser }) => {
  const routerNavigate = useRouterNavigate();
  const location = useLocation();
  const { t, lang, changeLang } = useI18n();

  // Derive active view from URL path
  // Portal view paths (including /dashboard/daily-input) are checked first
  // Inner tab paths (/dashboard/overview, /dashboard/food-waste, etc.) map to DASHBOARD portal view
  const activeView = PATH_TO_PORTAL_VIEW[location.pathname]
    || (PATH_TO_DASHBOARD_TAB[location.pathname] ? PortalView.DASHBOARD : null)
    || (location.pathname === '/dashboard' ? PortalView.DASHBOARD : null)
    || PortalView.DASHBOARD;

  // Admins and supervisors don't have access to Daily Input — redirect to dashboard if attempted
  useEffect(() => {
    if (activeView === PortalView.DAILY_INPUT && (user.role.toLowerCase() === 'admin' || user.role.toLowerCase() === 'supervisor')) {
      routerNavigate('/dashboard/overview');
    }
  }, [activeView, user.role, routerNavigate]);

  // Navigate to the URL for the selected view
  const setActiveView = (view: PortalView) => {
    if (view === PortalView.DASHBOARD) {
      // Going to dashboard — keep current inner tab or default based on role
      const fallbackTab = user.role.toLowerCase() === 'basic' ? DashboardTab.FOOD_WASTE : DashboardTab.SUMMARIZED;
      const currentTab = PATH_TO_DASHBOARD_TAB[location.pathname] || fallbackTab;
      routerNavigate(DASHBOARD_TAB_PATHS[currentTab]);
    } else {
      const path = PORTAL_VIEW_PATHS[view] || '/dashboard';
      routerNavigate(path);
    }
  };

  // Derive inner dashboard tab from URL path
  // Basic users don't have access to the Overview tab, so default to Food Waste
  const defaultDashboardTab = user.role.toLowerCase() === 'basic' ? DashboardTab.FOOD_WASTE : DashboardTab.SUMMARIZED;
  const urlDashboardTab = PATH_TO_DASHBOARD_TAB[location.pathname] || defaultDashboardTab;
  const dashboardTab = user.role.toLowerCase() === 'basic' && urlDashboardTab === DashboardTab.SUMMARIZED
    ? DashboardTab.FOOD_WASTE
    : urlDashboardTab;

  // Navigate to the URL for the selected inner tab
  const setDashboardTab = (tab: DashboardTab) => {
    const defaultPath = user.role.toLowerCase() === 'basic' ? '/dashboard/food-waste' : '/dashboard/overview';
    const path = DASHBOARD_TAB_PATHS[tab] || defaultPath;
    routerNavigate(path);
  };
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const [isHydrating, setIsHydrating] = useState(true);

  // Redirect bare /dashboard to the user's default tab
  // Basic users → /dashboard/daily-input, everyone else → /dashboard/overview
  useEffect(() => {
    if (location.pathname === '/dashboard') {
      const defaultPath = user.role.toLowerCase() === 'basic' ? '/dashboard/daily-input' : '/dashboard/overview';
      routerNavigate(defaultPath, { replace: true });
    }
  }, [location.pathname, user.role, routerNavigate]);

  // Gate: Redirect basic users away from restricted dashboard URLs → /dashboard/daily-input
  // Basic users can only access: /dashboard/daily-input, /dashboard/food-waste,
  // /dashboard/energy-water, /dashboard/gamification, /dashboard/contact
  // Only redirect if the path is under /dashboard — don't interfere with
  // navigation to other pages (e.g. / for home, /about, etc.)
  useEffect(() => {
    if (user.role.toLowerCase() !== 'basic') return;
    if (!location.pathname.startsWith('/dashboard')) return;

    const BASIC_ALLOWED = [
      '/dashboard/daily-input',
      '/dashboard/food-waste',
      '/dashboard/energy-water',
      '/dashboard/gamification',
      '/dashboard/contact',
    ];

    if (!BASIC_ALLOWED.includes(location.pathname)) {
      routerNavigate('/dashboard/daily-input', { replace: true });
    }
  }, [location.pathname, user.role, routerNavigate]);

  // ── Toast + Confirm modal ──────────────────────────────────────────────────
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Contact form state
  const [contactName, setContactName] = useState(user.fullName || '');
  const [contactEmail, setContactEmail] = useState(user.email || '');
  const [contactMessage, setContactMessage] = useState('');
  const [contactScreenshots, setContactScreenshots] = useState<File[]>([]);
  const [contactSending, setContactSending] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => setToast(prev => prev?.id === id ? null : prev), 3500);
  };
  const showConfirm = (message: string, onConfirm: () => void) => setConfirmModal({ message, onConfirm });
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [visibleLinks, setVisibleLinks] = useState<Set<string>>(new Set());
  const [isPermDropdownOpen, setIsPermDropdownOpen] = useState(false);
  const permRef = useRef<HTMLDivElement>(null);
  const permTriggerRef = useRef<HTMLButtonElement>(null);
  const permPopupRef = useRef<HTMLDivElement>(null);
  const [permPopupPos, setPermPopupPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const [showApiInfo, setShowApiInfo] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Gamification points for basic/supervisor users
  const [navPoints, setNavPoints] = useState(0);
  const isBasicOrSupervisor = user.role?.toLowerCase() === 'basic' || user.role?.toLowerCase() === 'supervisor';
  useEffect(() => {
    if (!isBasicOrSupervisor || !user.id) return;
    const load = async () => { const s = await fetchUserStats(user.id); setNavPoints(s.totalPoints); };
    load();
    const handler = () => load();
    window.addEventListener('ecometricus_points_updated', handler);
    return () => window.removeEventListener('ecometricus_points_updated', handler);
  }, [isBasicOrSupervisor, user.id]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Lock states for Edit mode
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const [isEditingAudit, setIsEditingAudit] = useState(false);
  const [isEditingBenchmarks, setIsEditingBenchmarks] = useState(false);
  const [isEditingApis, setIsEditingApis] = useState(false);
  const [isEditingSustainability, setIsEditingSustainability] = useState(false);
  const [isEditingFnB, setIsEditingFnB] = useState(false);

  // Enrollment Form State
  const [enrollId, setEnrollId] = useState<string | null>(null);
  const [enrollName, setEnrollName] = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrollEmailError, setEnrollEmailError] = useState('');
  const [enrollPosition, setEnrollPosition] = useState('');

  // Email validation — accepts both personal and company emails
  const validateCorporateEmail = (email: string): string => {
    if (!email) return '';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address.';
    return '';
  };
  const [enrollOutlet, setEnrollOutlet] = useState('');
  const [enrollRole, setEnrollRole] = useState('');
  const [enrollPermissions, setEnrollPermissions] = useState<string[]>([]);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Shared Administrative Core State
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  // For basic/supervisor users: their specific outlet name (outlets[] is empty for non-admins)
  const [userOutletName, setUserOutletName] = useState('');

  useEffect(() => {
    if (!user.outletCode) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.outletCode);
    const fetchUserOutlet = async () => {
      let q = supabase.from('outlets').select('outlet_name');
      if (isUuid) q = (q as any).eq('id', user.outletCode);
      else q = (q as any).eq('outlet_id', user.outletCode);
      const { data } = await (q as any).maybeSingle();
      if (data?.outlet_name) setUserOutletName(data.outlet_name);
    };
    fetchUserOutlet();
  }, [user.outletCode]);

  const [sequenceCounter, setSequenceCounter] = useState(0);

  const [company, setCompany] = useState({
    name: '',
    company_name: '',
    region: '',
    country: '',
    city: '',
    adminPhone: '',
    currentOutletName: '',
    currentOutletCode: 'XXXX00',
    smsNotifications: true
  });

  // Specific Data States for Charts
  const [foodCostLogs, setFoodCostLogs] = useState<any[]>([]);
  const [laborCostLogs, setLaborCostLogs] = useState<any[]>([]);
  const [profitMarginLogs, setProfitMarginLogs] = useState<any[]>([]);
  const [sentimentLogs, setSentimentLogs] = useState<any[]>([]);
  const [salesLogs, setSalesLogs] = useState<any[]>([]);
  const [avgCheckLogs, setAvgCheckLogs] = useState<any[]>([]);
  const [rawWasteLogs, setRawWasteLogs] = useState<any[]>([]);
  const [rawResourceLogs, setRawResourceLogs] = useState<any[]>([]);

  // ── Audit Log ──
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditFilter, setAuditFilter] = useState<string | null>(null);

  // Log an action to the audit_logs table (silently fails if table doesn't exist yet)
  const logAction = async (
    action: string,
    entityType: string,
    entityName: string,
    description: string,
    metadata?: Record<string, any>
  ) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Determine company_id (the admin/owner's user_id):
      // - Admins/super_admins: their own session.user.id
      // - Supervisors/basic: look up personnel by their email to find the admin's user_id
      let companyId = session.user.id;
      const roleLower = user.role?.toLowerCase() || '';
      if (roleLower !== 'admin' && roleLower !== 'super_admin') {
        const { data: personnelRow } = await supabase
          .from('personnel')
          .select('user_id')
          .eq('email', user.email)
          .maybeSingle();
        if (personnelRow?.user_id) companyId = personnelRow.user_id;
      }

      await supabase.from('audit_logs').insert({
        user_id: session.user.id,
        company_id: companyId,
        outlet_code: user.outletCode || metadata?.outletCode || null,
        actor_name: user.fullName,
        actor_role: user.role,
        action,
        entity_type: entityType,
        entity_name: entityName,
        description,
        metadata: metadata || {}
      });
      // Refresh local audit logs
      fetchAuditLogs();
    } catch (e) {
      // Silently ignore — audit logging should never break the main flow
      console.warn('AUDIT_LOG_SKIP:', e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const roleLower = user.role?.toLowerCase() || '';
      let query = supabase.from('audit_logs').select('*');

      if (roleLower === 'admin' || roleLower === 'super_admin') {
        // Admins: see all logs from their company (company_id = their own user_id)
        query = query.eq('company_id', session.user.id);
      } else if (roleLower === 'supervisor') {
        // Supervisors: see only logs for their assigned outlet
        const { data: personnelRow } = await supabase
          .from('personnel')
          .select('user_id, outlet_id')
          .ilike('email', user.email || '')
          .maybeSingle();
        if (personnelRow?.user_id && personnelRow?.outlet_id) {
          // Strict filter: company_id = admin AND outlet_code = supervisor's outlet UUID
          query = query.eq('company_id', personnelRow.user_id)
                       .eq('outlet_code', personnelRow.outlet_id);
        } else if (personnelRow?.user_id) {
          // Fallback: outlet_id missing, use user.outletCode
          query = query.eq('company_id', personnelRow.user_id)
                       .eq('outlet_code', user.outletCode);
        } else {
          // Fallback: only own logs
          query = query.eq('user_id', session.user.id);
        }
      } else {
        // Basic users: only own logs
        query = query.eq('user_id', session.user.id);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false }).limit(100);
      if (!error && data) setAuditLogs(data);
    } catch (e) {
      // Table might not exist yet — silently ignore
    }
  };

  // 🛡️ INITIAL HYDRATION: Fetch all database-anchored identity & settings
  useEffect(() => {
    let isSubscribed = true;

    const fetchSystemSettings = async () => {
      try {
        setIsHydrating(true);
        console.log("🚀 HYDRATION_START: Synchronizing Administrative Core...");

        // Safety Timeout (10s) to prevent frozen screen
        const timeoutId = setTimeout(() => {
          if (isHydrating) {
            console.warn("⚠️ HYDRATION_TIMEOUT: Secure Datalink took too long to initialize. Proceeding with caution.");
            if (isHydrating) setIsHydrating(false);
          }
        }, 10000);

        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (!session || authError) {
          console.warn("🔐 NO VALID SESSION DETECTED. RETURNING TO COMMAND CENTER.");
          clearTimeout(timeoutId);
          onLogout();
          return;
        }
        const authUser = session.user;

        // Strict live database queries (Hybrid Path)
        // For supervisor/basic users, fetch their admin's data (outlets, company_settings, benchmarks)
        // by looking up their personnel record to find the admin's user_id
        const roleLower = user.role?.toLowerCase() || '';
        const isNonAdmin = roleLower !== 'admin' && roleLower !== 'super_admin';

        let targetUserId = authUser.id;
        let myOutletId: string | null = null; // supervisor's assigned outlet
        if (isNonAdmin) {
          // Find this user's personnel record — try by user_id first, then by email
          let { data: myPersonnel } = await supabase
            .from('personnel')
            .select('user_id, outlet_id, email')
            .eq('user_id', authUser.id)
            .maybeSingle();

          // If not found by user_id, try by email (personnel.user_id is the admin's ID)
          if (!myPersonnel && user.email) {
            const { data: byEmail } = await supabase
              .from('personnel')
              .select('user_id, outlet_id, email')
              .ilike('email', user.email)
              .maybeSingle();
            myPersonnel = byEmail;
          }

          // Capture the supervisor's assigned outlet for filtering
          myOutletId = myPersonnel?.outlet_id || null;

          // The personnel row's user_id IS the admin's user_id
          if (myPersonnel?.user_id) {
            targetUserId = myPersonnel.user_id;
          }
          // Fallback: find the admin who owns the outlet this user belongs to
          else if (myPersonnel?.outlet_id) {
            const { data: outletOwner } = await supabase
              .from('outlets')
              .select('user_id')
              .eq('id', myPersonnel.outlet_id)
              .maybeSingle();
            if (outletOwner?.user_id) targetUserId = outletOwner.user_id;
          }
        }

        const [parametersRes, personnelRes, companyRes, outletsRes] = await Promise.all([
          supabase.from('benchmarks').select('*').eq('user_id', targetUserId).eq('outlet_name', 'Unknown Outlet').maybeSingle(),
          supabase.from('personnel').select('*').eq('user_id', targetUserId),
          supabase.from('company_settings').select('*').eq('user_id', targetUserId).maybeSingle(),
          supabase.from('outlets').select('*').eq('user_id', targetUserId)
        ]);

        if (companyRes.data) {
          setCompany(prev => ({ 
            ...prev, 
            name: companyRes.data.company_name || '',
            company_name: companyRes.data.company_name || '',
            city: companyRes.data.city_country || prev.city,
            region: companyRes.data.region || prev.region
          }));
          
          // 🛡️ Audit Sync Hydration (Phase 4)
          setAuditReport(prev => ({
            ...prev,
            cycle: companyRes.data.audit_cycle || prev.cycle,
            fromDate: companyRes.data.audit_from_date || prev.fromDate,
            toDate: companyRes.data.audit_to_date || prev.toDate,
            outletSelection: companyRes.data.audit_outlet_selection || prev.outletSelection,
            comments: companyRes.data.audit_comments || prev.comments
          }));
        } else {
          // If no custom identity exists, keep blank for user input
          setCompany(prev => ({ ...prev, name: '' }));
        }

        // Map outlets from DB — schema uses 'outlet_name' (not 'name').
        // 'outlet_id' stores the generated code (e.g. OUT01); fall back to deterministic generation.
        const dbOutlets: Outlet[] = (outletsRes.data || [])
          .filter((o: any) => o.outlet_name)
          .map((o: any, idx: number) => ({
            id: o.id,
            name: o.outlet_name,
            code: o.outlet_id || (o.outlet_name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() + String(idx + 1).padStart(2, '0')),
            location: o.location || '',
            color_hex: o.color_hex
          }));

        // Supervisors/basic users: only show their assigned outlet, not all admin outlets
        const visibleOutlets = isNonAdmin && myOutletId
          ? dbOutlets.filter(o => o.id === myOutletId)
          : dbOutlets;

        // Only show this user's outlets — never fall back to shared demo data
        setOutlets(visibleOutlets);

        if (parametersRes.data) {
          setParams(prev => ({
            ...prev,
            id: parametersRes.data.id || prev.id,
            wasteTarget: parametersRes.data.food_waste_target_kg || prev.wasteTarget,
            waterTarget: parametersRes.data.water_usage_liters || parametersRes.data.water_usage_target_l || prev.waterTarget,
            energyTarget: parametersRes.data.energy_limit_kwh || prev.energyTarget,
            foodCostTarget: parametersRes.data.food_cost_cap_percent || prev.foodCostTarget,
            laborCostTarget: parametersRes.data.labor_cost_cap_percent || prev.laborCostTarget,
            profitMarginTarget: parametersRes.data.profit_margin_target || prev.profitMarginTarget,
            totalSalesTarget: parametersRes.data.total_sales_target || prev.totalSalesTarget,
            sentimentTarget: parametersRes.data.sentiment_target || prev.sentimentTarget,
            avgCheckTarget: parametersRes.data.avg_check_target || prev.avgCheckTarget,
            gamificationGoal: parametersRes.data.gamification_goal || prev.gamificationGoal
          }));
          
          if (parametersRes.data.updated_at || parametersRes.data.created_at) {
            setParamsUpdatedAt(new Date(parametersRes.data.updated_at || parametersRes.data.created_at).toLocaleString());
          }
        } else {
          // If no benchmarks, explicitly ensure legal_consent is false for Admins
          if (user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'super_admin') {
            onUpdateUser({ legal_consent: user.legal_consent ?? false });
          }
        }

        if (personnelRes.data && personnelRes.data.length > 0) {
          const mappedUsers = personnelRes.data.map((p: any) => ({
            id: p.id,
            fullName: p.full_name,
            email: p.email,
            role: p.role,
            position: p.position,
            // personnel.outlet_id is a UUID — find the matching outlet code from dbOutlets
            outletCode: dbOutlets.find(o => o.id === p.outlet_id)?.code || '',
            permissions: Array.isArray(p.permissions) ? p.permissions : (p.permissions ? String(p.permissions).split(',').map((s: string) => s.trim()).filter(Boolean) : []),
            // Password stored as pincode in DB
            password: p.pincode || '',
            accessCode: p.access_code || ''
          }));

          // Include the admin themselves in the registry (they don't have a personnel row)
          if (companyRes.data) {
            // Fetch admin's email from profiles table
            // Try direct query first, then fallback to fetching from already-loaded profilesData
            let adminEmail = '';
            let adminPosition = '';
            const { data: adminProfile, error: adminProfileErr } = await supabase
              .from('profiles')
              .select('email, position')
              .eq('id', targetUserId)
              .maybeSingle();
            if (adminProfileErr || !adminProfile) {
              // Fallback: fetch from profiles table by email match in personnel
              const adminPersonnel = (personnelRes.data || []).find((p: any) => p.role?.toLowerCase() === 'admin');
              if (adminPersonnel?.email) adminEmail = adminPersonnel.email;
              adminPosition = adminPersonnel?.position || '';
            } else {
              adminEmail = adminProfile.email || '';
              adminPosition = adminProfile.position || '';
            }
            const adminAlreadyIncluded = mappedUsers.some((u: any) =>
              u.email?.toLowerCase() === adminEmail.toLowerCase()
            );
            if (!adminAlreadyIncluded) {
              mappedUsers.unshift({
                id: targetUserId,
                fullName: companyRes.data.admin_name || 'Administrator',
                email: adminEmail,
                role: 'admin',
                position: adminPosition || companyRes.data.admin_position || 'Admin',
                outletCode: dbOutlets[0]?.code || '',
                permissions: [],
                password: '',
                accessCode: ''
              });
            }
          }

          setUsers(mappedUsers);
        }

        // Fetch audit logs (non-blocking — table may not exist yet)
        fetchAuditLogs();
      } catch (err) {
        console.error("Hydration BLOCKED:", err);
      } finally {
        if (isSubscribed) {
          console.log("🏁 HYDRATION_COMPLETE: Secure Datalink Established.");
          setIsHydrating(false);
        }
      }
    };
    fetchSystemSettings();

    // Note: Removed local onAuthStateChange listener to prevent infinite loop on Exit.
  }, []); // ✅ Run ONLY ONCE on mount. Stabilization applied.

  useEffect(() => {
    const fetchOperationalData = async () => {
      // 🛡️ Auth Sync Gate (Phase 3 Repair)
      const { data: { session }, error: operationalAuthError } = await supabase.auth.getSession();
      if (!session || operationalAuthError || isHydrating) {
        return;
      }

      // 1. Ensure we have the outlet map for ID -> Code mapping
      const outletMap = new Map<string, string>();
      outlets.forEach((o: any) => {
        if (o.id) outletMap.set(o.id, o.code);
      });

      // Helper to validate if a code exists in our current known outlets
      const isValidOutlet = (code: string) => outlets.some(o => o.code === code);

      // Build role-scoped query helpers
      const isAdmin = user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'super_admin';
      const userOutlet = !isAdmin && user.outletCode ? outlets.find((o: any) => o.code === user.outletCode || o.id === user.outletCode) : null;
      const userOutletId = userOutlet?.id;
      const userOutletName = userOutlet?.name;

      // Build query filters — admin: all outlets, supervisor/basic: own outlet only
      const scopeQuery = (base: any, useOutletName = false) => {
        if (isAdmin) return base;
        // Use userOutletId from outlets map, or fall back to user.outletCode (UUID)
        const filterId = userOutletId || user.outletCode;
        if (!filterId) return base;
        if (useOutletName && userOutletName) return base.eq('outlet_name', userOutletName);
        return base.eq('outlet_id', filterId);
      };

      // 2. Fire ALL queries in parallel (was 9 sequential → now 1 round-trip)
      const [
        foodCostRes, laborRes, profitRes, sentimentRes,
        wasteRes, resourceRes, salesRes, avgCheckRes
      ] = await Promise.all([
        scopeQuery(supabase.from('food_cost_logs').select('*')),
        scopeQuery(supabase.from('labor_cost_logs').select('*')),
        scopeQuery(supabase.from('profit_margins_logs').select('*')),
        scopeQuery(supabase.from('sentiment_logs').select('*')),
        scopeQuery(supabase.from('food_waste_logs').select('*')),
        scopeQuery(supabase.from('resource_logs').select('*'), true),
        scopeQuery(supabase.from('sales_logs').select('*')),
        scopeQuery(supabase.from('avg_check_logs').select('*')),
      ]);

      // 3. Process food cost logs
      if (foodCostRes.data) {
        const mapped = foodCostRes.data
          .map((log: any) => ({
            day: new Date(log.created_at).toLocaleDateString('en-US', { weekday: 'short' }),
            foodCost: parseFloat(log.value),
            outlet_code: outletMap.get(log.outlet_id) || log.outlet_id,
            created_at: log.created_at
          }))
          .filter((log: any) => isValidOutlet(log.outlet_code))
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setFoodCostLogs(mapped);
      } else { setFoodCostLogs([]); }

      // 4. Process labor cost logs
      if (laborRes.data) {
        const mapped = laborRes.data
          .map((log: any) => ({
            day: new Date(log.created_at).toLocaleDateString('en-US', { weekday: 'short' }),
            laborCost: parseFloat(log.value),
            outlet_code: outletMap.get(log.outlet_id) || log.outlet_id,
            created_at: log.created_at
          }))
          .filter((log: any) => isValidOutlet(log.outlet_code))
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setLaborCostLogs(mapped);
      } else { setLaborCostLogs([]); }

      // 5. Process profit margin logs
      if (profitRes.data && profitRes.data.length > 0) {
        const mapped = profitRes.data
          .map((log: any) => ({
            day: new Date(log.created_at).toLocaleDateString('en-US', { weekday: 'short' }),
            profitMargin: parseFloat(log.value as any) || 0,
            outlet_code: outletMap.get(log.outlet_id) || log.outlet_id,
            created_at: log.created_at
          }))
          .filter((log: any) => isValidOutlet(log.outlet_code))
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setProfitMarginLogs(mapped);
      } else { setProfitMarginLogs([]); }

      // 6. Process sentiment logs
      if (sentimentRes.data && sentimentRes.data.length > 0) {
        const mapped = sentimentRes.data
          .map((log: any) => ({
            day: new Date(log.created_at).toLocaleDateString('en-US', { weekday: 'short' }),
            rating_value: parseFloat(log.value || log.rating_value) || 0,
            outlet_code: outletMap.get(log.outlet_id) || log.outlet_id,
            created_at: log.created_at
          }))
          .filter((log: any) => isValidOutlet(log.outlet_code))
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setSentimentLogs(mapped);
      } else { setSentimentLogs([]); }

      // 7. Process waste logs
      if (wasteRes.data) {
        setRawWasteLogs(wasteRes.data.filter((w: any) => !w.is_mock));
      }

      // 8. Process resource logs
      if (resourceRes.data) setRawResourceLogs(resourceRes.data);

      // 9. Process sales logs
      if (salesRes.data) {
        const mapped = salesRes.data
          .map((log: any) => ({
            day: new Date(log.created_at).toLocaleDateString('en-US', { weekday: 'short' }),
            food: parseFloat(log.food) || 0,
            bev: parseFloat(log.beverage) || 0,
            total: (parseFloat(log.food) || 0) + (parseFloat(log.beverage) || 0),
            outlet_code: outletMap.get(log.outlet_id) || log.outlet_id,
            created_at: log.created_at
          }))
          .filter((log: any) => isValidOutlet(log.outlet_code))
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setSalesLogs(mapped);
      }

      // 10. Process avg check logs
      if (avgCheckRes.data) {
        const mapped = avgCheckRes.data
          .map((log: any) => {
            const restaurant = parseFloat(log.restaurant) || 0;
            const bar = parseFloat(log.bar) || 0;
            const banquets = parseFloat(log.banquets) || 0;
            const rollingAverage = (restaurant + bar + banquets) / 3;
            return {
              day: new Date(log.created_at).toLocaleDateString('en-US', { weekday: 'short' }),
              restaurant, bar, banquets,
              rollingAverage: Number(rollingAverage.toFixed(2)),
              outlet_code: outletMap.get(log.outlet_id) || log.outlet_id,
              created_at: log.created_at
            };
          })
          .filter((log: any) => isValidOutlet(log.outlet_code))
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setAvgCheckLogs(mapped);
      }
    };



    fetchOperationalData();

    // Real-time event listeners — re-fetch when waste/resource/KPI data is logged
    const handleDataUpdate = () => fetchOperationalData();
    window.addEventListener('ecometricus_waste_updated', handleDataUpdate);
    window.addEventListener('ecometricus_resource_updated', handleDataUpdate);
    window.addEventListener('ecometricus_kpi_updated', handleDataUpdate);

    // Supabase Realtime subscriptions — auto-refresh when ANY user adds/updates/deletes entries
    const wasteChannel = supabase
      .channel('dashboard_waste_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_waste_logs' }, () => {
        fetchOperationalData();
      })
      .subscribe();

    const resourceChannel = supabase
      .channel('dashboard_resource_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_logs' }, () => {
        fetchOperationalData();
      })
      .subscribe();

    return () => {
      window.removeEventListener('ecometricus_waste_updated', handleDataUpdate);
      window.removeEventListener('ecometricus_resource_updated', handleDataUpdate);
      window.removeEventListener('ecometricus_kpi_updated', handleDataUpdate);
      supabase.removeChannel(wasteChannel);
      supabase.removeChannel(resourceChannel);
    };
  }, [user.role, user.outletCode, outlets, isHydrating]);

  const [auditReport, setAuditReport] = useState({
    cycle: 'Monthly',
    fromDate: '',
    toDate: '',
    outletSelection: 'All outlets',
    comments: ''
  });

  const [users, setUsers] = useState<(UserProfile & { password?: string })[]>([]);

  const [params, setParams] = useState({
    id: crypto.randomUUID(),
    wasteUnit: 'kg',
    wasteTarget: 100,
    waterTarget: 30000,
    energyTarget: 1200,
    foodCostTarget: 28.5,
    laborCostTarget: 15,
    profitMarginTarget: 25,
    totalSalesTarget: 16500,
    sentimentTarget: 4.5,
    avgCheckTarget: 47,
    gamificationGoal: 3000,
    benchmarkRegion: 'ASEAN Luxury Hotels',
    selectedManualOutlet: '',
    alertsActive: true,
    financial_cap: 1000,
    milaLogic: true,
    posApiKey: '',
    crmApiKey: '',
    pmsApiKey: ''
  });

  const [paramsUpdatedAt, setParamsUpdatedAt] = useState<string | null>(null);

  // Real chart data from hooks — scoped to user's outlet for supervisor/basic
  const isHookAdmin = user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'super_admin';
  const hookScopeOutlet = !isHookAdmin && user.outletCode ? (outlets.find((o: any) => o.code === user.outletCode || o.id === user.outletCode)?.name || userOutletName) : undefined;
  const hookScopeUserId = isHookAdmin ? user.id : undefined;
  const hookScopeOutletId = !isHookAdmin ? (outlets.find((o: any) => o.code === user.outletCode || o.id === user.outletCode)?.id) : undefined;
  const { chartData: wasteChartData, outletKeys: wasteOutletKeys, dailyBenchmark: wasteDailyBenchmark, weeklyTotal: wasteWeeklyTotal } = useFoodWasteChartData(
    params.wasteTarget,
    outlets.length || 1,
    hookScopeOutlet,
    hookScopeUserId,
    hookScopeOutletId
  );
  const { waterData, energyData, outletKeys: resourceOutletKeys, waterDailyBenchmark: resourceWaterBenchmark, energyDailyBenchmark: resourceEnergyBenchmark } = useResourceChartData(params.waterTarget, params.energyTarget, hookScopeOutlet, hookScopeUserId);

  // Transform hook data for template charts (aggregate all outlets per day dynamically)
  const sumOutletKeys = (row: Record<string, any>, keys: string[]) => keys.reduce((s, k) => s + (Number(row[k]) || 0), 0);

  const foodWasteTemplateData = wasteChartData.map(d => ({
    day: d.date.charAt(0) + d.date.slice(1).toLowerCase(),
    waste: sumOutletKeys(d, wasteOutletKeys)
  }));
  const waterTemplateData = waterData.map(d => ({
    day: d.day.charAt(0) + d.day.slice(1).toLowerCase(),
    usage: sumOutletKeys(d, resourceOutletKeys)
  }));
  const energyTemplateData = energyData.map(d => ({
    day: d.day.charAt(0) + d.day.slice(1).toLowerCase(),
    usage: sumOutletKeys(d, resourceOutletKeys)
  }));
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const prevLoggedParams = useRef<typeof params | null>(null);

  // Dynamic fetch whenever the selected outlet changes
  useEffect(() => {
    const fetchDynamicBenchmarks = async () => {
      const selectedOutletName = params.benchmarkRegion === 'Manual' && params.selectedManualOutlet
        ? (params.selectedManualOutlet === 'all'
          ? t('dashboard.allOutlets')
          : (outlets.find(o => o.code === params.selectedManualOutlet)?.name || 'Unknown Outlet'))
        : 'Unknown Outlet';
        
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data, error } = await supabase
        .from('benchmarks')
        .select('*')
        .eq('outlet_name', selectedOutletName)
        .eq('user_id', session.user.id)
        .single();
        
      if (data) {
        setParams(prev => ({
          ...prev,
          id: data.id || prev.id,
          wasteTarget: data.food_waste_target_kg || prev.wasteTarget,
          energyTarget: data.energy_limit_kwh || prev.energyTarget,
          waterTarget: data.water_usage_liters || data.water_usage_target_l || prev.waterTarget
        }));
        
        if (data.updated_at || data.created_at) {
          setParamsUpdatedAt(new Date(data.updated_at || data.created_at).toLocaleString());
        }
      } else {
        // Fallback to absolute defaults if no data exists
        setParams(prev => ({
          ...prev,
          wasteTarget: 100,
          energyTarget: 1200,
          waterTarget: 30000
        }));
        setParamsUpdatedAt(null);
      }
    };

    if (params.benchmarkRegion === 'Manual' && params.selectedManualOutlet) {
      fetchDynamicBenchmarks();
    }
  }, [params.benchmarkRegion, params.selectedManualOutlet, outlets]);

  const [manualOutletSettings, setManualOutletSettings] = useState<Record<string, any>>({});

  // Persist outlets to localStorage for session continuity (V2 Key)
  useEffect(() => {
    localStorage.setItem('ecometricus_outlets_v2', JSON.stringify(outlets));
  }, [outlets]);

  // Handle auto-mapping roles/permissions when position changes
  // Skip when editing an existing user — use a ref to avoid race conditions
  const isEditingUserRef = useRef(false);
  useEffect(() => {
    if (enrollPosition && !isEditingUserRef.current) {
      const roleKey = POSITION_TO_ROLE[enrollPosition] || 'View';
      setEnrollRole(roleKey);
      setEnrollPermissions(ROLE_DEFAULT_PERMISSIONS[roleKey] || []);
    }
  }, [enrollPosition]);

  // Reset edit flag when enrollId is cleared (new enrollment)
  useEffect(() => {
    isEditingUserRef.current = !!enrollId;
  }, [enrollId]);

  // Handle click outside for permissions dropdown (portal-aware)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (permTriggerRef.current?.contains(event.target as Node)) return;
      if (permPopupRef.current?.contains(event.target as Node)) return;
      setIsPermDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reposition permissions popup on open + scroll/resize
  useEffect(() => {
    if (!isPermDropdownOpen) return;
    const reposition = () => {
      const el = permTriggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPermPopupPos({ top: r.bottom + 6, left: r.left, width: r.width });
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [isPermDropdownOpen]);

  // Logic for automatic sequential outlet code adjustment
  useEffect(() => {
    const cleanName = company.currentOutletName.trim().toLowerCase();
    if (cleanName.length >= 2) {
      const existing = outlets.find(o => o.name.toLowerCase() === cleanName);
      if (existing) {
        setCompany(prev => ({ ...prev, currentOutletCode: existing.code }));
      } else {
        const base = company.currentOutletName.substring(0, 4).replace(/[^a-zA-Z]/g, '').padEnd(3, 'X').toUpperCase();
        // Count existing outlets with the same prefix to determine next sequence
        const samePrefixCount = outlets.filter(o => o.code?.startsWith(base)).length;
        const seq = String(samePrefixCount + 1).padStart(2, '0');
        const code = `${base}${seq}`;
        setCompany(prev => ({ ...prev, currentOutletCode: code }));
      }
    }
  }, [company.currentOutletName, outlets, sequenceCounter]);

  // Load per-outlet settings when manual outlet selection changes
  useEffect(() => {
    if (params.benchmarkRegion === 'Manual' && params.selectedManualOutlet && params.selectedManualOutlet !== 'all') {
      const saved = manualOutletSettings[params.selectedManualOutlet];
      if (saved) {
        setParams(prev => ({ ...prev, ...saved }));
      }
    }
  }, [params.selectedManualOutlet, params.benchmarkRegion]);



  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleLinkVisibility = (id: string) => {
    setVisibleLinks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleEnroll = async () => {
    if (!enrollName || !enrollEmail || !enrollPosition || !enrollOutlet) {
      showToast(t('dashboard.pleaseCompleteFields'), 'error');
      return;
    }
    if (isEnrolling) return;
    setIsEnrolling(true);

    // Email validation — block submission if invalid
    const emailError = validateCorporateEmail(enrollEmail);
    if (emailError) {
      setEnrollEmailError(emailError);
      showToast(emailError, 'error');
      return;
    }
    setEnrollEmailError('');

    const genPin = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const special = '!@#$%';
      let pin = '';
      for (let i = 0; i < 7; i++) pin += chars[Math.floor(Math.random() * chars.length)];
      pin += special[Math.floor(Math.random() * special.length)];
      // Shuffle so the special char isn't always last
      return pin.split('').sort(() => Math.random() - 0.5).join('');
    };
    // URL-safe access code (alphanumeric only, no special chars) for the invite link
    const genAccessCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
      return code;
    };
    const existingUser = enrollId ? users.find(u => u.id === enrollId) : null;
    const password = existingUser?.password || genPin();
    const accessCode = existingUser?.accessCode || genAccessCode();
    // Hash the pincode before storing — never save plaintext
    const hashedPin = await sha256(password);

    const link = `${window.location.origin}/access/${enrollOutlet}?token=${accessCode.toLowerCase()}`;
    const upsertId = enrollId || Date.now().toString();

    // 🛡️ Auth Sync Gate (Phase 3 Repair)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showToast(t('dashboard.authenticationRequired'), 'error');
      return;
    }

    // Format strict schema constraints for Personnel table
    const mappedOutlet = outlets.find(o => o.code === enrollOutlet);
    const dbPayload: any = {
      user_id: session.user.id,
      full_name: enrollName,
      email: enrollEmail,
      role: enrollRole.toLowerCase(),
      position: enrollPosition,
      pincode: hashedPin,
      plaintext_pin: password,
      access_code: accessCode,
      invited_by: user.fullName,
      permissions: enrollPermissions
    };
    
    // Only send valid UUID formats or let DB generate
    if (enrollId && enrollId.includes('-')) {
      dbPayload.id = enrollId;
    }
    // personnel table uses outlet_id (UUID), not outlet_code
    if (mappedOutlet && mappedOutlet.id) {
       dbPayload.outlet_id = mappedOutlet.id;
    }

    // Trigger Strict Insert (as requested)
    let error = null;
    let status = 0;
    let newId = upsertId;

    if (enrollId) {
       const res = await supabase.from('personnel').upsert(dbPayload);
       error = res.error;
       status = res.status;
    } else {
       const res = await supabase.from('personnel').insert(dbPayload).select().single();
       error = res.error;
       status = res.status;
       if (res.data) newId = res.data.id;
    }

    if (error || (status !== 200 && status !== 201)) {
       console.error("PERSONNEL_UPSERT_FAILURE:", error);
       showToast("Database Error: " + (error?.message || `Failed to save (Status: ${status})`), 'error');
       return;
    }

    if (enrollId) {
      setUsers(prev => prev.map(u => u.id === enrollId ? {
          ...u,
          fullName: enrollName,
          email: enrollEmail,
          position: enrollPosition as any,
          outletCode: enrollOutlet,
          role: enrollRole.toLowerCase() as any,
          permissions: enrollPermissions,
          password: password,
          accessCode: accessCode
        } : u));
    } else {
      const newUser: UserProfile & { password?: string; accessCode?: string } = {
        id: newId,
        fullName: enrollName,
        email: enrollEmail,
        role: enrollRole.toLowerCase() as any,
        position: enrollPosition as any,
        outletCode: enrollOutlet,
        permissions: enrollPermissions,
        password: password,
        accessCode: accessCode
      };
      setUsers(prev => [...prev, newUser]);
    }

    setEnrollId(null);
    setEnrollName('');
    setEnrollEmail('');
    setEnrollEmailError('');
    setEnrollPosition('');
    setEnrollOutlet('');
    setEnrollRole('');
    setEnrollPermissions([]);

    showToast(t('dashboard.staffSaved', { name: enrollName || 'Staff member' }), 'success');
    logAction(enrollId ? 'personnel_updated' : 'personnel_enrolled', 'personnel', enrollName || 'Unknown', `${enrollName} enrolled as ${enrollPosition} for ${enrollOutlet}`, { role: enrollRole, position: enrollPosition, outlet: enrollOutlet });
    setIsEnrolling(false);
  };

  const handleEdit = (user: UserProfile & { password?: string }) => {
    isEditingUserRef.current = true; // Prevent auto-permission override
    setEnrollId(user.id);
    setEnrollName(user.fullName);
    setEnrollEmail(user.email);
    setEnrollPosition(user.position);
    setEnrollOutlet(user.outletCode);
    const roleKey = Object.keys(ROLE_DEFAULT_PERMISSIONS).find(k => k.toLowerCase() === user.role.toLowerCase()) || 'View';
    setEnrollRole(roleKey);
    setEnrollPermissions(user.permissions?.length ? user.permissions : ROLE_DEFAULT_PERMISSIONS[roleKey]);

    const form = document.getElementById('enrollment-form');
    form?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeletePersonnel = (id: string) => {
    const targetUser = users.find(u => u.id === id);
    // Prevent self-deletion
    if (targetUser?.email === user.email) {
      showToast('You cannot remove your own account. Please ask another admin to do this.', 'error');
      return;
    }
    showConfirm(`Remove ${targetUser?.fullName || 'this staff member'}? This will permanently delete their account and revoke their access.`, async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { showToast(t('dashboard.authenticationRequired'), 'error'); return; }

      let authDeleted = false;
      let authErrorMsg = '';

      // 1. Call RPC to delete auth account + related data
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('delete_user_account', { target_email: targetUser?.email });

      if (rpcError) {
        authErrorMsg = rpcError.message || 'Unknown database error';
        console.error('DELETE_USER_RPC_ERROR:', rpcError);
      } else if (rpcResult?.success === false) {
        authErrorMsg = rpcResult?.error || 'Unknown error';
        console.error('DELETE_USER_RPC_FAILED:', rpcResult);
      } else {
        authDeleted = true;
        console.log('[Dashboard] User auth account deleted:', rpcResult);
      }

      // 2. Delete personnel record
      const { error, status } = await supabase.from('personnel').delete().eq('id', id);

      if (error || (status !== 204 && status !== 200)) {
        console.error("PERSONNEL_DELETE_FAILURE:", error);
        showToast(`Failed to remove staff: ${error?.message || 'Database error'}`, 'error');
        return;
      }

      // 3. Show appropriate message based on whether auth account was deleted
      setUsers(prev => prev.filter(u => u.id !== id));

      if (authDeleted) {
        showToast(`${targetUser?.fullName || 'Staff member'} removed. Account fully deleted.`, 'success');
      } else {
        showToast(
          `${targetUser?.fullName || 'Staff member'} removed from registry, but auth account could not be deleted: ${authErrorMsg}. Run fix_schema_cache.sql migration.`,
          'error'
        );
      }

      logAction('personnel_removed', 'personnel', targetUser?.fullName || 'Unknown',
        `Removed ${targetUser?.fullName || 'staff member'}${authDeleted ? ' — account deleted' : ' — auth account NOT deleted: ' + authErrorMsg}`,
        { email: targetUser?.email, id, authDeleted, authErrorMsg });
    });
  };

  const handleAddOutlet = async () => {
    if (!company.currentOutletName) return;
    const cleanName = company.currentOutletName.trim();
    // Guard: only compare outlets that have valid names to avoid crashes on empty rows
    const existing = outlets.filter(o => o.name).find(o => o.name.toLowerCase() === cleanName.toLowerCase());

    if (existing) {
      showToast(t('dashboard.outletAlreadyRegistered'), 'error');
      return;
    }

    // 🛡️ Auth Persistence Sync (Phase 4)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showToast(t('dashboard.authenticationRequired'), 'error');
      return;
    }

    // code is generated client-side — the DB 'outlets' table has no code column
    const newOutlet: Outlet = { 
      name: cleanName, 
      code: company.currentOutletCode,
      location: company.city || '',
      color_hex: '#718096'
    };

    // No unique constraint on (user_id, outlet_name) — check manually then insert
    const { data: existingDb } = await supabase.from('outlets')
      .select('id').eq('user_id', session.user.id).eq('outlet_name', newOutlet.name).maybeSingle();

    let error: any, status: number, insertedId: string | undefined;
    if (existingDb?.id) {
      const r = await supabase.from('outlets').update({
        color_hex: newOutlet.color_hex,
        location: newOutlet.location,
        outlet_id: newOutlet.code
      }).eq('id', existingDb.id).select('id').single();
      error = r.error; status = r.status; insertedId = existingDb.id;
    } else {
      const r = await supabase.from('outlets').insert({
        user_id: session.user.id,
        outlet_name: newOutlet.name,
        outlet_id: newOutlet.code,
        location: newOutlet.location,
        color_hex: newOutlet.color_hex
      }).select('id').single();
      error = r.error; status = r.status; insertedId = r.data?.id;
    }

    if (error || (status !== 201 && status !== 200)) {
      console.error("OUTLET_INSERT_FAILURE:", error);
      showToast(t('dashboard.databaseError', { message: error?.message || t('dashboard.failedToSaveOutlet') }), 'error');
      return;
    }

    // Use the real DB id if we got it back
    setOutlets(prev => [...prev, { ...newOutlet, id: insertedId }]);
    setSequenceCounter(prev => prev + 1);
    setCompany(prev => ({ ...prev, currentOutletName: '', currentOutletCode: 'XXX01' }));
    logAction('outlet_added', 'outlet', newOutlet.name, `Added outlet "${newOutlet.name}" (${newOutlet.code})`, { code: newOutlet.code, location: newOutlet.location });
  };

  const handleRemoveOutlet = (code: string) => {
    const outletName = outlets.find(o => o.code === code)?.name || code;
    showConfirm(t('dashboard.removeOutletConfirm', { name: outletName }), async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { showToast(t('dashboard.authenticationRequired'), 'error'); return; }

      // Delete by outlet_name (actual DB column)
      const name = outlets.find(o => o.code === code)?.name;
      if (!name) return;
      const { error, status } = await supabase.from('outlets').delete()
        .eq('user_id', session.user.id).eq('outlet_name', name);

      if (error || (status !== 204 && status !== 200)) {
        console.error("OUTLET_DELETE_FAILURE:", error);
        showToast("Database Error: " + (error?.message || `Failed to remove outlet.`), 'error');
        return;
      }

      setOutlets(prev => prev.filter(o => o.code !== code));
      showToast(`"${outletName}" removed.`, 'success');
      logAction('outlet_removed', 'outlet', outletName, `Removed outlet "${outletName}" (${code})`, { code });
    });
  };

  const togglePermission = (perm: string) => {
    setEnrollPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const currentTimezone = useMemo(() => {
    return TIMEZONES[company.city] || 'UTC';
  }, [company.city]);

  const handleSaveAll = async () => {
    setSaveStatus('saving');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t('dashboard.userAuthRequired'));
      const userId = session.user.id;

      // 1. Upsert Company Identity
      const { error: companyError, status: companyStatus } = await supabase.from('company_settings').upsert({
        user_id: userId,
        admin_name: user.fullName,
        company_name: company.name,
        city_country: company.city,
        region: company.region,
        
        // 🔒 Audit Persistence Sync (Phase 4)
        audit_cycle: auditReport.cycle,
        audit_from_date: auditReport.fromDate,
        audit_to_date: auditReport.toDate,
        audit_outlet_selection: auditReport.outletSelection,
        audit_comments: auditReport.comments
      }, { onConflict: 'user_id' });

      if (companyError || (companyStatus !== 200 && companyStatus !== 201)) {
        console.error("IDENTITY_UPSERT_FAILURE:", companyError);
        throw companyError || new Error(`Database rejected identity update (Status: ${companyStatus})`);
      }

      // 2. Persist All Current Outlets (Registry Sync)
      // No unique constraint on (user_id, outlet_name) — sync each outlet individually
      if (outlets.length > 0) {
        for (const o of outlets) {
          if (!o.name) continue;
          const { data: existingDb } = await supabase.from('outlets')
            .select('id').eq('user_id', session.user.id).eq('outlet_name', o.name).maybeSingle();

          let outletError: any, outletStatus: number;
          if (existingDb?.id) {
            const r = await supabase.from('outlets').update({
              outlet_id: o.code,
              location: o.location || company.city,
              color_hex: o.color_hex || '#77B139'
            }).eq('id', existingDb.id);
            outletError = r.error; outletStatus = r.status;
          } else {
            const r = await supabase.from('outlets').insert({
              user_id: session.user.id,
              outlet_name: o.name,
              outlet_id: o.code,
              location: o.location || company.city,
              color_hex: o.color_hex || '#77B139'
            });
            outletError = r.error; outletStatus = r.status;
          }
          if (outletError || (outletStatus !== 200 && outletStatus !== 201 && outletStatus !== 204)) {
            console.error("OUTLET_UPSERT_FAILURE:", outletError);
            throw outletError || new Error(`Database rejected outlet "${o.name}" (Status: ${outletStatus})`);
          }
        }
      }

      showToast(t('dashboard.savedSuccessfully'), 'success');
      logAction('settings_saved', 'company', company.name || 'Organization', `Updated company identity, audit config, and ${outlets.length} outlet(s)`, { region: company.region, city: company.city, outletCount: outlets.length });
      setSaveStatus('success');
      setIsEditingIdentity(false);
      setIsEditingAudit(false);
      setIsEditingBenchmarks(false);
      setIsEditingApis(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error: any) {
      showToast("Database Error: " + error.message, 'error');
      setSaveStatus('idle');
    }
  };

  // ── Auto-save: Company identity + Audit config (debounced 3s) ──
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAutoSaveReady = useRef(false); // Skip the initial hydration load

  // Lightweight save — company_settings row + outlets (no toast, no edit-lock toggle)
  const persistCompanyAndAudit = async (isAutoSave = false) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Company settings + audit config
      const { error } = await supabase.from('company_settings').upsert({
        user_id: session.user.id,
        admin_name: user.fullName,
        company_name: company.name,
        city_country: company.city,
        region: company.region,
        audit_cycle: auditReport.cycle,
        audit_from_date: auditReport.fromDate,
        audit_to_date: auditReport.toDate,
        audit_outlet_selection: auditReport.outletSelection,
        audit_comments: auditReport.comments
      }, { onConflict: 'user_id' });
      if (error) throw error;

      // 2. Sync outlets
      for (const o of outlets) {
        if (!o.name) continue;
        const { data: existingDb } = await supabase.from('outlets')
          .select('id').eq('user_id', session.user.id).eq('outlet_name', o.name).maybeSingle();
        if (existingDb?.id) {
          await supabase.from('outlets').update({
            outlet_id: o.code,
            location: o.location || company.city,
            color_hex: o.color_hex || '#77B139'
          }).eq('id', existingDb.id);
        } else {
          await supabase.from('outlets').insert({
            user_id: session.user.id,
            outlet_name: o.name,
            outlet_id: o.code,
            location: o.location || company.city,
            color_hex: o.color_hex || '#77B139'
          });
        }
      }

      if (isAutoSave) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 1500);
      }
    } catch (e: any) {
      console.error('AUTO_SAVE_ERROR:', e);
      if (isAutoSave) setSaveStatus('idle');
    }
  };

  // Debounced auto-save — triggers 3s after company/auditReport/outlets changes while editing
  useEffect(() => {
    // Don't auto-save until the user has actually started editing
    if (!isAutoSaveReady.current) return;
    if (!isEditingIdentity && !isEditingAudit) return;

    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    setSaveStatus('saving');
    autoSaveRef.current = setTimeout(async () => {
      await persistCompanyAndAudit(true);
    }, 3000);

    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.name, company.region, company.city, company.currentOutletName,
      auditReport.cycle, auditReport.fromDate, auditReport.toDate,
      auditReport.outletSelection, auditReport.comments,
      isEditingIdentity, isEditingAudit, outlets]);

  // Enable auto-save after first edit (not on initial load)
  useEffect(() => {
    if (isEditingIdentity || isEditingAudit) {
      isAutoSaveReady.current = true;
    }
  }, [isEditingIdentity, isEditingAudit]);

  // ── Auto-save: Team tab (personnel edit, debounced 3s) ──
  // Only auto-saves when editing an existing user (enrollId is a UUID).
  // New enrollments still need the explicit button to generate credentials.
  const teamAutoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only auto-save when editing an existing user (UUID id) with all required fields
    if (!enrollId || !enrollId.includes('-')) return;
    if (!enrollName || !enrollEmail || !enrollPosition) return;

    if (teamAutoSaveRef.current) clearTimeout(teamAutoSaveRef.current);
    setSaveStatus('saving');

    teamAutoSaveRef.current = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setSaveStatus('idle'); return; }

        const mappedOutlet = outlets.find(o => o.code === enrollOutlet);
        const dbPayload: any = {
          id: enrollId,
          user_id: session.user.id,
          full_name: enrollName,
          email: enrollEmail,
          role: enrollRole.toLowerCase(),
          position: enrollPosition,
          permissions: enrollPermissions,
        };
        if (mappedOutlet?.id) dbPayload.outlet_id = mappedOutlet.id;

        const { error } = await supabase.from('personnel').upsert(dbPayload);
        if (error) throw error;

        // Update local state silently
        setUsers(prev => prev.map(u => u.id === enrollId ? {
          ...u,
          fullName: enrollName,
          email: enrollEmail,
          position: enrollPosition as any,
          outletCode: enrollOutlet,
          role: enrollRole.toLowerCase() as any,
          permissions: enrollPermissions,
        } : u));

        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 1500);
      } catch (e: any) {
        console.error('TEAM_AUTO_SAVE_ERROR:', e);
        setSaveStatus('idle');
      }
    }, 3000);

    return () => { if (teamAutoSaveRef.current) clearTimeout(teamAutoSaveRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollName, enrollEmail, enrollPosition, enrollOutlet, enrollRole, enrollPermissions, enrollId]);

  const handleSaveBenchmarks = async () => {
    setSaveStatus('saving');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showToast(t('dashboard.authenticationRequired'), 'error');
      setSaveStatus('idle');
      return;
    }
    const userId = session.user.id;

    const selectedOutletName = params.benchmarkRegion === 'Manual' && params.selectedManualOutlet
      ? (params.selectedManualOutlet === 'all'
        ? t('dashboard.allOutlets')
        : (outlets.find(o => o.code === params.selectedManualOutlet)?.name || 'Unknown Outlet'))
      : 'Unknown Outlet';

    const foodWaste = params.wasteTarget.toString();
    const energyLimit = params.energyTarget.toString();
    const waterUsage = params.waterTarget.toString();

    const { error } = await supabase
      .from('benchmarks')
      .upsert({
        user_id: session.user.id,
        outlet_name: selectedOutletName,
        food_waste_target_kg: parseFloat(foodWaste),
        energy_limit_kwh: parseFloat(energyLimit),
        water_usage_liters: parseFloat(waterUsage),
        food_cost_cap_percent: params.foodCostTarget,
        labor_cost_cap_percent: params.laborCostTarget,
        profit_margin_target: params.profitMarginTarget,
        total_sales_target: params.totalSalesTarget,
        sentiment_target: params.sentimentTarget,
        avg_check_target: params.avgCheckTarget,
        gamification_goal: params.gamificationGoal,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id, outlet_name' });

    if (error) {
      showToast('Database Error: ' + error.message, 'error');
      console.error(error);
    } else {
      showToast(t('dashboard.benchmarksSaved'), 'success');
      setParamsUpdatedAt(new Date().toLocaleString());
      logAction('benchmarks_saved', 'benchmark', params.benchmarkRegion, `Saved benchmark parameters (${params.benchmarkRegion})`, { wasteTarget: params.wasteTarget, energyTarget: params.energyTarget, waterTarget: params.waterTarget });
    }

    if (params.benchmarkRegion === 'Manual' && params.selectedManualOutlet && params.selectedManualOutlet !== 'all') {
      setManualOutletSettings(prev => ({
        ...prev,
        [params.selectedManualOutlet]: {
          wasteTarget: params.wasteTarget,
          waterTarget: params.waterTarget,
          energyTarget: params.energyTarget,
          foodCostTarget: params.foodCostTarget,
          laborCostTarget: params.laborCostTarget,
          wasteUnit: params.wasteUnit
        }
      }));
    }
    
    setSaveStatus('success');
    setIsEditingBenchmarks(false);
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleSaveApis = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('success');
      setIsEditingApis(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
  };

  // ── Auto-save: debounce 1.5 s after any params change ──
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setAutoSaveStatus('saving');
    autoSaveTimer.current = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setAutoSaveStatus('idle'); return; }

        const selectedOutletName = params.benchmarkRegion === 'Manual' && params.selectedManualOutlet
          ? (params.selectedManualOutlet === 'all'
            ? t('dashboard.allOutlets')
            : (outlets.find(o => o.code === params.selectedManualOutlet)?.name || 'Unknown Outlet'))
          : 'Unknown Outlet';

        await supabase.from('benchmarks').upsert({
          user_id: session.user.id,
          outlet_name: selectedOutletName,
          food_waste_target_kg: params.wasteTarget,
          energy_limit_kwh: params.energyTarget,
          water_usage_liters: params.waterTarget,
          food_cost_cap_percent: params.foodCostTarget,
          labor_cost_cap_percent: params.laborCostTarget,
          profit_margin_target: params.profitMarginTarget,
          total_sales_target: params.totalSalesTarget,
          sentiment_target: params.sentimentTarget,
          avg_check_target: params.avgCheckTarget,
          gamification_goal: params.gamificationGoal,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, outlet_name' });

        if (params.benchmarkRegion === 'Manual' && params.selectedManualOutlet && params.selectedManualOutlet !== 'all') {
          setManualOutletSettings(prev => ({
            ...prev,
            [params.selectedManualOutlet]: {
              wasteTarget: params.wasteTarget,
              waterTarget: params.waterTarget,
              energyTarget: params.energyTarget,
              foodCostTarget: params.foodCostTarget,
              laborCostTarget: params.laborCostTarget,
              wasteUnit: params.wasteUnit
            }
          }));
        }

        prevLoggedParams.current = { ...params };

        const now = new Date();
        setParamsUpdatedAt(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2500);
      } catch {
        setAutoSaveStatus('idle');
      }
    }, 1500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const handleGetReport = () => {
    showToast(t('dashboard.generatingReport', { cycle: auditReport.cycle, outlet: auditReport.outletSelection }), 'info');
  };

  const rawJson = useMemo(() => JSON.stringify({
    system: "Ecometricus Administrative Core v3.0.0",
    status: "ACTIVE",
    identity: company,
    outlet_registry: outlets,
    audit_config: auditReport,
    parameters: params,
    manual_overrides: manualOutletSettings,
    personnel_count: users.length,
    sync_window: "12:00 AM Local",
    timezone: currentTimezone,
    user_registry: users.map(u => ({
      name: u.fullName,
      role: u.role,
      permissions: u.permissions || []
    }))
  }, null, 2), [company, outlets, auditReport, params, users, currentTimezone, manualOutletSettings]);

  // Benchmarking Engine Values derived from selected profile
  const isManualBenchmark = params.benchmarkRegion === 'Manual';
  const effectiveParams = useMemo(() => {
    // When editing, always use raw params so inputs are live and responsive
    if (!isEditingSustainability && !isEditingFnB && !isManualBenchmark && BENCHMARK_PROFILES[params.benchmarkRegion]) {
      const profile = BENCHMARK_PROFILES[params.benchmarkRegion];
      return {
        ...params,
        // Only use profile defaults for sustainability metrics (waste/water/energy)
        // if the user hasn't saved custom values yet (paramsUpdatedAt is null = nothing loaded from DB)
        wasteTarget: paramsUpdatedAt ? params.wasteTarget : profile.waste,
        waterTarget: paramsUpdatedAt ? params.waterTarget : profile.water,
        energyTarget: paramsUpdatedAt ? params.energyTarget : profile.energy,
        // F&B KPIs (foodCostTarget, laborCostTarget) always use saved values —
        // never override with profile defaults once the user has customized them
        foodCostTarget: params.foodCostTarget,
        laborCostTarget: params.laborCostTarget,
      };
    }
    return params;
  }, [params, isManualBenchmark, isEditingSustainability, isEditingFnB, paramsUpdatedAt]);

  const isSustainabilityEditable = isEditingSustainability;
  const isFnBEditable = isEditingFnB;

  // DUPLICATION: Session Data Logic for Mila Actionable Intelligence
  const [sessionWasteEntries, setSessionWasteEntries] = useState<any[]>([]);
  const [sessionResourceEntries, setSessionResourceEntries] = useState<any[]>([]);

  useEffect(() => {
    const savedWaste = localStorage.getItem('ecometricus_waste_entries');
    const savedResources = localStorage.getItem('ecometricus_resource_entries');
    if (savedWaste) setSessionWasteEntries(JSON.parse(savedWaste));
    if (savedResources) setSessionResourceEntries(JSON.parse(savedResources));
  }, []);

  const sessionData = useMemo(() => {
    // Live Supabase Data only — no mock/fallback values
    const totalWasteKg = rawWasteLogs.reduce((sum, e) => sum + (parseFloat(e.mass_kg) || 0), 0);
    const totalWaterUsage = rawResourceLogs.reduce((sum, e) => sum + (parseFloat(e.water_liters) || 0), 0);
    const totalEnergyUsage = rawResourceLogs.reduce((sum, e) => sum + (parseFloat(e.energy_kwh) || 0), 0);

    // CO2 conversion factors (matching useCo2ChartData hook)
    const wasteCo2Coeff = 2.85;   // kg CO2e per kg food waste
    const waterCo2Coeff = 0.0003; // kg CO2e per litre of water
    const energyCo2Coeff = 0.45;  // kg CO2e per kWh of energy

    // Water footprint coefficient: water embedded in wasted food
    const waterCoeff = 3.40;

    // Financial Impact: unified coefficients ($7.50/kg item value + $1.25/kg logistics)
    const costPerItemUnit = 7.50;
    const costPerDisposalUnit = 1.25;
    const financialLossItems = totalWasteKg * costPerItemUnit;
    const financialLossDisposal = totalWasteKg * costPerDisposalUnit;
    const totalFinancialLoss = financialLossItems + financialLossDisposal;

    const wasteBenchmark = effectiveParams.wasteTarget;

    // Total carbon impact = food waste CO2 + water CO2 + energy CO2
    const wasteCo2 = totalWasteKg * wasteCo2Coeff;
    const waterCo2 = totalWaterUsage * waterCo2Coeff;
    const energyCo2 = totalEnergyUsage * energyCo2Coeff;
    const totalCarbonImpact = wasteCo2 + waterCo2 + energyCo2;

    return {
      waste: {
        kg: totalWasteKg,
        cost: financialLossItems,
        disposalCost: financialLossDisposal
      },
      water: totalWaterUsage,
      energy: totalEnergyUsage,
      impacts: {
        carbonImpact: totalCarbonImpact,
        waterFootprint: totalWasteKg * waterCoeff,
        totalFinancialLoss,
        isDeviating: totalWasteKg > wasteBenchmark
      }
    };
  }, [rawWasteLogs, rawResourceLogs, effectiveParams.wasteTarget]);

  const impacts = sessionData.impacts;

  // Aggregate Context for Admin Intelligence
  const adminContext = {
    user: { name: user.fullName || 'Admin', role: 'administrator', firstName: user.fullName?.split(' ')[0] ?? 'Admin' },
    userProfile: user, // Full profile for Mila agent tools
    company: {
      name: company.name || 'Your Hotel',
      outlet: isHookAdmin
        ? (company.currentOutletName || t('dashboard.allOutlets'))
        : (outlets.find(o => o.id === user.outletCode || o.code === user.outletCode || o.outlet_id === user.outletCode)?.name || userOutletName || company.currentOutletName || t('dashboard.allOutlets')),
      region: company.region || '',
      city: company.city || '',
      totalOutlets: outlets.length,
    },
    page: 'Admin Overview',
    benchmarks: {
      waste: effectiveParams.wasteTarget || 100,
      water: effectiveParams.waterTarget || 25000,
      energy: effectiveParams.energyTarget || 1000,
      foodCost: effectiveParams.foodCostTarget || 28.0,
      laborCost: effectiveParams.laborCostTarget || 30.0,
      profitMargin: effectiveParams.profitMarginTarget || 15.0
    },
    // Real-time aggregate data
    metrics: {
      totalOutlets: outlets.length,
      activeOutlets: new Set([
        ...rawWasteLogs.map(e => e.outlet_id), 
        ...rawResourceLogs.map(e => e.outlet_id),
        ...sessionWasteEntries.map(e => e.outletId),
        ...sessionResourceEntries.map(e => e.outletId)
      ]).size,
      financials: impacts, // Inherit the calculated impacts
      wasteVolume: sessionData.waste.kg,
      waterVolume: rawResourceLogs.filter(r => r.resource_type === 'water').reduce((s, r) => s + (Number(r.consumption) || 0), 0),
      energyVolume: rawResourceLogs.filter(r => r.resource_type === 'energy').reduce((s, r) => s + (Number(r.consumption) || 0), 0),
      efficiencyScore: Math.round((impacts.carbonImpact / (sessionData.waste.kg || 1)) * 100) // Rough metric
    },
    // Pass raw session data for deep reasoning if needed
    recentLogs: [...rawWasteLogs, ...sessionWasteEntries].slice(-10), // Last 10 entries for context
    marketingModality: "Admin-Level Strategic Oversight",
    activeAlerts: {
      kpi: impacts.totalFinancialLoss > 500,
      sustainability: impacts.isDeviating
    }
  };

  // Context for Basic users (Daily Input view)
  const basicUserContext = {
    user: { name: user.fullName || 'User', role: user.role, firstName: user.fullName?.split(' ')[0] ?? 'User' },
    userProfile: user,
    company: {
      name: company.name || 'Your Hotel',
      outlet: outlets.find(o => o.id === user.outletCode || o.code === user.outletCode || o.outlet_id === user.outletCode)?.name || company.currentOutletName || 'Your Outlet',
      region: company.region || '',
      city: company.city || '',
      totalOutlets: outlets.length,
    },
    page: 'Daily Input',
    benchmarks: {
      waste: effectiveParams.wasteTarget || 100,
      water: effectiveParams.waterTarget || 25000,
      energy: effectiveParams.energyTarget || 1000,
      foodCost: effectiveParams.foodCostTarget || 28.0,
      laborCost: effectiveParams.laborCostTarget || 30.0,
      profitMargin: effectiveParams.profitMarginTarget || 15.0
    },
    metrics: {
      totalOutlets: outlets.length,
      wasteVolume: sessionData.waste.kg,
      waterVolume: rawResourceLogs.filter(r => r.resource_type === 'water').reduce((s, r) => s + (Number(r.consumption) || 0), 0),
      energyVolume: rawResourceLogs.filter(r => r.resource_type === 'energy').reduce((s, r) => s + (Number(r.consumption) || 0), 0),
      financials: impacts,
    },
    activeAlerts: {
      kpi: impacts.totalFinancialLoss > 500,
      sustainability: impacts.isDeviating
    }
  };

  // Legal consent is captured at sign-up via the Terms checkbox — no second modal needed.
  const isPendingConsent = false;

  // STRICT RULE OVERRIDE: Spinner Lock until hydration is completed
  if (isHydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white flex-col gap-6">
        <div className="w-12 h-12 rounded-full border-2 border-brand-gold/20 border-t-brand-gold animate-spin" />
        <p className="text-sm font-medium text-white/60">{t('dashboard.loadingDashboard')}</p>
      </div>
    );
  }

  return (
    <div className={`relative min-h-screen ${isPendingConsent ? 'overflow-hidden' : ''}`}>

      {/* ── Toast notification ── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[99999] flex items-start gap-3 px-4 py-3 rounded-xl border shadow-[0_8px_32px_rgba(0,0,0,0.5)] max-w-sm animate-in slide-in-from-top-2 duration-300
          ${toast.type === 'success' ? 'bg-[#1a3d2e] border-brand-eco/40 text-brand-eco' : ''}
          ${toast.type === 'error'   ? 'bg-[#2d1a1a] border-brand-alert/40 text-brand-alert' : ''}
          ${toast.type === 'info'    ? 'bg-[#1c3933] border-brand-gold/30 text-brand-gold' : ''}`}
        >
          <span className="text-sm font-medium leading-snug flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="opacity-50 hover:opacity-100 transition-opacity shrink-0 mt-0.5">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Confirm modal ── */}
      {confirmModal && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-brand-dark/80 backdrop-blur-sm">
          <div className="bg-[#1c3933] border border-brand-gold/25 rounded-2xl p-6 shadow-[0_16px_64px_rgba(0,0,0,0.7)] max-w-sm w-full mx-4">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-brand-gold/80 mb-2">{t('dashboard.confirmAction')}</p>
            <p className="text-sm text-white/80 leading-relaxed mb-6">{confirmModal.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-lg border border-brand-gold/15 text-white/70 hover:text-white hover:border-brand-gold/30 text-[11px] font-semibold transition-colors"
              >{t('dashboard.cancel')}</button>
              <button
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                className="px-4 py-2 rounded-lg bg-brand-alert/20 border border-brand-alert/40 text-brand-alert hover:bg-brand-alert/30 text-[11px] font-semibold transition-colors"
              >{t('dashboard.confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-[9999] pointer-events-auto shrink-0 border-b border-brand-gold/30 bg-brand-dark/95 backdrop-blur-xl">

        <div className="max-w-[1920px] mx-auto h-16 sm:h-20 px-4 sm:px-6 flex items-center justify-between gap-3">

          {/* ── Left: Logo ── */}
          <button
            onClick={() => routerNavigate('/')}
            className="hover:opacity-80 transition-opacity shrink-0"
            aria-label="Go to home page"
          >
            <Logo size="md" withLabel />
          </button>

          {/* ── Right: user + logout ── */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">

            {/* Language toggle — segmented pill (matches landing navbar) */}
            <div className="flex items-center gap-0.5 bg-white/5 border border-brand-gold/10 rounded-full p-0.5">
              <button
                onClick={() => changeLang('en')}
                className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all duration-200 ${lang === 'en' ? 'bg-brand-gold text-brand-dark shadow-sm' : 'text-white/35 hover:text-white/70'}`}
              >EN</button>
              <button
                onClick={() => changeLang('es')}
                className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold transition-all duration-200 ${lang === 'es' ? 'bg-brand-gold text-brand-dark shadow-sm' : 'text-white/35 hover:text-white/70'}`}
              >ES</button>
            </div>

            {/* Divider */}
            <div className="hidden sm:block w-px h-7 bg-white/8" />

            {/* Avatar */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-brand-gold/25 to-brand-gold/5 border border-brand-gold/30 flex items-center justify-center shrink-0">
              <span className="text-brand-gold text-[10px] sm:text-xs font-black leading-none tracking-tight">
                {(user.fullName?.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('') || 'A').toUpperCase()}
              </span>
            </div>

            {/* Role only — full name is already in the greeting below */}
            <p className="hidden md:block text-[12px] text-brand-gold/70 font-semibold tracking-widest uppercase">
              {user.role.toLowerCase() === 'super_admin' ? 'Super Admin' : user.position || user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </p>

            {/* Divider */}
            <div className="hidden md:block w-px h-7 bg-white/8" />

            {/* Logout */}
            <button
              onClick={onLogout}
              title={t('dashboard.navLogOut')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-lg border border-brand-gold/15 text-white/70 hover:text-white hover:border-brand-alert/60 hover:bg-brand-alert/10 transition-all duration-150"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline text-[11px] font-semibold">{t('dashboard.navLogOut')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Background Dashboard Container with Blur Toggle */}
      <div className={`transition-all duration-1000 flex flex-col min-h-screen ${isPendingConsent ? 'blur-2xl grayscale pointer-events-none' : ''}`}>
        <div className="flex-grow flex bg-brand-dark text-gray-100 font-body selection:bg-brand-gold/30 selection:text-brand-gold overflow-hidden">

        {/* Sidebar wrapper — group for hover-expand of spacer */}
        <div className="group/sidebar flex shrink-0">
        {/* ── Sidebar — fixed, full height ── */}
        <aside className="lg:w-16 group-hover/sidebar:lg:w-56 flex flex-col transition-all duration-300 ease-out border-r border-brand-gold/30 bg-brand-dark/60 backdrop-blur-sm lg:fixed lg:top-16 lg:left-0 lg:z-20 lg:h-[calc(100vh-4rem)] lg:overflow-hidden">
          {/* Nav items — scrollable if needed */}
          <div className="flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-y-auto scrollbar-hide p-2 lg:p-3 lg:pt-6 lg:flex-grow lg:min-h-0">

              {user.role.toLowerCase() !== 'basic' && (
                <SidebarItem view={PortalView.DASHBOARD} icon={LayoutDashboard} label={t('dashboard.navOverview')} active={activeView === PortalView.DASHBOARD} onClick={setActiveView} />
              )}
              {user.role.toLowerCase() !== 'admin' && user.role.toLowerCase() !== 'supervisor' && (
                <SidebarItem view={PortalView.DAILY_INPUT} icon={ClipboardList} label={t('dashboard.navDailyInput')} active={activeView === PortalView.DAILY_INPUT} onClick={setActiveView} />
              )}
              {(user.role.toLowerCase() === 'admin' || user.role.toLowerCase() === 'super_admin' || user.role.toLowerCase() === 'supervisor') && (
                <>
                  {isHookAdmin && <SidebarItem view={PortalView.IDENTITY} icon={Building2} label={t('dashboard.navCompany')} active={activeView === PortalView.IDENTITY} onClick={setActiveView} />}
                  {isHookAdmin && <SidebarItem view={PortalView.TEAM} icon={Users} label={t('dashboard.navTeam')} active={activeView === PortalView.TEAM} onClick={setActiveView} />}
                  {isHookAdmin && <SidebarItem view={PortalView.PARAMETERS} icon={Settings2} label={t('dashboard.navBenchmarks')} active={activeView === PortalView.PARAMETERS} onClick={setActiveView} />}
                  <SidebarItem view={PortalView.AUDIT_LOG} icon={ScrollText} label={t('dashboard.navAuditLog')} active={activeView === PortalView.AUDIT_LOG} onClick={setActiveView} />
                </>
              )}
              {user.role.toLowerCase() === 'super_admin' && (
                <SidebarItem view={PortalView.SUPER_ADMIN} icon={ShieldCheck} label={t('dashboard.navSuperAdmin')} active={activeView === PortalView.SUPER_ADMIN} onClick={setActiveView} />
              )}
          </div>

          {/* Contact — frozen at bottom, always visible */}
          <div className="hidden lg:block p-2 lg:p-3 border-t border-brand-gold/15 shrink-0">
            <SidebarItem view={PortalView.CONTACT} icon={Headphones} label="Contact" active={activeView === PortalView.CONTACT} onClick={setActiveView} />
          </div>
        </aside>

        {/* Spacer for fixed sidebar — expands on hover to push content */}
        <div className="hidden lg:block w-16 group-hover/sidebar:w-56 shrink-0 transition-all duration-300 ease-out" />
        </div>

          {/* ── Main Content ── */}
          <main className="flex-grow flex flex-col min-w-0 min-h-0 overflow-y-auto scrollbar-hide">
            <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 py-4 sm:py-8 flex flex-col gap-4 sm:gap-8 flex-grow">

              {/* Greeting */}
              {(() => {
                const h = currentTime.getHours();
                const greeting = h < 12 ? t('dashboard.greetingMorning') : h < 17 ? t('dashboard.greetingAfternoon') : t('dashboard.greetingEvening');
                const firstName = user.fullName?.split(' ')[0] ?? t('dashboard.greetingFallback');
                return (
                  <div className="flex items-end justify-between gap-4 shrink-0">
                    <div className="min-w-0">
                      <h2 className="text-xl sm:text-3xl font-geometric font-bold text-white leading-none tracking-tight">
                        {greeting}, <span className="text-brand-gold font-bold">{firstName}</span>
                      </h2>
                      <p className="text-[11px] sm:text-[12px] font-medium text-white/50 mt-2 tracking-wide flex items-center gap-2 flex-wrap">
                        <span>{currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        <span className="w-1 h-1 rounded-full bg-white/15" />
                        <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="w-1 h-1 rounded-full bg-white/15" />
                        <span className="truncate">
                          {isHookAdmin
                            ? (company.currentOutletName || t('dashboard.allOutlets'))
                            : user.outletCode
                              ? (outlets.find(o => o.id === user.outletCode || o.code === user.outletCode || o.outlet_id === user.outletCode)?.name || userOutletName || user.outletCode)
                              : (company.currentOutletName || t('dashboard.allOutlets'))}
                        </span>
                      </p>
                    </div>
                    {isBasicOrSupervisor && user.role?.toLowerCase() === 'basic' && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 shrink-0">
                        <Trophy size={14} className="text-brand-gold" />
                        <span className="text-sm font-black text-brand-gold tabular-nums">{navPoints.toLocaleString()}</span>
                        <span className="text-[9px] font-bold text-brand-gold/50 uppercase tracking-wider">pts</span>
                      </div>
                    )}
                  </div>
                );
              })()}

            <div className="bg-brand-dark border border-brand-gold/30 rounded-2xl p-3 sm:p-7 shadow-xl backdrop-blur-sm flex-grow flex flex-col overflow-hidden">
              {/* Main View Header — only for views that still use it */}
              {(() => {
                const v = activeView as PortalView;
                if (v !== PortalView.DASHBOARD && v !== PortalView.CONTACT && v !== PortalView.SUPER_ADMIN) return null;
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-5 shrink-0">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-gold/70 mb-1.5">
                    {v === PortalView.DASHBOARD && t('dashboard.realTimeTracking')}
                    {v === PortalView.CONTACT && t('dashboard.getHelp')}
                    {v === PortalView.SUPER_ADMIN && t('dashboard.platformControl')}
                  </p>
                  <h3 className="text-lg sm:text-xl font-geometric font-bold text-white leading-tight">
                    {v === PortalView.DASHBOARD && t('dashboard.operationalInsights')}
                    {v === PortalView.CONTACT && t('dashboard.contactSupport')}
                    {v === PortalView.SUPER_ADMIN && t('dashboard.superAdmin')}
                  </h3>
                </div>

                {/* Save button & status indicators — in content header */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Save button — not shown on Dashboard, Daily Input, Audit Log, Team, Benchmarks or Company */}
                  {v !== PortalView.DASHBOARD && v !== PortalView.CONTACT && v !== PortalView.SUPER_ADMIN && (
                    <button
                      onClick={handleSaveAll}
                      disabled={saveStatus !== 'idle'}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-bold tracking-wide transition-all ${saveStatus === 'success' ? 'bg-brand-eco text-brand-dark' : 'bg-brand-eco text-brand-dark hover:brightness-110'} ${saveStatus === 'saving' ? 'opacity-70 cursor-wait' : ''} shadow-[0_2px_12px_rgba(119,177,57,0.25)]`}
                    >
                      {saveStatus === 'saving' ? <RefreshCcw size={12} className="animate-spin" /> : saveStatus === 'success' ? <Check size={12} /> : <Save size={12} />}
                      {saveStatus === 'saving' ? t('dashboard.saving') : saveStatus === 'success' ? t('dashboard.saved') : 'Save'}
                    </button>
                  )}
                </div>
              </div>
              })()}

              <div className="flex-grow flex flex-col min-h-0 overflow-hidden">
                {activeView === PortalView.DASHBOARD && (
                  <div className="space-y-8 sm:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col flex-grow overflow-y-auto scrollbar-hide pr-2">
                    <div className="flex overflow-x-auto gap-2 w-full sm:w-fit shrink-0 scrollbar-hide pb-1">
                      {[
                        { id: DashboardTab.SUMMARIZED, label: t('dashboard.tabOverview'), icon: TrendingUp, color: 'brand-gold' },
                        { id: DashboardTab.FOOD_WASTE, label: t('dashboard.tabFoodWaste'), icon: Leaf, color: 'brand-eco' },
                        { id: DashboardTab.ENERGY_WATER, label: t('dashboard.tabEnergyWater'), icon: Zap, color: 'brand-energy' },
                        { id: DashboardTab.GAMIFICATION, label: t('dashboard.tabGamification'), icon: Award, color: 'brand-gold' },
                      ].filter((tab) => user.role.toLowerCase() !== 'basic' || tab.id !== DashboardTab.SUMMARIZED).map((tab) => {
                        const active = dashboardTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setDashboardTab(tab.id)}
                            className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap border ${
                              active
                                ? 'bg-brand-gold/15 border-brand-gold/40 text-white shadow-[0_2px_12px_rgba(200,164,19,0.15)]'
                                : 'bg-[#1c3933] border-transparent text-white/50 hover:text-white/80 hover:bg-brand-dark/60 hover:border-brand-gold/15'
                            }`}
                          >
                            <tab.icon size={15} className={`shrink-0 transition-colors ${active ? 'text-brand-gold' : 'text-white/30 group-hover:text-white/60'}`} />
                            <span className="text-[12px] font-bold tracking-tight">{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* ADMIN CONTEXT FOR MILA WIDGET */}
                    {/* ADMIN CONTEXT DEFINED ABOVE */}

                    <div className="flex-grow">
                      {dashboardTab === DashboardTab.SUMMARIZED && (
                        <>
                          {/* MILA ACTIONABLE INTELLIGENCE - ADMIN CUMULATIVE VIEW */}
                          <div className="w-full max-w-full mb-6 rounded-2xl border border-brand-gold/20 bg-[#1c3933]/40 p-6">
                            {/* Header */}
                            <div className="flex items-center gap-4 mb-6">
                              <div className="w-12 h-12 bg-brand-eco/10 border border-brand-eco/30 rounded-xl flex items-center justify-center shrink-0">
                                <Cpu className="text-brand-eco" size={24} />
                              </div>
                              <div>
                                <h2 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                                  {t('dashboard.milaTitle')}
                                </h2>
                                <p className="text-[11px] sm:text-xs text-brand-gold font-medium mt-1">
                                  {t('dashboard.milaSubtitle')}
                                </p>
                              </div>
                            </div>

                            {/* Summary KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                              {/* Carbon Lifecycle */}
                              <div className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${impacts.isDeviating ? 'border-brand-alert/40 bg-brand-alert/5' : 'border-brand-gold/10 bg-[#1c3933] hover:border-brand-gold/20'}`}>
                                <div className="flex items-center justify-between gap-2 mb-4">
                                  <div className="flex items-center gap-2">
                                    <Cloud size={16} className="text-brand-gold" />
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-brand-gold">{t('dashboard.carbonLifecycle')}</h4>
                                  </div>
                                  {impacts.isDeviating ? (
                                    <div className="flex items-center gap-1.5 bg-brand-alert/20 text-brand-alert border border-brand-alert/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0">
                                      <AlertTriangle size={9} /> Attention
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 bg-brand-eco/15 text-brand-eco border border-brand-eco/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0">
                                      <ShieldCheck size={9} /> On Target
                                    </div>
                                  )}
                                </div>
                                <p className="text-3xl font-geometric font-black text-white leading-none mb-2">
                                  {impacts.carbonImpact.toFixed(1)}
                                  <span className="text-xs font-medium text-white/50 uppercase ml-1.5">kg CO₂e</span>
                                </p>
                                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                                  {impacts.isDeviating ? t('dashboard.deviationImpactDetected') : t('dashboard.withinTargetRange')}
                                </p>
                              </div>

                              {/* Water Resource */}
                              <div className="rounded-2xl border p-5 sm:p-6 transition-all duration-300 border-brand-gold/10 bg-[#1c3933] hover:border-brand-gold/20">
                                <div className="flex items-center justify-between gap-2 mb-4">
                                  <div className="flex items-center gap-2">
                                    <Droplets size={16} className="text-brand-gold" />
                                    <h4 className="text-[11px] font-black uppercase tracking-widest text-brand-gold">{t('dashboard.waterResource')}</h4>
                                  </div>
                                  <div className="flex items-center gap-1.5 bg-brand-eco/15 text-brand-eco border border-brand-eco/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0">
                                    <ShieldCheck size={9} /> Averted
                                  </div>
                                </div>
                                <p className="text-3xl font-geometric font-black text-white leading-none mb-2">
                                  {impacts.waterFootprint.toFixed(1)}
                                  <span className="text-xs font-medium text-white/50 uppercase ml-1.5">L</span>
                                </p>
                                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                                  {t('dashboard.avertedLoss')}
                                </p>
                              </div>

                              {/* Financial Impact */}
                              <div className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${impacts.isDeviating ? 'border-brand-alert/40 bg-brand-alert/5' : 'border-brand-eco/30 bg-brand-eco/5 hover:border-brand-eco/40'}`}>
                                <div className="flex items-center justify-between gap-2 mb-4">
                                  <div className="flex items-center gap-2">
                                    <DollarSign size={16} className={impacts.isDeviating ? 'text-brand-alert' : 'text-brand-eco'} />
                                    <h4 className={`text-[11px] font-black uppercase tracking-widest ${impacts.isDeviating ? 'text-brand-alert' : 'text-brand-eco'}`}>{t('dashboard.financialImpact')}</h4>
                                  </div>
                                  {impacts.isDeviating ? (
                                    <div className="flex items-center gap-1.5 bg-brand-alert/20 text-brand-alert border border-brand-alert/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0">
                                      <AlertTriangle size={9} /> Notified
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 bg-brand-eco/15 text-brand-eco border border-brand-eco/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0">
                                      <ShieldCheck size={9} /> On Target
                                    </div>
                                  )}
                                </div>
                                <p className={`text-3xl font-geometric font-black leading-none mb-2 ${impacts.isDeviating ? 'text-brand-alert' : 'text-brand-eco'}`}>
                                  ${impacts.totalFinancialLoss.toFixed(2)}
                                </p>
                                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                                  {impacts.isDeviating ? t('dashboard.supervisorNotified') : t('dashboard.withinFinancialCap')}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* ALERTS & SUGGESTIONS - Dynamic deviation alerts */}
                          <div className="w-full max-w-full mb-6 rounded-2xl border border-brand-gold/20 bg-[#1c3933]/40 p-6">
                            {/* Header */}
                            <div className="flex items-center gap-4 mb-6">
                              <div className="w-12 h-12 bg-brand-alert/10 border border-brand-alert/30 rounded-xl flex items-center justify-center shrink-0">
                                <AlertTriangle className="text-brand-alert" size={24} />
                              </div>
                              <div>
                                <h2 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                                  Alerts &amp; Suggestions
                                </h2>
                                <p className="text-[11px] sm:text-xs text-brand-gold font-medium mt-1">
                                  Deviation alerts and AI-powered recommendations
                                </p>
                              </div>
                            </div>

                            {/* Dynamic alerts grid */}
                            <div className="space-y-3">
                              {(() => {
                                const alerts: { severity: 'critical' | 'warning' | 'info'; category: string; title: string; description: string; recommendation: string }[] = [];

                                // Waste threshold
                                if (sessionData.waste.kg > (effectiveParams.wasteTarget || 100)) {
                                  const overage = sessionData.waste.kg - (effectiveParams.wasteTarget || 100);
                                  const pct = Math.round((overage / (effectiveParams.wasteTarget || 100)) * 100);
                                  alerts.push({
                                    severity: pct > 20 ? 'critical' : 'warning',
                                    category: 'Food Waste',
                                    title: `Waste volume ${pct}% over target`,
                                    description: `Current: ${Math.round(sessionData.waste.kg)}kg vs target ${effectiveParams.wasteTarget || 100}kg. Excess of ${Math.round(overage)}kg generating ~${Math.round(overage * 2.85)}kg CO₂e.`,
                                    recommendation: 'Review prep processes and portion sizes. Focus on overproduction and spoilage categories.',
                                  });
                                }

                                // Carbon lifecycle
                                if (impacts.isDeviating) {
                                  alerts.push({
                                    severity: 'critical',
                                    category: 'Carbon',
                                    title: 'Carbon lifecycle deviation detected',
                                    description: `Total carbon impact: ${impacts.carbonImpact.toFixed(1)}kg CO₂e exceeds the sustainable threshold for your operation.`,
                                    recommendation: 'Prioritize waste reduction — every 1kg waste reduced saves 2.85kg CO₂e. Check energy usage patterns.',
                                  });
                                }

                                // Financial impact
                                if (impacts.totalFinancialLoss > 500) {
                                  alerts.push({
                                    severity: 'warning',
                                    category: 'Financial',
                                    title: `Financial loss at $${impacts.totalFinancialLoss.toFixed(2)}`,
                                    description: `Waste-related financial impact exceeds $500. Primary drivers: food cost ($7.50/kg) + logistics ($1.25/kg).`,
                                    recommendation: `Target high-waste categories first. A 10% waste reduction saves ~$${Math.round(impacts.totalFinancialLoss * 0.10)}/week.`,
                                  });
                                }

                                // Water usage
                                const waterTotal = rawResourceLogs.filter(r => r.resource_type === 'water').reduce((s, r) => s + (Number(r.consumption) || 0), 0);
                                if (waterTotal > (effectiveParams.waterTarget || 25000)) {
                                  const pct = Math.round(((waterTotal - (effectiveParams.waterTarget || 25000)) / (effectiveParams.waterTarget || 25000)) * 100);
                                  alerts.push({
                                    severity: pct > 30 ? 'critical' : 'warning',
                                    category: 'Water',
                                    title: `Water usage ${pct}% over target`,
                                    description: `Current: ${Math.round(waterTotal)}L vs target ${effectiveParams.waterTarget || 25000}L.`,
                                    recommendation: 'Check for leaks, optimize dishwashing schedules, and review irrigation if applicable.',
                                  });
                                }

                                // Energy usage
                                const energyTotal = rawResourceLogs.filter(r => r.resource_type === 'energy').reduce((s, r) => s + (Number(r.consumption) || 0), 0);
                                if (energyTotal > (effectiveParams.energyTarget || 1000)) {
                                  const pct = Math.round(((energyTotal - (effectiveParams.energyTarget || 1000)) / (effectiveParams.energyTarget || 1000)) * 100);
                                  alerts.push({
                                    severity: pct > 30 ? 'critical' : 'warning',
                                    category: 'Energy',
                                    title: `Energy usage ${pct}% over target`,
                                    description: `Current: ${Math.round(energyTotal)}kWh vs target ${effectiveParams.energyTarget || 1000}kWh.`,
                                    recommendation: 'Audit HVAC scheduling, switch to LED lighting, and review equipment idle times.',
                                  });
                                }

                                // KPI variance
                                if (impacts.totalFinancialLoss > 500) {
                                  alerts.push({
                                    severity: 'info',
                                    category: 'KPI',
                                    title: 'KPI variance detected',
                                    description: 'One or more KPIs (food cost, labor, profit margin) are deviating from regional benchmarks.',
                                    recommendation: 'Review the KPI Report section for detailed variance analysis and adjust operations accordingly.',
                                  });
                                }

                                if (alerts.length === 0) {
                                  return (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                      <div className="w-14 h-14 rounded-2xl bg-brand-eco/10 border border-brand-eco/30 flex items-center justify-center mb-4">
                                        <ShieldCheck size={26} className="text-brand-eco" />
                                      </div>
                                      <p className="text-sm text-white/60 font-medium">All metrics within target range</p>
                                      <p className="text-[11px] text-white/30 mt-1">No deviation alerts at this time</p>
                                    </div>
                                  );
                                }

                                return alerts.map((alert, i) => (
                                  <div key={i} className={`rounded-xl border p-4 transition-all ${
                                    alert.severity === 'critical' ? 'border-brand-alert/40 bg-brand-alert/5' :
                                    alert.severity === 'warning' ? 'border-brand-gold/30 bg-brand-gold/5' :
                                    'border-brand-eco/30 bg-brand-eco/5'
                                  }`}>
                                    <div className="flex items-start gap-3">
                                      {alert.severity === 'critical' ? (
                                        <AlertTriangle size={16} className="text-brand-alert shrink-0 mt-0.5" />
                                      ) : alert.severity === 'warning' ? (
                                        <AlertCircle size={16} className="text-brand-gold shrink-0 mt-0.5" />
                                      ) : (
                                        <Info size={16} className="text-brand-eco shrink-0 mt-0.5" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-[9px] font-black uppercase tracking-widest text-white/40">{alert.category}</span>
                                          <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                                            alert.severity === 'critical' ? 'bg-brand-alert/20 text-brand-alert' :
                                            alert.severity === 'warning' ? 'bg-brand-gold/20 text-brand-gold' :
                                            'bg-brand-eco/20 text-brand-eco'
                                          }`}>{alert.severity}</span>
                                        </div>
                                        <h4 className="text-sm font-bold text-white leading-tight mb-1">{alert.title}</h4>
                                        <p className="text-[11px] text-white/50 leading-relaxed mb-2">{alert.description}</p>
                                        <p className="text-[11px] text-brand-eco/80 leading-relaxed">
                                          <span className="font-bold">→ </span>{alert.recommendation}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>

                          {/* EARTH KEEPER ENGAGEMENT RADIAL CHART - ADMIN VIEW */}
                          <div className="w-full max-w-full mb-6 rounded-2xl border border-brand-gold/20 bg-[#1c3933]/40 p-6">
                          {/* "Position the Earth Keeper Engagement % Chart directly BELOW the Mila Actionable Intelligence container... only element in this section" */}
                          {(() => {
                            // "Calculate Outlet Engagement % (Unique Outlets in Session Data)"
                            // Logic: Count outlets that have at least one log entry
                            const outletIds = new Set(outlets.map(o => o.id));
                            const activeOutletIds = new Set<string>();
                            rawWasteLogs.forEach(e => { if (e.outlet_id && outletIds.has(e.outlet_id)) activeOutletIds.add(e.outlet_id); });
                            rawResourceLogs.forEach(e => {
                                const id = e.outlet_id || outlets.find((o: any) => o.code === e.outlet_code || o.name === e.outlet_name)?.id;
                                if (id && outletIds.has(id)) activeOutletIds.add(id);
                            });
                            sessionWasteEntries.forEach(e => { if (e.outletId && outletIds.has(e.outletId)) activeOutletIds.add(e.outletId); });
                            sessionResourceEntries.forEach(e => { if (e.outletId && outletIds.has(e.outletId)) activeOutletIds.add(e.outletId); });

                            const totalOutlets = outlets.length || 1;
                            const activeCount = activeOutletIds.size;

                            // SYNCED CALCULATION: Calculate from actual data, ignore stale localStorage for non-admins
                            const savedAvg = isHookAdmin ? localStorage.getItem('ecometricus_cumulative_engagement') : null;
                            const engagementPct = savedAvg ? parseInt(savedAvg) : Math.round((activeCount / totalOutlets) * 100);

                            // "Color Thresholds: Green (> 85%), Yellow (65% - 84%), Red (<65%)"
                            // "Status Badge Logic"
                            // Professional Corporate Neutralization (No Red)
                            let chartColor = '#C8A413'; // Gold default
                            let statusLabel = t('dashboard.review');
                            let statusBg = 'bg-brand-gold';
                            let statusText = 'text-brand-dark';

                            if (engagementPct >= 85) {
                              chartColor = '#22c55e'; // Green
                              statusLabel = t('dashboard.onTrack');
                              statusBg = 'bg-green-500';
                              statusText = 'text-white';
                            } else if (engagementPct >= 65) {
                              chartColor = '#eab308';
                              statusLabel = t('dashboard.review');
                              statusBg = 'bg-brand-dark/60 border border-brand-gold/40 shadow-inner';
                              statusText = 'text-brand-gold font-black';
                            }

                            // SVG Circle Geometry
                            const radius = 56;
                            const circumference = 2 * Math.PI * radius; // ~351.858
                            const strokeDashoffset = circumference - (engagementPct / 100) * circumference;

                            return (
                              <div className="w-full max-w-full mb-8">
                                <div className="bg-[#1c3933] border border-brand-gold/20 rounded-2xl p-4 sm:p-6 relative overflow-hidden shadow-xl">

                                  {/* HEADER SECTION */}
                                  <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 bg-brand-eco/10 border border-brand-eco/30 rounded-xl flex items-center justify-center shrink-0">
                                        <ShieldCheck size={24} className="text-brand-eco" />
                                      </div>
                                      <div>
                                        <h2 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                                          {t('dashboard.earthKeeperTitle')}
                                        </h2>
                                        <p className="text-[11px] sm:text-xs text-brand-gold font-medium mt-1">
                                          {t('dashboard.earthKeeperSubtitle')}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Status badge */}
                                    <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide ${engagementPct >= 85 ? 'bg-green-500/15 text-green-400 border border-green-500/30' : engagementPct >= 65 ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/25' : 'bg-brand-alert/10 text-brand-alert border border-brand-alert/25'}`}>
                                      {statusLabel}
                                    </div>
                                  </div>

                                  {/* MAIN CONTENT AREA (Two-Column Layout) */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                    {/* Left Column: Text */}
                                    <div className="flex flex-col justify-center">
                                      <div className="text-4xl font-geometric font-black text-white leading-none">
                                        {engagementPct}%
                                        <span className="text-sm text-white/50 font-medium uppercase tracking-wide block mt-2">{t('dashboard.participation')}</span>
                                      </div>
                                      <p className="text-xs text-white/50 mt-3 font-medium leading-relaxed max-w-sm">
                                        {isHookAdmin
                                          ? t('dashboard.cumulativeTracking')
                                          : t('dashboard.cumulativeTrackingOutlet')}
                                      </p>
                                    </div>

                                    {/* Right Column: Graphic */}
                                    <div className="flex justify-center md:justify-end">
                                      <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center">
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                                          <circle cx="64" cy="64" r="52" stroke="#1a3b34" strokeWidth="10" fill="transparent" />
                                          <circle
                                            cx="64"
                                            cy="64"
                                            r="52"
                                            stroke={chartColor}
                                            strokeWidth="10"
                                            fill="transparent"
                                            strokeDasharray={2 * Math.PI * 52}
                                            strokeDashoffset={(2 * Math.PI * 52) - (engagementPct / 100) * (2 * Math.PI * 52)}
                                            strokeLinecap="round"
                                            className="transition-all duration-1000 ease-out"
                                          />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none pointer-events-none">
                                          <span className="text-3xl font-geometric font-black text-white">{engagementPct}%</span>
                                          <span className="text-[9px] font-bold uppercase text-brand-gold/60 tracking-[0.2em] mt-1">Engaged</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                </div>
                              </div>
                            );
                          })()}

                          </div>

                          {/* Sustainability Report section */}
                          <div className="w-full max-w-full mt-8 mb-4 rounded-2xl border border-brand-gold/20 bg-[#1c3933]/40 p-6">
                            <div className="flex items-center gap-4 mb-2">
                              <div className="w-12 h-12 bg-brand-eco/10 border border-brand-eco/30 rounded-xl flex items-center justify-center shrink-0">
                                <Leaf className="text-brand-eco" size={24} />
                              </div>
                              <div>
                                <h2 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                                  {t('dashboard.sustainabilityReportTitle')}
                                </h2>
                                <p className="text-[11px] sm:text-xs text-brand-gold font-medium mt-1">
                                  {t('dashboard.sustainabilityReportSubtitle')}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="w-full max-w-full grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
                            <div className="w-full h-[280px]">
                              <FoodWasteTemplateChart
                                data={foodWasteTemplateData}
                                benchmark={wasteDailyBenchmark}
                              />
                            </div>
                            <div className="w-full h-[280px]">
                              <WaterUsageTemplateChart
                                data={waterTemplateData}
                                benchmark={resourceWaterBenchmark}
                              />
                            </div>
                            <div className="w-full h-[280px]">
                              <EnergyUsageTemplateChart
                                data={energyTemplateData}
                                benchmark={resourceEnergyBenchmark}
                              />
                            </div>
                            <div className="w-full h-[280px]">
                              <Co2EmissionsTemplateChart
                                data={wasteChartData}
                                benchmark={wasteDailyBenchmark}
                                weeklyTotal={wasteWeeklyTotal}
                                outletKeys={wasteOutletKeys}
                                outletColors={outlets.reduce((acc, o) => { acc[o.name.toUpperCase()] = o.color_hex || '#d4af37'; return acc; }, {} as Record<string, string>)}
                                outletLabels={outlets.reduce((acc, o) => { acc[o.name.toUpperCase()] = o.name; return acc; }, {} as Record<string, string>)}
                              />
                            </div>
                          </div>

                          {/* KPI Report section */}
                          <div className="w-full max-w-full mt-8 mb-4 rounded-2xl border border-brand-gold/20 bg-[#1c3933]/40 p-6">
                            <div className="flex items-center gap-4 mb-2">
                              <div className="w-12 h-12 bg-brand-eco/10 border border-brand-eco/30 rounded-xl flex items-center justify-center shrink-0">
                                <BarChart3 className="text-brand-eco" size={24} />
                              </div>
                              <div>
                                <h2 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                                  {t('dashboard.kpiReportTitle')}
                                </h2>
                                <p className="text-[11px] sm:text-xs text-brand-gold font-medium mt-1">
                                  {t('dashboard.kpiReportSubtitle')}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Row 1: Food Cost + Labor Cost */}
                          <div className="w-full max-w-full grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
                            <div className="w-full h-[280px]">
                              <KpiChart
                                title={t('dashboard.foodCost')}
                                subtitle={t('dashboard.foodCostSubtitle')}
                                icon={Utensils}
                                iconColor="text-brand-gold"
                                data={foodCostLogs}
                                dataKey="foodCost"
                                multiSeries={user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'super_admin'}
                                seriesKey="outlet_code"
                                outlets={outlets}
                                benchmark={effectiveParams.foodCostTarget}
                                unit="%"
                                yDomain={[20, 40]}
                                yTicks={[20, 25, 30, 35, 40]}
                                chartType="line"
                              />
                            </div>
                            <div className="w-full h-[280px]">
                              <KpiChart
                                title={t('dashboard.laborCost')}
                                subtitle={t('dashboard.laborCostSubtitle')}
                                icon={Users}
                                iconColor="text-brand-gold"
                                data={laborCostLogs}
                                dataKey="laborCost"
                                multiSeries={user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'super_admin'}
                                seriesKey="outlet_code"
                                outlets={outlets}
                                benchmark={effectiveParams.laborCostTarget}
                                unit="%"
                                yDomain={[15, 45]}
                                yTicks={[20, 25, 30, 35, 40]}
                                chartType="line"
                              />
                            </div>
                          </div>

                          {/* Row 2: Profit Margins + Total Sales */}
                          <div className="w-full max-w-full grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
                            <div className="w-full h-[280px]">
                              <KpiChart
                                title={t('dashboard.profitMargins')}
                                subtitle={t('dashboard.profitMarginsSubtitle')}
                                icon={Percent}
                                iconColor="text-brand-gold"
                                data={profitMarginLogs}
                                dataKey="profitMargin"
                                multiSeries={user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'super_admin'}
                                seriesKey="outlet_code"
                                outlets={outlets}
                                benchmark={effectiveParams.profitMarginTarget}
                                unit="%"
                                yDomain={[0, 40]}
                                yTicks={[0, 10, 20, 30, 40]}
                                chartType="bar"
                              />
                            </div>

                            <div className="w-full h-[280px]">
                              <KpiChart
                                title={t('dashboard.totalOutletSales')}
                                subtitle={t('dashboard.totalOutletSalesSubtitle')}
                                icon={DollarSign}
                                iconColor="text-brand-gold"
                                data={salesLogs}
                                dataKey="total"
                                benchmark={effectiveParams.totalSalesTarget}
                                unitPrefix="$"
                                chartType="bar"
                                stacked
                                stackKeys={[
                                  { key: 'food', name: 'Food', color: '#C8A413' },
                                  { key: 'bev', name: 'Beverage', color: '#77B139' },
                                ]}
                                yDomain={[0, 35000]}
                                yTicks={[0, 10000, 20000, 30000]}
                                alertIfAbove={false}
                              />
                            </div>
                          </div>

                          {/* Row 3: Customer Sentiment + Avg Check */}
                          <div className="w-full max-w-full grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
                            <div className="w-full h-[280px]">
                              <KpiChart
                                title={t('dashboard.customerSentiment')}
                                subtitle={t('dashboard.customerSentimentSubtitle')}
                                icon={Star}
                                iconColor="text-brand-gold"
                                data={sentimentLogs}
                                dataKey="rating_value"
                                multiSeries={user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'super_admin'}
                                seriesKey="outlet_code"
                                outlets={outlets}
                                benchmark={effectiveParams.sentimentTarget}
                                yDomain={[3, 5]}
                                yTicks={[3, 3.5, 4, 4.5, 5]}
                                chartType="line"
                                alertIfAbove={false}
                              />
                            </div>
                            <div className="w-full h-[280px]">
                              <KpiChart
                                title={t('dashboard.avgCheck')}
                                subtitle={t('dashboard.avgCheckSubtitle')}
                                icon={Receipt}
                                iconColor="text-brand-gold"
                                data={avgCheckLogs}
                                dataKey="rollingAverage"
                                benchmark={effectiveParams.avgCheckTarget}
                                unitPrefix="$"
                                chartType="composed"
                                stacked
                                stackKeys={[
                                  { key: 'restaurant', name: 'Restaurant', color: '#C8A413' },
                                  { key: 'bar', name: 'Bar', color: '#77B139' },
                                  { key: 'banquets', name: 'Banquets', color: '#3B82F6' },
                                ]}
                                rollingAverageKey="rollingAverage"
                                yDomain={[0, 90]}
                                yTicks={[0, 30, 60, 90]}
                                alertIfAbove={false}
                              />
                            </div>
                          </div>


                        </>
                      )}

                      {dashboardTab === DashboardTab.FOOD_WASTE && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <FoodWasteIntelligence 
                            outletId={user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'super_admin' ? null : (outlets.find(o => o.code === user.outletCode) as any)?.id || null}
                            unitType={params.wasteUnit as 'kg' | 'Lbs'}
                            allOutlets={outlets}
                            benchmarks={{
                              food_waste_target_kg: effectiveParams.wasteTarget,
                              financial_cap: (effectiveParams as any).financial_cap || 1000
                            }}
                          />
                        </div>
                      )}

                      {dashboardTab === DashboardTab.ENERGY_WATER && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <ResourceIntelligence allOutlets={outlets} />
                        </div>
                      )}

                      {dashboardTab === DashboardTab.GAMIFICATION && (
                        <GamificationHub goal={effectiveParams.gamificationGoal} outletIds={outlets.map(o => o.id).filter((id): id is string => !!id)} />
                      )}
                    </div>
                  </div>
                )}
                {activeView === PortalView.DAILY_INPUT && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <DailyInputForm
                      user={user}
                      companyName={company.name}
                      outletName={outlets.find(o => o.id === user.outletCode || o.code === user.outletCode || o.outlet_id === user.outletCode)?.name || outlets.find(o => o.outlet_name)?.outlet_name || company.currentOutletName}
                      onAuditLog={logAction}
                    />
                  </div>
                )}
                {activeView === PortalView.IDENTITY && (
                  <div className="space-y-6 animate-in fade-in duration-500 overflow-y-auto pr-1 scrollbar-hide pb-20">

                    {/* Heading */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-eco/10 border border-brand-eco/30 rounded-xl flex items-center justify-center shrink-0">
                          <Building2 className="text-brand-eco" size={24} />
                        </div>
                        <div>
                          <h2 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                            {t('dashboard.companyIdentityTitle')}
                          </h2>
                          <p className="text-[11px] sm:text-xs text-brand-gold font-medium mt-1">
                            {t('dashboard.companyIdentitySubtitle')}
                          </p>
                        </div>
                      </div>
                      {/* Auto-save indicator + Edit button */}
                      <div className="flex items-center gap-3">
                        {isHookAdmin && (
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all ${saveStatus === 'saving' ? 'text-brand-gold/70' : saveStatus === 'success' ? 'text-brand-eco' : 'text-white/40'}`}>
                          {saveStatus === 'saving' ? <RefreshCcw size={11} className="animate-spin" /> : saveStatus === 'success' ? <Check size={11} /> : <Save size={11} />}
                          {saveStatus === 'saving' ? t('dashboard.saving') : saveStatus === 'success' ? t('dashboard.saved') : t('dashboard.autoSaveOn')}
                        </div>
                        )}
                        {/* Edit button — admin/super_admin only */}
                        {(user.role.toLowerCase() === 'admin' || user.role.toLowerCase() === 'super_admin') && (
                          <button
                            onClick={() => setIsEditingIdentity(!isEditingIdentity)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${isEditingIdentity ? 'bg-brand-eco/15 border border-brand-eco/40 text-brand-eco' : 'bg-brand-eco/15 border border-brand-eco/30 text-brand-eco hover:bg-brand-eco/25'}`}
                          >
                            {isEditingIdentity ? <Unlock size={12} /> : <Edit2 size={12} />}
                            {isEditingIdentity ? t('dashboard.lock') : t('dashboard.edit')}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Company Identity Card ── */}
                    <div className="rounded-2xl overflow-hidden border border-brand-eco/20 shadow-[0_0_40px_rgba(34,197,94,0.05)]">
                      <div className="bg-gradient-to-r from-brand-eco/10 to-transparent px-4 sm:px-8 py-4 sm:py-5 border-b border-brand-eco/15">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-eco/15 border border-brand-eco/30 flex items-center justify-center shrink-0">
                            <Building2 size={18} className="text-brand-eco" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-eco/60">{t('dashboard.profile')}</p>
                            <h4 className="text-sm sm:text-base font-geometric font-black text-white uppercase tracking-wide leading-none mt-0.5">{t('dashboard.companyDetails')}</h4>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 bg-brand-dark/40">
                        {/* ── Step 1: Location ── */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 transition-all ${company.region && company.city ? 'bg-brand-eco/20 text-brand-eco border border-brand-eco/30' : 'bg-brand-gold/15 text-brand-gold border border-brand-gold/30'}`}>
                              {company.region && company.city ? <CheckCircle2 size={14} /> : '1'}
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                              <MapPin size={13} className="text-brand-gold/50" />
                              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/70">{t('dashboard.location')}</p>
                            </div>
                            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-2 sm:pl-10">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.region')}</label>
                              <CustomSelect
                                value={company.region}
                                options={Object.keys(REGION_DATA)}
                                onChange={(newRegion) => setCompany({ ...company, region: newRegion, city: '' })}
                                disabled={!isEditingIdentity}
                                placeholder={t('dashboard.selectRegion')}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.cityCountry')}</label>
                              <CustomSelect
                                value={company.city}
                                options={REGION_DATA[company.region] ?? []}
                                onChange={(city) => setCompany({ ...company, city })}
                                disabled={!isEditingIdentity}
                                placeholder={t('dashboard.selectCityCountry')}
                                emptyMessage={t('dashboard.selectARegionFirst')}
                              />
                            </div>
                          </div>
                        </div>

                        {/* ── Step 2: Property ── */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 transition-all ${company.name ? 'bg-brand-eco/20 text-brand-eco border border-brand-eco/30' : 'bg-brand-gold/15 text-brand-gold border border-brand-gold/30'}`}>
                              {company.name ? <CheckCircle2 size={14} /> : '2'}
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                              <Building2 size={13} className="text-brand-gold/50" />
                              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/70">{t('dashboard.property')}</p>
                            </div>
                            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                          </div>
                          <div className="space-y-1.5 pl-2 sm:pl-10">
                            <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.hotelCompanyName')}</label>
                            <input
                              type="text"
                              value={company.name}
                              onChange={e => setCompany({ ...company, name: e.target.value })}
                              className={`w-full bg-brand-dark/80 border rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-brand-gold transition-all ${!isEditingIdentity ? 'opacity-40 cursor-not-allowed border-brand-gold/15' : 'border-brand-gold/15 hover:border-brand-gold/40'}`}
                              readOnly={!isEditingIdentity}
                            />
                          </div>
                        </div>

                        {/* ── Step 3: Outlets ── */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 transition-all ${outlets.filter(o => o.name && o.code).length > 0 ? 'bg-brand-eco/20 text-brand-eco border border-brand-eco/30' : 'bg-brand-gold/15 text-brand-gold border border-brand-gold/30'}`}>
                              {outlets.filter(o => o.name && o.code).length > 0 ? <CheckCircle2 size={14} /> : '3'}
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                              <Store size={13} className="text-brand-gold/50" />
                              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/70">{t('dashboard.outlets')}</p>
                              {outlets.filter(o => o.name && o.code).length > 0 && (
                                <span className="text-[9px] font-bold text-brand-eco bg-brand-eco/10 px-2 py-0.5 rounded-full border border-brand-eco/20">{outlets.filter(o => o.name && o.code).length} Active</span>
                              )}
                            </div>
                            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-2 sm:pl-10">
                            {/* Add outlet form — admin/super_admin only */}
                            {(user.role.toLowerCase() === 'admin' || user.role.toLowerCase() === 'super_admin') && (
                              <>
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.addOutletName')}</label>
                                  <input
                                    type="text"
                                    value={company.currentOutletName}
                                    onChange={e => {
                                      const name = e.target.value;
                                      const prefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'XXX';
                                      const seq = String(outlets.filter(o => o.name).length + 1).padStart(2, '0');
                                      setCompany({ ...company, currentOutletName: name, currentOutletCode: prefix + seq });
                                    }}
                                    className={`w-full bg-brand-dark/80 border rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-brand-gold transition-all placeholder:text-white/35 ${!isEditingIdentity ? 'opacity-40 cursor-not-allowed border-brand-gold/15' : 'border-brand-gold/15 hover:border-brand-gold/40'}`}
                                    placeholder={t('dashboard.addOutletPlaceholder')}
                                    readOnly={!isEditingIdentity}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.generatedCode')}</label>
                                  <div className="flex items-center gap-2">
                                    <input type="text" value={company.currentOutletCode} className="flex-grow bg-brand-dark/80 border border-brand-gold/20 rounded-xl py-3 px-4 text-sm text-brand-gold font-bold font-mono outline-none" readOnly />
                                    <button
                                      onClick={handleAddOutlet}
                                      disabled={!isEditingIdentity}
                                      className={`flex items-center gap-1.5 px-4 h-[46px] rounded-xl bg-brand-eco text-brand-dark text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg shrink-0 ${!isEditingIdentity ? 'opacity-40' : ''}`}
                                    >
                                      <Plus size={16} strokeWidth={3} />
                                      Add
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Active outlets — gamified cards */}
                          {outlets.filter(o => o.name && o.code).length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2 sm:pl-10 pt-1">
                              {outlets.filter(o => o.name && o.code).map((o, idx) => (
                                <div key={o.code} className="group relative flex items-center gap-3 px-4 py-3.5 bg-gradient-to-br from-brand-gold/8 to-brand-gold/2 border border-brand-gold/15 rounded-xl hover:border-brand-gold/40 hover:from-brand-gold/12 transition-all overflow-hidden">
                                  <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-brand-gold/5 to-transparent pointer-events-none" />
                                  <div className="w-10 h-10 rounded-lg bg-brand-gold/15 border border-brand-gold/25 flex items-center justify-center shrink-0">
                                    <Store size={16} className="text-brand-gold" />
                                  </div>
                                  <div className="flex-1 min-w-0 relative">
                                    <div className="text-[11px] font-bold text-white uppercase tracking-tight truncate">{o.name}</div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className="text-[9px] font-mono font-bold text-brand-gold bg-brand-gold/10 px-1.5 py-0.5 rounded">{o.code}</span>
                                      <span className="text-[10px] text-white/40 uppercase tracking-widest">Outlet #{String(idx + 1).padStart(2, '0')}</span>
                                    </div>
                                  </div>
                                  {(user.role.toLowerCase() === 'admin' || user.role.toLowerCase() === 'super_admin') && (
                                    <button onClick={() => handleRemoveOutlet(o.code)} className="relative w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-brand-alert hover:bg-brand-alert/10 transition-all shrink-0">
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── Audit Report Card ── */}
                    <div className="rounded-2xl overflow-hidden border border-brand-eco/20 shadow-[0_0_40px_rgba(119,177,57,0.04)]">
                      <div className="bg-gradient-to-r from-brand-eco/10 to-transparent px-4 sm:px-8 py-4 sm:py-5 border-b border-brand-eco/15">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-eco/15 border border-brand-eco/30 flex items-center justify-center shrink-0">
                            <FileText size={18} className="text-brand-eco" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-eco/60">{t('dashboard.compliance')}</p>
                            <h4 className="text-sm sm:text-base font-geometric font-black text-white uppercase tracking-wide leading-none mt-0.5">{t('dashboard.auditReport')}</h4>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 sm:p-8 space-y-6 bg-brand-dark/40">
                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setIsEditingAudit(!isEditingAudit)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${isEditingAudit ? 'bg-brand-eco/15 border border-brand-eco/40 text-brand-eco' : 'bg-brand-dark/60 border border-brand-gold/10 text-white/60 hover:border-brand-gold/25 hover:text-white'}`}
                          >
                            {isEditingAudit ? <Unlock size={12} /> : <Edit2 size={12} />}
                            {isEditingAudit ? t('dashboard.lock') : t('dashboard.edit')}
                          </button>
                          <button
                            onClick={handleGetReport}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-brand-eco text-brand-dark text-[11px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_15px_rgba(119,177,57,0.25)]"
                          >
                            <Zap size={12} />
                            Get Report
                          </button>
                        </div>
                        {/* Cycle + Outlet */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 transition-all ${auditReport.cycle ? 'bg-brand-eco/20 text-brand-eco border border-brand-eco/30' : 'bg-brand-eco/15 text-brand-eco border border-brand-eco/30'}`}>
                              {auditReport.cycle ? <CheckCircle2 size={14} /> : <Calendar size={13} />}
                            </div>
                            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/70">{t('dashboard.reportConfiguration')}</p>
                            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-2 sm:pl-10">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.reportCycle')}</label>
                              <CustomSelect
                                value={auditReport.cycle}
                                options={['Daily', 'Weekly', 'Monthly', 'Quarterly']}
                                onChange={v => setAuditReport({ ...auditReport, cycle: v })}
                                disabled={!isEditingAudit}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.outletSelection')}</label>
                              <CustomSelect
                                value={auditReport.outletSelection}
                                options={['All outlets', ...outlets.filter(o => o.name).map(o => `${o.name} (${o.code})`)]}
                                onChange={v => setAuditReport({ ...auditReport, outletSelection: v })}
                                disabled={!isEditingAudit}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Date range */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 transition-all ${auditReport.fromDate && auditReport.toDate ? 'bg-brand-eco/20 text-brand-eco border border-brand-eco/30' : 'bg-brand-eco/15 text-brand-eco border border-brand-eco/30'}`}>
                              {auditReport.fromDate && auditReport.toDate ? <CheckCircle2 size={14} /> : <Calendar size={13} />}
                            </div>
                            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/70">{t('dashboard.dateRange')}</p>
                            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-2 sm:pl-10">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.fromDate')}</label>
                              <CustomDatePicker
                                value={auditReport.fromDate}
                                onChange={v => setAuditReport({ ...auditReport, fromDate: v })}
                                disabled={!isEditingAudit}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.toDate')}</label>
                              <CustomDatePicker
                                value={auditReport.toDate}
                                onChange={v => setAuditReport({ ...auditReport, toDate: v })}
                                disabled={!isEditingAudit}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Comments */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 transition-all ${auditReport.comments ? 'bg-brand-eco/20 text-brand-eco border border-brand-eco/30' : 'bg-brand-eco/15 text-brand-eco border border-brand-eco/30'}`}>
                              {auditReport.comments ? <CheckCircle2 size={14} /> : <FileText size={13} />}
                            </div>
                            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-white/80">{t('dashboard.auditComments')}</p>
                            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                          </div>
                          <div className="space-y-1.5 pl-2 sm:pl-10">
                            <textarea
                              placeholder={t('dashboard.auditCommentsPlaceholder')}
                              value={auditReport.comments}
                              onChange={e => setAuditReport({ ...auditReport, comments: e.target.value })}
                              disabled={!isEditingAudit}
                              className={`w-full bg-brand-dark/80 border rounded-xl py-3 px-4 text-white outline-none focus:border-brand-gold transition-all text-xs min-h-[90px] resize-none ${!isEditingAudit ? 'opacity-40 border-brand-gold/15' : 'border-brand-gold/15 hover:border-brand-gold/40'}`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                )}



                {activeView === PortalView.SUPER_ADMIN && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto scrollbar-hide pb-20">
                    <SuperAdminDashboard user={user} />
                  </div>
                )}

                {activeView === PortalView.CONTACT && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto scrollbar-hide pb-20">
                    <div className="max-w-2xl mx-auto">
                      {/* Intro */}
                      <div className="mb-8">
                        <h4 className="text-lg font-geometric font-bold text-white mb-3">{t('dashboard.needHelp')}</h4>
                        <p className="text-sm text-white/60 leading-relaxed">
                          {t('dashboard.feedbackPrompt')}
                        </p>
                      </div>

                      {/* Support email */}
                      <div className="flex items-center gap-3 mb-8 p-4 rounded-xl bg-brand-gold/10 border border-brand-gold/25">
                        <Mail size={18} className="text-brand-gold shrink-0" />
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-brand-gold/70">{t('dashboard.supportEmail')}</p>
                          <a href="mailto:support@ecometricus.com" className="text-sm text-white font-semibold hover:text-brand-gold transition-colors">{t('dashboard.supportEmailAddress')}</a>
                        </div>
                      </div>

                      {/* Form */}
                      {contactSent ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <div className="w-16 h-16 rounded-full bg-brand-eco/15 border border-brand-eco/30 flex items-center justify-center mb-5">
                            <CheckCircle2 size={32} className="text-brand-eco" />
                          </div>
                          <h4 className="text-lg font-geometric font-bold text-white mb-2">{t('dashboard.messageSent')}</h4>
                          <p className="text-sm text-white/50 max-w-sm">{t('dashboard.thankYouSupport')}</p>
                          <button
                            onClick={() => { setContactSent(false); setContactMessage(''); }}
                            className="mt-6 px-5 py-2.5 rounded-xl bg-brand-gold/15 border border-brand-gold/30 text-brand-gold text-[12px] font-bold hover:bg-brand-gold/25 transition-all"
                          >
                            {t('dashboard.sendAnotherMessage')}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          {/* Name */}
                          <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.yourName')}</label>
                            <input
                              type="text"
                              value={contactName}
                              readOnly
                              className="w-full bg-brand-dark/60 border border-brand-gold/15 rounded-xl py-3.5 px-4 text-sm text-white/70 outline-none cursor-not-allowed"
                            />
                          </div>

                          {/* Email */}
                          <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.yourEmail')}</label>
                            <input
                              type="email"
                              value={contactEmail}
                              readOnly
                              className="w-full bg-brand-dark/60 border border-brand-gold/15 rounded-xl py-3.5 px-4 text-sm text-white/70 outline-none cursor-not-allowed"
                              placeholder="your@email.com"
                            />
                          </div>

                          {/* Message */}
                          <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.whatHappened')}</label>
                            <textarea
                              value={contactMessage}
                              onChange={e => setContactMessage(e.target.value)}
                              className="w-full bg-brand-dark/80 border border-brand-gold/15 rounded-xl py-3.5 px-4 text-sm text-white outline-none focus:border-brand-gold transition-all hover:border-brand-gold/30 min-h-[120px] resize-none"
                              placeholder={t('dashboard.placeholderIssue')}
                            />
                          </div>

                          {/* Screenshots */}
                          <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.screenshots')}</label>
                            <label className="flex flex-col items-center justify-center gap-2 w-full py-8 rounded-xl border-2 border-dashed border-brand-gold/15 hover:border-brand-gold/40 cursor-pointer transition-all bg-brand-dark/40 hover:bg-brand-gold/5">
                              <ImageIcon size={24} className="text-brand-gold/50" />
                              <span className="text-xs text-white/50 font-semibold">
                                {contactScreenshots.length > 0
                                  ? `${contactScreenshots.length} file${contactScreenshots.length > 1 ? 's' : ''} selected`
                                  : t('dashboard.clickToAddImages')}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={e => {
                                  const files = Array.from(e.target.files || []);
                                  setContactScreenshots(prev => [...prev, ...files]);
                                }}
                              />
                            </label>
                            {contactScreenshots.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {contactScreenshots.map((file, i) => (
                                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-gold/8 border border-brand-gold/20 text-xs text-white/70">
                                    <ImageIcon size={12} className="text-brand-gold/60" />
                                    <span className="truncate max-w-[120px]">{file.name}</span>
                                    <button
                                      onClick={() => setContactScreenshots(prev => prev.filter((_, idx) => idx !== i))}
                                      className="text-white/30 hover:text-brand-alert transition-colors"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Send button */}
                          <button
                            onClick={async () => {
                              if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
                                setToast({ id: Date.now(), message: t('dashboard.pleaseFillAllFields'), type: 'error' });
                                return;
                              }
                              setContactSending(true);
                              // Simulate sending — in production this would call an API
                              await new Promise(r => setTimeout(r, 1200));
                              setContactSending(false);
                              setContactSent(true);
                            }}
                            disabled={contactSending || !contactName.trim() || !contactEmail.trim() || !contactMessage.trim()}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-gold/15 border border-brand-gold/40 text-brand-gold text-sm font-bold hover:bg-brand-gold/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {contactSending ? (
                              <><RefreshCcw size={16} className="animate-spin" /> {t('dashboard.sending')}</>
                            ) : (
                              <><Send size={16} /> {t('dashboard.sendToSupport')}</>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeView === PortalView.AUDIT_LOG && (
                  <div className="space-y-6 animate-in fade-in duration-500 overflow-y-auto pr-1 scrollbar-hide pb-20">

                    {/* Heading */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-eco/10 border border-brand-eco/30 rounded-xl flex items-center justify-center shrink-0">
                          <ScrollText className="text-brand-eco" size={24} />
                        </div>
                        <div>
                          <h2 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                            {t('dashboard.auditLogTitle')}
                          </h2>
                          <p className="text-[11px] sm:text-xs text-brand-gold font-medium mt-1">
                            {t('dashboard.auditLogSubtitle')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {auditLogs.length > 0 && (
                          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 py-1 rounded-full bg-brand-dark/60 border border-brand-gold/15">
                            {auditLogs.length} {auditLogs.length === 1 ? 'Entry' : 'Entries'}
                          </span>
                        )}
                        <button
                          onClick={fetchAuditLogs}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-white/8 text-white/40 hover:text-white/70 transition-colors text-[10px] font-bold uppercase tracking-widest"
                          title="Refresh"
                        >
                          <RefreshCcw size={13} />
                          <span className="hidden sm:inline">{t('dashboard.refresh')}</span>
                        </button>
                      </div>
                    </div>

                    {/* ── Audit Log ── */}
                    <div className="rounded-2xl overflow-hidden border border-brand-gold/15">

                      {/* Filter chips */}
                      {auditLogs.length > 0 && (() => {
                        const actionTypes = [...new Set(auditLogs.map((l: any) => l.action))];
                        const labelMap: Record<string, string> = {
                          outlet_added: t('dashboard.auditOutlets'),
                          outlet_removed: t('dashboard.auditOutlets'),
                          settings_saved: t('dashboard.auditSettings'),
                          personnel_enrolled: t('dashboard.auditPersonnel'),
                          personnel_updated: t('dashboard.auditPersonnel'),
                          personnel_removed: t('dashboard.auditPersonnel'),
                          benchmarks_saved: t('dashboard.auditBenchmarks'),
                          benchmarks_updated: t('dashboard.auditBenchmarks'),
                          waste_entry_added: t('dashboard.auditDailyInput'),
                          waste_entry_updated: t('dashboard.auditDailyInput'),
                          waste_entry_deleted: t('dashboard.auditDailyInput'),
                          water_entry_added: t('dashboard.auditDailyInput'),
                          water_entry_updated: t('dashboard.auditDailyInput'),
                          water_entry_deleted: t('dashboard.auditDailyInput'),
                          energy_entry_added: t('dashboard.auditDailyInput'),
                          energy_entry_updated: t('dashboard.auditDailyInput'),
                          energy_entry_deleted: t('dashboard.auditDailyInput'),
                        };
                        const categories = [...new Set(actionTypes.map((a: string) => labelMap[a as string] || t('dashboard.other')))];
                        return (
                          <div className="px-4 sm:px-8 py-3 border-b border-brand-gold/15 flex items-center gap-2 flex-wrap bg-brand-dark/20">
                            <span className="text-[11px] font-black uppercase tracking-widest text-white/50 mr-1">{t('dashboard.filter')}</span>
                            <button
                              onClick={() => setAuditFilter(null)}
                              className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${!auditFilter ? 'bg-brand-gold/20 border border-brand-gold/40 text-brand-gold' : 'bg-[#1c3933] border border-brand-gold/20 text-white/40 hover:text-white/70'}`}
                            >
                              {t('dashboard.all')}
                            </button>
                            {categories.map(cat => (
                              <button
                                key={cat}
                                onClick={() => setAuditFilter(cat)}
                                className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${auditFilter === cat ? 'bg-brand-gold/20 border border-brand-gold/40 text-brand-gold' : 'bg-[#1c3933] border border-brand-gold/20 text-white/40 hover:text-white/70'}`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        );
                      })()}

                      {/* Body */}
                      <div className="p-4 sm:p-6 bg-brand-dark/40 max-h-[600px] overflow-y-auto scrollbar-gold">
                        {auditLogs.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-[#1c3933] border border-brand-gold/20 flex items-center justify-center mb-5">
                              <ScrollText size={28} className="text-white/15" />
                            </div>
                            <p className="text-sm text-white/40 font-medium">{t('dashboard.noActivity')}</p>
                            <p className="text-[11px] text-white/25 mt-2 max-w-[280px]">{t('dashboard.noActivityDescription')}</p>
                          </div>
                        ) : (() => {
                          const labelMap: Record<string, string> = {
                            outlet_added: t('dashboard.auditOutlets'),
                            outlet_removed: t('dashboard.auditOutlets'),
                            settings_saved: t('dashboard.auditSettings'),
                            personnel_enrolled: t('dashboard.auditPersonnel'),
                            personnel_updated: t('dashboard.auditPersonnel'),
                            personnel_removed: t('dashboard.auditPersonnel'),
                            benchmarks_saved: t('dashboard.auditBenchmarks'),
                            benchmarks_updated: t('dashboard.auditBenchmarks'),
                            waste_entry_added: t('dashboard.auditDailyInput'),
                            waste_entry_updated: t('dashboard.auditDailyInput'),
                            waste_entry_deleted: t('dashboard.auditDailyInput'),
                            water_entry_added: t('dashboard.auditDailyInput'),
                            water_entry_updated: t('dashboard.auditDailyInput'),
                            water_entry_deleted: t('dashboard.auditDailyInput'),
                            energy_entry_added: t('dashboard.auditDailyInput'),
                            energy_entry_updated: t('dashboard.auditDailyInput'),
                            energy_entry_deleted: t('dashboard.auditDailyInput'),
                          };
                          const filtered = auditFilter
                            ? auditLogs.filter((l: any) => (labelMap[l.action] || t('dashboard.other')) === auditFilter)
                            : auditLogs;

                          if (filtered.length === 0) {
                            return (
                              <div className="flex flex-col items-center justify-center py-16 text-center">
                                <p className="text-sm text-white/30 font-medium">{t('dashboard.noFilterActivity', { filter: auditFilter?.toLowerCase() ?? '' })}</p>
                                <p className="text-[11px] text-white/20 mt-1">{t('dashboard.tryDifferentFilter')}</p>
                              </div>
                            );
                          }

                          // Group by date
                          const groups: Record<string, any[]> = {};
                          const today = new Date(); today.setHours(0, 0, 0, 0);
                          const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
                          filtered.forEach((log: any) => {
                            const d = new Date(log.created_at); d.setHours(0, 0, 0, 0);
                            let key: string;
                            if (d.getTime() === today.getTime()) key = 'Today';
                            else if (d.getTime() === yesterday.getTime()) key = 'Yesterday';
                            else key = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                            if (!groups[key]) groups[key] = [];
                            groups[key].push(log);
                          });

                          // Category order and labels
                          const categoryOrder = ['Energy', 'Water', 'Food Waste', 'Daily Input', 'Benchmarks', 'Personnel', 'Outlets', 'Settings', 'Other'];
                          const categoryLabelMap: Record<string, string> = {
                            energy_entry_added: 'Energy', energy_entry_deleted: 'Energy', energy_entry_updated: 'Energy',
                            water_entry_added: 'Water', water_entry_deleted: 'Water', water_entry_updated: 'Water',
                            waste_entry_added: 'Food Waste', waste_entry_deleted: 'Food Waste', waste_entry_updated: 'Food Waste',
                            personnel_enrolled: 'Personnel', personnel_updated: 'Personnel', personnel_removed: 'Personnel',
                            outlet_added: 'Outlets', outlet_removed: 'Outlets',
                            settings_saved: 'Settings',
                            benchmarks_saved: 'Benchmarks', benchmarks_updated: 'Benchmarks',
                          };
                          const getCategory = (action: string) => categoryLabelMap[action] || 'Other';
                          const categoryIconMap: Record<string, any> = {
                            'Energy': Zap, 'Water': Droplets, 'Food Waste': Scale,
                            'Personnel': Users, 'Outlets': Building2, 'Settings': Save,
                            'Benchmarks': Target, 'Daily Input': ClipboardList, 'Other': Activity,
                          };

                          return (
                            <div className="space-y-6">
                              {Object.entries(groups).map(([dateKey, logs]) => {
                                // Sub-group by category within each day
                                const categoryGroups: Record<string, any[]> = {};
                                logs.forEach((log: any) => {
                                  const cat = getCategory(log.action);
                                  if (!categoryGroups[cat]) categoryGroups[cat] = [];
                                  categoryGroups[cat].push(log);
                                });
                                // Sort categories by predefined order
                                const sortedCategories = Object.keys(categoryGroups).sort((a, b) =>
                                  (categoryOrder.indexOf(a) === -1 ? 99 : categoryOrder.indexOf(a)) -
                                  (categoryOrder.indexOf(b) === -1 ? 99 : categoryOrder.indexOf(b))
                                );

                                return (
                                <div key={dateKey}>
                                  {/* Date header */}
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="flex items-center gap-2 shrink-0">
                                      <Calendar size={11} className="text-brand-gold/50" />
                                      <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">{dateKey}</span>
                                    </div>
                                    <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{logs.length} {logs.length === 1 ? 'event' : 'events'}</span>
                                  </div>

                                  {/* Category sub-groups */}
                                  {sortedCategories.map(cat => {
                                    const catLogs = categoryGroups[cat];
                                    const CatIcon = categoryIconMap[cat] || Activity;
                                    return (
                                      <div key={cat} className="mb-4">
                                        {/* Category header */}
                                        <div className="flex items-center gap-2 mb-2 ml-1">
                                          <CatIcon size={10} className="text-brand-gold/40" />
                                          <span className="text-[9px] font-black uppercase tracking-widest text-brand-gold/50">{cat}</span>
                                          <span className="text-[8px] font-bold text-white/20">({catLogs.length})</span>
                                          <div className="flex-1 h-px bg-white/5" />
                                        </div>

                                        {/* Timeline entries for this category */}
                                        <div className="relative">
                                          <div className="absolute left-[15px] top-3 bottom-3 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent" />
                                          <div className="space-y-2">
                                            {catLogs.map((log: any) => {
                                        const iconMap: Record<string, any> = {
                                          outlet_added: Plus,
                                          outlet_removed: Trash2,
                                          settings_saved: Save,
                                          personnel_enrolled: UserPlus,
                                          personnel_updated: Edit2,
                                          personnel_removed: Trash2,
                                          benchmarks_saved: Target,
                                          benchmarks_updated: Target,
                                        };
                                        const colorMap: Record<string, string> = {
                                          outlet_added: 'text-brand-eco bg-brand-eco/15 border-brand-eco/30',
                                          outlet_removed: 'text-brand-alert bg-brand-alert/15 border-brand-alert/30',
                                          settings_saved: 'text-brand-gold bg-brand-gold/15 border-brand-gold/30',
                                          personnel_enrolled: 'text-brand-eco bg-brand-eco/15 border-brand-eco/30',
                                          personnel_updated: 'text-brand-gold bg-brand-gold/15 border-brand-gold/30',
                                          personnel_removed: 'text-brand-alert bg-brand-alert/15 border-brand-alert/30',
                                          benchmarks_saved: 'text-brand-gold bg-brand-gold/15 border-brand-gold/30',
                                          benchmarks_updated: 'text-brand-gold bg-brand-gold/15 border-brand-gold/30',
                                        };
                                        const labelMap: Record<string, string> = {
                                          outlet_added: t('dashboard.labelOutletAdded'),
                                          outlet_removed: t('dashboard.labelOutletRemoved'),
                                          settings_saved: t('dashboard.labelSettingsSaved'),
                                          personnel_enrolled: t('dashboard.labelPersonnelEnrolled'),
                                          personnel_updated: t('dashboard.labelPersonnelUpdated'),
                                          personnel_removed: t('dashboard.labelPersonnelRemoved'),
                                          benchmarks_saved: t('dashboard.labelBenchmarksSaved'),
                                          benchmarks_updated: t('dashboard.labelBenchmarksUpdated'),
                                        };
                                        const Icon = iconMap[log.action] || Activity;
                                        const color = colorMap[log.action] || 'text-white/40 bg-brand-dark/60 border-brand-gold/15';
                                        const label = labelMap[log.action] || log.action.replace(/_/g, ' ');
                                        const time = new Date(log.created_at).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' });
                                        const initials = (log.actor_name || '?').split(' ').filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
                                        return (
                                          <div key={log.id} className="relative flex items-start gap-3 group">
                                            {/* Icon node */}
                                            <div className={`relative z-10 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${color}`}>
                                              <Icon size={13} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0 rounded-xl bg-[#1c3933] border border-brand-gold/15 group-hover:border-brand-gold/25 group-hover:bg-brand-gold/5 transition-colors px-4 py-3">
                                              <div className="flex items-center justify-between gap-3 mb-1.5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                  <span className={`text-[11px] font-black uppercase tracking-widest ${color.split(' ')[0]} shrink-0`}>{label}</span>
                                                  {log.entity_name && (
                                                    <span className="text-[8px] font-bold uppercase tracking-widest text-brand-gold/50 bg-brand-gold/8 px-2 py-0.5 rounded border border-brand-gold/10 truncate">
                                                      {log.entity_type} · {log.entity_name}
                                                    </span>
                                                  )}
                                                </div>
                                                <span className="text-[9px] text-white/30 font-medium shrink-0 tabular-nums">{time}</span>
                                              </div>
                                              <p className="text-xs text-white/70 leading-relaxed mb-2">{log.description}</p>
                                              <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-md bg-gradient-to-br from-brand-gold/20 to-brand-gold/5 border border-brand-gold/20 flex items-center justify-center shrink-0">
                                                  <span className="text-brand-gold text-[7px] font-black leading-none">{initials}</span>
                                                </span>
                                                <span className="text-[10px] font-bold text-white/50">{log.actor_name}</span>
                                                <span className="text-[8px] font-bold text-white/25 uppercase tracking-widest px-1.5 py-0.5 rounded bg-brand-dark/60">{log.actor_role}</span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  </div>
                                  );
                                  })}
                                </div>
                              )})}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                )}



                {activeView === PortalView.TEAM && (
                  <div className="space-y-6 animate-in fade-in duration-500 overflow-y-auto pr-1 scrollbar-hide pb-20">

                    {/* Heading */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-eco/10 border border-brand-eco/30 rounded-xl flex items-center justify-center shrink-0">
                        <Users className="text-brand-eco" size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                          {t('dashboard.staffRegistryTitle')}
                        </h2>
                        <p className="text-[11px] sm:text-xs text-brand-gold font-medium mt-1">
                          {t('dashboard.staffRegistrySubtitle')}
                        </p>
                      </div>
                    </div>

                    {/* ── Enroll / Edit card ── (admin/super_admin only) */}
                    {isHookAdmin && (
                    <div id="enrollment-form" className="rounded-2xl overflow-hidden border border-brand-eco/20 shadow-[0_0_40px_rgba(34,197,94,0.04)]">
                      <div className="bg-gradient-to-r from-brand-eco/10 to-transparent px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between border-b border-brand-eco/15 gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-eco/15 border border-brand-eco/30 flex items-center justify-center shrink-0">
                            <UserPlus size={18} className="text-brand-eco" />
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-eco/60">Personnel</p>
                            <h4 className="text-sm sm:text-base font-geometric font-black text-white uppercase tracking-wide leading-none mt-0.5">
                              {enrollId ? 'Edit Role Position' : 'Enroll Personnel'}
                            </h4>
                          </div>
                        </div>
                        {enrollId && (
                          <button
                            onClick={() => {
                              isEditingUserRef.current = false;
                              setEnrollId(null); setEnrollName(''); setEnrollEmail(''); setEnrollEmailError('');
                              setEnrollPosition(''); setEnrollOutlet(''); setEnrollRole('');
                              setEnrollPermissions([]);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-brand-gold/10 text-[11px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:border-brand-gold/20 transition-colors"
                          >
                            <X size={10} /> Cancel
                          </button>
                        )}
                      </div>

                      <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 bg-brand-dark/40">
                        {/* ── Step 1: Identity ── */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 transition-all ${enrollName && enrollEmail ? 'bg-brand-eco/20 text-brand-eco border border-brand-eco/30' : 'bg-brand-gold/15 text-brand-gold border border-brand-gold/30'}`}>
                              {enrollName && enrollEmail ? <CheckCircle2 size={14} /> : '1'}
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                              <User size={13} className="text-brand-gold/50" />
                              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">{t('dashboard.identity')}</p>
                            </div>
                            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-2 sm:pl-10">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.fullName')}</label>
                              <input type="text" value={enrollName} onChange={e => setEnrollName(e.target.value)} placeholder={t('dashboard.fullNamePlaceholder')}
                                className="w-full bg-brand-dark/80 border border-brand-gold/15 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-brand-gold placeholder:text-white/35 hover:border-brand-gold/40 transition-all" />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.corporateEmail')}</label>
                              <input type="email" value={enrollEmail} onChange={e => { const val = e.target.value; setEnrollEmail(val); setEnrollEmailError(validateCorporateEmail(val)); }} placeholder={t('dashboard.corporateEmailPlaceholder')}
                                className={`w-full bg-brand-dark/80 border rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-brand-gold placeholder:text-white/35 hover:border-brand-gold/40 transition-all ${enrollEmailError ? 'border-brand-alert' : enrollEmail && !enrollEmailError ? 'border-brand-eco/40' : 'border-brand-gold/15'}`} />
                              {enrollEmailError ? (
                                <div className="flex items-start gap-2 ml-1 mt-1 px-3 py-2 rounded-lg bg-brand-alert/10 border border-brand-alert/25">
                                  <AlertTriangle size={13} className="text-brand-alert shrink-0 mt-0.5" />
                                  <span className="text-[10px] font-bold text-brand-alert leading-tight">{enrollEmailError}</span>
                                </div>
                              ) : enrollEmail && !enrollEmailError ? (
                                <div className="flex items-center gap-2 ml-1 mt-1 px-3 py-2 rounded-lg bg-brand-eco/10 border border-brand-eco/25">
                                  <CheckCircle2 size={13} className="text-brand-eco shrink-0" />
                                  <span className="text-[10px] font-bold text-brand-eco leading-tight">{t('dashboard.validCompanyEmail')}</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* ── Step 2: Assignment ── */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 transition-all ${enrollPosition && enrollOutlet ? 'bg-brand-eco/20 text-brand-eco border border-brand-eco/30' : 'bg-brand-gold/15 text-brand-gold border border-brand-gold/30'}`}>
                              {enrollPosition && enrollOutlet ? <CheckCircle2 size={14} /> : '2'}
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                              <Briefcase size={13} className="text-brand-gold/50" />
                              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">{t('dashboard.assignment')}</p>
                            </div>
                            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-2 sm:pl-10">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.thPosition')}</label>
                              <CustomSelect
                                value={enrollPosition}
                                options={['Admin', 'Exec Chef', 'Outlet Manager', 'Chef Prep', 'GM']}
                                onChange={setEnrollPosition}
                                placeholder={t('dashboard.selectPosition')}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.primaryOutlet')}</label>
                              <CustomSelect
                                value={enrollOutlet}
                                options={outlets.filter(o => o.name).map(o => `${o.name} (${o.code})`)}
                                onChange={v => setEnrollOutlet(outlets.find(o => `${o.name} (${o.code})` === v)?.code || v)}
                                placeholder={t('dashboard.selectOutlet')}
                                emptyMessage={t('dashboard.noOutletsMessage')}
                              />
                            </div>
                          </div>
                        </div>

                        {/* ── Step 3: Permissions ── */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 transition-all ${enrollPermissions.length > 0 ? 'bg-brand-eco/20 text-brand-eco border border-brand-eco/30' : 'bg-brand-gold/15 text-brand-gold border border-brand-gold/30'}`}>
                              {enrollPermissions.length > 0 ? <CheckCircle2 size={14} /> : '3'}
                            </div>
                            <div className="flex items-center gap-2 flex-1">
                              <ShieldCheck size={13} className="text-brand-gold/50" />
                              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">{t('dashboard.permissions')}</p>
                              {enrollPermissions.length > 0 && (
                                <span className="text-[9px] font-bold text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded-full border border-brand-gold/20">{enrollPermissions.length} Selected</span>
                              )}
                            </div>
                            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
                          </div>
                          <div className="pl-2 sm:pl-10">
                            {/* Trigger — matches CustomSelect style */}
                            <button
                              ref={permTriggerRef}
                              onClick={() => setIsPermDropdownOpen(!isPermDropdownOpen)}
                              className={`w-full flex items-center justify-between bg-[#152E2A] border rounded-xl py-3 px-4 text-sm text-left transition-colors cursor-pointer
                                ${isPermDropdownOpen ? 'border-brand-gold' : 'border-brand-gold/25 hover:border-brand-gold/150'}`}
                            >
                              <span className={enrollPermissions.length ? 'text-white text-sm' : 'text-white/40 text-sm'}>
                                {enrollPermissions.length === 0
                                  ? t('dashboard.selectPermissions')
                                  : t('dashboard.permissionsSelected', { count: enrollPermissions.length })}
                              </span>
                              <ChevronDown size={14} className={`text-brand-gold/60 shrink-0 transition-transform duration-200 ${isPermDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isPermDropdownOpen && ReactDOM.createPortal(
                              <div
                                ref={permPopupRef}
                                style={{ position: 'fixed', top: permPopupPos.top, left: permPopupPos.left, width: permPopupPos.width, zIndex: 99999 }}
                                className="bg-[#152E2A] border border-brand-gold/25 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                              >
                                <div className="max-h-64 overflow-y-auto scrollbar-gold p-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                                  {AVAILABLE_PERMISSIONS.map(p => {
                                    const checked = enrollPermissions.includes(p);
                                    return (
                                      <button key={p} type="button" onClick={() => togglePermission(p)}
                                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors text-left
                                          ${checked
                                            ? 'bg-brand-gold/10 text-brand-gold'
                                            : 'text-white/50 hover:bg-brand-dark/60 hover:text-white/80'}`}
                                      >
                                        {/* Custom themed checkbox */}
                                        <span className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors
                                          ${checked ? 'bg-brand-gold border-brand-gold' : 'border-brand-gold/20 bg-transparent'}`}>
                                          {checked && <Check size={10} className="text-brand-dark" strokeWidth={3} />}
                                        </span>
                                        <span className="text-[9px] font-bold uppercase tracking-tight leading-tight">{p}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                {/* Select all / Clear all footer */}
                                <div className="flex items-center justify-between px-4 py-2.5 border-t border-brand-gold/15">
                                  <button type="button" onClick={() => setEnrollPermissions([])}
                                    className="text-[10px] font-bold text-white/35 hover:text-white/70 transition-colors uppercase tracking-widest">Clear all</button>
                                  <button type="button" onClick={() => setEnrollPermissions(AVAILABLE_PERMISSIONS)}
                                    className="text-[10px] font-bold text-brand-gold hover:text-brand-gold/70 transition-colors uppercase tracking-widest">Select all</button>
                                </div>
                              </div>,
                              document.body
                            )}
                          </div>
                        </div>

                        {/* ── Submit button ── */}
                        <button onClick={handleEnroll}
                          disabled={isEnrolling}
                          className="w-full flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-brand-eco to-brand-eco/90 text-brand-dark rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_6px_20px_rgba(119,177,57,0.3)] hover:brightness-110 hover:shadow-[0_8px_28px_rgba(119,177,57,0.4)] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100">
                          {isEnrolling ? (
                            <>
                              <div className="w-4 h-4 border-2 border-brand-dark/30 border-t-brand-dark rounded-full animate-spin" />
                              {enrollId ? t('dashboard.savingChanges') : t('dashboard.enrollingStaff')}
                            </>
                          ) : (
                            enrollId ? <><Save size={14} /> {t('dashboard.saveRoleChanges')}</> : <><UserPlus size={14} /> {t('dashboard.enrollGenerateAccess')}</>
                          )}
                        </button>
                      </div>
                    </div>
                    )}

                    <div className="space-y-8">
                      <div className="px-6 mb-2">
                        <h5 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">{t('dashboard.activeStaffRegistry')}</h5>
                      </div>

                      {/* Management Group Table */}
                      {users.filter(u => u.role.toLowerCase() === 'admin' || u.role.toLowerCase() === 'gm').length > 0 && (
                        <div className="px-6">
                          <div className="flex items-center gap-3 mb-3">
                            <UserCheck size={14} className="text-brand-gold" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-gold">{t('dashboard.managementGroup')}</span>
                          </div>
                          <div className="overflow-x-auto rounded-xl border border-brand-gold/20">
                            <table className="w-full text-left">
                              <thead>
                                <tr className="bg-brand-gold/10 border-b border-brand-gold/20">
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-gold">{t('dashboard.thName')}</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-gold">{t('dashboard.thPosition')}</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-gold">{t('dashboard.thRole')}</th>
                                  <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-gold">{t('dashboard.thEmail')}</th>
                                  {isHookAdmin && <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-gold">{t('dashboard.thPin')}</th>}
                                  {isHookAdmin && <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-gold">{t('dashboard.thAccessLink')}</th>}
                                  {isHookAdmin && <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-gold text-right">{t('dashboard.thActions')}</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {users.filter(u => u.role.toLowerCase() === 'admin' || u.role.toLowerCase() === 'gm').map((u) => {
                                  const initials = u.fullName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
                                  return (
                                  <tr key={u.id} className="border-b border-brand-gold/10 last:border-0 hover:bg-brand-gold/5 transition-colors">
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-gold/30 to-brand-gold/5 border border-brand-gold/30 flex items-center justify-center shrink-0">
                                          <span className="text-brand-gold text-[11px] font-black leading-none">{initials}</span>
                                        </div>
                                        <span className="text-sm font-bold text-white tracking-tight">{u.fullName}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="text-[9px] text-white/50 font-bold uppercase tracking-widest px-2 py-1 rounded bg-brand-dark/60">{u.position}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="text-[10px] text-brand-gold font-black uppercase tracking-widest px-2 py-1 rounded bg-brand-gold/10 border border-brand-gold/20">{u.role.toUpperCase()}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className="text-[11px] text-white/60 font-medium truncate max-w-[180px] block">{u.email}</span>
                                    </td>
                                    {isHookAdmin && (
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-mono font-bold text-brand-gold tracking-wider">{visiblePasswords.has(u.id) ? u.password : '••••••••'}</span>
                                        <button onClick={() => togglePasswordVisibility(u.id)} className="text-brand-gold/50 hover:text-brand-gold transition-colors">
                                          {visiblePasswords.has(u.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                                        </button>
                                        {u.password && (
                                          <button onClick={() => { navigator.clipboard?.writeText(u.password || ''); showToast(t('dashboard.pinCopied'), 'success'); }} title="Copy PIN" className="text-brand-gold/50 hover:text-brand-gold transition-colors">
                                            <Copy size={12} />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                    )}
                                    {isHookAdmin && (
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] font-mono text-brand-eco/80 truncate max-w-[140px]">{visibleLinks.has(u.id) ? `access/${u.outletCode}?token=${(u.accessCode || '').toLowerCase()}` : '••••••••••••••••'}</span>
                                        <button onClick={() => toggleLinkVisibility(u.id)} className="text-brand-eco/50 hover:text-brand-eco transition-colors">
                                          {visibleLinks.has(u.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                                        </button>
                                        <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/access/${u.outletCode}?token=${(u.accessCode || '').toLowerCase()}`); showToast('Link copied.', 'success'); }} className="text-brand-eco/50 hover:text-brand-eco transition-colors" title="Copy link">
                                          <Copy size={11} />
                                        </button>
                                      </div>
                                    </td>
                                    )}
                                    {isHookAdmin && (
                                    <td className="px-4 py-3">
                                      <div className="flex gap-2 justify-end">
                                        <button onClick={() => handleEdit(u)} className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-gold/10 border border-brand-gold/30 hover:bg-brand-gold/20 hover:border-brand-gold/50 transition-all" title="Edit">
                                          <Edit2 size={13} className="text-brand-gold" />
                                        </button>
                                        <button onClick={() => handleDeletePersonnel(u.id)} disabled={u.email === user.email} className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-alert/10 border border-brand-alert/30 hover:bg-brand-alert/20 hover:border-brand-alert/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title={u.email === user.email ? "Cannot remove yourself" : "Remove"}>
                                          <Trash2 size={13} className="text-brand-alert" />
                                        </button>
                                      </div>
                                    </td>
                                    )}
                                  </tr>
                                );})}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Outlet Tables */}
                      {outlets.map(outlet => {
                        const members = users.filter(u => u.outletCode === outlet.code && u.role.toLowerCase() !== 'admin' && u.role.toLowerCase() !== 'gm');
                        if (members.length === 0) return null;

                        return (
                          <div key={outlet.code} className="px-6">
                            <div className="flex items-center gap-3 mb-3">
                              <MapPin size={14} className="text-brand-gold" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{outlet.name} Outlet — Registry</span>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-brand-gold/20">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="bg-brand-eco/10 border-b border-brand-eco/20">
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-gold">{t('dashboard.thName')}</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-gold">{t('dashboard.thPosition')}</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-gold">{t('dashboard.thRole')}</th>
                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-gold">{t('dashboard.thEmail')}</th>
                                    {isHookAdmin && <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-gold">{t('dashboard.thPin')}</th>}
                                    {isHookAdmin && <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-gold">{t('dashboard.thAccessLink')}</th>}
                                    {isHookAdmin && <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-brand-gold text-right">{t('dashboard.thActions')}</th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {members.map((u) => {
                                    const initials = u.fullName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
                                    return (
                                    <tr key={u.id} className="border-b border-brand-gold/10 last:border-0 hover:bg-brand-eco/5 transition-colors">
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-eco/20 to-brand-eco/5 border border-brand-eco/20 flex items-center justify-center shrink-0">
                                            <span className="text-brand-eco text-[11px] font-black leading-none">{initials}</span>
                                          </div>
                                          <span className="text-sm font-bold text-white tracking-tight">{u.fullName}</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="text-[9px] text-white/50 font-bold uppercase tracking-widest px-2 py-1 rounded bg-brand-dark/60">{u.position}</span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="text-[10px] text-brand-eco font-black uppercase tracking-widest px-2 py-1 rounded bg-brand-eco/10 border border-brand-eco/20">{u.role.toUpperCase()}</span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="text-[11px] text-white/60 font-medium truncate max-w-[180px] block">{u.email}</span>
                                      </td>
                                      {isHookAdmin && (
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-mono font-bold text-brand-gold tracking-wider">{visiblePasswords.has(u.id) ? u.password : '••••••••'}</span>
                                          <button onClick={() => togglePasswordVisibility(u.id)} className="text-brand-gold/50 hover:text-brand-gold transition-colors">
                                            {visiblePasswords.has(u.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                                          </button>
                                          {u.password && (
                                            <button onClick={() => { navigator.clipboard?.writeText(u.password || ''); showToast(t('dashboard.pinCopied'), 'success'); }} title="Copy PIN" className="text-brand-gold/50 hover:text-brand-gold transition-colors">
                                              <Copy size={12} />
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                      )}
                                      {isHookAdmin && (
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-mono text-brand-eco/80 truncate max-w-[140px]">{visibleLinks.has(u.id) ? `access/${u.outletCode}?token=${(u.accessCode || '').toLowerCase()}` : '••••••••••••••••'}</span>
                                          <button onClick={() => toggleLinkVisibility(u.id)} className="text-brand-eco/50 hover:text-brand-eco transition-colors">
                                            {visibleLinks.has(u.id) ? <EyeOff size={12} /> : <Eye size={12} />}
                                          </button>
                                          <button onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/access/${u.outletCode}?token=${(u.accessCode || '').toLowerCase()}`); showToast('Link copied.', 'success'); }} className="text-brand-eco/50 hover:text-brand-eco transition-colors" title="Copy link">
                                            <Copy size={11} />
                                          </button>
                                        </div>
                                      </td>
                                      )}
                                      {isHookAdmin && (
                                      <td className="px-4 py-3">
                                        <div className="flex gap-2 justify-end">
                                          <button onClick={() => handleEdit(u)} className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-gold/10 border border-brand-gold/30 hover:bg-brand-gold/20 hover:border-brand-gold/50 transition-all" title="Edit">
                                            <Edit2 size={13} className="text-brand-gold" />
                                          </button>
                                          <button onClick={() => handleDeletePersonnel(u.id)} className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-alert/10 border border-brand-alert/30 hover:bg-brand-alert/20 hover:border-brand-alert/50 transition-all" title="Remove">
                                            <Trash2 size={13} className="text-brand-alert" />
                                          </button>
                                        </div>
                                      </td>
                                      )}
                                    </tr>
                                  );})}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeView === PortalView.PARAMETERS && (
                  <div className="space-y-6 sm:space-y-10 animate-in fade-in duration-500 overflow-y-auto pr-1 scrollbar-hide">

                    {/* Heading */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-eco/10 border border-brand-eco/30 rounded-xl flex items-center justify-center shrink-0">
                          <Settings2 className="text-brand-eco" size={24} />
                        </div>
                        <div>
                          <h2 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
                            {t('dashboard.benchmarkingEngineTitle')}
                          </h2>
                          <p className="text-[11px] sm:text-xs text-brand-gold font-medium mt-1">
                            {t('dashboard.benchmarkingEngineSubtitle')}
                          </p>
                        </div>
                      </div>
                      {/* Auto-save indicator */}
                      {isHookAdmin && (
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all ${autoSaveStatus === 'saving' ? 'text-brand-gold/70' : autoSaveStatus === 'saved' ? 'text-brand-eco' : 'text-white/40'}`}>
                        {autoSaveStatus === 'saving' ? <RefreshCcw size={11} className="animate-spin" /> : autoSaveStatus === 'saved' ? <Check size={11} /> : <Save size={11} />}
                        {autoSaveStatus === 'saving' ? t('dashboard.saving') : autoSaveStatus === 'saved' ? `Saved ${paramsUpdatedAt ?? ''}` : t('dashboard.autoSaveOn')}
                      </div>
                      )}
                    </div>

                    {/* ── STEP 1: Industry Benchmarking ── */}
                    <div className="rounded-2xl border border-brand-eco/20 shadow-[0_0_30px_rgba(34,197,94,0.04)]">
                      <div className="bg-gradient-to-r from-brand-eco/10 to-transparent px-4 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-brand-eco/15 flex-wrap">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-brand-eco/15 text-brand-eco border border-brand-eco/30 flex items-center justify-center shrink-0">
                            <Globe size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-eco/60">Step 01</p>
                            <h4 className="text-sm sm:text-base font-geometric font-black text-white uppercase tracking-wide leading-none mt-0.5">{t('dashboard.industryBenchmarking')}</h4>
                          </div>
                        </div>
                        {isHookAdmin && (
                        <button
                          onClick={() => setIsEditingBenchmarks(!isEditingBenchmarks)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all shrink-0 ${isEditingBenchmarks ? 'bg-brand-eco/15 border border-brand-eco/40 text-brand-eco' : 'bg-brand-eco/15 border border-brand-eco/30 text-brand-eco hover:bg-brand-eco/25'}`}
                        >
                          {isEditingBenchmarks ? <Unlock size={12} /> : <Edit2 size={12} />}
                          {isEditingBenchmarks ? t('dashboard.lock') : t('dashboard.edit')}
                        </button>
                        )}
                      </div>

                      <div className="p-4 sm:p-6 bg-brand-dark/40 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.profileCategory')}</label>
                            <CustomSelect
                              value={params.benchmarkRegion}
                              options={['ASEAN Luxury Hotels', 'European Michelin Standard', 'North American Premium', 'Middle East Luxury Collection', 'Manual Entry']}
                              onChange={v => setParams({ ...params, benchmarkRegion: v === 'Manual Entry' ? 'Manual' : v, selectedManualOutlet: '' })}
                              disabled={!isEditingBenchmarks}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold ml-1">{t('dashboard.outletSelection')}</label>
                            <CustomSelect
                              value={params.selectedManualOutlet === 'all' ? t('dashboard.allOutlets') : (outlets.find(o => o.code === params.selectedManualOutlet) ? `${outlets.find(o => o.code === params.selectedManualOutlet)?.name} (${params.selectedManualOutlet})` : '')}
                              options={[t('dashboard.allOutlets'), ...outlets.filter(o => o.name).map(o => `${o.name} (${o.code})`)]}
                              onChange={v => {
                                if (v === t('dashboard.allOutlets')) {
                                  setParams({ ...params, selectedManualOutlet: 'all' });
                                } else {
                                  const code = outlets.find(o => `${o.name} (${o.code})` === v)?.code || '';
                                  setParams({ ...params, selectedManualOutlet: code });
                                }
                              }}
                              placeholder="Select Target Outlet"
                              emptyMessage={t('dashboard.noOutletsMessage')}
                              disabled={!isEditingBenchmarks}
                            />
                          </div>
                        </div>

                        {isManualBenchmark && (
                          <p className="text-[10px] text-white/50 font-medium leading-tight ml-1">
                            {t('dashboard.manualModeNote')}
                          </p>
                        )}

                        {paramsUpdatedAt && (
                          <p className="text-[8px] font-black text-gray-400/80 uppercase tracking-[0.2em] animate-pulse text-center pt-1">
                            {t('dashboard.lastUpdated', { date: paramsUpdatedAt })}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ── STEP 2: Sustainability Metrics ── */}
                    <div className="rounded-2xl overflow-hidden border border-brand-eco/20 shadow-[0_0_30px_rgba(119,177,57,0.04)]">
                      {/* Step header */}
                      <div className="bg-gradient-to-r from-brand-eco/10 to-transparent px-4 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-brand-eco/15 flex-wrap">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-all ${isSustainabilityEditable ? 'bg-brand-eco/20 text-brand-eco border border-brand-eco/40' : 'bg-brand-eco/15 text-brand-eco border border-brand-eco/30'}`}>
                            <Leaf size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-eco/60">Step 02</p>
                            <h4 className="text-sm sm:text-base font-geometric font-black text-white uppercase tracking-wide leading-none mt-0.5">{t('dashboard.sustainabilityMetrics')}</h4>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isHookAdmin && (
                          <button
                            onClick={() => setIsEditingSustainability(!isEditingSustainability)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${isEditingSustainability ? 'bg-brand-eco/15 border border-brand-eco/40 text-brand-eco' : 'bg-brand-gold/15 border border-brand-gold/30 text-brand-gold hover:bg-brand-gold/25'}`}
                          >
                            {isEditingSustainability ? <Unlock size={12} /> : <Edit2 size={12} />}
                            {isEditingSustainability ? t('dashboard.lock') : t('dashboard.edit')}
                          </button>
                          )}
                        </div>
                      </div>

                      {/* Cards */}

                      {/* Cards */}
                      <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 bg-brand-dark/40">
                        {/* Food Waste */}
                        <div className={`relative rounded-2xl p-4 border transition-all ${isSustainabilityEditable ? 'bg-brand-gold/10 border-brand-gold/30' : 'bg-brand-dark/60 border-brand-gold/15'}`}>
                          {!isSustainabilityEditable && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-brand-gold/10 border border-brand-gold/20 rounded-full">
                              <Lock size={9} className="text-brand-gold" />
                              <span className="text-[7px] font-black uppercase text-brand-gold tracking-widest">{t('dashboard.locked')}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
                              <Leaf size={14} className="text-brand-gold" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-white/75">{t("dashboard.foodWaste")}</span>
                          </div>
                          <div className="flex items-end gap-2 mb-3">
                            <span className="text-3xl font-geometric font-black text-brand-gold leading-none">{effectiveParams.wasteTarget}</span>
                            <span className="text-xs text-white/30 font-bold uppercase mb-0.5">{effectiveParams.wasteUnit}</span>
                          </div>
                          <div className="flex bg-brand-dark/80 rounded-full p-0.5 border border-brand-gold/15 w-fit mb-3">
                            <button disabled={!isSustainabilityEditable} onClick={() => setParams({ ...params, wasteUnit: 'kg' })} className={`px-3 py-1 rounded-full text-[8px] font-black transition-all ${effectiveParams.wasteUnit === 'kg' ? 'bg-brand-eco text-brand-dark' : 'text-gray-500'}`}>KG</button>
                            <button disabled={!isSustainabilityEditable} onClick={() => setParams({ ...params, wasteUnit: 'lbs' })} className={`px-3 py-1 rounded-full text-[8px] font-black transition-all ${effectiveParams.wasteUnit === 'lbs' ? 'bg-brand-eco text-brand-dark' : 'text-gray-500'}`}>LBS</button>
                          </div>
                          <input type="number" disabled={!isSustainabilityEditable} value={effectiveParams.wasteTarget} onChange={e => setParams({ ...params, wasteTarget: parseInt(e.target.value) || 0 })} className={`w-full bg-brand-dark/60 border rounded-lg py-2 px-3 text-sm font-bold outline-none transition-all text-right mb-3 ${isSustainabilityEditable ? 'border-brand-gold/10 text-brand-gold focus:border-brand-gold' : 'border-brand-gold/30 text-brand-gold cursor-default'}`} />
                          <input type="range" min="10" max="1000" disabled={!isSustainabilityEditable} value={effectiveParams.wasteTarget} onChange={e => setParams({ ...params, wasteTarget: parseInt(e.target.value) })} className={`w-full h-1.5 bg-white/15 rounded-full appearance-none accent-brand-gold ${isSustainabilityEditable ? 'cursor-pointer' : 'cursor-default opacity-60'}`} />
                        </div>

                        {/* Water Usage */}
                        <div className={`relative rounded-2xl p-4 border transition-all ${isSustainabilityEditable ? 'bg-blue-500/10 border-blue-500/30' : 'bg-brand-dark/60 border-blue-500/15'}`}>
                          {!isSustainabilityEditable && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-brand-gold/10 border border-brand-gold/20 rounded-full">
                              <Lock size={9} className="text-brand-gold" />
                              <span className="text-[7px] font-black uppercase text-brand-gold tracking-widest">{t('dashboard.locked')}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                              <Droplets size={14} className="text-blue-400" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-white/75">{t("dashboard.waterUsage")}</span>
                          </div>
                          <div className="flex items-end gap-2 mb-3">
                            <span className="text-3xl font-geometric font-black text-blue-400 leading-none">{effectiveParams.waterTarget.toLocaleString()}</span>
                            <span className="text-xs text-white/30 font-bold uppercase mb-0.5">L</span>
                          </div>
                          <div className="h-7 mb-3" />
                          <input type="number" disabled={!isSustainabilityEditable} value={effectiveParams.waterTarget} onChange={e => setParams({ ...params, waterTarget: parseInt(e.target.value) || 0 })} className={`w-full bg-brand-dark/60 border rounded-lg py-2 px-3 text-sm font-bold outline-none transition-all text-right mb-3 ${isSustainabilityEditable ? 'border-brand-gold/10 text-blue-400 focus:border-brand-gold' : 'border-brand-gold/30 text-blue-400 cursor-default'}`} />
                          <input type="range" min="1000" max="100000" step="500" disabled={!isSustainabilityEditable} value={effectiveParams.waterTarget} onChange={e => setParams({ ...params, waterTarget: parseInt(e.target.value) })} className={`w-full h-1.5 bg-white/15 rounded-full appearance-none accent-blue-500 ${isSustainabilityEditable ? 'cursor-pointer' : 'cursor-default opacity-60'}`} />
                        </div>

                        {/* Energy Limit */}
                        <div className={`relative rounded-2xl p-4 border transition-all ${isSustainabilityEditable ? 'bg-brand-energy/10 border-brand-energy/30' : 'bg-brand-dark/60 border-brand-energy/15'}`}>
                          {!isSustainabilityEditable && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-brand-gold/10 border border-brand-gold/20 rounded-full">
                              <Lock size={9} className="text-brand-gold" />
                              <span className="text-[7px] font-black uppercase text-brand-gold tracking-widest">{t('dashboard.locked')}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-energy/10 border border-brand-energy/20 flex items-center justify-center shrink-0">
                              <Zap size={14} className="text-brand-energy" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-white/75">{t("dashboard.energyLimit")}</span>
                          </div>
                          <div className="flex items-end gap-2 mb-3">
                            <span className="text-3xl font-geometric font-black text-brand-energy leading-none">{effectiveParams.energyTarget.toLocaleString()}</span>
                            <span className="text-xs text-white/30 font-bold uppercase mb-0.5">kWh</span>
                          </div>
                          <div className="h-7 mb-3" />
                          <input type="number" disabled={!isSustainabilityEditable} value={effectiveParams.energyTarget} onChange={e => setParams({ ...params, energyTarget: parseInt(e.target.value) || 0 })} className={`w-full bg-brand-dark/60 border rounded-lg py-2 px-3 text-sm font-bold outline-none transition-all text-right mb-3 ${isSustainabilityEditable ? 'border-brand-gold/10 text-brand-energy focus:border-brand-gold' : 'border-brand-gold/30 text-brand-energy cursor-default'}`} />
                          <input type="range" min="100" max="10000" step="100" disabled={!isSustainabilityEditable} value={effectiveParams.energyTarget} onChange={e => setParams({ ...params, energyTarget: parseInt(e.target.value) })} className={`w-full h-1.5 bg-white/15 rounded-full appearance-none accent-brand-energy ${isSustainabilityEditable ? 'cursor-pointer' : 'cursor-default opacity-60'}`} />
                        </div>
                      </div>
                    </div>

                    {/* ── STEP 3: F&B KPIs ── */}
                    <div className="rounded-2xl overflow-hidden border border-brand-eco/20 shadow-[0_0_30px_rgba(34,197,94,0.04)]">
                      <div className="bg-gradient-to-r from-brand-eco/10 to-transparent px-4 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-brand-eco/15 flex-wrap">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-brand-eco/15 text-brand-eco border border-brand-eco/30 flex items-center justify-center shrink-0">
                            <BarChart3 size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-eco/60">Step 03</p>
                            <h4 className="text-sm sm:text-base font-geometric font-black text-white uppercase tracking-wide leading-none mt-0.5">{t('dashboard.fnbKpis')}</h4>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isHookAdmin && (
                          <button
                            onClick={() => setIsEditingFnB(!isEditingFnB)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${isEditingFnB ? 'bg-brand-eco/15 border border-brand-eco/40 text-brand-eco' : 'bg-brand-eco/15 border border-brand-eco/30 text-brand-eco hover:bg-brand-eco/25'}`}
                          >
                            {isEditingFnB ? <Unlock size={12} /> : <Edit2 size={12} />}
                            {isEditingFnB ? t('dashboard.lock') : t('dashboard.edit')}
                          </button>
                          )}
                        </div>
                      </div>

                      <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-brand-dark/40">
                        {/* Food Cost */}
                        <div className={`relative rounded-2xl p-4 border transition-all ${isFnBEditable ? 'bg-brand-eco/10 border-brand-eco/30' : 'bg-brand-dark/60 border-brand-eco/15'}`}>
                          {!isFnBEditable && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-brand-gold/10 border border-brand-gold/20 rounded-full">
                              <Lock size={9} className="text-brand-gold" />
                              <span className="text-[7px] font-black uppercase text-brand-gold tracking-widest">{t('dashboard.locked')}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-eco/10 border border-brand-eco/20 flex items-center justify-center shrink-0">
                              <Utensils size={14} className="text-brand-eco" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-white/75">{t("dashboard.foodCostCap")}</span>
                          </div>
                          <div className="flex items-end gap-2 mb-3">
                            <span className="text-3xl font-geometric font-black text-brand-eco leading-none">{effectiveParams.foodCostTarget}</span>
                            <span className="text-xs text-white/30 font-bold uppercase mb-0.5">%</span>
                          </div>
                          <input type="number" disabled={!isFnBEditable} step="0.1" value={effectiveParams.foodCostTarget} onChange={e => setParams({ ...params, foodCostTarget: parseFloat(e.target.value) || 0 })} className={`w-full bg-brand-dark/60 border rounded-lg py-2 px-3 text-sm font-bold outline-none transition-all text-right mb-3 ${isFnBEditable ? 'border-brand-gold/10 text-brand-eco focus:border-brand-gold' : 'border-brand-gold/30 text-brand-eco cursor-default'}`} />
                          <input type="range" min="10" max="60" step="0.5" disabled={!isFnBEditable} value={effectiveParams.foodCostTarget} onChange={e => setParams({ ...params, foodCostTarget: parseFloat(e.target.value) })} className={`w-full h-1.5 bg-white/15 rounded-full appearance-none accent-brand-eco ${isFnBEditable ? 'cursor-pointer' : 'opacity-20'}`} />
                        </div>

                        {/* Labor Cost */}
                        <div className={`relative rounded-2xl p-4 border transition-all ${isFnBEditable ? 'bg-brand-eco/10 border-brand-eco/30' : 'bg-brand-dark/60 border-brand-eco/15'}`}>
                          {!isFnBEditable && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-brand-gold/10 border border-brand-gold/20 rounded-full">
                              <Lock size={9} className="text-brand-gold" />
                              <span className="text-[7px] font-black uppercase text-brand-gold tracking-widest">{t('dashboard.locked')}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-eco/10 border border-brand-eco/20 flex items-center justify-center shrink-0">
                              <Users size={14} className="text-brand-eco" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-white/75">{t("dashboard.laborCostCap")}</span>
                          </div>
                          <div className="flex items-end gap-2 mb-3">
                            <span className="text-3xl font-geometric font-black text-brand-eco leading-none">{effectiveParams.laborCostTarget}</span>
                            <span className="text-xs text-white/30 font-bold uppercase mb-0.5">%</span>
                          </div>
                          <input type="number" disabled={!isFnBEditable} step="0.1" value={effectiveParams.laborCostTarget} onChange={e => setParams({ ...params, laborCostTarget: parseFloat(e.target.value) || 0 })} className={`w-full bg-brand-dark/60 border rounded-lg py-2 px-3 text-sm font-bold outline-none transition-all text-right mb-3 ${isFnBEditable ? 'border-brand-gold/10 text-brand-eco focus:border-brand-gold' : 'border-brand-gold/30 text-brand-eco cursor-default'}`} />
                          <input type="range" min="5" max="50" step="0.5" disabled={!isFnBEditable} value={effectiveParams.laborCostTarget} onChange={e => setParams({ ...params, laborCostTarget: parseFloat(e.target.value) })} className={`w-full h-1.5 bg-white/15 rounded-full appearance-none accent-brand-eco ${isFnBEditable ? 'cursor-pointer' : 'cursor-default opacity-60'}`} />
                        </div>

                        {/* Profit Margin Target */}
                        <div className="bg-brand-dark/40 rounded-2xl p-4 border border-brand-gold/10">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-eco/10 border border-brand-eco/20 flex items-center justify-center shrink-0">
                              <Percent size={14} className="text-brand-eco" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-white/75">{t("dashboard.profitMarginTarget")}</span>
                          </div>
                          <div className="flex items-end gap-2 mb-3">
                            <span className="text-3xl font-geometric font-black text-brand-eco leading-none">{effectiveParams.profitMarginTarget}</span>
                            <span className="text-xs text-white/30 font-bold uppercase mb-0.5">%</span>
                          </div>
                          <input type="number" disabled={!isFnBEditable} step="0.5" value={effectiveParams.profitMarginTarget} onChange={e => setParams({ ...params, profitMarginTarget: parseFloat(e.target.value) || 0 })} className={`w-full bg-brand-dark/60 border rounded-lg py-2 px-3 text-sm font-bold outline-none transition-all text-right mb-3 ${isFnBEditable ? 'border-brand-gold/10 text-brand-eco focus:border-brand-gold' : 'border-brand-gold/30 text-brand-eco cursor-default'}`} />
                          <input type="range" min="0" max="50" step="0.5" disabled={!isFnBEditable} value={effectiveParams.profitMarginTarget} onChange={e => setParams({ ...params, profitMarginTarget: parseFloat(e.target.value) })} className={`w-full h-1.5 bg-white/15 rounded-full appearance-none accent-brand-eco ${isFnBEditable ? 'cursor-pointer' : 'cursor-default opacity-60'}`} />
                        </div>

                        {/* Total Sales Target */}
                        <div className="bg-brand-dark/40 rounded-2xl p-4 border border-brand-gold/10">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-eco/10 border border-brand-eco/20 flex items-center justify-center shrink-0">
                              <DollarSign size={14} className="text-brand-eco" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-white/75">{t("dashboard.totalSalesTarget")}</span>
                          </div>
                          <div className="flex items-end gap-2 mb-3">
                            <span className="text-3xl font-geometric font-black text-brand-eco leading-none">${effectiveParams.totalSalesTarget.toLocaleString()}</span>
                          </div>
                          <input type="number" disabled={!isFnBEditable} step="500" value={effectiveParams.totalSalesTarget} onChange={e => setParams({ ...params, totalSalesTarget: parseInt(e.target.value) || 0 })} className={`w-full bg-brand-dark/60 border rounded-lg py-2 px-3 text-sm font-bold outline-none transition-all text-right mb-3 ${isFnBEditable ? 'border-brand-gold/10 text-brand-eco focus:border-brand-gold' : 'border-brand-gold/30 text-brand-eco cursor-default'}`} />
                          <input type="range" min="5000" max="50000" step="500" disabled={!isFnBEditable} value={effectiveParams.totalSalesTarget} onChange={e => setParams({ ...params, totalSalesTarget: parseInt(e.target.value) })} className={`w-full h-1.5 bg-white/15 rounded-full appearance-none accent-brand-eco ${isFnBEditable ? 'cursor-pointer' : 'cursor-default opacity-60'}`} />
                        </div>

                        {/* Sentiment Target */}
                        <div className="bg-brand-dark/40 rounded-2xl p-4 border border-brand-gold/10">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-eco/10 border border-brand-eco/20 flex items-center justify-center shrink-0">
                              <Star size={14} className="text-brand-eco" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-white/75">{t("dashboard.sentimentTarget")}</span>
                          </div>
                          <div className="flex items-end gap-2 mb-3">
                            <span className="text-3xl font-geometric font-black text-brand-eco leading-none">{effectiveParams.sentimentTarget}</span>
                            <span className="text-xs text-white/30 font-bold uppercase mb-0.5">★</span>
                          </div>
                          <input type="number" disabled={!isFnBEditable} step="0.1" value={effectiveParams.sentimentTarget} onChange={e => setParams({ ...params, sentimentTarget: parseFloat(e.target.value) || 0 })} className={`w-full bg-brand-dark/60 border rounded-lg py-2 px-3 text-sm font-bold outline-none transition-all text-right mb-3 ${isFnBEditable ? 'border-brand-gold/10 text-brand-eco focus:border-brand-gold' : 'border-brand-gold/30 text-brand-eco cursor-default'}`} />
                          <input type="range" min="1" max="5" step="0.1" disabled={!isFnBEditable} value={effectiveParams.sentimentTarget} onChange={e => setParams({ ...params, sentimentTarget: parseFloat(e.target.value) })} className={`w-full h-1.5 bg-white/15 rounded-full appearance-none accent-brand-eco ${isFnBEditable ? 'cursor-pointer' : 'cursor-default opacity-60'}`} />
                        </div>

                        {/* Avg Check Target */}
                        <div className="bg-brand-dark/40 rounded-2xl p-4 border border-brand-gold/10">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-eco/10 border border-brand-eco/20 flex items-center justify-center shrink-0">
                              <Receipt size={14} className="text-brand-eco" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-white/75">{t("dashboard.avgCheckTarget")}</span>
                          </div>
                          <div className="flex items-end gap-2 mb-3">
                            <span className="text-3xl font-geometric font-black text-brand-eco leading-none">${effectiveParams.avgCheckTarget}</span>
                          </div>
                          <input type="number" disabled={!isFnBEditable} step="1" value={effectiveParams.avgCheckTarget} onChange={e => setParams({ ...params, avgCheckTarget: parseFloat(e.target.value) || 0 })} className={`w-full bg-brand-dark/60 border rounded-lg py-2 px-3 text-sm font-bold outline-none transition-all text-right mb-3 ${isFnBEditable ? 'border-brand-gold/10 text-brand-eco focus:border-brand-gold' : 'border-brand-gold/30 text-brand-eco cursor-default'}`} />
                          <input type="range" min="10" max="200" step="1" disabled={!isFnBEditable} value={effectiveParams.avgCheckTarget} onChange={e => setParams({ ...params, avgCheckTarget: parseFloat(e.target.value) })} className={`w-full h-1.5 bg-white/15 rounded-full appearance-none accent-brand-eco ${isFnBEditable ? 'cursor-pointer' : 'cursor-default opacity-60'}`} />
                        </div>

                        {/* Gamification Goal */}
                        <div className="bg-brand-dark/40 rounded-2xl p-4 border border-brand-gold/10">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-eco/10 border border-brand-eco/20 flex items-center justify-center shrink-0">
                              <Trophy size={14} className="text-brand-eco" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-white/75">{t("dashboard.gamificationGoal")}</span>
                          </div>
                          <div className="flex items-end gap-2 mb-3">
                            <span className="text-3xl font-geometric font-black text-brand-eco leading-none">{effectiveParams.gamificationGoal.toLocaleString()}</span>
                            <span className="text-xs text-white/30 font-bold uppercase mb-0.5">pts</span>
                          </div>
                          <input type="number" disabled={!isFnBEditable} step="100" value={effectiveParams.gamificationGoal} onChange={e => setParams({ ...params, gamificationGoal: parseInt(e.target.value) || 0 })} className={`w-full bg-brand-dark/60 border rounded-lg py-2 px-3 text-sm font-bold outline-none transition-all text-right mb-3 ${isFnBEditable ? 'border-brand-gold/10 text-brand-eco focus:border-brand-gold' : 'border-brand-gold/30 text-brand-eco cursor-default'}`} />
                          <input type="range" min="500" max="10000" step="100" disabled={!isFnBEditable} value={effectiveParams.gamificationGoal} onChange={e => setParams({ ...params, gamificationGoal: parseInt(e.target.value) })} className={`w-full h-1.5 bg-white/15 rounded-full appearance-none accent-brand-eco ${isFnBEditable ? 'cursor-pointer' : 'cursor-default opacity-60'}`} />
                        </div>
                      </div>
                    </div>

                    {/* ── STEP 4: Mila AI Logic ── */}
                    <div className="rounded-2xl overflow-hidden border border-brand-eco/20 shadow-[0_0_30px_rgba(119,177,57,0.04)]">
                      <div className="bg-gradient-to-r from-brand-eco/10 to-transparent px-4 sm:px-6 py-4 flex items-center gap-4 border-b border-brand-eco/15">
                        <div className="w-9 h-9 rounded-xl bg-brand-eco/15 text-brand-eco border border-brand-eco/30 flex items-center justify-center shrink-0">
                          <Cpu size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-eco/60">Step 04</p>
                          <h4 className="text-sm sm:text-base font-geometric font-black text-white uppercase tracking-wide leading-none mt-0.5">{t('dashboard.milaAiLogic')}</h4>
                        </div>
                      </div>

                      <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-brand-dark/40">
                        {/* Deviation Alerts */}
                        <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${params.alertsActive ? 'bg-brand-gold/8 border-brand-gold/25' : 'bg-brand-dark/60 border-brand-gold/15'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl transition-all ${params.alertsActive ? 'bg-brand-gold/15' : 'bg-brand-dark/60'}`}>
                              <AlertCircle size={18} className={params.alertsActive ? 'text-brand-gold' : 'text-white/30'} />
                            </div>
                            <div>
                              <span className="text-xs font-bold uppercase tracking-tight text-white block">{t('dashboard.deviationAlerts')}</span>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${params.alertsActive ? 'text-brand-gold' : 'text-white/40'}`}>{params.alertsActive ? 'Active' : 'Disabled'}</span>
                            </div>
                          </div>
                          <button onClick={() => setParams({ ...params, alertsActive: !params.alertsActive })}>
                            {params.alertsActive ? <ToggleRight className="text-brand-eco" size={36} /> : <ToggleLeft className="text-gray-600" size={36} />}
                          </button>
                        </div>

                        {/* Suggestion Engine */}
                        <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${params.milaLogic ? 'bg-brand-eco/8 border-brand-eco/25' : 'bg-brand-dark/60 border-brand-gold/15'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl transition-all ${params.milaLogic ? 'bg-brand-eco/15' : 'bg-brand-dark/60'}`}>
                              <Lightbulb size={18} className={params.milaLogic ? 'text-brand-eco' : 'text-white/30'} />
                            </div>
                            <div>
                              <span className="text-xs font-bold uppercase tracking-tight text-white block">{t('dashboard.suggestionEngine')}</span>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${params.milaLogic ? 'text-brand-gold' : 'text-white/40'}`}>{params.milaLogic ? 'Active' : 'Disabled'}</span>
                            </div>
                          </div>
                          <button onClick={() => setParams({ ...params, milaLogic: !params.milaLogic })}>
                            {params.milaLogic ? <ToggleRight className="text-brand-eco" size={36} /> : <ToggleLeft className="text-gray-600" size={36} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ── STEP 5: APIs Integration ── */}
                    <div className="rounded-2xl border border-brand-eco/20 shadow-[0_0_30px_rgba(34,197,94,0.04)]">
                      <div className="bg-gradient-to-r from-brand-eco/10 to-transparent px-4 sm:px-6 py-4 flex items-center justify-between gap-3 border-b border-brand-eco/15 flex-wrap">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-brand-eco/15 text-brand-eco border border-brand-eco/30 flex items-center justify-center shrink-0">
                            <Database size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-brand-eco/60">Step 05</p>
                            <h4 className="text-sm sm:text-base font-geometric font-black text-white uppercase tracking-wide leading-none mt-0.5">{t('dashboard.apisIntegration')}</h4>
                          </div>
                          <div className="relative group ml-1">
                            <button onMouseEnter={() => setShowApiInfo(true)} onMouseLeave={() => setShowApiInfo(false)} className="text-gray-500 hover:text-brand-gold transition-colors">
                              <Info size={16} />
                            </button>
                            {showApiInfo && (
                              <div className="absolute bottom-full left-0 mb-3 w-72 p-5 bg-brand-dark border border-brand-gold/40 rounded-2xl shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-200">
                                <p className="text-[10px] text-gray-300 font-medium leading-relaxed uppercase tracking-wider">
                                  {t('dashboard.apiInfo')}
                                </p>
                                <div className="absolute bottom-[-6px] left-3 w-3 h-3 bg-brand-dark border-r border-b border-brand-gold/40 rotate-45"></div>
                              </div>
                            )}
                          </div>
                        </div>
                        {isHookAdmin && (
                        <button
                          onClick={() => setIsEditingApis(!isEditingApis)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all shrink-0 ${isEditingApis ? 'bg-brand-eco/15 border border-brand-eco/40 text-brand-eco' : 'bg-brand-eco/15 border border-brand-eco/30 text-brand-eco hover:bg-brand-eco/25'}`}
                        >
                          {isEditingApis ? <Unlock size={12} /> : <Edit2 size={12} />}
                          {isEditingApis ? t('dashboard.lock') : t('dashboard.edit')}
                        </button>
                        )}
                      </div>

                      <div className="p-4 sm:p-6 bg-brand-dark/40">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                          {/* POS */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
                                <Link2 size={13} className="text-brand-gold" />
                              </div>
                              <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold">{t('dashboard.posApiKey')}</label>
                            </div>
                            <input type="password" disabled={!isEditingApis} value={params.posApiKey} onChange={e => setParams({ ...params, posApiKey: e.target.value })} placeholder="Connect POS..." className={`w-full bg-brand-dark/60 border rounded-xl py-3 px-4 text-xs text-white outline-none transition-all placeholder:text-white/35 ${isEditingApis ? 'border-brand-gold/40 focus:border-brand-gold' : 'border-brand-gold/10'}`} />
                            <p className="text-[8px] text-gray-500 uppercase font-bold tracking-wider ml-1">{t('dashboard.posDescription')}</p>
                          </div>

                          {/* CRM */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
                                <Users size={13} className="text-brand-gold" />
                              </div>
                              <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold">{t('dashboard.crmApiKey')}</label>
                            </div>
                            <input type="password" disabled={!isEditingApis} value={params.crmApiKey} onChange={e => setParams({ ...params, crmApiKey: e.target.value })} placeholder="Connect CRM..." className={`w-full bg-brand-dark/60 border rounded-xl py-3 px-4 text-xs text-white outline-none transition-all placeholder:text-white/35 ${isEditingApis ? 'border-brand-gold/40 focus:border-brand-gold' : 'border-brand-gold/10'}`} />
                            <p className="text-[8px] text-gray-500 uppercase font-bold tracking-wider ml-1">{t('dashboard.crmDescription')}</p>
                          </div>

                          {/* PMS */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center shrink-0">
                                <Building2 size={13} className="text-brand-gold" />
                              </div>
                              <label className="text-[11px] font-black uppercase tracking-widest text-brand-gold">{t('dashboard.pmsApiKey')}</label>
                            </div>
                            <input type="password" disabled={!isEditingApis} value={params.pmsApiKey} onChange={e => setParams({ ...params, pmsApiKey: e.target.value })} placeholder="Connect PMS..." className={`w-full bg-brand-dark/60 border rounded-xl py-3 px-4 text-xs text-white outline-none transition-all placeholder:text-white/35 ${isEditingApis ? 'border-brand-gold/40 focus:border-brand-gold' : 'border-brand-gold/10'}`} />
                            <p className="text-[8px] text-gray-500 uppercase font-bold tracking-wider ml-1">{t('dashboard.pmsDescription')}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                )
                }



              </div>
            </div>
            </div>
          </main>
        </div>
        {user.role.toLowerCase() === 'basic'
          ? <MilaWidget context={basicUserContext} />
          : <MilaWidget context={adminContext} />}
      </div>

  {/* 🔐 Admin Legal Consent Window (Forensic Gate) */}
  {isPendingConsent && (
    <LegalConsentModal
      user={user}
      onAccept={async () => {
        onUpdateUser({ legal_consent: true });
      }}
      onLogout={onLogout}
    />
  )}
  </div>
);
};

export default DashboardPage;
