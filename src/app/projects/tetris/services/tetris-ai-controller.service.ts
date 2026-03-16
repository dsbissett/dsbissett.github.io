import { Injectable, inject, signal } from '@angular/core';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TETRIS_GAME_CONFIG } from '../constants/tetris-game-config.constant';
import { TetrisActivePiece } from '../classes/tetris-active-piece.class';
import { TetrisMatrix } from '../classes/tetris-matrix.class';
import { TetrisGameState } from '../interfaces/tetris-game-state.interface';
import { TetrisAiStats } from '../interfaces/tetris-ai-stats.interface';
import { TetrisAiAgentService } from './tetris-ai-agent.service';
import { TetrisCollisionService } from './tetris-collision.service';
import { TetrisGridService } from './tetris-grid.service';

interface Placement {
  /** Number of CW rotations from spawn orientation */
  rotation: number;
  /** Target column offset */
  x: number;
  /** The rotated piece matrix */
  matrix: number[][];
  /** Board features after simulating this placement */
  features: number[];
  linesCleared: number;
}

interface Plan {
  targetMatrix: number[][];
  targetX: number;
  features: number[];
}

@Injectable()
export class TetrisAiControllerService {
  private readonly agent = inject(TetrisAiAgentService);
  private readonly collision = inject(TetrisCollisionService);
  private readonly gridService = inject(TetrisGridService);

  private active = false;
  private initialized = false;
  private plan: Plan | null = null;
  private aiCounterMs = 0;
  private episodePieceCount = 0;
  private pendingDemonstrationPlacements: Placement[] = [];

