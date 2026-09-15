import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectProps {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  checkedValues?: string[];
  translateOption?: (v: string) => string;
  compact?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, options, onChange, disabled, placeholder, emptyMessage, checkedValues, translateOption, compact }) => {
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

  const display = (v: string) => (translateOption ? translateOption(v) : v);

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`w-full flex items-center justify-between bg-[#152E2A] border rounded-xl ${compact ? 'py-1.5 px-3 text-xs' : 'py-3 px-4 text-sm'} text-left transition-colors
          ${disabled ? 'opacity-40 cursor-not-allowed border-brand-gold/15' : 'border-brand-gold/25 hover:border-brand-gold/150 cursor-pointer'}
          ${open ? 'border-brand-gold' : ''}`}
      >
        <span className={value ? 'text-white' : 'text-white/40'}>{value ? display(value) : (placeholder || 'Select…')}</span>
        <ChevronDown size={14} className={`text-brand-gold/60 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-[9999] mt-1 w-full rounded-xl border border-brand-gold/25 bg-[#152E2A] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
          <ul className="max-h-56 overflow-y-auto scrollbar-gold py-1">
            {options.length === 0 ? (
              <li className="px-4 py-3 text-xs text-white/30 italic text-center select-none">
                {emptyMessage ?? 'No options available'}
              </li>
            ) : options.map(opt => {
              const isSelected = opt === value || (checkedValues && checkedValues.includes(opt));
              return (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2
                    ${isSelected
                      ? 'text-brand-gold bg-brand-gold/10 font-semibold'
                      : 'text-white/70 hover:text-white hover:bg-brand-dark/60'}`}
                >
                  {isSelected && <Check size={12} className="text-brand-gold shrink-0" />}
                  {!isSelected && <span className="w-3 shrink-0" />}
                  {display(opt)}
                </button>
              </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
