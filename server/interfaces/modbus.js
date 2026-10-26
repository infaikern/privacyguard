// Modbus TCP interface — reads a PV inverter / battery storage device over
// Modbus TCP using the `modbus-serial` library.
//
// Reads input/holding registers per the register map in config, decodes them
// (16/32-bit, signed/unsigned, scaling) and exposes normalised values.

import ModbusRTU from 'modbus-serial';
import { config } from '../config/interfaces.js';

const cfg = config.modbus;
let client = null;
let connected = false;
let status = { level: 'warn', text: 'Not initialised' };

export const meta = {
  id: 'pv',
  label: 'PV / battery',
  iface: 'Modbus TCP',
  endpoint: `${cfg.host}:${cfg.port}`,
  interval: 'every 30 s',
  cols: ['Register', 'Timestamp', 'PV power (kW)', 'Battery SOC (%)', 'Charge/Discharge (kW)', 'Grid (kW)'],
};

export function getStatus() { return status; }

function fmt(iso) { const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }

// Decode an array of 16-bit register words into a number.
function decode(words, def) {
  if (!words || !words.length) return 0;
  let raw;
  if (def.words === 2) {
    raw = words[0] * 65536 + words[1];               // big-endian 32-bit (avoid <<16 sign issues)
    if (def.signed && raw >= 0x80000000) raw -= 0x100000000;
  } else {
    raw = words[0];
    if (def.signed && raw >= 0x8000) raw -= 0x10000;
  }
  return raw / (def.scale || 1);
}

export async function init() {
  if (cfg.mode !== 'live') { status = { level: 'ok', text: 'Simulated' }; return; }
  client = new ModbusRTU();
  try {
    await client.connectTCP(cfg.host, { port: cfg.port });
    client.setID(cfg.unitId);
    client.setTimeout(3000);
    connected = true;
    status = { level: 'ok', text: `Live — connected to ${cfg.host}:${cfg.port}` };
  } catch (e) {
    connected = false;
    status = { level: 'err', text: `Connect failed (${cfg.host}:${cfg.port}) — ${e.message} (using simulation)` };
  }
}

async function readRegister(def) {
  // Input registers (FC4). Address is 1-based in config; modbus-serial is 0-based.
  const res = await client.readInputRegisters(def.addr - 1, def.words);
  return decode(res.data, def);
}

export async function fetchRows() {
  if (cfg.mode !== 'live' || !connected) return simulate();
  try {
    const r = cfg.registers;
    const pvW = await readRegister(r.pvPowerW);
    const soc = await readRegister(r.batterySocPct);
    const batW = await readRegister(r.batteryPowerW);
    const gridW = await readRegister(r.gridPowerW);
    status = { level: 'ok', text: `Live — ${cfg.host}:${cfg.port}` };
    return [[
      'live', fmt(new Date().toISOString()),
      +(pvW / 1000).toFixed(1), Math.round(soc), +(batW / 1000).toFixed(1), +(gridW / 1000).toFixed(1),
    ]];
  } catch (e) {
    status = { level: 'err', text: 'Read failed — ' + e.message + ' (using simulation)' };
    return simulate();
  }
}

function rnd(a, b, dec = 0) { const v = a + Math.random() * (b - a); return dec === 0 ? Math.round(v) : +v.toFixed(dec); }
function simulate() {
  const now = Date.now();
  return Array.from({ length: 8 }, (_, i) => [
    '40' + String(i * 2 + 1).padStart(3, '0'), fmt(new Date(now - i * 30000).toISOString()),
    rnd(0, 48, 1), rnd(20, 98), rnd(-30, 30, 1), rnd(-20, 40, 1),
  ]);
}
