'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { Car, Plus, X, Check, AlertTriangle, Fuel, Route } from 'lucide-react';

interface FleetVehicle {
  id: number;
  plateNumber: string;
  vehicleName: string | null;
  vehicleType: string | null;
  isActive: boolean;
  notes: string | null;
}

interface FleetTrip {
  id: number;
  tripDate: string;
  driverName: string | null;
  startKm: number | null;
  endKm: number | null;
  distance: number | null;
  purpose: string | null;
}

const VEHICLE_TYPES = [
  { value: 'car', label: 'Személyautó' },
  { value: 'van', label: 'Furgon' },
  { value: 'truck', label: 'Teherautó' },
  { value: 'forklift', label: 'Targonca' },
  { value: 'other', label: 'Egyéb' },
];

export default function FleetDashboardPage() {
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null);
  const [trips, setTrips] = useState<FleetTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState<'vehicle' | 'trip' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vehicle form
  const [formPlate, setFormPlate] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('car');

  // Trip form
  const [tripDate, setTripDate] = useState(new Date().toISOString().split('T')[0]);
  const [tripDriver, setTripDriver] = useState('');
  const [tripStartKm, setTripStartKm] = useState<number | ''>('');
  const [tripEndKm, setTripEndKm] = useState<number | ''>('');
  const [tripPurpose, setTripPurpose] = useState('');

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/fleet/data');
      if (res.ok) {
        const json = await res.json() as { vehicles: FleetVehicle[] };
        setVehicles(json.vehicles);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrips = useCallback(async (vehicleId: number) => {
    try {
      const res = await fetch(`/api/modules/fleet/data/${vehicleId}`);
      if (res.ok) {
        const json = await res.json() as { trips: FleetTrip[] };
        setTrips(json.trips);
      }
    } catch {
      setTrips([]);
    }
  }, []);

  useEffect(() => {
    void fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    if (selectedVehicle) {
      void fetchTrips(selectedVehicle.id);
    }
  }, [selectedVehicle, fetchTrips]);

  const getCsrfToken = () => {
    return document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';
  };

  const handleSaveVehicle = async () => {
    if (!formPlate.trim()) {
      setError('Rendszám megadása kötelező');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/modules/fleet/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({
          plateNumber: formPlate,
          vehicleName: formName || undefined,
          vehicleType: formType,
        }),
      });

      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Hiba');

      setModalOpen(null);
      setFormPlate('');
      setFormName('');
      setFormType('car');
      await fetchVehicles();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hiba történt');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTrip = async () => {
    if (!selectedVehicle) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/modules/fleet/data/${selectedVehicle.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({
          tripDate,
          driverName: tripDriver || undefined,
          startKm: tripStartKm !== '' ? tripStartKm : undefined,
          endKm: tripEndKm !== '' ? tripEndKm : undefined,
          purpose: tripPurpose || undefined,
        }),
      });

      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Hiba');

      setModalOpen(null);
      setTripDate(new Date().toISOString().split('T')[0]);
      setTripDriver('');
      setTripStartKm('');
      setTripEndKm('');
      setTripPurpose('');
      await fetchTrips(selectedVehicle.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hiba történt');
    } finally {
      setSaving(false);
    }
  };

  // Summary
  const totalDistance = (trips || []).reduce((sum, t) => sum + (t.distance ?? 0), 0);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title="Gépjármű nyilvántartás" subtitle="Járművek és futások" />
        <div className="animate-pulse space-y-4 mt-6">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-800 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <DashboardSectionHeader title="Gépjármű nyilvántartás" subtitle="Járművek és futások kezelése" />
        <button
          onClick={() => setModalOpen('vehicle')}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Új jármű
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicles list */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Járművek ({vehicles.length})</h3>
          {vehicles.map(v => (
            <div
              key={v.id}
              onClick={() => setSelectedVehicle(v)}
              className={`bg-gray-900 border rounded-xl p-4 cursor-pointer transition-colors ${
                selectedVehicle?.id === v.id ? 'border-amber-500' : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-900/30 rounded-lg">
                  <Car className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{v.plateNumber}</p>
                  <p className="text-xs text-gray-500">
                    {v.vehicleName ?? VEHICLE_TYPES.find(t => t.value === v.vehicleType)?.label ?? 'Jármű'}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {vehicles.length === 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
              <Car className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-gray-500 text-sm">Nincs jármű</p>
            </div>
          )}
        </div>

        {/* Vehicle details + trips */}
        <div className="lg:col-span-2">
          {selectedVehicle ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedVehicle.plateNumber}</h3>
                  <p className="text-sm text-gray-500">{selectedVehicle.vehicleName}</p>
                </div>
                <button
                  onClick={() => setModalOpen('trip')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm"
                >
                  <Route className="w-4 h-4" /> Új futás
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-950 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Összes futás</p>
                  <p className="text-lg font-bold text-white">{trips.length}</p>
                </div>
                <div className="bg-gray-950 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Összes km</p>
                  <p className="text-lg font-bold text-white">{totalDistance.toLocaleString()}</p>
                </div>
              </div>

              {/* Trips table */}
              <h4 className="text-sm font-medium text-gray-400 mb-2">Utolsó futások</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-gray-500 text-xs">
                    <tr>
                      <th className="text-left py-2">Dátum</th>
                      <th className="text-left py-2">Sofőr</th>
                      <th className="text-right py-2">Km</th>
                      <th className="text-left py-2">Cél</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {trips.map(t => (
                      <tr key={t.id}>
                        <td className="py-2 text-gray-300">{t.tripDate}</td>
                        <td className="py-2 text-gray-300">{t.driverName ?? '-'}</td>
                        <td className="py-2 text-right text-gray-300">{t.distance ?? '-'}</td>
                        <td className="py-2 text-gray-500 text-xs truncate max-w-xs">{t.purpose ?? '-'}</td>
                      </tr>
                    ))}
                    {trips.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-gray-500">Nincs futás</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center h-full flex items-center justify-center">
              <div>
                <Car className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400">Válassz egy járművet a részletekhez</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vehicle Modal */}
      {modalOpen === 'vehicle' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Új jármű</h3>
              <button onClick={() => setModalOpen(null)} className="p-1 hover:bg-gray-800 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Rendszám *</label>
                <input type="text" value={formPlate} onChange={e => setFormPlate(e.target.value.toUpperCase())} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Megnevezés</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Típus</label>
                <select value={formType} onChange={e => setFormType(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                  {VEHICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(null)} className="px-4 py-2 text-gray-400 text-sm">Mégse</button>
              <button onClick={handleSaveVehicle} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Check className="w-4 h-4" />{saving ? 'Mentés...' : 'Mentés'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trip Modal */}
      {modalOpen === 'trip' && selectedVehicle && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Új futás — {selectedVehicle.plateNumber}</h3>
              <button onClick={() => setModalOpen(null)} className="p-1 hover:bg-gray-800 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Dátum</label>
                  <input type="date" value={tripDate} onChange={e => setTripDate(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Sofőr</label>
                  <input type="text" value={tripDriver} onChange={e => setTripDriver(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Kezdő km</label>
                  <input type="number" value={tripStartKm} onChange={e => setTripStartKm(e.target.value ? parseInt(e.target.value) : '')} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Záró km</label>
                  <input type="number" value={tripEndKm} onChange={e => setTripEndKm(e.target.value ? parseInt(e.target.value) : '')} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Úticél / Megjegyzés</label>
                <input type="text" value={tripPurpose} onChange={e => setTripPurpose(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
            </div>
            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(null)} className="px-4 py-2 text-gray-400 text-sm">Mégse</button>
              <button onClick={handleSaveTrip} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Check className="w-4 h-4" />{saving ? 'Mentés...' : 'Mentés'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
