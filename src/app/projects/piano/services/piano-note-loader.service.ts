import { inject, Injectable } from '@angular/core';

import { PIANO_PIECES } from '../constants/piano-pieces.constant';
import { PianoLoadedPiece } from '../interfaces/piano-loaded-piece.interface';
import { PianoMidiParserService } from './piano-midi-parser.service';
import { PianoMusicXmlParserService } from './piano-music-xml-parser.service';

@Injectable()
export class PianoNoteLoaderService {
  private readonly midiParser = inject(PianoMidiParserService);
  private readonly musicXmlParser = inject(PianoMusicXmlParserService);
  private readonly cache = new Map<string, PianoLoadedPiece>();

  async load(pieceId: string): Promise<PianoLoadedPiece> {
    const cached = this.cache.get(pieceId);
    if (cached?.events?.length) return cached;

    const piece = PIANO_PIECES[pieceId];
    if (!piece) throw new Error(`Unknown piece: ${pieceId}`);

    const noteDataFile = piece.noteDataFile;
    const res = await fetch(noteDataFile, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${noteDataFile}: HTTP ${res.status}`);

    const events = await this.parseResponse(res, noteDataFile);
    const loaded: PianoLoadedPiece = { events, sourceName: noteDataFile };
    this.cache.set(pieceId, loaded);
    return loaded;
  }

  private async parseResponse(res: Response, noteDataFile: string): Promise<PianoLoadedPiece['events']> {
    const lower = noteDataFile.toLowerCase();

    if (lower.endsWith('.musicxml') || lower.endsWith('.xml')) {
      return this.musicXmlParser.parse(await res.text());
    }

    if (lower.endsWith('.mid') || lower.endsWith('.midi')) {
      return this.midiParser.parse(await res.arrayBuffer());
    }

    throw new Error(`Unsupported note data file type: ${noteDataFile}`);
  }
}
