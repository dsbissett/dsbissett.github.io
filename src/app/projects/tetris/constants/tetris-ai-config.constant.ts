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
  rewardPiecePlaced: 0.05,
  rewardGameOverLengthBonusPerPiece: 0.06,
  rewardGameOverLengthBonusCap: 3.0,
  scoreRewardDivisor: 20,
  lineClearRewards: [0, 1.0, 3.0, 6.0, 12.0] as readonly number[],
  holePenaltyWeight: 2.0,
  coveredCellsPenaltyWeight: 1.0,
  maxHeightPenaltyWeight: 1.5,
  aggregateHeightPenaltyWeight: 0.4,
  bumpinessPenaltyWeight: 0.5,
  pillarPenaltyWeight: 1.5,
  placementHeightThreshold: 4,
  placementRewardPerRow: 0.05,
  placementPenaltyPerRow: 0.4,
  rewardClipMin: -5,
  rewardClipMax: 5,
} as const;
