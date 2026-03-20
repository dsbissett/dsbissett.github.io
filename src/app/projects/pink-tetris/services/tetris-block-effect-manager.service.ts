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
      this.drawButterfly(this.effects[i]);
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

    const jitterX = this.randomInRange(-blockSize * 0.2, blockSize * 0.2);
    const jitterY = this.randomInRange(-blockSize * 0.3, blockSize * 0.1);

    this.effects.push(
      new TetrisBlockEffect(
        cell.gridX * blockSize + blockSize / 2 + jitterX,
        cell.gridY * blockSize + blockSize / 2 + jitterY,
        color,
        blockSize,
        speedX,
        speedY,
        TETRIS_GAME_CONFIG.blockEffectGravity
      )
    );
  }

  private drawButterfly(effect: TetrisBlockEffect): void {
    if (!this.context) {
      return;
    }

    const ctx = this.context;
    const drawX = effect.x + this.offsetX;
    const drawY = effect.y + this.offsetY;
    const s = effect.size;

    const scale = s / 20;
    const flapScale = Math.cos(effect.wingPhase);
    const bodyLength = 12 * scale;
    const upperWingW = 14 * scale;
    const upperWingH = 11 * scale;
    const lowerWingW = 10 * scale;
    const lowerWingH = 8 * scale;

    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(effect.rotation);
    ctx.globalAlpha = effect.opacity;

    // Upper-left wing
    ctx.fillStyle = effect.color;
    ctx.beginPath();
    ctx.moveTo(0, -bodyLength * 0.2);
    ctx.bezierCurveTo(
      -upperWingW * 0.5 * flapScale, -upperWingH * 1.2,
      -upperWingW * 1.1 * flapScale, -upperWingH * 0.8,
      -upperWingW * 0.9 * flapScale, -bodyLength * 0.05
    );
    ctx.closePath();
    ctx.fill();

    // Upper-right wing
    ctx.beginPath();
    ctx.moveTo(0, -bodyLength * 0.2);
    ctx.bezierCurveTo(
      upperWingW * 0.5 * flapScale, -upperWingH * 1.2,
      upperWingW * 1.1 * flapScale, -upperWingH * 0.8,
      upperWingW * 0.9 * flapScale, -bodyLength * 0.05
    );
    ctx.closePath();
    ctx.fill();

    // Lower-left wing
    ctx.fillStyle = this.lightenColor(effect.color, 30);
    ctx.beginPath();
    ctx.moveTo(0, bodyLength * 0.05);
    ctx.bezierCurveTo(
      -lowerWingW * 0.6 * flapScale, lowerWingH * 0.3,
      -lowerWingW * 1.0 * flapScale, lowerWingH * 1.1,
      -lowerWingW * 0.3 * flapScale, bodyLength * 0.45
    );
    ctx.closePath();
    ctx.fill();

    // Lower-right wing
    ctx.beginPath();
    ctx.moveTo(0, bodyLength * 0.05);
    ctx.bezierCurveTo(
      lowerWingW * 0.6 * flapScale, lowerWingH * 0.3,
      lowerWingW * 1.0 * flapScale, lowerWingH * 1.1,
      lowerWingW * 0.3 * flapScale, bodyLength * 0.45
    );
    ctx.closePath();
    ctx.fill();

    // Wing inner pattern (spots)
    const spotAlpha = Math.abs(flapScale) * 0.7;
    ctx.fillStyle = `rgba(255, 255, 255, ${spotAlpha})`;
    const spotR = 3 * scale;
    // Left spot
    ctx.beginPath();
    ctx.arc(-upperWingW * 0.5 * flapScale, -upperWingH * 0.4, spotR, 0, Math.PI * 2);
    ctx.fill();
    // Right spot
    ctx.beginPath();
    ctx.arc(upperWingW * 0.5 * flapScale, -upperWingH * 0.4, spotR, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = this.darkenColor(effect.color, 60);
    ctx.beginPath();
    ctx.ellipse(0, 0, 1.5 * scale, bodyLength * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(0, -bodyLength * 0.45, 2.2 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Antennae
    ctx.strokeStyle = this.darkenColor(effect.color, 60);
    ctx.lineWidth = 1 * scale;
    ctx.lineCap = 'round';
    // Left antenna
    ctx.beginPath();
    ctx.moveTo(0, -bodyLength * 0.5);
    ctx.quadraticCurveTo(-4 * scale, -bodyLength * 0.95, -5 * scale, -bodyLength * 0.9);
    ctx.stroke();
    // Right antenna
    ctx.beginPath();
    ctx.moveTo(0, -bodyLength * 0.5);
    ctx.quadraticCurveTo(4 * scale, -bodyLength * 0.95, 5 * scale, -bodyLength * 0.9);
    ctx.stroke();

    ctx.restore();
  }

  private removeIfOffScreen(index: number): void {
    const effect = this.effects[index];
    const drawX = effect.x + this.offsetX;
    const drawY = effect.y + this.offsetY;

    if (
      drawY < -effect.size * 2 ||
      drawY > window.innerHeight + effect.size ||
      drawX < -effect.size * 4 ||
      drawX > window.innerWidth + effect.size * 4 ||
      effect.opacity <= 0
    ) {
      this.effects.splice(index, 1);
    }
  }

  private lightenColor(hex: string, amount: number): string {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private darkenColor(hex: string, amount: number): string {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }
}
