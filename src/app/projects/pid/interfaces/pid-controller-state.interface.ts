export interface PidControllerState {
  integral: number;
  previousError: number;
  derivativeFilterState: number;
}
