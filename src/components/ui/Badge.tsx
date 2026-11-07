import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'forest';
  size?: 'xs' | 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = true,
  className = ''
}: BadgeProps) {
  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2'
  };

  const variantStyles = {
    forest: 'bg-[#173F35]/10 text-[#173F35] border border-[#2F7D4A]/30 dark:bg-[#2F7D4A]/20 dark:text-[#77A96B] dark:border-[#2F7D4A]/40',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    error: 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    info: 'bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
    neutral: 'bg-[#F0F4EE] text-[#66736B] border border-[#E1E7E0] dark:bg-[#1B2B23] dark:text-[#9EB0A5] dark:border-[#283D33]'
  };

  const dotColors = {
    forest: 'bg-[#2F7D4A]',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
    info: 'bg-sky-500',
    neutral: 'bg-slate-400'
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-md leading-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[variant]}`} />
      )}
      <span>{children}</span>
    </span>
  );
}

export function StatusDot({
  status,
  label,
  className = ''
}: {
  status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  label?: string;
  className?: string;
}) {
  const dotColors = {
    success: 'bg-[#2F7D4A] ring-emerald-300/40',
    warning: 'bg-amber-500 ring-amber-300/40',
    error: 'bg-rose-500 ring-rose-300/40',
    info: 'bg-sky-500 ring-sky-300/40',
    neutral: 'bg-slate-400 ring-slate-200/40'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-[#66736B] dark:text-[#9EB0A5] ${className}`}>
      <span className={`w-2 h-2 rounded-full ring-2 ${dotColors[status]}`} />
      {label && <span>{label}</span>}
    </span>
  );
}
