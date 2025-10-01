
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react"; // Import statement remains unchanged

export default function Home() {
  // Removed unused function: openInstagram

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
    } catch {
      setError('Errore di rete nella validazione codice.');
      setChecking(false);
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("banger_nome", nome);
      localStorage.setItem("banger_codice", codice);
    }
    setChecking(false);
    router.push("/requests");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-black text-white px-4 py-6">
      <div className="w-full max-w-md p-6 sm:p-8 bg-zinc-900 rounded-xl shadow-lg flex flex-col gap-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-1 leading-tight">Banger Request</h1>
        
        {/* Pulsante Instagram uniformato */}
        <div className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg">
          <div className="text-white text-sm font-medium mb-2 text-center">Ti è piaciuto il servizio?</div>
          <a 
            href="https://www.instagram.com/mommymusicentertainment?igsh=OHp1MWI1Z2dmOG4w" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block w-full text-center bg-white text-purple-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-100 active:scale-[0.98] transition text-sm"
          >
            🎵 Seguici su Instagram
          </a>
        </div>
  <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Il tuo nome"
            required
            ref={nomeRef}
            className="p-3 rounded bg-zinc-800 text-white placeholder-gray-400 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Codice evento"
            required
            ref={codiceRef}
            className="p-3 rounded bg-zinc-800 text-white placeholder-gray-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={checking}
            className="bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 active:scale-[0.98] transition text-white font-bold py-3 rounded mt-1"
          >{checking ? 'Controllo...' : 'Entra'}</button>
          {error && <div className="text-red-400 text-xs mt-1">{error}</div>}
        </form>
        <footer className="text-[11px] sm:text-xs text-gray-400 text-center mt-4">
          <Link href="/privacy" className="underline mr-2">Privacy</Link>
          <Link href="/termini" className="underline">Termini</Link>
          <div className="mt-3">
            <Link href="/dj" className="underline text-gray-300 hover:text-white">Sei il DJ? Apri il pannello</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

