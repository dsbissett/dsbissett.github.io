import { Injectable } from '@angular/core';

@Injectable()
export class PidNoiseService {
  private spareValue: number | null = null;

  public nextGaussian(sigma: number): number {
    if (this.spareValue !== null) {
      return this.consumeSpareValue() * sigma;
    }

    return this.createPair(sigma);
  }

  private consumeSpareValue(): number {
    const spareValue = this.spareValue ?? 0;

    this.spareValue = null;
    return spareValue;
  }

  private createPair(sigma: number): number {
    const firstUniform = this.createNonZeroUniform();
    const secondUniform = this.createNonZeroUniform();
    const magnitude = Math.sqrt(-2 * Math.log(firstUniform));
    const firstValue = magnitude * Math.cos(2 * Math.PI * secondUniform);

    this.spareValue = magnitude * Math.sin(2 * Math.PI * secondUniform);
    return firstValue * sigma;
  }

  private createNonZeroUniform(): number {
    let value = 0;

    while (value === 0) {
      value = Math.random();
    }

    return value;
  }
}
