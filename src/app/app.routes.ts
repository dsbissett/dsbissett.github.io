import { Routes } from '@angular/router';

import { projectDefinitions } from './project-definitions';

export const routes: Routes = [
  {
    path: '',
    title: "Drake Bissett's Projects",
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
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
    path: 'tetris',
    title: 'Tetris',
    loadComponent: () =>
      import('./projects/tetris/tetris.component').then(
        (m) => m.TetrisComponent
      ),
  },
  ...projectDefinitions
    .filter(
      (project) =>
        project.path !== 'ai-chat' &&
        project.path !== 'cloth' &&
        project.path !== 'flappy-bird' &&
        project.path !== 'fluid-motion' &&
        project.path !== 'heatmap' &&
        project.path !== 'pid' &&
        project.path !== 'piano' &&
        project.path !== 'tetris'
    )
    .map((project) => ({
    path: project.path,
    title: project.title,
    data: {
      project,
    },
    loadComponent: () =>
      import('./features/demo-shell/demo-shell.component').then(
        (m) => m.DemoShellComponent
      ),
    })),
  {
    path: '**',
    redirectTo: '',
  },
];
