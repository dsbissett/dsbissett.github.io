import { Injectable } from '@angular/core';

import { PidCanvasContextCollection } from '../interfaces/pid-canvas-context-collection.interface';

@Injectable()
export class PidCanvasService {
  private contexts: PidCanvasContextCollection | null = null;

  public connect(
    simulationCanvas: HTMLCanvasElement,
    timeCanvas: HTMLCanvasElement,
    controlCanvas: HTMLCanvasElement
  ): void {
    this.contexts = {
      simulation: this.requireContext(simulationCanvas),
      time: this.requireContext(timeCanvas),
      control: this.requireContext(controlCanvas),
    };
  }

  public disconnect(): void {
    this.contexts = null;
  }

  public getContexts(): PidCanvasContextCollection {
    if (!this.contexts) {
      throw new Error('The PID canvases have not been connected.');
    }

    return this.contexts;
  }

  private requireContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('A 2D canvas context is required for the PID demo.');
    }

    return context;
  }
}
