import { Injectable, signal } from '@angular/core';

import { HeatmapCanvasPosition } from '../interfaces/heatmap-canvas-position.interface';
import { HeatmapCanvasSize } from '../interfaces/heatmap-canvas-size.interface';

@Injectable()
export class HeatmapCanvasService {
  private canvas: HTMLCanvasElement | null = null;
  private readonly canvasContextState =
    signal<CanvasRenderingContext2D | null>(null);
  private readonly canvasSizeState = signal<HeatmapCanvasSize>({
    width: 0,
    height: 0,
    devicePixelRatio: 1,
  });

  public readonly canvasContext = this.canvasContextState.asReadonly();
  public readonly canvasSize = this.canvasSizeState.asReadonly();

  public connect(canvas: HTMLCanvasElement): void {
    const context = canvas.getContext('2d', { willReadFrequently: false });

    if (!context) {
      throw new Error('A 2D canvas context is required for the heatmap.');
    }

    this.canvas = canvas;
    this.canvasContextState.set(context);
  }

  public disconnect(): void {
    this.canvas = null;
    this.canvasContextState.set(null);
  }

  public getCanvasPosition(event: MouseEvent): HeatmapCanvasPosition {
    const rect = this.requireCanvas().getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  public measureCanvas(canvas: HTMLCanvasElement): HeatmapCanvasSize {
    const rect = canvas.getBoundingClientRect();

    return {
      width: Math.floor(rect.width),
      height: Math.floor(rect.height),
      devicePixelRatio: Math.max(1, Math.floor(window.devicePixelRatio || 1)),
    };
  }

  public requireCanvas(): HTMLCanvasElement {
    if (!this.canvas) {
      throw new Error('The heatmap canvas has not been connected.');
    }

    return this.canvas;
  }

  public requireContext(): CanvasRenderingContext2D {
    const context = this.canvasContext();

    if (!context) {
      throw new Error('The heatmap canvas context has not been initialized.');
    }

    return context;
  }

  public resize(): void {
    const canvas = this.requireCanvas();
    const context = this.requireContext();
    const size = this.measureCanvas(canvas);

    canvas.width = Math.floor(size.width * size.devicePixelRatio);
    canvas.height = Math.floor(size.height * size.devicePixelRatio);
    context.setTransform(size.devicePixelRatio, 0, 0, size.devicePixelRatio, 0, 0);
    this.canvasSizeState.set(size);
  }
}
