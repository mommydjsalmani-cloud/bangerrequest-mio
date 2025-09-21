
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";

export default function Home() {
  const router = useRouter();
  const nomeRef = useRef<HTMLInputElement>(null);
  const codiceRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nome = nomeRef.current?.value.trim();
    const codice = codiceRef.current?.value.trim();
    if (!nome || !codice) return;
    if (typeof window !== "undefined") {
      localStorage.setItem("banger_nome", nome);
      localStorage.setItem("banger_codice", codice);
    }
    router.push("/requests");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <div className="w-full max-w-md p-8 bg-zinc-900 rounded-xl shadow-lg flex flex-col gap-6">
        <h1 className="text-4xl font-bold text-center mb-2">Banger Request</h1>
        <div className="flex justify-center">
          <a href="/instagram" className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded mb-2">Segui su Instagram</a>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
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
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded mt-2"
          >
            Entra
          </button>
        </form>
        <footer className="text-xs text-gray-400 text-center mt-6">
          <Link href="/privacy" className="underline mr-2">Privacy</Link>
          <Link href="/termini" className="underline">Termini</Link>
        </footer>
      </div>
    </main>
  );
}

