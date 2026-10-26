// MQTT interface — subscribes to a microgrid controller / DSO broker and caches
// the latest telemetry per topic using the `mqtt` library.
//
// Expected message payload (JSON) on each telemetry topic, e.g.:
//   { "frequencyHz": 50.01, "voltageV": 231, "signal": "Normal",
//     "limitKw": 250, "priority": "Medium" }
// Adjust `mapPayload()` to match your microgrid's schema.

import mqtt from 'mqtt';
import { config } from '../config/interfaces.js';

const cfg = config.mqtt;
let client = null;
const cache = new Map(); // topic -> { payload, ts }
let status = { level: 'warn', text: 'Not initialised' };

export const meta = {
  id: 'grid',
  label: 'Grid signals',
  iface: 'MQTT',
  endpoint: cfg.brokerUrl,
  interval: 'real-time',
  cols: ['Timestamp', 'Topic', 'Frequency (Hz)', 'Voltage (V)', 'Signal', 'Limit (kW)', 'Priority'],
};

export function getStatus() { return status; }
function fmt(ts) { const d = new Date(ts); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }

function mapPayload(p) {
  return {
    frequencyHz: p.frequencyHz ?? p.frequency ?? null,
    voltageV: p.voltageV ?? p.voltage ?? null,
    signal: p.signal ?? p.state ?? '—',
    limitKw: p.limitKw ?? p.limit ?? null,
    priority: p.priority ?? '—',
  };
}

export async function init() {
  if (cfg.mode !== 'live') { status = { level: 'ok', text: 'Simulated' }; return; }
  try {
    client = mqtt.connect(cfg.brokerUrl, {
      username: cfg.username || undefined,
      password: cfg.password || undefined,
      connectTimeout: 6000,
      reconnectPeriod: 5000,
    });
    client.on('connect', () => {
      status = { level: 'ok', text: `Live — connected to ${cfg.brokerUrl}` };
      cfg.topics.forEach((t) => client.subscribe(t.trim()));
    });
    client.on('message', (topic, buf) => {
      let payload;
      try { payload = JSON.parse(buf.toString()); } catch { payload = { raw: buf.toString() }; }
      cache.set(topic, { payload: mapPayload(payload), ts: Date.now() });
    });
    client.on('error', (e) => { status = { level: 'err', text: 'MQTT error — ' + e.message }; });
    client.on('offline', () => { status = { level: 'err', text: 'MQTT offline (using simulation)' }; });
  } catch (e) {
    status = { level: 'err', text: 'MQTT connect failed — ' + e.message + ' (using simulation)' };
  }
}

export async function fetchRows() {
  if (cfg.mode !== 'live' || cache.size === 0) {
    if (cfg.mode === 'live') status = { level: cache.size ? 'ok' : 'warn', text: cache.size ? status.text : 'Live — waiting for messages' };
    return simulate();
  }
  const rows = [...cache.entries()].slice(-8).map(([topic, { payload, ts }]) => [
    fmt(ts), topic, payload.frequencyHz ?? '—', payload.voltageV ?? '—', payload.signal, payload.limitKw ?? '—', payload.priority,
  ]);
  return rows.reverse();
}

function rnd(a, b, dec = 0) { const v = a + Math.random() * (b - a); return dec === 0 ? Math.round(v) : +v.toFixed(dec); }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function simulate() {
  const now = Date.now();
  return Array.from({ length: 8 }, (_, i) => [
    fmt(new Date(now - i * 2 * 60000).toISOString()), 'microgrid/nk-01/telemetry',
    rnd(49.8, 50.2, 3), rnd(228, 242), pick(['Normal', 'Curtail', 'Demand response', 'Peak alert']),
    rnd(50, 400), pick(['Low', 'Medium', 'High']),
  ]);
}

// Exposed for testing
export function _publishTest(topic, obj) { if (client) client.publish(topic, JSON.stringify(obj)); }
