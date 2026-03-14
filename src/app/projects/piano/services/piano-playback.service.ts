import { inject, Injectable, signal } from '@angular/core';

import { PIANO_PIECES } from '../constants/piano-pieces.constant';
import { PianoEvent } from '../interfaces/piano-event.interface';
import { PianoHand } from '../types/piano-hand.type';
import { PianoAnimationFrameService } from './piano-animation-frame.service';
import { PianoAudioService } from './piano-audio.service';
import { PianoBackingTrackService } from './piano-backing-track.service';
import { PianoRollBuilderService } from './piano-roll-builder.service';
import { PianoRollRendererService } from './piano-roll-renderer.service';

@Injectable()
export class PianoPlaybackService {
  private readonly animationFrame = inject(PianoAnimationFrameService);
  private readonly audio = inject(PianoAudioService);
  private readonly backingTrack = inject(PianoBackingTrackService);
  private readonly rollBuilder = inject(PianoRollBuilderService);
  private readonly rollRenderer = inject(PianoRollRendererService);

  private events: PianoEvent[] = [];
  private eventIndex = 0;
  private scoreMs = 0;
  private lastFrameMs = 0;
  private endMs = 0;

  readonly playing = signal(false);
  readonly statusText = signal('Select a piece and click Play.');
  readonly highlightedKeys = signal<ReadonlyMap<number, PianoHand | null>>(new Map());

  private readonly keyState = new Map<number, PianoHand | null>();

  get tempoMultiplier(): number {
    return this._tempoMultiplier;
  }

  set tempoMultiplier(value: number) {
    this._tempoMultiplier = value;
    this.backingTrack.setPlaybackRate(value);
  }

  private _tempoMultiplier = 1;

  async play(events: PianoEvent[], pieceId: string): Promise<void> {
    this.stop();
    if (!events?.length) return;

    this.audio.ensureContext();
    await this.backingTrack.start(pieceId, this._tempoMultiplier);

    this.playing.set(true);
    this.statusText.set(`Playing ${PIANO_PIECES[pieceId]?.label ?? pieceId}...`);
    this.events = events;
    this.eventIndex = 0;
    this.scoreMs = 0;
    this.lastFrameMs = performance.now();
    this.endMs = events[events.length - 1].tMs;

    const rollNotes = this.rollBuilder.build(events);
    this.rollRenderer.setRollNotes(rollNotes);
    this.rollRenderer.draw(this.scoreMs);

    this.animationFrame.start((nowMs) => this.runFrame(nowMs));
  }

  stop(): void {
    this.animationFrame.stop();
    this.audio.stopAllVoices();
    this.backingTrack.stop();
    this.clearHighlights();
    this.events = [];
    this.eventIndex = 0;
    this.scoreMs = 0;
    this.lastFrameMs = 0;
    this.endMs = 0;
    this.rollRenderer.clearRollNotes();
    this.playing.set(false);
    this.statusText.set('Stopped.');
  }

  private runFrame(nowMs: number): void {
    if (!this.playing()) return;

    this.advanceClock(nowMs);
    this.processEvents();
    this.commitHighlights();
    this.rollRenderer.draw(this.scoreMs);

    if (this.isPlaybackFinished()) {
      this.stop();
      this.statusText.set('Finished.');
    }
  }

  private advanceClock(nowMs: number): void {
    const dtMs = Math.max(0, nowMs - this.lastFrameMs);
    this.lastFrameMs = nowMs;
    const liveTempo = Math.max(0.5, Math.min(1.5, this._tempoMultiplier));

    if (this.backingTrack.isClockSource && !this.backingTrack.isPaused && this.backingTrack.isReady) {
      this.scoreMs = this.backingTrack.currentTimeMs;
    } else {
      this.scoreMs += dtMs * liveTempo;
    }
  }

  private processEvents(): void {
    while (this.eventIndex < this.events.length && this.events[this.eventIndex].tMs <= this.scoreMs + 0.5) {
      const ev = this.events[this.eventIndex++];
      if (ev.type === 'on') {
        this.highlightOn(ev.midi, ev.hand ?? (ev.midi < 60 ? 'left' : 'right'));
      } else {
        this.highlightOff(ev.midi);
      }
    }
  }

  private highlightOn(midi: number, hand: PianoHand | null): void {
    this.keyState.set(midi, hand);
  }

  private highlightOff(midi: number): void {
    this.keyState.delete(midi);
  }

  private commitHighlights(): void {
    this.highlightedKeys.set(new Map(this.keyState));
  }

  private clearHighlights(): void {
    this.keyState.clear();
    this.highlightedKeys.set(new Map());
  }

  private isPlaybackFinished(): boolean {
    if (this.backingTrack.isClockSource && this.backingTrack.isEnded) return true;
    return this.scoreMs >= this.endMs + 300 && this.eventIndex >= this.events.length;
  }
}
