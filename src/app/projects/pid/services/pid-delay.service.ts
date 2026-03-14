import { Injectable, inject } from '@angular/core';

import { PidDelayState } from '../interfaces/pid-delay-state.interface';
import { PidNonIdealParameters } from '../interfaces/pid-non-ideal-parameters.interface';
import { PidNoiseService } from './pid-noise.service';

@Injectable()
export class PidDelayService {
  private readonly noiseService = inject(PidNoiseService);

  public createDelayState(
    nonIdeal: PidNonIdealParameters,
    timeStep: number
  ): PidDelayState {
    const measurementDelaySamples = this.getDelaySamples(nonIdeal, timeStep);

    return {
      measurementDelaySamples,
      measurementBuffer: new Array(measurementDelaySamples + 1).fill(0),
    };
  }

  public measurePosition(
    position: number,
    nonIdeal: PidNonIdealParameters,
    delayState: PidDelayState
  ): number {
    const noisyPosition = this.applyNoise(position, nonIdeal);

    return this.applyDelay(noisyPosition, delayState);
  }

  private applyDelay(value: number, delayState: PidDelayState): number {
    if (delayState.measurementDelaySamples === 0) {
      return value;
    }

    delayState.measurementBuffer.push(value);
    return delayState.measurementBuffer.shift() ?? value;
  }

  private applyNoise(value: number, nonIdeal: PidNonIdealParameters): number {
    if (!nonIdeal.noiseEnabled) {
      return value;
    }

    return value + this.noiseService.nextGaussian(nonIdeal.noiseSigma);
  }

  private getDelaySamples(
    nonIdeal: PidNonIdealParameters,
    timeStep: number
  ): number {
    if (!nonIdeal.delayEnabled) {
      return 0;
    }

    return Math.max(0, Math.round((nonIdeal.delayMs / 1000) / timeStep));
  }
}
