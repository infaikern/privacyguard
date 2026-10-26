// Interface registry — initialises every protocol adapter and exposes a unified
// API used by the routes: list sources, fetch rows for one source, report status.

import * as weather from './weather.js';
import * as energy from './energyMarket.js';
import * as schedules from './vehicleSchedules.js';
import * as ocpp from './ocpp.js';
import * as modbus from './modbus.js';
import * as mqtt from './mqtt.js';

const adapters = { weather, energy, schedules, charging: ocpp, pv: modbus, grid: mqtt };

export async function initAll() {
  await Promise.allSettled(Object.values(adapters).map((a) => a.init()));
  const lines = Object.entries(adapters).map(([id, a]) => `    - ${a.meta.label.padEnd(18)} [${a.meta.iface}] ${a.getStatus().text}`);
  console.log('  Interfaces initialised:\n' + lines.join('\n'));
}

export function list() {
  return Object.entries(adapters).map(([id, a]) => ({
    id, label: a.meta.label, iface: a.meta.iface, endpoint: a.meta.endpoint,
    interval: a.meta.interval, status: a.getStatus(),
  }));
}

export function has(id) { return !!adapters[id]; }

export async function getSource(id) {
  const a = adapters[id];
  if (!a) return null;
  const rows = await a.fetchRows();
  return { id, label: a.meta.label, iface: a.meta.iface, endpoint: a.meta.endpoint, interval: a.meta.interval, cols: a.meta.cols, rows, status: a.getStatus() };
}

export function statuses() {
  return Object.fromEntries(Object.entries(adapters).map(([id, a]) => [id, a.getStatus()]));
}

export { adapters };
