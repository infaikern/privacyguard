import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Card, Pill, Toggle } from '../components/ui.jsx';

function Field({ label, children }) {
  return <div className="eg-field"><label>{label}</label>{children}</div>;
}

export default function Gateway() {
  const [cfg, setCfg] = useState(null);
  const [conns, setConns] = useState([]);
  const [users, setUsers] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.gatewayConfig().then(setCfg).catch(() => {});
    api.connections().then(setConns).catch(() => {});
    api.users().then(setUsers).catch(() => {});
  }, []);

  if (!cfg) return <div style={{ color: 'var(--color-text-secondary)' }}>Loading…</div>;

  const upNet = (k, v) => setCfg({ ...cfg, network: { ...cfg.network, [k]: v } });
  const upTr = (k, v) => setCfg({ ...cfg, transmission: { ...cfg.transmission, [k]: v } });
  const upEnc = (k, v) => setCfg({ ...cfg, encryption: { ...cfg.encryption, [k]: v } });
  const save = () => api.saveGatewayConfig(cfg).then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000); });

  const connStatus = (s) => ({ ok: ['ok', 'Connected'], warn: ['warn', 'Unstable'], err: ['err', 'Disconnected'] }[s]);

  return (
    <>
      <div className="eg-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Card title="Network connection">
          <Field label="Connection mode">
            <select className="eg-select" value={cfg.network.mode} onChange={e => upNet('mode', e.target.value)}>
              <option>Ethernet (static IP)</option><option>Ethernet (DHCP)</option><option>LTE / 5G fallback</option>
            </select>
          </Field>
          <div className="eg-row2">
            <Field label="IP address"><input className="eg-input" value={cfg.network.ip} onChange={e => upNet('ip', e.target.value)} /></Field>
            <Field label="Subnet mask"><input className="eg-input" value={cfg.network.subnet} onChange={e => upNet('subnet', e.target.value)} /></Field>
          </div>
          <div className="eg-row2">
            <Field label="Gateway"><input className="eg-input" value={cfg.network.gateway} onChange={e => upNet('gateway', e.target.value)} /></Field>
            <Field label="DNS"><input className="eg-input" value={cfg.network.dns} onChange={e => upNet('dns', e.target.value)} /></Field>
          </div>
        </Card>

        <Card title="Data transmission">
          <Field label="Cloud backend endpoint"><input className="eg-input" value={cfg.transmission.endpoint} onChange={e => upTr('endpoint', e.target.value)} /></Field>
          <div className="eg-row2">
            <Field label="Transmission interval">
              <select className="eg-select" value={cfg.transmission.interval} onChange={e => upTr('interval', e.target.value)}>
                <option>Real-time (streaming)</option><option>Every 5 minutes</option><option>Every 15 minutes</option><option>Hourly batch</option>
              </select>
            </Field>
            <Field label="Protocol">
              <select className="eg-select" value={cfg.transmission.protocol} onChange={e => upTr('protocol', e.target.value)}>
                <option>MQTT over TLS</option><option>HTTPS / REST</option><option>AMQP</option>
              </select>
            </Field>
          </div>
          <div className="eg-toggle-row"><div><div style={{ fontSize: 12, fontWeight: 500 }}>Store &amp; forward</div><div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Buffer data if connection drops</div></div><Toggle on={cfg.transmission.storeForward} onChange={v => upTr('storeForward', v)} /></div>
          <div className="eg-toggle-row"><div><div style={{ fontSize: 12, fontWeight: 500 }}>Compress payload</div><div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>gzip before transmission</div></div><Toggle on={cfg.transmission.compress} onChange={v => upTr('compress', v)} /></div>
        </Card>
      </div>

      <Card title="External data connections" style={{ marginTop: 14, overflowX: 'auto' }}
        right={<button className="eg-btn sm"><i className="ti ti-plus" /> Add connection</button>}>
        <table className="eg-table">
          <thead><tr><th>Source</th><th>Interface</th><th>Endpoint / address</th><th>Interval</th><th>Status</th></tr></thead>
          <tbody>
            {conns.map((c, i) => {
              const [lvl, lbl] = connStatus(c.status);
              return <tr key={i} title={c.detail || ''}><td style={{ fontWeight: 500 }}>{c.source}</td><td>{c.iface}</td><td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{c.endpoint}</td><td>{c.interval}</td><td><Pill level={lvl}>{lbl}</Pill></td></tr>;
            })}
          </tbody>
        </table>
      </Card>

      <div className="eg-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 14 }}>
        <Card title="User management">
          <table className="eg-table">
            <thead><tr><th>User</th><th>Role</th><th>Status</th></tr></thead>
            <tbody>{users.map((u, i) => <tr key={i}><td style={{ fontWeight: 500 }}>{u.name}</td><td>{u.role}</td><td><Pill level="ok">{u.status}</Pill></td></tr>)}</tbody>
          </table>
          <button className="eg-btn sm ghost" style={{ marginTop: 12 }}><i className="ti ti-user-plus" /> Invite user</button>
        </Card>

        <Card title="Encryption settings">
          <Field label="TLS version">
            <select className="eg-select" value={cfg.encryption.tlsVersion} onChange={e => upEnc('tlsVersion', e.target.value)}><option>TLS 1.3</option><option>TLS 1.2</option></select>
          </Field>
          <Field label="Cipher suite">
            <select className="eg-select" value={cfg.encryption.cipher} onChange={e => upEnc('cipher', e.target.value)}><option>AES-256-GCM</option><option>ChaCha20-Poly1305</option></select>
          </Field>
          <div className="eg-toggle-row"><div><div style={{ fontSize: 12, fontWeight: 500 }}>Mutual TLS (mTLS)</div><div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Client certificate required</div></div><Toggle on={cfg.encryption.mtls} onChange={v => upEnc('mtls', v)} /></div>
          <div className="eg-toggle-row"><div><div style={{ fontSize: 12, fontWeight: 500 }}>Secure boot</div><div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Verify firmware signature</div></div><Toggle on={cfg.encryption.secureBoot} onChange={v => upEnc('secureBoot', v)} /></div>
          <Field label="Certificate expiry"><div style={{ fontSize: 12 }}><Pill level="ok">Valid until {cfg.encryption.certExpiry}</Pill></div></Field>
        </Card>
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="eg-btn" onClick={save}>Save configuration</button>
        {saved && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Configuration saved to backend.</span>}
      </div>
    </>
  );
}
