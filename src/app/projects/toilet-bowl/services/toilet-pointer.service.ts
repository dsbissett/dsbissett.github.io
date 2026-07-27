import { Injectable } from '@angular/core';

import { ToiletCameraService } from './toilet-camera.service';

/** Translates pointer drag / wheel / pinch into orbit-camera motion. */
@Injectable()
export class ToiletPointerService {
  private canvas: HTMLCanvasElement | null = null;
  private camera: ToiletCameraService | null = null;
  private onInteract: (() => void) | null = null;
  private readonly active = new Map<number, { x: number; y: number }>();
  private pinchDistance = 0;

  public attach(
    canvas: HTMLCanvasElement,
    camera: ToiletCameraService,
    onInteract: () => void,
  ): void {
    this.canvas = canvas;
    this.camera = camera;
    this.onInteract = onInteract;
    canvas.addEventListener('pointerdown', this.handleDown);
    canvas.addEventListener('pointermove', this.handleMove);
    canvas.addEventListener('pointerup', this.handleUp);
    canvas.addEventListener('pointercancel', this.handleUp);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
  }

  public detach(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }
    canvas.removeEventListener('pointerdown', this.handleDown);
    canvas.removeEventListener('pointermove', this.handleMove);
    canvas.removeEventListener('pointerup', this.handleUp);
    canvas.removeEventListener('pointercancel', this.handleUp);
    canvas.removeEventListener('wheel', this.handleWheel);
    this.active.clear();
    this.canvas = null;
    this.camera = null;
    this.onInteract = null;
  }

  private readonly handleDown = (event: PointerEvent): void => {
    this.canvas?.setPointerCapture(event.pointerId);
    this.active.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.pinchDistance = this.currentPinchDistance();
    this.onInteract?.();
  };

  private readonly handleMove = (event: PointerEvent): void => {
    const prev = this.active.get(event.pointerId);
    if (!prev || !this.camera) {
      return;
    }
    this.active.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.onInteract?.();

    if (this.active.size >= 2) {
      this.applyPinch();
      return;
    }

    this.camera.rotate((event.clientX - prev.x) * 0.006, (event.clientY - prev.y) * 0.006);
  };

  private readonly handleUp = (event: PointerEvent): void => {
    this.active.delete(event.pointerId);
    this.pinchDistance = this.currentPinchDistance();
  };

  private readonly handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.camera?.zoom(1 + Math.sign(event.deltaY) * 0.08);
    this.onInteract?.();
  };

  private applyPinch(): void {
    const distance = this.currentPinchDistance();
    if (this.pinchDistance > 0 && distance > 0 && this.camera) {
      this.camera.zoom(this.pinchDistance / distance);
    }
    this.pinchDistance = distance;
  }

  private currentPinchDistance(): number {
    if (this.active.size < 2) {
      return 0;
    }
    const points = [...this.active.values()];
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
  }
}
