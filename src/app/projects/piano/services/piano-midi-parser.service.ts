import { Injectable } from '@angular/core';

import { PianoMidiReader } from '../classes/piano-midi-reader.class';
import { PianoEvent } from '../interfaces/piano-event.interface';
import { PianoMidiTempoSegment } from '../interfaces/piano-midi-tempo-segment.interface';
import { PianoHand } from '../types/piano-hand.type';

interface MidiHeader {
  format: number;
  nTracks: number;
  ticksPerQuarter: number;
}

interface RawNoteEvent {
  tick: number;
  type: 'on' | 'off';
  midi: number;
  vel: number;
  track: number;
}

interface TempoEvent {
  tick: number;
  tempoUSPerQuarter: number;
}

interface TrackParseResult {
  noteEvents: RawNoteEvent[];
  tempoEvents: TempoEvent[];
  trackStats: Map<number, { sum: number; count: number }>;
}

@Injectable()
export class PianoMidiParserService {
  parse(arrayBuffer: ArrayBuffer): PianoEvent[] {
    const reader = new PianoMidiReader(arrayBuffer);
    const header = this.readHeader(reader);
    const trackData = this.readAllTracks(reader, header.nTracks);
    const tempoSegments = this.buildTempoSegments(trackData.tempoEvents, header.ticksPerQuarter);
    return this.convertToTimedEvents(
      trackData.noteEvents,
      trackData.trackStats,
      tempoSegments,
      header.ticksPerQuarter,
    );
  }

  private readHeader(reader: PianoMidiReader): MidiHeader {
    const header = reader.readString(4);
    if (header !== 'MThd') throw new Error('Not a MIDI file.');

    const headerLen = reader.readUint32();
    const format = reader.readUint16();
    const nTracks = reader.readUint16();
    const division = reader.readUint16();
    reader.skip(headerLen - 6);

    if (division & 0x8000) {
      throw new Error('SMPTE MIDI timebase is not supported.');
    }

    return { format, nTracks, ticksPerQuarter: division };
  }

  private readAllTracks(reader: PianoMidiReader, nTracks: number): TrackParseResult {
    const noteEvents: RawNoteEvent[] = [];
    const tempoEvents: TempoEvent[] = [{ tick: 0, tempoUSPerQuarter: 500000 }];
    const trackStats = new Map<number, { sum: number; count: number }>();

    for (let tr = 0; tr < nTracks; tr++) {
      this.readTrack(reader, tr, noteEvents, tempoEvents, trackStats);
    }

    return { noteEvents, tempoEvents, trackStats };
  }

  private readTrack(
    reader: PianoMidiReader,
    trackIndex: number,
    noteEvents: RawNoteEvent[],
    tempoEvents: TempoEvent[],
    trackStats: Map<number, { sum: number; count: number }>,
  ): void {
    const trk = reader.readString(4);
    if (trk !== 'MTrk') throw new Error('Bad MIDI track header.');

    const trkLen = reader.readUint32();
    const end = reader.pos + trkLen;
    let tick = 0;
    let runningStatus: number | null = null;

    while (reader.pos < end) {
      tick += reader.readVariable();
      const result = this.resolveStatus(reader, runningStatus);
      runningStatus = result.runningStatus;
      this.processEvent(reader, result.status, result.firstData, tick, trackIndex, end, noteEvents, tempoEvents, trackStats);
    }
  }

  private resolveStatus(
    reader: PianoMidiReader,
    currentRunning: number | null,
  ): { status: number; firstData: number | null; runningStatus: number | null } {
    const statusByte = reader.readUint8();

    if (statusByte < 0x80) {
      if (currentRunning === null) throw new Error('Invalid running status in MIDI track.');
      return { status: currentRunning, firstData: statusByte, runningStatus: currentRunning };
    }

    if (statusByte < 0xf0) {
      return { status: statusByte, firstData: null, runningStatus: statusByte };
    }

    return { status: statusByte, firstData: null, runningStatus: null };
  }

  private processEvent(
    reader: PianoMidiReader,
    status: number,
    firstData: number | null,
    tick: number,
    trackIndex: number,
    trackEnd: number,
    noteEvents: RawNoteEvent[],
    tempoEvents: TempoEvent[],
    trackStats: Map<number, { sum: number; count: number }>,
  ): void {
    if (status === 0xff) {
      this.processMetaEvent(reader, tick, tempoEvents);
      return;
    }

    if (status === 0xf0 || status === 0xf7) {
      reader.skip(reader.readVariable());
      return;
    }

    this.processChannelMessage(reader, status, firstData, tick, trackIndex, trackEnd, noteEvents, trackStats);
  }

  private processMetaEvent(
    reader: PianoMidiReader,
    tick: number,
    tempoEvents: TempoEvent[],
  ): void {
    const metaType = reader.readUint8();
    const len = reader.readVariable();

    if (metaType === 0x51 && len === 3) {
      const tempoUSPerQuarter = (reader.readUint8() << 16) | (reader.readUint8() << 8) | reader.readUint8();
      tempoEvents.push({ tick, tempoUSPerQuarter });
    } else {
      reader.skip(len);
    }
  }

