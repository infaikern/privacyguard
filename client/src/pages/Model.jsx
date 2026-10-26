import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Card, Pill, Toggle } from '../components/ui.jsx';

function statusLevel(s) {
  return s === 'Computing…' ? 'warn' : s === 'Failed' ? 'err' : 'ok';
}

export default function Model() {
  const [models, setModels] = useState([]);
  const [on, setOn] = useState(true);
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState(null);
  const [openId, setOpenId] = useState(null);
  const timer = useRef(null);

  const load = () => api.models().then(setModels).catch(() => {});
  useEffect(() => { load(); }, []);

  const compute = async () => {
    setStatus('Packaging anonymised data & transmitting to backend (TLS 1.3)…');
    try {
      const m = await api.computeModel();
      await load();
      setStatus(`Model "${m.name}" computed and deployed — accuracy ${m.accuracy}%`);
    } catch { setStatus('Backend error during computation.'); }
  };

  useEffect(() => {
    if (on) {
      setStatus('Backend computation active — new models are computed automatically.');
      compute();
      timer.current = setInterval(compute, 12000);
    } else {
      setStatus('Backend computation paused — no data is sent and no new models are computed.');
      if (timer.current) { clearInterval(timer.current); timer.current = null; }
    }
    return () => { if (timer.current) { clearInterval(timer.current); timer.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);

  const openDetail = (m) => {
    if (m.status === 'Computing…') return;
    setOpenId(m.id);
    api.model(m.id).then(setDetail).catch(() => {});
  };

  return (
    <>
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: '0 0 4px' }}>Backend model computation</h3>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Anonymised data packages are sent to the cloud backend, where optimisation models are computed and returned to the edge.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Pill level={on ? 'ok' : 'err'}>{on ? 'Computation active' : 'Computation paused'}</Pill>
            <Toggle on={on} onChange={setOn} />
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 10 }}>{status}</div>
      </Card>

      <Card title="Computed models" right={<span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{models.length} model(s) — click a row for results</span>} style={{ overflowX: 'auto' }}>
        <table className="eg-table">
          <thead><tr><th>Model</th><th>Type</th><th>Scope</th><th>Accuracy</th><th>Computed</th><th>Status</th></tr></thead>
          <tbody>
            {models.map(m => (
              <tr key={m.id}
                onClick={() => openDetail(m)}
                style={{ cursor: m.status === 'Computing…' ? 'default' : 'pointer', background: m.id === openId ? 'rgba(93,202,165,0.10)' : '' }}>
                <td style={{ fontWeight: 500 }}>{m.name}<div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>{m.id}</div></td>
                <td>{m.type}</td><td>{m.scope}</td><td>{m.accuracy ? `${m.accuracy}%` : '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{m.computed}</td>
                <td><Pill level={statusLevel(m.status)}>{m.status}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {detail && (
        <Card style={{ marginTop: 14, overflowX: 'auto' }}
          title={`${detail.name} — results`}
          right={<button className="eg-btn sm ghost" onClick={() => { setDetail(null); setOpenId(null); }}><i className="ti ti-x" /> Close</button>}>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14, marginTop: -6 }}>
            {detail.id} · {detail.type} · {detail.scope} · accuracy {detail.accuracy}% · computed {detail.computed}
          </div>
          <table className="eg-table">
            <thead><tr>{detail.detail.cols.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
            <tbody>{detail.detail.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
          </table>
        </Card>
      )}
    </>
  );
}
