import { Injectable, inject } from '@angular/core';

import { TETRIS_AI_CONFIG } from '../constants/tetris-ai-config.constant';
import { TETRIS_GAME_CONFIG } from '../constants/tetris-game-config.constant';
import { TetrisActivePiece } from '../classes/tetris-active-piece.class';
import { TetrisMatrix } from '../classes/tetris-matrix.class';
import { TetrisCanvasSize } from '../interfaces/tetris-canvas-size.interface';
import { TetrisGameState } from '../interfaces/tetris-game-state.interface';
import { TetrisAnimationFrameService } from './tetris-animation-frame.service';
import { TetrisAiControllerService } from './tetris-ai-controller.service';
import { TetrisAudioService } from './tetris-audio.service';
import { TetrisBackgroundService } from './tetris-background.service';
import { TetrisBlockEffectManagerService } from './tetris-block-effect-manager.service';
import { TetrisCanvasService } from './tetris-canvas.service';
import { TetrisCollisionService } from './tetris-collision.service';
import { TetrisGridService } from './tetris-grid.service';
import { TetrisInputService, TouchMoveAction } from './tetris-input.service';
import { TetrisPieceGeneratorService } from './tetris-piece-generator.service';
import { TetrisPreviewRendererService } from './tetris-preview-renderer.service';
import { TetrisRendererService } from './tetris-renderer.service';
import { TetrisScoringService } from './tetris-scoring.service';
import { TetrisStateService } from './tetris-state.service';

@Injectable()
export class TetrisFacadeService {
  private readonly animationFrame = inject(TetrisAnimationFrameService);
  private readonly aiController = inject(TetrisAiControllerService);
  private readonly audioService = inject(TetrisAudioService);
  private readonly backgroundService = inject(TetrisBackgroundService);
  private readonly blockEffects = inject(TetrisBlockEffectManagerService);
  private readonly canvasService = inject(TetrisCanvasService);
  private readonly collisionService = inject(TetrisCollisionService);
  private readonly gridService = inject(TetrisGridService);
  private readonly inputService = inject(TetrisInputService);
  private readonly pieceGenerator = inject(TetrisPieceGeneratorService);
  private readonly previewRenderer = inject(TetrisPreviewRendererService);
  private readonly renderer = inject(TetrisRendererService);
  private readonly scoringService = inject(TetrisScoringService);
  private readonly stateService = inject(TetrisStateService);

  private gameContext: CanvasRenderingContext2D | null = null;
  private gameCanvas: HTMLCanvasElement | null = null;
  private previewCanvases: HTMLCanvasElement[] = [];
  private previewContexts: CanvasRenderingContext2D[] = [];
  private canvasSize: TetrisCanvasSize | null = null;
  private aiRestartCounterMs = 0;

  public initializeCharts(
    rewardCanvas: HTMLCanvasElement,
    penaltyCanvas: HTMLCanvasElement,
  ): void {
    this.aiController.initializeCharts(rewardCanvas, penaltyCanvas);
  }

  public readonly aiEnabled = this.aiController.isEnabled;
  public readonly aiReady = this.aiController.isReady;
  public readonly demonstrationRecordingEnabled = this.aiController.isRecordingDemonstrations;
  public readonly aiStats = this.aiController.stats;
  public readonly aiProgress = this.aiController.progress;

  public initialize(
    gameCanvas: HTMLCanvasElement,
    previewCanvases: HTMLCanvasElement[],
    effectsCanvas: HTMLCanvasElement,
    backgroundCanvas: HTMLCanvasElement,
  ): void {
    this.gameCanvas = gameCanvas;
    this.gameContext = this.canvasService.createContext(gameCanvas);
    this.previewCanvases = previewCanvases;
    this.previewContexts = previewCanvases.map((c) => this.canvasService.createContext(c));

    this.audioService.initialize();
    this.setupCanvasSizes();
    this.backgroundService.initialize(backgroundCanvas);
    this.blockEffects.initialize(effectsCanvas, gameCanvas.getBoundingClientRect());
    this.startNewGame();
    void this.initializeAi();
    this.animationFrame.start((deltaMs) => this.gameLoop(deltaMs));
  }