  readonly isEnabled = signal(false);
  readonly isReady = signal(false);
  readonly isRecordingDemonstrations = signal(false);
  readonly stats = signal<TetrisAiStats>({
    totalEpisodes: 0,
    totalSteps: 0,
    bestScore: 0,
    epsilon: 1,
    averageScore: 0,
    recentScores: [],
    demonstrationSamples: 0,
  });

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.agent.initialize();
    this.initialized = true;
    this.active = this.loadEnabledPreference();
    this.isReady.set(true);
    this.isEnabled.set(this.active);
    this.stats.set({ ...this.agent.getStats() });
  }

  public setEnabled(value: boolean): void {
    this.active = value;
    this.isEnabled.set(value);
    this.plan = null;
    this.aiCounterMs = 0;
    this.episodePieceCount = 0;
    this.persistEnabledPreference();
  }

  public isActive(): boolean {
    return this.active;
  }

  public setDemonstrationRecordingEnabled(value: boolean): void {
    this.isRecordingDemonstrations.set(value);
    this.pendingDemonstrationPlacements = [];
  }

  /**
   * Called after a new piece has been spawned.
   * Plans the optimal placement immediately.
   */
  public onNewPiece(state: TetrisGameState): void {
    if (!this.active && !this.isRecordingDemonstrations()) {
      return;
    }

    const placements = this.enumeratePlacements(state);

    if (this.isRecordingDemonstrations()) {
      this.pendingDemonstrationPlacements = placements;
    }

    if (!this.active) {
      return;
    }

    this.plan = this.computePlan(placements);
    this.aiCounterMs = 0;
  }

  public onEpisodeStart(): void {
    this.plan = null;
    this.aiCounterMs = 0;
    this.episodePieceCount = 0;
    this.pendingDemonstrationPlacements = [];
  }

  /**
   * Called each frame from the game loop.
   * Returns true when the AI has hard-dropped (piece is at bottom, ready to lock).
   */
  public tick(state: TetrisGameState, deltaMs: number): boolean {
    if (!this.active || !this.plan) {
      return false;
    }

    this.aiCounterMs += deltaMs;
    if (this.aiCounterMs < TETRIS_AI_CONFIG.aiActionIntervalMs) {
      return false;
    }
    this.aiCounterMs = 0;

    const piece = state.activePiece;
    const plan = this.plan;

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

  /**
   * Called by the facade after a piece is locked.
   * Computes reward, stores experience, triggers training.
   */
  public onPieceLocked(state: TetrisGameState, linesCleared: number, gameOver: boolean): void {
    if (!this.active || !this.plan) {
      return;
    }

    this.episodePieceCount++;
    const reward = this.computeReward(
      this.plan.features,
      linesCleared,
      gameOver,
      this.episodePieceCount,
    );
    const nextFeatures = this.agent.extractFeatures(state.grid, 0);
    this.agent.remember(this.plan.features, reward, nextFeatures, gameOver);
    this.agent.trainStep();

    if (gameOver) {
      this.agent.onEpisodeEnd(state.score);
    }

    this.stats.set({ ...this.agent.getStats() });
    this.plan = null;
  }

  public reset(): void {
    this.agent.reset();
    this.plan = null;
    this.episodePieceCount = 0;
    this.pendingDemonstrationPlacements = [];
    this.stats.set({ ...this.agent.getStats() });
  }

  public async exportTrainingData(): Promise<string> {
    return this.agent.exportTrainingData();
  }

  public async importTrainingData(json: string): Promise<void> {
    await this.agent.importTrainingData(json);
    this.plan = null;
    this.pendingDemonstrationPlacements = [];
    this.episodePieceCount = 0;
    this.stats.set({ ...this.agent.getStats() });
  }

  public onHumanPieceLocked(matrix: number[][], x: number): void {
    if (!this.isRecordingDemonstrations() || this.pendingDemonstrationPlacements.length === 0) {
      return;
    }

    const placements = this.pendingDemonstrationPlacements;
    const selectedPlacement = placements.find(
      (placement) => placement.x === x && this.matricesEqual(placement.matrix, matrix),
    );

    this.pendingDemonstrationPlacements = [];

    if (!selectedPlacement) {
      return;
    }

    const rejectedFeaturesBatch = placements
      .filter((placement) => placement !== selectedPlacement)
      .map((placement) => placement.features);

    this.agent.recordDemonstrations(selectedPlacement.features, rejectedFeaturesBatch);
    this.agent.trainOnDemonstrations();
    this.stats.set({ ...this.agent.getStats() });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private computePlan(placements: Placement[]): Plan | null {
    if (placements.length === 0) return null;

    const idx = this.agent.selectPlacement(placements.map((p) => p.features));
    const chosen = placements[idx];

    return {
      targetMatrix: chosen.matrix,
      targetX: chosen.x,
      features: chosen.features,
    };
  }

  private enumeratePlacements(state: TetrisGameState): Placement[] {
    const results: Placement[] = [];
    let matrix = TetrisMatrix.deepCopy(state.activePiece.matrix);

    for (let rotation = 0; rotation < 4; rotation++) {
      const width = matrix[0].length;
      const maxX = TETRIS_GAME_CONFIG.gridWidth - width;

      for (let x = 0; x <= maxX; x++) {
        // Piece must be able to enter from the top at this column
        if (this.collision.hasCollision(matrix, state.grid, x, 0)) continue;

        // Simulate hard drop
        let dropY = 0;
        while (!this.collision.hasCollision(matrix, state.grid, x, dropY + 1)) {
          dropY++;
        }

        // Simulate placing and clearing lines on a copy of the grid
        const simGrid = state.grid.map((row) => [...row]);
        const tempPiece = new TetrisActivePiece(matrix, x, dropY);
        this.gridService.merge(simGrid, tempPiece);
        const clearResult = this.gridService.clearLines(simGrid);

        results.push({
          rotation,
          x,
          matrix: matrix.map((r) => [...r]),
          features: this.agent.extractFeatures(simGrid, clearResult.clearedCount),
          linesCleared: clearResult.clearedCount,
        });
      }

      matrix = TetrisMatrix.rotate(matrix);
    }

    return results;
  }

  private computeReward(
    features: number[],
    linesCleared: number,
    gameOver: boolean,
    episodePieceCount: number,
  ): number {
    const scoreDelta =
      ((TETRIS_GAME_CONFIG.linePoints[linesCleared] ?? 0) * 2) /
      TETRIS_AI_CONFIG.scoreRewardDivisor;
    const boardPenalty = this.computeBoardPenalty(features);
    const piecePlacementReward = TETRIS_AI_CONFIG.rewardPiecePlaced;
    const gameOverLengthBonus = Math.min(
      episodePieceCount * TETRIS_AI_CONFIG.rewardGameOverLengthBonusPerPiece,
      TETRIS_AI_CONFIG.rewardGameOverLengthBonusCap,
    );

    if (gameOver) {
      return (
        scoreDelta +
        piecePlacementReward +
        gameOverLengthBonus -
        boardPenalty +
        TETRIS_AI_CONFIG.rewardGameOver
      );
    }

    return scoreDelta + piecePlacementReward - boardPenalty;
  }

  private computeBoardPenalty(features: number[]): number {
    const maxHeight = features[19];
    const aggregateHeight = features[20];
    const holes = features[21];
    const bumpiness = features[23];

    return (
      holes * TETRIS_AI_CONFIG.holePenaltyWeight +
      maxHeight * TETRIS_AI_CONFIG.maxHeightPenaltyWeight +
      aggregateHeight * TETRIS_AI_CONFIG.aggregateHeightPenaltyWeight +
      bumpiness * TETRIS_AI_CONFIG.bumpinessPenaltyWeight
    );
  }

  private matricesEqual(a: number[][], b: number[][]): boolean {
    if (a.length !== b.length || a[0].length !== b[0].length) {
      return false;
    }

    return a.every((row, y) => row.every((val, x) => val === b[y][x]));
  }

  private nudgeTowardTarget(piece: TetrisActivePiece, grid: number[][], targetX: number): void {
    if (piece.x === targetX) {
      return;
    }

    const dx = piece.x < targetX ? 1 : -1;
    if (!this.collision.hasCollision(piece.matrix, grid, piece.x + dx, piece.y)) {
      piece.x += dx;
    }
  }

  private loadEnabledPreference(): boolean {
    return localStorage.getItem(TETRIS_AI_CONFIG.enabledStorageKey) === 'true';
  }

  private persistEnabledPreference(): void {
    localStorage.setItem(TETRIS_AI_CONFIG.enabledStorageKey, String(this.active));
  }
}
