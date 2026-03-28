export interface TetrisAiProgressSnapshot {
  trainingUpdates: number;
  latestLoss: number | null;
  latestLossSource: 'reinforcement' | 'demonstration' | null;
  recentLosses: number[];
  latestMeanAbsoluteTdError: number | null;
  latestMaxAbsoluteTdError: number | null;
  currentQMin: number | null;
  currentQMax: number | null;
  targetQMin: number | null;
  targetQMax: number | null;
  rewardClipRate: number;
  replayBufferSize: number;
  replayBufferCapacity: number;
  terminalReplayRatio: number;
  demonstrationBufferSize: number;
  demonstrationBufferCapacity: number;
  storageWarning: string | null;
  averageChosenValue: number;
  averageDecisionMargin: number;
  policyConsistency: number;
  policySampleCount: number;
  averageHoles: number;
  averageBumpiness: number;
  averageMaxHeight: number;
  averageLinesClearedPerMove: number;
}
