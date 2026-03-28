import { Injectable, inject } from '@angular/core';
import * as tf from '@tensorflow/tfjs';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TetrisAiStats } from '../interfaces/tetris-ai-stats.interface';
import { TetrisAiDiagnosticsService } from './tetris-ai-diagnostics.service';
import { TetrisAiPersistenceService } from './tetris-ai-persistence.service';
import { TetrisAiSerializerService } from './tetris-ai-serializer.service';
import { TetrisAiStatsService } from './tetris-ai-stats.service';
import { TetrisBoardAnalyzerService } from './tetris-board-analyzer.service';
import { TetrisDemonstrationBufferService } from './tetris-demonstration-buffer.service';
import { TetrisModelService } from './tetris-model.service';
import { TetrisReplayBufferService } from './tetris-replay-buffer.service';
import { TetrisTrainerService } from './tetris-trainer.service';
import { TetrisAiTrainingTelemetryService } from './tetris-ai-training-telemetry.service';

@Injectable()
export class TetrisAiAgentService {
  private readonly persistence = inject(TetrisAiPersistenceService);
  private readonly stats = inject(TetrisAiStatsService);
  private readonly replayBuffer = inject(TetrisReplayBufferService);
  private readonly demoBuffer = inject(TetrisDemonstrationBufferService);
  private readonly model = inject(TetrisModelService);
  private readonly trainer = inject(TetrisTrainerService);
  private readonly boardAnalyzer = inject(TetrisBoardAnalyzerService);
  private readonly serializer = inject(TetrisAiSerializerService);
  private readonly diagnostics = inject(TetrisAiDiagnosticsService);
  private readonly trainingTelemetry = inject(TetrisAiTrainingTelemetryService);

  /** Initialises TF.js, loads persisted state, and builds or restores the model. */
  public async initialize(): Promise<void> {
    await tf.ready();
    this.persistence.cleanupLegacyStorage();
    this.stats.initialize();
    await this.replayBuffer.load();
    await this.demoBuffer.load();
    const loaded = await this.model.tryLoadModel();
    if (!loaded) {
      this.model.buildModels();
      const hadSavedState =
        this.stats.getStats().totalEpisodes > 0 ||
        this.replayBuffer.size > 0 ||
        this.demoBuffer.size > 0;
      if (hadSavedState) {
        const previousEpsilon = this.stats.getEpsilon();
        this.diagnostics.logModelLoadFailure(
          previousEpsilon,
          this.stats.getStats().totalEpisodes,
          this.replayBuffer.size,
          this.demoBuffer.size,
        );
      }
    }
    this.diagnostics.logAgentInitialized(
      tf.getBackend() ?? 'unknown',
      loaded,
      this.stats.getStats(),
      this.replayBuffer.size,
      this.demoBuffer.size,
    );
    this.trainingTelemetry.syncBufferState();
  }

  /**
   * Extracts the 53-element normalised feature vector from a board state.
   * Delegates entirely to TetrisBoardAnalyzerService.
   */
  public extractFeatures(
    grid: number[][],
    linesCleared: number,
    previewQueue: number[][][],
  ): number[] {
    return this.boardAnalyzer.extractFeatures(grid, linesCleared, previewQueue);
  }

  /** Returns predicted Q-values for a batch of feature vectors. */
  public evaluatePlacements(featuresBatch: number[][]): number[] {
    return this.model.evaluatePlacements(featuresBatch);
  }

  /** Returns the maximum predicted future value across a batch using the target network. */
  public estimateBestFutureValue(featuresBatch: number[][]): number {
    return this.model.estimateBestFutureValue(featuresBatch);
  }

  /** Epsilon-greedy selection: returns the index of the chosen placement. */
  public selectPlacement(values: number[]): number {
    return this.model.selectPlacement(values);
  }

