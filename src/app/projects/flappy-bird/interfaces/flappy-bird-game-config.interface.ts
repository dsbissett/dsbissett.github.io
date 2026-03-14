import { FlappyBirdSpriteFrame } from './flappy-bird-sprite-frame.interface';

export interface FlappyBirdGameConfig {
  backgroundScrollFactor: number;
  baseGroundSpeed: number;
  basePipeSpeed: number;
  birdFlapCadence: number;
  birdFrames: readonly FlappyBirdSpriteFrame[];
  birdGravity: number;
  birdHeight: number;
  birdJumpLift: number;
  birdStartX: number;
  birdStartY: number;
  birdVelocityDamping: number;
  birdWidth: number;
  fontFamily: string;
  gameHeight: number;
  gameWidth: number;
  groundCollisionHeight: number;
  groundDrawHeight: number;
  groundDrawY: number;
  groundSourceHeight: number;
  groundSourceWidth: number;
  groundSourceX: number;
  groundSourceY: number;
  groundTileStep: number;
  pipeLeadDistance: number;
  pipeMaxTop: number;
  pipeMinTop: number;
  pipeNarrowGap: number;
  pipeNormalGap: number;
  pipeWidth: number;
  scoreFontSize: number;
}
