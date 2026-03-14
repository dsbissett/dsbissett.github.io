import { Injectable } from '@angular/core';

import { PianoKeyLayout } from '../interfaces/piano-key-layout.interface';

@Injectable()
export class PianoKeyboardLayoutService {
  private readonly layoutMap = new Map<number, PianoKeyLayout>();
  private laneXPositions: number[] = [];

  get rollKeyLayout(): ReadonlyMap<number, PianoKeyLayout> {
    return this.layoutMap;
  }

  get rollLaneXs(): readonly number[] {
    return this.laneXPositions;
  }

  capture(keyboardElement: HTMLElement, midiToKeyElement: ReadonlyMap<number, HTMLElement>): void {
    const keyboardRect = keyboardElement.getBoundingClientRect();
    this.layoutMap.clear();
    const lanes: number[] = [];

    for (const [midi, keyEl] of midiToKeyElement.entries()) {
      const rect = keyEl.getBoundingClientRect();
      const isBlack = keyEl.classList.contains('black');
      this.layoutMap.set(midi, {
        x: rect.left - keyboardRect.left,
        w: rect.width,
        isBlack,
      });
      if (!isBlack) lanes.push(rect.left - keyboardRect.left);
    }

    lanes.sort((a, b) => a - b);
    lanes.push(keyboardElement.clientWidth);
    this.laneXPositions = lanes;
  }
}
