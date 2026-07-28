import { Vec3 } from '../classes/mat4.class';

/** Scene gravity (world units / s²). Tuned for the ~0.5-unit-tall toilet. */
export const GRAVITY = 3.2;

/** Resting height of the water pool inside the bowl. */
export const WATER_LEVEL = 0.42;
export const WATER_RX = 0.23;
export const WATER_RZ = 0.31;

/** Bowl opening ellipse at the rim; between this and the outer ellipse is porcelain rim. */
export const BOWL_INNER_RX = 0.27;
export const BOWL_INNER_RZ = 0.36;
export const BOWL_OUTER_RX = 0.46;
export const BOWL_OUTER_RZ = 0.62;

/** Rim height, sump (bowl bottom) and floor heights. */
export const RIM_Y = 0.5;
export const SUMP_Y = 0.33;
export const FLOOR_Y = 0.03;

/**
 * Exterior silhouette of the bowl + pedestal as [y, xRadius] pairs (z radius is
 * xRadius · PEDESTAL_SCALE_Z), mirroring buildBowl's revolution profile.
 */
export const PEDESTAL_PROFILE: readonly (readonly [number, number])[] = [
  [0.0, 0.32],
  [0.04, 0.35],
  [0.12, 0.33],
  [0.22, 0.3],
  [0.3, 0.32],
  [0.38, 0.37],
  [0.44, 0.4],
  [0.47, 0.435],
  [0.49, 0.445],
  [0.517, 0.4],
];
export const PEDESTAL_SCALE_Z = 1.35;

/** Cigar clod dimensions: long axis (length) and the two thin cross axes. */
export const CIGAR_LEN_MIN = 0.09;
export const CIGAR_LEN_MAX = 0.2;
export const CIGAR_THICK_MIN = 0.028;
export const CIGAR_THICK_MAX = 0.05;

/** Number of distinct lumpy clod meshes generated at startup. */
export const CLOD_MESH_COUNT = 6;

/** Mud shades: every clod is a random lerp between these two browns. */
export const MUD_DARK: readonly [number, number, number] = [0.2, 0.12, 0.05];
export const MUD_LIGHT: readonly [number, number, number] = [0.52, 0.38, 0.22];

/** Hard caps on persisted clumps and splatter decals (oldest dropped past these). */
export const MAX_CLUMPS = 2000;
export const MAX_DECALS = 300;

/** Hard cap on turds stuck to the seat / lid plates (oldest dropped). */
export const MAX_STUCK = 200;

/** Plate splats within this range of an existing stuck turd absorb into it (they combine). */
export const STUCK_MERGE_RADIUS = 0.12;
export const STUCK_MAX_SIZE = 0.3;

/** Wall sliders: splats on the exterior porcelain creep down it, congealing a trail. */
export const SLIDE_SPEED_MIN = 0.025;
export const SLIDE_SPEED_MAX = 0.07;
export const TRAIL_SPACING = 0.055;
export const MAX_SLIDERS = 60;

/** Goo drips: fresh splats shed droplets, each source with its own cadence and supply. */
export const DRIP_INTERVAL_MIN = 0.35;
export const DRIP_INTERVAL_MAX = 2.2;
export const DRIP_SLOWDOWN = 1.25;
export const DRIP_COUNT_MIN = 3;
export const DRIP_COUNT_MAX = 9;
export const DRIP_SIZE_MIN = 0.012;
export const DRIP_SIZE_MAX = 0.024;
export const MAX_DRIPPERS = 120;

/** Wet-brown splatter decal colour and size (small stains on the porcelain). */
export const DECAL_COLOR: readonly [number, number, number] = [0.26, 0.15, 0.07];
export const DECAL_MIN = 0.025;
export const DECAL_MAX = 0.06;

/**
 * Accumulation height field over the bowl + floor. REPOSE is the max height step
 * between neighbouring cells (× cell size) before mud avalanches — it sets the
 * cone slope of the growing pile.
 */
export const GRID_RADIUS = 1.7;
export const GRID_CELLS = 72;
export const REPOSE = 0.9;

/** The bowl pile may crest this far above the rim before slow clumps spill to the floor. */
export const PILE_CREST = RIM_Y + 0.14;

/**
 * Congealed gel blob: settled mud becomes metaballs; a surface-net isosurface over
 * this voxel region merges them into one glossy gelatinous mass.
 */
export const BLOB_MIN: Vec3 = [-1.7, 0.02, -1.7];
export const BLOB_MAX: Vec3 = [1.7, 1.0, 1.7];
export const BLOB_CELL = 0.045;
export const BLOB_ISO = 0.42;
export const BLOB_BALL_MIN = 0.11;
export const BLOB_BALL_MAX = 0.16;
export const BLOB_COLOR: readonly [number, number, number] = [0.3, 0.18, 0.08];
export const BLOB_ALPHA = 1;
export const MAX_METABALLS = 1600;
export const BLOB_REBUILD_MS = 130;

/** Tank collision box (AABB) — mud splats on it instead of clipping through. */
export const TANK_MIN: Vec3 = [-0.37, 0.5, -0.58];
export const TANK_MAX: Vec3 = [0.37, 0.91, -0.26];

/** Seat (front, with a hole) — hinged plate. Built flat, hinge edge on local X at z=0. */
export const SEAT_HINGE: Vec3 = [0, 0.5, -0.11];
export const SEAT_REST_ANGLE = -1.71;
export const SEAT_RX = 0.37;
export const SEAT_RZ = 0.5;
export const SEAT_HOLE_RX = 0.22;
export const SEAT_HOLE_RZ = 0.33;
export const SEAT_THICK = 0.03;

/** Lid (behind the seat) — hinged plate, solid. */
export const LID_HINGE: Vec3 = [0, 0.5, -0.15];
export const LID_REST_ANGLE = -1.745;
export const LID_RX = 0.39;
export const LID_RZ = 0.52;
export const LID_THICK = 0.04;

/** Hinge dynamics: spring back to rest, damping, per-hit kick, and swing range. */
export const HINGE_SPRING = 34;
export const HINGE_DAMP = 3.6;
export const HINGE_IMPULSE = 3.2;
export const HINGE_MAX_SWING = 1.3;

/** Ballistic flight time from launch point to the bowl (s). */
export const FLIGHT_TIME = 0.44;

/**
 * Aiming behind this z means the shot must clear the upright seat/lid wall: the
 * flight time stretches (a high mortar lob) until the arc passes LOFT_CLEAR_Y at
 * the lid plane, capped at LOFT_MAX_TIME (aims at the toilet itself stay blocked).
 */
export const LOFT_CLEAR_Z = -0.3;
export const LOFT_CLEAR_Y = 1.65;
export const LOFT_MAX_TIME = 1.9;

/** Minimum gap between shots while the spacebar is held (ms). */
export const FIRE_INTERVAL_MS = 120;

/** Fixed launch point a few feet in front of the toilet (bowl faces +Z), aimed at the bowl. */
export const LAUNCH_POSITION: Vec3 = [0, 1.15, 1.7];
export const LAUNCH_TARGET: Vec3 = [0, 0.5, 0.02];

/** Translucency of the water surface. */
export const WATER_ALPHA = 0.86;

/** Flies: one appears per this much settled bowl mud (world units³), up to the cap. */
export const FLY_PER_MUD = 0.0012;
export const MAX_FLIES = 24;

/** Arrow-key aim: sweep speed (units/s) and how far the stream can be steered (well past the toilet in every direction). */
export const AIM_SPEED = 1.4;
export const AIM_LIMIT_X = 1.6;
export const AIM_LIMIT_Z = 1.5;
