import { Injectable } from '@angular/core';

import { TETRIS_AUDIO_PATHS } from '../constants/tetris-audio-paths.constant';
import { TETRIS_GAME_CONFIG } from '../constants/tetris-game-config.constant';

@Injectable()
export class TetrisAudioService {
  private landSound: HTMLAudioElement | null = null;
  private moveSound: HTMLAudioElement | null = null;
  private rotateSound: HTMLAudioElement | null = null;
  private clearSound: HTMLAudioElement | null = null;
  private bgMusic: HTMLAudioElement | null = null;
  private musicStarted = false;

  public initialize(): void {
    this.landSound = this.createAudioElement(TETRIS_AUDIO_PATHS.land);
    this.moveSound = this.createAudioElement(TETRIS_AUDIO_PATHS.move);
    this.rotateSound = this.createAudioElement(TETRIS_AUDIO_PATHS.rotate);
    this.clearSound = this.createAudioElement(TETRIS_AUDIO_PATHS.clear);
    this.bgMusic = this.createAudioElement(TETRIS_AUDIO_PATHS.music);
  }

  public playLand(): void {
    this.playCloned(this.landSound);
  }

  public playMove(): void {
    this.playCloned(this.moveSound);
  }

  public playRotate(): void {
    this.playCloned(this.rotateSound);
  }

  public playClear(): void {
    this.playCloned(this.clearSound);
  }

  public startMusic(): void {
    if (this.musicStarted || !this.bgMusic) {
      return;
    }

    this.bgMusic.volume = TETRIS_GAME_CONFIG.musicVolume;
    this.bgMusic.loop = true;
    this.bgMusic.play().catch(() => {});
    this.musicStarted = true;
  }

  public increaseMusicSpeed(): void {
    if (!this.bgMusic) {
      return;
    }

    this.bgMusic.playbackRate = Math.min(
      this.bgMusic.playbackRate + TETRIS_GAME_CONFIG.musicSpeedIncrement,
      TETRIS_GAME_CONFIG.musicMaxSpeed
    );
  }

  public resetMusicSpeed(): void {
    if (!this.bgMusic) {
      return;
    }

    this.bgMusic.playbackRate = 1.0;
  }

  public destroy(): void {
    this.stopMusic();
    this.landSound = null;
    this.moveSound = null;
    this.rotateSound = null;
    this.clearSound = null;
    this.bgMusic = null;
  }

  private stopMusic(): void {
    if (!this.bgMusic) {
      return;
    }

    this.bgMusic.pause();
    this.bgMusic.currentTime = 0;
    this.musicStarted = false;
  }

  private createAudioElement(paths: readonly string[]): HTMLAudioElement | null {
    const supportedPath = this.findSupportedPath(paths);
    if (!supportedPath) {
      return null;
    }

    return new Audio(supportedPath);
  }

  private findSupportedPath(paths: readonly string[]): string | undefined {
    return paths.find((path) => this.canPlayPath(path));
  }

  private canPlayPath(path: string): boolean {
    const extension = path.split('.').pop() ?? '';
    return new Audio().canPlayType(`audio/${extension}`) !== '';
  }

  private playCloned(audio: HTMLAudioElement | null): void {
    if (!audio) {
      return;
    }

    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.play().catch(() => {});
  }
}
