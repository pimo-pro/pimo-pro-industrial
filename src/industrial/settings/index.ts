export const INDUSTRIAL_SETTINGS = {
  defaultFactoryId: 'F1',
  defaultOperator: 'operador-local',
  sessionIdleGapMinutes: 30,
  workOrderStates: ['PENDING', 'DONE'] as const,
  pieceStates: ['PENDING', 'IN_PROGRESS', 'DONE'] as const,
} as const;
