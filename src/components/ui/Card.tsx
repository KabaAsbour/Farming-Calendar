import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'subtle' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  const variantStyles = {
    default: 'bg-white dark:bg-[#14201A] border border-[#E1E7E0] dark:border-[#24352C] shadow-sm',
    subtle: 'bg-[#F7F8F4] dark:bg-[#18261F] border border-[#E1E7E0] dark:border-[#283D33]',
    bordered: 'bg-transparent border border-[#CDD6CC] dark:border-[#334A3E]'
  };

  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-7'
  };

  return (
    <div
      className={`rounded-xl transition-all ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = ''
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 pb-4 border-b border-[#E1E7E0] dark:border-[#24352C] ${className}`}>
      <div>
        <h3 className="text-sm font-semibold text-[#202924] dark:text-[#EEF4F0]">{title}</h3>
        {subtitle && (
          <p className="text-xs text-[#66736B] dark:text-[#9EB0A5] mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
