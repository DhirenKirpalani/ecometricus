import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Trash2, Edit2, Plus, RotateCcw, CheckCircle2, AlertTriangle,
  Leaf, Droplets, Zap, Cloud, DollarSign, Cpu, Camera, Info, TrendingDown, Scale, Search, ChevronDown,
  ImagePlus, X, Loader2
} from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

interface DailyInputFormProps {
  user: UserProfile;
  onAuditLog?: (action: string, entityType: string, entityName: string, description: string, metadata?: Record<string, any>) => void;
}

// Reusable dropdown component
const FormDropdown: React.FC<{
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ value, options, onChange, placeholder }) => {
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
        <span className={value ? 'text-white' : 'text-white/40'}>{value || placeholder || 'Select…'}</span>
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
  category: string;
  subCategory: string;
  product: string;
  reason: string;
  destination: string;
  amount: number;
  unit: 'kg' | 'lbs' | 'L';
  timestamp: string;
  imageUrl?: string;
  images?: string[];
  staffName?: string;
  outletCode?: string;
}

interface ResourceEntry {
  id: string;
  type: 'water' | 'energy';
  amount: number;
  timestamp: string;
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

const DailyInputForm: React.FC<DailyInputFormProps> = ({ user, onAuditLog }) => {
  const [unit, setUnit] = useState<'kg' | 'lbs' | 'L'>('kg');
  const [showAlert, setShowAlert] = useState<{ msg: string; color: string } | null>(null);

  const [wasteEntries, setWasteEntries] = useState<WasteEntry[]>(() => {
    const saved = localStorage.getItem('ecometricus_waste_entries');
    let entries: WasteEntry[] = saved ? JSON.parse(saved) : [];
    if (user.role === 'basic') {
      entries = entries.filter(e => e.outletCode === user.outletCode);
    }
    return entries;
  });

  const [resourceEntries, setResourceEntries] = useState<ResourceEntry[]>(() => {
    const saved = localStorage.getItem('ecometricus_resource_entries');
    return saved ? JSON.parse(saved) : [];
  });

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
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const showConfirm = (message: string, onConfirm: () => void) => setConfirmModal({ message, onConfirm });
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload images to Supabase Storage
  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) continue;
        // Max 5MB
        if (file.size > 5 * 1024 * 1024) continue;

