import React from 'react';

const NAV = [
  { group: 1, id: 'dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard' },
  { group: 2, id: 'data', label: 'Data', icon: 'ti-database' },
  { group: 2, id: 'anon', label: 'Anonymisation', icon: 'ti-eye-off' },
  { group: 2, id: 'model', label: 'Model', icon: 'ti-cpu' },
  { group: 3, id: 'gateway', label: 'Gateway', icon: 'ti-settings' },
  { group: 3, id: 'logs', label: 'Logs', icon: 'ti-list-details' },
];

export default function Sidebar({ page, setPage }) {
  const items = [];
  let lastGroup = NAV[0].group;
  NAV.forEach((n) => {
    if (n.group !== lastGroup) { items.push(<div className="eg-nav-sep" key={`sep-${n.id}`} />); lastGroup = n.group; }
    items.push(
      <button key={n.id} className={`eg-nav ${page === n.id ? 'active' : ''}`} onClick={() => setPage(n.id)}>
        <i className={`ti ${n.icon}`} aria-hidden="true" /><span>{n.label}</span>
      </button>
    );
  });

  return (
    <nav className="eg-side">
      <div className="eg-brand">
        <div className="eg-brand-mark"><i className="ti ti-shield-lock" aria-hidden="true" /></div>
        <div><div className="eg-brand-txt">PrivacyGuard</div><div className="eg-brand-sub">Edge gateway</div></div>
      </div>
      {items}
      <div className="eg-side-foot">Gateway ID: GW-NK-01<br />Firmware v2.4.1</div>
    </nav>
  );
}
