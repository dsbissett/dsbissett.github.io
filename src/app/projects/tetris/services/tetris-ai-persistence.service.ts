import { Injectable } from '@angular/core';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TetrisDemonstrationExample } from '../interfaces/tetris-demonstration-example.interface';
import { TetrisExperience } from '../interfaces/tetris-experience.interface';
import { TetrisAiStats } from '../interfaces/tetris-ai-stats.interface';

@Injectable()
export class TetrisAiPersistenceService {
  /**
   * Loads stats from localStorage.
   * Returns null if nothing is stored or the data is corrupt.
   */
  public loadStats(): TetrisAiStats | null {
    try {
      const raw = localStorage.getItem(TETRIS_AI_CONFIG.statsStorageKey);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as TetrisAiStats;
    } catch {
      return null;
    }
  }

  /** Persists stats to localStorage. */
  public saveStats(stats: TetrisAiStats): void {
    localStorage.setItem(TETRIS_AI_CONFIG.statsStorageKey, JSON.stringify(stats));
  }

  /**
   * Loads replay buffer from localStorage.
   * Returns null if nothing is stored or the data is corrupt.
   */
  public loadReplayBuffer(): TetrisExperience[] | null {
    try {
      const raw = localStorage.getItem(TETRIS_AI_CONFIG.replayBufferStorageKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return null;
      }

      return parsed
        .filter((item): item is TetrisExperience => this.isExperience(item))
        .slice(-TETRIS_AI_CONFIG.replayBufferSize);
    } catch {
      return null;
    }
  }

  /**
   * Persists replay buffer to localStorage.
   * Uses a quota-halving retry loop: if storage is full, drops the oldest half and retries.
   * Returns the (possibly truncated) buffer that was actually stored.
   */
  public saveReplayBuffer(buffer: TetrisExperience[]): TetrisExperience[] {
    if (buffer.length === 0) {
      this.clearReplayBuffer();
      return buffer;
    }

    let bufferToStore = buffer;

    while (bufferToStore.length > 0) {
      try {
        localStorage.setItem(
          TETRIS_AI_CONFIG.replayBufferStorageKey,
          JSON.stringify(bufferToStore),
        );
        return bufferToStore;
      } catch {
        bufferToStore = bufferToStore.slice(Math.ceil(bufferToStore.length / 2));
      }
    }

    this.clearReplayBuffer();
    console.warn('AI replay buffer persistence failed: localStorage quota exceeded.');
    return [];
  }

  /** Removes the replay buffer from localStorage. */
  public clearReplayBuffer(): void {
    localStorage.removeItem(TETRIS_AI_CONFIG.replayBufferStorageKey);
  }

  /**
   * Loads demonstrations from localStorage.
   * Returns null if nothing is stored or the data is corrupt.
   */
  public loadDemonstrations(): TetrisDemonstrationExample[] | null {
    try {
      const raw = localStorage.getItem(TETRIS_AI_CONFIG.demonstrationStorageKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return null;
      }

      return parsed
        .filter((item): item is TetrisDemonstrationExample => this.isDemonstrationExample(item))
        .slice(-TETRIS_AI_CONFIG.demonstrationBufferSize);
    } catch {
      return null;
    }
  }

  /**
   * Persists demonstration buffer to localStorage.
   * Uses a quota-halving retry loop: if storage is full, drops the oldest half and retries.
   * Returns the (possibly truncated) buffer that was actually stored.
   */
  public saveDemonstrations(demos: TetrisDemonstrationExample[]): TetrisDemonstrationExample[] {
    if (demos.length === 0) {
      this.clearDemonstrations();
      return demos;
    }

    let bufferToStore = demos;

    while (bufferToStore.length > 0) {
      try {
        localStorage.setItem(
          TETRIS_AI_CONFIG.demonstrationStorageKey,
          JSON.stringify(bufferToStore),
        );
        return bufferToStore;
      } catch {
        bufferToStore = bufferToStore.slice(Math.ceil(bufferToStore.length / 2));
      }
    }

    this.clearDemonstrations();
    console.warn('AI demonstration persistence failed: localStorage quota exceeded.');
    return [];
  }

  /** Removes demonstrations from localStorage. */
  public clearDemonstrations(): void {
    localStorage.removeItem(TETRIS_AI_CONFIG.demonstrationStorageKey);
  }

  /** Removes all legacy v4/v5 localStorage keys. */
  public cleanupLegacyStorage(): void {
    const legacyModelKeys = ['tetris-ai-model', 'tetris-ai-model-v4', 'tetris-ai-model-v5'];
    const legacyStorageKeys = [
      'tetris-ai-stats',
      'tetris-ai-replay-buffer',
      'tetris-ai-demonstrations',
      'tetris-ai-stats-v5',
      'tetris-ai-replay-buffer-v5',
      'tetris-ai-demonstrations-v5',
    ];

    for (const key of legacyStorageKeys) {
      localStorage.removeItem(key);
    }

    for (const modelKey of legacyModelKeys) {
      localStorage.removeItem(`tensorflowjs_models/${modelKey}/info`);
      localStorage.removeItem(`tensorflowjs_models/${modelKey}/model_topology`);
      localStorage.removeItem(`tensorflowjs_models/${modelKey}/weight_specs`);
      localStorage.removeItem(`tensorflowjs_models/${modelKey}/weight_data`);
      localStorage.removeItem(`tensorflowjs_models/${modelKey}/model_metadata`);
    }
  }

  private isExperience(value: unknown): value is TetrisExperience {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<TetrisExperience>;
    const hasNextStateValue = typeof candidate.nextStateValue === 'number';
    const hasLegacyNextFeatures =
      Array.isArray(candidate.nextFeatures) &&
      candidate.nextFeatures.every((item) => typeof item === 'number');

    return (
      Array.isArray(candidate.features) &&
      candidate.features.every((item) => typeof item === 'number') &&
      typeof candidate.reward === 'number' &&
      (hasNextStateValue || hasLegacyNextFeatures) &&
      typeof candidate.done === 'boolean'
    );
  }

  private isDemonstrationExample(value: unknown): value is TetrisDemonstrationExample {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Partial<TetrisDemonstrationExample>;

    return (
      Array.isArray(candidate.features) &&
      candidate.features.every((item) => typeof item === 'number') &&
      typeof candidate.target === 'number'
    );
  }
}
