import { Injectable } from '@angular/core';

import { FlappyBirdCanvasSize } from '../interfaces/flappy-bird-canvas-size.interface';

@Injectable()
export class FlappyBirdCanvasService {
  public createContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('A 2D canvas context is required for Flappy Bird.');
    }

    return context;
  }

  public resize(canvas: HTMLCanvasElement): FlappyBirdCanvasSize {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    return { height, width };
  }

  public syncScale(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    size: FlappyBirdCanvasSize
  ): void {
    const scaleX = canvas.width / size.width;
    const scaleY = canvas.height / size.height;
    context.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  }
}
