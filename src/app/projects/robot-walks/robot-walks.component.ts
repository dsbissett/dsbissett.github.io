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
}
