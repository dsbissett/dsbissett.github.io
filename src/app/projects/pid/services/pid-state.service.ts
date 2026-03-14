import { Injectable, signal } from '@angular/core';

import { PidControllerState } from '../interfaces/pid-controller-state.interface';
import { PidDelayState } from '../interfaces/pid-delay-state.interface';
import { PidDragState } from '../interfaces/pid-drag-state.interface';
import { PidLoopTiming } from '../interfaces/pid-loop-timing.interface';
import { PidPlantState } from '../interfaces/pid-plant-state.interface';
import { PidSetpointState } from '../interfaces/pid-setpoint-state.interface';

@Injectable()
export class PidStateService {
  private readonly runningState = signal(true);
  private readonly plantState: PidPlantState = {
    position: 0,
    velocity: 0,
  };
  private readonly setpointState: PidSetpointState = {
    value: 0,
    holdValue: 0,
    nextRandomAt: 0,
  };
  private readonly controllerState: PidControllerState = {
    integral: 0,
    previousError: 0,
    derivativeFilterState: 0,
  };
  private readonly delayState: PidDelayState = {
    measurementDelaySamples: 0,
    measurementBuffer: [0],
  };
  private readonly dragState: PidDragState = {
    active: false,
    pointerId: null,
  };
  private readonly loopTiming: PidLoopTiming = {
    accumulator: 0,
    lastFrameTime: 0,
  };
  private kickVelocity = 0;
  private simulationTime = 0;

  public readonly running = this.runningState.asReadonly();

  public advanceSimulationTime(timeStep: number): void {
    this.simulationTime += timeStep;
  }

  public consumeKickVelocity(): number {
    const kickVelocity = this.kickVelocity;

    this.kickVelocity = 0;
    return kickVelocity;
  }

  public getControllerState(): PidControllerState {
    return this.controllerState;
  }

  public getDelayState(): PidDelayState {
    return this.delayState;
  }

  public getDragState(): PidDragState {
    return this.dragState;
  }

  public getPlantState(): PidPlantState {
    return this.plantState;
  }

  public getSetpointState(): PidSetpointState {
    return this.setpointState;
  }

  public getSimulationTime(): number {
    return this.simulationTime;
  }

  public hasDragPointer(pointerId: number): boolean {
    return this.dragState.pointerId === pointerId;
  }

  public initializeFrameTime(frameTime: number): void {
    this.loopTiming.lastFrameTime = frameTime;
  }

  public isRunning(): boolean {
    return this.runningState();
  }

  public reset(): void {
    this.runningState.set(true);
    this.resetControllerState();
    this.resetDelayState();
    this.resetDragState();
    this.resetLoopTiming();
    this.resetPlantState();
    this.resetSetpointState();
    this.kickVelocity = 0;
    this.simulationTime = 0;
  }

  public setDelayState(samples: number, buffer: number[]): void {
    this.delayState.measurementDelaySamples = samples;
    this.delayState.measurementBuffer = buffer;
  }

  public setDragPointer(pointerId: number): void {
    this.dragState.active = true;
    this.dragState.pointerId = pointerId;
  }

  public setKickVelocity(kickVelocity: number): void {
    this.kickVelocity = kickVelocity;
  }

  public setSetpointValue(value: number): void {
    this.setpointState.value = value;
  }

  public toggleRunning(): boolean {
    this.runningState.update((running) => !running);
    return this.runningState();
  }

  public updateAccumulator(elapsed: number): void {
    this.loopTiming.accumulator += elapsed;
  }

  public updateFrameTime(frameTime: number, elapsedCap: number): number {
    const elapsed = (frameTime - this.loopTiming.lastFrameTime) / 1000;

    this.loopTiming.lastFrameTime = frameTime;
    return Math.min(elapsed, elapsedCap);
  }

  public useAccumulatorStep(timeStep: number): boolean {
    if (this.loopTiming.accumulator < timeStep) {
      return false;
    }

    this.loopTiming.accumulator -= timeStep;
    return true;
  }

  private resetControllerState(): void {
    this.controllerState.integral = 0;
    this.controllerState.previousError = 0;
    this.controllerState.derivativeFilterState = 0;
  }

  private resetDelayState(): void {
    this.delayState.measurementDelaySamples = 0;
    this.delayState.measurementBuffer = [0];
  }

  private resetDragState(): void {
    this.dragState.active = false;
    this.dragState.pointerId = null;
  }

  private resetLoopTiming(): void {
    this.loopTiming.accumulator = 0;
    this.loopTiming.lastFrameTime = 0;
  }

  private resetPlantState(): void {
    this.plantState.position = 0;
    this.plantState.velocity = 0;
  }

  private resetSetpointState(): void {
    this.setpointState.value = 0;
    this.setpointState.holdValue = 0;
    this.setpointState.nextRandomAt = 0;
  }
}
