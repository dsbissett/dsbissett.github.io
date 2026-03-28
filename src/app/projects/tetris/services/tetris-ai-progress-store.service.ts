import { Injectable, Signal, WritableSignal, signal } from '@angular/core';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TetrisAiProgressSnapshot } from '../interfaces/tetris-ai-progress-snapshot.interface';

@Injectable()
export class TetrisAiProgressStoreService {
  private readonly state: WritableSignal<TetrisAiProgressSnapshot> = signal(
    this.createDefaultState(),
  );

  public readonly snapshot: Signal<TetrisAiProgressSnapshot> = this.state.asReadonly();

  public patch(partial: Partial<TetrisAiProgressSnapshot>): void {
    this.state.update((current) => ({ ...current, ...partial }));
  }

  public reset(): void {
    this.state.set(this.createDefaultState());
  }

  private createDefaultState(): TetrisAiProgressSnapshot {
    return {
      trainingUpdates: 0,
      latestLoss: null,
      latestLossSource: null,
      recentLosses: [],
      latestMeanAbsoluteTdError: null,
      latestMaxAbsoluteTdError: null,
      currentQMin: null,
      currentQMax: null,
      targetQMin: null,
      targetQMax: null,
      rewardClipRate: 0,
      replayBufferSize: 0,
      replayBufferCapacity: TETRIS_AI_CONFIG.replayBufferSize,
      terminalReplayRatio: 0,
      demonstrationBufferSize: 0,
      demonstrationBufferCapacity: TETRIS_AI_CONFIG.demonstrationBufferSize,
      storageWarning: null,
      averageChosenValue: 0,
      averageDecisionMargin: 0,
      policyConsistency: 0,
      policySampleCount: 0,
      averageHoles: 0,
      averageBumpiness: 0,
      averageMaxHeight: 0,
      averageLinesClearedPerMove: 0,
    };
  }
}
