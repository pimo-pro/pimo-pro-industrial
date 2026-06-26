import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import type { SupervisorDashboardSnapshot } from '@/industrial/supervisor/snapshot';
import { getSupervisorDashboard } from '@/services/mesApi';

export function SupervisorDashboardPage() {
  const { user, project } = useParams<{ user: string; project: string }>();
  const [data, setData] = useState<SupervisorDashboardSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !project) return;
    getSupervisorDashboard(user, project)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [user, project]);

  if (error) return <p className="industrial-error">{error}</p>;
  if (!data) return <p>A carregar supervisor…</p>;

  const { project: dash, stationKpis, qualityKpi, timeKpi, delayedPieces, alerts } = data;

  return (
    <div className="industrial-page">
      <header className="industrial-page-header">
        <div>
          <Link to={`/PROJETOS/${user}/${project}`}>← Projeto</Link>
          <h1>Supervisor — {dash.projectDisplayName}</h1>
        </div>
      </header>

      <section className="industrial-kpi-grid">
        <KpiCard label="Peças concluídas" value={`${dash.completedPieces}/${dash.totalPieces}`} />
        <KpiCard label="Sessões activas" value={String(timeKpi.activeSessions)} />
        <KpiCard label="Rework aberto" value={String(qualityKpi.openRework)} />
        <KpiCard label="Produtividade média" value={`${timeKpi.avgProductivityPerHour}/h`} />
      </section>

      <section className="industrial-two-col">
        <Panel title="Estações">
          <table className="industrial-table">
            <thead>
              <tr>
                <th>Estação</th>
                <th>Pendente</th>
                <th>Em curso</th>
                <th>Concluído</th>
              </tr>
            </thead>
            <tbody>
              {stationKpis.map((s) => (
                <tr key={s.station}>
                  <td>{s.station}</td>
                  <td>{s.pendingTasks}</td>
                  <td>{s.inProgressTasks}</td>
                  <td>{s.completedTasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Alertas recentes">
          <ul className="industrial-list">
            {alerts.length === 0 ? <li>Sem alertas</li> : null}
            {alerts.map((a, i) => (
              <li key={`${a.pieceName}-${i}`}>
                <strong>{a.pieceName}</strong> — {a.message}
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <section className="industrial-two-col">
        <Panel title="Peças em atraso">
          <ul className="industrial-list">
            {delayedPieces.length === 0 ? <li>Nenhuma</li> : null}
            {delayedPieces.map((p) => (
              <li key={p.pieceName}>
                <Link to={`/PROJETOS/${user}/${project}/${p.boxSlug}/${p.pieceName}`}>
                  {p.pieceName}
                </Link>{' '}
                — {p.reason}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Qualidade">
          <ul className="industrial-list">
            <li>Aprovadas: {qualityKpi.approvedInspections}</li>
            <li>Bloqueantes: {qualityKpi.blockingInspections}</li>
            <li>Rejeitadas: {qualityKpi.rejectedPieces}</li>
          </ul>
        </Panel>
      </section>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="industrial-kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="industrial-panel">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
