import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

import { useIndustrialProfile } from '@/context/IndustrialProfileContext';
import { connectWebSocket, getRealtimeStatus } from '@/core/realtime';

export function IndustrialShell({ children }: { children: ReactNode }) {
  const { profile, setProfile } = useIndustrialProfile();
  const [rtStatus, setRtStatus] = useState(getRealtimeStatus());

  useEffect(() => {
    connectWebSocket();
    const id = setInterval(() => setRtStatus(getRealtimeStatus()), 2000);
    return () => clearInterval(id);
  }, []);

  const online = rtStatus === 'connected';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <small>PIMO-TRAK</small>
          <strong>
            <Link to="/PROJETOS" style={{ color: 'inherit', textDecoration: 'none' }}>
              pimo.pro-industrial
            </Link>
          </strong>
        </div>
        <nav className="app-nav">
          <Link to="/PROJETOS">Projetos</Link>
          {profile === 'supervisor' && <Link to="/FACTORY">Chão de fábrica</Link>}
          <Link to="/mobile">Operador (PWA)</Link>
          <span className={`realtime-pill rt-${rtStatus}`}>{online ? 'ONLINE' : 'OFFLINE'}</span>
          <select
            className="profile-select"
            value={profile}
            onChange={(e) => setProfile(e.target.value as 'supervisor' | 'operator')}
            aria-label="Perfil industrial"
          >
            <option value="supervisor">Supervisor</option>
            <option value="operator">Operador</option>
          </select>
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
