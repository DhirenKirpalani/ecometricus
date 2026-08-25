
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserProfile } from '../types';
import Logo from './Logo';
import {
  Camera,
  Info,
  Search,
  ChevronDown,
  Save,
  Clock,
  Calendar as CalendarIcon,
  Image as ImageIcon,
  CheckCircle2,
  HelpCircle,
  LogOut,
  History,
  FileDigit,
  ClipboardList,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  Zap,
  Droplets,
  AlertTriangle,
  Leaf,
  ArrowRight,
  MessageSquare,
  Cpu,
  Cloud,
  TrendingUp,
  Settings2,
  DollarSign,
  Truck,
  TrendingDown
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import MilaFeedbackWidget from './MilaFeedbackWidget';
import MilaWidget from './MilaWidget';

interface StaffPortalProps {
  user: UserProfile;
  onLogout: () => void;
}

interface WasteEntry {
  id: string;
  category: string;
  subCategory: string;
  product: string;
  justification: string;
  amount: number;
  unit: 'kg' | 'lbs' | 'L';
  timestamp: string;
  imageUrl?: string;
  staffName?: string;
  outletCode?: string;
}

interface ResourceEntry {
  id: string;
  type: 'water' | 'energy';
  amount: number;
  timestamp: string;
}

const INVENTORY_LOGIC: Record<string, Record<string, string[]>> = {
  'Prep Waste': {
    'Vegetables': ['Tomatoes', 'Carrots', 'Onions', 'Potatoes', 'Salad Mix', 'Bell Peppers'],
    'Fruits': ['Strawberries', 'Lemon', 'Lime', 'Oranges', 'Apple', 'Pineapple'],
    'Proteins': ['Beef Trim', 'Chicken Skin', 'Fish Bones', 'Egg Shells', 'Pork Fat'],
    'Grains': ['Rice', 'Pasta', 'Bread Scraps', 'Quinoa'],
    'Oils': ['Frying Oil', 'Dressing Base', 'Garlic Oil']
  },
  'Spoiled Food': {
    'Dairy Products': ['Milk', 'Cream', 'Cheese', 'Butter', 'Yogurt'],
    'Raw Meat': ['Steak', 'Pork Belly', 'Lamb Rack', 'Minced Beef'],
    'Seafood': ['Whole Fish', 'Shrimp', 'Clams', 'Mussels', 'Squid'],
    'Fresh Produce': ['Lettuce', 'Spinach', 'Berries', 'Herbs', 'Mushrooms']
  },
  'Surplus/Overproduction': {
    'Breakfast Buffet': ['Scrambled Eggs', 'Bacon', 'Pastries', 'Fruit Platter'],
    'Lunch Buffet': ['Soup of the Day', 'Roast Chicken', 'Steamed Veg', 'Pasta Salad'],
    'Menu Dishes': ['Chef Special', 'Daily Catch', 'Vegan Bowl'],
    'Banqueting': ['Canape Selection', 'Main Course Over-prep']
  },
  'Expired Inventory': {
    'Pantry/Walk-in': ['Dairy', 'Dry Goods', 'Perishables', 'Sauces'],
    'Canned Goods': ['Tomato Paste', 'Olives', 'Beans'],
    'Dry Goods': ['Flour', 'Sugar', 'Salt', 'Spices']
  },
  'Post-Consumer Waste': {
    'Plate Scraps': ['Starch Side', 'Protein Remnants', 'Veg Garnish'],
    'Table Items': ['Bread Basket', 'Butter Dishes', 'Unused Condiments']
  },
  'Production Byproducts': {
    'Kitchen Residue': ['Oil Residue', 'Peels & Rinds', 'Coffee Grounds', 'Tea Bags']
  }
};

const JUSTIFICATION_LOGIC: Record<string, string[]> = {
  'Dairy Products': ['Expiration Date', 'Blow it', 'Package Damage', 'Spoiled', 'Poor Storage', 'Other'],
  'Raw Meat': ['Freezer Burn', 'Spoilage/Smell', 'Trimming', 'Rejected Cuts', 'Unsold Inventory', 'Poor Storage', 'Other'],
  'Seafood': ['Spoilage/Smell', 'Rejected Quality', 'Inventory Overstock', 'Poor Storage', 'Other'],
  'Vegetables': ['Prep Trimmings', 'Bruised', 'Spoilage', 'Over-order', 'Other'],
  'Breakfast Buffet': ['Overproduction', 'Guest Leftover', 'Temperature Hazard', 'Other'],
  'Lunch Buffet': ['Overproduction', 'Guest Leftover', 'Temperature Hazard', 'Other'],
  'Default': ['Expired', 'Quality Issues', 'Damaged', 'Operational Error', 'Other']
};

const PRODUCT_LIBRARY: Record<string, string> = {
  'Bacon': '/images/raw_prep/raw_bacon.png',
  'Mussels': '/images/raw_prep/raw_mussels.png',
  'Sausage': '/images/raw_prep/raw_sausage.png',
  'Chicken bones': '/images/raw_prep/chicken_bones.png',
  'Chicken Bones': '/images/raw_prep/chicken_bones.png',
  'Onions': '/images/raw_prep/raw_onions.png',
  'Carrots': '/images/raw_prep/raw_carrots.png',
  'Potato Salad': '/images/raw_prep/potato_salad.png',
  'Potato salad': '/images/raw_prep/potato_salad.png',
  'Pastries': '/images/raw_prep/raw_pastries.png',
  'Assorted pastries': '/images/raw_prep/raw_pastries.png',
  'Beef Scraps': '/images/raw_prep/beef_scraps.png',
  'Beef scraps': '/images/raw_prep/beef_scraps.png',
  'Pork Fat': '/images/raw_prep/pork_fat.png',
  'Pork fat': '/images/raw_prep/pork_fat.png',
  'Whole Fish': '/images/raw_prep/whole_fish.png',
  'Whole fish': '/images/raw_prep/whole_fish.png',
  'Beef Trim': '/images/raw_prep/beef_trim.png',
  'Tomatoes': '/images/raw_prep/tomatoes.png',
  'Beans': '/images/raw_prep/beans.png',
  'Tomato Paste': '/images/raw_prep/large_can_10.png',
  'Olives': '/images/raw_prep/large_can_10.png',
  'Food Scraps': '/images/raw_prep/food_scraps.png',
  'Plate Scraps': '/images/raw_prep/food_scraps.png',
  'Starch Side': '/images/raw_prep/food_scraps.png',
  'Protein Remnants': '/images/raw_prep/food_scraps.png',
  'Veg Garnish': '/images/raw_prep/food_scraps.png',
  'Milk': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=600'
};

const StaffPortal: React.FC<StaffPortalProps> = ({ user, onLogout }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [unit, setUnit] = useState<'kg' | 'lbs' | 'L'>('kg');
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [showNudge, setShowNudge] = useState(false);
  const [showAlert, setShowAlert] = useState<{ msg: string, color: string } | null>(null);

  // Lists State - Load from LocalStorage for shared session data
  const [wasteEntries, setWasteEntries] = useState<WasteEntry[]>(() => {
    const saved = localStorage.getItem('ecometricus_waste_entries');
    let entries = saved ? JSON.parse(saved) : [];
    // SECURITY FILTER: Basic/Chef roles only see their own outlet's data
    if (user.role === 'basic' || user.role === 'chef') {
      entries = entries.filter((e: WasteEntry) => e.outletCode === user.outletCode);
    }
    return entries;
  });
  const [resourceEntries, setResourceEntries] = useState<ResourceEntry[]>(() => {
    const saved = localStorage.getItem('ecometricus_resource_entries');
    // Resource entries might not have outletCode yet, but we should filter if possible.
    // For now, only waste entries have explicit outletCode in the interface defined above.
    // If resource entries shared logic, we'd filter here too.
    return saved ? JSON.parse(saved) : [];
  });

  // Gamification State
  const [userPoints, setUserPoints] = useState<number>(() => {
    return parseInt(localStorage.getItem('ecometricus_user_points') || '1250');
  });
  const [userStreak, setUserStreak] = useState<number>(() => {
    return parseInt(localStorage.getItem('ecometricus_user_streak') || '5');
  });
  const [lastActive, setLastActive] = useState<string>(() => {
    return localStorage.getItem('ecometricus_last_active') || new Date().toDateString();
  });

  // Persist Gamification State & Listen for External Updates
  useEffect(() => {
    localStorage.setItem('ecometricus_user_points', userPoints.toString());
    localStorage.setItem('ecometricus_user_streak', userStreak.toString());
    localStorage.setItem('ecometricus_last_active', lastActive);
  }, [userPoints, userStreak, lastActive]);

  useEffect(() => {
    const handleExternalUpdate = () => {
      setUserPoints(parseInt(localStorage.getItem('ecometricus_user_points') || '1250'));
    };
    window.addEventListener('gamification_update', handleExternalUpdate);
    return () => window.removeEventListener('gamification_update', handleExternalUpdate);
  }, []);

  const handleReward = (type: 'INPUT_ACCURATE' | 'INPUT_ONTIME' | 'ENERGY_MEASURE' | 'STREAK_BONUS' | 'MILA_CONTRIBUTION') => {
    let pointsToAdd = 0;
    switch (type) {
      case 'INPUT_ACCURATE': pointsToAdd = 10; break;
      case 'INPUT_ONTIME': pointsToAdd = 10; break;
      case 'ENERGY_MEASURE': pointsToAdd = 10; break;
      case 'STREAK_BONUS': pointsToAdd = 50; break;
      case 'MILA_CONTRIBUTION': pointsToAdd = 5; break;
    }
    setUserPoints(prev => prev + pointsToAdd);

    // Simple visual feedback (console for now, UI updates automatically)
    console.log(`🏆 Reward Unlocked: ${type} (+${pointsToAdd} pts)`);
  };

  const checkStreak = () => {
    const today = new Date().toDateString();
    if (lastActive !== today) {
      // Check if it's consecutive (yesterday)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastActive === yesterday.toDateString()) {
        const newStreak = userStreak + 1;
        setUserStreak(newStreak);
        if (newStreak % 5 === 0) handleReward('STREAK_BONUS');
      } else {
        setUserStreak(1); // Reset if chain broken
      }
      setLastActive(today);
    }
  };

  // Current Form State
  const [form, setForm] = useState({
    category: '',
    subCategory: '',
    product: '',
    justification: '',
    customJustification: '',
    amount: '',
    imageUrl: '',
    water: '',
    energy: ''
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);

  const BENCHMARKS = { waste: 100, water: 5000, energy: 200 };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync with LocalStorage to allow Supervisor to see entries
  useEffect(() => {
    localStorage.setItem('ecometricus_waste_entries', JSON.stringify(wasteEntries));
  }, [wasteEntries]);

  // Sync resource entries to LocalStorage
  useEffect(() => {
    localStorage.setItem('ecometricus_resource_entries', JSON.stringify(resourceEntries));
  }, [resourceEntries]);

  const totals = useMemo(() => {
    const wasteTotal = wasteEntries.reduce((sum, e) => sum + e.amount, 0);
    const costPerItemUnit = 7.50;
    const costPerDisposalUnit = 1.25;
    const carbonCoeff = 2.85;
    const waterCoeff = 3.40;
    const financialLossItems = wasteTotal * costPerItemUnit;
    const financialLossDisposal = wasteTotal * costPerDisposalUnit;
    const totalFinancialLoss = financialLossItems + financialLossDisposal;

    return {
      waste: wasteTotal,
      water: resourceEntries.filter(e => e.type === 'water').reduce((sum, e) => sum + e.amount, 0),
      energy: resourceEntries.filter(e => e.type === 'energy').reduce((sum, e) => sum + e.amount, 0),
      financialLossItems,
      financialLossDisposal,
      totalFinancialLoss,
      carbonImpact: wasteTotal * carbonCoeff,
      waterFootprint: wasteTotal * waterCoeff,
    };
  }, [wasteEntries, resourceEntries]);

  useEffect(() => {
    if (totals.waste > BENCHMARKS.waste) {
      const deviation = totals.waste - BENCHMARKS.waste;
      const deviationCost = (deviation * 7.50) + (deviation * 1.25);
      setShowAlert({
        msg: `CRITICAL DEVIATION: Benchmark exceeded by ${deviation.toFixed(1)}${unit}. Potential Financial Loss: $${deviationCost.toFixed(2)}. Alerts sent to Supervisor & Admin.`,
        color: '#FF3131'
      });
    } else if (totals.energy > BENCHMARKS.energy) {
      setShowAlert({
        msg: `ENERGY SPIKE: Resource flow at ${(totals.energy / BENCHMARKS.energy * 100).toFixed(0)}% of shift capacity. Efficiency compromised.`,
        color: '#FF914D'
      });
    } else {
      setShowAlert(null);
    }
  }, [totals, unit]);

  const handleTare = () => {
    setForm({
      category: '',
      subCategory: '',
      product: '',
      justification: '',
      customJustification: '',
      amount: '',
      imageUrl: '',
      water: '',
      energy: ''
    });
    setEditingId(null);
    setEditingResourceId(null);
  };

  const handleSaveWaste = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category || !form.product || !form.amount) return;
    const finalJustification = form.justification === 'Other' ? form.customJustification : form.justification;

    // GAMIFICATION: Check Rewards
    handleReward('INPUT_ACCURATE'); // Base reward for entry

    // On-Time Logic (Simple Shift Check: 6am-10pm)
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 22) {
      handleReward('INPUT_ONTIME');
    }

    checkStreak();

    if (editingId) {
      // ... existing edit logic ...
      setWasteEntries(prev => prev.map(entry =>
        entry.id === editingId
          ? {
            ...entry,
            category: form.category,
            subCategory: form.subCategory,
            product: form.product,
            justification: finalJustification,
            amount: parseFloat(form.amount),
            unit: unit
          }
          : entry
      ));
      setEditingId(null);
    } else {
      const newEntry: WasteEntry = {
        id: Math.random().toString(36).substr(2, 9),
        category: form.category,
        subCategory: form.subCategory,
        product: form.product,
        justification: finalJustification,
        amount: parseFloat(form.amount),
        unit: unit,
        timestamp: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        imageUrl: form.imageUrl || PRODUCT_LIBRARY[form.product] || PRODUCT_LIBRARY[form.subCategory],
        staffName: user.fullName,
        outletCode: user.outletCode
      };
      setWasteEntries([newEntry, ...wasteEntries]);
      setShowNudge(true);
      setTimeout(() => setShowNudge(false), 4000);
    }
    handleTare();
  };

  const handleEditWaste = (entry: WasteEntry) => {
    setEditingId(entry.id);
    const standardJustifications = JUSTIFICATION_LOGIC[entry.subCategory] || JUSTIFICATION_LOGIC.Default;
    const isCustom = !standardJustifications.includes(entry.justification);
    setForm({
      ...form,
      category: entry.category,
      subCategory: entry.subCategory,
      product: entry.product,
      justification: isCustom ? 'Other' : entry.justification,
      customJustification: isCustom ? entry.justification : '',
      amount: entry.amount.toString(),
      imageUrl: entry.imageUrl || ''
    });
    setUnit(entry.unit);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveResource = (type: 'water' | 'energy') => {
    const val = type === 'water' ? form.water : form.energy;
    if (!val) return;

    // GAMIFICATION: Energy Measure Reward
    handleReward('ENERGY_MEASURE');
    checkStreak();

    if (editingResourceId) {
      setResourceEntries(prev => prev.map(entry =>
        entry.id === editingResourceId ? { ...entry, amount: parseFloat(val) } : entry
      ));
      setEditingResourceId(null);
    } else {
      const newEntry: ResourceEntry = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        amount: parseFloat(val),
        timestamp: currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setResourceEntries([newEntry, ...resourceEntries]);
    }
    setForm(prev => ({ ...prev, [type]: '' }));
  };

  const handleEditResource = (entry: ResourceEntry) => {
    setEditingResourceId(entry.id);
    setForm(prev => ({
      ...prev,
      water: entry.type === 'water' ? entry.amount.toString() : '',
      energy: entry.type === 'energy' ? entry.amount.toString() : ''
    }));
  };

  const deleteWaste = (id: string) => setWasteEntries(prev => prev.filter(e => e.id !== id));
  const deleteResource = (id: string) => setResourceEntries(prev => prev.filter(e => e.id !== id));

  const Tooltip = ({ id, text }: { id: string, text: string }) => (
    <div className="relative inline-block ml-2 align-middle">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowTooltip(showTooltip === id ? null : id);
        }}
        className="text-gray-500 hover:text-brand-gold transition-colors focus:outline-none"
      >
        <Info size={14} />
      </button>
      {showTooltip === id && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 sm:w-56 p-3 sm:p-4 bg-brand-dark border-2 border-brand-gold/50 rounded-2xl shadow-2xl z-[100] text-[8px] sm:text-[9px] text-gray-300 font-medium leading-relaxed uppercase tracking-wider backdrop-blur-xl transition-none">
          {text}
          <div className="absolute bottom-[-7px] left-1/2 -translate-x-1/2 w-3 h-3 bg-brand-dark border-r-2 border-b-2 border-brand-gold/50 rotate-45"></div>
        </div>
      )}
    </div>
  );

  const currentJustifications = useMemo(() => {
    return JUSTIFICATION_LOGIC[form.subCategory] || JUSTIFICATION_LOGIC.Default;
  }, [form.subCategory]);

  // Gamification UI Component
  const contextPoints = (
    <div className="text-center sm:text-left min-w-[140px]">
      <span className="block text-[8px] sm:text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1 sm:mb-2">MY SCORE</span>
      <div className="flex items-center justify-center sm:justify-start gap-2">
        <span className="text-xl sm:text-2xl lg:text-3xl font-geometric font-black text-brand-gold uppercase tracking-tight">{userPoints}</span>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[8px] font-bold text-gray-500 uppercase">Points</span>
          <span className="text-[8px] font-bold text-brand-eco uppercase">{userStreak} Day Streak 🔥</span>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen bg-brand-dark flex flex-col font-body selection:bg-brand-gold/20 selection:text-brand-gold antialiased overflow-x-hidden"
      onClick={() => setShowTooltip(null)}
    >
      {/* 1. Header Profile - Fluid sizing for aspect ratios */}
      <header className="sticky top-0 z-50 bg-brand-dark/95 backdrop-blur-xl border-b-2 border-brand-gold/50 h-20 sm:h-24 lg:h-28 shrink-0 shadow-lg px-4 sm:px-8">
        <div className="max-w-[1920px] mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
            <Logo size="md" withLabel />
            <div className="hidden xs:block">
              <h1 className="text-sm sm:text-base lg:text-lg font-geometric font-bold text-white uppercase tracking-tight">Ecometricus Hub</h1>
              <p className="text-[7px] sm:text-[8px] font-black text-brand-gold uppercase tracking-[0.4em]">Kitchen Operations — {user.outletCode}</p>
            </div>
          </div>

          <div className="flex flex-col items-end text-right">
            <span className="text-[11px] sm:text-sm lg:text-base font-geometric font-bold text-white uppercase tracking-tight">
              {user.fullName} <span className="hidden sm:inline">|</span> <span className="text-brand-gold block sm:inline">{user.position}</span>
            </span>
            <div className="flex items-center gap-2 sm:gap-4 mt-1">
              <div className="flex items-center gap-1 sm:gap-2 text-gray-500 text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em]">
                <Clock size={12} className="text-brand-gold/60" />
                <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-gold to-transparent shadow-[0_0_15px_#C8A413]"></div>
      </header>

      {/* High-Alert Threshold Window - Fluid Layout */}
      {showAlert && (
        <div
          className="bg-brand-dark border-b-2 border-brand-alert/30 py-3 sm:py-4 px-4 sm:px-6 animate-in slide-in-from-top duration-500 sticky top-20 sm:top-24 lg:top-28 z-40"
          style={{ borderLeft: `6px solid ${showAlert.color}` }}
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              <AlertTriangle size={18} style={{ color: showAlert.color }} className="animate-pulse shrink-0 mt-1 sm:mt-0" />
              <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-white leading-snug sm:leading-tight">{showAlert.msg}</span>
            </div>
            <button className="text-[9px] sm:text-[10px] font-black uppercase text-brand-gold border-b-2 border-brand-gold/20 hover:text-white transition-all self-end sm:self-auto">Review Benchmarks</button>
          </div>
        </div>
      )}

      <main className="flex-grow p-4 sm:p-8 lg:p-14 xl:p-20 space-y-8 sm:space-y-12 lg:space-y-16">
        {/* Daily Input Data Entry Container - Optimized for 9:16, 4:3, 16:9 */}
        <div className="max-w-6xl mx-auto bg-[#0f2420] border-2 border-brand-gold/60 rounded-[30px] sm:rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.7)] relative overflow-hidden">
          <div className="p-6 sm:p-10 lg:p-12 xl:p-16">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-12 gap-4">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-geometric font-black text-white uppercase tracking-tight leading-none">
                Daily Input Data
              </h2>
              <button onClick={handleTare} className="flex items-center gap-2 px-4 sm:px-6 py-2.5 bg-brand-eco/10 border-2 border-brand-eco/50 rounded-full text-[9px] sm:text-[10px] font-black text-brand-gold hover:bg-brand-eco hover:text-brand-dark transition-all uppercase tracking-widest shadow-xl">
                <RotateCcw size={14} /> <span className="hidden xs:inline">Tare / Reset</span>
              </button>
            </div>

            <form onSubmit={handleSaveWaste} className="space-y-10 sm:space-y-14 lg:space-y-16">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 xl:gap-24">
                {/* Inputs Column */}
                <div className="space-y-6 sm:space-y-8 lg:space-y-10">
                  <div className="space-y-3 sm:space-y-4">
                    <label className="text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] ml-1">Step 1: Food Waste Category</label>
                    <div className="relative">
                      <select
                        required
                        value={form.category}
                        onChange={e => setForm({ ...form, category: e.target.value, subCategory: '', product: '', justification: '' })}
                        className="w-full bg-brand-dark border-2 border-white/20 rounded-xl sm:rounded-2xl py-4 sm:py-5 px-5 sm:px-6 text-xs sm:text-sm text-white focus:border-brand-gold outline-none appearance-none cursor-pointer transition-all"
                      >
                        <option value="">Select Category</option>
                        {Object.keys(INVENTORY_LOGIC).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 text-brand-gold pointer-events-none" size={18} />
                    </div>
                  </div>

                  <div className={`space-y-3 sm:space-y-4 transition-all duration-300 ${!form.category ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    <label className="text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] ml-1">Step 2: Sub-Category Selection</label>
                    <div className="relative">
                      <select
                        required
                        value={form.subCategory}
                        onChange={e => setForm({ ...form, subCategory: e.target.value, product: '', justification: '' })}
                        className="w-full bg-brand-dark border-2 border-white/20 rounded-xl sm:rounded-2xl py-4 sm:py-5 px-5 sm:px-6 text-xs sm:text-sm text-white focus:border-brand-gold outline-none appearance-none cursor-pointer transition-all"
                      >
                        <option value="">Select Sub-Category</option>
                        {form.category && Object.keys(INVENTORY_LOGIC[form.category]).map(sc => <option key={sc} value={sc}>{sc}</option>)}
                      </select>
                      <ChevronDown className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 text-brand-gold pointer-events-none" size={18} />
                    </div>
                  </div>

                  <div className={`space-y-3 sm:space-y-4 transition-all duration-300 ${!form.subCategory ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    <div className="flex items-center">
                      <label className="text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] ml-1">Step 3: Product Description</label>
                      <Tooltip id="prod" text="Select from inventory list or enter manually for unique items." />
                    </div>
                    <div className="relative group">
                      <input
                        list="product-suggestions"
                        required
                        placeholder="Select or enter product..."
                        value={form.product}
                        onChange={e => setForm({ ...form, product: e.target.value })}
                        className="w-full bg-brand-dark border-2 border-white/20 rounded-xl sm:rounded-2xl py-4 sm:py-5 px-5 sm:px-6 text-xs sm:text-sm text-white focus:border-brand-gold outline-none transition-all placeholder:text-gray-700"
                      />
                      <datalist id="product-suggestions">
                        {form.category && form.subCategory && INVENTORY_LOGIC[form.category][form.subCategory].map(p => <option key={p} value={p} />)}
                      </datalist>
                      <Search className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 text-gray-700 pointer-events-none" size={18} />
                    </div>
                  </div>

                  <div className={`space-y-3 sm:space-y-4 transition-all duration-300 ${!form.product ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    <div className="flex items-center">
                      <label className="text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] ml-1">Step 4: Justification / Comments</label>
                      <Tooltip id="just" text="Explain the reason for waste (e.g., spoiled, storage issues, overproduction)." />
                    </div>
                    <div className="space-y-3">
                      <div className="relative">
                        <select
                          required
                          value={form.justification}
                          onChange={e => setForm({ ...form, justification: e.target.value })}
                          className="w-full bg-brand-dark border-2 border-white/20 rounded-xl sm:rounded-2xl py-4 sm:py-5 px-5 sm:px-6 text-xs sm:text-sm text-white focus:border-brand-gold outline-none appearance-none cursor-pointer transition-all"
                        >
                          <option value="">Select Primary Reason</option>
                          {currentJustifications.map(reason => <option key={reason} value={reason}>{reason}</option>)}
                        </select>
                        <ChevronDown className="absolute right-5 sm:right-6 top-1/2 -translate-y-1/2 text-brand-gold pointer-events-none" size={18} />
                      </div>
                      {form.justification === 'Other' && (
                        <textarea
                          required
                          placeholder="Please describe the reason..."
                          value={form.customJustification}
                          onChange={e => setForm({ ...form, customJustification: e.target.value })}
                          className="w-full bg-brand-dark border-2 border-white/20 rounded-xl sm:rounded-2xl py-4 px-5 sm:px-6 text-xs sm:text-sm text-white focus:border-brand-gold outline-none transition-all h-24 lg:h-32 resize-none"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Verification & Weights Column */}
                <div className="space-y-8 sm:space-y-10 lg:space-y-12">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <label className="text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] ml-1">Visual Verification / Library</label>
                      <Tooltip id="mila" text="Mila AI automatically matches captured photos with selected product description." />
                    </div>
                    <div className="aspect-video bg-brand-dark/40 border-2 border-dashed border-white/10 rounded-[24px] sm:rounded-[30px] lg:rounded-[40px] flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-brand-gold/50 transition-all shadow-inner">
                      {PRODUCT_LIBRARY[form.product] || PRODUCT_LIBRARY[form.subCategory] ? (
                        <div className="w-full h-full relative">
                          <img src={PRODUCT_LIBRARY[form.product] || PRODUCT_LIBRARY[form.subCategory]} className="w-full h-full object-cover" alt="Verification" />
                          <div className="absolute inset-0 bg-brand-dark/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="bg-brand-eco text-brand-dark px-6 py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-2xl">MILA AI MATCH: 98%</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center group-hover:scale-105 transition-transform duration-500">
                          <div className="p-4 sm:p-6 bg-brand-dark/60 rounded-full inline-block border border-white/10 mb-3 sm:mb-4">
                            <Camera className="text-brand-gold" size={32} />
                          </div>
                          <span className="block text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest">TAP FOR SNAPSHOT</span>
                          <span className="block text-[7px] sm:text-[8px] font-bold text-gray-600 uppercase tracking-widest mt-2">ENHANCED IMAGE MATCHING ACTIVE</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] ml-1">Step 5: Weight / Volume Entry</label>
                    <div className="relative">
                      <input
                        required
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        value={form.amount}
                        onChange={e => setForm({ ...form, amount: e.target.value })}
                        className="w-full bg-brand-dark border-2 border-white/20 rounded-xl sm:rounded-2xl py-6 sm:py-8 px-6 sm:px-10 text-3xl sm:text-4xl lg:text-5xl font-geometric font-bold text-white focus:border-brand-gold outline-none transition-all placeholder:text-white/5"
                      />
                      <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 flex bg-brand-dark/90 p-1 rounded-xl sm:rounded-2xl border-2 border-white/10 scale-90 sm:scale-100">
                        {['kg', 'lbs', 'L'].map(u => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => setUnit(u as any)}
                            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase transition-all ${unit === u ? 'bg-brand-eco text-brand-dark shadow-lg' : 'text-gray-500 hover:text-white'}`}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submission Area - Fluid stacking */}
              <div className="pt-8 sm:pt-12 border-t-2 border-white/10 flex flex-col sm:flex-row gap-4 sm:gap-6">
                <button
                  type="submit"
                  className="flex-[2] py-5 sm:py-6 lg:py-8 bg-brand-eco text-brand-dark rounded-full font-black uppercase tracking-[0.3em] text-[11px] sm:text-xs lg:text-sm hover:brightness-110 active:scale-95 transition-all shadow-[0_15px_40px_rgba(119,177,57,0.4)] flex items-center justify-center gap-4"
                >
                  <Save size={24} /> {editingId ? "Update Log Entry" : "Commit Log Entry"}
                </button>
                <button
                  type="button"
                  className="flex-1 py-5 sm:py-6 lg:py-8 bg-brand-dark border-2 border-brand-eco text-brand-eco rounded-full font-black uppercase tracking-widest text-[10px] sm:text-[11px] hover:bg-brand-eco hover:text-brand-dark transition-all flex items-center justify-center gap-3"
                >
                  <Settings2 size={20} /> <span className="hidden sm:inline">Scale Config</span>
                </button>
              </div>

              {/* Environmental Nudge - Responsive spacing */}
              {showNudge && (
                <div className="p-6 sm:p-8 bg-brand-eco/10 border-2 border-brand-eco/40 rounded-[24px] sm:rounded-[30px] animate-in zoom-in duration-300 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-8 shadow-2xl text-center sm:text-left">
                  <div className="p-3 sm:p-4 bg-brand-eco/20 rounded-xl sm:rounded-2xl shadow-inner border border-brand-eco/30 shrink-0">
                    <Leaf className="text-brand-eco" size={32} />
                  </div>
                  <div>
                    <h4 className="text-[9px] sm:text-[11px] font-black text-brand-eco uppercase tracking-[0.2em] mb-2">Sustainable Operational Nudge</h4>
                    <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">Mila Suggestion: Consider shifting to <span className="text-brand-eco font-bold">biodegradable products</span> for waste containers to align with regional ESG benchmarks.</p>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Resource Tracking - Stacked for mobile, grid for tablet/desktop */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
          {[
            { type: 'water', label: 'Water Usage Tracking', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', unit: 'Liters (L)' },
            { type: 'energy', label: 'Energy Log (kWh)', icon: Zap, color: 'text-brand-energy', bg: 'bg-brand-energy/10', border: 'border-brand-energy/30', unit: 'Kilowatts (kWh)' }
          ].map(r => (
            <div key={r.type} className="bg-[#0f2420] border-2 border-brand-gold/40 p-6 sm:p-8 lg:p-10 rounded-[30px] sm:rounded-[40px] shadow-2xl space-y-6 sm:space-y-8 group hover:border-brand-gold/70 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`p-3 ${r.bg} rounded-xl sm:rounded-2xl border-2 ${r.border}`}>
                    <r.icon className={r.color} size={24} />
                  </div>
                  <h3 className="text-[10px] sm:text-[12px] font-black text-brand-gold uppercase tracking-[0.2em] sm:tracking-[0.3em]">{r.label}</h3>
                </div>
                <Tooltip id={r.type} text={`Log current ${r.type} meter readings.`} />
              </div>
              <div className="flex gap-3 sm:gap-4">
                <input
                  type="number"
                  placeholder={r.unit}
                  value={r.type === 'water' ? form.water : form.energy}
                  onChange={e => setForm({ ...form, [r.type]: e.target.value })}
                  className="flex-grow bg-brand-dark border-2 border-white/20 rounded-xl sm:rounded-2xl px-5 sm:px-6 py-4 sm:py-5 text-base sm:text-lg lg:text-xl font-bold outline-none focus:border-brand-gold text-white"
                />
                <button onClick={() => handleSaveResource(r.type as any)} className="bg-brand-eco p-4 sm:p-5 rounded-xl sm:rounded-2xl text-brand-dark hover:brightness-110 active:scale-90 transition-all shadow-xl">
                  <Plus size={24} strokeWidth={4} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Verification Logs - Enhanced for mobile scrolling */}
        <div className="max-w-6xl mx-auto space-y-12 sm:space-y-16 lg:space-y-20">
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2 sm:px-4">
              <h3 className="text-[11px] sm:text-[14px] font-black text-white uppercase tracking-[0.4em]">Verification: Food Waste Log</h3>
              <div className="flex items-center gap-2 text-[8px] sm:text-[10px] text-gray-500 uppercase tracking-widest">
                <ClipboardList size={14} className="hidden xs:block" /> Daily Cumulative
              </div>
            </div>
            <div className="bg-[#0f2420] border-2 border-white/20 rounded-[24px] sm:rounded-[40px] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-brand-dark/80 border-b-2 border-white/10">
                      <th className="px-6 sm:px-8 py-5 sm:py-6 text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-[0.2em]">Logged Item</th>
                      <th className="px-6 sm:px-8 py-5 sm:py-6 text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-[0.2em]">Verification</th>
                      <th className="px-6 sm:px-8 py-5 sm:py-6 text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-[0.2em]">Metrics</th>
                      <th className="px-6 sm:px-8 py-5 sm:py-6 text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-[0.2em]">Timestamp</th>
                      <th className="px-6 sm:px-8 py-5 sm:py-6 text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-white/5">
                    {wasteEntries.length === 0 ? (
                      <tr><td colSpan={5} className="p-12 sm:p-20 text-center text-gray-700 text-[10px] sm:text-[12px] font-black uppercase tracking-[0.4em] italic bg-brand-dark/20">Operational queue empty.</td></tr>
                    ) : wasteEntries.map(e => (
                      <tr key={e.id} className="group hover:bg-white/[0.03] transition-colors">
                        <td className="px-6 sm:px-8 py-5 sm:py-6">
                          <span className="block text-sm font-black text-white uppercase tracking-tight">{e.product}</span>
                          <span className="block text-[8px] sm:text-[9px] font-bold text-gray-500 uppercase tracking-widest">{e.category} / {e.subCategory}</span>
                          <span className="block text-[7px] sm:text-[8px] font-black text-brand-gold uppercase tracking-[0.2em] mt-1 italic">Reason: {e.justification}</span>
                        </td>
                        <td className="px-6 sm:px-8 py-5 sm:py-6">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-brand-dark border-2 border-white/10 overflow-hidden shadow-xl">
                            {e.imageUrl ? <img src={e.imageUrl} className="w-full h-full object-cover" alt="Log" /> : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={16} className="text-gray-800" /></div>}
                          </div>
                        </td>
                        <td className="px-6 sm:px-8 py-5 sm:py-6">
                          <div className="text-sm font-black text-brand-gold">{e.amount.toFixed(2)} <span className="text-[9px] uppercase">{e.unit}</span></div>
                        </td>
                        <td className="px-6 sm:px-8 py-5 sm:py-6">
                          <div className="flex items-center gap-2 text-[9px] font-bold text-gray-500 uppercase">
                            <Clock size={12} className="text-brand-gold/40" /> {e.timestamp}
                          </div>
                        </td>
                        <td className="px-6 sm:px-8 py-5 sm:py-6 text-right">
                          <div className="flex justify-end gap-2 sm:gap-3">
                            <button onClick={() => handleEditWaste(e)} className="p-2 sm:p-2.5 text-gray-400 hover:text-brand-gold bg-brand-dark rounded-lg sm:rounded-xl border-2 border-white/10 transition-all shadow-md"><Edit2 size={16} /></button>
                            <button onClick={() => deleteWaste(e.id)} className="p-2 sm:p-2.5 text-gray-400 hover:text-brand-alert bg-brand-dark rounded-lg sm:rounded-xl border-2 border-white/10 transition-all shadow-md"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[11px] sm:text-[14px] font-black text-white uppercase tracking-[0.4em] px-2 sm:px-4">Verification: Resource Flows</h3>
            <div className="bg-[#0f2420] border-2 border-white/20 rounded-[24px] sm:rounded-[40px] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto scrollbar-hide">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-brand-dark/80 border-b-2 border-white/10">
                      <th className="px-6 sm:px-8 py-5 sm:py-6 text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-[0.2em]">Flow Type</th>
                      <th className="px-6 sm:px-8 py-5 sm:py-6 text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-[0.2em]">Cumulative Consumption</th>
                      <th className="px-6 sm:px-8 py-5 sm:py-6 text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-[0.2em]">Log Time</th>
                      <th className="px-6 sm:px-8 py-5 sm:py-6 text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-white/5">
                    {resourceEntries.length === 0 ? (
                      <tr><td colSpan={4} className="p-12 sm:p-20 text-center text-gray-700 text-[10px] sm:text-[12px] font-black uppercase tracking-[0.4em] italic bg-brand-dark/20">Zero resource flows captured.</td></tr>
                    ) : resourceEntries.map(e => (
                      <tr key={e.id} className="group hover:bg-white/[0.03] transition-colors">
                        <td className="px-6 sm:px-8 py-5 sm:py-6 flex items-center gap-3 sm:gap-4">
                          <div className={`p-2 rounded-lg border-2 ${e.type === 'water' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-brand-energy/10 border-brand-energy/20'}`}>
                            {e.type === 'water' ? <Droplets className="text-blue-400" size={16} /> : <Zap className="text-brand-energy" size={16} />}
                          </div>
                          <span className="text-sm font-black text-white uppercase tracking-tight">{e.type} Reading</span>
                        </td>
                        <td className="px-6 sm:px-8 py-5 sm:py-6 text-sm font-black text-brand-gold">{e.amount}{e.type === 'water' ? ' L' : ' kWh'}</td>
                        <td className="px-6 sm:px-8 py-5 sm:py-6 text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-widest">{e.timestamp}</td>
                        <td className="px-6 sm:px-8 py-5 sm:py-6 text-right">
                          <div className="flex justify-end gap-2 sm:gap-3">
                            <button onClick={() => handleEditResource(e)} className="p-2 sm:p-2.5 text-gray-400 hover:text-brand-gold bg-brand-dark rounded-lg sm:rounded-xl border-2 border-white/10 transition-all shadow-md"><Edit2 size={16} /></button>
                            <button onClick={() => deleteResource(e.id)} className="p-2 sm:p-2.5 text-gray-400 hover:text-brand-alert bg-brand-dark rounded-lg sm:rounded-xl border-2 border-white/10 transition-all shadow-md"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 5. Mila AI Actionable Intelligence Container - Fluid Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-10 pb-16 sm:pb-24 lg:pb-32">
        <div className="bg-[#0f2420] border-2 border-brand-gold/60 rounded-[30px] sm:rounded-[40px] p-6 sm:p-10 lg:p-14 relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <MessageSquare size={160} className="text-brand-gold" />
          </div>
          <div className="flex items-center gap-4 sm:gap-6 mb-10 sm:mb-14">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand-gold rounded-xl sm:rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(200,164,19,0.4)] border-2 border-white/20 shrink-0">
              <Cpu className="text-brand-dark" size={32} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-geometric font-black text-white uppercase tracking-tight">Mila Actionable Intelligence</h3>
              <p className="text-[7px] sm:text-[9px] font-black text-brand-gold uppercase tracking-[0.4em] mt-1 sm:mt-2">Sustainability Performance Proportional Scaling</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 lg:gap-10 relative z-10">
            <div className="space-y-4 p-6 sm:p-8 bg-brand-dark/40 rounded-[24px] sm:rounded-[32px] border-2 border-white/10 shadow-inner group/card hover:border-brand-gold/40 transition-all">
              <span className="text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-widest flex items-center gap-3">
                <Cloud size={16} /> Carbon Lifecycle
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white transition-all group-hover/card:text-brand-gold">
                {totals.carbonImpact.toFixed(1)} <span className="text-[10px] sm:text-[11px] font-light text-gray-500 uppercase">kg CO2e</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <TrendingDown className="text-brand-alert" size={14} />
                <p className="text-[8px] sm:text-[10px] text-gray-500 uppercase font-bold tracking-wider">Operational deviation impact.</p>
              </div>
            </div>

            <div className="space-y-4 p-6 sm:p-8 bg-brand-dark/40 rounded-[24px] sm:rounded-[32px] border-2 border-white/10 shadow-inner group/card hover:border-blue-500/40 transition-all">
              <span className="text-[9px] sm:text-[10px] font-black text-brand-gold uppercase tracking-widest flex items-center gap-3">
                <Droplets size={16} /> Water Resource
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white transition-all group-hover/card:text-blue-400">
                {totals.waterFootprint.toFixed(1)} <span className="text-[10px] sm:text-[11px] font-light text-gray-500 uppercase">m³ Loss</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <TrendingDown className="text-brand-alert" size={14} />
                <p className="text-[8px] sm:text-[10px] text-gray-500 uppercase font-bold tracking-wider">Averted loss footprint.</p>
              </div>
            </div>

            <div className={`md:col-span-2 lg:col-span-1 space-y-4 p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] border-2 shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all ${totals.waste > BENCHMARKS.waste ? 'bg-brand-alert/10 border-brand-alert/40' : 'bg-brand-eco/10 border-brand-eco/40'}`}>
              <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${totals.waste > BENCHMARKS.waste ? 'text-brand-alert' : 'text-brand-eco'}`}>
                <DollarSign size={16} /> Financial Impact
              </span>
              <div className={`text-2xl sm:text-3xl lg:text-4xl font-black ${totals.waste > BENCHMARKS.waste ? 'text-brand-alert' : 'text-brand-eco'}`}>
                ${totals.totalFinancialLoss.toFixed(2)}
              </div>
              <div className="pt-3 sm:pt-4 border-t border-white/10 mt-2 sm:mt-4 space-y-1 sm:space-y-2">
                <div className="flex justify-between text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-gray-500">
                  <span>Item Loss:</span>
                  <span className="text-white">${totals.financialLossItems.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-gray-500">
                  <span>Logistics:</span>
                  <span className="text-white">${totals.financialLossDisposal.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-[8px] sm:text-[9px] text-gray-400 uppercase font-medium leading-relaxed tracking-wider mt-3 sm:mt-4">
                {totals.waste > BENCHMARKS.waste
                  ? "Escalation triggered supervisor report."
                  : "Loss within pre-set parameters."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Footer - Fluid stacking for 9:16 vs 16:9 */}
      <footer className="bg-brand-dark/95 border-t-2 border-brand-gold/50 py-8 sm:py-10 lg:py-14 px-6 sm:px-12 shrink-0">
        <div className="max-w-[1920px] mx-auto flex flex-col xl:flex-row items-center justify-between gap-10 lg:gap-14">
          <div className="flex flex-wrap justify-center items-center gap-10 sm:gap-16">
            <div className="text-center sm:text-left min-w-[140px]">
              <span className="block text-[8px] sm:text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1 sm:mb-2">CUMULATIVE WASTE</span>
              <span className={`text-xs sm:text-sm lg:text-base font-geometric font-bold uppercase tracking-tight ${totals.waste > BENCHMARKS.waste ? 'text-brand-alert' : 'text-white'}`}>
                {totals.waste.toFixed(1)} / {BENCHMARKS.waste} {unit}
              </span>
            </div>
            <div className="h-10 sm:h-12 w-[1.5px] bg-white/10 hidden sm:block" />
            {contextPoints}
            <div className="h-10 sm:h-12 w-[1.5px] bg-white/10 hidden sm:block" />
            <div className="text-center sm:text-left min-w-[140px]">
              <span className="block text-[8px] sm:text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1 sm:mb-2">DATA STATUS</span>
              <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-3">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-brand-eco animate-pulse shadow-[0_0_10px_#77B139]" />
                <span className="text-[9px] sm:text-[11px] font-bold text-brand-eco uppercase tracking-widest">LIVE SYNC ACTIVE</span>
              </div>
            </div>
            <div className="h-10 sm:h-12 w-[1.5px] bg-white/10 hidden sm:block" />
            <div className="text-center sm:text-left min-w-[140px]">
              <span className="block text-[8px] sm:text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1 sm:mb-2">OUTLET IDENTIFIER</span>
              <span className="text-xs sm:text-sm lg:text-base font-geometric font-bold text-brand-gold uppercase tracking-tight">{user.outletCode}</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px] font-black text-gray-500 uppercase tracking-[0.3em] hover:text-brand-alert transition-all group px-8 sm:px-12 py-3 sm:py-4 rounded-full border-2 border-white/10 hover:border-brand-alert/40 shadow-xl"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            TERMINATE SESSION
          </button>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{
        __html: `
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(200, 164, 19, 0.2); border-radius: 10px; }
        
        .animate-in { animation: animate-in 0.5s ease-out forwards; }
        @keyframes animate-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* High DPI rendering for borders and icons */
        @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
          .border-2 { border-width: 2px; }
          .shadow-2xl { box-shadow: 0 10px 40px rgba(0,0,0,0.6); }
        }

        /* Aspect ratio optimizations */
        @media (max-aspect-ratio: 1/1) { /* Portrait 9:16 approx */
           main { padding-left: 1rem; padding-right: 1rem; }
           .font-geometric { letter-spacing: -0.02em; }
        }
      `}} />

      {/* 6. Mila AI Widget (Conditional) */}
      {(user.role === 'basic' || user.role === 'chef') ? (
        <MilaFeedbackWidget user={user} />
      ) : (
        <div className="fixed bottom-6 right-6 z-50">
          <MilaWidget context={{ ...totals, benchmarks: BENCHMARKS, user }} />
        </div>
      )}
    </div>
  );
};

export default StaffPortal;
