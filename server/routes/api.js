import express from 'express';
import * as store from '../data/store.js';
import * as interfaces from '../interfaces/index.js';
import { anonymiseRecord, estimatePrivacy, generateRawBatch, LEVELS } from '../services/anonymise.js';

const router = express.Router();

// ---- Dashboard ----
router.get('/dashboard', (_req, res) => res.json(store.dashboardMetrics()));

// ---- Gateway config ----
router.get('/gateway/config', (_req, res) => res.json(store.gatewayConfig));
router.put('/gateway/config', (req, res) => {
  Object.assign(store.gatewayConfig.network, req.body.network || {});
  Object.assign(store.gatewayConfig.transmission, req.body.transmission || {});
  Object.assign(store.gatewayConfig.encryption, req.body.encryption || {});
  res.json({ ok: true, config: store.gatewayConfig });
});
router.get('/gateway/connections', (_req, res) => {
  const st = interfaces.statuses();
  const map = { weather: 'Weather service', energy: 'Energy market price', schedules: 'Vehicle schedules', charging: 'Charge controllers', pv: 'PV / battery', grid: 'Grid signals' };
  const list = interfaces.list().map((s) => ({
    source: map[s.id] || s.label,
    iface: s.iface,
    endpoint: s.endpoint,
    interval: s.interval,
    status: (st[s.id]?.level) || 'warn',
    detail: st[s.id]?.text || '',
  }));
  res.json(list);
});
router.get('/gateway/users', (_req, res) => res.json(store.users));

// ---- Data sources (backed by real protocol interfaces) ----
router.get('/data', (_req, res) => res.json(interfaces.list()));
router.get('/data/:id', async (req, res) => {
  if (!interfaces.has(req.params.id)) return res.status(404).json({ error: 'Unknown data source' });
  try {
    res.json(await interfaces.getSource(req.params.id));
  } catch (e) {
    res.status(502).json({ error: 'Interface error', detail: e.message });
  }
});
// Interface connection statuses (for the gateway "connections" view)
router.get('/interfaces/status', (_req, res) => res.json(interfaces.statuses()));

// ---- Anonymisation ----
router.get('/anonymise/levels', (_req, res) => {
  res.json(Object.entries(LEVELS).map(([id, l]) => ({ id, label: l.label, epsilon: l.epsilon })));
});
// Run the pipeline: server generates raw records, anonymises them, returns both + privacy estimate.
router.post('/anonymise/run', (req, res) => {
  const { level = 'moderate', techniques = { pseudonymisation: true, noise: true, generalisation: true }, sources = [] } = req.body || {};
  if (!sources.length) return res.status(400).json({ error: 'No data sources selected' });
  const raw = generateRawBatch(6);
  const anonymised = raw.map(r => anonymiseRecord(r, level, techniques));
  const estimate = estimatePrivacy(level, techniques);
  res.json({ raw, anonymised, estimate, sources, level });
});
router.post('/anonymise/estimate', (req, res) => {
  const { level = 'moderate', techniques = {} } = req.body || {};
  res.json(estimatePrivacy(level, techniques));
});

// ---- Models ----
router.get('/models', (_req, res) => res.json(store.models));
router.get('/models/:id', (req, res) => {
  const m = store.models.find(x => x.id === req.params.id);
  if (!m) return res.status(404).json({ error: 'Unknown model' });
  res.json({ ...m, detail: store.modelDetail(m.name) });
});
router.post('/models/compute', (_req, res) => {
  const model = store.computeNewModel();
  res.json(model);
});

// ---- Logs ----
router.get('/logs', (req, res) => {
  let logs = store.generateLogs(60);
  const { severity, q } = req.query;
  if (severity) logs = logs.filter(l => l.severity === severity);
  if (q) { const s = String(q).toLowerCase(); logs = logs.filter(l => l.message.toLowerCase().includes(s) || l.component.toLowerCase().includes(s)); }
  res.json(logs);
});

export default router;
