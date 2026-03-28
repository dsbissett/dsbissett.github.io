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
}
