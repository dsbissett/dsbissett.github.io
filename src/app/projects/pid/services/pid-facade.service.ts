import { Injectable, inject } from '@angular/core';

import { PID_SIMULATION_SETTINGS } from '../constants/pid-simulation-settings.constant';
import { PidControlOutput } from '../interfaces/pid-control-output.interface';
import { PidHistoryEntry } from '../interfaces/pid-history-entry.interface';
import { PidNonIdealParameters } from '../interfaces/pid-non-ideal-parameters.interface';
import { PidControllerParameters } from '../interfaces/pid-controller-parameters.interface';
import { PidPlantParameters } from '../interfaces/pid-plant-parameters.interface';
import { PidPresetName } from '../types/pid-preset-name.type';
import { PidSetpointMode } from '../types/pid-setpoint-mode.type';
import { PidCanvasService } from './pid-canvas.service';
import { PidChartRendererService } from './pid-chart-renderer.service';
import { PidControllerService } from './pid-controller.service';
import { PidDelayService } from './pid-delay.service';
import { PidHistoryService } from './pid-history.service';
import { PidMetricsService } from './pid-metrics.service';
import { PidParametersService } from './pid-parameters.service';
import { PidPlantService } from './pid-plant.service';
import { PidSetpointService } from './pid-setpoint.service';
import { PidSimulationRendererService } from './pid-simulation-renderer.service';
import { PidStateService } from './pid-state.service';

@Injectable()
export class PidFacadeService {
  private readonly canvasService = inject(PidCanvasService);
  private readonly chartRenderer = inject(PidChartRendererService);
  private readonly controllerService = inject(PidControllerService);
  private readonly delayService = inject(PidDelayService);
  private readonly historyService = inject(PidHistoryService);
  private readonly metricsService = inject(PidMetricsService);
  private readonly parametersService = inject(PidParametersService);
  private readonly plantService = inject(PidPlantService);
  private readonly setpointService = inject(PidSetpointService);
  private readonly simulationRenderer = inject(PidSimulationRendererService);
  private readonly stateService = inject(PidStateService);
  private animationFrameId: number | null = null;

  public readonly displayValues = this.parametersService.displayValues;
  public readonly metricsDisplay = this.metricsService.displayValues;
  public readonly parameters = this.parametersService.parameters;
  public readonly running = this.stateService.running;

  public applyPreset(presetName: PidPresetName): void {
    this.parametersService.applyPreset(presetName);
    this.rebuildDelayState();
  }

  public centerSetpoint(): void {
    const previousValue = this.stateService.getSetpointState().value;

    this.stateService.getSetpointState().holdValue = 0;
    this.stateService.setSetpointValue(0);
    this.metricsService.startStepMetrics(
      this.stateService.getSimulationTime(),
      previousValue,
      0
    );
  }

  public destroy(): void {
    this.cancelFrame();
    this.canvasService.disconnect();
  }

  public handlePointerDown(
    event: PointerEvent,
    canvas: HTMLCanvasElement
  ): void {
    if (this.parameters().setpointMode !== 'drag') {
      return;
    }

    const previousValue = this.stateService.getSetpointState().value;
    const setpoint = this.setpointService.getSetpointFromPointer(event, canvas);

    this.stateService.setDragPointer(event.pointerId);
    canvas.setPointerCapture(event.pointerId);
    this.stateService.setSetpointValue(setpoint);
    this.metricsService.startStepMetrics(
      this.stateService.getSimulationTime(),
      previousValue,
      setpoint
    );
  }

  public handlePointerMove(
    event: PointerEvent,
    canvas: HTMLCanvasElement
  ): void {
    if (!this.stateService.getDragState().active) {
      return;
    }

    if (!this.stateService.hasDragPointer(event.pointerId)) {
      return;
    }

    if (this.parameters().setpointMode !== 'drag') {
      return;
    }

    this.stateService.setSetpointValue(
      this.setpointService.getSetpointFromPointer(event, canvas)
    );
  }

  public handlePointerUp(
    event: PointerEvent,
    canvas: HTMLCanvasElement
  ): void {
    if (!this.stateService.hasDragPointer(event.pointerId)) {
      return;
    }

    this.stateService.getDragState().active = false;
    this.stateService.getDragState().pointerId = null;

    if (!canvas.hasPointerCapture(event.pointerId)) {
      return;
    }

    canvas.releasePointerCapture(event.pointerId);
  }

  public initialize(
    simulationCanvas: HTMLCanvasElement,
    timeCanvas: HTMLCanvasElement,
    controlCanvas: HTMLCanvasElement
  ): void {
    this.canvasService.connect(simulationCanvas, timeCanvas, controlCanvas);
    this.reset();
    this.stateService.initializeFrameTime(performance.now());
    this.requestFrame();
  }

  public kick(): void {
    const direction = Math.random() < 0.5 ? -1 : 1;

    this.stateService.setKickVelocity(direction * (0.9 + Math.random() * 1.2));
  }

  public reset(): void {
    this.stateService.reset();
    this.historyService.reset();
    this.metricsService.reset();
    this.rebuildDelayState();
    this.render();
  }

