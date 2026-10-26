import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Card } from '../components/ui.jsx';

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [q, setQ] = useState('');
  const [sev, setSev] = useState('');

  const load = () => api.logs({ severity: sev, q }).then(setLogs).catch(() => {});
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [sev, q]);

  return (
    <Card>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <input className="eg-input" placeholder="Search logs..." value={q} onChange={e => setQ(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
        <select className="eg-select" value={sev} onChange={e => setSev(e.target.value)} style={{ width: 'auto' }}>
          <option value="">All severities</option><option>INFO</option><option>WARN</option><option>ERROR</option><option>DEBUG</option>
        </select>
        <button className="eg-btn sm ghost" onClick={load}><i className="ti ti-refresh" /> Refresh</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="eg-table" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          <thead><tr><th>Timestamp</th><th>Severity</th><th>Component</th><th>Message</th></tr></thead>
          <tbody>
            {logs.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 20 }}>No matching log entries</td></tr>}
            {logs.map((l, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>{l.timestamp}</td>
                <td><span className={`eg-sev ${l.severity}`}>{l.severity}</span></td>
                <td>{l.component}</td>
                <td>{l.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
