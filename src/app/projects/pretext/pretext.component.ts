import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
  viewChild,
} from '@angular/core';
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Vec2 { x: number; y: number }

interface Segment {
  x: number; y: number;
  px: number; py: number; // previous position for velocity
}

interface Letter {
  ch: string;
  homeX: number; homeY: number;
  x: number; y: number;
  vx: number; vy: number;
  rot: number; vrot: number;
  alpha: number;
  burning: number;
  font: string;       // full font string for rendering
  color: string;      // base color
  mass: number;       // 1 = light body text, 3 = heavy heading
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  ch: string;
  life: number;
  maxLife: number;
  color: string;
}

interface Enemy {
  x: number; y: number;
  vx: number; vy: number;
  hp: number;
  maxHp: number;
  ch: string;
  alpha: number;
  dying: boolean;
  deathTimer: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DRAGON_SEGS = 60;
const DRAGON_SPEED = 0.14;
const SEG_LEN = 14;
const LETTER_COUNT_MAX = 2000;
const PARTICLE_MAX = 150;
const ENEMY_MAX = 20;

const FIRE_CHARS = ['*', '¤', '°', '·', '✦', '✧', '◆', '▲', '▸'];
const ENEMY_CHARS = ['◈', '◉', '⬡', '⬟', '⬢', '✦'];

const HEAD_SIZE = 18;
const ACCENT    = '#3ecf8e';

// Palette for different text roles
const COLORS = {
  headingTeal:   '#3ecf8e',
  headingYellow: '#fbbf24',
  headingViolet: '#a78bfa',
  headingPink:   '#f472b6',
  subTeal:       '#67e8c8',
  subBlue:       '#60a5fa',
  subOrange:     '#fb923c',
  subViolet:     '#c4b5fd',
  body:          '#c8c4c0',
  bodyMuted:     '#7c7a82',
  label:         'rgba(62,207,142,0.45)',
};

// Text blocks: each has a type-annotated runs array
interface TextRun {
  text: string;
  role: 'heading' | 'subheading' | 'label' | 'body' | 'code';
  color: string;
}

interface TextBlock {
  runs: TextRun[];
}

const TEXT_BLOCKS: TextBlock[] = [
  // ── Top-left ──────────────────────────────────────────────────────────
  {
    runs: [
      { role: 'heading',    text: 'HERE BE',                      color: COLORS.headingTeal },
      { role: 'heading',    text: 'DRAGONS',                      color: COLORS.headingTeal },
      { role: 'subheading', text: 'DOM-free text layout engine',  color: COLORS.subTeal },
      { role: 'body',       text: 'Move your cursor to guide the dragon. Hold the mouse button to breathe fire and scatter the letters around the canvas.', color: COLORS.body },
      { role: 'label',      text: '▸ MOVE CURSOR · HOLD TO FIRE', color: COLORS.label },
    ],
  },
  // ── Top-right ─────────────────────────────────────────────────────────
  {
    runs: [
      { role: 'heading',    text: '500×',                              color: COLORS.headingYellow },
      { role: 'subheading', text: 'Faster than getBoundingClientRect', color: COLORS.subBlue },
      { role: 'body',       text: 'One Canvas glyph-width scan runs at prepare() time. Every layout() call thereafter is pure arithmetic — zero DOM reads, zero reflows, ever.', color: COLORS.body },
      { role: 'code',       text: 'prepare(text, font)',               color: COLORS.subOrange },
      { role: 'code',       text: 'layout(prepared, maxWidth, lineH)', color: COLORS.subOrange },
      { role: 'label',      text: '~0.09 ms FOR 500 TEXTS',           color: COLORS.label },
    ],
  },
  // ── Middle-left ───────────────────────────────────────────────────────
  {
    runs: [
      { role: 'heading',    text: 'MULTI',                        color: COLORS.headingPink },
      { role: 'heading',    text: 'LINGUAL',                      color: COLORS.headingPink },
      { role: 'subheading', text: 'Arabic · 日本語 · 한국어 · हिन्दी', color: COLORS.subViolet },
      { role: 'body',       text: 'Full Unicode Bidi algorithm, CJK kinsoku line-break rules, and Intl.Segmenter support. One API handles every script on the planet.', color: COLORS.body },
      { role: 'label',      text: 'UAX #9 BIDI · KINSOKU · RTL', color: COLORS.label },
    ],
  },
  // ── Middle-right ──────────────────────────────────────────────────────
  {
    runs: [
      { role: 'heading',    text: '60 FPS',                       color: COLORS.headingViolet },
      { role: 'subheading', text: 'Zero-reflow frame-rate layout', color: COLORS.subBlue },
      { role: 'body',       text: 'prepareWithSegments() runs once per text string. layoutWithLines() fires every animation frame in under a tenth of a millisecond.', color: COLORS.body },
      { role: 'code',       text: 'prepareWithSegments(text, font)', color: COLORS.subOrange },
      { role: 'code',       text: 'layoutWithLines(p, width, lh)',   color: COLORS.subOrange },
    ],
  },
  // ── Bottom-left ───────────────────────────────────────────────────────
  {
    runs: [
      { role: 'heading',    text: 'OBSTACLE',                      color: COLORS.headingYellow },
      { role: 'heading',    text: 'FLOW',                          color: COLORS.headingYellow },
      { role: 'subheading', text: 'Variable-width line layout',    color: COLORS.subOrange },
      { role: 'body',       text: 'layoutNextLine() lets you change maxWidth per line so text flows around floated images, pull quotes, or a 60-segment ASCII dragon.', color: COLORS.body },
      { role: 'code',       text: 'layoutNextLine(p, cursor, w)',   color: COLORS.subOrange },
    ],
  },
  // ── Bottom-right ──────────────────────────────────────────────────────
  {
    runs: [
      { role: 'heading',    text: 'MEASURE',                       color: COLORS.headingViolet },
      { role: 'heading',    text: 'NATURAL',                       color: COLORS.subViolet },
      { role: 'subheading', text: 'Shrink-wrap & min-width queries', color: COLORS.subBlue },
      { role: 'body',       text: 'measureNaturalWidth() returns the minimum container width needed to render without wrapping — perfect for dynamic label sizing and chip components.', color: COLORS.body },
      { role: 'code',       text: 'measureNaturalWidth(prepared)',  color: COLORS.subOrange },
      { role: 'label',      text: 'NO DOM · PURE MATH',            color: COLORS.label },
    ],
  },
];

// Font strings per role (sizes will be multiplied by dpr at build time)
function roleFont(role: TextRun['role'], dpr: number): string {
  switch (role) {
    case 'heading':    return `bold ${38 * dpr}px monospace`;
    case 'subheading': return `bold ${15 * dpr}px monospace`;
    case 'label':      return `${10 * dpr}px monospace`;
    case 'code':       return `italic ${12 * dpr}px monospace`;
    case 'body':       return `${12 * dpr}px monospace`;
  }
}

function roleLineHeight(role: TextRun['role'], dpr: number): number {
  switch (role) {
    case 'heading':    return 44 * dpr;
    case 'subheading': return 22 * dpr;
    case 'label':      return 15 * dpr;
    case 'code':       return 18 * dpr;
    case 'body':       return 18 * dpr;
  }
}

function roleMass(role: TextRun['role']): number {
  switch (role) {
    case 'heading':    return 4.0;  // heavy — flies far, hard to push
    case 'subheading': return 2.0;
    case 'label':      return 0.7;  // featherlight
    case 'code':       return 1.2;
    case 'body':       return 1.0;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-pretext',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pretext.component.html',
  styleUrl: './pretext.component.scss',
  host: {
    '(window:resize)': 'onResize()',
    '(window:keydown)': 'onKeydown($event)',
  },
})
export class PretextComponent implements AfterViewInit, OnDestroy {
  private readonly canvasEl = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  private ctx!: CanvasRenderingContext2D;
  private W = 0;
  private H = 0;
  private dpr = 1;
  private rafId = 0;

