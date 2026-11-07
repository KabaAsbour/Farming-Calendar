import React from 'react';
import { useTranslation } from 'react-i18next';
import { BrandPanel } from './BrandPanel.tsx';
import { LoginForm } from './LoginForm.tsx';
import { AuthSession } from '../../types/organization.ts';

interface LoginPageProps {
  onSuccess: (session: AuthSession) => void;
  initialError?: string;
}

export function LoginPage({ onSuccess, initialError }: LoginPageProps) {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full bg-[#F7F5ED] flex flex-col lg:flex-row items-stretch">
      {/* Mobile Top Brand Header (Visible only on screens below lg) */}
      <div className="lg:hidden bg-[#173F35] text-[#F7F5ED] px-6 py-5 border-b border-[#C6A04A]/30 relative overflow-hidden flex items-center justify-between">
        <div className="absolute right-0 top-0 bottom-0 w-36 pointer-events-none opacity-20 overflow-hidden">
          <img
            src="/src/assets/images/tree_of_life_gold_1792574166734.jpg"
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover scale-150 translate-x-8"
          />
        </div>

        <div className="flex items-center gap-3 z-10">
          <div className="w-9 h-9 rounded-lg bg-linear-to-b from-[#2F7D4A] to-[#173F35] border border-[#C6A04A]/60 flex items-center justify-center">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-[#E4C979]"
            >
              <rect x="4" y="6" width="24" height="22" rx="3" stroke="#E4C979" strokeWidth="2" />
              <line x1="9" y1="3" x2="9" y2="7" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="23" y1="3" x2="23" y2="7" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
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
            <div className="flex items-center gap-1 leading-none">
              <span className="font-extrabold text-sm tracking-tight text-white font-sans">
                FARMING
              </span>
              <span className="font-semibold text-sm tracking-tight text-[#E4C979] font-sans">
                CALENDAR
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-wider font-mono font-medium text-[#858B65] block mt-0.5">
              Agribusiness Intelligence
            </span>
          </div>
        </div>
      </div>

      {/* Desktop & Tablet Left Panel: Rich Botanical Agricultural Brand Experience (58% Desktop Width) */}
      <div className="hidden lg:flex lg:w-[56%] xl:w-[58%] min-h-screen">
        <BrandPanel className="w-full h-full shadow-2xl" />
      </div>

      {/* Desktop & Mobile Right Panel: Elegant Ivory Login Card & Form (42% Desktop Width) */}
      <div className="w-full lg:w-[44%] xl:w-[42%] flex flex-col justify-center items-center bg-[#F7F5ED] min-h-[calc(100vh-68px)] lg:min-h-screen relative">
        {/* Subtle Warm Ivory Texture Gradient */}
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 0%, rgba(198, 160, 74, 0.08) 0%, transparent 60%)'
          }}
        />

        <div className="relative z-10 w-full max-w-lg">
          <LoginForm onSuccess={onSuccess} initialError={initialError} />
        </div>
      </div>
    </div>
  );
}
