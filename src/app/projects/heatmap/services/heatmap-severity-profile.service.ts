import { Injectable } from '@angular/core';

import { HeatmapRenderParameters } from '../interfaces/heatmap-render-parameters.interface';
import { HeatmapSeverityProfile } from '../interfaces/heatmap-severity-profile.interface';
import { HeatmapSeverity } from '../types/heatmap-severity.type';

@Injectable()
export class HeatmapSeverityProfileService {
  public getProfile(
    severity: HeatmapSeverity,
    parameters: HeatmapRenderParameters
  ): HeatmapSeverityProfile {
    if (severity === 'felony') {
      return {
        weight: parameters.felonyWeight,
        sigma: parameters.felonySigma,
      };
    }

    return {
      weight: parameters.misdemeanorWeight,
      sigma: parameters.misdemeanorSigma,
    };
  }
}
