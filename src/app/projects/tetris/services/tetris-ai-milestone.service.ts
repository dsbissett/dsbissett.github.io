import { Injectable } from '@angular/core';

import { TetrisAiProgressSnapshot } from '../interfaces/tetris-ai-progress-snapshot.interface';
import { TetrisAiStats } from '../interfaces/tetris-ai-stats.interface';

interface MilestoneRule {
  label: string;
  isUnlocked: (stats: TetrisAiStats, progress: TetrisAiProgressSnapshot) => boolean;
}

@Injectable()
export class TetrisAiMilestoneService {
  private readonly rules: MilestoneRule[] = [
    { label: '100+ best score', isUnlocked: (stats) => stats.bestScore >= 100 },
    { label: '10+ average score', isUnlocked: (stats) => stats.averageScore >= 10 },
    {
      label: '10-line episode',
      isUnlocked: (stats) => stats.recentLinesCleared.some((value) => value >= 10),
    },
    {
      label: '50-piece survival',
      isUnlocked: (stats) => stats.recentPiecesPlaced.some((value) => value >= 50),
    },
    {
      label: 'Replay buffer 25%',
      isUnlocked: (_stats, progress) =>
        progress.replayBufferSize >= progress.replayBufferCapacity * 0.25,
    },
    {
      label: 'Replay buffer full',
      isUnlocked: (_stats, progress) =>
        progress.replayBufferSize >= progress.replayBufferCapacity,
    },
    {
      label: '100 training updates',
      isUnlocked: (_stats, progress) => progress.trainingUpdates >= 100,
    },
    {
      label: 'Stable policy 80%',
      isUnlocked: (_stats, progress) =>
        progress.policySampleCount >= 10 && progress.policyConsistency >= 0.8,
    },
  ];

  public evaluate(stats: TetrisAiStats, progress: TetrisAiProgressSnapshot): string[] {
    return this.rules
      .filter((rule) => rule.isUnlocked(stats, progress))
      .map((rule) => rule.label);
  }
}
