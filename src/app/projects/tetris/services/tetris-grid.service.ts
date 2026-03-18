import { Injectable } from '@angular/core';

import { TETRIS_GAME_CONFIG } from '../constants/tetris-game-config.constant';
import { TetrisActivePiece } from '../classes/tetris-active-piece.class';
import { TetrisClearedCell } from '../interfaces/tetris-cleared-cell.interface';
import { TetrisLineClearResult } from '../interfaces/tetris-line-clear-result.interface';

@Injectable()
export class TetrisGridService {
  public createEmptyGrid(): number[][] {
    return Array.from(
      { length: TETRIS_GAME_CONFIG.gridHeight },
      () => Array(TETRIS_GAME_CONFIG.gridWidth).fill(0)
    );
  }

  public merge(grid: number[][], piece: TetrisActivePiece): void {
    piece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          grid[piece.y + y][piece.x + x] = value;
        }
      });
    });
  }

  public clearLines(grid: number[][]): TetrisLineClearResult {
    const clearedCells: TetrisClearedCell[] = [];
    let clearedCount = 0;

    for (let y = grid.length - 1; y >= 0; y--) {
      if (!this.isRowFull(grid[y])) {
        continue;
      }

      this.collectClearedCells(grid[y], y, clearedCells);
      this.removeRow(grid, y);
      y++;
      clearedCount++;
    }

    return { clearedCount, clearedCells };
  }

  public getStackHeight(grid: number[][]): number {
    for (let y = 0; y < grid.length; y++) {
      if (grid[y].some((cell) => cell !== 0)) {
        return grid.length - y;
      }
    }
    return 0;
  }

  public isTopRowOccupied(grid: number[][]): boolean {
    return grid[0].some((cell) => cell !== 0);
  }

  public resetGrid(grid: number[][]): void {
    grid.forEach((row) => row.fill(0));
  }

  private isRowFull(row: number[]): boolean {
    return row.every((cell) => cell !== 0);
  }

  private collectClearedCells(
    row: number[],
    y: number,
    cells: TetrisClearedCell[]
  ): void {
    row.forEach((colorIndex, x) => {
      cells.push({ gridX: x, gridY: y, colorIndex });
    });
  }

  private removeRow(grid: number[][], y: number): void {
    const row = grid.splice(y, 1)[0].fill(0);
    grid.unshift(row);
  }
}
