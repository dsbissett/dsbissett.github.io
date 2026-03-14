import { Injectable, inject } from '@angular/core';

import { PidControlOutput } from '../interfaces/pid-control-output.interface';
import { PidControllerParameters } from '../interfaces/pid-controller-parameters.interface';
import { PidControllerState } from '../interfaces/pid-controller-state.interface';
import { PidNonIdealParameters } from '../interfaces/pid-non-ideal-parameters.interface';
import { PidMathService } from './pid-math.service';

@Injectable()
export class PidControllerService {
  private readonly mathService = inject(PidMathService);

  public computeControl(
    controller: PidControllerParameters,
    nonIdeal: PidNonIdealParameters,
    controllerState: PidControllerState,
    setpoint: number,
    measuredPosition: number,
    timeStep: number
  ): PidControlOutput {
    const error = setpoint - measuredPosition;
    const derivative = this.getDerivative(
      error,
      nonIdeal,
      controllerState,
      timeStep
    );
    const candidateIntegral = controllerState.integral + error * timeStep;
    const proportionalOutput = controller.kp * error;
    const integralOutput = controller.ki * candidateIntegral;
    const derivativeOutput = controller.kd * derivative;
    const unsaturatedControl =
      proportionalOutput + integralOutput + derivativeOutput;
    const control = this.getControlSignal(
      unsaturatedControl,
      error,
      candidateIntegral,
      controller,
      controllerState,
      nonIdeal
    );

    controllerState.previousError = error;

    return {
      control,
      error,
      proportional: proportionalOutput,
      integral: controller.ki * controllerState.integral,
      derivative: derivativeOutput,
    };
  }

  private getControlSignal(
    unsaturatedControl: number,
    error: number,
    candidateIntegral: number,
    controller: PidControllerParameters,
    controllerState: PidControllerState,
    nonIdeal: PidNonIdealParameters
  ): number {
    if (!nonIdeal.saturationEnabled) {
      controllerState.integral = candidateIntegral;
      return unsaturatedControl;
    }

    const saturatedControl = this.mathService.clamp(
      unsaturatedControl,
      -nonIdeal.actuatorLimit,
      nonIdeal.actuatorLimit
    );

    if (this.shouldIntegrate(error, unsaturatedControl, saturatedControl, nonIdeal)) {
      controllerState.integral = candidateIntegral;
    }

    return saturatedControl;
  }

  private getDerivative(
    error: number,
    nonIdeal: PidNonIdealParameters,
    controllerState: PidControllerState,
    timeStep: number
  ): number {
    const rawDerivative = (error - controllerState.previousError) / timeStep;

    if (!nonIdeal.derivativeFilterEnabled) {
      return rawDerivative;
    }

    const alpha = this.mathService.clamp(
      timeStep / (nonIdeal.derivativeTau + timeStep),
      0,
      1
    );

    controllerState.derivativeFilterState = this.mathService.lerp(
      controllerState.derivativeFilterState,
      rawDerivative,
      alpha
    );
    return controllerState.derivativeFilterState;
  }

  private shouldIntegrate(
    error: number,
    unsaturatedControl: number,
    saturatedControl: number,
    nonIdeal: PidNonIdealParameters
  ): boolean {
    if (!nonIdeal.antiWindupEnabled) {
      return true;
    }

    if (unsaturatedControl === saturatedControl) {
      return true;
    }

    return !this.isPushingFurtherIntoSaturation(
      error,
      unsaturatedControl,
      saturatedControl
    );
  }

  private isPushingFurtherIntoSaturation(
    error: number,
    unsaturatedControl: number,
    saturatedControl: number
  ): boolean {
    if (unsaturatedControl > saturatedControl) {
      return error > 0;
    }

    return error < 0;
  }
}
