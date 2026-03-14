export interface PidControlOutput {
  control: number;
  error: number;
  proportional: number;
  integral: number;
  derivative: number;
}
