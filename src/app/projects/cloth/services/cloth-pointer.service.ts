import { Injectable } from '@angular/core';

import { CLOTH_SIMULATION_CONFIG } from '../constants/cloth-simulation-config.constant';
import { ClothPointerState } from '../interfaces/cloth-pointer-state.interface';

@Injectable()
export class ClothPointerService {
  private readonly state: ClothPointerState = {
    button: 0,
    cutRadius: 0,
    influenceRadius: 0,
    isDown: false,
    previousX: 0,
    previousY: 0,
    x: 0,
    y: 0,
  };

  public cancel(canvas: HTMLCanvasElement, event: PointerEvent): void {
    this.state.isDown = false;
    this.releaseCapture(canvas, event.pointerId);
  }

  public configure(spacing: number): void {
    this.state.influenceRadius =
      spacing * CLOTH_SIMULATION_CONFIG.pointerInfluenceMultiplier;
    this.state.cutRadius = spacing * CLOTH_SIMULATION_CONFIG.pointerCutMultiplier;
  }

  public end(canvas: HTMLCanvasElement, event: PointerEvent): void {
    this.state.isDown = false;
    this.releaseCapture(canvas, event.pointerId);
  }

  public getState(): ClothPointerState {
    return this.state;
  }

  public move(canvas: HTMLCanvasElement, event: PointerEvent): void {
    this.updatePosition(canvas, event);
  }

  public reset(): void {
    this.state.isDown = false;
    this.state.button = 0;
    this.state.previousX = this.state.x;
    this.state.previousY = this.state.y;
  }

  public start(canvas: HTMLCanvasElement, event: PointerEvent): void {
    canvas.setPointerCapture(event.pointerId);
    this.state.isDown = true;
    this.state.button = event.button;
    this.updatePosition(canvas, event);
  }

  private releaseCapture(canvas: HTMLCanvasElement, pointerId: number): void {
    if (canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
  }

  private updatePosition(canvas: HTMLCanvasElement, event: PointerEvent): void {
    const rect = canvas.getBoundingClientRect();
    this.state.previousX = this.state.x;
    this.state.previousY = this.state.y;
    this.state.x = event.clientX - rect.left;
    this.state.y = event.clientY - rect.top;
  }
}
