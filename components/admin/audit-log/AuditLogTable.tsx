'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

export interface AuditLogEntry {
  id: number;
  eventType: string;
  userId: number | null;
  username: string | null;
  ipAddress: string | null;
  details: string | null;
  success: boolean;
  createdAt: string;
}

interface AuditLogTableProps {
  logs: AuditLogEntry[];
}

// ── Event type badge ──────────────────────────────────────────────────────────

const EVENT_BADGE: Record<string, { label: string; className: string }> = {
  login_success: { label: 'Belépés',       className: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700' },
  login_failed:  { label: 'Sikertelen',    className: 'bg-red-900/60    text-red-300    border border-red-700'     },
  logout:        { label: 'Kilépés',       className: 'bg-gray-800      text-gray-400   border border-gray-700'    },
};

function EventBadge({ eventType }: { eventType: string }) {
  const cfg = EVENT_BADGE[eventType] ?? {
    label:     eventType,
    className: 'bg-indigo-900/60 text-indigo-300 border border-indigo-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

// ── Expandable details cell ───────────────────────────────────────────────────

const TRUNCATE_AT = 60;

function DetailsCell({ details }: { details: string | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!details) return <span className="text-gray-600 text-xs">—</span>;

  const isLong = details.length > TRUNCATE_AT;

  return (
    <span className="text-xs text-gray-400">
      {expanded || !isLong ? details : `${details.slice(0, TRUNCATE_AT)}…`}
      {isLong && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="ml-1 inline-flex items-center text-indigo-400 hover:text-indigo-300 transition-colors"
          aria-label={expanded ? 'Összecsuk' : 'Kibont'}
        >
          {expanded
            ? <ChevronUp   className="w-3 h-3" />
            : <ChevronDown className="w-3 h-3" />}
        </button>
      )}
    </span>
  );
}

// ── Timestamp formatter ───────────────────────────────────────────────────────

function formatTs(raw: string): string {
  const d = new Date(raw);
  return d.toLocaleString('hu-HU', {
    year:   'numeric',
    month:  '2-digit',
    day:    '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ── Main table ────────────────────────────────────────────────────────────────

export function AuditLogTable({ logs }: AuditLogTableProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        Nincs találat a megadott szűrőkre.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900/60">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
              Időpont
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
              Esemény
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
              Felhasználó
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
              IP cím
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
              Siker
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Részletek
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/60">
          {logs.map(log => (
            <tr
              key={log.id}
              className="hover:bg-gray-800/40 transition-colors"
            >
              {/* Timestamp */}
              <td className="px-4 py-3 whitespace-nowrap text-gray-300 font-mono text-xs">
                {formatTs(log.createdAt)}
              </td>

              {/* Event type */}
              <td className="px-4 py-3 whitespace-nowrap">
                <EventBadge eventType={log.eventType} />
              </td>

              {/* Username */}
              <td className="px-4 py-3 whitespace-nowrap text-gray-300">
                {log.username ?? <span className="text-gray-600">—</span>}
              </td>

              {/* IP address */}
              <td className="px-4 py-3 whitespace-nowrap text-gray-400 font-mono text-xs">
                {log.ipAddress ?? <span className="text-gray-600">—</span>}
              </td>

              {/* Success */}
              <td className="px-4 py-3 text-center">
                {log.success
                  ? <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />
                  : <XCircle    className="w-4 h-4 text-red-400    mx-auto" />}
              </td>

              {/* Details */}
              <td className="px-4 py-3 max-w-xs">
                <DetailsCell details={log.details} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
