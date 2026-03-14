import { Injectable } from '@angular/core';

import { PIANO_PIECES } from '../constants/piano-pieces.constant';

@Injectable()
export class PianoBackingTrackService {
  private readonly audio = new Audio();
  private useAsClockSource = false;

  constructor() {
    this.audio.preload = 'auto';
    this.audio.loop = false;
  }

  get currentTimeMs(): number {
    return this.audio.currentTime * 1000;
  }

  get isPaused(): boolean {
    return this.audio.paused;
  }

  get isEnded(): boolean {
    return this.audio.ended;
  }

  get isReady(): boolean {
    return this.audio.readyState >= 2;
  }

  get isClockSource(): boolean {
    return this.useAsClockSource;
  }

  async start(pieceId: string, tempoMultiplier: number): Promise<void> {
    const piece = PIANO_PIECES[pieceId];
    if (!piece) throw new Error(`Unknown piece: ${pieceId}`);

    if (this.audio.getAttribute('src') !== piece.audioFile) {
      this.audio.src = piece.audioFile;
    }

    this.audio.playbackRate = Math.max(0.5, Math.min(1.5, tempoMultiplier));
    this.audio.currentTime = 0;
    await this.audio.play();
    this.useAsClockSource = true;
  }

  stop(): void {
    try {
      this.audio.pause();
    } catch {
      // ignore pause errors
    }
    this.audio.currentTime = 0;
    this.useAsClockSource = false;
  }

  setPlaybackRate(rate: number): void {
    this.audio.playbackRate = Math.max(0.5, Math.min(1.5, rate));
  }
}
