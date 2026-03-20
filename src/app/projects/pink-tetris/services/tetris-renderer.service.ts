import { Injectable } from '@angular/core';

import { TETRIS_COLOR_PALETTE } from '../constants/tetris-color-palette.constant';
import { TETRIS_GAME_CONFIG } from '../constants/tetris-game-config.constant';
import { TetrisCanvasSize } from '../interfaces/tetris-canvas-size.interface';
import { TetrisGameState } from '../interfaces/tetris-game-state.interface';

@Injectable()
export class TetrisRendererService {
  public render(
    context: CanvasRenderingContext2D,
    state: TetrisGameState,
    size: TetrisCanvasSize
  ): void {
    this.clearCanvas(context, size);
    this.drawGridLines(context, size);
    this.drawMatrix(context, state.grid, 0, 0, size.blockSize);
    this.drawMatrix(
      context,
      state.activePiece.matrix,
      state.activePiece.x,
      state.activePiece.y,
      size.blockSize
    );
    this.drawScore(context, state.score);
  }

  public renderGameOver(
    context: CanvasRenderingContext2D,
    size: TetrisCanvasSize
  ): void {
    this.drawOverlay(context, size);
    this.drawGameOverText(context, size);
    this.drawRestartText(context, size);
  }

  private clearCanvas(
    context: CanvasRenderingContext2D,
    size: TetrisCanvasSize
  ): void {
    context.fillStyle = TETRIS_GAME_CONFIG.canvasBackgroundColor;
    context.fillRect(0, 0, size.width, size.height);
  }

  private drawGridLines(
    context: CanvasRenderingContext2D,
    size: TetrisCanvasSize
  ): void {
    context.strokeStyle = TETRIS_GAME_CONFIG.gridLineColor;
    context.lineWidth = 1;

    for (let x = 0; x <= TETRIS_GAME_CONFIG.gridWidth; x++) {
      context.beginPath();
      context.moveTo(x * size.blockSize, 0);
      context.lineTo(x * size.blockSize, size.height);
      context.stroke();
    }

    for (let y = 0; y <= TETRIS_GAME_CONFIG.gridHeight; y++) {
      context.beginPath();
      context.moveTo(0, y * size.blockSize);
      context.lineTo(size.width, y * size.blockSize);
      context.stroke();
    }
  }

  private drawMatrix(
    context: CanvasRenderingContext2D,
    matrix: number[][],
    offsetX: number,
    offsetY: number,
    blockSize: number
  ): void {
    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          this.drawBlock(context, x + offsetX, y + offsetY, value, blockSize);
        }
      });
    });
  }

  private drawBlock(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    value: number,
    blockSize: number
  ): void {
    const px = x * blockSize;
    const py = y * blockSize;
    const color = TETRIS_COLOR_PALETTE[value] ?? '#fff';
    const inset = 2;

    // Main block fill
    context.fillStyle = color;
    context.fillRect(px, py, blockSize, blockSize);

    // Top highlight
    context.fillStyle = `rgba(255, 255, 255, ${TETRIS_GAME_CONFIG.blockHighlightAlpha})`;
    context.beginPath();
    context.moveTo(px, py);
    context.lineTo(px + blockSize, py);
    context.lineTo(px + blockSize - inset, py + inset);
    context.lineTo(px + inset, py + inset);
    context.lineTo(px + inset, py + blockSize - inset);
    context.lineTo(px, py + blockSize);
    context.closePath();
    context.fill();

    // Bottom-right shadow
    context.fillStyle = `rgba(0, 0, 0, ${TETRIS_GAME_CONFIG.blockShadowAlpha})`;
    context.beginPath();
    context.moveTo(px + blockSize, py);
    context.lineTo(px + blockSize, py + blockSize);
    context.lineTo(px, py + blockSize);
    context.lineTo(px + inset, py + blockSize - inset);
    context.lineTo(px + blockSize - inset, py + blockSize - inset);
    context.lineTo(px + blockSize - inset, py + inset);
    context.closePath();
    context.fill();

    // Inner face
    context.fillStyle = color;
    context.fillRect(px + inset, py + inset, blockSize - inset * 2, blockSize - inset * 2);

    // Subtle inner glow
    const gradient = context.createRadialGradient(
      px + blockSize / 2,
      py + blockSize / 2,
      0,
      px + blockSize / 2,
      py + blockSize / 2,
      blockSize / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
    context.fillStyle = gradient;
    context.fillRect(px + inset, py + inset, blockSize - inset * 2, blockSize - inset * 2);

    // Outer border
    context.strokeStyle = TETRIS_GAME_CONFIG.blockStrokeColor;
    context.lineWidth = 1;
    context.strokeRect(px, py, blockSize, blockSize);
  }

  private drawScore(context: CanvasRenderingContext2D, score: number): void {
    context.save();
    context.shadowColor = 'rgba(0, 0, 0, 0.6)';
    context.shadowBlur = 4;
    context.shadowOffsetX = 1;
    context.shadowOffsetY = 1;
    context.fillStyle = TETRIS_GAME_CONFIG.scoreFontColor;
    context.font = `bold ${TETRIS_GAME_CONFIG.scoreFontSize}px ${TETRIS_GAME_CONFIG.scoreFont}`;
    context.fillText(
      `Score: ${score}`,
      TETRIS_GAME_CONFIG.scoreX,
      TETRIS_GAME_CONFIG.scoreY
    );
    context.restore();
  }

  private drawOverlay(
    context: CanvasRenderingContext2D,
    size: TetrisCanvasSize
  ): void {
    context.fillStyle = TETRIS_GAME_CONFIG.gameOverOverlayColor;
    context.fillRect(0, 0, size.width, size.height);
  }

  private drawGameOverText(
    context: CanvasRenderingContext2D,
    size: TetrisCanvasSize
  ): void {
    context.save();
    context.shadowColor = 'rgba(255, 105, 180, 0.6)';
    context.shadowBlur = 20;
    context.fillStyle = TETRIS_GAME_CONFIG.gameOverFontColor;
    context.font = `bold ${TETRIS_GAME_CONFIG.gameOverFontSize}px ${TETRIS_GAME_CONFIG.gameOverFont}`;
    const text = 'GAME OVER';
    const textWidth = context.measureText(text).width;
    context.fillText(text, size.width / 2 - textWidth / 2, size.height / 2 - 30);
    context.restore();
  }

  private drawRestartText(
    context: CanvasRenderingContext2D,
    size: TetrisCanvasSize
  ): void {
    context.save();
    context.shadowColor = 'rgba(255, 255, 255, 0.3)';
    context.shadowBlur = 6;
    context.fillStyle = 'rgba(255, 182, 217, 0.8)';
    context.font = `${TETRIS_GAME_CONFIG.gameOverSubFontSize}px ${TETRIS_GAME_CONFIG.gameOverSubFont}`;
    const text = 'Press any key to restart';
    const textWidth = context.measureText(text).width;
    context.fillText(text, size.width / 2 - textWidth / 2, size.height / 2 + 20);
    context.restore();
  }
}
