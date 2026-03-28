import { Injectable } from '@angular/core';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TETRIS_PIECE_NAMES } from '../constants/tetris-piece-names.constant';
import { TetrisAiStats } from '../interfaces/tetris-ai-stats.interface';
import { TetrisBoardMetrics } from '../interfaces/tetris-board-metrics.interface';
import { TetrisDemonstrationExample } from '../interfaces/tetris-demonstration-example.interface';
import { TetrisExperience } from '../interfaces/tetris-experience.interface';
import { TetrisPlacement } from '../interfaces/tetris-placement.interface';

interface DeltaValues {
  deltaHoles: number;
  deltaCovered: number;
  deltaAggHeight: number;
  deltaBumpiness: number;
  deltaMaxHeight: number;
  deltaPillars: number;
  deltaWells: number;
  deltaHeightVariance: number;
  deltaPenalty: number;
  stackOverflowPenalty: number;
  absoluteCoveredCellsPenalty: number;
  absoluteHeightVariancePenalty: number;
  dangerZonePenalty: number;
  absoluteHolesPenalty: number;
}

@Injectable()
export class TetrisAiDiagnosticsService {
  /**
   * Logs the AI agent initialization summary.
   * @param tfBackend - TF.js backend string (e.g. 'webgl')
   * @param loaded - whether the model was loaded from storage or freshly built
   * @param stats - current agent stats snapshot
   * @param replaySize - current replay buffer size
   * @param demoSize - current demonstration buffer size
   */
  public logAgentInitialized(
    tfBackend: string,
    loaded: boolean,
    stats: TetrisAiStats,
    replaySize: number,
    demoSize: number,
  ): void {
    console.log(
      `%c🤖 AI AGENT INITIALIZED`,
      'font-size:12px;font-weight:bold;color:#7dcfff;background:#1a1a2e;padding:4px 8px;border-radius:4px',
    );
    console.log(
      `%c  TF.js backend: ${tfBackend} | Model: ${loaded ? 'loaded from storage' : 'freshly built'}`,
      'color:#a9b1d6',
    );
    console.log(
      `%c  Network: ${TETRIS_AI_CONFIG.featureCount} (32 board + 21 preview) → ${TETRIS_AI_CONFIG.hiddenLayer1} → ${TETRIS_AI_CONFIG.hiddenLayer2} → 1`,
      'color:#a9b1d6',
    );
    console.log(
      `%c  Episodes: ${stats.totalEpisodes} | Steps: ${stats.totalSteps} | Epsilon: ${stats.epsilon.toFixed(4)} | Best score: ${stats.bestScore}`,
      'color:#a9b1d6',
    );
    console.log(
      `%c  Replay buffer: ${replaySize}/${TETRIS_AI_CONFIG.replayBufferSize} | Demonstrations: ${demoSize}/${TETRIS_AI_CONFIG.demonstrationBufferSize}`,
      'color:#a9b1d6',
    );
    console.log(
      `%c  Gamma: ${TETRIS_AI_CONFIG.gamma} | LR: ${TETRIS_AI_CONFIG.learningRate} | Batch: ${TETRIS_AI_CONFIG.batchSize} | Train every: ${TETRIS_AI_CONFIG.trainEveryNSteps} steps | Target sync: every ${TETRIS_AI_CONFIG.targetNetworkUpdateFrequency} steps`,
      'color:#565f89',
    );
  }

  /**
   * Logs a warning when the model fails to load but saved training state exists.
   */
  public logModelLoadFailure(
    previousEpsilon: number,
    totalEpisodes: number,
    replaySize: number,
    demoSize: number,
  ): void {
    console.warn(
      `%c⚠️ MODEL LOAD FAILED — keeping saved stats/buffers but rebuilding the model. ` +
        `Episodes=${totalEpisodes}, replay=${replaySize}, demonstrations=${demoSize}. ` +
        `Epsilon reset from ${previousEpsilon.toFixed(4)} to ${TETRIS_AI_CONFIG.epsilonStart}.`,
      'color:#f7768e;font-weight:bold',
    );
  }

