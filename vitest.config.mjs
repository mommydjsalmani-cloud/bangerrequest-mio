import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  plugins: [],
  define: {
    'process.env.NODE_ENV': JSON.stringify('test')
  },
  optimizeDeps: {
    exclude: ['@tailwindcss/postcss']
  },
  resolve: {
    alias: {
      '@': '/workspaces/bangerrequest-mio/src'
    }
  }
});
