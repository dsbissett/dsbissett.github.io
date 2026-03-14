import { Injectable } from '@angular/core';

import { PianoEvent } from '../interfaces/piano-event.interface';
import { PianoRollNote } from '../interfaces/piano-roll-note.interface';
import { PianoHand } from '../types/piano-hand.type';

@Injectable()
export class PianoRollBuilderService {
  build(events: PianoEvent[]): PianoRollNote[] {
    if (!events?.length) return [];

    const noteOnQueues = new Map<number, PianoEvent[]>();
    const bars: PianoRollNote[] = [];
    const fallbackEnd = (events[events.length - 1]?.tMs ?? 0) + 300;

    for (const ev of events) {
      this.processEvent(ev, noteOnQueues, bars);
    }

    this.flushRemainingNotes(noteOnQueues, bars, fallbackEnd);
    bars.sort((a, b) => a.startMs - b.startMs);
    return bars;
  }

  private processEvent(
    ev: PianoEvent,
    noteOnQueues: Map<number, PianoEvent[]>,
    bars: PianoRollNote[],
  ): void {
    if (ev.type === 'on') {
      this.enqueueNoteOn(ev, noteOnQueues);
    } else if (ev.type === 'off') {
      this.dequeueNoteOff(ev, noteOnQueues, bars);
    }
  }

  private enqueueNoteOn(ev: PianoEvent, noteOnQueues: Map<number, PianoEvent[]>): void {
    if (!noteOnQueues.has(ev.midi)) noteOnQueues.set(ev.midi, []);
    noteOnQueues.get(ev.midi)!.push(ev);
  }

  private dequeueNoteOff(
    ev: PianoEvent,
    noteOnQueues: Map<number, PianoEvent[]>,
    bars: PianoRollNote[],
  ): void {
    const q = noteOnQueues.get(ev.midi);
    if (!q?.length) return;

    const onEv = q.shift()!;
    bars.push({
      midi: ev.midi,
      startMs: onEv.tMs,
      endMs: Math.max(ev.tMs, onEv.tMs + 35),
      hand: this.resolveHand(onEv, ev.midi),
    });
  }

  private flushRemainingNotes(
    noteOnQueues: Map<number, PianoEvent[]>,
    bars: PianoRollNote[],
    fallbackEnd: number,
  ): void {
    for (const [midi, q] of noteOnQueues.entries()) {
      for (const onEv of q) {
        bars.push({
          midi,
          startMs: onEv.tMs,
          endMs: Math.max(fallbackEnd, onEv.tMs + 35),
          hand: this.resolveHand(onEv, midi),
        });
      }
    }
  }

  private resolveHand(onEv: PianoEvent, midi: number): PianoHand {
    return (onEv.hand as PianoHand) ?? (midi < 60 ? 'left' : 'right');
  }
}
