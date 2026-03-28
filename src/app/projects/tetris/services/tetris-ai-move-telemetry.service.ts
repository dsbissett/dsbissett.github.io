import { Injectable, inject } from '@angular/core';

import { average, appendWindow } from '../utils/tetris-ai-progress.util';
import { TetrisBoardMetricsService } from './tetris-board-metrics.service';
import { TetrisAiProgressStoreService } from './tetris-ai-progress-store.service';

const MOVE_WINDOW_SIZE = 30;

@Injectable()
export class TetrisAiMoveTelemetryService {
  private readonly boardMetrics = inject(TetrisBoardMetricsService);
  private readonly store = inject(TetrisAiProgressStoreService);

  private holes: number[] = [];
  private bumpiness: number[] = [];
  private maxHeights: number[] = [];
  private linesCleared: number[] = [];

  public recordPlacement(features: number[]): void {
    const metrics = this.boardMetrics.extractMetrics(features);

    this.holes = appendWindow(this.holes, metrics.holes, MOVE_WINDOW_SIZE);
    this.bumpiness = appendWindow(this.bumpiness, metrics.bumpiness, MOVE_WINDOW_SIZE);
    this.maxHeights = appendWindow(this.maxHeights, metrics.maxHeight, MOVE_WINDOW_SIZE);
    this.linesCleared = appendWindow(this.linesCleared, metrics.completedLines, MOVE_WINDOW_SIZE);

    this.store.patch({
      averageHoles: average(this.holes),
      averageBumpiness: average(this.bumpiness),
      averageMaxHeight: average(this.maxHeights),
      averageLinesClearedPerMove: average(this.linesCleared),
    });
  }

  public reset(): void {
    this.holes = [];
    this.bumpiness = [];
    this.maxHeights = [];
    this.linesCleared = [];
    this.store.patch({
      averageHoles: 0,
      averageBumpiness: 0,
      averageMaxHeight: 0,
      averageLinesClearedPerMove: 0,
    });
  }
}
