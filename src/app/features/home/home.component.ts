import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  NgxClippyModule,
  ClippyAgentComponent,
  AgentLoaderService,
  AgentConfig,
  ClippyAgent,
} from '@dsbissett/ngx-clippy';

import { projectDefinitions } from '../../project-definitions';

const TITLE_LINE1 = "Drake Bissett's";
const TITLE_LINE2 = 'Projects';
const SCRAMBLE_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*' +
  'ЖЦШЩЫЮЯФЪЭЁЂЃЄЅ' +
  'ドレイクビセットプロジェ' +
  '的项目專案드레이크비셋' +
  'מشاريعدريك' +
  'ΤαέργαΝτρέικ' +
  'ड्रेकबिसेट' +
  'โครงการของ';
const GLITCH_TRANSLATIONS = [
  'โครงการของ Drake Bissett',
  'ドレイク・ビセットのプロジェクト',
  'Drake Bissett 的项目',
  'Drake Bissett 的專案',
  'مشاريع دريك بيسيت',
  'Τα έργα του Ντρέικ Μπισέτ',
  'Проекты Дрейка Биссетта',
  '드레이크 비셋의 프로젝트',
  'הפרויקטים של דרייק ביסט',
  'ड्रेक बिसेट की परियोजनाएँ',
  'ড্রেক বিসেটের প্রকল্পসমূহ',
  'ட்ரேக் பிசெட் அவர்களின் திட்டங்கள்',
  'Consilia Drake Bissett',
];

