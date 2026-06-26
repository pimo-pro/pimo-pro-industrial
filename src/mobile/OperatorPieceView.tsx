import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useIndustrialProfile } from '@/context/IndustrialProfileContext';
import { completeWorkOrder } from '@/core/workOrders';
import { getPieceDetail, savePieceJson } from '@/services/industrialApi';
import { centralFetch } from '@/services/centralApiClient';
import type { OperationName, PieceJson } from '@/types/piece';
import { QrScanner, useQrNavigation } from './QrScanner';

export function OperatorPieceView({
  user,
  project,
  box,
  pieceName,
}: {
  user: string;
  project: string;
  box: string;
  pieceName: string;
}) {
  const [piece, setPiece] = useState<PieceJson | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useIndustrialProfile();

  const reload = useCallback(async () => {
    const detail = await getPieceDetail(user, project, box, pieceName);
    setPiece(detail.pieceJson);
  }, [user, project, box, pieceName]);

  useEffect(() => {
    reload()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [reload]);

  async function handleComplete(op: OperationName) {
    if (!piece) return;
    const result = completeWorkOrder(piece, op, { user: profile });
    if (result.blocked) return;
    const saved = await savePieceJson(user, project, box, pieceName, result.piece);
    setPiece(saved);
    if (piece.qr) {
      await centralFetch(`/piece/${encodeURIComponent(piece.qr)}/update`, {
        method: 'POST',
        body: JSON.stringify({ piece: saved, source: 'LOCAL' }),
      }).catch(() => undefined);
    }
  }

  if (loading) return <p>A carregar peça…</p>;
  if (!piece) return <p>Peça não encontrada.</p>;

  const pending = piece.workOrders.filter((w) => w.status !== 'DONE' && w.required);

  return (
    <div className="mobile-piece">
      <header>
        <small>QR</small>
        <strong>{piece.qr}</strong>
        <span className={`sync-pill sync-${(piece.syncStatus ?? 'OUT_OF_SYNC').toLowerCase()}`}>
          {piece.syncStatus ?? 'OUT_OF_SYNC'}
        </span>
      </header>

      <p>
        {piece.pieceName} — {piece.progressPercent}%
      </p>

      <section>
        <h3>Operações pendentes</h3>
        {pending.length === 0 ? (
          <p className="hint">Sem operações pendentes.</p>
        ) : (
          <ul className="mobile-wo-list">
            {pending.map((wo) => (
              <li key={wo.operation}>
                <span>{wo.operation}</span>
                <button type="button" onClick={() => void handleComplete(wo.operation)}>
                  Concluir
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {piece.alerts.length > 0 && (
        <section>
          <h3>Alertas</h3>
          <ul>
            {piece.alerts.slice(0, 5).map((a, i) => (
              <li key={i}>
                [{a.type}] {a.message}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export function MobileApp() {
  const navigateToQr = useQrNavigation();
  const { profile, setProfile } = useIndustrialProfile();

  return (
    <div className="mobile-app">
      <header className="mobile-header">
        <h1>PIMO Operador</h1>
        <select
          value={profile}
          onChange={(e) => setProfile(e.target.value as 'supervisor' | 'operator')}
          aria-label="Perfil"
        >
          <option value="operator">Operador</option>
          <option value="supervisor">Supervisor</option>
        </select>
      </header>

      <QrScanner onScan={(qr) => void navigateToQr(qr)} />

      <nav className="mobile-nav">
        <Link to="/mobile">Scanner</Link>
        <Link to="/PROJETOS">Projetos</Link>
        {profile === 'supervisor' && <Link to="/FACTORY">Chão de fábrica</Link>}
      </nav>

      <p className="hint">PWA — instale no ecrã inicial para uso offline parcial.</p>
    </div>
  );
}
