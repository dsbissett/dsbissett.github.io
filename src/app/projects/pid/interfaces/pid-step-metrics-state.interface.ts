export interface PidStepMetricsState {
  active: boolean;
  startTime: number;
  startValue: number;
  targetValue: number;
  threshold10Time: number | null;
  threshold90Time: number | null;
  peakValue: number | null;
  inBandSince: number | null;
}
