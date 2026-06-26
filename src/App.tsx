import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { IndustrialShell } from '@/components/layout/IndustrialShell';
import { useIndustrialProfile } from '@/context/IndustrialProfileContext';
import { MobileApp } from '@/mobile/OperatorPieceView';
import { BoxPage } from '@/pages/BoxPage';
import { FactoryFloorPage } from '@/pages/FactoryFloorPage';
import { PiecePage } from '@/pages/PiecePage';
import { ProjectDashboardPage } from '@/pages/ProjectDashboardPage';
import { ProjectsListPage } from '@/pages/ProjectsListPage';
import { QrRedirectPage } from '@/pages/QrRedirectPage';
import { SupervisorDashboardPage } from '@/pages/SupervisorDashboardPage';

function isLikelyQr(segment: string): boolean {
  return /^[a-z0-9]{6,14}$/i.test(segment) && !segment.includes('_');
}

function SupervisorRoute({ children }: { children: ReactNode }) {
  const { isSupervisor } = useIndustrialProfile();
  if (!isSupervisor) return <Navigate to="/mobile" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <IndustrialShell>
      <Routes>
        <Route path="/PROJETOS" element={<ProjectsListPage />} />
        <Route
          path="/PROJETOS/:user/:project/supervisor"
          element={
            <SupervisorRoute>
              <SupervisorDashboardPage />
            </SupervisorRoute>
          }
        />
        <Route
          path="/PROJETOS/:user/:project"
          element={
            <SupervisorRoute>
              <ProjectDashboardPage />
            </SupervisorRoute>
          }
        />
        <Route
          path="/PROJETOS/:user/:project/:box"
          element={
            <SupervisorRoute>
              <BoxPage />
            </SupervisorRoute>
          }
        />
        <Route path="/PROJETOS/:user/:project/:box/:pieceName" element={<PiecePage />} />
        <Route
          path="/PROJETOS/:qrOrUser"
          element={<QrRedirectPage isQrCheck={isLikelyQr} />}
        />
        <Route
          path="/FACTORY"
          element={
            <SupervisorRoute>
              <FactoryFloorPage />
            </SupervisorRoute>
          }
        />
        <Route path="/mobile" element={<MobileApp />} />
        <Route path="/" element={<Navigate to="/PROJETOS" replace />} />
        <Route path="*" element={<Navigate to="/PROJETOS" replace />} />
      </Routes>
    </IndustrialShell>
  );
}
