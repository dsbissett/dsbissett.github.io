import { Injectable, WritableSignal, inject, signal } from '@angular/core';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TetrisBoardMetrics } from '../interfaces/tetris-board-metrics.interface';
import { TetrisGameState } from '../interfaces/tetris-game-state.interface';
import { TetrisPlacement } from '../interfaces/tetris-placement.interface';
import { TetrisPlan } from '../interfaces/tetris-plan.interface';
import { TetrisAiStats } from '../interfaces/tetris-ai-stats.interface';
import { TetrisAiAgentService } from './tetris-ai-agent.service';
import { TetrisAiChartService } from './tetris-ai-chart.service';
import { TetrisAiDiagnosticsService } from './tetris-ai-diagnostics.service';
import { TetrisAiExecutorService } from './tetris-ai-executor.service';
import { TetrisBoardMetricsService } from './tetris-board-metrics.service';
import { TetrisPlacementEnumeratorService } from './tetris-placement-enumerator.service';
import { TetrisPlanSelectorService } from './tetris-plan-selector.service';
import { TetrisRewardCalculatorService } from './tetris-reward-calculator.service';
import { TetrisAiProgressStoreService } from './tetris-ai-progress-store.service';
import { TetrisAiMoveTelemetryService } from './tetris-ai-move-telemetry.service';
import { TetrisAiPolicyTelemetryService } from './tetris-ai-policy-telemetry.service';
import { TetrisAiTrainingTelemetryService } from './tetris-ai-training-telemetry.service';

@Injectable()
export class TetrisAiControllerService {
  private readonly agent = inject(TetrisAiAgentService);
  private readonly chart = inject(TetrisAiChartService);
  private readonly diagnostics = inject(TetrisAiDiagnosticsService);
  private readonly executor = inject(TetrisAiExecutorService);
  private readonly boardMetrics = inject(TetrisBoardMetricsService);
  private readonly placer = inject(TetrisPlacementEnumeratorService);
  private readonly planSelector = inject(TetrisPlanSelectorService);
  private readonly rewardCalc = inject(TetrisRewardCalculatorService);
  private readonly progressStore = inject(TetrisAiProgressStoreService);
  private readonly moveTelemetry = inject(TetrisAiMoveTelemetryService);
  private readonly policyTelemetry = inject(TetrisAiPolicyTelemetryService);
  private readonly trainingTelemetry = inject(TetrisAiTrainingTelemetryService);

  // ---------------------------------------------------------------------------
  // Lifecycle / coordination state
  // ---------------------------------------------------------------------------

  private active = false;
  private initialized = false;
  private plan: TetrisPlan | null = null;
  private episodePieceCount = 0;
  private episodePeakScore = 0;
  private episodeTotalLinesCleared = 0;
  private episodeTotalReward = 0;
  private pendingDemonstrationPlacements: TetrisPlacement[] = [];

  /** Previous board metrics for delta computation (null = start of episode). */
  private prevMetrics: TetrisBoardMetrics | null = null;

  // ---------------------------------------------------------------------------
  // Public signals
  // ---------------------------------------------------------------------------

