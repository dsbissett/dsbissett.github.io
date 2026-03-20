import { TetrisActivePiece } from '../classes/tetris-active-piece.class';
import { TetrisGameStatus } from '../types/tetris-game-status.type';

export interface TetrisGameState {
  grid: number[][];
  activePiece: TetrisActivePiece;
  previewQueue: number[][][];
  score: number;
  totalClearedRows: number;
  dropIntervalMs: number;
  dropCounterMs: number;
  status: TetrisGameStatus;
}
