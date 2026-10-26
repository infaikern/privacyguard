// Thin fetch wrapper around the backend REST API.
const BASE = '/api';

async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  dashboard: () => req('/dashboard'),
  gatewayConfig: () => req('/gateway/config'),
  saveGatewayConfig: (body) => req('/gateway/config', { method: 'PUT', body: JSON.stringify(body) }),
  connections: () => req('/gateway/connections'),
  users: () => req('/gateway/users'),
  dataSources: () => req('/data'),
  dataSource: (id) => req(`/data/${id}`),
  anonLevels: () => req('/anonymise/levels'),
  anonRun: (body) => req('/anonymise/run', { method: 'POST', body: JSON.stringify(body) }),
  anonEstimate: (body) => req('/anonymise/estimate', { method: 'POST', body: JSON.stringify(body) }),
  models: () => req('/models'),
  model: (id) => req(`/models/${id}`),
  computeModel: () => req('/models/compute', { method: 'POST' }),
  logs: ({ severity = '', q = '' } = {}) => req(`/logs?severity=${encodeURIComponent(severity)}&q=${encodeURIComponent(q)}`),
};
