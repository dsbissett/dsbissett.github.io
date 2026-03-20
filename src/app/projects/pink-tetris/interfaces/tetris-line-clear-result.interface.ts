import { TetrisClearedCell } from './tetris-cleared-cell.interface';

export interface TetrisLineClearResult {
  clearedCount: number;
  clearedCells: TetrisClearedCell[];
}
