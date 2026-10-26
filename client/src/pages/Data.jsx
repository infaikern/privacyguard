import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Card, Pill } from '../components/ui.jsx';

export default function Data() {
  const [sources, setSources] = useState([]);
  const [active, setActive] = useState('weather');
  const [data, setData] = useState(null);

  useEffect(() => { api.dataSources().then(setSources).catch(() => {}); }, []);
  const load = (id) => api.dataSource(id).then(setData).catch(() => {});
  useEffect(() => { load(active); }, [active]);

  return (
    <>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {sources.map(s => (
          <button key={s.id} className={`eg-btn sm ${active === s.id ? '' : 'ghost'}`} onClick={() => setActive(s.id)}>{s.label}</button>
        ))}
      </div>
      {data && (
        <Card
          title={data.label}
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Pill level={data.status?.level || 'ok'}>{data.status?.level === 'ok' ? 'Live' : data.status?.level === 'warn' ? 'Standby' : 'Fallback'}</Pill>
              <button className="eg-btn sm ghost" onClick={() => load(active)}><i className="ti ti-refresh" /> Refresh</button>
            </div>
          }
          style={{ overflowX: 'auto' }}
        >
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14, marginTop: -6 }}>
            {data.iface} · {data.endpoint} · updated {data.interval}{data.status?.text ? ` · ${data.status.text}` : ''}
          </div>
          <table className="eg-table">
            <thead><tr>{data.cols.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
            <tbody>{data.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
          </table>
        </Card>
      )}
    </>
  );
}
