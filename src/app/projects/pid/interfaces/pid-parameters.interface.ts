import { PidControllerParameters } from './pid-controller-parameters.interface';
import { PidNonIdealParameters } from './pid-non-ideal-parameters.interface';
import { PidPlantParameters } from './pid-plant-parameters.interface';
import { PidPresetName } from '../types/pid-preset-name.type';
import { PidSetpointMode } from '../types/pid-setpoint-mode.type';

export interface PidParameters {
  presetName: PidPresetName;
  setpointMode: PidSetpointMode;
  controller: PidControllerParameters;
  plant: PidPlantParameters;
  nonIdeal: PidNonIdealParameters;
}
