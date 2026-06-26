import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { lookupQr } from '@/services/industrialApi';

export function QrRedirectPage({ isQrCheck }: { isQrCheck: (s: string) => boolean }) {
  const { qrOrUser } = useParams<{ qrOrUser: string }>();
  const [target, setTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!qrOrUser) return;
    if (!isQrCheck(qrOrUser)) {
      setError('Código inválido ou rota incompleta.');
      return;
    }
    lookupQr(qrOrUser)
      .then((r) => {
        setTarget(`/PROJETOS/${r.user}/${r.project}/${r.box}/${r.pieceName}`);
      })
      .catch((e: Error) => setError(e.message));
  }, [qrOrUser, isQrCheck]);

  if (target) return <Navigate to={target} replace />;
  if (error) return <p style={{ color: 'var(--danger)' }}>{error}</p>;
  return <p style={{ color: 'var(--text-muted)' }}>A resolver QR {qrOrUser}…</p>;
}
