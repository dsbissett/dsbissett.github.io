import { PianoPiece } from '../interfaces/piano-piece.interface';

export const PIANO_PIECES: Readonly<Record<string, PianoPiece>> = {
  chopin: {
    label: 'Chopin',
    audioFile: 'legacy/piano/chopin.ogg',
    noteDataFile: 'legacy/piano/chopin.mid',
  },
  liszt: {
    label: 'Liszt',
    audioFile: 'legacy/piano/liszt.ogg',
    noteDataFile: 'legacy/piano/liszt.mid',
  },
  beethoven: {
    label: 'Beethoven',
    audioFile: 'legacy/piano/beethoven.ogg',
    noteDataFile: 'legacy/piano/beethoven.mid',
  },
  jllewis: {
    label: 'JL Lewis',
    audioFile: 'legacy/piano/jllewis.ogg',
    noteDataFile: 'legacy/piano/jllewis.MID',
  },
};
