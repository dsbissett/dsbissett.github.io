export const TETRIS_AI_CONFIG = {
  // Network architecture
  // featureCount = 36 board features + 21 preview (3 pieces x 7 one-hot) = 57 total.
  // Board features: col heights (10), height diffs (9), max height (1), agg height (1),
  //   holes (1), lines cleared (1), bumpiness (1), covered cells (1), pillars (1),
  //   wells (1), row completeness (1), absolute holes sqrt (1),
  //   low-board density (1), height variance (1), near-complete rows (1),
  //   row transitions (1), column transitions (1), landing height (1),
  //   eroded piece cells (1) = 36.
  featureCount: 57,
  hiddenLayer1: 128,
  hiddenLayer2: 64,

  // Training hyperparameters
  replayBufferSize: 10000,
  batchSize: 64,
  // Gamma 0.92: more myopic to focus on immediate placement quality.
  // Tetris boards change rapidly; long-horizon bootstrapping adds noise.
  gamma: 0.89,
  learningRate: 0.00015,
  trainEveryNSteps: 2,
  // Target sync every 250 steps (~8 episodes). Slower sync prevents Q-value
  // oscillation that caused the ep55-59 regression in R3.
  targetNetworkUpdateFrequency: 250,
  replayRecentWindowSize: 1000,
  replayRecentFraction: 0.3,
  replayInformativeFraction: 0.15,
  replayStrongPositiveFraction: 0.2,
  replayTerminalFraction: 0.1,
  replayStrongPositiveRewardThreshold: 8.0,
  replayStrongNegativeRewardThreshold: -8.0,

  // Exploration (epsilon-greedy)
  // Start at 0.20 post-teacher for broader coverage of the placement space.
  epsilonStart: 0.2,
  epsilonMin: 0.03,
  // Per-episode decay: ~125 post-teacher episodes to reach minimum.
  // This keeps exploration high just after warmup without pinning it at 0.20.
  epsilonDecay: 0.985,

  // localStorage keys (TF.js uses localstorage://<key>)
  // Key updated to v7: feature vector extended from 53 to 57 inputs (row transitions,
  // column transitions, landing height, eroded piece cells). v6 model weights are
  // incompatible with the new input shape and must be discarded.
  modelStorageKey: 'tetris-ai-model-v7',
  statsStorageKey: 'tetris-ai-stats-v7',
  replayBufferStorageKey: 'tetris-ai-replay-buffer-v7',
  demonstrationStorageKey: 'tetris-ai-demonstrations-v7',
  enabledStorageKey: 'tetris-ai-enabled',

  // AI visual step interval (ms between each move animation)
  aiActionIntervalMs: 30,
  autoRestartDelayMs: 300,

  // Human demonstration learning
  demonstrationBufferSize: 32000,
  demonstrationBatchSize: 64,
  demonstrationTrainEveryNSamples: 24,
  demonstrationEpochs: 2,
  demonstrationRehearsalIntervalSteps: 125,
  importedDemonstrationRehearsalPasses: 8,
  humanChosenTarget: 1.5,
  humanRejectedTarget: -0.35,
  // Teacher warmup: 20 episodes. Enough to bootstrap without constraining
  // post-teacher RL learning.
  teacherWarmupEpisodes: 20,
  teacherExploreRate: 0.05,
  teacherNegativeSamplesPerMove: 3,
  // Teacher targets aligned with RL TD-target range for smooth handoff.
  teacherChosenTarget: 2.0,
  teacherRejectedTarget: -2.0,

  // ── Delta-based reward system (R5) ──
  // reward = lineClearBonus + survivalReward + lowPlacementBonus + lowRowLineClearBonus
  //        - sum of delta penalties
  //        - absolute board-shape penalties (stack overflow, buried cells, height variance)
  //        - dangerZonePenalty
  //        - absoluteHolesPenalty
  //
  // R3 POSTMORTEM: Delta penalties were far too large. A typical clean placement
  // (bumpiness +3, maxHeight +1, aggHeight +4) yielded penalty ~4.5 vs survival 2.0,
  // making nearly every non-line-clear move net negative. The agent couldn't
  // distinguish "slightly bad" from "catastrophically bad" -- everything clipped
  // to -14. This destroyed gradient information.
  //
  // R4 FIX: Scale delta weights down so that a CLEAN placement (no holes,
  // normal height increase, modest bumpiness change) yields penalty ~1.0-1.5,
  // keeping net reward at +0.5 to +1.0. Hole-creating moves remain strongly
  // negative. Added heightVariance delta to directly penalize tower creation.

  // Line clear rewards -- strongly super-linear to prioritize multi-line clears.
  lineClearRewards: [0, 10.0, 22.0, 36.0, 55.0] as readonly number[],

  // Survival reward: must exceed typical clean-placement delta penalty sum (~1.0-1.5).
  survivalReward: 2.5,

  // Low-row line clear bonus: extra reward when lines are cleared at low rows.
  // Applied as: weight * rowFraction * linesCleared where rowFraction = placementRow/gridHeight.
  lowRowLineClearWeight: 5.0,

  // Delta penalty weights -- still shaped so clean placements stay positive,
  // but now strong enough to reject tower-building and new holes sooner.
  // Typical clean placement budget:
  //   bumpiness delta ~2 * 0.4 = 0.8
  //   maxHeight delta ~1 * 0.3 = 0.3
  //   aggHeight delta ~3 * 0.03 = 0.09
  //   heightVariance delta ~1 * 0.2 = 0.2
  //   Total clean penalty: ~1.4  (survival 2.5 gives net +1.1)
  //
  // Hole-creating move:
  //   holes delta 1 * 6.5 = 6.5
  //   covered delta 1 * 1.8 = 1.8
  //   + normal deltas ~1.5-2.0 = clearly net negative
  deltaHolesWeight: 6.5, // hole creation must lose to almost every non-clearing alternative
  deltaCoveredCellsWeight: 1.8, // buried cells often precede hard-to-fix holes
  deltaAggregateHeightWeight: 0.05, // still gentle, but no longer effectively free
  deltaBumpinessWeight: 0.6, // stronger pressure toward flatter surfaces
  deltaMaxHeightWeight: 0.6, // towers constrain future placements quickly
  deltaPillarsWeight: 0.8, // vertical gaps trap pieces
  deltaWellsWeight: 0.35, // tolerate wells a little, but not gratuitously
  // NEW: height variance delta penalty -- directly targets tower creation (Goal 5).
  // A tower spike increases variance by 2-5; flat play changes variance by 0-1.
  deltaHeightVarianceWeight: 0.45,

  // Absolute hole penalty: continuous pressure to avoid boards with holes.
  // Kept strong enough that the learner keeps preferring hole repair.
  absoluteHolesWeight: 0.9,

  // Absolute board-shape pressure: keeps post-warmup learning from accepting
  // a "stable but tall" board that leaves too few future placements.
  preferredStackHeightRows: 7,
  stackOverflowPenaltyWeight: 0.18,
  absoluteCoveredCellsWeight: 0.35,
  absoluteHeightVarianceWeight: 0.08,

  // Danger zone: quadratic penalty once the tallest column moves above the
  // preferred mid-board stack and starts squeezing future placements.
  heightDangerZoneRows: 8,
  heightDangerZoneWeight: 8.0,

  // Game-over penalty
  rewardGameOver: -10.0,
  rewardGameOverLengthBonusPerPiece: 0.05,
  rewardGameOverLengthBonusCap: 5.0,
  rewardGameOverScoreBonusPerPoint: 0.02,
  rewardGameOverMaxTerminalReward: -4.0,

  // Reward clipping range -- wider to preserve gradient between bad and terrible.
  rewardClipMin: -10,
  rewardClipMax: 35,
} as const;
