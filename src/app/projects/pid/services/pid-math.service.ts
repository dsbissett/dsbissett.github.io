import { Injectable } from '@angular/core';

import { PidDrawRange } from '../interfaces/pid-draw-range.interface';
import { PidVisualizationBounds } from '../interfaces/pid-visualization-bounds.interface';

@Injectable()
export class PidMathService {
  public clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
  }

  public createRange(minimum: number, maximum: number): PidDrawRange {
    if (minimum === maximum) {
      return {
        minimum: minimum - 1,
        maximum: maximum + 1,
      };
    }

    const padding = 0.08 * (maximum - minimum);

    return {
      minimum: minimum - padding,
      maximum: maximum + padding,
    };
  }

  public lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor;
  }

  public mapPositionToCanvas(
    position: number,
    width: number,
    bounds: PidVisualizationBounds
  ): number {
    return (
      ((position - bounds.minimum) / (bounds.maximum - bounds.minimum)) * width
    );
  }

  public mapCanvasToPosition(
    pixel: number,
    width: number,
    bounds: PidVisualizationBounds
  ): number {
    return bounds.minimum + (pixel / width) * (bounds.maximum - bounds.minimum);
  }
}