  /**
   * Logs a replay buffer entry after a new experience is stored.
   */
  public logReplayBufferEntry(
    size: number,
    maxSize: number,
    stepCount: number,
    reward: number,
    nextV: number,
    done: boolean,
  ): void {
    console.log(
      `%c📦 REPLAY BUFFER %csize=${size}/${maxSize} %cstep=${stepCount} %creward=${reward >= 0 ? '+' : ''}${reward.toFixed(4)} nextV=${nextV.toFixed(4)} done=${done}`,
      'color:#7dcfff;font-weight:bold',
      'color:#565f89',
      'color:#565f89',
      reward >= 0 ? 'color:#9ece6a' : 'color:#f7768e',
    );
  }

  /**
   * Logs the episode summary after each episode ends.
   * Score trend is computed internally from stats.recentScores.
   */
  public logEpisodeSummary(
    stats: TetrisAiStats,
    score: number,
    isNewBest: boolean,
    replaySize: number,
    demoSize: number,
  ): void {
    const recentScores = stats.recentScores;
    const scoreTrend =
      recentScores.length >= 4
        ? recentScores.slice(-2).reduce((s, x) => s + x, 0) / 2 -
          recentScores.slice(-4, -2).reduce((s, x) => s + x, 0) / 2
        : 0;

    console.log(
      `%c📊 EPISODE #${stats.totalEpisodes} SUMMARY`,
      'font-size:12px;font-weight:bold;color:#7aa2f7;background:#1a1a2e;padding:4px 8px;border-radius:4px',
    );
    console.log(
      `%c  Score: ${score}${isNewBest ? ' 🏆 NEW BEST!' : ''} | Avg(${recentScores.length}): ${stats.averageScore.toFixed(1)} | Best: ${stats.bestScore} | Trend: ${scoreTrend >= 0 ? '📈+' : '📉'}${scoreTrend.toFixed(1)}`,
      'color:#c0caf5',
    );
    console.log(
      `%c  Total steps: ${stats.totalSteps} | Epsilon: ${stats.epsilon.toFixed(4)} | Buffer: ${replaySize}/${TETRIS_AI_CONFIG.replayBufferSize} | Demonstrations: ${demoSize}`,
      'color:#a9b1d6',
    );
    console.log(`%c  Recent scores: [${recentScores.join(', ')}]`, 'color:#565f89');
  }

  /**
   * Logs the training step diagnostics group.
   * @param numTensors - current number of TF.js tensors in memory (from tf.memory().numTensors)
   */
  public logTrainingStep(
    stepCount: number,
    loss: number | undefined,
    batch: TetrisExperience[],
    currentPredictions: number[],
    targets: number[],
    nextValues: number[],
    epsilon: number,
    numTensors: number,
  ): void {
    const batchRewards = batch.map((e) => e.reward);
    const doneCount = batch.filter((e) => e.done).length;
    const strongPositiveCount = batch.filter(
      (e) => e.reward >= TETRIS_AI_CONFIG.replayStrongPositiveRewardThreshold,
    ).length;
    const strongNegativeCount = batch.filter(
      (e) => !e.done && e.reward <= TETRIS_AI_CONFIG.replayStrongNegativeRewardThreshold,
    ).length;
    const tdErrors = targets.map((t, i) => t - currentPredictions[i]);
    const meanAbsTdError = tdErrors.reduce((s, e) => s + Math.abs(e), 0) / tdErrors.length;
    const maxAbsTdError = Math.max(...tdErrors.map(Math.abs));

    console.groupCollapsed(
      `%c🧠 TRAINING STEP %c#${stepCount} %closs=${loss?.toFixed(6) ?? '?'}`,
      'color:#bb9af7;font-weight:bold',
      'color:#565f89',
      loss !== undefined && loss < 0.1 ? 'color:#9ece6a' : 'color:#e0af68',
    );
    console.log('Batch stats:', {
      batchSize: batch.length,
      doneExperiences: doneCount,
      strongPositiveExperiences: strongPositiveCount,
      strongNegativeExperiences: strongNegativeCount,
      rewardRange: `[${Math.min(...batchRewards).toFixed(4)}, ${Math.max(...batchRewards).toFixed(4)}]`,
      meanReward: +(batchRewards.reduce((s, r) => s + r, 0) / batchRewards.length).toFixed(4),
    });
    console.log('TD error:', {
      meanAbsolute: +meanAbsTdError.toFixed(6),
      maxAbsolute: +maxAbsTdError.toFixed(6),
    });
    console.log('Q-value predictions:', {
      currentRange: `[${Math.min(...currentPredictions).toFixed(4)}, ${Math.max(...currentPredictions).toFixed(4)}]`,
      targetRange: `[${Math.min(...targets).toFixed(4)}, ${Math.max(...targets).toFixed(4)}]`,
      nextValueRange: `[${Math.min(...nextValues).toFixed(4)}, ${Math.max(...nextValues).toFixed(4)}]`,
    });
    console.log('Hyperparameters:', {
      gamma: TETRIS_AI_CONFIG.gamma,
      learningRate: TETRIS_AI_CONFIG.learningRate,
      epsilon: +epsilon.toFixed(6),
      trainEveryNSteps: TETRIS_AI_CONFIG.trainEveryNSteps,
    });
    console.log(`TF.js tensors in memory: ${numTensors}`);
    console.groupEnd();
  }

