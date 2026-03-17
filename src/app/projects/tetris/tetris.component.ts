import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TetrisAnimationFrameService } from './services/tetris-animation-frame.service';
import { TetrisAiAgentService } from './services/tetris-ai-agent.service';
import { TetrisAiControllerService } from './services/tetris-ai-controller.service';
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
  selector: 'app-tetris',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    TetrisAnimationFrameService,
    TetrisAiAgentService,
    TetrisAiControllerService,
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
  },
})
export class TetrisComponent implements AfterViewInit, OnDestroy {
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
  private readonly trainingDataInputElement =
    viewChild.required<ElementRef<HTMLInputElement>>('trainingDataInput');
  private readonly facade = inject(TetrisFacadeService);
  private readonly trainingDataStatus = signal('');

  protected readonly leftPanelCollapsed = signal(false);
  protected readonly rightPanelCollapsed = signal(false);

  protected readonly aiReady = this.facade.aiReady;
  protected readonly aiEnabled = this.facade.aiEnabled;
  protected readonly demonstrationRecordingEnabled = this.facade.demonstrationRecordingEnabled;
  protected readonly aiStats = this.facade.aiStats;
  protected readonly aiToggleLabel = computed(() => {
    if (!this.aiReady()) {
      return 'Loading AI model...';
    }

    return this.aiEnabled() ? 'Stop AI' : 'Play with AI?';
  });
  protected readonly aiStatusText = computed(() => {
    if (!this.aiReady()) {
      return 'TensorFlow.js is loading saved training data from localStorage.';
    }

    return this.aiEnabled()
      ? 'The AI is controlling the board and training in this browser.'
      : 'Enable AI to let the local model learn and play on your behalf.';
  });
  protected readonly demonstrationToggleLabel = computed(() =>
    this.demonstrationRecordingEnabled() ? 'Stop recording' : 'Record my play',
  );
  protected readonly demonstrationStatusText = computed(() => {
    if (!this.aiReady()) {
      return 'Demonstration learning becomes available after the model loads.';
    }

    return this.demonstrationRecordingEnabled()
      ? 'Play manually. Each locked piece is saved as a labeled example for the AI.'
      : 'Record human play to bootstrap the AI from your placements.';
  });
  protected readonly averageScoreText = computed(() => this.aiStats().averageScore.toFixed(1));
  protected readonly epsilonText = computed(() => this.aiStats().epsilon.toFixed(3));
  protected readonly demonstrationSamplesText = computed(() =>
    this.aiStats().demonstrationSamples.toLocaleString(),
  );
  protected readonly trainingDataStatusText = this.trainingDataStatus.asReadonly();

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

  protected toggleAi(): void {
    void this.facade.setAiEnabled(!this.aiEnabled());
  }

  protected resetAiTraining(): void {
    this.facade.resetAiTraining();
  }

  protected toggleDemonstrationRecording(): void {
    void this.facade.setDemonstrationRecordingEnabled(!this.demonstrationRecordingEnabled());
  }

  protected async exportTrainingData(): Promise<void> {
    try {
      const json = await this.facade.exportTrainingData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `tetris-ai-training-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      this.trainingDataStatus.set('Training data exported as JSON.');
    } catch (error) {
      this.trainingDataStatus.set(this.toErrorMessage(error, 'Export failed.'));
    }
  }

  protected triggerTrainingDataImport(): void {
    this.trainingDataInputElement().nativeElement.click();
  }

  protected async handleTrainingDataFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) {
      return;
    }

    try {
      const json = await file.text();
      await this.facade.importTrainingData(json);
      this.trainingDataStatus.set('Training data imported into localStorage.');
    } catch (error) {
      this.trainingDataStatus.set(this.toErrorMessage(error, 'Import failed.'));
    } finally {
      if (input) {
        input.value = '';
      }
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
