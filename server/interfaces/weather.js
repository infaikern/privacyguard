// Weather interface — REST client for the Open-Meteo weather service.
// Open-Meteo is a free, key-less REST API. https://open-meteo.com/
//
// Live call:
//   GET {baseUrl}?latitude=..&longitude=..&current=temperature_2m,wind_speed_10m,
//       cloud_cover,precipitation&hourly=shortwave_radiation&past_hours=6&forecast_hours=1

import { config } from '../config/interfaces.js';

const cfg = config.weather;
const site = config.site;

let status = { level: 'warn', text: 'Not initialised' };

export const meta = {
  id: 'weather',
  label: 'Weather',
  iface: 'REST API',
  endpoint: 'api.open-meteo.com/v1/forecast',
  interval: 'every 15 min',
  cols: ['Timestamp', 'Temp (°C)', 'Wind (m/s)', 'Cloud (%)', 'Irradiance (W/m²)', 'Precip (mm)'],
};

function fmt(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

export function getStatus() { return status; }

export async function init() {
  status = cfg.mode === 'live' ? { level: 'ok', text: 'Live (Open-Meteo)' } : { level: 'ok', text: 'Simulated' };
}

export async function fetchRows() {
  if (cfg.mode !== 'live') return simulate();
  try {
    const url = `${cfg.baseUrl}?latitude=${site.latitude}&longitude=${site.longitude}` +
      `&hourly=temperature_2m,wind_speed_10m,cloud_cover,shortwave_radiation,precipitation` +
      `&past_hours=7&forecast_hours=0&wind_speed_unit=ms&timezone=auto`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const h = j.hourly;
    const n = h.time.length;
    const rows = [];
    for (let i = n - 1; i >= Math.max(0, n - 8); i--) {
      rows.push([
        fmt(h.time[i]),
        h.temperature_2m[i],
        h.wind_speed_10m[i],
        h.cloud_cover[i],
        Math.round(h.shortwave_radiation[i]),
        h.precipitation[i],
      ]);
    }
    status = { level: 'ok', text: 'Live (Open-Meteo)' };
    return rows;
  } catch (e) {
    status = { level: 'err', text: 'Live fetch failed — ' + e.message + ' (using simulation)' };
    return simulate();
  }
}

function rnd(a, b, dec = 0) { const v = a + Math.random() * (b - a); return dec === 0 ? Math.round(v) : +v.toFixed(dec); }
function simulate() {
  const now = Date.now();
  return Array.from({ length: 8 }, (_, i) => [
    fmt(new Date(now - i * 15 * 60000).toISOString()),
    rnd(2, 18, 1), rnd(0, 9, 1), rnd(0, 100), Math.max(0, rnd(0, 820)), rnd(0, 3, 1),
  ]);
}
