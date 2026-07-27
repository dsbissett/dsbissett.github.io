import { Injectable } from '@angular/core';

import { MeshData } from '../interfaces/mesh-data.interface';
import {
  BOWL_DARK,
  CHROME,
  PORCELAIN,
  PORCELAIN_SHADOW,
  Rgb,
} from '../constants/toilet-palette.constant';
import {
  LID_RX,
  LID_RZ,
  LID_THICK,
  SEAT_HOLE_RX,
  SEAT_HOLE_RZ,
  SEAT_RX,
  SEAT_RZ,
  SEAT_THICK,
} from '../constants/toilet-physics.constant';

interface ProfilePoint {
  readonly r: number;
  readonly y: number;
  readonly color: Rgb;
}

interface OutlinePoint {
  readonly x: number;
  readonly z: number;
  readonly nx: number;
  readonly nz: number;
}

interface MutableMesh {
  positions: number[];
  normals: number[];
  colors: number[];
  indices: number[];
}

/**
 * Builds the classic two-piece toilet (oval bowl on a pedestal, rounded tank,
 * seat + lid raised against the tank) and a grid floor, all as world-space meshes.
 */
@Injectable()
export class ToiletGeometryService {
  private readonly radialSegments = 64;
  private readonly bowlScaleZ = 1.35;

  public buildToilet(): MeshData {
    const parts: MeshData[] = [
      this.buildBowl(),
      this.buildTank(),
      this.buildTankLid(),
      this.buildHandle(),
    ];
    return this.mergeMeshes(parts);
  }

  /** Seat plate in hinge-local space: hinge edge on the local X axis at z=0, extending +z. */
  public buildSeatPlate(): MeshData {
    const plate = this.buildEllipsePlate(SEAT_RX, SEAT_RZ, SEAT_THICK, SEAT_HOLE_RX, SEAT_HOLE_RZ, PORCELAIN, true);
    return this.translateMesh(plate, 0, 0, SEAT_RZ);
  }

  /** Lid plate in hinge-local space (solid). */
  public buildLidPlate(): MeshData {
    const plate = this.buildEllipsePlate(LID_RX, LID_RZ, LID_THICK, 0, 0, PORCELAIN, false);
    return this.translateMesh(plate, 0, 0, LID_RZ);
  }

