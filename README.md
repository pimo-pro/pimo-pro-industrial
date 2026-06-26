# pimo.pro-industrial

Módulo industrial separado do pimo.pro — SPA React com PIMO-TRAK, viewer 3D de peça única e `piece.json` como estado industrial vivo.

## Fase 4 — Plataforma centralizada

- **pimo-pro-industrial-api** — REST em `:5180`
- **Industrial Core** — `industrial-core/pieces/{qr}/piece.json`
- **Sync bidireccional** — local ↔ central com resolução de conflitos
- **QR-first** — `loadPieceByQr`, lookup central
- **Multi-fábrica** — `factoryId` (F1 por defeito)
- **Realtime** — stubs em `realtime.ts`

Requer API central: `cd ../pimo-pro-industrial-api && npm run dev`

## Fase 3 — Industrial Intelligence Layer

- **autoStatus / autoProgress** — recálculo automático de estado e progresso
- **anomalyDetector** — 6+ tipos de anomalias (overrides, sessões longas, dados em falta)
- **alerts** — ALERTA, AVISO, ERRO, INFO
- **autoResolver** — ORLAR/MANUAL automáticos, sugestões de prioridade
- **syncLayer** — payloads e stubs para API centralizada futura
- **Dashboard inteligente** — alertas, risco, inconsistências, overrides

## Fase 2 — Industrial Engine

- **piece.json v2**: `pieceStatus`, `progressPercent`, `workOrders`, `logs`, `sessions`
- **Work Orders**: WO-NISTING … WO-LIMPEZAS com regras de prioridade
- **Prioridade**: ORLAR → DRILL → CNC → MONTAGEM → EMBALAGEM (override registável)
- **Dashboard**: KPIs por peça, caixa, operação e funcionário
- **Repositório**: `pieceRepository` preparado para API futura (`piece/get`, `track/log`, etc.)

## Rotas

| Rota | Função |
|------|--------|
| `/PROJETOS` | Lista projetos com produção industrial |
| `/PROJETOS/:user/:project` | Dashboard do projeto |
| `/PROJETOS/:user/:project/:box` | Lista de peças da caixa |
| `/PROJETOS/:user/:project/:box/:pieceName` | Página industrial da peça |
| `/PROJETOS/:qrCode` | Atalho QR → redirect hierárquico |

## Dados

- **Leitura:** projetos em `../pimo-criativo/data/projects/*.json` (cutlist, furos, etiquetas).
- **Estado industrial:** `data/PROJETOS/{user}/{project}/{box}/{pieceName}/piece.json` (criado na primeira abertura).

Não altera motores TCN, TXML, Nesting ou Etiquetas do pimo.pro.

## Desenvolvimento

```bash
cd pimo-pro-industrial
npm install
npm run dev
```

App em http://localhost:5174 — API local em `/api/industrial/*`.

## Build

```bash
npm run build
npm run preview
```
