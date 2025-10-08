"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export default function EventoPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const nomeRef = useRef<HTMLInputElement>(null);
  const codiceRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nome = nomeRef.current?.value.trim();
    const rawCode = codiceRef.current?.value.trim();
    const codice = rawCode?.toUpperCase();
    
    if (!nome || !codice) return;
    
    setError(null);
    setChecking(true);
    
    try {
      const res = await fetch(`/api/events/validate?code=${encodeURIComponent(codice)}`);
      const j = await res.json();
      
      if (!res.ok || !j.valid) {
        setError('Codice evento non valido o evento non attivo.');
        setChecking(false);
        return;
      }
      
      // Salva i dati nel localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("banger_nome", nome);
        localStorage.setItem("banger_codice", codice);
      }
      
      setChecking(false);
      router.push("/requests");
      
    } catch {
      setError('Errore di rete nella validazione del codice.');
      setChecking(false);
    }
  }

  return (
    <main className="min-h-dvh bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4 text-gray-300 hover:text-white transition-colors">
            ← Torna alla home
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Accedi all'Evento
          </h1>
          <p className="text-gray-300">
            Inserisci i tuoi dati per iniziare a richiedere musica
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 sm:p-8 border border-white/20 shadow-xl">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="nome" className="block text-sm font-medium mb-2 text-gray-200">
                Il tuo nome
              </label>
              <input
                id="nome"
                type="text"
                placeholder="Inserisci il tuo nome"
                required
                ref={nomeRef}
                className="w-full p-3 rounded-lg bg-white/20 backdrop-blur text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="codice" className="block text-sm font-medium mb-2 text-gray-200">
                Codice evento
              </label>
              <input
                id="codice"
                type="text"
                placeholder="Inserisci il codice dell'evento"
                required
                ref={codiceRef}
                className="w-full p-3 rounded-lg bg-white/20 backdrop-blur text-white placeholder-gray-400 border border-white/30 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent uppercase"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={checking}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg mt-2"
            >
              {checking ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Controllo...
                </span>
              ) : (
                '🎉 Entra nell&apos;Evento'
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400 mb-2">
              Non hai un codice evento?
            </p>
            <p className="text-xs text-gray-300">
              Chiedi al DJ o all&apos;organizzatore dell&apos;evento
            </p>
          </div>
        </div>

        {/* Alternative Actions */}
        <div className="mt-8 text-center space-y-3">
          <div className="text-gray-400 text-sm">oppure</div>
          
          <Link 
            href="/libere"
            className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            🎵 Vai alle Richieste Libere
          </Link>
          
          <div className="mt-6">
            <a 
              href="https://www.instagram.com/mommymusicentertainment?igsh=OHp1MWI1Z2dmOG4w" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block text-gray-400 hover:text-white transition-colors text-sm underline"
            >
              📸 Seguici su Instagram
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}