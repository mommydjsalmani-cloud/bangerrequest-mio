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
        
        <p className="text-gray-300 mb-12">Gestisci le richieste musicali:</p>
        
        <div className="flex justify-center">
          {/* Pannello Richieste Libere */}
          <Link 
            href="/dj/libere"
            className="group flex flex-col items-center gap-4 bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 p-8 rounded-xl transition-all transform hover:scale-105 min-w-[320px] shadow-2xl"
          >
            <div className="text-6xl mb-2">🎵</div>
            <h2 className="text-2xl font-bold">Pannello DJ</h2>
            <p className="text-purple-100 text-center">
              Gestisci richieste musicali con<br />
              codici evento integrati
            </p>
            <div className="text-sm bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
              Sistema Unificato
            </div>
          </Link>
        </div>
        
        <div className="mt-12 text-gray-400 text-sm">
          <p>Un unico sistema per tutte le richieste musicali</p>
        </div>
      </div>
    </div>
  );
}