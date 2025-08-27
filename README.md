<div align="center">

# AirFit

Camera-based mini games for fitness, built with Quasar + Vue 3. Play directly in your browser using your webcam.

[![Pages](https://img.shields.io/badge/Live-Demo-4CAF50)](https://imvenx.github.io/AirFit/)
[![Deploy](https://github.com/imvenx/AirFit/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/imvenx/AirFit/actions/workflows/deploy-pages.yml)
[![Made with Quasar](https://img.shields.io/badge/Quasar-2.x-1976D2?logo=quasar)](https://quasar.dev)
[![Vue](https://img.shields.io/badge/Vue-3.x-42b883?logo=vue.js)](https://vuejs.org)

</div>

---

## Features

- Camera-driven gameplay (Pose and Hand tracking powered by MediaPipe)
- Fitness mini games: Boxing Trainer, Table Break, and more
- Dev/test utilities grouped under a dedicated Tests menu
- Internationalization (EN, ES, FR, PT, DE, JA, KO, HI)
- GitHub Pages deployment (hash router + subpath-safe assets)

## Demo

- Live: https://imvenx.github.io/AirFit/

## Tech Stack

- Quasar (Vite) + Vue 3 + TypeScript
- Vue Router (hash mode)
- Pinia for state management
- MediaPipe Tasks Vision for hand/pose/gesture

## Getting Started

Install dependencies:

```bash
npm install
# or
yarn
```

Run in development (hot reload):

```bash
quasar dev
```

Build for production (outputs to `docs/` for GitHub Pages):

```bash
quasar build
```

### Deploy (GitHub Pages)

This repo includes an Actions workflow that builds to `docs/` and deploys to GitHub Pages.

1) GitHub → Settings → Pages → Build and deployment → Source: “GitHub Actions”
2) Push to `main` (or run the “Deploy to GitHub Pages” workflow manually)

Quasar config: `publicPath` is set to `/AirFit/` in production and `/` in dev; asset paths are relative (no leading `/`).

## Games

- Boxing Trainer (pose-based punching mechanics, bells, and bag collision)
- Table Break (pose + hand interactions for smashing tables)
- Bubble Bop (gesture-based bubble popping)
- Plus multiple test utilities under the Tests menu

## Contributing

Issues and PRs are welcome! If you’d like, open an issue to discuss any large change first.

Suggested contributions:

- New mini games or mechanics
- Performance improvements (tracking, rendering)
- UI/UX & accessibility improvements
- Internationalization updates

## Development Notes

- MediaPipe models are served from `/models` under `public/` and referenced with relative paths (`models/...`).
- Router uses hash mode for stability on GitHub Pages.

### Android (Capacitor) build tips

- Increase `versionCode` in `build.gradle`
- Open Android Studio: `npx quasar dev -m capacitor -T android`
- Build: `npx quasar build -m capacitor -T android`
- In Android Studio, generate a signed app bundle

### Icon generation

```bash
npx @quasar/icongenie generate -i ./playstore/images/test2.png --padding 10
```

## License

This project is intended to be open-source. Which license would you prefer (MIT/Apache-2.0/GPL-3.0)? I can add the LICENSE file accordingly.

