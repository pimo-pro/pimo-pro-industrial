import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { StatusBadge } from '@/components/common/StatusBadge';
import { getBoxDetail } from '@/services/industrialApi';
import type { BoxDetail } from '@/types/piece';

export function BoxPage() {
  const { user, project, box } = useParams<{ user: string; project: string; box: string }>();
  const [data, setData] = useState<BoxDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !project || !box) return;
    getBoxDetail(user, project, box)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, project, box]);

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>A carregar caixa…</p>;
  if (error || !data) return <p style={{ color: 'var(--danger)' }}>{error ?? 'Caixa não encontrada'}</p>;

  return (
    <section>
      <nav className="breadcrumb">
        <Link to="/PROJETOS">Projetos</Link>
        <span>/</span>
        <Link to={`/PROJETOS/${data.user}/${data.project}`}>{data.project}</Link>
        <span>/</span>
        <span>{data.boxName}</span>
      </nav>

      <h1 className="page-title">{data.boxName}</h1>
      <p className="page-subtitle">{data.pieces.length} peças nesta caixa</p>

      <table className="table">
        <thead>
          <tr>
            <th>Peça</th>
            <th>QR</th>
            <th>Material</th>
            <th>Medidas</th>
            <th>Estado</th>
            <th>Progresso</th>
          </tr>
        </thead>
        <tbody>
          {data.pieces.map((piece) => (
            <tr key={piece.pieceName}>
              <td>
                <Link to={`/PROJETOS/${data.user}/${data.project}/${data.boxSlug}/${piece.pieceName}`}>
                  {piece.pieceName}
                </Link>
              </td>
              <td>{piece.qr ?? '—'}</td>
              <td>
                {piece.material} · {piece.thickness}mm
              </td>
              <td>
                {piece.width} × {piece.height} mm
              </td>
              <td>
                <StatusBadge status={piece.status} />
              </td>
              <td>
                {piece.progressPercent}% ({piece.operationsDone}/{piece.operationsTotal})
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
