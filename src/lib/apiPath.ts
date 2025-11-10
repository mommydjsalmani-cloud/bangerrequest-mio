/**
 * Utility per costruire i path delle API
 * Semplificato: senza basePath dato che l'app è servita alla root
 */

/**
 * Costruisce il path completo per una chiamata API
 * @param path - Il path relativo dell'API (es. '/api/health' oppure `/api/requests?id=...`)
 * @returns Il path normalizzato
 * 
 * Usalo così: fetch(apiPath('/api/...'), { options })
 */
export function apiPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Costruisce il path completo per una rotta interna
 * Nota: i componenti <Link> di Next.js gestiscono automaticamente il routing,
 * quindi questa funzione è utile principalmente per redirect programmatici
 */
export function routePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Costruisce il path completo per file statici in /public
 * Next.js NON aggiunge automaticamente il basePath ai file in /public,
 * quindi dobbiamo farlo manualmente
 * @param path - Il path del file statico (es. '/logo.png')
 * @returns Il path completo includendo il basePath se configurato
 */
export function publicPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Hardcoded basePath per file statici perché viene processato a build-time
  // Deve corrispondere al basePath in next.config.ts
  // Solo in produzione, in sviluppo usa la root
  const staticBasePath = process.env.NODE_ENV === 'production' ? '/richiedi' : '';
  
  return staticBasePath ? `${staticBasePath}${normalizedPath}` : normalizedPath;
}
