/**
 * Utility per costruire i path delle API rispettando il basePath configurato
 * Funziona sia a build-time (con NEXT_PUBLIC_BASE_PATH) sia a runtime quando
 * l'app viene servita sotto un basePath (es. /richiedi) ma la variabile d'ambiente
 * non è stata impostata in Vercel.
 */

const BUILD_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

function detectRuntimeBasePath(): string {
  // Se siamo in ambiente client, proviamo a dedurre il basePath dalla location
  if (typeof window !== 'undefined') {
    try {
      // Prendiamo il primo segmento della pathname (es. '/richiedi/...')
      const first = window.location.pathname.split('/').filter(Boolean)[0];
      if (first) {
        // Se esiste un segmento non vuoto, consideriamolo come possibile basePath
        return `/${first}`;
      }
    } catch (e) {
      // ignore
    }
  }

  return '';
}

/**
 * Costruisce il path completo per una chiamata API
 * @param path - Il path relativo dell'API (es. '/api/health' oppure `/api/requests?id=...`)
 * @returns Il path completo includendo il basePath se configurato o dedotto
 * 
 * Usalo così: fetch(apiPath('/api/...'), { options })
 */
export function apiPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // Preferiamo la variabile d'ambiente (build-time)
  if (BUILD_BASE_PATH) {
    return `${BUILD_BASE_PATH}${normalizedPath}`;
  }

  // Altrimenti cerchiamo di dedurlo a runtime (utile su deployment dove non è stata settata la env)
  const runtime = detectRuntimeBasePath();
  if (runtime) {
    return `${runtime}${normalizedPath}`;
  }

  return normalizedPath;
}

/**
 * Costruisce il path completo per una rotta interna
 * Nota: i componenti <Link> di Next.js gestiscono automaticamente il basePath,
 * quindi questa funzione è utile principalmente per redirect programmatici
 */
export function routePath(path: string): string {
  return apiPath(path);
}

/**
 * Costruisce il path completo per file statici in /public
 * Next.js NON aggiunge automaticamente il basePath ai file in /public,
 * quindi dobbiamo farlo manualmente
 * @param path - Il path del file statico (es. '/logo.png')
 * @returns Il path completo includendo il basePath se configurato
 */
export function publicPath(path: string): string {
  return apiPath(path);
}
