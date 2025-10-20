import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  plugins: [tsconfigPaths()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('test')
  },
  optimizeDeps: {
    exclude: ['@tailwindcss/postcss']
  }
});
