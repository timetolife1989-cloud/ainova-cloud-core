import Link from 'next/link';
import * as LucideIcons from 'lucide-react';

interface AdminMenuCardProps {
  title: string;
  description: string;
  icon: string;
  href: string;
}

export function AdminMenuCard({ title, description, icon, href }: AdminMenuCardProps) {
  const Icon = (LucideIcons[icon as keyof typeof LucideIcons] ?? LucideIcons.Square) as React.ComponentType<{ className?: string }>;

  return (
    <Link href={href}>
      <div className="group flex items-start gap-4 p-5 rounded-xl bg-gray-900 border border-gray-800 hover:border-indigo-700 hover:bg-gray-800/80 transition-all cursor-pointer">
        <div className="p-2 rounded-lg bg-gray-800 group-hover:bg-indigo-900/50 transition-colors flex-shrink-0">
          <Icon className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <p className="font-semibold text-gray-100 text-sm">{title}</p>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );
}
