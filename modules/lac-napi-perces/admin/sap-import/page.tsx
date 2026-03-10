'use client';

import { motion } from 'framer-motion';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import SapImportDropzone from '../SapImportDropzone';
import SapStatusWidget from '../SapStatusWidget';

export default function SapImportPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DashboardSectionHeader
        title="SAP Import"
        subtitle="SAP QuickViewer exportok importálása az adatbázisba"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* Info Section */}
        <div className="mb-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
          <h2 className="text-lg font-bold text-blue-400 mb-2">
            SAP QuickViewer Import
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            Húzd ide a SAP-ból exportált Excel fájlt. A rendszer automatikusan felismeri a típust, vagy manuálisan választhatod ki:
          </p>
          <ul className="text-sm text-gray-300 space-y-1">
            <li><span className="text-blue-400 font-mono">SAP Visszajelentés</span> → Napi gyártási lejelentések (próba.XLSX formátum), 05:45-ös műszakhatár eltolással</li>
            <li><span className="text-emerald-400 font-mono">Normaidők</span> → Gömböcz Gábor normaidő táblája (hetente frissítendő)</li>
            <li><span className="text-purple-400 font-mono">Router / Munkaterv</span> → Termék folyamattervek (routing.XLSX), a C-s termékek validálásához szükséges</li>
          </ul>
        </div>

        {/* Dropzone Component */}
        <SapImportDropzone />

        {/* SAP Database Status */}
        <div className="mt-8">
          <SapStatusWidget />
        </div>

        {/* Usage Tips */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900/50 border border-blue-800/30 rounded-lg p-4">
            <h3 className="text-sm font-bold text-blue-400 mb-2">📋 SAP Visszajelentés</h3>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Formátum: SQVI export (próba.XLSX)</li>
              <li>• Tartalom: Szállítás + Anyaglehívás műveletek</li>
              <li>• Műszakhatár: 05:45 (automata eltolás)</li>
              <li>• Naponta frissíteni</li>
            </ul>
          </div>
          <div className="bg-gray-900/50 border border-emerald-800/30 rounded-lg p-4">
            <h3 className="text-sm font-bold text-emerald-400 mb-2">📊 Normaidők</h3>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Fájl: norma frissXX.XX.xlsx</li>
              <li>• Sheet: Munka3, 4. sortól</li>
              <li>• Tartalom: perc/db + EUR/perc</li>
              <li>• Hetente 1× frissíteni</li>
            </ul>
          </div>
          <div className="bg-gray-900/50 border border-purple-800/30 rounded-lg p-4">
            <h3 className="text-sm font-bold text-purple-400 mb-2">⚙️ Router / Munkaterv</h3>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• Fájl: routing.XLSX</li>
              <li>• C-s termékek szűrése: csak a tekercselt termékek maradnak bent</li>
              <li>• Hetente 1× frissíteni</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
