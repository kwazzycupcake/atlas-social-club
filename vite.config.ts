import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // "/" for local dev; the GitHub Pages workflow sets BASE_PATH=/atlas-social-club/
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
} as never);
