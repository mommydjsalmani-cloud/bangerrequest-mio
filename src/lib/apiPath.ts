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
 * Next.js gestisce automaticamente il basePath per le immagini,
 * quindi restituiamo semplicemente il path normalizzato
 * @param path - Il path del file statico (es. '/logo.png')
 * @returns Il path normalizzato
 */
export function publicPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}
