import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  viewChild,
} from '@angular/core';

import { FlappyBirdAnimationFrameService } from './services/flappy-bird-animation-frame.service';
import { FlappyBirdAssetLoaderService } from './services/flappy-bird-asset-loader.service';
import { FlappyBirdCanvasService } from './services/flappy-bird-canvas.service';
import { FlappyBirdCollisionService } from './services/flappy-bird-collision.service';
import { FlappyBirdFacadeService } from './services/flappy-bird-facade.service';
import { FlappyBirdFontService } from './services/flappy-bird-font.service';
import { FlappyBirdGameFactoryService } from './services/flappy-bird-game-factory.service';
import { FlappyBirdLayoutService } from './services/flappy-bird-layout.service';
import { FlappyBirdPipeManagerService } from './services/flappy-bird-pipe-manager.service';
import { FlappyBirdRendererService } from './services/flappy-bird-renderer.service';
import { FlappyBirdScrollService } from './services/flappy-bird-scroll.service';
import { FlappyBirdSpawnPolicyService } from './services/flappy-bird-spawn-policy.service';
import { FlappyBirdSpawnService } from './services/flappy-bird-spawn.service';
import { FlappyBirdStateService } from './services/flappy-bird-state.service';

@Component({
  selector: 'app-flappy-bird',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    FlappyBirdAnimationFrameService,
    FlappyBirdAssetLoaderService,
    FlappyBirdCanvasService,
    FlappyBirdCollisionService,
    FlappyBirdFacadeService,
    FlappyBirdFontService,
    FlappyBirdGameFactoryService,
    FlappyBirdLayoutService,
    FlappyBirdPipeManagerService,
    FlappyBirdRendererService,
    FlappyBirdScrollService,
    FlappyBirdSpawnPolicyService,
    FlappyBirdSpawnService,
    FlappyBirdStateService,
  ],
  templateUrl: './flappy-bird.component.html',
  styleUrl: './flappy-bird.component.scss',
  host: {
    '(window:keydown)': 'handleWindowKeydown($event)',
    '(window:resize)': 'handleWindowResize()',
  },
})
export class FlappyBirdComponent implements AfterViewInit, OnDestroy {
  private readonly canvasElement =
    viewChild.required<ElementRef<HTMLCanvasElement>>('gameCanvas');
  private readonly facade = inject(FlappyBirdFacadeService);

  protected readonly assetsReady = this.facade.assetsReady;
  protected readonly initializationFailed = this.facade.initializationFailed;

  public async ngAfterViewInit(): Promise<void> {
    await this.facade.initialize(this.canvasElement().nativeElement);
  }

  public ngOnDestroy(): void {
    this.facade.destroy();
  }

  protected handlePointerDown(event: PointerEvent): void {
    event.preventDefault();
    this.facade.handleInput();
  }

  protected handleWindowKeydown(event: KeyboardEvent): void {
    if (event.code !== 'Space') {
      return;
    }

    event.preventDefault();
    this.facade.handleInput();
  }

  protected handleWindowResize(): void {
    this.facade.handleResize();
  }
}
