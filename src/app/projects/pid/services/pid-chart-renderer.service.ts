import { Injectable, inject } from '@angular/core';

import { PID_THEME } from '../constants/pid-theme.constant';
import { PidDrawRange } from '../interfaces/pid-draw-range.interface';
import { PidHistorySeries } from '../interfaces/pid-history-series.interface';
import { PidMathService } from './pid-math.service';

@Injectable()
export class PidChartRendererService {
  private readonly mathService = inject(PidMathService);

  public renderControlChart(
    context: CanvasRenderingContext2D,
    history: PidHistorySeries,
    saturationEnabled: boolean,
    actuatorLimit: number
  ): void {
    const range = this.createRange([
      ...history.control,
      ...history.proportional,
      ...history.integral,
      ...history.derivative,
    ]);

    this.clear(context);
    this.drawGrid(context, 40, 10, 6);
    this.drawAxisLabels(context, 'Control / Terms', '');
    this.drawZeroLine(context, range);
    this.plot(context, history.control, range, PID_THEME.cyan, 2.4);
    this.plot(context, history.proportional, range, 'rgba(187,154,247,.95)', 1.6);
    this.plot(context, history.integral, range, 'rgba(255,155,209,.95)', 1.6);
    this.plot(context, history.derivative, range, 'rgba(224,175,104,.95)', 1.6);

    if (!saturationEnabled) {
      return;
    }

    this.drawHorizontalLine(context, actuatorLimit, range, 'rgba(125,207,255,.25)');
    this.drawHorizontalLine(
      context,
      -actuatorLimit,
      range,
      'rgba(125,207,255,.25)'
    );
  }

  public renderTimeChart(
    context: CanvasRenderingContext2D,
    history: PidHistorySeries
  ): void {
    const range = this.createRange([
      ...history.setpoint,
      ...history.position,
      ...history.error,
    ]);

    this.clear(context);
    this.drawGrid(context, 40, 10, 6);
    this.drawAxisLabels(context, 'Position (m)', 'History ~10s');
    this.drawZeroLine(context, range);
    this.plot(context, history.setpoint, range, PID_THEME.accent, 2.4);
    this.plot(context, history.position, range, PID_THEME.good, 2.4);
    this.plot(context, history.error, range, PID_THEME.bad, 1.8);
  }

  private clear(context: CanvasRenderingContext2D): void {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  }

  private createRange(values: readonly number[]): PidDrawRange {
    return this.mathService.createRange(Math.min(...values), Math.max(...values));
  }

  private drawAxisLabels(
    context: CanvasRenderingContext2D,
    leftLabel: string,
    rightLabel: string
  ): void {
    context.save();
    context.fillStyle = 'rgba(233,236,255,.8)';
    context.font = '12px ui-sans-serif, system-ui';
    context.fillText(leftLabel, 12, 18);

    if (rightLabel) {
      context.fillText(
        rightLabel,
        context.canvas.width - context.measureText(rightLabel).width - 12,
        18
      );
    }

    context.restore();
  }

  private drawGrid(
    context: CanvasRenderingContext2D,
    padding: number,
    xDivisions: number,
    yDivisions: number
  ): void {
    const xStart = padding;
    const xEnd = context.canvas.width - padding;
    const yStart = padding;
    const yEnd = context.canvas.height - padding;

    context.save();
    context.strokeStyle = PID_THEME.grid;
    context.lineWidth = 1;
    this.drawVerticalLines(context, xStart, xEnd, yStart, yEnd, xDivisions);
    this.drawHorizontalLines(context, xStart, xEnd, yStart, yEnd, yDivisions);
    context.restore();
  }

  private drawHorizontalLine(
    context: CanvasRenderingContext2D,
    value: number,
    range: PidDrawRange,
    color: string
  ): void {
    const y = this.getMappedY(context, value, range, 40);

    context.save();
    context.strokeStyle = color;
    context.lineWidth = 1.5;
    context.setLineDash([6, 6]);
    context.beginPath();
    context.moveTo(40, y);
    context.lineTo(context.canvas.width - 40, y);
    context.stroke();
    context.restore();
  }

  private drawHorizontalLines(
    context: CanvasRenderingContext2D,
    xStart: number,
    xEnd: number,
    yStart: number,
    yEnd: number,
    divisions: number
  ): void {
    for (let index = 0; index <= divisions; index += 1) {
      const y = yStart + (yEnd - yStart) * (index / divisions);

      context.beginPath();
      context.moveTo(xStart, y);
      context.lineTo(xEnd, y);
      context.stroke();
    }
  }

  private drawVerticalLines(
    context: CanvasRenderingContext2D,
    xStart: number,
    xEnd: number,
    yStart: number,
    yEnd: number,
    divisions: number
  ): void {
    for (let index = 0; index <= divisions; index += 1) {
      const x = xStart + (xEnd - xStart) * (index / divisions);

      context.beginPath();
      context.moveTo(x, yStart);
      context.lineTo(x, yEnd);
      context.stroke();
    }
  }

  private drawZeroLine(
    context: CanvasRenderingContext2D,
    range: PidDrawRange
  ): void {
    if (!(range.minimum < 0 && range.maximum > 0)) {
      return;
    }

    const y = this.getMappedY(context, 0, range, 40);

    context.save();
    context.strokeStyle = 'rgba(255,255,255,.18)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(40, y);
    context.lineTo(context.canvas.width - 40, y);
    context.stroke();
    context.restore();
  }

  private getMappedY(
    context: CanvasRenderingContext2D,
    value: number,
    range: PidDrawRange,
    padding: number
  ): number {
    const yStart = padding;
    const yEnd = context.canvas.height - padding;

    return (
      yEnd -
      ((value - range.minimum) / (range.maximum - range.minimum)) * (yEnd - yStart)
    );
  }

  private plot(
    context: CanvasRenderingContext2D,
    series: readonly number[],
    range: PidDrawRange,
    color: string,
    lineWidth: number
  ): void {
    if (series.length < 2) {
      return;
    }

    context.save();
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    context.beginPath();
    context.moveTo(this.getMappedX(context, 0, series.length, 40), this.getMappedY(context, series[0], range, 40));

    for (let index = 1; index < series.length; index += 1) {
      context.lineTo(
        this.getMappedX(context, index, series.length, 40),
        this.getMappedY(context, series[index], range, 40)
      );
    }

    context.stroke();
    context.restore();
  }

  private getMappedX(
    context: CanvasRenderingContext2D,
    index: number,
    length: number,
    padding: number
  ): number {
    const xStart = padding;
    const xEnd = context.canvas.width - padding;

    return xStart + (xEnd - xStart) * (index / (length - 1));
  }
}
