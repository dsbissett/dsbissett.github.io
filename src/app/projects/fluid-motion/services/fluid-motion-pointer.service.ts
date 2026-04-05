import { Injectable } from '@angular/core';

import { FluidMotionPointer } from '../interfaces/fluid-motion-pointer.interface';

@Injectable()
export class FluidMotionPointerService {
  private colorPhase = Math.random() * Math.PI * 2;

  public attach(canvas: HTMLCanvasElement, pointers: FluidMotionPointer[]): VoidFunction {
    const handleMouseMove = (event: MouseEvent) => {
      const pointer = pointers[0];
      pointer.moved = pointer.down;
      pointer.dx = (event.offsetX - pointer.x) * 10;
      pointer.dy = (event.offsetY - pointer.y) * 10;
      pointer.x = event.offsetX;
      pointer.y = event.offsetY;

      if (pointer.down) {
        pointer.color = this.createSpectralColor(pointer.x * 0.01 + pointer.y * 0.005, 1.12);
      }
    };
    const handleMouseDown = (event: MouseEvent) => {
      const pointer = pointers[0];
      pointer.down = true;
      pointer.dx = 0;
      pointer.dy = 0;
      pointer.moved = false;
      pointer.x = event.offsetX;
      pointer.y = event.offsetY;
      pointer.color = this.createSpectralColor(pointer.x * 0.01, 1.2);
    };
    const handleMouseLeave = () => {
      pointers[0].down = false;
    };
    const handleMouseUp = () => {
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
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }

  public createInitialPointers(): FluidMotionPointer[] {
    return [
      {
        color: this.createSpectralColor(0, 1.2),
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

  private ensurePointer(pointers: FluidMotionPointer[], index: number): FluidMotionPointer {
    if (!pointers[index]) {
      pointers[index] = {
        color: this.createSpectralColor(index * 0.8, 1.08),
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

  private createSpectralColor(seed: number, intensity: number): [number, number, number] {
    this.colorPhase = (this.colorPhase + 0.18) % (Math.PI * 2);
    const hue = this.getWrappedUnit(seed * 0.052 + this.colorPhase / (Math.PI * 2));
    const saturation = 0.78 + 0.18 * this.getWave01(seed * 0.41 + this.colorPhase);
    const value = (7.6 + 3.2 * this.getWave01(seed * 0.87 + this.colorPhase * 0.65)) * intensity;
    const [red, green, blue] = this.hsvToRgb(hue, saturation, 1);

    return [red * value, green * value, blue * value];
  }

  private getWave01(phase: number): number {
    return 0.5 + 0.5 * Math.cos(phase);
  }

  private getWrappedUnit(value: number): number {
    return value - Math.floor(value);
  }

  private hsvToRgb(hue: number, saturation: number, value: number): [number, number, number] {
    const wrappedHue = this.getWrappedUnit(hue) * 6;
    const chroma = value * saturation;
    const x = chroma * (1 - Math.abs((wrappedHue % 2) - 1));
    const match = value - chroma;

    if (wrappedHue < 1) {
      return [chroma + match, x + match, match];
    }

    if (wrappedHue < 2) {
      return [x + match, chroma + match, match];
    }

    if (wrappedHue < 3) {
      return [match, chroma + match, x + match];
    }

    if (wrappedHue < 4) {
      return [match, x + match, chroma + match];
    }

    if (wrappedHue < 5) {
      return [x + match, match, chroma + match];
    }

    return [chroma + match, match, x + match];
  }

  private handleTouchEndInternal(event: TouchEvent, pointers: FluidMotionPointer[]): void {
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
    pointers: FluidMotionPointer[],
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
      pointer.color = this.createSpectralColor(index + x * 0.007 + y * 0.003, 1.08);
    }
  }

  private handleTouchStartInternal(
    event: TouchEvent,
    canvas: HTMLCanvasElement,
    pointers: FluidMotionPointer[],
  ): void {
    const rect = canvas.getBoundingClientRect();

    for (const [index, touch] of Array.from(event.targetTouches).entries()) {
      const pointer = this.ensurePointer(pointers, index);
      pointer.id = touch.identifier;
      pointer.down = true;
      pointer.dx = 0;
      pointer.dy = 0;
      pointer.moved = false;
      pointer.x = touch.clientX - rect.left;
      pointer.y = touch.clientY - rect.top;
      pointer.color = this.createSpectralColor(index + pointer.x * 0.006, 1.05);
    }
  }
}
