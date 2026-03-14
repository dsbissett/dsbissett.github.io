import { Injectable, inject } from '@angular/core';

import { ClothConstraint } from '../classes/cloth-constraint.class';
import { ClothPoint } from '../classes/cloth-point.class';
import { CLOTH_SIMULATION_CONFIG } from '../constants/cloth-simulation-config.constant';
import { ClothCanvasSize } from '../interfaces/cloth-canvas-size.interface';
import { ClothScene } from '../interfaces/cloth-scene.interface';
import { ClothTextMask } from '../interfaces/cloth-text-mask.interface';
import { ClothTextLayoutService } from './cloth-text-layout.service';

@Injectable()
export class ClothSceneBuilderService {
  private readonly textLayout = inject(ClothTextLayoutService);

  public build(text: string, size: ClothCanvasSize): ClothScene {
    const mask = this.textLayout.createMask(text, size);
    const pointMap = this.createPointMap(mask);
    const points = Array.from(pointMap.values());

    this.connectPoints(pointMap, mask);
    this.pinTopBand(points, mask.spacing);

    return {
      points,
      spacing: mask.spacing,
      tearDistance:
        mask.spacing * CLOTH_SIMULATION_CONFIG.tearDistanceMultiplier,
    };
  }

  private addConstraint(
    start: ClothPoint | undefined,
    end: ClothPoint | undefined,
    length: number
  ): void {
    if (start && end) {
      start.addConstraint(new ClothConstraint(start, end, length));
    }
  }

  private connectPoints(
    pointMap: Map<string, ClothPoint>,
    mask: ClothTextMask
  ): void {
    const diagonalLength = Math.hypot(mask.spacing, mask.spacing);

    for (let y = 0; y < mask.height; y += mask.spacing) {
      for (let x = 0; x < mask.width; x += mask.spacing) {
        const point = pointMap.get(this.createKey(x, y));
        if (!point) {
          continue;
        }

        this.addConstraint(
          point,
          pointMap.get(this.createKey(x + mask.spacing, y)),
          mask.spacing
        );
        this.addConstraint(
          point,
          pointMap.get(this.createKey(x, y + mask.spacing)),
          mask.spacing
        );
        this.addConstraint(
          point,
          pointMap.get(this.createKey(x + mask.spacing, y + mask.spacing)),
          diagonalLength
        );
        this.addConstraint(
          point,
          pointMap.get(this.createKey(x - mask.spacing, y + mask.spacing)),
          diagonalLength
        );
      }
    }
  }

  private createKey(x: number, y: number): string {
    return `${x}:${y}`;
  }

  private createPointMap(mask: ClothTextMask): Map<string, ClothPoint> {
    const pointMap = new Map<string, ClothPoint>();
    const pixels = mask.imageData.data;

    for (let y = 0; y < mask.height; y += mask.spacing) {
      for (let x = 0; x < mask.width; x += mask.spacing) {
        const alpha = pixels[(y * mask.width + x) * 4 + 3];
        if (alpha <= CLOTH_SIMULATION_CONFIG.sampleAlphaThreshold) {
          continue;
        }

        pointMap.set(
          this.createKey(x, y),
          new ClothPoint(mask.offsetX + x, mask.offsetY + y)
        );
      }
    }

    return pointMap;
  }

  private findMinimumY(points: readonly ClothPoint[]): number {
    let minimumY = Number.POSITIVE_INFINITY;

    for (const point of points) {
      if (point.y < minimumY) {
        minimumY = point.y;
      }
    }

    return minimumY;
  }

  private pinTopBand(points: readonly ClothPoint[], spacing: number): void {
    if (points.length === 0) {
      return;
    }

    const minimumY = this.findMinimumY(points);
    const band = spacing * 2.4;

    for (const point of points) {
      if (point.y <= minimumY + band) {
        point.pinToCurrentPosition();
      }
    }
  }
}