  // Dragon
  private segments: Segment[] = [];
  private mouse: Vec2 = { x: 0, y: 0 };
  private firing = false;
  private shakeX = 0;
  private shakeY = 0;
  private shakeDecay = 0;

  // Letters
  private letters: Letter[] = [];

  // Particles
  private particles: Particle[] = [];

  // Enemies
  private enemies: Enemy[] = [];
  private score = 0;
  private enemySpawnTimer = 0;
  private enemySpawnInterval = 240;

  // UI
  protected readonly presetNames = ['Default', 'Gentle', 'Chaos', 'Tiny', 'Leviathan', 'Ghost', 'Magnet', 'Serpent', 'Elastic', 'Blizzard'] as const;
  protected activePreset: string = 'Default';
  protected showPanel = true;
  protected dragonScale = 1;
  protected get dragonScaleLabel(): string { return this.dragonScale.toFixed(1); }
  protected disruption = 1;  // multiplier applied to repulseForce at runtime
  protected get disruptionLabel(): string { return this.disruption.toFixed(1); }

  // Config
  private cfg = {
    dragonSpeed: DRAGON_SPEED,
    segCount: DRAGON_SEGS,
    fireRadius: 100,
    repulseForce: 6.5,
    springForce: 0.028,
    damping: 0.82,
    screenShake: true,
  };

