export class FlappyPipe {
  private hasBeenScored = false;

  public constructor(
    public x: number,
    public readonly width: number,
    public readonly topHeight: number,
    public readonly bottomY: number,
    private readonly topPipeImage: HTMLImageElement,
    private readonly bottomPipeImage: HTMLImageElement,
    private readonly baseSpeed: number
  ) {}

  public draw(context: CanvasRenderingContext2D, gameHeight: number): void {
    context.drawImage(this.topPipeImage, this.x, 0, this.width, this.topHeight);
    context.drawImage(
      this.bottomPipeImage,
      this.x,
      this.bottomY,
      this.width,
      gameHeight - this.bottomY
    );
  }

  public isOffScreen(viewLeft: number): boolean {
    return this.x + this.width < viewLeft;
  }

  public tryMarkPassed(birdX: number): boolean {
    if (this.hasBeenScored || birdX <= this.x + this.width) {
      return false;
    }

    this.hasBeenScored = true;
    return true;
  }

  public update(speedFactor: number): void {
    this.x -= this.baseSpeed * speedFactor;
  }
}
