"use client";

import Link from 'next/link';

export default function DJHome() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">🎧 Pannello DJ</h1>
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