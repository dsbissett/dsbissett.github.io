# Drake Bissett Projects

This repository is now an Angular 21 application managed with `pnpm`.

The Angular app provides:

- a routed home page for the project hub
- hash-based navigation that works on static hosting
- Angular route wrappers for each preserved legacy demo

The original static demos now live under `public/legacy`, and are served inside the Angular app through iframe-based feature routes.

## Requirements

- Node.js `20.19+`, `22.12+`, or `24+`
- `corepack` enabled so `pnpm` is available

## Scripts

```bash
pnpm install
pnpm start
pnpm build
pnpm test
```

## Project layout

```text
src/app
  app.routes.ts
  project-definitions.ts
  features/
    home/
    demo-shell/

public/
  assets/
  legacy/
```

## Notes

- The Angular router uses hash-based URLs to avoid deep-link refresh issues on static hosting.
- `public/legacy` preserves the original HTML, JS, CSS, images, audio, and MIDI files for each demo.
- Production output is written to `dist/dsbissett-github-io/browser`.

## GitHub Pages deployment

- This repo deploys through GitHub Actions.
- In GitHub, set `Settings -> Pages -> Build and deployment -> Source` to `GitHub Actions`.
- Pushes to `master` will build the app and publish `dist/dsbissett-github-io/browser`.
