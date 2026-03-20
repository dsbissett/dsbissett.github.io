export const TETRIS_AI_CONFIG = {
  // Network architecture
  featureCount: 48, // 27 board + 21 preview (3 pieces × 7 one-hot)
  hiddenLayer1: 128,
  hiddenLayer2: 64,

  // Training hyperparameters
  replayBufferSize: 5000,
  batchSize: 32,
  gamma: 0.90,
  learningRate: 0.00035,
  trainEveryNSteps: 2,
  targetNetworkUpdateFrequency: 50,
  replayRecentWindowSize: 640,
  replayRecentFraction: 0.5,
  replayInformativeFraction: 0.25,

  // Exploration (epsilon-greedy)
  epsilonStart: 0.35,
  epsilonMin: 0.02,
  epsilonDecay: 0.997,

  // localStorage keys (TF.js uses localstorage://<key>)
  modelStorageKey: 'tetris-ai-model',
  statsStorageKey: 'tetris-ai-stats',
  replayBufferStorageKey: 'tetris-ai-replay-buffer',
  demonstrationStorageKey: 'tetris-ai-demonstrations',
  enabledStorageKey: 'tetris-ai-enabled',

  // AI visual step interval (ms between each move animation)
  aiActionIntervalMs: 30,
  autoRestartDelayMs: 300,

  // Human demonstration learning
  demonstrationBufferSize: 32000,
  demonstrationBatchSize: 64,
  demonstrationTrainEveryNSamples: 24,
  demonstrationEpochs: 2,
  humanChosenTarget: 1.5,
  humanRejectedTarget: -0.35,
  teacherWarmupEpisodes: 20,
  teacherExploreRate: 0.12,
  teacherNegativeSamplesPerMove: 5,
  teacherChosenTarget: 1.25,
  teacherRejectedTarget: -0.75,

  // ── Delta-based reward system ──
  // reward = lineClearBonus + survivalReward
  //        - deltaHolesWeight * (newHoles - oldHoles)
  //        - deltaAggHeightWeight * (newAggHeight - oldAggHeight)
  //        - deltaBumpinessWeight * (newBumpiness - oldBumpiness)
  //        - deltaMaxHeightWeight * (newMaxHeight - oldMaxHeight)
  //        - deltaCoveredCellsWeight * (newCovered - oldCovered)
  //        - deltaPillarsWeight * (newPillars - oldPillars)

  // Line clear rewards (nonlinear / squared bonus for multi-line clears)
  // These must clearly dominate the penalty scale so the agent pursues clears
  lineClearRewards: [0, 3.0, 12.0, 27.0, 50.0] as readonly number[],

  // Survival reward: offsets the unavoidable height increase from placing a piece
  // so that a clean placement (no new holes, low bumpiness) is net-positive.
  // Typical clean piece adds ~3 agg height (0.17 penalty) + ~0.5 maxHeight (0.42 penalty)
  // → survival of 1.5 makes clean flat placements net ≈ +0.9.
  survivalReward: 1.5,

  // Delta penalty weights (penalize the CHANGE caused by the move, not absolute state)
  // Tuned so that:
  //   clean flat placement ≈ +0.9 reward (clear positive signal)
  //   slightly bumpy placement ≈ -0.5 (mildly negative)
  //   hole-creating move = severely negative (-4 to -7)
  //   line clear = massively positive (+15 to +50)
  deltaHolesWeight: 2.5,             // CRITICAL: holes are the #1 enemy
  deltaCoveredCellsWeight: 0.8,      // deeply buried holes compound the problem
  deltaAggregateHeightWeight: 0.1,   // low: height increase is unavoidable per piece
  deltaBumpinessWeight: 1.0,         // strongly discourage uneven surfaces / towers
  deltaMaxHeightWeight: 0.6,         // discourage building tall spikes
  deltaPillarsWeight: 1.0,           // severely penalize vertical gaps in columns
  deltaWellsWeight: 1.5,             // penalize columns much lower than neighbors (islands)

  // Danger zone: quadratic penalty when max column height exceeds threshold (absolute)
  // Triggers at row 5 — constant pressure to keep the board low.
  // Quadratic ramp: height 6 → 0.01 penalty, height 10 → 0.33, height 15 → 1.33, height 18 → 2.25
  heightDangerZoneRows: 5,
  heightDangerZoneWeight: 3.0,

  // Game-over penalty
  rewardGameOver: -8.0,
  rewardGameOverLengthBonusPerPiece: 0.05,
  rewardGameOverLengthBonusCap: 4.0,
  rewardGameOverScoreBonusPerPoint: 0.02, // 40-pt line clear → +0.8, 160 pts → +3.2
  rewardGameOverMaxTerminalReward: -0.5,

  // Reward clipping range (wide enough to preserve gradient for stronger signals)
  rewardClipMin: -12,
  rewardClipMax: 20,
} as const;
