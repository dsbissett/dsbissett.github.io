export const projectCategories = ['AI', 'Games', 'Simulations', 'Creative', 'Tools'] as const;

export type ProjectCategory = (typeof projectCategories)[number];

export type ProjectPreviewStyle =
  | 'ai'
  | 'terminal'
  | 'cloth'
  | 'flappy'
  | 'fluid'
  | 'heat'
  | 'pid'
  | 'piano'
  | 'particle'
  | 'tetris'
  | 'dragon';

export interface ProjectDefinition {
  path: string;
  title: string;
  summary: string;
  tags: readonly string[];
  accent: 'aqua' | 'sun' | 'vio' | 'lime' | 'hot';
  icon: string;
  category: ProjectCategory;
  featured?: boolean;
  previewStyle: ProjectPreviewStyle;
  previewKicker: string;
  previewValue: string;
  previewTags: readonly string[];
}

export const projectDefinitions: readonly ProjectDefinition[] = [
  {
    path: 'ai-chat',
    title: 'AI Chat',
    summary: 'A playground for prompt engineering, models, and LLM experiments.',
    tags: ['AI', 'LLM'],
    accent: 'aqua',
    icon: 'AI',
    category: 'AI',
    featured: true,
    previewStyle: 'ai',
    previewKicker: 'Conversation Lab',
    previewValue: 'PROMPT STACK',
    previewTags: ['Modes', 'Tools', 'Experiments'],
  },
  {
    path: 'terminal',
    title: 'Terminal',
    summary: 'A retro command-line playground with secrets, shortcuts, and glow.',
    tags: ['CLI', 'Retro'],
    accent: 'lime',
    icon: '>_',
    category: 'Tools',
    previewStyle: 'terminal',
    previewKicker: 'Command Surface',
    previewValue: 'SECRET ROUTES',
    previewTags: ['Shell', 'Glow', 'Easter Eggs'],
  },
  {
    path: 'cloth',
    title: 'Cloth',
    summary: 'Physics simulation with Verlet integration, constraints, and tearing.',
    tags: ['Physics', 'Sim'],
    accent: 'vio',
    icon: 'CL',
    category: 'Simulations',
    previewStyle: 'cloth',
    previewKicker: 'Verlet Mesh',
    previewValue: 'TEAR TEST',
    previewTags: ['Pins', 'Wind', 'Drape'],
  },
  {
    path: 'flappy-bird',
    title: 'Flappy Bird',
    summary: 'A polished arcade clone featuring smooth mechanics and high scores.',
    tags: ['Arcade', 'Game'],
    accent: 'sun',
    icon: 'FB',
    category: 'Games',
    previewStyle: 'flappy',
    previewKicker: 'Arcade Loop',
    previewValue: 'TAP + SCORE',
    previewTags: ['Pipes', 'Physics', 'Retry'],
  },
  {
    path: 'fluid-motion',
    title: 'Fluid Motion',
    summary: 'Eulerian fluid dynamics, flow fields, and particle visualization.',
    tags: ['Flow', 'Viz'],
    accent: 'aqua',
    icon: 'FM',
    category: 'Simulations',
    previewStyle: 'fluid',
    previewKicker: 'Flow Field',
    previewValue: 'VORTEX VIEW',
    previewTags: ['Vectors', 'Trails', 'Dye'],
  },
  {
    path: 'heatmap',
    title: 'Heat Map',
    summary: 'Interactive data density visualization and thermal gradient sketching.',
    tags: ['Data', 'Color'],
    accent: 'hot',
    icon: 'HM',
    category: 'Creative',
    previewStyle: 'heat',
    previewKicker: 'Density Canvas',
    previewValue: 'THERMAL PALETTE',
    previewTags: ['Brush', 'Gradients', 'Data'],
  },
  {
    path: 'pid',
    title: 'PID Control',
    summary: 'Proportional-Integral-Derivative controller demos with live tuning.',
    tags: ['Eng', 'Math'],
    accent: 'lime',
    icon: 'PI',
    category: 'Tools',
    previewStyle: 'pid',
    previewKicker: 'Control Rig',
    previewValue: 'LIVE TUNING',
    previewTags: ['P', 'I', 'D'],
  },
  {
    path: 'piano',
    title: 'Piano Visualizer',
    summary: 'Interactive keyboard with falling-note roll synced to curated performances.',
    tags: ['Music', 'Piano'],
    accent: 'aqua',
    icon: 'PN',
    category: 'Creative',
    featured: true,
    previewStyle: 'piano',
    previewKicker: 'Performance Roll',
    previewValue: 'FALLING NOTES',
    previewTags: ['Keys', 'Timing', 'Playback'],
  },
  {
    path: 'particle-life',
    title: 'Particle Life',
    summary:
      'Emergent behavior from simple attraction and repulsion rules between particle species.',
    tags: ['Sim', 'Emergence'],
    accent: 'vio',
    icon: '::',
    category: 'Simulations',
    previewStyle: 'particle',
    previewKicker: 'Species Rules',
    previewValue: 'EMERGENT SWARM',
    previewTags: ['Orbit', 'Repel', 'Cluster'],
  },
  {
    path: 'tetris',
    title: 'Tetris',
    summary: 'Classic block stacking with ghost pieces, wall kicks, and scoring.',
    tags: ['Retro', 'Game'],
    accent: 'vio',
    icon: '[]',
    category: 'Games',
    featured: true,
    previewStyle: 'tetris',
    previewKicker: 'Learning Stack',
    previewValue: 'AI TRAINING',
    previewTags: ['Ghost', 'Kicks', 'Replay'],
  },
  {
    path: 'pretext',
    title: 'Pretext Dragon',
    summary:
      'ASCII dragon powered by DOM-free text layout — guide it with your cursor, hold to breathe fire.',
    tags: ['Text', 'Physics'],
    accent: 'lime',
    icon: '◈',
    category: 'Creative',
    featured: true,
    previewStyle: 'dragon',
    previewKicker: 'ASCII Creature',
    previewValue: 'FIRE + CURSOR',
    previewTags: ['Text', 'Flight', 'Flame'],
  },
] as const;
