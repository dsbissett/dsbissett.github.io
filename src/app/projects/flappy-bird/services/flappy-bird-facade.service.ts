import { Injectable, inject, signal } from '@angular/core';

import { FLAPPY_BIRD_ASSET_PATHS } from '../constants/flappy-bird-asset-paths.constant';
import { FLAPPY_BIRD_GAME_CONFIG } from '../constants/flappy-bird-game-config.constant';
import { FlappyBirdAssets } from '../interfaces/flappy-bird-assets.interface';
import { FlappyBirdLayout } from '../interfaces/flappy-bird-layout.interface';
import { FlappyBirdAnimationFrameService } from './flappy-bird-animation-frame.service';
import { FlappyBirdAssetLoaderService } from './flappy-bird-asset-loader.service';
import { FlappyBirdCanvasService } from './flappy-bird-canvas.service';
import { FlappyBirdCollisionService } from './flappy-bird-collision.service';
import { FlappyBirdFontService } from './flappy-bird-font.service';
import { FlappyBirdGameFactoryService } from './flappy-bird-game-factory.service';
import { FlappyBirdLayoutService } from './flappy-bird-layout.service';
import { FlappyBirdPipeManagerService } from './flappy-bird-pipe-manager.service';
import { FlappyBirdRendererService } from './flappy-bird-renderer.service';
import { FlappyBirdScrollService } from './flappy-bird-scroll.service';
import { FlappyBirdSpawnPolicyService } from './flappy-bird-spawn-policy.service';
import { FlappyBirdSpawnService } from './flappy-bird-spawn.service';
import { FlappyBirdStateService } from './flappy-bird-state.service';

@Injectable()
export class FlappyBirdFacadeService {
  private static readonly FRAME_DURATION_MS = 1000 / 60;

  private readonly animationFrame = inject(FlappyBirdAnimationFrameService);
  private readonly assetLoader = inject(FlappyBirdAssetLoaderService);
  private readonly canvasService = inject(FlappyBirdCanvasService);
  private readonly collisionService = inject(FlappyBirdCollisionService);
  private readonly fontService = inject(FlappyBirdFontService);
  private readonly gameFactory = inject(FlappyBirdGameFactoryService);
  private readonly layoutService = inject(FlappyBirdLayoutService);
  private readonly pipeManager = inject(FlappyBirdPipeManagerService);
  private readonly renderer = inject(FlappyBirdRendererService);
  private readonly scrollService = inject(FlappyBirdScrollService);
  private readonly spawnPolicy = inject(FlappyBirdSpawnPolicyService);
  private readonly spawnService = inject(FlappyBirdSpawnService);
  private readonly stateService = inject(FlappyBirdStateService);

  private assets: FlappyBirdAssets | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private layout: FlappyBirdLayout | null = null;
  private frameAccumulatorMs = 0;

  public readonly assetsReady = signal(false);
  public readonly initializationFailed = signal(false);

  public async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    this.context = this.canvasService.createContext(canvas);
    this.frameAccumulatorMs = 0;
    this.assetsReady.set(false);
    this.initializationFailed.set(false);

    try {
      this.assets = await this.assetLoader.loadAll(FLAPPY_BIRD_ASSET_PATHS);
      await this.fontService.ensureLoaded(
        FLAPPY_BIRD_GAME_CONFIG.fontFamily,
        FLAPPY_BIRD_ASSET_PATHS.font
      );
    } catch {
      this.initializationFailed.set(true);
      return;
    }

