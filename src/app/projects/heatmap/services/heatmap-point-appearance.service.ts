import { Injectable } from '@angular/core';

import { HeatmapSeverity } from '../types/heatmap-severity.type';

@Injectable()
export class HeatmapPointAppearanceService {
  public getFillStyle(severity: HeatmapSeverity): string {
    if (severity === 'felony') {
      return 'rgba(255, 70, 70, 0.95)';
    }

    return 'rgba(255, 230, 80, 0.95)';
  }

  public getRadius(severity: HeatmapSeverity): number {
    if (severity === 'felony') {
      return 6;
    }

    return 4;
  }

  public getStrokeStyle(severity: HeatmapSeverity): string {
    if (severity === 'felony') {
      return 'rgba(255, 200, 200, 0.85)';
    }

    return 'rgba(255, 250, 210, 0.75)';
  }
}
