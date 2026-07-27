import { Injectable } from '@angular/core';

import { Mat4, Vec3 } from '../classes/mat4.class';
import { Quat, Quaternion } from '../classes/quat.class';
import { RenderInstance } from '../interfaces/render-instance.interface';
import { Metaball } from './toilet-blob.service';
import {
  BLOB_BALL_MAX,
  BLOB_BALL_MIN,
  BOWL_INNER_RX,
  BOWL_INNER_RZ,
  CIGAR_LEN_MAX,
  CIGAR_LEN_MIN,
  CIGAR_THICK_MAX,
  CIGAR_THICK_MIN,
  CLOD_MESH_COUNT,
  DECAL_COLOR,
  DECAL_MAX,
  DECAL_MIN,
  DRIP_COUNT_MAX,
  DRIP_COUNT_MIN,
  DRIP_INTERVAL_MAX,
  DRIP_INTERVAL_MIN,
  DRIP_SIZE_MAX,
  DRIP_SIZE_MIN,
  DRIP_SLOWDOWN,
  FLIGHT_TIME,
  FLOOR_Y,
  GRAVITY,
  GRID_CELLS,
  GRID_RADIUS,
  HINGE_DAMP,
  HINGE_IMPULSE,
  HINGE_MAX_SWING,
  HINGE_SPRING,
  LID_HINGE,
  LID_REST_ANGLE,
  LID_RX,
  LID_RZ,
  LID_THICK,
  MAX_CLUMPS,
  MAX_DECALS,
  MAX_DRIPPERS,
  MAX_METABALLS,
  MAX_SLIDERS,
  MAX_STUCK,
  MUD_DARK,
  MUD_LIGHT,
  PEDESTAL_PROFILE,
  PEDESTAL_SCALE_Z,
  PILE_CREST,
  REPOSE,
  RIM_Y,
  SEAT_HINGE,
  SEAT_HOLE_RX,
  SEAT_HOLE_RZ,
  SEAT_REST_ANGLE,
  SEAT_RX,
  SEAT_RZ,
  SEAT_THICK,
  SLIDE_SPEED_MAX,
  SLIDE_SPEED_MIN,
  STUCK_MAX_SIZE,
  STUCK_MERGE_RADIUS,
  SUMP_Y,
  TANK_MAX,
  TANK_MIN,
  TRAIL_SPACING,
  WATER_LEVEL,
  WATER_RX,
  WATER_RZ,
} from '../constants/toilet-physics.constant';

type Triple = [number, number, number];

const OPENING = 0;
const RIM = 1;
const FLOOR = 2;
const DECAL_MESH = CLOD_MESH_COUNT;

interface Missile {
  readonly pos: Triple;
  readonly vel: Triple;
  quat: Quaternion;
  readonly spin: Triple;
  readonly scale: Triple;
  readonly meshIndex: number;
  readonly tint: Triple;
  readonly density: number;
  readonly brittleness: number;
  age: number;
}

interface Clump {
  readonly pos: Triple;
  readonly vel: Triple;
  quat: Quaternion;
  readonly spin: Triple;
  readonly scale: Triple;
  readonly meshIndex: number;
  readonly tint: Triple;
  resting: boolean;
  age: number;
}

interface Decal {
  readonly pos: Triple;
  readonly quat: Quaternion;
  readonly scale: number;
  readonly tint: Triple;
}

/** A flattened turd frozen in seat/lid-local space so it rides the plate's swing. */
interface StuckClump {
  readonly plate: 'seat' | 'lid';
  readonly local: Triple;
  readonly quat: Quaternion;
  readonly scale: Triple;
  readonly meshIndex: number;
  readonly tint: Triple;
}

/** A splat mass creeping down the exterior porcelain, congealing a gel trail behind it. */
interface WallSlider {
  readonly phi: number;
  y: number;
  trailAt: number;
  readonly speed: number;
  readonly size: number;
  readonly tint: Triple;
  readonly meshIndex: number;
}

/** A fresh splat that sheds goo droplets on its own clock ('world' = fixed point; seat/lid = plate-local point). */
interface Dripper {
  readonly kind: 'world' | 'seat' | 'lid';
  readonly pos: Triple;
  readonly tint: Triple;
  interval: number;
  next: number;
  remaining: number;
}

/** An impact that disturbs the water surface. */
export interface WaterImpact {
  readonly x: number;
  readonly z: number;
  readonly strength: number;
}

/**
 * Owns the flying cigar-shaped mud missiles and everything they leave behind:
 * tumbling clumps that pile via a height field (spilling over the rim onto the
 * floor), gel + stains stuck to the tank and the bowl's exterior porcelain,
 * turds stuck to the hinged seat + lid (riding their swing), and the hinge
 * dynamics themselves.
 */
@Injectable()
export class ToiletProjectilesService {
  private readonly missiles: Missile[] = [];
  private readonly clumps: Clump[] = [];
  private readonly decals: Decal[] = [];
  private readonly stuck: StuckClump[] = [];
  private readonly drippers: Dripper[] = [];
  private readonly sliders: WallSlider[] = [];
  private readonly metaballs: Metaball[] = [];
  private blobVersion = 0;
  private readonly cell = (2 * GRID_RADIUS) / GRID_CELLS;
  private readonly base = new Float32Array(GRID_CELLS * GRID_CELLS);
  private readonly top = new Float32Array(GRID_CELLS * GRID_CELLS);

