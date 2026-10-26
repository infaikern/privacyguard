import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import api from './routes/api.js';
import * as interfaces from './interfaces/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// REST API
app.use('/api', api);
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'pgf-edge-gateway', ts: new Date().toISOString() }));

// Serve the built React client in production (after `npm run build` in /client)
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), err => { if (err) next(); });
});

app.listen(PORT, async () => {
  console.log(`\n  PrivacyGuard-Fleet edge gateway API running on http://localhost:${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/api/health\n`);
  await interfaces.initAll();
  console.log('');
});
