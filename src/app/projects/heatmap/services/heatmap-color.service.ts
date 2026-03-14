import { Injectable } from '@angular/core';

import { HEATMAP_COLOR_RAMP } from '../constants/heatmap-color-ramp.constant';
import { HeatmapRgb } from '../types/heatmap-rgb.type';

@Injectable()
export class HeatmapColorService {
  public clampUnit(value: number): number {
    return Math.min(Math.max(value, 0), 1);
  }

  public getFillStyle(normalizedIntensity: number): string {
    const [red, green, blue] = this.getInterpolatedColor(normalizedIntensity);

    return `rgb(${red},${green},${blue})`;
  }

  public getInterpolatedColor(normalizedIntensity: number): HeatmapRgb {
    const clampedIntensity = this.clampUnit(normalizedIntensity);

    for (let index = 0; index < HEATMAP_COLOR_RAMP.length - 1; index += 1) {
      const startStop = HEATMAP_COLOR_RAMP[index];
      const endStop = HEATMAP_COLOR_RAMP[index + 1];

      if (this.isWithinRange(clampedIntensity, startStop.position, endStop.position)) {
        return this.mixColors(
          startStop.color,
          endStop.color,
          this.getMixFactor(clampedIntensity, startStop.position, endStop.position)
        );
      }
    }

    return HEATMAP_COLOR_RAMP[HEATMAP_COLOR_RAMP.length - 1].color;
  }

  public getMixFactor(value: number, start: number, end: number): number {
    return (value - start) / (end - start || 1);
  }

  public isWithinRange(value: number, start: number, end: number): boolean {
    return value >= start && value <= end;
  }

  public mixColors(
    startColor: HeatmapRgb,
    endColor: HeatmapRgb,
    factor: number
  ): HeatmapRgb {
    return [
      Math.round(startColor[0] + (endColor[0] - startColor[0]) * factor),
      Math.round(startColor[1] + (endColor[1] - startColor[1]) * factor),
      Math.round(startColor[2] + (endColor[2] - startColor[2]) * factor),
    ];
  }
}
