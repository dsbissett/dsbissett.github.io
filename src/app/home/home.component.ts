import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
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
  'ΤΑΕΡΓΑΝΤΡΕΙΚ' +
  'ड्रेकबिसेट' +
  'โครงการของ';

const GLITCH_TRANSLATIONS = [
  // Thai
  'โครงการของ DRAKE BISSETT',

  // Japanese
  'ドレイク・ビセットのプロジェクト',

  // Chinese (Simplified)
  'DRAKE BISSETT 的项目',

  // Chinese (Traditional)
  'DRAKE BISSETT 的專案',

  // Arabic
  'مشاريع دريك بيسيت',

  // Greek
  'ΤΑ ΕΡΓΑ ΤΟΥ ΝΤΡΕΙΚ ΜΠΙΣΕΤ',

  // Russian / Cyrillic
  'ПРОЕКТЫ ДРЕЙКА БИССЕТТА',

  // Korean
  '드레이크 비셋의 프로젝트',

  // Hindi / Devanagari
  'ड्रेक बिसेट की परियोजनाएँ',

  // Bengali
  'ড্রেক বিসেটের প্রকল্পসমূহ',

  // Tamil
  'ட்ரேக் பிசெட் அவர்களின் திட்டங்கள்',

  // Latin
  'CONSILIA DRAKE BISSETT',

  // Persian / Farsi
  'پروژه‌های دریک بیست',

  // Urdu
  'ڈریک بسیٹ کے منصوبے',

  // Gujarati
  'ડ્રેક બિસેટના પ્રોજેક્ટ્સ',

  // Punjabi / Gurmukhi
  'ਡ੍ਰੇਕ ਬਿਸੇਟ ਦੇ ਪ੍ਰੋਜੈਕਟ',

  // Lao
  'ໂຄງການຂອງ DRAKE BISSETT',

  // Khmer
  'គម្រោងរបស់ DRAKE BISSETT',

  // Amharic / Ge’ez
  'የድሬክ ቢሴት ፕሮጀክቶች',

  // Tifinagh
  'ⴰⵎⴰⵣⵉⵖ ⴷⵔⴰⴽ ⴱⵉⵙⴻⵜ',

  // Polish
  'PROJEKTY DRAKE’A BISSETTA',

  // Czech
  'PROJEKTY DRAKEA BISSETTA',

  // Icelandic
  'VERKEFNI DRAKE BISSETT',

  // Armenian
  'ԴՐԵՅՔ ԲԻՍԵԹԻ ՆԱԽԱԳԾԵՐԸ',

  // Georgian
  'დრეიკ ბისეტის პროექტები',

  // Hebrew
  'הפרויקטים של DRAKE BISSETT',

  // Vietnamese
  'CÁC DỰ ÁN CỦA DRAKE BISSETT',

  // Turkish
  'DRAKE BISSETT PROJELERİ',

  // Romanian
  'PROIECTELE LUI DRAKE BISSETT',

  // Hungarian
  'DRAKE BISSETT PROJEKTJEI',

  // Serbian (Cyrillic)
  'ПРОЈЕКТИ ДРЕЈКА БИСЕТА',

  // Ukrainian
  'ПРОЄКТИ ДРЕЙКА БІССЕТТА',

  // Bulgarian
  'ПРОЕКТИТЕ НА ДРЕЙК БИСЕТ',

  // Mongolian (Cyrillic)
  'ДРЕЙК БИССЕТТИЙН ТӨСЛҮҮД',

  // Sinhala
  'ඩ්‍රේක් බිසෙට්ගේ ව්‍යාපෘති',

  // Burmese / Myanmar
  'DRAKE BISSETT ၏ ပရောဂျက်များ',

  // Telugu
  'డ్రేక్ బిస్సెట్ ప్రాజెక్టులు',

  // Kannada
  'ಡ್ರೇಕ್ ಬಿಸ್ಸೆಟ್ ಯೋಜನೆಗಳು',

  // Malayalam
  'ഡ്രേക്ക് ബിസെറ്റിന്റെ പദ്ധതികൾ',

  // Odia
  'ଡ୍ରେକ ବିସେଟ୍ଙ୍କ ପ୍ରକଳ୍ପଗୁଡ଼ିକ',

  // Assamese
  'ড্ৰেক বিসেটৰ প্ৰকল্পসমূহ',

  // Nepali
  'ड्रेक बिसेटका परियोजनाहरू',

  // Sanskrit / Devanagari
  'ड्रेक बिसेटस्य परियोजनाः',

  // Tibetan
  'DRAKE BISSETT ཡི་ལས་གཞི་རྣམས',

  // N’Ko
  'ߘߙߍߞ ߓߌߛߍߕ ߞߍ ߞߊ߲ߞߋ߲߫',

  // Vai
  'ꕜꕃ ꔫꔻꕪ ꕉ ꔪꘋꔻ',

  // Syriac
  'ܦܪ̈ܘܝܩܛܐ ܕܕܪܝܟ ܒܝܣܝܬ',

  // Thaana
  'ޑްރޭކް ބިސެޓްގެ ޕްރޮޖެކްޓްތައް',

  // Inuktitut (Canadian syllabics)
  'ᑐᓚᐃᒃ ᐱᓯᑦ ᐱᕈᔭᒃᑦ',

  // Cherokee
  'ᏟᎵᎦ ᏈᏎᏘ ᎤᎵᏍᏕᎸᏗ',

  // Yi
  'ꄊꂵ ꀘꌠꌋ ꁯꄉ',

  // Canadian Aboriginal syllabics (stylized)
  'ᑕᕋᐃᒃ ᐱᓯᑦ ᐸᕐᔮᒃᑦ',

  // Runic
  'ᚦᚱᚨᚲᛖ ᛒᛁᛋᛋᛖᛏ ᛈᚱᛟᛃᛖᚲᛏᛋ',

  // Glagolitic
  'Ⰴⱃⰰⰽⰵ ⰱⰻⱄⱄⰵⱅ ⱂⱃⱁⱛⰵⰽⱅⱏ',

  // Gothic
  '𐌳𐍂𐌰𐌺𐌴 𐌱𐌹𐍃𐍃𐌴𐍄 𐍀𐍂𐍉𐌾𐌴𐌺𐍄𐍃',

  // Ogham
  '᚛ᚇᚏᚐᚋᚓ ᚁᚔᚄᚄᚓᚈ ᚚᚏᚑᚂᚓᚉᚈᚄ᚜',

  // Fullwidth Latin
  'ＤＲＡＫＥ ＢＩＳＳＥＴＴ ＰＲＯＪＥＣＴＳ',

  // Mathematical Bold
  '𝐃𝐑𝐀𝐊𝐄 𝐁𝐈𝐒𝐒𝐄𝐓𝐓 𝐏𝐑𝐎𝐉𝐄𝐂𝐓𝐒',

  // Mathematical Fraktur
  '𝕯𝕽𝕬𝕶𝕰 𝕭𝕴𝕾𝕾𝕰𝕿𝕿 𝕻𝕽𝕺𝕵𝕰𝕮𝕿𝕾',

  // Mathematical Script
  '𝒟𝑅𝒜𝒦𝐸 𝐵𝐼𝒮𝒮𝐸𝒯𝒯 𝒫𝑅𝒪𝒥𝐸𝒞𝒯𝒮',

  // Small Caps / Phonetic-style
  'ᴅʀᴀᴋᴇ ʙɪꜱꜱᴇᴛᴛ ᴘʀᴏᴊᴇᴄᴛꜱ',

  // Circled Latin
  'ⒹⓇⒶⓀⒺ ⒷⒾⓈⓈⒺⓉⓉ ⓅⓇⓄⒿⒺⒸⓉⓈ',

  // Squared Latin
  '🄳🅁🄰🄺🄴 🄱🄸🅂🅂🄴🅃🅃 🄿🅁🄾🄹🄴🄲🅃🅂',
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

interface ShootingStar {
  id: number;
  angleDeg: number;
  durationMs: number;
  leftPercent: number;
  tailLengthPx: number;
  topPercent: number;
  travelXPx: number;
  travelYPx: number;
}

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
  protected readonly shootingStars = signal<ShootingStar[]>([]);
  private readonly filterInput =
    viewChild<ElementRef<HTMLInputElement>>('filterInput');
  private readonly glitchCanvas =
    viewChild<ElementRef<HTMLCanvasElement>>('glitchCanvas');
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private shootingStarTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly shootingStarCleanupTimers = new Map<
    number,
    ReturnType<typeof setTimeout>
  >();
  private nextShootingStarId = 0;
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
    this.initParallax();
    this.initShootingStars();
  }

  protected updateQuery(value: string): void {
    this.query.set(value);
  }

  protected scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  protected handleWindowKeydown(event: KeyboardEvent): void {
    const input = this.filterInput()?.nativeElement;
    const target =
      event.target instanceof HTMLElement ? event.target : null;

    if (event.key === 'Backspace' && !this.isEditableTarget(target)) {
      event.preventDefault();
      this.triggerShootingStar();
      return;
    }

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

  private isEditableTarget(target: HTMLElement | null): boolean {
    return (
      target?.closest(
        'input, textarea, select, [contenteditable=""], [contenteditable="true"]',
      ) !== null
    );
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

  private initParallax(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      const layerDefs: { selector: string; speed: number }[] = [
        { selector: '.cosmic-bg', speed: 0.035 },
        { selector: '.stars-far', speed: 0.045 },
        { selector: '.stars-mid', speed: 0.16 },
        { selector: '.stars-near', speed: 0.34 },
        { selector: '.aurora', speed: 0.06 },
      ];

      let elements: { el: HTMLElement; speed: number }[] | null = null;
      let ticking = false;

      const resolveElements = (): { el: HTMLElement; speed: number }[] => {
        const root = document.querySelector('.parallax-bg') as HTMLElement | null;
        if (!root) {
          return [];
        }

        return layerDefs
          .map((layer) => ({
            el: root.querySelector(layer.selector) as HTMLElement | null,
            speed: layer.speed,
          }))
          .filter(
            (layer): layer is { el: HTMLElement; speed: number } =>
              layer.el !== null,
          );
      };

      const onScroll = () => {
        if (ticking) {
          return;
        }

        ticking = true;
        window.requestAnimationFrame(() => {
          if (!elements) {
            elements = resolveElements();
          }

          const scrollY = window.scrollY;
          for (const layer of elements) {
            layer.el.style.transform = `translate3d(0, ${-(scrollY * layer.speed)}px, 0)`;
          }

          ticking = false;
        });
      };

      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
      this.destroyRef.onDestroy(() =>
        window.removeEventListener('scroll', onScroll),
      );
    });
  }

  private initShootingStars(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const scheduleNext = () => {
      const delayMs = 20_000 + Math.random() * 10_000;
      this.shootingStarTimer = setTimeout(() => {
        if (document.visibilityState === 'hidden') {
          scheduleNext();
          return;
        }

        this.triggerShootingStar();
        scheduleNext();
      }, delayMs);
    };

    scheduleNext();
    this.destroyRef.onDestroy(() => {
      if (this.shootingStarTimer) {
        clearTimeout(this.shootingStarTimer);
      }

      for (const timer of this.shootingStarCleanupTimers.values()) {
        clearTimeout(timer);
      }
      this.shootingStarCleanupTimers.clear();
    });
  }

  private triggerShootingStar(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const star = this.createShootingStar();
    this.shootingStars.update((stars) => [...stars, star]);

    const cleanupTimer = setTimeout(() => {
      this.shootingStars.update((stars) =>
        stars.filter((item) => item.id !== star.id),
      );
      this.shootingStarCleanupTimers.delete(star.id);
    }, star.durationMs + 250);

    this.shootingStarCleanupTimers.set(star.id, cleanupTimer);
  }

  private createShootingStar(): ShootingStar {
    return {
      id: this.nextShootingStarId++,
      topPercent: 6 + Math.random() * 22,
      leftPercent: 3 + Math.random() * 28,
      tailLengthPx: 140 + Math.random() * 90,
      travelXPx: 260 + Math.random() * 140,
      travelYPx: 110 + Math.random() * 90,
      angleDeg: 18 + Math.random() * 8,
      durationMs: 900 + Math.round(Math.random() * 450),
    };
  }

  private glitchTimer: ReturnType<typeof setTimeout> | null = null;

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

      this.destroyRef.onDestroy(() => {
        if (this.glitchTimer) clearTimeout(this.glitchTimer);
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
