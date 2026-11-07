import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Sprout, Ship, CheckCircle, ArrowUpRight } from 'lucide-react';

interface BrandPanelProps {
  className?: string;
  compact?: boolean;
}

export function BrandPanel({ className = '', compact = false }: BrandPanelProps) {
  const { t, i18n } = useTranslation();

  return (
    <div
      className={`relative overflow-hidden flex flex-col justify-between bg-[#173F35] text-[#F7F5ED] select-none ${className}`}
      style={{
        backgroundImage: `
          radial-gradient(circle at 18% 20%, rgba(47, 125, 74, 0.45) 0%, transparent 55%),
          radial-gradient(circle at 85% 75%, rgba(198, 160, 74, 0.22) 0%, transparent 60%),
          linear-gradient(175deg, #12322A 0%, #173F35 45%, #0F2620 100%)
        `
      }}
    >
      {/* Background Subtle Botanical Guilloche & Organic Linework */}
      <div className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay">
        <svg
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 800 1000"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Gentle contour curves simulating topographic farm terraces */}
          <path
            d="M-100,200 C150,150 400,320 900,180"
            stroke="#C6A04A"
            strokeWidth="1.2"
            strokeDasharray="4 6"
          />
          <path
            d="M-50,380 C250,290 550,450 950,300"
            stroke="#E4C979"
            strokeWidth="0.8"
          />
          <path
            d="M-80,590 C220,520 480,680 920,530"
            stroke="#C6A04A"
            strokeWidth="1"
            strokeDasharray="8 8"
          />
          <path
            d="M-120,800 C300,740 600,900 980,760"
            stroke="#858B65"
            strokeWidth="1.5"
          />
          {/* Stylized wheat stalks in background corner */}
          <g transform="translate(680, 820) scale(0.65)" stroke="#C6A04A" strokeWidth="1.5" opacity="0.6">
            <path d="M0,200 Q-20,100 0,0" fill="none" />
            <path d="M-15,30 Q0,10 15,30 Q0,50 -15,30 Z" fill="#C6A04A" opacity="0.4" />
            <path d="M-15,70 Q0,50 15,70 Q0,90 -15,70 Z" fill="#C6A04A" opacity="0.4" />
            <path d="M-15,110 Q0,90 15,110 Q0,130 -15,110 Z" fill="#C6A04A" opacity="0.4" />
          </g>
        </svg>
      </div>

      {/* Top Section: Wordmark & Heritage Header */}
      <div className="relative z-10 px-8 pt-8 sm:px-12 sm:pt-12">
        <div className="flex items-center gap-3.5">
          {/* Emblem Icon with Gold Accent Ring */}
          <div className="relative w-11 h-11 rounded-xl bg-linear-to-b from-[#2F7D4A] to-[#173F35] border border-[#C6A04A]/60 shadow-lg flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#E4C979_1px,transparent_1px)] [background-size:6px_6px] opacity-20" />
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-[#E4C979] z-10 drop-shadow-xs"
            >
              <rect x="4" y="6" width="24" height="22" rx="3" stroke="#E4C979" strokeWidth="2" />
              <line x1="9" y1="3" x2="9" y2="7" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="23" y1="3" x2="23" y2="7" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="4" y1="12" x2="28" y2="12" stroke="#E4C979" strokeWidth="1.5" strokeOpacity="0.6" />
              <path
                d="M16 23V15M16 15C16 13 18.5 13 20 15C20.8 16 19.5 18 16 18M16 15C16 13 13.5 13 12 15C11.2 16 12.5 18 16 18"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-1.5 tracking-wider">
              <span className="font-extrabold text-base tracking-tight text-[#FFFFFF] font-sans">
                FARMING
              </span>
              <span className="font-semibold text-base tracking-tight text-[#E4C979] font-sans">
                CALENDAR
              </span>
            </div>
            <p className="text-[10px] tracking-[0.2em] uppercase font-mono font-semibold text-[#858B65] mt-0.5">
              {t('auth.tagline', 'Agribusiness & Production Management')}
            </p>
          </div>
        </div>
      </div>

      {/* Center Section: Majestic Gold Tree of Life & Harvest Wheat Artwork */}
      <div className="relative z-10 px-8 py-6 sm:px-12 sm:py-8 my-auto">
        <div className="flex flex-col items-center xl:items-start">
          {/* Dual Emblem Visual Composition */}
          <div className="relative mb-8 flex items-center justify-center">
            {/* Primary Golden Tree of Life Medallion */}
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 xl:w-64 xl:h-64 rounded-full p-1.5 bg-linear-to-tr from-[#C6A04A]/60 via-[#E4C979] to-[#C6A04A]/40 shadow-2xl shadow-black/40">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#173F35] bg-[#0E1612]">
                <img
                  src="/src/assets/images/tree_of_life_gold_1792574166734.jpg"
                  alt="Golden Tree of Life agricultural growth emblem"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-700 ease-out"
                />
              </div>
              {/* Subtle radiant golden aura */}
              <div className="absolute inset-0 rounded-full bg-[#C6A04A]/10 filter blur-xl -z-10" />
            </div>

            {/* Secondary Golden Wheat Harvest Motif (Floating Overlap Medallion) */}
            <div className="absolute -bottom-3 -right-3 sm:-bottom-4 sm:-right-4 w-24 h-24 sm:w-28 sm:h-28 xl:w-32 xl:h-32 rounded-full p-1 bg-linear-to-br from-[#E4C979] via-[#C6A04A] to-[#858B65] shadow-xl shadow-black/50">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#173F35] bg-[#0E1612]">
                <img
                  src="/src/assets/images/wheat_harvest_gold_1792574188582.jpg"
                  alt="Golden Hand Holding Wheat harvest emblem"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500 ease-out"
                />
              </div>
            </div>
          </div>

          {/* Editorial Headline & Supporting Paragraph */}
          <div className="space-y-4 max-w-xl text-center xl:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2F7D4A]/40 border border-[#C6A04A]/30 text-[#E4C979] text-xs font-mono font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E4C979] animate-pulse" />
              <span>International Agribusiness Standard</span>
            </div>

            <h1
              className="text-3xl sm:text-4xl xl:text-[42px] leading-[1.15] text-[#FFFFFF] font-normal tracking-tight"
              style={{ fontFamily: "var(--font-serif, 'Cormorant Garamond', Georgia, serif)" }}
            >
              {t('auth.headline', 'Cultivate Growth. Harvest Opportunity.')}
            </h1>

            <p className="text-sm sm:text-[15px] leading-relaxed text-[#CDD6CC] max-w-lg font-sans">
              {t(
                'auth.headlineSubtext',
                'Plan your agricultural operations, coordinate your teams, manage your production, and connect every harvest to a business opportunity.'
              )}
            </p>
          </div>

          {/* Three Concise Value Propositions with Icons */}
          <div className="mt-8 grid grid-cols-1 gap-3.5 w-full max-w-lg">
            {/* Value Prop 1 */}
            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#C6A04A]/50 transition-colors">
              <div className="p-2 rounded-lg bg-[#2F7D4A]/50 border border-[#C6A04A]/40 text-[#E4C979] shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-xs font-bold text-[#F7F5ED] uppercase tracking-wide font-sans">
                  {t('auth.valueProp1Title', 'Smart Agricultural Planning')}
                </h2>
                <p className="text-[11.5px] text-[#CDD6CC] leading-normal font-sans">
                  {t(
                    'auth.valueProp1Desc',
                    'Backward scheduling from export delivery targets to nursery planting.'
                  )}
                </p>
              </div>
            </div>

            {/* Value Prop 2 */}
            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#C6A04A]/50 transition-colors">
              <div className="p-2 rounded-lg bg-[#2F7D4A]/50 border border-[#C6A04A]/40 text-[#E4C979] shrink-0">
                <Sprout className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-xs font-bold text-[#F7F5ED] uppercase tracking-wide font-sans">
                  {t('auth.valueProp2Title', 'Production & Harvest Management')}
                </h2>
                <p className="text-[11.5px] text-[#CDD6CC] leading-normal font-sans">
                  {t(
                    'auth.valueProp2Desc',
                    'Real-time field operations, multi-stage yields, and rigorous quality quarantine.'
                  )}
                </p>
              </div>
            </div>

            {/* Value Prop 3 */}
            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#C6A04A]/50 transition-colors">
              <div className="p-2 rounded-lg bg-[#2F7D4A]/50 border border-[#C6A04A]/40 text-[#E4C979] shrink-0">
                <Ship className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h2 className="text-xs font-bold text-[#F7F5ED] uppercase tracking-wide font-sans">
                  {t('auth.valueProp3Title', 'Agribusiness & Export Intelligence')}
                </h2>
                <p className="text-[11.5px] text-[#CDD6CC] leading-normal font-sans">
                  {t(
                    'auth.valueProp3Desc',
                    'B2B buyer contracts, supply reservation, freight milestones, and margin analytics.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Subtle Trust Indicators */}
      <div className="relative z-10 px-8 pb-8 sm:px-12 sm:pb-12 text-[11px] text-[#858B65] flex items-center justify-between border-t border-white/10 pt-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5 text-[#C6A04A]" />
          <span>Multi-tenant Isolation &amp; RBAC Enforced</span>
        </div>
        <span className="font-mono text-[#E4C979]/80 font-medium">Guinea &amp; ECOWAS · GlobalG.A.P. Ready</span>
      </div>
    </div>
  );
}