  /** Stores a transition in the replay buffer, increments step counter, and persists. */
  public remember(features: number[], reward: number, nextStateValue: number, done: boolean): void {
    this.replayBuffer.add({ features, reward, nextStateValue, done });
    this.stats.incrementSteps();
    this.diagnostics.logReplayBufferEntry(
      this.replayBuffer.size,
      TETRIS_AI_CONFIG.replayBufferSize,
      this.stats.getStepCount(),
      reward,
      nextStateValue,
      done,
    );
    this.trainingTelemetry.syncBufferState();
    this.stats.persist();
  }

  /** Stores a human-demonstrated placement pair in the demonstration buffer. */
  public recordDemonstrations(
    preferredFeatures: number[],
    rejectedFeaturesBatch: number[][],
  ): void {
    this.demoBuffer.append(
      preferredFeatures,
      rejectedFeaturesBatch,
      TETRIS_AI_CONFIG.humanChosenTarget,
      TETRIS_AI_CONFIG.humanRejectedTarget,
    );
    this.trainingTelemetry.syncBufferState();
  }

  /** Stores a teacher-guided placement pair in the demonstration buffer. */
  public recordTeacherGuidance(
    preferredFeatures: number[],
    rejectedFeaturesBatch: number[][],
  ): void {
    this.demoBuffer.append(
      preferredFeatures,
      rejectedFeaturesBatch,
      TETRIS_AI_CONFIG.teacherChosenTarget,
      TETRIS_AI_CONFIG.teacherRejectedTarget,
    );
    this.trainingTelemetry.syncBufferState();
  }

  /** Triggers an RL training step if the buffer and step-count conditions are met. */
  public trainStep(): void {
    this.trainer.trainStep();
  }

  /** Triggers a demonstration training pass if enough new samples have been collected. */
  public trainOnDemonstrations(): void {
    this.trainer.trainOnDemonstrations();
  }

  /** Decays epsilon according to the configured decay rate and minimum. */
  public decayEpsilon(): void {
    this.stats.decayEpsilon();
  }

  /** Updates stats at episode end, decays epsilon after warmup, logs summary, and saves model. */
  public onEpisodeEnd(score: number, linesCleared: number, piecesPlaced: number): void {
    const isNewBest = this.stats.onEpisodeEnd(score, linesCleared, piecesPlaced);
    if (this.stats.getStats().totalEpisodes >= TETRIS_AI_CONFIG.teacherWarmupEpisodes) {
      this.stats.decayEpsilon();
    }
    this.diagnostics.logEpisodeSummary(
      this.stats.getStats(),
      score,
      isNewBest,
      this.replayBuffer.size,
      this.demoBuffer.size,
    );
    this.model.persistModel();
  }

  /** Returns a readonly snapshot of the current training statistics. */
  public getStats(): Readonly<TetrisAiStats> {
    return this.stats.getStats();
  }

  /** Wipes all training state: stats, buffers, and model. */
  public reset(): void {
    this.persistence.cleanupLegacyStorage();
    this.stats.reset();
    void this.replayBuffer.clear();
    void this.demoBuffer.clear();
    this.trainer.reset();
    this.model.buildModels();
    this.trainingTelemetry.reset();
    void tf.io.removeModel(`localstorage://${TETRIS_AI_CONFIG.modelStorageKey}`).catch(() => {
      this.model.removeStoredModelArtifacts();
    });
  }

  /** Serialises all training state (stats, buffers, model weights) to a JSON string. */
  public async exportTrainingData(): Promise<string> {
    return this.serializer.exportTrainingData(
      this.stats.getStats(),
      this.replayBuffer.getBuffer(),
      this.demoBuffer.getBuffer(),
    );
  }

  /** Restores training state from a previously exported JSON string. */
  public async importTrainingData(json: string): Promise<void> {
    const payload = this.serializer.parseTrainingExport(json);
    this.stats.restoreStats({
      ...payload.stats,
      demonstrationSamples: payload.demonstrations.length,
    });
    await this.replayBuffer.setBuffer(payload.replayBuffer);
    await this.demoBuffer.setBuffer(payload.demonstrations);
    this.demoBuffer.primeImportedRehearsal(this.stats.getStepCount());
    this.trainer.reset();
    await this.model.loadImportedModel(payload.model);
    this.model.persistModel();
    this.trainingTelemetry.reset();
  }
}
