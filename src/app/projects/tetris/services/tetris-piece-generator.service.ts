import { Injectable } from '@angular/core';

import { TETRIS_PIECE_DEFINITIONS } from '../constants/tetris-piece-definitions.constant';
import { TetrisMatrix } from '../classes/tetris-matrix.class';
import { TetrisPieceName } from '../types/tetris-piece-name.type';

@Injectable()
export class TetrisPieceGeneratorService {
  private static readonly PIECE_NAMES: readonly TetrisPieceName[] = [
    'I', 'O', 'T', 'L', 'J', 'S', 'Z',
  ];

  public generatePiece(): number[][] {
    const name = this.getRandomPieceName();
    return TetrisMatrix.deepCopy(TETRIS_PIECE_DEFINITIONS[name]);
  }

  public createPreviewQueue(count: number): number[][][] {
    return Array.from({ length: count }, () => this.generatePiece());
  }

  public advanceQueue(queue: number[][][]): number[][] {
    const next = queue.shift()!;
    queue.push(this.generatePiece());
    return next;
  }

  private getRandomPieceName(): TetrisPieceName {
    const index = Math.floor(
      Math.random() * TetrisPieceGeneratorService.PIECE_NAMES.length
    );
    return TetrisPieceGeneratorService.PIECE_NAMES[index];
  }
}
