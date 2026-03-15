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
import { RouterLink } from '@angular/router';

import { PARTICLE_LIFE_PRESETS } from './constants/particle-life-presets.constant';
import { PARTICLE_LIFE_SPECIES_COLORS } from './constants/particle-life-species-colors.constant';
import { ParticleLifeAnimationFrameService } from './services/particle-life-animation-frame.service';
import { ParticleLifeCanvasService } from './services/particle-life-canvas.service';
import { ParticleLifeFacadeService } from './services/particle-life-facade.service';
import { ParticleLifeMatrixService } from './services/particle-life-matrix.service';
import { ParticleLifePointerService } from './services/particle-life-pointer.service';
import { ParticleLifeRendererService } from './services/particle-life-renderer.service';
import { ParticleLifeSimulationService } from './services/particle-life-simulation.service';
import { ParticleLifeStateService } from './services/particle-life-state.service';

@Component({
  selector: 'app-particle-life',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  providers: [
    ParticleLifeAnimationFrameService,
    ParticleLifeCanvasService,
    ParticleLifeFacadeService,
    ParticleLifeMatrixService,
    ParticleLifePointerService,
    ParticleLifeRendererService,
    ParticleLifeSimulationService,
    ParticleLifeStateService,
  ],
  templateUrl: './particle-life.component.html',
  styleUrl: './particle-life.component.scss',
  host: {
    '(window:keydown)': 'handleWindowKeydown($event)',
    '(window:pointercancel)': 'handleWindowPointerCancel($event)',
    '(window:pointermove)': 'handleWindowPointerMove($event)',
    '(window:pointerup)': 'handleWindowPointerUp($event)',
    '(window:resize)': 'handleWindowResize()',
  },
})
export class ParticleLifeComponent implements AfterViewInit, OnDestroy {
  private readonly canvasElement =
    viewChild.required<ElementRef<HTMLCanvasElement>>('particleCanvas');
  private readonly controlDeckElement =
    viewChild.required<ElementRef<HTMLElement>>('controlDeck');
  private readonly facade = inject(ParticleLifeFacadeService);
  private dragPointerId: number | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  protected readonly controlDeckLeft = signal(24);
  protected readonly controlDeckTop = signal(24);
  protected readonly isDragging = signal(false);
  protected readonly collapsed = signal(false);
  protected readonly dragHandleLabel = computed(() =>
    this.isDragging() ? 'Dragging controls' : 'Drag controls'
  );

  protected readonly running = this.facade.running;
  protected readonly particleCount = this.facade.particleCount;
  protected readonly speciesCount = this.facade.speciesCount;
  protected readonly attractionMatrix = this.facade.attractionMatrix;
  protected readonly friction = this.facade.friction;
  protected readonly interactionRadius = this.facade.interactionRadius;
  protected readonly forceScale = this.facade.forceScale;
  protected readonly wrapEdges = this.facade.wrapEdges;
  protected readonly presetName = this.facade.presetName;
  protected readonly presets = PARTICLE_LIFE_PRESETS;
  protected readonly zoom = this.facade.zoom;
  protected readonly speciesColors = computed(() =>
    PARTICLE_LIFE_SPECIES_COLORS.slice(0, this.speciesCount())
  );
  protected readonly frictionDisplay = computed(() =>
    this.friction().toFixed(2)
  );
  protected readonly forceScaleDisplay = computed(() =>
    this.forceScale().toFixed(1)
  );
  protected readonly zoomDisplay = computed(() => {
    const z = this.zoom();
    return z >= 1 ? z.toFixed(1) + 'x' : z.toFixed(2) + 'x';
  });

  public ngAfterViewInit(): void {
    this.facade.initialize(this.canvasElement().nativeElement);
    queueMicrotask(() => this.positionControlDeck());
  }

  public ngOnDestroy(): void {
    this.facade.destroy();
  }

  protected handlePointerCancel(event: PointerEvent): void {
    this.facade.handlePointerCancel(event);
  }

