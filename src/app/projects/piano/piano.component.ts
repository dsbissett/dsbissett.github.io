import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  viewChild,
  viewChildren,
} from '@angular/core';
import { PIANO_PIECES } from './constants/piano-pieces.constant';
import { PianoKeyDefinition } from './interfaces/piano-key-definition.interface';
import { PianoAnimationFrameService } from './services/piano-animation-frame.service';
import { PianoAudioService } from './services/piano-audio.service';
import { PianoBackingTrackService } from './services/piano-backing-track.service';
import { PianoCanvasService } from './services/piano-canvas.service';
import { PianoFacadeService } from './services/piano-facade.service';
import { PianoImpactFxService } from './services/piano-impact-fx.service';
import { PianoKeyboardDataService } from './services/piano-keyboard-data.service';
import { PianoKeyboardLayoutService } from './services/piano-keyboard-layout.service';
import { PianoMidiParserService } from './services/piano-midi-parser.service';
import { PianoMusicXmlParserService } from './services/piano-music-xml-parser.service';
import { PianoNoteLoaderService } from './services/piano-note-loader.service';
import { PianoPlaybackService } from './services/piano-playback.service';
import { PianoRollBuilderService } from './services/piano-roll-builder.service';
import { PianoRollRendererService } from './services/piano-roll-renderer.service';

@Component({
  selector: 'app-piano',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    PianoAnimationFrameService,
    PianoAudioService,
    PianoBackingTrackService,
    PianoCanvasService,
    PianoFacadeService,
    PianoImpactFxService,
    PianoKeyboardDataService,
    PianoKeyboardLayoutService,
    PianoMidiParserService,
    PianoMusicXmlParserService,
    PianoNoteLoaderService,
    PianoPlaybackService,
    PianoRollBuilderService,
    PianoRollRendererService,
  ],
  templateUrl: './piano.component.html',
  styleUrl: './piano.component.scss',
  host: {
    '(window:resize)': 'handleWindowResize()',
  },
})
export class PianoComponent implements AfterViewInit, OnDestroy {
  private readonly noteRollCanvasRef =
    viewChild.required<ElementRef<HTMLCanvasElement>>('noteRollCanvas');
  private readonly impactFxCanvasRef =
    viewChild.required<ElementRef<HTMLCanvasElement>>('impactFxCanvas');
  private readonly keyboardRef =
    viewChild.required<ElementRef<HTMLElement>>('keyboard');
  private readonly keyElements =
    viewChildren<ElementRef<HTMLElement>>('pianoKey');

  private readonly facade = inject(PianoFacadeService);
  private readonly keyboardData = inject(PianoKeyboardDataService);

  protected readonly keys: PianoKeyDefinition[] = this.keyboardData.getKeys();
  protected readonly pieceEntries = Object.entries(PIANO_PIECES);
  protected readonly playing = this.facade.playing;
  protected readonly statusText = this.facade.statusText;
  protected readonly activePieceId = this.facade.activePieceId;
  protected readonly tempoPercent = this.facade.tempoPercent;
  protected readonly highlightedKeys = this.facade.highlightedKeys;

  public ngAfterViewInit(): void {
    const midiToKeyElement = this.buildMidiToKeyMap();
    this.facade.initialize(
      this.noteRollCanvasRef().nativeElement,
      this.impactFxCanvasRef().nativeElement,
      this.keyboardRef().nativeElement,
      midiToKeyElement,
    );
  }

  public ngOnDestroy(): void {
    this.facade.destroy();
  }

  protected handlePieceChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.facade.selectPiece(value);
  }

  protected handlePlay(): void {
    this.facade.play();
  }

  protected handleStop(): void {
    this.facade.stop();
  }

  protected handleTempoChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    this.facade.setTempo(value);
  }

  protected handleKeyPointerDown(event: PointerEvent, midi: number): void {
    event.preventDefault();
    this.facade.playInteractiveNote(midi);
  }

  protected handleKeyPointerEnter(event: PointerEvent, midi: number): void {
    if (event.buttons !== 1) return;
    event.preventDefault();
    this.facade.playInteractiveNote(midi);
  }

  protected handleWindowResize(): void {
    this.facade.handleResize();
  }

  protected isKeyActive(midi: number): boolean {
    return this.highlightedKeys().has(midi);
  }

  protected isKeyActiveLeft(midi: number): boolean {
    return this.highlightedKeys().get(midi) === 'left';
  }

  protected isKeyActiveRight(midi: number): boolean {
    return this.highlightedKeys().get(midi) === 'right';
  }

  private buildMidiToKeyMap(): Map<number, HTMLElement> {
    const map = new Map<number, HTMLElement>();
    const keyEls = this.keyElements();
    for (let i = 0; i < keyEls.length; i++) {
      map.set(this.keys[i].midi, keyEls[i].nativeElement);
    }
    return map;
  }
}
