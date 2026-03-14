import { inject, Injectable } from '@angular/core';

import { PianoMath } from '../classes/piano-math.class';
import { PIANO_CONFIG } from '../constants/piano-config.constant';
import { PianoNotePosition } from '../interfaces/piano-note-position.interface';
import { PianoRollDrawContext } from '../interfaces/piano-roll-draw-context.interface';
import { PianoRollNote } from '../interfaces/piano-roll-note.interface';
import { PianoRollPalette } from '../interfaces/piano-roll-palette.interface';
import { PianoCanvasService } from './piano-canvas.service';
import { PianoImpactFxService } from './piano-impact-fx.service';
import { PianoKeyboardLayoutService } from './piano-keyboard-layout.service';

@Injectable()
export class PianoRollRendererService {
  private readonly canvasService = inject(PianoCanvasService);
  private readonly keyboardLayout = inject(PianoKeyboardLayoutService);
  private readonly impactFx = inject(PianoImpactFxService);
  private readonly impactBurstHistory = new Map<string, number>();
  private rollNotes: PianoRollNote[] = [];

  setRollNotes(notes: PianoRollNote[]): void {
    this.rollNotes = notes;
    this.impactBurstHistory.clear();
  }

  clearRollNotes(): void {
    this.rollNotes = [];
    this.impactBurstHistory.clear();
    this.impactFx.reset();
  }

  draw(currentMs: number): void {
    const ctx = this.canvasService.ctx;
    if (!ctx) return;

    const w = this.canvasService.cssWidth;
    const h = this.canvasService.cssHeight;
    ctx.clearRect(0, 0, w, h);
    this.drawLaneGrid(ctx, w, h);

    if (currentMs < 0 || !this.rollNotes.length) return;

    const drawCtx = this.createDrawContext(ctx, w, h, currentMs);
    this.drawAllNotes(drawCtx);
  }

  private createDrawContext(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    currentMs: number,
  ): PianoRollDrawContext {
    const hitY = h - 3;
    const pxPerMs = hitY / PIANO_CONFIG.rollLeadInMs;
    const palette = this.getRollPalette(currentMs);
    const gradient = this.createGlobalRollGradient(ctx, currentMs, hitY);
    return { ctx, w, h, hitY, pxPerMs, currentMs, palette, gradient };
  }