  public ngAfterViewInit(): void {
    const canvas = this.canvasEl().nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.buildLetters();
    this.initDragon();

    this.ngZone.runOutsideAngular(() => {
      const onMouseMove = (e: MouseEvent) => {
        const r = canvas.getBoundingClientRect();
        this.mouse.x = (e.clientX - r.left) * this.dpr;
        this.mouse.y = (e.clientY - r.top) * this.dpr;
      };
      const onMouseDown = () => { this.firing = true; };
      const onMouseUp = () => { this.firing = false; };
      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        const t = e.touches[0];
        const r = canvas.getBoundingClientRect();
        this.mouse.x = (t.clientX - r.left) * this.dpr;
        this.mouse.y = (t.clientY - r.top) * this.dpr;
      };
      const onTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        this.firing = true;
        const t = e.touches[0];
        const r = canvas.getBoundingClientRect();
        this.mouse.x = (t.clientX - r.left) * this.dpr;
        this.mouse.y = (t.clientY - r.top) * this.dpr;
      };
      const onTouchEnd = () => { this.firing = false; };

      canvas.addEventListener('mousemove', onMouseMove, { passive: true });
      canvas.addEventListener('mousedown', onMouseDown, { passive: true });
      canvas.addEventListener('mouseup', onMouseUp, { passive: true });
      canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      canvas.addEventListener('touchstart', onTouchStart, { passive: false });
      canvas.addEventListener('touchend', onTouchEnd, { passive: true });

      this.destroyRef.onDestroy(() => {
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('mousedown', onMouseDown);
        canvas.removeEventListener('mouseup', onMouseUp);
        canvas.removeEventListener('touchmove', onTouchMove);
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchend', onTouchEnd);
      });

      this.loop();
    });

