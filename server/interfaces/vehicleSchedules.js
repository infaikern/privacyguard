// Vehicle schedules interface — REST client for a proprietary fleet / tour-planning
// IT system. Because such systems are vendor-specific, this is a configurable
// generic client: base URL + API-key/Bearer auth, with a documented expected schema.
//
// Expected response from  GET {baseUrl}/schedules :
//   [{ vehicleId, departure, return, route, targetSoc, status, updatedAt }, ...]
// Adjust `mapItem()` to match your system's field names.

import { config } from '../config/interfaces.js';

const cfg = config.vehicleSchedules;
let status = { level: 'warn', text: 'Not initialised' };

export const meta = {
  id: 'schedules',
  label: 'Vehicle schedules',
  iface: 'REST API',
  endpoint: cfg.baseUrl.replace(/^https?:\/\//, ''),
  interval: 'every 1 min',
  cols: ['Vehicle', 'Departure', 'Return', 'Route', 'Target SOC (%)', 'Status', 'Updated'],
};

export function getStatus() { return status; }
export async function init() {
  status = cfg.mode === 'live'
    ? (cfg.apiKey ? { level: 'ok', text: 'Live (configured)' } : { level: 'warn', text: 'Live but no API key set' })
    : { level: 'ok', text: 'Simulated' };
}

function fmt(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// Map one item from the proprietary system to a UI row.
function mapItem(it) {
  return [
    it.vehicleId ?? it.vehicle ?? '—',
    it.departure ? fmt(it.departure) : '—',
    it.return ?? it.returnTime ? fmt(it.return ?? it.returnTime) : '—',
    it.route ?? '—',
    it.targetSoc ?? it.target_soc ?? '—',
    it.status ?? '—',
    it.updatedAt ? fmt(it.updatedAt) : fmt(new Date().toISOString()),
  ];
}

export async function fetchRows() {
  if (cfg.mode !== 'live') return simulate();
  try {
    const headers = { Accept: 'application/json' };
    if (cfg.apiKey) {
      headers[cfg.authHeader] = cfg.authHeader === 'Authorization' ? `Bearer ${cfg.apiKey}` : cfg.apiKey;
    }
    const res = await fetch(`${cfg.baseUrl}/schedules`, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data.schedules || data.items || []);
    status = { level: 'ok', text: 'Live (configured)' };
    return items.slice(0, 8).map(mapItem);
  } catch (e) {
    status = { level: 'err', text: 'Live fetch failed — ' + e.message + ' (using simulation)' };
    return simulate();
  }
}

function rnd(a, b) { return Math.round(a + Math.random() * (b - a)); }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function simulate() {
  const ids = ['EV-DE-1042', 'EV-AT-1108', 'EV-NL-1191', 'EV-DE-1203', 'EV-DE-1255', 'EV-AT-1260'];
  const now = Date.now();
  return ids.map((id, i) => [
    id,
    fmt(new Date(now + (i + 1) * 45 * 60000).toISOString()),
    fmt(new Date(now + (i + 5) * 45 * 60000).toISOString()),
    'R-' + (100 + i), rnd(80, 100), pick(['Scheduled', 'Charging', 'En route', 'Idle']),
    fmt(new Date(now - i * 60000).toISOString()),
  ]);
}
