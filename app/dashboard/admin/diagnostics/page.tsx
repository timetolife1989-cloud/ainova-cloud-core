import { DiagnosticsPanel } from '@/components/admin/diagnostics/DiagnosticsPanel';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';

export default function DiagnosticsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader
        title="Diagnosztika"
        subtitle="Rendszer állapot és teljesítmény adatok"
      />
      <DiagnosticsPanel />
    </div>
  );
}
