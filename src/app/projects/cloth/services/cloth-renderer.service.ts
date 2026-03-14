import { Injectable } from '@angular/core';

import { ClothPoint } from '../classes/cloth-point.class';
import { CLOTH_SIMULATION_CONFIG } from '../constants/cloth-simulation-config.constant';
import { ClothCanvasSize } from '../interfaces/cloth-canvas-size.interface';

@Injectable()
export class ClothRendererService {
  public render(
    context: CanvasRenderingContext2D,
    points: readonly ClothPoint[],
    size: ClothCanvasSize,
    strokeWidth: number
  ): void {
    context.clearRect(0, 0, size.width, size.height);
    context.beginPath();

    for (const point of points) {
      point.appendPath(context);
    }

    context.strokeStyle = CLOTH_SIMULATION_CONFIG.strokeStyle;
    context.lineCap = 'round';
    context.lineWidth = strokeWidth;
    context.stroke();
  }
}
