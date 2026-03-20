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
  linesCleared: number;
  decisionSource: 'model' | 'exploration' | 'teacher';
}

/** Extracted board metrics used for delta-based reward computation. */
interface BoardMetrics {
  holes: number;
  coveredCells: number;
  aggregateHeight: number;
  bumpiness: number;
  maxHeight: number;
  pillars: number;
  wells: number;
}

interface RankedPlacement {
  index: number;
  placement: Placement;
  modelValue: number;
  heuristicValue: number;
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
  private episodeTotalLinesCleared = 0;
  private episodeTotalReward = 0;
  private pendingDemonstrationPlacements: Placement[] = [];

  /** Previous board metrics for delta computation (null = start of episode). */
  private prevMetrics: BoardMetrics | null = null;

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
    this.episodeTotalLinesCleared = 0;
    this.episodeTotalReward = 0;
    this.prevMetrics = null;
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

    // Capture pre-move metrics from the current (pre-placement) grid
    if (this.active && this.prevMetrics === null) {
      this.prevMetrics = this.extractMetrics(
        this.agent.extractFeatures(state.grid, 0, state.previewQueue),
      );
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
    this.episodeTotalLinesCleared = 0;
    this.episodeTotalReward = 0;
    this.prevMetrics = null;
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
   * Computes delta-based reward, stores experience, triggers training.
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
    this.episodeTotalLinesCleared += linesCleared;

    const reward = this.computeReward(
      this.plan.features,
      linesCleared,
      gameOver,
      this.episodePieceCount,
    );
    this.episodeTotalReward += reward;

    const nextPlacements = gameOver ? [] : this.enumeratePlacements(state);
    const nextStateValue = gameOver
      ? 0
      : this.agent.estimateBestFutureValue(nextPlacements.map((placement) => placement.features));

    this.agent.remember(this.plan.features, reward, nextStateValue, gameOver);
    this.agent.trainStep();

    // Update prevMetrics to post-placement state for next delta computation
    this.prevMetrics = this.extractMetrics(this.plan.features);

    if (gameOver) {
      this.chart.markGameEnd();
      const avgReward = this.episodePieceCount > 0 ? this.episodeTotalReward / this.episodePieceCount : 0;
      console.log(
        `%c📈 EPISODE DIAGNOSTICS`,
        'font-size:11px;font-weight:bold;color:#e0af68;background:#1a1a2e;padding:3px 6px;border-radius:4px',
      );
      console.log(
        `%c  Lines cleared: ${this.episodeTotalLinesCleared} | Pieces: ${this.episodePieceCount} | Lines/piece: ${(this.episodeTotalLinesCleared / this.episodePieceCount).toFixed(3)}`,
        'color:#c0caf5',
      );
      console.log(
        `%c  Avg reward: ${avgReward.toFixed(4)} | Total reward: ${this.episodeTotalReward.toFixed(4)}`,
        avgReward >= 0 ? 'color:#9ece6a' : 'color:#f7768e',
      );
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
    this.episodeTotalLinesCleared = 0;
    this.episodeTotalReward = 0;
    this.prevMetrics = null;
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
    this.prevMetrics = null;
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
    const rankedPlacements = placements.map((placement, index) => ({
      index,
      placement,
      modelValue: values[index],
      heuristicValue: this.scorePlacementHeuristically(placement.features),
    }));
    const teacherActive = this.shouldUseTeacherWarmup();
    const bestModelIndex = values.indexOf(Math.max(...values));
    let decisionSource: Plan['decisionSource'] = 'model';
    let idx = bestModelIndex;

    if (teacherActive) {
      idx = this.selectTeacherPlacement(rankedPlacements);
      decisionSource = 'teacher';
      this.recordTeacherGuidance(rankedPlacements);
    } else {
      idx = this.agent.selectPlacement(values);
      decisionSource = idx === bestModelIndex ? 'model' : 'exploration';
    }

    const chosen = placements[idx];

    console.groupCollapsed(
      `%c🎯 PLACEMENT DECISION %c(piece #${this.episodePieceCount + 1})`,
      'color:#7aa2f7;font-weight:bold',
      'color:#565f89',
    );
    console.log(`Candidates evaluated: ${placements.length}`);
    console.log(`Chosen: rotation=${chosen.rotation}, x=${chosen.x}, row=${chosen.placementRow}`);
    console.log(
      `Q-value: ${values[idx].toFixed(4)} (${decisionSource === 'teacher'
        ? '👨‍🏫 TEACHER WARMUP'
        : decisionSource === 'exploration'
          ? '🎲 EXPLORATION'
          : '🧠 EXPLOITATION'})`,
    );
    console.log(`Q-value range: [${Math.min(...values).toFixed(4)}, ${Math.max(...values).toFixed(4)}]`);
    if (teacherActive) {
      const heuristicValues = rankedPlacements.map((placement) => placement.heuristicValue);
      console.log(
        `Teacher heuristic range: [${Math.min(...heuristicValues).toFixed(4)}, ${Math.max(...heuristicValues).toFixed(4)}]`,
      );
    }
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
      wells: +(f[26] * 100).toFixed(1),
    });
    // Decode and log the preview queue one-hot features (indices 27-47)
    const previewFeatures = f.slice(27, 48);
    const decodedPreview: string[] = [];
    for (let i = 0; i < 3; i++) {
      const oneHot = previewFeatures.slice(i * 7, (i + 1) * 7);
      const pieceIdx = oneHot.indexOf(1);
      decodedPreview.push(pieceIdx >= 0
        ? (TetrisAiControllerService.PIECE_NAMES[pieceIdx + 1] ?? '?')
        : 'none');
    }
    console.log(`Preview features decoded: [${decodedPreview.join(', ')}] (from feature indices 27-47)`);
    console.groupEnd();

