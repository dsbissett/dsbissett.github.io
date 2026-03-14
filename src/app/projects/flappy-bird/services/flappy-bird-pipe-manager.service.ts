import { Injectable } from '@angular/core';

import { FlappyPipe } from '../classes/flappy-pipe.class';

@Injectable()
export class FlappyBirdPipeManagerService {
  public collectScore(pipes: readonly FlappyPipe[], birdX: number): number {
    let score = 0;

    for (const pipe of pipes) {
      if (pipe.tryMarkPassed(birdX)) {
        score += 1;
      }
    }

    return score;
  }

  public removeOffScreenPipes(pipes: FlappyPipe[], viewLeft: number): void {
    for (let index = pipes.length - 1; index >= 0; index -= 1) {
      if (pipes[index].isOffScreen(viewLeft)) {
        pipes.splice(index, 1);
      }
    }
  }

  public updatePipes(pipes: readonly FlappyPipe[], speedFactor: number): void {
    for (const pipe of pipes) {
      pipe.update(speedFactor);
    }
  }
}
