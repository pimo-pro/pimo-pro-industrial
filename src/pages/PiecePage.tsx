import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { AlertsPanel } from '@/components/piece/AlertsPanel';
import { AnomaliesPanel } from '@/components/piece/AnomaliesPanel';
import { DrillSection } from '@/components/piece/DrillSection';
import { EstimatedTimePanel } from '@/components/piece/EstimatedTimePanel';
import { IndustrialStatePanel } from '@/components/piece/IndustrialStatePanel';
import { LogsPanel } from '@/components/piece/LogsPanel';
import { OrlaSection } from '@/components/piece/OrlaSection';
import { PieceHeader } from '@/components/piece/PieceHeader';
import { PieceViewer3D } from '@/components/piece/PieceViewer3D';
import { ProductivityPanel } from '@/components/piece/ProductivityPanel';
import { SessionsPanel } from '@/components/piece/SessionsPanel';
import { SuggestionsPanel } from '@/components/piece/SuggestionsPanel';
import { SyncStatusPanel } from '@/components/piece/SyncStatusPanel';
import { QualityPanel } from '@/components/piece/QualityPanel';
import { ReworkPanel } from '@/components/piece/ReworkPanel';
import { WorkOrdersPanel } from '@/components/piece/WorkOrdersPanel';
import { useIndustrialProfile } from '@/context/IndustrialProfileContext';
import { subscribePieceContinuousSync } from '@/core/continuousSync';
import { applyIndustrialIntelligence } from '@/core/intelligencePipeline';
import { subscribeToPiece } from '@/core/realtime';
import { startSession } from '@/core/sessions';
import { OperatorPieceView } from '@/mobile/OperatorPieceView';
import { createReworkApi, registerQualityApi, resolveReworkApi } from '@/services/mesApi';
import { getPieceDetail, savePieceJson, pieceRepository } from '@/services/industrialApi';
import type { PieceDetailResponse, PieceJson } from '@/types/piece';

export function PiecePage() {
  const { user, project, box, pieceName } = useParams<{
    user: string;
    project: string;
    box: string;
    pieceName: string;
  }>();

  const [data, setData] = useState<PieceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedHoleId, setSelectedHoleId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const sessionStarted = useRef(false);
  const { isOperator } = useIndustrialProfile();

  const reload = useCallback(async () => {
    if (!user || !project || !box || !pieceName) return;
    const detail = await getPieceDetail(user, project, box, pieceName);
    setData(detail);
  }, [user, project, box, pieceName]);

  useEffect(() => {
    if (!user || !project || !box || !pieceName) return;
    getPieceDetail(user, project, box, pieceName)
      .then((detail) => {
        setData(detail);
        if (!sessionStarted.current) {
          sessionStarted.current = true;
          let withSession = startSession(detail.pieceJson);
          withSession = applyIndustrialIntelligence(withSession);
          if (withSession.sessions.length !== detail.pieceJson.sessions.length) {
            void savePieceJson(user, project, box, pieceName, withSession).then(() => reload());
          }
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, project, box, pieceName, reload]);

  useEffect(() => {
    if (!user || !project || !box || !pieceName || !data?.pieceJson.qr) return;
    const qr = data.pieceJson.qr;
    const unsubWs = subscribeToPiece(qr, () => void reload());
    const unsubSync = subscribePieceContinuousSync(
      qr,
      { user, project, box, pieceName },
      async () => {
        const d = await getPieceDetail(user, project, box, pieceName);
        return d.pieceJson;
      },
      (piece) => setData((prev) => (prev ? { ...prev, pieceJson: piece } : prev))
    );
    return () => {
      unsubWs();
      unsubSync();
    };
  }, [user, project, box, pieceName, data?.pieceJson.qr, reload]);

  async function handleSave(next: PieceJson) {
    if (!user || !project || !box || !pieceName) return;
    setSaving(true);
    try {
      const saved = await savePieceJson(user, project, box, pieceName, next);
      setData((prev) => (prev ? { ...prev, pieceJson: saved } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    if (!user || !project || !box || !pieceName || !pieceJson.qr) return;
    setSyncing(true);
    try {
      const synced = await pieceRepository.syncPieceNow(
        pieceJson.qr,
        { user, project, box, pieceName },
        pieceJson
      );
      setData((prev) => (prev ? { ...prev, pieceJson: synced } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro na sincronização');
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>A carregar peça…</p>;
  if (error || !data) return <p style={{ color: 'var(--danger)' }}>{error ?? 'Peça não encontrada'}</p>;

  const { pieceJson } = data;

  if (isOperator) {
    return (
      <section>
        <OperatorPieceView user={user!} project={project!} box={box!} pieceName={pieceName!} />
      </section>
    );
  }

  return (
    <section>
      <nav className="breadcrumb">
        <Link to="/PROJETOS">Projetos</Link>
        <span>/</span>
        <Link to={`/PROJETOS/${data.user}/${data.project}`}>{data.project}</Link>
        <span>/</span>
        <Link to={`/PROJETOS/${data.user}/${data.project}/${data.boxSlug}`}>{data.boxName}</Link>
        <span>/</span>
        <span>{pieceJson.pieceName}</span>
      </nav>

      <PieceHeader piece={pieceJson} />

      <div className="piece-layout" style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <IndustrialStatePanel piece={pieceJson} />
          <SyncStatusPanel piece={pieceJson} onSync={() => void handleSync()} syncing={syncing} />
          <AlertsPanel piece={pieceJson} />
          <AnomaliesPanel piece={pieceJson} />
          <WorkOrdersPanel piece={pieceJson} onSave={handleSave} saving={saving} />
          <QualityPanel
            inspections={pieceJson.qualityInspections ?? []}
            disabled={saving}
            onRegister={async (input) => {
              if (!user || !project || !box || !pieceName) return;
              const updated = await registerQualityApi(user, project, box, pieceName, input);
              setData((prev) => (prev ? { ...prev, pieceJson: updated } : prev));
            }}
          />
          <ReworkPanel
            requests={pieceJson.reworkRequests ?? []}
            disabled={saving}
            onCreate={async (reason) => {
              if (!user || !project || !box || !pieceName) return;
              const updated = await createReworkApi(user, project, box, pieceName, { reason });
              setData((prev) => (prev ? { ...prev, pieceJson: updated } : prev));
            }}
            onResolve={async (reworkId) => {
              if (!user || !project || !box || !pieceName) return;
              const updated = await resolveReworkApi(user, project, box, pieceName, reworkId, 'resolved');
              setData((prev) => (prev ? { ...prev, pieceJson: updated } : prev));
            }}
          />
          <SuggestionsPanel piece={pieceJson} />
          <OrlaSection piece={pieceJson} onSave={handleSave} saving={saving} />
          <SessionsPanel piece={pieceJson} />
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <PieceViewer3D
            width={pieceJson.width}
            height={pieceJson.height}
            thickness={pieceJson.thickness}
            holes={pieceJson.holes}
            orla={pieceJson.orla}
            selectedHoleId={selectedHoleId}
          />
          <ProductivityPanel piece={pieceJson} />
          <EstimatedTimePanel piece={pieceJson} />
          <LogsPanel piece={pieceJson} />
        </div>

        <DrillSection
          piece={pieceJson}
          selectedHoleId={selectedHoleId}
          onSelectHole={setSelectedHoleId}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    </section>
  );
}
