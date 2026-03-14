import { Injectable } from '@angular/core';

import { FLAPPY_BIRD_GAME_CONFIG } from '../constants/flappy-bird-game-config.constant';
import { FlappyBirdLayout } from '../interfaces/flappy-bird-layout.interface';
import { FlappyBirdState } from '../interfaces/flappy-bird-state.interface';

@Injectable()
export class FlappyBirdScrollService {
  public updateBackground(state: FlappyBirdState, layout: FlappyBirdLayout): void {
    const scrollSpeed =
      layout.canvasWidth *
      FLAPPY_BIRD_GAME_CONFIG.backgroundScrollFactor *
      state.speedFactor;

    state.backgroundX -= scrollSpeed;
    if (state.backgroundX <= -layout.canvasWidth) {
      state.backgroundX = 0;
    }
  }

  public updateGround(state: FlappyBirdState): void {
    state.groundX -= FLAPPY_BIRD_GAME_CONFIG.baseGroundSpeed * state.speedFactor;
    if (state.groundX <= -FLAPPY_BIRD_GAME_CONFIG.groundSourceWidth) {
      state.groundX += FLAPPY_BIRD_GAME_CONFIG.groundSourceWidth;
    }
  }
}
