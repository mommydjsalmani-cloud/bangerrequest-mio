"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DJHome() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const router = useRouter();

  useEffect(() => {
    try {
      const savedUser = sessionStorage.getItem('dj_user');
      const savedPassword = sessionStorage.getItem('dj_secret');
      
      if (!savedUser || !savedPassword) {
        // Non autenticato, reindirizza al login
        router.push('/dj/login');
        return;
      }
      
      // Autenticato
      setUsername(savedUser);
      setIsAuthenticated(true);
    } catch {
      // Errore nell'accesso al sessionStorage, reindirizza al login
      router.push('/dj/login');
    }
  }, [router]);

  const logout = () => {
    try {
      sessionStorage.removeItem('dj_user');
      sessionStorage.removeItem('dj_secret');
      router.push('/dj/login');
    } catch {}
  };

  // Mostra loading durante la verifica dell'autenticazione
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl">🎧</div>
          <p className="mt-4 text-gray-300">Verifica autenticazione...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-between items-center mb-8 max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold">🎧 Pannello DJ</h1>
          <div className="text-right">
            <p className="text-gray-300 text-sm">Benvenuto, <span className="font-medium text-white">{username}</span></p>
            <button 
              onClick={logout}
              className="text-gray-400 hover:text-white text-sm mt-1 transition-colors"
            >
              Esci
            </button>
          </div>
        </div>
        
        <p className="text-gray-300 mb-12">Scegli la modalità di gestione:</p>
        
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          {/* Pannello Eventi */}
          <Link 
            href="/dj/eventi"
            className="group flex flex-col items-center gap-4 bg-blue-600 hover:bg-blue-700 p-8 rounded-xl transition-all transform hover:scale-105 min-w-[280px]"
          >
            <div className="text-6xl mb-2">🎧</div>
            <h2 className="text-2xl font-bold">Pannello Eventi</h2>
            <p className="text-blue-100 text-center">
              Gestisci eventi specifici con codici<br />
              e richieste per singoli eventi
            </p>
            <div className="text-sm bg-blue-800 px-3 py-1 rounded-full">
              Sistema Tradizionale
            </div>
          </Link>
          
          {/* Richieste Libere */}
          <Link 
            href="/dj/libere"
            className="group flex flex-col items-center gap-4 bg-purple-600 hover:bg-purple-700 p-8 rounded-xl transition-all transform hover:scale-105 min-w-[280px]"
          >
            <div className="text-6xl mb-2">🎵</div>
            <h2 className="text-2xl font-bold">Richieste Libere</h2>
            <p className="text-purple-100 text-center">
              Gestisci richieste aperte senza<br />
              associazione a eventi specifici
            </p>
            <div className="text-sm bg-purple-800 px-3 py-1 rounded-full">
              Nuovo Sistema
            </div>
          </Link>
        </div>
        
        <div className="mt-12 text-gray-400 text-sm">
          <p>Entrambi i sistemi sono completamente indipendenti</p>
        </div>
      </div>
    </div>
  );
}