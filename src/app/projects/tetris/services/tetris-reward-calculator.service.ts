import { Injectable, inject } from '@angular/core';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TETRIS_GAME_CONFIG } from '../constants/tetris-game-config.constant';
import { TetrisBoardMetrics } from '../interfaces/tetris-board-metrics.interface';
import { TetrisPlan } from '../interfaces/tetris-plan.interface';
import { TetrisRewardResult } from '../interfaces/tetris-reward-result.interface';
import { TetrisAiDiagnosticsService } from './tetris-ai-diagnostics.service';
import { TetrisBoardMetricsService } from './tetris-board-metrics.service';

/** Shape matching the private DeltaValues interface in TetrisAiDiagnosticsService. */
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
export class TetrisRewardCalculatorService {
  private readonly boardMetrics = inject(TetrisBoardMetricsService);
  private readonly diagnostics = inject(TetrisAiDiagnosticsService);

  /**
   * Computes the scalar reward for a placement using delta-based metrics.
   * @param features - Feature vector of the post-placement state
   * @param linesCleared - Number of lines cleared by this placement
   * @param gameOver - Whether the placement caused a game over
   * @param episodePieceCount - Number of pieces placed this episode
   * @param prevMetrics - Board metrics from before this placement (null = first piece)
   * @param plan - The plan that was executed (for placement row)
   * @param episodePeakScore - Highest score achieved this episode (for game-over bonus)
   */
  public computeReward(
    features: number[],
    linesCleared: number,
    gameOver: boolean,
    episodePieceCount: number,
    prevMetrics: TetrisBoardMetrics | null,
    plan: TetrisPlan | null,
    episodePeakScore: number,
  ): TetrisRewardResult {
    const current = this.boardMetrics.extractMetrics(features);
    // First piece of episode: use current metrics as prev so delta = 0.
    const prev = prevMetrics ?? current;

    const gridHeight = TETRIS_GAME_CONFIG.gridHeight;
    const rowFraction = plan ? plan.placementRow / gridHeight : 0;
    const lowPlacementBonus = rowFraction * 0.75;

    const lowRowLineClearBonus =
      plan && linesCleared > 0
        ? rowFraction * linesCleared * TETRIS_AI_CONFIG.lowRowLineClearWeight
        : 0;
    const positiveReward = this.computePositiveReward(linesCleared, lowRowLineClearBonus);
    const rewardTotal = positiveReward + lowPlacementBonus;

    const deltas = this.buildDeltaValues(current, prev, features);
    const penaltyTotal =
      deltas.deltaPenalty +
      deltas.stackOverflowPenalty +
      deltas.absoluteCoveredCellsPenalty +
      deltas.absoluteHeightVariancePenalty +
      deltas.dangerZonePenalty +
      deltas.absoluteHolesPenalty;

    let netReward = rewardTotal - penaltyTotal;
    const clipped = Math.max(
      TETRIS_AI_CONFIG.rewardClipMin,
      Math.min(TETRIS_AI_CONFIG.rewardClipMax, netReward),
    );

    this.diagnostics.logRewardComponents(
      episodePieceCount,
      linesCleared,
      netReward,
      rewardTotal,
      penaltyTotal,
      TETRIS_AI_CONFIG.lineClearRewards[linesCleared] ?? 0,
      TETRIS_AI_CONFIG.survivalReward,
      lowPlacementBonus,
      lowRowLineClearBonus,
      deltas,
      current,
      prev,
    );

    if (gameOver) {
      return this.computeGameOverReward(netReward, episodePieceCount, episodePeakScore);
    }

    return {
      value: clipped,
      rawValue: netReward,
      wasClipped: clipped !== netReward,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Computes line clear bonus plus survival reward using the pre-computed low-row bonus. */
  private computePositiveReward(linesCleared: number, lowRowLineClearBonus: number): number {
    const lineClearBonus = TETRIS_AI_CONFIG.lineClearRewards[linesCleared] ?? 0;
    return lineClearBonus + TETRIS_AI_CONFIG.survivalReward + lowRowLineClearBonus;
  }

  /** Computes all delta-based penalties from current vs previous metrics. */
  private computeDeltaPenalty(current: TetrisBoardMetrics, prev: TetrisBoardMetrics): number {
    return (
      this.compressDelta(current.holes - prev.holes) * TETRIS_AI_CONFIG.deltaHolesWeight +
      this.compressDelta(current.coveredCells - prev.coveredCells) *
        TETRIS_AI_CONFIG.deltaCoveredCellsWeight +
      this.compressDelta(current.aggregateHeight - prev.aggregateHeight) *
        TETRIS_AI_CONFIG.deltaAggregateHeightWeight +
      this.compressDelta(current.bumpiness - prev.bumpiness) *
        TETRIS_AI_CONFIG.deltaBumpinessWeight +
      this.compressDelta(current.maxHeight - prev.maxHeight) *
        TETRIS_AI_CONFIG.deltaMaxHeightWeight +
      this.compressDelta(current.pillars - prev.pillars) * TETRIS_AI_CONFIG.deltaPillarsWeight +
      this.compressDelta(current.wells - prev.wells) * TETRIS_AI_CONFIG.deltaWellsWeight +
      this.compressDelta(current.heightVariance - prev.heightVariance) *
        TETRIS_AI_CONFIG.deltaHeightVarianceWeight
    );
  }

  /** Computes absolute board-shape penalties (stack overflow, covered cells, height variance). */
  private computeAbsolutePenalties(current: TetrisBoardMetrics, features: number[]): number {
    const columnHeights = features.slice(0, 10).map((v) => v * 20);
    const stackOverflowPenalty =
      columnHeights.reduce(
        (sum, height) => sum + Math.max(0, height - TETRIS_AI_CONFIG.preferredStackHeightRows),
        0,
      ) * TETRIS_AI_CONFIG.stackOverflowPenaltyWeight;
    const absoluteCoveredCellsPenalty =
      current.coveredCells * TETRIS_AI_CONFIG.absoluteCoveredCellsWeight;
    const absoluteHeightVariancePenalty =
      current.heightVariance * TETRIS_AI_CONFIG.absoluteHeightVarianceWeight;
    const absoluteHolesPenalty = Math.sqrt(current.holes) * TETRIS_AI_CONFIG.absoluteHolesWeight;
    return (
      stackOverflowPenalty +
      absoluteCoveredCellsPenalty +
      absoluteHeightVariancePenalty +
      absoluteHolesPenalty
    );
  }

  /** Computes danger zone penalty when maxHeight exceeds the threshold. */
  private computeDangerZonePenalty(current: TetrisBoardMetrics): number {
    const dangerThreshold = TETRIS_AI_CONFIG.heightDangerZoneRows;
    const gridHeight = TETRIS_GAME_CONFIG.gridHeight;
    if (current.maxHeight <= dangerThreshold) return 0;
    const excess = (current.maxHeight - dangerThreshold) / (gridHeight - dangerThreshold);
    return excess * excess * TETRIS_AI_CONFIG.heightDangerZoneWeight;
  }

  /** Computes the final game-over terminal reward (called only when gameOver=true). */
  private computeGameOverReward(
    netReward: number,
    episodePieceCount: number,
    peakScore: number,
  ): TetrisRewardResult {
    const gameOverLengthBonus = Math.min(
      episodePieceCount * TETRIS_AI_CONFIG.rewardGameOverLengthBonusPerPiece,
      TETRIS_AI_CONFIG.rewardGameOverLengthBonusCap,
    );
    const scoreBonus = peakScore * TETRIS_AI_CONFIG.rewardGameOverScoreBonusPerPoint;
    const terminalPenalty = TETRIS_AI_CONFIG.rewardGameOver + gameOverLengthBonus + scoreBonus;
    const rawTotal = Math.min(netReward, 0) + terminalPenalty;
    const total = Math.max(
      TETRIS_AI_CONFIG.rewardClipMin,
      Math.min(
        TETRIS_AI_CONFIG.rewardGameOverMaxTerminalReward,
        Math.min(TETRIS_AI_CONFIG.rewardClipMax, rawTotal),
      ),
    );

    this.diagnostics.logGameOverPenalty(
      episodePieceCount,
      episodePieceCount,
      peakScore,
      TETRIS_AI_CONFIG.rewardGameOver,
      gameOverLengthBonus,
      scoreBonus,
      rawTotal,
      total,
    );

    return {
      value: total,
      rawValue: rawTotal,
      wasClipped: total !== rawTotal,
    };
  }

  /** Applies asymmetric delta compression: sqrt-compresses worsening deltas, leaves improvements full-strength. */
  private compressDelta(d: number): number {
    return d > 0 ? Math.pow(d, 0.7) : d;
  }

  /**
   * Builds the full DeltaValues object for diagnostics logging.
   * Keeps computeReward complexity low by extracting delta construction here.
   */
  private buildDeltaValues(
    current: TetrisBoardMetrics,
    prev: TetrisBoardMetrics,
    features: number[],
  ): DeltaValues {
    const deltaHoles = current.holes - prev.holes;
    const deltaCovered = current.coveredCells - prev.coveredCells;
    const deltaAggHeight = current.aggregateHeight - prev.aggregateHeight;
    const deltaBumpiness = current.bumpiness - prev.bumpiness;
    const deltaMaxHeight = current.maxHeight - prev.maxHeight;
    const deltaPillars = current.pillars - prev.pillars;
    const deltaWells = current.wells - prev.wells;
    const deltaHeightVariance = current.heightVariance - prev.heightVariance;
    const deltaPenalty = this.computeDeltaPenalty(current, prev);

    const columnHeights = features.slice(0, 10).map((v) => v * 20);
    const stackOverflowPenalty =
      columnHeights.reduce(
        (sum, height) => sum + Math.max(0, height - TETRIS_AI_CONFIG.preferredStackHeightRows),
        0,
      ) * TETRIS_AI_CONFIG.stackOverflowPenaltyWeight;
    const absoluteCoveredCellsPenalty =
      current.coveredCells * TETRIS_AI_CONFIG.absoluteCoveredCellsWeight;
    const absoluteHeightVariancePenalty =
      current.heightVariance * TETRIS_AI_CONFIG.absoluteHeightVarianceWeight;
    const dangerZonePenalty = this.computeDangerZonePenalty(current);
    const absoluteHolesPenalty = Math.sqrt(current.holes) * TETRIS_AI_CONFIG.absoluteHolesWeight;

    return {
      deltaHoles,
      deltaCovered,
      deltaAggHeight,
      deltaBumpiness,
      deltaMaxHeight,
      deltaPillars,
      deltaWells,
      deltaHeightVariance,
      deltaPenalty,
      stackOverflowPenalty,
      absoluteCoveredCellsPenalty,
      absoluteHeightVariancePenalty,
      dangerZonePenalty,
      absoluteHolesPenalty,
    };
  }
}
