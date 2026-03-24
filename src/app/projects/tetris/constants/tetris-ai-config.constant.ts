export const TETRIS_AI_CONFIG = {
  // Network architecture
  // featureCount = 32 board features + 21 preview (3 pieces x 7 one-hot) = 53 total.
  // Board features: col heights (10), height diffs (9), max height (1), agg height (1),
  //   holes (1), lines cleared (1), bumpiness (1), covered cells (1), pillars (1),
  //   wells (1), row completeness (1), absolute holes sqrt (1),
  //   low-board density (1), height variance (1),
  //   near-complete rows count (1) = 32.
  featureCount: 53,
  hiddenLayer1: 128,
  hiddenLayer2: 64,

  // Training hyperparameters
  replayBufferSize: 10000,
  batchSize: 64,
  // Gamma 0.92: more myopic to focus on immediate placement quality.
  // Tetris boards change rapidly; long-horizon bootstrapping adds noise.
  gamma: 0.92,
  learningRate: 0.00015,
  trainEveryNSteps: 2,
  // Target sync every 250 steps (~8 episodes). Slower sync prevents Q-value
  // oscillation that caused the ep55-59 regression in R3.
  targetNetworkUpdateFrequency: 250,
  replayRecentWindowSize: 1000,
  replayRecentFraction: 0.35,
  replayInformativeFraction: 0.35,

  // Exploration (epsilon-greedy)
  // Start at 0.20 post-teacher for broader coverage of the placement space.
  epsilonStart: 0.20,
  epsilonMin: 0.03,
  // Slower decay: ~120 post-teacher episodes to reach minimum.
  // This prevents premature exploitation of a still-noisy Q-function.
  epsilonDecay: 0.9980,

  // localStorage keys (TF.js uses localstorage://<key>)
  // Key updated to v5: reward rebalancing (scaled-down deltas, heightVariance penalty,
  // first-piece delta fix, model-load-failure epsilon reset).
  modelStorageKey: 'tetris-ai-model-v5',
  statsStorageKey: 'tetris-ai-stats-v5',
  replayBufferStorageKey: 'tetris-ai-replay-buffer-v5',
  demonstrationStorageKey: 'tetris-ai-demonstrations-v5',
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
  // Teacher warmup: 20 episodes. Enough to bootstrap without constraining
  // post-teacher RL learning.
  teacherWarmupEpisodes: 20,
  teacherExploreRate: 0.05,
  teacherNegativeSamplesPerMove: 3,
  // Teacher targets aligned with RL TD-target range for smooth handoff.
  teacherChosenTarget: 2.0,
  teacherRejectedTarget: -2.0,

  // ── Delta-based reward system (R4) ──
  // reward = lineClearBonus + survivalReward + lowRowLineClearBonus
  //        - sum of delta penalties (scaled down so clean placements are positive)
  //        - dangerZonePenalty (absolute, near death)
  //        - absoluteHolesPenalty (gentle, continuous)
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
  lowRowLineClearWeight: 4.0,

  // Delta penalty weights -- SCALED DOWN from R3 so clean placements are positive.
  // Typical clean placement budget:
  //   bumpiness delta ~2 * 0.4 = 0.8
  //   maxHeight delta ~1 * 0.3 = 0.3
  //   aggHeight delta ~3 * 0.03 = 0.09
  //   heightVariance delta ~1 * 0.2 = 0.2
  //   Total clean penalty: ~1.4  (survival 2.5 gives net +1.1)
  //
  // Hole-creating move:
  //   holes delta 1 * 5.0 = 5.0
  //   covered delta 1 * 1.0 = 1.0
  //   + normal deltas ~1.4 = total ~7.4  (survival 2.5 gives net -4.9)
  deltaHolesWeight: 5.0,             // creating 1 hole: -5.0 (still dominant bad-move signal)
  deltaCoveredCellsWeight: 1.0,      // buried cells: moderate penalty
  deltaAggregateHeightWeight: 0.03,  // very low -- height increase is unavoidable per piece
  deltaBumpinessWeight: 0.4,         // typical delta 2-3: penalty 0.8-1.2 (halved from R3's 0.8)
  deltaMaxHeightWeight: 0.3,         // typical delta 1: penalty 0.3 (reduced from R3's 0.5)
  deltaPillarsWeight: 0.6,           // vertical gaps trap pieces
  deltaWellsWeight: 0.3,             // wells needed for I-piece Tetris clears
  // NEW: height variance delta penalty -- directly targets tower creation (Goal 5).
  // A tower spike increases variance by 2-5; flat play changes variance by 0-1.
  deltaHeightVarianceWeight: 0.2,

  // Absolute hole penalty: continuous pressure to avoid boards with holes.
  // Reduced from 0.6 to 0.4: delta penalty (5.0) is primary deterrent.
  absoluteHolesWeight: 0.4,

  // Danger zone: quadratic penalty when max column height exceeds threshold.
  // Threshold at 10: allows healthy stacking up to 8-9 rows without penalty.
  // Healthy Tetris play stacks 6-8 rows before clearing; threshold at 8 was
  // too aggressive and penalized normal pre-clear building.
  heightDangerZoneRows: 10,
  heightDangerZoneWeight: 4.0,

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
