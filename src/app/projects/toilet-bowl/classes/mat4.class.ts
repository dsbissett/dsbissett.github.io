import { Quaternion } from './quat.class';

export type Vec3 = readonly [number, number, number];

/**
 * Minimal column-major 4x4 matrix helpers for the toilet viewer camera.
 * Only the operations the renderer needs are implemented.
 */
export class Mat4 {
  public static identity(): Float32Array {
    const out = new Float32Array(16);
    out[0] = 1;
    out[5] = 1;
    out[10] = 1;
    out[15] = 1;
    return out;
  }

  /** Model matrix from position, orientation quaternion and a per-axis scale. */
  public static compose(pos: Vec3, q: Quaternion, scale: Vec3): Float32Array {
    const [x, y, z, w] = q;
    const [sx, sy, sz] = scale;
    const xx = x * x;
    const yy = y * y;
    const zz = z * z;
    const xy = x * y;
    const xz = x * z;
    const yz = y * z;
    const wx = w * x;
    const wy = w * y;
    const wz = w * z;

    const out = new Float32Array(16);
    out[0] = (1 - 2 * (yy + zz)) * sx;
    out[1] = 2 * (xy + wz) * sx;
    out[2] = 2 * (xz - wy) * sx;
    out[4] = 2 * (xy - wz) * sy;
    out[5] = (1 - 2 * (xx + zz)) * sy;
    out[6] = 2 * (yz + wx) * sy;
    out[8] = 2 * (xz + wy) * sz;
    out[9] = 2 * (yz - wx) * sz;
    out[10] = (1 - 2 * (xx + yy)) * sz;
    out[12] = pos[0];
    out[13] = pos[1];
    out[14] = pos[2];
    out[15] = 1;
    return out;
  }

  public static perspective(fovY: number, aspect: number, near: number, far: number): Float32Array {
    const f = 1 / Math.tan(fovY / 2);
    const nf = 1 / (near - far);
    const out = new Float32Array(16);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[14] = 2 * far * near * nf;
    return out;
  }

  public static lookAt(eye: Vec3, center: Vec3, up: Vec3): Float32Array {
    const z = Mat4.normalize(Mat4.sub(eye, center));
    const x = Mat4.normalize(Mat4.cross(up, z));
    const y = Mat4.cross(z, x);
    const out = new Float32Array(16);
    out[0] = x[0];
    out[1] = y[0];
    out[2] = z[0];
    out[4] = x[1];
    out[5] = y[1];
    out[6] = z[1];
    out[8] = x[2];
    out[9] = y[2];
    out[10] = z[2];
    out[12] = -Mat4.dot(x, eye);
    out[13] = -Mat4.dot(y, eye);
    out[14] = -Mat4.dot(z, eye);
    out[15] = 1;
    return out;
  }

  public static multiply(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(16);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[k * 4 + row] * b[col * 4 + k];
        }
        out[col * 4 + row] = sum;
      }
    }
    return out;
  }

  private static sub(a: Vec3, b: Vec3): Vec3 {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  private static cross(a: Vec3, b: Vec3): Vec3 {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }

  private static dot(a: Vec3, b: Vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  private static normalize(v: Vec3): Vec3 {
    const len = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / len, v[1] / len, v[2] / len];
  }
}
