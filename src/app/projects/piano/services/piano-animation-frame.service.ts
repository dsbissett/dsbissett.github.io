import { Injectable } from '@angular/core';

@Injectable()
export class PianoAnimationFrameService {
  private frameId = 0;

  start(callback: (nowMs: number) => void): void {
    this.stop();
    const loop = (nowMs: number): void => {
      callback(nowMs);
      this.frameId = requestAnimationFrame(loop);
    };
    this.frameId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }
}
