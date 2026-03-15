'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import RegisterManager from './RegisterManager';
import LiveRegisterValues from './LiveRegisterValues';

interface PlcDevice {
  id: number;
  name: string;
  protocol: string;
  ipAddress: string;
  port: number;
  rack: number | null;
  slot: number | null;
  isActive: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

export default function PlcConnectorDashboardPage() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<PlcDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', protocol: 's7', ipAddress: '', port: 102, rack: 0, slot: 1 });
  const [error, setError] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<PlcDevice | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/plc-connector/data');
      if (res.ok) {
        const data = await res.json();
        setDevices(data.items ?? []);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const handleSave = async () => {
    setError('');
    try {
      const csrfRes = await fetch('/api/csrf');
      const { token } = await csrfRes.json();
      const res = await fetch('/api/modules/plc-connector/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ name: '', protocol: 's7', ipAddress: '', port: 102, rack: 0, slot: 1 });
        fetchDevices();
      } else {
        const err = await res.json();
        setError(err.error ?? t('plc.error_occurred'));
      }
    } catch { setError(t('plc.network_error')); }
  };

  const online = devices.filter(d => d.isActive).length;
  const offline = devices.filter(d => !d.isActive).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('plc.title')}</h1>
          <p className="text-gray-400 text-sm">{t('plc.subtitle')}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors">
          {t('plc.new_device')}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">{t('plc.total_devices')}</p>
          <p className="text-2xl font-bold text-white">{devices.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">{t('plc.online')}</p>
          <p className="text-2xl font-bold text-green-400">{online}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-1">{t('plc.offline')}</p>
          <p className="text-2xl font-bold text-red-400">{offline}</p>
        </div>
      </div>

      {/* Device list */}
      {loading ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">{t('plc.loading')}</div>
      ) : devices.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
          {t('plc.no_devices')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map(d => (
            <div key={d.id} onClick={() => setSelectedDevice(d)} className={`bg-gray-900 border rounded-xl p-5 cursor-pointer transition-colors ${selectedDevice?.id === d.id ? 'border-green-500' : 'border-gray-800 hover:border-green-500/50'}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">{d.name}</h3>
                <span className={`w-3 h-3 rounded-full ${d.isActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              </div>
              <div className="space-y-1 text-sm text-gray-400">
                <p>{t('plc.protocol')}: <span className="text-gray-300">{d.protocol.toUpperCase()}</span></p>
                <p>{t('plc.ip')}: <span className="text-gray-300">{d.ipAddress}:{d.port}</span></p>
                {d.rack !== null && <p>{t('plc.rack_slot')}: <span className="text-gray-300">{d.rack}/{d.slot}</span></p>}
                {d.lastSeenAt && <p>{t('plc.last_activity')}: <span className="text-gray-300">{new Date(d.lastSeenAt).toLocaleString()}</span></p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected device — Register config + Live values */}
      {selectedDevice && (
        <div className="mt-6 space-y-6">
          <RegisterManager deviceId={selectedDevice.id} deviceName={selectedDevice.name} />
          <LiveRegisterValues deviceId={selectedDevice.id} deviceName={selectedDevice.name} />
        </div>
      )}

      {/* Add device modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">{t('plc.new_plc_device')}</h2>
            {error && <div className="bg-red-900/30 text-red-400 p-2 rounded mb-3 text-sm">{error}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('plc.name')}</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('plc.protocol')}</label>
                <select value={form.protocol} onChange={e => setForm(f => ({ ...f, protocol: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="s7">Siemens S7</option>
                  <option value="modbus">Modbus TCP</option>
                  <option value="mqtt">MQTT</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('plc.ip_address')}</label>
                  <input value={form.ipAddress} onChange={e => setForm(f => ({ ...f, ipAddress: e.target.value }))} placeholder="192.168.1.100" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('plc.port')}</label>
                  <input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: parseInt(e.target.value) || 102 }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('plc.rack')}</label>
                  <input type="number" value={form.rack} onChange={e => setForm(f => ({ ...f, rack: parseInt(e.target.value) || 0 }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('plc.slot')}</label>
                  <input type="number" value={form.slot} onChange={e => setForm(f => ({ ...f, slot: parseInt(e.target.value) || 1 }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm">{t('plc.cancel')}</button>
              <button onClick={handleSave} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium">{t('plc.save')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
