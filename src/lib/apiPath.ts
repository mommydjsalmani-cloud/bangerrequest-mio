/**
 * Utility per costruire i path delle API
 * In produzione aggiunge il basePath /richiedi, in sviluppo usa la root
 */

// BasePath deve corrispondere a quello in next.config.ts
// process.env.NODE_ENV viene valutato a BUILD TIME da Next.js/Webpack
// quindi in produzione BASE_PATH = '/richiedi' viene baked nel bundle
const BASE_PATH = process.env.NODE_ENV === 'production' ? '/richiedi' : '';

export function apiPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return BASE_PATH ? `${BASE_PATH}${normalizedPath}` : normalizedPath;
}

export function routePath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return BASE_PATH ? `${BASE_PATH}${normalizedPath}` : normalizedPath;
}

export function publicPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return BASE_PATH ? `${BASE_PATH}${normalizedPath}` : normalizedPath;
}
