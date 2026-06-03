import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

interface HeroRobot {
  w: number;
  h: number;
  n: number;
  r: number;
  x: number;
  y: number;
  theta: number;
  arcsLeft: number;
  progress: number;
  currentArc: ArcData | null;
  speed: number;
  opacity: number;
  fadeIn: boolean;
}

interface ArcData {
  cx: number;
  cy: number;
  r: number;
  startA: number;
  endA: number;
  antiCw: boolean;
  nx: number;
  ny: number;
  nTheta: number;
  cw: boolean;
}

@Component({
  selector: 'app-robot-walks',
  templateUrl: './robot-walks.component.html',
  styleUrl: './robot-walks.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RobotWalksComponent implements OnInit {
  constructor(private title: Title, private meta: Meta) {}

  ngOnInit(): void {
    this.title.setTitle('Robot Walks · Solution Notes');
    this.meta.updateTag({
      property: 'og:title',
      content: 'Robot Walks · Project Euler 208',
    });
    this.meta.updateTag({
      property: 'og:description',
      content: 'Graph theory, BEST theorem, and modular arithmetic applied to counting closed robot trajectories.',
    });
    this.meta.updateTag({
      property: 'og:image',
      content: 'https://dsbissett.github.io/assets/robot-walks-og.png',
    });
    this.meta.updateTag({
      name: 'twitter:title',
      content: 'Robot Walks · Project Euler 208',
    });
    this.meta.updateTag({
      name: 'twitter:description',
      content: 'Graph theory, BEST theorem, and modular arithmetic applied to counting closed robot trajectories.',
    });
    this.meta.updateTag({
      name: 'twitter:image',
      content: 'https://dsbissett.github.io/assets/robot-walks-og.png',
    });

    this.initHero();
    this.buildExampleGrid();
    this.buildLeftRobotDiagram();
    this.setupScrollFadeIn();
    this.initSolveAnimations();
  }

  private heroCanvas!: HTMLCanvasElement;
  private heroCtx!: CanvasRenderingContext2D;
  private heroDims: { w: number; h: number } = { w: 0, h: 0 };
  private heroRobots: HeroRobot[] = [];

  private initHero(): void {
    this.heroCanvas = document.getElementById('heroCanvas') as HTMLCanvasElement;
    this.heroCtx = this.heroCanvas.getContext('2d')!;

    this.setupCanvas();
    window.addEventListener('resize', () => this.onWindowResize());
    this.initHeroRobots();
    this.heroAnimate();
  }

  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.heroCanvas.getBoundingClientRect();
    this.heroCanvas.width = rect.width * dpr;
    this.heroCanvas.height = rect.height * dpr;
    this.heroCtx.scale(dpr, dpr);
    this.heroDims = { w: rect.width, h: rect.height };
  }

  private onWindowResize(): void {
    this.heroCanvas.width = 0;
    this.heroCanvas.height = 0;
    this.setupCanvas();
    this.initHeroRobots();
  }

  private initHeroRobots(): void {
    this.heroRobots = [];
    const count = 3;
    for (let i = 0; i < count; i++) {
      this.heroRobots.push(this.createHeroRobot());
    }
    this.heroCtx.clearRect(0, 0, this.heroDims.w, this.heroDims.h);
  }

  private createHeroRobot(): HeroRobot {
    return {
      w: this.heroDims.w,
      h: this.heroDims.h,
      n: 3 + Math.floor(Math.random() * 6),
      r: 28 + Math.random() * 36,
      x: this.heroDims.w * (0.2 + Math.random() * 0.6),
      y: this.heroDims.h * (0.2 + Math.random() * 0.6),
      theta: -Math.PI / 2,
      arcsLeft: 20 + Math.floor(Math.random() * 30),
      progress: 0,
      currentArc: null,
      speed: 0.012 + Math.random() * 0.012,
      opacity: 0.0,
      fadeIn: true,
    };
  }

  private arcStep(state: { x: number; y: number; theta: number }, cw: boolean, n: number, r: number): ArcData {
    const { x, y, theta } = state;
    const sweep = (2 * Math.PI) / n;
    let cx, cy, startA, endA, antiCw;
    if (cw) {
      cx = x - r * Math.sin(theta);
      cy = y + r * Math.cos(theta);
      startA = Math.atan2(y - cy, x - cx);
      endA = startA + sweep;
      antiCw = false;
    } else {
      cx = x + r * Math.sin(theta);
      cy = y - r * Math.cos(theta);
      startA = Math.atan2(y - cy, x - cx);
      endA = startA - sweep;
      antiCw = true;
    }
    const nx = cx + r * Math.cos(endA);
    const ny = cy + r * Math.sin(endA);
    const nTheta = theta + (cw ? sweep : -sweep);
    return { cx, cy, r, startA, endA, antiCw, nx, ny, nTheta, cw };
  }

  private startArc(robot: HeroRobot): boolean {
    const cw = Math.random() < 0.5;
    const step = this.arcStep({ x: robot.x, y: robot.y, theta: robot.theta }, cw, robot.n, robot.r);
    const margin = 20;
    if (step.cx - step.r < -margin || step.cx + step.r > robot.w + margin ||
        step.cy - step.r < -margin || step.cy + step.r > robot.h + margin) {
      Object.assign(robot, this.createHeroRobot());
      return false;
    }
    robot.currentArc = step;
    robot.progress = 0;
    return true;
  }

  private drawRobot(robot: HeroRobot): void {
    if (robot.fadeIn) {
      robot.opacity = Math.min(0.55, robot.opacity + 0.005);
      if (robot.opacity >= 0.55) robot.fadeIn = false;
    }
    if (!robot.currentArc) {
      if (robot.arcsLeft <= 0) {
        robot.opacity -= 0.008;
        if (robot.opacity <= 0) {
          Object.assign(robot, this.createHeroRobot());
        }
        return;
      }
      if (!this.startArc(robot)) return;
    }
    const a = robot.currentArc!;
    robot.progress += robot.speed;
    if (robot.progress > 1) robot.progress = 1;
    const angle = a.startA + (a.endA - a.startA) * robot.progress;
    this.heroCtx.beginPath();
    if (a.antiCw) {
      this.heroCtx.arc(a.cx, a.cy, a.r, a.startA, angle, true);
    } else {
      this.heroCtx.arc(a.cx, a.cy, a.r, a.startA, angle, false);
    }
    this.heroCtx.strokeStyle = `rgba(200, 65, 42, ${robot.opacity * 0.5})`;
    this.heroCtx.lineWidth = 1.4;
    this.heroCtx.stroke();

    if (robot.progress >= 1) {
      robot.x = a.nx;
      robot.y = a.ny;
      robot.theta = a.nTheta;
      robot.currentArc = null;
      robot.arcsLeft--;
    }
  }

  private heroAnimate = (): void => {
    this.heroCtx.fillStyle = 'rgba(244, 236, 216, 0.015)';
    this.heroCtx.fillRect(0, 0, this.heroDims.w, this.heroDims.h);
    for (const r of this.heroRobots) this.drawRobot(r);
    requestAnimationFrame(this.heroAnimate);
  };

  private buildExampleGrid(): void {
    const grid = document.getElementById('exampleGrid');
    if (!grid) return;

    const EIGHT_PATHS = [
      [true, true, true, true, true, true],
      [false, false, false, false, false, false],
      [true, true, true, false, false, false],
      [true, true, false, false, false, true],
      [true, false, false, false, true, true],
      [false, false, false, true, true, true],
      [false, false, true, true, true, false],
      [false, true, true, true, false, false],
    ];

    EIGHT_PATHS.forEach((seq, i) => {
      const cell = document.createElement('div');
      cell.innerHTML = `<span class="ex-label">${(i + 1).toString().padStart(2, '0')}</span>`;
      const c = document.createElement('canvas');
      cell.appendChild(c);
      grid.appendChild(cell);
      requestAnimationFrame(() => this.renderPathOnCanvas(c, seq, 3));
    });
  }

  private renderPathOnCanvas(canvas: HTMLCanvasElement, sequence: boolean[], n: number): void {
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width,
      h = rect.height;

    const r = Math.min(w, h) * 0.18;
    let x = 0,
      y = 0,
      theta = -Math.PI / 2;
    const arcs: ArcData[] = [];
    for (const cw of sequence) {
      const step = this.arcStep({ x, y, theta }, cw, n, r);
      arcs.push(step);
      x = step.nx;
      y = step.ny;
      theta = step.nTheta;
    }

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const a of arcs) {
      minX = Math.min(minX, a.cx - a.r);
      maxX = Math.max(maxX, a.cx + a.r);
      minY = Math.min(minY, a.cy - a.r);
      maxY = Math.max(maxY, a.cy + a.r);
    }
    const bw = maxX - minX,
      bh = maxY - minY;
    const scale = Math.min((w - 24) / bw, (h - 24) / bh);
    const offsetX = w / 2 - ((minX + bw / 2) * scale);
    const offsetY = h / 2 - ((minY + bh / 2) * scale);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    ctx.strokeStyle = '#c8412a';
    ctx.lineWidth = 1.3 / scale;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (const a of arcs) {
      ctx.arc(a.cx, a.cy, a.r, a.startA, a.endA, a.antiCw);
    }
    ctx.stroke();

    ctx.fillStyle = '#c8412a';
    ctx.beginPath();
    ctx.arc(0, 0, 4 / scale, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = '#1a2238';
    ctx.lineWidth = 1 / scale;
    ctx.beginPath();
    ctx.moveTo(0, -3 / scale);
    ctx.lineTo(0, -16 / scale);
    ctx.stroke();
    ctx.fillStyle = '#1a2238';
    ctx.beginPath();
    ctx.moveTo(0, -18 / scale);
    ctx.lineTo(-3 / scale, -12 / scale);
    ctx.lineTo(3 / scale, -12 / scale);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private buildLeftRobotDiagram(): void {
    const g = document.getElementById('leftRobotDiagram');
    if (!g) return;
    let x = 0,
      y = 60,
      theta = -Math.PI / 2;
    const r = 36;
    const n = 5;
    const sequence = [true, false, true, true, false, true, false];
    let pathD = `M ${x.toFixed(2)} ${y.toFixed(2)} `;
    for (const cw of sequence) {
      const sweep = (2 * Math.PI) / n;
      let cx, cy, sweepFlag;
      if (cw) {
        cx = x - r * Math.sin(theta);
        cy = y + r * Math.cos(theta);
        sweepFlag = 1;
      } else {
        cx = x + r * Math.sin(theta);
        cy = y - r * Math.cos(theta);
        sweepFlag = 0;
      }
      const startA = Math.atan2(y - cy, x - cx);
      const endA = startA + (cw ? sweep : -sweep);
      const nx = cx + r * Math.cos(endA);
      const ny = cy + r * Math.sin(endA);
      pathD += `A ${r} ${r} 0 0 ${sweepFlag} ${nx.toFixed(2)} ${ny.toFixed(2)} `;
      x = nx;
      y = ny;
      theta += cw ? sweep : -sweep;
    }
    g.innerHTML = `
      <path d="${pathD}" fill="none" stroke="#c8412a" stroke-width="1.4"/>
      <circle cx="0" cy="60" r="5" fill="#c8412a"/>
      <line x1="0" y1="55" x2="0" y2="35" stroke="#1a2238" stroke-width="1"/>
      <polygon points="0,30 -3,38 3,38" fill="#1a2238"/>
    `;
  }

  private setupScrollFadeIn(): void {
    const fadeObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add('in');
            fadeObserver.unobserve(e.target);
          }
        }
      },
      { threshold: 0.08 }
    );

    setTimeout(() => {
      document.querySelectorAll('.fade').forEach((el) => fadeObserver.observe(el));
      document.querySelectorAll('section .section-head, section .prose, section .diagram-card, section .formula, section pre, section .n-table, section .verify')
        .forEach((el) => {
          el.classList.add('fade');
          fadeObserver.observe(el);
        });
    }, 100);
  }

  // ===================================================================
  // §4 — Three animated views of the same count: n=3, m=6, answer 8.
  // ===================================================================

  private static readonly PAL = {
    paper: '#f4ecd8',
    paperDeep: '#ebe1c0',
    ink: '#1a2238',
    ink2: '#3a4862',
    ink3: '#6b7691',
    verm: '#c8412a',
    vermDeep: '#962e1c',
    sage: '#6b8a5a',
    rule: '#c4b896',
  };

  // The eight closing walks for n=3, m=6 (CW=true, CCW=false).
  private readonly closingPaths: readonly boolean[][] = [
    [true, true, true, true, true, true],
    [false, false, false, false, false, false],
    [true, true, true, false, false, false],
    [true, true, false, false, false, true],
    [true, false, false, false, true, true],
    [false, false, false, true, true, true],
    [false, false, true, true, true, false],
    [false, true, true, true, false, false],
  ];

  private walkCanvas!: HTMLCanvasElement;
  private graphCanvas!: HTMLCanvasElement;
  private kernelCanvas!: HTMLCanvasElement;
  private walkDims = { w: 0, h: 0 };
  private graphDims = { w: 0, h: 0 };
  private kernelDims = { w: 0, h: 0 };
  private kernelSteps: ReturnType<RobotWalksComponent['countN3Steps']> | null = null;
  private animStart = 0;
  private reducedMotion = false;

  private initSolveAnimations(): void {
    this.walkCanvas = document.getElementById('animWalkCanvas') as HTMLCanvasElement;
    this.graphCanvas = document.getElementById('animGraphCanvas') as HTMLCanvasElement;
    this.kernelCanvas = document.getElementById('animKernelCanvas') as HTMLCanvasElement;
    if (!this.walkCanvas || !this.graphCanvas || !this.kernelCanvas) return;

    this.kernelSteps = this.countN3Steps(2, 2, 2);
    this.reducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    this.sizeAnimCanvas(this.walkCanvas, this.walkDims);
    this.sizeAnimCanvas(this.graphCanvas, this.graphDims);
    this.sizeAnimCanvas(this.kernelCanvas, this.kernelDims);

    let resizeTimer: ReturnType<typeof setTimeout>;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.sizeAnimCanvas(this.walkCanvas, this.walkDims);
        this.sizeAnimCanvas(this.graphCanvas, this.graphDims);
        this.sizeAnimCanvas(this.kernelCanvas, this.kernelDims);
        if (this.reducedMotion) this.renderStaticFrames();
      }, 200);
    });

    if (this.reducedMotion) {
      this.renderStaticFrames();
      return;
    }
    requestAnimationFrame((t) => this.animLoop(t));
  }

  private sizeAnimCanvas(c: HTMLCanvasElement, dims: { w: number; h: number }): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    if (rect.width === 0) return;
    c.width = Math.round(rect.width * dpr);
    c.height = Math.round(rect.height * dpr);
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dims.w = rect.width;
    dims.h = rect.height;
  }

  private animLoop = (t: number): void => {
    if (this.animStart === 0) this.animStart = t;
    const elapsed = (t - this.animStart) / 1000;
    this.drawWalk(elapsed);
    this.drawGraph(elapsed);
    this.drawKernel(elapsed);
    requestAnimationFrame((next) => this.animLoop(next));
  };

  private renderStaticFrames(): void {
    // Final, non-animated state of each figure for reduced-motion users.
    this.drawWalk(2.0); // first path fully traced
    this.drawGraph(99); // completed circuit
    this.drawKernel(99); // all terms summed
  }

  // ---- Figure 3: geometric walk tracer -----------------------------

  private walkGeom(seq: readonly boolean[], w: number, h: number) {
    const n = 3;
    const r = Math.min(w, h) * 0.16;
    let x = 0,
      y = 0,
      theta = -Math.PI / 2;
    const arcs: ArcData[] = [];
    for (const cw of seq) {
      const s = this.arcStep({ x, y, theta }, cw, n, r);
      arcs.push(s);
      x = s.nx;
      y = s.ny;
      theta = s.nTheta;
    }
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const a of arcs) {
      minX = Math.min(minX, a.cx - a.r);
      maxX = Math.max(maxX, a.cx + a.r);
      minY = Math.min(minY, a.cy - a.r);
      maxY = Math.max(maxY, a.cy + a.r);
    }
    const bw = maxX - minX,
      bh = maxY - minY;
    const scale = Math.min((w - 80) / bw, (h - 80) / bh);
    const ox = w / 2 - (minX + bw / 2) * scale;
    const oy = h / 2 - (minY + bh / 2) * scale;
    return { arcs, scale, ox, oy };
  }

  private drawWalk(elapsed: number): void {
    const { w, h } = this.walkDims;
    if (w === 0) return;
    const ctx = this.walkCanvas.getContext('2d')!;
    const P = RobotWalksComponent.PAL;

    const traceDur = 2.0;
    const holdDur = 0.9;
    const cycle = traceDur + holdDur;
    const idx = this.reducedMotion ? 0 : Math.floor(elapsed / cycle) % this.closingPaths.length;
    const phase = this.reducedMotion ? traceDur : elapsed % cycle;
    const seq = this.closingPaths[idx];
    const prog = Math.min(seq.length, (phase / traceDur) * seq.length);

    ctx.fillStyle = P.paper;
    ctx.fillRect(0, 0, w, h);

    const { arcs, scale, ox, oy } = this.walkGeom(seq, w, h);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);
    ctx.strokeStyle = P.verm;
    ctx.lineWidth = 1.8 / scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const full = Math.floor(prog);
    for (let i = 0; i < arcs.length; i++) {
      const a = arcs[i];
      if (i < full) {
        ctx.arc(a.cx, a.cy, a.r, a.startA, a.endA, a.antiCw);
      } else if (i === full) {
        const f = prog - full;
        const ea = a.startA + (a.endA - a.startA) * f;
        ctx.arc(a.cx, a.cy, a.r, a.startA, ea, a.antiCw);
        break;
      }
    }
    ctx.stroke();

    // origin marker + heading arrow
    ctx.fillStyle = P.verm;
    ctx.beginPath();
    ctx.arc(0, 0, 4 / scale, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 1.2 / scale;
    ctx.beginPath();
    ctx.moveTo(0, -4 / scale);
    ctx.lineTo(0, -18 / scale);
    ctx.stroke();
    ctx.fillStyle = P.ink;
    ctx.beginPath();
    ctx.moveTo(0, -20 / scale);
    ctx.lineTo(-3 / scale, -13 / scale);
    ctx.lineTo(3 / scale, -13 / scale);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // labels
    const allSame = seq.every((d) => d === seq[0]);
    ctx.fillStyle = P.ink3;
    ctx.font = "600 11px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`WALK ${(idx + 1).toString().padStart(2, '0')} / 08`, 16, 22);
    ctx.fillStyle = P.vermDeep;
    ctx.fillText(allSame ? 'SINGLE CIRCLE' : 'FIGURE-EIGHT', 16, 38);
    if (phase >= traceDur) {
      ctx.fillStyle = P.sage;
      ctx.textAlign = 'right';
      ctx.fillText('CLOSED ✓', w - 16, 22);
    }
  }

  // ---- Figure 4: Eulerian circuit on C3 ----------------------------

  private graphSeqIndices = [0, 2, 3];

  private drawGraph(elapsed: number): void {
    const { w, h } = this.graphDims;
    if (w === 0) return;
    const ctx = this.graphCanvas.getContext('2d')!;
    const P = RobotWalksComponent.PAL;

    const stepDur = 0.5;
    const holdDur = 1.1;
    const seqCount = this.graphSeqIndices.length;
    const oneCycle = 6 * stepDur + holdDur;
    const whichSeq = this.reducedMotion ? 0 : Math.floor(elapsed / oneCycle) % seqCount;
    const local = this.reducedMotion ? 6 * stepDur : elapsed % oneCycle;
    const seq = this.closingPaths[this.graphSeqIndices[whichSeq]];

    // geometry of the triangle
    const cx = w / 2,
      cy = h * 0.42,
      R = Math.min(w, h) * 0.3;
    const vert = (k: number) => ({
      x: cx + R * Math.cos(-Math.PI / 2 + (k * 2 * Math.PI) / 3),
      y: cy + R * Math.sin(-Math.PI / 2 + (k * 2 * Math.PI) / 3),
    });

    // replay steps up to current time
    const usage = [0, 0, 0];
    let hIdx = 0;
    const doneSteps = Math.min(6, Math.floor(local / stepDur));
    const fracStep = Math.min(1, local / stepDur - doneSteps);
    let token: { x: number; y: number; cw: boolean } | null = null;
    for (let i = 0; i < 6; i++) {
      const cw = seq[i];
      const edge = cw ? hIdx : (hIdx + 2) % 3;
      const from = hIdx;
      const to = cw ? (hIdx + 1) % 3 : (hIdx + 2) % 3;
      if (i < doneSteps) {
        usage[edge]++;
        hIdx = to;
      } else if (i === doneSteps) {
        const a = vert(from),
          b = vert(to);
        token = {
          x: a.x + (b.x - a.x) * fracStep,
          y: a.y + (b.y - a.y) * fracStep,
          cw,
        };
        hIdx = to;
        break;
      }
    }

    ctx.fillStyle = P.paper;
    ctx.fillRect(0, 0, w, h);

    // edges
    for (let e = 0; e < 3; e++) {
      const a = vert(e),
        b = vert((e + 1) % 3);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = usage[e] > 0 ? P.verm : P.rule;
      ctx.lineWidth = usage[e] > 0 ? 1.5 + usage[e] * 1.5 : 1.2;
      ctx.stroke();
      // usage count near midpoint
      const mx = (a.x + b.x) / 2,
        my = (a.y + b.y) / 2;
      ctx.fillStyle = P.ink3;
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(`e${e}:${usage[e]}`, mx, my - 6);
    }

    // vertices
    for (let k = 0; k < 3; k++) {
      const v = vert(k);
      ctx.beginPath();
      ctx.arc(v.x, v.y, k === 0 ? 8 : 6, 0, 2 * Math.PI);
      ctx.fillStyle = k === 0 ? P.ink : P.paper;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = P.ink;
      ctx.stroke();
      ctx.fillStyle = P.ink2;
      ctx.font = "italic 13px 'Fraunces', serif";
      ctx.textAlign = 'center';
      ctx.fillText(`v${k}`, v.x, v.y - 14);
    }

    // token
    if (token) {
      ctx.beginPath();
      ctx.arc(token.x, token.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = token.cw ? P.ink2 : P.verm;
      ctx.fill();
    }

    // multiplicity vector readout
    const sum = usage[0] + usage[1] + usage[2];
    ctx.textAlign = 'left';
    ctx.font = "600 12px 'JetBrains Mono', monospace";
    ctx.fillStyle = P.ink2;
    ctx.fillText(
      `c = (${usage[0]}, ${usage[1]}, ${usage[2]})   Σ = ${sum} / 6`,
      16,
      h - 18
    );
    if (local >= 6 * stepDur) {
      ctx.fillStyle = P.sage;
      ctx.textAlign = 'right';
      ctx.font = "600 12px 'JetBrains Mono', monospace";
      ctx.fillText('CIRCUIT CLOSED ✓', w - 16, h - 18);
    }
  }

  // ---- Figure 5: the drift-sum kernel ------------------------------

  private countN3Steps(c0: number, c1: number, c2: number) {
    const fact = (k: number): number => {
      let r = 1;
      for (let i = 2; i <= k; i++) r *= i;
      return r;
    };
    const invf = (k: number) => 1 / fact(k);
    const cmin = Math.min(c0, c1, c2);
    const lo = -cmin,
      hi = cmin;
    const e0 = (c0 + c2) >> 1,
      e1 = (c1 + c0 - 2) >> 1,
      e2 = (c2 + c1 - 2) >> 1;
    const vertex = fact(e0) * fact(e1) * fact(e2);
    let x0 = (c0 + lo) >> 1,
      x1 = (c1 + lo) >> 1,
      x2 = (c2 + lo) >> 1;
    let y0 = c0 - x0,
      y1 = c1 - x1,
      y2 = c2 - x2;
    let d = invf(x0) * invf(y0) * invf(x1) * invf(y1) * invf(x2) * invf(y2);
    const stepCount = (hi - lo) / 2 + 1;
    const out: {
      delta: number;
      x: number[];
      y: number[];
      tree: number;
      contribution: number;
    }[] = [];
    let total = 0;
    for (let t = 0; t < stepCount; t++) {
      const sx2 = x2;
      const sx1 = x1 * sx2;
      const p1 = y0;
      const p2 = p1 * y1;
      let tree = sx1;
      tree = tree + p1 * sx2;
      tree = tree + p2;
      out.push({
        delta: lo + 2 * t,
        x: [x0, x1, x2],
        y: [y0, y1, y2],
        tree,
        contribution: Math.round(vertex * tree * d),
      });
      total += tree * d;
      d = d * p2 * y2;
      x0++;
      d *= 1 / x0;
      x1++;
      d *= 1 / x1;
      x2++;
      d *= 1 / x2;
      y0--;
      y1--;
      y2--;
    }
    return { vertex, steps: out, answer: Math.round(vertex * total) };
  }

  private drawKernel(elapsed: number): void {
    const { w, h } = this.kernelDims;
    if (w === 0 || !this.kernelSteps) return;
    const ctx = this.kernelCanvas.getContext('2d')!;
    const P = RobotWalksComponent.PAL;
    const ks = this.kernelSteps;
    const nSteps = ks.steps.length;

    const stepDur = 1.5;
    const holdDur = 1.4;
    const cycle = nSteps * stepDur + holdDur;
    const local = this.reducedMotion ? cycle : elapsed % cycle;
    const active = Math.min(nSteps - 1, Math.floor(local / stepDur));
    const revealed = this.reducedMotion ? nSteps : Math.min(nSteps, Math.floor(local / stepDur) + 1);

    ctx.fillStyle = P.paper;
    ctx.fillRect(0, 0, w, h);

    // header: the c-vector
    ctx.textAlign = 'left';
    ctx.fillStyle = P.ink2;
    ctx.font = "italic 16px 'Fraunces', serif";
    ctx.fillText('c = (2, 2, 2)', 18, 30);
    ctx.fillStyle = P.ink3;
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillText('δ sweeps −2 → +2 in steps of 2', 18, 48);

    // three columns, one per delta
    const colW = (w - 36) / nSteps;
    let running = 0;
    for (let i = 0; i < nSteps; i++) {
      const s = ks.steps[i];
      const cxc = 18 + colW * i + colW / 2;
      const isActive = !this.reducedMotion && i === active;
      const shown = i < revealed;
      const top = 74;

      // panel
      ctx.fillStyle = isActive ? P.paperDeep : 'rgba(0,0,0,0)';
      if (isActive) {
        ctx.fillRect(18 + colW * i + 4, top - 10, colW - 8, 188);
      }
      ctx.strokeStyle = shown ? P.rule : '#d8cfb0';
      ctx.lineWidth = 1;
      ctx.strokeRect(18 + colW * i + 4, top - 10, colW - 8, 188);

      ctx.textAlign = 'center';
      ctx.fillStyle = shown ? P.vermDeep : P.ink3;
      ctx.font = "italic 18px 'Fraunces', serif";
      ctx.fillText(`δ = ${s.delta > 0 ? '+' : ''}${s.delta}`, cxc, top + 12);

      if (shown) {
        // x (CW) and y (CCW) vectors
        ctx.font = "12px 'JetBrains Mono', monospace";
        ctx.fillStyle = P.ink2;
        ctx.fillText(`x = (${s.x.join(',')})`, cxc, top + 40);
        ctx.fillStyle = P.ink3;
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillText('clockwise', cxc, top + 54);
        ctx.fillStyle = P.verm;
        ctx.font = "12px 'JetBrains Mono', monospace";
        ctx.fillText(`y = (${s.y.join(',')})`, cxc, top + 76);
        ctx.fillStyle = P.ink3;
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillText('counter-cw', cxc, top + 90);

        // tree factor
        ctx.fillStyle = P.ink3;
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.fillText(`tree = ${s.tree}`, cxc, top + 116);

        // contribution
        ctx.fillStyle = P.vermDeep;
        ctx.font = "700 22px 'Fraunces', serif";
        ctx.fillText(`+${s.contribution}`, cxc, top + 150);
        ctx.fillStyle = P.ink3;
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.fillText('vertex×tree×d', cxc, top + 166);

        running += s.contribution;
      }
    }

    // running total
    ctx.textAlign = 'left';
    ctx.fillStyle = P.ink2;
    ctx.font = "600 13px 'JetBrains Mono', monospace";
    const totalLabel =
      revealed >= nSteps
        ? `total = 1 + 6 + 1 = ${ks.answer}`
        : `total = ${running} …`;
    ctx.fillText(totalLabel, 18, h - 16);

    if (revealed >= nSteps) {
      ctx.textAlign = 'right';
      ctx.fillStyle = P.sage;
      ctx.font = "italic 16px 'Fraunces', serif";
      ctx.fillText(`= ${ks.answer} closed walks`, w - 16, h - 14);
    }
  }
}
