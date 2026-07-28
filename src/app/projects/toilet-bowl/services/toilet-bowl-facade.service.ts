import { Injectable, NgZone, inject, signal } from '@angular/core';

import { Vec3 } from '../classes/mat4.class';
import {
  AIM_LIMIT_X,
  AIM_LIMIT_Z,
  AIM_SPEED,
  BLOB_REBUILD_MS,
  CLOD_MESH_COUNT,
  FIRE_INTERVAL_MS,
  LAUNCH_POSITION,
  LAUNCH_TARGET,
} from '../constants/toilet-physics.constant';
import { ToiletBlobService } from './toilet-blob.service';
import { ToiletCameraService } from './toilet-camera.service';
import { ToiletFliesService } from './toilet-flies.service';
import { ToiletGeometryService } from './toilet-geometry.service';
import { ToiletPointerService } from './toilet-pointer.service';
import { ToiletProjectilesService } from './toilet-projectiles.service';
import { ToiletRendererService } from './toilet-renderer.service';
import { ToiletWaterService } from './toilet-water.service';

const IDLE_DELAY_MS = 3500;

/** Wires the renderer, camera, geometry, input and physics, and drives the render loop. */
@Injectable()
export class ToiletBowlFacadeService {
  private readonly ngZone = inject(NgZone);
  private readonly renderer = inject(ToiletRendererService);
  private readonly camera = inject(ToiletCameraService);
  private readonly pointer = inject(ToiletPointerService);
  private readonly geometry = inject(ToiletGeometryService);
  private readonly water = inject(ToiletWaterService);
  private readonly projectiles = inject(ToiletProjectilesService);
  private readonly blob = inject(ToiletBlobService);
  private readonly flies = inject(ToiletFliesService);

  public readonly failed = signal(false);

  private canvas: HTMLCanvasElement | null = null;
  private frame = 0;
  private lastTime = 0;
  private lastInteraction = 0;
  private lastFire = 0;
  private firingHeld = false;
  private allowAutoRotate = true;
  private lastBlobVersion = -1;
  private lastBlobBuild = 0;
  private aimX = 0;
  private aimZ = 0;
  private aimLeft = false;
  private aimRight = false;
  private aimUp = false;
  private aimDown = false;

  public initialize(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    if (!this.renderer.init(canvas)) {
      this.failed.set(true);
      return;
    }

    this.renderer.uploadToilet(this.geometry.buildToilet());
    this.renderer.uploadFloor(this.geometry.buildFloor());
    this.renderer.uploadSeat(this.geometry.buildSeatPlate());
    this.renderer.uploadLid(this.geometry.buildLidPlate());
    this.renderer.uploadProjectileMeshes([
      ...this.geometry.buildClods(CLOD_MESH_COUNT),
      this.geometry.buildSplatDecal(),
    ]);
    this.water.init();
    this.renderer.initWater(this.water.indices, this.water.vertexCount);
    this.allowAutoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.ngZone.runOutsideAngular(() => {
      this.pointer.attach(canvas, this.camera, () => this.markInteraction());
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
      this.resize();
      this.lastTime = performance.now();
      this.lastInteraction = this.lastTime;
      this.frame = requestAnimationFrame(this.loop);
    });
  }

  public destroy(): void {
    cancelAnimationFrame(this.frame);
    this.pointer.detach();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.projectiles.clear();
    this.renderer.destroy();
    this.canvas = null;
  }

  private readonly loop = (now: number): void => {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.steerAim(dt);
    this.autoFire(now);
    for (const impact of this.projectiles.step(dt)) {
      this.water.splash(impact.x, impact.z, impact.strength);
      this.water.addDirt(impact.strength * 0.04);
    }
    this.water.setMud(this.projectiles.getBowlMud());
    this.water.step(dt);
    this.flies.step(dt, this.projectiles.getBowlMud());
    this.rebuildBlob(now);

    if (this.allowAutoRotate && !this.firingHeld && now - this.lastInteraction > IDLE_DELAY_MS) {
      this.camera.autoRotate(dt);
    }

    this.resize();
    const canvas = this.canvas;
    if (canvas) {
      this.renderer.render(
        this.camera,
        canvas.width,
        canvas.height,
        [...this.projectiles.getInstances(), ...this.flies.getInstances()],
        this.projectiles.getSeatAngle(),
        this.projectiles.getLidAngle(),
        now / 1000,
        this.water.getPositions(),
        this.water.getNormals(),
        this.water.tint(),
        this.water.opacity(),
      );
    }
    this.frame = requestAnimationFrame(this.loop);
  };

