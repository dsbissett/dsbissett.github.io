export interface ProjectDefinition {
  path: string;
  title: string;
  summary: string;
  tags: readonly string[];
  accent: 'aqua' | 'sun' | 'vio' | 'lime' | 'hot';
  legacyPath?: string;
  icon: string;
}

export const projectDefinitions: readonly ProjectDefinition[] = [
  {
    path: 'ai-chat',
    title: 'AI Chat',
    summary: 'A playground for prompt engineering, models, and LLM experiments.',
    tags: ['AI', 'LLM'],
    accent: 'aqua',
    icon: 'AI',
  },
  {
    path: 'terminal',
    title: 'Terminal',
    summary: 'A retro command-line playground with secrets, shortcuts, and glow.',
    tags: ['CLI', 'Retro'],
    accent: 'lime',
    legacyPath: 'legacy/terminal/index.html',
    icon: '>_',
  },
  {
    path: 'cloth',
    title: 'Cloth',
    summary: 'Physics simulation with Verlet integration, constraints, and tearing.',
    tags: ['Physics', 'Sim'],
    accent: 'vio',
    icon: 'CL',
  },
  {
    path: 'flappy-bird',
    title: 'Flappy Bird',
    summary: 'A polished arcade clone featuring smooth mechanics and high scores.',
    tags: ['Arcade', 'Game'],
    accent: 'sun',
    icon: 'FB',
  },
  {
    path: 'fluid-motion',
    title: 'Fluid Motion',
    summary: 'Eulerian fluid dynamics, flow fields, and particle visualization.',
    tags: ['Flow', 'Viz'],
    accent: 'aqua',
    icon: 'FM',
  },
  {
    path: 'heatmap',
    title: 'Heat Map',
    summary: 'Interactive data density visualization and thermal gradient sketching.',
    tags: ['Data', 'Color'],
    accent: 'hot',
    icon: 'HM',
  },
  {
    path: 'pid',
    title: 'PID Control',
    summary: 'Proportional-Integral-Derivative controller demos with live tuning.',
    tags: ['Eng', 'Math'],
    accent: 'lime',
    icon: 'PI',
  },
  {
    path: 'piano',
    title: 'Piano Visualizer',
    summary:
      'Interactive keyboard with falling-note roll synced to curated performances.',
    tags: ['Music', 'Piano'],
    accent: 'aqua',
    icon: 'PN',
  },
  {
    path: 'particle-life',
    title: 'Particle Life',
    summary:
      'Emergent behavior from simple attraction and repulsion rules between particle species.',
    tags: ['Sim', 'Emergence'],
    accent: 'vio',
    icon: '::',
  },
  {
    path: 'tetris',
    title: 'Tetris',
    summary: 'Classic block stacking with ghost pieces, wall kicks, and scoring.',
    tags: ['Retro', 'Game'],
    accent: 'vio',
    icon: '[]',
  },
  {
    path: 'pretext',
    title: 'Pretext Dragon',
    summary: 'ASCII dragon powered by DOM-free text layout — guide it with your cursor, hold to breathe fire.',
    tags: ['Text', 'Physics'],
    accent: 'lime',
    icon: '◈',
  },
] as const;