  private seatAngle = SEAT_REST_ANGLE;
  private seatVel = 0;
  private lidAngle = LID_REST_ANGLE;
  private lidVel = 0;

  constructor() {
    this.initGrid();
  }

  public fire(from: Vec3, target: Vec3): void {
    const t = FLIGHT_TIME * (0.9 + Math.random() * 0.2);
    const tx = target[0] + (Math.random() - 0.5) * 0.08;
    const tz = target[2] + (Math.random() - 0.5) * 0.08;
    this.missiles.push({
      pos: [from[0], from[1], from[2]],
      vel: [(tx - from[0]) / t, (target[1] - from[1]) / t + 0.5 * GRAVITY * t, (tz - from[2]) / t],
      quat: Quat.random(),
      spin: this.randomSpin(7),
      scale: this.cigarScale(),
      meshIndex: Math.floor(Math.random() * CLOD_MESH_COUNT),
      tint: this.mudShade(Math.random()),
      density: 0.35 + Math.random() * 0.65,
      brittleness: Math.random(),
      age: 0,
    });
  }

  public step(dt: number): WaterImpact[] {
    const impacts: WaterImpact[] = [];
    this.stepMissiles(dt, impacts);
    this.stepClumps(dt);
    this.stepDrippers(dt);
    this.stepSliders(dt);
    this.stepHinges(dt);
    return impacts;
  }

  public getMetaballs(): readonly Metaball[] {
    return this.metaballs;
  }

  public getBlobVersion(): number {
    return this.blobVersion;
  }

  public getSeatAngle(): number {
    return this.seatAngle;
  }

  public getLidAngle(): number {
    return this.lidAngle;
  }

  public getInstances(): RenderInstance[] {
    const out: RenderInstance[] = [];
    for (const m of this.missiles) {
      out.push({ meshIndex: m.meshIndex, model: Mat4.compose(m.pos, m.quat, m.scale), color: m.tint, alpha: 1, cracks: 1 });
    }
    for (const c of this.clumps) {
      out.push({ meshIndex: c.meshIndex, model: Mat4.compose(c.pos, c.quat, c.scale), color: c.tint, alpha: 1, cracks: 1 });
    }
    for (const s of this.stuck) {
      out.push({ meshIndex: s.meshIndex, model: this.stuckModel(s), color: s.tint, alpha: 1, cracks: 1 });
    }
    for (const s of this.sliders) {
      out.push({ meshIndex: s.meshIndex, model: this.sliderModel(s), color: s.tint, alpha: 1, cracks: 0 });
    }
    for (const d of this.decals) {
      out.push({ meshIndex: DECAL_MESH, model: Mat4.compose(d.pos, d.quat, [d.scale, d.scale, d.scale]), color: d.tint, alpha: 0.92, cracks: 0 });
    }
    return out;
  }

  public clear(): void {
    this.missiles.length = 0;
    this.clumps.length = 0;
    this.decals.length = 0;
    this.stuck.length = 0;
    this.drippers.length = 0;
    this.sliders.length = 0;
    this.metaballs.length = 0;
    this.blobVersion++;
    this.top.set(this.base);
    this.seatAngle = SEAT_REST_ANGLE;
    this.lidAngle = LID_REST_ANGLE;
    this.seatVel = 0;
    this.lidVel = 0;
  }

  // --- Missiles --------------------------------------------------------------

