import { Injectable } from '@angular/core';

import { FlappyBird } from '../classes/flappy-bird.class';
import { FlappyPipe } from '../classes/flappy-pipe.class';
import { FLAPPY_BIRD_GAME_CONFIG } from '../constants/flappy-bird-game-config.constant';
import { FlappyBirdAssets } from '../interfaces/flappy-bird-assets.interface';
import { FlappyBirdState } from '../interfaces/flappy-bird-state.interface';

@Injectable()
export class FlappyBirdGameFactoryService {
  public createPipe(
    x: number,
    gap: number,
    topHeight: number,
    assets: FlappyBirdAssets
  ): FlappyPipe {
    return new FlappyPipe(
      x,
      FLAPPY_BIRD_GAME_CONFIG.pipeWidth,
      topHeight,
      topHeight + gap,
      assets.topPipe,
      assets.bottomPipe,
      FLAPPY_BIRD_GAME_CONFIG.basePipeSpeed
    );
  }

  public createState(nextPipeDelay: number, assets: FlappyBirdAssets): FlappyBirdState {
    return {
      backgroundX: 0,
      bird: new FlappyBird(
        FLAPPY_BIRD_GAME_CONFIG.birdStartX,
        FLAPPY_BIRD_GAME_CONFIG.birdStartY,
        FLAPPY_BIRD_GAME_CONFIG.birdWidth,
        FLAPPY_BIRD_GAME_CONFIG.birdHeight,
        assets.bird,
        FLAPPY_BIRD_GAME_CONFIG.birdFrames,
        FLAPPY_BIRD_GAME_CONFIG.birdJumpLift,
        FLAPPY_BIRD_GAME_CONFIG.birdGravity,
        FLAPPY_BIRD_GAME_CONFIG.birdVelocityDamping
      ),
      gameStatus: 'playing',
      groundX: 0,
      hasStarted: false,
      lastGapCenter: FLAPPY_BIRD_GAME_CONFIG.gameHeight / 2,
      nextPipeDelay,
      pipes: [],
      score: 0,
      spawnTimer: 0,
      speedFactor: 1,
    };
  }
}
