import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: resolve(projectRoot, 'netlify-app'),
  publicDir: resolve(projectRoot, 'public'),
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [react()],
  resolve: { alias: { '@': projectRoot } },
  build: {
    outDir: resolve(projectRoot, 'dist-netlify'),
    emptyOutDir: true,
  },
});
