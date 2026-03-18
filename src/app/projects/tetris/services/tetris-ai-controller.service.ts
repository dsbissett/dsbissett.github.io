import { Injectable, inject, signal } from '@angular/core';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TETRIS_GAME_CONFIG } from '../constants/tetris-game-config.constant';
import { TetrisActivePiece } from '../classes/tetris-active-piece.class';
import { TetrisMatrix } from '../classes/tetris-matrix.class';
import { TetrisGameState } from '../interfaces/tetris-game-state.interface';
import { TetrisAiStats } from '../interfaces/tetris-ai-stats.interface';
import { TetrisAiAgentService } from './tetris-ai-agent.service';
import { TetrisAiChartService } from './tetris-ai-chart.service';
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
  /** Row where the piece landed (0 = top, gridHeight-1 = bottom) */
  placementRow: number;
}

interface Plan {
  targetMatrix: number[][];
  targetX: number;
  features: number[];
  placementRow: number;
}

@Injectable()
export class TetrisAiControllerService {
  private readonly agent = inject(TetrisAiAgentService);
  private readonly chart = inject(TetrisAiChartService);
  private readonly collision = inject(TetrisCollisionService);
  private readonly gridService = inject(TetrisGridService);

  private active = false;
  private initialized = false;
  private plan: Plan | null = null;
  private aiCounterMs = 0;
  private episodePieceCount = 0;
  private episodePeakScore = 0;
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
    this.episodePeakScore = 0;
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
  private static readonly PIECE_NAMES: Record<number, string> = {
    1: 'I', 2: 'O', 3: 'T', 4: 'L', 5: 'J', 6: 'S', 7: 'Z',
  };

  private getPieceIdFromMatrix(matrix: number[][]): number {
    for (const row of matrix) {
      for (const cell of row) {
        if (cell !== 0) return cell;
      }
    }
    return 0;
  }

  public onNewPiece(state: TetrisGameState): void {
    if (!this.active && !this.isRecordingDemonstrations()) {
      return;
    }

    // Log preview queue for verification
    const currentPieceId = this.getPieceIdFromMatrix(state.activePiece.matrix);
    const previewPieceIds = state.previewQueue.map((m) => this.getPieceIdFromMatrix(m));
    console.log(
      `%c🧩 PIECE QUEUE %cActive: ${TetrisAiControllerService.PIECE_NAMES[currentPieceId] ?? '?'} | Preview: [${previewPieceIds.map((id) => TetrisAiControllerService.PIECE_NAMES[id] ?? '?').join(', ')}] (${previewPieceIds.length} pieces)`,
      'color:#ff9e64;font-weight:bold',
      'color:#a9b1d6',
    );

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
    this.episodePeakScore = 0;
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
    this.episodePeakScore = Math.max(this.episodePeakScore, state.score);

    if (!this.active || !this.plan) {
      if (gameOver) {
        this.agent.onEpisodeEnd(this.episodePeakScore);
        this.stats.set({ ...this.agent.getStats() });
      }
      return;
    }

    this.episodePieceCount++;
    const reward = this.computeReward(
      this.plan.features,
      linesCleared,
      gameOver,
      this.episodePieceCount,
      this.plan.placementRow,
    );
    const nextFeatures = this.agent.extractFeatures(state.grid, 0, state.previewQueue);
    this.agent.remember(this.plan.features, reward, nextFeatures, gameOver);
    this.agent.trainStep();

    if (gameOver) {
      this.chart.markGameEnd();
      this.agent.onEpisodeEnd(this.episodePeakScore);
    }

    this.stats.set({ ...this.agent.getStats() });
    this.plan = null;
  }

  public initializeCharts(
    rewardCanvas: HTMLCanvasElement,
    penaltyCanvas: HTMLCanvasElement,
  ): void {
    this.chart.initialize(rewardCanvas, penaltyCanvas);
  }

  public renderCharts(): void {
    this.chart.render();
  }

  public destroyCharts(): void {
    this.chart.destroy();
  }

