import { TetrisPlacement } from './tetris-placement.interface';

export interface TetrisRankedPlacement {
  index: number;
  placement: TetrisPlacement;
  modelValue: number;
  heuristicValue: number;
}
