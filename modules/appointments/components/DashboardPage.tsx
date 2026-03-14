'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, Plus, ChevronLeft, ChevronRight, Clock, User, X } from 'lucide-react';
import { DashboardSectionHeader } from '@/components/core/DashboardSectionHeader';
import { useTranslation } from '@/hooks/useTranslation';
import { useCsrf } from '@/hooks/useCsrf';

interface Slot {
  id: number;
  provider_name: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration: number;
  is_active: boolean;
}

interface Booking {
  id: number;
  provider_name: string;
  customer_name: string;
  customer_phone: string | null;
  service_type: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-purple-900/40 border-purple-500/50 text-purple-200',
  completed: 'bg-green-900/40 border-green-500/50 text-green-200',
  cancelled: 'bg-gray-800/40 border-gray-600/50 text-gray-400 line-through',
  no_show: 'bg-red-900/40 border-red-500/50 text-red-200',
};

function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0] ?? '';
}

export default function AppointmentsDashboardPage() {
  const { t } = useTranslation();
  const { csrfToken } = useCsrf();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [showSlotConfig, setShowSlotConfig] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Booking form
  const [bProvider, setBProvider] = useState('');
  const [bCustomer, setBCustomer] = useState('');
  const [bPhone, setBPhone] = useState('');
  const [bService, setBService] = useState('');
  const [bDate, setBDate] = useState('');
  const [bStart, setBStart] = useState('09:00');
  const [bEnd, setBEnd] = useState('09:30');
  const [bNotes, setBNotes] = useState('');

  // Slot form
  const [sProvider, setSProvider] = useState('');
  const [sDay, setSDay] = useState(0);
  const [sStart, setSStart] = useState('08:00');
  const [sEnd, setSEnd] = useState('17:00');
  const [sDuration, setSDuration] = useState('30');

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken || '',
  }), [csrfToken]);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const loadBookings = useCallback(async () => {
    // Load all bookings for the week
    const allBookings: Booking[] = [];
    for (const d of weekDates) {
      const res = await fetch(`/api/modules/appointments/bookings?date=${formatDate(d)}`);
      if (res.ok) {
        const data = await res.json() as { bookings: Booking[] };
        if (data.bookings) allBookings.push(...data.bookings);
      }
    }
    setBookings(allBookings);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  const loadSlots = useCallback(async () => {
    const res = await fetch('/api/modules/appointments/slots');
    if (res.ok) {
      const data = await res.json() as { slots: Slot[] };
      if (data.slots) setSlots(data.slots);
    }
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);
  useEffect(() => { loadSlots(); }, [loadSlots]);

  const createBooking = async () => {
    const res = await fetch('/api/modules/appointments/bookings', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        providerName: bProvider,
        customerName: bCustomer,
        customerPhone: bPhone || undefined,
        serviceType: bService || undefined,
        bookingDate: bDate,
        startTime: bStart,
        endTime: bEnd,
        notes: bNotes || undefined,
      }),
    });
    if (res.ok) {
      setShowNewBooking(false);
      setBProvider(''); setBCustomer(''); setBPhone(''); setBService('');
      setBDate(''); setBStart('09:00'); setBEnd('09:30'); setBNotes('');
      await loadBookings();
    }
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch('/api/modules/appointments/bookings', {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ id, status }),
    });
    setSelectedBooking(null);
    await loadBookings();
  };

  const createSlot = async () => {
    const res = await fetch('/api/modules/appointments/slots', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        providerName: sProvider,
        dayOfWeek: sDay,
        startTime: sStart,
        endTime: sEnd,
        slotDuration: parseInt(sDuration, 10) || 30,
      }),
    });
    if (res.ok) {
      setSProvider(''); setSDay(0); setSStart('08:00'); setSEnd('17:00');
      await loadSlots();
    }
  };

  const deleteSlot = async (id: number) => {
    await fetch(`/api/modules/appointments/slots?id=${id}`, {
      method: 'DELETE',
      headers: headers(),
    });
    await loadSlots();
  };

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const todayWeek = () => setWeekStart(getWeekStart(new Date()));

  return (
    <div className="space-y-6">
      <DashboardSectionHeader title={t('appointments.title')} subtitle={t('appointments.subtitle')} />

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={todayWeek} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 text-sm">
            {t('appointments.today')}
          </button>
          <button onClick={nextWeek} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-gray-400 text-sm ml-2">
            {formatDate(weekDates[0] ?? weekStart)} — {formatDate(weekDates[6] ?? weekStart)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSlotConfig(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">
            <Clock className="w-4 h-4" /> {t('appointments.manage_slots')}
          </button>
          <button onClick={() => setShowNewBooking(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> {t('appointments.new_booking')}
          </button>
        </div>
      </div>

      {/* Weekly calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((d, i) => {
          const dateStr = formatDate(d);
          const dayBookings = bookings.filter(b => b.booking_date === dateStr || b.booking_date?.startsWith(dateStr));
          const isToday = dateStr === formatDate(new Date());

          return (
            <div key={i} className={`bg-gray-900 border rounded-xl p-3 min-h-[200px] ${isToday ? 'border-purple-500/50' : 'border-gray-800'}`}>
              <div className={`text-xs font-medium mb-2 ${isToday ? 'text-purple-400' : 'text-gray-500'}`}>
                {DAY_NAMES[i]} · {d.getDate()}.
              </div>
              <div className="space-y-1.5">
                {dayBookings.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBooking(b)}
                    className={`w-full text-left p-2 rounded-lg border text-xs ${STATUS_COLORS[b.status] ?? STATUS_COLORS.confirmed}`}
                  >
                    <div className="font-medium truncate">{b.start_time} {b.customer_name}</div>
                    {b.service_type ? <div className="text-[10px] opacity-70 truncate">{b.service_type}</div> : null}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking detail / status update */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSelectedBooking(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{t('appointments.booking_detail')}</h3>
              <button onClick={() => setSelectedBooking(null)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <User className="w-4 h-4 text-purple-400" /> {selectedBooking.customer_name}
                {selectedBooking.customer_phone ? <span className="text-gray-500">· {selectedBooking.customer_phone}</span> : null}
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Clock className="w-4 h-4 text-purple-400" /> {selectedBooking.booking_date} {selectedBooking.start_time}–{selectedBooking.end_time}
              </div>
              {selectedBooking.service_type ? <p className="text-gray-400">{t('appointments.service')}: {selectedBooking.service_type}</p> : null}
              {selectedBooking.notes ? <p className="text-gray-500 text-xs">{selectedBooking.notes}</p> : null}
              <div className="flex items-center gap-1">
                <span className={`px-2 py-1 rounded text-xs ${STATUS_COLORS[selectedBooking.status] ?? ''}`}>
                  {t(`appointments.status_${selectedBooking.status}`)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-5">
              {selectedBooking.status !== 'completed' && (
                <button onClick={() => updateStatus(selectedBooking.id, 'completed')}
                  className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs">{t('appointments.mark_completed')}</button>
              )}
              {selectedBooking.status !== 'no_show' && selectedBooking.status !== 'cancelled' && (
                <button onClick={() => updateStatus(selectedBooking.id, 'no_show')}
                  className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs">{t('appointments.mark_no_show')}</button>
              )}
              {selectedBooking.status !== 'cancelled' && (
                <button onClick={() => updateStatus(selectedBooking.id, 'cancelled')}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs">{t('appointments.cancel_booking')}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New booking modal */}
      {showNewBooking && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowNewBooking(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">{t('appointments.new_booking')}</h3>
            <div className="space-y-3">
              <input type="text" value={bProvider} onChange={e => setBProvider(e.target.value)} placeholder={t('appointments.provider')}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              <input type="text" value={bCustomer} onChange={e => setBCustomer(e.target.value)} placeholder={t('appointments.customer_name')}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              <input type="text" value={bPhone} onChange={e => setBPhone(e.target.value)} placeholder={t('appointments.phone')}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              <input type="text" value={bService} onChange={e => setBService(e.target.value)} placeholder={t('appointments.service')}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              <input type="date" value={bDate} onChange={e => setBDate(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('appointments.start_time')}</label>
                  <input type="time" value={bStart} onChange={e => setBStart(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{t('appointments.end_time')}</label>
                  <input type="time" value={bEnd} onChange={e => setBEnd(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
                </div>
              </div>
              <textarea value={bNotes} onChange={e => setBNotes(e.target.value)} placeholder={t('common.notes')}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100 h-16" />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowNewBooking(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">{t('common.cancel')}</button>
              <button onClick={createBooking} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">{t('common.save')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Slot configuration modal */}
      {showSlotConfig && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowSlotConfig(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">{t('appointments.manage_slots')}</h3>

            {/* Existing slots */}
            {slots.length > 0 && (
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {slots.map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-gray-950 rounded-lg p-3 text-sm">
                    <div>
                      <span className="text-white">{s.provider_name}</span>
                      <span className="text-gray-500 ml-2">{DAY_NAMES[s.day_of_week]} {s.start_time}–{s.end_time}</span>
                      <span className="text-gray-600 ml-2">({s.slot_duration} min)</span>
                    </div>
                    <button onClick={() => deleteSlot(s.id)} className="text-red-500 hover:text-red-400 text-xs">{t('common.delete')}</button>
                  </div>
                ))}
              </div>
            )}

            {/* Add slot form */}
            <div className="border-t border-gray-800 pt-4 space-y-3">
              <input type="text" value={sProvider} onChange={e => setSProvider(e.target.value)} placeholder={t('appointments.provider')}
                className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-gray-100" />
              <div className="grid grid-cols-4 gap-3">
                <select value={sDay} onChange={e => setSDay(parseInt(e.target.value, 10))}
                  className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-gray-100">
                  {DAY_NAMES.map((name, i) => (
                    <option key={i} value={i}>{name}</option>
                  ))}
                </select>
                <input type="time" value={sStart} onChange={e => setSStart(e.target.value)}
                  className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-gray-100" />
                <input type="time" value={sEnd} onChange={e => setSEnd(e.target.value)}
                  className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-gray-100" />
                <input type="number" value={sDuration} onChange={e => setSDuration(e.target.value)} placeholder="min"
                  className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-gray-100" />
              </div>
              <button onClick={createSlot}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">{t('appointments.add_slot')}</button>
            </div>

            <div className="flex justify-end mt-4">
              <button onClick={() => setShowSlotConfig(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">{t('common.close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
