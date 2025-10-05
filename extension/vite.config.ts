import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx, defineManifest } from '@crxjs/vite-plugin';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  const manifest = defineManifest({
    manifest_version: 3,
    name: 'Pomodoro Pilot',
    version: '0.1.0',
    description:
      'Lightweight Pomodoro timer with task categories, notifications, daily stats, and Markdown export.',
    action: {
      default_popup: 'popup.html',
      default_title: 'Pomodoro Pilot',
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
    background: {
      service_worker: 'src/background/service-worker.ts',
      type: 'module',
    },
    permissions: ['alarms', 'notifications', 'storage', 'downloads', 'commands'],
    optional_permissions: ['windows'],
    icons: {
      '16': 'icons/icon-16.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
    commands: {
      'toggle-timer': {
        suggested_key: {
          default: 'Ctrl+Shift+S',
          mac: 'Command+Shift+S',
        },
        description: 'Start or pause the current Pomodoro session',
      },
      'reset-timer': {
        suggested_key: {
          default: 'Ctrl+Shift+R',
          mac: 'Command+Shift+R',
        },
        description: 'Reset the Pomodoro timer',
      },
      'export-markdown': {
        suggested_key: {
          default: 'Ctrl+Shift+E',
          mac: 'Command+Shift+E',
        },
        description: "Export today's Pomodoro report as Markdown",
      },
    },
    web_accessible_resources: [
      {
        resources: ['src/offscreen/offscreen.html', 'sounds/notify.wav'],
        matches: ['<all_urls>'],
      },
    ],
    ...(isDev && {
      host_permissions: ['http://localhost:5173/*'],
      content_security_policy: {
        extension_pages: "script-src 'self' http://localhost:5173; object-src 'self';",
      },
    }),
  });

  const config = {
    plugins: [react(), crx({ manifest })],
    server: {
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
      hmr: {
        clientPort: Number(process.env.HMR_PORT) || 5173,
      },
    },
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          'popup.html': resolve(__dirname, 'popup.html'),
          'options.html': resolve(__dirname, 'options.html'),
          'offscreen.html': resolve(__dirname, 'src/offscreen/offscreen.html'),
          'focus.html': resolve(__dirname, 'focus.html'),
        },
      },
    },
  };

  if (process.env.DEBUG_VITE_CONFIG === 'true') {
    console.log('[vite-config] mode', mode, 'isDev', isDev);
    console.log('[vite-config] rollup inputs', config.build.rollupOptions?.input);
  }

  return config;
});
