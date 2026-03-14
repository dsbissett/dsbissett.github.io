import { Injectable, computed, signal } from '@angular/core';

import { HEATMAP_DEFAULT_PARAMETERS } from '../constants/heatmap-default-parameters.constant';
import { HeatmapRenderParameters } from '../interfaces/heatmap-render-parameters.interface';

@Injectable()
export class HeatmapParametersService {
  private readonly parameterState = signal<HeatmapRenderParameters>(
    HEATMAP_DEFAULT_PARAMETERS
  );

  public readonly parameters = this.parameterState.asReadonly();
  public readonly formulaText = computed(() =>
    this.formatFormula(this.parameters())
  );

  public formatFormula(parameters: HeatmapRenderParameters): string {
    return [
      'R(x)=sum_i w_i*exp( - d(x,x_i)^2 / (2sigma_i^2) )',
      '',
      'Demo mapping:',
      `- felony:       w=${parameters.felonyWeight}, sigma=${parameters.felonySigma}px`,
      `- misdemeanor:  w=${parameters.misdemeanorWeight}, sigma=${parameters.misdemeanorSigma}px`,
      `- grid step:    ${parameters.gridStep}px`,
    ].join('\n');
  }

  public updateParameter(
    parameter: keyof HeatmapRenderParameters,
    rawValue: string
  ): void {
    const parsedValue = Number(rawValue);

    if (Number.isNaN(parsedValue)) {
      return;
    }

    this.parameterState.update((currentParameters) => ({
      ...currentParameters,
      [parameter]: parsedValue,
    }));
  }
}
