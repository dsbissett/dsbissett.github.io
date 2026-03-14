import { Injectable, computed, signal } from '@angular/core';

import { HeatmapPoint } from '../interfaces/heatmap-point.interface';

@Injectable()
export class HeatmapPointCollectionService {
  private readonly pointState = signal<readonly HeatmapPoint[]>([]);

  public readonly points = this.pointState.asReadonly();
  public readonly pointCount = computed(() => this.points().length);

  public addPoint(point: HeatmapPoint): void {
    this.pointState.update((points) => [...points, point]);
  }

  public clearPoints(): void {
    this.pointState.set([]);
  }

  public replacePoints(points: readonly HeatmapPoint[]): void {
    this.pointState.set(points);
  }
}
