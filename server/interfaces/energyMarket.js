// Energy market interface — REST client for German day-ahead / spot prices.
//
// Two real German-market providers are supported:
//  - aWATTar DE   : https://api.awattar.de/v1/marketdata  (EPEX spot, €/MWh, key-less)
//  - Energy-Charts: https://api.energy-charts.info/price?bzn=DE-LU (Fraunhofer ISE)

import { config } from '../config/interfaces.js';

const cfg = config.energyMarket;
let status = { level: 'warn', text: 'Not initialised' };

export const meta = {
  id: 'energy',
  label: 'Energy market',
  iface: 'REST API',
  endpoint: cfg.provider === 'energy-charts' ? 'api.energy-charts.info' : 'api.awattar.de/v1/marketdata',
  interval: 'every 5 min',
  cols: ['Timestamp', 'Spot price (€/MWh)', 'Price (ct/kWh)', 'Window', 'Trend'],
};

function fmt(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
}
function hhmm(ts) { const d = new Date(ts); const p = (n) => String(n).padStart(2, '0'); return `${p(d.getHours())}:${p(d.getMinutes())}`; }

export function getStatus() { return status; }
export async function init() { status = { level: 'ok', text: cfg.mode === 'live' ? `Live (${cfg.provider})` : 'Simulated' }; }

export async function fetchRows() {
  if (cfg.mode !== 'live') return simulate();
  try {
    return cfg.provider === 'energy-charts' ? await fetchEnergyCharts() : await fetchAwattar();
  } catch (e) {
    status = { level: 'err', text: 'Live fetch failed — ' + e.message + ' (using simulation)' };
    return simulate();
  }
}

async function fetchAwattar() {
  const res = await fetch(cfg.awattarUrl, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  const items = (j.data || []).slice(0, 8);
  status = { level: 'ok', text: 'Live (aWATTar DE)' };
  let prev = null;
  return items.map((it) => {
    const eurMwh = it.marketprice;                    // €/MWh
    const ctKwh = +(eurMwh / 10).toFixed(2);          // €/MWh → ct/kWh
    const trend = prev == null ? '→ stable' : eurMwh > prev ? '▲ rising' : eurMwh < prev ? '▼ falling' : '→ stable';
    prev = eurMwh;
    return [fmt(it.start_timestamp), +eurMwh.toFixed(2), ctKwh, `${hhmm(it.start_timestamp)}–${hhmm(it.end_timestamp)}`, trend];
  });
}

async function fetchEnergyCharts() {
  const res = await fetch(cfg.energyChartsUrl, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  const times = j.unix_seconds || [];
  const prices = j.price || [];                        // €/MWh
  status = { level: 'ok', text: 'Live (Energy-Charts)' };
  const rows = [];
  let prev = null;
  for (let i = Math.max(0, times.length - 8); i < times.length; i++) {
    const ms = times[i] * 1000;
    const eurMwh = prices[i];
    const trend = prev == null ? '→ stable' : eurMwh > prev ? '▲ rising' : eurMwh < prev ? '▼ falling' : '→ stable';
    prev = eurMwh;
    rows.push([fmt(ms), +eurMwh.toFixed(2), +(eurMwh / 10).toFixed(2), `${hhmm(ms)}–${hhmm(ms + 3600000)}`, trend]);
  }
  return rows.reverse();
}

function rnd(a, b, dec = 0) { const v = a + Math.random() * (b - a); return dec === 0 ? Math.round(v) : +v.toFixed(dec); }
function simulate() {
  const now = Date.now();
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  return Array.from({ length: 8 }, (_, i) => {
    const eur = rnd(45, 140, 2);
    const start = now - i * 3600000;
    return [fmt(start), eur, +(eur / 10).toFixed(2), `${hhmm(start)}–${hhmm(start + 3600000)}`, pick(['▲ rising', '▼ falling', '→ stable'])];
  });
}
