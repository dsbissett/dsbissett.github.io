import { ClothPoint } from './cloth-point.class';

const MIN_DISTANCE = 0.000001;

export class ClothConstraint {
  public constructor(
    private readonly start: ClothPoint,
    private readonly end: ClothPoint,
    private readonly length: number
  ) {}

  public appendPath(context: CanvasRenderingContext2D): void {
    context.moveTo(this.start.x, this.start.y);
    context.lineTo(this.end.x, this.end.y);
  }

  public resolve(tearDistance: number): void {
    const dx = this.start.x - this.end.x;
    const dy = this.start.y - this.end.y;
    const distance = Math.hypot(dx, dy) || MIN_DISTANCE;

    if (distance > tearDistance) {
      this.start.removeConstraint(this);
      return;
    }

    const difference = (distance - this.length) / distance;
    const offsetX = dx * 0.5 * difference;
    const offsetY = dy * 0.5 * difference;

    if (!this.start.pinned) {
      this.start.x -= offsetX;
      this.start.y -= offsetY;
    }

    if (!this.end.pinned) {
      this.end.x += offsetX;
      this.end.y += offsetY;
    }
  }
}
