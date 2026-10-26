import React, { useEffect, useState } from 'react';
import { Pill } from './ui.jsx';

export default function Topbar({ title }) {
  const [time, setTime] = useState('--:--:--');
  const [loggedIn, setLoggedIn] = useState(true);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n) => String(n).padStart(2, '0');
      setTime(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="eg-top">
      <h1>{title}</h1>
      <div className="eg-top-right">
        <Pill level="ok">Operational</Pill>
        <span className="eg-clock"><i className="ti ti-clock" aria-hidden="true" />{time}</span>
        {loggedIn && (
          <div className="eg-user">
            <span className="eg-user-avatar"><i className="ti ti-user" aria-hidden="true" /></span>
            <span className="eg-user-name">Heiko Naumann</span>
          </div>
        )}
        <button className={`eg-btn sm ${loggedIn ? 'ghost' : ''}`} onClick={() => setLoggedIn(v => !v)}>
          <i className={`ti ${loggedIn ? 'ti-logout' : 'ti-login'}`} aria-hidden="true" /> {loggedIn ? 'Log out' : 'Log in'}
        </button>
      </div>
    </div>
  );
}
