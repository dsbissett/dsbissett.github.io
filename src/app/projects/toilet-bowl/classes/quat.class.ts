export type Quaternion = readonly [number, number, number, number];

/** Minimal quaternion helpers for tumbling mud clods. Stored as [x, y, z, w]. */
export class Quat {
  public static identity(): Quaternion {
    return [0, 0, 0, 1];
  }

  public static random(): Quaternion {
    const u = Math.random();
    const v = Math.random();
    const w = Math.random();
    const a = Math.sqrt(1 - u);
    const b = Math.sqrt(u);
    return Quat.normalize([
      a * Math.sin(2 * Math.PI * v),
      a * Math.cos(2 * Math.PI * v),
      b * Math.sin(2 * Math.PI * w),
      b * Math.cos(2 * Math.PI * w),
    ]);
  }

  public static fromAxisAngle(ax: number, ay: number, az: number, angle: number): Quaternion {
    const h = angle * 0.5;
    const s = Math.sin(h);
    return [ax * s, ay * s, az * s, Math.cos(h)];
  }

  public static multiply(a: Quaternion, b: Quaternion): Quaternion {
    return [
      a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
      a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
      a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
      a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
    ];
  }

  public static normalize(q: Quaternion): Quaternion {
    const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
  }

  /** Advances orientation `q` by angular velocity `spin` (axis × rate) over `dt`. */
  public static integrate(q: Quaternion, spin: readonly [number, number, number], dt: number): Quaternion {
    const rate = Math.hypot(spin[0], spin[1], spin[2]);
    if (rate < 1e-5) {
      return q;
    }
    const dq = Quat.fromAxisAngle(spin[0] / rate, spin[1] / rate, spin[2] / rate, rate * dt);
    return Quat.normalize(Quat.multiply(dq, q));
  }

  /** Rotation taking unit vector `a` onto unit vector `b`. */
  public static fromUnitVectors(
    a: readonly [number, number, number],
    b: readonly [number, number, number],
  ): Quaternion {
    const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    if (d > 0.9999) {
      return Quat.identity();
    }
    if (d < -0.9999) {
      return [1, 0, 0, 0];
    }
    const cx = a[1] * b[2] - a[2] * b[1];
    const cy = a[2] * b[0] - a[0] * b[2];
    const cz = a[0] * b[1] - a[1] * b[0];
    return Quat.normalize([cx, cy, cz, 1 + d]);
  }
}
