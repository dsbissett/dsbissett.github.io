import { Injectable, inject } from '@angular/core';

import { HeatmapCanvasSize } from '../interfaces/heatmap-canvas-size.interface';
import { HeatmapPoint } from '../interfaces/heatmap-point.interface';
import { HeatmapRenderParameters } from '../interfaces/heatmap-render-parameters.interface';
import { HeatmapSample } from '../interfaces/heatmap-sample.interface';
import { HeatmapColorService } from './heatmap-color.service';
import { HeatmapKdeService } from './heatmap-kde.service';
import { HeatmapPointAppearanceService } from './heatmap-point-appearance.service';

@Injectable()
export class HeatmapRendererService {
  private readonly colorService = inject(HeatmapColorService);
  private readonly kdeService = inject(HeatmapKdeService);
  private readonly pointAppearance = inject(HeatmapPointAppearanceService);

  public drawGrid(
    context: CanvasRenderingContext2D,
    size: HeatmapCanvasSize
  ): void {
    const step = 48;

    for (let x = 0; x <= size.width; x += step) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, size.height);
      context.stroke();
    }

    for (let y = 0; y <= size.height; y += step) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size.width, y);
      context.stroke();
    }
  }

  public drawHeatCells(
    context: CanvasRenderingContext2D,
    samples: readonly HeatmapSample[],
    gridStep: number,
    maxIntensity: number
  ): void {
    for (const sample of samples) {
      context.fillStyle = this.colorService.getFillStyle(
        sample.intensity / maxIntensity
      );
      context.fillRect(sample.x, sample.y, gridStep + 1, gridStep + 1);
    }
  }

  public drawPoint(
    context: CanvasRenderingContext2D,
    point: HeatmapPoint
  ): void {
    context.beginPath();
    context.arc(
      point.x,
      point.y,
      this.pointAppearance.getRadius(point.severity),
      0,
      Math.PI * 2
    );
    context.fillStyle = this.pointAppearance.getFillStyle(point.severity);
    context.strokeStyle = this.pointAppearance.getStrokeStyle(point.severity);
    context.lineWidth = 1.2;
    context.fill();
    context.stroke();
  }

  public drawVignette(
    context: CanvasRenderingContext2D,
    size: HeatmapCanvasSize
  ): void {
    const gradient = context.createRadialGradient(
      size.width * 0.5,
      size.height * 0.45,
      10,
      size.width * 0.5,
      size.height * 0.45,
      Math.max(size.width, size.height) * 0.7
    );

    gradient.addColorStop(0, 'rgba(255,255,255,0.05)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.35)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size.width, size.height);
  }

  public render(
    context: CanvasRenderingContext2D,
    size: HeatmapCanvasSize,
    parameters: HeatmapRenderParameters,
    points: readonly HeatmapPoint[]
  ): void {
    this.renderBackground(context, size);
    this.renderHeat(context, size, parameters, points);
    this.renderPoints(context, points);
    this.renderBorder(context, size);
  }

  public renderBackground(
    context: CanvasRenderingContext2D,
    size: HeatmapCanvasSize
  ): void {
    context.save();
    context.clearRect(0, 0, size.width, size.height);
    this.drawVignette(context, size);
    context.strokeStyle = 'rgba(255,255,255,0.06)';
    context.lineWidth = 1;
    this.drawGrid(context, size);
    context.restore();
  }

  public renderBorder(
    context: CanvasRenderingContext2D,
    size: HeatmapCanvasSize
  ): void {
    context.save();
    context.strokeStyle = 'rgba(255,255,255,0.10)';
    context.lineWidth = 1;
    context.strokeRect(0.5, 0.5, size.width - 1, size.height - 1);
    context.restore();
  }

  public renderHeat(
    context: CanvasRenderingContext2D,
    size: HeatmapCanvasSize,
    parameters: HeatmapRenderParameters,
    points: readonly HeatmapPoint[]
  ): void {
    if (points.length === 0) {
      return;
    }

    const samples = this.kdeService.createSamples(size, parameters, points);
    const maxIntensity = this.kdeService.getMaxIntensity(samples);

    if (maxIntensity <= 0) {
      return;
    }

    context.save();
    context.globalAlpha = parameters.opacity;
    this.drawHeatCells(context, samples, parameters.gridStep, maxIntensity);
    context.restore();
  }

  public renderPoints(
    context: CanvasRenderingContext2D,
    points: readonly HeatmapPoint[]
  ): void {
    context.save();

    for (const point of points) {
      this.drawPoint(context, point);
    }

    context.restore();
  }
}
