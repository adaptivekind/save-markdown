import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';
import zip from 'vite-plugin-zip-pack';
import { copyFileSync, mkdirSync } from 'fs';

export default defineConfig({
  plugins: [
    crx({ manifest }),
    zip({ outDir: 'release', outFileName: 'release.zip' }),
    {
      name: 'copy-disabled-icons',
      writeBundle() {
        // Ensure icons directory exists
        mkdirSync('dist/icons', { recursive: true });

        // Copy disabled icon files
        copyFileSync(
          'icons/icon16-disabled.png',
          'dist/icons/icon16-disabled.png',
        );
        copyFileSync(
          'icons/icon48-disabled.png',
          'dist/icons/icon48-disabled.png',
        );
        copyFileSync(
          'icons/icon128-disabled.png',
          'dist/icons/icon128-disabled.png',
        );
      },
    },
  ],
  server: {
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: 'popup.html',
      },
    },
  },
});
