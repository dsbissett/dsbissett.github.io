import { Injectable } from '@angular/core';

@Injectable()
export class VolumetricTexturesVolumeService {
  public create(
    gl: WebGL2RenderingContext,
    size: number,
    pointCount: number,
    seed: number,
  ): WebGLTexture {
    const texture = gl.createTexture();
    if (!texture) {
      throw new Error('Failed to allocate 3D texture.');
    }

    const data = this.generateWorleyField(size, pointCount, seed);

    gl.bindTexture(gl.TEXTURE_3D, texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage3D(
      gl.TEXTURE_3D,
      0,
      gl.RGBA,
      size,
      size,
      size,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      data,
    );
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.REPEAT);
    gl.bindTexture(gl.TEXTURE_3D, null);

    return texture;
  }

  private generateWorleyField(size: number, pointCount: number, seed: number): Uint8Array {
    const points = this.generateFeaturePoints(pointCount, size, seed);
    const halfDiagonal = Math.sqrt(3 * size * size) * 0.5;
    const data = new Uint8Array(size * size * size * 4);

    for (let z = 0; z < size; z++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const distance = this.nearestWrappedDistance(x, y, z, points, size);
          const value = this.sRgbEncodeByte(Math.min(1, distance / halfDiagonal));
          const offset = ((z * size + y) * size + x) * 4;
          data[offset] = value;
          data[offset + 1] = value;
          data[offset + 2] = value;
          data[offset + 3] = 255;
        }
      }
    }
    return data;
  }

  private generateFeaturePoints(pointCount: number, size: number, seed: number): Float32Array {
    const points = new Float32Array(pointCount * 3);
    for (let i = 0; i < pointCount; i++) {
      points[i * 3] = this.hashUnit(i, 0, 0, seed) * size;
      points[i * 3 + 1] = this.hashUnit(i, 1, 0, seed) * size;
      points[i * 3 + 2] = this.hashUnit(i, 2, 0, seed) * size;
    }
    return points;
  }

  private nearestWrappedDistance(
    x: number,
    y: number,
    z: number,
    points: Float32Array,
    size: number,
  ): number {
    const half = size * 0.5;
    let minSquared = Infinity;
    for (let i = 0; i < points.length; i += 3) {
      let dx = Math.abs(x - points[i]);
      let dy = Math.abs(y - points[i + 1]);
      let dz = Math.abs(z - points[i + 2]);
      if (dx > half) dx = size - dx;
      if (dy > half) dy = size - dy;
      if (dz > half) dz = size - dz;
      const squared = dx * dx + dy * dy + dz * dz;
      if (squared < minSquared) {
        minSquared = squared;
      }
    }
    return Math.sqrt(minSquared);
  }

  private hashUnit(a: number, b: number, c: number, seed: number): number {
    const lo = (a >>> 0) & 0xffff;
    const hi = (b >>> 0) & 0xffff;
    const mixed =
      (((lo | (hi << 16)) >>> 0) ^
        Math.imul(c >>> 0, 2654435761) ^
        (seed >>> 0)) >>>
      0;
    return this.pcgHash(mixed) / 4294967296;
  }

  private pcgHash(input: number): number {
    let state = (Math.imul(input >>> 0, 747796405) + 2891336453) >>> 0;
    const rot = ((state >>> 28) + 4) >>> 0;
    let value = ((state >>> rot) ^ state) >>> 0;
    value = Math.imul(value, 277803737) >>> 0;
    return ((value >>> 22) ^ value) >>> 0;
  }

  private sRgbEncodeByte(linear: number): number {
    const encoded =
      linear <= 0.0031308
        ? 12.92 * linear
        : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.floor(encoded * 255)));
  }
}
