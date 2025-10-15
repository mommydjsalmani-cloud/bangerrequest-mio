"use client";

import Link from "next/link";
import Logo from "@/components/Logo";

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      {/* Logo integrato */}
      <div className="w-full flex items-center justify-center pt-4 pb-2">
        <Logo size={60} className="opacity-60 transition-all hover:opacity-80 hover:scale-105" priority />
      </div>
      
      {/* Contenuto principale */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-lg text-center space-y-8">
        {/* Logo/Brand */}
        <div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            Banger Request
          </h1>
          <p className="text-lg md:text-xl text-gray-300">
            🎵 Richiedi la tua musica al DJ
          </p>
        </div>

        {/* Main Actions */}
        <div className="space-y-6">
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
      </div>
    </main>
  );
}