  /**
   * Logs the demonstration training group after a demonstration training pass.
   */
  public logDemonstrationTraining(
    loss: number | undefined,
    batch: TetrisDemonstrationExample[],
    totalDemonstrations: number,
  ): void {
    const positiveCount = batch.filter((e) => e.target > 0).length;

    console.groupCollapsed(
      `%c👨‍🏫 DEMONSTRATION TRAINING %closs=${loss?.toFixed(6) ?? '?'}`,
      'color:#e0af68;font-weight:bold',
      loss !== undefined && loss < 0.1 ? 'color:#9ece6a' : 'color:#e0af68',
    );
    console.log('Batch:', {
      size: batch.length,
      positiveExamples: positiveCount,
      negativeExamples: batch.length - positiveCount,
      epochs: TETRIS_AI_CONFIG.demonstrationEpochs,
      totalDemonstrations,
    });
    console.groupEnd();
  }

  /**
   * Logs the target network synchronization event.
   */
  public logTargetNetworkSync(stepCount: number): void {
    console.log(
      `%c🔄 TARGET NETWORK SYNC %cat step ${stepCount}`,
      'color:#ff9e64;font-weight:bold',
      'color:#565f89',
    );
  }

  /**
   * Logs the active and preview piece queue.
   */
  public logPieceQueue(currentPieceId: number, previewPieceIds: number[]): void {
    console.log(
      `%c🧩 PIECE QUEUE %cActive: ${TETRIS_PIECE_NAMES[currentPieceId] ?? '?'} | Preview: [${previewPieceIds.map((id) => TETRIS_PIECE_NAMES[id] ?? '?').join(', ')}] (${previewPieceIds.length} pieces)`,
      'color:#ff9e64;font-weight:bold',
      'color:#a9b1d6',
    );
  }

