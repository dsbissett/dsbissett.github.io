import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  OnDestroy,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TetrisAnimationFrameService } from './services/tetris-animation-frame.service';
import { TetrisAiAgentService } from './services/tetris-ai-agent.service';
import { TetrisAiChartService } from './services/tetris-ai-chart.service';
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
import { TetrisAiPersistenceService } from './services/tetris-ai-persistence.service';
import { TetrisAiStatsService } from './services/tetris-ai-stats.service';
import { TetrisReplayBufferService } from './services/tetris-replay-buffer.service';
import { TetrisDemonstrationBufferService } from './services/tetris-demonstration-buffer.service';
import { TetrisBoardAnalyzerService } from './services/tetris-board-analyzer.service';
import { TetrisModelService } from './services/tetris-model.service';
import { TetrisTrainerService } from './services/tetris-trainer.service';
import { TetrisAiSerializerService } from './services/tetris-ai-serializer.service';
import { TetrisAiDiagnosticsService } from './services/tetris-ai-diagnostics.service';
import { TetrisBoardMetricsService } from './services/tetris-board-metrics.service';
import { TetrisAiExecutorService } from './services/tetris-ai-executor.service';
import { TetrisPlacementEnumeratorService } from './services/tetris-placement-enumerator.service';
import { TetrisPlanSelectorService } from './services/tetris-plan-selector.service';
import { TetrisRewardCalculatorService } from './services/tetris-reward-calculator.service';
import { TetrisAiProgressPanelComponent } from './components/tetris-ai-progress-panel.component';
import { TetrisAiProgressStoreService } from './services/tetris-ai-progress-store.service';
import { TetrisAiTrainingTelemetryService } from './services/tetris-ai-training-telemetry.service';
import { TetrisAiPolicyTelemetryService } from './services/tetris-ai-policy-telemetry.service';
import { TetrisAiMoveTelemetryService } from './services/tetris-ai-move-telemetry.service';
import { TetrisAiMilestoneService } from './services/tetris-ai-milestone.service';

@Component({
  selector: 'app-tetris',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TetrisAiProgressPanelComponent],
  providers: [
    TetrisAnimationFrameService,
    TetrisAiAgentService,
    TetrisAiChartService,
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
    TetrisAiPersistenceService,
    TetrisAiStatsService,
    TetrisReplayBufferService,
    TetrisDemonstrationBufferService,
    TetrisBoardAnalyzerService,
    TetrisModelService,
    TetrisTrainerService,
    TetrisAiSerializerService,
    TetrisAiDiagnosticsService,
    TetrisBoardMetricsService,
    TetrisAiExecutorService,
    TetrisPlacementEnumeratorService,
    TetrisPlanSelectorService,
    TetrisRewardCalculatorService,
    TetrisAiProgressStoreService,
    TetrisAiTrainingTelemetryService,
    TetrisAiPolicyTelemetryService,
    TetrisAiMoveTelemetryService,
    TetrisAiMilestoneService,
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
  private readonly rewardChartCanvasElement =
    viewChild<ElementRef<HTMLCanvasElement>>('rewardChartCanvas');
  private readonly penaltyChartCanvasElement =
    viewChild<ElementRef<HTMLCanvasElement>>('penaltyChartCanvas');
  private readonly trainingDataInputElement =
    viewChild.required<ElementRef<HTMLInputElement>>('trainingDataInput');
  private readonly facade = inject(TetrisFacadeService);
  private readonly trainingDataStatus = signal('');
  private chartsInitialized = false;

  private readonly chartInitEffect = effect(() => {
    const rewardRef = this.rewardChartCanvasElement();
    const penaltyRef = this.penaltyChartCanvasElement();
    if (rewardRef && penaltyRef && !this.chartsInitialized) {
      this.chartsInitialized = true;
      this.facade.initializeCharts(rewardRef.nativeElement, penaltyRef.nativeElement);
    }
  });

  protected readonly leftPanelCollapsed = signal(false);
  protected readonly rightPanelCollapsed = signal(false);
  protected readonly progressPanelCollapsed = signal(false);

  protected readonly aiReady = this.facade.aiReady;
  protected readonly aiEnabled = this.facade.aiEnabled;
  protected readonly demonstrationRecordingEnabled = this.facade.demonstrationRecordingEnabled;
  protected readonly aiStats = this.facade.aiStats;
  protected readonly aiProgress = this.facade.aiProgress;
  protected readonly aiToggleLabel = computed(() => {
    if (!this.aiReady()) {
      return 'Loading AI model...';
    }

    return this.aiEnabled() ? 'Stop AI' : 'Play with AI?';
  });
  protected readonly aiStatusText = computed(() => {
    if (!this.aiReady()) {
      return 'TensorFlow.js is loading saved training data from browser storage.';
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
  protected readonly averageTeacherScoreText = computed(() =>
    this.aiStats().averageTeacherScore.toFixed(1),
  );
  protected readonly averageAiScoreText = computed(() => this.aiStats().averageAiScore.toFixed(1));
  protected readonly epsilonText = computed(() => this.aiStats().epsilon.toFixed(4));
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
      this.trainingDataStatus.set('Training data imported into browser storage.');
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
