'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { ExportButton } from '@/components/core/ExportButton';
import { useTranslation } from '@/hooks/useTranslation';
import { getErrorMessage } from '@/lib/translate-error';
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

interface FleetRefuel {
  id: number;
  refuelDate: string;
  amount: number | null;
  cost: number | null;
  kmAtRefuel: number | null;
  fuelType: string | null;
}

const VEHICLE_TYPES = [
  { value: 'car', labelKey: 'fleet.type_car' },
  { value: 'van', labelKey: 'fleet.type_van' },
  { value: 'truck', labelKey: 'fleet.type_truck' },
  { value: 'forklift', labelKey: 'fleet.type_forklift' },
  { value: 'other', labelKey: 'fleet.type_other' },
];

export default function FleetDashboardPage() {
  const { t } = useTranslation();
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null);
  const [trips, setTrips] = useState<FleetTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'trips' | 'refuels'>('trips');
  const [refuels, setRefuels] = useState<FleetRefuel[]>([]);
  const [modalOpen, setModalOpen] = useState<'vehicle' | 'trip' | 'refuel' | null>(null);

  // Refuel form
  const [refDate, setRefDate] = useState(new Date().toISOString().split('T')[0]);
  const [refAmount, setRefAmount] = useState<number | ''>('');
  const [refCost, setRefCost] = useState<number | ''>('');
  const [refKm, setRefKm] = useState<number | ''>('');
  const [refFuelType, setRefFuelType] = useState('diesel');
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

  const fetchRefuels = useCallback(async (vehicleId: number) => {
    try {
      const res = await fetch(`/api/modules/fleet/refuels?vehicleId=${vehicleId}`);
      if (res.ok) {
        const json = await res.json() as { refuels: FleetRefuel[] };
        setRefuels(json.refuels);
      }
    } catch {
      setRefuels([]);
    }
  }, []);

  useEffect(() => {
    if (selectedVehicle) {
      void fetchTrips(selectedVehicle.id);
      void fetchRefuels(selectedVehicle.id);
    }
  }, [selectedVehicle, fetchTrips, fetchRefuels]);

  const getCsrfToken = () => {
    return document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';
  };

  const handleSaveVehicle = async () => {
    if (!formPlate.trim()) {
      setError(t('fleet.plate_required'));
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
      if (!res.ok) throw new Error(body.error ?? t('common.error'));

      setModalOpen(null);
      setFormPlate('');
      setFormName('');
      setFormType('car');
      await fetchVehicles();
    } catch (e) {
      setError(getErrorMessage(e, t));
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
      if (!res.ok) throw new Error(body.error ?? t('common.error'));

      setModalOpen(null);
      setTripDate(new Date().toISOString().split('T')[0]);
      setTripDriver('');
      setTripStartKm('');
      setTripEndKm('');
      setTripPurpose('');
      await fetchTrips(selectedVehicle.id);
    } catch (e) {
      setError(getErrorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRefuel = async () => {
    if (!selectedVehicle) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/modules/fleet/refuels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({
          vehicleId: selectedVehicle.id,
          refuelDate: refDate,
          amount: refAmount !== '' ? refAmount : undefined,
          cost: refCost !== '' ? refCost : undefined,
          kmAtRefuel: refKm !== '' ? refKm : undefined,
          fuelType: refFuelType || undefined,
        }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? t('common.error'));
      setModalOpen(null);
      setRefDate(new Date().toISOString().split('T')[0]);
      setRefAmount('');
      setRefCost('');
      setRefKm('');
      await fetchRefuels(selectedVehicle.id);
    } catch (e) {
      setError(getErrorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  // Summary
  const totalDistance = (trips || []).reduce((sum, t) => sum + (t.distance ?? 0), 0);
  const totalFuelCost = (refuels || []).reduce((sum, r) => sum + (r.cost ?? 0), 0);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title={t('fleet.title')} subtitle={t('fleet.subtitle')} />
        <div className="animate-pulse space-y-4 mt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-800 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <DashboardSectionHeader title={t('fleet.title')} subtitle={t('fleet.subtitle')} />
        <div className="flex items-center gap-2">
          <ExportButton moduleId="fleet" table="fleet_trips" />
          <button
            onClick={() => setModalOpen('vehicle')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> {t('fleet.new_vehicle')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vehicles list */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-400 mb-2">{t('fleet.vehicles')} ({vehicles.length})</h3>
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
                    {v.vehicleName ?? (VEHICLE_TYPES.find(vt => vt.value === v.vehicleType) ? t(VEHICLE_TYPES.find(vt => vt.value === v.vehicleType)!.labelKey) : t('fleet.vehicle'))}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {vehicles.length === 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
              <Car className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-gray-500 text-sm">{t('fleet.no_vehicles')}</p>
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
                  onClick={() => setModalOpen(tab === 'trips' ? 'trip' : 'refuel')}
                  className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm"
                >
                  {tab === 'trips' ? <Route className="w-4 h-4" /> : <Fuel className="w-4 h-4" />}
                  {tab === 'trips' ? t('fleet.new_trip') : t('fleet.new_refuel')}
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-950 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{t('fleet.total_trips')}</p>
                  <p className="text-lg font-bold text-white">{trips.length}</p>
                </div>
                <div className="bg-gray-950 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{t('fleet.total_km')}</p>
                  <p className="text-lg font-bold text-white">{totalDistance.toLocaleString()}</p>
                </div>
                <div className="bg-gray-950 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{t('fleet.fuel_cost')}</p>
                  <p className="text-lg font-bold text-white">{totalFuelCost.toLocaleString()}</p>
                </div>
              </div>

              {/* Tab toggle */}
              <div className="flex gap-2 mb-4">
                <button onClick={() => setTab('trips')} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${tab === 'trips' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                  <Route className="w-3 h-3 inline mr-1" />{t('fleet.trips')}
                </button>
                <button onClick={() => setTab('refuels')} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${tab === 'refuels' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                  <Fuel className="w-3 h-3 inline mr-1" />{t('fleet.refuels')}
                </button>
              </div>

              {/* Trips table */}
              {tab === 'trips' && <h4 className="text-sm font-medium text-gray-400 mb-2">{t('fleet.recent_trips')}</h4>}
              {tab === 'trips' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-gray-500 text-xs">
                    <tr>
                      <th className="text-left px-3 py-2 whitespace-nowrap">{t('fleet.date')}</th>
                      <th className="text-left px-3 py-2 whitespace-nowrap">{t('fleet.driver')}</th>
                      <th className="text-right px-3 py-2 whitespace-nowrap">{t('fleet.km')}</th>
                      <th className="text-left px-3 py-2 whitespace-nowrap">{t('fleet.destination')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {trips.map(tr => (
                      <tr key={tr.id}>
                        <td className="px-3 py-2 text-gray-300">{tr.tripDate}</td>
                        <td className="px-3 py-2 text-gray-300">{tr.driverName ?? '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-300">{tr.distance ?? '-'}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs truncate max-w-xs">{tr.purpose ?? '-'}</td>
                      </tr>
                    ))}
                    {trips.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-gray-500">{t('fleet.no_trips')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              )}

              {/* Refuels table */}
              {tab === 'refuels' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-gray-500 text-xs">
                    <tr>
                      <th className="text-left px-3 py-2 whitespace-nowrap">{t('fleet.date')}</th>
                      <th className="text-right px-3 py-2 whitespace-nowrap">{t('fleet.amount_l')}</th>
                      <th className="text-right px-3 py-2 whitespace-nowrap">{t('fleet.cost')}</th>
                      <th className="text-right px-3 py-2 whitespace-nowrap">{t('fleet.km')}</th>
                      <th className="text-left px-3 py-2 whitespace-nowrap">{t('fleet.fuel_type')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {refuels.map(r => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 text-gray-300">{r.refuelDate}</td>
                        <td className="px-3 py-2 text-right text-gray-300">{r.amount ?? '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-300">{r.cost != null ? r.cost.toLocaleString() : '-'}</td>
                        <td className="px-3 py-2 text-right text-gray-300">{r.kmAtRefuel ?? '-'}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{r.fuelType ?? '-'}</td>
                      </tr>
                    ))}
                    {refuels.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-gray-500">{t('fleet.no_refuels')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center h-full flex items-center justify-center">
              <div>
                <Car className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p className="text-gray-400">{t('fleet.select_vehicle')}</p>
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
              <h3 className="text-lg font-medium text-white">{t('fleet.new_vehicle')}</h3>
              <button onClick={() => setModalOpen(null)} className="p-1 hover:bg-gray-800 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('fleet.plate')} *</label>
                <input type="text" value={formPlate} onChange={e => setFormPlate(e.target.value.toUpperCase())} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('fleet.name')}</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('fleet.type')}</label>
                <select value={formType} onChange={e => setFormType(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                  {VEHICLE_TYPES.map(vt => <option key={vt.value} value={vt.value}>{t(vt.labelKey)}</option>)}
                </select>
              </div>
            </div>
            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(null)} className="px-4 py-2 text-gray-400 text-sm">{t('common.cancel')}</button>
              <button onClick={handleSaveVehicle} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Check className="w-4 h-4" />{saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refuel Modal */}
      {modalOpen === 'refuel' && selectedVehicle && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">{t('fleet.new_refuel')} — {selectedVehicle.plateNumber}</h3>
              <button onClick={() => setModalOpen(null)} className="p-1 hover:bg-gray-800 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('fleet.date')}</label>
                  <input type="date" value={refDate} onChange={e => setRefDate(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('fleet.fuel_type')}</label>
                  <select value={refFuelType} onChange={e => setRefFuelType(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100">
                    <option value="diesel">Diesel</option>
                    <option value="benzin">Benzin</option>
                    <option value="lpg">LPG</option>
                    <option value="electric">Elektromos</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('fleet.amount_l')}</label>
                  <input type="number" step="0.1" value={refAmount} onChange={e => setRefAmount(e.target.value ? parseFloat(e.target.value) : '')} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('fleet.cost')}</label>
                  <input type="number" step="1" value={refCost} onChange={e => setRefCost(e.target.value ? parseFloat(e.target.value) : '')} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('fleet.km')}</label>
                  <input type="number" value={refKm} onChange={e => setRefKm(e.target.value ? parseInt(e.target.value) : '')} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
            </div>
            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(null)} className="px-4 py-2 text-gray-400 text-sm">{t('common.cancel')}</button>
              <button onClick={handleSaveRefuel} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Check className="w-4 h-4" />{saving ? t('common.saving') : t('common.save')}
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
              <h3 className="text-lg font-medium text-white">{t('fleet.new_trip')} — {selectedVehicle.plateNumber}</h3>
              <button onClick={() => setModalOpen(null)} className="p-1 hover:bg-gray-800 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('fleet.date')}</label>
                  <input type="date" value={tripDate} onChange={e => setTripDate(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('fleet.driver')}</label>
                  <input type="text" value={tripDriver} onChange={e => setTripDriver(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('fleet.start_km')}</label>
                  <input type="number" value={tripStartKm} onChange={e => setTripStartKm(e.target.value ? parseInt(e.target.value) : '')} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('fleet.end_km')}</label>
                  <input type="number" value={tripEndKm} onChange={e => setTripEndKm(e.target.value ? parseInt(e.target.value) : '')} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('fleet.destination')}</label>
                <input type="text" value={tripPurpose} onChange={e => setTripPurpose(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
            </div>
            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(null)} className="px-4 py-2 text-gray-400 text-sm">{t('common.cancel')}</button>
              <button onClick={handleSaveTrip} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Check className="w-4 h-4" />{saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
