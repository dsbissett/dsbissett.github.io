export interface TetrisPlacement {
  /** Number of CW rotations from spawn orientation */
  rotation: number;
  /** Target column offset */
  x: number;
  /** The rotated piece matrix */
  matrix: number[][];
  /** Board features after simulating this placement */
  features: number[];
  linesCleared: number;
  /** Row where the piece landed (0 = top, gridHeight-1 = bottom) */
  placementRow: number;
  /** Sum of (filledCells/width)^2 for each non-empty row */
  rowCompleteness: number;
}
