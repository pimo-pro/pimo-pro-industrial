import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';

import { buildProjectDashboard, pieceSummaryFromJson } from '../src/core/dashboardAggregator';
import { createDefaultWorkOrders, normalizePieceJson } from '../src/core/pieceNormalizer';
import {
  listCanonicalIndustrialProjects,
  prepareIndustrialProject,
  registerOrUpdateProject,
  type SgpiPrepareResult,
} from '../src/core/projectManager';
import { applyPieceUpdate, completeWorkOrder, undoWorkOrder } from '../src/core/workOrders';
import { endActiveSession, startSession } from '../src/core/sessions';
import { registerQualityInspection } from '../src/industrial/quality/actions';
import { createReworkOnPiece, updateReworkStatus } from '../src/industrial/rework/actions';
import { buildSupervisorSnapshot } from '../src/industrial/supervisor/snapshot';
import type { OperationName } from '../src/types/piece';
import {
  boxToSlug,
  generateEtiquetaCode,
  pieceNameFromItem,
  toRouteSlug,
} from '../src/core/pieceNaming';
import type {
  BoxDetail,
  IndustrialPieceSummary,
  IndustrialProjectSummary,
  PieceDetailResponse,
  PieceHole,
  PieceJson,
  PieceOrla,
  QrLookupResult,
  TrackingStatus,
} from '../src/types/piece';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROJETOS_ROOT = path.join(ROOT, 'data', 'PROJETOS');
const PIMO_PROJECTS_ROOT = path.resolve(ROOT, '..', 'pimo-criativo', 'data', 'projects');

const SGPI_PATHS = {
  projetosRoot: PROJETOS_ROOT,
  pimoProjectsRoot: PIMO_PROJECTS_ROOT,
};

type CutListItem = {
  id: string;
  nome?: string;
  tipo?: string;
  boxId?: string;
  material?: string;
  espessura?: number;
  dimensoes?: { largura?: number; altura?: number; profundidade?: number };
  drillHoles?: Array<{
    x: number;
    y: number;
    diameter: number;
    depth: number;
    holeType?: string;
  }>;
  shortCode?: string;
  pieceNumber?: number;
  metadata?: Record<string, unknown>;
};

type BoxModule = {
  id: string;
  nome?: string;
  cutList?: CutListItem[];
};

type SavedProject = {
  id: string;
  name: string;
  ownerId?: string;
  ownerName?: string;
  updatedAt?: string;
  deleted?: boolean;
  snapshot?: {
    projectState?: {
      projectName?: string;
      cutList?: CutListItem[];
      boxes?: BoxModule[];
      pieceObservacoes?: Record<string, Array<{ id?: string; text?: string; createdAt?: string }>>;
      rules?: { qrcode?: { reiniciarContagemEm99?: boolean } };
    };
  };
};

type ParsedProject = {
  record: SavedProject;
  user: string;
  project: string;
  projectDisplayName: string;
  boxes: Array<{ boxId: string; boxSlug: string; boxName: string; items: CutListItem[] }>;
  allItems: Array<CutListItem & { boxSlug: string; boxName: string; pieceName: string }>;
};

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

