import { Injectable } from '@angular/core';

import { ClothPoint } from '../classes/cloth-point.class';
import { CLOTH_SIMULATION_CONFIG } from '../constants/cloth-simulation-config.constant';
import { ClothCanvasSize } from '../interfaces/cloth-canvas-size.interface';
import { ClothPointerState } from '../interfaces/cloth-pointer-state.interface';
import { ClothScene } from '../interfaces/cloth-scene.interface';

@Injectable()
export class ClothSimulationService {
  private points: ClothPoint[] = [];
  private size: ClothCanvasSize = { dpr: 1, height: 0, width: 0 };
  private spacing = CLOTH_SIMULATION_CONFIG.minSpacing;
  private tearDistance =
    CLOTH_SIMULATION_CONFIG.minSpacing *
    CLOTH_SIMULATION_CONFIG.tearDistanceMultiplier;

  public getPoints(): readonly ClothPoint[] {
    return this.points;
  }

  public getStrokeWidth(): number {
    return Math.max(
      1,
      this.spacing / CLOTH_SIMULATION_CONFIG.lineWidthDivisor
    );
  }

  public loadScene(scene: ClothScene, size: ClothCanvasSize): void {
    this.points = scene.points;
    this.size = size;
    this.spacing = scene.spacing;
    this.tearDistance = scene.tearDistance;
  }

  public step(deltaSeconds: number, pointer: ClothPointerState): void {
    if (this.points.length === 0) {
      return;
    }

    this.resolveConstraints();
    this.updatePoints(deltaSeconds, pointer);
  }

  private resolveConstraints(): void {
    for (let index = 0; index < CLOTH_SIMULATION_CONFIG.accuracy; index += 1) {
      for (const point of this.points) {
        point.resolveConstraints(this.tearDistance);
      }
    }
  }

  private updatePoints(
    deltaSeconds: number,
    pointer: ClothPointerState
  ): void {
    for (const point of this.points) {
      if (point.syncPinnedState(pointer)) {
        continue;
      }

      point.applyPointer(pointer);
      point.integrate(
        deltaSeconds,
        CLOTH_SIMULATION_CONFIG.friction,
        CLOTH_SIMULATION_CONFIG.gravity
      );
      point.constrainWithinBounds(this.size, CLOTH_SIMULATION_CONFIG.bounce);
    }
  }
}
