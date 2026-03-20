import { Injectable } from '@angular/core';

import { TETRIS_GAME_CONFIG } from '../constants/tetris-game-config.constant';
import { TetrisGameState } from '../interfaces/tetris-game-state.interface';

@Injectable()
export class TetrisScoringService {
  public applyHeightPenalty(state: TetrisGameState, stackHeight: number): void {
    const excess = stackHeight - TETRIS_GAME_CONFIG.stackHeightThreshold;
    if (excess <= 0) {
      return;
    }
    const penalty = excess * TETRIS_GAME_CONFIG.stackHeightPenaltyPerRow;
    state.score = Math.max(0, state.score - penalty);
  }

  public applyLineClear(state: TetrisGameState, clearedCount: number): void {
    state.score += this.calculatePoints(clearedCount);
    state.totalClearedRows += clearedCount;
  }

  public shouldSpeedUp(totalClearedRows: number): boolean {
    return (
      totalClearedRows > 0 &&
      totalClearedRows % TETRIS_GAME_CONFIG.speedUpThreshold === 0
    );
  }

  public applySpeedUp(state: TetrisGameState): void {
    state.dropIntervalMs /= TETRIS_GAME_CONFIG.speedUpDivisor;
  }

  private calculatePoints(clearedCount: number): number {
    const points = TETRIS_GAME_CONFIG.linePoints[clearedCount] ?? 0;
    return points * 2;
  }
}
