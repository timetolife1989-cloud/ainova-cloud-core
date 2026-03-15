'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { ExportButton } from '@/components/core/ExportButton';
import { useTranslation } from '@/hooks/useTranslation';
import { FileText, Plus, X, Check, AlertTriangle, Ban, CreditCard, Search, Users, Printer } from 'lucide-react';
import InvoiceEditor from './InvoiceEditor';
import CustomerManager from './CustomerManager';

// ── Types ──

interface Invoice {
  id: number;
  invoiceNumber: string;
  invoiceType: string;
  customerId: number | null;
  customerName: string;
  customerTaxNumber: string | null;
  issueDate: string;
  dueDate: string;
  paymentMethod: string;
  grossTotal: number;
  status: string;
  navStatus: string;
  createdAt: string;
}

type ViewMode = 'list' | 'create' | 'customers';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-700 text-gray-300',
  issued: 'bg-blue-900/60 text-blue-300',
  paid: 'bg-green-900/60 text-green-300',
  storno: 'bg-red-900/60 text-red-300',
};

const TYPE_LABELS: Record<string, string> = {
  normal: 'Számla',
  storno: 'Sztornó',
  advance: 'Előleg',
  proforma: 'Díjbekérő',
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Készpénz',
  card: 'Bankkártya',
  transfer: 'Átutalás',
};