  /**
   * Logs the placement decision group including Q-values, board features, and preview decoding.
   * Split into private helpers to keep cyclomatic complexity per method ≤ 5.
   * @param heuristicValues - per-placement heuristic scores; only logged when teacherActive is true
   */
  public logPlacementDecision(
    placements: TetrisPlacement[],
    chosen: TetrisPlacement,
    values: number[],
    idx: number,
    decisionSource: string,
    episodePieceCount: number,
    teacherActive: boolean,
    epsilon: number,
    heuristicValues?: number[],
  ): void {
    console.groupCollapsed(
      `%c🎯 PLACEMENT DECISION %c(piece #${episodePieceCount + 1})`,
      'color:#7aa2f7;font-weight:bold',
      'color:#565f89',
    );
    console.log(`Candidates evaluated: ${placements.length}`);
    console.log(`Chosen: rotation=${chosen.rotation}, x=${chosen.x}, row=${chosen.placementRow}`);
    console.log(
      `Q-value: ${values[idx].toFixed(4)} (${
        decisionSource === 'teacher'
          ? '👨‍🏫 TEACHER WARMUP'
          : decisionSource === 'exploration'
            ? '🎲 EXPLORATION'
            : '🧠 EXPLOITATION'
      })`,
    );
    console.log(
      `Q-value range: [${Math.min(...values).toFixed(4)}, ${Math.max(...values).toFixed(4)}]`,
    );
    if (teacherActive && heuristicValues && heuristicValues.length > 0) {
      console.log(
        `Teacher heuristic range: [${Math.min(...heuristicValues).toFixed(4)}, ${Math.max(...heuristicValues).toFixed(4)}]`,
      );
    }
    console.log(`Epsilon: ${epsilon.toFixed(4)}`);
    this.logPlacementFeatures(chosen);
    this.logPreviewFeatures(chosen);
    console.groupEnd();
  }

  /**
   * Logs the reward computation group for a single piece placement.
   * Delegates penalty and metrics detail to private helpers.
   */
  public logRewardComponents(
    episodePieceCount: number,
    linesCleared: number,
    netReward: number,
    rewardTotal: number,
    penaltyTotal: number,
    lineClearBonus: number,
    survivalReward: number,
    lowPlacementBonus: number,
    lowRowLineClearBonus: number,
    deltas: DeltaValues,
    metrics: TetrisBoardMetrics,
    prevMetrics: TetrisBoardMetrics,
  ): void {
    console.groupCollapsed(
      `%c💰 REWARD %c#${episodePieceCount} %cR=${netReward.toFixed(3)}${linesCleared > 0 ? ` ✨${linesCleared}L` : ''}`,
      'color:#9ece6a;font-weight:bold',
      'color:#565f89',
      netReward >= 0 ? 'color:#9ece6a' : 'color:#f7768e',
    );
    console.log('Reward components:', {
      lineClearBonus: +lineClearBonus.toFixed(4),
      survivalReward: +survivalReward.toFixed(4),
      lowPlacementBonus: +lowPlacementBonus.toFixed(4),
      lowRowLineClearBonus: +lowRowLineClearBonus.toFixed(4),
      rewardSubtotal: +rewardTotal.toFixed(4),
    });
    this.logDeltaPenalties(deltas);
    this.logBoardMetrics(metrics, prevMetrics);
    console.log(
      `Net reward: ${rewardTotal.toFixed(4)} - ${penaltyTotal.toFixed(4)} = ${netReward.toFixed(4)}`,
    );
    console.groupEnd();
  }