    this.destroyRef.onDestroy(() => cancelAnimationFrame(this.rafId));
  }

  public ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }

  protected onResize(): void {
    this.resize();
    this.buildLetters();
  }

  protected applyPreset(name: string): void {
    this.activePreset = name;
    switch (name) {
      case 'Gentle':
        this.cfg = { dragonSpeed: 0.08, segCount: 40, fireRadius: 60, repulseForce: 3.5, springForce: 0.04, damping: 0.88, screenShake: false };
        break;
      case 'Chaos':
        this.cfg = { dragonSpeed: 0.22, segCount: 80, fireRadius: 160, repulseForce: 14.0, springForce: 0.015, damping: 0.72, screenShake: true };
        break;
      case 'Tiny':
        this.cfg = { dragonSpeed: 0.18, segCount: 20, fireRadius: 70, repulseForce: 5.0, springForce: 0.032, damping: 0.80, screenShake: true };
        break;
      case 'Leviathan':
        this.cfg = { dragonSpeed: 0.09, segCount: 100, fireRadius: 140, repulseForce: 9.0, springForce: 0.018, damping: 0.78, screenShake: true };
        break;
      case 'Ghost':
        // Barely-there spring — letters drift away and almost never come home
        this.cfg = { dragonSpeed: 0.04, segCount: 55, fireRadius: 75, repulseForce: 2.5, springForce: 0.004, damping: 0.98, screenShake: false };
        break;
      case 'Magnet':
        // Very stiff spring — letters snap back instantly after being hit
        this.cfg = { dragonSpeed: 0.20, segCount: 50, fireRadius: 95, repulseForce: 8.5, springForce: 0.14, damping: 0.72, screenShake: true };
        break;
      case 'Serpent':
        // Extremely long body — 180 segments, slow and sweeping
        this.cfg = { dragonSpeed: 0.05, segCount: 180, fireRadius: 115, repulseForce: 7.5, springForce: 0.020, damping: 0.83, screenShake: true };
        break;
      case 'Elastic':
        // Low damping — letters bounce and oscillate for a long time
        this.cfg = { dragonSpeed: 0.16, segCount: 60, fireRadius: 105, repulseForce: 11.0, springForce: 0.050, damping: 0.74, screenShake: true };
        break;
      case 'Blizzard':
        // Maximum fire radius, fastest head, letters never settle
        this.cfg = { dragonSpeed: 0.30, segCount: 35, fireRadius: 210, repulseForce: 13.0, springForce: 0.008, damping: 0.68, screenShake: true };
        break;
      default:
        this.cfg = { dragonSpeed: 0.14, segCount: 60, fireRadius: 100, repulseForce: 6.5, springForce: 0.028, damping: 0.82, screenShake: true };
    }
    this.initDragon();
    this.score = 0;
    this.enemies = [];
  }

  protected setDragonScale(event: Event): void {
    this.dragonScale = parseFloat((event.target as HTMLInputElement).value);
  }

  protected setDisruption(event: Event): void {
    this.disruption = parseFloat((event.target as HTMLInputElement).value);
  }

  protected togglePanel(): void {
    this.showPanel = !this.showPanel;
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'p' || event.key === 'P') {
      this.showPanel = !this.showPanel;
    }
    if (event.key === 'Escape') {
      this.showPanel = false;
    }
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  private resize(): void {
    const canvas = this.canvasEl().nativeElement;
    this.dpr = window.devicePixelRatio || 1;
    this.W = canvas.clientWidth * this.dpr;
    this.H = canvas.clientHeight * this.dpr;
    canvas.width = this.W;
    canvas.height = this.H;
  }

  private initDragon(): void {
    // Start coiled in the bottom-centre, away from text blocks
    const cx = this.W * 0.5;
    const cy = this.H * 0.75;
    this.segments = [];
    for (let i = 0; i < this.cfg.segCount; i++) {
      // Spiral outward so segments don't pile on top of each other
      const angle = i * 0.35;
      const radius = i * (SEG_LEN * 0.3);
      this.segments.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius * 0.5,
        px: cx, py: cy,
      });
    }
    this.mouse = { x: cx, y: cy };
  }

  /** Use pretext to lay out all TEXT_BLOCKS into letter arrays */
  private buildLetters(): void {
    this.letters = [];
    this.charWidthCache.clear();

    const W = this.W;
    const H = this.H;
    const pad = 36 * this.dpr;

    // 3 columns × 2 rows — avoid the centre where the dragon lives
    const cols = 3;
    const colW = (W - pad * (cols + 1)) / cols;
    const blockW = Math.min(colW, 320 * this.dpr);

    // Column x positions
    const col0x = pad;
    const col1x = W / 2 - blockW / 2;
    // Keep right column clear of the panel (200px wide + 24px margin + breathing room)
    const panelClearance = 260 * this.dpr;
    const col2x = W - panelClearance - blockW;

    const row0y = 60 * this.dpr;
    const row1y = H * 0.54;

    const positions = [
      { x: col0x, y: row0y },  // top-left
      { x: col2x, y: row0y },  // top-right
      { x: col0x, y: row1y },  // mid-left
      { x: col2x, y: row1y },  // mid-right
      { x: col1x, y: row0y },  // top-centre
      { x: col1x, y: row1y },  // bottom-centre
    ];

    for (let bi = 0; bi < TEXT_BLOCKS.length; bi++) {
      const blk = TEXT_BLOCKS[bi];
      const pos = positions[bi];
      if (!pos) continue;

      let curY = pos.y;

      for (const run of blk.runs) {
        const font = roleFont(run.role, this.dpr);
        const lh   = roleLineHeight(run.role, this.dpr);
        const mass = roleMass(run.role);

        const prepared = prepareWithSegments(run.text, font);
        const result   = layoutWithLines(prepared, blockW, lh);

        for (const line of result.lines) {
          this.scatterLine(line.text, pos.x, curY, font, run.color, mass);
          curY += lh;
        }

        // gap between roles
        curY += (run.role === 'heading' ? 4 : 3) * this.dpr;
      }
    }
  }

  private scatterLine(
    text: string,
    x: number,
    y: number,
    font: string,
    color: string,
    mass: number,
  ): void {
    const charW = this.measureCharWidth(font);
    for (let i = 0; i < text.length; i++) {
      if (this.letters.length >= LETTER_COUNT_MAX) break;
      const ch = text[i];
      if (ch === ' ') continue;
      this.letters.push({
        ch,
        homeX: x + i * charW,
        homeY: y,
        x: x + i * charW,
        y: y,
        vx: 0, vy: 0,
        rot: 0, vrot: 0,
        alpha: 1,
        burning: 0,
        font,
        color,
        mass,
      });
    }
  }

  private charWidthCache = new Map<string, number>();
  private measureCharWidth(font: string): number {
    if (this.charWidthCache.has(font)) return this.charWidthCache.get(font)!;
    const prev = this.ctx.font;
    this.ctx.font = font;
    const w = this.ctx.measureText('M').width;
    this.ctx.font = prev;
    this.charWidthCache.set(font, w);
    return w;
  }

  // ─── Main loop ─────────────────────────────────────────────────────────────

  private loop(): void {
    this.rafId = requestAnimationFrame(() => this.loop());
    this.update();
    this.render();
  }

  private update(): void {
    this.updateDragon();
    this.updateLetters();
    this.updateParticles();
    this.updateEnemies();
    if (this.shakeDecay > 0) this.shakeDecay -= 0.1;
  }

  private updateDragon(): void {
    const segs = this.segments;
    const n = Math.min(segs.length, this.cfg.segCount);

    // Save previous positions for velocity computation
    for (let i = 0; i < n; i++) {
      segs[i].px = segs[i].x;
      segs[i].py = segs[i].y;
    }

    // Head tracks mouse
    const speed = this.cfg.dragonSpeed;
    segs[0].x += (this.mouse.x - segs[0].x) * speed;
    segs[0].y += (this.mouse.y - segs[0].y) * speed;

    // Constrain chain
    for (let i = 1; i < n; i++) {
      const a = segs[i - 1];
      const b = segs[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      const diff = (dist - SEG_LEN) / dist;
      b.x -= dx * diff * 0.5;
      b.y -= dy * diff * 0.5;
    }

    if (this.firing) {
      this.breathFire();
    }
  }

  private breathFire(): void {
    const head = this.segments[0];
    const second = this.segments[1] || head;
    const ax = head.x - second.x;
    const ay = head.y - second.y;
    const len = Math.hypot(ax, ay) || 1;
    const nx = ax / len;
    const ny = ay / len;

    // Spawn fire particles
    if (this.particles.length < PARTICLE_MAX) {
      for (let i = 0; i < 3; i++) {
        const spread = (Math.random() - 0.5) * 2;
        this.particles.push({
          x: head.x + nx * 20,
          y: head.y + ny * 20,
          vx: nx * (8 + Math.random() * 8) + spread * 2,
          vy: ny * (8 + Math.random() * 8) + spread * 2,
          ch: FIRE_CHARS[Math.floor(Math.random() * FIRE_CHARS.length)],
          life: 1,
          maxLife: 0.6 + Math.random() * 0.6,
          color: '#fff',
        });
      }
    }

    // Affect letters in fire radius
    const fr = this.cfg.fireRadius * this.dpr;
    let hits = 0;
    for (const lt of this.letters) {
      const dx = lt.x - head.x;
      const dy = lt.y - head.y;
      const d = Math.hypot(dx, dy);
      if (d < fr && d > 0.01) {
        const proximity = 1 - d / fr;
        const force = proximity * this.cfg.repulseForce * (0.015 + this.disruption) * 2.5 / lt.mass;
        lt.vx += dx / d * force + nx * force * 1.8;
        lt.vy += dy / d * force + ny * force * 1.8;
        lt.vrot += (Math.random() - 0.5) * proximity * 0.6;
        lt.burning = Math.min(lt.burning + 0.2, 2.0);
        hits++;
      }
    }

    // Affect enemies
    for (const en of this.enemies) {
      const dx = en.x - head.x;
      const dy = en.y - head.y;
      const d = Math.hypot(dx, dy);
      if (d < fr && !en.dying) {
        en.hp -= 1;
        en.vx += dx / (d || 1) * 5 + nx * 4;
        en.vy += dy / (d || 1) * 5 + ny * 4;
        if (en.hp <= 0) {
          en.dying = true;
          en.deathTimer = 30;
          this.score++;
        }
      }
    }

    if (hits > 0 && this.cfg.screenShake && this.shakeDecay <= 0) {
      this.shakeX = (Math.random() - 0.5) * 8;
      this.shakeY = (Math.random() - 0.5) * 8;
      this.shakeDecay = 0.8;
    }
  }

  private updateLetters(): void {
    const segs = this.segments;
    const n = Math.min(segs.length, this.cfg.segCount);

    for (const lt of this.letters) {
      // Check every segment (not every 4th) for tight, responsive collision
      for (let i = 0; i < n; i++) {
        const seg = segs[i];
        const dx = lt.x - seg.x;
        const dy = lt.y - seg.y;
        const d = Math.hypot(dx, dy);
        const r = 20 * this.dpr * this.dragonScale;
        if (d < r && d > 0.01) {
          const proximity = 1 - d / r;
          // Base repulsion
          const repulse = proximity * this.cfg.repulseForce * (0.015 + this.disruption) / lt.mass;
          lt.vx += (dx / d) * repulse;
          lt.vy += (dy / d) * repulse;

          // Velocity transfer: dragon segment movement imparts impulse
          const segVx = seg.x - seg.px;
          const segVy = seg.y - seg.py;
          const transfer = proximity * 4.0 / lt.mass;
          lt.vx += segVx * transfer;
          lt.vy += segVy * transfer;

          // Spin on impact proportional to tangential force
          const tang = (dx * segVy - dy * segVx) / (d || 1);
          lt.vrot += tang * 0.08 / lt.mass;
        }
      }

      // Spring back home
      lt.vx += (lt.homeX - lt.x) * this.cfg.springForce;
      lt.vy += (lt.homeY - lt.y) * this.cfg.springForce;

      // Burning
      if (lt.burning > 0) {
        lt.vy += 0.5;
        lt.burning -= 0.018;
        lt.alpha = Math.max(0.15, 1 - lt.burning * 0.35);
      } else {
        lt.alpha = Math.min(1, lt.alpha + 0.025);
      }

      lt.vx *= this.cfg.damping;
      lt.vy *= this.cfg.damping;
      lt.vrot *= 0.88;
      lt.x += lt.vx;
      lt.y += lt.vy;
      lt.rot += lt.vrot;
    }
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.vx *= 0.94;
      p.life -= 0.025 / p.maxLife;
      const t = 1 - p.life;
      if (t < 0.3)      p.color = '#fff';
      else if (t < 0.5) p.color = '#ffe066';
      else if (t < 0.7) p.color = '#ff9900';
      else if (t < 0.9) p.color = '#ff4400';
      else              p.color = '#cc1100';

      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  private updateEnemies(): void {
    this.enemySpawnTimer++;
    if (this.enemySpawnTimer >= this.enemySpawnInterval && this.enemies.length < ENEMY_MAX) {
      this.spawnEnemy();
      this.enemySpawnTimer = 0;
      this.enemySpawnInterval = Math.max(80, this.enemySpawnInterval - 2);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const en = this.enemies[i];
      if (en.dying) {
        en.deathTimer--;
        en.alpha *= 0.88;
        en.vx *= 0.9; en.vy *= 0.9;
        en.x += en.vx; en.y += en.vy;
        if (en.deathTimer <= 0) { this.enemies.splice(i, 1); }
        continue;
      }
      en.vx += (this.W / 2 - en.x) * 0.0003;
      en.vy += (this.H / 2 - en.y) * 0.0003;
      en.vx *= 0.97; en.vy *= 0.97;
      en.x += en.vx; en.y += en.vy;
    }
  }

  private spawnEnemy(): void {
    const edge = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (edge === 0)      { x = Math.random() * this.W; y = -20; }
    else if (edge === 1) { x = this.W + 20; y = Math.random() * this.H; }
    else if (edge === 2) { x = Math.random() * this.W; y = this.H + 20; }
    else                 { x = -20; y = Math.random() * this.H; }
    const hp = 1 + Math.floor(Math.random() * 3);
    this.enemies.push({
      x, y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      hp, maxHp: hp,
      ch: ENEMY_CHARS[Math.floor(Math.random() * ENEMY_CHARS.length)],
      alpha: 1,
      dying: false,
      deathTimer: 0,
    });
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  private render(): void {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;

    ctx.save();
    if (this.shakeDecay > 0) {
      ctx.translate(this.shakeX * this.shakeDecay, this.shakeY * this.shakeDecay);
    }

    ctx.fillStyle = '#060610';
    ctx.fillRect(-20, -20, W + 40, H + 40);

    this.renderGrid(ctx, W, H);
    this.renderLetters(ctx);
    this.renderEnemies(ctx);
    this.renderParticles(ctx);
    this.renderDragon(ctx);
    this.renderCrosshair(ctx);

    ctx.restore();
    this.renderHUD(ctx, W, H);
  }

  private renderGrid(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const step = 60 * this.dpr;
    ctx.strokeStyle = 'rgba(62,207,142,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = 0; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
  }

  private renderLetters(ctx: CanvasRenderingContext2D): void {
    for (const lt of this.letters) {
      ctx.save();
      ctx.globalAlpha = lt.alpha;
      ctx.translate(lt.x, lt.y);
      ctx.rotate(lt.rot);

      if (lt.burning > 0.4) {
        const t = Math.min(lt.burning / 2, 1);
        ctx.fillStyle = t > 0.7 ? '#ff4400' : t > 0.4 ? '#ff9900' : '#ffe066';
      } else {
        ctx.fillStyle = lt.color;
      }

      // Glow on headings when disturbed
      const speed = Math.hypot(lt.vx, lt.vy);
      if (lt.mass >= 3 && speed > 1) {
        ctx.shadowColor = lt.color;
        ctx.shadowBlur = Math.min(speed * 2, 16) * this.dpr;
      }

      ctx.font = lt.font;
      ctx.textBaseline = 'middle';
      ctx.fillText(lt.ch, 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    ctx.font = `${12 * this.dpr}px monospace`;
    ctx.textBaseline = 'middle';
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillText(p.ch, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  private renderEnemies(ctx: CanvasRenderingContext2D): void {
    ctx.font = `bold ${16 * this.dpr}px monospace`;
    ctx.textBaseline = 'middle';
    for (const en of this.enemies) {
      const pulse = 0.7 + Math.sin(Date.now() * 0.004) * 0.3;
      ctx.globalAlpha = en.alpha * pulse;
      ctx.fillStyle = en.hp > 2 ? '#ff4466' : en.hp > 1 ? '#ff9944' : '#ffcc44';
      ctx.fillText(en.ch, en.x, en.y);
    }
    ctx.globalAlpha = 1;
  }

  // Character palette matching the reference dragon's shape
  private readonly dragonChars = '◆◆◇▼█▓▓▒╬╬╬╬╬╬╬╬╬╬╫╫╫╪╪╪╧╧╤╤╥╥║║││┃┃╎╎╏╏::·····..'.split('');

  private segScale(i: number, n: number): number {
    const t = i / n;
    // Head segments are large, taper to thin tail
    return (2.0 * (1 - t * t) + 0.2) * this.dragonScale;
  }

  private renderDragon(ctx: CanvasRenderingContext2D): void {
    const segs = this.segments;
    const n = Math.min(segs.length, this.cfg.segCount);
    const now = performance.now() / 1000;

    // Draw fire glow behind everything
    if (this.firing) {
      const head = segs[0];
      const second = segs[1] || head;
      const ax = head.x - second.x;
      const ay = head.y - second.y;
      const len = Math.hypot(ax, ay) || 1;
      const nx = ax / len;
      const ny = ay / len;
      const grad = ctx.createRadialGradient(
        head.x + nx * 20, head.y + ny * 20, 0,
        head.x + nx * 20, head.y + ny * 20, this.cfg.fireRadius * this.dpr,
      );
      grad.addColorStop(0, 'rgba(255,200,50,0.35)');
      grad.addColorStop(0.4, 'rgba(255,80,0,0.15)');
      grad.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(head.x + nx * 20, head.y + ny * 20, this.cfg.fireRadius * this.dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw body back-to-front
    for (let i = n - 1; i >= 0; i--) {
      const seg = segs[i];
      const sc = this.segScale(i, n);
      const size = 14 * this.dpr * sc;
      const ci = Math.min(i, this.dragonChars.length - 1);

      // Angle: head points at mouse, body segments point toward previous segment
      const angle = i === 0
        ? Math.atan2(this.mouse.y - segs[0].y, this.mouse.x - segs[0].x)
        : Math.atan2(segs[i - 1].y - seg.y, segs[i - 1].x - seg.x);

      // Color: keep our teal/green palette, brighter at head
      const t = i / n;
      const hue = 150 + (1 - t) * 30;
      const light = 35 + (1 - t) * 45;
      const alpha = 0.35 + (1 - t) * 0.65;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = `hsl(${hue}, 80%, ${light}%)`;
      ctx.font = `bold ${size}px 'Courier New', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Body segment with sine wobble
      ctx.save();
      ctx.translate(seg.x, seg.y);
      ctx.rotate(angle);
      ctx.fillText(this.dragonChars[ci], 0, Math.sin(now * 5 + i * 0.35) * 1.5 * this.dpr);
      ctx.restore();

      // Wings — segments 7-16, every 2nd
      if (i >= 7 && i <= 16 && i % 2 === 0) {
        const wp = Math.sin(now * 3 + i * 0.5) * 0.3;
        const wd = size * 1.4;
        const w1 = angle + Math.PI / 2 + wp;
        const w2 = angle - Math.PI / 2 - wp;
        const wingSize = size * 0.85;
        ctx.globalAlpha = alpha * 0.9;
        ctx.font = `bold ${wingSize}px 'Courier New', monospace`;
        ctx.fillText('≺', seg.x + Math.cos(w1) * wd, seg.y + Math.sin(w1) * wd);
        ctx.fillText('≻', seg.x + Math.cos(w2) * wd, seg.y + Math.sin(w2) * wd);
      }

      // Spines — segments 4-30, every 3rd
      if (i >= 4 && i <= 30 && i % 3 === 0) {
        const sa = angle + Math.PI / 2;
        const sd = size * 0.35;
        const spineSize = size * 0.7;
        ctx.globalAlpha = alpha * 0.8;
        ctx.font = `bold ${spineSize}px 'Courier New', monospace`;
        ctx.fillText('▴', seg.x + Math.cos(sa) * sd, seg.y + Math.sin(sa) * sd);
      }
    }

    // Head eye — drawn on top
    const head = segs[0];
    const headAngle = Math.atan2(this.mouse.y - head.y, this.mouse.x - head.x);
    const headSc = this.segScale(0, n);
    const headSize = 14 * this.dpr * headSc;
    const eyeOffset = headSize * 0.55;

    // Blink logic
    const blink = (now % 5) > 4.7;
    const eyeChar = blink ? '—' : this.firing ? '◉' : '⊙';

    ctx.globalAlpha = 1;
    ctx.fillStyle = this.firing ? '#aaffdd' : ACCENT;
    ctx.font = `bold ${headSize * 0.5}px 'Courier New', monospace`;
    ctx.shadowColor = ACCENT;
    ctx.shadowBlur = this.firing ? 20 * this.dpr : 8 * this.dpr;

    const eyeX = head.x + Math.cos(headAngle) * eyeOffset;
    const eyeY = head.y + Math.sin(headAngle) * eyeOffset;
    ctx.fillText(eyeChar, eyeX, eyeY);
    ctx.shadowBlur = 0;

    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  private renderCrosshair(ctx: CanvasRenderingContext2D): void {
    const x = this.mouse.x;
    const y = this.mouse.y;
    const s = 10 * this.dpr;
    ctx.strokeStyle = 'rgba(62,207,142,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - s, y); ctx.lineTo(x + s, y);
    ctx.moveTo(x, y - s); ctx.lineTo(x, y + s);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, s * 0.6, 0, Math.PI * 2);
    ctx.stroke();
  }

  private renderHUD(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const fs = 11 * this.dpr;
    ctx.font = `${fs}px monospace`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(62,207,142,0.5)';
    ctx.fillText(`SCORE: ${this.score.toString().padStart(4, '0')}  ENEMIES: ${this.enemies.filter(e => !e.dying).length}`, 16 * this.dpr, 16 * this.dpr);
    ctx.fillText(`SEGMENTS: ${this.cfg.segCount}  PRESET: ${this.activePreset}`, 16 * this.dpr, 32 * this.dpr);
  }
}
