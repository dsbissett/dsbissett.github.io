import { Injectable } from '@angular/core';

import { FlappyBird } from '../classes/flappy-bird.class';
import { FlappyPipe } from '../classes/flappy-pipe.class';
import { FLAPPY_BIRD_GAME_CONFIG } from '../constants/flappy-bird-game-config.constant';

@Injectable()
export class FlappyBirdCollisionService {
  public hasGroundCollision(bird: FlappyBird): boolean {
    const groundTop =
      FLAPPY_BIRD_GAME_CONFIG.gameHeight -
      FLAPPY_BIRD_GAME_CONFIG.groundCollisionHeight;

    return bird.y + bird.height >= groundTop;
  }

  public hasPipeCollision(
    bird: FlappyBird,
    pipes: readonly FlappyPipe[]
  ): boolean {
    for (const pipe of pipes) {
      if (this.isPipeCollision(bird, pipe)) {
        return true;
      }
    }

    return false;
  }

  private isPipeCollision(bird: FlappyBird, pipe: FlappyPipe): boolean {
    const birdTop = bird.y;
    const birdBottom = bird.y + bird.height;
    const birdLeft = bird.x;
    const birdRight = bird.x + bird.width;
    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + pipe.width;
    const horizontalCollision = birdRight > pipeLeft && birdLeft < pipeRight;
    const verticalCollision = birdTop < pipe.topHeight || birdBottom > pipe.bottomY;

    return horizontalCollision && verticalCollision;
  }
}
