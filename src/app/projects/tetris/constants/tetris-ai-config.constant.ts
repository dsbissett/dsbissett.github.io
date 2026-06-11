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
  // 20k (~80 episodes): stored bootstrap candidates are collection-time argmax
  // choices, so a deep buffer drags targets toward what an old policy would
  // have played next; a shorter horizon keeps them near-current.
  replayBufferSize: 20000,
  batchSize: 64,
  // Gamma 0.96: effective horizon ~25 placements. A tetris-well setup pays off
  // 8-12 placements after construction starts; at 0.96 the discounted payoff
  // (0.96^10 ≈ 0.66) still dominates immediate singles. Safe only because TD
  // bootstraps are recomputed at train time from stored next-afterstate features
  // (R6) instead of frozen collection-time scalars.
  gamma: 0.96,
  learningRate: 0.00015,
  trainEveryNSteps: 2,
  // Target sync every ~250 env steps, enforced as training-pass count in the
  // trainer (targetNetworkUpdateFrequency / trainEveryNSteps passes per sync).
  targetNetworkUpdateFrequency: 250,
  replayRecentWindowSize: 1000,
  replayRecentFraction: 0.3,
  replayInformativeFraction: 0.15,
  replayStrongPositiveFraction: 0.2,
  // Terminal fraction 0.02: terminals are <0.5% of the buffer; oversampling them
  // at 10% replayed each death dozens of times more than non-terminals and biased
  // the value head pessimistic near tall boards.
  replayTerminalFraction: 0.02,
  // Threshold 25 = double-or-better under the R6 reward scale (single ~10,
  // double ~28, triple ~70, tetris ~170), so the strong-positive stratum is a
  // genuine multi-line-clear oversampler.
  replayStrongPositiveRewardThreshold: 25,
  replayStrongNegativeRewardThreshold: -8.0,

  // Exploration (epsilon-greedy over top-K)
  // Start at 0.20 post-teacher for broader coverage of the placement space.
  epsilonStart: 0.2,
  // Floor 0.005: at 0.03 forever, ~3% uniform-random placements injected a
  // constant per-piece death hazard that capped both average and best score.
  epsilonMin: 0.005,
  // Per-episode decay: ~240 post-teacher episodes to reach the floor.
  epsilonDecay: 0.985,
  // Exploration picks uniformly among the top-K placements ranked by the model
  // instead of uniformly over ALL placements (which included catastrophic ones).
  explorationTopK: 5,

  // localStorage keys (TF.js uses localstorage://<key>)
  // Key updated to v8: R6 training overhaul — reward scale re-derived (line
  // clears 8/20/60/150, clip 200), gamma 0.89 -> 0.96, TD bootstraps recomputed
  // at train time from stored next-afterstate features (experience schema
  // change), and feature normalizers rescaled with edge-well visibility.
  // v7 weights, rewards, and replay entries are incompatible on all axes and
  // are left in storage untouched for rollback.
  modelStorageKey: 'tetris-ai-model-v8',
  statsStorageKey: 'tetris-ai-stats-v8',
  replayBufferStorageKey: 'tetris-ai-replay-buffer-v8',
  demonstrationStorageKey: 'tetris-ai-demonstrations-v8',
  enabledStorageKey: 'tetris-ai-enabled',

  // AI visual step interval (ms between each move animation).
  // 0 = one action per animation frame: pieces place in ~100ms instead of
  // ~250ms, roughly doubling wall-clock training throughput.
  aiActionIntervalMs: 0,
  autoRestartDelayMs: 100,

  // Human demonstration learning
  demonstrationBufferSize: 32000,
  demonstrationBatchSize: 64,
  demonstrationTrainEveryNSamples: 24,
  demonstrationEpochs: 2,
  demonstrationRehearsalIntervalSteps: 125,
  // 0: imported-demo rehearsal regressed afterstate values toward fixed scalars
  // 1-2 orders of magnitude below converged TD values, re-capping the value
  // function after every import. Demos still train when actively recorded.
  importedDemonstrationRehearsalPasses: 0,
  humanChosenTarget: 1.5,
  humanRejectedTarget: -0.35,
  // Teacher warmup: 20 episodes. Enough to bootstrap without constraining
  // post-teacher RL learning.
  teacherWarmupEpisodes: 20,
  teacherExploreRate: 0.05,
  teacherNegativeSamplesPerMove: 3,
  // Teacher targets only seed value ordering on a fresh net during warmup;
  // TD targets take over from episode 21.
  teacherChosenTarget: 2.0,
  teacherRejectedTarget: -2.0,

  // ── Delta-based reward system (R6) ──
  // reward = lineClearBonus + survivalReward + lowPlacementBonus + lowRowLineClearBonus
  //        - sum of delta penalties
  //        - absolute board-shape penalties (stack overflow, buried cells, height variance)
  //        - dangerZonePenalty
  //        - absoluteHolesPenalty
  //
  // R5 POSTMORTEM: the reward's optimum WAS the plateau. rewardClipMax 35 made
  // double/triple/tetris indistinguishable (raw ~37/52/77 all clipped to 35),
  // the line table valued a tetris at 5.5x a single while the game scores it
  // 30x (80/200/600/2400 points), survival 2.5/step out-earned clearing, and
  // recurring stack/danger/well taxes made tetris-well setups strictly
  // dominated. Farming low singles/doubles at ~7.9k avg was the rational
  // policy for that reward; no amount of training could exceed it.
  //
  // R6 FIX: line table tracks the game-point ratios (1 : 2.5 : 7.5 : 18.75),
  // clip raised above the max raw reward, survival lowered so line clears are
  // the only real income, and setup taxes softened so a one-well stack below
  // the danger zone is roughly cost-neutral to maintain.

  // Line clear rewards -- proportional to game points (1 : 2.5 : 7.5 : 18.75).
  lineClearRewards: [0, 8.0, 20.0, 60.0, 150.0] as readonly number[],

  // Survival reward: a typical clean placement nets mildly negative
  // (survival 1.0 + lowPlacement ~0.4 - clean deltas ~2.0 ≈ -0.6), which is
  // deliberate: line clears are the only income, so stalling drifts down while
  // staying far above hole-creating moves (~-9.5) for full gradient resolution.
  survivalReward: 1.0,

  // Low-row line clear bonus: extra reward when lines are cleared at low rows.
  // Applied as: weight * rowFraction * linesCleared where rowFraction = placementRow/gridHeight.
  lowRowLineClearWeight: 5.0,

  // Delta penalty weights -- hole creation must stay clearly net negative,
  // but a flat stack with a single tetris well should cost ~nothing to keep.
  // Typical clean placement budget (worsening deltas are compressed d^0.7):
  //   bumpiness delta +2 -> 2^0.7 * 0.6 ≈ 0.97
  //   maxHeight delta +1 -> 0.6
  //   aggHeight delta +3 -> 3^0.7 * 0.05 ≈ 0.11
  //   heightVariance delta +1 -> 0.45
  //   Total clean penalty: ~2.1 (net ≈ -0.6 vs survival + lowPlacement income)
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
  // Wells 0.1: a single deep well is the canonical tetris setup; taxing it per
  // step made the setup strictly dominated by flat singles play.
  deltaWellsWeight: 0.1,
  // Height variance delta penalty -- directly targets tower creation.
  // A tower spike increases variance by 2-5; flat play changes variance by 0-1.
  deltaHeightVarianceWeight: 0.45,

  // Absolute hole penalty: continuous pressure to avoid boards with holes.
  // Kept strong enough that the learner keeps preferring hole repair.
  absoluteHolesWeight: 0.9,

  // Absolute board-shape pressure: prices genuine top-out risk, not strategy.
  // A 4-8 high stack with one well must be ~free to maintain for ~10 pieces.
  preferredStackHeightRows: 10,
  stackOverflowPenaltyWeight: 0.06,
  absoluteCoveredCellsWeight: 0.35,
  absoluteHeightVarianceWeight: 0.08,

  // Danger zone: quadratic penalty once the tallest column moves high enough
  // (12+ of 20 rows) that death risk is real.
  heightDangerZoneRows: 12,
  heightDangerZoneWeight: 8.0,

  // Game-over penalty
  rewardGameOver: -25.0,
  rewardGameOverLengthBonusPerPiece: 0.05,
  rewardGameOverLengthBonusCap: 5.0,
  // 0: at 0.02 the score bonus saturated the -4 terminal ceiling by score ~50,
  // making it dead weight.
  rewardGameOverScoreBonusPerPoint: 0,
  rewardGameOverMaxTerminalReward: -4.0,

  // Reward clipping range. Max raw reward is a bottom-row tetris:
  // 150 + survival 1 + lowPlacement ~0.7 + lowRow ~19 ≈ 171, so 200 never
  // clips legitimate signal. Min -40 covers the widened terminal range.
  rewardClipMin: -40,
  rewardClipMax: 200,
} as const;
