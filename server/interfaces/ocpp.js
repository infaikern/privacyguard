// OCPP 1.6J interface — a Central System (CSMS) that EV charge controllers
// connect to over WebSocket using the OCPP 1.6 JSON protocol.
//
// Charge points connect to  ws://<host>:<port><path>/<chargePointId>
// with WebSocket subprotocol "ocpp1.6".
//
// OCPP JSON message framing:
//   CALL       = [2, uniqueId, action, payload]
//   CALLRESULT = [3, uniqueId, payload]
//   CALLERROR  = [4, uniqueId, errorCode, errorDescription, errorDetails]
//
// Implemented incoming actions: BootNotification, Heartbeat, StatusNotification,
// Authorize, StartTransaction, StopTransaction, MeterValues, DataTransfer.

import { WebSocketServer } from 'ws';
import { config } from '../config/interfaces.js';

const cfg = config.ocpp;

const chargePoints = new Map(); // id -> { id, status, lastSeen, vendor, model }
const transactions = new Map(); // txId -> { id, cpId, connectorId, idTag, meterStart, startedAt, energyKwh, powerKw, state }
let txSeq = 4400;
let wss = null;
let status = { level: 'warn', text: 'Not initialised' };

export const meta = {
  id: 'charging',
  label: 'Charging tables',
  iface: 'OCPP 1.6',
  endpoint: `ws://0.0.0.0:${cfg.port}${cfg.path}`,
  interval: 'real-time',
  cols: ['Session', 'Charge point', 'Connector', 'idTag', 'Energy (kWh)', 'Power (kW)', 'Started', 'State'],
};

export function getStatus() { return status; }

function nowIso() { return new Date().toISOString(); }
function fmt(iso) { const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; }

// Handle one incoming OCPP action, return the CALLRESULT payload.
function handleAction(cpId, action, payload) {
  const cp = chargePoints.get(cpId);
  if (cp) cp.lastSeen = Date.now();

  switch (action) {
    case 'BootNotification':
      if (cp) { cp.vendor = payload.chargePointVendor; cp.model = payload.chargePointModel; cp.status = 'Accepted'; }
      return { currentTime: nowIso(), interval: cfg.heartbeatIntervalSec, status: 'Accepted' };

    case 'Heartbeat':
      return { currentTime: nowIso() };

    case 'StatusNotification':
      if (cp) cp.connectorStatus = payload.status;
      return {};

    case 'Authorize':
      return { idTagInfo: { status: 'Accepted' } };

    case 'StartTransaction': {
      const txId = ++txSeq;
      transactions.set(txId, {
        id: txId, cpId, connectorId: payload.connectorId, idTag: payload.idTag,
        meterStart: payload.meterStart || 0, startedAt: payload.timestamp || nowIso(),
        energyKwh: 0, powerKw: 0, state: 'Charging',
      });
      return { transactionId: txId, idTagInfo: { status: 'Accepted' } };
    }

    case 'MeterValues': {
      const tx = transactions.get(payload.transactionId);
      if (tx && payload.meterValue?.length) {
        for (const mv of payload.meterValue) {
          for (const s of (mv.sampledValue || [])) {
            if (s.measurand === 'Energy.Active.Import.Register' || !s.measurand) {
              const wh = Number(s.value);
              if (!Number.isNaN(wh)) tx.energyKwh = +((wh - tx.meterStart) / 1000).toFixed(2);
            }
            if (s.measurand === 'Power.Active.Import') {
              tx.powerKw = +(Number(s.value) / 1000).toFixed(1);
            }
          }
        }
      }
      return {};
    }

    case 'StopTransaction': {
      const tx = transactions.get(payload.transactionId);
      if (tx) {
        tx.state = 'Finished';
        if (payload.meterStop != null) tx.energyKwh = +((payload.meterStop - tx.meterStart) / 1000).toFixed(2);
        tx.powerKw = 0;
      }
      return { idTagInfo: { status: 'Accepted' } };
    }

    case 'DataTransfer':
      return { status: 'Accepted' };

    default:
      return null; // triggers CALLERROR NotImplemented
  }
}

export async function init() {
  if (cfg.mode !== 'live') { status = { level: 'ok', text: 'Simulated' }; return; }
  try {
    wss = new WebSocketServer({ port: cfg.port });
    wss.on('connection', (ws, req) => {
      const url = req.url || '/';
      const cpId = decodeURIComponent(url.replace(new RegExp('^' + cfg.path.replace(/\//g, '\\/') + '\\/?'), '')) || 'unknown';
      chargePoints.set(cpId, { id: cpId, status: 'Connected', lastSeen: Date.now(), connectorStatus: 'Available' });

      ws.on('message', (buf) => {
        let msg;
        try { msg = JSON.parse(buf.toString()); } catch { return; }
        if (!Array.isArray(msg)) return;
        const [type, uniqueId, third, fourth] = msg;
        if (type === 2) {                 // CALL from charge point
          const action = third, payload = fourth || {};
          const result = handleAction(cpId, action, payload);
          if (result === null) {
            ws.send(JSON.stringify([4, uniqueId, 'NotImplemented', `Action ${action} not supported`, {}]));
          } else {
            ws.send(JSON.stringify([3, uniqueId, result]));
          }
        }
      });

      ws.on('close', () => { const cp = chargePoints.get(cpId); if (cp) cp.status = 'Disconnected'; });
    });
    status = { level: 'ok', text: `Live — CSMS listening on :${cfg.port}` };
  } catch (e) {
    status = { level: 'err', text: 'CSMS start failed — ' + e.message + ' (using simulation)' };
  }
}

export async function fetchRows() {
  if (cfg.mode !== 'live' || transactions.size === 0) {
    // Simulation or no live sessions yet.
    if (cfg.mode === 'live') status = { level: chargePoints.size ? 'ok' : 'warn', text: chargePoints.size ? `Live — ${chargePoints.size} charge point(s)` : 'Live — waiting for charge points' };
    return simulate();
  }
  const rows = [...transactions.values()].slice(-8).reverse().map(tx => [
    'S-' + tx.id, tx.cpId, tx.connectorId, tx.idTag, tx.energyKwh, tx.powerKw, fmt(tx.startedAt), tx.state,
  ]);
  status = { level: 'ok', text: `Live — ${chargePoints.size} charge point(s), ${transactions.size} session(s)` };
  return rows;
}

function rnd(a, b, dec = 0) { const v = a + Math.random() * (b - a); return dec === 0 ? Math.round(v) : +v.toFixed(dec); }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function simulate() {
  const now = Date.now();
  return Array.from({ length: 8 }, (_, i) => [
    'S-' + (4400 + i), 'CP-' + pick(['A', 'B', 'C']) + rnd(1, 4), rnd(1, 4),
    'RFID-' + rnd(1000, 9999), rnd(2, 52, 2), rnd(3.7, 150, 1),
    fmt(new Date(now - i * 9 * 60000).toISOString()), pick(['Charging', 'Suspended', 'Finished', 'Faulted']),
  ]);
}

// Exposed for testing / inspection
export function _state() { return { chargePoints: [...chargePoints.values()], transactions: [...transactions.values()] }; }
