import { Injectable, inject } from '@angular/core';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TetrisAiStats } from '../interfaces/tetris-ai-stats.interface';
import { TetrisAiPersistenceService } from './tetris-ai-persistence.service';

@Injectable()
export class TetrisAiStatsService {
  private readonly persistence = inject(TetrisAiPersistenceService);
  private stats: TetrisAiStats = this.createDefaultStats();
  private stepCount = 0;

  /** Loads stats from localStorage; falls back to defaults if nothing stored. */
  public initialize(): void {
    const loaded = this.persistence.loadStats();
    if (loaded) {
      this.stats = { ...this.createDefaultStats(), ...loaded };
    }
    this.stepCount = this.stats.totalSteps;
  }

  /** Returns a readonly snapshot of current stats. */
  public getStats(): Readonly<TetrisAiStats> {
    return this.stats;
  }

  /** Returns the current epsilon value. */
  public getEpsilon(): number {
    return this.stats.epsilon;
  }

  /** Returns the total step count. */
  public getStepCount(): number {
    return this.stepCount;
  }

  /** Increments total steps and step count by 1. */
  public incrementSteps(): void {
    this.stepCount++;
    this.stats.totalSteps++;
  }

  /**
   * Updates stats at end of episode: increments totalEpisodes, updates best/average/recent scores.
   * Does NOT decay epsilon here — call decayEpsilon() separately.
   * Returns whether the score is a new best.
   */
  public onEpisodeEnd(score: number): boolean {
    this.stats.totalEpisodes++;

    const isNewBest = score > this.stats.bestScore;
    if (isNewBest) {
      this.stats.bestScore = score;
    }

    this.stats.recentScores.push(score);
    if (this.stats.recentScores.length > 20) {
      this.stats.recentScores.shift();
    }

    this.stats.averageScore =
      this.stats.recentScores.reduce((s, x) => s + x, 0) / this.stats.recentScores.length;

    this.persist();

    return isNewBest;
  }

  /** Applies epsilon decay (called by agent after teacherWarmupEpisodes threshold). */
  public decayEpsilon(): void {
    this.stats.epsilon = Math.max(
      TETRIS_AI_CONFIG.epsilonMin,
      this.stats.epsilon * TETRIS_AI_CONFIG.epsilonDecay,
    );
  }

  /** Resets all stats to defaults and persists. */
  public reset(): void {
    this.stats = this.createDefaultStats();
    this.stepCount = 0;
    this.persist();
  }

  /** Returns a fresh default stats object. */
  public createDefaultStats(): TetrisAiStats {
    return {
      totalEpisodes: 0,
      totalSteps: 0,
      bestScore: 0,
      epsilon: TETRIS_AI_CONFIG.epsilonStart,
      averageScore: 0,
      recentScores: [],
      demonstrationSamples: 0,
    };
  }

  /**
   * Restores stats from a previously exported snapshot.
   * Merges with defaults so any missing fields are back-filled.
   */
  public restoreStats(stats: TetrisAiStats): void {
    this.stats = { ...this.createDefaultStats(), ...stats };
    this.stepCount = this.stats.totalSteps;
    this.persist();
  }

  /** Persists current stats to localStorage. */
  public persist(): void {
    this.persistence.saveStats(this.stats);
  }
}
