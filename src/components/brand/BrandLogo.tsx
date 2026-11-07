import React from 'react';

interface BrandLogoProps {
  compact?: boolean;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
}

export function BrandLogo({ compact = false, className = '', theme = 'auto' }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Precision Agricultural Calendar Emblem */}
      <div className="relative flex-shrink-0 w-9 h-9 rounded-lg bg-[#173F35] border border-[#2F7D4A]/40 shadow-sm flex items-center justify-center overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#77A96B_1px,transparent_1px)] [background-size:6px_6px]" />
        
        {/* Geometric Calendar + Leaf Growth SVG Mark */}
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 text-white z-10"
        >
          {/* Calendar base frame */}
          <rect
            x="4"
            y="6"
            width="24"
            height="22"
            rx="3"
            stroke="currentColor"
            strokeWidth="2"
            className="text-white/90"
          />
          {/* Calendar top binder lugs */}
          <line x1="9" y1="3" x2="9" y2="7" stroke="#77A96B" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="23" y1="3" x2="23" y2="7" stroke="#77A96B" strokeWidth="2.2" strokeLinecap="round" />
          {/* Header divider */}
          <line x1="4" y1="12" x2="28" y2="12" stroke="currentColor" strokeWidth="1.5" className="text-white/40" />
          
          {/* Sustainable Growth Leaf Sprout in center */}
          <path
            d="M16 23V15M16 15C16 13 18.5 13 20 15C20.8 16 19.5 18 16 18M16 15C16 13 13.5 13 12 15C11.2 16 12.5 18 16 18"
            stroke="#77A96B"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Small precision crosshair / date pip */}
          <circle cx="21" cy="9" r="1" fill="#77A96B" />
        </svg>
      </div>

      {!compact && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-bold text-sm tracking-tight text-[#173F35] dark:text-[#EEF4F0] font-sans">
              FARMING
            </span>
            <span className="font-semibold text-sm tracking-tight text-[#2F7D4A] dark:text-[#77A96B] font-sans">
              CALENDAR
            </span>
          </div>
          <span className="text-[9.5px] uppercase tracking-wider font-semibold text-[#66736B] dark:text-[#9EB0A5] truncate mt-0.5 font-mono">
            AGRIBUSINESS INTELLIGENCE
          </span>
        </div>
      )}
    </div>
  );
}
