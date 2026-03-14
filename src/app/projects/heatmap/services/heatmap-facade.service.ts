import { Injectable, effect, inject } from '@angular/core';

import { HeatmapPoint } from '../interfaces/heatmap-point.interface';
import { HeatmapRenderParameters } from '../interfaces/heatmap-render-parameters.interface';
import { HeatmapSeverity } from '../types/heatmap-severity.type';
import { HeatmapCanvasService } from './heatmap-canvas.service';
import { HeatmapParametersService } from './heatmap-parameters.service';
import { HeatmapPointCollectionService } from './heatmap-point-collection.service';
import { HeatmapPointGeneratorService } from './heatmap-point-generator.service';
import { HeatmapRendererService } from './heatmap-renderer.service';

@Injectable()
export class HeatmapFacadeService {
  private readonly canvasService = inject(HeatmapCanvasService);
  private readonly parametersService = inject(HeatmapParametersService);
  private readonly pointCollection = inject(HeatmapPointCollectionService);
  private readonly pointGenerator = inject(HeatmapPointGeneratorService);
  private readonly renderer = inject(HeatmapRendererService);
  private readonly renderEffect = effect(() => {
    const context = this.canvasService.canvasContext();

    if (!context) {
      return;
    }

    this.renderer.render(
      context,
      this.canvasService.canvasSize(),
      this.parametersService.parameters(),
      this.pointCollection.points()
    );
  });

  public readonly formulaText = this.parametersService.formulaText;
  public readonly parameters = this.parametersService.parameters;
  public readonly pointCount = this.pointCollection.pointCount;

  public addPointFromClick(event: MouseEvent): void {
    const position = this.canvasService.getCanvasPosition(event);
    const point: HeatmapPoint = {
      ...position,
      severity: this.getSeverityFromClick(event),
    };

    this.pointCollection.addPoint(point);
  }

  public clearPoints(): void {
    this.pointCollection.clearPoints();
  }

  public destroy(): void {
    this.canvasService.disconnect();
    this.renderEffect.destroy();
  }

  public getSeverityFromClick(event: MouseEvent): HeatmapSeverity {
    if (event.shiftKey) {
      return 'felony';
    }

    return 'misdemeanor';
  }

  public handleResize(): void {
    if (!this.canvasService.canvasContext()) {
      return;
    }

    this.canvasService.resize();
  }

  public initialize(canvas: HTMLCanvasElement): void {
    this.canvasService.connect(canvas);
    this.canvasService.resize();
    this.regeneratePoints();
  }

  public regeneratePoints(): void {
    const size = this.canvasService.canvasSize();

    if (size.width === 0 || size.height === 0) {
      return;
    }

    this.pointCollection.replacePoints(this.pointGenerator.generatePoints(size));
  }

  public updateParameter(
    parameter: keyof HeatmapRenderParameters,
    rawValue: string
  ): void {
    this.parametersService.updateParameter(parameter, rawValue);
  }
}