export default function InvoicingDashboardPage() {
  const { t } = useTranslation();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (searchQuery) params.set('search', searchQuery);
      const res = await fetch(`/api/modules/invoicing/data?${params}`);
      if (res.ok) {
        const json = await res.json() as { invoices: Invoice[] };
        setInvoices(json.invoices);
      }
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchQuery]);

  useEffect(() => { void fetchInvoices(); }, [fetchInvoices]);

  const getCsrfToken = () => document.cookie.split('; ').find(c => c.startsWith('csrf-token='))?.split('=')[1] ?? '';

  const handleAction = async (invoiceId: number, action: 'issue' | 'mark_paid' | 'storno') => {
    setActionLoading(invoiceId);
    setError(null);
    try {
      const res = await fetch(`/api/modules/invoicing/data/${invoiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ action }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? t('common.error'));
      document.dispatchEvent(new Event('hud-led-success'));
      await fetchInvoices();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.error'));
      document.dispatchEvent(new Event('hud-led-error'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleInvoiceCreated = () => {
    setViewMode('list');
    void fetchInvoices();
    document.dispatchEvent(new Event('hud-led-success'));
  };

  // Summary stats
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTotal = invoices
    .filter(i => i.issueDate === todayStr && i.status !== 'storno' && i.invoiceType !== 'storno')
    .reduce((sum, i) => sum + i.grossTotal, 0);
  const issuedCount = invoices.filter(i => i.status === 'issued').length;
  const totalGross = invoices
    .filter(i => i.status !== 'storno' && i.invoiceType !== 'storno')
    .reduce((sum, i) => sum + i.grossTotal, 0);

  // ── Create / Customers view ──
  if (viewMode === 'create') {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <DashboardSectionHeader title={t('invoicing.new_invoice')} subtitle={t('invoicing.new_invoice_desc')} />
          <button onClick={() => setViewMode('list')} className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white text-sm">
            <X className="w-4 h-4" /> {t('common.cancel')}
          </button>
        </div>
        <InvoiceEditor onSuccess={handleInvoiceCreated} onCancel={() => setViewMode('list')} />
      </div>
    );
  }

  if (viewMode === 'customers') {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <DashboardSectionHeader title={t('invoicing.customers')} subtitle={t('invoicing.customers_desc')} />
          <button onClick={() => setViewMode('list')} className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white text-sm">
            <X className="w-4 h-4" /> {t('common.back')}
          </button>
        </div>
        <CustomerManager />
      </div>
    );
  }

  // ── List view ──
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSectionHeader title={t('invoicing.title')} subtitle={t('invoicing.subtitle')} />
        <div className="animate-pulse mt-6 grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-800 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <DashboardSectionHeader title={t('invoicing.title')} subtitle={t('invoicing.subtitle')} />
        <div className="flex items-center gap-2">
          <ExportButton moduleId="invoicing" table="invoicing_invoices" />
          <button onClick={() => setViewMode('customers')} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium">
            <Users className="w-4 h-4" /> {t('invoicing.customers')}
          </button>
          <button onClick={() => setViewMode('create')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> {t('invoicing.new_invoice')}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-900/30 rounded-lg"><FileText className="w-5 h-5 text-emerald-400" /></div>
            <div><p className="text-xs text-gray-500">{t('invoicing.today_total')}</p><p className="text-2xl font-bold text-white">{todayTotal.toLocaleString('hu-HU')} Ft</p></div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/30 rounded-lg"><CreditCard className="w-5 h-5 text-blue-400" /></div>
            <div><p className="text-xs text-gray-500">{t('invoicing.open_invoices')}</p><p className="text-2xl font-bold text-white">{issuedCount}</p></div>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-900/30 rounded-lg"><FileText className="w-5 h-5 text-purple-400" /></div>
            <div><p className="text-xs text-gray-500">{t('invoicing.grand_total')}</p><p className="text-2xl font-bold text-white">{totalGross.toLocaleString('hu-HU')} Ft</p></div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder={t('invoicing.search_placeholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-100"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
        >
          <option value="">{t('invoicing.all_statuses')}</option>
          <option value="draft">{t('invoicing.status_draft')}</option>
          <option value="issued">{t('invoicing.status_issued')}</option>
          <option value="paid">{t('invoicing.status_paid')}</option>
          <option value="storno">{t('invoicing.status_storno')}</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Invoice table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-gray-400">
                <th className="px-4 py-3 font-medium">{t('invoicing.col_number')}</th>
                <th className="px-4 py-3 font-medium">{t('invoicing.col_type')}</th>
                <th className="px-4 py-3 font-medium">{t('invoicing.col_customer')}</th>
                <th className="px-4 py-3 font-medium">{t('invoicing.col_date')}</th>
                <th className="px-4 py-3 font-medium">{t('invoicing.col_due')}</th>
                <th className="px-4 py-3 font-medium text-right">{t('invoicing.col_total')}</th>
                <th className="px-4 py-3 font-medium">{t('invoicing.col_payment')}</th>
                <th className="px-4 py-3 font-medium">{t('invoicing.col_status')}</th>
                <th className="px-4 py-3 font-medium text-right">{t('invoicing.col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3 font-mono text-gray-200">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-gray-400">{TYPE_LABELS[inv.invoiceType] ?? inv.invoiceType}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-200">{inv.customerName}</div>
                    {inv.customerTaxNumber && <div className="text-[11px] text-gray-500 font-mono">{inv.customerTaxNumber}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{inv.issueDate}</td>
                  <td className="px-4 py-3 text-gray-400">{inv.dueDate}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-200">{inv.grossTotal.toLocaleString('hu-HU')} Ft</td>
                  <td className="px-4 py-3 text-gray-400">{PAYMENT_LABELS[inv.paymentMethod] ?? inv.paymentMethod}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[inv.status] ?? 'bg-gray-700 text-gray-300'}`}>
                      {t(`invoicing.status_${inv.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {inv.status === 'draft' && (
                        <button
                          onClick={() => handleAction(inv.id, 'issue')}
                          disabled={actionLoading === inv.id}
                          className="p-1.5 bg-blue-900/30 hover:bg-blue-900/50 rounded text-blue-400 disabled:opacity-50"
                          title={t('invoicing.action_issue')}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(inv.status === 'issued' || inv.status === 'paid') && (
                        <button
                          onClick={() => window.open(`/api/modules/invoicing/data/${inv.id}/pdf`, '_blank')}
                          className="p-1.5 bg-emerald-900/30 hover:bg-emerald-900/50 rounded text-emerald-400"
                          title={t('invoicing.action_print')}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {inv.status === 'issued' && (
                        <>
                          <button
                            onClick={() => handleAction(inv.id, 'mark_paid')}
                            disabled={actionLoading === inv.id}
                            className="p-1.5 bg-green-900/30 hover:bg-green-900/50 rounded text-green-400 disabled:opacity-50"
                            title={t('invoicing.action_paid')}
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleAction(inv.id, 'storno')}
                            disabled={actionLoading === inv.id}
                            className="p-1.5 bg-red-900/30 hover:bg-red-900/50 rounded text-red-400 disabled:opacity-50"
                            title={t('invoicing.action_storno')}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {inv.status === 'paid' && (
                        <button
                          onClick={() => handleAction(inv.id, 'storno')}
                          disabled={actionLoading === inv.id}
                          className="p-1.5 bg-red-900/30 hover:bg-red-900/50 rounded text-red-400 disabled:opacity-50"
                          title={t('invoicing.action_storno')}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                    <p className="text-gray-400">{t('invoicing.no_invoices')}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
