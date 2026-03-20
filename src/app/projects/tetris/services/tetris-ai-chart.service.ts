import { Injectable } from '@angular/core';

/** Number of data points visible at once. */
const CHART_WINDOW_SIZE = 50;
/** Fixed interval (ms) between chart ticks — the chart's own clock. */
const TICK_INTERVAL_MS = 120;
/** Window size for the rolling average. */
const ROLLING_AVG_WINDOW = 20;
const PADDING = 28;
const GRID_COLOR = 'rgba(255,255,255,.08)';
const REWARD_COLOR = '#9ece6a';
const TREND_COLOR = '#7aa2f7';

@Injectable()
export class TetrisAiChartService {
  private rewards: number[] = [];
  private trend: number[] = [];

  /** Queued reward values from gameplay — consumed one per tick. */
  private pendingRewards: number[] = [];

  /** Last plotted values (repeated as flat line when no data is queued). */
  private lastReward = 0;
  private lastTrend = 0;

  /** All raw rewards received so far, used to compute rolling average. */
  private allRewards: number[] = [];

  private lastTickTime = 0;
  private started = false;

  private rewardCtx: CanvasRenderingContext2D | null = null;
  private trendCtx: CanvasRenderingContext2D | null = null;

  public initialize(
    rewardCanvas: HTMLCanvasElement,
    trendCanvas: HTMLCanvasElement,
  ): void {
    this.rewardCtx = this.setupCanvas(rewardCanvas);
    this.trendCtx = this.setupCanvas(trendCanvas);
  }

  /** Queue a data point from gameplay. Consumed by the chart's own clock. */
  public pushEntry(reward: number, _penalty: number): void {
    this.pendingRewards.push(reward);

    if (!this.started) {
      this.started = true;
      this.lastTickTime = performance.now();
    }
  }

  /** No-op — chart scrolls on its own clock. */
  public markGameEnd(): void {}

  public render(): void {
    if (this.started) {
      this.advanceTicks();
    }

    const rewardVisible = this.getVisibleSlice(this.rewards);
    const trendVisible = this.getVisibleSlice(this.trend);
    if (this.rewardCtx) {
      this.renderChart(this.rewardCtx, rewardVisible, REWARD_COLOR, 'Net Reward');
    }
    if (this.trendCtx) {
      this.renderChart(this.trendCtx, trendVisible, TREND_COLOR, `Avg Reward (${ROLLING_AVG_WINDOW})`);
    }
  }

  public reset(): void {
    this.rewards = [];
    this.trend = [];
    this.pendingRewards = [];
    this.allRewards = [];
    this.lastReward = 0;
    this.lastTrend = 0;
    this.lastTickTime = 0;
    this.started = false;
  }

  public destroy(): void {
    this.rewardCtx = null;
    this.trendCtx = null;
  }

  /**
   * Advance the chart's own clock. For each elapsed tick interval,
   * consume one queued value or repeat the last value (flat line).
   */
  private advanceTicks(): void {
    const now = performance.now();
    while (now - this.lastTickTime >= TICK_INTERVAL_MS) {
      this.lastTickTime += TICK_INTERVAL_MS;

      if (this.pendingRewards.length > 0) {
        this.lastReward = this.pendingRewards.shift()!;
        this.allRewards.push(this.lastReward);
        this.lastTrend = this.computeRollingAvg();
      }

      this.rewards.push(this.lastReward);
      this.trend.push(this.lastTrend);
    }

    // Trim to prevent unbounded memory growth
    if (this.rewards.length > CHART_WINDOW_SIZE * 2) {
      this.rewards = this.rewards.slice(this.rewards.length - CHART_WINDOW_SIZE);
      this.trend = this.trend.slice(this.trend.length - CHART_WINDOW_SIZE);
    }

    // Keep allRewards bounded (only need the last ROLLING_AVG_WINDOW entries)
    if (this.allRewards.length > ROLLING_AVG_WINDOW * 2) {
      this.allRewards = this.allRewards.slice(-ROLLING_AVG_WINDOW);
    }
  }

  private computeRollingAvg(): number {
    const data = this.allRewards;
    if (data.length === 0) return 0;
    const window = data.slice(-ROLLING_AVG_WINDOW);
    return window.reduce((s, v) => s + v, 0) / window.length;
  }

  private getVisibleSlice(data: number[]): number[] {
    if (data.length <= CHART_WINDOW_SIZE) {
      return data;
    }
    return data.slice(data.length - CHART_WINDOW_SIZE);
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
