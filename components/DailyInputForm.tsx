import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Trash2, Edit2, Plus, RotateCcw, CheckCircle2, AlertTriangle, ShieldCheck,
  Leaf, Droplets, Zap, Cloud, DollarSign, Cpu, Camera, Info, TrendingDown, Scale, Search, ChevronDown,
  ImagePlus, X, Loader2
} from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { awardPoints } from '../lib/gamification';
import GamificationCard from './GamificationCard';
import { useI18n } from '../lib/useI18n';

interface DailyInputFormProps {
  user: UserProfile;
  companyName?: string;
  outletName?: string;
  onAuditLog?: (action: string, entityType: string, entityName: string, description: string, metadata?: Record<string, any>) => void;
}

// Reusable dropdown component
const FormDropdown: React.FC<{
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ value, options, onChange, placeholder }) => {
  const { t } = useI18n();
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
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between bg-brand-dark/80 border rounded-xl py-3 px-4 text-sm text-left transition-colors
          ${open ? 'border-brand-gold' : 'border-brand-gold/15 hover:border-brand-gold/40'}`}
      >
        <span className={value ? 'text-white' : 'text-white/40'}>{value || placeholder || t('dailyInput.selectDefault')}</span>
        <ChevronDown size={14} className={`text-brand-gold/60 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="relative mt-1 w-full rounded-xl border border-brand-gold/25 bg-brand-dark shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
          <ul className="max-h-56 overflow-y-auto scrollbar-gold py-1">
            {options.map(opt => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                    ${opt === value ? 'text-brand-gold bg-brand-gold/10 font-semibold' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                >
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

interface WasteEntry {
  id: string;
  dbId?: string;
  category: string;
  subCategory: string;
  product: string;
  reason: string;
  destination: string;
  amount: number;
  unit: 'kg' | 'lbs' | 'L';
  timestamp: string;
  date?: string;
  createdAt?: string; // ISO timestamp for edit-lock checks
  imageUrl?: string;
  images?: string[];
  staffName?: string;
  outletCode?: string;
}

interface ResourceEntry {
  id: string;
  dbId?: string;
  type: 'water' | 'energy';
  amount: number;
  timestamp: string;
  date?: string;
  createdAt?: string; // ISO timestamp for edit-lock checks
}

// 1. FOOD WASTE CATEGORIES → 2. SUB-CATEGORIES / FOOD GROUP → 3. PRODUCT SUGGESTIONS
const INVENTORY_LOGIC: Record<string, Record<string, string[]>> = {
  'Receiving Waste': {
    'Vegetables': ['Onions', 'Carrots', 'Potatoes', 'Lettuce', 'Tomatoes'],
    'Fruit': ['Bananas', 'Apples', 'Pineapple', 'Berries'],
    'Meat': ['Beef', 'Pork', 'Lamb', 'Steak', 'Beef Trim'],
    'Poultry': ['Chicken', 'Turkey', 'Chicken Breast', 'Chicken Scraps'],
    'Seafood': ['Fish', 'Shrimp', 'Salmon', 'Shellfish'],
    'Dairy': ['Milk', 'Cream', 'Cheese', 'Yogurt', 'Butter'],
    'Eggs': ['Whole Egg', 'Egg Whites', 'Eggshells'],
    'Grains & Cereals': ['Oats', 'Quinoa', 'Corn'],
    'Rice & Pasta': ['Rice', 'Pasta', 'Noodles'],
    'Bakery': ['Bread', 'Croissant', 'Pastry'],
    'Legumes': ['Beans', 'Lentils', 'Chickpeas'],
    'Prepared Foods': ['Soup', 'Salad', 'Cooked Vegetables', 'Cooked Protein'],
    'Sauces & Condiments': ['Sauce', 'Dressing', 'Gravy', 'Marinade'],
    'Desserts & Pastry': ['Cake', 'Cake Trim', 'Dessert', 'Ice Cream'],
    'Beverages': ['Coffee', 'Tea', 'Juice', 'Smoothie', 'Wine'],
    'Other': ['Other']
  },
  'Storage / Spoilage': {
    'Vegetables': ['Onions', 'Carrots', 'Potatoes', 'Lettuce', 'Tomatoes'],
    'Fruit': ['Bananas', 'Apples', 'Pineapple', 'Berries'],
    'Meat': ['Beef', 'Pork', 'Lamb', 'Steak', 'Beef Trim'],
    'Poultry': ['Chicken', 'Turkey', 'Chicken Breast', 'Chicken Scraps'],
    'Seafood': ['Fish', 'Shrimp', 'Salmon', 'Shellfish'],
    'Dairy': ['Milk', 'Cream', 'Cheese', 'Yogurt', 'Butter'],
    'Eggs': ['Whole Egg', 'Egg Whites', 'Eggshells'],
    'Grains & Cereals': ['Oats', 'Quinoa', 'Corn'],
    'Rice & Pasta': ['Rice', 'Pasta', 'Noodles'],
    'Bakery': ['Bread', 'Croissant', 'Pastry'],
    'Legumes': ['Beans', 'Lentils', 'Chickpeas'],
    'Prepared Foods': ['Soup', 'Salad', 'Cooked Vegetables', 'Cooked Protein'],
    'Sauces & Condiments': ['Sauce', 'Dressing', 'Gravy', 'Marinade'],
    'Desserts & Pastry': ['Cake', 'Cake Trim', 'Dessert', 'Ice Cream'],
    'Beverages': ['Coffee', 'Tea', 'Juice', 'Smoothie', 'Wine'],
    'Other': ['Other']
  },
  'Preparation Waste': {
    'Vegetables': ['Onions', 'Carrots', 'Potatoes', 'Lettuce', 'Tomatoes'],
    'Fruit': ['Bananas', 'Apples', 'Pineapple', 'Berries'],
    'Meat': ['Beef', 'Pork', 'Lamb', 'Steak', 'Beef Trim'],
    'Poultry': ['Chicken', 'Turkey', 'Chicken Breast', 'Chicken Scraps'],
    'Seafood': ['Fish', 'Shrimp', 'Salmon', 'Shellfish'],
    'Dairy': ['Milk', 'Cream', 'Cheese', 'Yogurt', 'Butter'],
    'Eggs': ['Whole Egg', 'Egg Whites', 'Eggshells'],
    'Grains & Cereals': ['Oats', 'Quinoa', 'Corn'],
    'Rice & Pasta': ['Rice', 'Pasta', 'Noodles'],
    'Bakery': ['Bread', 'Croissant', 'Pastry'],
    'Legumes': ['Beans', 'Lentils', 'Chickpeas'],
    'Prepared Foods': ['Soup', 'Salad', 'Cooked Vegetables', 'Cooked Protein'],
    'Sauces & Condiments': ['Sauce', 'Dressing', 'Gravy', 'Marinade'],
    'Desserts & Pastry': ['Cake', 'Cake Trim', 'Dessert', 'Ice Cream'],
    'Beverages': ['Coffee', 'Tea', 'Juice', 'Smoothie', 'Wine'],
    'Other': ['Other']
  },
  'Cooking / Production Waste': {
    'Vegetables': ['Onions', 'Carrots', 'Potatoes', 'Lettuce', 'Tomatoes'],
    'Fruit': ['Bananas', 'Apples', 'Pineapple', 'Berries'],
    'Meat': ['Beef', 'Pork', 'Lamb', 'Steak', 'Beef Trim'],
    'Poultry': ['Chicken', 'Turkey', 'Chicken Breast', 'Chicken Scraps'],
    'Seafood': ['Fish', 'Shrimp', 'Salmon', 'Shellfish'],
    'Dairy': ['Milk', 'Cream', 'Cheese', 'Yogurt', 'Butter'],
    'Eggs': ['Whole Egg', 'Egg Whites', 'Eggshells'],
    'Grains & Cereals': ['Oats', 'Quinoa', 'Corn'],
    'Rice & Pasta': ['Rice', 'Pasta', 'Noodles'],
    'Bakery': ['Bread', 'Croissant', 'Pastry'],
    'Legumes': ['Beans', 'Lentils', 'Chickpeas'],
    'Prepared Foods': ['Soup', 'Salad', 'Cooked Vegetables', 'Cooked Protein'],
    'Sauces & Condiments': ['Sauce', 'Dressing', 'Gravy', 'Marinade'],
    'Desserts & Pastry': ['Cake', 'Cake Trim', 'Dessert', 'Ice Cream'],
    'Beverages': ['Coffee', 'Tea', 'Juice', 'Smoothie', 'Wine'],
    'Other': ['Other']
  },
  'Overproduction': {
    'Vegetables': ['Onions', 'Carrots', 'Potatoes', 'Lettuce', 'Tomatoes'],
    'Fruit': ['Bananas', 'Apples', 'Pineapple', 'Berries'],
    'Meat': ['Beef', 'Pork', 'Lamb', 'Steak', 'Beef Trim'],
    'Poultry': ['Chicken', 'Turkey', 'Chicken Breast', 'Chicken Scraps'],
    'Seafood': ['Fish', 'Shrimp', 'Salmon', 'Shellfish'],
    'Dairy': ['Milk', 'Cream', 'Cheese', 'Yogurt', 'Butter'],
    'Eggs': ['Whole Egg', 'Egg Whites', 'Eggshells'],
    'Grains & Cereals': ['Oats', 'Quinoa', 'Corn'],
    'Rice & Pasta': ['Rice', 'Pasta', 'Noodles'],
    'Bakery': ['Bread', 'Croissant', 'Pastry'],
    'Legumes': ['Beans', 'Lentils', 'Chickpeas'],
    'Prepared Foods': ['Soup', 'Salad', 'Cooked Vegetables', 'Cooked Protein'],
    'Sauces & Condiments': ['Sauce', 'Dressing', 'Gravy', 'Marinade'],
    'Desserts & Pastry': ['Cake', 'Cake Trim', 'Dessert', 'Ice Cream'],
    'Beverages': ['Coffee', 'Tea', 'Juice', 'Smoothie', 'Wine'],
    'Other': ['Other']
  },
  'Buffet / Display Waste': {
    'Vegetables': ['Onions', 'Carrots', 'Potatoes', 'Lettuce', 'Tomatoes'],
    'Fruit': ['Bananas', 'Apples', 'Pineapple', 'Berries'],
    'Meat': ['Beef', 'Pork', 'Lamb', 'Steak', 'Beef Trim'],
    'Poultry': ['Chicken', 'Turkey', 'Chicken Breast', 'Chicken Scraps'],
    'Seafood': ['Fish', 'Shrimp', 'Salmon', 'Shellfish'],
    'Dairy': ['Milk', 'Cream', 'Cheese', 'Yogurt', 'Butter'],
    'Eggs': ['Whole Egg', 'Egg Whites', 'Eggshells'],
    'Grains & Cereals': ['Oats', 'Quinoa', 'Corn'],
    'Rice & Pasta': ['Rice', 'Pasta', 'Noodles'],
    'Bakery': ['Bread', 'Croissant', 'Pastry'],
    'Legumes': ['Beans', 'Lentils', 'Chickpeas'],
    'Prepared Foods': ['Soup', 'Salad', 'Cooked Vegetables', 'Cooked Protein'],
    'Sauces & Condiments': ['Sauce', 'Dressing', 'Gravy', 'Marinade'],
    'Desserts & Pastry': ['Cake', 'Cake Trim', 'Dessert', 'Ice Cream'],
    'Beverages': ['Coffee', 'Tea', 'Juice', 'Smoothie', 'Wine'],
    'Other': ['Other']
  },
  'Plate / Post-Consumer Waste': {
    'Vegetables': ['Onions', 'Carrots', 'Potatoes', 'Lettuce', 'Tomatoes'],
    'Fruit': ['Bananas', 'Apples', 'Pineapple', 'Berries'],
    'Meat': ['Beef', 'Pork', 'Lamb', 'Steak', 'Beef Trim'],
    'Poultry': ['Chicken', 'Turkey', 'Chicken Breast', 'Chicken Scraps'],
    'Seafood': ['Fish', 'Shrimp', 'Salmon', 'Shellfish'],
    'Dairy': ['Milk', 'Cream', 'Cheese', 'Yogurt', 'Butter'],
    'Eggs': ['Whole Egg', 'Egg Whites', 'Eggshells'],
    'Grains & Cereals': ['Oats', 'Quinoa', 'Corn'],
    'Rice & Pasta': ['Rice', 'Pasta', 'Noodles'],
    'Bakery': ['Bread', 'Croissant', 'Pastry'],
    'Legumes': ['Beans', 'Lentils', 'Chickpeas'],
    'Prepared Foods': ['Soup', 'Salad', 'Cooked Vegetables', 'Cooked Protein'],
    'Sauces & Condiments': ['Sauce', 'Dressing', 'Gravy', 'Marinade'],
    'Desserts & Pastry': ['Cake', 'Cake Trim', 'Dessert', 'Ice Cream'],
    'Beverages': ['Coffee', 'Tea', 'Juice', 'Smoothie', 'Wine'],
    'Other': ['Other']
  },
  'Beverage Waste': {
    'Beverages': ['Coffee', 'Tea', 'Juice', 'Smoothie', 'Wine'],
    'Dairy': ['Milk', 'Cream', 'Yogurt'],
    'Other': ['Other']
  },
  'Returned Food': {
    'Vegetables': ['Onions', 'Carrots', 'Potatoes', 'Lettuce', 'Tomatoes'],
    'Fruit': ['Bananas', 'Apples', 'Pineapple', 'Berries'],
    'Meat': ['Beef', 'Pork', 'Lamb', 'Steak', 'Beef Trim'],
    'Poultry': ['Chicken', 'Turkey', 'Chicken Breast', 'Chicken Scraps'],
    'Seafood': ['Fish', 'Shrimp', 'Salmon', 'Shellfish'],
    'Dairy': ['Milk', 'Cream', 'Cheese', 'Yogurt', 'Butter'],
    'Eggs': ['Whole Egg', 'Egg Whites', 'Eggshells'],
    'Grains & Cereals': ['Oats', 'Quinoa', 'Corn'],
    'Rice & Pasta': ['Rice', 'Pasta', 'Noodles'],
    'Bakery': ['Bread', 'Croissant', 'Pastry'],
    'Legumes': ['Beans', 'Lentils', 'Chickpeas'],
    'Prepared Foods': ['Soup', 'Salad', 'Cooked Vegetables', 'Cooked Protein'],
    'Sauces & Condiments': ['Sauce', 'Dressing', 'Gravy', 'Marinade'],
    'Desserts & Pastry': ['Cake', 'Cake Trim', 'Dessert', 'Ice Cream'],
    'Beverages': ['Coffee', 'Tea', 'Juice', 'Smoothie', 'Wine'],
    'Other': ['Other']
  },
  'Expired / Out-of-Spec': {
    'Vegetables': ['Onions', 'Carrots', 'Potatoes', 'Lettuce', 'Tomatoes'],
    'Fruit': ['Bananas', 'Apples', 'Pineapple', 'Berries'],
    'Meat': ['Beef', 'Pork', 'Lamb', 'Steak', 'Beef Trim'],
    'Poultry': ['Chicken', 'Turkey', 'Chicken Breast', 'Chicken Scraps'],
    'Seafood': ['Fish', 'Shrimp', 'Salmon', 'Shellfish'],
    'Dairy': ['Milk', 'Cream', 'Cheese', 'Yogurt', 'Butter'],
    'Eggs': ['Whole Egg', 'Egg Whites', 'Eggshells'],
    'Grains & Cereals': ['Oats', 'Quinoa', 'Corn'],
    'Rice & Pasta': ['Rice', 'Pasta', 'Noodles'],
    'Bakery': ['Bread', 'Croissant', 'Pastry'],
    'Legumes': ['Beans', 'Lentils', 'Chickpeas'],
    'Prepared Foods': ['Soup', 'Salad', 'Cooked Vegetables', 'Cooked Protein'],
    'Sauces & Condiments': ['Sauce', 'Dressing', 'Gravy', 'Marinade'],
    'Desserts & Pastry': ['Cake', 'Cake Trim', 'Dessert', 'Ice Cream'],
    'Beverages': ['Coffee', 'Tea', 'Juice', 'Smoothie', 'Wine'],
    'Other': ['Other']
  },
  'Event / Banquet Waste': {
    'Vegetables': ['Onions', 'Carrots', 'Potatoes', 'Lettuce', 'Tomatoes'],
    'Fruit': ['Bananas', 'Apples', 'Pineapple', 'Berries'],
    'Meat': ['Beef', 'Pork', 'Lamb', 'Steak', 'Beef Trim'],
    'Poultry': ['Chicken', 'Turkey', 'Chicken Breast', 'Chicken Scraps'],
    'Seafood': ['Fish', 'Shrimp', 'Salmon', 'Shellfish'],
    'Dairy': ['Milk', 'Cream', 'Cheese', 'Yogurt', 'Butter'],
    'Eggs': ['Whole Egg', 'Egg Whites', 'Eggshells'],
    'Grains & Cereals': ['Oats', 'Quinoa', 'Corn'],
    'Rice & Pasta': ['Rice', 'Pasta', 'Noodles'],
    'Bakery': ['Bread', 'Croissant', 'Pastry'],
    'Legumes': ['Beans', 'Lentils', 'Chickpeas'],
    'Prepared Foods': ['Soup', 'Salad', 'Cooked Vegetables', 'Cooked Protein'],
    'Sauces & Condiments': ['Sauce', 'Dressing', 'Gravy', 'Marinade'],
    'Desserts & Pastry': ['Cake', 'Cake Trim', 'Dessert', 'Ice Cream'],
    'Beverages': ['Coffee', 'Tea', 'Juice', 'Smoothie', 'Wine'],
    'Other': ['Other']
  }
};

// 4. PRIMARY REASONS (flat list — same for all categories)
const PRIMARY_REASONS: string[] = [
  'Spoilage', 'Expired', 'Overproduction', 'Excessive Trim', 'Preparation Error',
  'Cooking Error', 'Portion Size', 'Guest Leftover', 'Returned Order', 'Wrong Order',
  'Quality Issue', 'Food Safety', 'Damaged Product', 'Temperature / Storage Issue',
  'Demand Forecast Error', 'Other'
];

// 5. WASTE DESTINATIONS
const WASTE_DESTINATIONS: string[] = [
  'Reused', 'Repurposed / Upcycled', 'Donated', 'Animal Feed', 'Compost',
  'Anaerobic Digestion', 'Recycling', 'Landfill', 'Drain / Sewer', 'Other'
];

const DailyInputForm: React.FC<DailyInputFormProps> = ({ user, companyName, outletName, onAuditLog }) => {
  const { t } = useI18n();
  const [unit, setUnit] = useState<'kg' | 'lbs' | 'L'>('kg');
  const [showAlert, setShowAlert] = useState<{ msg: string; color: string } | null>(null);
  const [resolvedCompanyName, setResolvedCompanyName] = useState(companyName || '');
  const [resolvedOutletName, setResolvedOutletName] = useState(outletName || '');

  // Fetch company name and outlet name from DB if not provided via props
  // Traces: basic user → personnel → outlet → admin's company_settings
  useEffect(() => {
    const fetchCompanyAndOutlet = async () => {
      if (companyName && outletName) return; // both provided, no need to fetch
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Step 1: Try to find the outlet by user.outletCode (UUID or code)
        let outletData: any = null;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.outletCode);

        if (user.outletCode) {
          let q = supabase.from('outlets').select('id, outlet_name, name, user_id');
          if (isUuid) q = q.eq('id', user.outletCode);
          else q = q.eq('outlet_id', user.outletCode);
          const { data } = await q.maybeSingle();
          outletData = data;
        }

        // If outlet not found by outletCode, try via personnel table
        if (!outletData) {
          const { data: personnelData } = await supabase
            .from('personnel')
            .select('outlet_id')
            .eq('email', session.user.email)
            .maybeSingle();

          if (personnelData?.outlet_id) {
            const { data } = await supabase
              .from('outlets')
              .select('id, outlet_name, name, user_id')
              .eq('id', personnelData.outlet_id)
              .maybeSingle();
            outletData = data;
          } else {
            // Try case-insensitive email match
            const { data: personnelData2 } = await supabase
              .from('personnel')
              .select('outlet_id')
              .ilike('email', session.user.email || '')
              .maybeSingle();
            if (personnelData2?.outlet_id) {
              const { data } = await supabase
                .from('outlets')
                .select('id, outlet_name, name, user_id')
                .eq('id', personnelData2.outlet_id)
                .maybeSingle();
              outletData = data;
            }
          }
        }

        // Set outlet name
        if (outletData) {
          const oName = outletData.outlet_name || outletData.name || '';
          if (oName) setResolvedOutletName(oName);
        }

        // Step 2: Find company name
        if (!companyName) {
          // First try: this user's own company_settings
          const { data: ownCompany } = await supabase
            .from('company_settings')
            .select('company_name')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (ownCompany?.company_name) {
            setResolvedCompanyName(ownCompany.company_name);
          } else if (outletData?.user_id) {
            // Fallback: the outlet's creator (admin) company_settings
            const { data: adminCompany } = await supabase
              .from('company_settings')
              .select('company_name')
              .eq('user_id', outletData.user_id)
              .maybeSingle();
            if (adminCompany?.company_name) {
              setResolvedCompanyName(adminCompany.company_name);
            }
          }
        }
      } catch (e) {
        // non-fatal
      }
    };
    fetchCompanyAndOutlet();
  }, [companyName, outletName, user.outletCode]);

  // ── Same-day edit lock for basic users ─────────────────────────────────────
  // Basic users can only edit/delete entries submitted today.
  // Supervisors/admins can edit any entry.
  const canEditEntry = (createdAt?: string): boolean => {
    const role = (user.role || '').toLowerCase();
    if (role === 'admin' || role === 'super_admin' || role === 'supervisor') return true;
    if (!createdAt) return true; // no timestamp = just created locally, allow edit
    const entryDate = new Date(createdAt);
    const today = new Date();
    return entryDate.toDateString() === today.toDateString();
  };

  // Always sourced from Supabase — never localStorage
  const [wasteEntries, setWasteEntries] = useState<WasteEntry[]>([]);
  const [resourceEntries, setResourceEntries] = useState<ResourceEntry[]>([]);

  const [form, setForm] = useState<{
    category: string;
    subCategory: string;
    product: string;
    products: string[];
    productSearch: string;
    reason: string;
    customReason: string;
    destination: string;
    amount: string;
    imageUrl: string;
    images: string[];
    water: string;
    energy: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('ecometricus_daily_form');
      if (saved) return { ...{ images: [] }, ...JSON.parse(saved) };
    } catch {}
    return {
      category: '',
      subCategory: '',
      product: '',
      products: [],
      productSearch: '',
      reason: '',
      customReason: '',
      destination: '',
      amount: '',
      imageUrl: '',
      images: [],
      water: '',
      energy: ''
    };
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productInputRef = useRef<HTMLInputElement>(null);
  const resourceSectionRef = useRef<HTMLDivElement>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const showConfirm = (message: string, onConfirm: () => void) => setConfirmModal({ message, onConfirm });
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [wastePage, setWastePage] = useState(0);
  const [resourcePage, setResourcePage] = useState(0);
  const PAGE_SIZE = 5;

  // Upload images to Supabase Storage
  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);

    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024);
    if (validFiles.length === 0) { setUploadingImages(false); return; }

    // Show local previews immediately (base64) so the user sees the image right away
    const localPreviews: string[] = [];
    for (const file of validFiles) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
      if (dataUrl) localPreviews.push(dataUrl);
    }
    if (localPreviews.length > 0) {
      setForm(prev => ({ ...prev, images: [...prev.images, ...localPreviews] }));
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Upload each file to Supabase and replace local previews with public URLs
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const fileExt = file.name.split('.').pop();
        const safeCompany = (resolvedCompanyName || 'Unknown-Company').replace(/[^a-zA-Z0-9-_]/g, '_');
        const safeOutlet = (resolvedOutletName || user.outletCode || 'Unknown-Outlet').replace(/[^a-zA-Z0-9-_]/g, '_');
        const safeUserId = session.user.id.replace(/[^a-zA-Z0-9-_]/g, '_');
        const fileName = `${safeCompany}/${safeOutlet}/${safeUserId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('waste-images')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          console.error('[DailyInput] Upload error for file:', file.name, uploadError);
          console.error('[DailyInput] Upload path:', fileName);
          console.error('[DailyInput] Error details:', uploadError.message, uploadError.name);
          setShowAlert({ msg: `Image upload failed: ${uploadError.message}`, color: '#FF3131' });
          setTimeout(() => setShowAlert(null), 5000);
          continue; // keep the local preview even if upload fails
        }

        console.log('[DailyInput] Upload success:', uploadData?.path);

        const { data: urlData } = supabase.storage
          .from('waste-images')
          .getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          // Replace the local preview at index i with the permanent URL
          setForm(prev => {
            const newImages = [...prev.images];
            const previewIdx = newImages.indexOf(localPreviews[i]);
            if (previewIdx !== -1) newImages[previewIdx] = urlData.publicUrl;
            return { ...prev, images: newImages };
          });
        }
      }
    } catch (err) {
      console.error('[DailyInput] Image upload failed:', err);
      // Local previews remain visible even if Supabase fails
    } finally {
      setUploadingImages(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (idx: number) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  };

  useEffect(() => {
    if (confirmModal) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [confirmModal]);

  // ── Hydrate from DB on mount ──────────────────────────────────────────────
  // Supabase is the single source of truth — no localStorage for entries.
  // Loads current week's data (not just today) so yesterday's entries are visible.
  useEffect(() => {
    const hydrateFromDb = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Use current week start (Saturday reset) so yesterday's data is included
        const { getPlatformSettings, getWeekStartISO } = await import('../lib/platformSettings');
        const settings = await getPlatformSettings();
        const weekStartISO = getWeekStartISO(settings.weekly_reset_day);

        // Fetch this week's waste entries for this user
        const { data: wasteData } = await supabase
          .from('food_waste_logs')
          .select('*')
          .eq('user_id', session.user.id)
          .gte('created_at', weekStartISO)
          .eq('is_mock', false);

        if (wasteData && wasteData.length > 0) {
          const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return iso; } };
          const fmtTime = (iso: string) => { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };
          const dbEntries: WasteEntry[] = wasteData.map(log => ({
            id: log.id,
            dbId: log.id,
            category: log.category || 'Food Waste',
            subCategory: log.sub_category || '',
            product: log.product || `${parseFloat(log.mass_kg).toFixed(1)} kg entry`,
            reason: log.reason || '',
            destination: log.destination || '',
            amount: parseFloat(log.mass_kg) || 0,
            unit: 'kg' as const,
            timestamp: fmtTime(log.created_at),
            date: fmtDate(log.created_at),
            createdAt: log.created_at,
            imageUrl: log.image_url || undefined,
            images: log.images ? (typeof log.images === 'string' ? JSON.parse(log.images) : log.images) : undefined,
            outletCode: user.outletCode,
          }));
          setWasteEntries(dbEntries);
        }

        // Fetch this week's resource entries for this user
        const { data: resourceData } = await supabase
          .from('resource_logs')
          .select('*')
          .eq('user_id', session.user.id)
          .gte('created_at', weekStartISO);

        if (resourceData && resourceData.length > 0) {
          const fmtRDate = (iso: string) => { try { return new Date(iso).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return iso; } };
          const fmtRTime = (iso: string) => { try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };
          const dbResourceEntries: ResourceEntry[] = [];
          resourceData.forEach(log => {
            const water = parseFloat(log.water_liters) || 0;
            const energy = parseFloat(log.energy_kwh) || 0;
            if (water > 0) {
              dbResourceEntries.push({ id: `${log.id}-water`, dbId: log.id, type: 'water', amount: water, timestamp: fmtRTime(log.created_at), date: fmtRDate(log.created_at), createdAt: log.created_at });
            }
            if (energy > 0) {
              dbResourceEntries.push({ id: `${log.id}-energy`, dbId: log.id, type: 'energy', amount: energy, timestamp: fmtRTime(log.created_at), date: fmtRDate(log.created_at), createdAt: log.created_at });
            }
          });
          if (dbResourceEntries.length > 0) {
            setResourceEntries(dbResourceEntries);
          }
        }
      } catch (err) {
        console.error('[DailyInput] DB hydration failed:', err);
      }
    };

    hydrateFromDb();
  }, [user.id]); // re-run if the logged-in user changes

  const totals = useMemo(() => {
    const wasteTotal = wasteEntries.reduce((sum, e) => sum + e.amount, 0);
    const waterTotal = resourceEntries.filter(e => e.type === 'water').reduce((sum, e) => sum + e.amount, 0);
    const energyTotal = resourceEntries.filter(e => e.type === 'energy').reduce((sum, e) => sum + e.amount, 0);
    const costPerItemUnit = 7.50;
    const costPerDisposalUnit = 1.25;
    // CO2 conversion factors (matching DashboardPage + useCo2ChartData)
    const wasteCo2Coeff = 2.85;   // kg CO2e per kg food waste
    const waterCo2Coeff = 0.0003; // kg CO2e per litre of water
    const energyCo2Coeff = 0.45;  // kg CO2e per kWh of energy
    const waterFootprintCoeff = 3.40;
    const financialLossItems = wasteTotal * costPerItemUnit;
    const financialLossDisposal = wasteTotal * costPerDisposalUnit;

    // Total carbon = food waste CO2 + water CO2 + energy CO2
    const wasteCo2 = wasteTotal * wasteCo2Coeff;
    const waterCo2 = waterTotal * waterCo2Coeff;
    const energyCo2 = energyTotal * energyCo2Coeff;
    const totalCarbonImpact = wasteCo2 + waterCo2 + energyCo2;

    return {
      waste: wasteTotal,
      water: waterTotal,
      energy: energyTotal,
      financialLossItems,
      financialLossDisposal,
      totalFinancialLoss: financialLossItems + financialLossDisposal,
      carbonImpact: totalCarbonImpact,
      waterFootprint: wasteTotal * waterFootprintCoeff,
    };
  }, [wasteEntries, resourceEntries]);

  const BENCHMARKS = { waste: 100, water: 5000, energy: 200 };

  useEffect(() => {
    if (totals.waste > BENCHMARKS.waste) {
      const deviation = totals.waste - BENCHMARKS.waste;
      const deviationCost = (deviation * 7.50) + (deviation * 1.25);
      setShowAlert({
        msg: t('dailyInput.criticalDeviation', { deviation: deviation.toFixed(1), unit, cost: deviationCost.toFixed(2) }),
        color: '#FF3131'
      });
    } else {
      setShowAlert(null);
    }
  }, [totals, unit]);

  const handleTare = () => {
    setForm({
      category: '', subCategory: '', product: '', products: [], productSearch: '',
      reason: '', customReason: '', destination: '', amount: '', imageUrl: '', images: [], water: '', energy: ''
    });
    setEditingId(null);
    setEditingResourceId(null);
    setShowProductDropdown(false);
  };

  const handleSaveWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    const productList = form.products.length > 0 ? form.products : (form.product ? [form.product] : []);
    if (!form.category || productList.length === 0 || !form.amount || !form.reason || !form.destination) return;
    const finalReason = form.reason === 'Other' ? form.customReason : form.reason;
    const productStr = productList.join(', ');
    const amountNum = parseFloat(form.amount);
    let insertedDbId: string | undefined;

    // ── Wait for any pending image uploads to finish ──
    if (uploadingImages) {
      setShowAlert({ msg: 'Please wait for image uploads to finish...', color: '#FF914D' });
      setTimeout(() => setShowAlert(null), 2000);
      return;
    }

    // ── Upload any remaining base64 images to Supabase Storage ──
    const finalImageUrls: string[] = [];
    const { data: { session: preSession } } = await supabase.auth.getSession();
    const userId = preSession?.user?.id || 'unknown-user';
    for (const img of form.images) {
      if (img.startsWith('http')) {
        finalImageUrls.push(img);
      } else if (img.startsWith('data:')) {
        // Convert base64 to File and upload
        try {
          const res = await fetch(img);
          const blob = await res.blob();
          const fileExt = blob.type.split('/')[1] || 'jpg';
          const safeCompany = (resolvedCompanyName || 'Unknown-Company').replace(/[^a-zA-Z0-9-_]/g, '_');
          const safeOutlet = (resolvedOutletName || user.outletCode || 'Unknown-Outlet').replace(/[^a-zA-Z0-9-_]/g, '_');
          const safeUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '_');
          const fileName = `${safeCompany}/${safeOutlet}/${safeUserId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
          const { data: upData, error: upErr } = await supabase.storage.from('waste-images').upload(fileName, blob, { cacheControl: '3600', upsert: false });
          if (upErr) {
            console.error('[DailyInput] Fallback upload error:', upErr.message, 'path:', fileName);
          } else {
            console.log('[DailyInput] Fallback upload success:', upData?.path);
            const { data: urlData } = supabase.storage.from('waste-images').getPublicUrl(fileName);
            if (urlData?.publicUrl) finalImageUrls.push(urlData.publicUrl);
          }
        } catch (e) {
          console.error('[DailyInput] Fallback image upload failed:', e);
        }
      }
    }

    // ── Sync to Supabase ──
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[DailyInput] No session — cannot sync waste entry');
        setShowAlert({ msg: 'Authentication required to save data', color: '#FF3131' });
        return;
      }

      // Find outlet — user.outletCode may be a code (e.g. "ROY02") or a UUID (outlet.id)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.outletCode);
      let outletQuery = supabase.from('outlets').select('id, outlet_name, outlet_id');
      if (isUuid) {
        outletQuery = outletQuery.eq('id', user.outletCode);
      } else {
        outletQuery = outletQuery.eq('outlet_id', user.outletCode);
      }
      const { data: outlet, error: outletError } = await outletQuery.maybeSingle();

      if (outletError) {
        console.error('[DailyInput] Outlet lookup error:', outletError);
      }

      // Use the finalImageUrls (uploaded to Supabase Storage)
      const editingEntry = editingId ? wasteEntries.find(e => e.id === editingId) : null;

      // Guard: basic users cannot edit past-day entries
      if (editingEntry && !canEditEntry(editingEntry.createdAt)) {
        setShowAlert({ msg: 'Past entries are locked. Only today\'s entries can be edited.', color: '#FF3131' });
        setTimeout(() => setShowAlert(null), 3000);
        return;
      }

      if (editingEntry && editingEntry.dbId) {
        // ── UPDATE existing record ──
        const { error: updateError } = await supabase.from('food_waste_logs').update({
          mass_kg: unit === 'lbs' ? amountNum * 0.4536 : amountNum,
          category: form.category,
          sub_category: form.subCategory,
          product: productStr,
          reason: finalReason,
          destination: form.destination,
          image_url: finalImageUrls.length > 0 ? finalImageUrls[0] : null,
          images: finalImageUrls.length > 0 ? finalImageUrls : null,
        }).eq('id', editingEntry.dbId);

        if (updateError) {
          console.error('[DailyInput] food_waste_logs update error:', updateError.message);
        } else {
          insertedDbId = editingEntry.dbId;
          console.log('[DailyInput] Waste entry updated, DB id:', insertedDbId);
        }
      } else if (outlet) {
        // ── INSERT new record ──
        const { data: insertData, error: insertError } = await supabase.from('food_waste_logs').insert({
          outlet_id: outlet.id,
          outlet_name: (outlet as any).outlet_name || user.outletCode,
          mass_kg: unit === 'lbs' ? amountNum * 0.4536 : amountNum,
          cost_per_kg: 8.75,
          category: form.category,
          sub_category: form.subCategory,
          product: productStr,
          reason: finalReason,
          destination: form.destination,
          is_mock: false,
          user_id: session.user.id,
          created_by: user.fullName,
          image_url: finalImageUrls.length > 0 ? finalImageUrls[0] : null,
          images: finalImageUrls.length > 0 ? finalImageUrls : null,
        }).select('id');

        if (insertError) {
          console.error('[DailyInput] food_waste_logs insert error:', insertError.message, insertError);
          setShowAlert({ msg: `Failed to save: ${insertError.message}`, color: '#FF3131' });
        } else if (insertData && insertData.length > 0) {
          insertedDbId = insertData[0].id;
          console.log('[DailyInput] Waste entry saved with DB id:', insertedDbId);
        }
      } else {
        console.error('[DailyInput] No outlet found for:', user.outletCode);
        // Insert without outlet_id as fallback
        const { data: insertData2, error: insertError } = await supabase.from('food_waste_logs').insert({
          outlet_id: null,
          outlet_name: user.outletCode || 'Unknown',
          mass_kg: unit === 'lbs' ? amountNum * 0.4536 : amountNum,
          cost_per_kg: 8.75,
          category: form.category,
          sub_category: form.subCategory,
          product: productStr,
          reason: finalReason,
          destination: form.destination,
          is_mock: false,
          user_id: session.user.id,
          created_by: user.fullName,
          image_url: finalImageUrls.length > 0 ? finalImageUrls[0] : null,
          images: finalImageUrls.length > 0 ? finalImageUrls : null,
        }).select('id');

        if (insertError) {
          console.error('[DailyInput] food_waste_logs insert error (no outlet):', insertError.message, insertError);
        } else if (insertData2 && insertData2.length > 0) {
          insertedDbId = insertData2[0].id;
        }
      }

      // ── Record daily check-in (streak tracking, non-fatal) ──
      try {
        const { data: checkinData, error: checkinErr } = await supabase.rpc('record_daily_checkin', {
          p_user_id: session.user.id,
          p_user_name: user.fullName,
          p_user_role: user.role,
          p_outlet_code: user.outletCode,
          p_entry_type: 'waste',
        });
        if (!checkinErr) {
          window.dispatchEvent(new Event('ecometricus_checkin_updated'));
          // Check if a 5-day streak milestone was just reached
          const streak = Array.isArray(checkinData) ? checkinData[0]?.streak_days : checkinData?.streak_days;
          if (streak && streak % 5 === 0 && outlet?.id) {
            await awardPoints(session.user.id, '5-Day Streak Bonus', outlet.id);
          }
        }
      } catch (e) { /* non-fatal — streak tracking is optional */ }

      // ── Award gamification points for new entries only ──
      if (!editingId && outlet?.id) {
        await awardPoints(session.user.id, 'On-Time Entry', outlet.id);
        if (finalImageUrls.length > 0) {
          await awardPoints(session.user.id, 'Entry with Image', outlet.id);
        }
        window.dispatchEvent(new Event('ecometricus_points_updated'));
      }
    } catch (err) {
      console.error('[DailyInput] Failed to sync waste entry to Supabase:', err);
    }

    if (editingId) {
      setWasteEntries(prev => prev.map(entry =>
        entry.id === editingId
          ? { ...entry, category: form.category, subCategory: form.subCategory, product: productStr, reason: finalReason, destination: form.destination, amount: parseFloat(form.amount), unit, images: form.images }
          : entry
      ));
      onAuditLog?.('waste_entry_updated', 'daily_input', productStr,
        `Updated waste entry: ${form.category} → ${productStr} (${parseFloat(form.amount)}${unit})`,
        { category: form.category, product: productStr, products: productList, amount: parseFloat(form.amount), unit, reason: finalReason, destination: form.destination, outletCode: user.outletCode });
      setEditingId(null);
    } else {
      const newEntry: WasteEntry = {
        id: Math.random().toString(36).substr(2, 9),
        dbId: insertedDbId,
        category: form.category,
        subCategory: form.subCategory,
        product: productStr,
        reason: finalReason,
        destination: form.destination,
        amount: parseFloat(form.amount),
        unit,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }),
        createdAt: new Date().toISOString(),
        staffName: user.fullName,
        outletCode: user.outletCode,
        images: form.images,
      };
      setWasteEntries([newEntry, ...wasteEntries]);
      setWastePage(0);
      onAuditLog?.('waste_entry_added', 'daily_input', productStr,
        `Logged waste: ${form.category} → ${productStr} (${amountNum}${unit}) — ${finalReason}`,
        { category: form.category, product: productStr, products: productList, amount: amountNum, unit, reason: finalReason, destination: form.destination, outletCode: user.outletCode });
      window.dispatchEvent(new Event('ecometricus_waste_updated'));
    }
    handleTare();
  };

  const handleEditWaste = (entry: WasteEntry) => {
    setEditingId(entry.id);
    const isCustom = !PRIMARY_REASONS.includes(entry.reason);
    const editProducts = entry.product ? entry.product.split(',').map(p => p.trim()).filter(Boolean) : [];
    setForm({
      ...form,
      category: entry.category, subCategory: entry.subCategory, product: entry.product,
      products: editProducts,
      productSearch: '',
      reason: isCustom ? 'Other' : entry.reason,
      customReason: isCustom ? entry.reason : '',
      destination: entry.destination,
      amount: entry.amount.toString(), imageUrl: entry.imageUrl || '', images: entry.images || []
    });
    setUnit(entry.unit);
  };

  const handleSaveResource = async (type: 'water' | 'energy') => {
    const val = type === 'water' ? form.water : form.energy;
    if (!val) return;
    const amountNum = parseFloat(val);
    let insertedResourceId: string | undefined;

    // ── Sync to Supabase ──
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[DailyInput] No session — cannot sync resource entry');
        return;
      }

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.outletCode);
      let outletQuery = supabase.from('outlets').select('id, outlet_name, outlet_id');
      if (isUuid) {
        outletQuery = outletQuery.eq('id', user.outletCode);
      } else {
        outletQuery = outletQuery.eq('outlet_id', user.outletCode);
      }
      const { data: outlet, error: outletError } = await outletQuery.maybeSingle();

      if (outletError) {
        console.error('[DailyInput] Outlet lookup error:', outletError);
      }

      const editingResEntry = editingResourceId ? resourceEntries.find(e => e.id === editingResourceId) : null;

      // Guard: basic users cannot edit past-day entries
      if (editingResEntry && !canEditEntry(editingResEntry.createdAt)) {
        setShowAlert({ msg: 'Past entries are locked. Only today\'s entries can be edited.', color: '#FF3131' });
        setTimeout(() => setShowAlert(null), 3000);
        return;
      }

      if (editingResEntry && editingResEntry.dbId) {
        // ── UPDATE existing record ──
        const updatePayload: any = { resource_type: type };
        if (type === 'water') {
          updatePayload.water_liters = amountNum;
        } else {
          updatePayload.energy_kwh = amountNum;
        }
        const { error: updateError } = await supabase.from('resource_logs').update(updatePayload).eq('id', editingResEntry.dbId);
        if (updateError) {
          console.error('[DailyInput] resource_logs update error:', updateError.message);
        } else {
          insertedResourceId = editingResEntry.dbId;
          console.log('[DailyInput] resource_logs updated, DB id:', insertedResourceId);
        }
      } else if (outlet) {
        // ── INSERT new record ──
        const insertPayload: any = {
          outlet_name: (outlet as any).outlet_name || user.outletCode,
          outlet_code: (outlet as any).outlet_id || user.outletCode || null,
          resource_type: type,
          is_mock: false,
          user_id: session.user.id,
          created_by: user.fullName,
        };
        if (type === 'water') {
          insertPayload.water_liters = amountNum;
        } else {
          insertPayload.energy_kwh = amountNum;
        }

        const r = await supabase.from('resource_logs').insert(insertPayload).select('id');
        if (r.error) {
          const r2 = await supabase.from('resource_logs').insert(insertPayload);
          if (r2.error) {
            console.error('[DailyInput] resource_logs insert error:', r2.error.message);
          } else {
            console.log('[DailyInput] resource_logs saved (no select)');
          }
        } else {
          if (r.data && r.data.length > 0) insertedResourceId = r.data[0].id;
          console.log('[DailyInput] resource_logs saved with id:', insertedResourceId);
        }
      } else {
        console.error('[DailyInput] No outlet found for code:', user.outletCode);
        const insertPayload: any = {
          outlet_name: user.outletCode || 'Unknown',
          outlet_code: user.outletCode || null,
          resource_type: type,
          is_mock: false,
          user_id: session.user.id,
          created_by: user.fullName,
        };
        if (type === 'water') {
          insertPayload.water_liters = amountNum;
        } else {
          insertPayload.energy_kwh = amountNum;
        }

        const r = await supabase.from('resource_logs').insert(insertPayload).select('id');
        if (r.error) {
          const r2 = await supabase.from('resource_logs').insert(insertPayload);
          if (r2.error) console.error('[DailyInput] resource_logs insert error (no outlet):', r2.error.message);
        } else if (r.data && r.data.length > 0) {
          insertedResourceId = r.data[0].id;
        }
      }

      // ── Record daily check-in (streak tracking, non-fatal) ──
      try {
        const { data: checkinData, error: checkinErr } = await supabase.rpc('record_daily_checkin', {
          p_user_id: session.user.id,
          p_user_name: user.fullName,
          p_user_role: user.role,
          p_outlet_code: user.outletCode,
          p_entry_type: type,
        });
        if (!checkinErr) {
          window.dispatchEvent(new Event('ecometricus_checkin_updated'));
          const streak = Array.isArray(checkinData) ? checkinData[0]?.streak_days : checkinData?.streak_days;
          if (streak && streak % 5 === 0 && outlet?.id) {
            await awardPoints(session.user.id, '5-Day Streak Bonus', outlet.id);
          }
        }
      } catch (e) { /* non-fatal — streak tracking is optional */ }

      // ── Award gamification points for new entries only ──
      if (!editingResourceId && outlet?.id) {
        await awardPoints(session.user.id, 'On-Time Entry', outlet.id);
        if (type === 'energy') {
          await awardPoints(session.user.id, 'Energy Reading', outlet.id);
        }
        window.dispatchEvent(new Event('ecometricus_points_updated'));
      }
    } catch (err) {
      console.error('[DailyInput] Failed to sync resource entry to Supabase:', err);
    }

    if (editingResourceId) {
      setResourceEntries(prev => prev.map(entry =>
        entry.id === editingResourceId ? { ...entry, amount: parseFloat(val) } : entry
      ));
      onAuditLog?.(`${type}_entry_updated`, 'daily_input', type,
        `Updated ${type} entry: ${parseFloat(val)}${type === 'water' ? 'L' : 'kWh'}`,
        { type, amount: parseFloat(val), outletCode: user.outletCode });
      setEditingResourceId(null);
    } else {
      const newEntry: ResourceEntry = {
        id: Math.random().toString(36).substr(2, 9),
        dbId: insertedResourceId,
        type, amount: parseFloat(val),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }),
        createdAt: new Date().toISOString(),
      };
      setResourceEntries([newEntry, ...resourceEntries]);
      setResourcePage(0);
      onAuditLog?.(`${type}_entry_added`, 'daily_input', type,
        `Logged ${type}: ${amountNum}${type === 'water' ? 'L' : 'kWh'}`,
        { type, amount: amountNum, outletCode: user.outletCode });
      window.dispatchEvent(new Event('ecometricus_resource_updated'));
    }
    setForm(prev => ({ ...prev, [type]: '' }));
  };

  const deleteWaste = (id: string) => {
    const entry = wasteEntries.find(e => e.id === id);
    if (!entry) return;
    showConfirm(t('dailyInput.confirmDeleteWaste', { product: entry.product, amount: entry.amount, unit: entry.unit }), async () => {
      // Delete from Supabase
      try {
        // Delete images from storage first
        if (entry.images && entry.images.length > 0) {
          for (const imgUrl of entry.images) {
            if (imgUrl && imgUrl.includes('/waste-images/')) {
              const filePath = imgUrl.split('/waste-images/')[1];
              if (filePath) {
                await supabase.storage.from('waste-images').remove([filePath]);
                console.log('[DailyInput] Deleted image from storage:', filePath);
              }
            }
          }
        }

        // Delete the DB record
        if (entry.dbId) {
          const { error: delError } = await supabase
            .from('food_waste_logs')
            .delete()
            .eq('id', entry.dbId);

          if (delError) {
            console.error('[DailyInput] Failed to delete waste entry from Supabase:', delError);
          } else {
            console.log('[DailyInput] Waste entry deleted from Supabase:', entry.dbId);
          }
        }
      } catch (err) {
        console.error('[DailyInput] Delete error:', err);
      }

      // Remove from local state
      setWasteEntries(prev => prev.filter(e => e.id !== id));
      onAuditLog?.('waste_entry_deleted', 'daily_input', entry.product,
        `Deleted waste entry: ${entry.category} → ${entry.product} (${entry.amount}${entry.unit})`,
        { category: entry.category, product: entry.product, amount: entry.amount, unit: entry.unit, outletCode: entry.outletCode });
      window.dispatchEvent(new Event('ecometricus_waste_updated'));
    });
  };
  const deleteResource = (id: string) => {
    const entry = resourceEntries.find(e => e.id === id);
    if (!entry) return;
    const label = entry.type === 'water' ? t('dailyInput.waterReading') : t('dailyInput.energyReading');
    showConfirm(t('dailyInput.confirmDeleteResource', { readingType: label, amount: entry.amount, unit: entry.type === 'water' ? 'L' : 'kWh' }), async () => {
      // Delete from Supabase
      try {
        if (entry.dbId) {
          const { error: delError } = await supabase
            .from('resource_logs')
            .delete()
            .eq('id', entry.dbId);

          if (delError) {
            console.error('[DailyInput] Failed to delete resource entry from Supabase:', delError);
          } else {
            console.log('[DailyInput] Resource entry deleted from Supabase:', entry.dbId);
          }
        }
      } catch (err) {
        console.error('[DailyInput] Delete error:', err);
      }

      // Remove from local state
      setResourceEntries(prev => prev.filter(e => e.id !== id));
      onAuditLog?.(`${entry.type}_entry_deleted`, 'daily_input', entry.type,
        `Deleted ${entry.type} entry: ${entry.amount}${entry.type === 'water' ? 'L' : 'kWh'}`,
        { type: entry.type, amount: entry.amount, outletCode: user.outletCode });
      window.dispatchEvent(new Event('ecometricus_resource_updated'));
    });
  };

  const showAlertCarbon = totals.carbonImpact > 180;
  const showAlertWater = totals.waterFootprint > 400;
  const showAlertFinance = totals.totalFinancialLoss > 650;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-eco/10 border border-brand-eco/30 rounded-xl flex items-center justify-center shrink-0">
            <ClipboardListIcon className="text-brand-eco" size={24} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
              {t('dailyInput.title')}
            </h2>
            <p className="text-[11px] sm:text-xs text-brand-gold font-medium mt-1">
              {t('dailyInput.subtitle')}
            </p>
          </div>
        </div>
        {(form.category || form.amount) && (
          <button type="button" onClick={handleTare}
            className="flex items-center gap-2 text-[11px] font-bold text-white/40 hover:text-white/60 uppercase tracking-widest transition-colors">
            <RotateCcw size={12} /> {t('dailyInput.resetForm')}
          </button>
        )}
      </div>

      {/* Alert Banner */}
      {showAlert && (
        <div className="rounded-2xl border-l-4 px-4 py-3 flex items-center gap-3" style={{ borderLeftColor: showAlert.color, background: `${showAlert.color}10` }}>
          <AlertTriangle size={16} style={{ color: showAlert.color }} className="shrink-0" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">{showAlert.msg}</span>
        </div>
      )}

      {/* ── EARTH KEEPER GAMIFICATION CARD ── */}
      <GamificationCard user={user} />

      {/* ── FOOD WASTE FORM ── */}
      <div className="bg-[#1c3933] border border-brand-gold/10 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <Leaf size={18} className="text-brand-eco" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest">{t('dailyInput.foodWasteEntryTitle')}</h3>
        </div>

        {/* Progress bar */}
        {(() => {
          const steps = [
            { label: t('dailyInput.stepCategory'), done: !!form.category },
            { label: t('dailyInput.stepSubCategory'), done: !!form.subCategory },
            { label: t('dailyInput.stepProduct'), done: form.products.length > 0 || !!form.product },
            { label: t('dailyInput.stepReason'), done: !!form.reason },
            { label: t('dailyInput.stepWeight'), done: !!form.amount },
            { label: t('dailyInput.stepDestination'), done: !!form.destination },
            { label: t('dailyInput.stepVerify'), done: form.images.length > 0 },
          ];
          const completedCount = steps.filter(s => s.done).length;
          const progressPct = Math.round((completedCount / steps.length) * 100);
          return (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{completedCount} {t('dailyInput.stepsLabel', { count: steps.length })}</span>
                <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{progressPct}%</span>
              </div>
              <div className="h-1.5 bg-brand-dark/60 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-eco to-brand-gold rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="flex items-center justify-between mt-2.5">
                {steps.map((s, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black transition-all ${s.done ? 'bg-brand-eco text-brand-dark border border-brand-eco' : 'bg-white/5 text-white/30 border border-white/10'}`}>
                      {s.done ? '✓' : i + 1}
                    </div>
                    <span className={`text-[7px] font-bold uppercase tracking-wider transition-all ${s.done ? 'text-brand-eco' : 'text-white/25'}`}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <form onSubmit={handleSaveWaste} className="space-y-5">
          {/* Step 1: Category */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-gold">
              <span className="w-5 h-5 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-[9px]">1</span>
              {t('dailyInput.foodWasteCategoryLabel')}
            </label>
            <FormDropdown
              value={form.category}
              options={Object.keys(INVENTORY_LOGIC)}
              onChange={v => setForm({ ...form, category: v, subCategory: '', product: '', products: [], productSearch: '' })}
              placeholder={t('dailyInput.categoryPlaceholder')}
            />
          </div>

          {/* Step 2: Sub-Category / Food Group */}
          {form.category && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-gold">
                <span className="w-5 h-5 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-[9px]">2</span>
                {t('dailyInput.subCategoryLabel')}
              </label>
              <FormDropdown
                value={form.subCategory}
                options={Object.keys(INVENTORY_LOGIC[form.category])}
                onChange={v => setForm({ ...form, subCategory: v, product: '', products: [], productSearch: '' })}
                placeholder={t('dailyInput.subCategoryPlaceholder')}
              />
            </div>
          )}

          {/* Step 3: Product Description (searchable, multi-select) */}
          {form.subCategory && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-gold">
                <span className="w-5 h-5 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-[9px]">3</span>
                {t('dailyInput.productDescriptionLabel')}
                {form.products.length > 0 && (
                  <span className="ml-1 text-[9px] bg-brand-gold/20 text-brand-gold px-1.5 py-0.5 rounded-full">{t('dailyInput.selectedCount', { count: form.products.length })}</span>
                )}
              </label>

              <div className="relative">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 z-10" />
                  <div className="w-full bg-brand-dark/80 border border-brand-gold/15 rounded-xl pl-10 pr-4 py-2.5 flex flex-wrap items-center gap-1.5 focus-within:border-brand-gold transition-all min-h-[48px]">
                    {form.products.map(prod => (
                      <span key={prod} className="inline-flex items-center gap-1.5 bg-brand-eco/15 border border-brand-eco/30 rounded-lg px-2.5 py-1 text-xs font-semibold text-brand-eco">
                        {prod}
                        <button type="button" onClick={() => setForm({ ...form, products: form.products.filter(p => p !== prod) })} className="hover:text-white transition-colors">
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                    <input
                    ref={productInputRef}
                    type="text"
                    value={form.productSearch}
                    onChange={e => { setForm({ ...form, product: e.target.value, productSearch: e.target.value }); setShowProductDropdown(true); }}
                    onFocus={() => setShowProductDropdown(true)}
                    onBlur={() => setTimeout(() => setShowProductDropdown(false), 150)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && form.productSearch.trim()) {
                        e.preventDefault();
                        const val = form.productSearch.trim();
                        if (!form.products.includes(val)) {
                          setForm({ ...form, products: [...form.products, val], product: val, productSearch: '' });
                        } else {
                          setForm({ ...form, productSearch: '' });
                        }
                        setShowProductDropdown(false);
                      }
                    }}
                    placeholder={form.products.length === 0 ? "Search, select, or type then press Enter..." : ""}
                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-white placeholder:text-white/35 py-1"
                  />
                  </div>
                </div>
                {showProductDropdown && form.subCategory && INVENTORY_LOGIC[form.category]?.[form.subCategory] && (
                  <div className="absolute left-0 right-0 z-50 bg-brand-dark border border-brand-gold/30 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] max-h-48 overflow-y-auto scrollbar-gold mt-1">
                    {INVENTORY_LOGIC[form.category][form.subCategory]
                      .filter(p => p.toLowerCase().includes(form.productSearch.toLowerCase()))
                      .map(prod => {
                        const isSelected = form.products.includes(prod);
                        return (
                          <button key={prod} type="button"
                            onMouseDown={() => {
                              if (isSelected) {
                                setForm({ ...form, products: form.products.filter(p => p !== prod), productSearch: '' });
                              } else {
                                setForm({ ...form, products: [...form.products, prod], product: prod, productSearch: '' });
                              }
                              setShowProductDropdown(true);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between
                              ${isSelected ? 'text-brand-gold bg-brand-gold/10 font-semibold' : 'text-white/70 hover:bg-brand-gold/10 hover:text-brand-gold'}`}>
                              <span>{prod}</span>
                              {isSelected && <CheckCircle2 size={14} className="text-brand-gold shrink-0" />}
                            </button>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Primary Reason */}
          {(form.products.length > 0 || form.product) && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-gold">
                <span className="w-5 h-5 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-[9px]">4</span>
                {t('dailyInput.primaryReasonLabel')}
              </label>
              <FormDropdown
                value={form.reason}
                options={PRIMARY_REASONS}
                onChange={v => setForm({ ...form, reason: v })}
                placeholder={t('dailyInput.reasonPlaceholder')}
              />
              {form.reason === 'Other' && (
                <input type="text" value={form.customReason} onChange={e => setForm({ ...form, customReason: e.target.value })}
                  placeholder={t('dailyInput.customReasonPlaceholder')}
                  className="w-full bg-brand-dark/80 border border-brand-gold/15 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:border-brand-gold placeholder:text-white/35 transition-all" />
              )}
            </div>
          )}

          {/* Step 5: Weight / Volume Entry */}
          {(form.products.length > 0 || form.product) && form.reason && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-gold">
                <span className="w-5 h-5 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-[9px]">5</span>
                {t('dailyInput.weightVolumeLabel')}
              </label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input type="number" step="0.1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder={t('dailyInput.amountPlaceholder')} min="0"
                    className="w-full bg-brand-dark/80 border border-brand-gold/15 rounded-xl py-3 px-4 text-lg font-geometric font-black text-white outline-none focus:border-brand-gold placeholder:text-white/35 transition-all" />
                </div>
                <div className="flex gap-1 bg-brand-dark/80 border border-brand-gold/15 rounded-xl p-1">
                  {(['kg', 'lbs', 'L'] as const).map(u => (
                    <button key={u} type="button" onClick={() => setUnit(u)}
                      className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase transition-all ${unit === u ? 'bg-brand-eco text-brand-dark' : 'text-white/50 hover:text-white'}`}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Waste Destination */}
          {(form.products.length > 0 || form.product) && form.reason && form.amount && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-gold">
                <span className="w-5 h-5 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-[9px]">6</span>
                {t('dailyInput.wasteDestinationLabel')}
              </label>
              <FormDropdown
                value={form.destination}
                options={WASTE_DESTINATIONS}
                onChange={v => setForm({ ...form, destination: v })}
                placeholder={t('dailyInput.destinationPlaceholder')}
              />
            </div>
          )}

          {/* Step 7: Visual Verification */}
          {(form.products.length > 0 || form.product) && form.reason && form.amount && form.destination && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-gold">
              <span className="w-5 h-5 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-[9px]">7</span>
              {t('dailyInput.visualVerificationLabel')}
            </label>

            {/* Upload area */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={e => handleImageUpload(e.target.files)}
              className="hidden"
            />

            {form.images.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImages}
                className="w-full border-2 border-dashed border-brand-gold/20 rounded-xl py-8 flex flex-col items-center gap-2 text-white/40 hover:border-brand-gold/40 hover:text-white/60 transition-all"
              >
                {uploadingImages ? (
                  <Loader2 size={24} className="animate-spin text-brand-gold" />
                ) : (
                  <ImagePlus size={24} className="text-brand-gold/60" />
                )}
                <span className="text-[11px] font-bold uppercase tracking-widest">
                  {uploadingImages ? t('dailyInput.uploading') : t('dailyInput.uploadPhotos')}
                </span>
                <span className="text-[9px] text-white/30">{t('dailyInput.uploadHint')}</span>
              </button>
            ) : (
              <div className="space-y-3">
                {/* Image previews */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {form.images.map((url, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-brand-gold/20 shadow-lg">
                      <img src={url} alt={`Waste ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-brand-dark/90 border border-brand-alert/40 rounded-full flex items-center justify-center shadow-md hover:bg-brand-alert/20 transition-all"
                      >
                        <X size={12} className="text-brand-alert" />
                      </button>
                    </div>
                  ))}
                  {/* Add more button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImages}
                    className="aspect-square border-2 border-dashed border-brand-gold/20 rounded-xl flex flex-col items-center justify-center gap-1 text-white/30 hover:border-brand-gold/40 hover:text-white/50 hover:bg-brand-gold/5 transition-all"
                  >
                    {uploadingImages ? (
                      <Loader2 size={18} className="animate-spin text-brand-gold" />
                    ) : (
                      <Plus size={18} />
                    )}
                  </button>
                </div>
                <p className="text-[9px] text-white/30 font-medium">{form.images.length} image{form.images.length !== 1 ? 's' : ''} attached</p>
              </div>
            )}
          </div>
          )}

          {/* Submit / Cancel */}
          {(form.products.length > 0 || form.product) && form.reason && form.amount && form.destination && (
            <div className="flex gap-3">
              <button type="submit"
                className="flex-1 px-5 py-3.5 rounded-xl bg-brand-eco text-brand-dark font-black text-sm uppercase tracking-wider hover:brightness-110 transition-all flex items-center justify-center gap-2 animate-in fade-in duration-300">
                {editingId ? <CheckCircle2 size={16} /> : <Plus size={16} />}
                {editingId ? t('dailyInput.updateEntry') : t('dailyInput.logEntry')}
              </button>
              {editingId && (
                <button type="button" onClick={handleTare}
                  className="px-5 py-3.5 rounded-xl bg-white/5 border border-brand-gold/15 text-white/60 font-black text-sm uppercase tracking-wider hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 animate-in fade-in duration-300">
                  <RotateCcw size={14} /> {t('dailyInput.cancel')}
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      {/* ── WATER & ENERGY TRACKING ── */}
      <div ref={resourceSectionRef} className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Water */}
        <div className="bg-[#1c3933] border border-brand-gold/10 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded-xl flex items-center justify-center shrink-0">
              <Droplets size={18} className="text-[#3b82f6]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">{t('dailyInput.waterUsageTitle')}</h3>
              <p className="text-[10px] text-white/40 font-medium mt-0.5">{t('dailyInput.waterUsageSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input type="number" value={form.water} onChange={e => setForm({ ...form, water: e.target.value })}
                placeholder={t('dailyInput.waterPlaceholder')} min="0"
                className="w-full bg-brand-dark/80 border border-brand-gold/15 rounded-xl py-3 pl-4 pr-12 text-sm font-geometric font-bold text-white outline-none focus:border-[#3b82f6] placeholder:text-white/35 transition-all" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#3b82f6]/60 uppercase tracking-wider">L</span>
            </div>
            <button type="button" onClick={() => handleSaveResource('water')} disabled={!form.water}
              className="shrink-0 w-12 h-12 rounded-xl bg-brand-eco text-brand-dark font-black flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title={editingResourceId && form.water ? t('dailyInput.update') : t('dailyInput.logWaterReading')}>
              {editingResourceId && form.water ? <CheckCircle2 size={18} /> : <Plus size={18} />}
            </button>
            {editingResourceId && form.water && (
              <button type="button" onClick={() => { setEditingResourceId(null); setForm(prev => ({ ...prev, water: '' })); }}
                className="shrink-0 w-12 h-12 rounded-xl bg-white/5 border border-brand-gold/15 text-white/60 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all"
                title="Cancel">
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Energy */}
        <div className="bg-[#1c3933] border border-brand-gold/10 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-brand-gold/10 border border-brand-gold/30 rounded-xl flex items-center justify-center shrink-0">
              <Zap size={18} className="text-brand-gold" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">{t('dailyInput.energyReadingTitle')}</h3>
              <p className="text-[10px] text-white/40 font-medium mt-0.5">{t('dailyInput.energyUsageSubtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input type="number" value={form.energy} onChange={e => setForm({ ...form, energy: e.target.value })}
                placeholder={t('dailyInput.energyPlaceholder')} min="0"
                className="w-full bg-brand-dark/80 border border-brand-gold/15 rounded-xl py-3 pl-4 pr-12 text-sm font-geometric font-bold text-white outline-none focus:border-brand-gold placeholder:text-white/35 transition-all" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-brand-gold/60 uppercase tracking-wider">kWh</span>
            </div>
            <button type="button" onClick={() => handleSaveResource('energy')} disabled={!form.energy}
              className="shrink-0 w-12 h-12 rounded-xl bg-brand-eco text-brand-dark font-black flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title={editingResourceId && form.energy ? t('dailyInput.update') : t('dailyInput.logEnergyReading')}>
              {editingResourceId && form.energy ? <CheckCircle2 size={18} /> : <Plus size={18} />}
            </button>
            {editingResourceId && form.energy && (
              <button type="button" onClick={() => { setEditingResourceId(null); setForm(prev => ({ ...prev, energy: '' })); }}
                className="shrink-0 w-12 h-12 rounded-xl bg-white/5 border border-brand-gold/15 text-white/60 flex items-center justify-center hover:bg-white/10 hover:text-white transition-all"
                title="Cancel">
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── VERIFICATION: FOOD WASTE LOG ── */}
      {wasteEntries.length > 0 && (
        <div className="bg-gradient-to-br from-[#1c3933] to-[#162d28] border border-brand-gold/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-brand-gold/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-eco/15 border border-brand-eco/30 flex items-center justify-center">
              <CheckCircle2 size={16} className="text-brand-eco" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">{t('dailyInput.foodWasteLogTitle')}</h3>
            <span className="ml-auto text-[10px] font-bold text-white/30 uppercase tracking-widest">{wasteEntries.length} {wasteEntries.length !== 1 ? 'Entries' : 'Entry'}</span>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1.2fr_0.8fr] gap-3 sm:gap-4 px-4 sm:px-5 py-3 border-b border-brand-gold/5 bg-black/10">
            <span className="text-[11px] font-black uppercase tracking-widest text-brand-gold/60">{t('dailyInput.thLoggedItem')}</span>
            <span className="text-[11px] font-black uppercase tracking-widest text-brand-gold/60 text-center">{t('dailyInput.visualVerificationLabel')}</span>
            <span className="text-[11px] font-black uppercase tracking-widest text-brand-gold/60 text-right">{t('dailyInput.thMetrics')}</span>
            <span className="text-[11px] font-black uppercase tracking-widest text-brand-gold/60 text-right">{t('dailyInput.thTimestamp')}</span>
            <span className="text-[11px] font-black uppercase tracking-widest text-brand-gold/60 text-center">{t('dailyInput.thActions')}</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-brand-gold/5">
            {wasteEntries.slice(wastePage * PAGE_SIZE, wastePage * PAGE_SIZE + PAGE_SIZE).map((entry) => (
              <div key={entry.id} className="grid grid-cols-[2fr_1fr_1fr_1.2fr_0.8fr] gap-3 sm:gap-4 px-4 sm:px-5 py-4 items-center hover:bg-white/3 transition-colors group">
                {/* Col 1: Logged Item */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider truncate">{entry.product}</span>
                    <span className="text-[9px] font-bold text-brand-eco uppercase tracking-widest px-2 py-0.5 rounded-full bg-brand-eco/10 border border-brand-eco/20 shrink-0">{entry.destination}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{entry.category}</span>
                    <span className="text-white/15">·</span>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{entry.subCategory}</span>
                    <span className="text-white/15">·</span>
                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{entry.reason}</span>
                  </div>
                </div>

                {/* Col 2: Verification */}
                <div className="flex justify-center">
                  {entry.images && entry.images.length > 0 ? (
                    <div className="flex -space-x-2">
                      {entry.images.slice(0, 2).map((url, idx) => (
                        <img key={idx} src={url} alt="" onClick={() => setLightbox(url)} className="w-10 h-10 rounded-lg object-cover border-2 border-brand-dark shadow-md cursor-pointer hover:scale-110 hover:z-10 transition-transform" />
                      ))}
                      {entry.images.length > 2 && (
                        <button onClick={() => setLightbox(entry.images![0])} className="w-10 h-10 rounded-lg bg-brand-dark border-2 border-brand-dark flex items-center justify-center text-[9px] font-bold text-white/50 shadow-md hover:scale-110 hover:z-10 transition-transform">+{entry.images.length - 2}</button>
                      )}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-brand-gold/5 border border-brand-gold/10 flex items-center justify-center">
                      <Leaf size={16} className="text-brand-gold/30" />
                    </div>
                  )}
                </div>

                {/* Col 3: Metrics */}
                <div className="text-right">
                  <div className="text-base sm:text-lg font-bold text-white">{entry.amount.toFixed(1)}<span className="text-[10px] text-white/40 uppercase ml-1">{entry.unit}</span></div>
                </div>

                {/* Col 4: Timestamp */}
                <div className="text-right">
                  <div className="text-[10px] font-bold text-white/50">{entry.createdAt ? new Date(entry.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : (entry.date || '—')}</div>
                </div>

                {/* Col 5: Actions */}
                <div className="flex items-center justify-center gap-1.5">
                  {canEditEntry(entry.createdAt) ? (
                    <>
                      <button onClick={() => handleEditWaste(entry)} className="w-8 h-8 rounded-lg bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center hover:bg-brand-gold/20 hover:border-brand-gold/50 transition-all"><Edit2 size={13} className="text-brand-gold" /></button>
                      <button onClick={() => deleteWaste(entry.id)} className="w-8 h-8 rounded-lg bg-brand-alert/10 border border-brand-alert/30 flex items-center justify-center hover:bg-brand-alert/20 hover:border-brand-alert/50 transition-all"><Trash2 size={13} className="text-brand-alert" /></button>
                    </>
                  ) : (
                    <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold px-2">Locked</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {wasteEntries.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-brand-gold/5 bg-black/5">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                Page {wastePage + 1} of {Math.ceil(wasteEntries.length / PAGE_SIZE)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setWastePage(p => Math.max(0, p - 1))}
                  disabled={wastePage === 0}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all disabled:opacity-20 disabled:cursor-not-allowed enabled:hover:bg-brand-gold/10 enabled:hover:border-brand-gold/30 text-white/60 border-brand-gold/10"
                >
                  Prev
                </button>
                <button
                  onClick={() => setWastePage(p => Math.min(Math.ceil(wasteEntries.length / PAGE_SIZE) - 1, p + 1))}
                  disabled={wastePage >= Math.ceil(wasteEntries.length / PAGE_SIZE) - 1}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all disabled:opacity-20 disabled:cursor-not-allowed enabled:hover:bg-brand-gold/10 enabled:hover:border-brand-gold/30 text-white/60 border-brand-gold/10"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── VERIFICATION: RESOURCE FLOWS ── */}
      {resourceEntries.length > 0 && (
        <div className="bg-gradient-to-br from-[#1c3933] to-[#162d28] border border-brand-gold/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-brand-gold/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-eco/15 border border-brand-eco/30 flex items-center justify-center">
              <TrendingDown size={16} className="text-brand-eco" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">{t('dailyInput.resourceFlowsTitle')}</h3>
            <span className="ml-auto text-[10px] font-bold text-white/30 uppercase tracking-widest">{resourceEntries.length} {resourceEntries.length !== 1 ? 'Readings' : 'Reading'}</span>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-5 py-3 border-b border-brand-gold/5 bg-black/10">
            <span className="text-[11px] font-black uppercase tracking-widest text-brand-gold/60">{t('dailyInput.thFlowType')}</span>
            <span className="text-[11px] font-black uppercase tracking-widest text-brand-gold/60 text-center">{t('dailyInput.thCumulativeConsumption')}</span>
            <span className="text-[11px] font-black uppercase tracking-widest text-brand-gold/60 text-right">{t('dailyInput.thLogTime')}</span>
            <span className="text-[11px] font-black uppercase tracking-widest text-brand-gold/60 text-center">{t('dailyInput.thActions')}</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-brand-gold/5">
            {resourceEntries.slice(resourcePage * PAGE_SIZE, resourcePage * PAGE_SIZE + PAGE_SIZE).map((entry) => (
              <div key={entry.id} className="grid grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-5 py-4 items-center hover:bg-white/3 transition-colors group">
                {/* Col 1: Flow Type */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border bg-brand-eco/10 border-brand-eco/20">
                    {entry.type === 'water'
                      ? <Droplets size={18} className="text-brand-eco" />
                      : <Zap size={18} className="text-brand-eco" />}
                  </div>
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">{entry.type === 'water' ? t('dailyInput.waterReading') : t('dailyInput.energyReading')}</span>
                </div>

                {/* Col 2: Cumulative Consumption */}
                <div className="text-center">
                  <div className="text-base sm:text-lg font-bold text-white">{entry.amount.toLocaleString()}<span className="text-[10px] text-white/40 uppercase ml-1">{entry.type === 'water' ? 'L' : 'kWh'}</span></div>
                </div>

                {/* Col 3: Log Time */}
                <div className="text-right">
                  <div className="text-[10px] font-bold text-white/50">{entry.createdAt ? new Date(entry.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : (entry.date || '—')}</div>
                </div>

                {/* Col 4: Actions */}
                <div className="flex items-center justify-center gap-1.5">
                  {canEditEntry(entry.createdAt) ? (
                    <>
                      <button onClick={() => {
                        setEditingResourceId(entry.id);
                        setForm(prev => ({ ...prev, [entry.type]: entry.amount.toString() }));
                        setTimeout(() => resourceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
                      }} className="w-8 h-8 rounded-lg bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center hover:bg-brand-gold/20 hover:border-brand-gold/50 transition-all"><Edit2 size={13} className="text-brand-gold" /></button>
                      <button onClick={() => deleteResource(entry.id)} className="w-8 h-8 rounded-lg bg-brand-alert/10 border border-brand-alert/30 flex items-center justify-center hover:bg-brand-alert/20 hover:border-brand-alert/50 transition-all"><Trash2 size={13} className="text-brand-alert" /></button>
                    </>
                  ) : (
                    <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold px-2">Locked</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {resourceEntries.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-brand-gold/5 bg-black/5">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                Page {resourcePage + 1} of {Math.ceil(resourceEntries.length / PAGE_SIZE)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setResourcePage(p => Math.max(0, p - 1))}
                  disabled={resourcePage === 0}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all disabled:opacity-20 disabled:cursor-not-allowed enabled:hover:bg-brand-gold/10 enabled:hover:border-brand-gold/30 text-white/60 border-brand-gold/10"
                >
                  Prev
                </button>
                <button
                  onClick={() => setResourcePage(p => Math.min(Math.ceil(resourceEntries.length / PAGE_SIZE) - 1, p + 1))}
                  disabled={resourcePage >= Math.ceil(resourceEntries.length / PAGE_SIZE) - 1}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all disabled:opacity-20 disabled:cursor-not-allowed enabled:hover:bg-brand-gold/10 enabled:hover:border-brand-gold/30 text-white/60 border-brand-gold/10"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MILA ACTIONABLE INTELLIGENCE ── */}
      <div>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-10 h-10 bg-brand-eco/10 border border-brand-eco/30 rounded-xl flex items-center justify-center shrink-0">
            <Cpu className="text-brand-eco" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-geometric font-bold text-white tracking-tight uppercase">{t('dailyInput.milaTitle')}</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold/80">{t('dailyInput.milaSubtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Carbon Lifecycle */}
          <div className={`rounded-2xl border p-5 transition-all ${showAlertCarbon ? 'border-brand-alert/40 bg-brand-alert/5' : 'border-brand-gold/10 bg-[#1c3933]'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Cloud size={16} className="text-brand-gold" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-brand-gold">{t('dailyInput.carbonLifecycle')}</h4>
            </div>
            <p className="text-3xl font-geometric font-black text-white leading-none mb-2">
              {totals.carbonImpact.toFixed(1)}
              <span className="text-xs font-medium text-white/40 uppercase ml-1.5">{t('dailyInput.carbonUnit')}</span>
            </p>
            <div className="flex items-center gap-2">
              {showAlertCarbon ? (
                <>
                  <AlertTriangle size={12} className="text-brand-alert" />
                  <span className="text-[10px] font-bold text-brand-alert uppercase tracking-widest">{t('dailyInput.operationalDeviation')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} className="text-brand-eco" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('dailyInput.avertedLoss')}</span>
                </>
              )}
            </div>
          </div>

          {/* Water Resource */}
          <div className={`rounded-2xl border p-5 transition-all ${showAlertWater ? 'border-brand-alert/40 bg-brand-alert/5' : 'border-brand-gold/10 bg-[#1c3933]'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Scale size={16} className="text-brand-gold" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-brand-gold">{t('dailyInput.waterResource')}</h4>
            </div>
            <p className="text-3xl font-geometric font-black text-white leading-none mb-2">
              {totals.waterFootprint.toFixed(1)}
              <span className="text-xs font-medium text-white/40 uppercase ml-1.5">{t('dailyInput.waterLossUnit')}</span>
            </p>
            <div className="flex items-center gap-2">
              {showAlertWater ? (
                <>
                  <AlertTriangle size={12} className="text-brand-alert" />
                  <span className="text-[10px] font-bold text-brand-alert uppercase tracking-widest">{t('dailyInput.operationalDeviation')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} className="text-brand-eco" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t('dailyInput.avertedLoss')}</span>
                </>
              )}
            </div>
          </div>

          {/* Financial Impact */}
          <div className={`rounded-2xl border p-5 transition-all duration-300 ${(showAlertFinance || showAlertCarbon) ? 'border-brand-alert/40 bg-brand-alert/5' : 'border-brand-eco/30 bg-brand-eco/5 hover:border-brand-eco/40'}`}>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className={(showAlertFinance || showAlertCarbon) ? 'text-brand-alert' : 'text-brand-eco'} />
                <h4 className={`text-[11px] font-black uppercase tracking-widest ${(showAlertFinance || showAlertCarbon) ? 'text-brand-alert' : 'text-brand-eco'}`}>{t('dailyInput.financialImpact')}</h4>
              </div>
              {(showAlertFinance || showAlertCarbon) ? (
                <div className="flex items-center gap-1.5 bg-brand-alert/20 text-brand-alert border border-brand-alert/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0">
                  <AlertTriangle size={9} /> {t('dailyInput.notified')}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-brand-eco/15 text-brand-eco border border-brand-eco/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0">
                  <ShieldCheck size={9} /> {t('dailyInput.onTarget')}
                </div>
              )}
            </div>
            <p className={`text-3xl font-geometric font-black leading-none mb-2 ${(showAlertFinance || showAlertCarbon) ? 'text-brand-alert' : 'text-brand-eco'}`}>
              ${totals.totalFinancialLoss.toFixed(2)}
            </p>
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3">
              {(showAlertFinance || showAlertCarbon) ? t('dailyInput.supervisorNotified') : t('dailyInput.withinFinancialCap')}
            </p>
            <div className={`space-y-1 pt-2 border-t ${(showAlertFinance || showAlertCarbon) ? 'border-brand-alert/20' : 'border-brand-eco/20'}`}>
              <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-white/40">
                <span>{t('dailyInput.itemLoss')}</span>
                <span className="text-white">${totals.financialLossItems.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-white/40">
                <span>{t('dailyInput.logistics')}</span>
                <span className="text-white">${totals.financialLossDisposal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── IMAGE LIGHTBOX ── */}
      {lightbox && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-brand-dark/95 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
          >
            <X size={20} />
          </button>
          <img
            src={lightbox}
            alt="Waste verification"
            className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-brand-gold/20"
            onClick={e => e.stopPropagation()}
          />
        </div>,
        document.body
      )}

      {/* ── CONFIRMATION MODAL ── */}
      {confirmModal && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-brand-dark/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="relative bg-gradient-to-br from-[#1c3933] to-[#152e2a] border border-brand-alert/30 rounded-3xl p-8 shadow-[0_24px_80px_rgba(0,0,0,0.8)] max-w-[400px] w-[calc(100%-2rem)] animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 rounded-2xl bg-brand-alert/15 border border-brand-alert/40 flex items-center justify-center shadow-[0_0_24px_rgba(239,68,68,0.2)]">
                <Trash2 size={28} className="text-brand-alert" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-center text-lg font-geometric font-bold text-white uppercase tracking-tight mb-2">{t('dailyInput.confirmDeletionTitle')}</h3>

            {/* Message */}
            <p className="text-center text-sm text-white/60 leading-relaxed mb-7">{confirmModal.message}</p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-5 py-3.5 rounded-xl bg-white/5 border border-brand-gold/15 text-white/70 font-black text-xs uppercase tracking-widest hover:bg-white/10 hover:text-white hover:border-brand-gold/30 transition-all"
              >
                {t('dailyInput.cancel')}
              </button>
              <button
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                className="flex-1 px-5 py-3.5 rounded-xl bg-brand-alert/20 border border-brand-alert/50 text-brand-alert font-black text-xs uppercase tracking-widest hover:bg-brand-alert/30 hover:border-brand-alert/70 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> {t('dailyInput.delete')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// Inline icon to avoid extra imports
const ClipboardListIcon: React.FC<{ className?: string; size?: number }> = ({ className, size }) => (
  <svg xmlns="http://www.w3.org/200/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4" />
    <path d="M12 16h4" />
    <path d="M8 11h.01" />
    <path d="M8 16h.01" />
  </svg>
);

export default DailyInputForm;