  private stepMissiles(dt: number, impacts: WaterImpact[]): void {
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      this.integrate(m.pos, m.vel, dt);
      m.quat = Quat.integrate(m.quat, m.spin, dt);
      m.age += dt;
      if (this.resolveMissile(m, impacts)) {
        this.missiles.splice(i, 1);
      }
    }
  }

  private resolveMissile(m: Missile, impacts: WaterImpact[]): boolean {
    if (this.resolveStructureHit(m) || this.resolveSurfaceHit(m, impacts)) {
      return true;
    }
    return m.age > 4 || m.pos[1] < -0.5;
  }

  /** Seat, lid and tank: the missile splats onto whichever it struck. */
  private resolveStructureHit(m: Missile): boolean {
    if (this.hitsPlate(m.pos, SEAT_HINGE, this.seatAngle, SEAT_RX, SEAT_RZ, SEAT_HOLE_RX, SEAT_HOLE_RZ, true)) {
      this.splatOnPlate(m, 'seat');
      return true;
    }
    if (this.hitsPlate(m.pos, LID_HINGE, this.lidAngle, LID_RX, LID_RZ, 0, 0, false)) {
      this.splatOnPlate(m, 'lid');
      return true;
    }
    if (this.hitsTank(m.pos)) {
      this.splatOnTank(m);
      return true;
    }
    return false;
  }

  /** Exterior porcelain, else whatever the height field says is under the missile (funnel wall, pile, water, rim or floor). */
  private resolveSurfaceHit(m: Missile, impacts: WaterImpact[]): boolean {
    if (this.hitsPedestalSide(m.pos)) {
      this.splatOnSide(m);
      return true;
    }
    const inOpening = this.insideEllipse(m.pos, BOWL_INNER_RX, BOWL_INNER_RZ) <= 1;
    const surf = this.top[this.cellIndex(m.pos[0], m.pos[2])];
    if (m.pos[1] <= (inOpening ? Math.max(WATER_LEVEL, surf) : surf)) {
      this.recordSplash(m, impacts);
      this.shatterIntoBowl(m);
      return true;
    }
    return false;
  }

  /** Missile splats onto the hinged seat or lid: a flattened turd freezes in plate-local
   *  space (so it rides the swing instead of floating), plus a kick and loose crumbs. */
  private splatOnPlate(m: Missile, plate: 'seat' | 'lid'): void {
    const { hinge, angle, thick } = this.plateConfig(plate);
    const local = this.plateLocal(m.pos, hinge, angle);
    const scale: Triple = [m.scale[0], m.scale[1] * 0.5, m.scale[2]];
    const face = this.plateFaceSign(m.vel, angle);
    const at: Triple = [local[0], face * (thick / 2 + scale[1] * 0.4), local[2]];
    if (!this.mergeIntoStuck(plate, at, scale)) {
      this.stuck.push({
        plate,
        local: at,
        quat: this.layFlatQuat(scale),
        scale,
        meshIndex: m.meshIndex,
        tint: this.scaleColor(m.tint, 0.9),
      });
      while (this.stuck.length > MAX_STUCK) {
        this.stuck.shift();
      }
    }
    this.addDripper(plate, at, m.tint);
    this.kickHinge(plate);
    this.crumble(m);
  }

  /** A splat landing on an existing turd on the same plate face combines with it:
   *  the turd swells by the added volume and shifts toward the new impact. */
  private mergeIntoStuck(plate: 'seat' | 'lid', at: Triple, scale: Triple): boolean {
    const near = this.stuck.find(
      (s) =>
        s.plate === plate &&
        s.local[1] * at[1] > 0 &&
        Math.hypot(s.local[0] - at[0], s.local[2] - at[2]) < STUCK_MERGE_RADIUS,
    );
    if (!near) {
      return false;
    }
    const volNew = scale[0] * scale[1] * scale[2];
    const volOld = near.scale[0] * near.scale[1] * near.scale[2];
    const grow = Math.cbrt(1 + volNew / volOld);
    const w = volNew / (volOld + volNew);
    near.scale[0] = Math.min(STUCK_MAX_SIZE, near.scale[0] * grow);
    near.scale[1] = Math.min(STUCK_MAX_SIZE, near.scale[1] * grow);
    near.scale[2] = Math.min(STUCK_MAX_SIZE, near.scale[2] * grow);
    near.local[0] += (at[0] - near.local[0]) * w;
    near.local[2] += (at[2] - near.local[2]) * w;
    near.local[1] = Math.sign(near.local[1]) * (this.plateConfig(plate).thick / 2 + near.scale[1] * 0.4);
    return true;
  }

  /** Missile splats on the tank: gel sticks to the struck face with a stain, plus crumbs. */
  private splatOnTank(m: Missile): void {
    const n = this.tankNormal(m.pos);
    this.congeal(m.pos[0], m.pos[1], m.pos[2], this.meanScale(m.scale));
    this.spawnDecals(
      [m.pos[0] + n[0] * 0.012, m.pos[1] + n[1] * 0.012, m.pos[2] + n[2] * 0.012],
      n,
      [...DECAL_COLOR] as Triple,
      2,
    );
    this.addDripper('world', [m.pos[0] + n[0] * 0.02, m.pos[1] + n[1] * 0.02, m.pos[2] + n[2] * 0.02], m.tint);
    this.crumble(m);
  }

  /** Missile buries into the exterior porcelain: gel sticks with a stain, then the
   *  mass creeps down the wall trailing brown, plus crumbs. */
  private splatOnSide(m: Missile): void {
    const { p, n } = this.sideContact(m.pos);
    this.congeal(p[0], p[1], p[2], this.meanScale(m.scale));
    this.spawnDecals([p[0] + n[0] * 0.012, p[1], p[2] + n[2] * 0.012], n, [...DECAL_COLOR] as Triple, 2);
    this.addDripper('world', [p[0] + n[0] * 0.02, p[1], p[2] + n[2] * 0.02], m.tint);
    this.spawnSlider(p, this.meanScale(m.scale), m.tint, m.meshIndex);
    this.crumble(m);
  }

  /** Missile hits porcelain (rim/tank): break into crumbs that fall off and settle. */
  private crumble(m: Missile): void {
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      this.clumps.push(this.makeFallingClump(m, true));
    }
    this.capClumps();
  }

  private recordSplash(m: Missile, impacts: WaterImpact[]): void {
    if (m.pos[1] <= WATER_LEVEL + 0.04 && this.insideEllipse(m.pos, WATER_RX, WATER_RZ) <= 1.2) {
      impacts.push({ x: m.pos[0], z: m.pos[2], strength: 0.4 + m.density * 1.1 });
    }
  }

  private shatterIntoBowl(m: Missile): void {
    const shatter = Math.random() < m.brittleness;
    const count = shatter ? 3 + Math.round(m.brittleness * 6) : 1;
    for (let i = 0; i < count; i++) {
      this.clumps.push(this.makeFallingClump(m, shatter));
    }
    this.capClumps();
  }

  private makeFallingClump(m: Missile, shatter: boolean): Clump {
    const k = shatter ? 0.45 + Math.random() * 0.3 : 0.92;
    const shade = shatter ? 1 + Math.random() * 0.2 : 0.82 + Math.random() * 0.12;
    const angle = Math.random() * Math.PI * 2;
    const spread = shatter ? 0.15 + Math.random() * 0.25 : 0.05;
    const up = shatter ? 0.1 + Math.random() * 0.4 : -0.15;
    return {
      pos: [m.pos[0] + (Math.random() - 0.5) * 0.03, m.pos[1], m.pos[2] + (Math.random() - 0.5) * 0.03],
      vel: [Math.cos(angle) * spread, up, Math.sin(angle) * spread],
      quat: Quat.random(),
      spin: this.randomSpin(9),
      scale: [m.scale[0] * k, m.scale[1] * k, m.scale[2] * k],
      meshIndex: m.meshIndex,
      tint: this.scaleColor(m.tint, shade),
      resting: false,
      age: 0,
    };
  }

  // --- Clumps ----------------------------------------------------------------

  private stepClumps(dt: number): void {
    for (let i = this.clumps.length - 1; i >= 0; i--) {
      const c = this.clumps[i];
      c.age += dt;
      this.integrate(c.pos, c.vel, dt);
      c.quat = Quat.integrate(c.quat, c.spin, dt);
      // Congeal on a wall or on landing, or drop any clump that never settled so nothing hangs in the air.
      if (this.clumpHitsSide(c) || this.landOnPile(c) || c.age > 2.5 || c.pos[1] < -0.4) {
        this.clumps.splice(i, 1);
      }
    }
  }

  /** Returns true when the clump has congealed into the blob (and should be dropped). */
  private landOnPile(c: Clump): boolean {
    const type = this.cellType(c.pos[0], c.pos[2]);
    const surf = this.top[this.cellIndex(c.pos[0], c.pos[2])];
    const rep = (c.scale[0] + c.scale[1] + c.scale[2]) / 3;

    if (type === RIM || (type === OPENING && surf >= PILE_CREST)) {
      if (Math.hypot(c.vel[0], c.vel[2]) < 0.25) {
        this.spillOutward(c);
      }
      return false;
    }
    if (c.pos[1] <= surf + rep * 0.6) {
      this.congeal(c.pos[0], surf + rep * 0.6, c.pos[2], rep);
      this.depositDownhill(c.pos[0], c.pos[2], rep * 1.2);
      return true;
    }
    return false;
  }

  /** One outward-and-down kick so the clump arcs over the rim and falls to the floor. */
  private spillOutward(c: Clump): void {
    const r = Math.hypot(c.pos[0], c.pos[2]) || 1;
    c.vel[0] = (c.pos[0] / r) * 0.4;
    c.vel[1] = -0.5;
    c.vel[2] = (c.pos[2] / r) * 0.4;
  }

  /** Adds a metaball to the congealed field; spatters a floor stain if it landed on the floor. */
  private congeal(x: number, y: number, z: number, rep: number): void {
    const r = Math.min(BLOB_BALL_MAX, Math.max(BLOB_BALL_MIN, rep * 1.7));
    this.metaballs.push({ x, y, z, r });
    if (this.metaballs.length > MAX_METABALLS) {
      this.metaballs.shift();
    }
    this.blobVersion++;
    if (y < 0.12 && Math.random() < 0.35) {
      this.spawnDecals([x, FLOOR_Y + 0.008, z], [0, 1, 0], [...DECAL_COLOR] as Triple, 1);
    }
  }

  // --- Goo drips -------------------------------------------------------------

  /** Registers a fresh splat as a drip source with its own cadence and supply. */
  private addDripper(kind: 'world' | 'seat' | 'lid', pos: Triple, tint: Triple): void {
    const interval = this.rand(DRIP_INTERVAL_MIN, DRIP_INTERVAL_MAX);
    this.drippers.push({
      kind,
      pos,
      tint,
      interval,
      next: interval * this.rand(0.2, 1),
      remaining: Math.round(this.rand(DRIP_COUNT_MIN, DRIP_COUNT_MAX)),
    });
    while (this.drippers.length > MAX_DRIPPERS) {
      this.drippers.shift();
    }
  }

  /** Each source drips on its own clock, slowing as it dries out. */
  private stepDrippers(dt: number): void {
    for (let i = this.drippers.length - 1; i >= 0; i--) {
      const d = this.drippers[i];
      d.next -= dt;
      if (d.next > 0) {
        continue;
      }
      this.spawnDroplet(d);
      d.interval *= DRIP_SLOWDOWN;
      d.next = d.interval;
      if (--d.remaining <= 0) {
        this.drippers.splice(i, 1);
      }
    }
  }

  /** A droplet is a tiny elongated clump that falls and congeals wherever it lands. */
  private spawnDroplet(d: Dripper): void {
    const at = d.kind === 'world' ? d.pos : this.plateWorld(d.kind, d.pos);
    const t = this.rand(DRIP_SIZE_MIN, DRIP_SIZE_MAX);
    this.clumps.push({
      pos: [at[0] + (Math.random() - 0.5) * 0.015, at[1] - 0.01, at[2] + (Math.random() - 0.5) * 0.015],
      vel: [(Math.random() - 0.5) * 0.04, -0.05, (Math.random() - 0.5) * 0.04],
      quat: Quat.identity(),
      spin: [0, 0, 0],
      scale: [t, t * 2.4, t],
      meshIndex: Math.floor(Math.random() * CLOD_MESH_COUNT),
      tint: this.scaleColor(d.tint, 0.8),
      resting: false,
      age: 0,
    });
    this.capClumps();
  }

  // --- Seat / lid hinge dynamics --------------------------------------------

  private stepHinges(dt: number): void {
    const seat = this.stepHinge(this.seatAngle, this.seatVel, SEAT_REST_ANGLE, dt);
    this.seatAngle = seat[0];
    this.seatVel = seat[1];
    const lid = this.stepHinge(this.lidAngle, this.lidVel, LID_REST_ANGLE, dt);
    this.lidAngle = lid[0];
    this.lidVel = lid[1];
    this.resolveLidSeatContact();
  }

  /**
   * The lid hangs behind the seat and must never sweep through it. Keep at least
   * their rest-angle separation: on contact, split the overlap symmetrically and
   * share velocity (inelastic), so a struck lid shoves the seat along with it.
   * The mid-split stays inside both rest/max clamps because the swing ranges are
   * offset by exactly this gap.
   */
  private resolveLidSeatContact(): void {
    const gap = SEAT_REST_ANGLE - LID_REST_ANGLE;
    if (this.seatAngle - this.lidAngle >= gap) {
      return;
    }
    const mid = (this.seatAngle + this.lidAngle) / 2;
    this.seatAngle = mid + gap / 2;
    this.lidAngle = mid - gap / 2;
    const v = (this.seatVel + this.lidVel) / 2;
    this.seatVel = v;
    this.lidVel = v;
  }

  private stepHinge(angle: number, vel: number, rest: number, dt: number): [number, number] {
    vel += (-HINGE_SPRING * (angle - rest) - HINGE_DAMP * vel) * dt;
    angle += vel * dt;
    if (angle < rest) {
      angle = rest;
      vel = vel < 0 ? -vel * 0.3 : vel;
    } else if (angle > rest + HINGE_MAX_SWING) {
      angle = rest + HINGE_MAX_SWING;
      vel = vel > 0 ? -vel * 0.3 : vel;
    }
    return [angle, vel];
  }

  private hitsPlate(
    pos: Triple,
    hinge: Vec3,
    angle: number,
    rx: number,
    rz: number,
    holeRx: number,
    holeRz: number,
    hasHole: boolean,
  ): boolean {
    const [px, ly, lz] = this.plateLocal(pos, hinge, angle);
    if (ly > 0.03 || ly < -0.22) {
      return false;
    }
    if ((px / rx) ** 2 + ((lz - rz) / rz) ** 2 > 1) {
      return false;
    }
    if (hasHole && (px / holeRx) ** 2 + ((lz - rz) / holeRz) ** 2 < 1) {
      return false;
    }
    return true;
  }

  private plateConfig(plate: 'seat' | 'lid'): { hinge: Vec3; angle: number; thick: number } {
    if (plate === 'seat') {
      return { hinge: SEAT_HINGE, angle: this.seatAngle, thick: SEAT_THICK };
    }
    return { hinge: LID_HINGE, angle: this.lidAngle, thick: LID_THICK };
  }

  /** World point expressed in hinge-local plate space (hinge on local X, plate extending +z when flat). */
  private plateLocal(pos: Triple, hinge: Vec3, angle: number): Triple {
    const px = pos[0] - hinge[0];
    const py = pos[1] - hinge[1];
    const pz = pos[2] - hinge[2];
    const c = Math.cos(-angle);
    const s = Math.sin(-angle);
    return [px, py * c - pz * s, py * s + pz * c];
  }

  /** Which plate face (local ±y) the missile is striking, from its motion in plate space. */
  private plateFaceSign(vel: Triple, angle: number): number {
    const lvy = vel[1] * Math.cos(angle) + vel[2] * Math.sin(angle);
    return lvy > 0 ? -1 : 1;
  }

  private kickHinge(plate: 'seat' | 'lid'): void {
    const kick = HINGE_IMPULSE * (0.6 + Math.random() * 0.6);
    if (plate === 'seat') {
      this.seatVel += kick;
    } else {
      this.lidVel += kick;
    }
  }

  /** World transform of a plate-stuck turd: the renderer's hinge model (rotation about X at the hinge) applied to its local pose. */
  private stuckModel(s: StuckClump): Float32Array {
    const { angle } = this.plateConfig(s.plate);
    const pos = this.plateWorld(s.plate, s.local);
    return Mat4.compose(pos, Quat.multiply(Quat.fromAxisAngle(1, 0, 0, angle), s.quat), s.scale);
  }

  /** Plate-local point → world, using the plate's current hinge angle. */
  private plateWorld(plate: 'seat' | 'lid', local: Triple): Triple {
    const { hinge, angle } = this.plateConfig(plate);
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
      hinge[0] + local[0],
      hinge[1] + local[1] * c - local[2] * s,
      hinge[2] + local[1] * s + local[2] * c,
    ];
  }

  // --- Height field ----------------------------------------------------------

  private initGrid(): void {
    for (let gz = 0; gz < GRID_CELLS; gz++) {
      for (let gx = 0; gx < GRID_CELLS; gx++) {
        const x = -GRID_RADIUS + (gx + 0.5) * this.cell;
        const z = -GRID_RADIUS + (gz + 0.5) * this.cell;
        this.base[gz * GRID_CELLS + gx] = this.baseHeight(x, z);
      }
    }
    this.top.set(this.base);
  }

  /** Honest ground height: funnel inside the opening, a solid plateau only over the
   *  pedestal's floor footprint, and real floor under the bowl's overhang (the lip
   *  itself is handled by the exterior-wall collision, not the height field). */
  private baseHeight(x: number, z: number): number {
    const e = this.insideEllipse([x, 0, z], BOWL_INNER_RX, BOWL_INNER_RZ);
    if (e <= 1) {
      return SUMP_Y + (RIM_Y - SUMP_Y) * e;
    }
    return this.insidePedestalFootprint(x, z) ? RIM_Y : FLOOR_Y;
  }

  private cellType(x: number, z: number): number {
    if (this.insideEllipse([x, 0, z], BOWL_INNER_RX, BOWL_INNER_RZ) <= 1) {
      return OPENING;
    }
    return this.insidePedestalFootprint(x, z) ? RIM : FLOOR;
  }

  private insidePedestalFootprint(x: number, z: number): boolean {
    const r = this.pedestalRadius(FLOOR_Y + 0.01);
    return this.insideEllipse([x, 0, z], r, r * PEDESTAL_SCALE_Z) <= 1;
  }

  /** Mud sticks where it lands, then avalanches anything steeper than the angle
   *  of repose, so the pile grows as a cone instead of levelling out flat. */
  private depositDownhill(x: number, z: number, amount: number): void {
    const gx = this.gridCoord(x + GRID_RADIUS);
    const gz = this.gridCoord(z + GRID_RADIUS);
    this.top[gz * GRID_CELLS + gx] += amount;
    for (let sweep = 0; sweep < 8; sweep++) {
      if (!this.avalanche(gx, gz)) {
        return;
      }
    }
  }

  /** One relaxation sweep over the cells around a deposit; true if any mud moved. */
  private avalanche(gx0: number, gz0: number): boolean {
    let moved = false;
    for (let gz = Math.max(0, gz0 - 6); gz <= Math.min(GRID_CELLS - 1, gz0 + 6); gz++) {
      for (let gx = Math.max(0, gx0 - 6); gx <= Math.min(GRID_CELLS - 1, gx0 + 6); gx++) {
        moved = this.shedExcess(gx, gz) || moved;
      }
    }
    return moved;
  }

  /** Sheds half the over-repose excess of a mud-bearing cell onto its lowest
   *  neighbour (never digging below the porcelain base). */
  private shedExcess(gx: number, gz: number): boolean {
    const i = gz * GRID_CELLS + gx;
    if (!this.canAvalanche(i)) {
      return false;
    }
    const lowest = this.lowestNeighbor(gx, gz);
    if (!lowest) {
      return false;
    }
    const move = Math.min((this.top[i] - lowest.h - REPOSE * this.cell) / 2, this.top[i] - this.base[i]);
    if (move <= 0.0005) {
      return false;
    }
    this.top[i] -= move;
    this.top[lowest.gz * GRID_CELLS + lowest.gx] += move;
    return true;
  }

  /** Funnel and floor cells avalanche; the rim plateau holds its mud (else it would
   *  drain straight off the edge to the floor). */
  private canAvalanche(i: number): boolean {
    return this.base[i] < RIM_Y - 0.001;
  }

  private lowestNeighbor(gx: number, gz: number): { gx: number; gz: number; h: number } | null {
    const options = [
      { gx: gx - 1, gz },
      { gx: gx + 1, gz },
      { gx, gz: gz - 1 },
      { gx, gz: gz + 1 },
    ];
    let best: { gx: number; gz: number; h: number } | null = null;
    for (const o of options) {
      if (o.gx < 0 || o.gx >= GRID_CELLS || o.gz < 0 || o.gz >= GRID_CELLS) {
        continue;
      }
      const h = this.top[o.gz * GRID_CELLS + o.gx];
      if (!best || h < best.h) {
        best = { gx: o.gx, gz: o.gz, h };
      }
    }
    return best;
  }

  private cellIndex(x: number, z: number): number {
    return this.gridCoord(z + GRID_RADIUS) * GRID_CELLS + this.gridCoord(x + GRID_RADIUS);
  }

  private gridCoord(v: number): number {
    return Math.min(GRID_CELLS - 1, Math.max(0, Math.floor(v / this.cell)));
  }

  // --- Tank collision --------------------------------------------------------

  private hitsTank(pos: Triple): boolean {
    return (
      pos[0] >= TANK_MIN[0] && pos[0] <= TANK_MAX[0] &&
      pos[1] >= TANK_MIN[1] && pos[1] <= TANK_MAX[1] &&
      pos[2] >= TANK_MIN[2] && pos[2] <= TANK_MAX[2]
    );
  }

  private tankNormal(pos: Triple): Triple {
    const d = [TANK_MAX[0] - pos[0], pos[0] - TANK_MIN[0], TANK_MAX[1] - pos[1], pos[1] - TANK_MIN[1], TANK_MAX[2] - pos[2], pos[2] - TANK_MIN[2]];
    let min = 0;
    for (let i = 1; i < 6; i++) {
      if (d[i] < d[min]) min = i;
    }
    return ([[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as Triple[])[min];
  }

  // --- Exterior porcelain (bowl sides / pedestal) ----------------------------

  /** Exterior silhouette x-radius at height y (0 above the rim lip or below the base). */
  private pedestalRadius(y: number): number {
    const profile = PEDESTAL_PROFILE;
    if (y <= profile[0][0] || y >= profile[profile.length - 1][0]) {
      return 0;
    }
    for (let i = 1; i < profile.length; i++) {
      if (y <= profile[i][0]) {
        const t = (y - profile[i - 1][0]) / (profile[i][0] - profile[i - 1][0]);
        return profile[i - 1][1] + (profile[i][1] - profile[i - 1][1]) * t;
      }
    }
    return 0;
  }

  /** Point is buried in the toilet's exterior shell (and not in the bowl's interior airspace). */
  private hitsPedestalSide(pos: Triple): boolean {
    const r = this.pedestalRadius(pos[1]);
    if (r <= 0 || this.insideEllipse(pos, r, r * PEDESTAL_SCALE_Z) > 1) {
      return false;
    }
    return !this.insideBowlCavity(pos);
  }

  /** Interior airspace of the bowl: inside the opening and above the funnel wall. */
  private insideBowlCavity(pos: Triple): boolean {
    const e = this.insideEllipse(pos, BOWL_INNER_RX, BOWL_INNER_RZ);
    return e <= 1 && pos[1] >= SUMP_Y + (RIM_Y - SUMP_Y) * e;
  }

  /** Radial projection of a buried point onto the exterior surface, with its outward normal. */
  private sideContact(pos: Triple): { readonly p: Triple; readonly n: Triple } {
    const r = this.pedestalRadius(pos[1]);
    const e = Math.sqrt(this.insideEllipse(pos, r, r * PEDESTAL_SCALE_Z)) || 1;
    const p: Triple = [pos[0] / e, pos[1], pos[2] / e];
    const nx = p[0] / (r * r);
    const nz = p[2] / (r * PEDESTAL_SCALE_Z) ** 2;
    const l = Math.hypot(nx, nz) || 1;
    return { p, n: [nx / l, 0, nz / l] };
  }

  /** A clump striking the exterior porcelain sticks and starts sliding down it.
   *  In the lip band even straight falls stick (the rim edge is wall, not height
   *  field); lower down only inward movers stick, so outward rim spill still arcs
   *  to the floor. */
  private clumpHitsSide(c: Clump): boolean {
    if (!this.hitsPedestalSide(c.pos)) {
      return false;
    }
    const { p, n } = this.sideContact(c.pos);
    const dot = c.vel[0] * n[0] + c.vel[2] * n[2];
    if (dot >= (c.pos[1] > RIM_Y - 0.08 ? 0.05 : -0.05)) {
      return false;
    }
    this.spawnSlider(p, this.meanScale(c.scale), c.tint, c.meshIndex);
    return true;
  }

  /** Sticks a mass to the wall that creeps toward the ground, congealing a trail. */
  private spawnSlider(p: Triple, size: number, tint: Triple, meshIndex: number): void {
    const r = this.pedestalRadius(p[1]) || 1;
    this.sliders.push({
      phi: Math.atan2(p[2] / (r * PEDESTAL_SCALE_Z), p[0] / r),
      y: p[1],
      trailAt: p[1] - TRAIL_SPACING * 0.5,
      speed: this.rand(SLIDE_SPEED_MIN, SLIDE_SPEED_MAX),
      size: Math.min(0.11, size),
      tint: this.scaleColor(tint, 0.85),
      meshIndex,
    });
    while (this.sliders.length > MAX_SLIDERS) {
      this.sliders.shift();
    }
  }

  /** Sliders creep down the porcelain congealing a gel trail; at the ground the mass joins the floor pile. */
  private stepSliders(dt: number): void {
    for (let i = this.sliders.length - 1; i >= 0; i--) {
      const s = this.sliders[i];
      s.y -= s.speed * dt;
      if (s.y <= s.trailAt) {
        const p = this.wallPoint(s.phi, s.y);
        this.congeal(p[0], p[1], p[2], s.size * 0.8);
        s.trailAt = s.y - TRAIL_SPACING;
      }
      if (s.y <= FLOOR_Y + 0.02) {
        const p = this.wallPoint(s.phi, FLOOR_Y + 0.02);
        this.congeal(p[0], p[1], p[2], Math.max(s.size, 0.06));
        this.sliders.splice(i, 1);
      }
    }
  }

  /** Point on the exterior silhouette at angular parameter phi and height y. */
  private wallPoint(phi: number, y: number): Triple {
    const r = this.pedestalRadius(y);
    return [r * Math.cos(phi), y, r * PEDESTAL_SCALE_Z * Math.sin(phi)];
  }

  /** The sliding smear, proud of the wall and stretched down it. */
  private sliderModel(s: WallSlider): Float32Array {
    const { p, n } = this.sideContact(this.wallPoint(s.phi, s.y));
    return Mat4.compose(
      [p[0] + n[0] * 0.008, p[1], p[2] + n[2] * 0.008],
      Quat.identity(),
      [s.size, s.size * 1.6, s.size],
    );
  }

  // --- Decals ----------------------------------------------------------------

  private spawnDecals(center: Triple, normal: Vec3, tint: Triple, count: number): void {
    const tangent = this.anyTangent(normal);
    const bitangent = this.cross(normal, tangent);
    for (let i = 0; i < count; i++) {
      const u = (Math.random() - 0.5) * 0.05;
      const v = (Math.random() - 0.5) * 0.05;
      const roll = Quat.fromAxisAngle(normal[0], normal[1], normal[2], Math.random() * Math.PI * 2);
      const align = Quat.fromUnitVectors([0, 1, 0], normal);
      this.decals.push({
        pos: [
          center[0] + tangent[0] * u + bitangent[0] * v + normal[0] * 0.006,
          center[1] + tangent[1] * u + bitangent[1] * v + normal[1] * 0.006,
          center[2] + tangent[2] * u + bitangent[2] * v + normal[2] * 0.006,
        ],
        quat: Quat.multiply(roll, align),
        scale: DECAL_MIN + Math.random() * (DECAL_MAX - DECAL_MIN),
        tint: this.scaleColor([...DECAL_COLOR] as Triple, 0.85 + Math.random() * 0.4),
      });
    }
    while (this.decals.length > MAX_DECALS) {
      this.decals.shift();
    }
  }

  // --- Orientation helpers ---------------------------------------------------

  private layFlatQuat(scale: Triple): Quaternion {
    const align = Quat.fromUnitVectors(this.smallestAxis(scale), [0, 1, 0]);
    const yaw = Quat.fromAxisAngle(0, 1, 0, Math.random() * Math.PI * 2);
    return Quat.normalize(Quat.multiply(yaw, align));
  }

  private smallestAxis(scale: Triple): Triple {
    if (scale[1] <= scale[0] && scale[1] <= scale[2]) return [0, 1, 0];
    if (scale[0] <= scale[1] && scale[0] <= scale[2]) return [1, 0, 0];
    return [0, 0, 1];
  }

  private anyTangent(n: Vec3): Triple {
    const ref: Triple = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const t = this.cross(n, ref);
    const l = Math.hypot(t[0], t[1], t[2]) || 1;
    return [t[0] / l, t[1] / l, t[2] / l];
  }

  private cross(a: Vec3, b: Vec3): Triple {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }

  // --- Shared helpers --------------------------------------------------------

  private capClumps(): void {
    while (this.clumps.length > MAX_CLUMPS) {
      this.clumps.shift();
    }
  }

  private meanScale(scale: Triple): number {
    return (scale[0] + scale[1] + scale[2]) / 3;
  }

  private integrate(pos: Triple, vel: Triple, dt: number): void {
    vel[1] -= GRAVITY * dt;
    pos[0] += vel[0] * dt;
    pos[1] += vel[1] * dt;
    pos[2] += vel[2] * dt;
  }

  private insideEllipse(pos: Triple, rx: number, rz: number): number {
    return (pos[0] / rx) * (pos[0] / rx) + (pos[2] / rz) * (pos[2] / rz);
  }

  private cigarScale(): Triple {
    const len = this.rand(CIGAR_LEN_MIN, CIGAR_LEN_MAX);
    const t = this.rand(CIGAR_THICK_MIN, CIGAR_THICK_MAX);
    return [len, t, t * this.rand(0.75, 1.25)];
  }

  private randomSpin(rate: number): Triple {
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(2 * Math.random() - 1);
    const r = rate * (0.4 + Math.random() * 0.6);
    return [Math.sin(b) * Math.cos(a) * r, Math.sin(b) * Math.sin(a) * r, Math.cos(b) * r];
  }

  private mudShade(t: number): Triple {
    return [
      MUD_DARK[0] + (MUD_LIGHT[0] - MUD_DARK[0]) * t,
      MUD_DARK[1] + (MUD_LIGHT[1] - MUD_DARK[1]) * t,
      MUD_DARK[2] + (MUD_LIGHT[2] - MUD_DARK[2]) * t,
    ];
  }

  private scaleColor(color: Triple, factor: number): Triple {
    return [Math.min(1, color[0] * factor), Math.min(1, color[1] * factor), Math.min(1, color[2] * factor)];
  }

  private rand(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}
