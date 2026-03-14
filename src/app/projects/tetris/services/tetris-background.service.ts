import { Injectable } from '@angular/core';

import { TETRIS_PIECE_DEFINITIONS } from '../constants/tetris-piece-definitions.constant';
import { TetrisPieceName } from '../types/tetris-piece-name.type';

interface FloatingPiece {
  matrix: number[][];
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  alpha: number;
  layer: number;
}

const PIECE_NAMES: TetrisPieceName[] = ['I', 'O', 'T', 'L', 'J', 'S', 'Z'];
const PIECE_COUNT = 18;
const BASE_HUE_SPEED = 8;

@Injectable()
export class TetrisBackgroundService {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private pieces: FloatingPiece[] = [];
  private hueOffset = 0;

  public initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.resizeCanvas();
    this.spawnPieces();
  }

  public update(deltaMs: number): void {
    if (!this.context || !this.canvas) {
      return;
    }

    this.hueOffset = (this.hueOffset + BASE_HUE_SPEED * (deltaMs / 1000)) % 360;

    this.clearCanvas();
    this.drawBackground();
    this.updateAndDrawPieces(deltaMs);
  }

  public destroy(): void {
    this.pieces = [];
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

  private spawnPieces(): void {
    this.pieces = [];

    for (let i = 0; i < PIECE_COUNT; i++) {
      this.pieces.push(this.createPiece(true));
    }
  }

  private createPiece(randomizePosition: boolean): FloatingPiece {
    const name = PIECE_NAMES[Math.floor(Math.random() * PIECE_NAMES.length)];
    const matrix = TETRIS_PIECE_DEFINITIONS[name];
    const layer = Math.random() < 0.4 ? 0 : Math.random() < 0.7 ? 1 : 2;
    const scale = [0.6, 1.0, 1.5][layer];
    const speedMultiplier = [0.3, 0.6, 1.0][layer];
    const alpha = [0.06, 0.1, 0.15][layer];
    const width = this.canvas?.width ?? window.innerWidth;
    const height = this.canvas?.height ?? window.innerHeight;

    return {
      matrix,
      x: randomizePosition ? Math.random() * width : width + Math.random() * 200,
      y: randomizePosition ? Math.random() * height : Math.random() * height,
      speedX: -(10 + Math.random() * 15) * speedMultiplier,
      speedY: (5 + Math.random() * 10) * speedMultiplier,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.4,
      scale,
      alpha,
      layer,
    };
  }

  private clearCanvas(): void {
    if (!this.context || !this.canvas) {
      return;
    }

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawBackground(): void {
    if (!this.context || !this.canvas) {
      return;
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    const hue1 = (220 + this.hueOffset) % 360;
    const hue2 = (260 + this.hueOffset) % 360;
    const hue3 = (240 + this.hueOffset) % 360;

    const gradient = this.context.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, `hsl(${hue1}, 30%, 8%)`);
    gradient.addColorStop(0.5, `hsl(${hue2}, 25%, 10%)`);
    gradient.addColorStop(1, `hsl(${hue3}, 28%, 12%)`);

    this.context.fillStyle = gradient;
    this.context.fillRect(0, 0, w, h);
  }

  private updateAndDrawPieces(deltaMs: number): void {
    if (!this.context || !this.canvas) {
      return;
    }

    const dt = deltaMs / 1000;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const sortedPieces = [...this.pieces].sort((a, b) => a.layer - b.layer);

    for (const piece of sortedPieces) {
      piece.x += piece.speedX * dt;
      piece.y += piece.speedY * dt;
      piece.rotation += piece.rotationSpeed * dt;

      const margin = 100 * piece.scale;
      if (piece.x < -margin || piece.y > h + margin || piece.y < -margin) {
        Object.assign(piece, this.createPiece(false));
        piece.x = w + Math.random() * 100;
      }

      this.drawPiece(piece);
    }
  }

  private drawPiece(piece: FloatingPiece): void {
    if (!this.context) {
      return;
    }

    const ctx = this.context;
    const blockSize = 16 * piece.scale;
    const pieceHue = (this.hueOffset + piece.layer * 40) % 360;

    ctx.save();
    ctx.globalAlpha = piece.alpha;
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.rotation);

    const halfW = (piece.matrix[0].length * blockSize) / 2;
    const halfH = (piece.matrix.length * blockSize) / 2;

    piece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          const bx = x * blockSize - halfW;
          const by = y * blockSize - halfH;
          ctx.fillStyle = `hsla(${pieceHue}, 50%, 55%, 1)`;
          ctx.fillRect(bx, by, blockSize - 1, blockSize - 1);
          ctx.strokeStyle = `hsla(${pieceHue}, 50%, 70%, 0.5)`;
          ctx.lineWidth = 1;
          ctx.strokeRect(bx, by, blockSize - 1, blockSize - 1);
        }
      });
    });

    ctx.restore();
  }
}
