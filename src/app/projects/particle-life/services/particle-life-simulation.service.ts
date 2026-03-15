import { Injectable } from '@angular/core';

import { ParticleLifeSpatialHash } from '../classes/particle-life-spatial-hash.class';
import { ParticleLifeParticle } from '../interfaces/particle-life-particle.interface';

@Injectable()
export class ParticleLifeSimulationService {
  private particles: ParticleLifeParticle[] = [];
  private spatialHash: ParticleLifeSpatialHash | null = null;

  public initialize(
    particleCount: number,
    speciesCount: number,
    width: number,
    height: number,
    cellSize: number
  ): void {
    this.particles = [];

    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: 0,
        species: Math.floor(Math.random() * speciesCount),
      });
    }

    this.spatialHash = new ParticleLifeSpatialHash(cellSize);
    this.spatialHash.resize(width, height);
  }

  public step(
    attractionMatrix: number[][],
    interactionRadius: number,
    friction: number,
    forceScale: number,
    beta: number,
    wrap: boolean,
    width: number,
    height: number
  ): void {
    const hash = this.spatialHash;

    if (!hash) {
      return;
    }

    const particles = this.particles;
    const count = particles.length;
    const halfWidth = width * 0.5;
    const halfHeight = height * 0.5;
    const radiusSq = interactionRadius * interactionRadius;
    const invRadius = 1 / interactionRadius;

    hash.clear();

    for (let i = 0; i < count; i++) {
      hash.insert(i, particles[i].x, particles[i].y);
    }

    for (let i = 0; i < count; i++) {
      const pi = particles[i];
      let fx = 0;
      let fy = 0;
      const speciesRow = attractionMatrix[pi.species];

      hash.forEachNeighbor(
        pi.x,
        pi.y,
        wrap,
        width,
        height,
        (j) => {
          if (j === i) {
            return;
          }

          const pj = particles[j];
          let dx = pj.x - pi.x;
          let dy = pj.y - pi.y;

          if (wrap) {
            if (dx > halfWidth) {
              dx -= width;
            } else if (dx < -halfWidth) {
              dx += width;
            }

            if (dy > halfHeight) {
              dy -= height;
            } else if (dy < -halfHeight) {
              dy += height;
            }
          }

          const distSq = dx * dx + dy * dy;

          if (distSq >= radiusSq || distSq < 0.0001) {
            return;
          }

          const dist = Math.sqrt(distSq);
          const normalizedDist = dist * invRadius;
          const attraction = speciesRow[pj.species];
          const force = this.forceCurve(normalizedDist, attraction, beta);
          const strength = (force * forceScale) / dist;
          fx += dx * strength;
          fy += dy * strength;
        }
      );

      pi.vx = (pi.vx + fx) * (1 - friction);
      pi.vy = (pi.vy + fy) * (1 - friction);
      pi.x += pi.vx;
      pi.y += pi.vy;

      if (wrap) {
        pi.x = ((pi.x % width) + width) % width;
        pi.y = ((pi.y % height) + height) % height;
      } else {
        if (pi.x < 0) {
          pi.x = 0;
          pi.vx = Math.abs(pi.vx) * 0.5;
        } else if (pi.x >= width) {
          pi.x = width - 1;
          pi.vx = -Math.abs(pi.vx) * 0.5;
        }

        if (pi.y < 0) {
          pi.y = 0;
          pi.vy = Math.abs(pi.vy) * 0.5;
        } else if (pi.y >= height) {
          pi.y = height - 1;
          pi.vy = -Math.abs(pi.vy) * 0.5;
        }
      }
    }
  }

  public explode(
    worldX: number,
    worldY: number,
    radius: number,
    strength: number
  ): void {
    const radiusSq = radius * radius;

    for (const p of this.particles) {
      const dx = p.x - worldX;
      const dy = p.y - worldY;
      const distSq = dx * dx + dy * dy;

      if (distSq < radiusSq && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const factor = (1 - dist / radius);
        const nx = dx / dist;
        const ny = dy / dist;

        // Immediate displacement so the explosion is visible regardless of friction
        p.x += nx * factor * strength;
        p.y += ny * factor * strength;

        // Velocity kick to sustain outward motion
        p.vx += nx * factor * strength * 0.5;
        p.vy += ny * factor * strength * 0.5;
      }
    }
  }

  public getParticles(): readonly ParticleLifeParticle[] {
    return this.particles;
  }

  private forceCurve(
    normalizedDist: number,
    attraction: number,
    beta: number
  ): number {
    if (normalizedDist < beta) {
      return normalizedDist / beta - 1;
    }

    if (normalizedDist < 1) {
      return (
        attraction *
        (1 - Math.abs(2 * normalizedDist - 1 - beta) / (1 - beta))
      );
    }

    return 0;
  }
}
