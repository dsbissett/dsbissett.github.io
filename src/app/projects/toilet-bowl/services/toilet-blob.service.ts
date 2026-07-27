import { Injectable } from '@angular/core';

import { MeshData } from '../interfaces/mesh-data.interface';
import { BLOB_CELL, BLOB_ISO, BLOB_MAX, BLOB_MIN } from '../constants/toilet-physics.constant';

/** A metaball: settled mud contributes one of these to the congealed field. */
export interface Metaball {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly r: number;
}

const CORNER: readonly [number, number, number][] = [
  [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
  [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
];
const EDGES: readonly [number, number][] = [
  [0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3],
  [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7],
];

/**
 * Builds one smooth "gelatinous blob" mesh from a set of metaballs by summing a
 * falloff field over a voxel grid and extracting the isosurface with surface nets.
 * Overlapping mud metaballs merge into a single congealed surface.
 */
@Injectable()
export class ToiletBlobService {
  private readonly nx = Math.round((BLOB_MAX[0] - BLOB_MIN[0]) / BLOB_CELL) + 1;
  private readonly ny = Math.round((BLOB_MAX[1] - BLOB_MIN[1]) / BLOB_CELL) + 1;
  private readonly nz = Math.round((BLOB_MAX[2] - BLOB_MIN[2]) / BLOB_CELL) + 1;
  private readonly field = new Float32Array(this.nx * this.ny * this.nz);
  private readonly cellVert = new Int32Array(this.nx * this.ny * this.nz);

  public build(balls: readonly Metaball[]): MeshData {
    if (balls.length === 0) {
      return { positions: [], normals: [], colors: [], indices: [] };
    }
    this.splat(balls);
    return this.extract();
  }

  private splat(balls: readonly Metaball[]): void {
    this.field.fill(0);
    for (const b of balls) {
      const lo = this.gridRange(b, 0);
      const hi = this.gridRange(b, 1);
      for (let k = lo[2]; k <= hi[2]; k++) {
        const z = BLOB_MIN[2] + k * BLOB_CELL;
        for (let j = lo[1]; j <= hi[1]; j++) {
          const y = BLOB_MIN[1] + j * BLOB_CELL;
          for (let i = lo[0]; i <= hi[0]; i++) {
            const x = BLOB_MIN[0] + i * BLOB_CELL;
            const d2 = (x - b.x) ** 2 + (y - b.y) ** 2 + (z - b.z) ** 2;
            const r2 = b.r * b.r;
            if (d2 < r2) {
              const t = 1 - d2 / r2;
              this.field[(k * this.ny + j) * this.nx + i] += t * t;
            }
          }
        }
      }
    }
  }

  private gridRange(b: Metaball, hi: number): [number, number, number] {
    const sign = hi ? 1 : -1;
    return [
      this.clamp((b.x + sign * b.r - BLOB_MIN[0]) / BLOB_CELL, this.nx),
      this.clamp((b.y + sign * b.r - BLOB_MIN[1]) / BLOB_CELL, this.ny),
      this.clamp((b.z + sign * b.r - BLOB_MIN[2]) / BLOB_CELL, this.nz),
    ];
  }

  private extract(): MeshData {
    this.cellVert.fill(-1);
    const positions: number[] = [];
    this.placeVertices(positions);
    const indices: number[] = [];
    this.connectFaces(indices);
    const normals = this.smoothNormals(positions, indices);
    return { positions, normals, colors: new Array(positions.length).fill(1), indices };
  }

  private placeVertices(positions: number[]): void {
    const g = new Float32Array(8);
    for (let k = 0; k < this.nz - 1; k++) {
      for (let j = 0; j < this.ny - 1; j++) {
        for (let i = 0; i < this.nx - 1; i++) {
          let mask = 0;
          for (let c = 0; c < 8; c++) {
            const value = this.field[this.idx(i + CORNER[c][0], j + CORNER[c][1], k + CORNER[c][2])];
            g[c] = value;
            if (value >= BLOB_ISO) {
              mask |= 1 << c;
            }
          }
          if (mask === 0 || mask === 0xff) {
            continue;
          }
          this.emitVertex(positions, g, i, j, k);
        }
      }
    }
  }

  private emitVertex(positions: number[], g: Float32Array, i: number, j: number, k: number): void {
    let vx = 0;
    let vy = 0;
    let vz = 0;
    let count = 0;
    for (const [a, b] of EDGES) {
      const inA = g[a] >= BLOB_ISO;
      const inB = g[b] >= BLOB_ISO;
      if (inA === inB) {
        continue;
      }
      const t = (BLOB_ISO - g[a]) / (g[b] - g[a]);
      vx += CORNER[a][0] + (CORNER[b][0] - CORNER[a][0]) * t;
      vy += CORNER[a][1] + (CORNER[b][1] - CORNER[a][1]) * t;
      vz += CORNER[a][2] + (CORNER[b][2] - CORNER[a][2]) * t;
      count++;
    }
    this.cellVert[this.idx(i, j, k)] = positions.length / 3;
    positions.push(
      BLOB_MIN[0] + (i + vx / count) * BLOB_CELL,
      BLOB_MIN[1] + (j + vy / count) * BLOB_CELL,
      BLOB_MIN[2] + (k + vz / count) * BLOB_CELL,
    );
  }

  private connectFaces(indices: number[]): void {
    for (let k = 0; k < this.nz - 1; k++) {
      for (let j = 0; j < this.ny - 1; j++) {
        for (let i = 0; i < this.nx - 1; i++) {
          const inside = this.field[this.idx(i, j, k)] >= BLOB_ISO;
          if (i > 0 && j > 0 && inside !== this.field[this.idx(i, j, k + 1)] >= BLOB_ISO) {
            this.quad(indices, this.cv(i, j, k), this.cv(i - 1, j, k), this.cv(i - 1, j - 1, k), this.cv(i, j - 1, k));
          }
          if (i > 0 && k > 0 && inside !== this.field[this.idx(i, j + 1, k)] >= BLOB_ISO) {
            this.quad(indices, this.cv(i, j, k), this.cv(i, j, k - 1), this.cv(i - 1, j, k - 1), this.cv(i - 1, j, k));
          }
          if (j > 0 && k > 0 && inside !== this.field[this.idx(i + 1, j, k)] >= BLOB_ISO) {
            this.quad(indices, this.cv(i, j, k), this.cv(i, j - 1, k), this.cv(i, j - 1, k - 1), this.cv(i, j, k - 1));
          }
        }
      }
    }
  }

  private quad(indices: number[], a: number, b: number, c: number, d: number): void {
    if (a < 0 || b < 0 || c < 0 || d < 0) {
      return;
    }
    indices.push(a, b, c, a, c, d);
  }

  private smoothNormals(positions: number[], indices: number[]): number[] {
    const normals = new Array(positions.length).fill(0);
    for (let t = 0; t < indices.length; t += 3) {
      const i0 = indices[t] * 3;
      const i1 = indices[t + 1] * 3;
      const i2 = indices[t + 2] * 3;
      const ux = positions[i1] - positions[i0];
      const uy = positions[i1 + 1] - positions[i0 + 1];
      const uz = positions[i1 + 2] - positions[i0 + 2];
      const vx = positions[i2] - positions[i0];
      const vy = positions[i2 + 1] - positions[i0 + 1];
      const vz = positions[i2 + 2] - positions[i0 + 2];
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      for (const base of [i0, i1, i2]) {
        normals[base] += nx;
        normals[base + 1] += ny;
        normals[base + 2] += nz;
      }
    }
    for (let n = 0; n < normals.length; n += 3) {
      const len = Math.hypot(normals[n], normals[n + 1], normals[n + 2]) || 1;
      normals[n] /= len;
      normals[n + 1] /= len;
      normals[n + 2] /= len;
    }
    return normals;
  }

  private cv(i: number, j: number, k: number): number {
    return this.cellVert[this.idx(i, j, k)];
  }

  private idx(i: number, j: number, k: number): number {
    return (k * this.ny + j) * this.nx + i;
  }

  private clamp(v: number, n: number): number {
    return Math.min(n - 1, Math.max(0, Math.round(v)));
  }
}
