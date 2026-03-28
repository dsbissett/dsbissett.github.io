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
    this.updateEpisodeAverages();
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
  public onEpisodeEnd(score: number, linesCleared: number, piecesPlaced: number): boolean {
    this.stats.totalEpisodes++;
    this.stats.totalScore += score;
    this.stats.totalLinesCleared += linesCleared;
    this.stats.totalPiecesPlaced += piecesPlaced;

    const isNewBest = score > this.stats.bestScore;
    if (isNewBest) {
      this.stats.bestScore = score;
    }

    this.pushRecentEpisodeValue(this.stats.recentScores, score);
    this.pushRecentEpisodeValue(this.stats.recentLinesCleared, linesCleared);
    this.pushRecentEpisodeValue(this.stats.recentPiecesPlaced, piecesPlaced);
    this.updateEpisodeAverages();

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
    };
  }

  /**
   * Restores stats from a previously exported snapshot.
   * Merges with defaults so any missing fields are back-filled.
   */
  public restoreStats(stats: TetrisAiStats): void {
    this.stats = { ...this.createDefaultStats(), ...stats };
    this.stepCount = this.stats.totalSteps;
    this.updateEpisodeAverages();
    this.persist();
  }

  /** Persists current stats to localStorage. */
  public persist(): void {
    this.persistence.saveStats(this.stats);
  }

  private pushRecentEpisodeValue(target: number[], value: number): void {
    target.push(value);
    if (target.length > 20) {
      target.shift();
    }
  }

  private updateEpisodeAverages(): void {
    this.stats.averageScore = this.computeAverage(this.stats.recentScores);
    this.stats.lifetimeAverageScore = this.computeLifetimeAverage(this.stats.totalScore);
    this.stats.averageLinesClearedPerEpisode = this.computeLifetimeAverage(
      this.stats.totalLinesCleared,
    );
    this.stats.averagePiecesPerEpisode = this.computeLifetimeAverage(this.stats.totalPiecesPlaced);
  }

  private computeAverage(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private computeLifetimeAverage(total: number): number {
    if (this.stats.totalEpisodes === 0) {
      return 0;
    }

    return total / this.stats.totalEpisodes;
  }
}
