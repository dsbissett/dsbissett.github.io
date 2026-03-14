import { Injectable } from '@angular/core';

@Injectable()
export class PidFormatService {
  public formatNumber(value: number, digits: number): string {
    return value.toFixed(digits);
  }

  public formatDelay(milliseconds: number): string {
    return `${Math.trunc(milliseconds)} ms`;
  }

  public formatMetric(value: number | null, digits: number, suffix: string): string {
    if (value === null) {
      return '-';
    }

    return `${value.toFixed(digits)} ${suffix}`;
  }

  public formatPercent(value: number | null, digits: number): string {
    if (value === null) {
      return '-';
    }

    return `${(value * 100).toFixed(digits)} %`;
  }
}
