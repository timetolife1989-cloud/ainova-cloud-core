'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { Plus, X, Check, AlertTriangle, Search, Pencil } from 'lucide-react';

interface Customer {
  id: number;
  customerName: string;
  taxNumber: string | null;
  euTaxNumber: string | null;
  addressZip: string | null;
  addressCity: string | null;
  addressStreet: string | null;
  addressCountry: string;
  email: string | null;
  phone: string | null;
  contactPerson: string | null;
  notes: string | null;
}

export default function CustomerManager() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formTaxNumber, setFormTaxNumber] = useState('');
  const [formZip, setFormZip] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formStreet, setFormStreet] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formContact, setFormContact] = useState('');

  const fetchCustomers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/modules/invoicing/data/customers?${params}`);
      if (res.ok) {
        const json = await res.json() as { customers: Customer[] };
        setCustomers(json.customers);
      }
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => { void fetchCustomers(); }, [fetchCustomers]);

  const getCsrfToken = () => document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

  const resetForm = () => {
    setFormName(''); setFormTaxNumber(''); setFormZip('');
    setFormCity(''); setFormStreet(''); setFormEmail('');
    setFormPhone(''); setFormContact('');
  };

  const handleSave = async () => {
    if (!formName.trim()) { setError(t('invoicing.error_customer_name')); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/modules/invoicing/data/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({
          customerName: formName,
          taxNumber: formTaxNumber || undefined,
          addressZip: formZip || undefined,
          addressCity: formCity || undefined,
          addressStreet: formStreet || undefined,
          email: formEmail || undefined,
          phone: formPhone || undefined,
          contactPerson: formContact || undefined,
        }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? t('common.error'));
      setModalOpen(false);
      resetForm();
      await fetchCustomers();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Search + Add */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder={t('invoicing.search_customer')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-100"
          />
        </div>
        <button onClick={() => { setError(null); resetForm(); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> {t('invoicing.new_customer')}
        </button>
      </div>

      {/* Customer list */}
      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-800 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map(c => (
            <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-gray-200 font-medium">{c.customerName}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  {c.taxNumber && <span className="font-mono">{c.taxNumber}</span>}
                  {c.addressCity && <span>{c.addressZip} {c.addressCity}, {c.addressStreet}</span>}
                  {c.email && <span>{c.email}</span>}
                  {c.phone && <span>{c.phone}</span>}
                </div>
              </div>
            </div>
          ))}
          {customers.length === 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-400">{t('invoicing.no_customers')}</p>
            </div>
          )}
        </div>
      )}

      {/* New customer modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">{t('invoicing.new_customer')}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 hover:bg-gray-800 rounded"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('invoicing.customer_name')} *</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('invoicing.tax_number')}</label>
                  <input type="text" value={formTaxNumber} onChange={e => setFormTaxNumber(e.target.value)} placeholder="12345678-1-12" className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('invoicing.email')}</label>
                  <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('invoicing.zip')}</label>
                  <input type="text" value={formZip} onChange={e => setFormZip(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('invoicing.city')}</label>
                  <input type="text" value={formCity} onChange={e => setFormCity(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{t('invoicing.phone')}</label>
                  <input type="text" value={formPhone} onChange={e => setFormPhone(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('invoicing.street')}</label>
                <input type="text" value={formStreet} onChange={e => setFormStreet(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">{t('invoicing.contact_person')}</label>
                <input type="text" value={formContact} onChange={e => setFormContact(e.target.value)} className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100" />
              </div>
            </div>
            {error && <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-400 text-sm">{t('common.cancel')}</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Check className="w-4 h-4" /> {saving ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
