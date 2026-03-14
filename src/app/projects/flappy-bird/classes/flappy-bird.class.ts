import { FlappyBirdSpriteFrame } from '../interfaces/flappy-bird-sprite-frame.interface';
import { FlappyBirdGameStatus } from '../types/flappy-bird-game-status.type';

export class FlappyBird {
  private frameCounter = 0;
  private frameIndex = 0;
  private lastJumpTime: number | null = null;

  public constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    private readonly image: HTMLImageElement,
    private readonly frames: readonly FlappyBirdSpriteFrame[],
    private readonly lift: number,
    private readonly baseGravity: number,
    private readonly damping: number
  ) {
    this.gravity = baseGravity;
  }

  public gravity: number;
  public velocity = 0;

  public draw(
    context: CanvasRenderingContext2D,
    gameStatus: FlappyBirdGameStatus
  ): void {
    const frame = this.frames[this.frameIndex];
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;

    context.save();
    context.translate(centerX, centerY);
    context.rotate(this.getAngle(gameStatus));
    context.drawImage(
      this.image,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      -this.width / 2,
      -this.height / 2,
      this.width,
      this.height
    );
    context.restore();
  }

  public jump(currentTime: number): void {
    this.velocity += this.lift;
    this.adjustHorizontalPosition(currentTime);
    this.lastJumpTime = currentTime;
  }

  public resetGravity(): void {
    this.gravity = this.baseGravity;
  }

  public setGameOverPhysics(): void {
    this.velocity = 0;
    this.gravity = 4;
  }

  public update(maxY: number, flapCadence: number): void {
    this.velocity += this.gravity;
    this.y += this.velocity;
    this.velocity *= this.damping;
    this.clampVerticalPosition(maxY);
    this.updateAnimationFrame(flapCadence);
  }

  private adjustHorizontalPosition(currentTime: number): void {
    if (this.lastJumpTime === null) {
      return;
    }

    const elapsedTime = currentTime - this.lastJumpTime;
    if (elapsedTime < 400) {
      this.x += 5;
      return;
    }

    if (elapsedTime > 800) {
      this.x -= 5;
    }
  }

  private clampVerticalPosition(maxY: number): void {
    if (this.y < 0) {
      this.y = 0;
      this.velocity = 0;
    }

    if (this.y > maxY) {
      this.y = maxY;
      this.velocity = 0;
    }
  }

  private getAngle(gameStatus: FlappyBirdGameStatus): number {
    if (gameStatus === 'gameOver') {
      return Math.PI / 2;
    }

    const normalizedVelocity = Math.max(-5, Math.min(5, this.velocity));
    return (normalizedVelocity / 5) * (Math.PI / 6);
  }

  private updateAnimationFrame(flapCadence: number): void {
    this.frameCounter += 1;
    if (this.frameCounter < flapCadence) {
      return;
    }

    this.frameCounter = 0;
    this.frameIndex = (this.frameIndex + 1) % this.frames.length;
  }
}
