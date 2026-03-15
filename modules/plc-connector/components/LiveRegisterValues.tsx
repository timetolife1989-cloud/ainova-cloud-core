'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Activity, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface RegisterValue {
  registerId: number;
  registerAddress: string;
  registerName: string;
  dataType: string;
  unit: string | null;
  value: number | string | null;
  timestamp: string | null;
}

interface Props {
  deviceId: number;
  deviceName: string;
}

export default function LiveRegisterValues({ deviceId, deviceName }: Props) {
  const { t } = useTranslation();
  const [values, setValues] = useState<RegisterValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchValues = async () => {
    try {
      const res = await fetch(`/api/modules/plc-connector/live?deviceId=${deviceId}`);
      if (res.ok) {
        const json = await res.json() as { values?: RegisterValue[] };
        setValues(json.values ?? []);
        setConnected(true);
      } else {
        setConnected(false);
      }
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchValues();
    intervalRef.current = setInterval(() => void fetchValues(), 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [deviceId]);

  if (loading) {
    return <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 animate-pulse h-48" />;
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-400">{t('plc.live_values')}</h3>
          <span className="text-xs text-gray-500">{deviceName}</span>
          {connected ? (
            <span className="flex items-center gap-1 text-[10px] text-green-400">
              <Wifi className="w-3 h-3" /> {t('plc.connected')}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-red-400">
              <WifiOff className="w-3 h-3" /> {t('plc.disconnected')}
            </span>
          )}
        </div>
        <button onClick={() => void fetchValues()} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {values.length === 0 ? (
        <div className="text-center py-8">
          <Activity className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p className="text-gray-500 text-sm">{t('plc.no_live_data')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {values.map(v => (
            <div key={v.registerId} className="bg-gray-950 border border-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 font-mono">{v.registerAddress}</span>
                <span className="text-[10px] text-gray-600">{v.dataType}</span>
              </div>
              <p className="text-xs text-gray-400 mb-1 truncate">{v.registerName}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-cyan-400">
                  {v.value != null ? String(v.value) : '-'}
                </span>
                {v.unit && <span className="text-xs text-gray-500">{v.unit}</span>}
              </div>
              {v.timestamp && (
                <p className="text-[10px] text-gray-600 mt-1">
                  {new Date(v.timestamp).toLocaleTimeString('hu-HU')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
