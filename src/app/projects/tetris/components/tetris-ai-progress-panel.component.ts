import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { TetrisAiProgressSnapshot } from '../interfaces/tetris-ai-progress-snapshot.interface';
import { TetrisAiStats } from '../interfaces/tetris-ai-stats.interface';
import { TetrisAiMilestoneService } from '../services/tetris-ai-milestone.service';

interface ProgressCard {
  label: string;
  value: string;
}

@Component({
  selector: 'app-tetris-ai-progress-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tetris-ai-progress-panel.component.html',
  styleUrl: './tetris-ai-progress-panel.component.scss',
})
export class TetrisAiProgressPanelComponent {
  private readonly milestonesService = inject(TetrisAiMilestoneService);

  public readonly stats = input.required<TetrisAiStats>();
  public readonly progress = input.required<TetrisAiProgressSnapshot>();

  protected readonly trainingCards = computed(() => [
    this.card('Episodes', this.formatInteger(this.stats().totalEpisodes)),
    this.card('Steps', this.formatInteger(this.stats().totalSteps)),
    this.card('Updates', this.formatInteger(this.progress().trainingUpdates)),
    this.card(
      'Replay buffer',
      `${this.progress().replayBufferSize}/${this.progress().replayBufferCapacity}`,
    ),
    this.card(
      'Demo buffer',
      `${this.progress().demonstrationBufferSize}/${this.progress().demonstrationBufferCapacity}`,
    ),
  ]);

  protected readonly outcomeCards = computed(() => [
    this.card('Exploration', this.formatDecimal(this.stats().epsilon, 4)),
    this.card('Recent avg score', this.formatDecimal(this.stats().averageScore, 1)),
    this.card('Lifetime avg score', this.formatDecimal(this.stats().lifetimeAverageScore, 1)),
    this.card('Best score (teacher)', this.formatInteger(this.stats().bestTeacherScore)),
    this.card('Best score (AI)', this.formatInteger(this.stats().bestAiScore)),
    this.card(
      'Score trend',
      this.formatSigned(this.stats().averageScore - this.stats().lifetimeAverageScore, 1),
    ),
    this.card(
      'Avg lines / episode',
      this.formatDecimal(this.stats().averageLinesClearedPerEpisode, 2),
    ),
    this.card('Avg pieces / episode', this.formatDecimal(this.stats().averagePiecesPerEpisode, 1)),
  ]);

  protected readonly policyCards = computed(() => [
    this.card('Avg chosen value', this.formatDecimal(this.progress().averageChosenValue, 3)),
    this.card('Decision margin', this.formatDecimal(this.progress().averageDecisionMargin, 3)),
    this.card('Policy consistency', this.formatPercent(this.progress().policyConsistency)),
    this.card('Consistency samples', this.formatInteger(this.progress().policySampleCount)),
  ]);

  protected readonly stabilityCards = computed(() => [
    this.card(
      'Mean TD error',
      this.formatOptionalDecimal(this.progress().latestMeanAbsoluteTdError, 3),
    ),
    this.card(
      'Max TD error',
      this.formatOptionalDecimal(this.progress().latestMaxAbsoluteTdError, 3),
    ),
    this.card(
      'Current Q range',
      this.formatRange(this.progress().currentQMin, this.progress().currentQMax, 2),
    ),
    this.card(
      'Target Q range',
      this.formatRange(this.progress().targetQMin, this.progress().targetQMax, 2),
    ),
    this.card('Reward clip-rate', this.formatPercent(this.progress().rewardClipRate)),
    this.card('Terminal replay ratio', this.formatPercent(this.progress().terminalReplayRatio)),
  ]);

  protected readonly boardCards = computed(() => [
    this.card('Avg holes', this.formatDecimal(this.progress().averageHoles, 2)),
    this.card('Avg bumpiness', this.formatDecimal(this.progress().averageBumpiness, 2)),
    this.card('Avg max height', this.formatDecimal(this.progress().averageMaxHeight, 2)),
    this.card(
      'Avg lines / move',
      this.formatDecimal(this.progress().averageLinesClearedPerMove, 2),
    ),
  ]);

  protected readonly milestoneBadges = computed(() =>
    this.milestonesService.evaluate(this.stats(), this.progress()),
  );

  protected readonly latestLossText = computed(() => this.formatLoss());
  protected readonly storageWarningText = computed(() => this.progress().storageWarning);
  protected readonly lossChartPoints = computed(() =>
    this.buildLossPoints(this.progress().recentLosses),
  );

  private card(label: string, value: string): ProgressCard {
    return { label, value };
  }

  private formatInteger(value: number): string {
    return Math.round(value).toLocaleString();
  }

  private formatDecimal(value: number, digits: number): string {
    return value.toFixed(digits);
  }

  private formatSigned(value: number, digits: number): string {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(digits)}`;
  }

  private formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  private formatOptionalDecimal(value: number | null, digits: number): string {
    return value === null ? 'Waiting' : value.toFixed(digits);
  }

  private formatRange(min: number | null, max: number | null, digits: number): string {
    if (min === null || max === null) {
      return 'Waiting';
    }

    return `[${min.toFixed(digits)}, ${max.toFixed(digits)}]`;
  }

  private formatLoss(): string {
    const latestLoss = this.progress().latestLoss;
    const source = this.progress().latestLossSource;

    if (latestLoss === null || source === null) {
      return 'Waiting for training';
    }

    return `${latestLoss.toFixed(5)} (${source})`;
  }

  private buildLossPoints(values: number[]): string {
    if (values.length === 0) {
      return '';
    }

    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    return values
      .map((value, index) => {
        const x = (index / Math.max(1, values.length - 1)) * 100;
        const y = 100 - ((value - min) / range) * 100;
        return `${x},${y}`;
      })
      .join(' ');
  }
}
