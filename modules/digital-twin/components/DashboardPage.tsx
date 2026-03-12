'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface Machine {
  id: number;
  name: string;
  machineType: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  status: 'running' | 'idle' | 'warning' | 'error' | 'maintenance';
}

interface Layout {
  id: number;
  name: string;
  machines: Machine[];
}

const STATUS_COLORS: Record<string, { bg: string; border: string; labelKey: string }> = {
  running:     { bg: 'bg-green-900/50',  border: 'border-green-500', labelKey: 'dt.status.running' },
  idle:        { bg: 'bg-gray-800/50',   border: 'border-gray-600',  labelKey: 'dt.status.idle' },
  warning:     { bg: 'bg-yellow-900/50', border: 'border-yellow-500', labelKey: 'dt.status.warning' },
  error:       { bg: 'bg-red-900/50',    border: 'border-red-500',    labelKey: 'dt.status.error' },
  maintenance: { bg: 'bg-blue-900/50',   border: 'border-blue-500',   labelKey: 'dt.status.maintenance' },
};

export default function DigitalTwinDashboardPage() {
  const { t } = useTranslation();
  const [layout, setLayout] = useState<Layout | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  const fetchLayout = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/digital-twin/data');
      if (res.ok) {
        const data = await res.json();
        if (data.items?.length > 0) {
          setLayout(data.items[0]);
        }
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLayout(); }, [fetchLayout]);

  // Demo data if no layout exists
  const demoMachines: Machine[] = [
    { id: 1, name: 'CNC-01', machineType: 'cnc', posX: 50, posY: 50, width: 120, height: 80, status: 'running' },
    { id: 2, name: 'CNC-02', machineType: 'cnc', posX: 200, posY: 50, width: 120, height: 80, status: 'running' },
    { id: 3, name: 'Présgép-01', machineType: 'press', posX: 50, posY: 170, width: 120, height: 80, status: 'warning' },
    { id: 4, name: 'Hegesztő-01', machineType: 'welder', posX: 200, posY: 170, width: 120, height: 80, status: 'idle' },
    { id: 5, name: 'Festő sor', machineType: 'paint', posX: 350, posY: 50, width: 150, height: 200, status: 'running' },
    { id: 6, name: 'Összeszerelés', machineType: 'assembly', posX: 530, posY: 50, width: 150, height: 100, status: 'error' },
    { id: 7, name: 'Csomagoló', machineType: 'packing', posX: 530, posY: 170, width: 150, height: 80, status: 'maintenance' },
  ];

  const machines = layout?.machines ?? demoMachines;
  const running = useMemo(() => machines.filter(m => m.status === 'running').length, [machines]);
  const stopped = useMemo(() => machines.filter(m => m.status !== 'running').length, [machines]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('dt.title')}</h1>
          <p className="text-gray-400 text-sm">{t('dt.subtitle')}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {Object.entries(STATUS_COLORS).map(([status, { border, labelKey }]) => {
          const count = machines.filter(m => m.status === status).length;
          return (
            <div key={status} className={`bg-gray-900 border-l-4 ${border} rounded-lg p-3`}>
              <p className="text-gray-500 text-xs">{t(labelKey)}</p>
              <p className="text-xl font-bold text-white">{count}</p>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500 animate-pulse">{t('dt.loading')}</div>
      ) : (
        <>
          {/* Factory floor canvas */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 overflow-auto">
            <div className="relative" style={{ minWidth: 720, minHeight: 300 }}>
              {/* Grid background */}
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }} />

              {/* Machines */}
              {machines.map(machine => {
                const sc = STATUS_COLORS[machine.status] ?? STATUS_COLORS.idle;
                return (
                  <div
                    key={machine.id}
                    onClick={() => setSelectedMachine(machine)}
                    className={`absolute ${sc.bg} border-2 ${sc.border} rounded-lg cursor-pointer hover:scale-105 transition-transform flex flex-col items-center justify-center`}
                    style={{
                      left: machine.posX,
                      top: machine.posY,
                      width: machine.width,
                      height: machine.height,
                    }}
                  >
                    <span className="text-white text-sm font-semibold">{machine.name}</span>
                    <span className="text-xs text-gray-400">{t(sc.labelKey)}</span>
                    {machine.status === 'running' && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    )}
                    {machine.status === 'error' && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    )}
                  </div>
                );
              })}

              {/* Conveyor lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minWidth: 720, minHeight: 300 }}>
                <line x1="170" y1="90" x2="200" y2="90" stroke="#374151" strokeWidth="2" strokeDasharray="4" />
                <line x1="320" y1="90" x2="350" y2="90" stroke="#374151" strokeWidth="2" strokeDasharray="4" />
                <line x1="500" y1="100" x2="530" y2="100" stroke="#374151" strokeWidth="2" strokeDasharray="4" />
                <line x1="425" y1="250" x2="530" y2="210" stroke="#374151" strokeWidth="2" strokeDasharray="4" />
              </svg>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-4">
            {Object.entries(STATUS_COLORS).map(([status, { bg, border, labelKey }]) => (
              <div key={status} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${bg} border ${border}`} />
                <span className="text-xs text-gray-400">{t(labelKey)}</span>
              </div>
            ))}
          </div>

          {/* Stats bar */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-3 flex items-center gap-6 text-sm text-gray-400">
            <span>{t('dt.total_machines')}: <strong className="text-white">{machines.length}</strong></span>
            <span>{t('dt.running_count')}: <strong className="text-green-400">{running}</strong></span>
            <span>{t('dt.stopped_count')}: <strong className="text-red-400">{stopped}</strong></span>
            <span className="ml-auto text-xs">
              {!layout && t('dt.demo_warning')}
            </span>
          </div>
        </>
      )}

      {/* Machine detail popup */}
      {selectedMachine && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedMachine(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">{selectedMachine.name}</h2>
            <div className="space-y-2 text-sm">
              <p className="text-gray-400">{t('dt.type')}: <span className="text-white">{selectedMachine.machineType}</span></p>
              <p className="text-gray-400">{t('dt.status_label')}: <span className={`font-semibold ${selectedMachine.status === 'running' ? 'text-green-400' : selectedMachine.status === 'error' ? 'text-red-400' : 'text-yellow-400'}`}>
                {STATUS_COLORS[selectedMachine.status]?.labelKey ? t(STATUS_COLORS[selectedMachine.status].labelKey) : selectedMachine.status}
              </span></p>
              <p className="text-gray-400">{t('dt.position')}: <span className="text-white">{selectedMachine.posX}, {selectedMachine.posY}</span></p>
            </div>
            <button onClick={() => setSelectedMachine(null)} className="mt-4 w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">{t('dt.close')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