  private autoFire(now: number): void {
    if (this.firingHeld && now - this.lastFire >= FIRE_INTERVAL_MS) {
      this.fire();
      this.lastFire = now;
    }
  }

  /** Re-extracts the congealed gel isosurface when new mud has settled (throttled). */
  private rebuildBlob(now: number): void {
    const version = this.projectiles.getBlobVersion();
    if (version === this.lastBlobVersion || now - this.lastBlobBuild < BLOB_REBUILD_MS) {
      return;
    }
    this.renderer.uploadBlob(this.blob.build(this.projectiles.getMetaballs(), this.projectiles.sampleMud));
    this.lastBlobVersion = version;
    this.lastBlobBuild = now;
  }

  private fire(): void {
    const target: Vec3 = [
      LAUNCH_TARGET[0] + this.aimX,
      LAUNCH_TARGET[1],
      LAUNCH_TARGET[2] + this.aimZ,
    ];
    this.projectiles.fire(LAUNCH_POSITION, target);
    this.markInteraction();
  }

  private steerAim(dt: number): void {
    const ax = (this.aimRight ? 1 : 0) - (this.aimLeft ? 1 : 0);
    const az = (this.aimDown ? 1 : 0) - (this.aimUp ? 1 : 0);
    this.aimX = this.clamp(this.aimX + ax * AIM_SPEED * dt, -AIM_LIMIT_X, AIM_LIMIT_X);
    this.aimZ = this.clamp(this.aimZ + az * AIM_SPEED * dt, -AIM_LIMIT_Z, AIM_LIMIT_Z);
  }

  /** Touch/UI entry point: press-and-hold rapid fire (mirrors holding Space). */
  public setFiring(held: boolean): void {
    if (!held) {
      this.firingHeld = false;
      return;
    }
    if (this.firingHeld) {
      return;
    }
    this.firingHeld = true;
    this.fire();
    this.lastFire = performance.now();
  }

  /** Touch/UI entry point: press-and-hold aim steering (mirrors the arrow keys). */
  public steer(direction: 'left' | 'right' | 'up' | 'down', pressed: boolean): void {
    switch (direction) {
      case 'left':
        this.aimLeft = pressed;
        break;
      case 'right':
        this.aimRight = pressed;
        break;
      case 'up':
        this.aimUp = pressed;
        break;
      case 'down':
        this.aimDown = pressed;
        break;
    }
    this.markInteraction();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (this.isEditableTarget(event.target)) {
      return;
    }
    if (this.setArrow(event.code, true)) {
      event.preventDefault();
      this.markInteraction();
      return;
    }
    if (event.code !== 'Space') {
      return;
    }
    event.preventDefault();
    if (!event.repeat) {
      this.setFiring(true);
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (this.setArrow(event.code, false)) {
      return;
    }
    if (event.code === 'Space') {
      this.setFiring(false);
    }
  };

  private setArrow(code: string, pressed: boolean): boolean {
    switch (code) {
      case 'ArrowLeft':
        this.steer('left', pressed);
        return true;
      case 'ArrowRight':
        this.steer('right', pressed);
        return true;
      case 'ArrowUp':
        this.steer('up', pressed);
        return true;
      case 'ArrowDown':
        this.steer('down', pressed);
        return true;
      default:
        return false;
    }
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && !!target.closest('input, textarea, [contenteditable="true"]');
  }

  private markInteraction(): void {
    this.lastInteraction = performance.now();
  }

  private resize(): void {
    const canvas = this.canvas;
    if (!canvas) {
      return;
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.round(canvas.clientWidth * dpr);
    const height = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }
}
