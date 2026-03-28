import { Injectable, inject } from '@angular/core';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { appendWindow, average } from '../utils/tetris-ai-progress.util';
import { TetrisAiProgressStoreService } from './tetris-ai-progress-store.service';
import { TetrisDemonstrationBufferService } from './tetris-demonstration-buffer.service';
import { TetrisReplayBufferService } from './tetris-replay-buffer.service';

const LOSS_WINDOW_SIZE = 24;
const REWARD_CLIP_WINDOW_SIZE = 60;

@Injectable()
export class TetrisAiTrainingTelemetryService {
  private readonly store = inject(TetrisAiProgressStoreService);
  private readonly replayBuffer = inject(TetrisReplayBufferService);
  private readonly demonstrationBuffer = inject(TetrisDemonstrationBufferService);
  private rewardClipHistory: number[] = [];

  public syncBufferState(): void {
    this.store.patch({
      replayBufferSize: this.replayBuffer.size,
      replayBufferCapacity: TETRIS_AI_CONFIG.replayBufferSize,
      terminalReplayRatio: this.replayBuffer.getTerminalRatio(),
      demonstrationBufferSize: this.demonstrationBuffer.size,
      demonstrationBufferCapacity: TETRIS_AI_CONFIG.demonstrationBufferSize,
    });
  }

  public recordReinforcementStep(
    loss: number | undefined,
    meanAbsoluteTdError: number,
    maxAbsoluteTdError: number,
    currentPredictions: number[],
    targets: number[],
  ): void {
    this.recordLoss(loss, 'reinforcement');
    this.store.patch({
      latestMeanAbsoluteTdError: meanAbsoluteTdError,
      latestMaxAbsoluteTdError: maxAbsoluteTdError,
      currentQMin: Math.min(...currentPredictions),
      currentQMax: Math.max(...currentPredictions),
      targetQMin: Math.min(...targets),
      targetQMax: Math.max(...targets),
    });
  }

  public recordDemonstrationLoss(loss: number | undefined): void {
    this.recordLoss(loss, 'demonstration');
  }

  public recordRewardClip(wasClipped: boolean): void {
    this.rewardClipHistory = appendWindow(
      this.rewardClipHistory,
      wasClipped ? 1 : 0,
      REWARD_CLIP_WINDOW_SIZE,
    );
    this.store.patch({
      rewardClipRate: average(this.rewardClipHistory),
    });
  }

  public reset(): void {
    this.rewardClipHistory = [];
    this.store.patch({
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
    });
    this.syncBufferState();
  }

  private recordLoss(loss: number | undefined, source: 'reinforcement' | 'demonstration'): void {
    if (loss === undefined) {
      return;
    }

    const nextLosses = appendWindow(this.store.snapshot().recentLosses, loss, LOSS_WINDOW_SIZE);
    this.store.patch({
      trainingUpdates: this.store.snapshot().trainingUpdates + 1,
      latestLoss: loss,
      latestLossSource: source,
      recentLosses: nextLosses,
      replayBufferSize: this.replayBuffer.size,
      replayBufferCapacity: TETRIS_AI_CONFIG.replayBufferSize,
      terminalReplayRatio: this.replayBuffer.getTerminalRatio(),
      demonstrationBufferSize: this.demonstrationBuffer.size,
      demonstrationBufferCapacity: TETRIS_AI_CONFIG.demonstrationBufferSize,
    });
  }
}
