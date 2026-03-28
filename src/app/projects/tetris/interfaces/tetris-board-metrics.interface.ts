export interface TetrisBoardMetrics {
  holes: number;
  coveredCells: number;
  aggregateHeight: number;
  bumpiness: number;
  maxHeight: number;
  pillars: number;
  wells: number;
  /** Sum of (filledCells/width)^2 per non-empty row */
  rowCompleteness: number;
  /** Fill fraction of the bottom 4 rows */
  lowBoardDensity: number;
  /** Variance of column heights */
  heightVariance: number;
  /** Count of rows that are >= 80% filled */
  nearCompleteRows: number;
  /** Lines cleared by the placement (0–4) */
  completedLines: number;
  /** Filled↔empty transitions across rows, walls counted as filled */
  rowTransitions: number;
  /** Filled↔empty transitions down columns, floor counted as filled */
  columnTransitions: number;
  /** Height from the bottom of the board where the piece landed */
  landingHeight: number;
  /** Lines cleared × piece cells that fell in those cleared rows */
  erodedPieceCells: number;
}
