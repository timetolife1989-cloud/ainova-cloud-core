'use client';

import React from 'react';

interface InputFieldProps {
  label: string;
  type: 'text' | 'password';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  error?: string;
}

export function InputField({
  label,
  type,
  value,
  onChange,
  placeholder,
  disabled,
  autoComplete,
  error,
}: InputFieldProps) {
  const fieldId = `field-${type}-${label.toLowerCase().replace(/\s+/g, '-')}`;
  
  return (
    <div className="mb-5">
      <label htmlFor={fieldId} className="block text-sm text-gray-300 font-medium mb-2">
        {label}
      </label>

      <input
        id={fieldId}
        name={fieldId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        className={[
          'w-full px-4 py-3 rounded-lg text-sm transition-all duration-200',
          'bg-gray-800 border text-gray-100 placeholder-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-700 hover:border-gray-600',
        ].join(' ')}
      />

      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
