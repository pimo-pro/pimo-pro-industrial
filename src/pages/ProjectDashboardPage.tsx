import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { alertSeverityClass } from '@/core/alerts';
import { ProgressBar } from '@/components/common/ProgressBar';
import { getProjectDashboard } from '@/services/industrialApi';
import type { ProjectDashboard } from '@/types/piece';

export function ProjectDashboardPage() {
  const { user, project } = useParams<{ user: string; project: string }>();
  const [data, setData] = useState<ProjectDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !project) return;
    getProjectDashboard(user, project)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, project]);

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>A carregar projeto…</p>;
  if (error || !data) return <p style={{ color: 'var(--danger)' }}>{error ?? 'Projeto não encontrado'}</p>;

  return (
    <section>
      <nav className="breadcrumb">
        <Link to="/PROJETOS">Projetos</Link>
        <span>/</span>
        <span>{data.user}</span>
        <span>/</span>
        <span>{data.projectDisplayName}</span>
      </nav>

      <h1 className="page-title">{data.projectDisplayName}</h1>
      <p className="page-subtitle">
        Dashboard Industrial ·{' '}
        <Link to={`/PROJETOS/${user}/${project}/supervisor`}>Supervisor MES</Link>
      </p>

      <h2 style={{ fontSize: 16, marginBottom: 12, color: 'var(--text-muted)' }}>Estado geral</h2>
      <div className="kpi-row">
        <div className="kpi">
          <strong>{data.totalPieces}</strong>
          <span>Peças totais</span>
        </div>
        <div className="kpi">
          <strong>{data.completedPieces}</strong>
          <span>Concluídas</span>
        </div>
        <div className="kpi">
          <strong>{data.pendingPieces}</strong>
          <span>Pendentes</span>
        </div>
        <div className="kpi">
          <strong>{data.inProgressPieces}</strong>
          <span>Em processo</span>
        </div>
        <div className="kpi">
          <strong>{data.progressPercent}%</strong>
          <span>Progresso médio</span>
        </div>
        <div className="kpi">
          <strong>
            {data.completedWorkOrders}/{data.totalWorkOrders}
          </strong>
          <span>Work Orders</span>
        </div>
      </div>

      <h2 style={{ fontSize: 16, margin: '24px 0 12px', color: 'var(--text-muted)' }}>Estado de sincronização</h2>
      <div className="kpi-row">
        <div className="kpi">
          <strong>{data.syncSummary.inSync}</strong>
          <span>IN_SYNC</span>
        </div>
        <div className="kpi">
          <strong>{data.syncSummary.outOfSync}</strong>
          <span>Desatualizadas</span>
        </div>
        <div className="kpi">
          <strong>{data.syncSummary.conflict}</strong>
          <span>Conflitos</span>
        </div>
      </div>

      {data.factories.length > 0 ? (
        <>
          <h2 style={{ fontSize: 16, margin: '0 0 12px', color: 'var(--text-muted)' }}>Fábricas</h2>
          <table className="table" style={{ marginBottom: 24 }}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Sessões activas</th>
                <th>Produtividade</th>
              </tr>
            </thead>
            <tbody>
              {data.factories.map((f) => (
                <tr key={f.factoryId}>
                  <td>{f.factoryId}</td>
                  <td>{f.nome}</td>
                  <td>{f.sessoesAtivas}</td>
                  <td>{f.produtividadeAgregada}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {data.conflictPieces.length > 0 ? (
        <>
          <h2 style={{ fontSize: 16, margin: '0 0 12px', color: 'var(--text-muted)' }}>Peças com conflito</h2>
          <table className="table" style={{ marginBottom: 24 }}>
            <tbody>
              {data.conflictPieces.map((p) => (
                <tr key={`${p.boxSlug}-${p.pieceName}`}>
                  <td>
                    <Link to={`/PROJETOS/${data.user}/${data.project}/${p.boxSlug}/${p.pieceName}`}>
                      {p.pieceName}
                    </Link>
                  </td>
                  <td>{p.qr ?? '—'}</td>
                  <td>{p.syncStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {data.outOfSyncPieces.length > 0 ? (
        <>
          <h2 style={{ fontSize: 16, margin: '0 0 12px', color: 'var(--text-muted)' }}>Peças desatualizadas</h2>
          <table className="table" style={{ marginBottom: 24 }}>
            <tbody>
              {data.outOfSyncPieces.slice(0, 15).map((p) => (
                <tr key={`os-${p.boxSlug}-${p.pieceName}`}>
                  <td>
                    <Link to={`/PROJETOS/${data.user}/${data.project}/${p.boxSlug}/${p.pieceName}`}>
                      {p.pieceName}
                    </Link>
                  </td>
                  <td>{p.source ?? 'LOCAL'}</td>
                  <td>{p.syncedAt ? new Date(p.syncedAt).toLocaleString('pt-PT') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {data.activeAlerts.length > 0 ? (
        <>
          <h2 style={{ fontSize: 16, margin: '24px 0 12px', color: 'var(--text-muted)' }}>Alertas activos</h2>
          <div style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
            {data.activeAlerts.slice(0, 10).map((alert, i) => (
              <div key={`${alert.timestamp}-${i}`} className={`alert-item ${alertSeverityClass(alert.type)}`}>
                <strong>{alert.type}</strong>
                {alert.pieceName ? <span style={{ marginLeft: 8 }}>{alert.pieceName}</span> : null}
                <span style={{ marginLeft: 8, fontSize: 13 }}>{alert.message}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {data.anomalies.length > 0 ? (
        <>
          <h2 style={{ fontSize: 16, margin: '0 0 12px', color: 'var(--text-muted)' }}>Anomalias</h2>
          <ul style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            {data.anomalies.slice(0, 8).map((a) => (
              <li key={`${a.anomalyCode}-${a.timestamp}`}>
                [{a.severity}] {a.message}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {data.atRiskPieces.length > 0 ? (
        <>
          <h2 style={{ fontSize: 16, margin: '0 0 12px', color: 'var(--text-muted)' }}>Peças com risco de atraso</h2>
          <table className="table" style={{ marginBottom: 24 }}>
            <thead>
              <tr>
                <th>Peça</th>
                <th>Caixa</th>
                <th>Motivo</th>
                <th>Severidade</th>
              </tr>
            </thead>
            <tbody>
              {data.atRiskPieces.map((item) => (
                <tr key={`${item.boxSlug}-${item.pieceName}`}>
                  <td>
                    <Link to={`/PROJETOS/${data.user}/${data.project}/${item.boxSlug}/${item.pieceName}`}>
                      {item.pieceName}
                    </Link>
                  </td>
                  <td>{item.boxSlug}</td>
                  <td>{item.reason}</td>
                  <td>{item.severity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {data.inconsistentPieces.length > 0 ? (
        <>
          <h2 style={{ fontSize: 16, margin: '0 0 12px', color: 'var(--text-muted)' }}>
            Inconsistências industriais
          </h2>
          <table className="table" style={{ marginBottom: 24 }}>
            <tbody>
              {data.inconsistentPieces.map((item) => (
                <tr key={`inc-${item.boxSlug}-${item.pieceName}`}>
                  <td>
                    <Link to={`/PROJETOS/${data.user}/${data.project}/${item.boxSlug}/${item.pieceName}`}>
                      {item.pieceName}
                    </Link>
                  </td>
                  <td>{item.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {data.overridePieces.length > 0 ? (
        <>
          <h2 style={{ fontSize: 16, margin: '0 0 12px', color: 'var(--text-muted)' }}>Peças com override</h2>
          <table className="table" style={{ marginBottom: 24 }}>
            <tbody>
              {data.overridePieces.map((item) => (
                <tr key={`ov-${item.boxSlug}-${item.pieceName}`}>
                  <td>
                    <Link to={`/PROJETOS/${data.user}/${data.project}/${item.boxSlug}/${item.pieceName}`}>
                      {item.pieceName}
                    </Link>
                  </td>
                  <td>{item.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      <h2 style={{ fontSize: 16, marginBottom: 12, color: 'var(--text-muted)' }}>Estado por caixa</h2>
      <div className="card-grid">
        {data.boxes.map((box) => (
          <Link
            key={box.boxSlug}
            to={`/PROJETOS/${data.user}/${data.project}/${box.boxSlug}`}
            className="card"
            style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
          >
            <h3>{box.boxName}</h3>
            <p>
              {box.completedPieces} concluídas · {box.pendingPieces} pendentes · {box.inProgressPieces} em processo
            </p>
            <ProgressBar percent={box.progressPercent} />
          </Link>
        ))}
      </div>

      <h2 style={{ fontSize: 16, margin: '24px 0 12px', color: 'var(--text-muted)' }}>
        Tempo médio por operação
      </h2>
      <table className="table">
        <thead>
          <tr>
            <th>Operação</th>
            <th>Peças concluídas</th>
            <th>Total</th>
            <th>%</th>
            <th>Min. médios</th>
          </tr>
        </thead>
        <tbody>
          {data.operationStats.map((op) => (
            <tr key={op.operation}>
              <td>{op.operation}</td>
              <td>{op.completedPieces}</td>
              <td>{op.totalPieces}</td>
              <td>{op.totalPieces > 0 ? Math.round((op.completedPieces / op.totalPieces) * 100) : 0}%</td>
              <td>{op.avgMinutes ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.employeeStats.length > 0 ? (
        <>
          <h2 style={{ fontSize: 16, margin: '24px 0 12px', color: 'var(--text-muted)' }}>
            Produtividade por funcionário
          </h2>
          <table className="table">
            <thead>
              <tr>
                <th>Utilizador</th>
                <th>Peças</th>
                <th>Minutos</th>
                <th>Peças/h</th>
                <th>Min/op</th>
              </tr>
            </thead>
            <tbody>
              {data.employeeStats.map((emp) => (
                <tr key={emp.user}>
                  <td>{emp.user}</td>
                  <td>{emp.piecesWorked}</td>
                  <td>{emp.totalMinutes}</td>
                  <td>{emp.productivityPerHour}</td>
                  <td>{emp.avgMinutesPerOperation ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}