    return {
      targetMatrix: chosen.matrix,
      targetX: chosen.x,
      features: chosen.features,
      placementRow: chosen.placementRow,
      linesCleared: chosen.linesCleared,
      decisionSource,
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

  /**
   * Delta-based reward computation.
   *
   * reward = lineClearBonus + survivalReward
   *        - sum of (delta_i * weight_i) for each board metric
   *        - dangerZonePenalty (absolute, only when near death)
   */
  private computeReward(
    features: number[],
    linesCleared: number,
    gameOver: boolean,
    episodePieceCount: number,
  ): number {
    const currentMetrics = this.extractMetrics(features);
    const prev = this.prevMetrics ?? currentMetrics; // first piece: delta = 0

    // ── Positive signals ──
    const lineClearBonus = TETRIS_AI_CONFIG.lineClearRewards[linesCleared] ?? 0;
    const survivalReward = TETRIS_AI_CONFIG.survivalReward;

    // ── Delta penalties (change caused by this move) ──
    // Positive delta = metric got worse; negative delta = metric improved (rewarded)
    // Asymmetric compression: sqrt-compress WORSENING deltas to prevent blow-ups,
    // but leave IMPROVING deltas (negative) at full strength so line clears and
    // hole fixes get their full reward.
    const compressDelta = (d: number): number => d > 0 ? Math.sqrt(d) : d;

    const deltaHoles = currentMetrics.holes - prev.holes;
    const deltaCovered = currentMetrics.coveredCells - prev.coveredCells;
    const deltaAggHeight = currentMetrics.aggregateHeight - prev.aggregateHeight;
    const deltaBumpiness = currentMetrics.bumpiness - prev.bumpiness;
    const deltaMaxHeight = currentMetrics.maxHeight - prev.maxHeight;
    const deltaPillars = currentMetrics.pillars - prev.pillars;
    const deltaWells = currentMetrics.wells - prev.wells;

    const deltaPenalty =
      compressDelta(deltaHoles) * TETRIS_AI_CONFIG.deltaHolesWeight +
      compressDelta(deltaCovered) * TETRIS_AI_CONFIG.deltaCoveredCellsWeight +
      compressDelta(deltaAggHeight) * TETRIS_AI_CONFIG.deltaAggregateHeightWeight +
      compressDelta(deltaBumpiness) * TETRIS_AI_CONFIG.deltaBumpinessWeight +
      compressDelta(deltaMaxHeight) * TETRIS_AI_CONFIG.deltaMaxHeightWeight +
      compressDelta(deltaPillars) * TETRIS_AI_CONFIG.deltaPillarsWeight +
      compressDelta(deltaWells) * TETRIS_AI_CONFIG.deltaWellsWeight;

    // ── Absolute danger zone penalty (prevents ignoring lethal spikes) ──
    const gridHeight = TETRIS_GAME_CONFIG.gridHeight;
    const dangerThreshold = TETRIS_AI_CONFIG.heightDangerZoneRows;
    let dangerZonePenalty = 0;
    if (currentMetrics.maxHeight > dangerThreshold) {
      const excess = (currentMetrics.maxHeight - dangerThreshold) / (gridHeight - dangerThreshold);
      dangerZonePenalty = excess * excess * TETRIS_AI_CONFIG.heightDangerZoneWeight;
    }

    const rewardTotal = lineClearBonus + survivalReward;
    const penaltyTotal = deltaPenalty + dangerZonePenalty;
    let netReward = rewardTotal - penaltyTotal;

    this.chart.pushEntry(netReward, penaltyTotal);

    // ── Logging ──
    console.groupCollapsed(
      `%c💰 REWARD %c#${episodePieceCount} %cR=${netReward.toFixed(3)}${linesCleared > 0 ? ` ✨${linesCleared}L` : ''}`,
      'color:#9ece6a;font-weight:bold',
      'color:#565f89',
      netReward >= 0 ? 'color:#9ece6a' : 'color:#f7768e',
    );
    console.log('Reward components:', {
      lineClearBonus: +lineClearBonus.toFixed(4),
      survivalReward: +survivalReward.toFixed(4),
      rewardSubtotal: +rewardTotal.toFixed(4),
    });
    console.log('Delta penalties (raw→sqrt × weight = contribution):', {
      deltaHoles: `${deltaHoles >= 0 ? '+' : ''}${deltaHoles.toFixed(1)}→${compressDelta(deltaHoles).toFixed(2)} × ${TETRIS_AI_CONFIG.deltaHolesWeight} = ${+(compressDelta(deltaHoles) * TETRIS_AI_CONFIG.deltaHolesWeight).toFixed(4)}`,
      deltaCovered: `${deltaCovered >= 0 ? '+' : ''}${deltaCovered.toFixed(1)}→${compressDelta(deltaCovered).toFixed(2)} × ${TETRIS_AI_CONFIG.deltaCoveredCellsWeight} = ${+(compressDelta(deltaCovered) * TETRIS_AI_CONFIG.deltaCoveredCellsWeight).toFixed(4)}`,
      deltaAggHeight: `${deltaAggHeight >= 0 ? '+' : ''}${deltaAggHeight.toFixed(1)}→${compressDelta(deltaAggHeight).toFixed(2)} × ${TETRIS_AI_CONFIG.deltaAggregateHeightWeight} = ${+(compressDelta(deltaAggHeight) * TETRIS_AI_CONFIG.deltaAggregateHeightWeight).toFixed(4)}`,
      deltaBumpiness: `${deltaBumpiness >= 0 ? '+' : ''}${deltaBumpiness.toFixed(1)}→${compressDelta(deltaBumpiness).toFixed(2)} × ${TETRIS_AI_CONFIG.deltaBumpinessWeight} = ${+(compressDelta(deltaBumpiness) * TETRIS_AI_CONFIG.deltaBumpinessWeight).toFixed(4)}`,
      deltaMaxHeight: `${deltaMaxHeight >= 0 ? '+' : ''}${deltaMaxHeight.toFixed(1)}→${compressDelta(deltaMaxHeight).toFixed(2)} × ${TETRIS_AI_CONFIG.deltaMaxHeightWeight} = ${+(compressDelta(deltaMaxHeight) * TETRIS_AI_CONFIG.deltaMaxHeightWeight).toFixed(4)}`,
      deltaPillars: `${deltaPillars >= 0 ? '+' : ''}${deltaPillars.toFixed(1)}→${compressDelta(deltaPillars).toFixed(2)} × ${TETRIS_AI_CONFIG.deltaPillarsWeight} = ${+(compressDelta(deltaPillars) * TETRIS_AI_CONFIG.deltaPillarsWeight).toFixed(4)}`,
      deltaWells: `${deltaWells >= 0 ? '+' : ''}${deltaWells.toFixed(1)}→${compressDelta(deltaWells).toFixed(2)} × ${TETRIS_AI_CONFIG.deltaWellsWeight} = ${+(compressDelta(deltaWells) * TETRIS_AI_CONFIG.deltaWellsWeight).toFixed(4)}`,
      deltaPenaltySubtotal: +deltaPenalty.toFixed(4),
      dangerZonePenalty: +dangerZonePenalty.toFixed(4),
      penaltyTotal: +penaltyTotal.toFixed(4),
    });
    console.log('Board metrics (current | prev):', {
      holes: `${currentMetrics.holes.toFixed(1)} | ${prev.holes.toFixed(1)}`,
      covered: `${currentMetrics.coveredCells.toFixed(1)} | ${prev.coveredCells.toFixed(1)}`,
      aggHeight: `${currentMetrics.aggregateHeight.toFixed(1)} | ${prev.aggregateHeight.toFixed(1)}`,
      bumpiness: `${currentMetrics.bumpiness.toFixed(1)} | ${prev.bumpiness.toFixed(1)}`,
      maxHeight: `${currentMetrics.maxHeight.toFixed(1)} | ${prev.maxHeight.toFixed(1)}`,
      pillars: `${currentMetrics.pillars.toFixed(1)} | ${prev.pillars.toFixed(1)}`,
      wells: `${currentMetrics.wells.toFixed(1)} | ${prev.wells.toFixed(1)}`,
    });
    console.log(`Net reward: ${rewardTotal.toFixed(4)} - ${penaltyTotal.toFixed(4)} = ${netReward.toFixed(4)}`);
    console.groupEnd();

    if (gameOver) {
      const gameOverLengthBonus = Math.min(
        episodePieceCount * TETRIS_AI_CONFIG.rewardGameOverLengthBonusPerPiece,
        TETRIS_AI_CONFIG.rewardGameOverLengthBonusCap,
      );
      const scoreBonus = this.episodePeakScore * TETRIS_AI_CONFIG.rewardGameOverScoreBonusPerPoint;
      const terminalPenalty =
        TETRIS_AI_CONFIG.rewardGameOver + gameOverLengthBonus + scoreBonus;
      const rawTotal = Math.min(netReward, 0) + terminalPenalty;
      const total = Math.max(
        TETRIS_AI_CONFIG.rewardClipMin,
        Math.min(
          TETRIS_AI_CONFIG.rewardGameOverMaxTerminalReward,
          Math.min(TETRIS_AI_CONFIG.rewardClipMax, rawTotal),
        ),
      );
      console.log(
        `%c☠️ GAME OVER — Episode #${this.agent.getStats().totalEpisodes + 1}`,
        'font-size:14px;font-weight:bold;color:#f7768e;background:#1a1a2e;padding:4px 8px;border-radius:4px',
      );
      console.log(
        `%c  Pieces placed: ${episodePieceCount} | Peak score: ${this.episodePeakScore} | Game-over penalty: ${TETRIS_AI_CONFIG.rewardGameOver} | Length bonus: ${+gameOverLengthBonus.toFixed(4)} | Score bonus: ${+scoreBonus.toFixed(4)} | Terminal penalty: ${+terminalPenalty.toFixed(4)} | Raw: ${+rawTotal.toFixed(4)} | Clipped: ${+total.toFixed(4)}`,
        'color:#bb9af7',
      );
      return total;
    }

    return Math.max(TETRIS_AI_CONFIG.rewardClipMin, Math.min(TETRIS_AI_CONFIG.rewardClipMax, netReward));
  }

  /**
   * Extracts raw board metrics from the normalized feature vector.
   * These are denormalized back to their natural scale for interpretable deltas.
   */
  private extractMetrics(features: number[]): BoardMetrics {
    return {
      holes: features[21] * 40,          // normalized by /40
      coveredCells: features[24] * 120,   // normalized by /120
      aggregateHeight: features[20] * 200, // normalized by /200
      bumpiness: features[23] * 100,      // normalized by /100
      maxHeight: features[19] * 20,       // normalized by /20
      pillars: features[25] * 10,         // normalized by /10
      wells: features[26] * 100,          // normalized by /100
    };
  }

  private shouldUseTeacherWarmup(): boolean {
    return this.agent.getStats().totalEpisodes < TETRIS_AI_CONFIG.teacherWarmupEpisodes;
  }

  private selectTeacherPlacement(rankedPlacements: RankedPlacement[]): number {
    const sorted = [...rankedPlacements].sort((a, b) => b.heuristicValue - a.heuristicValue);
    const shortlist = sorted.slice(0, Math.min(3, sorted.length));
    const selected = Math.random() < TETRIS_AI_CONFIG.teacherExploreRate
      ? shortlist[Math.floor(Math.random() * shortlist.length)]
      : sorted[0];

    return selected.index;
  }

  private recordTeacherGuidance(rankedPlacements: RankedPlacement[]): void {
    const sorted = [...rankedPlacements].sort((a, b) => b.heuristicValue - a.heuristicValue);
    const preferred = sorted[0];
    if (!preferred) {
      return;
    }

    const rejectedFeaturesBatch = sorted
      .slice(-TETRIS_AI_CONFIG.teacherNegativeSamplesPerMove)
      .map((entry) => entry.placement.features);

    this.agent.recordTeacherGuidance(preferred.placement.features, rejectedFeaturesBatch);
    this.agent.trainOnDemonstrations();
  }

  private scorePlacementHeuristically(features: number[]): number {
    const linesCleared = features[22] * 4;
    const holes = features[21] * 40;
    const coveredCells = features[24] * 120;
    const aggregateHeight = features[20] * 200;
    const bumpiness = features[23] * 100;
    const maxHeight = features[19] * 20;
    const pillars = features[25] * 10;
    const wells = features[26] * 100;

    return (
      linesCleared * 14 -
      holes * 5 -
      coveredCells * 1.8 -
      aggregateHeight * 0.16 -
      bumpiness * 0.55 -
      maxHeight * 1.1 -
      pillars * 2.4 -
      wells * 0.95
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
