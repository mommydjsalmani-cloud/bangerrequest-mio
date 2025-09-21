"use client";

import { useEffect, useState } from "react";

export default function Requests() {
  const [nome, setNome] = useState<string | null>(null);
  const [codice, setCodice] = useState<string | null>(null);

  useEffect(() => {
    setNome(localStorage.getItem("banger_nome"));
    setCodice(localStorage.getItem("banger_codice"));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <div className="w-full max-w-lg p-8 bg-zinc-900 rounded-xl shadow-lg flex flex-col gap-6">
        <h2 className="text-2xl font-bold mb-2">Ciao {nome ?? "ospite"}, codice evento: {codice ?? "-"}</h2>
        <input
          type="text"
          placeholder="Cerca un brano su Spotify"
          className="p-3 rounded bg-zinc-800 text-white placeholder-gray-400 focus:outline-none"
        />
        <textarea
          placeholder="Incolla link Spotify, YouTube o SoundCloud"
          className="p-3 rounded bg-zinc-800 text-white placeholder-gray-400 focus:outline-none"
        />
        <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded">
          Invia richiesta
        </button>
        <div className="flex flex-col gap-2 mt-4">
          <a href="#" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded text-center">Dai una mancia via PayPal</a>
          <a href="https://www.instagram.com/mommymusicentertainment?igsh=OHp1MWI1Z2dmOG4w" target="_blank" rel="noopener noreferrer" className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 rounded text-center">Segui su Instagram</a>
        </div>
        <div className="text-green-400 text-center mt-2">Richiesta inviata! (placeholder)</div>
      </div>
    </main>
  );
}
