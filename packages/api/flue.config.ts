import { defineConfig } from '@flue/cli/config';
import { defineConfig as defineViteConfig } from 'vite';

export default defineConfig({
  target: 'node',
});

export const vite = defineViteConfig({
  ssr: {
    noExternal: ['@pathfinding/database', '@pathfinding/types'],
  },
});