  public reset(): void {
    this.agent.reset();
    this.chart.reset();
    this.plan = null;
    this.episodePieceCount = 0;
    this.episodePeakScore = 0;
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

    const featuresBatch = placements.map((p) => p.features);
    const values = this.agent.evaluatePlacements(featuresBatch);
    const idx = this.agent.selectPlacement(featuresBatch);
    const chosen = placements[idx];
    const wasExploration = idx !== values.indexOf(Math.max(...values));

    console.groupCollapsed(
      `%c🎯 PLACEMENT DECISION %c(piece #${this.episodePieceCount + 1})`,
      'color:#7aa2f7;font-weight:bold',
      'color:#565f89',
    );
    console.log(`Candidates evaluated: ${placements.length}`);
    console.log(`Chosen: rotation=${chosen.rotation}, x=${chosen.x}, row=${chosen.placementRow}`);
    console.log(`Q-value: ${values[idx].toFixed(4)} (${wasExploration ? '🎲 EXPLORATION' : '🧠 EXPLOITATION'})`);
    console.log(`Q-value range: [${Math.min(...values).toFixed(4)}, ${Math.max(...values).toFixed(4)}]`);
    console.log(`Epsilon: ${this.agent.getStats().epsilon.toFixed(4)}`);

    const f = chosen.features;
    console.log('Board features after placement:', {
      columnHeights: f.slice(0, 10).map((v) => +(v * 20).toFixed(1)),
      maxHeight: +(f[19] * 20).toFixed(1),
      aggregateHeight: +(f[20] * 200).toFixed(1),
      holes: +(f[21] * 40).toFixed(1),
      linesCleared: +(f[22] * 4).toFixed(1),
      bumpiness: +(f[23] * 100).toFixed(1),
      coveredCells: +(f[24] * 120).toFixed(1),
      pillars: +(f[25] * 10).toFixed(1),
    });
    // Decode and log the preview queue one-hot features (indices 26-46)
    const previewFeatures = f.slice(26, 47);
    const decodedPreview: string[] = [];
    for (let i = 0; i < 3; i++) {
      const oneHot = previewFeatures.slice(i * 7, (i + 1) * 7);
      const pieceIdx = oneHot.indexOf(1);
      decodedPreview.push(pieceIdx >= 0
        ? (TetrisAiControllerService.PIECE_NAMES[pieceIdx + 1] ?? '?')
        : 'none');
    }
    console.log(`Preview features decoded: [${decodedPreview.join(', ')}] (from feature indices 26-46)`);
    console.groupEnd();

    return {
      targetMatrix: chosen.matrix,
      targetX: chosen.x,
      features: chosen.features,
      placementRow: chosen.placementRow,
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
          features: this.agent.extractFeatures(simGrid, clearResult.clearedCount, state.previewQueue),
          linesCleared: clearResult.clearedCount,
          placementRow: dropY,
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
    placementRow: number,
  ): number {
    const scoreDelta =
      ((TETRIS_GAME_CONFIG.linePoints[linesCleared] ?? 0) * 2) /
      TETRIS_AI_CONFIG.scoreRewardDivisor;
    const lineClearBonus = TETRIS_AI_CONFIG.lineClearRewards[linesCleared] ?? 0;
    const boardPenalty = this.computeBoardPenalty(features);
    const piecePlacementReward = TETRIS_AI_CONFIG.rewardPiecePlaced;
    const gameOverLengthBonus = Math.min(
      episodePieceCount * TETRIS_AI_CONFIG.rewardGameOverLengthBonusPerPiece,
      TETRIS_AI_CONFIG.rewardGameOverLengthBonusCap,
    );

    const gridHeight = TETRIS_GAME_CONFIG.gridHeight;
    const threshold = TETRIS_AI_CONFIG.placementHeightThreshold;
    const stackHeight = gridHeight - placementRow;
    let placementHeightReward: number;
    if (stackHeight <= threshold) {
      placementHeightReward =
        (threshold - stackHeight) * TETRIS_AI_CONFIG.placementRewardPerRow;
    } else {
      placementHeightReward =
        -(stackHeight - threshold) * TETRIS_AI_CONFIG.placementPenaltyPerRow;
    }

    // --- Board features for logging (both raw and normalized values) ---
    const holesNorm = features[21];
    const coveredCellsNorm = features[24];
    const maxHeightNorm = features[19];
    const aggregateHeightNorm = features[20];
    const bumpinessNorm = features[23];
    const pillarsNorm = features[25];

    // Danger zone penalty component
    const dangerThreshold = TETRIS_AI_CONFIG.heightDangerZoneRows / TETRIS_GAME_CONFIG.gridHeight;
    let dangerZonePenalty = 0;
    if (maxHeightNorm > dangerThreshold) {
      const excess = (maxHeightNorm - dangerThreshold) / (1 - dangerThreshold);
      dangerZonePenalty = excess * excess * TETRIS_AI_CONFIG.heightDangerZoneWeight;
    }

    const rewardTotal = scoreDelta + lineClearBonus + piecePlacementReward + placementHeightReward;

    this.chart.pushEntry(rewardTotal, boardPenalty);

    console.groupCollapsed(
      `%c💰 REWARD %c#${episodePieceCount} %cR=${(rewardTotal - boardPenalty).toFixed(3)}${linesCleared > 0 ? ` ✨${linesCleared}L` : ''}`,
      'color:#9ece6a;font-weight:bold',
      'color:#565f89',
      (rewardTotal - boardPenalty) >= 0 ? 'color:#9ece6a' : 'color:#f7768e',
    );
    console.log('Reward components:', {
      scoreReward: +scoreDelta.toFixed(4),
      lineClearBonus: +lineClearBonus.toFixed(4),
      piecePlacementReward: +piecePlacementReward.toFixed(4),
      placementHeightReward: +placementHeightReward.toFixed(4),
      rewardSubtotal: +rewardTotal.toFixed(4),
    });
    console.log('Penalty components (normalized × weight = contribution):', {
      holes: `raw=${+(holesNorm * 40).toFixed(1)} norm=${holesNorm.toFixed(4)} × ${TETRIS_AI_CONFIG.holePenaltyWeight} = ${+(holesNorm * TETRIS_AI_CONFIG.holePenaltyWeight).toFixed(4)}`,
      coveredCells: `raw=${+(coveredCellsNorm * 120).toFixed(1)} norm=${coveredCellsNorm.toFixed(4)} × ${TETRIS_AI_CONFIG.coveredCellsPenaltyWeight} = ${+(coveredCellsNorm * TETRIS_AI_CONFIG.coveredCellsPenaltyWeight).toFixed(4)}`,
      maxHeight: `raw=${+(maxHeightNorm * 20).toFixed(1)} norm=${maxHeightNorm.toFixed(4)} × ${TETRIS_AI_CONFIG.maxHeightPenaltyWeight} = ${+(maxHeightNorm * TETRIS_AI_CONFIG.maxHeightPenaltyWeight).toFixed(4)}`,
      aggregateHeight: `raw=${+(aggregateHeightNorm * 200).toFixed(1)} norm=${aggregateHeightNorm.toFixed(4)} × ${TETRIS_AI_CONFIG.aggregateHeightPenaltyWeight} = ${+(aggregateHeightNorm * TETRIS_AI_CONFIG.aggregateHeightPenaltyWeight).toFixed(4)}`,
      bumpiness: `raw=${+(bumpinessNorm * 100).toFixed(1)} norm=${bumpinessNorm.toFixed(4)} × ${TETRIS_AI_CONFIG.bumpinessPenaltyWeight} = ${+(bumpinessNorm * TETRIS_AI_CONFIG.bumpinessPenaltyWeight).toFixed(4)}`,
      pillars: `raw=${+(pillarsNorm * 10).toFixed(1)} norm=${pillarsNorm.toFixed(4)} × ${TETRIS_AI_CONFIG.pillarPenaltyWeight} = ${+(pillarsNorm * TETRIS_AI_CONFIG.pillarPenaltyWeight).toFixed(4)}`,
      dangerZone: `maxHeight>${TETRIS_AI_CONFIG.heightDangerZoneRows}? ${maxHeightNorm > dangerThreshold ? 'YES' : 'no'} penalty=${+dangerZonePenalty.toFixed(4)}`,
      penaltyTotal: +boardPenalty.toFixed(4),
    });
    console.log('Placement context:', {
      placementRow,
      stackHeight,
      threshold,
      linesCleared,
      heightRewardSign: stackHeight <= threshold ? 'REWARD (below threshold)' : 'PENALTY (above threshold)',
    });
    console.log(`Net reward: ${rewardTotal.toFixed(4)} - ${boardPenalty.toFixed(4)} = ${(rewardTotal - boardPenalty).toFixed(4)}`);
    console.groupEnd();

    if (gameOver) {
      const rawTotal = rewardTotal + gameOverLengthBonus - boardPenalty + TETRIS_AI_CONFIG.rewardGameOver;
      const total = Math.max(TETRIS_AI_CONFIG.rewardClipMin, Math.min(TETRIS_AI_CONFIG.rewardClipMax, rawTotal));
      console.log(
        `%c☠️ GAME OVER — Episode #${this.agent.getStats().totalEpisodes + 1}`,
        'font-size:14px;font-weight:bold;color:#f7768e;background:#1a1a2e;padding:4px 8px;border-radius:4px',
      );
      console.log(
        `%c  Pieces placed: ${episodePieceCount} | Peak score: ${this.episodePeakScore} | Game-over penalty: ${TETRIS_AI_CONFIG.rewardGameOver} | Length bonus: ${+gameOverLengthBonus.toFixed(4)} | Raw: ${+rawTotal.toFixed(4)} | Clipped: ${+total.toFixed(4)}`,
        'color:#bb9af7',
      );
      return total;
    }

    const rawNet = rewardTotal - boardPenalty;
    return Math.max(TETRIS_AI_CONFIG.rewardClipMin, Math.min(TETRIS_AI_CONFIG.rewardClipMax, rawNet));
  }

  private computeBoardPenalty(features: number[]): number {
    const maxHeight = features[19];
    const aggregateHeight = features[20];
    const holes = features[21];
    const bumpiness = features[23];
    const coveredCells = features[24];
    const pillars = features[25];

    let penalty =
      holes * TETRIS_AI_CONFIG.holePenaltyWeight +
      coveredCells * TETRIS_AI_CONFIG.coveredCellsPenaltyWeight +
      maxHeight * TETRIS_AI_CONFIG.maxHeightPenaltyWeight +
      aggregateHeight * TETRIS_AI_CONFIG.aggregateHeightPenaltyWeight +
      bumpiness * TETRIS_AI_CONFIG.bumpinessPenaltyWeight +
      pillars * TETRIS_AI_CONFIG.pillarPenaltyWeight;

    // Quadratic danger zone: penalty escalates rapidly when max height exceeds threshold
    const dangerThreshold = TETRIS_AI_CONFIG.heightDangerZoneRows / TETRIS_GAME_CONFIG.gridHeight;
    if (maxHeight > dangerThreshold) {
      const excess = (maxHeight - dangerThreshold) / (1 - dangerThreshold);
      penalty += excess * excess * TETRIS_AI_CONFIG.heightDangerZoneWeight;
    }

    return penalty;
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
