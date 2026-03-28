import { Injectable, inject } from '@angular/core';

import { TetrisPlacement } from '../interfaces/tetris-placement.interface';
import { average, appendWindow } from '../utils/tetris-ai-progress.util';
import { TetrisAiProgressStoreService } from './tetris-ai-progress-store.service';

const POLICY_WINDOW_SIZE = 30;

@Injectable()
export class TetrisAiPolicyTelemetryService {
  private readonly store = inject(TetrisAiProgressStoreService);

  private chosenValues: number[] = [];
  private margins: number[] = [];
  private consistencyHistory: number[] = [];
  private readonly decisionMemory = new Map<string, string>();

  public recordDecision(
    placements: TetrisPlacement[],
    chosen: TetrisPlacement,
    values: number[],
    chosenIndex: number,
  ): void {
    const contextKey = this.createContextKey(placements);
    const actionKey = this.createActionKey(chosen);
    const consistency = this.resolveConsistency(contextKey, actionKey);

    this.chosenValues = appendWindow(
      this.chosenValues,
      this.resolveChosenValue(values, chosenIndex),
      POLICY_WINDOW_SIZE,
    );
    this.margins = appendWindow(this.margins, this.resolveMargin(values), POLICY_WINDOW_SIZE);
    this.consistencyHistory = appendWindow(this.consistencyHistory, consistency, POLICY_WINDOW_SIZE);

    this.store.patch({
      averageChosenValue: average(this.chosenValues),
      averageDecisionMargin: average(this.margins),
      policyConsistency: average(this.consistencyHistory),
      policySampleCount: this.consistencyHistory.length,
    });
  }

  public reset(): void {
    this.chosenValues = [];
    this.margins = [];
    this.consistencyHistory = [];
    this.decisionMemory.clear();
    this.store.patch({
      averageChosenValue: 0,
      averageDecisionMargin: 0,
      policyConsistency: 0,
      policySampleCount: 0,
    });
  }

  private resolveChosenValue(values: number[], chosenIndex: number): number {
    return values[chosenIndex] ?? Math.max(...values);
  }

  private resolveMargin(values: number[]): number {
    if (values.length < 2) {
      return 0;
    }

    const sorted = [...values].sort((a, b) => b - a);
    return sorted[0] - sorted[1];
  }

  private resolveConsistency(contextKey: string, actionKey: string): number {
    const previous = this.decisionMemory.get(contextKey);
    this.decisionMemory.set(contextKey, actionKey);
    return previous === undefined || previous === actionKey ? 1 : 0;
  }

  private createContextKey(placements: TetrisPlacement[]): string {
    return placements
      .map((placement) => this.createActionKey(placement))
      .sort()
      .join('::');
  }

  private createActionKey(placement: TetrisPlacement): string {
    return `${placement.x}|${placement.rotation}|${placement.placementRow}|${placement.features
      .slice(19, 24)
      .map((value) => value.toFixed(3))
      .join('|')}`;
  }
}
