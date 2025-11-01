/**
 * Utility per costruire i path delle API rispettando il basePath configurato
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Costruisce il path completo per una chiamata API
 * @param path - Il path relativo dell'API (es. '/api/health')
 * @returns Il path completo includendo il basePath se configurato
 * 
 * Nota: Questa funzione sostituisce solo il path, non le opzioni di fetch.
 * Usala così: fetch(apiPath('/api/...'), { options })
 */
export function apiPath(path: string): string {
  // Assicurati che il path inizi con /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Se c'è un basePath, concatenalo
  if (BASE_PATH) {
    return `${BASE_PATH}${normalizedPath}`;
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
