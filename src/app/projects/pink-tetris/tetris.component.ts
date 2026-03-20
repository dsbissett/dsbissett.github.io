import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  viewChild,
} from '@angular/core';
import { TetrisAnimationFrameService } from './services/tetris-animation-frame.service';
import { TetrisAudioService } from './services/tetris-audio.service';
import { TetrisBackgroundService } from './services/tetris-background.service';
import { TetrisBlockEffectManagerService } from './services/tetris-block-effect-manager.service';
import { TetrisCanvasService } from './services/tetris-canvas.service';
import { TetrisCollisionService } from './services/tetris-collision.service';
import { TetrisFacadeService } from './services/tetris-facade.service';
import { TetrisGridService } from './services/tetris-grid.service';
import { TetrisInputService } from './services/tetris-input.service';
import { TetrisPieceGeneratorService } from './services/tetris-piece-generator.service';
import { TetrisPreviewRendererService } from './services/tetris-preview-renderer.service';
import { TetrisRendererService } from './services/tetris-renderer.service';
import { TetrisScoringService } from './services/tetris-scoring.service';
import { TetrisStateService } from './services/tetris-state.service';

@Component({
  selector: 'app-pink-tetris',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    TetrisAnimationFrameService,
    TetrisAudioService,
    TetrisBackgroundService,
    TetrisBlockEffectManagerService,
    TetrisCanvasService,
    TetrisCollisionService,
    TetrisFacadeService,
    TetrisGridService,
    TetrisInputService,
    TetrisPieceGeneratorService,
    TetrisPreviewRendererService,
    TetrisRendererService,
    TetrisScoringService,
    TetrisStateService,
  ],
  templateUrl: './tetris.component.html',
  styleUrl: './tetris.component.scss',
  host: {
    '(window:keydown)': 'handleWindowKeydown($event)',
    '(touchstart)': 'handleTouchStart($event)',
    '(touchmove)': 'handleTouchMove($event)',
    '(touchend)': 'handleTouchEnd($event)',
  },
})
export class PinkTetrisComponent implements AfterViewInit, OnDestroy {
  private readonly gameCanvasElement =
    viewChild.required<ElementRef<HTMLCanvasElement>>('gameCanvas');
  private readonly previewCanvas1 =
    viewChild.required<ElementRef<HTMLCanvasElement>>('previewCanvas1');
  private readonly previewCanvas2 =
    viewChild.required<ElementRef<HTMLCanvasElement>>('previewCanvas2');
  private readonly previewCanvas3 =
    viewChild.required<ElementRef<HTMLCanvasElement>>('previewCanvas3');
  private readonly effectsCanvasElement =
    viewChild.required<ElementRef<HTMLCanvasElement>>('effectsCanvas');
  private readonly backgroundCanvasElement =
    viewChild.required<ElementRef<HTMLCanvasElement>>('backgroundCanvas');
  private readonly facade = inject(TetrisFacadeService);

  public ngAfterViewInit(): void {
    this.facade.initialize(
      this.gameCanvasElement().nativeElement,
      [
        this.previewCanvas1().nativeElement,
        this.previewCanvas2().nativeElement,
        this.previewCanvas3().nativeElement,
      ],
      this.effectsCanvasElement().nativeElement,
      this.backgroundCanvasElement().nativeElement,
    );
  }

  public ngOnDestroy(): void {
    this.facade.destroy();
  }

  protected handleWindowKeydown(event: KeyboardEvent): void {
    this.facade.handleKeydown(event);
  }

  protected handleTouchStart(event: TouchEvent): void {
    this.facade.handleTouchStart(event);
  }

  protected handleTouchMove(event: TouchEvent): void {
    this.facade.handleTouchMove(event);
  }

  protected handleTouchEnd(event: TouchEvent): void {
    this.facade.handleTouchEnd(event);
  }
}
