import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ProgressBar } from '@/components/common/ProgressBar';
import { listIndustrialProjects } from '@/services/industrialApi';
import type { IndustrialProjectSummary } from '@/types/piece';

export function ProjectsListPage() {
  const [projects, setProjects] = useState<IndustrialProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listIndustrialProjects()
      .then(setProjects)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>A carregar projetos industriais…</p>;
  if (error) return <p style={{ color: 'var(--danger)' }}>{error}</p>;

  return (
    <section>
      <h1 className="page-title">Projetos industriais</h1>
      <p className="page-subtitle">
        Projetos com produção (cutlist industrial, etiquetas ou furos). Projetos apenas desenhados não aparecem.
      </p>

      {projects.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Nenhum projeto industrial encontrado.</p>
      ) : (
        <div className="card-grid">
          {projects.map((p) => (
            <Link
              key={p.projectId}
              to={`/PROJETOS/${p.user}/${p.project}`}
              className="card"
              style={{ display: 'block', color: 'inherit', textDecoration: 'none' }}
            >
              <h3>{p.projectDisplayName}</h3>
              <p>
                {p.ownerName} · {p.boxCount} caixas · {p.pieceCount} peças
              </p>
              <p>
                {p.completedPieces}/{p.pieceCount} concluídas ({p.progressPercent}%)
              </p>
              <ProgressBar percent={p.progressPercent} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
