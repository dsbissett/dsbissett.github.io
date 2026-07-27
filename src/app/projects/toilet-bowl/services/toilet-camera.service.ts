import { Injectable } from '@angular/core';

import { Mat4, Vec3 } from '../classes/mat4.class';

/** Spherical orbit camera framing the toilet at the origin height. */
@Injectable()
export class ToiletCameraService {
  private theta = 2.35;
  private phi = 0.34;
  private radius = 2.7;
  private readonly target: Vec3 = [0, 0.5, -0.1];
  private readonly minPhi = -0.35;
  private readonly maxPhi = 1.35;
  private readonly minRadius = 1.6;
  private readonly maxRadius = 6.5;

  public rotate(dTheta: number, dPhi: number): void {
    this.theta -= dTheta;
    this.phi = Math.min(this.maxPhi, Math.max(this.minPhi, this.phi + dPhi));
  }

  public zoom(factor: number): void {
    this.radius = Math.min(this.maxRadius, Math.max(this.minRadius, this.radius * factor));
  }

  public autoRotate(dt: number): void {
    this.theta += dt * 0.12;
  }

  public eye(): Vec3 {
    const cp = Math.cos(this.phi);
    return [
      this.target[0] + this.radius * cp * Math.cos(this.theta),
      this.target[1] + this.radius * Math.sin(this.phi),
      this.target[2] + this.radius * cp * Math.sin(this.theta),
    ];
  }

  public viewProj(aspect: number): Float32Array {
    const proj = Mat4.perspective((45 * Math.PI) / 180, aspect, 0.05, 100);
    const view = Mat4.lookAt(this.eye(), this.target, [0, 1, 0]);
    return Mat4.multiply(proj, view);
  }
}