  public destroy(): void {
    this.animationFrame.stop();
    this.audioService.destroy();
    this.stateService.clear();
    this.backgroundService.destroy();
    this.blockEffects.destroy();
    this.aiController.destroyCharts();
    this.inputService.reset();
    this.gameContext = null;
    this.gameCanvas = null;
    this.canvasSize = null;
  }

  public handleKeydown(event: KeyboardEvent): void {
    if (!this.stateService.hasState()) {
      return;
    }

    if (this.aiController.isActive()) {
      return;
    }

    const state = this.stateService.getState();

    if (state.status === 'gameOver') {
      this.handleGameOverKeydown();
      return;
    }

    this.handlePlayingKeydown(event, state);
  }

  public handleTouchStart(event: TouchEvent): void {
    event.preventDefault();

    if (this.aiController.isActive()) {
      return;
    }

    this.audioService.startMusic();
    this.inputService.handleTouchStart(event);
  }

  public handleTouchMove(event: TouchEvent): void {
    event.preventDefault();

    if (this.aiController.isActive()) {
      return;
    }

    if (!this.canvasSize || !this.stateService.hasState()) {
      return;
    }

    const action = this.inputService.handleTouchMove(event, this.canvasSize.blockSize);

    if (action) {
      this.executeTouchAction(action);
    }
  }

  public handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();

    if (this.aiController.isActive()) {
      return;
    }

    if (!this.canvasSize || !this.stateService.hasState()) {
      return;
    }

    const state = this.stateService.getState();
    const isTap = this.inputService.handleTouchEnd(event, this.canvasSize.blockSize);

