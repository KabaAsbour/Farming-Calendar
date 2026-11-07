import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'forest';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 select-none disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    xs: 'text-xs px-2.5 py-1 gap-1.5 min-h-[28px]',
    sm: 'text-xs px-3 py-1.5 gap-2 min-h-[34px]',
    md: 'text-sm px-4 py-2 gap-2 min-h-[40px]',
    lg: 'text-base px-5 py-2.5 gap-2.5 min-h-[44px]'
  };

  const variantStyles = {
    forest: 'bg-[#173F35] text-white hover:bg-[#1f5346] active:bg-[#123129] focus:ring-[#2F7D4A] shadow-sm',
    primary: 'bg-[#2F7D4A] text-white hover:bg-[#276a3e] active:bg-[#1f5431] focus:ring-[#77A96B] shadow-sm',
    secondary: 'bg-[#F0F4EE] text-[#202924] hover:bg-[#E5ECE2] active:bg-[#DAE4D6] dark:bg-[#1B2B23] dark:text-[#EEF4F0] dark:hover:bg-[#23382E] border border-[#E1E7E0] dark:border-[#283D33]',
    outline: 'border border-[#CDD6CC] text-[#202924] hover:bg-[#F7F8F4] active:bg-[#F0F4EE] dark:border-[#334A3E] dark:text-[#EEF4F0] dark:hover:bg-[#1B2B23]',
    ghost: 'text-[#66736B] hover:text-[#202924] hover:bg-[#F0F4EE] dark:text-[#9EB0A5] dark:hover:text-[#EEF4F0] dark:hover:bg-[#18261F]',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500 shadow-sm'
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : icon && iconPosition === 'left' ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}

      <span>{children}</span>

      {!loading && icon && iconPosition === 'right' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </button>
  );
}
