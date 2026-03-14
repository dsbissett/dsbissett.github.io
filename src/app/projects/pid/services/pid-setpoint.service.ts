import { Injectable, inject } from '@angular/core';

import { PID_VISUALIZATION_BOUNDS } from '../constants/pid-visualization-bounds.constant';
import { PidSetpointState } from '../interfaces/pid-setpoint-state.interface';
import { PidMathService } from './pid-math.service';

@Injectable()
export class PidSetpointService {
  private readonly mathService = inject(PidMathService);

  public getSetpointFromPointer(
    event: PointerEvent,
    canvas: HTMLCanvasElement
  ): number {
    const bounds = canvas.getBoundingClientRect();
    const pointerOffset = this.mathService.clamp(
      event.clientX - bounds.left,
      0,
      bounds.width
    );
    const canvasOffset = (pointerOffset / bounds.width) * canvas.width;

    return this.mathService.clamp(
      this.mathService.mapCanvasToPosition(
        canvasOffset,
        canvas.width,
        PID_VISUALIZATION_BOUNDS
      ),
      PID_VISUALIZATION_BOUNDS.minimum,
      PID_VISUALIZATION_BOUNDS.maximum
    );
  }

  public handleModeChange(
    setpointMode: string,
    setpointState: PidSetpointState,
    simulationTime: number,
    startStepMetrics: (fromValue: number, toValue: number) => void
  ): void {
    if (setpointMode === 'step') {
      this.activateStepMode(setpointState, startStepMetrics);
    }

    if (setpointMode === 'random') {
      setpointState.nextRandomAt = simulationTime;
    }
  }

  public updateSetpoint(
    setpointMode: string,
    setpointState: PidSetpointState,
    simulationTime: number,
    startStepMetrics: (fromValue: number, toValue: number) => void
  ): void {
    if (setpointMode === 'drag') {
      return;
    }

    if (setpointMode === 'step') {
      this.updateStepSetpoint(setpointState, simulationTime);
      return;
    }

    if (setpointMode === 'sine') {
      setpointState.value = this.getSineSetpoint(simulationTime);
      return;
    }

    this.updateRandomSetpoint(setpointState, simulationTime, startStepMetrics);
  }

  private activateStepMode(
    setpointState: PidSetpointState,
    startStepMetrics: (fromValue: number, toValue: number) => void
  ): void {
    const previousValue = setpointState.value;

    setpointState.holdValue = setpointState.value;
    startStepMetrics(previousValue, setpointState.holdValue);
  }

  private getSineSetpoint(simulationTime: number): number {
    const amplitude = 0.8;
    const angularVelocity = 2 * Math.PI * 0.15;

    return amplitude * Math.sin(angularVelocity * simulationTime);
  }

  private updateRandomSetpoint(
    setpointState: PidSetpointState,
    simulationTime: number,
    startStepMetrics: (fromValue: number, toValue: number) => void
  ): void {
    if (simulationTime < setpointState.nextRandomAt) {
      return;
    }

    const previousValue = setpointState.value;

    setpointState.value = Math.random() * 1.8 - 0.9;
    setpointState.nextRandomAt = simulationTime + 1.7 + Math.random() * 1.8;
    startStepMetrics(previousValue, setpointState.value);
  }

  private updateStepSetpoint(
    setpointState: PidSetpointState,
    simulationTime: number
  ): void {
    if (simulationTime !== 0) {
      return;
    }

    setpointState.value = setpointState.holdValue;
  }
}
