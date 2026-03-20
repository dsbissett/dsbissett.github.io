import { Injectable } from '@angular/core';

import { TETRIS_COLOR_PALETTE } from '../constants/tetris-color-palette.constant';
import { TETRIS_GAME_CONFIG } from '../constants/tetris-game-config.constant';

@Injectable()
export class TetrisPreviewRendererService {
  public render(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    matrix: number[][]
  ): void {
    this.clearCanvas(context, canvas);
    this.drawCenteredMatrix(context, canvas, matrix);
  }

  private clearCanvas(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement
  ): void {
    context.fillStyle = TETRIS_GAME_CONFIG.previewBackgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  private drawCenteredMatrix(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    matrix: number[][]
  ): void {
    const blockSize = TETRIS_GAME_CONFIG.previewBlockSize;
    const xOffset = Math.floor((canvas.width / blockSize - matrix[0].length) / 2);
    const yOffset = Math.floor((canvas.height / blockSize - matrix.length) / 2);

    matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          this.drawBlock(context, x + xOffset, y + yOffset, value, blockSize);
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
}
