import { Injectable } from '@angular/core';

import { WATER_LEVEL, WATER_RX, WATER_RZ } from '../constants/toilet-physics.constant';

interface Ripple {
  readonly x: number;
  readonly z: number;
  age: number;
  readonly amp: number;
  readonly dipAmp: number;
}

const RINGS = 12;
const SECTORS = 44;
const WAVE_SPEED = 0.85;
const WAVE_WIDTH = 0.05;
const WAVE_K = 52;
const WAVE_TAU = 0.5;
const DIP_W0 = 0.055;
const DIP_TAU = 0.13;
const RIPPLE_LIFETIME = 1.7;
const MAX_RIPPLES = 16;

const CLEAN_COLOR: readonly [number, number, number] = [0.16, 0.42, 0.5];
const MUDDY_COLOR: readonly [number, number, number] = [0.34, 0.22, 0.11];

/**
 * A pool of water inside the bowl, driven by a sum of analytic expanding-ring
 * ripples (plus an initial plunge dip) so impacts read as physical splashes.
 * Also tracks accumulating murk that tints the water brown as mud lands.
 */
@Injectable()
export class ToiletWaterService {
  public readonly indices: number[] = [];
  public vertexCount = 0;

  private readonly baseX: number[] = [];
  private readonly baseZ: number[] = [];
  private readonly radial: number[] = [];
  private positions = new Float32Array(0);
  private normals = new Float32Array(0);
  private readonly ripples: Ripple[] = [];
  private dirt = 0.12;

  public init(): void {
    this.buildGrid();
    this.vertexCount = this.baseX.length;
    this.positions = new Float32Array(this.vertexCount * 3);
    this.normals = new Float32Array(this.vertexCount * 3);
    this.writeMesh();
  }

  public splash(x: number, z: number, strength: number): void {
    this.ripples.push({
      x,
      z,
      age: 0,
      amp: 0.02 * strength,
      dipAmp: 0.03 * strength,
    });
    if (this.ripples.length > MAX_RIPPLES) {
      this.ripples.shift();
    }
  }

  public addDirt(amount: number): void {
    this.dirt = Math.min(0.9, this.dirt + amount);
  }

  public step(dt: number): void {
    for (const ripple of this.ripples) {
      ripple.age += dt;
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      if (this.ripples[i].age > RIPPLE_LIFETIME) {
        this.ripples.splice(i, 1);
      }
    }
    this.writeMesh();
  }

  public getPositions(): Float32Array {
    return this.positions;
  }

  public getNormals(): Float32Array {
    return this.normals;
  }

  public tint(): readonly [number, number, number] {
    return [
      CLEAN_COLOR[0] + (MUDDY_COLOR[0] - CLEAN_COLOR[0]) * this.dirt,
      CLEAN_COLOR[1] + (MUDDY_COLOR[1] - CLEAN_COLOR[1]) * this.dirt,
      CLEAN_COLOR[2] + (MUDDY_COLOR[2] - CLEAN_COLOR[2]) * this.dirt,
    ];
  }

  private buildGrid(): void {
    this.baseX.push(0);
    this.baseZ.push(0);
    this.radial.push(0);
    for (let r = 1; r <= RINGS; r++) {
      const rad = r / RINGS;
      for (let s = 0; s < SECTORS; s++) {
        const theta = (s / SECTORS) * Math.PI * 2;
        this.baseX.push(WATER_RX * rad * Math.cos(theta));
        this.baseZ.push(WATER_RZ * rad * Math.sin(theta));
        this.radial.push(rad);
      }
    }
    this.buildIndices();
  }

  private buildIndices(): void {
    for (let s = 0; s < SECTORS; s++) {
      this.indices.push(0, 1 + s, 1 + ((s + 1) % SECTORS));
    }
    for (let r = 1; r < RINGS; r++) {
      for (let s = 0; s < SECTORS; s++) {
        const a = 1 + (r - 1) * SECTORS + s;
        const b = 1 + r * SECTORS + s;
        const aNext = 1 + (r - 1) * SECTORS + ((s + 1) % SECTORS);
        const bNext = 1 + r * SECTORS + ((s + 1) % SECTORS);
        this.indices.push(a, b, aNext, b, bNext, aNext);
      }
    }
  }

  private writeMesh(): void {
    for (let i = 0; i < this.vertexCount; i++) {
      const sample = this.sample(this.baseX[i], this.baseZ[i]);
      const fade = this.edgeFade(this.radial[i]);
      const nx = -sample.gx * fade;
      const nz = -sample.gz * fade;
      const len = Math.hypot(nx, 1, nz);
      this.positions[i * 3] = this.baseX[i];
      this.positions[i * 3 + 1] = WATER_LEVEL + sample.h * fade;
      this.positions[i * 3 + 2] = this.baseZ[i];
      this.normals[i * 3] = nx / len;
      this.normals[i * 3 + 1] = 1 / len;
      this.normals[i * 3 + 2] = nz / len;
    }
  }

  private sample(bx: number, bz: number): { h: number; gx: number; gz: number } {
    let h = 0;
    let gx = 0;
    let gz = 0;
    for (const ripple of this.ripples) {
      const dx = bx - ripple.x;
      const dz = bz - ripple.z;
      const d = Math.hypot(dx, dz);
      const invD = d > 1e-4 ? 1 / d : 0;
      const dhdd = this.accumulate(ripple, d, (value) => (h += value));
      gx += dhdd * dx * invD;
      gz += dhdd * dz * invD;
    }
    return { h, gx, gz };
  }

  /** Adds one ripple's height contribution and returns its radial derivative dh/dd. */
  private accumulate(ripple: Ripple, d: number, addHeight: (value: number) => void): number {
    const u = d - WAVE_SPEED * ripple.age;
    const gauss = Math.exp(-(u * u) / (2 * WAVE_WIDTH * WAVE_WIDTH));
    const decay = Math.exp(-ripple.age / WAVE_TAU);
    const cos = Math.cos(WAVE_K * u);
    const sin = Math.sin(WAVE_K * u);
    const ring = ripple.amp * decay * cos * gauss;
    const ringDeriv = ripple.amp * decay * gauss * (-WAVE_K * sin - (cos * u) / (WAVE_WIDTH * WAVE_WIDTH));

    const dipGauss = Math.exp(-(d * d) / (2 * DIP_W0 * DIP_W0));
    const dipDecay = Math.exp(-ripple.age / DIP_TAU);
    const dip = -ripple.dipAmp * dipDecay * dipGauss;
    const dipDeriv = (ripple.dipAmp * dipDecay * dipGauss * d) / (DIP_W0 * DIP_W0);

    addHeight(ring + dip);
    return ringDeriv + dipDeriv;
  }

  private edgeFade(rad: number): number {
    const t = Math.min(1, Math.max(0, (rad - 1) / (0.7 - 1)));
    return t * t * (3 - 2 * t);
  }
}
