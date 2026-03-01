/**
 * Utility per costruire i path delle API
 * In produzione aggiunge il basePath /richiedi, in sviluppo usa la root
 */

/**
 * Determina il basePath dal pathname corrente
 * Se siamo su /richiedi/..., allora il basePath è /richiedi
 */
function getBasePath(): string {
  if (typeof window === 'undefined') {
    // Lato server (build time)
    return process.env.NODE_ENV === 'production' ? '/richiedi' : '';
  }
  
  // Lato client (runtime)
  const pathname = window.location.pathname;
  if (pathname.startsWith('/richiedi/')) {
    return '/richiedi';
  }
  return '';
}

/**
 * Costruisce il path completo per una chiamata API
 * @param path - Il path relativo dell'API (es. '/api/health' oppure `/api/requests?id=...`)
 * @returns Il path normalizzato con basePath se necessario
 * 
 * Usalo così: fetch(apiPath('/api/...'), { options })
 */
export function apiPath(path: string): string {
  const basePath = getBasePath();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return basePath ? `${basePath}${normalizedPath}` : normalizedPath;
}

/**
 * Costruisce il path completo per una rotta interna
 * Nota: i componenti <Link> di Next.js gestiscono automaticamente il routing,
 * quindi questa funzione è utile principalmente per redirect programmatici
 */
export function routePath(path: string): string {
  const basePath = getBasePath();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return basePath ? `${basePath}${normalizedPath}` : normalizedPath;
}

/**
 * Costruisce il path completo per file statici in /public
 * Next.js NON aggiunge automaticamente il basePath ai file in /public,
 * quindi dobbiamo farlo manualmente
 * @param path - Il path del file statico (es. '/logo.png')
 * @returns Il path completo includendo il basePath se configurato
 */
export function publicPath(path: string): string {
  const basePath = getBasePath();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return basePath ? `${basePath}${normalizedPath}` : normalizedPath;
}
