import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Non caricare file .env durante i test
    env: {},
    // Cancella le env vars di Supabase per i test
    setupFiles: [],
  },
  plugins: [tsconfigPaths()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('test')
  },
  optimizeDeps: {
    exclude: ['@tailwindcss/postcss']
  },
  // Disabilita il caricamento automatico di .env files
  envPrefix: ['VITE_'],
});
