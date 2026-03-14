import { Injectable } from '@angular/core';

import { FlappyBirdState } from '../interfaces/flappy-bird-state.interface';

@Injectable()
export class FlappyBirdStateService {
  private state: FlappyBirdState | null = null;

  public clear(): void {
    this.state = null;
  }

  public getState(): FlappyBirdState {
    if (!this.state) {
      throw new Error('Flappy Bird state has not been initialized.');
    }

    return this.state;
  }

  public hasState(): boolean {
    return this.state !== null;
  }

  public setState(state: FlappyBirdState): void {
    this.state = state;
  }
}
