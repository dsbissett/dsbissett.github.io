import { Injectable } from '@angular/core';
import confetti, { CreateTypes, Shape } from 'canvas-confetti';

import { PianoMath } from '../classes/piano-math.class';

@Injectable()
export class PianoImpactFxService {
  private sparkBurstFx: CreateTypes | null = null;
  private sparkLineShape: Shape | null = null;
  private canvasElement: HTMLCanvasElement | null = null;

  init(impactFxCanvas: HTMLCanvasElement): void {
    this.canvasElement = impactFxCanvas;
    this.createBurstFx();
    this.createLineShape();
  }

  emit(px: number, py: number, hue: number, chaosFactor: number, impactFactor: number): void {
    if (!this.sparkBurstFx || !this.canvasElement) return;

    const w = Math.max(1, this.canvasElement.clientWidth);
    const h = Math.max(1, this.canvasElement.clientHeight);
    const ox = PianoMath.clamp01(px / w);
    const oy = PianoMath.clamp01(py / h);
    const chaos = PianoMath.clamp01(chaosFactor);
    const intensity = PianoMath.clamp01(impactFactor);

    this.emitPrimaryBurst(ox, oy, hue, chaos, intensity);
    this.emitSecondaryBurst(ox, oy, hue, chaos, intensity);
  }

  reset(): void {
    if (this.sparkBurstFx && typeof (this.sparkBurstFx as any).reset === 'function') {
      (this.sparkBurstFx as any).reset();
    }
  }

  private createBurstFx(): void {
    if (!this.canvasElement) return;
    try {
      this.sparkBurstFx = confetti.create(this.canvasElement, {
        resize: true,
        useWorker: true,
        disableForReducedMotion: true,
      });
    } catch (err) {
      console.warn('Impact spark FX disabled:', err);
      this.sparkBurstFx = null;
    }
  }

  private createLineShape(): void {
    if (typeof confetti.shapeFromPath === 'function') {
      this.sparkLineShape = confetti.shapeFromPath({
        path: 'M0 0 L2 0 L2 16 L0 16 Z',
      });
    }
  }

  private emitPrimaryBurst(ox: number, oy: number, hue: number, chaos: number, intensity: number): void {
    if (!this.sparkBurstFx) return;

    const spread = 14 + chaos * 40;
    const count = Math.max(10, Math.round(12 + chaos * 56 + intensity * 22));
    const colors = this.getColors(hue);
    const shapes = this.sparkLineShape ? [this.sparkLineShape, 'circle' as const] : ['circle' as const];

    this.sparkBurstFx({
      origin: { x: ox, y: oy },
      angle: 90 + (Math.random() - 0.5) * (18 + chaos * 22),
      spread,
      particleCount: count,
      startVelocity: 22 + chaos * 36 + intensity * 30,
      gravity: 0.58 + (1 - chaos) * 0.75,
      drift: (Math.random() - 0.5) * (0.9 + chaos * 2.0),
      scalar: 0.42 + chaos * 0.72,
      ticks: Math.round(60 + chaos * 90),
      decay: 0.9 - chaos * 0.06,
      colors,
      shapes,
    });
  }

  private emitSecondaryBurst(ox: number, oy: number, hue: number, chaos: number, intensity: number): void {
    if (!this.sparkBurstFx) return;

    const spread = 14 + chaos * 40;
    const count = Math.max(10, Math.round(12 + chaos * 56 + intensity * 22));
    const colors = this.getColors(hue);
    const shapes = this.sparkLineShape ? [this.sparkLineShape] : ['circle' as const];
    const baseVelocity = 22 + chaos * 36 + intensity * 30;
    const baseGravity = 0.58 + (1 - chaos) * 0.75;
    const baseTicks = Math.round(60 + chaos * 90);

    this.sparkBurstFx({
      origin: {
        x: PianoMath.clamp01(ox + (Math.random() - 0.5) * 0.012),
        y: PianoMath.clamp01(oy + (Math.random() - 0.5) * 0.006),
      },
      angle: 90 + (Math.random() - 0.5) * (10 + chaos * 26),
      spread: Math.max(8, spread * 0.52),
      particleCount: Math.max(8, Math.round(count * (0.42 + chaos * 0.26))),
      startVelocity: baseVelocity * (1.06 + chaos * 0.26),
      gravity: Math.max(0.36, baseGravity - (0.12 + chaos * 0.15)),
      drift: (Math.random() - 0.5) * (1.4 + chaos * 2.8),
      scalar: 0.36 + chaos * 0.86,
      ticks: Math.round(baseTicks * (1.08 + chaos * 0.14)),
      decay: 0.91 - chaos * 0.05,
      colors: [colors[2], colors[0]],
      shapes,
    });
  }

  private getColors(hue: number): string[] {
    return [
      PianoMath.hslToHex(hue, 100, 78),
      PianoMath.hslToHex(hue + 12, 100, 70),
      PianoMath.hslToHex(hue - 10, 100, 84),
    ];
  }
}
