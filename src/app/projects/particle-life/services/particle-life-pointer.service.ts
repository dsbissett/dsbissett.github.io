import { Injectable } from '@angular/core';

import { ParticleLifePointerState } from '../interfaces/particle-life-pointer-state.interface';

@Injectable()
export class ParticleLifePointerService {
  private readonly state: ParticleLifePointerState = {
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

  public end(canvas: HTMLCanvasElement, event: PointerEvent): void {
    this.state.isDown = false;
    this.releaseCapture(canvas, event.pointerId);
  }

  public getState(): ParticleLifePointerState {
    return this.state;
  }

  public move(canvas: HTMLCanvasElement, event: PointerEvent): void {
    this.updatePosition(canvas, event);
  }

  public reset(): void {
    this.state.isDown = false;
    this.state.previousX = this.state.x;
    this.state.previousY = this.state.y;
  }

  public start(canvas: HTMLCanvasElement, event: PointerEvent): void {
    canvas.setPointerCapture(event.pointerId);
    this.state.isDown = true;
    this.updatePosition(canvas, event);
  }

  private releaseCapture(canvas: HTMLCanvasElement, pointerId: number): void {
    if (canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
  }

  private updatePosition(
    canvas: HTMLCanvasElement,
    event: PointerEvent
  ): void {
    const rect = canvas.getBoundingClientRect();
    this.state.previousX = this.state.x;
    this.state.previousY = this.state.y;
    this.state.x = event.clientX - rect.left;
    this.state.y = event.clientY - rect.top;
  }
}
