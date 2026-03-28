import { Injectable, inject } from '@angular/core';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TetrisDemonstrationExample } from '../interfaces/tetris-demonstration-example.interface';
import { TetrisExperience } from '../interfaces/tetris-experience.interface';
import { TetrisAiProgressStoreService } from './tetris-ai-progress-store.service';
import { TetrisAiStats } from '../interfaces/tetris-ai-stats.interface';

const TRAINING_DB_NAME = 'tetris-ai-training-storage';
const TRAINING_DB_VERSION = 1;
const TRAINING_STORE_NAME = 'training-state';
const REPLAY_INDEXED_DB_KEY = 'replay-buffer-v7';
const DEMONSTRATION_INDEXED_DB_KEY = 'demonstrations-v7';

interface IndexedDbEntry<T> {
  key: string;
  savedAt: string;
  value: T;
}

@Injectable()
export class TetrisAiPersistenceService {
  private readonly progressStore = inject(TetrisAiProgressStoreService);

  private dbPromise: Promise<IDBDatabase | null> | null = null;

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
   * Loads replay buffer from IndexedDB and migrates the current localStorage value on first load.
   * Returns null if nothing is stored or the data is corrupt.
   */
  public async loadReplayBuffer(): Promise<TetrisExperience[] | null> {
    const indexedDbBuffer = await this.loadFromIndexedDb<TetrisExperience[]>(
      REPLAY_INDEXED_DB_KEY,
      (value): value is TetrisExperience[] =>
        Array.isArray(value) && value.every((item) => this.isExperience(item)),
    );
    if (indexedDbBuffer !== null) {
      localStorage.removeItem(TETRIS_AI_CONFIG.replayBufferStorageKey);
      return indexedDbBuffer;
    }

    const fallbackBuffer = this.loadReplayBufferFromLocalStorage();
    if (!fallbackBuffer) {
      return null;
    }

    const stored = await this.saveReplayBuffer(fallbackBuffer);
    return stored;
  }

  /**
   * Persists replay buffer to IndexedDB, falling back to localStorage only when IndexedDB is unavailable.
   * Returns the stored buffer, which may be truncated only in the localStorage fallback path.
   */
  public async saveReplayBuffer(buffer: TetrisExperience[]): Promise<TetrisExperience[]> {
    if (buffer.length === 0) {
      await this.clearReplayBuffer();
      return [];
    }

    const savedToIndexedDb = await this.saveToIndexedDb(REPLAY_INDEXED_DB_KEY, buffer);
    if (savedToIndexedDb) {
      localStorage.removeItem(TETRIS_AI_CONFIG.replayBufferStorageKey);
      this.clearStorageWarning();
      return buffer;
    }

    const stored = this.saveReplayBufferToLocalStorage(buffer);
    if (stored.length < buffer.length) {
      this.setStorageWarning(
        `Replay storage truncated to ${stored.length.toLocaleString()} entries because IndexedDB was unavailable and localStorage quota was exceeded.`,
      );
    } else {
      this.setStorageWarning(
        'IndexedDB is unavailable, so replay and demonstration buffers are using localStorage fallback storage.',
      );
    }
    return stored;
  }

  /** Removes the replay buffer from IndexedDB and the fallback localStorage key. */
  public async clearReplayBuffer(): Promise<void> {
    await this.deleteFromIndexedDb(REPLAY_INDEXED_DB_KEY);
    localStorage.removeItem(TETRIS_AI_CONFIG.replayBufferStorageKey);
  }

  /**
   * Loads demonstrations from IndexedDB and migrates the current localStorage value on first load.
   * Returns null if nothing is stored or the data is corrupt.
   */
  public async loadDemonstrations(): Promise<TetrisDemonstrationExample[] | null> {
    const indexedDbBuffer = await this.loadFromIndexedDb<TetrisDemonstrationExample[]>(
      DEMONSTRATION_INDEXED_DB_KEY,
      (value): value is TetrisDemonstrationExample[] =>
        Array.isArray(value) && value.every((item) => this.isDemonstrationExample(item)),
    );
    if (indexedDbBuffer !== null) {
      localStorage.removeItem(TETRIS_AI_CONFIG.demonstrationStorageKey);
      return indexedDbBuffer;
    }

    const fallbackBuffer = this.loadDemonstrationsFromLocalStorage();
    if (!fallbackBuffer) {
      return null;
    }

    const stored = await this.saveDemonstrations(fallbackBuffer);
    return stored;
  }

