import { PidSimulationSettings } from '../interfaces/pid-simulation-settings.interface';

export const PID_SIMULATION_SETTINGS: PidSimulationSettings = {
  timeStep: 1 / 240,
  historySeconds: 10,
  historyLength: Math.floor(10 / (1 / 240)),
  elapsedCap: 0.05,
};
