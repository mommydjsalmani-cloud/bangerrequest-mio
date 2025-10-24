"use client";

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Registra il service worker solo se supportato
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });
          
          console.log('[SW] Service Worker registrato con successo:', registration.scope);
          
          // Gestisci aggiornamenti SW
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              console.log('[SW] Nuovo Service Worker in installazione');
              
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[SW] Nuovo Service Worker disponibile - ricarica consigliata');
                  // Potresti mostrare una notifica all'utente qui
                }
              });
            }
          });
          
        } catch (error) {
          console.error('[SW] Errore registrazione Service Worker:', error);
        }
      };
      
      // Aspetta che la pagina sia completamente caricata
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }
    } else {
      console.log('[SW] Service Worker non supportato in questo browser');
    }
  }, []);
  
  return null; // Componente invisibile
}