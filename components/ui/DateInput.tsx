'use client';

import React from 'react';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  labelClassName?: string;
}

/**
 * Styled date input for dark theme.
 * Drop-in replacement for <input type="date"> with consistent ACI styling.
 */
export function DateInput({ label, labelClassName, className, ...props }: DateInputProps) {
  const inputCls = [
    'w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
    'transition-colors cursor-pointer',
    '[&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100',
    '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
    className,
  ].filter(Boolean).join(' ');

  if (label) {
    return (
      <div>
        <label className={labelClassName ?? 'block text-xs font-medium text-gray-400 mb-1'}>
          {label}
        </label>
        <input type="date" className={inputCls} {...props} />
      </div>
    );
  }

  return <input type="date" className={inputCls} {...props} />;
}
