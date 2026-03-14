import { inject, Injectable, signal } from '@angular/core';

import { PIANO_PIECES } from '../constants/piano-pieces.constant';
import { PianoAudioService } from './piano-audio.service';
import { PianoCanvasService } from './piano-canvas.service';
import { PianoImpactFxService } from './piano-impact-fx.service';
import { PianoKeyboardLayoutService } from './piano-keyboard-layout.service';
import { PianoNoteLoaderService } from './piano-note-loader.service';
import { PianoPlaybackService } from './piano-playback.service';
import { PianoRollRendererService } from './piano-roll-renderer.service';

@Injectable()
export class PianoFacadeService {
  private readonly audio = inject(PianoAudioService);
  private readonly canvasService = inject(PianoCanvasService);
  private readonly impactFx = inject(PianoImpactFxService);
  private readonly keyboardLayout = inject(PianoKeyboardLayoutService);
  private readonly noteLoader = inject(PianoNoteLoaderService);
  private readonly playback = inject(PianoPlaybackService);
  private readonly rollRenderer = inject(PianoRollRendererService);

  private midiToKeyElement = new Map<number, HTMLElement>();
  private keyboardElement: HTMLElement | null = null;

  readonly activePieceId = signal('chopin');
  readonly playing = this.playback.playing;
  readonly statusText = this.playback.statusText;
  readonly highlightedKeys = this.playback.highlightedKeys;
  readonly tempoPercent = signal(100);

  initialize(
    noteRollCanvas: HTMLCanvasElement,
    impactFxCanvas: HTMLCanvasElement,
    keyboardElement: HTMLElement,
    midiToKeyElement: Map<number, HTMLElement>,
  ): void {
    this.keyboardElement = keyboardElement;
    this.midiToKeyElement = midiToKeyElement;

    this.canvasService.init(noteRollCanvas);
    this.impactFx.init(impactFxCanvas);
    this.resizeAndDraw();
  }

  destroy(): void {
    this.playback.stop();
  }

  selectPiece(pieceId: string): void {
    this.activePieceId.set(pieceId);
    if (this.playback.playing()) this.playback.stop();
    this.playback.statusText.set(`Selected ${PIANO_PIECES[pieceId]?.label ?? pieceId}.`);
  }

  async play(): Promise<void> {
    try {
      const pieceId = this.activePieceId();
      const loaded = await this.noteLoader.load(pieceId);
      const events = loaded?.events ?? null;

      if (!events?.length) {
        this.playback.statusText.set('Loaded file but found no playable notes.');
        return;
      }

      this.playback.statusText.set(`Loaded ${loaded.sourceName}`);
      this.captureLayout();
      await this.playback.play(events, pieceId);
    } catch (err) {
      console.error(err);
      this.playback.statusText.set('Could not start playback (see console).');
    }
  }

  stop(): void {
    this.playback.stop();
  }

  setTempo(percent: number): void {
    this.tempoPercent.set(percent);
    this.playback.tempoMultiplier = percent / 100;
  }

  handleResize(): void {
    this.resizeAndDraw();
  }

  playInteractiveNote(midi: number): void {
    this.audio.noteOn(midi, 0.9);
    setTimeout(() => this.audio.noteOff(midi), 200);
  }

  private captureLayout(): void {
    if (!this.keyboardElement) return;
    this.keyboardLayout.capture(this.keyboardElement, this.midiToKeyElement);
  }

  private resizeAndDraw(): void {
    this.canvasService.resize();
    this.captureLayout();
    const elapsedMs = this.playback.playing() ? -1 : -1;
    this.rollRenderer.draw(elapsedMs);
  }
}
