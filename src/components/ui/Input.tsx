import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  icon,
  className = '',
  id,
  ...props
}: InputProps) {
  const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={generatedId} className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0]">
          {label}
        </label>
      )}

      <div className="relative rounded-lg shadow-xs">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#66736B] dark:text-[#9EB0A5]">
            {icon}
          </div>
        )}
        <input
          id={generatedId}
          className={`block w-full rounded-lg text-sm bg-white dark:bg-[#1B2B23] border transition-colors
            text-[#202924] dark:text-[#EEF4F0] placeholder-[#8A988F] dark:placeholder-[#66736B]
            focus:outline-none focus:ring-2 focus:ring-[#2F7D4A] focus:border-[#2F7D4A]
            disabled:opacity-50 disabled:bg-[#F0F4EE] dark:disabled:bg-[#14201A]
            ${icon ? 'pl-9 pr-3 py-2' : 'px-3 py-2'}
            ${error ? 'border-red-400 focus:ring-red-400' : 'border-[#CDD6CC] dark:border-[#283D33]'}
            ${className}`}
          {...props}
        />
      </div>

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[#66736B] dark:text-[#9EB0A5]">{hint}</p>
      ) : null}
    </div>
  );
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: { value: string; label: string }[];
}

export function Select({
  label,
  error,
  hint,
  options,
  children,
  className = '',
  id,
  ...props
}: SelectProps) {
  const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={generatedId} className="block text-xs font-semibold text-[#202924] dark:text-[#EEF4F0]">
          {label}
        </label>
      )}

      <select
        id={generatedId}
        className={`block w-full rounded-lg text-sm bg-white dark:bg-[#1B2B23] border px-3 py-2 transition-colors
          text-[#202924] dark:text-[#EEF4F0] focus:outline-none focus:ring-2 focus:ring-[#2F7D4A] focus:border-[#2F7D4A]
          ${error ? 'border-red-400 focus:ring-red-400' : 'border-[#CDD6CC] dark:border-[#283D33]'}
          ${className}`}
        {...props}
      >
        {options
          ? options.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-white dark:bg-[#14201A] text-[#202924] dark:text-[#EEF4F0]">
                {opt.label}
              </option>
            ))
          : children}
      </select>

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-[#66736B] dark:text-[#9EB0A5]">{hint}</p>
      ) : null}
    </div>
  );
}
