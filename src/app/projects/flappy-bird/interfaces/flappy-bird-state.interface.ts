import { FlappyBird } from '../classes/flappy-bird.class';
import { FlappyPipe } from '../classes/flappy-pipe.class';
import { FlappyBirdGameStatus } from '../types/flappy-bird-game-status.type';

export interface FlappyBirdState {
  backgroundX: number;
  bird: FlappyBird;
  gameStatus: FlappyBirdGameStatus;
  groundX: number;
  hasStarted: boolean;
  lastGapCenter: number;
  nextPipeDelay: number;
  pipes: FlappyPipe[];
  score: number;
  spawnTimer: number;
  speedFactor: number;
}
