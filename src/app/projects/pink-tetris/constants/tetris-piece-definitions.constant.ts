import { TetrisPieceName } from '../types/tetris-piece-name.type';

export const TETRIS_PIECE_DEFINITIONS: Readonly<Record<TetrisPieceName, number[][]>> = {
  I: [
    [1, 1, 1, 1],
  ],
  O: [
    [2, 2],
    [2, 2],
  ],
  T: [
    [0, 3, 0],
    [3, 3, 3],
  ],
  L: [
    [0, 4, 0],
    [0, 4, 0],
    [0, 4, 4],
  ],
  J: [
    [0, 5, 0],
    [0, 5, 0],
    [5, 5, 0],
  ],
  S: [
    [0, 6, 6],
    [6, 6, 0],
  ],
  Z: [
    [7, 7, 0],
    [0, 7, 7],
  ],
};