  readonly isEnabled: WritableSignal<boolean> = signal(false);
  readonly isReady: WritableSignal<boolean> = signal(false);
  readonly isRecordingDemonstrations: WritableSignal<boolean> = signal(false);
  readonly progress = this.progressStore.snapshot;
  readonly stats: WritableSignal<TetrisAiStats> = signal<TetrisAiStats>({
    totalEpisodes: 0,
    totalSteps: 0,
    bestScore: 0,
    epsilon: 1,
    averageScore: 0,
    lifetimeAverageScore: 0,
    averageLinesClearedPerEpisode: 0,
    averagePiecesPerEpisode: 0,
    totalScore: 0,
    totalLinesCleared: 0,
    totalPiecesPlaced: 0,
    recentScores: [],
    recentLinesCleared: [],
    recentPiecesPlaced: [],
    demonstrationSamples: 0,
  });

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  /** Initialises the AI agent and loads the persisted enabled preference. */
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
    this.trainingTelemetry.syncBufferState();
  }

  // ---------------------------------------------------------------------------
  // Enable / disable
  // ---------------------------------------------------------------------------

  /** Enables or disables the AI and resets all episode state. */
  public setEnabled(value: boolean): void {
    this.active = value;
    this.isEnabled.set(value);
    this.plan = null;
    this.episodePieceCount = 0;
    this.episodePeakScore = 0;
    this.episodeTotalLinesCleared = 0;
    this.episodeTotalReward = 0;
    this.prevMetrics = null;
    this.persistEnabledPreference();
  }

  /** Returns true when the AI is currently active. */
  public isActive(): boolean {
    return this.active;
  }

  /** Enables or disables human-demonstration recording. */
  public setDemonstrationRecordingEnabled(value: boolean): void {
    this.isRecordingDemonstrations.set(value);
    this.pendingDemonstrationPlacements = [];
  }

  // ---------------------------------------------------------------------------
  // Game-event hooks
  // ---------------------------------------------------------------------------

  /**
   * Called after a new piece has been spawned.
   * Enumerates placements and computes the plan when the AI is active.
   */
  public onNewPiece(state: TetrisGameState): void {
    if (!this.active && !this.isRecordingDemonstrations()) {
      return;
    }

    this.captureInitialMetricsIfNeeded(state);
    this.logPieceQueue(state);

    const placements = this.placer.enumeratePlacements(state);

    if (this.isRecordingDemonstrations()) {
      this.pendingDemonstrationPlacements = placements;
    }

    if (!this.active) {
      return;
    }

    this.plan = this.planSelector.computePlan(placements, this.episodePieceCount);
    this.executor.resetCounter();
  }

  /** Resets all episode-scoped state at the start of a new game. */
  public onEpisodeStart(): void {
    this.plan = null;
    this.episodePieceCount = 0;
    this.episodePeakScore = 0;
    this.episodeTotalLinesCleared = 0;
    this.episodeTotalReward = 0;
    this.prevMetrics = null;
    this.pendingDemonstrationPlacements = [];
    this.executor.resetCounter();
  }

  /**
   * Called each frame from the game loop.
   * Returns true when the AI has hard-dropped (piece is ready to lock).
   */
  public tick(state: TetrisGameState, deltaMs: number): boolean {
    if (!this.active || !this.plan) {
      return false;
    }

    return this.executor.tick(state, deltaMs, this.plan);
  }

  /**
   * Called by the facade after a piece is locked.
   * Computes delta-based reward, stores experience, and triggers training.
   */
  public onPieceLocked(state: TetrisGameState, linesCleared: number, gameOver: boolean): void {
    this.episodePeakScore = Math.max(this.episodePeakScore, state.score);

    if (!this.active || !this.plan) {
      if (gameOver) {
        this.agent.onEpisodeEnd(
          this.episodePeakScore,
          this.episodeTotalLinesCleared,
          this.episodePieceCount,
        );
        this.stats.set({ ...this.agent.getStats() });
      }
      return;
    }

    this.episodePieceCount++;
    this.episodeTotalLinesCleared += linesCleared;

    const rewardResult = this.rewardCalc.computeReward(
      this.plan.features,
      linesCleared,
      gameOver,
      this.episodePieceCount,
      this.prevMetrics,
      this.plan,
      this.episodePeakScore,
    );
    const reward = rewardResult.value;
    this.episodeTotalReward += reward;
    this.chart.pushEntry(reward, 0);
    this.moveTelemetry.recordPlacement(this.plan.features);
    this.trainingTelemetry.recordRewardClip(rewardResult.wasClipped);

    const nextPlacements = gameOver ? [] : this.placer.enumeratePlacements(state);
    const nextStateValue = gameOver
      ? 0
      : this.agent.estimateBestFutureValue(nextPlacements.map((p) => p.features));

    this.agent.remember(this.plan.features, reward, nextStateValue, gameOver);
    this.agent.trainStep();
    this.agent.trainOnDemonstrations();

    this.prevMetrics = this.boardMetrics.extractMetrics(this.plan.features);

    if (gameOver) {
      this.chart.markGameEnd();
      this.agent.onEpisodeEnd(
        this.episodePeakScore,
        this.episodeTotalLinesCleared,
        this.episodePieceCount,
      );
    }

    this.stats.set({ ...this.agent.getStats() });
    this.plan = null;
  }

  /**
   * Called when a human player locks a piece during demonstration recording.
   * Matches the locked position to a candidate placement and records it as a demonstration.
   */
  public onHumanPieceLocked(matrix: number[][], x: number): void {
    if (!this.isRecordingDemonstrations() || this.pendingDemonstrationPlacements.length === 0) {
      return;
    }

    const placements = this.pendingDemonstrationPlacements;
    const selectedPlacement = placements.find(
      (p) => p.x === x && this.executor.matricesEqual(p.matrix, matrix),
    );

    this.pendingDemonstrationPlacements = [];

    if (!selectedPlacement) {
      return;
    }

    const rejectedFeaturesBatch = placements
      .filter((p) => p !== selectedPlacement)
      .map((p) => p.features);

    this.agent.recordDemonstrations(selectedPlacement.features, rejectedFeaturesBatch);
    this.agent.trainOnDemonstrations();
    this.stats.set({ ...this.agent.getStats() });
  }

  // ---------------------------------------------------------------------------
  // Chart methods
  // ---------------------------------------------------------------------------

  /** Initialises the reward and penalty chart canvases. */
  public initializeCharts(rewardCanvas: HTMLCanvasElement, penaltyCanvas: HTMLCanvasElement): void {
    this.chart.initialize(rewardCanvas, penaltyCanvas);
  }

  /** Re-renders the reward charts. */
  public renderCharts(): void {
    this.chart.render();
  }

  /** Destroys the chart instances and frees resources. */
  public destroyCharts(): void {
    this.chart.destroy();
  }

  // ---------------------------------------------------------------------------
  // Reset / persistence
  // ---------------------------------------------------------------------------

  /** Resets training state and all episode counters. */
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
    this.trainingTelemetry.reset();
    this.moveTelemetry.reset();
    this.policyTelemetry.reset();
  }

  /** Exports the agent's training data as a JSON string. */
  public async exportTrainingData(): Promise<string> {
    return this.agent.exportTrainingData();
  }

  /** Imports training data from a JSON string and resets episode state. */
  public async importTrainingData(json: string): Promise<void> {
    await this.agent.importTrainingData(json);
    this.plan = null;
    this.pendingDemonstrationPlacements = [];
    this.episodePieceCount = 0;
    this.prevMetrics = null;
    this.stats.set({ ...this.agent.getStats() });
    this.trainingTelemetry.syncBufferState();
    this.moveTelemetry.reset();
    this.policyTelemetry.reset();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Sets prevMetrics from the current board state on the first piece of an episode. */
  private captureInitialMetricsIfNeeded(state: TetrisGameState): void {
    if (!this.active || this.prevMetrics !== null) {
      return;
    }

    const features = this.agent.extractFeatures(state.grid, 0, state.previewQueue);
    this.prevMetrics = this.boardMetrics.extractMetrics(features);
  }

  /** Logs the active and preview piece queue via diagnostics. */
  private logPieceQueue(state: TetrisGameState): void {
    const currentPieceId = this.getPieceIdFromMatrix(state.activePiece.matrix);
    const previewPieceIds = state.previewQueue.map((m) => this.getPieceIdFromMatrix(m));
    this.diagnostics.logPieceQueue(currentPieceId, previewPieceIds);
  }

  /** Returns the non-zero cell value from a piece matrix (its piece type ID). */
  private getPieceIdFromMatrix(matrix: number[][]): number {
    for (const row of matrix) {
      for (const cell of row) {
        if (cell !== 0) return cell;
      }
    }
    return 0;
  }

  private loadEnabledPreference(): boolean {
    return localStorage.getItem(TETRIS_AI_CONFIG.enabledStorageKey) === 'true';
  }

  private persistEnabledPreference(): void {
    localStorage.setItem(TETRIS_AI_CONFIG.enabledStorageKey, String(this.active));
  }
}
