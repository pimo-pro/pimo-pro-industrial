export type WorkstationType = 'CNC' | 'ORLAR' | 'DRILL' | 'MONTAGEM' | 'EMBALAGEM';
export type WorkstationStatus = 'ONLINE' | 'OFFLINE';

export interface Workstation {
  id: string;
  type: WorkstationType;
  status: WorkstationStatus;
  currentPiece: string | null;
  lastHeartbeat: string;
  factoryId: string;
}