  protected handlePointerDown(event: PointerEvent): void {
    this.facade.handlePointerDown(event);
  }

  protected handlePointerMove(event: PointerEvent): void {
    this.facade.handlePointerMove(event);
  }

  protected handlePointerUp(event: PointerEvent): void {
    this.facade.handlePointerUp(event);
  }

  protected handleWheel(event: WheelEvent): void {
    this.facade.handleWheel(event);
  }

  protected handleControlDeckPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    const deckBounds =
      this.controlDeckElement().nativeElement.getBoundingClientRect();
    this.dragPointerId = event.pointerId;
    this.dragOffsetX = event.clientX - deckBounds.left;
    this.dragOffsetY = event.clientY - deckBounds.top;
    this.isDragging.set(true);
    event.preventDefault();
  }

  protected handleWindowPointerCancel(event: PointerEvent): void {
    this.stopDragging(event);
  }

  protected handleWindowPointerMove(event: PointerEvent): void {
    if (!this.isDraggingPointer(event)) {
      return;
    }

    this.updateControlDeckPosition(
      event.clientX - this.dragOffsetX,
      event.clientY - this.dragOffsetY
    );
  }

  protected handleWindowPointerUp(event: PointerEvent): void {
    this.stopDragging(event);
  }

  protected handleWindowKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;

    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'SELECT' ||
      target.tagName === 'TEXTAREA'
    ) {
      return;
    }

    this.facade.handleKeydown(event);
  }

  protected handleWindowResize(): void {
    this.facade.handleResize();
    this.positionControlDeck();
  }

  protected preventContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  protected handleParticleCount(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.facade.updateParticleCount(value);
  }

  protected handleSpeciesCount(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.facade.updateSpeciesCount(value);
  }

  protected handleFriction(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.facade.updateFriction(value);
  }

  protected handleForceScale(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.facade.updateForceScale(value);
  }

  protected handleInteractionRadius(event: Event): void {
    const value = +(event.target as HTMLInputElement).value;
    this.facade.updateInteractionRadius(value);
  }

  protected handleWrapToggle(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.facade.toggleWrapEdges(checked);
  }

  protected handleMatrixCell(
    from: number,
    to: number,
    event: Event
  ): void {
    const value = +(event.target as HTMLInputElement).value;
    this.facade.updateAttractionCell(from, to, value);
  }

  protected handlePreset(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.facade.applyPreset(value);
  }

  protected randomize(): void {
    this.facade.randomize();
  }

  protected toggleRunning(): void {
    this.facade.toggleRunning();
  }

  protected resetZoom(): void {
    this.facade.resetZoom();
  }

  protected toggleCollapsed(): void {
    this.collapsed.update((v) => !v);
  }

  private getClampedLeft(left: number, width: number): number {
    const maxLeft = Math.max(16, window.innerWidth - width - 16);
    return Math.min(Math.max(16, left), maxLeft);
  }

  private getClampedTop(top: number, height: number): number {
    const maxTop = Math.max(16, window.innerHeight - height - 16);
    return Math.min(Math.max(16, top), maxTop);
  }

  private isDraggingPointer(event: PointerEvent): boolean {
    return this.dragPointerId === event.pointerId;
  }

  private positionControlDeck(): void {
    const deckBounds =
      this.controlDeckElement().nativeElement.getBoundingClientRect();
    const preferredLeft = window.innerWidth - deckBounds.width - 24;
    this.updateControlDeckPosition(preferredLeft, this.controlDeckTop());
  }

  private stopDragging(event: PointerEvent): void {
    if (!this.isDraggingPointer(event)) {
      return;
    }

    this.dragPointerId = null;
    this.isDragging.set(false);
  }

  private updateControlDeckPosition(left: number, top: number): void {
    const deckBounds =
      this.controlDeckElement().nativeElement.getBoundingClientRect();
    this.controlDeckLeft.set(this.getClampedLeft(left, deckBounds.width));
    this.controlDeckTop.set(this.getClampedTop(top, deckBounds.height));
  }
}
