import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Card, Pill } from '../components/ui.jsx';

function Stat({ value, label, bar, barColor, children }) {
  return (
    <div className="eg-card">
      <div className="eg-stat-val">{value}</div>
      <div className="eg-stat-label">{label}</div>
      {bar != null && <div className="eg-bar"><div style={{ width: `${bar}%`, background: barColor }} /></div>}
      {children}
    </div>
  );
}

function FlowChart({ data }) {
  const X0 = 48, X1 = 888, Y0 = 14, Y1 = 160, yMax = 20;
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const pts = data.map((v, i) => {
    const x = X0 + (i / (data.length - 1)) * (X1 - X0);
    const y = Y1 - (Math.min(yMax, v) / yMax) * (Y1 - Y0);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const grid = [];
  for (let v = 0; v <= yMax; v += 5) {
    const y = Y1 - (v / yMax) * (Y1 - Y0);
    grid.push(<line key={`g${v}`} x1={X0} y1={y} x2={X1} y2={y} stroke="var(--color-border-tertiary)" strokeWidth="0.75" strokeDasharray={v > 0 ? '3 4' : ''} />);
    grid.push(<text key={`gt${v}`} x={X0 - 7} y={y + 3.5} textAnchor="end" fill="var(--color-text-tertiary)" fontSize="8" fontFamily="var(--font-sans)">{v}</text>);
  }
  const xt = [];
  for (let i = 0; i <= 4; i++) {
    const x = X0 + (i / 4) * (X1 - X0);
    const t = new Date(now.getTime() - Math.round(60 - (i / 4) * 60) * 60000);
    xt.push(<text key={`x${i}`} x={x} y={Y1 + 14} textAnchor="middle" fill="var(--color-text-tertiary)" fontSize="8" fontFamily="var(--font-sans)">{i === 4 ? 'now' : `${pad(t.getHours())}:${pad(t.getMinutes())}`}</text>);
  }
  return (
    <svg viewBox="0 0 900 200" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', display: 'block' }}>
      {grid}{xt}
      <polygon fill="#1D9E75" fillOpacity="0.08" points={`${X0},${Y1} ${pts.join(' ')} ${X1},${Y1}`} />
      <polyline fill="none" stroke="#1D9E75" strokeWidth="1.5" points={pts.join(' ')} />
      <line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke="var(--color-border-secondary)" strokeWidth="0.75" />
      <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke="var(--color-border-secondary)" strokeWidth="0.75" />
      <text x="13" y="87" transform="rotate(-90,13,87)" textAnchor="middle" fill="var(--color-text-secondary)" fontSize="9" fontFamily="var(--font-sans)">Throughput (MB/s)</text>
      <text x="468" y="194" textAnchor="middle" fill="var(--color-text-secondary)" fontSize="9" fontFamily="var(--font-sans)">Time (last 60 minutes)</text>
    </svg>
  );
}

export default function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => api.dashboard().then(r => { if (alive) setD(r); }).catch(() => {});
    load();
    const t = setInterval(load, 3000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  if (!d) return <div style={{ color: 'var(--color-text-secondary)' }}>Loading…</div>;

  return (
    <>
      <div className="eg-stat-grid">
        <Stat value={`${d.cpu}%`} label="CPU load" bar={d.cpu} barColor={d.cpu > 80 ? '#E24B4A' : d.cpu > 60 ? '#BA7517' : '#1D9E75'} />
        <Stat value={`${d.mem}%`} label="Memory usage" bar={d.mem} barColor="#378ADD" />
        <Stat value={d.throughput} label="Throughput (rec/s)" bar={Math.min(100, d.throughput / 2.5)} barColor="#7F77DD" />
        <Stat value={d.uptime} label="Uptime"><div style={{ marginTop: 8 }}><Pill level="ok">{d.availability} availability</Pill></div></Stat>
      </div>

      <div className="eg-grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <Card title="Component health">
          <table className="eg-table"><tbody>
            {d.health.map((h, i) => (
              <tr key={i}><td>{h.name}</td><td style={{ textAlign: 'right' }}><Pill level={h.level}>{h.text}</Pill></td></tr>
            ))}
          </tbody></table>
        </Card>
        <Card title="Active alerts">
          {d.alerts.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: 10, border: '1px solid var(--color-border-tertiary)', borderRadius: 8, marginBottom: 10 }}>
              <Pill level={a.level === 'info' ? 'info' : a.level}>{a.level.toUpperCase()}</Pill>
              <div style={{ fontSize: 12 }}>{a.text}</div>
            </div>
          ))}
        </Card>
      </div>

      <Card title="Data flow — last hour" style={{ marginTop: 14 }}>
        <FlowChart data={d.flow} />
      </Card>
    </>
  );
}
