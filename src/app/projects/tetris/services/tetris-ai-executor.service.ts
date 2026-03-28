import { Injectable, inject } from '@angular/core';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TetrisActivePiece } from '../classes/tetris-active-piece.class';
import { TetrisMatrix } from '../classes/tetris-matrix.class';
import { TetrisGameState } from '../interfaces/tetris-game-state.interface';
import { TetrisPlan } from '../interfaces/tetris-plan.interface';
import { TetrisCollisionService } from './tetris-collision.service';

@Injectable()
export class TetrisAiExecutorService {
  private readonly collision = inject(TetrisCollisionService);
  private aiCounterMs = 0;

  /**
   * Executes one frame of the AI's planned move.
   * Steps: (1) wait for action interval, (2) rotate to target orientation,
   * (3) translate horizontally to target x, (4) hard-drop.
   * Returns true when the piece has been hard-dropped and is ready to lock.
   */
  public tick(state: TetrisGameState, deltaMs: number, plan: TetrisPlan): boolean {
    this.aiCounterMs += deltaMs;
    if (this.aiCounterMs < TETRIS_AI_CONFIG.aiActionIntervalMs) {
      return false;
    }
    this.aiCounterMs = 0;

    const piece = state.activePiece;

    // Step 1 – rotate to target orientation
    if (!this.matricesEqual(piece.matrix, plan.targetMatrix)) {
      const rotated = TetrisMatrix.rotate(piece.matrix);
      if (!this.collision.hasCollision(rotated, state.grid, piece.x, piece.y)) {
        piece.matrix = rotated;
      } else {
        this.nudgeTowardTarget(piece, state.grid, plan.targetX);
      }
      return false;
    }

    // Step 2 – move horizontally toward target x
    if (piece.x < plan.targetX) {
      if (!this.collision.hasCollision(piece.matrix, state.grid, piece.x + 1, piece.y)) {
        piece.x++;
      }
      return false;
    }
    if (piece.x > plan.targetX) {
      if (!this.collision.hasCollision(piece.matrix, state.grid, piece.x - 1, piece.y)) {
        piece.x--;
      }
      return false;
    }

    // Step 3 – hard drop: move piece to its lowest valid row
    while (!this.collision.hasCollision(piece.matrix, state.grid, piece.x, piece.y + 1)) {
      piece.y++;
    }
    return true; // signal the facade to lock immediately
  }

  /** Returns true if two piece matrices are identical. */
  public matricesEqual(a: number[][], b: number[][]): boolean {
    if (a.length !== b.length || a[0].length !== b[0].length) {
      return false;
    }

    return a.every((row, y) => row.every((val, x) => val === b[y][x]));
  }

  /** Resets the frame counter. Call when starting a new plan. */
  public resetCounter(): void {
    this.aiCounterMs = 0;
  }

  /** Nudges piece one step toward the target column to unblock rotation. */
  private nudgeTowardTarget(piece: TetrisActivePiece, grid: number[][], targetX: number): void {
    if (piece.x === targetX) {
      return;
    }

    const dx = piece.x < targetX ? 1 : -1;
    if (!this.collision.hasCollision(piece.matrix, grid, piece.x + dx, piece.y)) {
      piece.x += dx;
    }
  }
}
