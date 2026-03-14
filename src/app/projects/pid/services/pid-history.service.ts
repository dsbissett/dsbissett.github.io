import { Injectable } from '@angular/core';

import { PID_SIMULATION_SETTINGS } from '../constants/pid-simulation-settings.constant';
import { PidHistoryEntry } from '../interfaces/pid-history-entry.interface';
import { PidHistorySeries } from '../interfaces/pid-history-series.interface';

@Injectable()
export class PidHistoryService {
  private readonly time = new Float32Array(PID_SIMULATION_SETTINGS.historyLength);
  private readonly setpoint = new Float32Array(PID_SIMULATION_SETTINGS.historyLength);
  private readonly position = new Float32Array(PID_SIMULATION_SETTINGS.historyLength);
  private readonly error = new Float32Array(PID_SIMULATION_SETTINGS.historyLength);
  private readonly control = new Float32Array(PID_SIMULATION_SETTINGS.historyLength);
  private readonly proportional = new Float32Array(
    PID_SIMULATION_SETTINGS.historyLength
  );
  private readonly integral = new Float32Array(PID_SIMULATION_SETTINGS.historyLength);
  private readonly derivative = new Float32Array(
    PID_SIMULATION_SETTINGS.historyLength
  );
  private index = 0;

  public pushEntry(entry: PidHistoryEntry): void {
    this.time[this.index] = entry.time;
    this.setpoint[this.index] = entry.setpoint;
    this.position[this.index] = entry.position;
    this.error[this.index] = entry.error;
    this.control[this.index] = entry.control;
    this.proportional[this.index] = entry.proportional;
    this.integral[this.index] = entry.integral;
    this.derivative[this.index] = entry.derivative;
    this.index = (this.index + 1) % PID_SIMULATION_SETTINGS.historyLength;
  }

  public readSeries(): PidHistorySeries {
    return {
      time: this.readValues(this.time),
      setpoint: this.readValues(this.setpoint),
      position: this.readValues(this.position),
      error: this.readValues(this.error),
      control: this.readValues(this.control),
      proportional: this.readValues(this.proportional),
      integral: this.readValues(this.integral),
      derivative: this.readValues(this.derivative),
    };
  }

  public reset(): void {
    this.index = 0;
    this.seedTimeValues();
    this.zeroValues(this.setpoint);
    this.zeroValues(this.position);
    this.zeroValues(this.error);
    this.zeroValues(this.control);
    this.zeroValues(this.proportional);
    this.zeroValues(this.integral);
    this.zeroValues(this.derivative);
  }

  private readValues(values: Float32Array): number[] {
    const orderedValues: number[] = [];

    for (let offset = 0; offset < PID_SIMULATION_SETTINGS.historyLength; offset += 1) {
      const valueIndex = (this.index + offset) % PID_SIMULATION_SETTINGS.historyLength;

      orderedValues.push(values[valueIndex]);
    }

    return orderedValues;
  }

  private seedTimeValues(): void {
    for (
      let valueIndex = 0;
      valueIndex < PID_SIMULATION_SETTINGS.historyLength;
      valueIndex += 1
    ) {
      this.time[valueIndex] =
        -PID_SIMULATION_SETTINGS.historySeconds +
        valueIndex * PID_SIMULATION_SETTINGS.timeStep;
    }
  }

  private zeroValues(values: Float32Array): void {
    values.fill(0);
  }
}
