import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { onUpdate, getRealtimeStatus } from '@/core/realtime';
import { fetchFactoryFloor, type FactoryFloorData } from '@/services/centralApiClient';
import { StatusBadge } from '@/components/common/StatusBadge';

export function FactoryFloorPage() {
  const [data, setData] = useState<FactoryFloorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState(getRealtimeStatus());

  const reload = useCallback(async () => {
    try {
      const floor = await fetchFactoryFloor();
      setData(floor);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar chão de fábrica');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const poll = setInterval(() => void reload(), 20_000);
    const unsub = onUpdate(() => {
      setWsStatus(getRealtimeStatus());
      void reload();
    });
    return () => {
      clearInterval(poll);
      unsub();
    };
  }, [reload]);

  if (loading) return <p className="page-loading">A carregar chão de fábrica…</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (!data) return null;

  return (
    <div className="factory-floor">
      <header className="page-header">
        <div>
          <small>Industrial Core</small>
          <h1>Chão de Fábrica</h1>
        </div>
        <div className="factory-meta">
          <span className={`realtime-pill rt-${wsStatus}`}>
            {wsStatus === 'connected' ? 'ONLINE' : 'OFFLINE'}
          </span>
          <span className="hint">{data.wsClients} cliente(s) WS</span>
        </div>
      </header>

      <section className="dashboard-grid">
        <article className="panel">
          <h2>Estações industriais</h2>
          <ul className="ws-list">
            {data.workstations.map((ws) => (
              <li key={ws.id}>
                <strong>{ws.id}</strong>
                <span>{ws.type}</span>
                <StatusBadge status={ws.status === 'ONLINE' ? 'IN_PROGRESS' : 'PENDING'} label={ws.status} />
                {ws.currentPiece && <Link to={`/PROJETOS/${ws.currentPiece}`}>{ws.currentPiece}</Link>}
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Peças em processamento</h2>
          {data.piecesInProcess.length === 0 ? (
            <p className="hint">Nenhuma peça em estação.</p>
          ) : (
            <ul>
              {data.piecesInProcess.map((p) => (
                <li key={p.workstationId}>
                  {p.workstationId} ({p.type}) →{' '}
                  {p.qr ? <Link to={`/PROJETOS/${p.qr}`}>{p.qr}</Link> : '—'}
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="panel">
          <h2>Concluídas hoje</h2>
          <p className="kpi">{data.completedToday.length}</p>
          <ul>
            {data.completedToday.slice(0, 8).map((p) => (
              <li key={p.qr}>
                <Link to={`/PROJETOS/${p.qr}`}>{p.qr}</Link> — {p.pieceName}
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Alertas ativos</h2>
          <ul>
            {data.activeAlerts.slice(0, 10).map((a, i) => (
              <li key={i}>
                [{a.type}] {a.message} {a.qr && <Link to={`/PROJETOS/${a.qr}`}>{a.qr}</Link>}
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Anomalias</h2>
          <ul>
            {data.activeAnomalies.slice(0, 10).map((a, i) => (
              <li key={i}>
                [{a.severity}] {a.message} {a.qr && <Link to={`/PROJETOS/${a.qr}`}>{a.qr}</Link>}
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Produtividade por operador</h2>
          <ul>
            {data.operatorProductivity.map((o) => (
              <li key={o.operator}>
                {o.operator}: {o.pieces} peças, {o.ops} ops, {o.minutes} min
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Tempo médio por operação</h2>
          <ul>
            {data.avgOpMinutes.map((o) => (
              <li key={o.operation}>
                {o.operation}: {o.avgMinutes} min ({o.count}×)
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Peças com risco de atraso</h2>
          <ul>
            {data.atRiskPieces.map((p) => (
              <li key={p.qr}>
                <Link to={`/PROJETOS/${p.qr}`}>{p.qr}</Link> — {p.progressPercent}% ({p.pieceStatus})
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h2>Sincronização</h2>
          <p>
            IN_SYNC: {data.syncSummary.inSync} · OUT_OF_SYNC: {data.syncSummary.outOfSync} · CONFLICT:{' '}
            {data.syncSummary.conflict}
          </p>
          <h3>Fábricas</h3>
          <ul>
            {data.factories.map((f) => (
              <li key={f.factoryId}>
                {f.nome} — {f.localizacao}
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
