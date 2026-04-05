import { PianoPiece } from '../interfaces/piano-piece.interface';

export const PIANO_PIECES: Readonly<Record<string, PianoPiece>> = {
  chopin: {
    label: 'Chopin',
    audioFile: 'projects/piano/chopin.ogg',
    noteDataFile: 'projects/piano/chopin.mid',
  },
  liszt: {
    label: 'Liszt',
    audioFile: 'projects/piano/liszt.ogg',
    noteDataFile: 'projects/piano/liszt.mid',
  },
  beethoven: {
    label: 'Beethoven',
    audioFile: 'projects/piano/beethoven.ogg',
    noteDataFile: 'projects/piano/beethoven.mid',
  },
  jllewis: {
    label: 'JL Lewis',
    audioFile: 'projects/piano/jllewis.ogg',
    noteDataFile: 'projects/piano/jllewis.MID',
  },
};
