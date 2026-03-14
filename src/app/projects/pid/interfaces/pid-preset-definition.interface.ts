import { PidControllerParameters } from './pid-controller-parameters.interface';
import { PidNonIdealParameters } from './pid-non-ideal-parameters.interface';
import { PidPlantParameters } from './pid-plant-parameters.interface';

export interface PidPresetDefinition {
  controller: PidControllerParameters;
  plant: PidPlantParameters;
  nonIdeal: PidNonIdealParameters;
}
