// Real anonymisation logic running server-side.
// Implements pseudonymisation, differential-privacy noise injection, and generalisation.

import crypto from 'crypto';

export const LEVELS = {
  minimal:  { label: 'Level 1 — Minimal',  epsilon: 5.0, geoRound: 3 },
  moderate: { label: 'Level 2 — Moderate', epsilon: 1.0, geoRound: 2 },
  maximum:  { label: 'Level 3 — Maximum',  epsilon: 0.2, geoRound: 1 },
};

function hashId(value) {
  return 'tok_' + crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 10);
}

// Gaussian noise via Box-Muller transform, scaled by sensitivity / epsilon.
function gaussianNoise(scale) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return scale * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function anonymiseRecord(record, levelId, techniques) {
  const cfg = LEVELS[levelId] || LEVELS.moderate;
  const out = { ...record };

  if (techniques.pseudonymisation) {
    if (out.driver !== undefined) out.driver = hashId(record.driver);
    if (out.vehicleId !== undefined) out.vehicleId = hashId(record.vehicleId);
  }
  if (techniques.noise) {
    if (out.energyKwh !== undefined) out.energyKwh = +(record.energyKwh + gaussianNoise(2 / cfg.epsilon)).toFixed(2);
    if (out.soc !== undefined) out.soc = Math.max(0, Math.min(100, Math.round(record.soc + gaussianNoise(3 / cfg.epsilon))));
  }
  if (techniques.generalisation) {
    const f = Math.pow(10, cfg.geoRound);
    if (out.lat !== undefined) out.lat = Math.round(record.lat * f) / f;
    if (out.lon !== undefined) out.lon = Math.round(record.lon * f) / f;
    if (out.timestamp !== undefined) {
      const d = new Date(record.timestamp);
      d.setMinutes(Math.round(d.getMinutes() / 15) * 15, 0, 0);
      out.timestamp = d.toISOString();
    }
  }
  return out;
}

export function estimatePrivacy(levelId, techniques) {
  const cfg = LEVELS[levelId] || LEVELS.moderate;
  let risk = 0.85;
  if (techniques.pseudonymisation) risk -= 0.30;
  if (techniques.noise) risk -= 0.25 * (1 - cfg.epsilon / 5);
  if (techniques.generalisation) risk -= 0.15 * (cfg.geoRound === 1 ? 1 : cfg.geoRound === 2 ? 0.6 : 0.2);
  risk = Math.max(0.02, Math.min(0.85, risk));

  let utility = 0.98;
  if (techniques.noise) utility -= 0.25 * (1 - cfg.epsilon / 5);
  if (techniques.generalisation) utility -= 0.12 * (cfg.geoRound === 1 ? 1 : cfg.geoRound === 2 ? 0.5 : 0.15);
  utility = Math.max(0.4, Math.min(0.98, utility));

  return { risk: +(risk).toFixed(2), utility: +(utility).toFixed(2) };
}

// Sample raw fleet records for the anonymisation demo.
const FIRST = ['Lena', 'Mateo', 'Priya', 'Jonas', 'Sofia', 'Liam'];
const LAST = ['Schmidt', 'Garcia', 'Patel', 'Mueller', 'Rossi', 'Becker'];
const VP = ['EV-DE', 'EV-AT', 'EV-NL'];

export function generateRawBatch(n = 6) {
  return Array.from({ length: n }, (_, i) => ({
    driver: `${FIRST[i % FIRST.length]} ${LAST[i % LAST.length]}`,
    vehicleId: `${VP[i % VP.length]}-${1000 + i}`,
    lat: +(48 + Math.random() * 5).toFixed(5),
    lon: +(10 + Math.random() * 5).toFixed(5),
    energyKwh: +(8 + Math.random() * 42).toFixed(2),
    soc: Math.round(20 + Math.random() * 75),
    timestamp: new Date(Date.now() - Math.random() * 3600_000).toISOString(),
  }));
}
