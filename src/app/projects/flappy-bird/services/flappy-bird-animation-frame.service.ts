import { Injectable } from '@angular/core';

type FrameCallback = (deltaMs: number) => void;

@Injectable()
export class FlappyBirdAnimationFrameService {
  private callback: FrameCallback | null = null;
  private frameId: number | null = null;
  private lastTimestamp = 0;

  public start(callback: FrameCallback): void {
    if (this.frameId !== null) {
      return;
    }

    this.callback = callback;
    this.lastTimestamp = performance.now();
    this.frameId = requestAnimationFrame((timestamp) => this.tick(timestamp));
  }

  public stop(): void {
    if (this.frameId === null) {
      return;
    }

    cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.callback = null;
  }

  private tick(timestamp: number): void {
    if (!this.callback) {
      return;
    }

    const deltaMs = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    this.callback(deltaMs);
    this.frameId = requestAnimationFrame((nextTimestamp) =>
      this.tick(nextTimestamp)
    );
  }
}
