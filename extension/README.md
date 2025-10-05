# Pomodoro Pilot (Chrome Extension)

This is a Vite + React + TypeScript scaffold for the Pomodoro Pilot Chrome extension described in the accompanying product spec. It bundles a popup UI, options page, MV3 service worker, and optional offscreen document for audio playback.

## Getting started

```bash
npm install
npm run dev
```

The development server from `@crxjs/vite-plugin` will emit a `dist` directory that you can load as an unpacked extension from `chrome://extensions`.

## Project structure

- `src/popup` – popup entry point rendered when clicking the browser action.
- `src/options` – options page for configuring durations, notifications, and theme.
- `src/background` – MV3 service worker modules for alarms, storage, and notifications.
- `src/offscreen` – optional offscreen document that plays the alert tone.
- `src/shared` – shared types, default settings, and theme helpers.
- `public` – static assets (icons, audio).

## Next steps

- Wire popup interactions to the background timer state.
- Persist settings/tasks using `chrome.storage`.
- Implement Markdown export and category analytics per the spec.
- Add automated tests (unit via Vitest, browser via Puppeteer).
