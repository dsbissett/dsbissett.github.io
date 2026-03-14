import { Injectable } from '@angular/core';

import { HeatmapCanvasSize } from '../interfaces/heatmap-canvas-size.interface';
import { HeatmapPoint } from '../interfaces/heatmap-point.interface';

const FELONY_CLUSTER_COUNT = 10;
const MISDEMEANOR_CLUSTER_COUNT = 28;

@Injectable()
export class HeatmapPointGeneratorService {
  public clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  public createFelonyPoint(size: HeatmapCanvasSize): HeatmapPoint {
    const centerX = this.getRandomNumber(size.width * 0.18, size.width * 0.82);
    const centerY = this.getRandomNumber(size.height * 0.18, size.height * 0.82);

    return {
      x: centerX + this.getRandomNumber(-35, 35),
      y: centerY + this.getRandomNumber(-35, 35),
      severity: 'felony',
    };
  }

  public createFelonyPoints(size: HeatmapCanvasSize): readonly HeatmapPoint[] {
    const points: HeatmapPoint[] = [];

    for (let index = 0; index < FELONY_CLUSTER_COUNT; index += 1) {
      points.push(this.createFelonyPoint(size));
    }

    return points;
  }

  public createMisdemeanorPoint(
    size: HeatmapCanvasSize,
    anchorPoints: readonly HeatmapPoint[]
  ): HeatmapPoint {
    const anchorPoint =
      anchorPoints[Math.floor(Math.random() * anchorPoints.length)];
    const useAnchorPoint = Math.random() < 0.55;
    const x = useAnchorPoint
      ? anchorPoint.x + this.getRandomNumber(-120, 120)
      : this.getRandomNumber(0, size.width);
    const y = useAnchorPoint
      ? anchorPoint.y + this.getRandomNumber(-120, 120)
      : this.getRandomNumber(0, size.height);

    return {
      x: this.clamp(x, 0, size.width),
      y: this.clamp(y, 0, size.height),
      severity: 'misdemeanor',
    };
  }

  public createMisdemeanorPoints(
    size: HeatmapCanvasSize,
    anchorPoints: readonly HeatmapPoint[]
  ): readonly HeatmapPoint[] {
    const points: HeatmapPoint[] = [];

    for (let index = 0; index < MISDEMEANOR_CLUSTER_COUNT; index += 1) {
      points.push(this.createMisdemeanorPoint(size, anchorPoints));
    }

    return points;
  }

  public generatePoints(size: HeatmapCanvasSize): readonly HeatmapPoint[] {
    const felonyPoints = this.createFelonyPoints(size);
    const misdemeanorPoints = this.createMisdemeanorPoints(size, felonyPoints);

    return [...felonyPoints, ...misdemeanorPoints];
  }

  public getRandomNumber(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}
