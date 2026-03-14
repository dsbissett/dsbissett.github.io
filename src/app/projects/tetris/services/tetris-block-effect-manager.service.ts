import { Injectable } from '@angular/core';

import { TETRIS_COLOR_PALETTE } from '../constants/tetris-color-palette.constant';
import { TETRIS_GAME_CONFIG } from '../constants/tetris-game-config.constant';
import { TetrisBlockEffect } from '../classes/tetris-block-effect.class';
import { TetrisClearedCell } from '../interfaces/tetris-cleared-cell.interface';

@Injectable()
export class TetrisBlockEffectManagerService {
  private effects: TetrisBlockEffect[] = [];
  private context: CanvasRenderingContext2D | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private offsetX = 0;
  private offsetY = 0;

  public initialize(
    effectsCanvas: HTMLCanvasElement,
    gameCanvasRect: DOMRect
  ): void {
    this.canvas = effectsCanvas;
    this.context = effectsCanvas.getContext('2d');
    this.offsetX = gameCanvasRect.left;
    this.offsetY = gameCanvasRect.top;
    this.resizeCanvas();
  }

  public createFromClearedCells(
    cells: TetrisClearedCell[],
    blockSize: number
  ): void {
    cells.forEach((cell) => this.createEffect(cell, blockSize));
  }

  public updateAndDraw(): void {
    if (!this.context || !this.canvas) {
      return;
    }

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.effects.length - 1; i >= 0; i--) {
      this.effects[i].update();
      this.drawEffect(this.effects[i]);
      this.removeIfOffScreen(i);
    }
  }

  public reset(): void {
    this.effects = [];
  }

  public destroy(): void {
    this.effects = [];
    this.context = null;
    this.canvas = null;
  }

  private resizeCanvas(): void {
    if (!this.canvas) {
      return;
    }

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private createEffect(cell: TetrisClearedCell, blockSize: number): void {
    const color = TETRIS_COLOR_PALETTE[cell.colorIndex] ?? '#fff';
    const speedX = this.randomInRange(
      TETRIS_GAME_CONFIG.blockEffectMinSpeedX,
      TETRIS_GAME_CONFIG.blockEffectMaxSpeedX
    );
    const speedY = this.randomInRange(
      TETRIS_GAME_CONFIG.blockEffectMinSpeedY,
      TETRIS_GAME_CONFIG.blockEffectMaxSpeedY
    );

    this.effects.push(
      new TetrisBlockEffect(
        cell.gridX * blockSize,
        cell.gridY * blockSize,
        color,
        blockSize,
        speedX,
        speedY,
        TETRIS_GAME_CONFIG.blockEffectGravity
      )
    );
  }

  private drawEffect(effect: TetrisBlockEffect): void {
    if (!this.context) {
      return;
    }

    const drawX = effect.x + this.offsetX;
    const drawY = effect.y + this.offsetY;
    const s = effect.size;
    const inset = 2;

    // Main fill
    this.context.fillStyle = effect.color;
    this.context.fillRect(drawX, drawY, s, s);

    // Top-left highlight
    this.context.fillStyle = `rgba(255, 255, 255, ${TETRIS_GAME_CONFIG.blockHighlightAlpha})`;
    this.context.beginPath();
    this.context.moveTo(drawX, drawY);
    this.context.lineTo(drawX + s, drawY);
    this.context.lineTo(drawX + s - inset, drawY + inset);
    this.context.lineTo(drawX + inset, drawY + inset);
    this.context.lineTo(drawX + inset, drawY + s - inset);
    this.context.lineTo(drawX, drawY + s);
    this.context.closePath();
    this.context.fill();

    // Bottom-right shadow
    this.context.fillStyle = `rgba(0, 0, 0, ${TETRIS_GAME_CONFIG.blockShadowAlpha})`;
    this.context.beginPath();
    this.context.moveTo(drawX + s, drawY);
    this.context.lineTo(drawX + s, drawY + s);
    this.context.lineTo(drawX, drawY + s);
    this.context.lineTo(drawX + inset, drawY + s - inset);
    this.context.lineTo(drawX + s - inset, drawY + s - inset);
    this.context.lineTo(drawX + s - inset, drawY + inset);
    this.context.closePath();
    this.context.fill();

    // Inner face
    this.context.fillStyle = effect.color;
    this.context.fillRect(drawX + inset, drawY + inset, s - inset * 2, s - inset * 2);

    // Outer border
    this.context.strokeStyle = TETRIS_GAME_CONFIG.blockStrokeColor;
    this.context.lineWidth = 1;
    this.context.strokeRect(drawX, drawY, s, s);
  }

  private removeIfOffScreen(index: number): void {
    const drawY = this.effects[index].y + this.offsetY;

    if (drawY > window.innerHeight) {
      this.effects.splice(index, 1);
    }
  }

  private randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
}
