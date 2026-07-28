import { Injectable } from '@angular/core';

import { Mat4, Vec3 } from '../classes/mat4.class';
import { Quat, Quaternion } from '../classes/quat.class';
import { RenderInstance } from '../interfaces/render-instance.interface';
import { CLOD_MESH_COUNT, FLY_PER_MUD, MAX_FLIES } from '../constants/toilet-physics.constant';

/** One fly: a hover orbit around the bowl plus high-frequency buzz jitter. */
interface Fly {
  readonly center: Vec3;
  readonly radius: readonly [number, number];
  readonly orbitW: number;
  readonly bob: readonly [number, number, number];
  readonly buzz: readonly [number, number, number];
  readonly quat: Quaternion;
  readonly scale: Vec3;
  readonly meshIndex: number;
  theta: number;
}

const FLY_TINT: readonly [number, number, number] = [0.07, 0.06, 0.05];

/** A swarm of tiny buzzing flies over the bowl; more settled mud attracts more of them. */
@Injectable()
export class ToiletFliesService {
  private readonly flies: Fly[] = [];
  private time = 0;

  public step(dt: number, bowlMud: number): void {
    this.time += dt;
    const target = Math.min(MAX_FLIES, Math.floor(bowlMud / FLY_PER_MUD));
    if (this.flies.length < target) {
      this.flies.push(this.spawnFly());
    }
    while (this.flies.length > target) {
      this.flies.pop();
    }
    for (const fly of this.flies) {
      fly.theta += fly.orbitW * dt;
    }
  }

  public getInstances(): RenderInstance[] {
    return this.flies.map((fly) => ({
      meshIndex: fly.meshIndex,
      model: Mat4.compose(this.position(fly), fly.quat, fly.scale),
      color: FLY_TINT,
      alpha: 1,
      cracks: 0,
    }));
  }

  private position(fly: Fly): Vec3 {
    const t = this.time;
    return [
      fly.center[0] + fly.radius[0] * Math.cos(fly.theta) + fly.buzz[0] * Math.sin(fly.buzz[1] * t),
      fly.center[1] +
        fly.bob[0] * Math.sin(fly.bob[1] * t + fly.bob[2]) +
        fly.buzz[0] * 0.6 * Math.sin(fly.buzz[2] * t),
      fly.center[2] + fly.radius[1] * Math.sin(fly.theta) + fly.buzz[0] * Math.cos(fly.buzz[2] * t + 1.3),
    ];
  }

  private spawnFly(): Fly {
    const size = 0.009 + Math.random() * 0.005;
    return {
      center: [(Math.random() - 0.5) * 0.4, 0.62 + Math.random() * 0.3, 0.05 + (Math.random() - 0.5) * 0.45],
      radius: [0.1 + Math.random() * 0.22, 0.1 + Math.random() * 0.26],
      orbitW: (Math.random() < 0.5 ? -1 : 1) * (1.6 + Math.random() * 2.8),
      bob: [0.03 + Math.random() * 0.05, 2.5 + Math.random() * 4, Math.random() * Math.PI * 2],
      buzz: [0.008 + Math.random() * 0.012, 14 + Math.random() * 10, 17 + Math.random() * 9],
      quat: Quat.random(),
      scale: [size, size * 0.65, size * 1.25],
      meshIndex: Math.floor(Math.random() * CLOD_MESH_COUNT),
      theta: Math.random() * Math.PI * 2,
    };
  }
}
