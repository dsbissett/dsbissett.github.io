import { Injectable } from '@angular/core';

import { PidPlantParameters } from '../interfaces/pid-plant-parameters.interface';
import { PidPlantState } from '../interfaces/pid-plant-state.interface';

@Injectable()
export class PidPlantService {
  public stepPlant(
    plant: PidPlantParameters,
    plantState: PidPlantState,
    control: number,
    timeStep: number,
    kickVelocity: number
  ): void {
    if (kickVelocity !== 0) {
      plantState.velocity += kickVelocity;
    }

    const acceleration = this.getAcceleration(plant, plantState, control);

    plantState.velocity += acceleration * timeStep;
    plantState.position += plantState.velocity * timeStep;
    this.applySoftClamp(plantState);
  }

  private applySoftClamp(plantState: PidPlantState): void {
    const limit = 1.18;

    if (plantState.position > limit) {
      plantState.position = limit;
      plantState.velocity *= -0.35;
    }

    if (plantState.position < -limit) {
      plantState.position = -limit;
      plantState.velocity *= -0.35;
    }
  }

  private getAcceleration(
    plant: PidPlantParameters,
    plantState: PidPlantState,
    control: number
  ): number {
    return (
      (control - plant.damping * plantState.velocity - plant.spring * plantState.position) /
      plant.mass
    );
  }
}
