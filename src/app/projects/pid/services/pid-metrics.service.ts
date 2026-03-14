import { Injectable, computed, inject, signal } from '@angular/core';

import { PidMetricsDisplay } from '../interfaces/pid-metrics-display.interface';
import { PidMetrics } from '../interfaces/pid-metrics.interface';
import { PidStepMetricsState } from '../interfaces/pid-step-metrics-state.interface';
import { PidFormatService } from './pid-format.service';

@Injectable()
export class PidMetricsService {
  private readonly formatService = inject(PidFormatService);
  private readonly metricsState = signal<PidMetrics>({
    riseTime: null,
    overshoot: null,
    settlingTime: null,
    steadyStateError: null,
  });
  private stepState: PidStepMetricsState = this.createStepState(0, 0, false);

  public readonly metrics = this.metricsState.asReadonly();
  public readonly displayValues = computed<PidMetricsDisplay>(() => ({
    riseTime: this.formatService.formatMetric(this.metrics().riseTime, 2, 's'),
    overshoot: this.formatService.formatPercent(this.metrics().overshoot, 1),
    settlingTime: this.formatService.formatMetric(
      this.metrics().settlingTime,
      2,
      's'
    ),
    steadyStateError: this.formatService.formatMetric(
      this.metrics().steadyStateError,
      3,
      'm'
    ),
  }));

  public reset(): void {
    this.stepState = this.createStepState(0, 0, false);
    this.metricsState.set({
      riseTime: null,
      overshoot: null,
      settlingTime: null,
      steadyStateError: null,
    });
  }

  public startStepMetrics(
    simulationTime: number,
    startValue: number,
    targetValue: number
  ): void {
    this.stepState = this.createStepState(startValue, targetValue, true);
    this.stepState.startTime = simulationTime;
    this.metricsState.set({
      riseTime: null,
      overshoot: null,
      settlingTime: null,
      steadyStateError: null,
    });
  }

  public update(simulationTime: number, position: number): void {
    if (!this.stepState.active) {
      return;
    }

    const elapsed = simulationTime - this.stepState.startTime;

    this.updateRiseTime(elapsed, position);
    this.updateOvershoot(elapsed, position);
    this.updateSettlingTime(elapsed, position);
    this.updateSteadyStateError(elapsed, position);

    if (elapsed > 8) {
      this.stepState.active = false;
    }
  }

  private createStepState(
    startValue: number,
    targetValue: number,
    active: boolean
  ): PidStepMetricsState {
    return {
      active,
      startTime: 0,
      startValue,
      targetValue,
      threshold10Time: null,
      threshold90Time: null,
      peakValue: null,
      inBandSince: null,
    };
  }

  private getAmplitude(): number {
    return this.stepState.targetValue - this.stepState.startValue;
  }

  private getDirection(): number {
    return Math.sign(this.getAmplitude()) || 1;
  }

  private updateOvershoot(elapsed: number, position: number): void {
    if (this.metrics().overshoot !== null) {
      return;
    }

    this.stepState.peakValue = this.getPeakValue(position);

    if (elapsed <= 2) {
      return;
    }

    const amplitude = this.getAmplitude();
    const peakError = this.getPeakError();
    const overshoot = peakError > 0 ? peakError / Math.abs(amplitude || 1) : 0;

    this.metricsState.update((metrics) => ({ ...metrics, overshoot }));
  }

  private updateRiseTime(elapsed: number, position: number): void {
    if (this.metrics().riseTime !== null) {
      return;
    }

    this.captureThresholdTimes(elapsed, position);

    if (this.stepState.threshold10Time === null) {
      return;
    }

    if (this.stepState.threshold90Time === null) {
      return;
    }

    this.metricsState.update((metrics) => ({
      ...metrics,
      riseTime: Math.max(0, this.stepState.threshold90Time! - this.stepState.threshold10Time!),
    }));
  }

  private updateSettlingTime(elapsed: number, position: number): void {
    if (this.metrics().settlingTime !== null) {
      return;
    }

    const band = 0.02 * Math.abs(this.getAmplitude() || 1);
    const inBand = Math.abs(position - this.stepState.targetValue) <= band;

    if (!inBand) {
      this.stepState.inBandSince = null;
      return;
    }

    if (this.stepState.inBandSince === null) {
      this.stepState.inBandSince = elapsed;
    }

    if (elapsed - this.stepState.inBandSince < 1) {
      return;
    }

    this.metricsState.update((metrics) => ({
      ...metrics,
      settlingTime: this.stepState.inBandSince,
    }));
  }

  private updateSteadyStateError(elapsed: number, position: number): void {
    if (this.metrics().steadyStateError !== null) {
      return;
    }

    if (elapsed <= 3) {
      return;
    }

    this.metricsState.update((metrics) => ({
      ...metrics,
      steadyStateError: this.stepState.targetValue - position,
    }));
  }

  private captureThresholdTimes(elapsed: number, position: number): void {
    const threshold10 = this.stepState.startValue + 0.1 * this.getAmplitude();
    const threshold90 = this.stepState.startValue + 0.9 * this.getAmplitude();

    if (this.stepState.threshold10Time === null && this.crossedThreshold(position, threshold10)) {
      this.stepState.threshold10Time = elapsed;
    }

    if (this.stepState.threshold10Time === null) {
      return;
    }

    if (this.stepState.threshold90Time !== null) {
      return;
    }

    if (this.crossedThreshold(position, threshold90)) {
      this.stepState.threshold90Time = elapsed;
    }
  }

  private crossedThreshold(position: number, threshold: number): boolean {
    return this.getDirection() * (position - threshold) >= 0;
  }

  private getPeakError(): number {
    const peakValue = this.stepState.peakValue ?? this.stepState.targetValue;

    if (this.getDirection() > 0) {
      return peakValue - this.stepState.targetValue;
    }

    return this.stepState.targetValue - peakValue;
  }

  private getPeakValue(position: number): number {
    if (this.stepState.peakValue === null) {
      return position;
    }

    if (this.getDirection() > 0) {
      return Math.max(this.stepState.peakValue, position);
    }

    return Math.min(this.stepState.peakValue, position);
  }
}
