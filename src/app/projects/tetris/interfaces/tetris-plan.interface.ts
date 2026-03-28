export interface TetrisPlan {
  targetMatrix: number[][];
  targetX: number;
  features: number[];
  placementRow: number;
  linesCleared: number;
  decisionSource: 'model' | 'exploration' | 'teacher';
}
