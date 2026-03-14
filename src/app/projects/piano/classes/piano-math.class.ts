export class PianoMath {
  static clamp01(v: number): number {
    return Math.max(0, Math.min(1, v));
  }

  static fract(v: number): number {
    return v - Math.floor(v);
  }

  static hash01(v: number): number {
    return PianoMath.fract(Math.sin(v * 12.9898 + 78.233) * 43758.5453123);
  }

  static roundedRectPath(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number,
  ): void {
    const r = Math.max(0, Math.min(radius, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  static hslToHex(h: number, sPct: number, lPct: number): string {
    const hue = (((h % 360) + 360) % 360) / 360;
    const sat = PianoMath.clamp01(sPct / 100);
    const lig = PianoMath.clamp01(lPct / 100);

    if (sat === 0) {
      const v = Math.round(lig * 255)
        .toString(16)
        .padStart(2, '0');
      return `#${v}${v}${v}`;
    }

    const q = lig < 0.5 ? lig * (1 + sat) : lig + sat - lig * sat;
    const p = 2 * lig - q;

    const r = Math.round(PianoMath.hue2rgb(p, q, hue + 1 / 3) * 255)
      .toString(16)
      .padStart(2, '0');
    const g = Math.round(PianoMath.hue2rgb(p, q, hue) * 255)
      .toString(16)
      .padStart(2, '0');
    const b = Math.round(PianoMath.hue2rgb(p, q, hue - 1 / 3) * 255)
      .toString(16)
      .padStart(2, '0');

    return `#${r}${g}${b}`;
  }

  private static hue2rgb(p: number, q: number, t: number): number {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  }
}
