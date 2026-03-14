import { Injectable, computed, inject, signal } from '@angular/core';

import { PID_DEFAULT_PARAMETERS } from '../constants/pid-default-parameters.constant';
import { PID_PRESETS } from '../constants/pid-presets.constant';
import { PidControllerParameters } from '../interfaces/pid-controller-parameters.interface';
import { PidDisplayValues } from '../interfaces/pid-display-values.interface';
import { PidNonIdealParameters } from '../interfaces/pid-non-ideal-parameters.interface';
import { PidParameters } from '../interfaces/pid-parameters.interface';
import { PidPlantParameters } from '../interfaces/pid-plant-parameters.interface';
import { PidPresetName } from '../types/pid-preset-name.type';
import { PidSetpointMode } from '../types/pid-setpoint-mode.type';
import { PidFormatService } from './pid-format.service';

@Injectable()
export class PidParametersService {
  private readonly formatService = inject(PidFormatService);
  private readonly parameterState = signal<PidParameters>(
    this.cloneParameters(PID_DEFAULT_PARAMETERS)
  );

  public readonly parameters = this.parameterState.asReadonly();
  public readonly displayValues = computed(() =>
    this.createDisplayValues(this.parameters())
  );

  public applyPreset(presetName: PidPresetName): void {
    const preset = PID_PRESETS[presetName];

    this.parameterState.update((parameters) => ({
      ...parameters,
      presetName,
      controller: this.cloneController(preset.controller),
      plant: this.clonePlant(preset.plant),
      nonIdeal: this.cloneNonIdeal(preset.nonIdeal),
    }));
  }

  public setSetpointMode(setpointMode: PidSetpointMode): void {
    this.parameterState.update((parameters) => ({
      ...parameters,
      setpointMode,
    }));
  }

  public updateControllerParameter(
    parameter: keyof PidControllerParameters,
    rawValue: string
  ): void {
    this.updateNumericSection('controller', parameter, rawValue);
  }

  public updateNonIdealNumber(
    parameter: keyof PidNonIdealParameters,
    rawValue: string
  ): void {
    this.updateNumericSection('nonIdeal', parameter, rawValue);
  }

  public updateNonIdealToggle(
    parameter: keyof PidNonIdealParameters,
    checked: boolean
  ): void {
    this.parameterState.update((parameters) => ({
      ...parameters,
      nonIdeal: {
        ...parameters.nonIdeal,
        [parameter]: checked,
      },
    }));
  }

  public updatePlantParameter(
    parameter: keyof PidPlantParameters,
    rawValue: string
  ): void {
    this.updateNumericSection('plant', parameter, rawValue);
  }

  private cloneController(
    controller: PidControllerParameters
  ): PidControllerParameters {
    return { ...controller };
  }

  private cloneNonIdeal(nonIdeal: PidNonIdealParameters): PidNonIdealParameters {
    return { ...nonIdeal };
  }

  private cloneParameters(parameters: PidParameters): PidParameters {
    return {
      presetName: parameters.presetName,
      setpointMode: parameters.setpointMode,
      controller: this.cloneController(parameters.controller),
      plant: this.clonePlant(parameters.plant),
      nonIdeal: this.cloneNonIdeal(parameters.nonIdeal),
    };
  }

  private clonePlant(plant: PidPlantParameters): PidPlantParameters {
    return { ...plant };
  }

  private createDisplayValues(parameters: PidParameters): PidDisplayValues {
    return {
      kp: this.formatService.formatNumber(parameters.controller.kp, 0),
      ki: this.formatService.formatNumber(parameters.controller.ki, 1),
      kd: this.formatService.formatNumber(parameters.controller.kd, 1),
      mass: this.formatService.formatNumber(parameters.plant.mass, 2),
      damping: this.formatService.formatNumber(parameters.plant.damping, 2),
      spring: this.formatService.formatNumber(parameters.plant.spring, 2),
      actuatorLimit: this.formatService.formatNumber(
        parameters.nonIdeal.actuatorLimit,
        1
      ),
      noiseSigma: this.formatService.formatNumber(
        parameters.nonIdeal.noiseSigma,
        3
      ),
      delay: this.formatService.formatDelay(parameters.nonIdeal.delayMs),
      derivativeTau: this.formatService.formatNumber(
        parameters.nonIdeal.derivativeTau,
        3
      ),
    };
  }

  private updateNumericSection<
    TSection extends 'controller' | 'plant' | 'nonIdeal',
    TKey extends keyof PidParameters[TSection],
  >(section: TSection, parameter: TKey, rawValue: string): void {
    const parsedValue = Number(rawValue);

    if (Number.isNaN(parsedValue)) {
      return;
    }

    this.parameterState.update((parameters) => ({
      ...parameters,
      [section]: {
        ...parameters[section],
        [parameter]: parsedValue,
      },
    }));
  }
}
