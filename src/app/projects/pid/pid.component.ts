import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  viewChild,
} from '@angular/core';

import { PidControllerParameters } from './interfaces/pid-controller-parameters.interface';
import { PidNonIdealParameters } from './interfaces/pid-non-ideal-parameters.interface';
import { PidPlantParameters } from './interfaces/pid-plant-parameters.interface';
import { PidPresetName } from './types/pid-preset-name.type';
import { PidSetpointMode } from './types/pid-setpoint-mode.type';
import { PidCanvasService } from './services/pid-canvas.service';
import { PidChartRendererService } from './services/pid-chart-renderer.service';
import { PidControllerService } from './services/pid-controller.service';
import { PidDelayService } from './services/pid-delay.service';
import { PidFacadeService } from './services/pid-facade.service';
import { PidFormatService } from './services/pid-format.service';
import { PidHistoryService } from './services/pid-history.service';
import { PidMathService } from './services/pid-math.service';
import { PidMetricsService } from './services/pid-metrics.service';
import { PidNoiseService } from './services/pid-noise.service';
import { PidParametersService } from './services/pid-parameters.service';
import { PidPlantService } from './services/pid-plant.service';
import { PidSetpointService } from './services/pid-setpoint.service';
import { PidSimulationRendererService } from './services/pid-simulation-renderer.service';
import { PidStateService } from './services/pid-state.service';

@Component({
  selector: 'app-pid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    PidCanvasService,
    PidChartRendererService,
    PidControllerService,
    PidDelayService,
    PidFacadeService,
    PidFormatService,
    PidHistoryService,
    PidMathService,
    PidMetricsService,
    PidNoiseService,
    PidParametersService,
    PidPlantService,
    PidSetpointService,
    PidSimulationRendererService,
    PidStateService,
  ],
  templateUrl: './pid.component.html',
  styleUrl: './pid.component.scss',
})
export class PidComponent implements AfterViewInit, OnDestroy {
  private readonly simulationCanvas =
    viewChild.required<ElementRef<HTMLCanvasElement>>('simulationCanvas');
  private readonly timeCanvas =
    viewChild.required<ElementRef<HTMLCanvasElement>>('timeCanvas');
  private readonly controlCanvas =
    viewChild.required<ElementRef<HTMLCanvasElement>>('controlCanvas');
  private readonly facade = inject(PidFacadeService);

  protected readonly displayValues = this.facade.displayValues;
  protected readonly metricsDisplay = this.facade.metricsDisplay;
  protected readonly parameters = this.facade.parameters;
  protected readonly running = this.facade.running;

  public ngAfterViewInit(): void {
    this.facade.initialize(
      this.simulationCanvas().nativeElement,
      this.timeCanvas().nativeElement,
      this.controlCanvas().nativeElement
    );
  }

  public ngOnDestroy(): void {
    this.facade.destroy();
  }

  protected applyPreset(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    this.facade.applyPreset(target.value as PidPresetName);
  }

  protected centerSetpoint(): void {
    this.facade.centerSetpoint();
  }

  protected handleControllerInput(
    parameter: keyof PidControllerParameters,
    event: Event
  ): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.facade.updateControllerParameter(parameter, target.value);
  }

  protected handleNonIdealNumberInput(
    parameter: keyof PidNonIdealParameters,
    event: Event
  ): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.facade.updateNonIdealNumber(parameter, target.value);
  }

  protected handleNonIdealToggle(
    parameter: keyof PidNonIdealParameters,
    event: Event
  ): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.facade.toggleNonIdeal(parameter, target.checked);
  }

  protected handlePlantInput(
    parameter: keyof PidPlantParameters,
    event: Event
  ): void {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.facade.updatePlantParameter(parameter, target.value);
  }

  protected handleSetpointMode(event: Event): void {
    const target = event.target;

    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    this.facade.setSetpointMode(target.value as PidSetpointMode);
  }

  protected kick(): void {
    this.facade.kick();
  }

  protected reset(): void {
    this.facade.reset();
  }

  protected toggleRunning(): void {
    this.facade.toggleRunning();
  }

  protected handlePointerDown(event: PointerEvent): void {
    this.facade.handlePointerDown(event, this.simulationCanvas().nativeElement);
  }

  protected handlePointerMove(event: PointerEvent): void {
    this.facade.handlePointerMove(event, this.simulationCanvas().nativeElement);
  }

  protected handlePointerUp(event: PointerEvent): void {
    this.facade.handlePointerUp(event, this.simulationCanvas().nativeElement);
  }
}
