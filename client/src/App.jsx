import React, { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Topbar from './components/Topbar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Gateway from './pages/Gateway.jsx';
import Data from './pages/Data.jsx';
import Anonymisation from './pages/Anonymisation.jsx';
import Model from './pages/Model.jsx';
import Logs from './pages/Logs.jsx';

const TITLES = {
  dashboard: 'Dashboard', gateway: 'Gateway', anon: 'Anonymisation',
  data: 'Data sources', model: 'Model computation', logs: 'Logs',
};

export default function App() {
  const [page, setPage] = useState('dashboard');

  const render = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'gateway': return <Gateway />;
      case 'data': return <Data />;
      case 'anon': return <Anonymisation />;
      case 'model': return <Model />;
      case 'logs': return <Logs />;
      default: return null;
    }
  };

  return (
    <div className="eg">
      <Sidebar page={page} setPage={setPage} />
      <div className="eg-main">
        <Topbar title={TITLES[page]} />
        <div className="eg-body">{render()}</div>
      </div>
    </div>
  );
}
