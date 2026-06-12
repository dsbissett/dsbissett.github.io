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
  | 'dragon'
  | 'calculator'
  | 'volumetric'
  | 'robot-walks';

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
    path: 'tetris',
    title: 'Block Stacker',
    summary: 'Classic block stacking with ghost pieces, wall kicks, and scoring.',
    tags: ['Retro', 'Game'],
    accent: 'vio',
    icon: '[]',
    category: 'Games',
    featured: true,
    previewStyle: 'tetris',
    previewKicker: 'Learning Stack',
    previewValue: 'Tetris AI',
    previewTags: ['Ghost', 'Kicks', 'Replay'],
  },
  {
    path: 'ai-chat',
    title: 'Prompt Lab',
    summary: 'A playground for prompt engineering, models, and LLM experiments.',
    tags: ['AI', 'LLM'],
    accent: 'aqua',
    icon: 'AI',
    category: 'AI',
    featured: true,
    previewStyle: 'ai',
    previewKicker: 'Conversation Lab',
    previewValue: 'AI Chat',
    previewTags: ['Modes', 'Tools', 'Experiments'],
  },
  {
    path: 'volumetric-textures',
    title: 'Worley Volumes',
    summary:
      'Raymarched 3D Worley noise — cosmic particles drifting through procedural volumetric space.',
    tags: ['Shader', 'WebGL'],
    accent: 'vio',
    icon: 'VX',
    category: 'Creative',
    featured: true,
    previewStyle: 'volumetric',
    previewKicker: 'Procedural Field',
    previewValue: 'Volumetric Textures',
    previewTags: ['3D Noise', 'Gyroid', 'Drift'],
  },
  {
    path: 'particle-life',
    title: 'Emergent Swarm',
    summary:
      'Emergent behavior from simple attraction and repulsion rules between particle species.',
    tags: ['Sim', 'Emergence'],
    accent: 'vio',
    icon: '::',
    category: 'Simulations',
    featured: true,
    previewStyle: 'particle',
    previewKicker: 'Species Rules',
    previewValue: 'Particle Life',
    previewTags: ['Orbit', 'Repel', 'Cluster'],
  },
  {
    path: 'robot-walks',
    title: 'Robot Circuits',
    summary:
      'Graph theory, BEST theorem, and modular arithmetic applied to counting closed robot trajectories.',
    tags: ['Math', 'Algorithm'],
    accent: 'sun',
    icon: 'RW',
    category: 'Tools',
    previewStyle: 'robot-walks',
    previewKicker: 'Combinatorial Analysis',
    previewValue: 'Robot Walks',
    previewTags: ['Geometry', 'Modular Math', 'Circuits'],
  },
  {
    path: 'terminal',
    title: 'Retro Shell',
    summary: 'A retro command-line playground with secrets, shortcuts, and glow.',
    tags: ['CLI', 'Retro'],
    accent: 'lime',
    icon: '>_',
    category: 'Tools',
    previewStyle: 'terminal',
    previewKicker: 'Command Surface',
    previewValue: 'Terminal',
    previewTags: ['Shell', 'Glow', 'Easter Eggs'],
  },
  {
    path: 'cloth',
    title: 'Verlet Cloth',
    summary: 'Physics simulation with Verlet integration, constraints, and tearing.',
    tags: ['Physics', 'Sim'],
    accent: 'vio',
    icon: 'CL',
    category: 'Simulations',
    previewStyle: 'cloth',
    previewKicker: 'Verlet Mesh',
    previewValue: 'Cloth',
    previewTags: ['Pins', 'Wind', 'Drape'],
  },
  {
    path: 'flappy-bird',
    title: 'Pipe Dodger',
    summary: 'A polished arcade clone featuring smooth mechanics and high scores.',
    tags: ['Arcade', 'Game'],
    accent: 'sun',
    icon: 'FB',
    category: 'Games',
    previewStyle: 'flappy',
    previewKicker: 'Arcade Loop',
    previewValue: 'Flappy Bird',
    previewTags: ['Pipes', 'Physics', 'Retry'],
  },
  {
    path: 'fluid-motion',
    title: 'Eulerian Flow',
    summary: 'Eulerian fluid dynamics, flow fields, and particle visualization.',
    tags: ['Flow', 'Viz'],
    accent: 'aqua',
    icon: 'FM',
    category: 'Simulations',
    previewStyle: 'fluid',
    previewKicker: 'Flow Field',
    previewValue: 'Fluid Motion',
    previewTags: ['Vectors', 'Trails', 'Dye'],
  },
  {
    path: 'heatmap',
    title: 'Thermal Canvas',
    summary: 'Interactive data density visualization and thermal gradient sketching.',
    tags: ['Data', 'Color'],
    accent: 'hot',
    icon: 'HM',
    category: 'Creative',
    previewStyle: 'heat',
    previewKicker: 'Density Canvas',
    previewValue: 'Heat Map',
    previewTags: ['Brush', 'Gradients', 'Data'],
  },
  {
    path: 'pid',
    title: 'Feedback Loop',
    summary: 'Proportional-Integral-Derivative controller demos with live tuning.',
    tags: ['Eng', 'Math'],
    accent: 'lime',
    icon: 'PI',
    category: 'Tools',
    previewStyle: 'pid',
    previewKicker: 'Control Rig',
    previewValue: 'PID Control',
    previewTags: ['P', 'I', 'D'],
  },
  {
    path: 'piano',
    title: 'Falling Notes',
    summary: 'Interactive keyboard with falling-note roll synced to curated performances.',
    tags: ['Music', 'Piano'],
    accent: 'aqua',
    icon: 'PN',
    category: 'Creative',
    previewStyle: 'piano',
    previewKicker: 'Performance Roll',
    previewValue: 'Piano Visualizer',
    previewTags: ['Keys', 'Timing', 'Playback'],
  },
  {
    path: 'pretext',
    title: 'ASCII Dragon',
    summary:
      'ASCII dragon powered by DOM-free text layout — guide it with your cursor, hold to breathe fire.',
    tags: ['Text', 'Physics'],
    accent: 'lime',
    icon: '◈',
    category: 'Creative',
    previewStyle: 'dragon',
    previewKicker: 'ASCII Creature',
    previewValue: 'Pretext Dragon',
    previewTags: ['Text', 'Flight', 'Flame'],
  },
  {
    path: 'calculator',
    title: 'Paywall Calc',
    summary:
      'A pixel-perfect macOS calculator — fully functional, with a tongue-in-cheek paywall before the answer.',
    tags: ['Tool', 'UI'],
    accent: 'sun',
    icon: '=',
    category: 'Tools',
    previewStyle: 'calculator',
    previewKicker: 'Desk Utility',
    previewValue: 'Calculator',
    previewTags: ['Keys', 'Paywall', 'Result'],
  },
] as const;
