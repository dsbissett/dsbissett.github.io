import { ClothCanvasSize } from '../interfaces/cloth-canvas-size.interface';
import { ClothPointerState } from '../interfaces/cloth-pointer-state.interface';
import type { ClothConstraint } from './cloth-constraint.class';

export class ClothPoint {
  public readonly constraints: ClothConstraint[] = [];
  public pinned = false;
  public pinX = 0;
  public pinY = 0;
  public previousX: number;
  public previousY: number;

  public constructor(
    public x: number,
    public y: number
  ) {
    this.previousX = x;
    this.previousY = y;
  }

  public addConstraint(constraint: ClothConstraint): void {
    this.constraints.push(constraint);
  }

  public appendPath(context: CanvasRenderingContext2D): void {
    for (const constraint of this.constraints) {
      constraint.appendPath(context);
    }
  }

  public applyPointer(pointer: ClothPointerState): void {
    if (!pointer.isDown) {
      return;
    }

    this.applyCut(pointer);
    this.applyDrag(pointer);
  }

  public clearConstraints(): void {
    this.constraints.length = 0;
  }

  public constrainWithinBounds(size: ClothCanvasSize, bounce: number): void {
    if (this.x < 0) {
      this.x = 0;
      this.previousX = this.x + (this.x - this.previousX) * bounce;
    }

    if (this.x > size.width) {
      this.x = size.width;
      this.previousX = this.x + (this.x - this.previousX) * bounce;
    }

    if (this.y < 0) {
      this.y = 0;
      this.previousY = this.y + (this.y - this.previousY) * bounce;
    }

    if (this.y > size.height) {
      this.y = size.height;
      this.previousY = this.y + (this.y - this.previousY) * bounce;
    }
  }

  public integrate(deltaSeconds: number, friction: number, gravity: number): void {
    const deltaSquared = deltaSeconds * deltaSeconds;
    const nextX = this.x + (this.x - this.previousX) * friction;
    const nextY =
      this.y + (this.y - this.previousY) * friction + gravity * deltaSquared;

    this.previousX = this.x;
    this.previousY = this.y;
    this.x = nextX;
    this.y = nextY;
  }

  public isWithinRadius(x: number, y: number, radius: number): boolean {
    return Math.hypot(this.x - x, this.y - y) < radius;
  }

  public pinToCurrentPosition(): void {
    this.pinned = true;
    this.pinX = this.x;
    this.pinY = this.y;
    this.previousX = this.x;
    this.previousY = this.y;
  }

  public releasePin(): void {
    this.pinned = false;
  }

  public removeConstraint(constraint: ClothConstraint): void {
    const index = this.constraints.indexOf(constraint);
    if (index >= 0) {
      this.constraints.splice(index, 1);
    }
  }

  public resolveConstraints(tearDistance: number): void {
    for (const constraint of this.constraints) {
      constraint.resolve(tearDistance);
    }
  }

  public syncPinnedState(pointer: ClothPointerState): boolean {
    if (!this.pinned) {
      return false;
    }

    this.applyPinnedCut(pointer);
    this.applyPinnedRelease(pointer);

    if (!this.pinned) {
      return false;
    }

    this.x = this.pinX;
    this.y = this.pinY;
    this.previousX = this.pinX;
    this.previousY = this.pinY;
    return true;
  }

  private applyCut(pointer: ClothPointerState): void {
    if (pointer.button !== 2) {
      return;
    }

    if (this.isWithinRadius(pointer.x, pointer.y, pointer.cutRadius)) {
      this.clearConstraints();
    }
  }

  private applyDrag(pointer: ClothPointerState): void {
    if (pointer.button !== 0) {
      return;
    }

    if (!this.isWithinRadius(pointer.x, pointer.y, pointer.influenceRadius)) {
      return;
    }

    const deltaX = pointer.x - pointer.previousX;
    const deltaY = pointer.y - pointer.previousY;
    this.previousX = this.x - deltaX;
    this.previousY = this.y - deltaY;
  }

  private applyPinnedCut(pointer: ClothPointerState): void {
    if (!pointer.isDown || pointer.button !== 2) {
      return;
    }

    if (this.isWithinRadius(pointer.x, pointer.y, pointer.cutRadius)) {
      this.clearConstraints();
    }
  }

  private applyPinnedRelease(pointer: ClothPointerState): void {
    if (!pointer.isDown || pointer.button !== 0) {
      return;
    }

    if (this.isWithinRadius(pointer.x, pointer.y, pointer.influenceRadius)) {
      this.releasePin();
    }
  }
}
