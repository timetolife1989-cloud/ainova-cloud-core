// =====================================================
// AINOVA - Napi Perces Adattábla komponens (v2 — szűréssel)
// =====================================================

'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { NapiData, KimutatType } from '../types/index';
import { Filter, X } from 'lucide-react';

interface NapiPercesTableProps {
  data: NapiData[];
  activeKimutat: KimutatType;
}

// Kiszámítja az ISO hét számát egy dátum stringből (MM.dd vagy yyyy-MM-dd)
function getISOWeek(datumLabel: string, datumRaw?: string): number | null {
  try {
    let d: Date;
    if (datumRaw) {
      d = new Date(datumRaw);
    } else {
      // MM.dd formátum — feltételezzük az aktuális évet
      const [mm, dd] = datumLabel.split('.');
      d = new Date(new Date().getFullYear(), parseInt(mm) - 1, parseInt(dd));
    }
    if (isNaN(d.getTime())) return null;
    // ISO week
    const tmp = new Date(d.getTime());
    tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
    const week1 = new Date(tmp.getFullYear(), 0, 4);
    return 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  } catch { return null; }
}

export default function NapiPercesTable({ data, activeKimutat }: NapiPercesTableProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCW, setSelectedCW] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Elérhető CW-k és hónapok a betöltött adatból
  const { availableCWs, availableMonths } = useMemo(() => {
    const cwSet = new Set<number>();
    const monthSet = new Set<string>();
    data.forEach(d => {
      const cw = getISOWeek(d.datum_label, d.datum);
      if (cw) cwSet.add(cw);
      // Hónap: MM rész a datum_label-ből
      const mm = d.datum_label?.split('.')[0] || d.datum_label?.substring(0, 7);
      if (mm) monthSet.add(mm);
    });
    return {
      availableCWs: Array.from(cwSet).sort((a, b) => a - b),
      availableMonths: Array.from(monthSet).sort(),
    };
  }, [data]);

  const hasFilter = dateFrom || dateTo || selectedCW !== null || selectedMonth !== null;

  // Szűrt adatok
  const filteredData = useMemo(() => {
    if (!hasFilter) return data;
    
    return data.filter(row => {
      // Dátum szűrés (from/to)
      if (dateFrom || dateTo) {
        const label = row.datum_label; // MM.dd format
        if (dateFrom && label < dateFrom) return false;
        if (dateTo && label > dateTo) return false;
      }
      
      // CW szűrés
      if (selectedCW !== null) {
        const cw = getISOWeek(row.datum_label, row.datum);
        if (cw !== selectedCW) return false;
      }
      
      // Hónap szűrés
      if (selectedMonth !== null) {
        const mm = row.datum_label?.split('.')[0];
        if (mm !== selectedMonth) return false;
      }
      
      return true;
    });
  }, [data, dateFrom, dateTo, selectedCW, selectedMonth, hasFilter]);

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedCW(null);
    setSelectedMonth(null);
  };

  // Összesítések a szűrt adatokból
  const totals = {
    cel_perc: filteredData.reduce((s, d) => s + (d.cel_perc || 0), 0),
    leadott_siemens_dc: filteredData.reduce((s, d) => s + (d.leadott_siemens_dc || 0), 0),
    leadott_no_siemens: filteredData.reduce((s, d) => s + (d.leadott_no_siemens || 0), 0),
    leadott_de: filteredData.reduce((s, d) => s + (d.leadott_de || 0), 0),
    leadott_du: filteredData.reduce((s, d) => s + (d.leadott_du || 0), 0),
    leadott_ej: filteredData.reduce((s, d) => s + (d.leadott_ej || 0), 0),
    leadott_ossz: filteredData.reduce((s, d) => s + (d.leadott_ossz || 0), 0),
  };
  
  const avgPercent = totals.cel_perc > 0 
    ? (totals.leadott_ossz / totals.cel_perc * 100) 
    : 0;

  // Heti/havi nézetben nincs DE/DU/ÉJ csapat
  const showShiftColumns = activeKimutat === 'napi';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 shadow-xl overflow-hidden"
    >
      {/* Header - szűrőgomb + időszak */}
      <div className="px-4 py-3 bg-slate-700/50 flex justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">Részletes adatok</h3>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-all ${
              filterOpen || hasFilter
                ? 'bg-cyan-600/80 text-white' 
                : 'bg-slate-600/50 text-slate-400 hover:bg-slate-600 hover:text-white'
            }`}
          >
            <Filter className="w-3 h-3" />
            Szűrés
            {hasFilter && <span className="ml-1 bg-white/20 rounded px-1">{filteredData.length}/{data.length}</span>}
          </button>
          {hasFilter && (
            <button onClick={clearFilters} className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-0.5">
              <X className="w-3 h-3" /> Törlés
            </button>
          )}
        </div>
        {filteredData.length > 0 && (
          <span className="text-xs text-slate-400">
            Időszak: <span className="text-cyan-400 font-bold">{filteredData[0].datum_label}</span> - <span className="text-cyan-400 font-bold">{filteredData[filteredData.length - 1].datum_label}</span>
          </span>
        )}
      </div>

      {/* Szűrő panel */}
      {filterOpen && (
        <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700/50 flex flex-wrap items-center gap-4">
          {/* Dátumtól/ig */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-slate-400 uppercase font-semibold">Dátumtól:</label>
            <input
              type="text"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setSelectedCW(null); setSelectedMonth(null); }}
              placeholder="MM.dd"
              className="w-16 bg-slate-700/50 text-white text-xs px-2 py-1 rounded border border-slate-600 focus:border-cyan-500 focus:outline-none"
            />
            <label className="text-[10px] text-slate-400 uppercase font-semibold">ig:</label>
            <input
              type="text"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setSelectedCW(null); setSelectedMonth(null); }}
              placeholder="MM.dd"
              className="w-16 bg-slate-700/50 text-white text-xs px-2 py-1 rounded border border-slate-600 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* CW szűrő chipek */}
          {activeKimutat === 'napi' && availableCWs.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">CW:</span>
              {availableCWs.map(cw => (
                <button
                  key={cw}
                  onClick={() => { setSelectedCW(selectedCW === cw ? null : cw); setDateFrom(''); setDateTo(''); setSelectedMonth(null); }}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                    selectedCW === cw
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600 hover:text-white'
                  }`}
                >
                  {cw}
                </button>
              ))}
            </div>
          )}

          {/* Hónap szűrő */}
          {activeKimutat === 'napi' && availableMonths.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Hónap:</span>
              {availableMonths.map(m => (
                <button
                  key={m}
                  onClick={() => { setSelectedMonth(selectedMonth === m ? null : m); setDateFrom(''); setDateTo(''); setSelectedCW(null); }}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                    selectedMonth === m
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-900 shadow-md">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-slate-400 uppercase bg-slate-900">Dátum</th>
              <th className="px-3 py-2 text-right font-semibold text-green-400 uppercase bg-slate-900 border-l border-slate-700">Cél</th>
              <th className="px-3 py-2 text-right font-semibold text-white uppercase bg-slate-800">Leadás Σ</th>
              {showShiftColumns && (
                <>
                  <th className="px-3 py-2 text-right font-semibold text-yellow-400 uppercase bg-slate-900">Délelőtt</th>
                  <th className="px-3 py-2 text-right font-semibold text-emerald-400 uppercase bg-slate-900">Délután</th>
                  <th className="px-3 py-2 text-right font-semibold text-indigo-400 uppercase bg-slate-900">Éjszaka</th>
                </>
              )}
              <th className="px-3 py-2 text-right font-semibold text-sky-400 uppercase bg-slate-900 border-l border-slate-700">No Siemens</th>
              <th className="px-3 py-2 text-right font-semibold text-blue-400 uppercase bg-slate-900">Siemens</th>
              <th className="px-3 py-2 text-right font-semibold text-amber-400 uppercase bg-slate-900">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filteredData.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10'}>
                <td className="px-3 py-2 text-white font-medium">{row.datum_label}</td>
                <td className="px-3 py-2 text-right text-green-400 border-l border-slate-700">{row.cel_perc?.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-white font-bold bg-white/5">{row.leadott_ossz?.toLocaleString()}</td>
                {showShiftColumns && (
                  <>
                    <td className="px-3 py-2 text-right text-yellow-300" title={row.de_csapat ? `${row.de_csapat} csapat` : ''}>{row.leadott_de?.toLocaleString()}{row.de_csapat ? <span className="text-[10px] text-yellow-500 ml-0.5">({row.de_csapat})</span> : null}</td>
                    <td className="px-3 py-2 text-right text-emerald-300" title={row.du_csapat ? `${row.du_csapat} csapat` : ''}>{row.leadott_du?.toLocaleString()}{row.du_csapat ? <span className="text-[10px] text-emerald-500 ml-0.5">({row.du_csapat})</span> : null}</td>
                    <td className="px-3 py-2 text-right text-indigo-300" title={row.ej_csapat ? `${row.ej_csapat} csapat` : ''}>{row.leadott_ej?.toLocaleString()}{row.ej_csapat ? <span className="text-[10px] text-indigo-500 ml-0.5">({row.ej_csapat})</span> : null}</td>
                  </>
                )}
                <td className="px-3 py-2 text-right text-sky-400 border-l border-slate-700">{row.leadott_no_siemens?.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-blue-400">{row.leadott_siemens_dc?.toLocaleString()}</td>
                <td className={`px-3 py-2 text-right font-semibold ${row.leadas_szazalek >= 100 ? 'text-green-400' : row.leadas_szazalek >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                  {row.leadas_szazalek?.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-900/80">
            <tr className="font-bold text-xs">
              <td className="px-3 py-2 text-white">{hasFilter ? `Szűrt összesen (${filteredData.length})` : 'Összesen'}</td>
              <td className="px-3 py-2 text-right text-green-400 border-l border-slate-700">{totals.cel_perc.toLocaleString()}</td>
              <td className="px-3 py-2 text-right text-white">{totals.leadott_ossz.toLocaleString()}</td>
              {showShiftColumns && (
                <>
                  <td className="px-3 py-2 text-right text-yellow-300">{totals.leadott_de.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-emerald-300">{totals.leadott_du.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-indigo-300">{totals.leadott_ej.toLocaleString()}</td>
                </>
              )}
              <td className="px-3 py-2 text-right text-sky-400 border-l border-slate-700">{totals.leadott_no_siemens.toLocaleString()}</td>
              <td className="px-3 py-2 text-right text-blue-400">{totals.leadott_siemens_dc.toLocaleString()}</td>
              <td className="px-3 py-2 text-right text-amber-400">
                {avgPercent.toFixed(1)}%
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </motion.div>
  );
}
