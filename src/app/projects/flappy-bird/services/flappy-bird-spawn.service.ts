import { Injectable, inject } from '@angular/core';

import { FLAPPY_BIRD_GAME_CONFIG } from '../constants/flappy-bird-game-config.constant';
import { FlappyBirdAssets } from '../interfaces/flappy-bird-assets.interface';
import { FlappyBirdLayout } from '../interfaces/flappy-bird-layout.interface';
import { FlappyBirdState } from '../interfaces/flappy-bird-state.interface';
import { FlappyBirdGameFactoryService } from './flappy-bird-game-factory.service';
import { FlappyBirdLayoutService } from './flappy-bird-layout.service';
import { FlappyBirdSpawnPolicyService } from './flappy-bird-spawn-policy.service';

@Injectable()
export class FlappyBirdSpawnService {
  private readonly factory = inject(FlappyBirdGameFactoryService);
  private readonly layoutService = inject(FlappyBirdLayoutService);
  private readonly policy = inject(FlappyBirdSpawnPolicyService);

  public getInitialDelay(): number {
    return this.policy.getPipeSettings(0).delay;
  }

  public spawnInitialPipe(
    state: FlappyBirdState,
    layout: FlappyBirdLayout,
    assets: FlappyBirdAssets
  ): void {
    this.spawnPipe(state, layout, assets);
  }

  public updateSpawning(
    state: FlappyBirdState,
    layout: FlappyBirdLayout,
    assets: FlappyBirdAssets,
    deltaMs: number
  ): void {
    state.spawnTimer += deltaMs;

    while (state.spawnTimer >= state.nextPipeDelay) {
      state.spawnTimer -= state.nextPipeDelay;
      this.spawnPipe(state, layout, assets);
    }
  }

  private createPipeX(layout: FlappyBirdLayout): number {
    return (
      this.layoutService.getViewBounds(layout).right +
      FLAPPY_BIRD_GAME_CONFIG.pipeLeadDistance
    );
  }

  private createTopHeight(gapCenter: number, gap: number): number {
    return gapCenter - gap / 2;
  }

  private spawnPipe(
    state: FlappyBirdState,
    layout: FlappyBirdLayout,
    assets: FlappyBirdAssets
  ): void {
    const settings = this.policy.getPipeSettings(state.score);
    const gapCenter = this.policy.chooseGapCenter(
      state.score,
      state.lastGapCenter,
      settings.gap,
      FLAPPY_BIRD_GAME_CONFIG.pipeMinTop,
      FLAPPY_BIRD_GAME_CONFIG.pipeMaxTop
    );
    const topHeight = this.createTopHeight(gapCenter, settings.gap);

    state.pipes.push(
      this.factory.createPipe(this.createPipeX(layout), settings.gap, topHeight, assets)
    );
    state.lastGapCenter = gapCenter;
    state.nextPipeDelay = settings.delay;
  }
}