    this.handleResize();
    this.startGame();
    this.assetsReady.set(true);
    this.animationFrame.start((deltaMs) => this.renderFrame(deltaMs));
  }

  public destroy(): void {
    this.animationFrame.stop();
    this.assets = null;
    this.canvas = null;
    this.context = null;
    this.frameAccumulatorMs = 0;
    this.layout = null;
    this.stateService.clear();
  }

  public handleInput(): void {
    if (!this.stateService.hasState()) {
      return;
    }

    const state = this.stateService.getState();
    if (!state.hasStarted) {
      state.hasStarted = true;
      state.bird.jump(Date.now());
      return;
    }

    if (state.gameStatus === 'playing') {
      state.bird.jump(Date.now());
      return;
    }

    this.startGame();
  }

  public handleResize(): void {
    if (!this.canvas || !this.context) {
      return;
    }

    const size = this.canvasService.resize(this.canvas);
    this.canvasService.syncScale(this.context, this.canvas, size);
    this.layout = this.layoutService.calculate(size);
  }

  private applyGameOverFrame(): void {
    const state = this.stateService.getState();
    state.bird.setGameOverPhysics();

    if (!this.collisionService.hasGroundCollision(state.bird)) {
      state.bird.update(
        FLAPPY_BIRD_GAME_CONFIG.gameHeight - FLAPPY_BIRD_GAME_CONFIG.birdHeight,
        FLAPPY_BIRD_GAME_CONFIG.birdFlapCadence
      );
    }
  }

  private applyPlayingFrame(deltaMs: number): void {
    const state = this.stateService.getState();
    const layout = this.layout;

    if (!layout || !this.assets) {
      return;
    }

    if (!state.hasStarted) {
      return;
    }

    state.bird.update(
      FLAPPY_BIRD_GAME_CONFIG.gameHeight - FLAPPY_BIRD_GAME_CONFIG.birdHeight,
      FLAPPY_BIRD_GAME_CONFIG.birdFlapCadence
    );
    state.speedFactor = this.spawnPolicy.getSpeedFactor(state.score);
    this.scrollService.updateBackground(state, layout);
    this.scrollService.updateGround(state);
    this.spawnService.updateSpawning(state, layout, this.assets, deltaMs);
    this.pipeManager.updatePipes(state.pipes, state.speedFactor);
    this.resolveCollisions(layout);
  }

  private drawFrame(): void {
    if (!this.context || !this.layout || !this.assets || !this.stateService.hasState()) {
      return;
    }

    this.renderer.render(
      this.context,
      this.layout,
      this.stateService.getState(),
      this.assets,
      this.assetsReady()
    );
  }

  private renderFrame(deltaMs: number): void {
    if (!this.stateService.hasState()) {
      return;
    }

    this.frameAccumulatorMs += Math.min(deltaMs, 100);

    while (this.frameAccumulatorMs >= FlappyBirdFacadeService.FRAME_DURATION_MS) {
      this.runGameStep(FlappyBirdFacadeService.FRAME_DURATION_MS);
      this.frameAccumulatorMs -= FlappyBirdFacadeService.FRAME_DURATION_MS;
    }

    this.drawFrame();
  }

  private resolveCollisions(layout: FlappyBirdLayout): void {
    const state = this.stateService.getState();
    const viewBounds = this.layoutService.getViewBounds(layout);

    if (this.collisionService.hasPipeCollision(state.bird, state.pipes)) {
      state.gameStatus = 'gameOver';
      return;
    }

    state.score += this.pipeManager.collectScore(state.pipes, state.bird.x);
    this.pipeManager.removeOffScreenPipes(state.pipes, viewBounds.left);

    if (this.collisionService.hasGroundCollision(state.bird)) {
      state.gameStatus = 'gameOver';
    }
  }

  private startGame(): void {
    if (!this.assets || !this.layout) {
      return;
    }

    const state = this.gameFactory.createState(
      this.spawnService.getInitialDelay(),
      this.assets
    );

    state.bird.resetGravity();
    this.frameAccumulatorMs = 0;
    this.stateService.setState(state);
    this.spawnService.spawnInitialPipe(state, this.layout, this.assets);
  }

  private runGameStep(deltaMs: number): void {
    if (this.stateService.getState().gameStatus === 'gameOver') {
      this.applyGameOverFrame();
      return;
    }

    this.applyPlayingFrame(deltaMs);
  }
}
