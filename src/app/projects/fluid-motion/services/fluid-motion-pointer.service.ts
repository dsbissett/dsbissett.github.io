import { Injectable } from '@angular/core';

import { FluidMotionPointer } from '../interfaces/fluid-motion-pointer.interface';

@Injectable()
export class FluidMotionPointerService {
  public attach(
    canvas: HTMLCanvasElement,
    pointers: FluidMotionPointer[]
  ): VoidFunction {
    const handleMouseMove = (event: MouseEvent) => {
      const pointer = pointers[0];
      pointer.moved = pointer.down;
      pointer.dx = (event.offsetX - pointer.x) * 10;
      pointer.dy = (event.offsetY - pointer.y) * 10;
      pointer.x = event.offsetX;
      pointer.y = event.offsetY;

      if (pointer.down) {
        pointer.color = this.createMouseColor();
      }
    };
    const handleMouseDown = () => {
      pointers[0].down = true;
    };
    const handleMouseLeave = () => {
      pointers[0].down = false;
    };
    const handleTouchStart = (event: TouchEvent) => {
      event.preventDefault();
      this.handleTouchStartInternal(event, canvas, pointers);
    };
    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      this.handleTouchMoveInternal(event, canvas, pointers);
    };
    const handleTouchEnd = (event: TouchEvent) => {
      this.handleTouchEndInternal(event, pointers);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }

  public createInitialPointers(): FluidMotionPointer[] {
    return [
      {
        color: [30, 0, 300],
        down: false,
        dx: 0,
        dy: 0,
        id: -1,
        moved: false,
        x: 0,
        y: 0,
      },
    ];
  }

  private createMouseColor(): [number, number, number] {
    return [
      Math.random() * 15 + 0.2,
      Math.random() * 15 + 0.2,
      Math.random() * 15 + 0.2,
    ];
  }

  private createTouchColor(): [number, number, number] {
    return [Math.random() * 10 + 1, Math.random() * 10 + 1, Math.random() * 10 + 1];
  }

  private ensurePointer(pointers: FluidMotionPointer[], index: number): FluidMotionPointer {
    if (!pointers[index]) {
      pointers[index] = {
        color: [30, 0, 300],
        down: false,
        dx: 0,
        dy: 0,
        id: -1,
        moved: false,
        x: 0,
        y: 0,
      };
    }

    return pointers[index];
  }

  private handleTouchEndInternal(
    event: TouchEvent,
    pointers: FluidMotionPointer[]
  ): void {
    for (const touch of Array.from(event.changedTouches)) {
      for (const pointer of pointers) {
        if (pointer.id === touch.identifier) {
          pointer.down = false;
        }
      }
    }
  }

  private handleTouchMoveInternal(
    event: TouchEvent,
    canvas: HTMLCanvasElement,
    pointers: FluidMotionPointer[]
  ): void {
    const rect = canvas.getBoundingClientRect();

    for (const [index, touch] of Array.from(event.targetTouches).entries()) {
      const pointer = this.ensurePointer(pointers, index);
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      pointer.moved = pointer.down;
      pointer.dx = (x - pointer.x) * 10;
      pointer.dy = (y - pointer.y) * 10;
      pointer.x = x;
      pointer.y = y;
    }
  }

  private handleTouchStartInternal(
    event: TouchEvent,
    canvas: HTMLCanvasElement,
    pointers: FluidMotionPointer[]
  ): void {
    const rect = canvas.getBoundingClientRect();

    for (const [index, touch] of Array.from(event.targetTouches).entries()) {
      const pointer = this.ensurePointer(pointers, index);
      pointer.id = touch.identifier;
      pointer.down = true;
      pointer.x = touch.clientX - rect.left;
      pointer.y = touch.clientY - rect.top;
      pointer.color = this.createTouchColor();
    }
  }
}
