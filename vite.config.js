import { defineConfig } from 'vite';

export default defineConfig({
  // three.js is one large module; that's expected for a 3D game
  build: { chunkSizeWarningLimit: 900 },
});
