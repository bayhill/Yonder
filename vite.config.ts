import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/Yonder/',
  build: { target: 'es2022', sourcemap: false },
  test: { include: ['tests/**/*.test.ts'] },
});