    if (isTap && state.status === 'playing') {
      this.attemptRotation(state);
    }
  }

  private setupCanvasSizes(): void {
    if (!this.gameCanvas) {
      return;
    }

    const blockSize = this.canvasService.calculateBlockSize();
    this.canvasSize = this.canvasService.resizeGameCanvas(this.gameCanvas, blockSize);

    this.previewCanvases.forEach((canvas) => {
      this.canvasService.resizePreviewCanvas(canvas, blockSize);
    });
  }

  private startNewGame(): void {
    const grid = this.gridService.createEmptyGrid();
    const previewQueue = this.pieceGenerator.createPreviewQueue(3);
    const firstPiece = this.pieceGenerator.generatePiece();
    const startX = this.calculateStartX(firstPiece);

    const state: TetrisGameState = {
      grid,
      activePiece: new TetrisActivePiece(firstPiece, startX, 0),
      previewQueue,
      score: 0,
      totalClearedRows: 0,
      dropIntervalMs: TETRIS_GAME_CONFIG.initialDropIntervalMs,
      dropCounterMs: 0,
      status: 'playing',
    };

    this.stateService.setState(state);
    this.blockEffects.reset();
    this.audioService.resetMusicSpeed();
    this.aiRestartCounterMs = 0;
    this.aiController.onEpisodeStart();
    this.renderAllPreviews(state);

    if (this.aiController.isActive() || this.aiController.isRecordingDemonstrations()) {
      this.aiController.onNewPiece(state);
    }
  }

  private gameLoop(deltaMs: number): void {
    if (!this.gameContext || !this.canvasSize || !this.stateService.hasState()) {
      return;
    }

    this.backgroundService.update(deltaMs);

    const state = this.stateService.getState();

    if (state.status === 'playing') {
      const didHardDrop = this.aiController.tick(state, deltaMs);

      if (didHardDrop && state.status === 'playing') {
        this.lockPiece(state);
      }

      if (state.status === 'playing' && !didHardDrop) {
        this.updatePlaying(state, deltaMs);
      }
    } else if (this.aiController.isActive()) {
      this.handleAiRestart(deltaMs);
    }

    this.renderer.render(this.gameContext, state, this.canvasSize);
    this.blockEffects.updateAndDraw();
    this.aiController.renderCharts();

    if (state.status === 'gameOver') {
      this.renderer.renderGameOver(this.gameContext, this.canvasSize);
    }
  }

  private updatePlaying(state: TetrisGameState, deltaMs: number): void {
    state.dropCounterMs += deltaMs;

    if (state.dropCounterMs <= state.dropIntervalMs) {
      return;
    }

    this.applyGravityDrop(state);
    state.dropCounterMs = 0;
  }

  private applyGravityDrop(state: TetrisGameState): void {
    const piece = state.activePiece;
    const canDrop = !this.collisionService.hasCollision(
      piece.matrix,
      state.grid,
      piece.x,
      piece.y + 1,
    );

    if (canDrop) {
      piece.y++;
      return;
    }

    this.lockPiece(state);
  }

  private lockPiece(state: TetrisGameState): void {
    const lockedMatrix = TetrisMatrix.deepCopy(state.activePiece.matrix);
    const lockedX = state.activePiece.x;
    this.gridService.merge(state.grid, state.activePiece);
    this.audioService.playLand();
    this.aiController.onHumanPieceLocked(lockedMatrix, lockedX);
    const clearedLines = this.handleLineClear(state);
    this.spawnNextPiece(state);
    this.checkGameOver(state);
    this.aiController.onPieceLocked(state, clearedLines, state.status === 'gameOver');

    if (
      state.status === 'playing' &&
      (this.aiController.isActive() || this.aiController.isRecordingDemonstrations())
    ) {
      this.aiController.onNewPiece(state);
    }
  }

  private handleLineClear(state: TetrisGameState): number {
    const result = this.gridService.clearLines(state.grid);

    if (result.clearedCount === 0) {
      return 0;
    }

    this.audioService.playClear();
    this.scoringService.applyLineClear(state, result.clearedCount);

    if (this.canvasSize) {
      this.blockEffects.createFromClearedCells(result.clearedCells, this.canvasSize.blockSize);
    }

    if (!this.aiController.isActive() && this.scoringService.shouldSpeedUp(state.totalClearedRows)) {
      this.scoringService.applySpeedUp(state);
      this.audioService.increaseMusicSpeed();
    }

    return result.clearedCount;
  }

  private spawnNextPiece(state: TetrisGameState): void {
    const nextMatrix = this.pieceGenerator.advanceQueue(state.previewQueue);
    state.activePiece.matrix = nextMatrix;
    state.activePiece.x = this.calculateStartX(nextMatrix);
    state.activePiece.y = 0;
    this.renderAllPreviews(state);
  }

  private checkGameOver(state: TetrisGameState): void {
    const hasCollision = this.collisionService.hasCollision(
      state.activePiece.matrix,
      state.grid,
      state.activePiece.x,
      state.activePiece.y,
    );

    if (hasCollision) {
      state.status = 'gameOver';
    }
  }

  private handlePlayingKeydown(event: KeyboardEvent, state: TetrisGameState): void {
    this.audioService.startMusic();

    switch (event.key) {
      case 'ArrowLeft':
        this.attemptMove(state, -1, 0);
        break;
      case 'ArrowRight':
        this.attemptMove(state, 1, 0);
        break;
      case 'ArrowDown':
        this.attemptMoveDown(state);
        break;
      case 'ArrowUp':
        this.attemptRotation(state);
        break;
    }
  }

  private handleGameOverKeydown(): void {
    this.startNewGame();
  }

  private attemptMove(state: TetrisGameState, dx: number, dy: number): void {
    const piece = state.activePiece;
    const blocked = this.collisionService.hasCollision(
      piece.matrix,
      state.grid,
      piece.x + dx,
      piece.y + dy,
    );

    if (!blocked) {
      piece.x += dx;
      piece.y += dy;
      this.audioService.playMove();
    }
  }

  private attemptMoveDown(state: TetrisGameState): void {
    const piece = state.activePiece;
    const blocked = this.collisionService.hasCollision(
      piece.matrix,
      state.grid,
      piece.x,
      piece.y + 1,
    );

    if (!blocked) {
      piece.y++;
      this.audioService.playMove();
      return;
    }

    this.lockPiece(state);
  }

  private attemptRotation(state: TetrisGameState): void {
    const piece = state.activePiece;
    const rotated = TetrisMatrix.rotate(piece.matrix);
    const blocked = this.collisionService.hasCollision(rotated, state.grid, piece.x, piece.y);

    if (!blocked) {
      piece.matrix = rotated;
      this.audioService.playRotate();
    }
  }

  private executeTouchAction(action: TouchMoveAction): void {
    const state = this.stateService.getState();

    if (state.status !== 'playing') {
      return;
    }

    switch (action) {
      case 'moveLeft':
        this.attemptMove(state, -1, 0);
        break;
      case 'moveRight':
        this.attemptMove(state, 1, 0);
        break;
      case 'moveDown':
        this.attemptMoveDown(state);
        break;
    }
  }

  private renderAllPreviews(state: TetrisGameState): void {
    state.previewQueue.forEach((matrix, i) => {
      if (this.previewContexts[i] && this.previewCanvases[i]) {
        this.previewRenderer.render(this.previewContexts[i], this.previewCanvases[i], matrix);
      }
    });
  }

  private calculateStartX(matrix: number[][]): number {
    return Math.floor(TETRIS_GAME_CONFIG.gridWidth / 2 - Math.ceil(matrix[0].length / 2));
  }

  public async setAiEnabled(enabled: boolean): Promise<void> {
    if (!this.aiReady()) {
      await this.aiController.initialize();
    }

    if (enabled) {
      this.aiController.setDemonstrationRecordingEnabled(false);
    }

    this.aiController.setEnabled(enabled);
    this.aiRestartCounterMs = 0;

    if (!enabled || !this.stateService.hasState()) {
      return;
    }

    this.audioService.startMusic();
    const state = this.stateService.getState();

    if (state.status === 'gameOver') {
      this.startNewGame();
      return;
    }

    this.aiController.onNewPiece(state);
  }

  public resetAiTraining(): void {
    this.aiController.reset();

    if (!this.stateService.hasState()) {
      return;
    }

    const state = this.stateService.getState();
    if (this.aiController.isActive() && state.status === 'playing') {
      this.aiController.onNewPiece(state);
    }
  }

  public async exportTrainingData(): Promise<string> {
    if (!this.aiReady()) {
      await this.aiController.initialize();
    }

    return this.aiController.exportTrainingData();
  }

  public async importTrainingData(json: string): Promise<void> {
    if (!this.aiReady()) {
      await this.aiController.initialize();
    }

    await this.aiController.importTrainingData(json);

    if (!this.stateService.hasState()) {
      return;
    }

    const state = this.stateService.getState();
    if (
      state.status === 'playing' &&
      (this.aiController.isActive() || this.aiController.isRecordingDemonstrations())
    ) {
      this.aiController.onNewPiece(state);
    }
  }

  private async initializeAi(): Promise<void> {
    await this.aiController.initialize();

    if (
      (!this.aiController.isActive() && !this.aiController.isRecordingDemonstrations()) ||
      !this.stateService.hasState()
    ) {
      return;
    }

    this.audioService.startMusic();
    const state = this.stateService.getState();

    if (state.status === 'playing') {
      this.aiController.onNewPiece(state);
    }
  }

  public async setDemonstrationRecordingEnabled(enabled: boolean): Promise<void> {
    if (!this.aiReady()) {
      await this.aiController.initialize();
    }

    if (enabled) {
      this.aiController.setEnabled(false);
    }

    this.aiController.setDemonstrationRecordingEnabled(enabled);

    if (!enabled || !this.stateService.hasState()) {
      return;
    }

    const state = this.stateService.getState();
    if (state.status === 'playing') {
      this.aiController.onNewPiece(state);
    }
  }

  private handleAiRestart(deltaMs: number): void {
    this.aiRestartCounterMs += deltaMs;

    if (this.aiRestartCounterMs >= TETRIS_AI_CONFIG.autoRestartDelayMs) {
      this.startNewGame();
    }
  }
}
