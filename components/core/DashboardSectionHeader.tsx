interface DashboardSectionHeaderProps {
  title: string;
  subtitle?: string;
}

export function DashboardSectionHeader({ title, subtitle }: DashboardSectionHeaderProps) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-200">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
