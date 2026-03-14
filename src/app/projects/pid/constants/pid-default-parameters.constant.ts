import { PidParameters } from '../interfaces/pid-parameters.interface';
import { PID_PRESETS } from './pid-presets.constant';

export const PID_DEFAULT_PARAMETERS: PidParameters = {
  presetName: 'balanced',
  setpointMode: 'drag',
  controller: PID_PRESETS.balanced.controller,
  plant: PID_PRESETS.balanced.plant,
  nonIdeal: PID_PRESETS.balanced.nonIdeal,
};
