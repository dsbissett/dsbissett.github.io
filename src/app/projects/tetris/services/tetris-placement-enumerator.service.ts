import { Injectable, inject } from '@angular/core';

import { TETRIS_GAME_CONFIG } from '../constants/tetris-game-config.constant';
import { TetrisActivePiece } from '../classes/tetris-active-piece.class';
import { TetrisMatrix } from '../classes/tetris-matrix.class';
import { TetrisGameState } from '../interfaces/tetris-game-state.interface';
import { TetrisPlacement } from '../interfaces/tetris-placement.interface';
import { TetrisBoardAnalyzerService } from './tetris-board-analyzer.service';
import { TetrisCollisionService } from './tetris-collision.service';
import { TetrisGridService } from './tetris-grid.service';

@Injectable()
export class TetrisPlacementEnumeratorService {
  private readonly collision = inject(TetrisCollisionService);
  private readonly grid = inject(TetrisGridService);
  private readonly boardAnalyzer = inject(TetrisBoardAnalyzerService);

  /** Enumerates all valid placements for the active piece across all rotations and columns. */
  public enumeratePlacements(state: TetrisGameState): TetrisPlacement[] {
    const results: TetrisPlacement[] = [];
    let matrix = TetrisMatrix.deepCopy(state.activePiece.matrix);

    for (let rotation = 0; rotation < 4; rotation++) {
      this.enumerateRotation(state, matrix, rotation, results);
      matrix = TetrisMatrix.rotate(matrix);
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Enumerates all valid column placements for a single rotation. */
  private enumerateRotation(
    state: TetrisGameState,
    matrix: number[][],
    rotation: number,
    results: TetrisPlacement[],
  ): void {
    const width = matrix[0].length;
    const maxX = TETRIS_GAME_CONFIG.gridWidth - width;

    for (let x = 0; x <= maxX; x++) {
      if (this.collision.hasCollision(matrix, state.grid, x, 0)) continue;

      const dropY = this.simulateDrop(matrix, state.grid, x);
      const { simGrid, clearedCount } = this.simulatePlacement(matrix, state.grid, x, dropY);
      const featureVec = this.boardAnalyzer.extractFeatures(simGrid, clearedCount, state.previewQueue);
      const rowCompleteness = featureVec[27] * 20;

      results.push({
        rotation,
        x,
        matrix: matrix.map((r) => [...r]),
        features: featureVec,
        linesCleared: clearedCount,
        placementRow: dropY,
        rowCompleteness,
      });
    }
  }

  /** Simulates hard-dropping a piece at column x, returns the landing row. */
  private simulateDrop(matrix: number[][], gridData: number[][], x: number): number {
    let dropY = 0;
    while (!this.collision.hasCollision(matrix, gridData, x, dropY + 1)) {
      dropY++;
    }
    return dropY;
  }

  /** Simulates placing the piece and clearing lines; returns a copy of the grid and line count. */
  private simulatePlacement(
    matrix: number[][],
    gridData: number[][],
    x: number,
    dropY: number,
  ): { simGrid: number[][]; clearedCount: number } {
    const simGrid = gridData.map((row) => [...row]);
    const tempPiece = new TetrisActivePiece(matrix, x, dropY);
    this.grid.merge(simGrid, tempPiece);
    const clearResult = this.grid.clearLines(simGrid);
    return { simGrid, clearedCount: clearResult.clearedCount };
  }
}