function writeJsonFile(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function listProjectFiles(): string[] {
  if (!fs.existsSync(PIMO_PROJECTS_ROOT)) return [];
  return fs
    .readdirSync(PIMO_PROJECTS_ROOT)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .map((f) => path.join(PIMO_PROJECTS_ROOT, f));
}

function aggregateCutlist(project: SavedProject): CutListItem[] {
  const state = project.snapshot?.projectState;
  if (!state) return [];
  if (Array.isArray(state.cutList) && state.cutList.length > 0) return state.cutList;
  const fromBoxes: CutListItem[] = [];
  for (const box of state.boxes ?? []) {
    for (const item of box.cutList ?? []) {
      fromBoxes.push({ ...item, boxId: item.boxId ?? box.id });
    }
  }
  return fromBoxes;
}

function hasIndustrialProduction(project: SavedProject): boolean {
  const items = aggregateCutlist(project);
  if (items.length === 0) return false;
  return items.some(
    (i) =>
      Boolean(i.shortCode) ||
      Boolean(i.drillHoles?.length) ||
      Boolean(i.metadata?.industrialLabel)
  );
}

function parseProject(record: SavedProject): ParsedProject | null {
  if (record.deleted) return null;
  const state = record.snapshot?.projectState;
  const projectDisplayName = state?.projectName ?? record.name ?? 'Projeto';
  const user = toRouteSlug(record.ownerName ?? record.ownerId ?? 'UTILIZADOR');
  const project = toRouteSlug(projectDisplayName);
  const boxesRaw = state?.boxes ?? [];
  const cutList = aggregateCutlist(record);

  const boxMap = new Map<string, { boxId: string; boxSlug: string; boxName: string; items: CutListItem[] }>();

  boxesRaw.forEach((box, index) => {
    const boxSlug = boxToSlug(box.nome ?? `Caixa ${index + 1}`, index);
    boxMap.set(box.id, {
      boxId: box.id,
      boxSlug,
      boxName: box.nome ?? `Caixa ${index + 1}`,
      items: [],
    });
  });

  if (boxMap.size === 0 && cutList.length > 0) {
    boxMap.set('default', { boxId: 'default', boxSlug: 'C1', boxName: 'Caixa 1', items: [] });
  }

  cutList.forEach((item) => {
    const boxId = item.boxId ?? boxesRaw[0]?.id ?? 'default';
    let entry = boxMap.get(boxId);
    if (!entry) {
      const index = boxMap.size;
      entry = {
        boxId,
        boxSlug: `C${index + 1}`,
        boxName: `Caixa ${index + 1}`,
        items: [],
      };
      boxMap.set(boxId, entry);
    }
    entry.items.push(item);
  });

  const boxes = Array.from(boxMap.values());
  const allItems = boxes.flatMap((b) =>
    b.items.map((item, idx) => ({
      ...item,
      boxSlug: b.boxSlug,
      boxName: b.boxName,
      pieceName: pieceNameFromItem(item),
      pieceNumber: item.pieceNumber ?? idx + 1,
    }))
  );

  return { record, user, project, projectDisplayName, boxes, allItems };
}

function pieceJsonPath(user: string, project: string, box: string, pieceName: string): string {
  return path.join(PROJETOS_ROOT, user, project, box, pieceName, 'piece.json');
}

function readPieceJson(user: string, project: string, box: string, pieceName: string): PieceJson | null {
  const raw = readJsonFile<PieceJson>(pieceJsonPath(user, project, box, pieceName));
  return raw ? normalizePieceJson(raw) : null;
}

function inferOrla(item: CutListItem): PieceOrla {
  const tipo = String(item.tipo ?? '').toLowerCase();
  const noOrla = tipo.includes('costa') || tipo === 'fundo' || tipo === 'cos';
  if (noOrla) {
    return { hasOrla: false, edges: [], type: '' };
  }
  return { hasOrla: true, edges: ['TOP', 'BOTTOM', 'LEFT', 'RIGHT'], type: 'PVC_1mm' };
}

function extractHoles(item: CutListItem): PieceHole[] {
  return (item.drillHoles ?? []).map((h, i) => ({
    id: `h${i + 1}`,
    type: h.holeType ?? 'DRILL',
    diameter: h.diameter,
    x: h.x,
    y: h.y,
    depth: h.depth,
    confirmed: false,
  }));
}

function buildInitialPieceJson(
  item: CutListItem & { pieceName: string; boxName: string },
  projectDisplayName: string,
  pieceIndex: number
): PieceJson {
  const width = item.dimensoes?.largura ?? 0;
  const height = item.dimensoes?.altura ?? 0;
  const thickness = item.espessura ?? item.dimensoes?.profundidade ?? 0;
  const qr =
    item.shortCode ??
    generateEtiquetaCode(projectDisplayName, item.boxName, item.nome ?? item.pieceName, pieceIndex + 1);

  return normalizePieceJson({
    pieceName: item.pieceName,
    qr,
    material: item.material ?? '—',
    thickness,
    width,
    height,
    holes: extractHoles(item),
    orla: inferOrla(item),
    pieceStatus: 'PENDING',
    progressPercent: 0,
    lastOperation: null,
    lastUpdatedAt: null,
    lastUpdatedBy: null,
    workOrders: createDefaultWorkOrders(),
    logs: [],
    sessions: [],
    notes: [],
    anomalies: [],
    alerts: [],
    factoryId: 'F1',
    syncedAt: null,
    syncStatus: 'OUT_OF_SYNC',
    source: 'LOCAL',
  });
}

function ensurePieceJson(parsed: ParsedProject, boxSlug: string, pieceName: string): PieceJson | null {
  const box = parsed.boxes.find((b) => b.boxSlug.toUpperCase() === boxSlug.toUpperCase());
  if (!box) return null;

  const itemIndex = box.items.findIndex(
    (i) => pieceNameFromItem(i).toUpperCase() === pieceName.toUpperCase()
  );
  if (itemIndex < 0) return null;

  const item = box.items[itemIndex]!;
  const enriched = {
    ...item,
    pieceName: pieceNameFromItem(item),
    boxName: box.boxName,
  };

  const existing = readPieceJson(parsed.user, parsed.project, box.boxSlug, pieceName);
  if (existing) return existing;

  const initial = buildInitialPieceJson(enriched, parsed.projectDisplayName, itemIndex);
  writeJsonFile(pieceJsonPath(parsed.user, parsed.project, box.boxSlug, pieceName), initial);
  return initial;
}

function pieceStatus(pieceJson: PieceJson | null): TrackingStatus {
  if (!pieceJson) return 'PENDING';
  return pieceJson.pieceStatus;
}

function findParsedProject(user: string, project: string): ParsedProject | null {
  const registry = readJsonFile<{ sources: Record<string, { user: string; project: string }> }>(
    path.join(PROJETOS_ROOT, '_sgpi', 'registry.json')
  );

  if (registry?.sources) {
    for (const [sourceId, mapped] of Object.entries(registry.sources)) {
      if (
        mapped.user.toUpperCase() !== user.toUpperCase() ||
        mapped.project.toUpperCase() !== project.toUpperCase()
      ) {
        continue;
      }
      for (const file of listProjectFiles()) {
        const record = readJsonFile<SavedProject>(file);
        if (!record || record.id !== sourceId) continue;
        const parsed = parseProject(record);
        if (parsed) return { ...parsed, user: mapped.user, project: mapped.project };
      }
    }
  }

  for (const file of listProjectFiles()) {
    const record = readJsonFile<SavedProject>(file);
    if (!record || !hasIndustrialProduction(record)) continue;
    const parsed = parseProject(record);
    if (!parsed) continue;
    if (parsed.user.toUpperCase() === user.toUpperCase() && parsed.project.toUpperCase() === project.toUpperCase()) {
      return parsed;
    }
  }
  return null;
}

function findAllIndustrialProjects(): IndustrialProjectSummary[] {
  return listCanonicalIndustrialProjects(SGPI_PATHS);
}

function buildPieceSummary(item: CutListItem & { pieceName: string }, pieceJson: PieceJson | null): IndustrialPieceSummary {
  const summary = pieceJson ? pieceSummaryFromJson(pieceJson) : null;
  return {
    pieceName: item.pieceName,
    pieceRef: item.pieceName,
    qr: pieceJson?.qr ?? item.shortCode,
    material: pieceJson?.material ?? item.material ?? '—',
    thickness: pieceJson?.thickness ?? item.espessura ?? 0,
    width: pieceJson?.width ?? item.dimensoes?.largura ?? 0,
    height: pieceJson?.height ?? item.dimensoes?.altura ?? 0,
    status: summary?.status ?? pieceStatus(pieceJson),
    progressPercent: summary?.progressPercent ?? 0,
    operationsDone: summary?.operationsDone ?? 0,
    operationsTotal: summary?.operationsTotal ?? 8,
    alertCount: summary?.alertCount ?? 0,
  };
}

function lookupQr(qrCode: string): QrLookupResult | null {
  const needle = qrCode.toLowerCase();
  for (const file of listProjectFiles()) {
    const record = readJsonFile<SavedProject>(file);
    if (!record) continue;
    const parsed = parseProject(record);
    if (!parsed) continue;

    for (let i = 0; i < parsed.allItems.length; i++) {
      const item = parsed.allItems[i]!;
      const qr =
        item.shortCode ??
        generateEtiquetaCode(parsed.projectDisplayName, item.boxName, item.nome ?? item.pieceName, i + 1);
      if (qr.toLowerCase() === needle) {
        return {
          user: parsed.user,
          project: parsed.project,
          box: item.boxSlug,
          pieceName: item.pieceName,
        };
      }
    }

    for (const box of parsed.boxes) {
      for (const item of box.items) {
        const pn = pieceNameFromItem(item);
        const saved = readPieceJson(parsed.user, parsed.project, box.boxSlug, pn);
        if (saved?.qr?.toLowerCase() === needle) {
          return { user: parsed.user, project: parsed.project, box: box.boxSlug, pieceName: pn };
        }
      }
    }
  }
  return null;
}

function isQrSegment(segment: string): boolean {
  return /^[a-z0-9]{6,14}$/i.test(segment) && !segment.includes('_');
}

export async function handleIndustrialApi(req: IncomingMessage, res: ServerResponse, urlPath: string): Promise<boolean> {
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return true;
  }

  const base = '/api/industrial';
  if (!urlPath.startsWith(base)) return false;

  const sub = urlPath.slice(base.length).replace(/\/$/, '') || '/';
  const parts = sub.split('/').filter(Boolean);

  try {
    if (req.method === 'GET' && parts.length === 1 && parts[0] === 'projects') {
      sendJson(res, 200, { projects: findAllIndustrialProjects() });
      return true;
    }

    if (req.method === 'POST' && parts[0] === 'sgpi' && parts[1] === 'prepare') {
      const body = JSON.parse(await readBody(req)) as {
        ownerName?: string;
        ownerId?: string;
        projectDisplayName?: string;
        sourceProjectId?: string | null;
      };
      const prepared = prepareIndustrialProject(SGPI_PATHS, {
        ownerName: body.ownerName,
        ownerId: body.ownerId,
        projectDisplayName: body.projectDisplayName ?? 'Projeto',
        sourceProjectId: body.sourceProjectId ?? null,
      });
      sendJson(res, 200, { ok: true, prepared });
      return true;
    }

    if (req.method === 'POST' && parts[0] === 'sgpi' && parts[1] === 'register') {
      const body = JSON.parse(await readBody(req)) as {
        prepared?: SgpiPrepareResult;
        sourceProjectId?: string | null;
      };
      const prepared = body.prepared;
      if (!prepared) {
        sendJson(res, 400, { error: 'prepared obrigatório' });
        return true;
      }
      const meta = registerOrUpdateProject(SGPI_PATHS, {
        ...prepared,
        sourceProjectId: body.sourceProjectId ?? prepared.sourceProjectId,
      });
      sendJson(res, 200, { ok: true, meta });
      return true;
    }

    if (req.method === 'GET' && parts.length === 2 && parts[0] === 'qr') {
      const result = lookupQr(decodeURIComponent(parts[1]!));
      if (!result) {
        sendJson(res, 404, { error: 'QR não encontrado' });
        return true;
      }
      sendJson(res, 200, result);
      return true;
    }

    if (parts[0] === 'projects' && parts.length >= 3) {
      const user = decodeURIComponent(parts[1]!);
      const project = decodeURIComponent(parts[2]!);
      const parsed = findParsedProject(user, project);
      if (!parsed) {
        sendJson(res, 404, { error: 'Projeto não encontrado' });
        return true;
      }

      if (parts.length === 3 && req.method === 'GET') {
        const boxInputs = parsed.boxes.map((box) => {
          const pieceJsons: PieceJson[] = [];
          for (const item of box.items) {
            const pn = pieceNameFromItem(item);
            const pj = ensurePieceJson(parsed, box.boxSlug, pn);
            if (pj) pieceJsons.push(pj);
          }
          return {
            boxSlug: box.boxSlug,
            boxId: box.boxId,
            boxName: box.boxName,
            pieceCount: box.items.length,
            pieceJsons,
          };
        });

        const dashboard = buildProjectDashboard(
          {
            user: parsed.user,
            project: parsed.project,
            projectId: parsed.record.id,
            projectDisplayName: parsed.projectDisplayName,
          },
          boxInputs
        );
        sendJson(res, 200, dashboard);
        return true;
      }

      if (parts.length === 4 && req.method === 'GET') {
        const boxSlug = decodeURIComponent(parts[3]!);
        const box = parsed.boxes.find((b) => b.boxSlug.toUpperCase() === boxSlug.toUpperCase());
        if (!box) {
          sendJson(res, 404, { error: 'Caixa não encontrada' });
          return true;
        }
        const pieces = box.items.map((item) => {
          const pn = pieceNameFromItem(item);
          const pj = ensurePieceJson(parsed, box.boxSlug, pn);
          return buildPieceSummary({ ...item, pieceName: pn }, pj);
        });
        const detail: BoxDetail = {
          user: parsed.user,
          project: parsed.project,
          projectId: parsed.record.id,
          boxSlug: box.boxSlug,
          boxName: box.boxName,
          pieces,
        };
        sendJson(res, 200, detail);
        return true;
      }

      if (parts.length === 5 && req.method === 'GET') {
        const boxSlug = decodeURIComponent(parts[3]!);
        const pieceName = decodeURIComponent(parts[4]!);
        const box = parsed.boxes.find((b) => b.boxSlug.toUpperCase() === boxSlug.toUpperCase());
        if (!box) {
          sendJson(res, 404, { error: 'Caixa não encontrada' });
          return true;
        }
        const item = box.items.find((i) => pieceNameFromItem(i).toUpperCase() === pieceName.toUpperCase());
        if (!item) {
          sendJson(res, 404, { error: 'Peça não encontrada' });
          return true;
        }
        const pj = ensurePieceJson(parsed, box.boxSlug, pieceName);
        if (!pj) {
          sendJson(res, 404, { error: 'Peça não encontrada' });
          return true;
        }
        const normalized = normalizePieceJson(pj);
        const response: PieceDetailResponse = {
          user: parsed.user,
          project: parsed.project,
          projectId: parsed.record.id,
          boxSlug: box.boxSlug,
          boxName: box.boxName,
          pieceJson: normalized,
          sourceItemId: item.id,
        };
        sendJson(res, 200, response);
        return true;
      }

      if (parts.length === 6 && parts[5] === 'piece.json' && req.method === 'PUT') {
        const boxSlug = decodeURIComponent(parts[3]!);
        const pieceName = decodeURIComponent(parts[4]!);
        const body = await readBody(req);
        const parsed_json = applyPieceUpdate(normalizePieceJson(JSON.parse(body) as PieceJson));
        writeJsonFile(pieceJsonPath(parsed.user, parsed.project, boxSlug, pieceName), parsed_json);
        sendJson(res, 200, { ok: true, pieceJson: parsed_json });
        return true;
      }

      if (parts.length === 4 && parts[3] === 'supervisor' && req.method === 'GET') {
        const boxInputs = parsed.boxes.map((box) => {
          const pieceJsons: PieceJson[] = [];
          for (const item of box.items) {
            const pn = pieceNameFromItem(item);
            const pj = ensurePieceJson(parsed, box.boxSlug, pn);
            if (pj) pieceJsons.push(normalizePieceJson(pj));
          }
          return { boxSlug: box.boxSlug, pieceJsons };
        });
        const snapshot = buildSupervisorSnapshot(
          {
            user: parsed.user,
            project: parsed.project,
            projectId: parsed.record.id,
            projectDisplayName: parsed.projectDisplayName,
          },
          boxInputs
        );
        sendJson(res, 200, snapshot);
        return true;
      }

      if (parts.length >= 5) {
        const boxSlug = decodeURIComponent(parts[3]!);
        const pieceName = decodeURIComponent(parts[4]!);
        const box = parsed.boxes.find((b) => b.boxSlug.toUpperCase() === boxSlug.toUpperCase());
        if (!box) {
          sendJson(res, 404, { error: 'Caixa não encontrada' });
          return true;
        }
        const item = box.items.find((i) => pieceNameFromItem(i).toUpperCase() === pieceName.toUpperCase());
        if (!item) {
          sendJson(res, 404, { error: 'Peça não encontrada' });
          return true;
        }
        const current = ensurePieceJson(parsed, box.boxSlug, pieceName);
        if (!current) {
          sendJson(res, 404, { error: 'Peça não encontrada' });
          return true;
        }

        const savePiece = (updated: PieceJson) => {
          const normalized = applyPieceUpdate(normalizePieceJson(updated));
          writeJsonFile(pieceJsonPath(parsed.user, parsed.project, box.boxSlug, pieceName), normalized);
          return normalized;
        };

        if (parts.length === 7 && parts[5] === 'work-orders' && req.method === 'POST') {
          const operation = decodeURIComponent(parts[6]!) as OperationName;
          const body = JSON.parse(await readBody(req)) as {
            action?: 'complete' | 'undo';
            user?: string;
            override?: boolean;
            notes?: string;
          };
          const result =
            body.action === 'undo'
              ? undoWorkOrder(current, operation, { user: body.user, notes: body.notes })
              : completeWorkOrder(current, operation, {
                  user: body.user,
                  override: body.override,
                  notes: body.notes,
                });
          if (result.blocked) {
            sendJson(res, 409, { error: result.message, requiresOverride: result.requiresOverride });
            return true;
          }
          sendJson(res, 200, { ok: true, pieceJson: savePiece(result.piece) });
          return true;
        }

        if (parts.length === 6 && parts[5] === 'sessions' && req.method === 'POST') {
          const body = JSON.parse(await readBody(req)) as { action?: 'start' | 'end'; user?: string };
          const updated =
            body.action === 'end' ? endActiveSession(current) : startSession(current, body.user);
          sendJson(res, 200, { ok: true, pieceJson: savePiece(updated) });
          return true;
        }

        if (parts.length === 6 && parts[5] === 'quality' && req.method === 'POST') {
          const body = JSON.parse(await readBody(req)) as {
            decision: 'approved' | 'rework' | 'rejected';
            points?: import('../src/industrial/quality/types').QualityInspectionPoint[];
            inspectorId?: string;
            reason?: string;
            notes?: string;
          };
          const updated = registerQualityInspection(current, body, body.inspectorId);
          sendJson(res, 200, { ok: true, pieceJson: savePiece(updated) });
          return true;
        }

        if (parts.length === 6 && parts[5] === 'rework' && req.method === 'POST') {
          const body = JSON.parse(await readBody(req)) as {
            reason: string;
            origin?: 'quality' | 'operator' | 'cnc' | 'drill' | 'assembly' | 'packaging';
            fromOperationId?: string;
            toOperationId?: string;
            requestedBy?: string;
          };
          const updated = createReworkOnPiece(current, body, body.requestedBy);
          sendJson(res, 200, { ok: true, pieceJson: savePiece(updated) });
          return true;
        }

        if (parts.length === 8 && parts[5] === 'rework' && parts[7] === 'resolve' && req.method === 'POST') {
          const reworkId = decodeURIComponent(parts[6]!);
          const body = JSON.parse(await readBody(req)) as {
            status?: 'resolved' | 'rejected' | 'in_progress';
            resolvedBy?: string;
          };
          const updated = updateReworkStatus(
            current,
            reworkId,
            body.status ?? 'resolved',
            body.resolvedBy
          );
          sendJson(res, 200, { ok: true, pieceJson: savePiece(updated) });
          return true;
        }
      }
    }

    sendJson(res, 404, { error: 'Rota não encontrada' });
    return true;
  } catch (err) {
    sendJson(res, 500, { error: err instanceof Error ? err.message : 'Erro interno' });
    return true;
  }
}

export { isQrSegment, lookupQr };
