# Bubble Bop - Fitness Mini Games Framework

## Project Overview
Quasar/Vue 3 TypeScript project refactored from single bubble-popping game into multi-game fitness framework. Uses MediaPipe for camera-based gesture recognition.

## Key Architecture Points
- **Multi-game framework**: Games configured in `src/config/appConfig.ts`, dynamically loaded
- **Shared composables**: `useCamera`, `useHandTracking`, `useGameFramework` for common functionality
- **Game pattern**: Each game has folder in `src/games/[name]/` with Vue component + manager class
- **MediaPipe integration**: Models in `/public/models/`, supports hand/pose tracking + gestures

## Important Context
- **Original project**: Single bubble-bop game, now refactored into framework
- **Inspired by**: `/home/v/projects/quasar/rehab-app/src` architecture patterns
- **Mobile ready**: Capacitor setup for Android/iOS deployment
- **Current games**: Bubble-bop (hand tracking bubble popping)

## Adding New Games
1. Create `src/games/[game-name]/` folder
2. Add config entry to `appConfig.ts`
3. Add component mapping in `GamePage.vue`

## Code Style Guidelines
- **No unnecessary comments**: Code should be self-documenting
- **Avoid explanatory comments**: Don't add comments explaining what code does to the user/developer
- **Comments only when needed**: Use comments only for complex business logic or non-obvious technical decisions
- **Self-documenting code**: Use descriptive variable names, constants, and types instead of magic numbers or unclear references