  private processChannelMessage(
    reader: PianoMidiReader,
    status: number,
    firstData: number | null,
    tick: number,
    trackIndex: number,
    trackEnd: number,
    noteEvents: RawNoteEvent[],
    trackStats: Map<number, { sum: number; count: number }>,
  ): void {
    const readDataByte = (): number => {
      if (firstData !== null) {
        const v = firstData;
        firstData = null;
        return v;
      }
      return reader.readUint8();
    };

    const type = status & 0xf0;

    if (type === 0x90 || type === 0x80) {
      this.processNoteMessage(type, readDataByte(), reader.readUint8(), tick, trackIndex, noteEvents, trackStats);
      return;
    }

    if (type === 0xa0 || type === 0xb0 || type === 0xe0) {
      readDataByte();
      reader.readUint8();
      return;
    }

    if (type === 0xc0 || type === 0xd0) {
      readDataByte();
      return;
    }

    reader.pos = trackEnd;
  }

  private processNoteMessage(
    type: number,
    note: number,
    vel: number,
    tick: number,
    trackIndex: number,
    noteEvents: RawNoteEvent[],
    trackStats: Map<number, { sum: number; count: number }>,
  ): void {
    const isNoteOn = type === 0x90 && vel > 0;

    if (isNoteOn) {
      noteEvents.push({ tick, type: 'on', midi: note, vel: vel / 127, track: trackIndex });
      const stats = trackStats.get(trackIndex) ?? { sum: 0, count: 0 };
      stats.sum += note;
      stats.count += 1;
      trackStats.set(trackIndex, stats);
    } else {
      noteEvents.push({ tick, type: 'off', midi: note, vel: 0, track: trackIndex });
    }
  }

  private buildTempoSegments(
    tempoEvents: TempoEvent[],
    ticksPerQuarter: number,
  ): PianoMidiTempoSegment[] {
    const tempoByTick = new Map<number, number>();
    tempoByTick.set(0, 500000);
    for (const ev of tempoEvents) tempoByTick.set(ev.tick, ev.tempoUSPerQuarter);

    const ordered = Array.from(tempoByTick.entries())
      .map(([tick, tempoUSPerQuarter]) => ({ tick, tempoUSPerQuarter }))
      .sort((a, b) => a.tick - b.tick);

    const segments: PianoMidiTempoSegment[] = [];
    let prevTick = ordered[0].tick;
    let prevTempo = ordered[0].tempoUSPerQuarter;
    let usAtPrevTick = 0;
    segments.push({ tick: prevTick, usAtTick: usAtPrevTick, tempoUSPerQuarter: prevTempo });

    for (let i = 1; i < ordered.length; i++) {
      const next = ordered[i];
      usAtPrevTick += ((next.tick - prevTick) * prevTempo) / ticksPerQuarter;
      prevTick = next.tick;
      prevTempo = next.tempoUSPerQuarter;
      segments.push({ tick: prevTick, usAtTick: usAtPrevTick, tempoUSPerQuarter: prevTempo });
    }

    return segments;
  }

  private convertToTimedEvents(
    noteEvents: RawNoteEvent[],
    trackStats: Map<number, { sum: number; count: number }>,
    tempoSegments: PianoMidiTempoSegment[],
    ticksPerQuarter: number,
  ): PianoEvent[] {
    noteEvents.sort(
      (a, b) => a.tick - b.tick || (a.type === 'off' ? -1 : 1) - (b.type === 'off' ? -1 : 1),
    );

    const allEvents: PianoEvent[] = noteEvents.map((ev) => {
      const hand = this.getHandForTrack(ev.track, ev.midi, trackStats);
      const tMs = this.tickToMs(ev.tick, tempoSegments, ticksPerQuarter);
      const base: PianoEvent = { tMs, type: ev.type, midi: ev.midi, hand };
      if (ev.type === 'on') base.vel = ev.vel;
      return base;
    });

    const t0 = allEvents[0]?.tMs ?? 0;
    for (const ev of allEvents) ev.tMs -= t0;
    return allEvents;
  }

  private tickToMs(
    targetTick: number,
    segments: PianoMidiTempoSegment[],
    ticksPerQuarter: number,
  ): number {
    let lo = 0;
    let hi = segments.length - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (segments[mid].tick <= targetTick) lo = mid + 1;
      else hi = mid - 1;
    }

    const seg = segments[Math.max(0, hi)];
    const usAtTarget = seg.usAtTick + ((targetTick - seg.tick) * seg.tempoUSPerQuarter) / ticksPerQuarter;
    return usAtTarget / 1000;
  }

  private getHandForTrack(
    trackIndex: number,
    midi: number,
    trackStats: Map<number, { sum: number; count: number }>,
  ): PianoHand {
    if (trackStats.size <= 1) {
      return midi < 60 ? 'left' : 'right';
    }

    const ranked = Array.from(trackStats.entries())
      .map(([track, stats]) => ({
        track,
        avg: stats.count ? stats.sum / stats.count : 60,
      }))
      .sort((a, b) => a.avg - b.avg);

    if (trackIndex === ranked[0]?.track) return 'left';
    if (trackIndex === ranked[ranked.length - 1]?.track) return 'right';
    return midi < 60 ? 'left' : 'right';
  }
}