  public setSetpointMode(setpointMode: PidSetpointMode): void {
    this.parametersService.setSetpointMode(setpointMode);
    this.setpointService.handleModeChange(
      setpointMode,
      this.stateService.getSetpointState(),
      this.stateService.getSimulationTime(),
      (fromValue, toValue) =>
        this.metricsService.startStepMetrics(
          this.stateService.getSimulationTime(),
          fromValue,
          toValue
        )
    );
  }

  public toggleNonIdeal(parameter: keyof PidNonIdealParameters, checked: boolean): void {
    this.parametersService.updateNonIdealToggle(parameter, checked);
    this.rebuildDelayStateIfNeeded(parameter);
  }

  public toggleRunning(): void {
    this.stateService.toggleRunning();
  }

  public updateControllerParameter(
    parameter: keyof PidControllerParameters,
    rawValue: string
  ): void {
    this.parametersService.updateControllerParameter(parameter, rawValue);
  }

  public updateNonIdealNumber(
    parameter: keyof PidNonIdealParameters,
    rawValue: string
  ): void {
    this.parametersService.updateNonIdealNumber(parameter, rawValue);
    this.rebuildDelayStateIfNeeded(parameter);
  }

  public updatePlantParameter(
    parameter: keyof PidPlantParameters,
    rawValue: string
  ): void {
    this.parametersService.updatePlantParameter(parameter, rawValue);
  }

  private cancelFrame(): void {
    if (this.animationFrameId === null) {
      return;
    }

    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }

  private createHistoryEntry(controlOutput: PidControlOutput): PidHistoryEntry {
    return {
      time: this.stateService.getSimulationTime(),
      setpoint: this.stateService.getSetpointState().value,
      position: this.stateService.getPlantState().position,
      error: controlOutput.error,
      control: controlOutput.control,
      proportional: controlOutput.proportional,
      integral: controlOutput.integral,
      derivative: controlOutput.derivative,
    };
  }

  private readonly frame = (frameTime: number): void => {
    const elapsed = this.stateService.updateFrameTime(
      frameTime,
      PID_SIMULATION_SETTINGS.elapsedCap
    );

    if (this.stateService.isRunning()) {
      this.runSimulation(elapsed);
    }

    this.render();
    this.requestFrame();
  };

  private rebuildDelayState(): void {
    const delayState = this.delayService.createDelayState(
      this.parameters().nonIdeal,
      PID_SIMULATION_SETTINGS.timeStep
    );

    this.stateService.setDelayState(
      delayState.measurementDelaySamples,
      delayState.measurementBuffer
    );
  }

  private rebuildDelayStateIfNeeded(
    parameter: keyof PidNonIdealParameters
  ): void {
    if (parameter !== 'delayEnabled' && parameter !== 'delayMs') {
      return;
    }

    this.rebuildDelayState();
  }

  private render(): void {
    const contexts = this.canvasService.getContexts();
    const history = this.historyService.readSeries();

    this.simulationRenderer.render(
      contexts.simulation,
      this.stateService.getPlantState(),
      this.stateService.getSetpointState().value
    );
    this.chartRenderer.renderTimeChart(contexts.time, history);
    this.chartRenderer.renderControlChart(
      contexts.control,
      history,
      this.parameters().nonIdeal.saturationEnabled,
      this.parameters().nonIdeal.actuatorLimit
    );
  }

  private requestFrame(): void {
    this.animationFrameId = requestAnimationFrame(this.frame);
  }

  private runSimulation(elapsed: number): void {
    this.stateService.updateAccumulator(elapsed);

    while (this.stateService.useAccumulatorStep(PID_SIMULATION_SETTINGS.timeStep)) {
      this.stepSimulation();
    }
  }

  private stepSimulation(): void {
    this.setpointService.updateSetpoint(
      this.parameters().setpointMode,
      this.stateService.getSetpointState(),
      this.stateService.getSimulationTime(),
      (fromValue, toValue) =>
        this.metricsService.startStepMetrics(
          this.stateService.getSimulationTime(),
          fromValue,
          toValue
        )
    );

    const measuredPosition = this.delayService.measurePosition(
      this.stateService.getPlantState().position,
      this.parameters().nonIdeal,
      this.stateService.getDelayState()
    );
    const controlOutput = this.controllerService.computeControl(
      this.parameters().controller,
      this.parameters().nonIdeal,
      this.stateService.getControllerState(),
      this.stateService.getSetpointState().value,
      measuredPosition,
      PID_SIMULATION_SETTINGS.timeStep
    );

    this.plantService.stepPlant(
      this.parameters().plant,
      this.stateService.getPlantState(),
      controlOutput.control,
      PID_SIMULATION_SETTINGS.timeStep,
      this.stateService.consumeKickVelocity()
    );
    this.historyService.pushEntry(this.createHistoryEntry(controlOutput));
    this.stateService.advanceSimulationTime(PID_SIMULATION_SETTINGS.timeStep);
    this.metricsService.update(
      this.stateService.getSimulationTime(),
      this.stateService.getPlantState().position
    );
  }
}
