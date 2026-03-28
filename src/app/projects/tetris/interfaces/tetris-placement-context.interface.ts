export interface TetrisPlacementContext {
  /** Row index (from top) where the piece landed after hard-drop. */
  dropY: number;
  /** The rotated piece matrix that was placed. */
  pieceMatrix: number[][];
  /** Number of piece cells that fell in rows that were subsequently cleared (L × P). */
  erodedCells: number;
}
