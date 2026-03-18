import { Injectable } from '@angular/core';

const MAX_VISIBLE_GAMES = 3;
const PADDING = 28;
const GRID_COLOR = 'rgba(255,255,255,.08)';
const REWARD_COLOR = '#9ece6a';
const PENALTY_COLOR = '#f7768e';

@Injectable()
export class TetrisAiChartService {
  private rewards: number[] = [];
  private penalties: number[] = [];
  /** Indices marking the end of each completed game (exclusive). */
  private gameBoundaries: number[] = [];
  /** Fixed window size (in data points) once 3 games have completed. */
  private windowSize = 0;

  private rewardCtx: CanvasRenderingContext2D | null = null;
  private penaltyCtx: CanvasRenderingContext2D | null = null;

  public initialize(
    rewardCanvas: HTMLCanvasElement,
    penaltyCanvas: HTMLCanvasElement,
  ): void {
    this.rewardCtx = this.setupCanvas(rewardCanvas);
    this.penaltyCtx = this.setupCanvas(penaltyCanvas);
  }

  public pushEntry(reward: number, penalty: number): void {
    this.rewards.push(reward);
    this.penalties.push(penalty);
  }

  /** Mark the current game as complete and recalculate the rolling window. */
  public markGameEnd(): void {
    this.gameBoundaries.push(this.rewards.length);

    if (this.gameBoundaries.length >= MAX_VISIBLE_GAMES) {
      const len = this.gameBoundaries.length;
      // Window spans the last MAX_VISIBLE_GAMES completed games.
      this.windowSize =
        this.gameBoundaries[len - 1] - this.gameBoundaries[len - MAX_VISIBLE_GAMES];
    }

    // Trim data that can never be visible again (keep 3 boundaries).
    while (this.gameBoundaries.length > MAX_VISIBLE_GAMES) {
      const trimTo = this.gameBoundaries[0];
      this.rewards = this.rewards.slice(trimTo);
      this.penalties = this.penalties.slice(trimTo);
      this.gameBoundaries = this.gameBoundaries.slice(1).map((b) => b - trimTo);
    }
  }

  public render(): void {
    const rewardVisible = this.getVisibleSlice(this.rewards);
    const penaltyVisible = this.getVisibleSlice(this.penalties);
    if (this.rewardCtx) {
      this.renderChart(this.rewardCtx, rewardVisible, REWARD_COLOR, 'Reward');
    }
    if (this.penaltyCtx) {
      this.renderChart(this.penaltyCtx, penaltyVisible, PENALTY_COLOR, 'Penalty');
    }
  }

  public reset(): void {
    this.rewards = [];
    this.penalties = [];
    this.gameBoundaries = [];
    this.windowSize = 0;
  }

  /**
   * Returns the visible tail of a data array.
   * Before 3 games complete: returns everything (chart fills up).
   * After 3 games: returns the last `windowSize` points, scrolling
   * smoothly as each new point pushes the oldest one off the left.
   */
  private getVisibleSlice(data: number[]): number[] {
    if (this.windowSize === 0 || data.length <= this.windowSize) {
      return data;
    }
    return data.slice(data.length - this.windowSize);
  }

  public destroy(): void {
    this.rewardCtx = null;
    this.penaltyCtx = null;
  }

  private setupCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    return ctx;
  }

  private renderChart(
    ctx: CanvasRenderingContext2D,
    series: number[],
    color: string,
    label: string,
  ): void {
    const w = ctx.canvas.width / (window.devicePixelRatio || 1);
    const h = ctx.canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);
    this.drawGrid(ctx, w, h);
    this.drawLabel(ctx, label);

    if (series.length < 2) {
      return;
    }

    const { min, max } = this.createRange(series);
    this.drawZeroLine(ctx, w, h, min, max);
    this.drawRangeLabels(ctx, w, h, min, max);
    this.plot(ctx, series, w, h, min, max, color);
  }

  private createRange(series: number[]): { min: number; max: number } {
    let min = series[0];
    let max = series[0];

    for (let i = 1; i < series.length; i++) {
      if (series[i] < min) min = series[i];
      if (series[i] > max) max = series[i];
    }

    if (min === max) {
      return { min: min - 1, max: max + 1 };
    }

    const padding = 0.08 * (max - min);
    return { min: min - padding, max: max + padding };
  }

  private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const xStart = PADDING;
    const xEnd = w - PADDING;
    const yStart = PADDING;
    const yEnd = h - PADDING;

    ctx.save();
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;

    for (let i = 0; i <= 8; i++) {
      const x = xStart + (xEnd - xStart) * (i / 8);
      ctx.beginPath();
      ctx.moveTo(x, yStart);
      ctx.lineTo(x, yEnd);
      ctx.stroke();
    }

    for (let i = 0; i <= 4; i++) {
      const y = yStart + (yEnd - yStart) * (i / 4);
      ctx.beginPath();
      ctx.moveTo(xStart, y);
      ctx.lineTo(xEnd, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawLabel(ctx: CanvasRenderingContext2D, label: string): void {
    ctx.save();
    ctx.fillStyle = 'rgba(233,236,255,.7)';
    ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText(label, 8, 16);
    ctx.restore();
  }

  private drawRangeLabels(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    min: number,
    max: number,
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(233,236,255,.4)';
    ctx.font = '9px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(max.toFixed(2), w - 6, PADDING + 10);
    ctx.fillText(min.toFixed(2), w - 6, h - PADDING - 2);
    ctx.restore();
  }

  private drawZeroLine(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    min: number,
    max: number,
  ): void {
    if (!(min < 0 && max > 0)) {
      return;
    }

    const y = this.mapY(0, h, min, max);

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, y);
    ctx.lineTo(w - PADDING, y);
    ctx.stroke();
    ctx.restore();
  }

  private plot(
    ctx: CanvasRenderingContext2D,
    series: number[],
    w: number,
    h: number,
    min: number,
    max: number,
    color: string,
  ): void {
    const xStart = PADDING;
    const xEnd = w - PADDING;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xStart, this.mapY(series[0], h, min, max));

    for (let i = 1; i < series.length; i++) {
      const x = xStart + (xEnd - xStart) * (i / (series.length - 1));
      ctx.lineTo(x, this.mapY(series[i], h, min, max));
    }

    ctx.stroke();
    ctx.restore();
  }

  private mapY(value: number, h: number, min: number, max: number): number {
    const yStart = PADDING;
    const yEnd = h - PADDING;
    return yEnd - ((value - min) / (max - min)) * (yEnd - yStart);
  }
}
