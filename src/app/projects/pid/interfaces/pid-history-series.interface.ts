export interface PidHistorySeries {
  time: number[];
  setpoint: number[];
  position: number[];
  error: number[];
  control: number[];
  proportional: number[];
  integral: number[];
  derivative: number[];
}
