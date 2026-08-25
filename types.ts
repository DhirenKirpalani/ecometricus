
export enum Page {
  HOME = 'home',
  ABOUT = 'about',
  FAQ = 'faq',
  SIGN_IN = 'signin',
  SIGN_UP = 'signup',
  FORGOT_PASSWORD = 'forgot',
  DASHBOARD = 'dashboard',
  STAFF_PORTAL = 'staff_portal',
  SUPERVISOR_DASHBOARD = 'supervisor_dashboard',
  ASSESSMENT = 'assessment',
  EARLY_ACCESS = 'early_access',
  PRIVACY = 'privacy',
  TERMS = 'terms',
  CONTACT = 'contact',
  TRANSLATION_MANAGER = 'translation_manager'
}

export type UserRole = 'admin' | 'supervisor' | 'chef' | 'manager' | 'basic';
export type StaffPosition = 'F&B Director' | 'GM' | 'Exec Chef' | 'Manager' | 'Chef Prep' | 'Outlet Manager';

export interface Outlet {
  id?: string;
  name: string;
  code: string;
  location?: string;
  color_hex?: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  position: StaffPosition;
  outletCode: string;
  permissions?: string[];
  password?: string;
  legal_consent?: boolean;
}

export interface MetricData {
  value: string;
  label: string;
  unit: string;
  icon: string;
}

export interface DashboardData {
  revenue: number;
  foodCost: number;
  wasteWeight: number;
  covers: number;
  laborCost: number;
  lastUpdate: string;
}
