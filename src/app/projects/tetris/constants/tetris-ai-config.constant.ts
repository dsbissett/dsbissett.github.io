export const TETRIS_AI_CONFIG = {
  // Network architecture
  featureCount: 24,
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
  epsilonDecay: 0.9995,

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
  rewardGameOver: -12,
  rewardPiecePlaced: 0.35,
  rewardGameOverLengthBonusPerPiece: 0.06,
  rewardGameOverLengthBonusCap: 11.5,
  scoreRewardDivisor: 100,
  holePenaltyWeight: 1.6,
  maxHeightPenaltyWeight: 1.25,
  aggregateHeightPenaltyWeight: 0.3,
  bumpinessPenaltyWeight: 0.18,
} as const;