  /**
   * Logs the game-over terminal penalty details.
   * @param nextEpisodeNumber - the upcoming episode number (totalEpisodes + 1 at time of game over)
   */
  public logGameOverPenalty(
    nextEpisodeNumber: number,
    episodePieceCount: number,
    peakScore: number,
    penalty: number,
    gameOverLengthBonus: number,
    scoreBonus: number,
    rawTotal: number,
    clippedTotal: number,
  ): void {
    console.log(
      `%c☠️ GAME OVER — Episode #${nextEpisodeNumber}`,
      'font-size:14px;font-weight:bold;color:#f7768e;background:#1a1a2e;padding:4px 8px;border-radius:4px',
    );
    console.log(
      `%c  Pieces placed: ${episodePieceCount} | Peak score: ${peakScore} | Game-over penalty: ${penalty} | Length bonus: ${+gameOverLengthBonus.toFixed(4)} | Score bonus: ${+scoreBonus.toFixed(4)} | Terminal penalty: ${+(penalty + gameOverLengthBonus + scoreBonus).toFixed(4)} | Raw: ${+rawTotal.toFixed(4)} | Clipped: ${+clippedTotal.toFixed(4)}`,
      'color:#bb9af7',
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Logs the denormalized board feature values for the chosen placement. */
  private logPlacementFeatures(chosen: TetrisPlacement): void {
    const f = chosen.features;
    console.log('Board features after placement:', {
      columnHeights: f.slice(0, 10).map((v) => +(v * 20).toFixed(1)),
      maxHeight: +(f[19] * 20).toFixed(1),
      aggregateHeight: +(f[20] * 200).toFixed(1),
      holes: +(f[21] * 40).toFixed(1),
      linesCleared: +(f[22] * 4).toFixed(1),
      bumpiness: +(f[23] * 100).toFixed(1),
      coveredCells: +(f[24] * 120).toFixed(1),
      pillars: +(f[25] * 10).toFixed(1),
      wells: +(f[26] * 100).toFixed(1),
      rowCompleteness: +(f[27] * 20).toFixed(2),
      absoluteHolesSqrt: +(f[28] * 6.32).toFixed(2),
      lowBoardDensity: +f[29].toFixed(2),
      heightVariance: +(f[30] * 100).toFixed(2),
      nearCompleteRows: +(f[31] * 10).toFixed(0),
    });
  }

  /** Decodes and logs the preview queue one-hot features (indices 32–52). */
  private logPreviewFeatures(chosen: TetrisPlacement): void {
    const f = chosen.features;
    const previewFeatures = f.slice(32, 53);
    const decodedPreview: string[] = [];
    for (let i = 0; i < 3; i++) {
      const oneHot = previewFeatures.slice(i * 7, (i + 1) * 7);
      const pieceIdx = oneHot.indexOf(1);
      decodedPreview.push(pieceIdx >= 0 ? (TETRIS_PIECE_NAMES[pieceIdx + 1] ?? '?') : 'none');
    }
    console.log(
      `Preview features decoded: [${decodedPreview.join(', ')}] (from feature indices 32-52)`,
    );
  }

  /** Logs the delta-penalty breakdown for a reward computation. */
  private logDeltaPenalties(deltas: DeltaValues): void {
    const compressDelta = (d: number): number => (d > 0 ? Math.pow(d, 0.7) : d);
    console.log('Delta penalties (raw->compressed x weight = contribution):', {
      deltaHoles: `${deltas.deltaHoles >= 0 ? '+' : ''}${deltas.deltaHoles.toFixed(1)}->${compressDelta(deltas.deltaHoles).toFixed(2)} x ${TETRIS_AI_CONFIG.deltaHolesWeight} = ${+(compressDelta(deltas.deltaHoles) * TETRIS_AI_CONFIG.deltaHolesWeight).toFixed(4)}`,
      deltaCovered: `${deltas.deltaCovered >= 0 ? '+' : ''}${deltas.deltaCovered.toFixed(1)}->${compressDelta(deltas.deltaCovered).toFixed(2)} x ${TETRIS_AI_CONFIG.deltaCoveredCellsWeight} = ${+(compressDelta(deltas.deltaCovered) * TETRIS_AI_CONFIG.deltaCoveredCellsWeight).toFixed(4)}`,
      deltaAggHeight: `${deltas.deltaAggHeight >= 0 ? '+' : ''}${deltas.deltaAggHeight.toFixed(1)}->${compressDelta(deltas.deltaAggHeight).toFixed(2)} x ${TETRIS_AI_CONFIG.deltaAggregateHeightWeight} = ${+(compressDelta(deltas.deltaAggHeight) * TETRIS_AI_CONFIG.deltaAggregateHeightWeight).toFixed(4)}`,
      deltaBumpiness: `${deltas.deltaBumpiness >= 0 ? '+' : ''}${deltas.deltaBumpiness.toFixed(1)}->${compressDelta(deltas.deltaBumpiness).toFixed(2)} x ${TETRIS_AI_CONFIG.deltaBumpinessWeight} = ${+(compressDelta(deltas.deltaBumpiness) * TETRIS_AI_CONFIG.deltaBumpinessWeight).toFixed(4)}`,
      deltaMaxHeight: `${deltas.deltaMaxHeight >= 0 ? '+' : ''}${deltas.deltaMaxHeight.toFixed(1)}->${compressDelta(deltas.deltaMaxHeight).toFixed(2)} x ${TETRIS_AI_CONFIG.deltaMaxHeightWeight} = ${+(compressDelta(deltas.deltaMaxHeight) * TETRIS_AI_CONFIG.deltaMaxHeightWeight).toFixed(4)}`,
      deltaPillars: `${deltas.deltaPillars >= 0 ? '+' : ''}${deltas.deltaPillars.toFixed(1)}->${compressDelta(deltas.deltaPillars).toFixed(2)} x ${TETRIS_AI_CONFIG.deltaPillarsWeight} = ${+(compressDelta(deltas.deltaPillars) * TETRIS_AI_CONFIG.deltaPillarsWeight).toFixed(4)}`,
      deltaWells: `${deltas.deltaWells >= 0 ? '+' : ''}${deltas.deltaWells.toFixed(1)}->${compressDelta(deltas.deltaWells).toFixed(2)} x ${TETRIS_AI_CONFIG.deltaWellsWeight} = ${+(compressDelta(deltas.deltaWells) * TETRIS_AI_CONFIG.deltaWellsWeight).toFixed(4)}`,
      deltaHeightVar: `${deltas.deltaHeightVariance >= 0 ? '+' : ''}${deltas.deltaHeightVariance.toFixed(1)}->${compressDelta(deltas.deltaHeightVariance).toFixed(2)} x ${TETRIS_AI_CONFIG.deltaHeightVarianceWeight} = ${+(compressDelta(deltas.deltaHeightVariance) * TETRIS_AI_CONFIG.deltaHeightVarianceWeight).toFixed(4)}`,
      deltaPenaltySubtotal: +deltas.deltaPenalty.toFixed(4),
      stackOverflowPenalty: +deltas.stackOverflowPenalty.toFixed(4),
      absoluteCoveredCellsPenalty: +deltas.absoluteCoveredCellsPenalty.toFixed(4),
      absoluteHeightVariancePenalty: +deltas.absoluteHeightVariancePenalty.toFixed(4),
      dangerZonePenalty: +deltas.dangerZonePenalty.toFixed(4),
      absoluteHolesPenalty: +deltas.absoluteHolesPenalty.toFixed(4),
      penaltyTotal: +(
        deltas.deltaPenalty +
        deltas.stackOverflowPenalty +
        deltas.absoluteCoveredCellsPenalty +
        deltas.absoluteHeightVariancePenalty +
        deltas.dangerZonePenalty +
        deltas.absoluteHolesPenalty
      ).toFixed(4),
    });
  }

  /** Logs board metric comparison (current vs previous). */
  private logBoardMetrics(metrics: TetrisBoardMetrics, prev: TetrisBoardMetrics): void {
    console.log('Board metrics (current | prev):', {
      holes: `${metrics.holes.toFixed(1)} | ${prev.holes.toFixed(1)}`,
      covered: `${metrics.coveredCells.toFixed(1)} | ${prev.coveredCells.toFixed(1)}`,
      aggHeight: `${metrics.aggregateHeight.toFixed(1)} | ${prev.aggregateHeight.toFixed(1)}`,
      bumpiness: `${metrics.bumpiness.toFixed(1)} | ${prev.bumpiness.toFixed(1)}`,
      maxHeight: `${metrics.maxHeight.toFixed(1)} | ${prev.maxHeight.toFixed(1)}`,
      pillars: `${metrics.pillars.toFixed(1)} | ${prev.pillars.toFixed(1)}`,
      wells: `${metrics.wells.toFixed(1)} | ${prev.wells.toFixed(1)}`,
      heightVar: `${metrics.heightVariance.toFixed(2)} | ${prev.heightVariance.toFixed(2)}`,
      rowCompleteness: `${metrics.rowCompleteness.toFixed(2)} | ${prev.rowCompleteness.toFixed(2)}`,
      lowBoardDensity: `${metrics.lowBoardDensity.toFixed(2)} | ${prev.lowBoardDensity.toFixed(2)}`,
      nearCompleteRows: `${metrics.nearCompleteRows.toFixed(0)} | ${prev.nearCompleteRows.toFixed(0)}`,
    });
  }
}
