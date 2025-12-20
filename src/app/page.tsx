"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { apiPath, publicPath } from "@/lib/apiPath";

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
  const [qrSession, setQrSession] = useState<HomepageSession | null>(null);

  useEffect(() => {
    const fetchHomepageSessions = async () => {
      try {
        const response = await fetch(apiPath('/api/homepage-sessions'));
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

  const generatePublicUrl = (token: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    // Next.js basePath ('/richiedi') viene aggiunto automaticamente nel browser
    // Qui generiamo solo il path relativo
    return `${baseUrl}/richiedi/richieste?s=${token}`;
  };

  const generateQRCodeUrl = (url: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(url)}`;
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white px-4">
      <div className="w-full max-w-lg text-center space-y-8">
        {/* Logo/Brand */}
        <div>
          <div className="mb-4 flex justify-center">
            <Image 
              src={publicPath("/Simbolo_Bianco.png")}
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
                🎶 Sessioni Attive
              </h2>
              {homepageSessions.map((session) => (
                <div key={session.id} className="flex gap-2">
                  <Link 
                    href={`/richieste?s=${session.token}`}
                    className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-bold py-5 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg relative"
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
                  <button
                    onClick={() => setQrSession(session)}
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold px-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                    title="Mostra QR Code"
                  >
                    📱
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-4">
            <a
              href="https://www.instagram.com/mommymusicentertainment?igsh=OHp1MWI1Z2dmOG4w"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold py-3 px-6 rounded-xl text-lg transition-all duration-300 transform hover:scale-103 shadow-lg flex items-center justify-center gap-3"
            >
              <span className="bg-white/20 p-2 rounded-md text-sm">📸</span>
              <span className="text-lg">Seguimi su Instagram</span>
            </a>

            <a
              href="https://mommydj.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center gap-3"
            >
              <Image 
                src={publicPath("/Simbolo_Bianco.png")}
                alt="MommyDJ Logo" 
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
              />
              <span>Visita MommyDJ.com</span>
            </a>

            <Link 
              href="/dj"
              className="block w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              🎧 Zona DJ
            </Link>
          </div>
        </div>

        {/* Footer Links */}
        <div className="pt-8 space-y-4">
          {/* Instagram moved above Zona DJ */}
          
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

      {/* QR Code Modal */}
      {qrSession && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setQrSession(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                QR Code - {qrSession.name}
              </h3>
              <button
                onClick={() => setQrSession(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg border-2 border-gray-300">
              <Image 
                src={generateQRCodeUrl(generatePublicUrl(qrSession.token))} 
                alt="QR Code" 
                width={400}
                height={400}
                className="mx-auto border-4 border-white rounded-xl shadow-lg w-full h-auto" 
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600 text-center font-medium">
                Scansiona per accedere alle richieste
              </p>
              <a 
                href={generateQRCodeUrl(generatePublicUrl(qrSession.token))}
                download={`qr-${qrSession.name}.png`}
                className="block w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-medium text-center"
              >
                💾 Scarica QR Code
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}