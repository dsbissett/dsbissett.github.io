export class TetrisBlockEffect {
  public speedY: number;

  public constructor(
    public x: number,
    public y: number,
    public readonly color: string,
    public size: number,
    public readonly speedX: number,
    initialSpeedY: number,
    public readonly gravity: number
  ) {
    this.speedY = initialSpeedY;
  }

  public update(): void {
    this.x += this.speedX;
    this.y += this.speedY;
    this.speedY += this.gravity;
  }

  public isOffScreen(canvasHeight: number): boolean {
    return this.y > canvasHeight;
  }
}
