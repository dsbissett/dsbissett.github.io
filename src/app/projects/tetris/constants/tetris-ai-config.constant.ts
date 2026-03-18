export const TETRIS_AI_CONFIG = {
  // Network architecture
  featureCount: 47, // 26 board + 21 preview (3 pieces × 7 one-hot)
  hiddenLayer1: 128,
  hiddenLayer2: 64,

  // Training hyperparameters
  replayBufferSize: 5000,
  batchSize: 32,
  gamma: 0.95,
  learningRate: 0.001,
  trainEveryNSteps: 4,
  targetNetworkUpdateFrequency: 100,

  // Exploration (epsilon-greedy)
  epsilonStart: 1.0,
  epsilonMin: 0.05,
  epsilonDecay: 0.995,

  // localStorage keys (TF.js uses localstorage://<key>)
  modelStorageKey: 'tetris-ai-model',
  statsStorageKey: 'tetris-ai-stats',
  replayBufferStorageKey: 'tetris-ai-replay-buffer',
  demonstrationStorageKey: 'tetris-ai-demonstrations',
  enabledStorageKey: 'tetris-ai-enabled',

  // AI visual step interval (ms between each move animation)
  aiActionIntervalMs: 60,
  autoRestartDelayMs: 900,

  // Human demonstration learning
  demonstrationBufferSize: 32000,
  demonstrationBatchSize: 64,
  demonstrationTrainEveryNSamples: 24,
  demonstrationEpochs: 2,
  humanChosenTarget: 1.5,
  humanRejectedTarget: -0.35,

  // Rewards
  rewardGameOver: -2,
  rewardPiecePlaced: 0.15,
  rewardGameOverLengthBonusPerPiece: 0.06,
  rewardGameOverLengthBonusCap: 3.0,
  scoreRewardDivisor: 20,
  lineClearRewards: [0, 3.0, 8.0, 15.0, 30.0] as readonly number[],
  holePenaltyWeight: 12.0,
  coveredCellsPenaltyWeight: 6.0,
  maxHeightPenaltyWeight: 2.5,
  aggregateHeightPenaltyWeight: 1.2,
  bumpinessPenaltyWeight: 2.0,
  pillarPenaltyWeight: 2.5,
  placementHeightThreshold: 6,
  placementRewardPerRow: 0.15,
  placementPenaltyPerRow: 1.2,
  heightDangerZoneRows: 6,
  heightDangerZoneWeight: 5.0,
  rewardClipMin: -10,
  rewardClipMax: 10,

  // Derived penalties (computed from column heights, not NN features)
  heightVariancePenaltyWeight: 1.5,
  wellPenaltyWeight: 1.2,
  wellDepthThreshold: 3,

  // Column spread bonus: reward for distributing blocks across more columns
  columnSpreadBonusWeight: 0.3,

  // Bottom-row completeness bonus: reward for filling the bottom N rows
  bottomRowCompletenessBonusRows: 3,
  bottomRowCompletenessBonusWeight: 1.5,
  bottomRowCompletenessThreshold: 0.7, // only reward when row is >= 70% full
} as const;
