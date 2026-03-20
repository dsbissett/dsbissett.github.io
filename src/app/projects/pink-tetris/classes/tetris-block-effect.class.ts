export class TetrisBlockEffect {
  public speedY: number;
  public wingPhase: number;
  public wobblePhase: number;
  public rotation: number;
  public opacity: number;

  private readonly wingSpeed: number;
  private readonly wobbleSpeed: number;
  private readonly wobbleAmplitude: number;

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
    this.wingPhase = Math.random() * Math.PI * 2;
    this.wingSpeed = 0.18 + Math.random() * 0.12;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 0.04 + Math.random() * 0.03;
    this.wobbleAmplitude = 0.8 + Math.random() * 1.2;
    this.rotation = Math.atan2(initialSpeedY, speedX);
    this.opacity = 1;
  }

  public update(): void {
    this.wingPhase += this.wingSpeed;
    this.wobblePhase += this.wobbleSpeed;
    this.x += this.speedX + Math.sin(this.wobblePhase) * this.wobbleAmplitude;
    this.y += this.speedY;
    this.speedY += this.gravity;
    this.rotation += (this.speedX > 0 ? 0.008 : -0.008);
    this.opacity = Math.max(0, this.opacity - 0.001);
  }

  public isOffScreen(canvasHeight: number): boolean {
    return this.y < -this.size * 2 || this.y > canvasHeight;
  }
}
