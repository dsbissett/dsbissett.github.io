import { Injectable } from '@angular/core';

import { TETRIS_GAME_CONFIG } from '../constants/tetris-game-config.constant';
import { TetrisCanvasSize } from '../interfaces/tetris-canvas-size.interface';

@Injectable()
export class TetrisCanvasService {
  public createContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('A 2D canvas context is required for Tetris.');
    }

    return context;
  }

  public calculateBlockSize(): number {
    const isMobile = window.innerWidth <= 600;
    const hPad = isMobile ? 48 : 96;
    const vPad = isMobile ? 170 : 240;

    const maxFromWidth = Math.floor(
      (window.innerWidth - hPad) / TETRIS_GAME_CONFIG.gridWidth
    );
    const maxFromHeight = Math.floor(
      (window.innerHeight - vPad) / TETRIS_GAME_CONFIG.gridHeight
    );

    return Math.min(maxFromWidth, maxFromHeight, 40);
  }

  public resizeGameCanvas(
    canvas: HTMLCanvasElement,
    blockSize: number
  ): TetrisCanvasSize {
    const width = blockSize * TETRIS_GAME_CONFIG.gridWidth;
    const height = blockSize * TETRIS_GAME_CONFIG.gridHeight;
    canvas.width = width;
    canvas.height = height;

    return { width, height, blockSize };
  }

  public resizePreviewCanvas(canvas: HTMLCanvasElement, blockSize: number): void {
    canvas.width = blockSize * TETRIS_GAME_CONFIG.previewCanvasCells;
    canvas.height = blockSize * TETRIS_GAME_CONFIG.previewCanvasCells;
  }
}
