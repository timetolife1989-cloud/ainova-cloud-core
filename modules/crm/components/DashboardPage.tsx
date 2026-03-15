'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Phone, Mail, Building2, User, TrendingUp, Bell, X, MessageSquare } from 'lucide-react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { useTranslation } from '@/hooks/useTranslation';

interface Customer {
  id: number;
  name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  customer_type: string;
  source: string | null;
}

interface Opportunity {
  id: number;
  customer_id: number;
  customer_name: string;
  title: string;
  stage: string;
  value: number | null;
  currency: string;
  probability: number;
  assigned_to_name: string | null;
}

interface Reminder {
  id: number;
  customer_name: string | null;
  title: string;
  due_date: string;
}

const STAGES = ['lead', 'proposal', 'negotiation', 'won', 'lost'] as const;
const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-gray-600',
  proposal: 'bg-blue-600',
  negotiation: 'bg-amber-600',
  won: 'bg-emerald-600',
  lost: 'bg-red-600',
};

function getCsrf(): string {
  const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return m ? decodeURIComponent(m[1]) : '';
}

function fmt(n: number): string {
  return new Intl.NumberFormat().format(Math.round(n));
}

export default function CRMDashboardPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'customers' | 'pipeline' | 'reminders'>('customers');
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewOpp, setShowNewOpp] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [customerDetail, setCustomerDetail] = useState<{
    customer: Record<string, unknown>;
    interactions: Array<Record<string, unknown>>;
    opportunities: Array<Record<string, unknown>>;
  } | null>(null);

  // Form state
  const [newCust, setNewCust] = useState({ name: '', companyName: '', email: '', phone: '', city: '', customerType: 'company' as const });
  const [newOpp, setNewOpp] = useState({ customerId: 0, title: '', value: '', probability: 50 });
  const [newInteraction, setNewInteraction] = useState({ type: 'call' as 'call' | 'meeting' | 'email' | 'note', subject: '', description: '' });
  const [showNewInteraction, setShowNewInteraction] = useState(false);

  // Load customers
  const loadCustomers = useCallback(async () => {
    try {
      const url = search ? `/api/modules/crm/customers?q=${encodeURIComponent(search)}` : '/api/modules/crm/customers';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers ?? []);
      }
    } catch { /* ignore */ }
  }, [search]);

  useEffect(() => { if (tab === 'customers') loadCustomers(); }, [tab, loadCustomers]);

  // Load opportunities
  const loadOpps = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/crm/opportunities');
      if (res.ok) {
        const data = await res.json();
        setOpportunities(data.opportunities ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (tab === 'pipeline') loadOpps(); }, [tab, loadOpps]);

  // Load reminders
  const loadReminders = useCallback(async () => {
    try {
      const res = await fetch('/api/modules/crm/reminders');
      if (res.ok) {
        const data = await res.json();
        setReminders(data.reminders ?? []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (tab === 'reminders') loadReminders(); }, [tab, loadReminders]);

  // Load customer detail
  const loadDetail = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/modules/crm/customers/${id}`);
      if (res.ok) setCustomerDetail(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (selectedCustomer) loadDetail(selectedCustomer); }, [selectedCustomer, loadDetail]);

  // Create customer
  const createCustomer = async () => {
    if (!newCust.name.trim()) return;
    try {
      const res = await fetch('/api/modules/crm/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
        body: JSON.stringify(newCust),
      });
      if (res.ok) {
        setShowNewCustomer(false);
        setNewCust({ name: '', companyName: '', email: '', phone: '', city: '', customerType: 'company' });
        loadCustomers();
      }
    } catch { /* ignore */ }
  };

  // Create opportunity
  const createOpp = async () => {
    if (!newOpp.title.trim() || !newOpp.customerId) return;
    try {
      const res = await fetch('/api/modules/crm/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
        body: JSON.stringify({
          ...newOpp,
          value: parseFloat(newOpp.value) || undefined,
        }),
      });
      if (res.ok) {
        setShowNewOpp(false);
        setNewOpp({ customerId: 0, title: '', value: '', probability: 50 });
        loadOpps();
      }
    } catch { /* ignore */ }
  };

  // Create interaction
  const createInteraction = async () => {
    if (!selectedCustomer || !newInteraction.subject.trim()) return;
    try {
      const res = await fetch('/api/modules/crm/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
        body: JSON.stringify({ customerId: selectedCustomer, ...newInteraction }),
      });
      if (res.ok) {
        setShowNewInteraction(false);
        setNewInteraction({ type: 'call', subject: '', description: '' });
        loadDetail(selectedCustomer);
      }
    } catch { /* ignore */ }
  };

  // Update opportunity stage
  const updateStage = async (oppId: number, stage: string) => {
    try {
      await fetch(`/api/modules/crm/opportunities/${oppId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrf() },
        body: JSON.stringify({ stage }),
      });
      loadOpps();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4">
      <DashboardSectionHeader title={t('crm.title')} subtitle={t('crm.description')} />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {(['customers', 'pipeline', 'reminders'] as const).map(t2 => (
          <button key={t2} onClick={() => { setTab(t2); setSelectedCustomer(null); }}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              tab === t2 ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}>
            {t(`crm.${t2}`)}
          </button>
        ))}
      </div>

      {/* ─── Customers Tab ─── */}
      {tab === 'customers' && !selectedCustomer && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={t('crm.search_customers')}
                className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            </div>
            <button onClick={() => setShowNewCustomer(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">
              <Plus className="w-4 h-4" /> {t('crm.new_customer')}
            </button>
          </div>

          <div className="bg-gray-900 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-gray-400">
                <tr>
                  <th className="text-left px-4 py-3">{t('crm.name')}</th>
                  <th className="text-left px-4 py-3">{t('crm.company')}</th>
                  <th className="text-left px-4 py-3">{t('crm.email')}</th>
                  <th className="text-left px-4 py-3">{t('crm.phone')}</th>
                  <th className="text-left px-4 py-3">{t('crm.city')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {customers.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-gray-500 py-8">{t('crm.no_customers')}</td></tr>
                )}
                {customers.map(c => (
                  <tr key={c.id} onClick={() => setSelectedCustomer(c.id)}
                    className="hover:bg-gray-800/50 cursor-pointer text-gray-200">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      {c.customer_type === 'company'
                        ? <Building2 className="w-4 h-4 text-blue-400" />
                        : <User className="w-4 h-4 text-gray-400" />}
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{c.company_name}</td>
                    <td className="px-4 py-3 text-gray-400">{c.email}</td>
                    <td className="px-4 py-3 text-gray-400">{c.phone}</td>
                    <td className="px-4 py-3 text-gray-400">{c.city}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Customer Detail ─── */}
      {tab === 'customers' && selectedCustomer && customerDetail && (
        <div className="space-y-4">
          <button onClick={() => { setSelectedCustomer(null); setCustomerDetail(null); }}
            className="text-sm text-blue-400 hover:text-blue-300">
            &larr; {t('crm.back_to_list')}
          </button>

          <div className="bg-gray-900 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl text-white font-semibold">{String(customerDetail.customer.name)}</h3>
                {customerDetail.customer.company_name ? (
                  <p className="text-gray-400 text-sm">{String(customerDetail.customer.company_name)}</p>
                ) : null}
              </div>
              <button onClick={() => setShowNewInteraction(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">
                <MessageSquare className="w-4 h-4" /> {t('crm.add_interaction')}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
              {customerDetail.customer.email ? (
                <div className="flex items-center gap-2 text-gray-300">
                  <Mail className="w-4 h-4 text-gray-500" /> {String(customerDetail.customer.email)}
                </div>
              ) : null}
              {customerDetail.customer.phone ? (
                <div className="flex items-center gap-2 text-gray-300">
                  <Phone className="w-4 h-4 text-gray-500" /> {String(customerDetail.customer.phone)}
                </div>
              ) : null}
            </div>
          </div>

          {/* Interactions timeline */}
          <div className="bg-gray-900 rounded-xl p-5">
            <h4 className="text-white font-medium mb-3">{t('crm.interactions')}</h4>
            <div className="space-y-3">
              {customerDetail.interactions.length === 0 && (
                <p className="text-gray-500 text-sm">{t('crm.no_interactions')}</p>
              )}
              {customerDetail.interactions.map((inter, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      inter.type === 'call' ? 'bg-emerald-900/50 text-emerald-400' :
                      inter.type === 'meeting' ? 'bg-blue-900/50 text-blue-400' :
                      inter.type === 'email' ? 'bg-amber-900/50 text-amber-400' :
                      'bg-gray-700 text-gray-300'
                    }`}>{t(`crm.type_${String(inter.type)}`)}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(String(inter.interaction_date)).toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">{String(inter.created_by_name ?? '')}</span>
                  </div>
                  {inter.subject ? <p className="text-white text-sm font-medium">{String(inter.subject)}</p> : null}
                  {inter.description ? <p className="text-gray-400 text-sm mt-1">{String(inter.description)}</p> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Pipeline Tab ─── */}
      {tab === 'pipeline' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={() => setShowNewOpp(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm">
              <Plus className="w-4 h-4" /> {t('crm.new_opportunity')}
            </button>
          </div>

          {/* Pipeline columns */}
          <div className="grid grid-cols-5 gap-3">
            {STAGES.map(stage => {
              const stageOpps = opportunities.filter(o => o.stage === stage);
              const stageTotal = stageOpps.reduce((s, o) => s + (o.value ?? 0), 0);
              return (
                <div key={stage} className="space-y-2">
                  <div className={`px-3 py-2 rounded-t-lg text-white text-sm font-semibold ${STAGE_COLORS[stage]}`}>
                    {t(`crm.stage_${stage}`)} ({stageOpps.length})
                    <span className="block text-xs font-normal opacity-80">{fmt(stageTotal)} {t('common.currency')}</span>
                  </div>
                  <div className="space-y-2 min-h-[100px]">
                    {stageOpps.map(opp => (
                      <div key={opp.id} className="bg-gray-800 rounded-lg p-3 space-y-1">
                        <p className="text-white text-sm font-medium">{opp.title}</p>
                        <p className="text-xs text-gray-400">{opp.customer_name}</p>
                        {opp.value != null && (
                          <p className="text-emerald-400 text-sm font-semibold">{fmt(opp.value)} {opp.currency}</p>
                        )}
                        <p className="text-xs text-gray-500">{opp.probability}% {t('crm.probability')}</p>
                        {/* Stage change buttons */}
                        <div className="flex gap-1 pt-1">
                          {stage !== 'won' && stage !== 'lost' && (
                            <>
                              {STAGES.indexOf(stage) < 3 && (
                                <button onClick={() => updateStage(opp.id, STAGES[STAGES.indexOf(stage) + 1])}
                                  className="text-xs px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded">
                                  &rarr;
                                </button>
                              )}
                              <button onClick={() => updateStage(opp.id, 'won')}
                                className="text-xs px-2 py-0.5 bg-emerald-900/50 hover:bg-emerald-800 text-emerald-400 rounded">
                                {t('crm.stage_won')}
                              </button>
                              <button onClick={() => updateStage(opp.id, 'lost')}
                                className="text-xs px-2 py-0.5 bg-red-900/50 hover:bg-red-800 text-red-400 rounded">
                                {t('crm.stage_lost')}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Reminders Tab ─── */}
      {tab === 'reminders' && (
        <div className="space-y-3">
          {reminders.length === 0 && (
            <p className="text-gray-500 text-center py-8">{t('crm.no_reminders')}</p>
          )}
          {reminders.map(r => {
            const isOverdue = new Date(r.due_date) < new Date();
            return (
              <div key={r.id} className={`bg-gray-900 rounded-lg p-4 flex items-center gap-3 ${
                isOverdue ? 'border border-red-700' : ''
              }`}>
                <Bell className={`w-5 h-5 ${isOverdue ? 'text-red-400' : 'text-amber-400'}`} />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{r.title}</p>
                  {r.customer_name && <p className="text-xs text-gray-400">{r.customer_name}</p>}
                </div>
                <span className={`text-sm ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
                  {new Date(r.due_date).toLocaleDateString()}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── New Customer Modal ─── */}
      {showNewCustomer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-lg space-y-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-lg font-semibold">{t('crm.new_customer')}</h3>
              <button onClick={() => setShowNewCustomer(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder={t('crm.name')} value={newCust.name}
                onChange={e => setNewCust(p => ({ ...p, name: e.target.value }))}
                className="col-span-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
              <input placeholder={t('crm.company')} value={newCust.companyName}
                onChange={e => setNewCust(p => ({ ...p, companyName: e.target.value }))}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
              <select value={newCust.customerType} onChange={e => setNewCust(p => ({ ...p, customerType: e.target.value as 'company' }))}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">
                <option value="company">{t('crm.type_company')}</option>
                <option value="individual">{t('crm.type_individual')}</option>
              </select>
              <input placeholder={t('crm.email')} type="email" value={newCust.email}
                onChange={e => setNewCust(p => ({ ...p, email: e.target.value }))}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
              <input placeholder={t('crm.phone')} value={newCust.phone}
                onChange={e => setNewCust(p => ({ ...p, phone: e.target.value }))}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
              <input placeholder={t('crm.city')} value={newCust.city}
                onChange={e => setNewCust(p => ({ ...p, city: e.target.value }))}
                className="col-span-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            </div>
            <div className="flex gap-3">
              <button onClick={createCustomer}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm">
                {t('common.save')}
              </button>
              <button onClick={() => setShowNewCustomer(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── New Opportunity Modal ─── */}
      {showNewOpp && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md space-y-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-lg font-semibold">{t('crm.new_opportunity')}</h3>
              <button onClick={() => setShowNewOpp(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <select value={newOpp.customerId} onChange={e => setNewOpp(p => ({ ...p, customerId: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">
              <option value={0}>{t('crm.select_customer')}</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input placeholder={t('crm.opp_title')} value={newOpp.title}
              onChange={e => setNewOpp(p => ({ ...p, title: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            <input placeholder={t('crm.opp_value')} type="number" value={newOpp.value}
              onChange={e => setNewOpp(p => ({ ...p, value: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            <div className="flex gap-3">
              <button onClick={createOpp}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm">
                {t('common.save')}
              </button>
              <button onClick={() => setShowNewOpp(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── New Interaction Modal ─── */}
      {showNewInteraction && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md space-y-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-lg font-semibold">{t('crm.add_interaction')}</h3>
              <button onClick={() => setShowNewInteraction(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <select value={newInteraction.type} onChange={e => setNewInteraction(p => ({ ...p, type: e.target.value as 'call' }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm">
              <option value="call">{t('crm.type_call')}</option>
              <option value="meeting">{t('crm.type_meeting')}</option>
              <option value="email">{t('crm.type_email')}</option>
              <option value="note">{t('crm.type_note')}</option>
            </select>
            <input placeholder={t('crm.subject')} value={newInteraction.subject}
              onChange={e => setNewInteraction(p => ({ ...p, subject: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            <textarea placeholder={t('crm.description')} value={newInteraction.description} rows={3}
              onChange={e => setNewInteraction(p => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" />
            <div className="flex gap-3">
              <button onClick={createInteraction}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm">
                {t('common.save')}
              </button>
              <button onClick={() => setShowNewInteraction(false)}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