  /**
   * Persists demonstration buffer to IndexedDB, falling back to localStorage only when IndexedDB is unavailable.
   * Returns the stored buffer, which may be truncated only in the localStorage fallback path.
   */
  public async saveDemonstrations(
    demonstrations: TetrisDemonstrationExample[],
  ): Promise<TetrisDemonstrationExample[]> {
    if (demonstrations.length === 0) {
      await this.clearDemonstrations();
      return [];
    }

    const savedToIndexedDb = await this.saveToIndexedDb(
      DEMONSTRATION_INDEXED_DB_KEY,
      demonstrations,
    );
    if (savedToIndexedDb) {
      localStorage.removeItem(TETRIS_AI_CONFIG.demonstrationStorageKey);
      this.clearStorageWarning();
      return demonstrations;
    }

    const stored = this.saveDemonstrationsToLocalStorage(demonstrations);
    if (stored.length < demonstrations.length) {
      this.setStorageWarning(
        `Demonstration storage truncated to ${stored.length.toLocaleString()} examples because IndexedDB was unavailable and localStorage quota was exceeded.`,
      );
    } else {
      this.setStorageWarning(
        'IndexedDB is unavailable, so replay and demonstration buffers are using localStorage fallback storage.',
      );
    }
    return stored;
  }

  /** Removes demonstrations from IndexedDB and the fallback localStorage key. */
  public async clearDemonstrations(): Promise<void> {
    await this.deleteFromIndexedDb(DEMONSTRATION_INDEXED_DB_KEY);
    localStorage.removeItem(TETRIS_AI_CONFIG.demonstrationStorageKey);
  }

  /** Removes all legacy v4/v5/v6 localStorage keys. */
  public cleanupLegacyStorage(): void {
    const legacyModelKeys = [
      'tetris-ai-model',
      'tetris-ai-model-v4',
      'tetris-ai-model-v5',
      'tetris-ai-model-v6',
    ];
    const legacyStorageKeys = [
      'tetris-ai-stats',
      'tetris-ai-replay-buffer',
      'tetris-ai-demonstrations',
      'tetris-ai-stats-v5',
      'tetris-ai-replay-buffer-v5',
      'tetris-ai-demonstrations-v5',
      'tetris-ai-stats-v6',
      'tetris-ai-replay-buffer-v6',
      'tetris-ai-demonstrations-v6',
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

  private async loadFromIndexedDb<T>(
    key: string,
    guard: (value: unknown) => value is T,
  ): Promise<T | null> {
    const database = await this.getDatabase();
    if (!database) {
      return null;
    }

    const entry = await this.readEntry<T>(database, key);
    if (!entry || !guard(entry.value)) {
      return null;
    }

    return entry.value;
  }

  private async saveToIndexedDb<T>(key: string, value: T): Promise<boolean> {
    const database = await this.getDatabase();
    if (!database) {
      return false;
    }

    return new Promise<boolean>((resolve) => {
      try {
        const transaction = database.transaction(TRAINING_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(TRAINING_STORE_NAME);
        const request = store.put({
          key,
          savedAt: new Date().toISOString(),
          value,
        } satisfies IndexedDbEntry<T>);

        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
        transaction.onabort = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  private async deleteFromIndexedDb(key: string): Promise<void> {
    const database = await this.getDatabase();
    if (!database) {
      return;
    }

    await new Promise<void>((resolve) => {
      try {
        const transaction = database.transaction(TRAINING_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(TRAINING_STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        transaction.onabort = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  private async getDatabase(): Promise<IDBDatabase | null> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    if (typeof indexedDB === 'undefined') {
      return null;
    }

    this.dbPromise = new Promise<IDBDatabase | null>((resolve) => {
      try {
        const request = indexedDB.open(TRAINING_DB_NAME, TRAINING_DB_VERSION);

        request.onupgradeneeded = () => {
          const database = request.result;
          if (!database.objectStoreNames.contains(TRAINING_STORE_NAME)) {
            database.createObjectStore(TRAINING_STORE_NAME, { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          const database = request.result;
          database.onversionchange = () => database.close();
          resolve(database);
        };
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  private readEntry<T>(database: IDBDatabase, key: string): Promise<IndexedDbEntry<T> | null> {
    return new Promise<IndexedDbEntry<T> | null>((resolve) => {
      try {
        const transaction = database.transaction(TRAINING_STORE_NAME, 'readonly');
        const store = transaction.objectStore(TRAINING_STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () =>
          resolve((request.result as IndexedDbEntry<T> | undefined) ?? null);
        request.onerror = () => resolve(null);
        transaction.onabort = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  private loadReplayBufferFromLocalStorage(): TetrisExperience[] | null {
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

  private saveReplayBufferToLocalStorage(buffer: TetrisExperience[]): TetrisExperience[] {
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

    localStorage.removeItem(TETRIS_AI_CONFIG.replayBufferStorageKey);
    return [];
  }

  private loadDemonstrationsFromLocalStorage(): TetrisDemonstrationExample[] | null {
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

  private saveDemonstrationsToLocalStorage(
    demonstrations: TetrisDemonstrationExample[],
  ): TetrisDemonstrationExample[] {
    let bufferToStore = demonstrations;

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

    localStorage.removeItem(TETRIS_AI_CONFIG.demonstrationStorageKey);
    return [];
  }

  private clearStorageWarning(): void {
    this.progressStore.patch({ storageWarning: null });
  }

  private setStorageWarning(message: string): void {
    this.progressStore.patch({ storageWarning: message });
    console.warn(message);
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
