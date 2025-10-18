"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

type HomepageSession = {
  id: string;
  name: string;
  token: string;
  homepage_visible: boolean;
  homepage_priority: string | null;
  status: 'active' | 'paused';
};

export default function Home() {
  const [homepageSessions, setHomepageSessions] = useState<HomepageSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomepageSessions = async () => {
      try {
        const response = await fetch('/api/homepage-sessions');
        const data = await response.json();
        
        if (data.ok && data.sessions) {
          setHomepageSessions(data.sessions);
        }
      } catch (error) {
        console.error('Errore recupero sessioni homepage:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomepageSessions();
  }, []);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white px-4">
      <div className="w-full max-w-lg text-center space-y-8">
        {/* Logo/Brand */}
        <div>
          <div className="mb-4 flex justify-center">
            <Image 
              src="/Simbolo_Bianco.png" 
              alt="Banger Request Logo" 
              width={150} 
              height={150} 
              className="w-auto h-20 md:h-24 object-contain"
              priority
            />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            Banger Request
          </h1>
          <p className="text-lg md:text-xl text-gray-300">
            🎵 Richiedi la tua musica al DJ
          </p>
        </div>

        {/* Main Actions */}
        <div className="space-y-6">
          {/* Sessioni Libere Dinamiche (priorità alta) */}
          {!loading && homepageSessions.length > 0 && (
            <div className="space-y-4 mb-8">
              <h2 className="text-lg font-semibold text-gray-300 text-center">
                🎶 Sessioni Richieste Libere Attive
              </h2>
              {homepageSessions.map((session) => (
                <Link 
                  key={session.id}
                  href={`/libere?token=${session.token}`}
                  className="block w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-bold py-5 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg relative"
                >
                  <div className="flex items-center justify-between">
                    <span>🎵 {session.name}</span>
                    {session.status === 'paused' && (
                      <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded-full">
                        IN PAUSA
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          <Link 
            href="/evento"
            className="block w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-bold py-6 px-8 rounded-xl text-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            🎉 Entra in un Evento
          </Link>
          
          <Link 
            href="/dj"
            className="block w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            🎧 Zona DJ
          </Link>
        </div>

        {/* Footer Links */}
        <div className="pt-8 space-y-4">
          <a 
            href="https://www.instagram.com/mommymusicentertainment?igsh=OHp1MWI1Z2dmOG4w" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block text-gray-400 hover:text-white transition-colors text-sm underline"
          >
            📸 Seguici su Instagram
          </a>
          
          <div className="flex justify-center gap-4 text-xs text-gray-500">
            <Link href="/privacy" className="hover:text-gray-300 transition-colors">
              Privacy
            </Link>
            <Link href="/termini" className="hover:text-gray-300 transition-colors">
              Termini
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}