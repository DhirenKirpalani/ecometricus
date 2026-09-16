import React, { useState, useEffect, useRef } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';

// ── Outlet Filter Dropdown — matches Ecometricus gamification page design ──
// No "All Outlets" option — single outlet selection only
const OutletFilterDropdown: React.FC<{
    value: string;
    options: { id?: string; name: string; code: string }[];
    onChange: (v: string) => void;
    valueKey?: 'id' | 'code';
}> = ({ value, options, onChange, valueKey = 'id' }) => {
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

    const selectedName = options.find(o => (valueKey === 'id' ? o.id === value : o.code === value))?.name || options[0]?.name || '';

    return (
        <div ref={ref} className="relative min-w-[140px]">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-2 bg-brand-dark/60 border border-brand-gold/20 rounded-xl pl-9 pr-8 py-2.5 text-[11px] font-black uppercase tracking-widest text-white/70 hover:border-brand-gold/40 transition-all cursor-pointer outline-none"
            >
                <Building2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-gold/50 pointer-events-none" />
                <span className="truncate">{selectedName}</span>
                <ChevronDown size={12} className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute z-[9999] mt-1 w-full rounded-xl border border-brand-gold/25 bg-[#152E2A] shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden">
                    <ul className="max-h-56 overflow-y-auto scrollbar-gold py-1">
                        {options.map(o => {
                            const selected = valueKey === 'id' ? o.id === value : o.code === value;
                            return (
                                <li key={o.code}>
                                    <button
                                        type="button"
                                        onClick={() => { onChange(valueKey === 'id' ? (o.id || '') : o.code); setOpen(false); }}
                                        className={`w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-2 ${selected ? 'text-brand-gold bg-brand-gold/10' : 'text-white/70 hover:text-white hover:bg-brand-dark/60'}`}
                                    >
                                        {selected && <Check size={12} className="text-brand-gold shrink-0" />}
                                        {!selected && <span className="w-3 shrink-0" />}
                                        {o.name}
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

export default OutletFilterDropdown;
