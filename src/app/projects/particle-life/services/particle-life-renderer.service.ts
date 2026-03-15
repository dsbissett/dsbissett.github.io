import { Injectable } from '@angular/core';

import { ParticleLifeCanvasSize } from '../interfaces/particle-life-canvas-size.interface';
import { ParticleLifeParticle } from '../interfaces/particle-life-particle.interface';

const TWO_PI = Math.PI * 2;

@Injectable()
export class ParticleLifeRendererService {
  public render(
    context: CanvasRenderingContext2D,
    particles: readonly ParticleLifeParticle[],
    size: ParticleLifeCanvasSize,
    colors: readonly string[],
    particleRadius: number,
    zoom: number,
    cameraX: number,
    cameraY: number,
    wrapEdges: boolean,
    worldWidth: number,
    worldHeight: number
  ): void {
    context.clearRect(0, 0, size.width, size.height);

    context.save();
    context.translate(size.width / 2, size.height / 2);
    context.scale(zoom, zoom);
    context.translate(-cameraX, -cameraY);

    const scaledRadius = particleRadius / zoom;
    const speciesCount = colors.length;

    // Compute visible tile offsets when wrapping is on
    const halfViewW = size.width / (2 * zoom);
    const halfViewH = size.height / (2 * zoom);
    let minTileX = 0;
    let maxTileX = 0;
    let minTileY = 0;
    let maxTileY = 0;

    if (wrapEdges && worldWidth > 0 && worldHeight > 0) {
      minTileX = Math.floor((cameraX - halfViewW) / worldWidth) - 1;
      maxTileX = Math.ceil((cameraX + halfViewW) / worldWidth);
      minTileY = Math.floor((cameraY - halfViewH) / worldHeight) - 1;
      maxTileY = Math.ceil((cameraY + halfViewH) / worldHeight);
    }

    for (let s = 0; s < speciesCount; s++) {
      context.beginPath();
      context.fillStyle = colors[s];

      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const offsetX = tx * worldWidth;
          const offsetY = ty * worldHeight;

          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            if (p.species !== s) {
              continue;
            }

            const px = p.x + offsetX;
            const py = p.y + offsetY;
            context.moveTo(px + scaledRadius, py);
            context.arc(px, py, scaledRadius, 0, TWO_PI);
          }
        }
      }

      context.fill();
    }

    context.restore();
  }
}
