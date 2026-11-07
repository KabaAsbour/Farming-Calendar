import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface FormErrorProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function FormError({ message, onDismiss, className = '' }: FormErrorProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-900 text-xs sm:text-sm animate-in fade-in duration-200 ${className}`}
    >
      <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 font-medium leading-relaxed">
        {message}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-rose-500 hover:text-rose-700 p-0.5 rounded transition-colors"
          aria-label="Dismiss error"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
