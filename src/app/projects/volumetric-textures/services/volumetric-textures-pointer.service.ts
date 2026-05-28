import { Injectable, signal } from '@angular/core';

import { VOLUMETRIC_TEXTURES_CONFIG } from '../constants/volumetric-textures-config.constant';

@Injectable()
export class VolumetricTexturesPointerService {
  private element: HTMLElement | null = null;
  private readonly internalPosition = signal<readonly [number, number]>([0, 0]);
  public readonly position = this.internalPosition.asReadonly();

  private readonly pointerListener = (event: PointerEvent): void => {
    this.updateFromEvent(event.clientX, event.clientY);
  };

  public attach(element: HTMLElement): void {
    this.element = element;
    element.addEventListener('pointermove', this.pointerListener, { passive: true });
    this.recenter();
  }

  public detach(): void {
    const element = this.element;
    if (!element) {
      return;
    }
    element.removeEventListener('pointermove', this.pointerListener);
    this.element = null;
  }

  public recenter(): void {
    const element = this.element;
    if (!element) {
      return;
    }
    const rect = element.getBoundingClientRect();
    const dpr = this.devicePixelRatio();
    this.internalPosition.set([rect.width * 0.5 * dpr, rect.height * 0.5 * dpr]);
  }

  private updateFromEvent(clientX: number, clientY: number): void {
    const element = this.element;
    if (!element) {
      return;
    }
    const rect = element.getBoundingClientRect();
    const dpr = this.devicePixelRatio();
    const x = (clientX - rect.left) * dpr;
    const y = (rect.height - (clientY - rect.top)) * dpr;
    this.internalPosition.set([x, y]);
  }

  private devicePixelRatio(): number {
    return Math.min(window.devicePixelRatio || 1, VOLUMETRIC_TEXTURES_CONFIG.devicePixelRatioCap);
  }
}
