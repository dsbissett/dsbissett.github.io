import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  viewChild,
} from '@angular/core';

import { HeatmapRenderParameters } from './interfaces/heatmap-render-parameters.interface';
import { HeatmapCanvasService } from './services/heatmap-canvas.service';
import { HeatmapColorService } from './services/heatmap-color.service';
import { HeatmapFacadeService } from './services/heatmap-facade.service';
import { HeatmapKdeService } from './services/heatmap-kde.service';
import { HeatmapParametersService } from './services/heatmap-parameters.service';
import { HeatmapPointAppearanceService } from './services/heatmap-point-appearance.service';
import { HeatmapPointCollectionService } from './services/heatmap-point-collection.service';
import { HeatmapPointGeneratorService } from './services/heatmap-point-generator.service';
import { HeatmapRendererService } from './services/heatmap-renderer.service';
import { HeatmapSeverityProfileService } from './services/heatmap-severity-profile.service';

@Component({
  selector: 'app-heatmap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    HeatmapCanvasService,
    HeatmapColorService,
    HeatmapFacadeService,
    HeatmapKdeService,
    HeatmapParametersService,
    HeatmapPointAppearanceService,
    HeatmapPointCollectionService,
    HeatmapPointGeneratorService,
    HeatmapRendererService,
    HeatmapSeverityProfileService,
  ],
  templateUrl: './heatmap.component.html',
  styleUrl: './heatmap.component.scss',
  host: {
    '(window:resize)': 'handleWindowResize()',
  },
})
export class HeatmapComponent implements AfterViewInit, OnDestroy {
  private readonly canvasElement =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly facade = inject(HeatmapFacadeService);

  protected readonly formulaText = this.facade.formulaText;
  protected readonly parameters = this.facade.parameters;
  protected readonly pointCount = this.facade.pointCount;

  public ngAfterViewInit(): void {
    this.facade.initialize(this.canvasElement().nativeElement);
  }

  public ngOnDestroy(): void {
    this.facade.destroy();
  }

  protected clearPoints(): void {
    this.facade.clearPoints();
  }

  protected handleCanvasClick(event: MouseEvent): void {
    this.facade.addPointFromClick(event);
  }

  protected handleParameterInput(
    parameter: keyof HeatmapRenderParameters,
    event: Event
  ): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.facade.updateParameter(parameter, target.value);
  }

  protected handleWindowResize(): void {
    this.facade.handleResize();
  }

  protected regeneratePoints(): void {
    this.facade.regeneratePoints();
  }
}
