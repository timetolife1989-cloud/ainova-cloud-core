'use client';

import { useState, useEffect } from 'react';
import { Clock, ArrowRight, X } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface TimelineEntry {
  id: number;
  oldStatus: string | null;
  newStatus: string;
  changedBy: string | null;
  note: string | null;
  createdAt: string;
}

interface Props {
  itemId: number;
  itemTitle: string;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  'Nyitott': 'bg-gray-600',
  'Folyamatban': 'bg-blue-600',
  'Kész': 'bg-green-600',
  'Lezárt': 'bg-gray-500',
};

export default function TimelinePanel({ itemId, itemTitle, onClose }: Props) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/modules/tracking/timeline?itemId=${itemId}`);
        if (res.ok) {
          const json = await res.json() as { timeline?: TimelineEntry[] };
          setEntries(json.timeline ?? []);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [itemId]);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('hu-HU', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-white">{t('tracking.timeline')}</h3>
            <p className="text-xs text-gray-500">{itemTitle}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-800 rounded-lg animate-pulse" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-10 h-10 mx-auto mb-2 text-gray-600" />
            <p className="text-gray-400 text-sm">{t('tracking.no_history')}</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-700" />
            <div className="space-y-4">
              {entries.map((entry, idx) => (
                <div key={entry.id} className="relative pl-10">
                  <div className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-gray-900 ${STATUS_COLORS[entry.newStatus] ?? 'bg-gray-500'}`} />
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm">
                      {entry.oldStatus ? (
                        <>
                          <span className="text-gray-400">{entry.oldStatus}</span>
                          <ArrowRight className="w-3 h-3 text-gray-600" />
                          <span className="text-white font-medium">{entry.newStatus}</span>
                        </>
                      ) : (
                        <span className="text-white font-medium">{entry.newStatus}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span>{formatDate(entry.createdAt)}</span>
                      {entry.changedBy && <span>• {entry.changedBy}</span>}
                    </div>
                    {entry.note && <p className="mt-1 text-xs text-gray-400">{entry.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
