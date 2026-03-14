import { Injectable } from '@angular/core';

import { PIANO_CONFIG } from '../constants/piano-config.constant';
import { PianoKeyDefinition } from '../interfaces/piano-key-definition.interface';

@Injectable()
export class PianoKeyboardDataService {
  private cachedKeys: PianoKeyDefinition[] | null = null;

  getKeys(): PianoKeyDefinition[] {
    if (this.cachedKeys) return this.cachedKeys;
    this.cachedKeys = this.generateKeys();
    return this.cachedKeys;
  }

  getFrequency(keyIndex: number): number {
    return 27.5 * Math.pow(2, (keyIndex - 1) / 12);
  }

  private generateKeys(): PianoKeyDefinition[] {
    const keys: PianoKeyDefinition[] = [];
    let whiteKeyCounter = 0;

    for (let i = PIANO_CONFIG.startKey; i <= PIANO_CONFIG.endKey; i++) {
      const noteIndexRaw = (i + 8) % 12;
      const noteName = PIANO_CONFIG.noteNames[noteIndexRaw];
      const isBlack = noteName.includes('#');
      const octave = Math.floor((i + 8) / 12);
      const label = this.getKeyLabel(noteName, octave, i);

      keys.push({
        keyIndex: i,
        midi: PIANO_CONFIG.midiOffset + i,
        noteName,
        octave,
        isBlack,
        label,
        precedingWhiteKeys: whiteKeyCounter,
      });

      if (!isBlack) whiteKeyCounter++;
    }

    return keys;
  }

  private getKeyLabel(noteName: string, octave: number, keyIndex: number): string {
    if (noteName === 'C') return `${noteName}${octave}`;
    if (keyIndex === PIANO_CONFIG.startKey) return `${noteName}${octave}`;
    if (keyIndex === PIANO_CONFIG.endKey) return `${noteName}${octave}`;
    return '';
  }
}
