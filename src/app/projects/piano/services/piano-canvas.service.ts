import { Injectable } from '@angular/core';

@Injectable()
export class PianoCanvasService {
  private noteRollCanvas: HTMLCanvasElement | null = null;
  private noteRollCtx: CanvasRenderingContext2D | null = null;

  get canvas(): HTMLCanvasElement | null {
    return this.noteRollCanvas;
  }

  get ctx(): CanvasRenderingContext2D | null {
    return this.noteRollCtx;
  }

  get cssWidth(): number {
    return Math.max(1, this.noteRollCanvas?.clientWidth ?? 1);
  }

  get cssHeight(): number {
    return Math.max(1, this.noteRollCanvas?.clientHeight ?? 1);
  }

  init(noteRollCanvas: HTMLCanvasElement): void {
    this.noteRollCanvas = noteRollCanvas;
    this.noteRollCtx = noteRollCanvas.getContext('2d');
  }

  resize(): void {
    if (!this.noteRollCanvas || !this.noteRollCtx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = this.cssWidth;
    const cssH = this.cssHeight;
    this.noteRollCanvas.width = Math.round(cssW * dpr);
    this.noteRollCanvas.height = Math.round(cssH * dpr);
    this.noteRollCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}