        const fileExt = file.name.split('.').pop();
        const fileName = `${session.user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('waste-images')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('waste-images')
          .getPublicUrl(fileName);

        if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl);
      }

      if (uploadedUrls.length > 0) {
        setForm(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
      }
    } catch (err) {
      console.error('[DailyInput] Image upload failed:', err);
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

  useEffect(() => {
    localStorage.setItem('ecometricus_waste_entries', JSON.stringify(wasteEntries));
  }, [wasteEntries]);

  useEffect(() => {
    localStorage.setItem('ecometricus_resource_entries', JSON.stringify(resourceEntries));
  }, [resourceEntries]);

  useEffect(() => {
    localStorage.setItem('ecometricus_daily_form', JSON.stringify(form));
  }, [form]);

  const totals = useMemo(() => {
    const wasteTotal = wasteEntries.reduce((sum, e) => sum + e.amount, 0);
    const costPerItemUnit = 7.50;
    const costPerDisposalUnit = 1.25;
    const carbonCoeff = 2.85;
    const waterCoeff = 3.40;
    const financialLossItems = wasteTotal * costPerItemUnit;
    const financialLossDisposal = wasteTotal * costPerDisposalUnit;

    return {
      waste: wasteTotal,
      water: resourceEntries.filter(e => e.type === 'water').reduce((sum, e) => sum + e.amount, 0),
      energy: resourceEntries.filter(e => e.type === 'energy').reduce((sum, e) => sum + e.amount, 0),
      financialLossItems,
      financialLossDisposal,
      totalFinancialLoss: financialLossItems + financialLossDisposal,
      carbonImpact: wasteTotal * carbonCoeff,
      waterFootprint: wasteTotal * waterCoeff,
    };
  }, [wasteEntries, resourceEntries]);

  const BENCHMARKS = { waste: 100, water: 5000, energy: 200 };

  useEffect(() => {
    if (totals.waste > BENCHMARKS.waste) {
      const deviation = totals.waste - BENCHMARKS.waste;
      const deviationCost = (deviation * 7.50) + (deviation * 1.25);
      setShowAlert({
        msg: `CRITICAL DEVIATION: Benchmark exceeded by ${deviation.toFixed(1)}${unit}. Potential Financial Loss: $${deviationCost.toFixed(2)}.`,
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

    // ── Sync to Supabase ──
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Find outlet by code
      const { data: outlet } = await supabase
        .from('outlets')
        .select('id, name')
        .eq('code', user.outletCode)
        .single();

      if (outlet) {
        await supabase.from('food_waste_logs').insert({
          outlet_id: outlet.id,
          outlet_name: outlet.name,
          mass_kg: unit === 'lbs' ? amountNum * 0.4536 : amountNum,
          cost_per_kg: 6.53,
          is_mock: false,
          user_id: session?.user?.id || null,
          created_by: user.fullName,
          image_url: form.images.length > 0 ? form.images[0] : null,
          images: form.images.length > 0 ? form.images : null,
        });
      }

      // ── Record daily check-in (streak tracking) ──
      if (session?.user?.id) {
        await supabase.rpc('record_daily_checkin', {
          p_user_id: session.user.id,
          p_user_name: user.fullName,
          p_user_role: user.role,
          p_outlet_code: user.outletCode,
          p_entry_type: 'waste',
        });
        window.dispatchEvent(new Event('ecometricus_checkin_updated'));
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
        category: form.category,
        subCategory: form.subCategory,
        product: productStr,
        reason: finalReason,
        destination: form.destination,
        amount: parseFloat(form.amount),
        unit,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        staffName: user.fullName,
        outletCode: user.outletCode,
        images: form.images,
      };
      setWasteEntries([newEntry, ...wasteEntries]);
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

    // ── Sync to Supabase ──
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: outlet } = await supabase
        .from('outlets')
        .select('id, name')
        .eq('code', user.outletCode)
        .single();

      if (outlet) {
        await supabase.from('resource_logs').insert({
          outlet_id: outlet.id,
          outlet_name: outlet.name,
          resource_type: type,
          amount: amountNum,
          user_id: session?.user?.id || null,
          created_by: user.fullName,
        });
      }

      // ── Record daily check-in (streak tracking) ──
      if (session?.user?.id) {
        await supabase.rpc('record_daily_checkin', {
          p_user_id: session.user.id,
          p_user_name: user.fullName,
          p_user_role: user.role,
          p_outlet_code: user.outletCode,
          p_entry_type: type,
        });
        window.dispatchEvent(new Event('ecometricus_checkin_updated'));
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
        type, amount: parseFloat(val),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setResourceEntries([newEntry, ...resourceEntries]);
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
    showConfirm(`Delete waste entry "${entry.product}" (${entry.amount}${entry.unit})? This cannot be undone.`, () => {
      setWasteEntries(prev => prev.filter(e => e.id !== id));
      onAuditLog?.('waste_entry_deleted', 'daily_input', entry.product,
        `Deleted waste entry: ${entry.category} → ${entry.product} (${entry.amount}${entry.unit})`,
        { category: entry.category, product: entry.product, amount: entry.amount, unit: entry.unit, outletCode: entry.outletCode });
    });
  };
  const deleteResource = (id: string) => {
    const entry = resourceEntries.find(e => e.id === id);
    if (!entry) return;
    const label = entry.type === 'water' ? 'Water Reading' : 'Energy Reading';
    showConfirm(`Delete ${label} of ${entry.amount}${entry.type === 'water' ? 'L' : 'kWh'}? This cannot be undone.`, () => {
      setResourceEntries(prev => prev.filter(e => e.id !== id));
      onAuditLog?.(`${entry.type}_entry_deleted`, 'daily_input', entry.type,
        `Deleted ${entry.type} entry: ${entry.amount}${entry.type === 'water' ? 'L' : 'kWh'}`,
        { type: entry.type, amount: entry.amount, outletCode: user.outletCode });
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
          <div className="w-12 h-12 bg-brand-gold/10 border border-brand-gold/30 rounded-xl flex items-center justify-center shrink-0">
            <ClipboardListIcon className="text-brand-gold" size={24} />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-geometric font-bold text-white tracking-tight uppercase leading-tight">
              Daily Input
            </h2>
            <p className="text-[11px] sm:text-xs text-white/50 font-medium mt-1">
              Log Waste & Resource Data
            </p>
          </div>
        </div>
        {(form.category || form.amount) && (
          <button type="button" onClick={handleTare}
            className="flex items-center gap-2 text-[11px] font-bold text-white/40 hover:text-white/60 uppercase tracking-widest transition-colors">
            <RotateCcw size={12} /> Reset Form
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

      {/* ── FOOD WASTE FORM ── */}
      <div className="bg-[#1c3933] border border-brand-gold/10 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <Leaf size={18} className="text-brand-eco" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Food Waste Entry</h3>
        </div>

        <form onSubmit={handleSaveWaste} className="space-y-5">
          {/* Step 1: Category */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-gold">
              <span className="w-5 h-5 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-[9px]">1</span>
              Food Waste Category
            </label>
            <FormDropdown
              value={form.category}
              options={Object.keys(INVENTORY_LOGIC)}
              onChange={v => setForm({ ...form, category: v, subCategory: '', product: '', products: [], productSearch: '' })}
              placeholder="Select category…"
            />
          </div>

          {/* Step 2: Sub-Category / Food Group */}
          {form.category && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-gold">
                <span className="w-5 h-5 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-[9px]">2</span>
                Sub-Category / Food Group
              </label>
              <FormDropdown
                value={form.subCategory}
                options={Object.keys(INVENTORY_LOGIC[form.category])}
                onChange={v => setForm({ ...form, subCategory: v, product: '', products: [], productSearch: '' })}
                placeholder="Select sub-category…"
              />
            </div>
          )}

          {/* Step 3: Product Description (searchable, multi-select) */}
          {form.subCategory && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-gold">
                <span className="w-5 h-5 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-[9px]">3</span>
                Product Description
                {form.products.length > 0 && (
                  <span className="ml-1 text-[9px] bg-brand-gold/20 text-brand-gold px-1.5 py-0.5 rounded-full">{form.products.length} selected</span>
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
                  <div className="relative bg-brand-dark border border-brand-gold/30 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] max-h-48 overflow-y-auto scrollbar-gold mt-1">
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
                Primary Reason
              </label>
              <FormDropdown
                value={form.reason}
                options={PRIMARY_REASONS}
                onChange={v => setForm({ ...form, reason: v })}
                placeholder="Select reason…"
              />
              {form.reason === 'Other' && (
                <input type="text" value={form.customReason} onChange={e => setForm({ ...form, customReason: e.target.value })}
                  placeholder="Specify reason..."
                  className="w-full bg-brand-dark/80 border border-brand-gold/15 rounded-xl py-2.5 px-4 text-sm text-white outline-none focus:border-brand-gold placeholder:text-white/35 transition-all" />
              )}
            </div>
          )}

          {/* Step 5: Weight / Volume Entry */}
          {(form.products.length > 0 || form.product) && form.reason && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-gold">
                <span className="w-5 h-5 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-[9px]">5</span>
                Weight / Volume Entry
              </label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <input type="number" step="0.1" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.0" min="0"
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
                Waste Destination
              </label>
              <FormDropdown
                value={form.destination}
                options={WASTE_DESTINATIONS}
                onChange={v => setForm({ ...form, destination: v })}
                placeholder="Select destination…"
              />
            </div>
          )}

          {/* Step 7: Visual Verification */}
          {(form.products.length > 0 || form.product) && form.reason && form.amount && form.destination && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-brand-gold">
                <span className="w-5 h-5 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-[9px]">7</span>
                Visual Verification
                <span className="text-white/30 font-medium normal-case tracking-normal text-[10px] ml-1">(optional)</span>
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
                    {uploadingImages ? 'Uploading…' : 'Upload Photos'}
                  </span>
                  <span className="text-[9px] text-white/30">Click to select images (max 5MB each)</span>
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Image thumbnails */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {form.images.map((url, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-brand-gold/20">
                        <img src={url} alt={`Waste ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 w-5 h-5 bg-brand-dark/80 border border-brand-alert/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={10} className="text-brand-alert" />
                        </button>
                      </div>
                    ))}
                    {/* Add more button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImages}
                      className="aspect-square border-2 border-dashed border-brand-gold/20 rounded-lg flex flex-col items-center justify-center gap-1 text-white/30 hover:border-brand-gold/40 hover:text-white/50 transition-all"
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
                {editingId ? 'Update Entry' : 'Log Entry'}
              </button>
              {editingId && (
                <button type="button" onClick={handleTare}
                  className="px-5 py-3.5 rounded-xl bg-white/5 border border-brand-gold/15 text-white/60 font-black text-sm uppercase tracking-wider hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 animate-in fade-in duration-300">
                  <RotateCcw size={14} /> Cancel
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      {/* ── WATER & ENERGY TRACKING ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Water */}
        <div className="bg-[#1c3933] border border-brand-gold/10 rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded-xl flex items-center justify-center shrink-0">
              <Droplets size={18} className="text-[#3b82f6]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Water Usage Tracking</h3>
              <p className="text-[10px] text-white/40 font-medium mt-0.5">Log daily water consumption</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input type="number" value={form.water} onChange={e => setForm({ ...form, water: e.target.value })}
                placeholder="Enter volume in liters" min="0"
                className="w-full bg-brand-dark/80 border border-brand-gold/15 rounded-xl py-3 pl-4 pr-12 text-sm font-geometric font-bold text-white outline-none focus:border-[#3b82f6] placeholder:text-white/35 transition-all" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#3b82f6]/60 uppercase tracking-wider">L</span>
            </div>
            <button type="button" onClick={() => handleSaveResource('water')} disabled={!form.water}
              className="shrink-0 w-12 h-12 rounded-xl bg-brand-eco text-brand-dark font-black flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title={editingResourceId && form.water ? 'Update' : 'Log Water Reading'}>
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
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Energy Reading</h3>
              <p className="text-[10px] text-white/40 font-medium mt-0.5">Log daily energy consumption</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input type="number" value={form.energy} onChange={e => setForm({ ...form, energy: e.target.value })}
                placeholder="Enter volume in kilowatt-hours" min="0"
                className="w-full bg-brand-dark/80 border border-brand-gold/15 rounded-xl py-3 pl-4 pr-12 text-sm font-geometric font-bold text-white outline-none focus:border-brand-gold placeholder:text-white/35 transition-all" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-brand-gold/60 uppercase tracking-wider">kWh</span>
            </div>
            <button type="button" onClick={() => handleSaveResource('energy')} disabled={!form.energy}
              className="shrink-0 w-12 h-12 rounded-xl bg-brand-eco text-brand-dark font-black flex items-center justify-center hover:brightness-110 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title={editingResourceId && form.energy ? 'Update' : 'Log Energy Reading'}>
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
        <div className="bg-[#1c3933] border border-brand-gold/10 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-brand-gold/8 flex items-center gap-3">
            <CheckCircle2 size={16} className="text-brand-eco" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Verification: Food Waste Log</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-brand-gold/5 bg-black/10">
                  <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-brand-gold/60">Logged Item</th>
                  <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-brand-gold/60">Category / Food Group</th>
                  <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-brand-gold/60">Reason</th>
                  <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-brand-gold/60">Destination</th>
                  <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-brand-gold/60">Metrics</th>
                  <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-brand-gold/60">Timestamp</th>
                  <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-brand-gold/60">Actions</th>
                </tr>
              </thead>
              <tbody>
                {wasteEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-brand-gold/5 hover:bg-white/3 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {entry.images && entry.images.length > 0 && (
                          <div className="flex -space-x-1 shrink-0">
                            {entry.images.slice(0, 2).map((url, idx) => (
                              <img key={idx} src={url} alt="" className="w-7 h-7 rounded-md object-cover border border-brand-gold/20" />
                            ))}
                            {entry.images.length > 2 && (
                              <div className="w-7 h-7 rounded-md bg-brand-dark border border-brand-gold/20 flex items-center justify-center text-[8px] font-bold text-white/50">+{entry.images.length - 2}</div>
                            )}
                          </div>
                        )}
                        <span className="text-xs font-black text-white uppercase tracking-wider">{entry.product}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{entry.category}</span>
                      <p className="text-[9px] text-white/35 uppercase">{entry.subCategory}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{entry.reason}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold text-brand-eco uppercase tracking-wider">{entry.destination}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-geometric font-bold text-white">{entry.amount.toFixed(1)} <span className="text-[10px] text-white/40 uppercase">{entry.unit}</span></span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold text-white/40">{entry.timestamp}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditWaste(entry)} className="text-white/30 hover:text-brand-gold transition-colors"><Edit2 size={13} /></button>
                        <button onClick={() => deleteWaste(entry.id)} className="text-white/30 hover:text-brand-alert transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VERIFICATION: RESOURCE FLOWS ── */}
      {resourceEntries.length > 0 && (
        <div className="bg-[#1c3933] border border-brand-gold/10 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-brand-gold/8 flex items-center gap-3">
            <TrendingDown size={16} className="text-brand-gold" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Verification: Resource Flows</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-brand-gold/5 bg-black/10">
                  <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-brand-gold/60">Flow Type</th>
                  <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-brand-gold/60">Cumulative Consumption</th>
                  <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-brand-gold/60">Log Time</th>
                  <th className="py-3 px-4 text-[9px] font-black uppercase tracking-widest text-brand-gold/60">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resourceEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-brand-gold/5 hover:bg-white/3 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {entry.type === 'water' ? <Droplets size={13} className="text-[#3b82f6]" /> : <Zap size={13} className="text-brand-gold" />}
                        <span className="text-xs font-black text-white uppercase tracking-wider">{entry.type === 'water' ? 'Water Reading' : 'Energy Reading'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-geometric font-bold text-white">{entry.amount.toLocaleString()} <span className="text-[10px] text-white/40 uppercase">{entry.type === 'water' ? 'L' : 'kWh'}</span></span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold text-white/40">{entry.timestamp}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingResourceId(entry.id); setForm(prev => ({ ...prev, [entry.type]: entry.amount.toString() })); }} className="text-white/30 hover:text-brand-gold transition-colors"><Edit2 size={13} /></button>
                        <button onClick={() => deleteResource(entry.id)} className="text-white/30 hover:text-brand-alert transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MILA ACTIONABLE INTELLIGENCE ── */}
      <div>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-10 h-10 bg-brand-gold/10 border border-brand-gold/30 rounded-xl flex items-center justify-center shrink-0">
            <Cpu className="text-brand-gold" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-geometric font-bold text-white tracking-tight uppercase">Mila Actionable Intelligence</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold/80">Sustainability Performance Proportional Scaling</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Carbon Lifecycle */}
          <div className={`rounded-2xl border p-5 transition-all ${showAlertCarbon ? 'border-brand-alert/40 bg-brand-alert/5' : 'border-brand-gold/10 bg-[#1c3933]'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Cloud size={16} className="text-brand-gold" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-brand-gold">Carbon Lifecycle</h4>
            </div>
            <p className="text-3xl font-geometric font-black text-white leading-none mb-2">
              {totals.carbonImpact.toFixed(1)}
              <span className="text-xs font-medium text-white/40 uppercase ml-1.5">KG CO₂E</span>
            </p>
            <div className="flex items-center gap-2">
              {showAlertCarbon ? (
                <>
                  <AlertTriangle size={12} className="text-brand-alert" />
                  <span className="text-[10px] font-bold text-brand-alert uppercase tracking-widest">Operational Deviation Impact</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} className="text-brand-eco" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Averted Loss Footprint</span>
                </>
              )}
            </div>
          </div>

          {/* Water Resource */}
          <div className={`rounded-2xl border p-5 transition-all ${showAlertWater ? 'border-brand-alert/40 bg-brand-alert/5' : 'border-brand-gold/10 bg-[#1c3933]'}`}>
            <div className="flex items-center gap-2 mb-4">
              <Scale size={16} className="text-brand-gold" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-brand-gold">Water Resource</h4>
            </div>
            <p className="text-3xl font-geometric font-black text-white leading-none mb-2">
              {totals.waterFootprint.toFixed(1)}
              <span className="text-xs font-medium text-white/40 uppercase ml-1.5">L LOSS</span>
            </p>
            <div className="flex items-center gap-2">
              {showAlertWater ? (
                <>
                  <AlertTriangle size={12} className="text-brand-alert" />
                  <span className="text-[10px] font-bold text-brand-alert uppercase tracking-widest">Operational Deviation Impact</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={12} className="text-brand-eco" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Averted Loss Footprint</span>
                </>
              )}
            </div>
          </div>

          {/* Financial Impact */}
          <div className={`rounded-2xl border p-5 transition-all ${showAlertFinance ? 'border-brand-alert/40 bg-brand-alert/5' : 'border-brand-gold/10 bg-[#1c3933]'}`}>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={16} className="text-brand-gold" />
              <h4 className="text-[11px] font-black uppercase tracking-widest text-brand-gold">Financial Impact</h4>
            </div>
            <p className="text-3xl font-geometric font-black text-white leading-none mb-2">
              ${totals.totalFinancialLoss.toFixed(2)}
            </p>
            <div className="space-y-1 pt-2 border-t border-brand-gold/8">
              <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-white/40">
                <span>Item Loss:</span>
                <span className="text-white">${totals.financialLossItems.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-white/40">
                <span>Logistics:</span>
                <span className="text-white">${totals.financialLossDisposal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
            <h3 className="text-center text-lg font-geometric font-bold text-white uppercase tracking-tight mb-2">Confirm Deletion</h3>

            {/* Message */}
            <p className="text-center text-sm text-white/60 leading-relaxed mb-7">{confirmModal.message}</p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 px-5 py-3.5 rounded-xl bg-white/5 border border-brand-gold/15 text-white/70 font-black text-xs uppercase tracking-widest hover:bg-white/10 hover:text-white hover:border-brand-gold/30 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                className="flex-1 px-5 py-3.5 rounded-xl bg-brand-alert/20 border border-brand-alert/50 text-brand-alert font-black text-xs uppercase tracking-widest hover:bg-brand-alert/30 hover:border-brand-alert/70 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Delete
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
