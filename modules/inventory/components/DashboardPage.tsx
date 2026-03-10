'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { Package, Plus, X, Check, AlertTriangle, ArrowDown, ArrowUp, AlertCircle } from 'lucide-react';

interface InventoryItem {
  id: number;
  sku: string;
  itemName: string;
  category: string | null;
  currentQty: number;
  minQty: number;
  maxQty: number | null;
  unitName: string | null;
  location: string | null;
  isLowStock: boolean;
}

export default function InventoryDashboardPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState<'item' | 'movement' | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Item form
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formMinQty, setFormMinQty] = useState(0);
  const [formLocation, setFormLocation] = useState('');

  // Movement form
  const [movType, setMovType] = useState<'in' | 'out'>('in');
  const [movQty, setMovQty] = useState(0);
  const [movRef, setMovRef] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/inventory/data');
      if (res.ok) {
        const json = await res.json() as { items: InventoryItem[] };
        setItems(json.items.map(i => ({ ...i, isLowStock: i.currentQty <= i.minQty })));
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const getCsrfToken = () => document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

  const handleSaveItem = async () => {
    if (!formSku.trim() || !formName.trim()) { setError('SKU és név kötelező'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/modules/inventory/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ sku: formSku, itemName: formName, category: formCategory || undefined, minQty: formMinQty, location: formLocation || undefined }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Hiba');
      setModalOpen(null);
      setFormSku(''); setFormName(''); setFormCategory(''); setFormMinQty(0); setFormLocation('');
      await fetchData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Hiba'); }
    finally { setSaving(false); }
  };

  const handleSaveMovement = async () => {
    if (!selectedItem || movQty <= 0) { setError('Mennyiség kötelező'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/modules/inventory/data/${selectedItem.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ movementType: movType, quantity: movQty, reference: movRef || undefined }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? 'Hiba');
      setModalOpen(null); setSelectedItem(null); setMovQty(0); setMovRef('');
      await fetchData();
    } catch (e) { setError(e instanceof Error ? e.message : 'Hiba'); }
    finally { setSaving(false); }
  };

  const openMovement = (item: InventoryItem, type: 'in' | 'out') => {
    setSelectedItem(item);
    setMovType(type);
    setMovQty(0);
    setMovRef('');
    setError(null);
    setModalOpen('movement');
  };

  // Summary
  const totalItems = items.length;
  const lowStockCount = items.filter(i => i.isLowStock).length;
  const totalValue = items.reduce((sum, i) => sum + i.currentQty, 0);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title="Készletnyilvántartás" subtitle="Termékek és mozgások" />
        <div className="animate-pulse mt-6 grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <DashboardSectionHeader title="Készletnyilvántartás" subtitle="Termékek és mozgások" />
        <button onClick={() => { setError(null); setModalOpen('item'); }} className="flex items-center gap-2 px-4 py-2 bg-lime-600 hover:bg-lime-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Új termék
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-lime-900/30 rounded-lg"><Package className="w-5 h-5 text-lime-400" /></div>
            <div><p className="text-xs text-gray-500">Termékek</p><p className="text-2xl font-bold text-white">{totalItems}</p></div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-900/30 rounded-lg"><AlertCircle className="w-5 h-5 text-red-400" /></div>
            <div><p className="text-xs text-gray-500">Alacsony készlet</p><p className="text-2xl font-bold text-white">{lowStockCount}</p></div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/30 rounded-lg"><Package className="w-5 h-5 text-blue-400" /></div>
            <div><p className="text-xs text-gray-500">Össz. mennyiség</p><p className="text-2xl font-bold text-white">{totalValue.toLocaleString()}</p></div>
          </div>
        </div>
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className={`bg-gray-900 border rounded-xl p-4 ${item.isLowStock ? 'border-red-800' : 'border-gray-800'}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-xs text-gray-500 font-mono">{item.sku}</p>
                <p className="text-white font-medium">{item.itemName}</p>
                {item.category && <p className="text-xs text-gray-500">{item.category}</p>}
              </div>
              {item.isLowStock && <AlertCircle className="w-5 h-5 text-red-400" />}
            </div>
            <div className="flex items-center justify-between mt-3">
              <div>
                <p className="text-2xl font-bold text-white">{item.currentQty}</p>
                <p className="text-xs text-gray-500">Min: {item.minQty}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openMovement(item, 'in')} className="p-2 bg-green-900/30 hover:bg-green-900/50 rounded-lg" title="Bevét">
                  <ArrowDown className="w-4 h-4 text-green-400" />
                </button>
                <button onClick={() => openMovement(item, 'out')} className="p-2 bg-red-900/30 hover:bg-red-900/50 rounded-lg" title="Kiadás">
                  <ArrowUp className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-3 bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">Nincs termék</p>
          </div>
        )}
      </div>

      {/* Item Modal */}
      {modalOpen === 'item' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Új termék</h3>
              <button onClick={() => setModalOpen(null)} className="p-1 hover:bg-gray-800 rounded"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-400 mb-1">SKU *</label><input type="text" value={formSku} onChange={e => setFormSku(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
                <div><label className="block text-xs font-medium text-gray-400 mb-1">Min. készlet</label><input type="number" value={formMinQty} onChange={e => setFormMinQty(parseInt(e.target.value) || 0)} min={0} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-400 mb-1">Név *</label><input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-gray-400 mb-1">Kategória</label><input type="text" value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
                <div><label className="block text-xs font-medium text-gray-400 mb-1">Hely</label><input type="text" value={formLocation} onChange={e => setFormLocation(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              </div>
            </div>
            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(null)} className="px-4 py-2 text-gray-400 text-sm">Mégse</button>
              <button onClick={handleSaveItem} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-lime-600 hover:bg-lime-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"><Check className="w-4 h-4" />{saving ? 'Mentés...' : 'Mentés'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Movement Modal */}
      {modalOpen === 'movement' && selectedItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">{movType === 'in' ? 'Bevételezés' : 'Kiadás'}</h3>
              <button onClick={() => setModalOpen(null)} className="p-1 hover:bg-gray-800 rounded"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-sm text-gray-400 mb-4">{selectedItem.itemName} ({selectedItem.sku})</p>
            <div className="space-y-4">
              <div><label className="block text-xs font-medium text-gray-400 mb-1">Mennyiség *</label><input type="number" value={movQty} onChange={e => setMovQty(parseInt(e.target.value) || 0)} min={1} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
              <div><label className="block text-xs font-medium text-gray-400 mb-1">Hivatkozás</label><input type="text" value={movRef} onChange={e => setMovRef(e.target.value)} placeholder="pl. rendelés szám" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" /></div>
            </div>
            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(null)} className="px-4 py-2 text-gray-400 text-sm">Mégse</button>
              <button onClick={handleSaveMovement} disabled={saving} className={`flex items-center gap-2 px-4 py-2 ${movType === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-white rounded-lg text-sm font-medium disabled:opacity-50`}>
                {movType === 'in' ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4" />}
                {saving ? 'Mentés...' : movType === 'in' ? 'Bevét' : 'Kiadás'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
