import { Injectable } from '@angular/core';

import { TetrisGameState } from '../interfaces/tetris-game-state.interface';

@Injectable()
export class TetrisStateService {
  private state: TetrisGameState | null = null;

  public clear(): void {
    this.state = null;
  }

  public getState(): TetrisGameState {
    if (!this.state) {
      throw new Error('Tetris state has not been initialized.');
    }

    return this.state;
  }

  public hasState(): boolean {
    return this.state !== null;
  }

  public setState(state: TetrisGameState): void {
    this.state = state;
  }
}