  private drawLaneGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const lanes = this.keyboardLayout.rollLaneXs;
    if (!lanes.length) return;

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const x of lanes) {
      const laneX = Math.round(x) + 0.5;
      ctx.moveTo(laneX, 0);
      ctx.lineTo(laneX, h);
    }
    ctx.stroke();
  }

  private drawAllNotes(drawCtx: PianoRollDrawContext): void {
    for (const note of this.rollNotes) {
      if (note.endMs < drawCtx.currentMs - 20) {
        this.impactBurstHistory.delete(this.impactKey(note));
        continue;
      }
      this.drawSingleNote(drawCtx, note);
    }
  }

  private drawSingleNote(drawCtx: PianoRollDrawContext, note: PianoRollNote): void {
    const layout = this.keyboardLayout.rollKeyLayout.get(note.midi);
    if (!layout) return;

    const pos = this.calculateNotePosition(drawCtx, note, layout.x, layout.w, layout.isBlack);
    if (pos.barHeight <= 0) return;

    this.drawNoteBody(drawCtx, pos);
    this.checkAndDrawContactEffects(drawCtx, note, pos);
  }

  private calculateNotePosition(
    drawCtx: PianoRollDrawContext,
    note: PianoRollNote,
    layoutX: number,
    layoutW: number,
    isBlack: boolean,
  ): PianoNotePosition {
    const rawTop = drawCtx.hitY - (note.endMs - drawCtx.currentMs) * drawCtx.pxPerMs;
    const rawBottom = drawCtx.hitY - (note.startMs - drawCtx.currentMs) * drawCtx.pxPerMs;
    const yTop = Math.max(0, rawTop);
    const yBottom = Math.min(drawCtx.hitY, rawBottom);
    const barHeight = yBottom - yTop;

    const inset = isBlack ? 1 : 0.5;
    const x = layoutX + inset;
    const barW = Math.max(2, layoutW - 2 * inset);
    const radius = Math.max(2, Math.min(9, barW * 0.22));

    return { x, yTop, yBottom, barW, barHeight, radius, rawTop, rawBottom };
  }

  private drawNoteBody(drawCtx: PianoRollDrawContext, pos: PianoNotePosition): void {
    this.drawBloom(drawCtx, pos);
    this.drawBlock(drawCtx, pos);
    this.drawGloss(drawCtx, pos);
  }

  private drawBloom(drawCtx: PianoRollDrawContext, pos: PianoNotePosition): void {
    drawCtx.ctx.save();
    drawCtx.ctx.globalCompositeOperation = 'lighter';
    drawCtx.ctx.shadowBlur = 16;
    drawCtx.ctx.shadowColor = 'rgba(255, 160, 120, 0.65)';
    drawCtx.ctx.fillStyle = drawCtx.gradient;
    PianoMath.roundedRectPath(drawCtx.ctx, pos.x, pos.yTop, pos.barW, pos.barHeight, pos.radius);
    drawCtx.ctx.fill();
    drawCtx.ctx.restore();
  }

  private drawBlock(drawCtx: PianoRollDrawContext, pos: PianoNotePosition): void {
    drawCtx.ctx.fillStyle = drawCtx.gradient;
    PianoMath.roundedRectPath(drawCtx.ctx, pos.x, pos.yTop, pos.barW, pos.barHeight, pos.radius);
    drawCtx.ctx.fill();
  }

  private drawGloss(drawCtx: PianoRollDrawContext, pos: PianoNotePosition): void {
    const glossH = Math.max(2, Math.min(10, pos.barHeight * 0.18));
    const gloss = drawCtx.ctx.createLinearGradient(pos.x, pos.yTop, pos.x, pos.yTop + glossH);
    gloss.addColorStop(0, 'rgba(255,255,255,0.42)');
    gloss.addColorStop(1, 'rgba(255,255,255,0.00)');
    drawCtx.ctx.fillStyle = gloss;
    PianoMath.roundedRectPath(
      drawCtx.ctx,
      pos.x + 0.5,
      pos.yTop + 0.5,
      Math.max(1, pos.barW - 1),
      glossH,
      Math.max(1, pos.radius * 0.7),
    );
    drawCtx.ctx.fill();
  }

  private checkAndDrawContactEffects(
    drawCtx: PianoRollDrawContext,
    note: PianoRollNote,
    pos: PianoNotePosition,
  ): void {
    const approachDistance = drawCtx.hitY - pos.rawBottom;
    const contactWindowPx = 28;
    const inApproach = approachDistance >= 0 && approachDistance <= contactWindowPx;
    const isHeld = drawCtx.currentMs >= note.startMs && drawCtx.currentMs <= note.endMs;

    if (!inApproach && !isHeld) return;

    const contactIntensity = this.calculateContactIntensity(drawCtx, note, approachDistance, contactWindowPx, inApproach, isHeld);
    const cx = pos.x + pos.barW / 2;
    const cy = drawCtx.hitY - 1;
    const glowHue = drawCtx.palette.bottomHue;

    drawCtx.ctx.save();
    drawCtx.ctx.globalCompositeOperation = 'lighter';

    this.drawContactHalo(drawCtx, cx, cy, pos.barW, glowHue, contactIntensity);
    this.drawStrikeLine(drawCtx, pos.x, pos.barW, glowHue, contactIntensity);
    this.drawContactFlash(drawCtx, pos, glowHue, contactIntensity);
    this.checkImpactBurst(drawCtx, note, pos, cx, glowHue, inApproach, approachDistance);

    if (isHeld) {
      this.drawSustainedShimmer(drawCtx, note, pos, cx, cy, glowHue, contactIntensity);
    }

    drawCtx.ctx.restore();
  }

  private calculateContactIntensity(
    drawCtx: PianoRollDrawContext,
    note: PianoRollNote,
    approachDistance: number,
    contactWindowPx: number,
    inApproach: boolean,
    isHeld: boolean,
  ): number {
    const approachIntensity = inApproach
      ? Math.pow(1 - approachDistance / contactWindowPx, 1.7)
      : 0;
    const attackElapsedMs = Math.max(0, drawCtx.currentMs - note.startMs);
    const attackBoost = Math.max(0, 1 - Math.min(1, attackElapsedMs / 180));
    const sustainIntensity = isHeld ? 0.42 + 0.38 * attackBoost * attackBoost : 0;
    return Math.max(0, Math.min(1, Math.max(approachIntensity, sustainIntensity)));
  }

  private drawContactHalo(
    drawCtx: PianoRollDrawContext,
    cx: number,
    cy: number,
    barW: number,
    glowHue: number,
    contactIntensity: number,
  ): void {
    const glowR = Math.max(16, barW * 2.9);
    const edgeHue = (glowHue + 14) % 360;

    const halo = drawCtx.ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
    halo.addColorStop(0.0, `hsla(${glowHue.toFixed(1)}, 100%, 78%, ${(1.05 * contactIntensity).toFixed(3)})`);
    halo.addColorStop(0.28, `hsla(${glowHue.toFixed(1)}, 98%, 64%, ${(0.78 * contactIntensity).toFixed(3)})`);
    halo.addColorStop(0.62, `hsla(${edgeHue.toFixed(1)}, 96%, 52%, ${(0.36 * contactIntensity).toFixed(3)})`);
    halo.addColorStop(1.0, `hsla(${glowHue.toFixed(1)}, 100%, 40%, 0.000)`);

    drawCtx.ctx.fillStyle = halo;
    drawCtx.ctx.beginPath();
    drawCtx.ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    drawCtx.ctx.fill();
  }

  private drawStrikeLine(
    drawCtx: PianoRollDrawContext,
    x: number,
    barW: number,
    glowHue: number,
    contactIntensity: number,
  ): void {
    drawCtx.ctx.fillStyle = `hsla(${glowHue.toFixed(1)}, 100%, 76%, ${(0.95 * contactIntensity).toFixed(3)})`;
    drawCtx.ctx.fillRect(x - 1, drawCtx.hitY - 2, barW + 2, 3);
  }

  private drawContactFlash(
    drawCtx: PianoRollDrawContext,
    pos: PianoNotePosition,
    glowHue: number,
    contactIntensity: number,
  ): void {
    const flashTop = Math.max(pos.yTop, drawCtx.hitY - Math.max(4, Math.min(24, pos.barHeight * 0.3 + 5)));
    const flashHeight = pos.yBottom - flashTop;
    if (flashHeight <= 0) return;

    const flash = drawCtx.ctx.createLinearGradient(pos.x, flashTop, pos.x, pos.yBottom);
    flash.addColorStop(0.0, `hsla(${glowHue.toFixed(1)}, 100%, 62%, ${(0.15 * contactIntensity).toFixed(3)})`);
    flash.addColorStop(1.0, `hsla(${glowHue.toFixed(1)}, 100%, 74%, ${(0.96 * contactIntensity).toFixed(3)})`);
    drawCtx.ctx.fillStyle = flash;
    PianoMath.roundedRectPath(drawCtx.ctx, pos.x, flashTop, pos.barW, flashHeight, Math.max(1, pos.radius * 0.5));
    drawCtx.ctx.fill();
  }

  private checkImpactBurst(
    drawCtx: PianoRollDrawContext,
    note: PianoRollNote,
    pos: PianoNotePosition,
    cx: number,
    glowHue: number,
    inApproach: boolean,
    approachDistance: number,
  ): void {
    const impactFactor = inApproach ? PianoMath.clamp01(1 - approachDistance / 15) : 0;
    if (impactFactor <= 0.02) return;

    const key = this.impactKey(note);
    const lastBurstMs = this.impactBurstHistory.get(key) ?? -Infinity;
    if (impactFactor <= 0.64 || drawCtx.currentMs - lastBurstMs <= 90) return;

    const noteDurationMs = Math.max(35, note.endMs - note.startMs);
    const longNoteFactor = PianoMath.clamp01((noteDurationMs - 120) / 680);
    const impactHeightFactor = PianoMath.clamp01((pos.barHeight - 18) / 95);
    const impactChaosFactor = PianoMath.clamp01(longNoteFactor * 0.72 + impactHeightFactor * 0.68);

    this.impactFx.emit(cx, drawCtx.hitY - 1, glowHue, impactChaosFactor, impactFactor);
    this.impactBurstHistory.set(key, drawCtx.currentMs);
  }

  private drawSustainedShimmer(
    drawCtx: PianoRollDrawContext,
    note: PianoRollNote,
    pos: PianoNotePosition,
    cx: number,
    cy: number,
    glowHue: number,
    contactIntensity: number,
  ): void {
    const noteDurationMs = Math.max(35, note.endMs - note.startMs);
    const longNoteFactor = PianoMath.clamp01((noteDurationMs - 120) / 680);
    const holdElapsedMs = Math.max(0, drawCtx.currentMs - note.startMs);
    const holdDevelop = PianoMath.clamp01(holdElapsedMs / Math.max(140, noteDurationMs * 0.26));
    const sustainChaos = longNoteFactor * holdDevelop;
    const sustainTurbulence = 0.35 + sustainChaos * 2.8;
    const particleCount = Math.max(3, Math.min(34, Math.round((pos.barW / 5.2 + 2) * (0.75 + longNoteFactor * 2.4))));

    for (let i = 0; i < particleCount; i++) {
      this.drawShimmerParticle(drawCtx, note, pos, cx, cy, glowHue, contactIntensity, i, sustainChaos, sustainTurbulence, longNoteFactor);
    }
  }

  private drawShimmerParticle(
    drawCtx: PianoRollDrawContext,
    note: PianoRollNote,
    pos: PianoNotePosition,
    cx: number,
    cy: number,
    glowHue: number,
    contactIntensity: number,
    i: number,
    sustainChaos: number,
    sustainTurbulence: number,
    longNoteFactor: number,
  ): void {
    const seed = note.midi * 97 + i * 131;
    const randA = PianoMath.hash01(seed * 0.61 + note.startMs * 0.0019);
    const randB = PianoMath.hash01(seed * 0.47 + (note.endMs - note.startMs) * 0.0027);
    const randC = PianoMath.hash01(seed * 0.31 + note.endMs * 0.0011);
    const t = drawCtx.currentMs * (0.0022 + randA * 0.0028) + seed * 0.00031 + note.startMs * 0.0009;
    const cycle = PianoMath.fract(t + randB);
    const rise = Math.pow(cycle, 0.8 + randC * 0.7);

    const gust = Math.sin(t * (16 + randA * 12) + randB * Math.PI * 2);
    const eddy = Math.cos(t * (23 + randB * 16) - randC * Math.PI * 2);
    const jitter = (PianoMath.hash01(seed * 1.91 + drawCtx.currentMs * (0.018 + randA * 0.011)) - 0.5) * (3 + sustainChaos * 18);
    const drift = gust * pos.barW * (0.2 + sustainChaos * 0.95) + eddy * pos.barW * (0.12 + sustainChaos * 0.65) + jitter;
    const px = cx + drift;
    const py = cy - 1 - rise * (18 + pos.barW * 0.72 + sustainChaos * 42) - Math.abs(eddy) * (2 + sustainChaos * 8);
    const pr = 0.6 + (seed % 5) * (0.12 + longNoteFactor * 0.08) + (1 - rise) * (1.2 + sustainChaos * 2.8);
    const pa = PianoMath.clamp01((0.1 + 0.28 * (1 - rise)) * contactIntensity * (0.72 + sustainChaos * 1.4));
    const sustainHue = glowHue + (seed % 13) - 6 + (gust + eddy) * 8 * sustainChaos;

    drawCtx.ctx.fillStyle = `hsla(${sustainHue.toFixed(1)}, 100%, ${(64 + 14 * (1 - rise)).toFixed(1)}%, ${pa.toFixed(3)})`;
    drawCtx.ctx.beginPath();
    drawCtx.ctx.arc(px, py, pr, 0, Math.PI * 2);
    drawCtx.ctx.fill();

    this.drawSparkLine(drawCtx, px, py, pr, gust, eddy, sustainHue, sustainChaos, sustainTurbulence, rise, pa, randA, randB, randC, i);
  }

  private drawSparkLine(
    drawCtx: PianoRollDrawContext,
    px: number,
    py: number,
    pr: number,
    gust: number,
    eddy: number,
    sustainHue: number,
    sustainChaos: number,
    sustainTurbulence: number,
    rise: number,
    pa: number,
    randA: number,
    randB: number,
    randC: number,
    i: number,
  ): void {
    if (sustainChaos <= 0.18 || (i % 3 !== 0 && randA <= 0.78)) return;

    const sparkLen = (3 + sustainChaos * 9 + randB * 5) * (0.65 + (1 - rise) * 0.75);
    const sx = px + gust * (1.2 + sustainTurbulence * 2.1) + (randC - 0.5) * 2.2;
    const sy = py - sparkLen - Math.abs(eddy) * (1.4 + sustainTurbulence * 2.8);

    drawCtx.ctx.strokeStyle = `hsla(${(sustainHue + 6).toFixed(1)}, 100%, 79%, ${(pa * 0.82).toFixed(3)})`;
    drawCtx.ctx.lineWidth = Math.max(0.5, pr * 0.48);
    drawCtx.ctx.beginPath();
    drawCtx.ctx.moveTo(px, py);
    drawCtx.ctx.lineTo(sx, sy);
    drawCtx.ctx.stroke();
  }

  private getRollPalette(currentMs: number): PianoRollPalette {
    const phase = currentMs * 0.015;
    const topHue = (((phase + 255) % 360) + 360) % 360;
    const midHue = (topHue + 52) % 360;
    const bottomHue = (topHue + 108) % 360;
    return { topHue, midHue, bottomHue };
  }

  private createGlobalRollGradient(
    ctx: CanvasRenderingContext2D,
    currentMs: number,
    hitY: number,
  ): CanvasGradient {
    const { topHue, midHue, bottomHue } = this.getRollPalette(currentMs);
    const grad = ctx.createLinearGradient(0, 0, 0, hitY);
    grad.addColorStop(0.0, `hsla(${topHue.toFixed(1)}, 95%, 70%, 0.98)`);
    grad.addColorStop(0.48, `hsla(${midHue.toFixed(1)}, 94%, 58%, 0.97)`);
    grad.addColorStop(1.0, `hsla(${bottomHue.toFixed(1)}, 92%, 48%, 0.96)`);
    return grad;
  }

  private impactKey(note: PianoRollNote): string {
    return `${note.midi}:${Math.round(note.startMs)}:${Math.round(note.endMs)}`;
  }
}
