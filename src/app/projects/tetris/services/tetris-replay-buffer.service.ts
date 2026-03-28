import { Injectable, inject } from '@angular/core';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TetrisExperience } from '../interfaces/tetris-experience.interface';
import { TetrisAiPersistenceService } from './tetris-ai-persistence.service';

@Injectable()
export class TetrisReplayBufferService {
  private readonly persistence = inject(TetrisAiPersistenceService);
  private buffer: TetrisExperience[] = [];
  private persistVersion = 0;

  /** Loads replay buffer from localStorage on initialization. */
  public async load(): Promise<void> {
    this.buffer = (await this.persistence.loadReplayBuffer()) ?? [];
  }

  /** Persists replay buffer asynchronously. Updates the in-memory buffer only when fallback truncation occurs. */
  public persist(): void {
    const snapshot = [...this.buffer];
    const persistVersion = ++this.persistVersion;
    void this.persistence.saveReplayBuffer(snapshot).then((stored) => {
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
    await this.persistence.clearReplayBuffer();
  }

  /** Returns current buffer size. */
  public get size(): number {
    return this.buffer.length;
  }

  /** Returns the ratio of terminal transitions currently stored in replay. */
  public getTerminalRatio(): number {
    if (this.buffer.length === 0) {
      return 0;
    }

    return this.buffer.filter((experience) => experience.done).length / this.buffer.length;
  }

  /** Returns a copy of the current buffer contents. */
  public getBuffer(): TetrisExperience[] {
    return this.buffer;
  }

  /** Replaces the buffer contents and persists. */
  public async setBuffer(buffer: TetrisExperience[]): Promise<void> {
    const persistVersion = ++this.persistVersion;
    this.buffer = buffer.slice(-TETRIS_AI_CONFIG.replayBufferSize);
    const stored = await this.persistence.saveReplayBuffer(this.buffer);
    if (persistVersion === this.persistVersion) {
      this.buffer = stored;
    }
  }

  /**
   * Adds an experience. Evicts oldest entry if at capacity.
   * Does NOT call console.log — that is the caller's responsibility.
   */
  public add(experience: TetrisExperience): void {
    if (this.buffer.length >= TETRIS_AI_CONFIG.replayBufferSize) {
      this.buffer.shift();
    }
    this.buffer.push(experience);
    this.persist();
  }

  /** Returns a stratified batch: recent, strong-positive, terminal, informative, and random. */
  public sampleBatch(): TetrisExperience[] {
    const buf = this.buffer;
    const batch: TetrisExperience[] = [];

    const recentWindow = buf.slice(-Math.min(buf.length, TETRIS_AI_CONFIG.replayRecentWindowSize));
    const strongPositivePool = buf.filter(
      (e) => e.reward >= TETRIS_AI_CONFIG.replayStrongPositiveRewardThreshold,
    );
    const terminalPool = buf.filter((e) => e.done);
    const informativePool = this.buildInformativePool();

    const recentCount = Math.round(
      TETRIS_AI_CONFIG.batchSize * TETRIS_AI_CONFIG.replayRecentFraction,
    );
    const strongPositiveCount = Math.round(
      TETRIS_AI_CONFIG.batchSize * TETRIS_AI_CONFIG.replayStrongPositiveFraction,
    );
    const terminalCount = Math.round(
      TETRIS_AI_CONFIG.batchSize * TETRIS_AI_CONFIG.replayTerminalFraction,
    );
    const informativeCount = Math.round(
      TETRIS_AI_CONFIG.batchSize * TETRIS_AI_CONFIG.replayInformativeFraction,
    );

    this.sampleStratum(recentWindow, recentCount, batch);
    this.sampleStratum(strongPositivePool, strongPositiveCount, batch);
    this.sampleStratum(terminalPool, terminalCount, batch);
    this.sampleStratum(informativePool, informativeCount, batch);
    this.sampleStratum(buf, TETRIS_AI_CONFIG.batchSize - batch.length, batch);

    return batch;
  }

  /**
   * Builds the informative pool: non-terminal experiences with mid-range rewards,
   * sorted by priority descending, sliced to top 25% of buffer.
   */
  private buildInformativePool(): TetrisExperience[] {
    return [...this.buffer]
      .filter(
        (e) =>
          !e.done &&
          e.reward > TETRIS_AI_CONFIG.replayStrongNegativeRewardThreshold &&
          e.reward < TETRIS_AI_CONFIG.replayStrongPositiveRewardThreshold,
      )
      .sort((a, b) => this.getExperiencePriority(b) - this.getExperiencePriority(a))
      .slice(0, Math.max(TETRIS_AI_CONFIG.batchSize, Math.ceil(this.buffer.length * 0.25)));
  }

  /**
   * Randomly samples up to `count` entries from `pool` into `batch`,
   * stopping when batch reaches batchSize capacity.
   */
  private sampleStratum(pool: TetrisExperience[], count: number, batch: TetrisExperience[]): void {
    for (
      let i = 0;
      i < count && batch.length < TETRIS_AI_CONFIG.batchSize && pool.length > 0;
      i++
    ) {
      batch.push(pool[Math.floor(Math.random() * pool.length)]);
    }
  }

  /** Computes a scalar priority for an experience used for informative pool sorting. */
  private getExperiencePriority(experience: TetrisExperience): number {
    return (
      Math.abs(experience.reward) + (experience.reward > 0 ? 1.5 : 0) + (experience.done ? 2 : 0)
    );
  }
}