  /** Flat, jagged splatter decal (unit radius, in the local XZ plane) — a liquid splat mark. */
  public buildSplatDecal(): MeshData {
    const white: Rgb = [1, 1, 1];
    const seg = 24;
    const mesh = this.emptyMesh();
    const center = this.pushVertex(mesh, 0, 0, 0, white, [0, 1, 0]);
    const ring: number[] = [];
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const r = 0.55 + 0.45 * Math.abs(Math.sin(a * 3 + 1)) * (0.6 + 0.4 * Math.sin(a * 7));
      ring.push(this.pushVertex(mesh, Math.cos(a) * r, 0, Math.sin(a) * r, white, [0, 1, 0]));
    }
    for (let i = 0; i < seg; i++) {
      mesh.indices.push(center, ring[i], ring[(i + 1) % seg]);
    }
    return mesh;
  }

  /**
   * A set of distinct, irregular lumpy clod meshes (unit-ish radius, white). Each
   * missile picks one and stretches it per-axis, so no two clods share a shape.
   */
  public buildClods(count: number): MeshData[] {
    const clods: MeshData[] = [];
    for (let i = 0; i < count; i++) {
      clods.push(this.buildClod());
    }
    return clods;
  }

  private buildClod(): MeshData {
    const lat = 9;
    const lon = 12;
    const white: Rgb = [1, 1, 1];
    const mesh = this.emptyMesh();
    const octaves = this.clodOctaves();
    const amp = 0.12 + Math.random() * 0.08;

    for (let i = 0; i <= lat; i++) {
      const phi = (i / lat) * Math.PI;
      for (let j = 0; j <= lon; j++) {
        const theta = (j / lon) * Math.PI * 2;
        let d = 0;
        for (const o of octaves) {
          d += o.w * Math.sin(o.fp * phi + o.pp) * Math.cos(o.ft * theta + o.pt);
        }
        const r = Math.max(0.45, 1 + amp * d);
        const nx = Math.sin(phi) * Math.cos(theta);
        const ny = Math.cos(phi);
        const nz = Math.sin(phi) * Math.sin(theta);
        this.pushVertex(mesh, nx * r, ny * r, nz * r, white);
      }
    }

    const cols = lon + 1;
    for (let i = 0; i < lat; i++) {
      for (let j = 0; j < lon; j++) {
        const a = i * cols + j;
        const b = (i + 1) * cols + j;
        mesh.indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }

    this.applySmoothNormals(mesh);
    return mesh;
  }

  private clodOctaves(): { fp: number; ft: number; pp: number; pt: number; w: number }[] {
    const octaves = [];
    for (let k = 0; k < 4; k++) {
      octaves.push({
        fp: 1 + Math.floor(Math.random() * 4),
        ft: 1 + Math.floor(Math.random() * 4),
        pp: Math.random() * Math.PI * 2,
        pt: Math.random() * Math.PI * 2,
        w: (0.5 + Math.random()) / (k + 1),
      });
    }
    return octaves;
  }

  public buildFloor(): MeshData {
    const f = 12;
    const positions = [-f, 0, -f, f, 0, -f, f, 0, f, -f, 0, f];
    const normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
    const colors = new Array(12).fill(0);
    const indices = [0, 1, 2, 0, 2, 3];
    return { positions, normals, colors, indices };
  }

  // --- Toilet parts ---------------------------------------------------------

  private buildBowl(): MeshData {
    const profile: ProfilePoint[] = [
      { r: 0.0, y: 0.005, color: PORCELAIN },
      { r: 0.32, y: 0.005, color: PORCELAIN },
      { r: 0.35, y: 0.04, color: PORCELAIN },
      { r: 0.33, y: 0.12, color: PORCELAIN },
      { r: 0.3, y: 0.22, color: PORCELAIN },
      { r: 0.32, y: 0.3, color: PORCELAIN },
      { r: 0.37, y: 0.38, color: PORCELAIN },
      { r: 0.4, y: 0.44, color: PORCELAIN },
      { r: 0.435, y: 0.47, color: PORCELAIN },
      { r: 0.445, y: 0.49, color: PORCELAIN },
      { r: 0.44, y: 0.505, color: PORCELAIN },
      { r: 0.42, y: 0.515, color: PORCELAIN },
      { r: 0.39, y: 0.517, color: PORCELAIN },
      { r: 0.36, y: 0.51, color: PORCELAIN_SHADOW },
      { r: 0.335, y: 0.495, color: PORCELAIN_SHADOW },
      { r: 0.3, y: 0.47, color: PORCELAIN_SHADOW },
      { r: 0.24, y: 0.4, color: PORCELAIN_SHADOW },
      { r: 0.15, y: 0.34, color: BOWL_DARK },
      { r: 0.09, y: 0.31, color: BOWL_DARK },
      { r: 0.0, y: 0.305, color: BOWL_DARK },
    ];
    return this.buildRevolution(profile, 1, this.bowlScaleZ);
  }

  private buildTank(): MeshData {
    const tank = this.buildRoundedPrism(0.34, 0.13, 0.36, 0.5, 0.05, 6, PORCELAIN);
    return this.translateMesh(tank, 0, 0, -0.42);
  }

  private buildTankLid(): MeshData {
    const lid = this.buildRoundedPrism(0.36, 0.15, 0.04, 0.86, 0.05, 6, PORCELAIN);
    return this.translateMesh(lid, 0, 0, -0.42);
  }

  private buildHandle(): MeshData {
    const handle = this.buildBox(0.08, 0.03, 0.05, CHROME);
    return this.translateMesh(handle, -0.2, 0.8, -0.27);
  }

  // --- Primitive builders ---------------------------------------------------

  private buildRevolution(profile: ProfilePoint[], scaleX: number, scaleZ: number): MeshData {
    const cols = this.radialSegments + 1;
    const mesh = this.emptyMesh();

    for (let j = 0; j < profile.length; j++) {
      const point = profile[j];
      for (let i = 0; i < cols; i++) {
        const a = (i / this.radialSegments) * Math.PI * 2;
        this.pushVertex(
          mesh,
          point.r * Math.cos(a) * scaleX,
          point.y,
          point.r * Math.sin(a) * scaleZ,
          point.color,
        );
      }
    }

    for (let j = 0; j < profile.length - 1; j++) {
      for (let i = 0; i < this.radialSegments; i++) {
        const a = j * cols + i;
        const b = (j + 1) * cols + i;
        const c = (j + 1) * cols + i + 1;
        const d = j * cols + i + 1;
        mesh.indices.push(a, b, d, b, c, d);
      }
    }

    this.applySmoothNormals(mesh);
    return mesh;
  }

  private buildRoundedPrism(
    halfW: number,
    halfD: number,
    height: number,
    y0: number,
    corner: number,
    cornerSeg: number,
    color: Rgb,
  ): MeshData {
    const outline = this.roundedRectOutline(halfW, halfD, corner, cornerSeg);
    const mesh = this.emptyMesh();
    const yTop = y0 + height;

    // Side walls.
    for (let i = 0; i < outline.length; i++) {
      const p = outline[i];
      const q = outline[(i + 1) % outline.length];
      this.pushQuad(
        mesh,
        [p.x, y0, p.z],
        [p.x, yTop, p.z],
        [q.x, yTop, q.z],
        [q.x, y0, q.z],
        [p.nx, 0, p.nz],
        color,
      );
    }

    this.pushCap(mesh, outline, yTop, 1, color);
    this.pushCap(mesh, outline, y0, -1, color);
    return mesh;
  }

  private buildBox(w: number, h: number, d: number, color: Rgb): MeshData {
    const x = w / 2;
    const y = h / 2;
    const z = d / 2;
    const mesh = this.emptyMesh();
    const faces: readonly [number[], number[], number[], number[], number[]][] = [
      [[x, -y, -z], [x, y, -z], [x, y, z], [x, -y, z], [1, 0, 0]],
      [[-x, -y, z], [-x, y, z], [-x, y, -z], [-x, -y, -z], [-1, 0, 0]],
      [[-x, y, -z], [-x, y, z], [x, y, z], [x, y, -z], [0, 1, 0]],
      [[-x, -y, z], [-x, -y, -z], [x, -y, -z], [x, -y, z], [0, -1, 0]],
      [[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z], [0, 0, 1]],
      [[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z], [0, 0, -1]],
    ];
    for (const [p0, p1, p2, p3, n] of faces) {
      this.pushQuad(mesh, p0, p1, p2, p3, n, color);
    }
    return mesh;
  }

  private buildEllipsePlate(
    rx: number,
    rz: number,
    thickness: number,
    holeRx: number,
    holeRz: number,
    color: Rgb,
    hasHole: boolean,
  ): MeshData {
    const mesh = this.emptyMesh();
    const t = thickness / 2;
    const seg = 72;

    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2;
      const a1 = ((i + 1) / seg) * Math.PI * 2;
      const outer0 = this.ellipse(rx, rz, a0);
      const outer1 = this.ellipse(rx, rz, a1);
      const n0: number[] = [Math.cos(a0), 0, Math.sin(a0)];

      if (hasHole) {
        const inner0 = this.ellipse(holeRx, holeRz, a0);
        const inner1 = this.ellipse(holeRx, holeRz, a1);
        this.pushQuad(mesh, [inner0[0], t, inner0[1]], [outer0[0], t, outer0[1]], [outer1[0], t, outer1[1]], [inner1[0], t, inner1[1]], [0, 1, 0], color);
        this.pushQuad(mesh, [inner1[0], -t, inner1[1]], [outer1[0], -t, outer1[1]], [outer0[0], -t, outer0[1]], [inner0[0], -t, inner0[1]], [0, -1, 0], color);
        this.pushQuad(mesh, [inner0[0], -t, inner0[1]], [inner0[0], t, inner0[1]], [inner1[0], t, inner1[1]], [inner1[0], -t, inner1[1]], [-Math.cos(a0), 0, -Math.sin(a0)], color);
      } else {
        this.pushTriangle(mesh, [0, t, 0], [outer0[0], t, outer0[1]], [outer1[0], t, outer1[1]], [0, 1, 0], color);
        this.pushTriangle(mesh, [0, -t, 0], [outer1[0], -t, outer1[1]], [outer0[0], -t, outer0[1]], [0, -1, 0], color);
      }

      this.pushQuad(mesh, [outer0[0], -t, outer0[1]], [outer0[0], t, outer0[1]], [outer1[0], t, outer1[1]], [outer1[0], -t, outer1[1]], n0, color);
    }

    return mesh;
  }

  // --- Placement / transforms ----------------------------------------------

  private translateMesh(mesh: MeshData, dx: number, dy: number, dz: number): MeshData {
    const positions = mesh.positions.slice();
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] += dx;
      positions[i + 1] += dy;
      positions[i + 2] += dz;
    }
    return { ...mesh, positions };
  }

  // --- Mesh assembly helpers ------------------------------------------------

  private mergeMeshes(parts: MeshData[]): MeshData {
    const merged = this.emptyMesh();
    for (const part of parts) {
      const offset = merged.positions.length / 3;
      merged.positions.push(...part.positions);
      merged.normals.push(...part.normals);
      merged.colors.push(...part.colors);
      for (const index of part.indices) {
        merged.indices.push(index + offset);
      }
    }
    return merged;
  }

  private roundedRectOutline(
    halfW: number,
    halfD: number,
    r: number,
    seg: number,
  ): OutlinePoint[] {
    const centers: readonly [number, number][] = [
      [halfW - r, halfD - r],
      [-(halfW - r), halfD - r],
      [-(halfW - r), -(halfD - r)],
      [halfW - r, -(halfD - r)],
    ];
    const points: OutlinePoint[] = [];
    for (let corner = 0; corner < 4; corner++) {
      const [cx, cz] = centers[corner];
      for (let s = 0; s <= seg; s++) {
        const a = ((corner * seg + s) / (4 * seg)) * Math.PI * 2;
        const nx = Math.cos(a);
        const nz = Math.sin(a);
        points.push({ x: cx + r * nx, z: cz + r * nz, nx, nz });
      }
    }
    return points;
  }

  private pushCap(mesh: MutableMesh, outline: OutlinePoint[], y: number, dir: number, color: Rgb): void {
    const center = this.pushVertex(mesh, 0, y, 0, color, [0, dir, 0]);
    const ring: number[] = [];
    for (const p of outline) {
      ring.push(this.pushVertex(mesh, p.x, y, p.z, color, [0, dir, 0]));
    }
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      if (dir > 0) {
        mesh.indices.push(center, a, b);
      } else {
        mesh.indices.push(center, b, a);
      }
    }
  }

  private pushQuad(
    mesh: MutableMesh,
    p0: number[],
    p1: number[],
    p2: number[],
    p3: number[],
    normal: number[],
    color: Rgb,
  ): void {
    const a = this.pushVertex(mesh, p0[0], p0[1], p0[2], color, normal);
    const b = this.pushVertex(mesh, p1[0], p1[1], p1[2], color, normal);
    const c = this.pushVertex(mesh, p2[0], p2[1], p2[2], color, normal);
    const d = this.pushVertex(mesh, p3[0], p3[1], p3[2], color, normal);
    mesh.indices.push(a, b, c, a, c, d);
  }

  private pushTriangle(
    mesh: MutableMesh,
    p0: number[],
    p1: number[],
    p2: number[],
    normal: number[],
    color: Rgb,
  ): void {
    const a = this.pushVertex(mesh, p0[0], p0[1], p0[2], color, normal);
    const b = this.pushVertex(mesh, p1[0], p1[1], p1[2], color, normal);
    const c = this.pushVertex(mesh, p2[0], p2[1], p2[2], color, normal);
    mesh.indices.push(a, b, c);
  }

  private pushVertex(
    mesh: MutableMesh,
    x: number,
    y: number,
    z: number,
    color: Rgb,
    normal: number[] = [0, 0, 0],
  ): number {
    const index = mesh.positions.length / 3;
    mesh.positions.push(x, y, z);
    mesh.normals.push(normal[0], normal[1], normal[2]);
    mesh.colors.push(color[0], color[1], color[2]);
    return index;
  }

  private applySmoothNormals(mesh: MutableMesh): void {
    const normals = mesh.normals;
    for (let i = 0; i < normals.length; i++) {
      normals[i] = 0;
    }
    const p = mesh.positions;
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const i0 = mesh.indices[i] * 3;
      const i1 = mesh.indices[i + 1] * 3;
      const i2 = mesh.indices[i + 2] * 3;
      const ux = p[i1] - p[i0];
      const uy = p[i1 + 1] - p[i0 + 1];
      const uz = p[i1 + 2] - p[i0 + 2];
      const vx = p[i2] - p[i0];
      const vy = p[i2 + 1] - p[i0 + 1];
      const vz = p[i2 + 2] - p[i0 + 2];
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      this.addNormal(normals, i0, nx, ny, nz);
      this.addNormal(normals, i1, nx, ny, nz);
      this.addNormal(normals, i2, nx, ny, nz);
    }
    for (let i = 0; i < normals.length; i += 3) {
      const len = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1;
      normals[i] /= len;
      normals[i + 1] /= len;
      normals[i + 2] /= len;
    }
  }

  private addNormal(normals: number[], i: number, nx: number, ny: number, nz: number): void {
    normals[i] += nx;
    normals[i + 1] += ny;
    normals[i + 2] += nz;
  }

  private ellipse(rx: number, rz: number, a: number): [number, number] {
    return [rx * Math.cos(a), rz * Math.sin(a)];
  }

  private emptyMesh(): MutableMesh {
    return { positions: [], normals: [], colors: [], indices: [] };
  }
}
