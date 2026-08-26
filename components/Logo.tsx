
import React from 'react';

interface LogoProps {
    size?: 'sm' | 'md' | 'nav' | 'lg' | 'xl';
    withLabel?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', withLabel = false }) => {
    // nav: between md and lg — 68 px icon, same text as md
    const dims =
        size === 'sm'  ? 'w-9 h-9 sm:w-10 sm:h-10' :
        size === 'md'  ? 'w-11 h-11 sm:w-14 sm:h-14' :
        size === 'nav' ? 'w-11 h-11 sm:w-[68px] sm:h-[68px]' :
        size === 'lg'  ? 'w-16 h-16 sm:w-20 sm:h-20' :
                         'w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40';

    const textSize =
        size === 'sm'  ? 'text-xs sm:text-sm' :
        size === 'md'  ? 'text-sm sm:text-lg md:text-xl pt-0.5' :
        size === 'nav' ? 'text-sm sm:text-lg md:text-xl pt-0.5' :
        size === 'lg'  ? 'text-xl sm:text-2xl md:text-3xl pt-0.5' :
                         'text-3xl sm:text-4xl md:text-5xl pt-1';

    return (
        <div className="flex flex-row items-center gap-3">
            <div className={`${dims} relative flex items-center justify-center`}>
                <img src="/logo.png" alt="Ecometricus Logo" className="w-full h-full object-contain" />
            </div>
            {withLabel && (
                <span className={`font-geometric font-black tracking-widest text-brand-gold uppercase leading-none ${textSize}`}>
                    ECOMETRICUS
                </span>
            )}
        </div>
    );
};

export default Logo;
