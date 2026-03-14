import { Injectable } from '@angular/core';

type FrameCallback = (deltaSeconds: number) => void;

@Injectable()
export class ClothAnimationFrameService {
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
    this.callback = null;
    this.frameId = null;
  }

  private tick(timestamp: number): void {
    if (!this.callback) {
      return;
    }

    const deltaSeconds = Math.min(1 / 30, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;
    this.callback(deltaSeconds);
    this.frameId = requestAnimationFrame((nextTimestamp) =>
      this.tick(nextTimestamp)
    );
  }
}
