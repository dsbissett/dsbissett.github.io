import { Injectable, inject } from '@angular/core';

import { HeatmapCanvasSize } from '../interfaces/heatmap-canvas-size.interface';
import { HeatmapPoint } from '../interfaces/heatmap-point.interface';
import { HeatmapRenderParameters } from '../interfaces/heatmap-render-parameters.interface';
import { HeatmapSample } from '../interfaces/heatmap-sample.interface';
import { HeatmapSeverityProfileService } from './heatmap-severity-profile.service';

@Injectable()
export class HeatmapKdeService {
  private readonly severityProfile = inject(HeatmapSeverityProfileService);

  public createSamples(
    size: HeatmapCanvasSize,
    parameters: HeatmapRenderParameters,
    points: readonly HeatmapPoint[]
  ): readonly HeatmapSample[] {
    const samples: HeatmapSample[] = [];

    for (let y = 0; y <= size.height; y += parameters.gridStep) {
      for (let x = 0; x <= size.width; x += parameters.gridStep) {
        samples.push({
          x,
          y,
          intensity: this.getIntensityAt(x, y, points, parameters),
        });
      }
    }

    return samples;
  }

  public getContribution(
    x: number,
    y: number,
    point: HeatmapPoint,
    parameters: HeatmapRenderParameters
  ): number {
    const deltaX = x - point.x;
    const deltaY = y - point.y;
    const distanceSquared = deltaX * deltaX + deltaY * deltaY;
    const profile = this.severityProfile.getProfile(point.severity, parameters);
    const denominator = 2 * profile.sigma * profile.sigma;

    return profile.weight * Math.exp(-distanceSquared / denominator);
  }

  public getIntensityAt(
    x: number,
    y: number,
    points: readonly HeatmapPoint[],
    parameters: HeatmapRenderParameters
  ): number {
    let intensity = 0;

    for (const point of points) {
      intensity += this.getContribution(x, y, point, parameters);
    }

    return intensity;
  }

  public getMaxIntensity(samples: readonly HeatmapSample[]): number {
    let maxIntensity = 0;

    for (const sample of samples) {
      maxIntensity = Math.max(maxIntensity, sample.intensity);
    }

    return maxIntensity;
  }
}
