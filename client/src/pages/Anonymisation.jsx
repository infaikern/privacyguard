import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { Card, Pill, Toggle } from '../components/ui.jsx';

const STAGES = ['Ingest', 'Normalise', 'Pseudonymise', 'Noise', 'Generalise', 'Validate', 'Transmit'];
const SOURCES = [
  { id: 'weather', label: 'Weather', iface: 'REST API' },
  { id: 'energy', label: 'Energy market', iface: 'REST API' },
  { id: 'schedules', label: 'Vehicle schedules', iface: 'REST API' },
  { id: 'charging', label: 'Charging tables', iface: 'OCPP 1.6' },
  { id: 'pv', label: 'PV / battery', iface: 'Modbus TCP' },
  { id: 'grid', label: 'Grid signals', iface: 'MQTT' },
];

export default function Anonymisation() {
  const [levels, setLevels] = useState([]);
  const [level, setLevel] = useState('moderate');
  const [tech, setTech] = useState({ pseudonymisation: true, noise: true, generalisation: true });
  const [selected, setSelected] = useState(new Set(SOURCES.map(s => s.id)));
  const [estimate, setEstimate] = useState({ risk: 0, utility: 0 });
  const [pipelineOn, setPipelineOn] = useState(true);
  const [activeStage, setActiveStage] = useState(-1);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => { api.anonLevels().then(setLevels).catch(() => {}); }, []);
  useEffect(() => {
    api.anonEstimate({ level, techniques: tech }).then(setEstimate).catch(() => {});
  }, [level, tech]);

  const toggleSource = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const run = async () => {
    if (!pipelineOn) return;
    if (selected.size === 0) { setStatus('No data sources selected — choose at least one to build a package.'); return; }
    for (let i = 0; i < STAGES.length; i++) {
      setActiveStage(i); setStatus('Running: ' + STAGES[i]);
      await new Promise(r => setTimeout(r, 180));
    }
    setActiveStage(-1);
    try {
      const res = await api.anonRun({ level, techniques: tech, sources: [...selected] });
      setResult(res);
      const labels = SOURCES.filter(s => selected.has(s.id)).map(s => s.label).join(', ');
      setStatus(`Package built — ${selected.size} source(s): ${labels}`);
    } catch (e) { setStatus('Backend error while building package.'); }
  };

  const fmtRow = (r) => [r.driver, r.vehicleId, `${r.lat}, ${r.lon}`, r.energyKwh];

  return (
    <>
      <Card title="Anonymisation level" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {levels.map(l => (
            <div key={l.id} className={`eg-radio-card ${level === l.id ? 'sel' : ''}`} onClick={() => setLevel(l.id)}>
              <div style={{ fontWeight: 500 }}>{l.label}</div>
              <div style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>ε = {l.epsilon}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Data sources in package" right={<span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{selected.size} of {SOURCES.length} selected</span>} style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14, marginTop: -6 }}>Select which sources are included in the anonymised data package sent to the cloud.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
          {SOURCES.map(s => (
            <div key={s.id} className={`eg-src-card ${selected.has(s.id) ? 'sel' : ''}`} onClick={() => toggleSource(s.id)}>
              <div className="eg-src-check"><i className="ti ti-check" /></div>
              <div><div style={{ fontWeight: 500 }}>{s.label}</div><div style={{ color: 'var(--color-text-secondary)', marginTop: 1 }}>{s.iface}</div></div>
            </div>
          ))}
        </div>
      </Card>

      <div className="eg-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Card title="Techniques applied">
          {[['pseudonymisation', 'Pseudonymisation', 'Driver & vehicle ID hashing'], ['noise', 'Noise injection', 'Differential privacy (Laplace/Gaussian)'], ['generalisation', 'Generalisation', 'Geo rounding & time binning']].map(([k, t, sub]) => (
            <div className="eg-toggle-row" key={k}>
              <div><div style={{ fontSize: 12, fontWeight: 500 }}>{t}</div><div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{sub}</div></div>
              <Toggle on={tech[k]} onChange={v => setTech({ ...tech, [k]: v })} />
            </div>
          ))}
        </Card>
        <Card title="Privacy / utility estimate">
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}><span>Re-identification risk</span><span>{Math.round(estimate.risk * 100)}%</span></div>
            <div className="eg-bar"><div style={{ width: `${Math.round(estimate.risk * 100)}%`, background: '#E24B4A' }} /></div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}><span>Data utility retained</span><span>{Math.round(estimate.utility * 100)}%</span></div>
            <div className="eg-bar"><div style={{ width: `${Math.round(estimate.utility * 100)}%`, background: '#1D9E75' }} /></div>
          </div>
        </Card>
      </div>

      <Card style={{ marginTop: 14 }}
        title="Anonymisation pipeline"
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Pill level={pipelineOn ? 'ok' : 'err'}>{pipelineOn ? 'Active' : 'Disabled'}</Pill>
            <Toggle on={pipelineOn} onChange={setPipelineOn} />
          </div>
        }>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', opacity: pipelineOn ? 1 : 0.35 }}>
          {STAGES.map((s, i) => <div key={s} className={`eg-stage ${activeStage === i ? 'active' : ''}`}>{s}</div>)}
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="eg-btn" onClick={run} disabled={!pipelineOn}>Run</button>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{pipelineOn ? status : 'Pipeline disabled — data passes through without anonymisation'}</span>
        </div>
      </Card>

      {result && (
        <div className="eg-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 14 }}>
          <Card title="Raw input" style={{ overflowX: 'auto' }}>
            <table className="eg-table"><thead><tr><th>Driver</th><th>Vehicle</th><th>Location</th><th>kWh</th></tr></thead>
              <tbody>{result.raw.map((r, i) => <tr key={i}>{fmtRow(r).map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>
          </Card>
          <Card title="Anonymised output" style={{ overflowX: 'auto' }}>
            <table className="eg-table"><thead><tr><th>Driver</th><th>Vehicle</th><th>Location</th><th>kWh</th></tr></thead>
              <tbody>{result.anonymised.map((r, i) => <tr key={i}>{fmtRow(r).map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>
          </Card>
        </div>
      )}
    </>
  );
}
