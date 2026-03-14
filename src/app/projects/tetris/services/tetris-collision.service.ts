import { Injectable } from '@angular/core';

import { TETRIS_GAME_CONFIG } from '../constants/tetris-game-config.constant';

@Injectable()
export class TetrisCollisionService {
  public hasCollision(
    matrix: number[][],
    grid: number[][],
    offsetX: number,
    offsetY: number
  ): boolean {
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (this.isCellBlocked(matrix[y][x], grid, offsetX + x, offsetY + y)) {
          return true;
        }
      }
    }

    return false;
  }

  public isCellBlocked(
    cellValue: number,
    grid: number[][],
    gridX: number,
    gridY: number
  ): boolean {
    if (!cellValue) {
      return false;
    }

    return this.isOutOfBounds(gridX, gridY) || this.isOccupied(grid, gridX, gridY);
  }

  public isOutOfBounds(gridX: number, gridY: number): boolean {
    return (
      gridX < 0 ||
      gridX >= TETRIS_GAME_CONFIG.gridWidth ||
      gridY >= TETRIS_GAME_CONFIG.gridHeight
    );
  }

  public isOccupied(grid: number[][], gridX: number, gridY: number): boolean {
    return gridY >= 0 && !!grid[gridY] && grid[gridY][gridX] !== 0;
  }
}
