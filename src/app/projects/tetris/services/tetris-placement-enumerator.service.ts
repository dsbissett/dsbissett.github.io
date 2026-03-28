import { Injectable, inject } from '@angular/core';

import { TETRIS_GAME_CONFIG } from '../constants/tetris-game-config.constant';
import { TetrisActivePiece } from '../classes/tetris-active-piece.class';
import { TetrisMatrix } from '../classes/tetris-matrix.class';
import { TetrisGameState } from '../interfaces/tetris-game-state.interface';
import { TetrisPlacement } from '../interfaces/tetris-placement.interface';
import { TetrisPlacementContext } from '../interfaces/tetris-placement-context.interface';
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
      const { simGrid, clearedCount, erodedCells } = this.simulatePlacement(matrix, state.grid, x, dropY);
      const context: TetrisPlacementContext = { dropY, pieceMatrix: matrix, erodedCells };
      const featureVec = this.boardAnalyzer.extractFeatures(simGrid, clearedCount, state.previewQueue, context);
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

  /**
   * Simulates placing the piece and clearing lines.
   * Eroded cells (L × P) are counted before line-clearing so piece identity is preserved.
   */
  private simulatePlacement(
    matrix: number[][],
    gridData: number[][],
    x: number,
    dropY: number,
  ): { simGrid: number[][]; clearedCount: number; erodedCells: number } {
    const simGrid = gridData.map((row) => [...row]);
    const tempPiece = new TetrisActivePiece(matrix, x, dropY);
    this.grid.merge(simGrid, tempPiece);
    const pieceCellsInCompleteRows = this.countPieceCellsInCompleteRows(simGrid, matrix, dropY);
    const clearResult = this.grid.clearLines(simGrid);
    return {
      simGrid,
      clearedCount: clearResult.clearedCount,
      erodedCells: clearResult.clearedCount * pieceCellsInCompleteRows,
    };
  }

  /** Counts piece cells that occupy completely-filled rows (measured after merge, before clear). */
  private countPieceCellsInCompleteRows(
    simGrid: number[][],
    matrix: number[][],
    dropY: number,
  ): number {
    let count = 0;
    for (let r = 0; r < matrix.length; r++) {
      const gridRow = dropY + r;
      if (gridRow >= simGrid.length) continue;
      if (!simGrid[gridRow].every((cell) => cell !== 0)) continue;
      for (const cell of matrix[r]) {
        if (cell !== 0) count++;
      }
    }
    return count;
  }
}
