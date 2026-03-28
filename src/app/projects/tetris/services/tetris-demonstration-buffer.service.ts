import { Injectable, inject } from '@angular/core';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TetrisDemonstrationExample } from '../interfaces/tetris-demonstration-example.interface';
import { TetrisAiPersistenceService } from './tetris-ai-persistence.service';

@Injectable()
export class TetrisDemonstrationBufferService {
  private readonly persistence = inject(TetrisAiPersistenceService);
  private buffer: TetrisDemonstrationExample[] = [];
  private _samplesSinceLastTraining = 0;
  private persistVersion = 0;
  private importedRehearsalPassesRemaining = 0;
  private nextImportedRehearsalStep = 0;

  /** Loads demonstration buffer from localStorage. Updates demonstrationSamples count. */
  public async load(): Promise<void> {
    this.buffer = (await this.persistence.loadDemonstrations()) ?? [];
    this.importedRehearsalPassesRemaining = 0;
    this.nextImportedRehearsalStep = 0;
  }

  /** Persists demonstration buffer asynchronously. Updates the in-memory buffer only when fallback truncation occurs. */
  public persist(): void {
    const snapshot = [...this.buffer];
    const persistVersion = ++this.persistVersion;
    void this.persistence.saveDemonstrations(snapshot).then((stored) => {
      if (persistVersion !== this.persistVersion || stored.length === snapshot.length) {
        return;
      }

      this.buffer = stored;
    });
  }

  /** Clears buffer from memory and localStorage. */
  public async clear(): Promise<void> {
    this.persistVersion++;
    this.buffer = [];
    this._samplesSinceLastTraining = 0;
    this.importedRehearsalPassesRemaining = 0;
    this.nextImportedRehearsalStep = 0;
    await this.persistence.clearDemonstrations();
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
  public async setBuffer(buffer: TetrisDemonstrationExample[]): Promise<void> {
    const persistVersion = ++this.persistVersion;
    this.buffer = buffer.slice(-TETRIS_AI_CONFIG.demonstrationBufferSize);
    this._samplesSinceLastTraining = 0;
    this.importedRehearsalPassesRemaining = 0;
    this.nextImportedRehearsalStep = 0;
    const stored = await this.persistence.saveDemonstrations(this.buffer);
    if (persistVersion === this.persistVersion) {
      this.buffer = stored;
    }
  }

  /** Returns count of samples added since last training reset. */
  public get samplesSinceLastTraining(): number {
    return this._samplesSinceLastTraining;
  }

  /** Resets the training counter to 0. */
  public resetTrainingCounter(): void {
    this._samplesSinceLastTraining = 0;
  }

  /** Schedules a small number of post-import rehearsal passes over the imported demonstrations. */
  public primeImportedRehearsal(currentStepCount: number): void {
    if (this.buffer.length < TETRIS_AI_CONFIG.demonstrationBatchSize) {
      this.importedRehearsalPassesRemaining = 0;
      this.nextImportedRehearsalStep = 0;
      return;
    }

    this.importedRehearsalPassesRemaining = TETRIS_AI_CONFIG.importedDemonstrationRehearsalPasses;
    this.nextImportedRehearsalStep =
      currentStepCount + TETRIS_AI_CONFIG.demonstrationRehearsalIntervalSteps;
  }

  /** Returns true when an imported-demonstration rehearsal pass is due. */
  public isImportedRehearsalDue(currentStepCount: number): boolean {
    return (
      this.importedRehearsalPassesRemaining > 0 &&
      currentStepCount >= this.nextImportedRehearsalStep
    );
  }

  /** Advances the import-rehearsal schedule after a rehearsal pass has completed. */
  public markImportedRehearsalComplete(currentStepCount: number): void {
    if (this.importedRehearsalPassesRemaining === 0) {
      return;
    }

    this.importedRehearsalPassesRemaining--;
    this.nextImportedRehearsalStep =
      currentStepCount + TETRIS_AI_CONFIG.demonstrationRehearsalIntervalSteps;
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
