import { Injectable, inject } from '@angular/core';
import * as tf from '@tensorflow/tfjs';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TetrisExperience } from '../interfaces/tetris-experience.interface';
import { TetrisAiDiagnosticsService } from './tetris-ai-diagnostics.service';
import { TetrisModelService } from './tetris-model.service';
import { TetrisReplayBufferService } from './tetris-replay-buffer.service';
import { TetrisDemonstrationBufferService } from './tetris-demonstration-buffer.service';
import { TetrisAiStatsService } from './tetris-ai-stats.service';

@Injectable()
export class TetrisTrainerService {
  private readonly model = inject(TetrisModelService);
  private readonly replayBuffer = inject(TetrisReplayBufferService);
  private readonly demoBuffer = inject(TetrisDemonstrationBufferService);
  private readonly stats = inject(TetrisAiStatsService);
  private readonly diagnostics = inject(TetrisAiDiagnosticsService);

  private isTraining = false;

  /**
   * Triggers RL training if conditions are met.
   * Conditions: not already training, buffer has enough samples, on correct step interval.
   */
  public trainStep(): void {
    if (this.isTraining) return;
    if (this.replayBuffer.size < TETRIS_AI_CONFIG.batchSize) return;
    if (this.stats.getStepCount() % TETRIS_AI_CONFIG.trainEveryNSteps !== 0) return;

    this.isTraining = true;
    this.runTraining().finally(() => {
      this.isTraining = false;
    });
  }

  /**
   * Triggers demonstration training if conditions are met.
   * Conditions: not already training, demo buffer has enough samples, enough new samples since last training.
   */
  public trainOnDemonstrations(): void {
    if (this.isTraining) return;
    if (this.demoBuffer.size < TETRIS_AI_CONFIG.demonstrationBatchSize) return;
    if (this.demoBuffer.samplesSinceLastTraining < TETRIS_AI_CONFIG.demonstrationTrainEveryNSamples) return;

    this.isTraining = true;
    this.runDemonstrationTraining().finally(() => {
      this.isTraining = false;
    });
  }

  /** Resets the isTraining flag (e.g., after an import clears state). */
  public reset(): void {
    this.isTraining = false;
  }

  /** Runs one RL training step: samples batch, computes targets, fits model, logs, syncs target if needed. */
  private async runTraining(): Promise<void> {
    const batch = this.replayBuffer.sampleBatch();
    const { targets, nextValues } = this.computeTargets(batch);
    const currentPredictions = this.computeCurrentPredictions(batch);

    const xs = tf.tensor2d(batch.map((e) => e.features));
    const ys = tf.tensor2d(targets, [targets.length, 1]);

    const result = await this.model.getModel().fit(xs, ys, { epochs: 1, verbose: 0 });
    const loss = result.history['loss']?.[0] as number | undefined;

    const stepCount = this.stats.getStepCount();
    this.diagnostics.logTrainingStep(
      stepCount,
      loss,
      batch,
      currentPredictions,
      targets,
      nextValues,
      this.stats.getEpsilon(),
      tf.memory().numTensors,
    );

    xs.dispose();
    ys.dispose();

    if (stepCount % TETRIS_AI_CONFIG.targetNetworkUpdateFrequency === 0) {
      this.model.syncTargetNetwork();
      this.diagnostics.logTargetNetworkSync(stepCount);
    }
  }

  /** Runs demonstration training: samples demo batch, fits model, resets counter, syncs, persists. */
  private async runDemonstrationTraining(): Promise<void> {
    const batch = this.demoBuffer.sampleBatch();
    const xs = tf.tensor2d(batch.map((e) => e.features));
    const ys = tf.tensor2d(
      batch.map((e) => e.target),
      [batch.length, 1],
    );

    const result = await this.model.getModel().fit(xs, ys, {
      epochs: TETRIS_AI_CONFIG.demonstrationEpochs,
      verbose: 0,
      shuffle: true,
    });

    const loss = result.history['loss']?.[result.history['loss'].length - 1] as number | undefined;
    this.diagnostics.logDemonstrationTraining(loss, batch, this.demoBuffer.size);

    xs.dispose();
    ys.dispose();

    this.demoBuffer.resetTrainingCounter();
    this.model.syncTargetNetwork();
    this.model.persistModel();
  }

  /** Computes Q-learning targets from a sampled batch. */
  private computeTargets(batch: TetrisExperience[]): { targets: number[]; nextValues: number[] } {
    const nextValues = batch.map((e) => e.nextStateValue ?? 0);
    const targets = batch.map((e, i) =>
      e.done ? e.reward : e.reward + TETRIS_AI_CONFIG.gamma * nextValues[i],
    );
    return { targets, nextValues };
  }

  /** Computes current model predictions for a batch (for TD error tracking). */
  private computeCurrentPredictions(batch: TetrisExperience[]): number[] {
    return tf.tidy(() => {
      const input = tf.tensor2d(batch.map((e) => e.features));
      const pred = Array.from((this.model.getModel().predict(input) as tf.Tensor).dataSync());
      input.dispose();
      return pred;
    });
  }
}
