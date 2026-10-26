import React from 'react';

export function Card({ title, right, children, style }) {
  return (
    <div className="eg-card" style={style}>
      {(title || right) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          {title ? <h3 style={{ margin: 0 }}>{title}</h3> : <span />}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Pill({ level = 'ok', children }) {
  const dot = { ok: '#639922', warn: '#BA7517', err: '#A32D2D', info: '#185FA5' }[level] || '#639922';
  return (
    <span className={`eg-pill ${level}`}>
      <span className="eg-dot" style={{ background: dot }} />
      {children}
    </span>
  );
}

export function Toggle({ on, onChange }) {
  return (
    <button className={`eg-toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)} aria-pressed={on}>
      <span />
    </button>
  );
}

export function Table({ cols, rows }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="eg-table">
        <thead><tr>{cols.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
