import { Injectable } from '@angular/core';

import { FLAPPY_BIRD_GAME_CONFIG } from '../constants/flappy-bird-game-config.constant';
import { FlappyBirdAssets } from '../interfaces/flappy-bird-assets.interface';
import { FlappyBirdLayout } from '../interfaces/flappy-bird-layout.interface';
import { FlappyBirdState } from '../interfaces/flappy-bird-state.interface';

@Injectable()
export class FlappyBirdRendererService {
  public render(
    context: CanvasRenderingContext2D,
    layout: FlappyBirdLayout,
    state: FlappyBirdState,
    assets: FlappyBirdAssets,
    fontReady: boolean
  ): void {
    this.clearCanvas(context, layout);
    this.drawBackground(context, layout, state, assets);
    this.drawGameSpace(context, layout, state);
    this.drawGround(context, layout, state, assets);
    this.drawHud(context, layout, state, fontReady);
  }

  private clearCanvas(
    context: CanvasRenderingContext2D,
    layout: FlappyBirdLayout
  ): void {
    context.fillStyle = '#000';
    context.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight);
  }

  private drawBackground(
    context: CanvasRenderingContext2D,
    layout: FlappyBirdLayout,
    state: FlappyBirdState,
    assets: FlappyBirdAssets
  ): void {
    const drawWidth = layout.canvasWidth + 1;

    context.drawImage(
      assets.background,
      Math.floor(state.backgroundX),
      0,
      drawWidth,
      layout.canvasHeight
    );
    context.drawImage(
      assets.background,
      Math.floor(state.backgroundX) + layout.canvasWidth,
      0,
      drawWidth,
      layout.canvasHeight
    );
  }

  private drawGameOverText(
    context: CanvasRenderingContext2D,
    state: FlappyBirdState
  ): void {
    context.font = `128px ${FLAPPY_BIRD_GAME_CONFIG.fontFamily}`;
    context.fillText(
      'GAME OVER',
      FLAPPY_BIRD_GAME_CONFIG.gameWidth / 2,
      FLAPPY_BIRD_GAME_CONFIG.gameHeight / 2 - 50
    );

    context.font = `32px ${FLAPPY_BIRD_GAME_CONFIG.fontFamily}`;
    context.fillText(
      `SCORE: ${state.score}`,
      FLAPPY_BIRD_GAME_CONFIG.gameWidth / 2,
      FLAPPY_BIRD_GAME_CONFIG.gameHeight / 2 + 10
    );
  }

  private drawGameSpace(
    context: CanvasRenderingContext2D,
    layout: FlappyBirdLayout,
    state: FlappyBirdState
  ): void {
    context.save();
    context.translate(layout.offsetX, layout.offsetY);
    context.scale(layout.scale, layout.scale);

    for (const pipe of state.pipes) {
      pipe.draw(context, FLAPPY_BIRD_GAME_CONFIG.gameHeight);
    }

    state.bird.draw(context, state.gameStatus);
    context.restore();
  }

  private drawGround(
    context: CanvasRenderingContext2D,
    layout: FlappyBirdLayout,
    state: FlappyBirdState,
    assets: FlappyBirdAssets
  ): void {
    const drawWidth = FLAPPY_BIRD_GAME_CONFIG.groundSourceWidth * layout.scale;
    const drawHeight = FLAPPY_BIRD_GAME_CONFIG.groundDrawHeight * layout.scale;
    const drawY =
      layout.offsetY + layout.scale * FLAPPY_BIRD_GAME_CONFIG.groundDrawY;
    const step = FLAPPY_BIRD_GAME_CONFIG.groundTileStep * layout.scale;
    let startX = layout.offsetX + state.groundX * layout.scale;

    while (startX > -step) {
      startX -= step;
    }

    const tiles = Math.ceil((layout.canvasWidth - startX) / step) + 1;

    for (let index = 0; index < tiles; index += 1) {
      context.drawImage(
        assets.spriteMap,
        FLAPPY_BIRD_GAME_CONFIG.groundSourceX,
        FLAPPY_BIRD_GAME_CONFIG.groundSourceY,
        FLAPPY_BIRD_GAME_CONFIG.groundSourceWidth,
        FLAPPY_BIRD_GAME_CONFIG.groundSourceHeight,
        startX + index * step,
        drawY,
        drawWidth,
        drawHeight
      );
    }
  }

  private drawHud(
    context: CanvasRenderingContext2D,
    layout: FlappyBirdLayout,
    state: FlappyBirdState,
    fontReady: boolean
  ): void {
    if (!fontReady) {
      return;
    }

    context.save();
    context.translate(layout.offsetX, layout.offsetY);
    context.scale(layout.scale, layout.scale);
    context.fillStyle = '#fff';
    context.strokeStyle = '#000';
    context.lineWidth = 4;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `${FLAPPY_BIRD_GAME_CONFIG.scoreFontSize}px ${FLAPPY_BIRD_GAME_CONFIG.fontFamily}`;
    context.strokeText(
      `${state.score}`,
      FLAPPY_BIRD_GAME_CONFIG.gameWidth / 2,
      50
    );
    context.fillText(
      `${state.score}`,
      FLAPPY_BIRD_GAME_CONFIG.gameWidth / 2,
      50
    );

    if (state.gameStatus === 'gameOver') {
      this.drawGameOverText(context, state);
    }

    context.restore();
  }
}
