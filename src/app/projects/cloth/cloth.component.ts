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

import { ClothAnimationFrameService } from './services/cloth-animation-frame.service';
import { ClothCanvasService } from './services/cloth-canvas.service';
import { ClothFacadeService } from './services/cloth-facade.service';
import { ClothPointerService } from './services/cloth-pointer.service';
import { ClothRendererService } from './services/cloth-renderer.service';
import { ClothSceneBuilderService } from './services/cloth-scene-builder.service';
import { ClothSimulationService } from './services/cloth-simulation.service';
import { ClothTextLayoutService } from './services/cloth-text-layout.service';

@Component({
  selector: 'app-cloth',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  providers: [
    ClothAnimationFrameService,
    ClothCanvasService,
    ClothFacadeService,
    ClothPointerService,
    ClothRendererService,
    ClothSceneBuilderService,
    ClothSimulationService,
    ClothTextLayoutService,
  ],
  templateUrl: './cloth.component.html',
  styleUrl: './cloth.component.scss',
  host: {
    '(window:keydown)': 'handleWindowKeydown($event)',
    '(window:pointercancel)': 'handleWindowPointerCancel($event)',
    '(window:pointermove)': 'handleWindowPointerMove($event)',
    '(window:pointerup)': 'handleWindowPointerUp($event)',
    '(window:resize)': 'handleWindowResize()',
  },
})
export class ClothComponent implements AfterViewInit, OnDestroy {
  private readonly canvasElement =
    viewChild.required<ElementRef<HTMLCanvasElement>>('clothCanvas');
  private readonly controlDeckElement =
    viewChild.required<ElementRef<HTMLElement>>('controlDeck');
  private readonly facade = inject(ClothFacadeService);
  private dragPointerId: number | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  protected readonly controlDeckLeft = signal(24);
  protected readonly controlDeckTop = signal(24);
  protected readonly isDragging = signal(false);
  protected readonly dragHandleLabel = computed(() =>
    this.isDragging() ? 'Dragging controls' : 'Drag controls'
  );

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

  protected handleControlDeckPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    const deckBounds = this.controlDeckElement().nativeElement.getBoundingClientRect();
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
    this.facade.handleKeydown(event);
  }

  protected handleWindowResize(): void {
    this.facade.handleResize();
    this.positionControlDeck();
  }

  protected preventContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  protected reset(): void {
    this.facade.reset();
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
    const deckBounds = this.controlDeckElement().nativeElement.getBoundingClientRect();
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
    const deckBounds = this.controlDeckElement().nativeElement.getBoundingClientRect();
    this.controlDeckLeft.set(this.getClampedLeft(left, deckBounds.width));
    this.controlDeckTop.set(this.getClampedTop(top, deckBounds.height));
  }
}
