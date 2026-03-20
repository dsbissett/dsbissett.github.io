import { Injectable } from '@angular/core';

import { TETRIS_GAME_CONFIG } from '../constants/tetris-game-config.constant';
import { TetrisTouchState } from '../interfaces/tetris-touch-state.interface';

@Injectable()
export class TetrisInputService {
  private touchState: TetrisTouchState | null = null;

  public handleTouchStart(event: TouchEvent): void {
    this.touchState = {
      startX: event.touches[0].clientX,
      startY: event.touches[0].clientY,
    };
  }

  public handleTouchMove(
    event: TouchEvent,
    blockSize: number
  ): TouchMoveAction | null {
    if (!this.touchState) {
      return null;
    }

    const currentX = event.touches[0].clientX;
    const currentY = event.touches[0].clientY;
    const dx = currentX - this.touchState.startX;
    const dy = currentY - this.touchState.startY;
    const threshold = blockSize * TETRIS_GAME_CONFIG.touchSwipeThreshold;

    return this.resolveTouchMoveAction(dx, dy, threshold, currentX, currentY);
  }

  public handleTouchEnd(event: TouchEvent, blockSize: number): boolean {
    if (!this.touchState) {
      return false;
    }

    const dx = event.changedTouches[0].clientX - this.touchState.startX;
    const dy = event.changedTouches[0].clientY - this.touchState.startY;
    const tapThreshold = blockSize * TETRIS_GAME_CONFIG.touchTapThreshold;
    this.touchState = null;

    return Math.abs(dx) < tapThreshold && Math.abs(dy) < tapThreshold;
  }

  public reset(): void {
    this.touchState = null;
  }

  private resolveTouchMoveAction(
    dx: number,
    dy: number,
    threshold: number,
    currentX: number,
    currentY: number
  ): TouchMoveAction | null {
    if (this.isHorizontalSwipe(dx, dy)) {
      return this.resolveHorizontalAction(dx, threshold, currentX);
    }

    return this.resolveVerticalAction(dy, threshold, currentY);
  }

  private isHorizontalSwipe(dx: number, dy: number): boolean {
    return Math.abs(dx) > Math.abs(dy);
  }

  private resolveHorizontalAction(
    dx: number,
    threshold: number,
    currentX: number
  ): TouchMoveAction | null {
    if (dx > threshold) {
      this.touchState!.startX = currentX;
      return 'moveRight';
    }

    if (dx < -threshold) {
      this.touchState!.startX = currentX;
      return 'moveLeft';
    }

    return null;
  }

  private resolveVerticalAction(
    dy: number,
    threshold: number,
    currentY: number
  ): TouchMoveAction | null {
    if (dy > threshold) {
      this.touchState!.startY = currentY;
      return 'moveDown';
    }

    return null;
  }
}

export type TouchMoveAction = 'moveLeft' | 'moveRight' | 'moveDown';
