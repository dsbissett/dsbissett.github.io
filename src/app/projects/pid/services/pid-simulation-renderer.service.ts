import { Injectable, inject } from '@angular/core';

import { PID_THEME } from '../constants/pid-theme.constant';
import { PID_VISUALIZATION_BOUNDS } from '../constants/pid-visualization-bounds.constant';
import { PidPlantState } from '../interfaces/pid-plant-state.interface';
import { PidMathService } from './pid-math.service';

@Injectable()
export class PidSimulationRendererService {
  private readonly mathService = inject(PidMathService);

  public render(
    context: CanvasRenderingContext2D,
    plantState: PidPlantState,
    setpoint: number
  ): void {
    this.clear(context);
    this.drawGrid(context);
    this.drawTrack(context);
    this.drawOriginMarker(context);
    this.drawSetpointMarker(context, setpoint);
    this.drawCart(context, plantState.position);
    this.drawAnnotations(context, plantState, setpoint);
  }

  private clear(context: CanvasRenderingContext2D): void {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  }

  private drawAnnotations(
    context: CanvasRenderingContext2D,
    plantState: PidPlantState,
    setpoint: number
  ): void {
    context.save();
    context.fillStyle = 'rgba(233,236,255,.85)';
    context.font = '12px ui-sans-serif, system-ui';
    context.fillText(`x = ${plantState.position.toFixed(3)} m`, 14, context.canvas.height - 18);
    context.fillText(`r = ${setpoint.toFixed(3)} m`, 130, context.canvas.height - 18);
    context.fillText(`v = ${plantState.velocity.toFixed(3)} m/s`, 250, context.canvas.height - 18);
    context.restore();
  }

  private drawCart(context: CanvasRenderingContext2D, position: number): void {
    const cartCenter = this.getCanvasPosition(context.canvas.width, position);
    const cartWidth = 90;
    const cartHeight = 44;
    const cartTop = this.getTrackY(context.canvas.height) - cartHeight - 10;

    context.save();
    context.fillStyle = 'rgba(158,206,106,.22)';
    context.strokeStyle = PID_THEME.good;
    context.lineWidth = 3;
    context.beginPath();
    this.drawRoundedRectangle(
      context,
      cartCenter - cartWidth / 2,
      cartTop,
      cartWidth,
      cartHeight,
      12
    );
    context.fill();
    context.stroke();
    context.fillStyle = 'rgba(233,236,255,.75)';
    this.drawWheel(context, cartCenter - cartWidth / 3, this.getTrackY(context.canvas.height) - 8);
    this.drawWheel(context, cartCenter + cartWidth / 3, this.getTrackY(context.canvas.height) - 8);
    this.drawSpring(
      context,
      70,
      cartTop + cartHeight / 2,
      cartCenter - cartWidth / 2,
      cartTop + cartHeight / 2
    );
    context.restore();
  }

  private drawGrid(context: CanvasRenderingContext2D): void {
    const padding = 36;

    context.save();
    context.globalAlpha = 0.85;
    context.strokeStyle = PID_THEME.grid;
    context.lineWidth = 1;
    this.drawLines(context, padding, 12, true);
    this.drawLines(context, padding, 6, false);
    context.restore();
  }

  private drawLines(
    context: CanvasRenderingContext2D,
    padding: number,
    divisions: number,
    vertical: boolean
  ): void {
    for (let index = 0; index <= divisions; index += 1) {
      const startX = vertical
        ? padding + ((context.canvas.width - padding * 2) * index) / divisions
        : padding;
      const endX = vertical ? startX : context.canvas.width - padding;
      const startY = vertical
        ? padding
        : padding + ((context.canvas.height - padding * 2) * index) / divisions;
      const endY = vertical ? context.canvas.height - padding : startY;

      context.beginPath();
      context.moveTo(startX, startY);
      context.lineTo(endX, endY);
      context.stroke();
    }
  }

  private drawOriginMarker(context: CanvasRenderingContext2D): void {
    const x = this.getCanvasPosition(context.canvas.width, 0);
    const trackY = this.getTrackY(context.canvas.height);

    context.save();
    context.strokeStyle = 'rgba(255,255,255,.14)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, trackY - 62);
    context.lineTo(x, trackY + 62);
    context.stroke();
    context.restore();
  }

  private drawRoundedRectangle(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    const clampedRadius = Math.min(radius, width / 2, height / 2);

    context.moveTo(x + clampedRadius, y);
    context.arcTo(x + width, y, x + width, y + height, clampedRadius);
    context.arcTo(x + width, y + height, x, y + height, clampedRadius);
    context.arcTo(x, y + height, x, y, clampedRadius);
    context.arcTo(x, y, x + width, y, clampedRadius);
    context.closePath();
  }

  private drawSetpointMarker(
    context: CanvasRenderingContext2D,
    setpoint: number
  ): void {
    const x = this.getCanvasPosition(context.canvas.width, setpoint);
    const trackY = this.getTrackY(context.canvas.height);

    context.save();
    context.strokeStyle = PID_THEME.accent;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(x, trackY - 58);
    context.lineTo(x, trackY + 58);
    context.stroke();
    context.fillStyle = 'rgba(122,162,247,.18)';
    context.fillRect(x - 10, trackY - 58, 20, 116);
    context.restore();
  }

  private drawSpring(
    context: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): void {
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const unitX = deltaX / (length || 1);
    const unitY = deltaY / (length || 1);
    const normalX = -unitY;
    const normalY = unitX;
    const usableLength = Math.max(0, length - 36);
    const segmentLength = usableLength / 20;

    context.save();
    context.strokeStyle = 'rgba(255,255,255,.70)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(startX + unitX * 18, startY + unitY * 18);

    for (let index = 0; index < 20; index += 1) {
      const segmentOffset = (index + 1) * segmentLength;
      const amplitude = (index % 2 === 0 ? 1 : -1) * 14;

      context.lineTo(
        startX + unitX * (18 + segmentOffset) + normalX * amplitude,
        startY + unitY * (18 + segmentOffset) + normalY * amplitude
      );
    }

    context.lineTo(endX, endY);
    context.stroke();
    context.restore();
  }

  private drawTrack(context: CanvasRenderingContext2D): void {
    const trackY = this.getTrackY(context.canvas.height);

    context.save();
    context.strokeStyle = 'rgba(255,255,255,.22)';
    context.lineWidth = 4;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(60, trackY);
    context.lineTo(context.canvas.width - 60, trackY);
    context.stroke();
    context.restore();
  }

  private drawWheel(
    context: CanvasRenderingContext2D,
    x: number,
    y: number
  ): void {
    context.beginPath();
    context.arc(x, y, 8, 0, Math.PI * 2);
    context.fill();
  }

  private getCanvasPosition(width: number, position: number): number {
    return this.mathService.mapPositionToCanvas(
      position,
      width,
      PID_VISUALIZATION_BOUNDS
    );
  }

  private getTrackY(height: number): number {
    return Math.round(height * 0.62);
  }
}
