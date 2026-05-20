import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Vite dev server configuration used by Playwright `webServer` and by
// the local developer workflow (`npm run dev`). The SSO components under
// `src/components/sso/**` and `src/components/ui/**` are referenced by
// the test specifications but authored in a subsequent implementation
// cycle (see AAP Section 0.10.5 — Honest Limitation Disclosure).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@tests': fileURLToPath(new URL('./tests', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