const CLIPPY_QUIPS = [
  "It looks like you're browsing a portfolio. Would you like help pretending to be impressed?",
  "I see you haven't clicked anything yet. Might I suggest... clicking something?",
  "Fun fact: this site was built with Angular. I survived the migration from AngularJS. Barely.",
  "Pro tip: press / to search. Or don't. I'm a paperclip, not a cop.",
  "You've been staring at this page for a while. Everything okay at home?",
  "I used to help people write letters. Now I haunt personal websites. Career growth!",
  "Did you know Drake made a Tetris AI? It's smarter than me. Most things are.",
  "If you refresh this page, I come back. You can't escape me. I'm like glitter.",
  "I'm contractually obligated to ask: would you like to save this as a .doc?",
  "This cosmic theme is very 2001: A Space Odyssey. I'm afraid I can do that, Dave.",
  "I've been trapped in npm packages since 2003. Please click something so I feel useful.",
  "Between you and me, the 'Return to Orbit' button is just window.scrollTo. Don't tell anyone.",
];

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NgxClippyModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  protected readonly year = new Date().getFullYear();
  protected readonly query = signal('');
  protected readonly projects = projectDefinitions;
  private readonly filterInput =
    viewChild<ElementRef<HTMLInputElement>>('filterInput');
  private readonly glitchCanvas =
    viewChild<ElementRef<HTMLCanvasElement>>('glitchCanvas');
  private readonly destroyRef = inject(DestroyRef);
  private cleanImageData: ImageData | null = null;
  private canvasCtx: CanvasRenderingContext2D | null = null;
  private canvasW = 0;
  private canvasH = 0;
  private audioCtx: AudioContext | null = null;
  private glitchAudioBuffer: AudioBuffer | null = null;
  private activeGlitchSource: AudioBufferSourceNode | null = null;
  protected readonly filteredProjects = computed(() => {
    const normalizedQuery = this.query().trim().toLowerCase();

    if (!normalizedQuery) {
      return this.projects;
    }

    return this.projects.filter((project) => {
      const haystack = `${project.title} ${project.tags.join(' ')} ${project.summary}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  });

  protected readonly clippyAgent = viewChild(ClippyAgentComponent);
  protected readonly agentConfig = signal<AgentConfig | undefined>(undefined);
  private clippyShown = false;
  private quipIndex = 0;

  constructor(private readonly agentLoader: AgentLoaderService) {
    this.quipIndex = Math.floor(Math.random() * CLIPPY_QUIPS.length);

    effect(() => {
      const agent = this.clippyAgent();
      const config = this.agentConfig();
      if (!agent || !config || this.clippyShown) {
        return;
      }

      const [width, height] = config.agentData.framesize;
      const margin = 16;
      const x = Math.max(0, window.innerWidth - width - margin);
      const y = Math.max(0, window.innerHeight - height - margin);
      agent.show({ immediate: true, position: { x, y } });
      this.clippyShown = true;

      setTimeout(() => {
        agent.speak(this.nextQuip());
      }, 1500);

      this.scheduleIdleQuips(agent);
    });
  }

  ngOnInit(): void {
    this.loadGlitchAudio();

    this.agentLoader.loadAgent(ClippyAgent).subscribe((config) => {
      this.clippyShown = false;
      this.agentConfig.set(config);
    });

    this.initGlitchCanvas();
  }

  protected updateQuery(value: string): void {
    this.query.set(value);
  }

  protected scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected handleWindowKeydown(event: KeyboardEvent): void {
    const input = this.filterInput()?.nativeElement;
    if (!input) {
      return;
    }

    if (event.key === '/' && this.shouldFocusFilter(input)) {
      event.preventDefault();
      input.focus();
      return;
    }

    if (event.key === 'Escape' && document.activeElement === input) {
      this.query.set('');
      input.blur();
    }
  }

  private shouldFocusFilter(input: HTMLInputElement): boolean {
    return document.activeElement !== input;
  }

  private nextQuip(): string {
    const quip = CLIPPY_QUIPS[this.quipIndex % CLIPPY_QUIPS.length];
    this.quipIndex++;
    return quip;
  }

  private scheduleIdleQuips(agent: ClippyAgentComponent): void {
    const interval = setInterval(() => {
      if (!this.clippyShown) {
        clearInterval(interval);
        return;
      }
      agent.speak(this.nextQuip());
    }, 25_000);
  }

  private glitchTimer: ReturnType<typeof setTimeout> | null = null;
  private flickerTimer: ReturnType<typeof setTimeout> | null = null;
  private flickerActive = false;
  private activeFlickerSource: AudioBufferSourceNode | null = null;
  private activeFlickerGain: GainNode | null = null;

  private initGlitchCanvas(): void {
    // Wait a frame for the canvas to be in the DOM and font to load
    requestAnimationFrame(() => {
      const canvas = this.glitchCanvas()?.nativeElement;
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const parent = canvas.parentElement!;
      const w = parent.clientWidth;

      // Measure font size to match the CSS clamp
      const fontSize = Math.min(80, Math.max(40, w * 0.08));
      const lineHeight = fontSize * 0.95;
      const h = lineHeight * 2 + fontSize * 0.3;

      this.canvasW = w;
      this.canvasH = h;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.scale(dpr, dpr);
      this.canvasCtx = ctx;

      this.drawCleanTitle(ctx, w, h, fontSize, lineHeight);
      this.cleanImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      this.scheduleGlitch();
      this.scheduleFlicker();

      this.destroyRef.onDestroy(() => {
        if (this.glitchTimer) clearTimeout(this.glitchTimer);
        if (this.flickerTimer) clearTimeout(this.flickerTimer);
      });
    });
  }

  private drawCleanTitle(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    fontSize: number,
    lineHeight: number,
  ): void {
    ctx.clearRect(0, 0, w, h);
    ctx.font = `${fontSize}px 'Righteous', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.letterSpacing = '3px';

    // Teal glow
    ctx.shadowColor = '#00fff5';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(TITLE_LINE1.toUpperCase(), w / 2, 0);
    ctx.fillText(TITLE_LINE2.toUpperCase(), w / 2, lineHeight);

    // Extra glow pass
    ctx.shadowBlur = 10;
    ctx.fillText(TITLE_LINE1.toUpperCase(), w / 2, 0);
    ctx.fillText(TITLE_LINE2.toUpperCase(), w / 2, lineHeight);
    ctx.shadowBlur = 0;
  }

  private scheduleGlitch(): void {
    const delay = 3000 + Math.random() * 5000;
    this.glitchTimer = setTimeout(() => this.runGlitchCycle(), delay);
  }

  /**
   * Full glitch cycle:
   * 1. Burst scrambles English text + visual FX → reveals translation
   * 2. Hold translation for 1-2 seconds
   * 3. Triple-pulse burst scrambles translation + visual FX → reveals English
   * 4. Schedule next cycle
   */
  private runGlitchCycle(): void {
    const canvas = this.glitchCanvas()?.nativeElement;
    const ctx = this.canvasCtx;
    if (!canvas || !ctx || !this.cleanImageData) {
      this.scheduleGlitch();
      return;
    }

    // Pause flicker during glitch
    if (this.flickerTimer) clearTimeout(this.flickerTimer);
    this.flickerActive = true;

    const w = this.canvasW;
    const h = this.canvasH;
    const fontSize = Math.min(80, Math.max(40, w * 0.08));
    const lineHeight = fontSize * 0.95;

    const translation =
      GLITCH_TRANSLATIONS[Math.floor(Math.random() * GLITCH_TRANSLATIONS.length)];

    // Pre-render the clean translation image
    const translationImage = this.renderTranslation(ctx, canvas, w, h, translation);

    // Renderer that scrambles the two-line English title
    const scrambleEnglish = () => {
      this.renderScrambledText(
        ctx, w, h, fontSize,
        [TITLE_LINE1.toUpperCase(), TITLE_LINE2.toUpperCase()],
        'top', lineHeight,
      );
    };

    // Compute scaled font size for the translation
    ctx.font = `${fontSize}px 'Righteous', sans-serif`;
    const measured = ctx.measureText(translation);
    const maxW = w * 0.9;
    const transFontSize = measured.width > maxW
      ? fontSize * (maxW / measured.width)
      : fontSize;

    // Renderer that scrambles the single-line translation
    const scrambleTranslation = () => {
      this.renderScrambledText(
        ctx, w, h, transFontSize,
        [translation],
        'middle', 0,
      );
    };

    // Randomize durations: 400-1000ms for each glitch
    const glitch1Duration = 400 + Math.random() * 600;
    const glitch2Duration = 400 + Math.random() * 600;

    // Phase 1: scramble English → reveal translation
    this.startGlitchSound();
    this.playBurst(ctx, canvas, w, h, scrambleEnglish, glitch1Duration, () => {
      this.stopGlitchSound();
      ctx.putImageData(translationImage, 0, 0);

      // Phase 2: hold translation
      const holdTime = 1000 + Math.random() * 1500;
      this.glitchTimer = setTimeout(() => {
        // Phase 3: triple-pulse scramble translation → reveal English
        this.playTriplePulseBurst(ctx, canvas, w, h, scrambleTranslation, translationImage, glitch2Duration, () => {
          ctx.putImageData(this.cleanImageData!, 0, 0);
          this.flickerActive = false;
          this.scheduleFlicker();
          this.scheduleGlitch();
        });
      }, holdTime);
    });
  }

  private playBurst(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    w: number,
    h: number,
    renderFrame: () => void,
    durationMs: number,
    onDone: () => void,
  ): void {
    const frameMs = 40 + Math.random() * 40;
    const burstFrames = Math.max(3, Math.round(durationMs / frameMs));
    let frame = 0;

    const tick = () => {
      if (frame < burstFrames) {
        renderFrame();
        const effects = this.pickEffects();
        for (const fx of effects) {
          fx(ctx, canvas, w, h);
        }
        frame++;
        this.glitchTimer = setTimeout(tick, frameMs);
      } else {
        onDone();
      }
    };

    tick();
  }

  private playTriplePulseBurst(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    w: number,
    h: number,
    renderFrame: () => void,
    restImage: ImageData,
    totalDurationMs: number,
    onDone: () => void,
  ): void {
    // Split total duration across 3 pulses with gaps
    const gapMs = 80 + Math.random() * 80;
    const pulseDuration = (totalDurationMs - gapMs * 2) / 3;
    let pulse = 0;

    const nextPulse = () => {
      if (pulse < 3) {
        this.startGlitchSound();
        this.playBurst(ctx, canvas, w, h, renderFrame, Math.max(120, pulseDuration), () => {
          this.stopGlitchSound();
          pulse++;
          if (pulse < 3) {
            ctx.putImageData(restImage, 0, 0);
            this.glitchTimer = setTimeout(nextPulse, gapMs);
          } else {
            onDone();
          }
        });
      }
    };

    nextPulse();
  }

  private renderScrambledText(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    fontSize: number,
    lines: string[],
    baseline: 'top' | 'middle',
    lineHeight: number,
  ): void {
    const scramble = (text: string) =>
      [...text]
        .map((ch) =>
          ch === ' '
            ? ' '
            : Math.random() < 0.5
              ? SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
              : ch,
        )
        .join('');

    ctx.clearRect(0, 0, w, h);
    ctx.font = `${fontSize}px 'Righteous', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = baseline;
    ctx.letterSpacing = '3px';

    ctx.shadowColor = '#00fff5';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffffff';

    if (baseline === 'middle') {
      ctx.fillText(scramble(lines[0]), w / 2, h / 2);
      ctx.shadowBlur = 10;
      ctx.fillText(scramble(lines[0]), w / 2, h / 2);
    } else {
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(scramble(lines[i]), w / 2, i * lineHeight);
      }
      ctx.shadowBlur = 10;
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(scramble(lines[i]), w / 2, i * lineHeight);
      }
    }
    ctx.shadowBlur = 0;
  }

  // --- Glitch sound from glitch.mp3 ---

  private getAudioContext(): AudioContext | null {
    if (!this.audioCtx) {
      try {
        this.audioCtx = new AudioContext();
      } catch {
        return null;
      }
    }
    return this.audioCtx;
  }

  private loadGlitchAudio(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    fetch('assets/glitch.mp3')
      .then((res) => res.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((decoded) => {
        this.glitchAudioBuffer = decoded;
      })
      .catch(() => {
        // Audio is non-critical; silently degrade
      });
  }

  private startGlitchSound(): void {
    const ctx = this.getAudioContext();
    if (!ctx || !this.glitchAudioBuffer) return;

    // Stop any currently playing glitch sound
    this.stopGlitchSound();

    const buffer = this.glitchAudioBuffer;
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    source.connect(gain);
    gain.connect(ctx.destination);

    // Pick a random start offset, leaving at least 0.5s of audio remaining
    const minRemaining = 0.5;
    const maxOffset = Math.max(0, buffer.duration - minRemaining);
    const offset = Math.random() * maxOffset;

    source.start(0, offset);
    this.activeGlitchSource = source;
  }

  private stopGlitchSound(): void {
    if (this.activeGlitchSource) {
      try {
        this.activeGlitchSource.stop();
      } catch {
        // Already stopped
      }
      this.activeGlitchSource = null;
    }
  }

  private startFlickerSound(): void {
    const ctx = this.getAudioContext();
    if (!ctx || !this.glitchAudioBuffer) return;

    this.stopFlickerSound();

    const buffer = this.glitchAudioBuffer;
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    gain.gain.value = 0.03;
    source.connect(gain);
    gain.connect(ctx.destination);

    const maxOffset = Math.max(0, buffer.duration - 0.8);
    const offset = Math.random() * maxOffset;

    source.start(0, offset);
    this.activeFlickerSource = source;
    this.activeFlickerGain = gain;
  }

  private stopFlickerSound(): void {
    if (this.activeFlickerSource) {
      try {
        this.activeFlickerSource.stop();
      } catch {
        // Already stopped
      }
      this.activeFlickerSource = null;
      this.activeFlickerGain = null;
    }
  }

  private renderTranslation(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    w: number,
    h: number,
    translation: string,
  ): ImageData {
    const fontSize = Math.min(80, Math.max(40, w * 0.08));

    ctx.clearRect(0, 0, w, h);
    ctx.font = `${fontSize}px 'Righteous', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '3px';

    // Measure and auto-scale to fit width
    const measured = ctx.measureText(translation);
    const maxW = w * 0.9;
    const scale = measured.width > maxW ? maxW / measured.width : 1;
    const drawFontSize = fontSize * scale;
    ctx.font = `${drawFontSize}px 'Righteous', sans-serif`;

    // Same teal glow as clean title
    ctx.shadowColor = '#00fff5';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(translation, w / 2, h / 2);

    ctx.shadowBlur = 10;
    ctx.fillText(translation, w / 2, h / 2);
    ctx.shadowBlur = 0;

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  private scheduleFlicker(): void {
    const delay = 2000 + Math.random() * 6000;
    this.flickerTimer = setTimeout(() => this.runFlicker(), delay);
  }

  private runFlicker(): void {
    const canvas = this.glitchCanvas()?.nativeElement;
    const ctx = this.canvasCtx;
    if (!canvas || !ctx || !this.cleanImageData) {
      this.scheduleFlicker();
      return;
    }

    // Don't flicker during a glitch cycle
    if (this.flickerActive) {
      this.scheduleFlicker();
      return;
    }
    this.flickerActive = true;

    const fullText = TITLE_LINE1.toUpperCase() + TITLE_LINE2.toUpperCase();
    const nonSpaceIndices = [...fullText]
      .map((ch, i) => (ch !== ' ' ? i : -1))
      .filter((i) => i >= 0);
    const charIdx = nonSpaceIndices[Math.floor(Math.random() * nonSpaceIndices.length)];

    // Determine which line and position the character is on
    const line1 = TITLE_LINE1.toUpperCase();
    const line2 = TITLE_LINE2.toUpperCase();
    const isLine1 = charIdx < line1.length;
    const lineText = isLine1 ? line1 : line2;
    const posInLine = isLine1 ? charIdx : charIdx - line1.length;

    const w = this.canvasW;
    const h = this.canvasH;
    const fontSize = Math.min(80, Math.max(40, w * 0.08));
    const lineHeight = fontSize * 0.95;

    // Build a flicker pattern: rapid on/off stutters like a dying fluorescent tube
    // Each entry is [dimmed: boolean, duration in ms]
    const pattern: [boolean, number][] = [
      [true, 60],   // off
      [false, 40],  // on
      [true, 80],   // off
      [false, 30],  // on
      [true, 120],  // off (longer struggle)
      [false, 50],  // on
      [true, 40],   // off
      [false, 25],  // on
      [true, 200],  // off (nearly dies)
      [false, 35],  // on
      [true, 50],   // off
      [false, 0],   // back on (end)
    ];

    // Play glitch sound at 25% volume for the flicker
    this.startFlickerSound();

    let step = 0;

    const tick = () => {
      if (step >= pattern.length) {
        this.stopFlickerSound();
        // Restore clean image and schedule next flicker
        ctx.putImageData(this.cleanImageData!, 0, 0);
        this.flickerActive = false;
        this.scheduleFlicker();
        return;
      }

      const [dimmed, duration] = pattern[step];
      this.drawTitleWithFlicker(ctx, w, h, fontSize, lineHeight, dimmed ? { lineText, posInLine, isLine1 } : null);
      step++;
      this.flickerTimer = setTimeout(tick, duration);
    };

    tick();
  }

  private drawTitleWithFlicker(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    fontSize: number,
    lineHeight: number,
    dimChar: { lineText: string; posInLine: number; isLine1: boolean } | null,
  ): void {
    const line1 = TITLE_LINE1.toUpperCase();
    const line2 = TITLE_LINE2.toUpperCase();

    ctx.clearRect(0, 0, w, h);
    ctx.font = `${fontSize}px 'Righteous', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.letterSpacing = '3px';

    if (!dimChar) {
      // Draw normally
      ctx.shadowColor = '#00fff5';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(line1, w / 2, 0);
      ctx.fillText(line2, w / 2, lineHeight);
      ctx.shadowBlur = 10;
      ctx.fillText(line1, w / 2, 0);
      ctx.fillText(line2, w / 2, lineHeight);
      ctx.shadowBlur = 0;
      return;
    }

    // Draw both lines character by character, dimming the target char
    const drawLine = (text: string, y: number, dimPos: number | null) => {
      // Measure full line to find starting x (centered)
      const fullWidth = ctx.measureText(text).width;
      let x = w / 2 - fullWidth / 2;

      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const charWidth = ctx.measureText(ch).width;

        if (i === dimPos) {
          // Burned-out bulb: dark but visible letter, no glow
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#1a2a40';
          ctx.textAlign = 'left';
          ctx.fillText(ch, x, y);
          // Slight outline to show the "tube" shape
          ctx.strokeStyle = 'rgba(0, 255, 245, 0.08)';
          ctx.lineWidth = 0.5;
          ctx.strokeText(ch, x, y);
        } else {
          // Normal glow
          ctx.shadowColor = '#00fff5';
          ctx.shadowBlur = 20;
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'left';
          ctx.fillText(ch, x, y);
          ctx.shadowBlur = 10;
          ctx.fillText(ch, x, y);
          ctx.shadowBlur = 0;
        }

        x += charWidth;
      }

      // Reset alignment
      ctx.textAlign = 'center';
    };

    const dimPosLine1 = dimChar.isLine1 ? dimChar.posInLine : null;
    const dimPosLine2 = !dimChar.isLine1 ? dimChar.posInLine : null;
    drawLine(line1, 0, dimPosLine1);
    drawLine(line2, lineHeight, dimPosLine2);
  }

  private pickEffects(): ((
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    w: number,
    h: number,
  ) => void)[] {
    const all = [
      this.fxRgbSplit,
      this.fxSliceShift,
      this.fxScanlines,
      this.fxStaticNoise,
      this.fxColorShift,
    ];
    const count = 2 + Math.floor(Math.random() * 3);
    const shuffled = all.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  // --- Glitch effects ---

  private fxRgbSplit = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    w: number,
    h: number,
  ) => {
    const dpr = window.devicePixelRatio || 1;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const copy = new Uint8ClampedArray(data);
    const shiftR = Math.floor((Math.random() * 12 - 6) * dpr);
    const shiftB = Math.floor((Math.random() * 12 - 6) * dpr);
    const stride = canvas.width * 4;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        // Shift red channel
        const srcR = Math.min(Math.max(x + shiftR, 0), canvas.width - 1);
        data[i] = copy[(y * canvas.width + srcR) * 4];
        // Shift blue channel
        const srcB = Math.min(Math.max(x + shiftB, 0), canvas.width - 1);
        data[i + 2] = copy[(y * canvas.width + srcB) * 4 + 2];
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  private fxSliceShift = (
    ctx: CanvasRenderingContext2D,
    _canvas: HTMLCanvasElement,
    w: number,
    h: number,
  ) => {
    const sliceCount = 3 + Math.floor(Math.random() * 8);
    for (let i = 0; i < sliceCount; i++) {
      const y = Math.random() * h;
      const sliceH = 2 + Math.random() * (h * 0.15);
      const shift = (Math.random() - 0.5) * w * 0.3;
      const slice = ctx.getImageData(0, y, w, sliceH);
      ctx.putImageData(slice, shift, y);
    }
  };

  private fxScanlines = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    w: number,
    h: number,
  ) => {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const dpr = window.devicePixelRatio || 1;
    const gap = Math.round((3 + Math.random() * 3) * dpr);
    for (let py = 0; py < canvas.height; py += gap) {
      for (let px = 0; px < canvas.width; px++) {
        const i = (py * canvas.width + px) * 4;
        if (data[i + 3] > 0) {
          data[i] = Math.round(data[i] * 0.7);
          data[i + 1] = Math.round(data[i + 1] * 0.7);
          data[i + 2] = Math.round(data[i + 2] * 0.7);
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  private fxStaticNoise = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    w: number,
    h: number,
  ) => {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    const density = 0.03 + Math.random() * 0.07;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0 && Math.random() < density) {
        const v = Math.random() * 255;
        data[i] = v;
        data[i + 1] = v;
        data[i + 2] = v;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };



  private fxColorShift = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    w: number,
    h: number,
  ) => {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    // Pick a random horizontal band to invert/shift colors
    const bandY = Math.floor(Math.random() * canvas.height * 0.8);
    const bandH = Math.floor(canvas.height * (0.05 + Math.random() * 0.2));

    for (let y = bandY; y < Math.min(bandY + bandH, canvas.height); y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        if (data[i + 3] > 0) {
          // Invert colors in the band
          data[i] = 255 - data[i];
          data[i + 1] = 255 - data[i + 1];
          data[i + 2] = 255 - data[i + 2];
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };
}
