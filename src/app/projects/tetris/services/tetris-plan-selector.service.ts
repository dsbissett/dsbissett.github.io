import { Injectable, inject } from '@angular/core';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TETRIS_GAME_CONFIG } from '../constants/tetris-game-config.constant';
import { TetrisPlacement } from '../interfaces/tetris-placement.interface';
import { TetrisPlan } from '../interfaces/tetris-plan.interface';
import { TetrisRankedPlacement } from '../interfaces/tetris-ranked-placement.interface';
import { TetrisAiAgentService } from './tetris-ai-agent.service';
import { TetrisAiDiagnosticsService } from './tetris-ai-diagnostics.service';
import { TetrisAiPolicyTelemetryService } from './tetris-ai-policy-telemetry.service';

@Injectable()
export class TetrisPlanSelectorService {
  private readonly agent = inject(TetrisAiAgentService);
  private readonly diagnostics = inject(TetrisAiDiagnosticsService);
  private readonly policyTelemetry = inject(TetrisAiPolicyTelemetryService);

  /**
   * Selects the best placement and returns a Plan, or null if no placements available.
   * Uses teacher warmup heuristic during early episodes, epsilon-greedy otherwise.
   */
  public computePlan(placements: TetrisPlacement[], episodePieceCount: number): TetrisPlan | null {
    if (placements.length === 0) return null;

    const featuresBatch = placements.map((p) => p.features);
    const values = this.agent.evaluatePlacements(featuresBatch);
    const rankedPlacements: TetrisRankedPlacement[] = placements.map((placement, index) => ({
      index,
      placement,
      modelValue: values[index],
      heuristicValue: this.scorePlacementHeuristically(placement),
    }));

    const teacherActive = this.shouldUseTeacherWarmup();
    const bestModelIndex = values.indexOf(Math.max(...values));
    let decisionSource: TetrisPlan['decisionSource'] = 'model';
    let idx = bestModelIndex;

    if (teacherActive) {
      idx = this.selectTeacherPlacement(rankedPlacements);
      decisionSource = 'teacher';
      this.recordTeacherGuidance(rankedPlacements);
    } else {
      idx = this.agent.selectPlacement(values);
      decisionSource = idx === bestModelIndex ? 'model' : 'exploration';
    }

    const chosen = placements[idx];
    const heuristicValues = rankedPlacements.map((rp) => rp.heuristicValue);

    this.diagnostics.logPlacementDecision(
      placements,
      chosen,
      values,
      idx,
      decisionSource,
      episodePieceCount,
      teacherActive,
      this.agent.getStats().epsilon,
      heuristicValues,
    );
    this.policyTelemetry.recordDecision(placements, chosen, values, idx);

    return {
      targetMatrix: chosen.matrix,
      targetX: chosen.x,
      features: chosen.features,
      placementRow: chosen.placementRow,
      linesCleared: chosen.linesCleared,
      decisionSource,
    };
  }

  /**
   * Scores a placement heuristically (for teacher warmup phase).
   * Returns a numeric score — higher is better.
   */
  public scorePlacementHeuristically(placement: TetrisPlacement): number {
    const features = placement.features;
    const previewHasI = features[36] === 1 || features[43] === 1 || features[50] === 1;
    return (
      this.computePlacementBonuses(placement, features) -
      this.computePlacementPenalties(features, previewHasI)
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Returns true if the agent is still in the teacher warmup phase. */
  private shouldUseTeacherWarmup(): boolean {
    return this.agent.getStats().totalEpisodes < TETRIS_AI_CONFIG.teacherWarmupEpisodes;
  }

  /** Selects the top heuristic placement with optional explore jitter. */
  private selectTeacherPlacement(ranked: TetrisRankedPlacement[]): number {
    const sorted = [...ranked].sort((a, b) => b.heuristicValue - a.heuristicValue);
    const shortlist = sorted.slice(0, Math.min(3, sorted.length));
    const selected =
      Math.random() < TETRIS_AI_CONFIG.teacherExploreRate
        ? shortlist[Math.floor(Math.random() * shortlist.length)]
        : sorted[0];

    return selected.index;
  }

  /** Records teacher guidance (preferred + rejected) to the agent. */
  private recordTeacherGuidance(ranked: TetrisRankedPlacement[]): void {
    const sorted = [...ranked].sort((a, b) => b.heuristicValue - a.heuristicValue);
    const preferred = sorted[0];
    if (!preferred) {
      return;
    }

    const rejectedFeaturesBatch = sorted
      .slice(-TETRIS_AI_CONFIG.teacherNegativeSamplesPerMove)
      .map((entry) => entry.placement.features);

    this.agent.recordTeacherGuidance(preferred.placement.features, rejectedFeaturesBatch);
    this.agent.trainOnDemonstrations();
  }

  /**
   * Computes bonuses for a placement (line clears, density, proximity, surface).
   */
  private computePlacementBonuses(placement: TetrisPlacement, features: number[]): number {
    const linesCleared = features[22] * 4;
    const bumpiness = features[23] * 100;
    const lowBoardDensity = features[29];
    const nearCompleteRows = features[31] * 10;
    const gridHeight = TETRIS_GAME_CONFIG.gridHeight;
    const rowFraction = placement.placementRow / gridHeight;
    const lowRowMultiplier = linesCleared > 0 ? 1 + rowFraction * 1.1 : 1;

    const lineClearBonus =
      linesCleared > 0 ? (110 + linesCleared * linesCleared * 34) * lowRowMultiplier : 0;
    const lowPlacementBonus = rowFraction * 22.0;
    const completenessBonus = placement.rowCompleteness * 10.0;
    const nearCompleteBonus = nearCompleteRows * 18.0;
    const lowBoardBonus = lowBoardDensity * 32.0;
    const surfaceStabilityBonus = Math.max(0, 20 - bumpiness) * 0.9;

    return (
      lineClearBonus +
      lowPlacementBonus +
      completenessBonus +
      nearCompleteBonus +
      lowBoardBonus +
      surfaceStabilityBonus
    );
  }

  /**
   * Computes penalties for a placement (holes, height, bumpiness, etc.).
   */
  private computePlacementPenalties(features: number[], previewHasI: boolean): number {
    const columnHeights = features.slice(0, 10).map((value) => value * 20);
    const linesCleared = features[22] * 4;
    const holes = features[21] * 40;
    const bumpiness = features[23] * 100;
    const maxHeight = features[19] * 20;
    const aggregateHeight = features[20] * 200;
    const coveredCells = features[24] * 120;
    const wells = features[26] * 100;
    const heightVariance = features[30] * 100;

    const stackOverflowPenalty =
      columnHeights.reduce((sum, height) => sum + Math.pow(Math.max(0, height - 7), 2), 0) * 0.28;
    const heightPenalty =
      Math.max(0, maxHeight - 6) * 16 + (maxHeight > 9 ? Math.pow(maxHeight - 9, 2) * 18 : 0);
    const aggHeightPenalty = aggregateHeight * 0.18;
    const variancePenalty = heightVariance * 4.5;
    const bumpinessPenalty = bumpiness * 4.8;
    const holesPenalty = holes > 0 ? holes * 90 + (linesCleared > 0 ? 110 : 220) : 0;
    const coveredPenalty = coveredCells * (linesCleared > 0 ? 8.0 : 12.0);
    const wellPenalty = wells * (previewHasI ? 0.2 : 1.1);

    return (
      holesPenalty +
      coveredPenalty +
      wellPenalty +
      bumpinessPenalty +
      aggHeightPenalty +
      heightPenalty +
      variancePenalty +
      stackOverflowPenalty
    );
  }
}
