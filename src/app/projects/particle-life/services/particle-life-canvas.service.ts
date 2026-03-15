import { Injectable } from '@angular/core';

import { PARTICLE_LIFE_CONFIG } from '../constants/particle-life-config.constant';
import { ParticleLifeCanvasSize } from '../interfaces/particle-life-canvas-size.interface';

@Injectable()
export class ParticleLifeCanvasService {
  public createContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error(
        'A 2D canvas context is required for the particle life simulation.'
      );
    }

    return context;
  }

  public resize(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D
  ): ParticleLifeCanvasSize {
    const width = Math.floor(window.innerWidth);
    const height = Math.floor(window.innerHeight);
    const dpr = Math.min(
      PARTICLE_LIFE_CONFIG.maxDpr,
      window.devicePixelRatio || 1
    );

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    return { width, height, dpr };
  }
}
