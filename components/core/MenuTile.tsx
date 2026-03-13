'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import * as LucideIcons from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface MenuTileProps {
  title: string;
  description: string;
  /** Lucide icon name as string (e.g. 'Users', 'BarChart2', 'Settings') */
  icon: string;
  href: string;
  /** Tailwind bg color class (e.g. 'bg-indigo-600') — used as accent stripe */
  color: string;
  isPinned?: boolean;
  onPinToggle?: () => void;
}

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = (LucideIcons[name as keyof typeof LucideIcons] ??
    LucideIcons.Square) as React.ComponentType<{ className?: string }>;
  return <Icon className={className} />;
}

export const MenuTile = React.memo(function MenuTile({
  title,
  description,
  icon,
  href,
  color,
  isPinned,
  onPinToggle,
}: MenuTileProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const handleClick = () => {
    router.push(href);
  };

  return (
    <div
      onClick={handleClick}
      className="group relative overflow-hidden bg-gray-900 hover:bg-gray-800 rounded-xl shadow-lg cursor-pointer transition-all duration-150 border border-gray-800 hover:border-gray-700 hover:scale-[1.02] active:scale-[0.98]"
    >
      {/* Left accent stripe using the module color */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${color} rounded-l-xl`} />

      {/* Content */}
      <div className="flex items-center gap-4 px-5 py-4 pl-6">
        {/* Icon container */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${color} bg-opacity-20 flex items-center justify-center`}>
          <DynamicIcon name={icon} className="w-5 h-5 text-white" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white leading-tight truncate">
            {title}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 leading-tight">
            {description}
          </p>
        </div>

        {/* Pin toggle (optional) */}
        {onPinToggle && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPinToggle();
            }}
            className={`flex-shrink-0 p-1 rounded transition-colors ${
              isPinned
                ? 'text-indigo-400 hover:text-indigo-300'
                : 'text-gray-600 hover:text-gray-400'
            }`}
            title={isPinned ? t('common.unpin') : t('common.pin')}
          >
            <LucideIcons.Pin className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Arrow */}
        <div className="flex-shrink-0 text-gray-600 group-hover:text-gray-400 transition-colors duration-200">
          <LucideIcons.ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* Bottom shine */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
});
