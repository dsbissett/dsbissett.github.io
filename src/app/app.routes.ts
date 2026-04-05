import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: "Drake Bissett's Projects",
    loadComponent: () =>
      import('./home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'ai-chat',
    title: 'AI Chat',
    loadComponent: () =>
      import('./projects/ai-chat/ai-chat.component').then(
        (m) => m.AiChatComponent
      ),
  },
  {
    path: 'cloth',
    title: 'Cloth',
    loadComponent: () =>
      import('./projects/cloth/cloth.component').then((m) => m.ClothComponent),
  },
  {
    path: 'flappy-bird',
    title: 'Flappy Bird',
    loadComponent: () =>
      import('./projects/flappy-bird/flappy-bird.component').then(
        (m) => m.FlappyBirdComponent
      ),
  },
  {
    path: 'fluid-motion',
    title: 'Fluid Motion',
    loadComponent: () =>
      import('./projects/fluid-motion/fluid-motion.component').then(
        (m) => m.FluidMotionComponent
      ),
  },
  {
    path: 'heatmap',
    title: 'Heat Map',
    loadComponent: () =>
      import('./projects/heatmap/heatmap.component').then(
        (m) => m.HeatmapComponent
      ),
  },
  {
    path: 'pid',
    title: 'PID Control',
    loadComponent: () =>
      import('./projects/pid/pid.component').then((m) => m.PidComponent),
  },
  {
    path: 'piano',
    title: 'Piano Visualizer',
    loadComponent: () =>
      import('./projects/piano/piano.component').then(
        (m) => m.PianoComponent
      ),
  },
  {
    path: 'particle-life',
    title: 'Particle Life',
    loadComponent: () =>
      import('./projects/particle-life/particle-life.component').then(
        (m) => m.ParticleLifeComponent
      ),
  },
  {
    path: 'tetris',
    title: 'Tetris',
    loadComponent: () =>
      import('./projects/tetris/tetris.component').then(
        (m) => m.TetrisComponent
      ),
  },
  {
    path: 'pretext',
    title: 'Pretext Dragon',
    loadComponent: () =>
      import('./projects/pretext/pretext.component').then(
        (m) => m.PretextComponent
      ),
  },
  {
    path: 'pink-tetris',
    title: 'Pink Tetris',
    loadComponent: () =>
      import('./projects/pink-tetris/tetris.component').then(
        (m) => m.PinkTetrisComponent
      ),
  },
  {
    path: 'terminal',
    title: 'Terminal',
    loadComponent: () =>
      import('./projects/terminal/terminal.component').then(
        (m) => m.TerminalComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
