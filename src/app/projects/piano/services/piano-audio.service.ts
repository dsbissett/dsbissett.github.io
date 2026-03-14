import { Injectable } from '@angular/core';

import { PianoVoice } from '../interfaces/piano-voice.interface';

@Injectable()
export class PianoAudioService {
  private ctx: AudioContext | null = null;
  private readonly activeVoices = new Map<number, PianoVoice>();

  noteOn(midi: number, velocity: number = 0.8): void {
    this.ensureContext();
    if (this.activeVoices.has(midi)) this.noteOff(midi);

    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(this.midiToFreq(midi), this.ctx!.currentTime);

    const v = Math.max(0.0, Math.min(1.0, velocity));
    gain.gain.setValueAtTime(0, this.ctx!.currentTime);
    gain.gain.linearRampToValueAtTime(0.5 * v, this.ctx!.currentTime + 0.01);

    osc.connect(gain);
    gain.connect(this.ctx!.destination);
    osc.start();

    this.activeVoices.set(midi, { osc, gain });
  }

  noteOff(midi: number): void {
    const voice = this.activeVoices.get(midi);
    if (!voice) return;

    const t = this.ctx!.currentTime;
    voice.gain.gain.cancelScheduledValues(t);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, t);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    voice.osc.stop(t + 0.15);
    this.activeVoices.delete(midi);
  }

  stopAllVoices(): void {
    for (const midi of Array.from(this.activeVoices.keys())) {
      this.noteOff(midi);
    }
  }

  ensureContext(): void {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private midiToFreq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
}
