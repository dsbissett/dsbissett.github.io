import { Injectable } from '@angular/core';

import { FLAPPY_BIRD_GAME_CONFIG } from '../constants/flappy-bird-game-config.constant';
import { FlappyBirdCanvasSize } from '../interfaces/flappy-bird-canvas-size.interface';
import { FlappyBirdLayout } from '../interfaces/flappy-bird-layout.interface';
import { FlappyBirdViewBounds } from '../interfaces/flappy-bird-view-bounds.interface';

@Injectable()
export class FlappyBirdLayoutService {
  public calculate(size: FlappyBirdCanvasSize): FlappyBirdLayout {
    const scaleX = size.width / FLAPPY_BIRD_GAME_CONFIG.gameWidth;
    const scaleY = size.height / FLAPPY_BIRD_GAME_CONFIG.gameHeight;
    const scale = Math.min(scaleX, scaleY);
    const scaledWidth = FLAPPY_BIRD_GAME_CONFIG.gameWidth * scale;
    const scaledHeight = FLAPPY_BIRD_GAME_CONFIG.gameHeight * scale;

    return {
      canvasHeight: size.height,
      canvasWidth: size.width,
      offsetX: (size.width - scaledWidth) / 2,
      offsetY: (size.height - scaledHeight) / 2,
      scale,
    };
  }

  public getViewBounds(layout: FlappyBirdLayout): FlappyBirdViewBounds {
    return {
      left: -layout.offsetX / layout.scale,
      right: (layout.canvasWidth - layout.offsetX) / layout.scale,
    };
  }
}
