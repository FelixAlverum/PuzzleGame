import { defineConfig } from 'vite';

export default defineConfig({
  // Relative Pfade: der Build läuft unter jedem Unterpfad (nginx, file-Server, PWA-Scope)
  base: './',
});
