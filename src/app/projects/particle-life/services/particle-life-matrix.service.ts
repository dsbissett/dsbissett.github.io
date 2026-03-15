import { Injectable } from '@angular/core';

import { PARTICLE_LIFE_SPECIES_COLORS } from '../constants/particle-life-species-colors.constant';

@Injectable()
export class ParticleLifeMatrixService {
  public generateRandomMatrix(speciesCount: number): number[][] {
    const matrix: number[][] = [];

    for (let i = 0; i < speciesCount; i++) {
      const row: number[] = [];

      for (let j = 0; j < speciesCount; j++) {
        row.push(Math.random() * 2 - 1);
      }

      matrix.push(row);
    }

    return matrix;
  }

  public setAttraction(
    matrix: number[][],
    fromSpecies: number,
    toSpecies: number,
    value: number
  ): number[][] {
    const updated = matrix.map((row) => [...row]);
    updated[fromSpecies][toSpecies] = value;
    return updated;
  }

  public getColors(speciesCount: number): readonly string[] {
    return PARTICLE_LIFE_SPECIES_COLORS.slice(0, speciesCount);
  }
}
