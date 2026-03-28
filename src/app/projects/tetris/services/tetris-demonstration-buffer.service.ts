import { Injectable, inject } from '@angular/core';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TetrisDemonstrationExample } from '../interfaces/tetris-demonstration-example.interface';
import { TetrisAiPersistenceService } from './tetris-ai-persistence.service';

@Injectable()
export class TetrisDemonstrationBufferService {
  private readonly persistence = inject(TetrisAiPersistenceService);
  private buffer: TetrisDemonstrationExample[] = [];
  private _samplesSinceLastTraining = 0;

  /** Loads demonstration buffer from localStorage. Updates demonstrationSamples count. */
  public load(): void {
    this.buffer = this.persistence.loadDemonstrations() ?? [];
  }

  /** Persists demonstration buffer (with quota-halving). Updates buffer if truncated. */
  public persist(): void {
    this.buffer = this.persistence.saveDemonstrations(this.buffer);
  }

  /** Clears buffer from memory and localStorage. */
  public clear(): void {
    this.buffer = [];
    this.persistence.clearDemonstrations();
  }

  /** Returns current buffer size. */
  public get size(): number {
    return this.buffer.length;
  }

  /** Returns the current buffer contents. */
  public getBuffer(): TetrisDemonstrationExample[] {
    return this.buffer;
  }

  /** Replaces the buffer contents and persists. */
  public setBuffer(buffer: TetrisDemonstrationExample[]): void {
    this.buffer = buffer.slice(-TETRIS_AI_CONFIG.demonstrationBufferSize);
    this.persist();
  }

  /** Returns count of samples added since last training reset. */
  public get samplesSinceLastTraining(): number {
    return this._samplesSinceLastTraining;
  }

  /** Resets the training counter to 0. */
  public resetTrainingCounter(): void {
    this._samplesSinceLastTraining = 0;
  }

  /**
   * Appends preferred + rejected feature examples to the buffer.
   * Trims buffer to max demonstrationBufferSize.
   * Increments samplesSinceLastTraining.
   * Persists after appending.
   */
  public append(
    preferredFeatures: number[],
    rejectedFeaturesBatch: number[][],
    preferredTarget: number,
    rejectedTarget: number,
  ): void {
    const examples: TetrisDemonstrationExample[] = [
      { features: preferredFeatures, target: preferredTarget },
      ...rejectedFeaturesBatch.map((features) => ({ features, target: rejectedTarget })),
    ];

    this.buffer.push(...examples);
    if (this.buffer.length > TETRIS_AI_CONFIG.demonstrationBufferSize) {
      this.buffer = this.buffer.slice(-TETRIS_AI_CONFIG.demonstrationBufferSize);
    }

    this._samplesSinceLastTraining += examples.length;
    this.persist();
  }

  /** Returns a random sample batch of size demonstrationBatchSize. */
  public sampleBatch(): TetrisDemonstrationExample[] {
    const dataset = this.buffer;
    const batch: TetrisDemonstrationExample[] = [];
    for (let i = 0; i < TETRIS_AI_CONFIG.demonstrationBatchSize; i++) {
      batch.push(dataset[Math.floor(Math.random() * dataset.length)]);
    }
    return batch;
  }
}
