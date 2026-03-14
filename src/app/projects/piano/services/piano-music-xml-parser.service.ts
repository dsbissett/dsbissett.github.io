import { Injectable } from '@angular/core';

import { PianoEvent } from '../interfaces/piano-event.interface';
import { PianoQnTempoSegment } from '../interfaces/piano-qn-tempo-segment.interface';
import { PianoHand } from '../types/piano-hand.type';

interface QnNote {
  startQn: number;
  endQn: number;
  midi: number;
  hand: PianoHand | null;
  vel: number;
}

interface MeasureState {
  divisions: number;
  cursorQn: number;
  lastNoteStartQn: number;
}

@Injectable()
export class PianoMusicXmlParserService {
  parse(xmlText: string): PianoEvent[] {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'application/xml');
    const score = xml.querySelector('score-partwise, score-timewise');
    if (!score) throw new Error('Not a MusicXML score.');

    const { notesQn, tempoByQn } = this.parseScore(score);
    const tempoSegments = this.buildTempoSegments(tempoByQn);
    return this.convertToTimedEvents(notesQn, tempoSegments);
  }

  private parseScore(score: Element): { notesQn: QnNote[]; tempoByQn: Map<number, number> } {
    const partEls = Array.from(score.children).filter((el) => el.tagName === 'part');
    const parts = partEls.length ? partEls : Array.from(score.querySelectorAll('part'));
    const partCount = parts.length;
    const tempoByQn = new Map<number, number>();
    tempoByQn.set(0, 120);
    const notesQn: QnNote[] = [];

    for (let partIndex = 0; partIndex < parts.length; partIndex++) {
      this.parsePart(parts[partIndex], partIndex, partCount, notesQn, tempoByQn);
    }

    return { notesQn, tempoByQn };
  }

  private parsePart(
    partEl: Element,
    partIndex: number,
    partCount: number,
    notesQn: QnNote[],
    tempoByQn: Map<number, number>,
  ): void {
    const state: MeasureState = { divisions: 1, cursorQn: 0, lastNoteStartQn: 0 };
    const measures = Array.from(partEl.children).filter((el) => el.tagName === 'measure');

    for (const measure of measures) {
      this.parseMeasure(measure, state, partIndex, partCount, notesQn, tempoByQn);
    }
  }

  private parseMeasure(
    measure: Element,
    state: MeasureState,
    partIndex: number,
    partCount: number,
    notesQn: QnNote[],
    tempoByQn: Map<number, number>,
  ): void {
    for (const item of Array.from(measure.children)) {
      this.processMeasureItem(item, state, partIndex, partCount, notesQn, tempoByQn);
    }
  }

  private processMeasureItem(
    item: Element,
    state: MeasureState,
    partIndex: number,
    partCount: number,
    notesQn: QnNote[],
    tempoByQn: Map<number, number>,
  ): void {
    const tag = item.tagName;

    if (tag === 'attributes') {
      this.processAttributes(item, state);
      return;
    }

    if (tag === 'direction') {
      this.processDirection(item, state.cursorQn, tempoByQn);
      return;
    }

    if (tag === 'backup' || tag === 'forward') {
      this.processBackupForward(item, tag, state);
      return;
    }

    if (tag === 'note') {
      this.processNote(item, state, partIndex, partCount, notesQn);
    }
  }

  private processAttributes(item: Element, state: MeasureState): void {
    const divNode = item.querySelector('divisions');
    if (!divNode) return;

    const parsed = parseFloat(divNode.textContent ?? '');
    if (Number.isFinite(parsed) && parsed > 0) {
      state.divisions = parsed;
    }
  }

  private processDirection(
    item: Element,
    cursorQn: number,
    tempoByQn: Map<number, number>,
  ): void {
    const bpm = this.readTempoFromDirection(item);
    if (Number.isFinite(bpm) && bpm > 0) {
      tempoByQn.set(this.normQn(cursorQn), bpm);
    }
  }

  private processBackupForward(item: Element, tag: string, state: MeasureState): void {
    const durDiv = parseInt(item.querySelector('duration')?.textContent ?? '0', 10);
    const durQn = durDiv / state.divisions;
    state.cursorQn += tag === 'backup' ? -durQn : durQn;
  }

  private processNote(
    item: Element,
    state: MeasureState,
    partIndex: number,
    partCount: number,
    notesQn: QnNote[],
  ): void {
    const isChord = !!item.querySelector('chord');
    const isRest = !!item.querySelector('rest');
    const durDiv = parseInt(item.querySelector('duration')?.textContent ?? '0', 10);
    const durQn = durDiv / state.divisions;
    const startQn = isChord ? state.lastNoteStartQn : state.cursorQn;
    const endQn = startQn + durQn;

    if (!isRest) {
      this.extractPitch(item, startQn, endQn, partIndex, partCount, notesQn);
    }

    if (!isChord) {
      state.lastNoteStartQn = startQn;
      state.cursorQn += durQn;
    }
  }

  private extractPitch(
    item: Element,
    startQn: number,
    endQn: number,
    partIndex: number,
    partCount: number,
    notesQn: QnNote[],
  ): void {
    const pitch = item.querySelector('pitch');
    if (!pitch) return;

    const step = pitch.querySelector('step')?.textContent?.trim() ?? 'C';
    const alter = parseInt(pitch.querySelector('alter')?.textContent ?? '0', 10);
    const octave = parseInt(pitch.querySelector('octave')?.textContent ?? '4', 10);
    const midi = this.pitchToMidi(step, alter, octave);
    const hand = this.resolveHand(item, partIndex, partCount);

    notesQn.push({ startQn, endQn, midi, hand, vel: 0.85 });
  }

  private resolveHand(item: Element, partIndex: number, partCount: number): PianoHand | null {
    const staff = item.querySelector('staff')?.textContent?.trim();
    if (staff === '1') return 'right';
    if (staff === '2') return 'left';
    if (partCount >= 2) return partIndex === 0 ? 'right' : 'left';
    return null;
  }

  private pitchToMidi(step: string, alter: number, octave: number): number {
    const base: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    const semitone = (base[step] ?? 0) + (alter || 0);
    return 12 + octave * 12 + semitone;
  }

  private readTempoFromDirection(directionEl: Element): number {
    const soundTempo = directionEl.querySelector('sound[tempo]')?.getAttribute('tempo');
    if (soundTempo != null) {
      const bpm = parseFloat(soundTempo);
      if (Number.isFinite(bpm) && bpm > 0) return bpm;
    }

    return this.readMetronomeTempo(directionEl);
  }

  private readMetronomeTempo(directionEl: Element): number {
    const perMinuteText = directionEl.querySelector('metronome > per-minute')?.textContent;
    if (!perMinuteText) return NaN;

    const perMinute = parseFloat(perMinuteText);
    if (!Number.isFinite(perMinute) || perMinute <= 0) return NaN;

    const beatUnit = directionEl.querySelector('metronome > beat-unit')?.textContent?.trim()?.toLowerCase();
    const isDotted = !!directionEl.querySelector('metronome > beat-unit-dot');
    const quarterFactor = this.beatUnitToQuarterFactor(beatUnit) * (isDotted ? 1.5 : 1);
    return perMinute * quarterFactor;
  }

  private beatUnitToQuarterFactor(unit: string | undefined): number {
    switch (unit) {
      case 'whole':
        return 4;
      case 'half':
        return 2;
      case 'quarter':
        return 1;
      case 'eighth':
        return 0.5;
      case '16th':
        return 0.25;
      case '32nd':
        return 0.125;
      case '64th':
        return 0.0625;
      default:
        return 1;
    }
  }

  private normQn(v: number): number {
    return Math.round(v * 1000000) / 1000000;
  }

  private buildTempoSegments(tempoByQn: Map<number, number>): PianoQnTempoSegment[] {
    const tempos = Array.from(tempoByQn.entries())
      .map(([qn, bpm]) => ({ qn, bpm }))
      .sort((a, b) => a.qn - b.qn);

    const segments: PianoQnTempoSegment[] = [];
    let prevQn = tempos[0].qn;
    let prevBpm = tempos[0].bpm;
    let msAtPrevQn = 0;
    segments.push({ qn: prevQn, msAtQn: msAtPrevQn, bpm: prevBpm });

    for (let i = 1; i < tempos.length; i++) {
      const next = tempos[i];
      msAtPrevQn += ((next.qn - prevQn) * 60000) / prevBpm;
      prevQn = next.qn;
      prevBpm = next.bpm;
      segments.push({ qn: prevQn, msAtQn: msAtPrevQn, bpm: prevBpm });
    }

    return segments;
  }

  private convertToTimedEvents(notesQn: QnNote[], tempoSegments: PianoQnTempoSegment[]): PianoEvent[] {
    const events: PianoEvent[] = [];

    for (const n of notesQn) {
      events.push({ tMs: this.qnToMs(n.startQn, tempoSegments), type: 'on', midi: n.midi, vel: n.vel, hand: n.hand });
      events.push({ tMs: this.qnToMs(n.endQn, tempoSegments), type: 'off', midi: n.midi, hand: n.hand });
    }

    events.sort((a, b) => a.tMs - b.tMs || (a.type === 'off' ? -1 : 1) - (b.type === 'off' ? -1 : 1));
    const t0 = events[0]?.tMs ?? 0;
    for (const ev of events) ev.tMs -= t0;
    return events;
  }

  private qnToMs(targetQn: number, segments: PianoQnTempoSegment[]): number {
    let lo = 0;
    let hi = segments.length - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (segments[mid].qn <= targetQn) lo = mid + 1;
      else hi = mid - 1;
    }

    const seg = segments[Math.max(0, hi)];
    return seg.msAtQn + ((targetQn - seg.qn) * 60000) / seg.bpm;
  }
}
